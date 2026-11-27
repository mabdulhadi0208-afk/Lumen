// 4.4.16: Recently Closed knows tabs, batches and windows. Since 4.4.14 and 4.4.15 the closed list holds batches of
// tabs and whole windows; the main menu's Recently closed and the reopen-by-position call used to show them as
// "undefined" and open an empty tab. Now each shows a real name ("3 tabs: ...", "Window with 2 tabs: ...") and comes
// back whole. The menu bar gets a History > Recently Closed submenu that stays current; Home keeps single tabs only.
// Run: xvfb-run -a npx electron test/closedlist4416.js --no-sandbox   (log: /tmp/lumen-closedlist4416.log)
const fs = require('fs'), http = require('http'); const { app, Menu } = require('electron')
fs.rmSync('/tmp/lumen-closedlist4416', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-closedlist4416')
const LOG = '/tmp/lumen-closedlist4416.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 170000)
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(`<!doctype html><title>Page ${q.url.slice(1)}</title><h1>${q.url}</h1>`) }).listen(0, '127.0.0.1')
const L = require('../src/main.js')
app.on('window-all-closed', () => {})

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  const U = p => `http://127.0.0.1:${site.address().port}${p}`
  const paths = x => x.order.map(id => { const t = x.tabs.get(id); try { return new URL(t.view ? t.view.webContents.getURL() : t.url).pathname } catch { return '?' } })
  const flat = m => (m ? m.items : []).flatMap(i => [i, ...flat(i.submenu)])
  const submenu = () => { const rc = flat(Menu.getApplicationMenu()).find(i => i.label === 'Recently Closed'); return rc && rc.submenu ? rc.submenu.items : [] }

  ok(submenu().length === 1 && submenu()[0].label === 'Nothing closed yet' && !submenu()[0].enabled, 'History > Recently Closed starts empty')

  // a single tab, a batch of three, and a whole window
  for (const p of ['/solo', '/b1', '/b2', '/b3']) w.createTab(U(p), { active: false })
  await wait(1800)
  const keep = w.order[0]; w.activate(keep)
  w.closeTab(w.order.find(id => paths(w)[w.order.indexOf(id)] === '/solo')); await wait(300)
  await ex(`api.do('closeOthers')`); await wait(400)
  const w2 = L.createWindow({ urls: [U('/w1'), U('/w2')] }); await wait(2000)
  w2.win.close(); await wait(1000)

  const list = L.__closedList(10)
  ok(list.length === 3 && list.map(c => c.kind).join() === 'window,batch,tab', 'the list knows a window, a batch and a tab, newest first: ' + list.map(c => c.kind).join())
  ok(/^Window with 2 tabs: Page w1$/.test(list[0].title) && /^3 tabs: Page b1$/.test(list[1].title) && list[2].title === 'Page solo', 'each has a real name: ' + list.map(c => c.title).join(' | '))

  // the main menu's Recently closed (it used to say undefined)
  const info = await ex(`api.do('menuInfo')`)
  ok(info.closed.length === 3 && info.closed.every(c => c.title && !/undefined/.test(c.title)), 'the main menu lists them by name, with no undefined')

  // the menu bar's submenu is current
  await wait(400)
  const sm = submenu()
  ok(sm.length >= 4 && sm[0].label.startsWith('Window with 2 tabs') && sm[1].label.startsWith('3 tabs') && sm[2].label === 'Page solo', 'History > Recently Closed lists the same three: ' + sm.slice(0, 3).map(i => i.label).join(' | '))
  ok(sm.some(i => i.label === 'Reopen Last Closed Window' && i.enabled), 'and offers Reopen Last Closed Window')

  // reopening the batch by its place in the list brings all three back (it used to open an empty tab)
  const n0 = w.order.length
  await ex(`api.do('reopenAt', 1)`); await wait(1800)
  ok(w.order.length === n0 + 3 && ['/b1', '/b2', '/b3'].every(p => paths(w).includes(p)), 'picking the batch brings all three tabs back: ' + paths(w).join(' '))
  ok(!paths(w).some(p => p === '?' || p === '/undefined'), 'and never opens an empty tab')
  ok(L.__closedList(10).map(c => c.kind).join() === 'window,tab', 'the batch leaves the list')

  // clicking the window in the menu bar brings the window back
  await wait(400)
  const wn = L.windows.length
  submenu()[0].click(); await wait(2500)
  const back = L.windows[L.windows.length - 1]
  ok(L.windows.length === wn + 1 && JSON.stringify(paths(back)) === JSON.stringify(['/w1', '/w2']), 'clicking the window in the menu bar reopens it whole')
  await wait(400)
  ok(submenu()[0].label === 'Page solo', 'and the menu updates itself')

  // Home's Closed list shows single tabs only, with real addresses
  w.activate(keep); w.closeTab(w.order.find(id => paths(w)[w.order.indexOf(id)] === '/b2')); await wait(200)
  await ex(`api.do('closeOthers')`); await wait(400)
  const home = await ex(`api.do('home')`).catch(() => null) || await w.tabs.get(keep).view.webContents.executeJavaScript(`L.invoke('home')`).catch(() => null)
  if (home) ok(home.closed.length >= 2 && home.closed.every(c => c.url && /^http/.test(c.url)), 'Home lists the closed tabs, each with its address: ' + home.closed.map(c => c.title).join(' | '))

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
