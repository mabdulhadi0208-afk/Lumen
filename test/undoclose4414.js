// 4.4.14: closing several tabs at once is one step to undo. Close Other Tabs, Close Tabs to the Right and Close
// Duplicate Tabs show "Closed N tabs" with Undo; Undo (or Reopen Closed Tab) brings the whole batch back, each tab
// where it was, and your tab stays in front. Duplicates ignore tracking tags and the part after #.
// Run: xvfb-run -a npx electron test/undoclose4414.js --no-sandbox   (log: /tmp/lumen-undoclose4414.log)
const fs = require('fs'), http = require('http'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-undoclose4414', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-undoclose4414')
const LOG = '/tmp/lumen-undoclose4414.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 170000)
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(`<!doctype html><title>Page ${q.url}</title><h1>${q.url}</h1>`) }).listen(0, '127.0.0.1')
const L = require('../src/main.js')

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  const U = p => `http://127.0.0.1:${site.address().port}${p}`
  const paths = () => w.order.map(id => { const t = w.tabs.get(id); try { return new URL(t.view ? t.view.webContents.getURL() : t.url).pathname } catch { return '?' } })
  const fresh = async list => {
    const old = [...w.order]   // open the new set first: closing the last tab would close the window
    for (const p of list) w.createTab(U(p), { active: false })
    for (const id of old) w.closeTab(id)
    await wait(1500); w.activate(w.order[0])
  }
  const toast = () => ex(`document.querySelector('#toast .t-msg').textContent`)
  const undo = () => ex(`document.querySelector('#toast .toast-btn') && document.querySelector('#toast .toast-btn').textContent === 'Undo' && (document.querySelector('#toast .toast-btn').click(), true)`)

  // Close Other Tabs, then Undo
  await fresh(['/a', '/b', '/c', '/d', '/e']); w.activate(w.order[2]); await wait(300)
  const keep = w.activeId
  await ex(`api.do('closeOthers')`); await wait(500)
  ok(w.order.length === 1 && w.activeId === keep, 'Close Other Tabs leaves only your tab')
  ok(/Closed 4 tabs/.test(await toast()) && await ex(`document.querySelector('#toast .toast-btn').textContent === 'Undo'`), 'the toast says Closed 4 tabs, with Undo')
  ok(await undo(), 'Undo is there to press'); await wait(1500)
  ok(JSON.stringify(paths()) === JSON.stringify(['/a', '/b', '/c', '/d', '/e']), 'Undo brings all four back, each where it was: ' + paths().join(' '))
  ok(w.activeId === keep, 'and your tab stays in front')

  // Close Tabs to the Right from the tab menu, then Reopen Closed Tab
  let menu = null; const real = L.__nova.popupMenu; L.__nova.popupMenu = (win, tpl) => { menu = tpl }
  L.__tabMenu(w, w.order[1]); await wait(200)
  const right = (menu || []).find(i => /Close Tabs to the Right|Close Tabs Below/.test(i.label || ''))
  ok(!!right, 'the tab menu has Close Tabs to the Right')
  right.click(); await wait(500)
  ok(JSON.stringify(paths()) === JSON.stringify(['/a', '/b']), 'it closes the three to the right')
  ok(/Closed 3 tabs/.test(await toast()), 'with a Closed 3 tabs toast')
  L.__reopenClosed(w); await wait(1500)
  ok(JSON.stringify(paths()) === JSON.stringify(['/a', '/b', '/c', '/d', '/e']), 'Reopen Closed Tab also brings the whole batch back in one go: ' + paths().join(' '))
  ok(/Reopened 3 tabs/.test(await toast()), 'and says how many it reopened')
  L.__nova.popupMenu = real

  // one tab on its own still reopens on its own
  const one = w.order[4]; w.closeTab(one); await wait(300)
  L.__reopenClosed(w); await wait(1200)
  ok(w.order.length === 5 && paths()[4] === '/e', 'a single closed tab still comes back by itself')

  // duplicates: tracking tags and #parts do not make a page different
  await fresh(['/x', '/x?utm_source=mail', '/x#reviews', '/y', '/y?keep=1']); w.activate(w.order[0]); await wait(300)
  await ex(`api.do('closeDuplicates')`); await wait(500)
  ok(JSON.stringify(paths()) === JSON.stringify(['/x', '/y', '/y']) && w.order.length === 3, 'Close Duplicate Tabs sees through trackers and #parts, and keeps pages that really differ: ' + paths().join(' '))
  ok(/Closed 2 duplicate tabs/.test(await toast()) && await ex(`!!document.querySelector('#toast .toast-btn')`), 'its toast has Undo too')
  ok(await undo(), 'Undo is there'); await wait(1500)
  ok(w.order.length === 5, 'and brings the duplicates back')
  await ex(`api.do('closeDuplicates')`); await wait(300)
  await ex(`api.do('closeDuplicates')`); await wait(300)
  ok(/No duplicate tabs/.test(await toast()), 'with nothing left to close it says so')

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  try { fs.mkdirSync('/tmp/lumen-shots', { recursive: true }); await ex(`api.do('closeOthers')`); await wait(500); fs.writeFileSync('/tmp/lumen-shots/undoclose4414.png', (await w.ui.webContents.capturePage()).toPNG()) } catch {}
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
