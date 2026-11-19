// Auto Update, ported from Surge: GitHub Releases -> zip -> staged .app -> swap -> relaunch (with rollback).
// State machine: idle -> checking -> available -> downloading -> unpacking -> ready -> installing   (error -> retry)
// - polls github.com/<repo>/releases/latest (a redirect, so no API rate limit)
// - resumable curl download with 3 attempts, progress / speed / ETA
// - the staged copy survives restarts and must match the release version exactly
// - mac swap script: waits for the old process, swaps, launches, verifies, rolls back if the new one does not start
// - windows: silent NSIS install retried up to 4 times, always leaves a running Lumen
// - fresh DMG installs are ad-hoc signed; the first update moves them to the cert-signed build so
//   Keychain (saved passwords) and camera / mic permissions survive every later update
const { app, BrowserWindow, screen, powerMonitor } = require('electron')
const { execFile, execFileSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const pkg = require('../package.json')

const REPO = (pkg.lumen && pkg.lumen.repo) || 'mabdulhadi0208-afk/lumen'
const IS_WIN = process.platform === 'win32'
const ARCH = process.arch === 'arm64' ? 'arm64' : 'x64'
const ZIP = `Lumen-mac-${ARCH}.zip`, DMG = `Lumen-mac-${ARCH}.dmg`, EXE = 'Lumen-win-x64.exe'
const state = { status: 'idle', latest: null, url: null, size: 0, progress: 0, bytes: 0, speed: 0, eta: 0, error: null, staged: null, isZip: true }
let C = null, timer = null, popup = null, snoozedUntil = 0, skipVersion = null, polling = false, misses = 0, lastTag = null, lastCheck = 0, dlProc = null
let adhoc = false, migrate = false, enabled = true
const listeners = new Set()

const semver = v => String(v).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
const newer = (a, b) => { const A = semver(a), B = semver(b); for (let i = 0; i < 3; i++) { if ((A[i] || 0) > (B[i] || 0)) return true; if ((A[i] || 0) < (B[i] || 0)) return false } return false }
const same = (a, b) => semver(a).join('.') === semver(b).join('.')
const curl = IS_WIN ? 'curl.exe' : '/usr/bin/curl'
function sh(cmd, args, opts = {}) { return new Promise((res, rej) => execFile(cmd, args, { timeout: 600000, maxBuffer: 1 << 24, ...opts }, (e, out, err) => e ? rej(new Error(String(err || e.message).trim())) : res(out))) }
function latestTag() { return sh(curl, ['-sI', '-o', IS_WIN ? 'NUL' : '/dev/null', '-w', '%{redirect_url}', `https://github.com/${REPO}/releases/latest`], { timeout: 8000 }).then(u => (/\/tag\/([^/\s]+)/.exec(u) || [])[1] || null).catch(() => null) }
async function probe(url) {
  const h = await sh(curl, ['-sIL', url], { timeout: 15000 }).catch(() => '')
  const codes = [...h.matchAll(/^HTTP\/[\d.]+ (\d{3})/gm)].map(m => +m[1]), len = [...h.matchAll(/^content-length:\s*(\d+)/gmi)].map(m => +m[1])
  return { ok: codes.length > 0 && codes[codes.length - 1] === 200, size: len.length ? len[len.length - 1] : 0 }
}
function stagedVersion(appPath) {
  try { const pl = fs.readFileSync(path.join(appPath, 'Contents', 'Info.plist'), 'utf8'); const v = /CFBundleShortVersionString<\/key>\s*<string>([^<]+)/.exec(pl); if (v) return v[1] } catch {}
  try { return execFileSync('defaults', ['read', path.join(appPath, 'Contents', 'Info.plist'), 'CFBundleShortVersionString']).toString().trim() } catch { return null }
}
function bundlePath() { const p = process.execPath, i = p.indexOf('.app/Contents/MacOS/'); return i > 0 ? p.slice(0, i + 4) : null }
const fmtMB = b => (b / 1048576).toFixed(1) + ' MB'
const migratedFlag = () => path.join(app.getPath('userData'), 'migrated-' + app.getVersion())
const log = (...a) => { try { fs.appendFileSync(path.join(app.getPath('logs'), 'lumen.log'), `[${new Date().toISOString()}] updater: ${a.join(' ')}\n`) } catch {} }
const updDir = () => path.join(app.getPath('userData'), 'update')
function clearStaged() { try { fs.rmSync(updDir(), { recursive: true, force: true }) } catch {} state.staged = null }
function snapshot() { return { ...state, current: app.getVersion(), lastCheck, version: app.getVersion() } }
function push() {
  const s = snapshot()
  for (const fn of listeners) { try { fn(s) } catch {} }
  if (popup && !popup.isDestroyed()) { try { popup.webContents.send('update:state', s) } catch {} }
}
function set(patch) { Object.assign(state, patch); push() }

// ------------------------------------------------------------ floating update card
function showCard() {
  if (!C || !C.cardEnabled()) return
  if (popup && !popup.isDestroyed()) { if (!popup.isVisible()) popup.showInactive(); push(); return }
  const d = screen.getPrimaryDisplay().workArea, w = 560, h = 186
  popup = new BrowserWindow({
    width: w, height: h, x: Math.round(d.x + d.width / 2 - w / 2), y: d.y + 12, frame: false, transparent: true, hasShadow: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: true, fullscreenable: false, backgroundColor: '#00000000', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload-update.js'), contextIsolation: true, sandbox: true },
  })
  popup.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); popup.setAlwaysOnTop(true, 'screen-saver')
  popup.loadFile(path.join(__dirname, '..', 'ui', 'update.html'))
  popup.once('ready-to-show', () => { popup.showInactive(); push() })
  popup.on('closed', () => (popup = null))
}
function hideCard() { if (popup && !popup.isDestroyed()) popup.hide() }
function showCardIfAllowed(manual) { if (manual || Date.now() > snoozedUntil) showCard() }

