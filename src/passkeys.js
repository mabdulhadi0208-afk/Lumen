// Lumen's own passkey manager: a WebAuthn platform authenticator built into the browser.
// Keys are P-256 (ES256) by default (RS256 and Ed25519 when a site asks for only those), private keys sealed in
// Lumen's key vault (src/vault.js, survives updates), confirmed with Touch ID, and synced end-to-end encrypted with
// passwords. Attestation is "none", like iCloud Keychain.
const fs = require('fs')
const crypto = require('crypto')
const { Store, uid } = require('./store')
const D = require('./data')

const store = new Store('passkeys', [])
const b64u = b => Buffer.from(b).toString('base64url')
const fromB64u = s => Buffer.from(String(s || ''), 'base64url')
const sha256 = b => crypto.createHash('sha256').update(b).digest()
const ALGS = [-7, -8, -257]

// ---- minimal CBOR encoder (ints, byte strings, text, booleans, arrays, maps)
function head(major, n) {
  if (n < 24) return Buffer.from([(major << 5) | n])
  if (n < 256) return Buffer.from([(major << 5) | 24, n])
  if (n < 65536) { const b = Buffer.alloc(3); b[0] = (major << 5) | 25; b.writeUInt16BE(n, 1); return b }
  const b = Buffer.alloc(5); b[0] = (major << 5) | 26; b.writeUInt32BE(n, 1); return b
}
function cbor(v) {
  if (typeof v === 'number') return v >= 0 ? head(0, v) : head(1, -1 - v)
  if (typeof v === 'boolean') return Buffer.from([v ? 0xf5 : 0xf4])
  if (Buffer.isBuffer(v)) return Buffer.concat([head(2, v.length), v])
  if (typeof v === 'string') { const s = Buffer.from(v, 'utf8'); return Buffer.concat([head(3, s.length), s]) }
  if (Array.isArray(v)) return Buffer.concat([head(4, v.length), ...v.map(cbor)])
  const entries = v instanceof Map ? [...v.entries()] : Object.entries(v)
  return Buffer.concat([head(5, entries.length), ...entries.flatMap(([k, x]) => [cbor(k), cbor(x)])])
}

const live = () => store.get().filter(p => !p.deleted)
function validRp(origin, rpId) {
  let u; try { u = new URL(origin) } catch { return null }
  const secure = u.protocol === 'https:' || (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname.endsWith('.localhost')))
  if (!secure) return null
  const host = u.hostname, rp = String(rpId || host).toLowerCase()
  if (!(host === rp || host.endsWith('.' + rp))) return null
  if (!rp.includes('.') && rp !== 'localhost') return null
  return rp
}
// flags: UP (user present) 0x01, UV (user verified) 0x04, BE (backup eligible) 0x08, BS (backed up) 0x10, AT 0x40, ED 0x80
function authData(rp, withCred, uv = true) {
  const flags = 0x01 | (uv ? 0x04 : 0) | 0x08 | 0x10 | (withCred ? 0x40 : 0)
  const parts = [sha256(rp), Buffer.from([flags]), Buffer.alloc(4)]
  if (withCred) parts.push(withCred)
  return Buffer.concat(parts)
}
// the same JSON, member order included, as Chrome writes it; topOrigin only for a cross-origin frame
function clientData(type, challenge, origin, top) {
  const o = { type, challenge, origin, crossOrigin: !!(top && top !== origin) }
  if (o.crossOrigin) o.topOrigin = top
  return Buffer.from(JSON.stringify(o))
}

