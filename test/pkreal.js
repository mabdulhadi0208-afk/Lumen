// Passkeys on a real site (webauthn.io): register a new passkey in Lumen, then sign in with it.
// Run: xvfb-run -a npx electron test/pkreal.js --no-sandbox   (needs network access to webauthn.io; log: /tmp/lumen-pkreal.log)
process.env.LUMEN_NATIVE_MENUS = '1'
const { app, dialog } = require('electron'), fs = require('fs')
fs.rmSync('/tmp/lumen-pkreal', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-pkreal')
dialog.showMessageBox = async () => ({ response: 0 })
const L = require('../src/main.js')
const LOG = '/tmp/lumen-pkreal.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0]
  await w.ui.webContents.executeJavaScript(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`).catch(() => {})
  const t = w.createTab('https://webauthn.io/', { active: true })
  const wc = t.view.webContents, logs = []
  wc.on('console-message', (e) => logs.push((e.level || '') + ' ' + (e.message || '')))
  for (let i = 0; i < 40 && !(await wc.executeJavaScript(`!!document.querySelector('#input-email')`).catch(() => false)); i++) await wait(500)
  const user = 'lumen' + Date.now().toString(36)
  await wc.executeJavaScript(`(() => { const i = document.querySelector('#input-email'); i.focus(); i.value = '${user}'; i.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  await wc.executeJavaScript(`document.querySelector('#register-button').click(); true`)
  let reg = ''
  for (let i = 0; i < 40 && !/Success|error|fail/i.test(reg); i++) { await wait(500); reg = await wc.executeJavaScript(`[...document.querySelectorAll('.alert, [role=alert], .toast, #alert, .text-success, .text-danger')].map(e => e.innerText).join(' | ')`).catch(() => '') }
  ok(/Success/i.test(reg), 'register a passkey on webauthn.io: ' + reg.slice(0, 160))
  await wc.executeJavaScript(`document.querySelector('#login-button').click(); true`)
  let log = ''
  for (let i = 0; i < 40 && !/logged in|error|fail/i.test(log); i++) { await wait(500); log = await wc.executeJavaScript(`document.body.innerText`).catch(() => '') }
  ok(/logged in/i.test(log), 'sign in with it: ' + (log.match(/.{0,60}(logged in|error|fail).{0,60}/i) || [''])[0])
  try { fs.writeFileSync('/tmp/lumen-pkreal.png', (await wc.capturePage()).toPNG()) } catch {}
  if (fails) console.log('page console:\n' + logs.slice(-15).join('\n'))
  console.log(fails ? `PKREAL ${fails} FAILED` : 'PKREAL ALL PASS'); app.exit(fails ? 1 : 0)
})
