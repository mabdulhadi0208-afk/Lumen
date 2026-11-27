// 4.4.12: every way of copying the page's link is clean. Copy Clean Link (Shift Cmd C, and the command bar, which used
// to copy the raw address) unwraps redirects and takes tracking tags off; Copy Link with Title (Opt Cmd C) puts a
// Markdown link in the text and a real titled link in the HTML, so Mail, Notes and documents paste a clickable title.
// Run: xvfb-run -a npx electron test/copylink4412.js --no-sandbox   (log: /tmp/lumen-copylink4412.log)
const fs = require('fs'), http = require('http'); const { app, clipboard, Menu } = require('electron')
fs.rmSync('/tmp/lumen-copylink4412', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-copylink4412')
const LOG = '/tmp/lumen-copylink4412.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 150000)
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end('<!doctype html><title>Winter [soups] & stews</title><h1>Soups</h1>') }).listen(0, '127.0.0.1')
const L = require('../src/main.js')
// the virtual display has no real clipboard: keep what Lumen writes
let text = null, html = null
clipboard.writeText = t => { text = t; html = null }
clipboard.write = d => { text = d.text; html = d.html }

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  L.D.settings.set({ cleanLinks: false })   // so the page keeps its trackers in the address bar, like a link you were sent
  const base = `http://127.0.0.1:${site.address().port}/recipes?id=4&utm_source=newsletter&utm_campaign=winter&fbclid=IwAR9`
  w.createTab(base, { active: true }); await wait(1500)
  const toastText = () => ex(`document.querySelector('#toast .t-msg').textContent`)

  // the menu items, with their shortcuts
  const items = []; const walk = m => m && m.items.forEach(i => { items.push(i); walk(i.submenu) }); walk(Menu.getApplicationMenu())
  const clean = items.find(i => i.label === 'Copy Clean Link'), titled = items.find(i => i.label === 'Copy Link with Title')
  ok(!!clean && clean.accelerator === 'CmdOrCtrl+Shift+C', 'the menu has Copy Clean Link on Shift Cmd C')
  ok(!!titled && titled.accelerator === 'CmdOrCtrl+Alt+C', 'and Copy Link with Title on Opt Cmd C')

  // Shift Cmd C
  clean.click(undefined, w.win); await wait(400)
  ok(text === `http://127.0.0.1:${site.address().port}/recipes?id=4`, 'Copy Clean Link takes the trackers off: ' + text)
  ok(/3 trackers removed/.test(await toastText()), 'and the toast counts them: ' + await toastText())

  // the command bar entry, which used to copy the raw address
  text = null
  await ex(`api.do('copyPageLink', false)`); await wait(400)
  ok(text === `http://127.0.0.1:${site.address().port}/recipes?id=4`, 'the command bar copies the clean link too')

  // Opt Cmd C: Markdown text and a titled HTML link
  titled.click(undefined, w.win); await wait(400)
  ok(text === `[Winter soups & stews](http://127.0.0.1:${site.address().port}/recipes?id=4)`, 'Copy Link with Title puts a Markdown link in the text: ' + text)
  ok(html === `<a href="http://127.0.0.1:${site.address().port}/recipes?id=4">Winter [soups] &amp; stews</a>`, 'and a clickable titled link in the HTML: ' + html)
  ok(/Link with title copied, 3 trackers removed/.test(await toastText()), 'its toast says so: ' + await toastText())

  // a page wrapped in a redirect (opened from a mail scanner, say) copies the real page
  const wrapped = 'https://nam12.safelinks.protection.outlook.com/?url=' + encodeURIComponent(`http://127.0.0.1:${site.address().port}/recipes?id=9&utm_source=mail`) + '&data=05'
  ok(L.__cleanLink(wrapped).url === `http://127.0.0.1:${site.address().port}/recipes?id=9`, 'a wrapped address cleans to the real page')

  // pages that are not on the web copy nothing
  w.createTab('lumen://settings', { active: true }); await wait(1200)
  text = 'unchanged'
  clean.click(undefined, w.win); await wait(300)
  ok(text === 'unchanged', 'a Lumen page has no link to copy')

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