function newKey(alg) {
  if (alg === -257) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
    const j = publicKey.export({ format: 'jwk' })
    return { privateKey, publicKey, cose: cbor(new Map([[1, 3], [3, -257], [-1, fromB64u(j.n)], [-2, fromB64u(j.e)]])) }
  }
  if (alg === -8) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
    const j = publicKey.export({ format: 'jwk' })
    return { privateKey, publicKey, cose: cbor(new Map([[1, 1], [3, -8], [-1, 6], [-2, fromB64u(j.x)]])) }
  }
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const j = publicKey.export({ format: 'jwk' })
  return { privateKey, publicKey, cose: cbor(new Map([[1, 2], [3, -7], [-1, 1], [-2, fromB64u(j.x)], [-3, fromB64u(j.y)]])) }
}
// the algorithm to use: the first in the site's list that Lumen has (an empty list means ES256 and RS256, per spec)
function pickAlg(algs) {
  const list = (algs || []).filter(a => typeof a === 'number')
  if (!list.length) return -7
  return list.find(a => ALGS.includes(a)) ?? null
}
// the extension outputs Chrome gives for a platform passkey without PRF, largeBlob or credBlob support
function extOut(kind, ext) {
  const o = {}; ext = ext || {}
  if (kind === 'create' && ext.credProps) o.credProps = { rk: true }
  if (kind === 'create' && ext.prf) o.prf = { enabled: false }
  if (kind === 'create' && ext.largeBlob) o.largeBlob = { supported: false }
  if (kind === 'create' && ext.appidExclude) o.appidExclude = false
  if (kind === 'get' && ext.appid) o.appid = false
  return o
}

// ask.create({rp, user}) -> bool ; ask.choose({rp, accounts}) -> index or -1 ; ask.none(rp) ; ask.locked(rp, user) -> 'retry'|other
async function create(origin, req, ask, top) {
  const rp = validRp(origin, req.rp && req.rp.id)
  if (!rp) return { error: 'SecurityError', message: 'This site cannot create a passkey for that domain.' }
  const alg = pickAlg(req.algs)
  if (alg == null) return { error: 'NotSupportedError', message: 'Lumen passkeys do not support the algorithms this site asked for.' }
  const user = req.user || {}
  const exclude = new Set(req.exclude || [])
  const userName = user.name || user.displayName || ''
  if (live().some(p => p.rpId === rp && exclude.has(p.credId))) {
    // like Chrome: tell the person, then say InvalidStateError so the site knows this device already has one
    if (ask.exists) await ask.exists(rp, userName)
    return { error: 'InvalidStateError', message: 'A passkey for this account is already saved in Lumen.' }
  }
  if (!(await ask.create({ rp, user: userName }))) return { error: 'NotAllowedError', message: 'The request was cancelled.' }
  const k = newKey(alg)
  const credId = crypto.randomBytes(16)
  const len = Buffer.alloc(2); len.writeUInt16BE(credId.length)
  const ad = authData(rp, Buffer.concat([Buffer.alloc(16), len, credId, k.cose]))
  const att = cbor({ fmt: 'none', attStmt: new Map(), authData: ad })
  const cd = clientData('webauthn.create', req.challenge, origin, top)
  const now = Date.now()
  // a new passkey for the same account replaces the old one (the old one is kept, marked replaced, for 30 days)
  for (const p of live()) if (p.rpId === rp && p.userId && p.userId === user.id) { p.deleted = true; p.replacedAt = now; p.updatedAt = now }
  store.get().push({
    id: uid(), rpId: rp, credId: b64u(credId), userId: user.id || '', userName, displayName: user.displayName || userName, alg,
    privateKey: D.enc(k.privateKey.export({ format: 'pem', type: 'pkcs8' })), createdAt: now, updatedAt: now,
  })
  store.save()
  return {
    id: b64u(credId), clientDataJSON: b64u(cd), attestationObject: b64u(att), authenticatorData: b64u(ad),
    publicKey: b64u(k.publicKey.export({ format: 'der', type: 'spki' })), publicKeyAlgorithm: alg, transports: ['hybrid', 'internal'],
    ext: extOut('create', req.ext),
  }
}

function openKey(pk) {
  const pem = D.decOrNull(pk.privateKey)
  try { return pem ? crypto.createPrivateKey(pem) : null } catch { return null }
}

