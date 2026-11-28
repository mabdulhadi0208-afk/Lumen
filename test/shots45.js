// Lumen 4.5 screenshots: the chrome (light and dark), New Tab, Settings, the command bar, a right-click menu, the tab
// grid, a toast and mid-hover frames of the flow fill. Not part of the suite.
// Run: SHOTS=/some/dir xvfb-run -a npx electron test/shots45.js --no-sandbox
const fs = require('fs'), http = require('http')
const { app, BrowserWindow } = require('electron')
fs.rmSync('/tmp/lumen-shots45', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-shots45')
const SHOTS = process.env.SHOTS || '/tmp/lumen-shots/45'; fs.mkdirSync(SHOTS, { recursive: true })
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
app.quit = () => {}
const PAGE = (t, c1, c2) => `<title>${t}</title><body style="margin:0;font:18px Georgia,serif;background:linear-gradient(135deg,${c1},${c2});min-height:100vh"><div style="padding:60px 70px"><h1 style="font-size:46px;margin:0 0 14px">${t}</h1><p style="max-width:640px;line-height:1.6">A test page. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p><p><a href="/b">A link to hover</a></p></div></body>`
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' })
  const map = { '/a': ['The quiet art of glass', '#fdf1e6', '#e9eef7'], '/b': ['Mountains at dawn', '#eef6ea', '#fbf0de'], '/c': ['News of the day', '#efeaf8', '#e6f4f8'] }
  const m = map[req.url] || map['/a']; res.end(PAGE(...m))
}).listen(48245, '127.0.0.1')
const U = p => 'http://127.0.0.1:48245' + p
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
const move = (w, x, y) => w.ui.webContents.sendInputEvent({ type: 'mouseMove', x, y })
const center = (w, sel) => ex(w, `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), b: Math.round(r.bottom) } })()`)
const pageParams = (o = {}) => ({ x: 300, y: 200, linkURL: '', srcURL: '', mediaType: 'none', selectionText: 'quiet art', isEditable: false, misspelledWord: '', dictionarySuggestions: [], editFlags: { canCopy: true }, formControlType: 'none', inputFieldType: '', ...o })
app.whenReady().then(() => main().catch(e => { console.log('crash ' + (e && e.stack || e)); app.exit(1) }))
async function main() {
  await wait(5000)
  const w = L.windows[0]
  w.win.setContentSize(1280, 800); await wait(300)
  await ex(w, `document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(w, `document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  for (const p of ['/a', '/b', '/c']) { w.createTab(U(p), { active: true }); await wait(400) }
  w.activate(w.order[1]); await wait(2500)
  for (const theme of ['light', 'dark']) {
    await setS(w, 'theme', theme); await wait(1200)
    await shot(w, `chrome-top-${theme}`)
    await setS(w, 'tabLayout', 'side'); await wait(1200); await shot(w, `chrome-side-${theme}`)
    await setS(w, 'tabLayout', 'top'); await wait(1200)
    await ex(w, `openCmd('newtab')`); await wait(1300); await shot(w, `cmdbar-${theme}`)
    await ex(w, `closeCmd(true)`); await wait(800)
    await ex(w, `openCmd(); setTimeout(() => { const i = document.querySelector('#cmd input, .cmdbar input'); if (i) { i.value = 'mou'; i.dispatchEvent(new Event('input', { bubbles: true })) } }, 300)`); await wait(1500); await shot(w, `cmdbar-typed-${theme}`)
    await ex(w, `closeCmd(true)`); await wait(800)
    await ex(w, `openTabGrid()`); await wait(1500); await shot(w, `tabgrid-${theme}`)
    await ex(w, `closeTabGrid()`); await wait(900)
    await ex(w, `openMainMenu()`); await wait(1200); await shot(w, `mainmenu-${theme}`)
    await ex(w, `closePopover(true)`); await wait(800)
    const t = w.active(); await w.contextMenu(t, pageParams()); await wait(1300); await shot(w, `rightclick-${theme}`)
    try { L.__nova.state(w).menuView.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }) } catch {}
    await wait(900)
    await ex(w, `toast('Link copied', null, 'ok')`); await wait(700); await shot(w, `toast-${theme}`); await wait(4000)
    // mid-hover: the flow fill caught on its way up
    for (const [sel, nm] of [['#btn-newtab', 'newtab'], ['#btn-reload', 'reload'], ['.tab:not(.active)', 'tab']]) {
      const c = await center(w, sel); if (!c) continue
      move(w, c.x, c.b - 2); await wait(170); await shot(w, `hover-mid-${nm}-${theme}`)
      await wait(500); await shot(w, `hover-full-${nm}-${theme}`)
      move(w, 640, 600); await wait(700)
    }
    const nt = w.createTab('lumen://newtab', { active: true }); await wait(3500); await shot(w, `newtab-${theme}`)
    nt.view.webContents.loadURL('lumen://settings/appearance'); await wait(2500); await shot(w, `settings-${theme}`)
    nt.view.webContents.loadURL('lumen://history'); await wait(2000); await shot(w, `history-${theme}`)
    nt.view.webContents.loadURL('lumen://downloads'); await wait(2000); await shot(w, `downloads-${theme}`)
    nt.view.webContents.loadURL('lumen://parcels'); await wait(2000); await shot(w, `parcels-${theme}`)
    // hover a settings nav row and a button mid-flow
    const r = await nt.view.webContents.executeJavaScript(`(() => { const e = document.querySelector('.btn, button'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom - 2) } })()`).catch(() => null)
    if (r) { nt.view.webContents.sendInputEvent({ type: 'mouseMove', x: r.x, y: r.y }); await wait(180); await shot(w, `hover-mid-page-${theme}`); nt.view.webContents.sendInputEvent({ type: 'mouseMove', x: 5, y: 5 }) }
    w.closeTab ? w.closeTab(nt.id) : null; await wait(800)
    w.activate(w.order.find(id => /48245\/b/.test((w.tabs.get(id) || {}).url || '')) || w.order[1]); await wait(1200)
  }
  app.exit(0)
}