// ------------------------------------------------------------ check / download / install
async function check(manual) {
  if (['downloading', 'unpacking', 'installing'].includes(state.status)) return snapshot()
  set({ status: 'checking', error: null }); lastCheck = Date.now()
  try {
    const latest = await latestTag(); if (!latest) throw new Error('GitHub did not answer')
    const cur = app.getVersion()
    if (!newer(latest, cur) && adhoc && same(latest, cur) && !fs.existsSync(migratedFlag()) && (await probe(`https://github.com/${REPO}/releases/download/${latest}/Lumen-identity.txt`)).ok) { migrate = true; log('identity switch: fetching the cert-signed build of', latest) }
    else if (!newer(latest, cur)) { if (state.staged) clearStaged(); set({ status: 'uptodate', latest }); if (manual) C.toast(`Lumen ${cur} is up to date`); return snapshot() }
    if (!manual && !migrate && skipVersion === latest) { set({ status: 'uptodate', latest }); return snapshot() }
    if (state.staged && !IS_WIN) { const sv = stagedVersion(state.staged); if (!sv || !same(sv, latest)) { log('discard stale staged', sv); clearStaged() } }
    if (state.staged) { set({ status: 'ready', latest }); if (!migrate) showCardIfAllowed(manual); return snapshot() }
    let url = `https://github.com/${REPO}/releases/download/${latest}/${IS_WIN ? EXE : ZIP}`, isZip = !IS_WIN, p = await probe(url)
    if (!p.ok && !IS_WIN) { url = `https://github.com/${REPO}/releases/download/${latest}/${DMG}`; isZip = false; p = await probe(url) }
    if (!p.ok) throw new Error(`${latest} is published but the file is not ready yet`)
    set({ status: 'available', latest, url, isZip, size: p.size, progress: 0, bytes: 0 })
    log('available', latest, isZip ? 'zip' : (IS_WIN ? 'exe' : 'dmg'), fmtMB(p.size))
    if (migrate) { download().then(() => { if (state.staged) { try { fs.writeFileSync(migratedFlag(), '1') } catch {} install(true) } }); return snapshot() }
    showCardIfAllowed(manual)
    if (C.autoDownload()) download()
  } catch (e) { set({ status: 'error', error: e.message }); log('check failed:', e.message); lastTag = null; if (manual) C.toast('Update check failed') }
  return snapshot()
}

