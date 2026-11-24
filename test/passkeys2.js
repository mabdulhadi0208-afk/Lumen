// Passkeys on real sites: client capabilities, passkey autofill (conditional mediation) and the Windows fallback.
process.env.LUMEN_NATIVE_MENUS = '1'   // answer the passkey questions with the stubbed system dialog
const { app, dialog } = require('electron')
const http = require('http'), fs = require('fs')
app.setPath('userData', '/tmp/lumen-pk2-profile')
dialog.showMessageBox = async () => ({ response: 0 })
const L = require('../src/main.js')
const LOG = '/tmp/lumen-passkeys2.log'; fs.writeFileSync(LOG, '')
let pass = 0, fail = 0
const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; c ? pass++ : fail++; console.log(l); fs.appendFileSync(LOG, l + '\n') }
const PORT = 48126, ORIGIN = 'http://localhost:' + PORT
http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end('<title>PK2</title><input id="u" autocomplete="username webauthn" style="position:absolute;left:40px;top:40px;width:300px;height:30px"><input id="plain" style="position:absolute;left:40px;top:300px">') }).listen(PORT)
const wait = ms => new Promise(r => setTimeout(r, ms))
const rand = `btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))`
app.whenReady().then(async () => {
  await wait(4000)
  const w = L.windows[0]
  await w.ui.webContents.executeJavaScript(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`).catch(() => {})
  const t = w.createTab(ORIGIN + '/'); await wait(2500)
  const wc = t.view.webContents
  const js = s => wc.executeJavaScript(s).catch(e => ({ error: e.message }))
  const caps = await js(`PublicKeyCredential.getClientCapabilities()`)
  ok(caps.passkeyPlatformAuthenticator === true, 'sites are told Lumen has a passkey authenticator')
  ok(caps.userVerifyingPlatformAuthenticator === true && caps.conditionalGet === true, 'and that it supports Touch ID and passkey autofill')
  ok(caps['extension:prf'] === false, 'and does not claim extensions it does not do')
  ok(await js(`PublicKeyCredential.isConditionalMediationAvailable()`) === true, 'passkey autofill reported available')
  // register two accounts
  const reg = n => js(`navigator.credentials.create({ publicKey: { rp: { name: 'T' }, user: { id: new TextEncoder().encode('${n}'), name: '${n}@test.com', displayName: '${n}' }, challenge: new Uint8Array(32), pubKeyCredParams: [{ type: 'public-key', alg: -7 }] } }).then(c => c.id)`)
  const id1 = await reg('ada'), id2 = await reg('lin')
  ok(typeof id1 === 'string' && typeof id2 === 'string', 'created two passkeys')
  // conditional get waits for a pick
  await js(`window.__r = null; window.__ac = new AbortController(); navigator.credentials.get({ mediation: 'conditional', signal: __ac.signal, publicKey: { challenge: new Uint8Array(32) } }).then(c => __r = { id: c.id, user: new TextDecoder().decode(c.response.userHandle) }, e => __r = { err: e.name }); 1`)
  await wait(500)
  ok((await js(`__r`)) === null, 'autofill request waits quietly for the user')
  const focus = id => js(`(() => { const el = document.getElementById('${id}'); el.focus(); el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); return 1 })()`)
  const key = k => js(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true, cancelable: true })) ? 'passed' : 'taken'`)
  await focus('plain'); await wait(400)
  ok((await js(`document.documentElement.lastElementChild.tagName`)) !== 'DIV', 'no passkey menu on a normal field')
  await focus('u'); await wait(700)
  ok((await js(`document.documentElement.lastElementChild.tagName === 'DIV' && !!document.documentElement.lastElementChild.style.zIndex`)) === true, 'passkey menu shows under the sign-in field')
  // choose the second account with the keyboard
  ok((await key('Enter')) === 'passed', 'Enter with nothing chosen still submits the form normally')
  await key('ArrowDown'); await key('ArrowDown')
  ok((await key('Enter')) === 'taken', 'arrows and Enter pick an account')
  await wait(800)
  const r = await js(`__r`)
  ok(r && r.id === id2 && r.user === 'lin', 'picking an account signs in with that passkey: ' + JSON.stringify(r))
  ok((await js(`document.documentElement.lastElementChild.tagName`)) !== 'DIV', 'menu closes after picking')
  // abort
  await js(`window.__r = null; window.__ac = new AbortController(); navigator.credentials.get({ mediation: 'conditional', signal: __ac.signal, publicKey: { challenge: new Uint8Array(32) } }).then(c => __r = 'ok', e => __r = e.name); __ac.abort(); 1`)
  await wait(300)
  { const v = await js(`__r`); ok(v === 'AbortError', 'aborting the autofill request rejects it: ' + JSON.stringify(v)) }
  // a sign-in button replaces a waiting autofill request
  await js(`window.__r = null; navigator.credentials.get({ mediation: 'conditional', publicKey: { challenge: new Uint8Array(32) } }).then(c => __r = 'ok', e => __r = e.name); 1`)
  await wait(300)
  const modal = await js(`navigator.credentials.get({ publicKey: { challenge: new Uint8Array(32), allowCredentials: [{ type: 'public-key', id: Uint8Array.from(atob('${id1}'.replace(/-/g,'+').replace(/_/g,'/') + '==='.slice(('${id1}'.length+3)%4)), c => c.charCodeAt(0)) }] } }).then(c => c.id)`)
  await wait(300)
  ok(modal === id1, 'a sign-in button still works while autofill waits')
  ok((await js(`__r`)) === 'AbortError', 'and it cancels the waiting autofill request')
  // no passkey here: a clear error, not a hang
  await focus('plain')
  const none = await js(`navigator.credentials.get({ publicKey: { challenge: new Uint8Array(32), rpId: 'localhost', allowCredentials: [{ type: 'public-key', id: new Uint8Array([1,2,3]) }] } }).then(() => 'ok', e => e.name)`)
  ok(none === 'NotAllowedError', 'a site with no Lumen passkey gets a clear answer: ' + none)
  const log = fs.existsSync(app.getPath('userData') + '/lumen.log') ? fs.readFileSync(app.getPath('userData') + '/lumen.log', 'utf8') : ''
  ok(!/passkey (create|sign-in|autofill) failed/.test(log), 'no passkey errors logged')
  const line = fail ? `${pass} pass, ${fail} fail` : 'ALL PASS'; console.log(line); fs.appendFileSync(LOG, line + '\n')
  app.exit(fail ? 1 : 0)
})
