// Self-updater from GitHub Releases. Works for unsigned / ad-hoc signed builds (no Squirrel needed).
// Mac: downloads Lumen-mac-<arch>.zip, swaps the .app after the app quits, clears quarantine, relaunches.
// Windows: downloads the NSIS installer and runs it silently.
const { app, net } = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, execFile } = require('child_process')
const pkg = require('../package.json')

const REPO = (pkg.lumen && pkg.lumen.repo) || 'mabdulhadi0208-afk/lumen'
let state = { status: 'idle', version: app.getVersion() }
let listeners = new Set()
let readyPath = null
let busy = false

const emit = patch => { state = { ...state, ...patch }; for (const fn of listeners) { try { fn(state) } catch {} } }
const newer = (a, b) => {
  const pa = a.replace(/^v/, '').split('.').map(n => parseInt(n) || 0), pb = b.replace(/^v/, '').split('.').map(n => parseInt(n) || 0)
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) > (pb[i] || 0)) return true; if ((pa[i] || 0) < (pb[i] || 0)) return false }
  return false
}
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, headers: { 'User-Agent': 'Lumen-Updater', Accept: 'application/vnd.github+json' } })
    let body = ''
    req.on('response', res => {
      res.on('data', d => body += d)
      res.on('end', () => { if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode)); try { resolve(JSON.parse(body)) } catch (e) { reject(e) } })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}
function download(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, headers: { 'User-Agent': 'Lumen-Updater' }, redirect: 'follow' })
    req.on('response', res => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode))
      const total = parseInt(res.headers['content-length']) || 0
      let got = 0
      const out = fs.createWriteStream(dest)
      res.on('data', d => { out.write(d); got += d.length; if (total) onProgress(got / total) })
      res.on('end', () => out.end(() => resolve(dest)))
      res.on('error', e => { out.destroy(); reject(e) })
    })
    req.on('error', reject)
    req.end()
  })
}
function appBundle() { return path.resolve(process.execPath, '..', '..', '..') }
function canSelfUpdate() {
  if (!app.isPackaged) return false
  if (process.platform === 'darwin') {
    const b = appBundle()
    if (!b.endsWith('.app') || b.startsWith('/Volumes/')) return false
    try { fs.accessSync(path.dirname(b), fs.constants.W_OK); return true } catch { return false }
  }
  return process.platform === 'win32'
}

async function check({ silent = false } = {}) {
  if (busy) return state
  busy = true
  try {
    emit({ status: 'checking', error: null })
    const rel = await fetchJSON(`https://api.github.com/repos/${REPO}/releases/latest`)
    const latest = (rel.tag_name || '').replace(/^v/, '')
    if (!latest || !newer(latest, app.getVersion())) { emit({ status: 'current', latest: latest || app.getVersion() }); return state }
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
    const want = process.platform === 'darwin' ? new RegExp(`mac-${arch}\\.zip$`) : /Setup.*\.exe$/
    const asset = (rel.assets || []).find(a => want.test(a.name))
    emit({ status: 'available', latest, notes: rel.body || '' })
    if (!asset) { emit({ status: 'available', manual: true }); return state }
    if (!canSelfUpdate()) { emit({ status: 'available', manual: true, reason: 'Move Lumen to your Applications folder to get automatic updates.' }); return state }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-update-'))
    const file = path.join(dir, asset.name)
    await download(asset.browser_download_url, file, p => emit({ status: 'downloading', progress: p }))
    if (process.platform === 'darwin') {
      const out = path.join(dir, 'x')
      fs.mkdirSync(out)
      await new Promise((res, rej) => execFile('/usr/bin/ditto', ['-x', '-k', file, out], e => e ? rej(e) : res()))
      const appDir = fs.readdirSync(out).find(n => n.endsWith('.app'))
      if (!appDir) throw new Error('Update package is missing the app')
      readyPath = path.join(out, appDir)
    } else readyPath = file
    emit({ status: 'ready', latest })
  } catch (e) {
    emit({ status: silent ? 'idle' : 'error', error: String(e.message || e) })
  } finally { busy = false }
  return state
}

// Applies the downloaded update. relaunch=false is used on normal quit so the next launch is already updated.
function apply(relaunch = true) {
  if (!readyPath) return false
  try {
    if (process.platform === 'darwin') {
      const dest = appBundle()
      const script = path.join(os.tmpdir(), 'lumen-apply-update.sh')
      fs.writeFileSync(script, `#!/bin/bash
PID=$1; NEW="$2"; DEST="$3"; RELAUNCH="$4"
for i in $(seq 1 200); do kill -0 $PID 2>/dev/null || break; sleep 0.15; done
rm -rf "$DEST.lumen-old"
if mv "$DEST" "$DEST.lumen-old"; then
  if /usr/bin/ditto "$NEW" "$DEST"; then rm -rf "$DEST.lumen-old"; else rm -rf "$DEST"; mv "$DEST.lumen-old" "$DEST"; fi
fi
/usr/bin/xattr -cr "$DEST" 2>/dev/null
if [ "$RELAUNCH" = "1" ]; then /usr/bin/open "$DEST"; fi
`, { mode: 0o755 })
      spawn('/bin/bash', [script, String(process.pid), readyPath, dest, relaunch ? '1' : '0'], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn(readyPath, ['/S', relaunch ? '--force-run' : ''].filter(Boolean), { detached: true, stdio: 'ignore' }).unref()
    }
    readyPath = null
    return true
  } catch (e) { emit({ status: 'error', error: e.message }); return false }
}

let interval
function start(enabled) {
  clearInterval(interval)
  if (!enabled || !app.isPackaged) return
  setTimeout(() => check({ silent: true }), 15000)
  interval = setInterval(() => check({ silent: true }), 4 * 3600 * 1000)
}

module.exports = {
  check, apply, start, isReady: () => !!readyPath, getState: () => state,
  onState: fn => { listeners.add(fn); return () => listeners.delete(fn) }, REPO,
}
