// Lumen 4.1 chrome screenshots. Not part of the suite. Writes /tmp/lumen-shots/41-chrome-*.png
// SHOT_PHASE=before|after  xvfb-run -a npx electron test/shots40chrome.js --no-sandbox
const fs = require('fs'), http = require('http')
const { app, BrowserWindow, nativeTheme } = require('electron')
const PHASE = process.env.SHOT_PHASE === undefined ? '' : process.env.SHOT_PHASE
const DIR = '/tmp/lumen-41chrome-' + PHASE
fs.rmSync(DIR, { recursive: true, force: true }); app.setPath('userData', DIR)
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = m => console.log(m)
app.quit = () => {}

const PAGE = (t, c1, c2) => `<title>${t}</title><body style="margin:0;font:18px -apple-system,sans-serif;background:linear-gradient(135deg,${c1},${c2});min-height:100vh"><div style="padding:60px 70px"><h1 style="font-size:46px;margin:0 0 14px">${t}</h1><p style="max-width:640px;line-height:1.6">A test page with colour so the glass has something to bend. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p><a href="/b">A link to hover</a></p><input value="typing here" style="font-size:16px;padding:8px"></div></body>`
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' })
  const map = { '/a': ['The quiet art of glass', '#ffd6e0', '#c9e4ff'], '/b': ['Mountains at dawn', '#d8ffd6', '#ffe9c9'], '/c': ['News of the day', '#e6dcff', '#d6f6ff'], '/d': ['Recipes for winter', '#fff1c9', '#ffd6f0'] }
  const m = map[req.url] || map['/a']; res.end(PAGE(...m))
}).listen(48297, '127.0.0.1')
const U = p => 'http://127.0.0.1:48297' + p

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
    const bg = w.win.getBackgroundColor ? w.win.getBackgroundColor() : '#000'
    if (!painter) { painter = new BrowserWindow({ show: false, width: 200, height: 200 }); await painter.loadURL('data:text/html,<body></body>') }
    const url = await painter.webContents.executeJavaScript(`(async () => {
      const c = document.createElement('canvas'); c.width = ${W}; c.height = ${H}; const x = c.getContext('2d')
      x.fillStyle = ${JSON.stringify(bg)}; x.fillRect(0, 0, ${W}, ${H})
      for (const p of ${JSON.stringify(parts)}) { const im = new Image(); im.src = p.src; await im.decode(); x.drawImage(im, p.x, p.y, p.width, p.height) }
      return c.toDataURL('image/png') })()`)
    const f = `${SHOTS}/41-chrome-${PHASE}${name}.png`
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'))
    LOG('shot ' + f)
  } catch (e) { LOG('shot failed ' + name + ': ' + e.message) }
}
const ex = (w, s) => w.ui.webContents.executeJavaScript(s)
const setS = (w, k, v) => ex(w, `lumenUI.do('setSetting', ${JSON.stringify(k)}, ${JSON.stringify(v)})`)
const move = (w, x, y) => w.ui.webContents.sendInputEvent({ type: 'mouseMove', x, y })
async function center(w, sel) { return ex(w, `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } })()`) }
const pageParams = (o = {}) => ({ x: 300, y: 200, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '', isEditable: false, misspelledWord: '', dictionarySuggestions: [], editFlags: {}, formControlType: 'none', inputFieldType: '', ...o })

