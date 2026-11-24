// Nova menus and dialogs: Lumen draws its own right-click menus (page, tab, group, app menu) and its own dialogs
// (quit, leave page, passkeys, HTTP sign-in...) instead of the system ones, and every item still does its job.
const fs = require('fs'), http = require('http')
const { app, BrowserWindow, clipboard, nativeTheme } = require('electron')
fs.rmSync('/tmp/lumen-novamenus', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-novamenus')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-novamenus.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
try { fs.unlinkSync('/tmp/lumen-novamenus.log') } catch {}
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))
let quitCalls = 0; const realQuit = app.quit.bind(app); app.quit = () => { quitCalls++ }

// basic-auth server: alice / s3cret
const ARTICLE = '<title>The quiet art of glass</title><body><article><h1>The quiet art of glass</h1>' + Array.from({ length: 8 }, (_, i) => `<p>Paragraph ${i + 1}. Glass has always been a material of light, bending what lies behind it, catching the sun at its edges and throwing small rainbows across a table. Makers learned to read its moods, the way it slumps and gathers, the way a rim holds a thread of colour that the middle never shows.</p>`).join('') + '<blockquote>The rim is where glass tells the truth about light.</blockquote><p>And so the story goes on, with more words, enough to read.</p></article></body>'
const LOGIN = '<title>Sign in</title><body style="font:16px sans-serif;padding:40px;background:#eef2ff"><form><p><input name=email placeholder=Email style="font-size:16px;padding:8px;width:300px"></p><p><input type=password name=password placeholder=Password style="font-size:16px;padding:8px;width:300px"></p><button>Sign in</button></form></body>'
const VIDEO = '<title>Video</title><body style="margin:0;background:#111"><video id=v muted autoplay style="width:720px;height:405px;margin:40px;display:block;background:#333"></video><canvas id=c width=320 height=180 hidden></canvas><script>const c=document.getElementById("c"),x=c.getContext("2d");let h=0;setInterval(()=>{h=(h+3)%360;const g=x.createLinearGradient(0,0,320,180);g.addColorStop(0,"hsl("+h+",80%,60%)");g.addColorStop(1,"hsl("+(h+120)+",80%,50%)");x.fillStyle=g;x.fillRect(0,0,320,180)},40);document.getElementById("v").srcObject=c.captureStream(25)</script></body>'
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/translate_a/')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(['Choisis-moi et copie cette phrase. Le verre liquide plie la lumiere a ses bords.'])); return }
  if (req.url === '/article') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(ARTICLE); return }
  if (req.url === '/login') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(LOGIN); return }
  if (req.url === '/video') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(VIDEO); return }
  const a = req.headers.authorization || ''
  const [u, p] = Buffer.from(a.replace(/^Basic /, ''), 'base64').toString().split(':')
  if (u === 'alice' && p === 's3cret') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<title>in</title><p id=t>hello ' + u + '</p>') }
  else { res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Lumen test area"', 'content-type': 'text/plain' }); res.end('no') }
}).listen(0, '127.0.0.1')

