// Surge and Koi, built into Lumen. Each runs its own code exactly as before, through a thin layer that keeps it a good
// neighbor inside Lumen: its own data folder, its own global shortcuts (it can only clear its own), no taking over
// Lumen's menu, Dock icon, login item or single-instance lock, and "Quit" turns only that tool off.
const path = require('path'), fs = require('fs'), Module = require('module')
const electron = require('electron')
const { app, globalShortcut, Menu, Tray, BrowserWindow } = electron

const ROOT = path.join(__dirname, '..', 'apps')
const APPS = {
  surge: { name: 'Surge', main: 'main.js', platforms: ['darwin', 'win32'], data: { darwin: 'Surge', win32: 'Surge' }, seed: { welcomed: true, launchAtLogin: false }, settingsFile: 'settings.json' },
  koi: { name: 'Koi', main: 'main.js', platforms: ['darwin'], data: { darwin: 'koi' }, seed: { tourSeen: true }, settingsFile: 'koi-settings.json' },
}
const running = new Map()   // id -> { windows:Set, trays:Set, shortcuts:Set, quitFns:[] }
let L = null                 // Lumen context: { D, Updater, log, onAllOff }

const userDataFor = id => path.join(app.getPath('userData'), 'apps', id)
const supported = id => APPS[id].platforms.includes(process.platform) || process.env.LUMEN_APPS_ANYWHERE === '1'
const enabled = id => supported(id) && (L.D.settings.get('apps') || {})[id] !== false

// ------------------------------------------------------------ the per-app layer over Electron
function makeShim(id) {
  const st = { windows: new Set(), trays: new Set(), shortcuts: new Set(), quitFns: [], bag: {} }
  running.set(id, st)
  const version = (() => { try { return require(path.join(ROOT, id, 'package.json')).version } catch { return app.getVersion() } })()
  const dock = { hide() {}, show() { return Promise.resolve() }, setBadge() {}, getBadge: () => '', bounce: () => 0, cancelBounce() {}, isVisible: () => true, setIcon() {}, setMenu() {} }
  const overrides = {
    getPath: n => n === 'userData' ? userDataFor(id) : app.getPath(n),
    getName: () => APPS[id].name, getVersion: () => version,
    requestSingleInstanceLock: () => true, hasSingleInstanceLock: () => true, releaseSingleInstanceLock() {},
    quit: () => stop(id, 'quit'), exit: () => stop(id, 'quit'), relaunch() {},
    setLoginItemSettings() {}, getLoginItemSettings: () => app.getLoginItemSettings(),
    isInApplicationsFolder: () => true, moveToApplicationsFolder: () => false,
    setAppUserModelId() {}, setActivationPolicy() {}, setName() {},
    on: (ev, fn) => { if (ev === 'will-quit' || ev === 'before-quit') { st.quitFns.push(fn); app.on(ev, fn) } return proxyApp },
    once: (ev, fn) => { if (ev === 'will-quit' || ev === 'before-quit') { st.quitFns.push(fn); app.once(ev, fn) } return proxyApp },
    dock: process.platform === 'darwin' ? dock : undefined,
  }
  const proxyApp = new Proxy(app, {
    get: (t, k) => k in overrides ? overrides[k] : k in st.bag ? st.bag[k] : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]),
    set: (t, k, v) => { st.bag[k] = v; return true },   // Koi keeps app.isQuitting on the app object; keep that per tool
  })
  // global shortcuts: a tool can only see and clear its own
  const gs = {
    register: (acc, fn) => { const ok = globalShortcut.register(acc, fn); if (ok) st.shortcuts.add(acc); return ok },
    registerAll: (accs, fn) => { for (const a of accs) gs.register(a, fn) },
    unregister: acc => { st.shortcuts.delete(acc); try { globalShortcut.unregister(acc) } catch {} },
    unregisterAll: () => { for (const a of st.shortcuts) { try { globalShortcut.unregister(a) } catch {} } st.shortcuts.clear() },
    isRegistered: acc => globalShortcut.isRegistered(acc),
  }
  const menu = new Proxy(Menu, { get: (t, k) => k === 'setApplicationMenu' ? () => {} : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) })
  // real windows and trays (so BrowserWindow.fromWebContents and friends keep working), just remembered per tool
  const AppTray = new Proxy(Tray, { construct: (T, a) => { const t = new T(...a); st.trays.add(t); return t } })
  const AppWindow = new Proxy(BrowserWindow, { construct: (B, a) => { const w = new B(...a); st.windows.add(w); w.once('closed', () => st.windows.delete(w)); w.webContents.on('dom-ready', () => paint(w)); return w } })
  return new Proxy(electron, { get: (t, k) => k === 'app' ? proxyApp : k === 'globalShortcut' ? gs : k === 'Menu' ? menu : k === 'Tray' ? AppTray : k === 'BrowserWindow' ? AppWindow : t[k] })
}

// ------------------------------------------------------------ colors: their windows follow the accent color picked in Lumen
// Lumen's blue pairs with its purple; any other accent pairs with the same color turned a little further round the wheel.
function accentVars() {
  const a = /^#[0-9a-f]{6}$/i.test(String(L && L.D.settings.get('accent'))) ? L.D.settings.get('accent').toLowerCase() : '#5b8cff'
  return { a, b: a === '#5b8cff' ? '#8a63f2' : `oklch(from ${a} calc(l - .03) c calc(h + 40))` }
}
function paint(w) {
  try {
    if (w.isDestroyed()) return
    const { a, b } = accentVars()
    w.webContents.executeJavaScript(`(() => { const r = document.documentElement.style; r.setProperty('--lumen-a', ${JSON.stringify(a)}); r.setProperty('--lumen-b', ${JSON.stringify(b)}) })()`).catch(() => {})
  } catch {}
}
function setAccent() { for (const st of running.values()) for (const w of st.windows) paint(w) }