async function get(origin, req, ask, top) {
  const rp = validRp(origin, req.rpId)
  if (!rp) return { error: 'SecurityError', message: 'This site cannot use a passkey for that domain.' }
  const allow = new Set(req.allow || [])
  const list = live().filter(p => p.rpId === rp && (!allow.size || allow.has(p.credId)) && (!req.pick || p.credId === req.pick))
  if (!list.length && ask.fallback && ask.fallback()) return { fallback: true }
  if (!list.length) {
    const r = ask.none ? await ask.none(rp) : null
    if (r && r.retry) return get(origin, req, ask, top)
    return { error: 'NotAllowedError', message: 'No passkey for this site is saved in Lumen.' }
  }
  const i = await ask.choose({ rp, accounts: list.map(p => p.userName || p.displayName || 'Account') })
  if (i < 0 || !list[i]) return { error: 'NotAllowedError', message: 'The request was cancelled.' }
  const pk = list[i]
  // a key the vault cannot open right now: never deleted; Lumen says so and can try the Keychain again
  let key = openKey(pk)
  for (let tries = 0; !key && tries < 3; tries++) {
    const again = ask.locked ? await ask.locked(rp, pk.userName || pk.displayName || '') : null
    if (again !== 'retry') break
    try { require('./vault').reset() } catch {}
    key = openKey(pk)
  }
  if (!key) return { error: 'NotAllowedError', message: 'Lumen could not unlock this passkey.' }
  delete pk.locked
  if (!/^v1:/.test(pk.privateKey)) pk.privateKey = D.reseal(pk.privateKey)
  const ad = authData(rp, null)
  const cd = clientData('webauthn.get', req.challenge, origin, top)
  const data = Buffer.concat([ad, sha256(cd)])
  const sig = (pk.alg || -7) === -8 ? crypto.sign(null, data, key) : crypto.sign('sha256', data, key)
  pk.lastUsed = Date.now(); store.save()
  return { id: pk.credId, clientDataJSON: b64u(cd), authenticatorData: b64u(ad), signature: b64u(sig), userHandle: pk.userId || null, ext: extOut('get', req.ext) }
}

// accounts a site may offer in its sign-in field (conditional mediation / passkey autofill)
function accounts(origin, req) {
  const rp = validRp(origin, req && req.rpId); if (!rp) return []
  const allow = new Set((req && req.allow) || [])
  return live().filter(p => p.rpId === rp && (!allow.size || allow.has(p.credId))).map(p => ({ credId: p.credId, userName: p.userName || p.displayName || 'Account' }))
}

function list() { return live().map(p => ({ id: p.id, rpId: p.rpId, userName: p.userName, createdAt: p.createdAt, lastUsed: p.lastUsed || 0, locked: !!p.locked })).sort((a, b) => a.rpId.localeCompare(b.rpId)) }
// removing a passkey in Settings: the key is wiped, the entry stays as a deletion so Sync carries it over
function remove(id) { const p = store.get().find(x => x.id === id); if (p) { p.deleted = true; p.privateKey = ''; p.updatedAt = Date.now(); store.save() } }

// 4.4.23: on every start, move keys that still open into the vault, and mark (never delete) the ones that do not.
// A copy of the file is kept from before the first move, just in case.
function migrate() {
  const out = { moved: 0, locked: 0 }
  const all = store.get()
  const needs = all.some(p => !p.deleted && p.privateKey && !/^v1:/.test(p.privateKey))
  if (needs) { try { const f = store.file.replace(/\.json$/, '.before-vault.json'); if (!fs.existsSync(f) && fs.existsSync(store.file)) fs.copyFileSync(store.file, f) } catch {} }
  let dirty = false
  const now = Date.now()
  for (const p of all) {
    // replaced passkeys keep their key for 30 days, then it is wiped
    if (p.deleted && p.replacedAt && p.privateKey && now - p.replacedAt > 30 * 864e5) { p.privateKey = ''; dirty = true }
    if (p.deleted || !p.privateKey) continue
    if (!/^v1:/.test(p.privateKey)) { const v = D.reseal(p.privateKey); if (v !== p.privateKey) { p.privateKey = v; out.moved++; dirty = true } }
    const ok = D.decOrNull(p.privateKey) != null
    if (!ok) { out.locked++; if (!p.locked) { p.locked = now; dirty = true } }
    else if (p.locked) { delete p.locked; dirty = true }
  }
  if (dirty) store.save()
  return out
}

module.exports = { store, create, get, accounts, list, remove, migrate, validRp, pickAlg, _cbor: cbor }
