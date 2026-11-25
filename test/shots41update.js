// Lumen 4.1 update card screenshots: every state of the card once it has settled (light and dark), the burst when a
// download finishes, and the restart screen at full size, filmed from the moment you press Restart now until it folds.
// Run: xvfb-run -a npx electron test/shots41update.js --no-sandbox   (PNGs: /tmp/lumen-shots/41r-<TAG>-upd-*.png)
const fs = require('fs'), path = require('path'); const { app, BrowserWindow, nativeTheme, ipcMain } = require('electron')
fs.rmSync('/tmp/lumen-upd41', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-upd41')
const OUT = '/tmp/lumen-shots'; fs.mkdirSync(OUT, { recursive: true }); const TAG = process.env.TAG || 'after'
const wait = ms => new Promise(r => setTimeout(r, ms))
const NOTES = ['Ask Lumen: a chat for every tab, with sources you can click', 'Lumen opens in about 1 second instead of 4', 'Cmd K results appear as you type', 'A new Home banner with a premium clock', 'Jelly motion is back everywhere']
const BASE = { current: '4.0.0', latest: 'v4.1.0', size: 127e6, lastCheck: Date.now(), notes: NOTES, appIcon: 'default' }
const STATES = {
  available: {}, checking: { notes: [] }, downloading: { progress: 42, bytes: 53e6, speed: 6.2e6, eta: 12 }, verifying: {}, unpacking: {},
  ready: { verified: true }, error: { error: 'The download did not match its fingerprint, so it was thrown away' }, uptodate: { current: '4.1.0', latest: 'v4.1.0', notes: [] },
}
const errors = []
app.on('web-contents-created', (e, wc) => wc.on('console-message', (a, b, c) => {
  const lvl = typeof a === 'object' && a && a.level !== undefined ? a.level : b, msg = typeof a === 'object' && a && a.message !== undefined ? a.message : c
  if ((lvl === 'error' || lvl === 3) && !/favicon|ERR_|net::|Failed to load resource/i.test(msg)) errors.push(String(msg).slice(0, 200))
}))
app.on('window-all-closed', () => {})
app.whenReady().then(async () => {
  let cur = {}
  ipcMain.handle('update:action', (e, n) => n === 'state' ? cur : null)
  const open = async (w, h) => { const win = new BrowserWindow({ width: w, height: h, show: false, transparent: true, frame: false, webPreferences: { preload: path.join(__dirname, '../src/preload-update.js'), contextIsolation: true, sandbox: true } }); await win.loadFile(path.join(__dirname, '../ui/update.html')); return win }
  const save = async (win, name) => { fs.writeFileSync(`${OUT}/41r-${TAG}-upd-${name}.png`, (await win.webContents.capturePage()).toPNG()); console.log('shot', name) }
  for (const theme of ['light', 'dark']) {
    nativeTheme.themeSource = theme
    for (const [st, extra] of Object.entries(STATES)) {
      cur = { ...BASE, status: st, accent: theme === 'dark' ? '#e5487d' : '#5b8cff', ...extra }
      const n = Math.min(6, cur.notes.length), h = n ? 272 + n * 26 : 226
      const w = await open(600, h); await wait(2400); await save(w, `${theme}-${st}`)
      if (st === 'downloading') {
        w.webContents.send('update:state', { ...cur, status: 'ready', verified: true }); await wait(260); await save(w, `${theme}-burst`)
      }
      w.destroy()
    }
    // the restart screen at the size of a real display, from the press of Restart now until it folds into light
    cur = { ...BASE, status: 'ready', verified: true, accent: theme === 'dark' ? '#e5487d' : '#5b8cff' }
    const w = await open(1280, 800); await wait(1500)
    w.webContents.send('update:state', { ...cur, status: 'installing', exitAt: Date.now() + 1700 })
    for (const [i, t] of [100, 400, 800, 1200, 1550].entries()) { await wait(i ? t - [100, 400, 800, 1200, 1550][i - 1] : t); await save(w, `${theme}-restart-${i}`) }
    w.destroy()
  }
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'NO ERRORS')
  app.exit(0)
})