// every require('electron') made by a tool's own files gets that tool's layer
const shims = {}
const appOf = file => { if (!file || !file.startsWith(ROOT + path.sep)) return null; const id = file.slice(ROOT.length + 1).split(path.sep)[0]; return APPS[id] ? id : null }
const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'electron' && parent) { const id = appOf(parent.filename); if (id && shims[id]) return shims[id] }
  return origLoad.apply(this, arguments)
}

// ------------------------------------------------------------ first run: bring over settings from the separate apps
function importData(id) {
  const dst = userDataFor(id)
  if (fs.existsSync(path.join(dst, APPS[id].settingsFile))) return false
  fs.mkdirSync(dst, { recursive: true })
  const old = APPS[id].data[process.platform] && path.join(app.getPath('appData'), APPS[id].data[process.platform])
  let imported = false
  if (old && fs.existsSync(path.join(old, APPS[id].settingsFile))) {
    for (const f of fs.readdirSync(old)) {
      if (/^(settings\.json|koi-settings\.json|notes\.txt|clipboard\.json|stats\.json|usage\.json)$/.test(f)) { try { fs.copyFileSync(path.join(old, f), path.join(dst, f)); imported = true } catch {} }
    }
  }
  // no intro pop-ups of their own: Lumen's intro shows them; and Lumen owns the login item
  const sf = path.join(dst, APPS[id].settingsFile)
  let s = {}; try { s = JSON.parse(fs.readFileSync(sf, 'utf8')) } catch {}
  fs.writeFileSync(sf, JSON.stringify({ ...s, ...APPS[id].seed }))
  if (imported) { L.log('apps: imported settings for', id); module.exports.importedAny = true }
  return imported
}

// ------------------------------------------------------------ start, stop
function startApp(id) {
  if (running.has(id) || !enabled(id)) return false
  try {
    importData(id)
    shims[id] = makeShim(id)
    const before = { SIGTERM: process.listeners('SIGTERM'), SIGINT: process.listeners('SIGINT') }
    require(path.join(ROOT, id, APPS[id].main))
    // a tool must never take over how Lumen shuts down
    for (const s of ['SIGTERM', 'SIGINT']) for (const fn of process.listeners(s)) if (!before[s].includes(fn)) process.removeListener(s, fn)
    L.log('apps: started', id)
    return true
  } catch (e) { L.log('apps: could not start', id, e && e.stack || e); running.delete(id); return false }
}
function stop(id, why) {
  const st = running.get(id); if (!st) return
  L.log('apps: stopping', id, why || '')
  for (const fn of st.quitFns) { try { fn({ preventDefault() {} }) } catch {} app.removeListener('will-quit', fn); app.removeListener('before-quit', fn) }
  for (const a of st.shortcuts) { try { globalShortcut.unregister(a) } catch {} }
  for (const t of st.trays) { try { t.destroy() } catch {} }
  for (const w of st.windows) { try { if (!w.isDestroyed()) w.destroy() } catch {} }
  running.delete(id)
  if (why === 'quit') L.onStopped && L.onStopped(id)
}

// ------------------------------------------------------------ the separate apps, if they are still installed
function separateRunning(cb) {
  if (process.platform !== 'darwin') return cb([])
  require('child_process').execFile('ps', ['-axo', 'comm='], { maxBuffer: 8e6 }, (e, out) => {
    const found = []
    for (const [id, a] of Object.entries(APPS)) if (enabled(id) && new RegExp(`/${a.name}\\.app/Contents/MacOS/`, 'i').test(String(out || ''))) found.push(id)
    cb(found)
  })
}
function quitSeparate(ids) {
  for (const id of ids) {
    const n = APPS[id].name
    require('child_process').execFile('osascript', ['-e', `tell application "${n}" to quit`, '-e', `tell application "System Events" to delete (every login item whose name is "${n}")`], () => {})
  }
}

function start(ctx) {
  L = ctx
  // their "check for updates" buttons use Lumen's updater
  globalThis.__lumenApps = { check: () => L.Updater.check(true), install: () => L.Updater.install(true), state: () => L.Updater.getState() }
  const started = []
  for (const id of Object.keys(APPS)) if (startApp(id)) started.push(id)
  if (started.length) setTimeout(() => separateRunning(ids => ids.length && L.onSeparate && L.onSeparate(ids)), 4000)
  return started
}
const list = () => Object.entries(APPS).map(([id, a]) => ({ id, name: a.name, supported: supported(id), enabled: enabled(id), running: running.has(id) }))
// send a message to a tool as if one of its own windows did (used for Open Surge settings and the like)
function poke(channel, ...args) { try { require('electron').ipcMain.emit(channel, { sender: null, returnValue: null, reply() {} }, ...args) } catch {} }

module.exports = { start, stop, startApp, list, setAccent, accentVars, isRunning: id => running.has(id), poke, quitSeparate, APPS, userDataFor }
