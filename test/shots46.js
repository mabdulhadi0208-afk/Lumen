// Lumen 4.6 screenshots: every lumen:// page (each Settings section, New Tab, the library pages) in light and dark, a
// private window, a toast, a right-click menu, a dialog and the main menu. Not part of the suite.
// Run: SHOTS=/some/dir xvfb-run -a npx electron test/shots46.js --no-sandbox   (ONLY=regex limits the shots)
const fs = require('fs'), http = require('http')
const { app, BrowserWindow } = require('electron')
fs.rmSync('/tmp/lumen-shots46', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-shots46')
const SHOTS = process.env.SHOTS || '/tmp/lumen-shots/46'; fs.mkdirSync(SHOTS, { recursive: true })
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
app.quit = () => {}
const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(`<title>The quiet art of paper</title><body style="margin:0;font:18px Georgia,serif;background:#fbfaf7;min-height:100vh"><div style="padding:60px 70px"><h1 style="font-size:46px;margin:0 0 14px">The quiet art of paper</h1><p style="max-width:640px;line-height:1.6">A test page. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p><a href="/b">A link to hover</a></p></div></body>`) }).listen(48246, '127.0.0.1')
let painter = null
async function shot(w, name) {
  if (ONLY && !ONLY.test(name)) return
  try {
    const parts = []
    for (const v of w.win.contentView.children) {
      if (v.getVisible && !v.getVisible()) continue
      const b = v.getBounds(); if (b.width < 2) continue
      const img = await Promise.race([v.webContents.capturePage(), wait(1500).then(() => null)]); if (!img || img.isEmpty()) continue
      parts.push({ src: img.toDataURL(), ...b })
    }
    const [W, H] = w.win.getContentSize()
    if (!painter) { painter = new BrowserWindow({ show: false, width: 200, height: 200 }); await painter.loadURL('data:text/html,<body></body>') }
    const url = await painter.webContents.executeJavaScript(`(async () => {
      const c = document.createElement('canvas'); c.width = ${W}; c.height = ${H}; const x = c.getContext('2d')
      x.fillStyle = '#000'; x.fillRect(0, 0, ${W}, ${H})
      for (const p of ${JSON.stringify(parts)}) { const im = new Image(); im.src = p.src; await im.decode(); x.drawImage(im, p.x, p.y, p.width, p.height) }
      return c.toDataURL('image/png') })()`)
    fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('shot ' + name)
  } catch (e) { console.log('shot failed ' + name + ': ' + e.message) }
}
const ex = (w, s) => w.ui.webContents.executeJavaScript(s)
const setS = (w, k, v) => ex(w, `lumenUI.do('setSetting', ${JSON.stringify(k)}, ${JSON.stringify(v)})`)
const SECS = ['general', 'appearance', 'apps', 'ai', 'privacy', 'passwords', 'sync', 'import', 'extensions', 'history', 'bookmarks', 'readlater', 'parcels', 'downloads', 'about']
const pageParams = (o = {}) => ({ x: 300, y: 200, linkURL: '', srcURL: '', mediaType: 'none', selectionText: 'quiet art', isEditable: false, misspelledWord: '', dictionarySuggestions: [], editFlags: { canCopy: true }, formControlType: 'none', inputFieldType: '', ...o })
app.whenReady().then(() => main().catch(e => { console.log('crash ' + (e && e.stack || e)); app.exit(1) }))
async function main() {
  await wait(5000)
  const w = L.windows[0]
  w.win.setContentSize(1280, 800); await wait(300)
  await ex(w, `document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(w, `document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  const themes = (process.env.THEMES || 'light,dark').split(',')
  for (const theme of themes) {
    await setS(w, 'theme', theme); await wait(900)
    const t = w.createTab('lumen://newtab', { active: true }); await wait(3500)
    await shot(w, `newtab-${theme}`)
    for (const s of SECS) {
      if (ONLY && !ONLY.test(`page-${s}-${theme}`) && !ONLY.test(`page-${s}-${theme}-lower`)) continue
      t.view.webContents.loadURL('lumen://settings/' + s); await wait(2200); await shot(w, `page-${s}-${theme}`)
      await t.view.webContents.executeJavaScript(`scrollTo(0, 760)`).catch(() => {}); await wait(900); await shot(w, `page-${s}-${theme}-lower`)
    }
    const p = w.createTab('http://127.0.0.1:48246/a', { active: true }); await wait(1500)
    await w.contextMenu(p, pageParams()); await wait(1300); await shot(w, `rightclick-${theme}`)
    try { L.__nova.closeMenu && L.__nova.closeMenu(w) } catch {}
    p.view.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); await wait(600)
    await ex(w, `toast('Link copied to the clipboard', null, 'ok')`); await wait(1300); await shot(w, `toast-${theme}`); await wait(3500)
    await ex(w, `toast('This tab crashed', { label: 'Reload', run: () => {} }, 'bad')`); await wait(1300); await shot(w, `toast-action-${theme}`); await wait(4500)
    const d = L.__novaDialog(w, { buttons: ['Quit', 'Cancel'], defaultId: 0, cancelId: 1, icon: 'quit', message: 'Quit Lumen with 4 tabs open?', detail: 'Your tabs will be back next time you open Lumen.', checkboxLabel: 'Do not ask again' }); await wait(1200)
    await shot(w, `dialog-${theme}`)
    try { w.win.contentView.children.forEach(v => { try { v.webContents.executeJavaScript(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`) } catch {} }) } catch {}
    await Promise.race([d, wait(2000)]); await wait(600)
    await ex(w, `openMainMenu()`); await wait(1000); await shot(w, `mainmenu-${theme}`); await ex(w, `closePopover(true)`); await wait(500)
    await ex(w, `openCmd('newtab')`); await wait(900); await shot(w, `cmdbar-${theme}`); await ex(w, `closeCmd(true)`); await wait(500)
    w.closeTab(p.id); w.closeTab(t.id); await wait(500)
  }
  // a private window
  const pw = L.createWindow({ incognito: true }); await wait(4000)
  pw.win.setContentSize(1280, 800); await wait(500)
  await shot(pw, 'private-newtab')
  const pp = pw.createTab('http://127.0.0.1:48246/a', { active: true }); await wait(1500); await shot(pw, 'private-page')
  await ex(pw, `openMainMenu()`); await wait(1000); await shot(pw, 'private-mainmenu'); await ex(pw, `closePopover(true)`); await wait(500)
  await pw.contextMenu(pp, pageParams()); await wait(1300); await shot(pw, 'private-rightclick')
  app.exit(0)
}
