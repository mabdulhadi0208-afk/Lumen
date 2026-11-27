// 4.4.19: the command bar searches what you closed. Typing finds closed tabs, batches and windows by any of their
// pages, in a Recently closed section with Reopen, and choosing one brings it back whole. Private windows never
// see it, and one letter is not enough to search.
// Run: xvfb-run -a npx electron test/closedsearch4419.js --no-sandbox   (log: /tmp/lumen-closedsearch4419.log)
const fs = require('fs'), http = require('http'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-closedsearch4419', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-closedsearch4419')
const LOG = '/tmp/lumen-closedsearch4419.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 170000)
const TITLES = { '/soup': 'Winter soup recipes', '/bread': 'Sourdough bread guide', '/hike': 'Ridge hike planner', '/maps': 'Trail maps', '/news': 'Morning news' }
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(`<!doctype html><title>${TITLES[q.url] || 'Page'}</title><h1>${q.url}</h1>`) }).listen(0, '127.0.0.1')
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

  // a closed tab, a closed batch (soup and bread) and a closed window (hike and maps)
  for (const p of ['/news', '/soup', '/bread']) w.createTab(U(p), { active: false })
  await wait(1800)
  const keep = w.order[0]; w.activate(keep)
  w.closeTab(w.order[paths(w).indexOf('/news')]); await wait(300)
  await ex(`api.do('closeOthers')`); await wait(400)
  const w2 = L.createWindow({ urls: [U('/hike'), U('/maps')] }); await wait(2000)
  w2.win.close(); await wait(1000)

  // the main process finds them by any page
  const s1 = await L.__suggest(w, 'bread')
  ok(s1.closed && s1.closed.length === 1 && s1.closed[0].kind === 'batch', 'typing "bread" finds the closed batch it was in: ' + JSON.stringify((s1.closed || []).map(c => c.title)))
  const s2 = await L.__suggest(w, 'trail maps')
  ok(s2.closed && s2.closed[0] && s2.closed[0].kind === 'window', 'typing "trail maps" finds the closed window that had it')
  const s3 = await L.__suggest(w, 'news')
  ok(s3.closed && s3.closed[0] && s3.closed[0].kind === 'tab' && s3.closed[0].title === 'Morning news', 'and a single closed tab by its title')
  ok(!(await L.__suggest(w, 'z')).closed, 'one letter does not search what you closed')
  ok(!((await L.__suggest(w, 'zebra crossing')).closed || []).length, 'no match, no section')

  // in the command bar: a Recently closed section with Reopen
  await ex(`openCmd()`); await wait(500)
  await ex(`(() => { const i = document.getElementById('cmd-input'); i.value = 'sourdough'; i.dispatchEvent(new Event('input')) })()`); await wait(1200)
  const row = await ex(`(() => { const rows = [...document.querySelectorAll('#cmd-results .res')]; const r = rows.find(x => /2 tabs: Winter soup/.test(x.textContent)); const sec = [...document.querySelectorAll('#cmd-results .sec')].some(x => x.textContent.trim() === 'Recently closed'); return { found: !!r, reopen: !!r && /Reopen/.test(r.textContent), sec } })()`)
  ok(row.found && row.sec, 'the command bar shows a Recently closed section with the batch')
  ok(row.reopen, 'with Reopen on it')
  try { fs.mkdirSync('/tmp/lumen-shots', { recursive: true }); fs.writeFileSync('/tmp/lumen-shots/closedsearch4419.png', (await w.ui.webContents.capturePage()).toPNG()) } catch {}
  await ex(`(() => { const rows = [...document.querySelectorAll('#cmd-results .res')]; const r = rows.find(x => /2 tabs: Winter soup/.test(x.textContent)); r && r.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) })()`); await wait(1800)
  ok(['/soup', '/bread'].every(p => paths(w).includes(p)), 'choosing it brings the whole batch back: ' + paths(w).join(' '))
  ok(!(L.__closedList(10).some(c => c.kind === 'batch')), 'and it leaves the closed list')

  // private windows never see what you closed
  const priv = L.createWindow({ urls: [U('/news')], incognito: true }); await wait(1500)
  ok(!((await L.__suggest(priv, 'hike')).closed || []).length, 'a private window never sees what you closed')

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
