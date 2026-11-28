// Lumen 4.5.1 screenshots (New Tab banner and backgrounds): the chrome (light and dark), New Tab, Settings, the command bar, a right-click menu, the tab
// grid, a toast and mid-hover frames of the flow fill. Not part of the suite.
// Run: SHOTS=/some/dir xvfb-run -a npx electron test/shots45.js --no-sandbox
const fs = require('fs'), http = require('http')
const { app, BrowserWindow } = require('electron')
fs.rmSync('/tmp/lumen-shots451', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-shots451')
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
  for (const theme of ['light', 'dark']) {
    await setS(w, 'theme', theme); await wait(900)
    for (const bt of ['default', 'rose', 'ocean', 'sand']) {
      await setS(w, 'browserTheme', bt); await wait(900)
      const t = w.createTab('lumen://newtab', { active: true }); await wait(3500)
      await shot(w, `newtab-${bt}-${theme}`)
      if (bt === 'default' || bt === 'ocean') {
        const c = await t.view.webContents.executeJavaScript(`(() => { const e = document.querySelector('.hm-act[data-act="cmd"]'); const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom - 3) } })()`)
        t.view.webContents.sendInputEvent({ type: 'mouseMove', x: c.x, y: c.y }); await wait(200); await shot(w, `hover-mid-cmdk-${bt}-${theme}`); await wait(500); await shot(w, `hover-full-cmdk-${bt}-${theme}`)
        t.view.webContents.sendInputEvent({ type: 'mouseMove', x: 5, y: 700 }); await wait(400)
      }
      if (bt === 'default') {
        await t.view.webContents.executeJavaScript(`scrollTo(0, 620)`); await wait(900); await shot(w, `newtab-lower-${theme}`)
        await t.view.webContents.executeJavaScript(`scrollTo(0, document.documentElement.scrollHeight)`); await wait(900); await shot(w, `newtab-bottom-${theme}`)
        t.view.webContents.loadURL('lumen://settings/appearance'); await wait(2500); await shot(w, `settings-${theme}`)
        t.view.webContents.loadURL('lumen://history'); await wait(2000); await shot(w, `history-${theme}`)
      }
      w.closeTab(t.id); await wait(500)
    }
    await setS(w, 'browserTheme', 'default'); await wait(600)
    w.createTab('data:text/html,<title>Page</title><body style="background:#fff;font:20px Georgia;padding:40px">A page', { active: true }); await wait(1200)
    await setS(w, 'tabLayout', 'side'); await wait(1000); await shot(w, `chrome-side-${theme}`)
    await setS(w, 'compact', true); await wait(1000); await shot(w, `chrome-side-compact-${theme}`)
    await setS(w, 'tabLayout', 'top'); await wait(1000); await shot(w, `chrome-top-compact-${theme}`); await setS(w, 'compact', false); await wait(800)
    await setS(w, 'browserTheme', 'midnight'); await wait(1000); await shot(w, `chrome-themed-midnight-${theme}`)
    await setS(w, 'browserTheme', 'default'); await wait(800)
  }
  app.exit(0)
}