// composite every view of the window into one picture, the way it looks on screen
let painter = null
async function shot(w, name) {
  try {
    const parts = []
    for (const v of w.win.contentView.children) {
      if (v.getVisible && !v.getVisible()) continue
      const b = v.getBounds(); if (b.width < 2) continue
      const img = await Promise.race([v.webContents.capturePage(), wait(1500).then(() => null)]); if (!img || img.isEmpty()) continue
      parts.push({ src: img.toDataURL(), ...b })
    }
    const [W, H] = w.win.getContentSize()
    if (!painter) { painter = new BrowserWindow({ show: false, width: 200, height: 200, webPreferences: { offscreen: false } }); await painter.loadURL('data:text/html,<body></body>') }
    const url = await painter.webContents.executeJavaScript(`(async () => {
      const c = document.createElement('canvas'); c.width = ${W}; c.height = ${H}; const x = c.getContext('2d')
      x.fillStyle = ${JSON.stringify(nativeTheme.shouldUseDarkColors ? '#1b1c20' : '#e6e9f0')}; x.fillRect(0, 0, ${W}, ${H})
      for (const p of ${JSON.stringify(parts)}) { const im = new Image(); im.src = p.src; await im.decode(); x.drawImage(im, p.x, p.y, p.width, p.height) }
      return c.toDataURL('image/png') })()`)
    fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(url.split(',')[1], 'base64'))
    LOG('    shot ' + SHOTS + '/' + name + '.png')
  } catch (e) { LOG('    shot failed ' + name + ': ' + e.message) }
}
const nv = w => L.__nova.state(w)
const menuJS = (w, js) => nv(w).menuView.webContents.executeJavaScript(js)
const dlgJS = async (w, js) => { for (let i = 0; i < 40 && !nv(w).dialogView; i++) await wait(100); return nv(w).dialogView.webContents.executeJavaScript(js) }
const untilDialog = async w => { for (let i = 0; i < 40 && !nv(w).dialogOpen; i++) await wait(100); await wait(250) }
const key = (wc, keyCode) => { wc.sendInputEvent({ type: 'keyDown', keyCode }); wc.sendInputEvent({ type: 'char', keyCode }); wc.sendInputEvent({ type: 'keyUp', keyCode }) }
const pageParams = (o = {}) => ({ x: 220, y: 160, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '', isEditable: false, misspelledWord: '', dictionarySuggestions: [], editFlags: {}, formControlType: 'none', inputFieldType: '', ...o })

