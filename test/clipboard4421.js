// 4.4.21: clipboard history. Option V or Option C (Alt on Windows) opens a glass list of recent copies, newest first.
// Picking one (click, Enter or 1 to 9) pastes it into the page; Shift Enter only copies; Delete forgets one. Copies
// made while a private window is in front, and passwords copied from Lumen, are never kept, it lives in memory only,
// and it can be paused.
// Run: xvfb-run -a npx electron test/clipboard4421.js --no-sandbox   (log: /tmp/lumen-clipboard4421.log)
const fs = require('fs'), http = require('http'); const { app, clipboard, Menu } = require('electron')
fs.rmSync('/tmp/lumen-clipboard4421', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-clipboard4421')
const LOG = '/tmp/lumen-clipboard4421.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 170000)
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end('<!doctype html><title>Form</title><textarea id="t" style="width:600px;height:200px"></textarea>') }).listen(0, '127.0.0.1')
const L = require('../src/main.js')
// the virtual display has no real clipboard: a small one of our own, read and written the way Lumen does
let CLIP = 'already there'   // on the clipboard before Lumen started: never history
clipboard.readText = () => CLIP
clipboard.writeText = t => { CLIP = String(t) }
const copy = async t => { CLIP = t; L.__clipWatch(); await wait(50) }
app.on('window-all-closed', () => {})

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  const t = w.createTab(`http://127.0.0.1:${site.address().port}/`, { active: true }); await wait(1500)
  w.win.focus(); await wait(300)
  const focusedOk = w.win.isFocused()
  // the watcher only listens while Lumen is in front; on a virtual display focus can be unreliable, so stand in for it
  if (!focusedOk) w.win.isFocused = () => true

  // menu: Option V and Option C
  const items = []; const walk = m => m && m.items.forEach(i => { items.push(i); walk(i.submenu) }); walk(Menu.getApplicationMenu())
  ok(items.some(i => i.accelerator === 'Alt+V') && items.some(i => i.accelerator === 'Alt+C'), 'Option V and Option C both open Clipboard History')

  // copies become history, newest first, without repeats; what was there at the start is not history
  await copy('first note'); await copy('https://example.com/recipes'); await copy('42.50'); await copy('first note')
  ok(JSON.stringify(L.__clips.map(c => c.text)) === JSON.stringify(['first note', '42.50', 'https://example.com/recipes']), 'history is newest first and a repeat moves up instead of doubling: ' + JSON.stringify(L.__clips.map(c => c.text)))

  // passwords copied from Lumen are never kept
  const pw = await t.view.webContents.executeJavaScript('1') && null
  L.D.addPassword && L.D.addPassword({ origin: 'https://site.example', username: 'sam', password: 'Sup3r-Secret!' })
  const ids = (L.D.listPasswords ? L.D.listPasswords() : []).map(p => p.id)
  if (ids.length) {
    const st = w.createTab('lumen://passwords', { active: false }); await wait(1500)
    await st.view.webContents.executeJavaScript(`L.invoke('copyPassword', ${JSON.stringify(ids[0])})`); L.__clipWatch(); await wait(100)
    ok(!L.__clips.some(c => c.text === 'Sup3r-Secret!'), 'a password copied from Lumen never shows up')
    w.activate(t.id); await wait(300)
  }

  // private windows: copies made there are not kept
  const priv = L.createWindow({ urls: ['lumen://newtab'], incognito: true }); await wait(1500)
  const realW = w.win.isFocused; w.win.isFocused = () => false; priv.win.isFocused = () => true
  await copy('private thing')
  ok(!L.__clips.some(c => c.text === 'private thing'), 'something copied in a private window is not kept')
  priv.win.isFocused = () => false; w.win.isFocused = () => true
  priv.win.close(); await wait(800)

  // open it: the panel lists them
  w.send('command', 'clipboard'); await wait(900)
  const panel = await ex(`({ open: overlayOpen === 'pop' && pop.classList.contains('clipz'), rows: [...pop.querySelectorAll('.clip .clip-t')].map(x => x.textContent), kinds: [...pop.querySelectorAll('.clip .clip-m')].map(x => x.textContent.split('  ')[0]), keys: pop.querySelectorAll('.clip-n').length })`)
  ok(panel.open && panel.rows[0] === 'first note' && panel.rows.length === 3, 'Option V opens the Clipboard panel with the copies: ' + JSON.stringify(panel.rows))
  ok(panel.kinds.join() === 'Text,Number,Link' && panel.keys === 3, 'each row says what it is and has its number key')
  try { fs.mkdirSync('/tmp/lumen-shots', { recursive: true }); await wait(400); fs.writeFileSync('/tmp/lumen-shots/clipboard4421.png', (await w.ui.webContents.capturePage()).toPNG()) } catch {}

  // 3 pastes the third copy into the page
  let pasted = null; const realPaste = t.view.webContents.paste.bind(t.view.webContents); t.view.webContents.paste = () => { pasted = CLIP; realPaste() }
  w.ui.webContents.focus(); await ex(`dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))`); await wait(500)
  ok(pasted === 'https://example.com/recipes', 'pressing 3 pastes the third copy into the page: ' + pasted)
  ok(await ex(`overlayOpen !== 'pop'`), 'and the panel closes')
  ok(L.__clips[0].text === 'https://example.com/recipes', 'what you pasted moves to the top')

  // Shift Enter only copies; Delete forgets
  w.send('command', 'clipboard'); await wait(800)
  await ex(`dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))`); await wait(100)
  pasted = null
  await ex(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }))`); await wait(400)
  ok(pasted === null && CLIP === 'first note', 'Shift Enter copies the chosen one without pasting')
  w.send('command', 'clipboard'); await wait(800)
  await ex(`dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))`); await wait(500)
  ok(L.__clips.length === 2 && !L.__clips.some(c => c.text === 'first note'), 'Delete forgets the selected copy')

  // pause and clear
  await ex(`[...pop.querySelectorAll('[data-ca]')].find(b => b.dataset.ca === 'pause').click()`); await wait(400)
  ok(L.D.settings.get('clipHistory') === false && L.__clips.length === 0, 'Pause stops keeping copies and forgets the list')
  await copy('while paused')
  ok(L.__clips.length === 0, 'nothing is kept while paused')
  ok(await ex(`/Paused/.test(pop.textContent) && !!pop.querySelector('[data-ca="resume"]')`), 'the panel says it is paused, with Turn on')
  await ex(`pop.querySelector('[data-ca="resume"]').click()`); await wait(300)
  await copy('back on')
  ok(L.__clips.length === 1 && L.__clips[0].text === 'back on', 'Turn on keeps copies again')
  await ex(`closePopover(true)`)

  ok(!fs.readdirSync('/tmp/lumen-clipboard4421').some(f => { try { return fs.readFileSync('/tmp/lumen-clipboard4421/' + f, 'utf8').includes('back on') } catch { return false } }), 'nothing copied is written to disk')
  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
