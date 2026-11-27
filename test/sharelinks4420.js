// 4.4.20: sharing links is clean. Copy All Tab Links cleans every link like Copy Link (redirects unwrapped, tracking
// tags off), skips Lumen's own pages, and copies a titled list as HTML next to the plain list of addresses; the
// toast counts what it copied and took off. Paste and Go with a wrapped or tagged link opens the real page.
// Run: xvfb-run -a npx electron test/sharelinks4420.js --no-sandbox   (log: /tmp/lumen-sharelinks4420.log)
const fs = require('fs'), http = require('http'); const { app, clipboard } = require('electron')
fs.rmSync('/tmp/lumen-sharelinks4420', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-sharelinks4420')
const LOG = '/tmp/lumen-sharelinks4420.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 150000)
const TITLES = { '/soup': 'Winter soups & stews', '/hike': 'Ridge hike' }
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(`<!doctype html><title>${TITLES[new URL('http://x' + q.url).pathname] || 'Page'}</title><h1>${q.url}</h1>`) }).listen(0, '127.0.0.1')
const L = require('../src/main.js')
// the virtual display has no real clipboard: keep what Lumen writes, and hand it what a copy would have put there
let text = null, html = null, CLIP = ''
clipboard.writeText = t => { text = t; html = null }
clipboard.write = d => { text = d.text; html = d.html }
clipboard.readText = () => CLIP

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  L.D.settings.set({ cleanLinks: false })   // pages keep their tags in the address bar, like links you were sent
  const B = `http://127.0.0.1:${site.address().port}`
  w.createTab(B + '/soup?id=3&utm_source=mail&fbclid=X1', { active: false })
  w.createTab(B + '/hike', { active: false })
  w.createTab('lumen://settings', { active: false })
  await wait(2200)

  // Copy All Tab Links
  await ex(`api.do('copyAllLinks')`); await wait(400)
  const lines = (text || '').split('\n')
  ok(lines.length === 2 && lines[0] === B + '/soup?id=3' && lines[1] === B + '/hike', 'the plain list has each web page once, cleaned, and skips Lumen pages: ' + JSON.stringify(lines))
  ok(html === `<ul><li><a href="${B}/soup?id=3">Winter soups &amp; stews</a></li><li><a href="${B}/hike">Ridge hike</a></li></ul>`, 'the HTML is a list of titled links: ' + html)
  ok(await ex(`/Copied 2 tab links, 2 trackers removed/.test(document.querySelector('#toast .t-msg').textContent)`), 'the toast counts the links and the trackers it took off')

  // Paste and Go
  CLIP = 'https://www.google.com/url?q=' + encodeURIComponent(B + '/hike?utm_campaign=x') + '&sa=t'
  const n0 = w.order.length
  await ex(`api.do('pasteGo')`); await wait(1500)
  const t = w.tabs.get(w.activeId), u = t.view.webContents.getURL()
  ok(w.order.length === n0 + 1 && u === B + '/hike', 'Paste and Go with a wrapped, tagged link opens the real page: ' + u)
  ok(L.__pasteTarget('example.com/x?utm_source=a&id=1') === 'https://example.com/x?id=1', 'a typed-style address is cleaned too: ' + L.__pasteTarget('example.com/x?utm_source=a&id=1'))
  ok(/^https:\/\/www\.google\.com\/search\?q=/.test(L.__pasteTarget('winter soup')) || /search/.test(L.__pasteTarget('winter soup')), 'plain words still search: ' + L.__pasteTarget('winter soup'))

  // a window with only Lumen pages has nothing to copy
  const w2 = L.createWindow({ urls: ['lumen://settings'] }); await wait(1500)
  text = 'unchanged'
  L.__copyAllLinks(w2); await wait(400)
  ok(text === 'unchanged' && await w2.ui.webContents.executeJavaScript(`/No web pages to copy/.test(document.querySelector('#toast .t-msg').textContent)`), 'a window with no web pages copies nothing and says so')

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
