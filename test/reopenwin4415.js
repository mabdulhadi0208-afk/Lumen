// 4.4.15: a closed window can come back. Closing a window with tabs keeps it: Reopen Closed Tab (Shift Cmd T) brings
// the whole window back when it was the last thing closed, and Reopen Closed Window brings back the latest window
// even after more tabs were closed. Every tab returns in order, the tab you were on is in front, and the window
// gets its size back. Private windows and empty windows are not kept.
// Run: xvfb-run -a npx electron test/reopenwin4415.js --no-sandbox   (log: /tmp/lumen-reopenwin4415.log)
const fs = require('fs'), http = require('http'); const { app, Menu } = require('electron')
fs.rmSync('/tmp/lumen-reopenwin4415', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-reopenwin4415')
const LOG = '/tmp/lumen-reopenwin4415.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 170000)
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(`<!doctype html><title>Page ${q.url}</title><h1>${q.url}</h1>`) }).listen(0, '127.0.0.1')
const L = require('../src/main.js')
app.on('window-all-closed', () => {})

app.whenReady().then(async () => {
  await wait(3500)
  const main = L.windows[0], ex = s => main.ui.webContents.executeJavaScript(s)
  const errors = []; main.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  const U = p => `http://127.0.0.1:${site.address().port}${p}`
  const paths = w => w.order.map(id => { const t = w.tabs.get(id); try { return new URL(t.view ? t.view.webContents.getURL() : t.url).pathname } catch { return '?' } })
  const close = async w => { w.win.close(); await wait(900) }

  // a second window with three tabs, the middle one in front, at a size of its own
  const w2 = L.createWindow({ urls: [U('/one'), U('/two'), U('/three')], bounds: { x: 120, y: 90, width: 1000, height: 700 } }); await wait(2200)
  w2.activate(w2.order[1]); await wait(300)
  const n0 = L.windows.length
  await close(w2)
  ok(L.windows.length === n0 - 1, 'the window closes')
  const top = L.__closedTabs[L.__closedTabs.length - 1]
  ok(!!top && !!top.win && top.win.tabs.length === 3, 'it is kept, with its three tabs')

  // Shift Cmd T: the last thing closed was a window, so the window comes back
  const items = []; const walk = m => m && m.items.forEach(i => { items.push(i); walk(i.submenu) }); walk(Menu.getApplicationMenu())
  const reopenTab = items.find(i => i.label === 'Reopen Closed Tab'), reopenWin = items.find(i => i.label === 'Reopen Closed Window')
  ok(!!reopenTab && !!reopenWin, 'the menu has Reopen Closed Tab and Reopen Closed Window')
  reopenTab.click(); await wait(2500)
  const back = L.windows[L.windows.length - 1]
  ok(L.windows.length === n0 && back !== main, 'Reopen Closed Tab brings the window back')
  ok(JSON.stringify(paths(back)) === JSON.stringify(['/one', '/two', '/three']), 'with every tab, in order: ' + paths(back).join(' '))
  ok(back.order.indexOf(back.activeId) === 1, 'and the tab you were on in front')
  const b = back.win.getBounds()
  ok(Math.abs(b.width - 1000) <= 2 && Math.abs(b.height - 700) <= 2, 'at the size it had: ' + b.width + 'x' + b.height)
  await wait(1500); ok(await back.ui.webContents.executeJavaScript(`/Reopened a window with 3 tabs/.test(document.getElementById('toast').textContent)`), 'and a toast says what came back')

  // close it again, then close a tab elsewhere: Reopen Closed Window still finds the window
  await close(back)
  main.createTab(U('/stray'), { active: true }); await wait(1200)
  main.closeTab(main.activeId); await wait(300)
  ok(!L.__closedTabs[L.__closedTabs.length - 1].win, 'a tab was closed after the window')
  reopenWin.click(); await wait(2500)
  const again = L.windows[L.windows.length - 1]
  ok(L.windows.length === n0 && again !== main && JSON.stringify(paths(again)) === JSON.stringify(['/one', '/two', '/three']), 'Reopen Closed Window brings the window back anyway')
  ok(!L.__closedTabs[L.__closedTabs.length - 1].win && L.__closedTabs[L.__closedTabs.length - 1].url.endsWith('/stray'), 'and leaves the closed tab where it was')

  // private windows and windows with nothing in them are not kept
  await close(again)
  const before = L.__closedTabs.length
  const priv = L.createWindow({ urls: [U('/secret')], incognito: true }); await wait(1500)
  await close(priv)
  ok(!L.__closedTabs.slice(before).some(c => c.win && c.win.tabs.some(t => /secret/.test(t.url))), 'a private window is never kept')
  const empty = L.createWindow({}); await wait(1500)
  await close(empty)
  ok(L.__closedTabs.length === before, 'nor is a window with only a new tab')

  // with no window open at all (a Mac keeps running), Reopen Closed Tab still brings the window back: closing the
  // last window quits on Linux, so ask for it with no window, the way the Mac menu does
  const solo = L.createWindow({ urls: [U('/alone')] }); await wait(1500)
  await close(solo)
  const n1 = L.windows.length
  L.__reopenClosed(null); await wait(2500)
  ok(L.windows.length === n1 + 1 && paths(L.windows[L.windows.length - 1])[0] === '/alone', 'Reopen Closed Tab with no window to ask from brings the last window back')

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
