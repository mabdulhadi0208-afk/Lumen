// 1.13: unit converter, undo close, tab archive, focus mode, settings search, archived tabs page, forget a site, command shortcuts.
const http = require('http'), fs = require('fs'); const { app } = require('electron')
http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(`<title>Page ${q.url.slice(1)}</title><body style="margin:0"><h1>Page ${q.url}</h1></body>`) }).listen(48230)
fs.rmSync('/tmp/lumen-w13', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-w13')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-w13.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const U = p => 'http://127.0.0.1:48230/' + p
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 3) errors.push(e.message) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  const shotUI = async n => fs.writeFileSync(`${SHOTS}/w13-${n}.png`, (await w.ui.webContents.capturePage()).toPNG())

  // ---- unit converter
  const conv = async q => (await ex(`api.do('suggest', ${JSON.stringify(q)})`)).conv
  const c1 = await conv('5 km in mi'), c2 = await conv('72f to c'), c3 = await conv('3 lb kg'), c4 = await conv('1 gb in mb'), c5 = await conv('100 kmh to mph')
  console.log('   ', [c1, c2, c3, c4, c5].map(c => c && c.text).join(' | '))
  ok(c1 && Math.abs(c1.value - 3.10686) < 0.001, '5 km in mi')
  ok(c2 && Math.abs(c2.value - 22.2222) < 0.001 && /°F.*°C/.test(c2.text), '72f to c')
  ok(c3 && Math.abs(c3.value - 1.36078) < 0.001, '3 lb kg (no "in")')
  ok(c4 && c4.value === 1024, '1 gb in mb')
  ok(c5 && Math.abs(c5.value - 62.1371) < 0.01, '100 kmh to mph')
  ok(!(await conv('5 km in kg')) && !(await conv('how to cook rice')) && !(await conv('iphone 15 in stock')), 'nonsense and normal searches are left alone')
  ok((await ex(`api.do('suggest', '2+2')`)).calc === 4, 'calculator still works')
  await ex(`openCmd()`); await wait(500)
  await ex(`(() => { const i = document.getElementById('cmd-input'); i.value = '10 cm in in'; i.dispatchEvent(new Event('input')) })()`); await wait(700)
  ok(/10 cm = 3\.937/.test(await ex(`document.querySelector('#cmd .res .rt, .res .rt').textContent`)), 'command bar shows the conversion first: ' + await ex(`document.querySelector('.res .rt').textContent`))
  await shotUI('conv')
  await ex(`(() => { const i = document.getElementById('cmd-input'); i.value = 'reader'; i.dispatchEvent(new Event('input')) })()`); await wait(700)
  const keys = await ex(`[...document.querySelectorAll('.res')].map(r => r.querySelector('.rt').textContent + '=' + r.querySelector('.rk').textContent)`)
  console.log('   ', keys.join(' | '))
  ok(keys.some(k => /^Reader Mode=(Shift (Cmd|Ctrl) E)$/.test(k)), 'actions show their real shortcut')
  await ex(`(() => { const i = document.getElementById('cmd-input'); i.value = 'focus'; i.dispatchEvent(new Event('input')) })()`); await wait(700)
  ok(await ex(`[...document.querySelectorAll('.res .rt')].some(r => r.textContent === 'Focus Mode')`), 'Focus Mode in command bar')
  await ex(`document.getElementById('cmd-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await wait(500)

  // ---- undo close
  const a = w.createTab(U('undo'), { active: true }); await wait(1200)
  const n0 = w.order.length
  await ex(`api.do('close', ${a.id})`); await wait(700)
  ok(w.order.length === n0 - 1, 'tab closed')
  ok(!(await ex(`!!document.querySelector('#toast .toast-btn') && document.getElementById('toast').classList.contains('act')`)), 'no Undo popup in the way after closing a tab')
  await ex(`api.do('reopen')`); await wait(1200)
  ok(w.order.length === n0 && [...w.tabs.values()].some(t => /undo$/.test(t.url)), 'Reopen Closed Tab still brings it back')

  // ---- archive
  const old = []
  for (const p of ['old1', 'old2']) { const t = w.createTab(U(p), { active: true }); await wait(900); old.push(t) }
  const pin = w.createTab(U('pinned'), { active: true, pinned: true }); await wait(900)
  w.createTab(U('fresh'), { active: true }); await wait(900)
  for (const t of [...old, pin]) t.lastActive = Date.now() - 30 * 3600000
  ok(await ex(`api.do('archiveNow')`) === 0, 'archive off by default does nothing')
  await ex(`api.do('setSetting', 'archiveTabsAfterH', 24)`)
  const before = w.order.length
  const n = await ex(`api.do('archiveNow')`); await wait(500)
  ok(n === 2 && w.order.length === before - 2, 'archived the 2 idle tabs (' + n + ')')
  ok(w.tabs.has(pin.id), 'pinned tab is never archived')
  ok(L.D.archive.get().length === 2 && /old2/.test(L.D.archive.get()[0].url), 'archive list saved, newest first')

  // ---- archived tabs page + history tools
  const hp = w.createTab('lumen://history#archive', { active: true }); await wait(1800)
  const hq = s => hp.view.webContents.executeJavaScript(s)
  ok(await hq(`document.querySelectorAll('#out .row').length`) === 2 && /Archived tabs/.test(await hq(`document.querySelector('h2').textContent`)), 'Archived tabs page lists them')
  fs.writeFileSync(`${SHOTS}/w13-archive.png`, (await hp.view.webContents.capturePage()).toPNG())
  await hq(`document.querySelector('#out [data-open]').click()`); await wait(1500)
  ok(/old/.test(hp.view.webContents.getURL()) && L.D.archive.get().length === 1, 'Open restores the page and takes it off the archive')
  for (const p of ['x/1', 'x/2', 'x/3']) L.D.addHistory('https://forgetme.example/' + p, 'F ' + p)
  L.D.addHistory('https://keep.example/', 'Keep')
  hp.view.webContents.loadURL('lumen://history'); await wait(1800)
  ok(await hq(`!!document.querySelector('[data-forget]')`), 'history rows have Forget site')
  hp.view.webContents.on('-run-dialog', () => {})
  const nGone = L.D.deleteHistoryHost('forgetme.example')
  ok(nGone === 3 && L.D.listHistory('keep', 10).length === 1 && !L.D.listHistory('forgetme', 10).length, 'forget site removes only that site (' + nGone + ')')

  // ---- settings search
  const sp = w.createTab('lumen://settings', { active: true }); await wait(1800)
  const sq = s => sp.view.webContents.executeJavaScript(s)
  await sq(`(() => { const i = document.getElementById('setq'); i.value = 'archive'; i.oninput() })()`); await wait(2500)
  const hits = await sq(`[...document.querySelectorAll('#main a.hit .t')].map(e => e.textContent)`)
  console.log('   hits:', hits.join(' | '))
  ok(hits.some(h => /Archive tabs/.test(h)), 'settings search finds the archive setting')
  await sq(`(() => { const i = document.getElementById('setq'); i.value = 'dark'; i.oninput() })()`); await wait(800)
  const dh = await sq(`document.querySelectorAll('#main a.hit').length`)
  ok(dh >= 2 && await sq(`!!document.querySelector('#main mark')`), 'dark finds several, with highlights (' + dh + ')')
  fs.writeFileSync(`${SHOTS}/w13-setsearch.png`, (await sp.view.webContents.capturePage()).toPNG())
  await sq(`document.querySelector('#main a.hit').click()`); await wait(2200)
  ok(/settings\//.test(sp.view.webContents.getURL()) && await sq(`!!document.querySelector('.row.flash')`), 'result opens the page and highlights the setting: ' + sp.view.webContents.getURL())
  ok(await sq(`getComputedStyle(document.querySelector('select') || document.body).appearance`) !== 'auto', 'dropdowns are custom styled')

  // ---- focus mode
  w.activate(sp.id); await wait(300)
  await ex(`api.do('focusMode', true)`); await wait(400)
  const [cw, ch] = w.win.getContentSize()
  ok(w.focusMode && w.focusPeek, 'focus mode on and peeking at first')
  w.focusPeek = false; w.layout(); await wait(200)
  const b = sp.view.getBounds()
  ok(b.x === 0 && b.y === 0 && b.width === cw && b.height === ch, 'page fills the window ' + JSON.stringify(b))
  await ex(`api.do('focusMode', false)`); await wait(400)
  const b2 = sp.view.getBounds()
  ok(!w.focusMode && b2.y > 20 && b2.x === w.rect.x, 'leaving focus mode puts the chrome back ' + JSON.stringify(b2))

  ok(!errors.length, 'no UI errors ' + errors.join(' | '))
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
