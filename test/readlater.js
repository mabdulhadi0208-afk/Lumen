// Read later: save, list in the menu and on the new tab page, open (takes it off), remove; plus popup and session fixes.
const http = require('http'), fs = require('fs'); const { app } = require('electron')
http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(`<title>Article ${q.url.slice(1)}</title><body><h1>Article ${q.url}</h1><button id="pop" onclick="window.open('lumen://settings','x','width=400,height=400')">pop</button></body>`) }).listen(48210)
fs.rmSync('/tmp/lumen-rl', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-rl')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 3) errors.push(e.message) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  const toastTxt = () => ex(`(document.querySelector('#toast') || document.querySelector('.toast') || {}).textContent || ''`)

  for (const n of ['one', 'two', 'three']) { w.createTab('http://127.0.0.1:48210/' + n, { active: true }); await wait(1200); await ex(`api.do('readLater')`); await wait(200) }
  ok(L.D.readLater.get().length === 3, 'three pages saved')
  ok(L.D.readLater.get()[0].title === 'Article three', 'newest first with the page title')
  console.log('   toast:', await toastTxt()); await wait(400)
  ok(await ex(`(() => { const r = document.getElementById('toast').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth })()`), 'toast is fully on screen with tabs on top')
  fs.writeFileSync(SHOTS + '/readlater-toast.png', (await w.ui.webContents.capturePage()).toPNG())
  await ex(`api.do('readLater')`); await wait(200)
  ok(L.D.readLater.get().length === 2 && !L.D.isReadLater('http://127.0.0.1:48210/three'), 'saving the same page again takes it off (toggle)')
  await ex(`api.do('readLater')`); await wait(200)

  // the main menu lists them
  await ex(`openMainMenu()`); await wait(900)
  ok(await ex(`document.querySelectorAll('[data-mm=rlopen]').length`) === 3, 'menu lists the 3 saved pages')
  ok(/Remove from Read later/.test(await ex(`document.querySelector('[data-mm=readlater]').textContent`)), 'menu shows Remove for a saved page')
  const pos = await ex(`(() => { const e = document.querySelector('[data-mm=rlopen]'); e.scrollIntoView({ block: 'nearest' }); const p = e.getBoundingClientRect(); return p.right <= innerWidth && p.bottom <= innerHeight && p.width > 150 })()`)
  ok(pos, 'menu rows are on screen and not squashed')
  fs.writeFileSync(SHOTS + '/readlater-menu.png', (await w.ui.webContents.capturePage()).toPNG())
  await ex(`document.querySelector('[data-mm=rldel]').click()`); await wait(400)
  ok(L.D.readLater.get().length === 2, 'remove button in the menu works')
  await ex(`openMainMenu()`); await wait(700)
  const before = w.tabs.size
  await ex(`document.querySelector('[data-mm=rlopen]').click()`); await wait(1200)
  ok(w.tabs.size === before + 1 && L.D.readLater.get().length === 1, 'opening from the menu opens a tab and takes it off the list')

  // new tab page
  for (const n of ['four', 'five']) L.D.addReadLater('http://127.0.0.1:48210/' + n, 'Article ' + n)
  const nt = w.createTab('lumen://newtab', { active: true }); await wait(2500)
  const pg = s => nt.view.webContents.executeJavaScript(s)
  ok(await pg(`document.querySelectorAll('#rl [data-rl]').length`) === 3, 'new tab page shows the Read later row')
  ok(await pg(`(() => { const r = document.querySelector('.later').getBoundingClientRect(); return r.width > 300 && r.left >= 0 && r.right <= innerWidth })()`), 'Read later row sits inside the page')
  fs.writeFileSync(SHOTS + '/readlater-ntp.png', (await nt.view.webContents.capturePage()).toPNG())
  await pg(`document.querySelector('#rl .rl-x').click()`); await wait(1200)
  ok(L.D.readLater.get().length === 2 && await pg(`document.querySelectorAll('#rl [data-rl]').length`) === 2, 'remove on the new tab page works')
  await pg(`document.querySelector('#rl [data-rl]').click()`); await wait(1500)
  ok(/48210/.test(nt.view.webContents.getURL()) && L.D.readLater.get().length === 1, 'opening from the new tab page goes there and takes it off')

  // a web page popup can not open lumen:// pages
  const t = w.createTab('http://127.0.0.1:48210/pop', { active: true }); await wait(1500)
  const { BrowserWindow } = require('electron'); const n0 = BrowserWindow.getAllWindows().length
  await t.view.webContents.executeJavaScript(`document.getElementById('pop').click()`, true); await wait(1200)
  const lumenPopups = BrowserWindow.getAllWindows().filter(b => { try { return b.webContents.getURL().startsWith('lumen://') } catch { return false } })
  ok(!lumenPopups.length, 'web page popup cannot open lumen:// (' + (BrowserWindow.getAllWindows().length - n0) + ' popups)')

  // saved after quit
  L.D.readLater.flush()
  ok(JSON.parse(fs.readFileSync('/tmp/lumen-rl/readlater.json', 'utf8')).length === 1, 'list is written to disk')
  ok(!errors.length, 'no UI errors ' + errors.join(' | '))
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
