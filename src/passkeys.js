// Lumen's own passkey manager: a WebAuthn platform authenticator built into the browser.
// Keys are P-256 (ES256), private keys encrypted with the system keychain, confirmed with Touch ID,
// and synced end-to-end encrypted together with passwords. Attestation is "none", like iCloud Keychain.
const crypto = require('crypto')
const { Store, uid } = require('./store')
const D = require('./data')

const store = new Store('passkeys', [])
const b64u = b => Buffer.from(b).toString('base64url')
const fromB64u = s => Buffer.from(String(s || ''), 'base64url')
const sha256 = b => crypto.createHash('sha256').update(b).digest()

// ---- minimal CBOR encoder (ints, byte strings, text, maps)
function head(major, n) {
  if (n < 24) return Buffer.from([(major << 5) | n])
  if (n < 256) return Buffer.from([(major << 5) | 24, n])
  if (n < 65536) { const b = Buffer.alloc(3); b[0] = (major << 5) | 25; b.writeUInt16BE(n, 1); return b }
  const b = Buffer.alloc(5); b[0] = (major << 5) | 26; b.writeUInt32BE(n, 1); return b
}
function cbor(v) {
  if (typeof v === 'number') return v >= 0 ? head(0, v) : head(1, -1 - v)
  if (Buffer.isBuffer(v)) return Buffer.concat([head(2, v.length), v])
  if (typeof v === 'string') { const s = Buffer.from(v, 'utf8'); return Buffer.concat([head(3, s.length), s]) }
  const entries = v instanceof Map ? [...v.entries()] : Object.entries(v)
  return Buffer.concat([head(5, entries.length), ...entries.flatMap(([k, x]) => [cbor(k), cbor(x)])])
}

const live = () => store.get().filter(p => !p.deleted)
function validRp(origin, rpId) {
  let u; try { u = new URL(origin) } catch { return null }
  const secure = u.protocol === 'https:' || (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname.endsWith('.localhost')))
  if (!secure) return null
  const host = u.hostname, rp = (rpId || host).toLowerCase()
  if (!(host === rp || host.endsWith('.' + rp))) return null
  if (!rp.includes('.') && rp !== 'localhost') return null
  return rp
}
// flags: UP (user present) 0x01, UV (user verified) 0x04, BE (backup eligible) 0x08, BS (backed up) 0x10, AT 0x40
function authData(rp, withCred) {
  const flags = 0x01 | 0x04 | 0x08 | 0x10 | (withCred ? 0x40 : 0)
  const parts = [sha256(rp), Buffer.from([flags]), Buffer.alloc(4)]
  if (withCred) parts.push(withCred)
  return Buffer.concat(parts)
}
const clientData = (type, challenge, origin) => Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }))

// ask.create({rp, user}) -> bool ; ask.choose({rp, accounts}) -> index or -1 ; ask.none(rp)
async function create(origin, req, ask) {
  const rp = validRp(origin, req.rp && req.rp.id)
  if (!rp) return { error: 'SecurityError', message: 'This site cannot create a passkey for that domain.' }
  if (req.algs && req.algs.length && !req.algs.includes(-7)) return { error: 'NotSupportedError', message: 'Unsupported algorithm.' }
  const exclude = new Set(req.exclude || [])
  if (live().some(p => p.rpId === rp && exclude.has(p.credId))) return { error: 'InvalidStateError', message: 'A passkey for this account is already saved in Lumen.' }
  const userName = (req.user && (req.user.name || req.user.displayName)) || ''
  if (!(await ask.create({ rp, user: userName }))) return { error: 'NotAllowedError', message: 'The request was cancelled.' }
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const jwk = publicKey.export({ format: 'jwk' })
  const credId = crypto.randomBytes(16)
  const cose = cbor(new Map([[1, 2], [3, -7], [-1, 1], [-2, fromB64u(jwk.x)], [-3, fromB64u(jwk.y)]]))
  const len = Buffer.alloc(2); len.writeUInt16BE(credId.length)
  const ad = authData(rp, Buffer.concat([Buffer.alloc(16), len, credId, cose]))
  const att = cbor({ fmt: 'none', attStmt: new Map(), authData: ad })
  const cd = clientData('webauthn.create', req.challenge, origin)
  const now = Date.now()
  // a new passkey for the same account replaces the old one
  for (const p of live()) if (p.rpId === rp && p.userId === req.user.id) { p.deleted = true; p.privateKey = ''; p.updatedAt = now }
  store.get().push({
    id: uid(), rpId: rp, credId: b64u(credId), userId: req.user.id || '', userName, displayName: (req.user && req.user.displayName) || userName,
    privateKey: D.enc(privateKey.export({ format: 'pem', type: 'pkcs8' })), createdAt: now, updatedAt: now,
  })
  store.save()
  return {
    id: b64u(credId), clientDataJSON: b64u(cd), attestationObject: b64u(att), authenticatorData: b64u(ad),
    publicKey: b64u(publicKey.export({ format: 'der', type: 'spki' })),
  }
}

async function get(origin, req, ask) {
  const rp = validRp(origin, req.rpId)
  if (!rp) return { error: 'SecurityError', message: 'This site cannot use a passkey for that domain.' }
  const allow = new Set(req.allow || [])
  const list = live().filter(p => p.rpId === rp && (!allow.size || allow.has(p.credId)) && (!req.pick || p.credId === req.pick))
  if (!list.length && ask.fallback && ask.fallback()) return { fallback: true }
  if (!list.length) { await ask.none(rp); return { error: 'NotAllowedError', message: 'No passkey for this site is saved in Lumen.' } }
  const i = await ask.choose({ rp, accounts: list.map(p => p.userName || p.displayName || 'Account') })
  if (i < 0 || !list[i]) return { error: 'NotAllowedError', message: 'The request was cancelled.' }
  const pk = list[i]
  const key = crypto.createPrivateKey(D.dec(pk.privateKey))
  const ad = authData(rp, null)
  const cd = clientData('webauthn.get', req.challenge, origin)
  const sig = crypto.sign('sha256', Buffer.concat([ad, sha256(cd)]), key)
  pk.lastUsed = Date.now(); store.save()
  return { id: pk.credId, clientDataJSON: b64u(cd), authenticatorData: b64u(ad), signature: b64u(sig), userHandle: pk.userId || null }
}

// accounts a site may offer in its sign-in field (conditional mediation / passkey autofill)
function accounts(origin, req) {
  const rp = validRp(origin, req && req.rpId); if (!rp) return []
  const allow = new Set((req && req.allow) || [])
  return live().filter(p => p.rpId === rp && (!allow.size || allow.has(p.credId))).map(p => ({ credId: p.credId, userName: p.userName || p.displayName || 'Account' }))
}

function list() { return live().map(p => ({ id: p.id, rpId: p.rpId, userName: p.userName, createdAt: p.createdAt, lastUsed: p.lastUsed || 0 })).sort((a, b) => a.rpId.localeCompare(b.rpId)) }
function remove(id) { const p = store.get().find(x => x.id === id); if (p) { p.deleted = true; p.privateKey = ''; p.updatedAt = Date.now(); store.save() } }

module.exports = { store, create, get, accounts, list, remove, validRp, _cbor: cbor }
