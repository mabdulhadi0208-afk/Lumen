// Background mode: with Surge or Koi on, quitting Lumen closes the windows but keeps the tools running;
// opening Lumen again brings every tab back. With the tools off (or the setting off) quitting still quits.
process.env.LUMEN_APPS_ANYWHERE = '1'
const fs = require('fs'); const { app, BrowserWindow } = require('electron')
fs.rmSync('/tmp/lumen-bg', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-bg')
const L = require('../src/main.js'); const Apps = require('../src/apps.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-background.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
try { fs.unlinkSync('/tmp/lumen-background.log') } catch {}
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))
let quitCalls = 0; const realQuit = app.quit.bind(app); app.quit = () => { quitCalls++ }
app.whenReady().then(async () => {
  await wait(9000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  ok(Apps.list().some(a => a.running), 'Surge and Koi are running')
  ok(L.D.settings.get('backgroundApps') === true, 'background mode is on by default')

  // two windows, a few tabs
  w.createTab('data:text/html,<title>one</title>one', { active: true }); w.createTab('data:text/html,<title>two</title>two', { active: false })
  const w2 = L.createWindow({ urls: ['data:text/html,<title>three</title>three'] }); await wait(2500)
  const tabsBefore = L.windows.reduce((a, x) => a + x.tabs.size, 0)
  ok(L.windows.length === 2 && tabsBefore >= 4, `set up ${L.windows.length} windows, ${tabsBefore} tabs`)

  // Cmd+Q
  L.__quitLumen(); await wait(2000)
  ok(L.__isBackground(), 'Cmd+Q puts Lumen in the background')
  ok(L.windows.length === 0 && !BrowserWindow.getAllWindows().some(b => !b.isDestroyed() && /ui\/index\.html/.test(b.webContents.getURL())), 'every browser window closed')
  ok(quitCalls === 0, 'Lumen itself did not quit')
  ok(Apps.list().filter(a => a.running).length === 2, 'Surge and Koi still running')
  const saved = (L.D.session.get().windows || [])
  ok(saved.length === 2 && saved.reduce((a, x) => a + x.tabs.length, 0) === tabsBefore, `both windows and all ${tabsBefore} tabs are saved (${saved.length} windows)`)
  ok(L.D.settings.get('backgroundToldOnce') === true, 'told once that Lumen is still running')

  // open Lumen again
  app.emit('activate'); await wait(3000)
  ok(!L.__isBackground() && L.windows.length === 2, 'opening Lumen again brings both windows back: ' + L.windows.length)
  const titles = L.windows.flatMap(x => x.order.map(i => x.tabs.get(i).title || x.tabs.get(i).url)).join(' ')
  ok(L.windows.reduce((a, x) => a + x.tabs.size, 0) === tabsBefore && /three/.test(titles), 'with every tab: ' + titles.slice(0, 120))

  // second launch while in the background (clicking Lumen in Finder, Windows Start menu)
  L.__quitLumen(); await wait(1500)
  ok(L.__isBackground(), 'back in the background')
  app.emit('second-instance', {}, []); await wait(3000)
  ok(!L.__isBackground() && L.windows.length === 2 && L.windows.some(x => x.win.isVisible()), 'launching Lumen again also brings the windows back')

  // setting off: Cmd+Q quits for real
  L.D.settings.set({ backgroundApps: false, confirmQuit: false })
  L.__quitLumen(); await wait(600)
  ok(quitCalls === 1 && !L.__isBackground(), 'with background mode off, Cmd+Q quits')
  L.D.settings.set({ backgroundApps: true })

  // every tool turned off while in the background: nothing left to run for, so Lumen quits instead of hiding forever
  L.__quitLumen(); await wait(1500)
  const q0 = quitCalls
  for (const a of Apps.list().filter(a => a.running)) { try { Apps.stop(a.id, 'quit') } catch (e) { LOG('    stop: ' + e.message) } }
  await wait(2500)
  ok(quitCalls > q0, 'when the last tool stops in the background, Lumen quits')

  ok(!errs.length, 'no errors' + (errs.length ? ': ' + errs[0].slice(0, 300) : ''))
  LOG(fails ? `${fails} FAILED` : 'ALL PASS'); app.quit = realQuit; app.exit(fails ? 1 : 0)
})
