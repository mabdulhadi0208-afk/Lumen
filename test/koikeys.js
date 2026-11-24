// Koi's modifier-only fan shortcut (hold Cmd Opt) inside Lumen: the key listener runs in its own process, the
// shortcut saves and arms, the Hotkeys window says when Lumen needs Accessibility, and turning Koi off stops it.
process.env.LUMEN_APPS_ANYWHERE = '1'
const fs = require('fs'); const { app, BrowserWindow, ipcMain } = require('electron')
fs.rmSync('/tmp/lumen-kk', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-kk')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js'); const Apps = require('../src/apps.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-koikeys.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))
const inv = (ch, ...a) => ipcMain._invokeHandlers.get(ch)({ sender: null }, ...a)
const keyProcs = () => app.getAppMetrics().filter(m => m.type === 'Utility' && /Koi Keys/.test(m.name || '')).length
app.whenReady().then(async () => {
  await wait(8000)
  ok(keyProcs() === 0, 'no key listener while no shortcut needs one')
  // set the fan to Cmd Opt from Koi's own Hotkeys window
  await L.__appOpen('koi', 'hotkeys'); await wait(2500)
  const sw = BrowserWindow.getAllWindows().find(b => /koi.*settings\.html/.test(b.webContents.getURL())); sw.show(); sw.focus(); await wait(400)
  await sw.webContents.executeJavaScript(`document.getElementById('main').click()`); await wait(400)
  for (const [t, k, mods] of [['keyDown', 'Meta', ['meta']], ['keyDown', 'Alt', ['meta', 'alt']], ['keyUp', 'Alt', ['meta']], ['keyUp', 'Meta', []]]) { sw.webContents.sendInputEvent({ type: t, keyCode: k, modifiers: mods }); await wait(120) }
  await wait(3500)
  const g = await inv('koi:s:get'); LOG('    ' + JSON.stringify({ main: g.main, status: g.status, perm: g.perm }))
  ok(g.main === 'Command+Alt', 'holding Cmd Opt in the recorder saves Cmd Opt')
  ok(g.perm.needed && g.perm.hook && g.status.main, 'the key listener starts and the shortcut is armed')
  ok(keyProcs() === 1, 'in its own process (' + keyProcs() + '), never inside Lumen itself')
  ok(await sw.webContents.executeJavaScript(`(!document.getElementById('perm').classList.contains('show') || document.getElementById('perm').classList.contains('ok')) && /⌘ ⌥/.test(document.getElementById('main').textContent) && !/\\(!\\)/.test(document.getElementById('main').textContent)`), 'Hotkeys window shows Cmd Opt, no warning (at most the green All set)')
  // what you see on a Mac without the permission, then the moment it is turned on
  const card = await sw.webContents.executeJavaScript(`(() => { st.perm = { needed: true, trusted: false, hook: false }; st.status = { main: false, hk: [] }; render(); const p = document.getElementById('perm'), r = p.getBoundingClientRect(), b = document.getElementById('permB').getBoundingClientRect(); return { show: p.classList.contains('show'), t: document.getElementById('permT').textContent, s: document.getElementById('permS').textContent, inside: b.right <= r.right && b.bottom <= r.bottom && r.width > 300, foot: document.querySelector('.foot').textContent } })()`)
  LOG('    ' + JSON.stringify(card))
  ok(card.show && /Accessibility permission for Lumen/.test(card.s) && card.inside, 'without permission: a clear card that names Lumen, with Open Settings')
  ok(!/Koi on/.test(card.foot) && /Lumen/.test(card.foot), 'the help line names Lumen, not Koi')
  fs.writeFileSync(`${SHOTS}/koi-perm.png`, (await sw.webContents.capturePage()).toPNG())
  // the window checks again on its own (every 1.5 s) and finds the listener running
  let allSet = false; for (let i = 0; i < 14 && !allSet; i++) { await wait(300); allSet = await sw.webContents.executeJavaScript(`document.getElementById('perm').classList.contains('ok') && /All set/.test(document.getElementById('permT').textContent)`) }
  ok(allSet, 'and it turns into All set by itself once the permission is on')
  fs.writeFileSync(`${SHOTS}/koi-perm-ok.png`, (await sw.webContents.capturePage()).toPNG())
  // a listener that dies is brought back
  for (const m of app.getAppMetrics()) if (m.type === 'Utility' && /Koi Keys/.test(m.name || '')) { try { process.kill(m.pid, 'SIGKILL') } catch {} }
  await wait(4500)
  ok(keyProcs() === 1 && (await inv('koi:s:get')).perm.hook, 'if the listener crashes it comes back on its own')
  // back to a normal shortcut: no listener needed
  await inv('koi:s:setMain', 'Alt+Space'); await wait(1500)
  ok(!(await inv('koi:s:get')).perm.needed, 'a normal shortcut needs no permission card')
  await inv('koi:s:setMain', 'Command+Alt'); await wait(3000)
  // turning Koi off stops the listener for good
  Apps.stop('koi', 'off'); await wait(5000)
  ok(keyProcs() === 0, 'turning Koi off stops its key listener, and it stays off')
  ok(L.windows.length && !L.windows[0].win.isDestroyed(), 'Lumen keeps running')
  ok(!errs.length, 'no crashes ' + errs.join(' | ').slice(0, 400))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
