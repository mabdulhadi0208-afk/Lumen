// The update card in every state (light and dark), and the updater's release notes and fingerprint check.
const fs = require('fs'), path = require('path'); const { app, BrowserWindow, nativeTheme, ipcMain } = require('electron')
fs.rmSync('/tmp/lumen-upd', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-upd')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-updatecard.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const NOTES = ['Parcels open on the carrier you pick or the link you type', 'Google sign-in no longer says the browser may not be secure', 'A friendlier intro with a guided tour', 'The update card shows what is new and checks every download', 'Removed the Undo popup after closing a tab']
const BASE = { current: '1.16.2', latest: 'v1.17.0', size: 127e6, lastCheck: Date.now(), notes: NOTES, appIcon: 'default' }
const STATES = {
  available: {}, checking: { notes: [] }, downloading: { progress: 42, bytes: 53e6, speed: 6.2e6, eta: 12 },
  verifying: {}, ready: { verified: true }, error: { error: 'The download did not match its fingerprint, so it was thrown away' }, uptodate: { latest: 'v1.16.2', notes: [] }, installing: {},
}
app.on('window-all-closed', () => {})   // keep going between cards
app.whenReady().then(async () => {
  let cur = {}
  ipcMain.handle('update:action', (e, n) => n === 'state' ? cur : null)
  for (const theme of ['light', 'dark']) {
    nativeTheme.themeSource = theme
    for (const [st, extra] of Object.entries(STATES)) {
      cur = { ...BASE, status: st, accent: theme === 'dark' ? '#e5487d' : '#5b8cff', ...extra }
      const n = Math.min(6, cur.notes.length), h = n ? 238 + n * 24 : 204
      const w = new BrowserWindow({ width: 600, height: h, show: false, transparent: true, frame: false, webPreferences: { preload: path.join(__dirname, '../src/preload-update.js'), contextIsolation: true, sandbox: true } })
      await w.loadFile(path.join(__dirname, '../ui/update.html')); await wait(1100)
      const r = await w.webContents.executeJavaScript(`(() => { const c = document.getElementById('card').getBoundingClientRect(); const go = document.getElementById('go').getBoundingClientRect(); const notes = [...document.querySelectorAll('#notes li')]; const last = notes.length ? notes[notes.length - 1].getBoundingClientRect() : null; return { title: document.getElementById('title').textContent, btn: document.getElementById('go').textContent, goIn: go.bottom <= c.bottom && go.right <= c.right && go.width > 40, notesIn: !last || last.bottom < go.top, notes: notes.length, img: document.getElementById('icon').naturalWidth } })()`)
      ok(r.goIn && r.notesIn, `${theme} ${st}: "${r.title}" / ${r.btn}, everything inside the card`)
      if (st === 'available') ok(r.notes === 5 && r.img > 0, `${theme}: release notes listed (${r.notes}) and the real app icon shows`)
      if (st === 'available') ok(await w.webContents.executeJavaScript(`getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()`) === cur.accent, `${theme}: the card takes your accent color (${cur.accent})`)
      if (st === 'downloading') {   // it finishes while you watch: the icon bounces and a burst goes off
        w.webContents.send('update:state', { ...cur, status: 'ready', verified: true }); await wait(250)
        const fx = await w.webContents.executeJavaScript(`({ dots: document.querySelectorAll('#fx b').length, now: document.getElementById('card').classList.contains('ready-now'), btn: document.getElementById('go').textContent })`)
        ok(fx.dots > 10 && fx.now && /Restart now/.test(fx.btn), `${theme}: finishing the download sets off the burst (${fx.dots} sparks)`)
        fs.writeFileSync(`${SHOTS}/upd-${theme}-burst.png`, (await w.webContents.capturePage()).toPNG())
        await wait(1800); ok(await w.webContents.executeJavaScript(`document.querySelectorAll('#fx b').length === 0`), `${theme}: and cleans up after itself`)
      }
      if (st === 'ready') ok(/Restart now/.test(r.btn) && await w.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.chip.ok')).display !== 'none'`), `${theme}: ready offers Restart now and shows Verified`)
      fs.writeFileSync(`${SHOTS}/upd-${theme}-${st}.png`, (await w.webContents.capturePage()).toPNG())
      w.destroy()
    }
  }
  // the updater's own helpers against GitHub's real release data
  const U = require('../src/updater.js')
  const info = await U.__releaseInfo('v1.16.1')
  LOG('    digests: ' + Object.keys(info.digests).join(', '))
  if (Object.keys(info.digests).length) {
    ok(/^[0-9a-f]{64}$/.test(info.digests['Lumen-mac-arm64.dmg'] || ''), 'reads the published SHA-256 for each file')
    ok(Array.isArray(info.notes), 'release notes parse (' + info.notes.length + ' lines on that release)')
  } else LOG('SKIP GitHub API not reachable here')
  const f = '/tmp/lumen-upd/x.bin'; fs.writeFileSync(f, 'lumen')
  ok(await U.__sha256File(f) === require('crypto').createHash('sha256').update('lumen').digest('hex'), 'fingerprints a file the same way GitHub does')
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
