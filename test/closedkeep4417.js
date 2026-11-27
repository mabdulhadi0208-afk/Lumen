// 4.4.17: Recently Closed survives a restart. The closed list is kept in closed.json: Lumen starts with what was
// there (tabs, batches and windows), keeps the file current as you close and reopen things, leaves out a window that
// comes back with the session anyway, ignores broken entries, and Clear history clears it too.
// Run: xvfb-run -a npx electron test/closedkeep4417.js --no-sandbox   (log: /tmp/lumen-closedkeep4417.log)
const fs = require('fs'), path = require('path'), http = require('http'); const { app, Menu } = require('electron')
const UD = '/tmp/lumen-closedkeep4417'
fs.rmSync(UD, { recursive: true, force: true }); fs.mkdirSync(UD, { recursive: true }); app.setPath('userData', UD)
const LOG = '/tmp/lumen-closedkeep4417.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 150000)
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(`<!doctype html><title>Page ${q.url.slice(1)}</title><h1>${q.url}</h1>`) }).listen(48417, '127.0.0.1')
const U = p => 'http://127.0.0.1:48417' + p

// what the last run left behind: a closed tab, a batch, a window, the window Lumen quit with (also in the session),
// and two broken entries
const quitWith = { bounds: { x: 0, y: 0, width: 1200, height: 800 }, active: 0, groups: [], tabs: [{ url: U('/home'), title: 'Page home' }] }
fs.writeFileSync(path.join(UD, 'closed.json'), JSON.stringify([
  { url: U('/old-tab'), title: 'Page old-tab', index: 1, at: Date.now() - 86400000 },
  { batch: [{ url: U('/b1'), title: 'Page b1', index: 1 }, { url: U('/b2'), title: 'Page b2', index: 2 }], at: Date.now() - 3600000 },
  { win: { bounds: { x: 40, y: 40, width: 900, height: 600 }, active: 1, groups: [], tabs: [{ url: U('/w1'), title: 'Page w1' }, { url: U('/w2'), title: 'Page w2' }] }, at: Date.now() - 60000 },
  { url: 'javascript:alert(1)' }, { nonsense: true },
  { win: quitWith, at: Date.now() - 1000 },
]))
fs.writeFileSync(path.join(UD, 'session.json'), JSON.stringify({ windows: [quitWith] }))
const L = require('../src/main.js')

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  const flat = m => (m ? m.items : []).flatMap(i => [i, ...flat(i.submenu)])
  const file = () => JSON.parse(fs.readFileSync(path.join(UD, 'closed.json'), 'utf8'))

  const list = L.__closedList(10)
  ok(list.map(c => c.kind).join() === 'window,batch,tab', 'after a restart the list has the window, the batch and the tab from last time: ' + list.map(c => c.kind).join())
  ok(!list.some(c => /Page home/.test(c.title)), 'the window Lumen quit with is not listed, it came back with the session')
  ok(list.length === 3, 'broken entries are dropped')
  await wait(300)
  const rc = flat(Menu.getApplicationMenu()).find(i => i.label === 'Recently Closed')
  ok(rc && rc.submenu.items[0].label.startsWith('Window with 2 tabs'), 'History, Recently Closed shows them straight away')

  // closing and reopening keeps the file current
  w.createTab(U('/fresh'), { active: true }); await wait(1200)
  w.closeTab(w.activeId); await wait(300)
  L.__reopenAt(w, 2); await wait(1500)   // the batch from last time
  L.D.settings.flush && L.D.settings.flush()
  await wait(900)
  const f = file()
  ok(f.some(c => c.url === U('/fresh')) && !f.some(c => c.batch), 'closed.json follows along: the new tab is in, the reopened batch is out')
  ok(f.every(c => c.at), 'every entry is stamped with when it was closed')

  // Clear history for the last hour clears what was closed in that hour, and keeps the older tab
  await w.tabs.get(w.activeId).view.webContents.loadURL('lumen://settings'); await wait(1500)
  await w.tabs.get(w.activeId).view.webContents.executeJavaScript(`L.invoke('clearHistory', 3600000)`); await wait(800)
  const left = L.__closedList(10)
  ok(left.length === 1 && left[0].title === 'Page old-tab', 'Clear history for the last hour leaves only the older tab: ' + left.map(c => c.title).join(' | '))
  await w.tabs.get(w.activeId).view.webContents.executeJavaScript(`L.invoke('clearHistory', 0)`); await wait(1200)
  ok(L.__closedList(10).length === 0 && file().length === 0, 'Clear all history empties it, on disk too')

  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