async function setup(w) {
  await ex(w, `document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(w, `document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
}

app.whenReady().then(() => main().catch(e => { LOG('crash ' + (e && e.stack || e)); app.exit(1) }))
async function main() {
  await wait(7000)
  const w = L.windows[0]
  await setup(w)
  w.win.setContentSize(1280, 800); await wait(300)
  for (const p of ['/a', '/b', '/c']) w.createTab(U(p), { active: true })
  const first = w.tabs.get(w.order[0]); if (first && /newtab/.test(first.url)) {} // keep the new tab
  w.activate(w.order[1]); await wait(2500)

  for (const theme of ['light', 'dark']) {
    await setS(w, 'theme', theme); await wait(900)
    for (const layout of ['top', 'side']) {
      await setS(w, 'tabLayout', layout); await wait(1200)
      await shot(w, `${layout}-${theme}-1280`)
    }
  }
  // back to tabs on top, light
  await setS(w, 'theme', 'light'); await setS(w, 'tabLayout', 'top'); await wait(1200)

  // tooltip over the back... reload button and the bookmark star
  for (const [sel, nm] of [['#btn-reload', 'reload'], ['#btn-star', 'star']]) {
    const c = await center(w, sel); move(w, c.x - 3, c.y - 3); await wait(80); move(w, c.x, c.y); await wait(1300)
    await shot(w, `tooltip-${nm}-top-light`)
    move(w, 640, 500); await wait(500)
  }
  // command bar
  for (const theme of ['light', 'dark']) {
    await setS(w, 'theme', theme); await wait(800)
    await ex(w, `openCmd('newtab')`); await wait(1200)
    await shot(w, `cmdk-${theme}`)
    await ex(w, `document.getElementById('cmd-input').value = 'gla'; document.getElementById('cmd-input').dispatchEvent(new Event('input'))`); await wait(1200)
    await shot(w, `cmdk-typed-${theme}`)
    await ex(w, `closeCmd(true)`); await wait(500)
    await ex(w, `openMainMenu()`); await wait(1400)
    await shot(w, `mainmenu-${theme}`)
    await ex(w, `closePopover(true)`); await wait(400)
    await ex(w, `openSiteInfo()`); await wait(1400)
    await shot(w, `siteinfo-${theme}`)
    await ex(w, `closePopover(true)`); await wait(400)
    await ex(w, `toast('Link copied to clipboard')`); await wait(700)
    await shot(w, `toast-top-${theme}`)
    await wait(2200)
    await ex(w, `toast('Tab closed', { label: 'Undo', run: () => {} })`); await wait(700)
    await shot(w, `toast-action-top-${theme}`)
    await wait(5200)
  }
  await setS(w, 'tabLayout', 'side'); await wait(1000)
  await ex(w, `toast('Saved to Read later')`); await wait(700)
  await shot(w, 'toast-side-dark')
  await wait(2400)
  await ex(w, `openDownloads()`); await wait(1200)
  await shot(w, 'downloads-side-dark')
  await ex(w, `closePopover(true)`); await wait(400)
  await setS(w, 'tabLayout', 'top'); await setS(w, 'theme', 'light'); await wait(1000)

  // 900 px: normal window menus and dialog
  w.win.setContentSize(900, 700); await wait(1200)
  await shot(w, 'top-light-900')
  const t = w.active()
  await w.contextMenu(t, pageParams({ x: 700, y: 400 })); await wait(1200)
  await shot(w, 'ctxmenu-900-light')
  L.__nova.closeMenu(w, 'x'); await wait(500)
  L.__tabMenu(w, t.id); await wait(1000)
  await shot(w, 'tabmenu-900-light')
  L.__nova.closeMenu(w, 'x'); await wait(500)
  await setS(w, 'theme', 'dark'); await wait(800)
  L.__novaDialog(w, { type: 'question', buttons: ['Quit', 'Cancel'], defaultId: 0, cancelId: 1, kind: 'quit', icon: 'quit', message: 'Quit Lumen with 4 tabs open?', detail: 'Your tabs will be back next time you open Lumen.', checkboxLabel: 'Do not ask again' })
  await wait(2600)
  await shot(w, 'dialog-900-dark')
  { const st = L.__nova.state(w); if (st.dialogView) st.dialogView.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }) }
  await wait(800)
  await setS(w, 'tabLayout', 'side'); await wait(1000)
  await shot(w, 'side-dark-900')
  await setS(w, 'tabLayout', 'top'); await setS(w, 'theme', 'light'); await wait(800)

  // private window at 900 px
  const pw = L.createWindow({ incognito: true, bounds: { width: 900, height: 700 } })
  await wait(4000)
  await ex(pw, `document.querySelector('#intro') && document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(400)
  const pt = pw.createTab(U('/c'), { active: true }); await wait(2500)
  await shot(pw, 'private-top-900')
  await pw.contextMenu(pt, pageParams({ x: 640, y: 380, linkURL: U('/b') })); await wait(1200)
  await shot(pw, 'private-ctxmenu-900')
  L.__nova.closeMenu(pw, 'x'); await wait(500)
  L.__novaDialog(pw, { type: 'question', buttons: ['Leave', 'Stay'], defaultId: 0, cancelId: 1, kind: 'leave', icon: 'leave', message: 'Leave this page?', detail: 'Changes you made may not be saved.' })
  await wait(2600)
  await shot(pw, 'private-dialog-900')
  { const st = L.__nova.state(pw); if (st.dialogView) st.dialogView.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }) }
  await wait(600)
  await ex(pw, `openCmd('newtab')`); await wait(1200)
  await shot(pw, 'private-cmdk-900')
  await ex(pw, `closeCmd(true)`); await wait(400)
  pw.win.close(); await wait(800)

  // background colours a window or tab paints before the page does
  const bgs = {}
  for (const theme of ['light', 'dark']) {
    await setS(w, 'theme', theme); await wait(600)
    const nw = new (require('electron').BaseWindow)({ show: false, width: 10, height: 10, backgroundColor: undefined })
    nw.destroy()
    bgs[theme] = { window: w.win.getBackgroundColor() }
  }
  fs.writeFileSync(`${SHOTS}/41-chrome-${PHASE}bg.json`, JSON.stringify(bgs, null, 1))
  LOG('bg ' + JSON.stringify(bgs))
  app.exit(0)
}
