// 4.4.11: clean links. Copy Link (on a link, or on a tab) copies the real address: redirect wrappers from search
// results, social posts and mail scanners are unwrapped, tracking tags are removed, and a toast says what it took
// off. Ordinary links are copied exactly as they are.
// Run: xvfb-run -a npx electron test/cleanlink4411.js --no-sandbox   (log: /tmp/lumen-cleanlink4411.log)
const fs = require('fs'), http = require('http'); const { app, clipboard } = require('electron')
fs.rmSync('/tmp/lumen-cleanlink4411', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-cleanlink4411')
const LOG = '/tmp/lumen-cleanlink4411.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 150000)
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end('<!doctype html><title>Links</title><h1>Links</h1>') }).listen(0, '127.0.0.1')
const L = require('../src/main.js')
// the virtual display has no real clipboard: keep what Lumen writes
let copied = null; clipboard.writeText = t => { copied = t }

const C = L.__cleanLink
const cases = [
  ['https://www.google.com/url?sa=t&q=https%3A%2F%2Fexample.com%2Fstory%3Futm_source%3Dnews%26id%3D7&usg=AOv', 'https://example.com/story?id=7', 1, true],
  ['https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.org%2Fa%3Ffbclid%3DIwAR1&h=AT0', 'https://example.org/a', 1, true],
  ['https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fexample.net%2Freset&data=05%7C01', 'https://example.net/reset', 0, true],
  ['https://www.youtube.com/redirect?event=video_description&q=https%3A%2F%2Fexample.com%2Fshop&v=abc', 'https://example.com/shop', 0, true],
  ['https://example.com/page?utm_source=x&utm_medium=y&gclid=z&keep=1', 'https://example.com/page?keep=1', 3, false],
  ['https://example.com/plain?q=1', 'https://example.com/plain?q=1', 0, false],
  ['https://www.google.com/search?q=https%3A%2F%2Fexample.com', 'https://www.google.com/search?q=https%3A%2F%2Fexample.com', 0, false],
  ['https://www.google.com/url?q=javascript:alert(1)', 'https://www.google.com/url?q=javascript:alert(1)', 0, false],
]
for (const [inp, want, n, unw] of cases) { const c = C(inp); ok(c.url === want && c.removed === n && c.unwrapped === unw, `${new URL(inp).hostname}${new URL(inp).pathname} -> ${c.url} (${c.removed} removed${c.unwrapped ? ', unwrapped' : ''})`) }

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  const t = w.createTab(`http://127.0.0.1:${site.address().port}/`, { active: true }); await wait(1500)
  let menu = null; const real = L.__nova.popupMenu; L.__nova.popupMenu = (win, tpl) => { menu = tpl }
  const flat = m => (m || []).flatMap(i => [i, ...flat(i.submenu)])
  const rightClick = async link => { menu = null; w.contextMenu(t, { linkURL: link, linkText: 'a link', x: 20, y: 20, selectionText: '', mediaType: 'none', isEditable: false, editFlags: {} }); await wait(250); return flat(menu).find(i => i.label === 'Copy Link') }

  let item = await rightClick(cases[0][0])
  ok(!!item, 'a link offers Copy Link'); item && item.click(); await wait(300)
  ok(copied === 'https://example.com/story?id=7', 'Copy Link on a search result copies the real page: ' + copied)
  ok(await ex(`/unwrapped and 1 tracker removed/.test(document.getElementById('toast').textContent)`), 'the toast says it unwrapped it and took a tracker off')
  item = await rightClick(cases[4][0]); item && item.click(); await wait(300)
  ok(copied === 'https://example.com/page?keep=1' && await ex(`/3 trackers removed/.test(document.getElementById('toast').textContent)`), 'tracking tags come off, and the toast counts them')
  item = await rightClick(cases[5][0]); item && item.click(); await wait(300)
  ok(copied === 'https://example.com/plain?q=1' && await ex(`/^\\s*Link copied\\s*$/.test(document.querySelector('#toast .t-msg').textContent)`), 'an ordinary link is copied as it is, with a plain toast')
  L.__nova.popupMenu = real

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