app.whenReady().then(() => main().catch(e => { LOG('FAIL test crashed: ' + (e && e.stack || e)); app.exit(1) }))
async function main() {
  await wait(8000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  const page = 'data:text/html,' + encodeURIComponent('<title>Nova test</title><body style="font:20px sans-serif;padding:40px;background:linear-gradient(135deg,#ffd6e0,#c9e4ff 50%,#d8ffd6)"><h1>Liquid glass test page</h1><p id=p>Pick me up and copy this sentence.</p><p>Some more text so the glass has something to bend.</p><input id=i value="typing here"></body>')
  const t = w.createTab(page, { active: true }); await wait(2000)
  const wc = t.view.webContents

  // ---------------------------------------------------------------- page context menu
  await w.contextMenu(t, pageParams()); await wait(900)
  let s = nv(w)
  ok(s.menuOpen && s.menuView && w.win.contentView.children.includes(s.menuView), 'page right-click opens a Lumen-drawn menu over the window')
  ok(['Back', 'Forward', 'Reload', 'Translate Page', 'Reader Mode', 'Take Screenshot', 'View Page Source', 'Inspect'].every(l => s.menuItems.includes(l)), 'with the page items: ' + s.menuItems.slice(0, 8).join(', '))
  const rows = await menuJS(w, '__novaRows()')
  ok(rows.length === 1 && rows[0].length >= 10 && rows[0].find(r => r.label === 'Back').off, 'the menu draws every row, Back is disabled with no history (' + rows[0].length + ' rows)')
  ok(await menuJS(w, `!!document.querySelector('.panel .glass .refract') && !!document.querySelector('.panel kbd, .panel .row .ic svg')`), 'rows have Nova icons, the panel has its glass layers')
  await wait(400)
  ok(await menuJS(w, `document.querySelectorAll('.refract img').length > 0`), 'the glass refracts a picture of the window underneath')
  ok(await menuJS(w, `document.body.classList.contains('lens') && /url\\("?#lens/.test(getComputedStyle(document.querySelector('.refract')).filter)`), 'the lens displacement filter is on: ' + await menuJS(w, `getComputedStyle(document.querySelector('.refract')).filter.slice(0, 80)`))
  await shot(w, 'g2-menu-page-light')
  // keyboard: arrow down highlights, Esc closes (keys typed into the page drive the menu; the page keeps focus)
  key(wc, 'Down'); await wait(150)
  ok((await menuJS(w, '__novaRows()'))[0].some(r => r.on), 'arrow down highlights a row')
  key(wc, 'Escape'); await wait(300)
  ok(!nv(w).menuOpen, 'Esc closes the menu')
  ok(!w.win.contentView.children.includes(s.menuView), 'and the menu view leaves the window')

  // clicking Reload with the mouse reloads the page
  let reloaded = 0; wc.once('did-start-loading', () => reloaded++)
  await w.contextMenu(t, pageParams()); await wait(700)
  const rect = await menuJS(w, `(() => { const r = [...document.querySelectorAll('.row')].find(x => x._it.label === 'Reload').getBoundingClientRect(); return { x: Math.round(r.left + 30), y: Math.round(r.top + r.height / 2) } })()`)
  const mv = nv(w).menuView.webContents
  mv.sendInputEvent({ type: 'mouseMove', x: rect.x, y: rect.y }); await wait(120)
  mv.sendInputEvent({ type: 'mouseDown', x: rect.x, y: rect.y, button: 'left', clickCount: 1 }); mv.sendInputEvent({ type: 'mouseUp', x: rect.x, y: rect.y, button: 'left', clickCount: 1 }); await wait(900)
  ok(reloaded === 1 && !nv(w).menuOpen, 'clicking Reload in the menu reloads the page and closes the menu')
  await wait(800)

  // selection: Copy (a role item) copies the selected text
  await wc.executeJavaScript(`(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById('p')); getSelection().removeAllRanges(); getSelection().addRange(r) })()`)
  await wc.executeJavaScript(`window.__copied = ''; document.addEventListener('copy', () => { window.__copied = String(getSelection()) }, { once: true })`)
  await w.contextMenu(t, pageParams({ selectionText: 'Pick me up and copy this sentence.' })); await wait(700)
  ok(nv(w).menuItems.includes('Copy') && nv(w).menuItems.some(l => /^Search /.test(l)) && nv(w).menuItems.includes('Highlight') === false, 'selection menu: ' + nv(w).menuItems.slice(0, 6).join(', '))
  await shot(w, 'g2-menu-selection-light')
  await menuJS(w, `__novaPick('Copy')`); await wait(500)
  const copied = await wc.executeJavaScript('window.__copied')
  ok(/Pick me up and copy this sentence/.test(copied), 'Copy copies the selection: ' + JSON.stringify(copied))

  // editable field: role items enabled per edit flags, accelerators shown as keycaps
  await w.contextMenu(t, pageParams({ isEditable: true, editFlags: { canUndo: false, canRedo: false, canCut: true, canCopy: true, canPaste: true } })); await wait(700)
  const ed = (await menuJS(w, '__novaRows()'))[0]
  ok(ed.find(r => r.label === 'Undo').off && !ed.find(r => r.label === 'Paste').off, 'editable menu: Undo disabled, Paste enabled')
  ok(await menuJS(w, `document.querySelectorAll('.row kbd').length >= 4`), 'shortcuts show as keycaps')
  key(wc, 'Escape'); await wait(300)

  // ---------------------------------------------------------------- tab, group and app menus
  const n0 = w.tabs.size
  L.__tabMenu(w, t.id); await wait(700)
  ok(nv(w).menuOpen && ['New Tab Below', 'Duplicate', 'Reload Every', 'Close Tab', 'Mute Other Tabs'].every(l => nv(w).menuItems.includes(l)), 'tab menu opens as a Lumen menu')
  await menuJS(w, `__novaPick('Reload Every')`); await wait(500)
  ok((await menuJS(w, '__novaRows()')).length === 2, 'Reload Every opens its submenu')
  await shot(w, 'g2-menu-tab-light')
  await menuJS(w, `__novaPick('Duplicate')`); await wait(800)
  ok(w.tabs.size === n0 + 1 && !nv(w).menuOpen, 'Duplicate works from the Lumen tab menu')
  w.activate(t.id); await wait(300)
  const gid = w.newGroup([t.id], 'Reading'); await wait(300)
  await ex(`lumenUI.do('groupMenu', ${JSON.stringify(gid)})`); await wait(700)
  ok(nv(w).menuOpen && ['Collapse', 'Rename', 'Color', 'Ungroup', 'Close Group'].every(l => nv(w).menuItems.includes(l)), 'group menu opens: ' + nv(w).menuItems.slice(0, 5).join(', '))
  await menuJS(w, `__novaPick('Color')`); await wait(400)
  await shot(w, 'g2-menu-group-light')
  await menuJS(w, `__novaPick('Purple')`); await wait(400)
  ok(w.groups.get(gid) && w.groups.get(gid).color === 'purple', 'picking a group colour sets it')
  L.__appMenu(w); await wait(700)
  ok(nv(w).menuOpen && ['New Tab', 'History', 'Settings'].every(l => nv(w).menuItems.includes(l)), 'app menu opens as a Lumen menu')
  key(w.ui.webContents, 'Escape'); key(wc, 'Escape'); await wait(300)
  ok(!nv(w).menuOpen, 'Esc closes the app menu')
  w.ungroup(gid)

  // ---------------------------------------------------------------- dialogs
  const ask = (o) => L.__novaDialog(w, { message: 'Keep this?', detail: 'A test question.', buttons: ['Keep', 'Cancel'], defaultId: 0, cancelId: 1, icon: 'question', ...o })
  let p = ask(); await wait(900)
  ok(nv(w).dialogOpen && w.win.contentView.children.includes(nv(w).dialogView), 'a Nova dialog opens over the window')
  await shot(w, 'g2-dialog-question-light')
  key(nv(w).dialogView.webContents, 'Return'); let r = await p
  ok(r.response === 0, 'Enter answers the default button: ' + JSON.stringify(r))
  await wait(300)
  p = ask(); await untilDialog(w); key(nv(w).dialogView.webContents, 'Escape'); r = await p
  ok(r.response === 1, 'Esc answers cancel: ' + JSON.stringify(r))
  await wait(300)
  p = ask({ buttons: ['One', 'Two', 'Three'], cancelId: 2 }); await untilDialog(w)
  await dlgJS(w, `document.querySelector('.btn[data-i="1"]').click()`); r = await p
  ok(r.response === 1, 'clicking a button answers it: ' + JSON.stringify(r))
  await wait(300)
  p = ask({ checkboxLabel: 'Remember this' }); await untilDialog(w)
  await dlgJS(w, `document.querySelector('.check').click()`); await wait(100)
  key(nv(w).dialogView.webContents, 'Return'); r = await p
  ok(r.response === 0 && r.checkboxChecked === true, 'the checkbox comes back checked: ' + JSON.stringify(r))
  await wait(300)

  // passkey account chooser: a list of up to 6 accounts
  p = L.__novaDialog(w, { buttons: ['alice@example.com', 'bob@example.com', 'carol@work.example', 'Cancel'], defaultId: 0, cancelId: 3, list: true, icon: 'key', title: 'Passkey', message: 'Sign in to example.com with a passkey', detail: 'Choose an account.' }); await wait(1000)
  ok(await dlgJS(w, `document.querySelectorAll('.choice').length === 3 && document.querySelectorAll('.btn').length === 1`), 'passkey accounts show as a list, with Cancel as the only button')
  await shot(w, 'g2-dialog-passkeys-light')
  await dlgJS(w, `document.querySelectorAll('.choice')[1].click()`); r = await p
  ok(r.response === 1, 'picking the second account answers 1')
  await wait(300)

  // quit with several tabs open: Nova dialog with "Do not ask again"
  L.D.settings.set({ confirmQuit: true })
  L.__confirmQuit(); await wait(1000)
  ok(nv(w).dialogOpen && /Quit Lumen with \d+ tabs open/.test(await dlgJS(w, `document.getElementById('msg').textContent`)), 'Quit asks in a Nova dialog')
  ok(await dlgJS(w, `!document.querySelector('.check').hidden && /Do not ask again/.test(document.querySelector('.check').textContent)`), 'with a Do not ask again checkbox')
  await shot(w, 'g2-dialog-quit-light')
  await dlgJS(w, `document.querySelector('.check').click()`); await wait(100)
  key(nv(w).dialogView.webContents, 'Return'); await wait(600)
  ok(quitCalls === 1 && L.D.settings.get('confirmQuit') === false, 'Quit quits and remembers Do not ask again')

  // HTTP sign-in
  const port = server.address().port
  const lt = w.createTab(`http://127.0.0.1:${port}/area`, { active: true }); await wait(2000)
  ok(nv(w).dialogOpen && /Sign in to 127\.0\.0\.1/.test(await dlgJS(w, `document.getElementById('msg').textContent`)), 'a site asking for HTTP sign-in gets a Nova sign-in sheet')
  ok(await dlgJS(w, `document.querySelectorAll('.field input').length === 2 && document.activeElement && document.activeElement.name === 'user'`), 'with username and password fields, username focused')
  await dlgJS(w, `document.querySelector('input[name=user]').value = 'alice'; document.querySelector('input[name=pass]').value = 's3cret'`)
  await shot(w, 'g2-dialog-login-light')
  key(nv(w).dialogView.webContents, 'Return'); await wait(1800)
  ok(/hello alice/.test(await lt.view.webContents.executeJavaScript('document.body.innerText').catch(() => '')), 'the typed username and password sign in')

  // a crashed tab goes to lumen://crashed with its address
  const ct = w.createTab(page, { active: true }); await wait(1500)
  ct.view.webContents.forcefullyCrashRenderer(); await wait(2500)
  const cu = ct.view.webContents.getURL()
  ok(/^lumen:\/\/crashed\/?\?url=data/.test(cu) && ct.crashed, 'a crashed tab shows lumen://crashed with the page address: ' + cu.slice(0, 60))
  L.__flushSession && L.__flushSession()

  // ---------------------------------------------------------------- Lumen's bits inside web pages
  const base = `http://127.0.0.1:${port}`
  process.env.LUMEN_TR_API = base
  L.D.savePassword(base, 'alice@example.com', 'pw-one-123'); L.D.savePassword(base, 'bob@work.example', 'pw-two-456')
  async function pageBits(suffix) {
    const pt = w.createTab(base + '/login', { active: true }); await wait(2200)
    const pwc = pt.view.webContents
    await pwc.executeJavaScript(`document.querySelector('input[type=password]').focus()`); await wait(700)
    await shot(w, 'g2-page-autofill-' + suffix)
    if (suffix === 'light') {
      key(pwc, 'Down'); await wait(100); key(pwc, 'Down'); await wait(100); key(pwc, 'Return'); await wait(400)
      ok(await pwc.executeJavaScript(`document.querySelector('input[type=password]').value === 'pw-two-456' && document.querySelector('input[name=email]').value === 'bob@work.example'`), 'autofill dropdown: arrow keys and Enter fill the second account')
    }
    await pwc.loadURL(base + '/article'); await wait(1500)
    await pwc.executeJavaScript(`(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('p')); getSelection().removeAllRanges(); getSelection().addRange(r) })()`)
    await w.contextMenu(pt, pageParams({ selectionText: 'Paragraph 1. Glass has always been a material of light' })); await wait(700)
    await menuJS(w, `__novaPick(${JSON.stringify('Translate to ' + require('../src/translate.js').langName(require('../src/translate.js').target(L.D.settings)))})`); await wait(1500)
    await shot(w, 'g2-page-translate-' + suffix)
    if (suffix === 'light') ok(await pwc.executeJavaScript(`!!document.getElementById('__lumen_tr_bubble')`), 'the selection translation bubble shows')
    await pwc.executeJavaScript(`document.getElementById('__lumen_tr_bubble') && document.getElementById('__lumen_tr_bubble').remove()`)
    await w.contextMenu(pt, pageParams()); await wait(600); await menuJS(w, `__novaPick('Reader Mode')`); await wait(1500)
    await shot(w, 'g2-page-reader-' + suffix)
    if (suffix === 'light') ok(await pwc.executeJavaScript(`document.documentElement.dataset.lumenReader === '1' && !!document.querySelector('.lr-hero h1.t')`), 'Reader Mode opens in its Nova layout')
    await pwc.loadURL(base + '/video'); await wait(1800)
    await pwc.executeJavaScript(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '>', shiftKey: true, bubbles: true }))`); await wait(500)
    await shot(w, 'g2-page-speed-' + suffix)
    if (suffix === 'light') ok(await pwc.executeJavaScript(`!!document.getElementById('__lumen_speed')`), 'video speed keys show the speed badge (a live stream stays at 1x, so only the badge is checked)')
    await pwc.executeJavaScript(`(() => { dispatchEvent(new WheelEvent('wheel', { deltaX: -150 })); window.__sw = setInterval(() => dispatchEvent(new WheelEvent('wheel', { deltaX: -1 })), 40) })()`); await wait(150)
    await shot(w, 'g2-page-swipe-' + suffix)
    await pwc.executeJavaScript(`dispatchEvent(new WheelEvent('wheel', { deltaX: -100 }))`); await wait(200)
    await shot(w, 'g2-page-swipe-go-' + suffix)
    await pwc.executeJavaScript(`clearInterval(window.__sw)`); await wait(400)
    w.closeTab(pt.id); await wait(300)
  }
  await pageBits('light')

  // ---------------------------------------------------------------- dark
  nativeTheme.themeSource = 'dark'; w.activate(t.id); await wait(1200)
  await w.contextMenu(t, pageParams({ selectionText: 'Pick me up' })); await wait(900)
  await shot(w, 'g2-menu-selection-dark')
  key(wc, 'Escape'); await wait(300)
  await w.contextMenu(t, pageParams()); await wait(900)
  await shot(w, 'g2-menu-page-dark')
  key(wc, 'Escape'); await wait(300)
  L.__tabMenu(w, t.id); await wait(500); await menuJS(w, `__novaPick('Reload Every')`); await wait(500)
  await shot(w, 'g2-menu-tab-dark')
  key(wc, 'Escape'); key(wc, 'Escape'); key(w.ui.webContents, 'Escape'); await wait(300)
  p = L.__novaDialog(w, { buttons: ['Quit', 'Cancel'], defaultId: 0, cancelId: 1, icon: 'quit', message: 'Quit Lumen with 4 tabs open?', detail: 'Your tabs will be back next time you open Lumen.', checkboxLabel: 'Do not ask again' }); await wait(1000)
  await shot(w, 'g2-dialog-quit-dark'); key(nv(w).dialogView.webContents, 'Escape'); await p; await wait(300)
  p = L.__novaDialog(w, { buttons: ['Sign in', 'Cancel'], defaultId: 0, cancelId: 1, icon: 'lock', title: 'Sign in', message: 'Sign in to intranet.example', detail: 'Your username and password go only to this site.', fields: [{ name: 'user', label: 'Username' }, { name: 'pass', label: 'Password', type: 'password' }] }); await wait(1000)
  await shot(w, 'g2-dialog-login-dark'); key(nv(w).dialogView.webContents, 'Escape'); r = await p; await wait(300)
  ok(r.response === 1, 'Esc cancels the sign-in sheet')
  p = L.__novaDialog(w, { buttons: ['alice@example.com', 'bob@example.com', 'Cancel'], defaultId: 0, cancelId: 2, list: true, icon: 'key', title: 'Passkey', message: 'Sign in to example.com with a passkey', detail: 'Choose an account.' }); await wait(1000)
  await shot(w, 'g2-dialog-passkeys-dark'); key(nv(w).dialogView.webContents, 'Escape'); await p
  await pageBits('dark')
  nativeTheme.themeSource = 'system'

  ok(!errs.length, 'no errors' + (errs.length ? ': ' + errs[0].slice(0, 300) : ''))
  LOG(fails ? `${fails} FAILED` : 'ALL PASS'); app.quit = realQuit; server.close(); app.exit(fails ? 1 : 0)
}
