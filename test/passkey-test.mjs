// Registers and signs in with a passkey against @simplewebauthn/server (what real sites use to verify).
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { app, dialog } = require('electron')
const http = require('http'), fs = require('fs')
app.setPath('userData', '/tmp/lumen-pk-profile')
dialog.showMessageBox = async () => ({ response: 0 })   // auto-confirm prompts in the test
const SW = await import('@simplewebauthn/server')
const L = require('../src/main.js')
const RP = 'localhost', ORIGIN = 'http://localhost:48124'
let regOpts, authOpts, cred
const srv = http.createServer(async (req, res) => {
  const body = await new Promise(r => { let b = ''; req.on('data', d => b += d); req.on('end', () => r(b)) })
  const json = o => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)) }
  if (req.url === '/reg-options') { regOpts = await SW.generateRegistrationOptions({ rpName: 'Test', rpID: RP, userName: 'nauman@test.com', attestationType: 'none' }); return json(regOpts) }
  if (req.url === '/reg-verify') { try { const v = await SW.verifyRegistrationResponse({ response: JSON.parse(body), expectedChallenge: regOpts.challenge, expectedOrigin: ORIGIN, expectedRPID: RP }); cred = v.registrationInfo.credential; return json({ ok: v.verified }) } catch (e) { return json({ ok: false, e: e.message }) } }
  if (req.url === '/auth-options') { authOpts = await SW.generateAuthenticationOptions({ rpID: RP, allowCredentials: [{ id: cred.id }] }); return json(authOpts) }
  if (req.url === '/auth-verify') { try { const v = await SW.verifyAuthenticationResponse({ response: JSON.parse(body), expectedChallenge: authOpts.challenge, expectedOrigin: ORIGIN, expectedRPID: RP, credential: cred }); return json({ ok: v.verified }) } catch (e) { return json({ ok: false, e: e.message }) } }
  res.setHeader('content-type', 'text/html'); res.end('<title>PK</title><h1>pk</h1>')
}).listen(48124)
const wait = ms => new Promise(r => setTimeout(r, ms))
app.whenReady().then(async () => {
  await wait(4000)
  const w = L.windows[0]
  await w.ui.webContents.executeJavaScript(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`).catch(() => {})
  const t = w.createTab(ORIGIN + '/'); await wait(2000)
  const wc = t.view.webContents
  const r = await wc.executeJavaScript(`(async () => {
    const u2b = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/') + '==='.slice((s.length+3)%4)), c => c.charCodeAt(0))
    const out = {}
    out.uvpa = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    const o = await (await fetch('/reg-options')).json()
    const c = await navigator.credentials.create({ publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(o) })
    out.isPKC = c instanceof PublicKeyCredential
    out.reg = await (await fetch('/reg-verify', { method: 'POST', body: JSON.stringify(c.toJSON()) })).json()
    const a = await (await fetch('/auth-options')).json()
    const g = await navigator.credentials.get({ publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(a) })
    out.auth = await (await fetch('/auth-verify', { method: 'POST', body: JSON.stringify(g.toJSON()) })).json()
    try { await navigator.credentials.create({ publicKey: { ...PublicKeyCredential.parseCreationOptionsFromJSON(o), excludeCredentials: [{ type: 'public-key', id: g.rawId }] } }); out.exclude = 'not blocked' } catch (e) { out.exclude = e.name }
    return out
  })()`).catch(e => ({ error: e.message }))
  console.log('PASSKEY', JSON.stringify(r))
  console.log('SAVED', JSON.stringify(require('../src/passkeys.js').list()))
  srv.close(); app.exit(0)
})
