// Renders every Lumen app icon PNG from tools/icons/icon.js with headless Chromium.
//   xvfb-run -a npx electron tools/icons/render.js --no-sandbox
// Writes build/icon.svg, build/icon.png (1024), build/icons/<id>.png (512),
// pages/icon-<id>.png (96) and a contact sheet (SHEET env var, default /tmp/lumen-shots/nova-icons-sheet.png).
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')
const { VARIANTS, svg } = require('./icon.js')

const ROOT = path.join(__dirname, '..', '..')
const SHEET = process.env.SHEET || '/tmp/lumen-shots/nova-icons-sheet.png'

app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await win.loadURL('data:text/html,<body></body>')

  // Rasterize the vector at the exact pixel size (crisper than downscaling) into a transparent PNG.
  const raster = (s, size) => win.webContents.executeJavaScript(`new Promise((ok, no) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = ${size}
      c.getContext('2d').drawImage(img, 0, 0, ${size}, ${size})
      ok(c.toDataURL('image/png'))
    }
    img.onerror = () => no(new Error('svg failed to load'))
    img.src = 'data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}'
  })`)
  const write = (file, dataUrl) => {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
    console.log('wrote', file)
  }

  const ids = Object.keys(VARIANTS)
  fs.writeFileSync(path.join(ROOT, 'build', 'icon.svg'), svg('default', 1024))
  write(path.join(ROOT, 'build', 'icon.png'), await raster(svg('default', 1024), 1024))
  for (const id of ids) {
    write(path.join(ROOT, 'build', 'icons', id + '.png'), await raster(svg(id, 512), 512))
    write(path.join(ROOT, 'pages', 'icon-' + id + '.png'), await raster(svg(id, 96), 96))
  }

  // Contact sheet: every variant at 1024 (shown at 256), 128, 32 and 16 px, on porcelain and on ink.
  const cells = []
  for (const id of ids) {
    cells.push({ id, big: await raster(svg(id, 1024), 1024), m: await raster(svg(id, 128), 128),
      s: await raster(svg(id, 32), 32), xs: await raster(svg(id, 16), 16) })
  }
  const sheet = await win.webContents.executeJavaScript(`(async () => {
    const cells = ${JSON.stringify(cells)}
    const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u })
    const W = 300, H = 640, c = document.createElement('canvas'); c.width = W * cells.length; c.height = H
    const g = c.getContext('2d')
    g.fillStyle = '#f5f6fb'; g.fillRect(0, 0, c.width, 470)
    g.fillStyle = '#0a0c15'; g.fillRect(0, 470, c.width, H - 470)
    for (let i = 0; i < cells.length; i++) {
      const x = i * W, k = cells[i]
      const big = await load(k.big), m = await load(k.m), s = await load(k.s), xs = await load(k.xs)
      g.drawImage(big, x + 22, 10, 256, 256)
      g.fillStyle = '#555'; g.font = '600 15px system-ui'; g.textAlign = 'center'; g.fillText(k.id, x + W / 2, 292)
      g.drawImage(m, x + 20, 320); g.drawImage(s, x + 170, 368); g.drawImage(xs, x + 230, 376)
      g.drawImage(m, x + 20, 490); g.drawImage(s, x + 170, 538); g.drawImage(xs, x + 230, 546)
    }
    return c.toDataURL('image/png')
  })()`)
  write(SHEET, sheet)
  app.quit()
}).catch(e => { console.error(e); app.exit(1) })
