// 4.4.10: two-digit versions fit. The update card's title ("Downloading Lumen 4.4.10") used to be cut off with an
// ellipsis, and the What's new film's big version number ran under the note cards ("4.4.1"). Both now ease down in
// size to fit. Checked with long versions in light and dark, and the short ones keep their full size.
// Run: xvfb-run -a npx electron test/twodigit4410.js --no-sandbox   (log: /tmp/lumen-twodigit4410.log)
const fs = require('fs'), path = require('path'); const { app, BrowserWindow, nativeTheme, ipcMain } = require('electron')
fs.rmSync('/tmp/lumen-twodigit4410', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-twodigit4410')
const LOG = '/tmp/lumen-twodigit4410.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 170000)
const NOTES = ['Parcel news takes you to the parcel', 'The parcel glow shows all the way round', 'Two-digit versions fit everywhere', 'Notes', 'More notes']
app.on('window-all-closed', () => {})
const L = require('../src/main.js')

app.whenReady().then(async () => {
  // ---- the What's new film
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  w.win.setContentSize(1280, 800); await wait(400)
  const MEASURE = `(() => { const bv = document.querySelector('#intro .nw4 .bigv'), it = document.querySelector('#intro .nw4 .it'); if (!bv || !it) return null
        const a = bv.getBoundingClientRect(), b = it.getBoundingClientRect(), lh = document.querySelector('#intro .nw4 .lh').getBoundingClientRect()
        return { text: bv.textContent, right: Math.round(a.right), lhRight: Math.round(lh.right), card: Math.round(b.left), fits: (() => { const rg = document.createRange(); rg.selectNodeContents(bv); return Math.round(rg.getBoundingClientRect().right) <= Math.round(lh.right) + 2 })(), size: parseFloat(getComputedStyle(bv).fontSize) } })()`
  for (const v of ['4.4.10', '12.10.10', '4.5']) {
    await ex(`(() => { Intro.WHATS_NEW.version = ${JSON.stringify(v)}; Intro.play({ whatsNew: ${JSON.stringify(v)} }) })()`)
    const t0 = Date.now(); let m = null
    while (Date.now() - t0 < 15000) {
      m = await ex(MEASURE)
      if (m) break; await wait(200)
    }
    // measure again once the number's entrance (a scale from 1.5) has settled
    if (m) { await wait(1600); m = await ex(MEASURE) }
    ok(!!m && m.text === v, `the film reaches What's new for ${v}`)
    if (m) ok(m.fits && m.right <= m.card + 2, `the big ${v} stays clear of the note cards (ends ${m.right}px, cards start ${m.card}px, ${m.size}px)`)
    if (m && v === '4.5') ok(m.size > 120, `a short version keeps its big size (${m.size}px)`)
    if (m && v === '4.4.10') try { fs.mkdirSync('/tmp/lumen-shots', { recursive: true }); await wait(1800); fs.writeFileSync('/tmp/lumen-shots/twodigit4410.png', (await w.ui.webContents.capturePage()).toPNG()) } catch {}
    await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2600)
    await ex(`document.querySelector('#intro .go, #intro .no, #intro .done') && document.querySelector('#intro .go, #intro .no, #intro .done').click()`); await wait(1500)
    await ex(`document.getElementById('intro') && document.getElementById('intro').remove()`); await wait(300)
  }
  // ---- the update card
  let cur = {}
  ipcMain.removeHandler('update:action'); ipcMain.handle('update:action', (e, n) => n === 'state' ? cur : null)
  const card = async (theme, latest, status, extra = {}) => {
    nativeTheme.themeSource = theme
    cur = { current: '4.4.9', latest, size: 127e6, lastCheck: Date.now(), notes: NOTES, appIcon: 'default', status, accent: '#5b8cff', ...extra }
    const w = new BrowserWindow({ width: 600, height: 272 + 5 * 26, show: false, transparent: true, frame: false, webPreferences: { preload: path.join(__dirname, '../src/preload-update.js'), contextIsolation: true, sandbox: true } })
    await w.loadFile(path.join(__dirname, '../ui/update.html')); await wait(1200)
    const r = await w.webContents.executeJavaScript(`(() => { const b = document.getElementById('title'), c = document.getElementById('card').getBoundingClientRect(), r = b.getBoundingClientRect()
      return { text: b.textContent, fits: b.scrollWidth <= b.clientWidth + 1, inside: r.right <= c.right + 1, size: parseFloat(getComputedStyle(b).fontSize) } })()`)
    w.destroy(); return r
  }
  for (const theme of ['light', 'dark']) {
    for (const [st, extra] of [['downloading', { progress: 40, bytes: 50e6, speed: 6e6, eta: 12 }], ['available', {}], ['ready', { verified: true }]]) {
      const r = await card(theme, 'v4.4.10', st, extra)
      ok(/4\.4\.10/.test(r.text) && r.fits && r.inside, `${theme} ${st}: "${r.text}" fits on one line (${r.size}px)`)
    }
    const long = await card(theme, 'v12.10.10', 'downloading', { progress: 40, bytes: 50e6, speed: 6e6, eta: 12 })
    ok(long.fits && long.size >= 17, `${theme}: even "${long.text}" fits (${long.size}px)`)
    const short = await card(theme, 'v4.5', 'downloading', { progress: 40, bytes: 50e6, speed: 6e6, eta: 12 })
    ok(short.fits && short.size >= 25, `${theme}: a short version keeps the full size (${short.size}px)`)
  }

  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
