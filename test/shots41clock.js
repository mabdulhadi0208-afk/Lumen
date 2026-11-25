// Lumen 4.1 home clock screenshots: Display in dark, light and private, and every clock style.
// Run: LUMEN_APPS_ANYWHERE=1 xvfb-run -a npx electron test/shots41home.js --no-sandbox   (PNGs: /tmp/lumen-shots/41b-home-clock-*.png)
const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-shots41b', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-shots41b')
const L = require('../src/main.js'); const P = require('../src/parcels'); const wait = ms => new Promise(r => setTimeout(r, ms))
const OUT = '/tmp/lumen-shots'; fs.mkdirSync(OUT, { recursive: true })
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  for (const [u, t] of [['https://www.youtube.com/watch?v=1', 'How liquid glass actually works'], ['https://github.com/lumen/releases', 'Lumen release notes'], ['https://open.spotify.com/x', 'Weekend playlist'], ['https://news.ycombinator.com/', 'Hacker News']]) L.D.addHistory(u, t)
  L.D.addReadLater('https://example.org/springs', 'Springs, damping and delight'); L.D.addReadLater('https://example.com/glass', 'The physics of glass on screens')
  try { P.add({ number: 'TBA000000000771', name: 'Books', source: 'manual' }); P.add({ number: 'TBA000000000772', name: 'Headphones', source: 'manual' }) } catch (e) { console.log('parcels', e.message) }
  L.D.settings.set({ ntpShortcuts: [['https://youtube.com', 'YouTube'], ['https://github.com', 'GitHub'], ['https://mail.example.com', 'Mail'], ['https://news.example.com', 'News'], ['https://spotify.com', 'Spotify'], ['https://figma.com', 'Figma']].map(([url, title]) => ({ url, title })), ntpNote: 'Ship Lumen 4.1\nCall the bakery about Friday' })
  let painter = null
  const { BrowserWindow } = require('electron')
  // the window as the owner sees it: every view of the window painted into one picture
  const snap = async (win, name) => {
    const parts = []
    for (const v of win.contentView.children) {
      if (v.getVisible && !v.getVisible()) continue
      const b = v.getBounds(); if (b.width < 2) continue
      const img = await Promise.race([v.webContents.capturePage(), wait(1500).then(() => null)]); if (!img || img.isEmpty()) continue
      parts.push({ src: img.toDataURL(), ...b })
    }
    const [W, H] = win.getContentSize()
    if (!painter) { painter = new BrowserWindow({ show: false, width: 200, height: 200 }); await painter.loadURL('data:text/html,<body></body>') }
    const url = await painter.webContents.executeJavaScript(`(async () => {
      const c = document.createElement('canvas'); c.width = ${W}; c.height = ${H}; const x = c.getContext('2d')
      for (const p of ${JSON.stringify(parts)}) { const im = new Image(); im.src = p.src; await im.decode(); x.drawImage(im, p.x, p.y, p.width, p.height) }
      return c.toDataURL('image/png') })()`)
    fs.writeFileSync(`${OUT}/41b-home-clock-${name}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('shot', name)
  }
  const shot = async (t, name, full) => {
    if (full) {
      const h = await t.view.webContents.executeJavaScript('document.documentElement.scrollHeight')
      w.win.setContentSize(1280, Math.min(1700, h + 95)); await wait(1800)
    }
    await snap(w.win, name)
  }
  // the clock: Display in dark, light and private, then every style
  const tab = async () => { const t = w.createTab('lumen://newtab', { active: true }); await wait(7000); await t.view.webContents.executeJavaScript('document.activeElement && document.activeElement.blur()'); return t }
  await ex(`api.do('setSetting','theme','dark')`); await wait(800)
  w.win.setContentSize(1280, 820); await wait(600)
  await shot(await tab(), 'dark')
  for (const [v, name] of [[true, 'display'], ['minimal', 'stacked'], ['analog', 'watch'], [false, 'off']]) {
    L.D.settings.set({ ntpClock: v }); await wait(300)
    await shot(await tab(), name)
  }
  L.D.settings.set({ ntpClock: true })
  await ex(`api.do('setSetting','theme','light')`); await wait(800)
  await shot(await tab(), 'light')
  w.win.setContentSize(900, 760); await wait(1800)
  await shot(w.active(), 'light-900')
  w.win.setContentSize(1280, 820); await wait(800)
  const pw = L.createWindow({ incognito: true }); await wait(4500)
  pw.active() || pw.createTab('lumen://newtab', { active: true }); await wait(4000)
  pw.win.setContentSize(1280, 820); await wait(1500)
  await snap(pw.win, 'private')
  app.exit(0)
})