async function download() {
  if (!state.url || ['downloading', 'unpacking', 'installing'].includes(state.status)) return
  if (state.staged && !IS_WIN) { const sv = stagedVersion(state.staged); if (sv && same(sv, state.latest)) { set({ status: 'ready' }); return } clearStaged() }
  const dir = updDir(); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, IS_WIN ? EXE : state.isZip ? ZIP : DMG), mnt = path.join(dir, 'mnt')
  let prog = null
  try {
    set({ status: 'downloading', progress: 0, bytes: 0, speed: 0, eta: 0 })
    let lastB = 0, lastT = Date.now()
    prog = setInterval(() => {
      try {
        const b = fs.statSync(file).size, now = Date.now(), sp = (b - lastB) / Math.max(0.001, (now - lastT) / 1000); lastB = b; lastT = now
        set({ bytes: b, speed: sp, progress: state.size ? Math.min(99, Math.round(b / state.size * 100)) : 0, eta: sp > 0 && state.size ? Math.round((state.size - b) / sp) : 0 })
      } catch {}
    }, 300)
    let ok = false, err = null
    for (let i = 0; i < 3 && !ok; i++) {
      try {
        await new Promise((res, rej) => { dlProc = execFile(curl, ['-L', '--fail', '--silent', '--show-error', '-C', '-', '--retry', '2', '-o', file, state.url], { timeout: 900000 }, (e, o, se) => { dlProc = null; e ? rej(new Error(String(se || e.message).trim())) : res() }) })
        ok = true
      } catch (e) { err = e; log('download attempt', i + 1, 'failed:', e.message); if (state.status !== 'downloading') throw e; await new Promise(r => setTimeout(r, 1500)) }
    }
    if (!ok) throw err || new Error('download failed')
    clearInterval(prog); prog = null
    if (state.size && fs.statSync(file).size !== state.size) throw new Error('download incomplete')
    set({ progress: 100, status: 'unpacking' })
    if (IS_WIN) { set({ staged: file, status: 'ready' }); log('staged installer', state.latest); showCardIfAllowed(false); C.notify('Lumen update ready', `${state.latest} is downloaded. Restart to finish.`); return }
    if (state.isZip) {
      await sh('ditto', ['-x', '-k', file, dir])
      const a = fs.readdirSync(dir).find(f => f.endsWith('.app')); if (!a) throw new Error('No .app in zip')
      if (a !== 'Lumen.app') fs.renameSync(path.join(dir, a), path.join(dir, 'Lumen.app'))
    } else {
      fs.mkdirSync(mnt, { recursive: true })
      await sh('hdiutil', ['attach', '-nobrowse', '-quiet', '-mountpoint', mnt, file])
      const a = fs.readdirSync(mnt).find(f => f.endsWith('.app')); if (!a) throw new Error('No .app in DMG')
      await sh('ditto', [path.join(mnt, a), path.join(dir, 'Lumen.app')])
      await sh('hdiutil', ['detach', '-quiet', mnt]).catch(() => {})
    }
    fs.rmSync(file, { force: true })
    const staged = path.join(dir, 'Lumen.app'), sv = stagedVersion(staged)
    if (!sv || !same(sv, state.latest)) throw new Error(`unpacked version mismatch (${sv})`)
    await sh('xattr', ['-cr', staged]).catch(() => {})
    set({ staged, status: 'ready' }); log('staged', state.latest)
    if (migrate) return
    showCardIfAllowed(false)
    C.notify('Lumen update ready', `${state.latest} is downloaded. Restart to finish.`)
  } catch (e) {
    clearInterval(prog)
    if (state.status === 'available') return // cancelled
    set({ status: 'error', error: e.message }); log('download failed:', e.message)
    try { await sh('hdiutil', ['detach', '-quiet', mnt]) } catch {}
  }
}

