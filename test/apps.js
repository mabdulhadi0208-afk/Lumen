// Surge and Koi inside Lumen: they start, keep their hands off Lumen (menu, shortcuts, shutdown), keep their data
// apart, stay out of each other's shortcuts, quit on their own, and show up in Settings.
process.env.LUMEN_APPS_ANYWHERE = '1'   // they are Mac and Windows tools; run them here anyway to test the plumbing
const fs = require('fs'), path = require('path'); const { app, globalShortcut, Menu, BrowserWindow } = require('electron')
fs.rmSync('/tmp/lumen-apps', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-apps')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js'); const Apps = require('../src/apps.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-apps.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))
app.whenReady().then(async () => {
  await wait(9000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  const list = Apps.list(); LOG('    ' + JSON.stringify(list))
  ok(list.find(a => a.id === 'surge').running, 'Surge starts inside Lumen')
  ok(list.find(a => a.id === 'koi').running, 'Koi starts inside Lumen')
  ok(L.windows.length >= 1 && !w.win.isDestroyed(), 'Lumen still has its window')

  // good neighbors
  const top = (Menu.getApplicationMenu() || { items: [] }).items.map(i => i.label)
  ok(!top.includes('Surge') && top.some(l => /File|Lumen|Edit/.test(l)), 'Lumen keeps its own menu: ' + top.slice(0, 4).join(', '))
  ok(!globalShortcut.isRegistered('CommandOrControl+Shift+N') && !globalShortcut.isRegistered('CommandOrControl+Shift+S') && !globalShortcut.isRegistered('CommandOrControl+Shift+D'), "no system-wide Cmd Shift shortcuts that would take Lumen's")
  ok(!process.listeners('SIGTERM').some(f => /markCleanExit/.test(String(f))), 'Surge did not take over shutdown signals')
  ok(fs.existsSync('/tmp/lumen-apps/apps/surge/settings.json') && JSON.parse(fs.readFileSync('/tmp/lumen-apps/apps/surge/settings.json', 'utf8')).welcomed === true, 'Surge keeps its data in its own folder, no welcome pop-up of its own')
  ok(fs.existsSync('/tmp/lumen-apps/apps/koi/koi-settings.json') && JSON.parse(fs.readFileSync('/tmp/lumen-apps/apps/koi/koi-settings.json', 'utf8')).tourSeen === true, 'Koi keeps its data apart, no tour pop-up of its own')
  ok(!BrowserWindow.getAllWindows().some(b => /tour|welcome/i.test(b.webContents.getURL()) && b.isVisible()), 'no extra intro windows on top of Lumen')

  // a tool clearing "all" its shortcuts only clears its own
  const ka = globalShortcut.register('Control+Alt+F12', () => {})   // stands in for one of Lumen's
  require('electron').ipcMain.emit('pop:action', { sender: null }, 'noop')
  const koiShim = require('module')._load('electron', { filename: path.join(__dirname, '../apps/koi/main.js') })
  koiShim.globalShortcut.register('Control+Alt+F11', () => {})
  koiShim.globalShortcut.unregisterAll()
  ok(!ka || globalShortcut.isRegistered('Control+Alt+F12'), "Koi's unregisterAll leaves other shortcuts alone")
  ok(!globalShortcut.isRegistered('Control+Alt+F11'), 'and does clear its own')
  globalShortcut.unregister('Control+Alt+F12')
  ok(koiShim.app.getPath('userData') === '/tmp/lumen-apps/apps/koi' && koiShim.app.requestSingleInstanceLock() === true, "Koi sees its own folder and never fights Lumen's single-instance lock")

  // open Surge from Lumen
  const before = BrowserWindow.getAllWindows().length
  ok(await L.__appOpen('surge', 'settings'), 'Open Surge from Lumen')
  await wait(2500)
  const sw = BrowserWindow.getAllWindows().find(b => /settings\.html/.test(b.webContents.getURL()))
  ok(!!sw, 'Surge settings window opens: ' + (sw ? path.basename(sw.webContents.getURL()) : 'none') + ' (' + before + ' -> ' + BrowserWindow.getAllWindows().length + ' windows)')
  if (sw) {
    sw.show(); await wait(1500)
    // chrome only: dots and swatches that show your own glow color (inline styles) may be green on purpose
    const green = await sw.webContents.executeJavaScript(`[...document.querySelectorAll('*')].slice(0, 3000).some(e => !e.closest('[style*="--c"], [style*="color"], [style*="background"]') && /0, 255, 133/.test(getComputedStyle(e).color + getComputedStyle(e).backgroundColor))`).catch(() => null)
    if (green) LOG('    green: ' + await sw.webContents.executeJavaScript(`[...document.querySelectorAll('*')].filter(e => /0, 255, 133/.test(getComputedStyle(e).color + getComputedStyle(e).backgroundColor + getComputedStyle(e).borderColor)).slice(0, 5).map(e => e.tagName + '.' + e.className + ' ' + (e.textContent || '').trim().slice(0, 30)).join(' | ')`))
    ok(green === false, "Surge settings use Lumen's colors (no neon green left)")
    fs.writeFileSync(`${SHOTS}/apps-surge-settings.png`, (await sw.webContents.capturePage()).toPNG())
    ok(BrowserWindow.fromWebContents(sw.webContents) === sw, "Surge's windows are real windows (its close and hide buttons find them)")
    require('electron').ipcMain.emit('win:close', { sender: sw.webContents }); await wait(800)
    ok(sw.isDestroyed(), "Surge's own close button closes its window")
  }

  // the Settings page
  const s = w.createTab('lumen://settings/apps', { active: true }); await wait(2000)
  const sq = x => s.view.webContents.executeJavaScript(x)
  ok(await sq(`document.querySelectorAll('.appcard').length`) === 2 && await sq(`document.querySelectorAll('.appcard.on').length`) === 2, 'Settings shows Surge and Koi, both running')
  ok(await sq(`[...document.querySelectorAll('.appicon')].every(i => i.naturalWidth > 0)`), 'with their own icons')
  fs.writeFileSync(`${SHOTS}/apps-settings.png`, (await s.view.webContents.capturePage()).toPNG())

  // "Quit Koi" from its own menu turns only Koi off
  require('electron').ipcMain.emit('pop:action', { sender: null }, 'quit'); await wait(800)
  ok(!Apps.isRunning('koi') && Apps.isRunning('surge') && !w.win.isDestroyed(), 'Quit in Koi turns off Koi only, Lumen and Surge keep running')
  await sq(`location.reload()`); await wait(1800)
  ok(await sq(`document.querySelectorAll('.appcard.on').length`) === 1, 'Settings shows Koi off')

  // turn Surge off from Lumen
  await sq(`(() => { const s = document.querySelector('[data-appsw=surge]'); s.checked = false; s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await wait(1200)
  ok(!Apps.isRunning('surge') && (L.D.settings.get('apps') || {}).surge === false, 'Surge switch in Settings turns it off and remembers')
  ok(!BrowserWindow.getAllWindows().some(b => /apps[\\/]surge/.test(b.webContents.getURL())), 'and closes its windows')

  ok(!errs.length, 'no crashes ' + errs.join(' | ').slice(0, 400))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
