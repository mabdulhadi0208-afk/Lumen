// 4.4.23 passkeys, end to end: real WebAuthn calls in Lumen, checked by a local relying party that verifies every
// attestation and signature itself (node crypto), the way real sites' servers do. Covers create (ES256, RS256,
// Ed25519, resident keys, excludeCredentials, credProps), get (with and without allowCredentials), the Chrome-like
// credential objects (instanceof, toJSON, getPublicKey, getTransports, userHandle...), SimpleWebAuthn browser and
// @github/webauthn-json, the JSON helpers, autofill, iframes (same-origin, cross-origin with and without permission,
// about:blank), a sign-in popup, a strict CSP, cancelling and aborting, persistence across a restart, and passkeys
// surviving a change of the system key (safeStorage) that used to lock them out after an update.
// Run: xvfb-run -a npx electron test/passkeys4423.js --no-sandbox   (log: /tmp/lumen-passkeys4423.log)
const PROFILE = '/tmp/lumen-pk4423', ESCROW = '/tmp/lumen-pk4423-escrow'
const phase2 = process.argv.includes('--phase2')
const { app, BrowserWindow, webContents } = require('electron')
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process')
if (!phase2) { fs.rmSync(PROFILE, { recursive: true, force: true }); fs.rmSync(ESCROW, { recursive: true, force: true }) }
// 4.4.23 keeps no second Keychain copy in the app; LUMEN_VAULT_ESCROW stays unset so the test checks the real setup
app.setPath('userData', PROFILE)
const L = require('../src/main.js')
// a test machine without a system keyring (Linux under xvfb) gets a stand-in system key, the way a Mac's Keychain
// works; it is derived from a fixed name so the restart phase opens the same vault
{ const es = require('electron').safeStorage; let avail = false; try { avail = es.isEncryptionAvailable() } catch {}
  if (!avail) { const k = crypto.createHash('sha256').update('lumen test machine system key').digest()
    require('../src/vault.js')._test.setSafeStorage({ isEncryptionAvailable: () => true,
      encryptString: x => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', k, iv); const ct = Buffer.concat([c.update(x, 'utf8'), c.final()]); return Buffer.concat([iv, c.getAuthTag(), ct]) },
      decryptString: b => { const d = crypto.createDecipheriv('aes-256-gcm', k, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8') } }) } }
const LOG = '/tmp/lumen-passkeys4423.log'; if (!phase2) fs.writeFileSync(LOG, '')
let pass = 0, fail = 0
const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + (phase2 ? '[restart] ' : '') + m; c ? pass++ : fail++; console.log(l); fs.appendFileSync(LOG, l + '\n') }
const wait = ms => new Promise(r => setTimeout(r, ms))
const b64u = b => Buffer.from(b).toString('base64url')

// ---------------------------------------------------------------- a tiny CBOR decoder (what an RP server does)
function cborDecode(buf) {
  let i = 0
  const len = ai => { if (ai < 24) return ai; if (ai === 24) return buf[i++]; if (ai === 25) { const v = buf.readUInt16BE(i); i += 2; return v } if (ai === 26) { const v = buf.readUInt32BE(i); i += 4; return v } throw new Error('cbor len') }
  const item = () => {
    const b = buf[i++], mt = b >> 5, ai = b & 31
    if (mt === 7) { if (ai === 20) return false; if (ai === 21) return true; if (ai === 22) return null; throw new Error('cbor simple') }
    const n = len(ai)
    if (mt === 0) return n
    if (mt === 1) return -1 - n
    if (mt === 2) { const v = buf.subarray(i, i + n); i += n; return Buffer.from(v) }
    if (mt === 3) { const v = buf.subarray(i, i + n).toString('utf8'); i += n; return v }
    if (mt === 4) { const a = []; for (let k = 0; k < n; k++) a.push(item()); return a }
    if (mt === 5) { const m = new Map(); for (let k = 0; k < n; k++) { const key = item(); m.set(key, item()) } return m }
    throw new Error('cbor type ' + mt)
  }
  const v = item(); return { value: v, rest: buf.subarray(i) }
}
function coseToKey(m) {
  const kty = m.get(1), alg = m.get(3)
  if (kty === 2) return { alg, key: crypto.createPublicKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256', x: b64u(m.get(-2)), y: b64u(m.get(-3)) } }) }
  if (kty === 3) return { alg, key: crypto.createPublicKey({ format: 'jwk', key: { kty: 'RSA', n: b64u(m.get(-1)), e: b64u(m.get(-2)) } }) }
  if (kty === 1) return { alg, key: crypto.createPublicKey({ format: 'jwk', key: { kty: 'OKP', crv: 'Ed25519', x: b64u(m.get(-2)) } }) }
  throw new Error('kty ' + kty)
}
const sha = b => crypto.createHash('sha256').update(b).digest()

// ---------------------------------------------------------------- the relying party
const PORT = 48443
const RPID = 'a.localhost', ORIGIN = `http://${RPID}:${PORT}`, XORIGIN = `http://b.localhost:${PORT}`
const creds = new Map()   // credential id -> { key, alg, userId, counter }
const challenges = new Set()
function verifyClient(cdB64, type, origins) {
  const cd = JSON.parse(Buffer.from(cdB64, 'base64url').toString())
  if (cd.type !== type) throw new Error('type ' + cd.type)
  if (!challenges.has(cd.challenge)) throw new Error('unknown challenge')
  challenges.delete(cd.challenge)
  if (!origins.includes(cd.origin)) throw new Error('origin ' + cd.origin)
  return cd
}
function verifyReg(j, rpId, origins) {
  if (j.type !== 'public-key' || j.id !== j.rawId) throw new Error('id/type')
  const cd = verifyClient(j.response.clientDataJSON, 'webauthn.create', origins)
  const att = cborDecode(Buffer.from(j.response.attestationObject, 'base64url')).value
  if (att.get('fmt') !== 'none') throw new Error('fmt')
  const ad = att.get('authData')
  if (!ad.subarray(0, 32).equals(sha(rpId))) throw new Error('rpIdHash')
  const flags = ad[32]
  if (!(flags & 1) || !(flags & 4) || !(flags & 0x40)) throw new Error('flags ' + flags)
  const idLen = ad.readUInt16BE(53), credId = ad.subarray(55, 55 + idLen)
  if (b64u(credId) !== j.id) throw new Error('credential id in authData')
  const cose = cborDecode(ad.subarray(55 + idLen))
  if (cose.rest.length) throw new Error('trailing authData')
  const k = coseToKey(cose.value.value ? cose.value.value : cose.value)
  if (j.response.authenticatorData && j.response.authenticatorData !== b64u(ad)) throw new Error('authenticatorData differs')
  if (j.response.publicKey) { const spki = crypto.createPublicKey({ key: Buffer.from(j.response.publicKey, 'base64url'), format: 'der', type: 'spki' }); if (!spki.export({ format: 'der', type: 'spki' }).equals(k.key.export({ format: 'der', type: 'spki' }))) throw new Error('getPublicKey differs') }
  creds.set(j.id, { ...k, counter: ad.readUInt32BE(33) })
  return { cd, alg: k.alg, flags, be: !!(flags & 8) }
}
function verifyAuth(j, rpId, origins) {
  const c = creds.get(j.id); if (!c) throw new Error('unknown credential')
  const cd = verifyClient(j.response.clientDataJSON, 'webauthn.get', origins)
  const ad = Buffer.from(j.response.authenticatorData, 'base64url')
  if (!ad.subarray(0, 32).equals(sha(rpId))) throw new Error('rpIdHash')
  if (!(ad[32] & 1) || !(ad[32] & 4)) throw new Error('flags')
  const data = Buffer.concat([ad, sha(Buffer.from(j.response.clientDataJSON, 'base64url'))])
  const sig = Buffer.from(j.response.signature, 'base64url')
  const good = c.alg === -8 ? crypto.verify(null, data, c.key, sig) : crypto.verify('sha256', data, c.key, sig)
  if (!good) throw new Error('bad signature')
  return { cd, userHandle: j.response.userHandle }
}
const newChallenge = () => { const c = b64u(crypto.randomBytes(32)); challenges.add(c); return c }
const FIX = path.join(__dirname, 'fixtures', 'webauthn')
const HELPERS = `<script>
  window.T = {
    u2b: s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/') + '==='.slice((s.length+3)%4)), c => c.charCodeAt(0)),
    b2u: b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''),
    post: (u, o) => fetch(u, { method: 'POST', body: JSON.stringify(o) }).then(r => r.json()),
    get: u => fetch(u).then(r => r.json()),
  }
</script>`
const srv = http.createServer(async (q, r) => {
  const u = new URL(q.url, 'http://x')
  const body = await new Promise(res => { let b = ''; q.on('data', d => b += d); q.on('end', () => res(b)) })
  const json = o => { r.setHeader('content-type', 'application/json'); r.setHeader('access-control-allow-origin', '*'); r.end(JSON.stringify(o)) }
  try {
    if (u.pathname === '/challenge') return json({ challenge: newChallenge() })
    if (u.pathname === '/reg-options') {
      const algs = (u.searchParams.get('algs') || '-7,-257').split(',').map(Number)
      return json({ challenge: newChallenge(), rp: { name: 'Test RP', id: u.searchParams.get('rp') || RPID }, user: { id: b64u(crypto.randomBytes(16)), name: u.searchParams.get('user') || 'ada@test.com', displayName: 'Ada' },
        pubKeyCredParams: algs.map(alg => ({ type: 'public-key', alg })), timeout: 60000, attestation: 'none', excludeCredentials: u.searchParams.get('exclude') ? [...creds.keys()].map(id => ({ type: 'public-key', id })) : [],
        authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'preferred', authenticatorAttachment: 'platform' }, hints: ['client-device'], extensions: { credProps: true } })
    }
    if (u.pathname === '/auth-options') return json({ challenge: newChallenge(), rpId: u.searchParams.get('rp') || RPID, timeout: 60000, userVerification: 'preferred', allowCredentials: u.searchParams.get('allow') ? [...creds.keys()].map(id => ({ type: 'public-key', id, transports: ['internal', 'hybrid'] })) : [] })
    if (u.pathname === '/reg-verify') { const o = JSON.parse(body); const v = verifyReg(o, u.searchParams.get('rp') || RPID, [ORIGIN, XORIGIN]); return json({ ok: true, alg: v.alg, cd: v.cd, be: v.be }) }
    if (u.pathname === '/auth-verify') { const o = JSON.parse(body); const v = verifyAuth(o, u.searchParams.get('rp') || RPID, [ORIGIN, XORIGIN]); return json({ ok: true, cd: v.cd, userHandle: v.userHandle }) }
    if (u.pathname.startsWith('/lib/')) { r.setHeader('content-type', 'text/javascript'); return r.end(fs.readFileSync(path.join(FIX, path.basename(u.pathname)))) }
  } catch (e) { return json({ ok: false, error: e.message }) }
  r.setHeader('content-type', 'text/html')
  if (u.pathname === '/csp') r.setHeader('content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; frame-src 'none'")
  if (u.pathname === '/frame') return r.end(`<title>frame</title>${HELPERS}<input id=u autocomplete="username webauthn">`)
  if (u.pathname === '/popup') return r.end(`<title>popup</title>${HELPERS}`)
  r.end(`<title>RP</title>${HELPERS}<script src="/lib/simplewebauthn-browser-14.0.0.umd.min.js"></script><script src="/lib/webauthn-json-2.1.1.browser-global.js"></script>
    <input id=u autocomplete="username webauthn" style="position:absolute;left:40px;top:40px;width:300px;height:30px">
    <iframe id=same src="/frame"></iframe>
    <iframe id=xok src="${XORIGIN}/frame" allow="publickey-credentials-get *; publickey-credentials-create *"></iframe>
    <iframe id=xno src="${XORIGIN}/frame?no"></iframe>`)
}).listen(PORT)

// ---------------------------------------------------------------- answering Lumen's questions
let answer = 0, asked = [], holdAnswer = null
async function answerer() {
  for (;;) {
    await wait(60)
    for (const [, h] of L.__pkAsking) {
      const st = h && h._nova && h._nova.dialogState
      if (!st || st.__seen) continue
      st.__seen = true
      asked.push({ message: st.opts.message, buttons: st.opts.buttons, popup: !!h.popup, win: h.win })
      if (answer === 'hold') { holdAnswer = st; continue }
      const a = typeof answer === 'function' ? answer(st.opts) : answer
      setTimeout(() => st.finish({ response: a, checkboxChecked: false, values: {} }), 80)
    }
  }
}

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0]
  await w.ui.webContents.executeJavaScript(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`).catch(() => {})
  answerer()
  if (phase2) return restartPhase(w)
  const t = w.createTab(ORIGIN + '/'); await wait(3000)
  const wc = t.view.webContents
  const js = s => wc.executeJavaScript(s).catch(e => ({ error: e.message }))

  // ---- capabilities
  const caps = await js(`PublicKeyCredential.getClientCapabilities()`)
  ok(caps.passkeyPlatformAuthenticator === true && caps.userVerifyingPlatformAuthenticator === true && caps.conditionalGet === true && caps['extension:credProps'] === true, 'client capabilities describe a passkey platform authenticator')
  ok((await js(`Promise.all([PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(), PublicKeyCredential.isConditionalMediationAvailable()])`)).join() === 'true,true', 'isUserVerifyingPlatformAuthenticatorAvailable and isConditionalMediationAvailable say yes')
  ok(await js(`typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function' && typeof PublicKeyCredential.parseRequestOptionsFromJSON === 'function'`), 'the JSON helpers are there')
  ok(await js(`CredentialsContainer.prototype.get.toString() === 'function get() { [native code] }' && navigator.credentials.create.name === 'create'`), 'patched methods look native')

  // ---- create with typical options, verified by the RP
  const reg = await js(`(async () => {
    const o = await T.get('/reg-options')
    const pk = PublicKeyCredential.parseCreationOptionsFromJSON(o)
    const c = await navigator.credentials.create({ publicKey: pk })
    const out = { inst: c instanceof PublicKeyCredential && c.response instanceof AuthenticatorAttestationResponse && c.response instanceof AuthenticatorResponse,
      id: c.id, rawIdMatches: T.b2u(c.rawId) === c.id, type: c.type, att: c.authenticatorAttachment, keys: Object.keys(c).length,
      transports: c.response.getTransports(), alg: c.response.getPublicKeyAlgorithm(), ext: c.getClientExtensionResults(),
      adMatches: T.b2u(c.response.getAuthenticatorData()).length > 50, json: c.toJSON(), str: JSON.parse(JSON.stringify(c)).id === c.id }
    // the public key really imports
    out.spki = !!(await crypto.subtle.importKey('spki', c.response.getPublicKey(), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']))
    out.cd = JSON.parse(new TextDecoder().decode(c.response.clientDataJSON))
    out.verify = await T.post('/reg-verify', c.toJSON())
    return out
  })()`)
  ok(reg && reg.verify && reg.verify.ok, 'create(): the relying party verifies the new passkey ' + JSON.stringify(reg && (reg.verify || reg.error)))
  ok(reg.inst && reg.rawIdMatches && reg.type === 'public-key' && reg.att === 'platform', 'it is a real PublicKeyCredential (instanceof, rawId, type, authenticatorAttachment)')
  ok(reg.keys === 0, 'its fields are prototype getters like Chrome (no own keys)')
  ok(JSON.stringify(reg.transports) === '["hybrid","internal"]' && reg.alg === -7 && reg.spki && reg.adMatches, 'getTransports, getPublicKeyAlgorithm, getPublicKey and getAuthenticatorData work')
  ok(reg.ext && reg.ext.credProps && reg.ext.credProps.rk === true, 'credProps says it is a discoverable passkey')
  ok(reg.json && reg.json.response && reg.json.response.attestationObject && reg.json.response.publicKeyAlgorithm === -7 && reg.json.clientExtensionResults.credProps && reg.str, 'toJSON() and JSON.stringify give the WebAuthn JSON shape')
  ok(reg.cd && reg.cd.type === 'webauthn.create' && reg.cd.crossOrigin === false && reg.cd.origin === ORIGIN, 'clientDataJSON like Chrome: ' + JSON.stringify(reg.cd))
  ok(reg.verify.be === true, 'marked as a synced (backup eligible) passkey')
  ok(asked.length && /Save a passkey for a\.localhost/.test(asked[asked.length - 1].message), 'Lumen asked before saving: ' + (asked[asked.length - 1] || {}).message)

  // ---- other algorithms
  for (const [algs, want, name] of [['-257', -257, 'RS256'], ['-8,-257', -8, 'Ed25519'], ['-35,-7', -7, 'the first one Lumen has']]) {
    const r = await js(`(async () => { const o = await T.get('/reg-options?algs=${algs}&user=${name.replace(/\W/g, '')}@t'); const c = await navigator.credentials.create({ publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(o) }); return { alg: c.response.getPublicKeyAlgorithm(), v: await T.post('/reg-verify', c.toJSON()) } })()`)
    ok(r && r.alg === want && r.v && r.v.ok && r.v.alg === want, `create() with only ${name} (${algs}) works and verifies: ` + JSON.stringify(r))
  }
  { const r = await js(`navigator.credentials.create({ publicKey: { rp: { name: 'x' }, user: { id: new Uint8Array(4), name: 'x', displayName: 'x' }, challenge: new Uint8Array(16), pubKeyCredParams: [{ type: 'public-key', alg: -999 }] } }).then(() => 'ok', e => e.name)`)
    ok(r === 'NotSupportedError', 'an algorithm Lumen does not have: NotSupportedError ' + r) }
  { const r = await js(`navigator.credentials.create({ publicKey: { rp: { name: 'x' }, user: { id: new Uint8Array(4), name: 'x', displayName: 'x' }, pubKeyCredParams: [] } }).then(() => 'ok', e => e.name)`)
    ok(r === 'TypeError', 'a missing challenge is a TypeError, like Chrome: ' + r) }

  // ---- excludeCredentials
  { const n = asked.length
    const r = await js(`(async () => { const o = await T.get('/reg-options?exclude=1'); return navigator.credentials.create({ publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(o) }).then(() => 'created', e => e.name) })()`)
    ok(r === 'InvalidStateError', 'excludeCredentials with a passkey Lumen has: InvalidStateError ' + r)
    ok(asked.length > n && /already have a passkey/.test(asked[asked.length - 1].message), 'and Lumen tells the person they already have one') }

  // ---- get, with and without allowCredentials
  for (const allow of [true, false]) {
    answer = 0
    const r = await js(`(async () => {
      const o = await T.get('/auth-options${allow ? '?allow=1' : ''}')
      const c = await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(o) })
      return { inst: c instanceof PublicKeyCredential && c.response instanceof AuthenticatorAssertionResponse, att: c.authenticatorAttachment, uh: c.response.userHandle && c.response.userHandle.byteLength, json: c.toJSON(), v: await T.post('/auth-verify', c.toJSON()) }
    })()`)
    ok(r && r.v && r.v.ok, `get() ${allow ? 'with' : 'without'} allowCredentials signs in and the signature verifies: ` + JSON.stringify(r && (r.v || r.error)))
    ok(r && r.inst && r.att === 'platform' && r.uh === 16 && r.json && r.json.response.userHandle, 'an AuthenticatorAssertionResponse with userHandle and toJSON()')
  }
  ok(asked.some(a => /Sign in to a\.localhost/.test(a.message)), 'Lumen asked which account to sign in with')
  { const r = await js(`navigator.credentials.get({ publicKey: { challenge: new Uint8Array(16), extensions: { appid: 'https://a.localhost' } } }).then(c => c.getClientExtensionResults(), e => e.name)`)
    ok(r && r.appid === false, 'the appid extension answers false like Chrome: ' + JSON.stringify(r)) }

  // ---- real libraries: SimpleWebAuthn browser and @github/webauthn-json
  { const r = await js(`(async () => {
      const B = SimpleWebAuthnBrowser
      const supported = B.browserSupportsWebAuthn() && await B.platformAuthenticatorIsAvailable() && await B.browserSupportsWebAuthnAutofill()
      const reg = await B.startRegistration({ optionsJSON: await T.get('/reg-options?user=swa@t') })
      const rv = await T.post('/reg-verify', reg)
      const auth = await B.startAuthentication({ optionsJSON: await T.get('/auth-options?allow=1') })
      const av = await T.post('/auth-verify', auth)
      return { supported, rv, av, att: reg.authenticatorAttachment, pk: !!reg.response.publicKey, tr: reg.response.transports }
    })()`)
    ok(r && r.supported, 'SimpleWebAuthn sees WebAuthn, the platform authenticator and autofill')
    ok(r && r.rv && r.rv.ok && r.av && r.av.ok, 'SimpleWebAuthn startRegistration and startAuthentication verify: ' + JSON.stringify(r && (r.error || [r.rv, r.av])))
    ok(r && r.att === 'platform' && r.pk && Array.isArray(r.tr), 'with the publicKey, transports and attachment it reads') }
  { const r = await js(`(async () => {
      const J = webauthnJSON
      const reg = await J.create({ publicKey: await T.get('/reg-options?user=gh@t') })
      const rv = await T.post('/reg-verify', reg)
      const auth = await J.get({ publicKey: await T.get('/auth-options') })
      return { rv, av: await T.post('/auth-verify', auth), sup: J.supported() }
    })()`)
    ok(r && r.sup && r.rv && r.rv.ok && r.av && r.av.ok, '@github/webauthn-json create and get verify: ' + JSON.stringify(r && (r.error || [r.rv, r.av]))) }
  { const r = await js(`(async () => { const o = await T.get('/auth-options'); return navigator.credentials.get.call(navigator.credentials, { publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(o) }).then(c => T.post('/auth-verify', c.toJSON())) })()`)
    ok(r && r.ok, 'CredentialsContainer.prototype.get called directly works too') }

  // ---- cancel and abort
  answer = c => c.cancelId
  { const r = await js(`(async () => { const o = await T.get('/auth-options'); return navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(o) }).then(() => 'ok', e => e.name) })()`)
    ok(r === 'NotAllowedError', 'choosing Cancel rejects with NotAllowedError: ' + r) }
  answer = 'hold'
  { const t0 = Date.now()
    const r = await js(`(async () => { const ac = new AbortController(); const o = await T.get('/auth-options'); setTimeout(() => ac.abort(), 600); return navigator.credentials.get({ signal: ac.signal, publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(o) }).then(() => 'ok', e => e.name) })()`)
    ok(r === 'AbortError' && Date.now() - t0 < 4000, 'aborting with an AbortSignal rejects at once: ' + r)
    await wait(400)
    ok(holdAnswer && holdAnswer.__seen && !w._nova.dialogState, 'and closes Lumen\'s question') }
  { const r = await js(`(() => { const ac = new AbortController(); ac.abort(); return navigator.credentials.create({ signal: ac.signal, publicKey: { rp: { name: 'x' }, user: { id: new Uint8Array(4), name: 'x', displayName: 'x' }, challenge: new Uint8Array(16), pubKeyCredParams: [{ type: 'public-key', alg: -7 }] } }).then(() => 'ok', e => e.name) })()`)
    ok(r === 'AbortError', 'an already-aborted signal rejects create() with AbortError: ' + r) }
  answer = 0
  { const r = await js(`navigator.credentials.create({ mediation: 'conditional', publicKey: { rp: { name: 'x' }, user: { id: new Uint8Array(4), name: 'x', displayName: 'x' }, challenge: new Uint8Array(16), pubKeyCredParams: [{ type: 'public-key', alg: -7 }] } }).then(() => 'ok', e => e.name)`)
    ok(r === 'NotAllowedError', 'an automatic (conditional) create is declined quietly, without a popup: ' + r) }

  // ---- autofill (conditional mediation)
  { await js(`window.__r = null; T.get('/auth-options').then(o => navigator.credentials.get({ mediation: 'conditional', publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(o) })).then(c => T.post('/auth-verify', c.toJSON())).then(v => __r = v, e => __r = e.name); 1`)
    await wait(500)
    ok((await js(`__r`)) === null, 'autofill waits for the person')
    await js(`(() => { const el = document.getElementById('u'); el.focus(); el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); return 1 })()`); await wait(700)
    ok(await js(`document.documentElement.lastElementChild.tagName === 'DIV'`), 'the passkey menu opens under the sign-in field')
    await js(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); 1`)
    await wait(1200)
    const v = await js(`__r`)
    ok(v && v.ok, 'picking a passkey there signs in and verifies: ' + JSON.stringify(v)) }

  // ---- iframes
  const frame = (pred) => wc.mainFrame.framesInSubtree.find(pred)
  const same = frame(f => f !== wc.mainFrame && f.url === ORIGIN + '/frame')
  const xok = frame(f => f.url === XORIGIN + '/frame')
  const xno = frame(f => f.url === XORIGIN + '/frame?no')
  ok(same && xok && xno, 'the test page has its three iframes')
  { const r = await same.executeJavaScript(`(async () => {
      const c = await navigator.credentials.create({ publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(await T.get('/reg-options?user=frame@t')) })
      const rv = await T.post('/reg-verify', c.toJSON())
      const a = await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(await T.get('/auth-options')) })
      return { rv, av: await T.post('/auth-verify', a.toJSON()) }
    })()`).catch(e => ({ error: e.message }))
    ok(r && r.rv && r.rv.ok && r.av && r.av.ok, 'a same-origin iframe creates and signs in (it used to hang with no popup): ' + JSON.stringify(r)) }
  { const r = await xok.executeJavaScript(`(async () => {
      const o = await T.get('${XORIGIN}/auth-options?rp=b.localhost')
      return navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(o) }).then(c => ({ cd: JSON.parse(new TextDecoder().decode(c.response.clientDataJSON)) }), e => e.name)
    })()`).catch(e => ({ error: e.message }))
    ok(r === 'NotAllowedError', 'a cross-origin iframe allowed to use passkeys gets a clear answer when it has none: ' + JSON.stringify(r)) }
  { const r = await xok.executeJavaScript(`(async () => {
      const c = await navigator.credentials.create({ publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(await T.get('${XORIGIN}/reg-options?rp=b.localhost&user=x@t')) })
      const rv = await T.post('${XORIGIN}/reg-verify?rp=b.localhost', c.toJSON())
      const a = await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(await T.get('${XORIGIN}/auth-options?rp=b.localhost')) })
      return { rv, av: await T.post('${XORIGIN}/auth-verify?rp=b.localhost', a.toJSON()), cd: JSON.parse(new TextDecoder().decode(a.response.clientDataJSON)) }
    })()`).catch(e => ({ error: e.message }))
    ok(r && r.rv && r.rv.ok && r.av && r.av.ok, 'a cross-origin iframe with allow="publickey-credentials-get/create" creates and signs in: ' + JSON.stringify(r && (r.error || [r.rv, r.av])))
    ok(r && r.cd && r.cd.crossOrigin === true && r.cd.topOrigin === ORIGIN && r.cd.origin === XORIGIN, 'with crossOrigin and topOrigin in clientDataJSON, like Chrome: ' + JSON.stringify(r && r.cd)) }
  { const t0 = Date.now()
    const r = await xno.executeJavaScript(`navigator.credentials.get({ publicKey: { challenge: new Uint8Array(16) } }).then(() => 'ok', e => e.name)`).catch(e => e.message)
    ok(r === 'NotAllowedError' && Date.now() - t0 < 3000, 'a cross-origin iframe without permission is refused at once, not left hanging: ' + r) }
  { const r = await js(`(async () => {
      const f = document.createElement('iframe'); document.body.appendChild(f)
      const W = f.contentWindow
      const o = W.PublicKeyCredential.parseRequestOptionsFromJSON(await T.get('/auth-options'))
      const c = await W.navigator.credentials.get({ publicKey: o })
      return { inst: c instanceof W.PublicKeyCredential, v: await T.post('/auth-verify', c.toJSON()) }
    })()`)
    ok(r && r.inst && r.v && r.v.ok, 'an about:blank iframe the page made itself signs in (it used to hang): ' + JSON.stringify(r)) }

  // ---- a strict Content-Security-Policy changes nothing
  { const t2 = w.createTab(ORIGIN + '/csp'); await wait(2000)
    const r = await t2.view.webContents.executeJavaScript(`(async () => { const c = await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(await T.get('/auth-options')) }); return T.post('/auth-verify', c.toJSON()) })()`).catch(e => ({ error: e.message }))
    ok(r && r.ok, 'a page with a strict CSP signs in: ' + JSON.stringify(r))
    w.activateTab ? w.activateTab(t.id) : null }

  // ---- a sign-in popup (window.open with a size): the question shows in the popup, not behind it
  { const n = asked.length
    await js(`window.__pop = window.open('/popup', 'signin', 'width=480,height=640'); 1`)
    await wait(2500)
    const pwc = webContents.getAllWebContents().find(x => { try { return x.getURL() === ORIGIN + '/popup' } catch { return false } })
    ok(!!pwc, 'the sign-in popup opened')
    if (pwc) {
      const r = await pwc.executeJavaScript(`(async () => { const c = await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(await T.get('/auth-options')) }); return T.post('/auth-verify', c.toJSON()) })()`).catch(e => ({ error: e.message }))
      ok(r && r.ok, 'a passkey sign-in inside the popup works: ' + JSON.stringify(r))
      const q = asked.slice(n).find(a => /Sign in to/.test(a.message))
      ok(q && q.popup && q.win === BrowserWindow.fromWebContents(pwc), 'and Lumen asked in the popup window itself')
      await js(`__pop.close(); 1`)
    }
  }

  // ---- what is stored: sealed in the vault
  const P = require('../src/passkeys.js'), Vault = require('../src/vault.js')
  ok(P.store.get().filter(p => !p.deleted).every(p => /^v1:/.test(p.privateKey)), 'every passkey key is sealed in Lumen\'s vault (v1:)')
  ok(!fs.existsSync(ESCROW) && (() => { const k = JSON.parse(fs.readFileSync(PROFILE + '/vault.json', 'utf8')).keys; return k.length === 1 && !!k[0].ss && !k[0].escrow })(), 'the vault key is wrapped with the system key only (no readable second copy)')
  P.store.flush()
  fs.writeFileSync(PROFILE + '/creds.json', JSON.stringify([...creds].map(([id, c]) => [id, { alg: c.alg, spki: c.key.export({ format: 'der', type: 'spki' }).toString('base64') }])))

  // ---- persistence across a restart: a second Lumen process signs in with the passkeys saved here
  for (const s of [L.D.settings, L.D.passwords, P.store]) s.flush()
  app.releaseSingleInstanceLock()
  const code = await new Promise(res => {
    const c = spawn(process.execPath, [__filename, '--phase2', '--no-sandbox'], { stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
    c.stdout.on('data', d => process.stdout.write(d)); c.stderr.on('data', () => {})
    c.on('exit', res); setTimeout(() => { try { c.kill() } catch {} }, 60000)
  })
  const lines = fs.readFileSync(LOG, 'utf8').split('\n').filter(l => /\[restart\]/.test(l))
  ok(code === 0 && lines.length >= 2 && !lines.some(l => l.startsWith('FAIL')), 'after a restart the saved passkeys still sign in (' + lines.length + ' checks, exit ' + code + ')')

  // ---- the system key changes (what an update can do on a Mac): passkeys must survive
  try { await keyChange(P, Vault, L.D) } catch (e) { ok(false, 'the key change checks threw: ' + e.stack) }
  const line = fail ? `${pass} pass, ${fail} fail` : 'ALL PASS'; console.log(line); fs.appendFileSync(LOG, line + '\n')
  app.exit(fail ? 1 : 0)
})

async function restartPhase(w) {
  // load the RP's view of the credentials saved by the first run
  for (const [id, c] of JSON.parse(fs.readFileSync(PROFILE + '/creds.json', 'utf8'))) creds.set(id, { alg: c.alg, key: crypto.createPublicKey({ key: Buffer.from(c.spki, 'base64'), format: 'der', type: 'spki' }) })
  const t = w.createTab(ORIGIN + '/'); await wait(2500)
  const js = s => t.view.webContents.executeJavaScript(s).catch(e => ({ error: e.message }))
  const r = await js(`(async () => { const c = await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(await T.get('/auth-options?allow=1')) }); return T.post('/auth-verify', c.toJSON()) })()`)
  ok(r && r.ok, 'signs in with a passkey saved before the restart: ' + JSON.stringify(r))
  ok(require('../src/passkeys.js').list().length >= 5, 'all passkeys are listed after the restart')
  app.exit(fail ? 1 : 0)
}

// a stand-in for Electron's safeStorage whose key can be swapped, like macOS refusing a new build the old key
function fakeSafeStorage(name) {
  const key = sha(name)
  return {
    name, isEncryptionAvailable: () => true,
    encryptString: s => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv); const ct = Buffer.concat([c.update(s, 'utf8'), c.final()]); return Buffer.concat([iv, c.getAuthTag(), ct]) },
    decryptString: b => { const d = crypto.createDecipheriv('aes-256-gcm', key, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8') },
  }
}
async function keyChange(P, Vault, D) {
  const O = 'https://example.com', b = n => crypto.randomBytes(n).toString('base64url')
  const ask = { create: async () => true, choose: async () => 0, none: async () => null, locked: async () => { ask.lockedCalls = (ask.lockedCalls || 0) + 1; return ask.retry ? 'retry' : null } }
  const vfile = PROFILE + '/vault2.json'
  // Lumen 4.4.22 and older: the key sealed with safeStorage alone ('e:'), by the old build's system key
  const v1 = fakeSafeStorage('build 4.4.22')
  Vault._test.setFile(vfile); Vault._test.setSafeStorage(v1); Vault._test.setEscrow({ read: () => '', write: () => false })
  P.store.replace([])
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  P.store.get().push({ id: 'old1', rpId: 'example.com', credId: b(16), userId: b(8), userName: 'old@example.com', privateKey: 'e:' + v1.encryptString(privateKey.export({ format: 'pem', type: 'pkcs8' })).toString('base64'), createdAt: 1, updatedAt: 1 })
  ok(Vault.safeStorage() === v1, 'test hook: the old build\'s system key is in place')
  // 4.4.23 starts: the old key still opens, so it moves into the vault
  const m = P.migrate()
  ok(m.moved === 1 && /^v1:/.test(P.store.get()[0].privateKey), 'on the first start of 4.4.23 an old passkey moves into the vault: ' + JSON.stringify(m))
  ok(fs.existsSync(P.store.file.replace(/\.json$/, '.before-vault.json')), 'and a copy of the passkeys from before the move is kept')
  const s1 = await P.get(O, { rpId: 'example.com', challenge: b(16) }, ask)
  ok(s1 && s1.signature && crypto.verify('sha256', Buffer.concat([Buffer.from(s1.authenticatorData, 'base64url'), sha(Buffer.from(s1.clientDataJSON, 'base64url'))]), publicKey, Buffer.from(s1.signature, 'base64url')), 'and still signs in with the same key')
  const c2 = await P.create(O, { rp: { id: 'example.com' }, user: { id: b(8), name: 'new@example.com' }, challenge: b(16), algs: [-7] }, ask)
  ok(c2 && c2.id && /^v1:/.test(P.store.get().find(p => p.credId === c2.id).privateKey), 'a new passkey is sealed in the vault too')
  // an update: the new build gets a different system key and cannot open anything the old one sealed
  const v2 = fakeSafeStorage('build 4.4.24, new signature')
  Vault._test.setSafeStorage(v2)
  let threw = null; try { v2.decryptString(Buffer.from(JSON.parse(fs.readFileSync(vfile, 'utf8')).keys[0].ss, 'base64')) } catch (e) { threw = e }
  ok(!!threw, 'test hook: the new system key cannot open what the old one sealed')
  Vault.reset(); ask.lockedCalls = 0; ask.retry = false
  const s2 = await P.get(O, { rpId: 'example.com', challenge: b(16), allow: [c2.id] }, ask)
  ok(s2.error === 'NotAllowedError' && ask.lockedCalls === 1, 'right after an update that loses the system key, sign-in fails cleanly and Lumen says so')
  const mm = P.migrate()
  ok(mm.locked === 2 && P.store.get().filter(p => !p.deleted && p.privateKey).length === 2 && P.list().every(p => p.locked), 'the locked passkeys are kept (marked locked), never deleted')
  const c5 = await P.create(O, { rp: { id: 'example.com' }, user: { id: b(8), name: 'meanwhile@example.com' }, challenge: b(16), algs: [-7] }, ask)
  ok(c5 && c5.id && JSON.parse(fs.readFileSync(vfile, 'utf8')).keys.length === 2, 'a passkey saved meanwhile goes into a new vault key, the old key stays on file')
  // a sync round while locked must not wipe them
  const S = require('../src/sync.js')._test
  const snap = S.openAll(P.store.get(), 'privateKey')
  ok(snap.filter(p => p.locked).length === 2 && snap.filter(p => p.locked).every(p => p.privateKey === ''), 'sync sends locked passkeys as locked, without a key')
  const lockedBefore = P.store.get().filter(p => p.locked).map(p => p.id + p.privateKey).join()
  S.storeSecrets(P.store, S.mergeSecrets(snap, snap.map(p => ({ ...p })), 'privateKey'), 'privateKey')
  ok(P.store.get().filter(p => p.locked).map(p => p.id + p.privateKey).join() === lockedBefore && P.store.get().filter(p => p.privateKey).length === 3, 'a sync round keeps the sealed keys it could not open, unchanged (it used to wipe them)')
  ok(D.decOrNull(P.store.get().find(p => p.credId === c5.id).privateKey), 'and the one it could open is sealed again and still opens')
  // the person chooses Always Allow, so the new build may use the old system key again: Try again opens it
  // (the key made while locked was wrapped by the stand-in key meanwhile, so both open now, as one Keychain item would)
  Vault._test.setSafeStorage({ isEncryptionAvailable: () => true, encryptString: x => v1.encryptString(x), decryptString: b => { try { return v1.decryptString(b) } catch { return v2.decryptString(b) } } }); Vault.reset()
  ask.lockedCalls = 0; ask.retry = true
  const s6 = await P.get(O, { rpId: 'example.com', challenge: b(16), allow: [c2.id] }, ask)
  ok(s6 && s6.signature && ask.lockedCalls <= 1, 'once the key is reachable again (Always Allow), the passkey signs in again')
  P.migrate()
  ok(P.list().every(p => !p.locked) && P.list().length === 3, 'and every passkey is unlocked again, all three still there')
  // passwords use the vault too
  const sealed = D.enc('hunter2')
  ok(/^v1:/.test(sealed) && D.dec(sealed) === 'hunter2' && D.decOrNull('v1:000000000000:AAAA') === null, 'passwords are sealed in the vault, and an unreadable one reads as locked, not empty')
}