// relaunch=false is used when the person quits Lumen: the update is applied and Lumen stays closed
async function install(relaunch = true, { fromQuit = false } = {}) {
  if (!state.staged) { if (!fromQuit && state.status !== 'downloading' && state.status !== 'unpacking') await download(); if (!state.staged) return snapshot() }
  try { C.flush() } catch {}
  const marker = path.join(app.getPath('userData'), 'just-updated')
  if (IS_WIN) {
    try { fs.writeFileSync(marker, '') } catch {}
    set({ status: 'installing' }); log('installing (windows)', state.latest)
    const exe = process.execPath, cmd = path.join(updDir(), 'update.cmd'), wl = path.join(app.getPath('logs'), 'update.log')
    fs.writeFileSync(cmd, ['@echo off', 'setlocal', `set "LOG=${wl}"`, `echo === %DATE% %TIME% installing ${state.latest} >> "%LOG%"`, 'timeout /t 2 /nobreak >nul', 'set N=0', ':try',
      `"${state.staged}" /S${relaunch ? ' --force-run' : ''}`, 'set RC=%ERRORLEVEL%', 'echo installer exit %RC% >> "%LOG%"', 'if "%RC%"=="0" goto ok', 'set /a N+=1', 'if %N% GEQ 4 goto fail', 'timeout /t 3 /nobreak >nul', 'goto try',
      ':ok', relaunch ? 'timeout /t 6 /nobreak >nul' : 'rem', relaunch ? `tasklist /FI "IMAGENAME eq Lumen.exe" | find /I "Lumen.exe" >nul || start "" "${exe}"` : 'rem', 'echo done >> "%LOG%"', 'exit /b 0',
      ':fail', 'echo all attempts failed, reopening the current version >> "%LOG%"', `start "" "${exe}"`, 'exit /b 1'].join('\r\n'))
    spawn('cmd.exe', ['/c', cmd], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
    if (!fromQuit) setTimeout(() => app.exit(0), 400)
    return snapshot()
  }
  const sv = stagedVersion(state.staged)
  if (!sv || !(newer(sv, app.getVersion()) || (migrate && same(sv, app.getVersion())))) { clearStaged(); set({ status: 'error', error: 'staged copy was not newer, fetching again' }); return fromQuit ? snapshot() : check(true) }
  const target = bundlePath(); if (!target) { set({ status: 'error', error: 'Not running from an .app bundle' }); return snapshot() }
  const logf = path.join(app.getPath('logs'), 'update.log'), script = path.join(updDir(), 'swap.sh')
  fs.writeFileSync(script, `#!/bin/bash
exec >> "${logf}" 2>&1
unset LUMEN_SELFTEST
echo "=== $(date) swap ${app.getVersion()} -> ${sv} (relaunch=${relaunch ? 1 : 0})"
NEW="${state.staged}"; APP="${target}"; OLDPID=${process.pid}; RELAUNCH=${relaunch ? 1 : 0}
for i in $(seq 1 60); do kill -0 $OLDPID 2>/dev/null || break; sleep 0.1; done
kill -0 $OLDPID 2>/dev/null && { echo "old pid $OLDPID still alive, SIGTERM"; kill -TERM $OLDPID 2>/dev/null; sleep 1; }
kill -0 $OLDPID 2>/dev/null && { echo "old pid $OLDPID stuck, SIGKILL"; kill -KILL $OLDPID 2>/dev/null; sleep 0.5; }
rm -rf "$APP.old"; mv "$APP" "$APP.old" || { echo "mv failed"; exit 1; }
if mv "$NEW" "$APP" 2>/dev/null || ditto "$NEW" "$APP"; then xattr -cr "$APP" 2>/dev/null; echo "swapped"; else echo "swap failed, rolling back"; rm -rf "$APP"; mv "$APP.old" "$APP"; fi
touch "${marker}"
if [ "$RELAUNCH" != "1" ]; then rm -rf "$APP.old"; echo "=== done (stays closed)"; exit 0; fi
open -a "$APP" || ("$APP/Contents/MacOS/Lumen" >/dev/null 2>&1 & disown)
for i in $(seq 1 40); do pgrep -f "$APP/Contents/MacOS/Lumen" >/dev/null && break; sleep 0.25; done
if pgrep -f "$APP/Contents/MacOS/Lumen" >/dev/null; then echo "launched OK"; rm -rf "$APP.old" "$NEW"; else echo "launch failed, restoring old"; rm -rf "$APP"; mv "$APP.old" "$APP" 2>/dev/null; open -a "$APP"; fi
sleep 8; pgrep -f "$APP/Contents/MacOS/Lumen" >/dev/null || { echo "no Lumen running after swap, relaunching"; open -a "$APP"; }
echo "=== done"
`)
  fs.chmodSync(script, 0o755)
  set({ status: 'installing' }); log('installing', sv)
  spawn('/bin/bash', [script], { detached: true, stdio: 'ignore' }).unref()
  if (!fromQuit) {
    setTimeout(() => app.exit(0), 150)
    setTimeout(() => { try { process.kill(process.pid, 'SIGKILL') } catch {} }, 2500)   // if Electron will not die, make it
  }
  return snapshot()
}

async function poll() {
  if (!enabled || polling || ['downloading', 'unpacking', 'installing', 'checking'].includes(state.status)) return
  polling = true
  const tag = await latestTag().finally(() => (polling = false))
  if (!tag) { misses++; if (misses === 20) { clearInterval(timer); timer = setInterval(poll, 60000); log('backing off to 60s') } return }
  misses = 0
  if (tag === lastTag) return
  lastTag = tag
  if (newer(tag, app.getVersion()) || (adhoc && same(tag, app.getVersion()) && !fs.existsSync(migratedFlag()))) check(false)
  else if (state.status === 'idle') set({ status: 'uptodate', latest: tag })
}

function start(ctx) {
  C = ctx
  enabled = !!ctx.autoUpdate()
  skipVersion = ctx.skipped() || null
  if (!app.isPackaged && process.env.LUMEN_SELFTEST !== 'swap') return
  try {
    const f = path.join(app.getPath('userData'), 'just-updated')
    if (fs.existsSync(f)) { fs.rmSync(f); setTimeout(() => C.toast(`Updated to Lumen ${app.getVersion()}`), 2500); log('updated to', app.getVersion()) }
  } catch {}
  // A fresh DMG install is ad-hoc signed (so Gatekeeper opens it). Updates are cert-signed (so Keychain and permissions survive).
  // Switch to the cert build of the SAME version right away, so no later update ever changes the app's identity.
  if (process.platform === 'darwin' && bundlePath()) execFile('codesign', ['-dv', bundlePath()], (e, o, er) => { adhoc = /Signature=adhoc/.test((o || '') + (er || '')); if (adhoc) log('ad-hoc build detected, will switch to the stable-identity build') })
  if (process.env.LUMEN_SELFTEST === 'swap') setTimeout(async () => {
    try {
      log('SELFTEST swap: staging a copy of myself')
      const dir = updDir(); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
      await sh('ditto', [bundlePath(), path.join(dir, 'Lumen.app')])
      state.staged = path.join(dir, 'Lumen.app'); state.latest = 'v' + app.getVersion(); migrate = true
      await install(true)
    } catch (e) { log('SELFTEST failed', e.message) }
  }, 6000)
  const staged = path.join(updDir(), 'Lumen.app')
  if (!IS_WIN && fs.existsSync(staged)) { const sv = stagedVersion(staged); if (sv && newer(sv, app.getVersion())) { state.staged = staged; state.status = 'ready'; state.latest = 'v' + sv } else clearStaged() }
  if (!enabled) return
  setTimeout(() => check(false), 4000)
  timer = setInterval(poll, 10000)
  powerMonitor.on('resume', () => setTimeout(() => check(false), 8000))
}
function setEnabled(on) {
  enabled = !!on
  clearInterval(timer)
  if (enabled && app.isPackaged) { timer = setInterval(poll, 10000); check(false) }
}

module.exports = {
  REPO, start, check, download, install, setEnabled,
  later: () => { snoozedUntil = Date.now() + 2 * 3600000; hideCard() },
  skip: () => { skipVersion = state.latest; try { C.setSkipped(skipVersion) } catch {} hideCard() },
  cancel: () => { try { dlProc && dlProc.kill('SIGTERM') } catch {} set({ status: 'available', progress: 0 }) },
  isReady: () => !!state.staged && state.status === 'ready',
  getState: snapshot,
  onState: fn => { listeners.add(fn); return () => listeners.delete(fn) },
}
