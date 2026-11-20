// Lumen — main process.
const {
  app, BaseWindow, WebContentsView, session, ipcMain, Menu, nativeTheme, protocol, dialog, shell,
  clipboard, webContents, systemPreferences, net, desktopCapturer, nativeImage, powerMonitor,
} = require('electron')
const fs = require('fs')
const path = require('path')
const D = require('./data')
const Sync = require('./sync')
const Importer = require('./importer')
const Updater = require('./updater')
const Passkeys = require('./passkeys')
const { Store: WStore } = require('./store')
let wallpaperStore
app.whenReady().then(() => { wallpaperStore = new WStore('wallpaper', { image: '' }) })

const isMac = process.platform === 'darwin'
const ROOT = path.join(__dirname, '..')
const ICON = path.join(ROOT, 'build', 'icon.png')

app.setName('Lumen')
app.commandLine.appendSwitch('enable-smooth-scrolling')
protocol.registerSchemesAsPrivileged([
  { scheme: 'lumen', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
])

// Clean, plain-Chrome user agent so sites (and Google sign-in) treat Lumen like Chrome.
const winBg = () => nativeTheme.shouldUseDarkColors ? '#1b1c20' : '#e6e9f0'
function chromeUA(ua) { return ua.replace(/\sElectron\/\S+/, '').replace(/\s(Lumen|lumen)\/\S+/, '') }
// Google blocks sign-in from browsers built on Electron ("This browser or app may not be secure"), but allows Firefox.
// On Google's sign-in pages only, Lumen presents itself as the current Firefox release.
function firefoxUA() {
  const v = 128 + Math.floor((Date.now() - Date.UTC(2024, 6, 9)) / (28 * 864e5)) - 1
  const os = isMac ? 'Macintosh; Intel Mac OS X 10.15' : 'Windows NT 10.0; Win64; x64'
  return `Mozilla/5.0 (${os}; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`
}
const isGoogleSignIn = url => /^https:\/\/accounts\.google\.com\//.test(url || '')

// boot / error log (Logs folder), used by the release gate and for support
function log(...a) { try { fs.mkdirSync(app.getPath('logs'), { recursive: true }); fs.appendFileSync(path.join(app.getPath('logs'), 'lumen.log'), `[${new Date().toISOString()}] ${a.join(' ')}\n`) } catch {} }

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }

const SEARCH = {
  google: { name: 'Google', url: 'https://www.google.com/search?q=%s', suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&q=%s' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', suggest: 'https://duckduckgo.com/ac/?type=list&q=%s' },
  bing: { name: 'Bing', url: 'https://www.bing.com/search?q=%s', suggest: 'https://api.bing.com/osjson.aspx?query=%s' },
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=%s', suggest: 'https://search.brave.com/api/suggest?q=%s' },
  ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=%s', suggest: 'https://ac.ecosia.org/autocomplete?type=list&q=%s' },
  kagi: { name: 'Kagi', url: 'https://kagi.com/search?q=%s', suggest: null },
}

function toURL(text) {
  const t = (text || '').trim()
  if (!t) return null
  if (/^(https?|file|lumen|chrome-extension|about|data|view-source):/i.test(t)) return t
  if (/^localhost(:\d+)?(\/.*)?$/i.test(t) || /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(t)) return 'http://' + t
  if (!/\s/.test(t) && /^[^\s/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(t)) return 'https://' + t
  const eng = SEARCH[D.settings.get('searchEngine')] || SEARCH.google
  return eng.url.replace('%s', encodeURIComponent(t))
}

// ---------------------------------------------------------------- sessions
let mainSession, extensions = null, blocker = null
const blockedByWc = new Map()
const sessionsReady = new Set()

function setupSession(ses, { incognito = false } = {}) {
  if (sessionsReady.has(ses)) return ses
  sessionsReady.add(ses)
  ses.setUserAgent(chromeUA(ses.getUserAgent()))
  ses.protocol.handle('lumen', req => serveInternal(req))
  ses.registerPreloadScript({ id: 'lumen-tab', type: 'frame', filePath: path.join(__dirname, 'preload-tab.js') })
  ses.webRequest.onBeforeSendHeaders((d, cb) => {
    const h = d.requestHeaders
    if (isGoogleSignIn(d.url)) {
      h['User-Agent'] = firefoxUA()
      for (const k of Object.keys(h)) if (/^sec-ch-ua/i.test(k)) delete h[k]
    }
    if (D.settings.get('doNotTrack')) { h['Sec-GPC'] = '1'; h['DNT'] = '1' }
    cb({ requestHeaders: h })
  })
  ses.setPermissionRequestHandler(onPermissionRequest)
  ses.setPermissionCheckHandler((wc, permission, origin) => {
    if (['fullscreen', 'clipboard-sanitized-write', 'pointerLock', 'keyboardLock', 'background-sync'].includes(permission)) return true
    try { return (D.permissions.get()[new URL(origin).origin] || {})[permission] === 'allow' } catch { return false }
  })
  ses.setDisplayMediaRequestHandler((req, cb) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then(src => cb(src[0] ? { video: src[0], audio: isMac ? undefined : 'loopback' } : {})).catch(() => cb({}))
  }, { useSystemPicker: true })
  ses.on('will-download', onDownload)
  ses.setSpellCheckerEnabled(true)
  if (blocker && D.settings.get('adblock')) { try { blocker.enableBlockingInSession(ses) } catch {} }
  return ses
}

async function setupAdblock() {
  try {
    const { ElectronBlocker } = require('@ghostery/adblocker-electron')
    const cache = path.join(app.getPath('userData'), 'adblock-engine.bin')
    const fetchImpl = (url, opts) => net.fetch(url, opts)
    const caching = { path: cache, read: fs.promises.readFile, write: fs.promises.writeFile }
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('adblock list timeout')), 15000))
    blocker = await Promise.race([ElectronBlocker.fromPrebuiltAdsAndTracking(fetchImpl, caching), timeout])
    blocker.on('request-blocked', req => {
      const id = req.tabId
      if (id == null) return
      blockedByWc.set(id, (blockedByWc.get(id) || 0) + 1)
      const w = winForWc(id)
      if (w) w.pushStateSoon()
    })
    if (D.settings.get('adblock')) for (const ses of sessionsReady) { try { blocker.enableBlockingInSession(ses) } catch {} }
  } catch (e) { console.error('adblock unavailable:', e.message); blocker = null }
}
function setAdblock(on) {
  if (!blocker) return
  for (const ses of sessionsReady) {
    try { if (on && !blocker.isBlockingEnabled(ses)) blocker.enableBlockingInSession(ses); if (!on && blocker.isBlockingEnabled(ses)) blocker.disableBlockingInSession(ses) } catch {}
  }
}

async function setupExtensions() {
  try {
    const { ElectronChromeExtensions } = require('electron-chrome-extensions')
    const { installChromeWebStore } = require('electron-chrome-web-store')
    extensions = new ElectronChromeExtensions({
      session: mainSession,
      async createTab(details) {
        const w = (details.windowId && windows.find(x => x.win.id === details.windowId)) || lastFocused() || createWindow({})
        const tab = w.createTab(details.url || 'lumen://newtab', { active: details.active !== false })
        return [tab.view.webContents, w.win]
      },
      selectTab(wc) { const w = winForWc(wc.id); if (w) { const t = w.tabByWc(wc.id); if (t) w.activate(t.id) } },
      removeTab(wc) { const w = winForWc(wc.id); if (w) { const t = w.tabByWc(wc.id); if (t) w.closeTab(t.id) } },
      async createWindow(details) {
        const w = createWindow({ urls: [].concat(details.url || 'lumen://newtab') })
        return w.win
      },
      removeWindow(win) { const w = windows.find(x => x.win === win); if (w) w.win.close() },
    })
    ElectronChromeExtensions.handleCRXProtocol(session.defaultSession)
    extensions.on('url-overrides-updated', () => {})
    await installChromeWebStore({
      session: mainSession,
      async beforeInstall(d) {
        const r = await dialog.showMessageBox({
          type: 'question', buttons: ['Add extension', 'Cancel'], defaultId: 0, cancelId: 1,
          message: `Add "${d.localizedName}" to Lumen?`,
          detail: 'It will be able to read and change data on the sites it asks for.',
          icon: d.icon,
        })
        return { action: r.response === 0 ? 'allow' : 'deny' }
      },
    })
  } catch (e) { console.error('extensions unavailable:', e.message) }
}

// ---------------------------------------------------------------- internal pages (lumen://)
const PAGES = ['newtab', 'settings', 'history', 'downloads', 'bookmarks', 'passwords', 'extensions', 'error', 'crashed', 'about']
async function serveInternal(req) {
  const u = new URL(req.url)
  let file
  if (u.host === 'assets' && u.pathname === '/jelly.js') return new Response(await fs.promises.readFile(path.join(ROOT, 'ui', 'jelly.js')), { headers: { 'content-type': 'text/javascript; charset=utf-8' } })
  if (u.host === 'assets' && u.pathname === '/icons.js') return new Response(await fs.promises.readFile(path.join(ROOT, 'ui', 'icons.js')), { headers: { 'content-type': 'text/javascript; charset=utf-8' } })
  if (u.host === 'assets') file = path.join(ROOT, 'pages', path.normalize(u.pathname).replace(/^(\.\.[/\\])+/, ''))
  else if (PAGES.includes(u.host)) file = path.join(ROOT, 'pages', 'app.html')
  else file = path.join(ROOT, 'pages', 'app.html')
  if (!file.startsWith(path.join(ROOT, 'pages'))) return new Response('Not found', { status: 404 })
  try {
    const body = await fs.promises.readFile(file)
    const ext = path.extname(file)
    const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }[ext] || 'application/octet-stream'
    const headers = { 'content-type': type + (ext === '.html' || ext === '.css' || ext === '.js' ? '; charset=utf-8' : '') }
    if (ext === '.html') { headers['content-security-policy'] = "frame-ancestors 'none'"; headers['x-frame-options'] = 'DENY' }
    return new Response(body, { headers })
  } catch { return new Response('Not found', { status: 404 }) }
}

// ---------------------------------------------------------------- permissions
const PERM_LABEL = {
  media: 'use your camera and microphone', geolocation: 'know your location', notifications: 'show notifications',
  midi: 'use MIDI devices', midiSysex: 'control MIDI devices', 'clipboard-read': 'see text and images you copy',
  'display-capture': 'see your screen', 'idle-detection': 'know when you are away', 'window-management': 'manage windows on your screens',
  hid: 'use HID devices', serial: 'use serial ports', usb: 'use USB devices', 'storage-access': 'use cookies across sites', 'top-level-storage-access': 'use cookies across sites',
}
const AUTO_ALLOW = ['fullscreen', 'clipboard-sanitized-write', 'pointerLock', 'keyboardLock', 'openExternal', 'fileSystem', 'speaker-selection']
let promptSeq = 0
const pendingPrompts = new Map()

function onPermissionRequest(wc, permission, callback, details) {
  if (AUTO_ALLOW.includes(permission)) {
    if (permission === 'openExternal') {
      const ext = details.externalURL || ''
      dialog.showMessageBox({ type: 'question', buttons: ['Open', 'Cancel'], message: 'Open this link in another app?', detail: ext }).then(r => callback(r.response === 0))
      return
    }
    return callback(true)
  }
  let origin
  try { origin = new URL(details.requestingUrl || wc.getURL()).origin } catch { return callback(false) }
  const key = permission === 'media' ? 'media-' + ((details.mediaTypes || []).sort().join('+') || 'av') : permission
  const saved = (D.permissions.get()[origin] || {})[key]
  const finish = async ok => {
    if (ok && permission === 'media' && isMac) {
      try {
        for (const t of details.mediaTypes || []) {
          const dev = t === 'video' ? 'camera' : 'microphone'
          if (systemPreferences.getMediaAccessStatus(dev) !== 'granted') ok = ok && await systemPreferences.askForMediaAccess(dev)
        }
      } catch {}
    }
    callback(!!ok)
  }
  if (saved) return finish(saved === 'allow')
  const w = winForWc(wc.id)
  if (!w) return callback(false)
  let label = PERM_LABEL[permission] || ('use ' + permission)
  if (permission === 'media') {
    const t = details.mediaTypes || []
    label = t.includes('video') && t.includes('audio') ? 'use your camera and microphone' : t.includes('video') ? 'use your camera' : 'use your microphone'
  }
  const id = ++promptSeq
  pendingPrompts.set(id, ans => {
    if (ans.remember) {
      const all = D.permissions.get(); all[origin] = { ...(all[origin] || {}), [key]: ans.allow ? 'allow' : 'deny' }; D.permissions.set(all)
    }
    finish(ans.allow)
  })
  const tab = w.tabByWc(wc.id)
  w.send('prompt', { id, kind: 'permission', tabId: tab && tab.id, host: new URL(origin).host, text: label })
}

// ---------------------------------------------------------------- downloads
const downloads = []
let dlSeq = 0
function uniquePath(dir, name) {
  let p = path.join(dir, name), i = 1
  const ext = path.extname(name), base = path.basename(name, ext)
  while (fs.existsSync(p)) p = path.join(dir, `${base} (${i++})${ext}`)
  return p
}
function onDownload(e, item, wc) {
  const d = { id: ++dlSeq, name: item.getFilename(), url: item.getURL(), received: 0, total: item.getTotalBytes(), state: 'progressing', path: '', started: Date.now(), paused: false }
  if (!D.settings.get('askWhereToSave')) {
    const p = uniquePath(app.getPath('downloads'), item.getFilename())
    item.setSavePath(p); d.path = p; d.name = path.basename(p)
  }
  downloads.unshift(d)
  d._item = item
  const push = () => broadcast('downloads', listDownloads())
  item.on('updated', (ev, state) => {
    d.received = item.getReceivedBytes(); d.total = item.getTotalBytes(); d.state = state === 'interrupted' ? 'interrupted' : 'progressing'
    d.paused = item.isPaused(); if (!d.path) { d.path = item.getSavePath(); d.name = path.basename(d.path) || d.name }
    pushSoon()
  })
  item.once('done', (ev, state) => {
    d.state = state; d.received = item.getReceivedBytes(); d.path = item.getSavePath(); d.name = path.basename(d.path) || d.name
    delete d._item
    if (state === 'completed' && isMac) app.dock && app.dock.downloadFinished(d.path)
    push()
  })
  let t; const pushSoon = () => { if (!t) t = setTimeout(() => { t = null; push() }, 200) }
  push()
  const w = winForWc(wc && wc.id) || lastFocused()
  if (w) w.send('download-started', d.id)
}
const listDownloads = () => downloads.slice(0, 100).map(({ _item, ...d }) => ({ ...d, exists: d.path ? fs.existsSync(d.path) : false }))

// ---------------------------------------------------------------- windows & tabs
const windows = []
let tabSeq = 0, incognitoSeq = 0
const closedTabs = []

function lastFocused() {
  const f = BaseWindow.getFocusedWindow()
  return windows.find(w => w.win === f) || windows[windows.length - 1] || null
}
function winForWc(wcId) {
  if (wcId == null) return null
  return windows.find(w => w.ui.webContents.id === wcId || [...w.tabs.values()].some(t => t.view && !t.view.webContents.isDestroyed() && t.view.webContents.id === wcId)) || null
}
function broadcast(ch, data) { for (const w of windows) w.send(ch, data) }

class BrowserWin {
  constructor({ incognito = false, bounds } = {}) {
    this.incognito = incognito
    this.ses = incognito ? setupSession(session.fromPartition('lumen-incognito-' + (++incognitoSeq)), { incognito: true }) : mainSession
    const b = bounds || { width: 1360, height: 860 }
    this.win = new BaseWindow({
      ...b, minWidth: 520, minHeight: 380, show: false,
      title: incognito ? 'Lumen Private' : 'Lumen',
      titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
      trafficLightPosition: { x: 16, y: 18 },
      // solid window: macOS vibrancy behind WebContentsViews breaks video layers (YouTube showed a blank player)
      backgroundColor: winBg(),
      transparent: false, icon: ICON,
    })
    this.tabs = new Map()
    this.order = []
    this.activeId = null
    this.splitId = null
    this.rect = { x: 256, y: 8, width: b.width - 264, height: b.height - 16 }
    this.overlay = false
    this.fullscreenTab = false
    this.ui = new WebContentsView({
      webPreferences: { preload: path.join(__dirname, 'preload-ui.js'), sandbox: false, contextIsolation: true, spellcheck: false, backgroundThrottling: false },
    })
    this.ui.setBackgroundColor('#00000000')
    this.win.contentView.addChildView(this.ui)
    this.ui.webContents.loadFile(path.join(ROOT, 'ui', 'index.html'), { query: { incognito: incognito ? '1' : '0', platform: process.platform } })
    const fit = () => { const [w, h] = this.win.getContentSize(); this.ui.setBounds({ x: 0, y: 0, width: w, height: h }); if (this.fullscreenTab) this.layout() }
    fit()
    this.win.on('resize', fit)
    this.win.on('enter-full-screen', () => this.send('fullscreen', true))
    this.win.on('leave-full-screen', () => { this.send('fullscreen', false); if (this.fullscreenTab) { this.fullscreenTab = false; this.layout() } })
    this.win.on('focus', () => { const t = this.active(); if (t && t.view && !this.overlay) t.view.webContents.focus() })
    this.win.on('close', () => { saveSessionNow() })
    this.win.on('closed', () => {
      for (const t of this.tabs.values()) this.destroyView(t)
      if (!this.ui.webContents.isDestroyed()) this.ui.webContents.close()
      windows.splice(windows.indexOf(this), 1)
      saveSession()
    })
    this.ui.webContents.once('did-finish-load', () => { this.win.show(); this.pushState() })
    this.ui.webContents.on('render-process-gone', () => { setTimeout(() => { if (!this.ui.webContents.isDestroyed()) this.ui.webContents.reload() }, 300) })
    this.ui.webContents.on('before-input-event', (e, input) => this.handleKeys(e, input))
    windows.push(this)
  }

  send(ch, data) { if (!this.ui.webContents.isDestroyed()) this.ui.webContents.send(ch, data) }
  active() { return this.tabs.get(this.activeId) }
  tabByWc(id) { return [...this.tabs.values()].find(t => t.view && !t.view.webContents.isDestroyed() && t.view.webContents.id === id) }

  createTab(url = 'lumen://newtab', { active = true, pinned = false, index = null, title = '', favicon = '', asleep = false, openerId = null } = {}) {
    const t = { id: ++tabSeq, url, title: title || '', favicon, pinned, loading: false, audible: false, muted: false, asleep: false, crashed: false, lastActive: Date.now(), view: null, zoom: 0, canBack: false, canForward: false, opener: openerId }
    this.tabs.set(t.id, t)
    let idx = index
    if (idx == null) {
      if (openerId && this.order.includes(openerId)) {
        idx = this.order.indexOf(openerId) + 1
        while (idx < this.order.length && this.tabs.get(this.order[idx]).opener === openerId) idx++
      } else idx = this.order.length
    }
    this.order.splice(idx, 0, t.id)
    if (asleep && !active) { t.asleep = true }
    else this.makeView(t)
    if (active) this.activate(t.id)
    else this.pushState()
    saveSession()
    return t
  }

  makeView(t) {
    const view = new WebContentsView({
      webPreferences: { session: this.ses, sandbox: true, contextIsolation: true, plugins: true, spellcheck: true, scrollBounce: false, autoplayPolicy: 'no-user-gesture-required' },
    })
    view.setBorderRadius(this.fullscreenTab ? 0 : 10)
    view.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#1e1f23' : '#ffffff')
    t.view = view; t.asleep = false
    const wc = view.webContents
    if (extensions && !this.incognito) { try { extensions.addTab(wc, this.win) } catch {} }
    const upd = () => this.pushStateSoon()
    wc.on('page-title-updated', (e, title) => { t.title = title; D.updateHistoryTitle(wc.getURL(), title); upd() })
    wc.on('page-favicon-updated', (e, icons) => { t.favicon = icons[icons.length - 1] || icons[0] || ''; upd() })
    wc.on('did-start-loading', () => { t.loading = true; t.crashed = false; upd() })
    wc.on('did-stop-loading', () => { t.loading = false; upd() })
    wc.on('will-navigate', e => {
      // web pages may not open Lumen's internal pages (same rule Chrome uses for chrome://)
      if (e.url.startsWith('lumen://') && !(wc.getURL() || '').startsWith('lumen://')) e.preventDefault()
    })
    wc.on('did-start-navigation', (e) => {
      if (e.isMainFrame && !e.isSameDocument) {
        blockedByWc.set(wc.id, 0)
        if (D.settings.get('httpsOnly') && /^http:\/\//.test(e.url) && !/^http:\/\/(localhost|127\.|\[::1\]|192\.168\.|10\.)/.test(e.url)) {
          e.preventDefault(); wc.loadURL(e.url.replace(/^http:/, 'https:'))
        }
      }
    })
    const nav = () => {
      t.url = wc.getURL(); t.canBack = wc.navigationHistory.canGoBack(); t.canForward = wc.navigationHistory.canGoForward()
      if (!this.incognito) D.addHistory(t.url, wc.getTitle())
      upd(); saveSession()
    }
    wc.on('did-navigate', nav)
    wc.on('did-navigate-in-page', (e, url, isMain) => { if (isMain) nav() })
    wc.on('did-fail-load', (e, code, desc, url, isMain) => {
      if (!isMain || code === -3 || code === -27) return
      t.loading = false
      wc.loadURL(`lumen://error/?code=${code}&desc=${encodeURIComponent(desc)}&url=${encodeURIComponent(url)}`)
    })
    wc.on('render-process-gone', (e, d) => { if (d.reason !== 'clean-exit') { t.crashed = true; t.loading = false; upd() } })
    wc.on('unresponsive', () => { t.hung = true; upd() })
    wc.on('responsive', () => { t.hung = false; upd() })
    wc.on('audio-state-changed', e => { t.audible = e.audible; upd() })
    wc.on('update-target-url', (e, url) => { if (this.activeId === t.id) this.send('hover-url', url) })
    wc.on('found-in-page', (e, r) => this.send('find-result', { active: r.activeMatchOrdinal, total: r.matches }))
    wc.on('zoom-changed', (e, dir) => { this.zoom(t.id, dir === 'in' ? 0.5 : -0.5) })
    wc.on('enter-html-full-screen', () => { this.fullscreenTab = true; if (!this.win.isFullScreen()) this.win.setFullScreen(true); this.layout() })
    wc.on('leave-html-full-screen', () => { this.fullscreenTab = false; this.layout() })
    wc.on('context-menu', (e, params) => this.contextMenu(t, params))
    wc.on('before-input-event', (e, input) => this.handleKeys(e, input))
    wc.on('did-create-window', () => {})
    wc.setWindowOpenHandler(d => {
      if (d.disposition === 'new-window' && d.features) {
        return { action: 'allow', overrideBrowserWindowOptions: { width: 520, height: 680, autoHideMenuBar: true, webPreferences: { session: this.ses } } }
      }
      if (d.url.startsWith('lumen://') && !wc.getURL().startsWith('lumen://')) return { action: 'deny' }
      const bg = d.disposition === 'background-tab'
      this.createTab(d.url, { active: !bg, openerId: t.id })
      return { action: 'deny' }
    })
    wc.on('will-prevent-unload', e => {
      const r = dialog.showMessageBoxSync({ type: 'question', buttons: ['Leave', 'Stay'], message: 'Leave this page?', detail: 'Changes you made may not be saved.', defaultId: 0, cancelId: 1 })
      if (r === 0) e.preventDefault()
    })
    wc.loadURL(t.url || 'lumen://newtab').catch(() => {})
    return view
  }

  destroyView(t) {
    if (!t.view) return
    try { this.win.contentView.removeChildView(t.view) } catch {}
    try { if (!t.view.webContents.isDestroyed()) t.view.webContents.close({ waitForBeforeUnload: false }) } catch {}
    t.view = null
  }

  sleep(t) {
    if (!t.view || t.id === this.activeId || t.id === this.splitId || t.audible) return
    const wc = t.view.webContents
    t.url = wc.getURL() || t.url; t.title = wc.getTitle() || t.title
    this.destroyView(t); t.asleep = true
    this.pushStateSoon()
  }

  activate(id) {
    const t = this.tabs.get(id)
    if (!t) return
    const prev = this.active()
    if (prev && prev.id !== id && prev.view && prev.audible && D.settings.get('autoPip') && id !== this.splitId) {
      prev.view.webContents.executeJavaScript(`(() => { const v = [...document.querySelectorAll('video')].find(v => !v.paused && v.readyState > 2 && !v.disablePictureInPicture); if (v && !document.pictureInPictureElement) return v.requestPictureInPicture().then(() => true, () => false); return false })()`, true).catch(() => {})
    }
    if (t.view && !t.asleep) t.view.webContents.executeJavaScript('document.pictureInPictureElement && document.exitPictureInPicture()', true).catch(() => {})
    if (this.splitId) {
      if (id === this.splitId) this.splitId = this.activeId
      else if (id !== this.activeId) this.splitId = null
    }
    this.activeId = id
    t.lastActive = Date.now()
    if (!t.view) this.makeView(t)
    this.layout()
    if (!this.overlay) t.view.webContents.focus()
    if (extensions && !this.incognito) { try { extensions.selectTab(t.view.webContents) } catch {} }
    this.send('hover-url', '')
    this.pushState()
    saveSession()
  }

  layout() {
    const shown = new Set()
    const a = this.active()
    if (!a || !a.view) return
    const [W, H] = this.win.getContentSize()
    if (this.fullscreenTab) {
      a.view.setBorderRadius(0); a.view.setBounds({ x: 0, y: 0, width: W, height: H }); shown.add(a)
    } else {
      const r = this.rect
      const split = this.splitId && this.tabs.get(this.splitId)
      if (split && split.id !== a.id) {
        if (!split.view) this.makeView(split)
        const gap = 8, half = Math.floor((r.width - gap) / 2)
        const left = this.order.indexOf(a.id) < this.order.indexOf(split.id) ? a : split
        const right = left === a ? split : a
        left.view.setBorderRadius(10); right.view.setBorderRadius(10)
        left.view.setBounds({ x: r.x, y: r.y, width: half, height: r.height })
        right.view.setBounds({ x: r.x + half + gap, y: r.y, width: r.width - half - gap, height: r.height })
        shown.add(left); shown.add(right)
      } else {
        a.view.setBorderRadius(10)
        a.view.setBounds({ x: r.x, y: r.y, width: Math.max(1, r.width), height: Math.max(1, r.height) })
        shown.add(a)
      }
    }
    // while the first-run intro plays, nothing renders behind it
    if (this.introOn) shown.clear()
    for (const t of this.tabs.values()) {
      if (!t.view) continue
      if (shown.has(t)) { if (!this.win.contentView.children.includes(t.view)) this.win.contentView.addChildView(t.view); t.view.setVisible(true) }
      else if (this.win.contentView.children.includes(t.view)) { t.view.setVisible(false); this.win.contentView.removeChildView(t.view) }
    }
    if (this.overlay) this.win.contentView.addChildView(this.ui) // keep UI on top while an overlay is open
  }

  setOverlay(on) {
    if (this.overlay === on) return
    this.overlay = on
    if (on) { this.win.contentView.addChildView(this.ui); this.ui.webContents.focus() }
    else {
      this.win.contentView.addChildView(this.ui, 0)
      this.layout()
      const a = this.active(); if (a && a.view) a.view.webContents.focus()
    }
  }

  closeTab(id) {
    const t = this.tabs.get(id)
    if (!t) return
    const url = t.view ? t.view.webContents.getURL() : t.url
    if (!this.incognito && url && url !== 'lumen://newtab/') closedTabs.push({ url, title: t.title, index: this.order.indexOf(id), pinned: t.pinned })
    if (closedTabs.length > 30) closedTabs.shift()
    const idx = this.order.indexOf(id)
    this.order.splice(idx, 1)
    this.tabs.delete(id)
    if (this.splitId === id) this.splitId = null
    if (this.activeId === id) {
      this.activeId = null
      const opener = t.opener && this.tabs.has(t.opener) ? t.opener : null
      const next = opener || this.order[Math.min(idx, this.order.length - 1)]
      if (this.splitId) { const s = this.splitId; this.splitId = null; this.activate(s) }
      else if (next) this.activate(next)
    }
    this.destroyView(t)
    if (!this.order.length) { this.win.close(); return }
    this.pushState(); saveSession()
  }

  moveTab(id, toIndex) {
    const i = this.order.indexOf(id)
    if (i < 0) return
    this.order.splice(i, 1)
    this.order.splice(Math.max(0, Math.min(toIndex, this.order.length)), 0, id)
    this.layout(); this.pushState(); saveSession()
  }

  zoom(id, delta) {
    const t = this.tabs.get(id); if (!t || !t.view) return
    const wc = t.view.webContents
    const z = delta === 0 ? 0 : Math.max(-6, Math.min(8, wc.getZoomLevel() + delta))
    wc.setZoomLevel(z); t.zoom = z
    this.pushState()
  }

  serialize() {
    const a = this.active()
    const awc = a && a.view && a.view.webContents
    return {
      tabs: this.order.map(id => {
        const t = this.tabs.get(id)
        return { id: t.id, title: t.title, url: t.url, favicon: t.favicon, pinned: t.pinned, loading: t.loading, audible: t.audible, muted: t.muted, asleep: t.asleep, crashed: t.crashed, hung: !!t.hung }
      }),
      activeId: this.activeId, splitId: this.splitId, incognito: this.incognito,
      canBack: !!(awc && awc.navigationHistory.canGoBack()), canForward: !!(awc && awc.navigationHistory.canGoForward()),
      url: a ? a.url : '', zoom: a ? Math.round(Math.pow(1.2, a.zoom || 0) * 100) : 100,
      bookmarked: a ? D.isBookmarked(a.url) : false,
      blocked: awc ? (blockedByWc.get(awc.id) || 0) : 0,
      secure: a ? /^(https|lumen):/.test(a.url) : true,
      closedCount: closedTabs.length,
    }
  }
  pushState() { clearTimeout(this._pst); this._pst = null; this.send('state', this.serialize()) }
  pushStateSoon() { if (!this._pst) this._pst = setTimeout(() => this.pushState(), 50) }

  contextMenu(t, p) {
    const wc = t.view.webContents
    const items = []
    const sep = () => { if (items.length && items[items.length - 1].type !== 'separator') items.push({ type: 'separator' }) }
    if (p.misspelledWord) {
      for (const s of p.dictionarySuggestions.slice(0, 5)) items.push({ label: s, click: () => wc.replaceMisspelling(s) })
      items.push({ label: 'Add to Dictionary', click: () => this.ses.addWordToSpellCheckerDictionary(p.misspelledWord) })
      sep()
    }
    if (p.linkURL) {
      items.push({ label: 'Open Link in New Tab', click: () => this.createTab(p.linkURL, { active: false, openerId: t.id }) })
      items.push({ label: 'Open Link in Split View', click: () => { const n = this.createTab(p.linkURL, { active: false, openerId: t.id }); this.splitId = n.id; this.activate(t.id) } })
      items.push({ label: 'Open Link in New Window', click: () => createWindow({ urls: [p.linkURL] }) })
      if (!this.incognito) items.push({ label: 'Open Link in Private Window', click: () => createWindow({ urls: [p.linkURL], incognito: true }) })
      items.push({ label: 'Copy Link', click: () => clipboard.writeText(p.linkURL) })
      sep()
    }
    if (p.mediaType === 'image' && p.srcURL) {
      items.push({ label: 'Open Image in New Tab', click: () => this.createTab(p.srcURL, { active: false, openerId: t.id }) })
      items.push({ label: 'Save Image As...', click: () => wc.downloadURL(p.srcURL) })
      items.push({ label: 'Copy Image', click: () => wc.copyImageAt(p.x, p.y) })
      items.push({ label: 'Copy Image Address', click: () => clipboard.writeText(p.srcURL) })
      sep()
    }
    if (p.mediaType === 'video') {
      items.push({ label: 'Picture in Picture', click: () => wc.executeJavaScript(`(()=>{const v=document.elementFromPoint(${p.x},${p.y});const el=v&&v.closest?v.closest('video'):null;(el||document.querySelector('video'))?.requestPictureInPicture()})()`, true).catch(() => {}) })
      sep()
    }
    if (p.selectionText && !p.isEditable) {
      const q = p.selectionText.trim().slice(0, 80)
      items.push({ label: 'Copy', role: 'copy' })
      items.push({ label: `Search ${(SEARCH[D.settings.get('searchEngine')] || SEARCH.google).name} for "${q.length > 30 ? q.slice(0, 30) + '...' : q}"`, click: () => this.createTab(toURL(q), { openerId: t.id }) })
      sep()
    }
    if (p.isEditable) {
      items.push({ label: 'Undo', role: 'undo', enabled: p.editFlags.canUndo }, { label: 'Redo', role: 'redo', enabled: p.editFlags.canRedo }, { type: 'separator' })
      items.push({ label: 'Cut', role: 'cut', enabled: p.editFlags.canCut }, { label: 'Copy', role: 'copy', enabled: p.editFlags.canCopy }, { label: 'Paste', role: 'paste', enabled: p.editFlags.canPaste }, { label: 'Paste and Match Style', role: 'pasteAndMatchStyle' }, { label: 'Select All', role: 'selectAll' })
      if (p.formControlType === 'input-password' || /pass/i.test(p.inputFieldType || '')) items.push({ type: 'separator' }, { label: 'Suggest Strong Password', click: () => wc.send('lumen:fill-generated', genPassword()) })
      sep()
    }
    if (!p.linkURL && !p.isEditable && !p.selectionText && p.mediaType === 'none') {
      items.push({ label: 'Back', enabled: wc.navigationHistory.canGoBack(), click: () => wc.navigationHistory.goBack() })
      items.push({ label: 'Forward', enabled: wc.navigationHistory.canGoForward(), click: () => wc.navigationHistory.goForward() })
      items.push({ label: 'Reload', click: () => wc.reload() })
      sep()
      items.push({ label: 'Reader Mode', click: () => readerMode(wc) })
      items.push({ label: 'Take Screenshot', click: () => screenshot(wc) })
      items.push({ label: 'Save Page As...', click: () => savePage(wc) })
      items.push({ label: 'Print...', click: () => wc.print() })
      sep()
      items.push({ label: 'View Page Source', click: () => this.createTab('view-source:' + wc.getURL(), { openerId: t.id }) })
    }
    if (extensions && !this.incognito) {
      try { const ext = extensions.getContextMenuItems(wc, p); if (ext.length) { sep(); items.push(...ext) } } catch {}
    }
    sep()
    items.push({ label: 'Inspect', click: () => { wc.inspectElement(p.x, p.y); if (wc.isDevToolsOpened()) wc.devToolsWebContents && wc.devToolsWebContents.focus() } })
    Menu.buildFromTemplate(items).popup({ window: this.win })
  }

  handleKeys(e, input) {
    if (input.type !== 'keyDown') return
    const mod = isMac ? input.meta : input.control
    // Ctrl+Tab cycling (menu accelerators can't capture these reliably)
    if (input.control && input.key === 'Tab') {
      e.preventDefault(); this.cycle(input.shift ? -1 : 1)
    } else if (mod && !input.shift && !input.alt && /^[1-9]$/.test(input.key)) {
      e.preventDefault()
      const n = parseInt(input.key)
      const id = n === 9 ? this.order[this.order.length - 1] : this.order[n - 1]
      if (id) this.activate(id)
    } else if (input.key === 'Escape' && this.fullscreenTab) {
      const a = this.active(); if (a && a.view) a.view.webContents.executeJavaScript('document.fullscreenElement && document.exitFullscreen()').catch(() => {})
    }
  }
  cycle(dir) {
    if (!this.order.length) return
    const i = this.order.indexOf(this.activeId)
    this.activate(this.order[(i + dir + this.order.length) % this.order.length])
  }
}

function createWindow({ urls = null, incognito = false, restore = null, bounds } = {}) {
  const w = new BrowserWin({ incognito, bounds })
  if (restore && restore.tabs && restore.tabs.length) {
    restore.tabs.forEach((t, i) => w.createTab(t.url, { active: false, pinned: t.pinned, title: t.title, favicon: t.favicon, asleep: i !== restore.active }))
    w.activate(w.order[Math.min(restore.active || 0, w.order.length - 1)])
  } else {
    const list = urls && urls.length ? urls : ['lumen://newtab']
    list.forEach((u, i) => w.createTab(u, { active: i === 0 }))
  }
  return w
}

// ---------------------------------------------------------------- session save / restore
let saveTimer
function saveSession() { clearTimeout(saveTimer); saveTimer = setTimeout(saveSessionNow, 1000) }
function saveSessionNow() {
  clearTimeout(saveTimer)
  const data = {
    windows: windows.filter(w => !w.incognito && !w.win.isDestroyed()).map(w => ({
      bounds: w.win.getBounds(),
      active: Math.max(0, w.order.indexOf(w.activeId)),
      tabs: w.order.map(id => { const t = w.tabs.get(id); return { url: (t.view && !t.view.webContents.isDestroyed() ? t.view.webContents.getURL() : t.url) || t.url, title: t.title, pinned: t.pinned, favicon: t.favicon } }),
    })),
  }
  if (data.windows.length || quitting) D.session.replace(data)
}

// ---------------------------------------------------------------- page tools
function readerMode(wc) {
  wc.executeJavaScript(fs.readFileSync(path.join(__dirname, 'reader.js'), 'utf8')).catch(() => {})
}
async function screenshot(wc) {
  try {
    const img = await wc.capturePage()
    const p = uniquePath(app.getPath('downloads'), `Screenshot ${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.png`)
    fs.writeFileSync(p, img.toPNG())
    clipboard.writeImage(img)
    const w = winForWc(wc.id); if (w) w.send('toast', 'Screenshot saved to Downloads and copied')
  } catch {}
}
async function savePage(wc) {
  const r = await dialog.showSaveDialog({ defaultPath: path.join(app.getPath('downloads'), (wc.getTitle() || 'page').replace(/[\\/:*?"<>|]/g, '') + '.html') })
  if (!r.canceled && r.filePath) wc.savePage(r.filePath, 'HTMLComplete').catch(() => {})
}
function genPassword(n = 18) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_!@#'
  const bytes = require('crypto').randomBytes(n)
  let s = ''; for (let i = 0; i < n; i++) s += chars[bytes[i] % chars.length]
  return s
}

// ---------------------------------------------------------------- suggestions
async function suggest(w, text) {
  const q = (text || '').trim()
  const out = { query: q, tabs: [], history: [], bookmarks: [], search: [] }
  if (!q) {
    out.history = D.topSites(6).map(s => ({ url: s.url, title: s.title }))
    return out
  }
  const s = q.toLowerCase()
  const match = (u, ti) => (u || '').toLowerCase().includes(s) || (ti || '').toLowerCase().includes(s)
  for (const ww of windows) for (const id of ww.order) {
    const t = ww.tabs.get(id)
    if (match(t.url, t.title) && !t.url.startsWith('lumen://newtab')) out.tabs.push({ id: t.id, win: windows.indexOf(ww), title: t.title, url: t.url, favicon: t.favicon })
  }
  out.tabs = out.tabs.slice(0, 3)
  out.bookmarks = D.liveBookmarks().filter(b => match(b.url, b.title)).slice(0, 3)
  const hist = D.listHistory(q, 40)
  hist.sort((a, b) => {
    const sa = (a.url.replace(/^https?:\/\/(www\.)?/, '').startsWith(s) ? 50 : 0) + a.visits
    const sb = (b.url.replace(/^https?:\/\/(www\.)?/, '').startsWith(s) ? 50 : 0) + b.visits
    return sb - sa
  })
  out.history = hist.slice(0, 5).map(h => ({ url: h.url, title: h.title }))
  const eng = SEARCH[D.settings.get('searchEngine')] || SEARCH.google
  if (D.settings.get('showSuggestions') && eng.suggest && !w.incognito) {
    try {
      const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 1500)
      const r = await net.fetch(eng.suggest.replace('%s', encodeURIComponent(q)), { signal: ctrl.signal })
      const j = await r.json()
      const list = Array.isArray(j) ? (Array.isArray(j[1]) ? j[1] : j.map(x => x.phrase || x)) : []
      out.search = list.filter(x => typeof x === 'string').slice(0, 5)
    } catch {}
  }
  return out
}

// ---------------------------------------------------------------- IPC: browser UI
function uiWin(e) { return windows.find(w => w.ui.webContents === e.sender) }
ipcMain.handle('ui', async (e, action, ...a) => {
  const w = uiWin(e)
  if (!w) return
  const t = w.active()
  const wc = t && t.view && t.view.webContents
  try {
    switch (action) {
      case 'ready': return { settings: publicSettings(), engines: Object.fromEntries(Object.entries(SEARCH).map(([k, v]) => [k, v.name])), version: app.getVersion(), platform: process.platform, update: Updater.getState(), downloads: listDownloads() }
      case 'newTab': return w.createTab(a[0] ? toURL(a[0]) : 'lumen://newtab').id
      case 'navigate': {
        const url = toURL(a[0]); if (!url) return
        if (a[1] || !t) w.createTab(url)
        else { if (!t.view) w.makeView(t); t.url = url; t.view.webContents.loadURL(url).catch(() => {}); t.view.webContents.focus() }
        return
      }
      case 'switchTab': { const ww = windows[a[1]] || w; ww.activate(a[0]); ww.win.focus(); return }
      case 'activate': return w.activate(a[0])
      case 'close': return w.closeTab(a[0])
      case 'move': return w.moveTab(a[0], a[1])
      case 'back': return wc && wc.navigationHistory.goBack()
      case 'forward': return wc && wc.navigationHistory.goForward()
      case 'reload': if (t && (t.crashed || !t.view)) { w.destroyView(t); w.makeView(t); w.layout(); return } return wc && (a[0] ? wc.reloadIgnoringCache() : wc.reload())
      case 'stop': return wc && wc.stop()
      case 'layout': w.rect = a[0]; return w.layout()
      case 'overlay': return w.setOverlay(!!a[0])
      case 'suggest': return suggest(w, a[0])
      case 'find': if (wc && a[0]) wc.findInPage(a[0], { forward: a[1] !== false, findNext: !!a[2] }); return
      case 'stopFind': if (wc) wc.stopFindInPage('clearSelection'); return
      case 'prompt': { const fn = pendingPrompts.get(a[0]); pendingPrompts.delete(a[0]); if (fn) fn(a[1]); return }
      case 'bookmark': { if (!t) return; if (D.isBookmarked(t.url)) D.removeBookmark(t.url); else D.addBookmark(t.url, t.title); w.pushState(); return }
      case 'pin': { const x = w.tabs.get(a[0]); if (x) { x.pinned = !x.pinned; const others = w.order.filter(i => i !== x.id); const pinnedCount = others.filter(i => w.tabs.get(i).pinned).length; w.moveTab(x.id, x.pinned ? pinnedCount : pinnedCount) } return }
      case 'mute': { const x = w.tabs.get(a[0]); if (x && x.view) { x.muted = !x.muted; x.view.webContents.setAudioMuted(x.muted); w.pushState() } return }
      case 'split': { if (a[0] && a[0] !== w.activeId) { w.splitId = a[0]; w.layout(); w.pushState() } return }
      case 'unsplit': w.splitId = null; w.layout(); w.pushState(); return
      case 'tabMenu': return tabMenu(w, a[0])
      case 'appMenu': return Menu.getApplicationMenu() && appMenuPopup(w)
      case 'print': return wc && wc.print()
      case 'fullscreen': return w.win.setFullScreen(!w.win.isFullScreen())
      case 'savePage': return wc && savePage(wc)
      case 'menuInfo': return { version: app.getVersion(), update: Updater.getState(), zoom: t ? Math.round(Math.pow(1.2, t.zoom || 0) * 100) : 100, incognito: w.incognito, tabLayout: D.settings.get('tabLayout'), fullscreen: w.win.isFullScreen(), passkeys: Passkeys.list().length, passwords: D.listPasswords().length }
      case 'zoom': return t && w.zoom(t.id, a[0])
      case 'openPage': return w.createTab('lumen://' + a[0])
      case 'reader': return wc && readerMode(wc)
      case 'pip': return wc && wc.executeJavaScript(`(()=>{const v=[...document.querySelectorAll('video')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];if(!v)return false;document.pictureInPictureElement?document.exitPictureInPicture():v.requestPictureInPicture();return true})()`, true).catch(() => false)
      case 'screenshot': return wc && screenshot(wc)
      case 'reopen': return reopenClosed(w)
      case 'newWindow': return void createWindow({ incognito: !!a[0] })
      case 'download': return downloadAction(a[0], a[1])
      case 'setSetting': return setSetting(a[0], a[1])
      case 'siteInfo': return siteInfo(w)
      case 'resetSite': { if (!t) return; try { const o = new URL(t.url).origin; const all = D.permissions.get(); delete all[o]; D.permissions.set(all) } catch {} return }
      case 'update': if (a[0] === 'check') return Updater.check(true); if (a[0] === 'install') return Updater.install(true); return Updater.getState()
      case 'trafficLights': if (isMac) { w.win.setWindowButtonVisibility(!!a[0]); if (a[1] && w.win.setWindowButtonPosition) { try { w.win.setWindowButtonPosition(a[1]) } catch {} } } return
      case 'focusUI': w.ui.webContents.focus(); return
      case 'intro': w.introOn = !!a[0]; w.layout(); return
      case 'focusTab': if (wc && !w.overlay) wc.focus(); return
      case 'devtools': return wc && wc.toggleDevTools()
      case 'windowControl': {
        if (a[0] === 'min') w.win.minimize(); else if (a[0] === 'max') w.win.isMaximized() ? w.win.unmaximize() : w.win.maximize(); else if (a[0] === 'close') w.win.close()
        return
      }
    }
  } catch (err) { console.error('ui action failed', action, err) }
})

function siteInfo(w) {
  const t = w.active(); if (!t) return null
  let origin = ''; try { origin = new URL(t.url).origin } catch {}
  return { url: t.url, host: origin ? new URL(origin).host : '', secure: /^https:/.test(t.url), permissions: D.permissions.get()[origin] || {}, blocked: t.view ? (blockedByWc.get(t.view.webContents.id) || 0) : 0 }
}

function reopenClosed(w) {
  const c = closedTabs.pop()
  if (c) w.createTab(c.url, { index: Math.min(c.index, w.order.length), pinned: c.pinned })
}

function tabMenu(w, id) {
  const t = w.tabs.get(id); if (!t) return
  const others = w.order.filter(i => i !== id)
  Menu.buildFromTemplate([
    { label: 'New Tab Below', click: () => w.createTab('lumen://newtab', { index: w.order.indexOf(id) + 1 }) },
    { label: 'Duplicate', click: () => w.createTab(t.view ? t.view.webContents.getURL() : t.url, { index: w.order.indexOf(id) + 1 }) },
    { label: t.pinned ? 'Unpin' : 'Pin', click: () => { t.pinned = !t.pinned; const pc = w.order.filter(i => i !== id && w.tabs.get(i).pinned).length; w.moveTab(id, pc) } },
    { label: t.muted ? 'Unmute' : 'Mute', enabled: !!t.view, click: () => { t.muted = !t.muted; t.view.webContents.setAudioMuted(t.muted); w.pushState() } },
    { label: id === w.splitId || id === w.activeId && w.splitId ? 'Exit Split View' : 'Open in Split View', enabled: w.order.length > 1, click: () => {
      if (w.splitId) { w.splitId = null; w.layout(); w.pushState(); return }
      if (id === w.activeId) { const other = others[others.length - 1]; if (other) { w.splitId = other; w.layout(); w.pushState() } }
      else { w.splitId = id; w.layout(); w.pushState() }
    } },
    { type: 'separator' },
    { label: 'Copy Link', click: () => clipboard.writeText(t.view ? t.view.webContents.getURL() : t.url) },
    { label: 'Bookmark', click: () => { D.addBookmark(t.url, t.title); w.pushState() } },
    { label: 'Move to New Window', enabled: w.order.length > 1, click: () => { const url = t.view ? t.view.webContents.getURL() : t.url; w.closeTab(id); createWindow({ urls: [url] }) } },
    { label: 'Put to Sleep', enabled: !!t.view && id !== w.activeId, click: () => w.sleep(t) },
    { type: 'separator' },
    { label: 'Close Tab', click: () => w.closeTab(id) },
    { label: 'Close Other Tabs', enabled: others.length > 0, click: () => others.filter(i => !w.tabs.get(i).pinned).forEach(i => w.closeTab(i)) },
    { label: 'Close Tabs Below', click: () => w.order.slice(w.order.indexOf(id) + 1).filter(i => !w.tabs.get(i).pinned).forEach(i => w.closeTab(i)) },
  ]).popup({ window: w.win })
}
function appMenuPopup(w) {
  Menu.buildFromTemplate([
    { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => w.send('command', 'newtab') },
    { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: () => createWindow({}) },
    { label: 'New Private Window', accelerator: 'CmdOrCtrl+Shift+N', click: () => createWindow({ incognito: true }) },
    { type: 'separator' },
    { label: 'History', accelerator: 'CmdOrCtrl+Y', click: () => w.createTab('lumen://history') },
    { label: 'Downloads', accelerator: 'CmdOrCtrl+Shift+J', click: () => w.createTab('lumen://downloads') },
    { label: 'Bookmarks', accelerator: 'CmdOrCtrl+Alt+B', click: () => w.createTab('lumen://bookmarks') },
    { label: 'Passwords', click: () => w.createTab('lumen://passwords') },
    { label: 'Extensions', click: () => w.createTab('lumen://extensions') },
    { type: 'separator' },
    { label: 'Find in Page', accelerator: 'CmdOrCtrl+F', click: () => w.send('command', 'find') },
    { label: 'Reader Mode', click: () => { const t = w.active(); if (t && t.view) readerMode(t.view.webContents) } },
    { label: 'Picture in Picture', click: () => w.send('command', 'pip') },
    { label: 'Take Screenshot', click: () => { const t = w.active(); if (t && t.view) screenshot(t.view.webContents) } },
    { label: 'Print...', accelerator: 'CmdOrCtrl+P', click: () => { const t = w.active(); if (t && t.view) t.view.webContents.print() } },
    { type: 'separator' },
    { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => openSettings(w) },
  ]).popup({ window: w.win })
}
function openSettings(w, sub = '') {
  const url = 'lumen://settings/' + sub
  const ex = w.order.map(i => w.tabs.get(i)).find(t => (t.url || '').startsWith('lumen://settings'))
  if (ex) { w.activate(ex.id); if (sub && ex.view) ex.view.webContents.loadURL(url) } else w.createTab(url)
}
function downloadAction(id, what) {
  if (what === 'clear') { for (let i = downloads.length - 1; i >= 0; i--) if (downloads[i].state !== 'progressing') downloads.splice(i, 1); broadcast('downloads', listDownloads()); return }
  const d = downloads.find(x => x.id === id); if (!d) return
  if (what === 'open') shell.openPath(d.path)
  else if (what === 'show') shell.showItemInFolder(d.path)
  else if (what === 'cancel' && d._item) d._item.cancel()
  else if (what === 'pause' && d._item) d._item.isPaused() ? d._item.resume() : d._item.pause()
  else if (what === 'retry') { const w = lastFocused(); if (w) w.ses.downloadURL(d.url); downloads.splice(downloads.indexOf(d), 1) }
  else if (what === 'remove') downloads.splice(downloads.indexOf(d), 1)
  else if (what === 'clear') { for (let i = downloads.length - 1; i >= 0; i--) if (downloads[i].state !== 'progressing') downloads.splice(i, 1) }
  broadcast('downloads', listDownloads())
}

const PUBLIC_SETTINGS = ['autoPip', 'ntpShortcuts', 'ntpWallpaper', 'ntpClock', 'searchEngine', 'motion', 'theme', 'accent', 'adblock', 'blockTrackers', 'httpsOnly', 'sleepTabsAfterMin', 'restoreSession', 'sidebarCollapsed', 'sidebarWidth', 'tabLayout', 'introSeen', 'autoUpdate', 'askWhereToSave', 'doNotTrack', 'showSuggestions', 'homeTiles']
function publicSettings() { const s = D.settings.get(); return Object.fromEntries(PUBLIC_SETTINGS.map(k => [k, s[k]])) }
function setSetting(k, v) {
  if (!PUBLIC_SETTINGS.includes(k)) return
  if (k === 'tabLayout' && !['side', 'top'].includes(v)) return
  D.settings.set({ [k]: v, ...(!['sidebarCollapsed', 'sidebarWidth', 'introSeen'].includes(k) ? { settingsAt: Date.now() } : {}) })
  if (k === 'adblock') setAdblock(!!v)
  if (k === 'theme') nativeTheme.themeSource = v
  if (k === 'autoUpdate') Updater.setEnabled(!!v)
  if (k === 'tabLayout') buildMenu()
  broadcast('settings', publicSettings())
  for (const w of windows) for (const t of w.tabs.values()) if (t.view && (t.url || '').startsWith('lumen://')) t.view.webContents.send('lumen:settings', publicSettings())
}

// ---------------------------------------------------------------- IPC: web pages (password manager)
function frameOrigin(e) { try { return new URL(e.senderFrame.url).origin } catch { return null } }
ipcMain.handle('pw:get', e => {
  const origin = frameOrigin(e)
  if (!origin || !/^https?:/.test(origin)) return []
  const w = winForWc(e.sender.id)
  if (w && w.incognito) return D.credentialsFor(origin) // read is fine in private mode
  return D.credentialsFor(origin)
})
const neverSave = new Set()
ipcMain.on('pw:submit', (e, { username, password }) => {
  const origin = frameOrigin(e)
  if (!origin || !/^https?:/.test(origin) || !password || neverSave.has(origin)) return
  if (D.hasPassword(origin, username || '', password)) return
  const w = winForWc(e.sender.id)
  if (!w || w.incognito) return
  const updating = D.credentialsFor(origin).some(c => c.username === (username || ''))
  const id = ++promptSeq
  pendingPrompts.set(id, ans => {
    if (ans.allow) { D.savePassword(origin, username || '', password); Sync.syncNow().catch(() => {}) }
    else if (ans.never) neverSave.add(origin)
  })
  const tab = w.tabByWc(e.sender.id)
  w.send('prompt', { id, kind: 'password', tabId: tab && tab.id, host: new URL(origin).host, text: (updating ? 'Update password for ' : 'Save password for ') + (username || 'this site') + '?' })
})
ipcMain.handle('pw:generate', () => genPassword())
ipcMain.on('lumen:auth-ua', e => { e.returnValue = isGoogleSignIn(e.senderFrame && e.senderFrame.url) ? firefoxUA() : '' })

// ---------------------------------------------------------------- passkeys
function passkeyFrame(e) {
  const f = e.senderFrame
  if (!f) return null
  let origin; try { origin = new URL(f.url).origin } catch { return null }
  // only the top page, or a same-origin frame, may use passkeys
  try { if (f.top && f.top !== f && new URL(f.top.url).origin !== origin) return null } catch { return null }
  return origin
}
async function verifyUser(reason) {
  if (isMac && systemPreferences.canPromptTouchID && systemPreferences.canPromptTouchID()) {
    try { await systemPreferences.promptTouchID(reason); return true } catch { return false }
  }
  return true
}
function passkeyAsk(e) {
  const w = winForWc(e.sender.id) || lastFocused()
  const parent = w ? w.win : undefined
  return {
    async create({ rp, user }) {
      if (w && w.incognito) {
        const r = await dialog.showMessageBox(parent, { type: 'question', buttons: ['Save passkey', 'Cancel'], defaultId: 0, cancelId: 1, message: `Save a passkey for ${rp}?`, detail: 'You are in a private window. The passkey is still saved in Lumen.' })
        if (r.response !== 0) return false
      } else if (!(isMac && systemPreferences.canPromptTouchID && systemPreferences.canPromptTouchID())) {
        const r = await dialog.showMessageBox(parent, { type: 'question', buttons: ['Save passkey', 'Cancel'], defaultId: 0, cancelId: 1, message: `Save a passkey for ${rp}?`, detail: `Account: ${user || 'this account'}. Lumen keeps it with your passwords and syncs it if Sync is on.` })
        return r.response === 0
      }
      return verifyUser(`save a passkey for ${user || 'your account'} on ${rp}`)
    },
    async choose({ rp, accounts }) {
      let i = 0
      if (accounts.length > 1) {
        const r = await dialog.showMessageBox(parent, { type: 'question', buttons: [...accounts.slice(0, 6), 'Cancel'], cancelId: Math.min(accounts.length, 6), message: `Sign in to ${rp} with a passkey`, detail: 'Choose an account.' })
        if (r.response >= Math.min(accounts.length, 6)) return -1
        i = r.response
      } else if (!(isMac && systemPreferences.canPromptTouchID && systemPreferences.canPromptTouchID())) {
        const r = await dialog.showMessageBox(parent, { type: 'question', buttons: ['Sign in', 'Cancel'], defaultId: 0, cancelId: 1, message: `Sign in to ${rp} as ${accounts[0]}?`, detail: 'Using a passkey saved in Lumen.' })
        return r.response === 0 ? 0 : -1
      }
      return (await verifyUser(`sign in to ${rp} as ${accounts[i]}`)) ? i : -1
    },
    async none(rp) { if (w) w.send('toast', `No Lumen passkey for ${rp}`) },
  }
}
ipcMain.handle('pk:create', async (e, req) => {
  const origin = passkeyFrame(e); if (!origin) return { error: 'NotAllowedError', message: 'Not allowed in this frame.' }
  try { const r = await Passkeys.create(origin, req || {}, passkeyAsk(e)); if (!r.error) { const w = winForWc(e.sender.id); if (w) w.send('toast', 'Passkey saved in Lumen'); Sync.syncNow().catch(() => {}) } return r }
  catch (err) { log('passkey create failed', err.message); return { error: 'UnknownError', message: 'Lumen could not create the passkey.' } }
})
ipcMain.handle('pk:get', async (e, req) => {
  const origin = passkeyFrame(e); if (!origin) return { error: 'NotAllowedError', message: 'Not allowed in this frame.' }
  try { return await Passkeys.get(origin, req || {}, passkeyAsk(e)) }
  catch (err) { log('passkey sign-in failed', err.message); return { error: 'UnknownError', message: 'Lumen could not use the passkey.' } }
})

// ---------------------------------------------------------------- IPC: lumen:// pages
function internal(e) { try { const f = e.senderFrame; return !!f && f.url.startsWith('lumen://') && (!f.top || f.top.url.startsWith('lumen://')) } catch { return false } }
ipcMain.handle('lumen', async (e, action, ...a) => {
  if (!internal(e)) return null
  const w = winForWc(e.sender.id) || lastFocused()
  try {
    switch (action) {
      case 'settings': return { settings: publicSettings(), engines: Object.fromEntries(Object.entries(SEARCH).map(([k, v]) => [k, v.name])), version: app.getVersion(), platform: process.platform }
      case 'setSetting': return setSetting(a[0], a[1])
      case 'topSites': return D.topSites(8)
      case 'wallpaper': {
        if (a[0] === undefined) return wallpaperStore.get('image') || ''
        const img = String(a[0] || '')
        if (img && !/^data:image\/(jpeg|png|webp);base64,/.test(img)) return false
        if (img.length > 4 * 1024 * 1024) return false
        wallpaperStore.set('image', img); return true
      }
      case 'navigate': { const url = toURL(a[0]); if (url) e.sender.loadURL(url); return }
      case 'open': { const url = toURL(a[0]); if (url && w) w.createTab(url, { active: !a[1] }); return }
      case 'history': return D.listHistory(a[0] || '', 500)
      case 'deleteHistory': return D.deleteHistory(a[0])
      case 'clearHistory': {
        D.clearHistory(a[0] || 0)
        if (a[1]) await mainSession.clearStorageData()
        if (a[2]) await mainSession.clearCache()
        return true
      }
      case 'bookmarks': return D.liveBookmarks()
      case 'removeBookmark': D.removeBookmark(a[0]); for (const ww of windows) ww.pushState(); return
      case 'editBookmark': return D.editBookmark(a[0], a[1])
      case 'addBookmark': return D.addBookmark(a[0], a[1])
      case 'passwords': return D.listPasswords()
      case 'passkeys': return Passkeys.list()
      case 'deletePasskey': return Passkeys.remove(a[0])
      case 'revealPassword': {
        if (isMac && systemPreferences.canPromptTouchID && systemPreferences.canPromptTouchID()) {
          try { await systemPreferences.promptTouchID('show a saved password') } catch { return null }
        }
        return D.revealPassword(a[0])
      }
      case 'copyPassword': { const p = D.revealPassword(a[0]); clipboard.writeText(p); setTimeout(() => { if (clipboard.readText() === p) clipboard.clear() }, 60000); return true }
      case 'deletePassword': return D.deletePassword(a[0])
      case 'updatePassword': return D.updatePassword(a[0], a[1], a[2])
      case 'addPassword': { let o; try { o = new URL(toURL(a[0])).origin } catch { return false } D.savePassword(o, a[1] || '', a[2] || ''); return true }
      case 'importPasswords': {
        const r = await dialog.showOpenDialog({ title: 'Choose the passwords CSV you exported from Chrome', filters: [{ name: 'CSV', extensions: ['csv'] }], properties: ['openFile'] })
        if (r.canceled || !r.filePaths[0]) return { ok: false }
        return Importer.importPasswordsCSV(r.filePaths[0])
      }
      case 'exportPasswords': {
        const r = await dialog.showSaveDialog({ defaultPath: path.join(app.getPath('documents'), 'Lumen Passwords.csv') })
        if (r.canceled || !r.filePath) return { ok: false }
        return Importer.exportPasswordsCSV(r.filePath)
      }
      case 'genPassword': return genPassword()
      case 'importables': return Importer.available()
      case 'importFrom': {
        const res = { bookmarks: 0, extensions: 0 }
        const b = Importer.importBookmarks(a[0]); if (b.ok) res.bookmarks = b.count
        if (a[1] && extensions) {
          const { installExtension } = require('electron-chrome-web-store')
          for (const id of Importer.extensionIds(a[0])) { try { await installExtension(id, { session: mainSession }); res.extensions++ } catch {} }
        }
        return res
      }
      case 'downloads': return listDownloads()
      case 'download': return downloadAction(a[0], a[1])
      case 'extensions': {
        const ses = mainSession.extensions || mainSession
        return ses.getAllExtensions().filter(x => x.manifest && !x.manifest.theme).map(x => ({ id: x.id, name: x.name, version: x.version, description: x.manifest.description || '', icon: iconFor(x) }))
      }
      case 'removeExtension': {
        const { uninstallExtension } = require('electron-chrome-web-store')
        try { await uninstallExtension(a[0], { session: mainSession }) } catch { (mainSession.extensions || mainSession).removeExtension(a[0]) }
        return true
      }
      case 'loadUnpacked': {
        const r = await dialog.showOpenDialog({ title: 'Choose an unpacked extension folder', properties: ['openDirectory'] })
        if (r.canceled || !r.filePaths[0]) return false
        await (mainSession.extensions || mainSession).loadExtension(r.filePaths[0], { allowFileAccess: true }); return true
      }
      case 'permissions': return D.permissions.get()
      case 'setPermission': { const all = D.permissions.get(); all[a[0]] = { ...(all[a[0]] || {}) }; if (a[2] == null) delete all[a[0]][a[1]]; else all[a[0]][a[1]] = a[2]; if (!Object.keys(all[a[0]]).length) delete all[a[0]]; D.permissions.set(all); return }
      case 'sync': {
        if (a[0] === 'status') return Sync.status()
        if (a[0] === 'enable') return Sync.enable(a[1], a[2])
        if (a[0] === 'disable') return Sync.disable()
        if (a[0] === 'now') return Sync.syncNow()
        if (a[0] === 'pickFolder') { const r = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] }); return r.canceled ? null : r.filePaths[0] }
        return null
      }
      case 'update': if (a[0] === 'check') return Updater.check(true); if (a[0] === 'install') return Updater.install(true); return Updater.getState()
      case 'defaultBrowser': {
        if (a[0] === 'set') { app.setAsDefaultProtocolClient('http'); app.setAsDefaultProtocolClient('https') }
        return app.isDefaultProtocolClient('https')
      }
      case 'retry': { const u = a[0]; if (u) e.sender.loadURL(u); return }
    }
  } catch (err) { console.error('lumen action failed', action, err); return { ok: false, error: String(err.message || err) } }
})
function iconFor(ext) {
  try {
    const icons = ext.manifest.icons || {}
    const k = Object.keys(icons).sort((a, b) => b - a)[0]
    if (!k) return ''
    return nativeImage.createFromPath(path.join(ext.path, icons[k])).resize({ width: 48 }).toDataURL()
  } catch { return '' }
}

// ---------------------------------------------------------------- app menu (shortcuts)
function focused(fn) { return () => { const w = lastFocused(); if (w) fn(w, w.active()) } }
const activeWc = (w, t) => t && t.view && t.view.webContents
function buildMenu() {
  const tpl = [
    ...(isMac ? [{ label: 'Lumen', submenu: [
      { label: 'About Lumen', click: focused(w => w.createTab('lumen://settings/about')) },
      { label: 'Check for Updates...', click: () => { Updater.check(true) } },
      { type: 'separator' },
      { label: 'Settings...', accelerator: 'Cmd+,', click: focused(w => openSettings(w)) },
      { label: 'Set as Default Browser', click: () => { app.setAsDefaultProtocolClient('http'); app.setAsDefaultProtocolClient('https') } },
      { type: 'separator' }, { role: 'services' }, { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' },
    ] }] : []),
    { label: 'File', submenu: [
      { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: focused(w => w.send('command', 'newtab')) },
      { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: () => createWindow({}) },
      { label: 'New Private Window', accelerator: 'CmdOrCtrl+Shift+N', click: () => createWindow({ incognito: true }) },
      { label: 'Reopen Closed Tab', accelerator: 'CmdOrCtrl+Shift+T', click: focused(w => reopenClosed(w)) },
      { label: 'Open Location...', accelerator: 'CmdOrCtrl+L', click: focused(w => w.send('command', 'location')) },
      { type: 'separator' },
      { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: focused((w, t) => t ? w.closeTab(t.id) : w.win.close()) },
      { label: 'Close Window', accelerator: 'CmdOrCtrl+Shift+W', click: focused(w => w.win.close()) },
      { type: 'separator' },
      { label: 'Save Page As...', accelerator: 'CmdOrCtrl+S', click: focused((w, t) => activeWc(w, t) && savePage(activeWc(w, t))) },
      { label: 'Print...', accelerator: 'CmdOrCtrl+P', click: focused((w, t) => activeWc(w, t) && activeWc(w, t).print()) },
      ...(isMac ? [] : [{ type: 'separator' }, { label: 'Settings', accelerator: 'Ctrl+,', click: focused(w => openSettings(w)) }, { role: 'quit' }]),
    ] },
    { label: 'Edit', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'pasteAndMatchStyle' }, { role: 'selectAll' },
      { type: 'separator' },
      { label: 'Find...', accelerator: 'CmdOrCtrl+F', click: focused(w => w.send('command', 'find')) },
      { label: 'Find Next', accelerator: 'CmdOrCtrl+G', click: focused(w => w.send('command', 'findNext')) },
      { label: 'Find Previous', accelerator: 'CmdOrCtrl+Shift+G', click: focused(w => w.send('command', 'findPrev')) },
      { type: 'separator' },
      { label: 'Command Bar', accelerator: 'CmdOrCtrl+K', click: focused(w => w.send('command', 'palette')) },
      { label: 'Copy URL', accelerator: 'CmdOrCtrl+Shift+C', click: focused((w, t) => { if (t) { clipboard.writeText(t.url); w.send('toast', 'Link copied') } }) },
    ] },
    { label: 'View', submenu: [
      { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: focused((w, t) => activeWc(w, t) && activeWc(w, t).reload()) },
      { label: 'Hard Reload', accelerator: 'CmdOrCtrl+Shift+R', click: focused((w, t) => activeWc(w, t) && activeWc(w, t).reloadIgnoringCache()) },
      { type: 'separator' },
      { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+Shift+S', click: focused(w => w.send('command', 'sidebar')) },
      { label: 'Tabs on Top', type: 'checkbox', checked: D.settings.get('tabLayout') === 'top', accelerator: 'CmdOrCtrl+Alt+S', click: item => setSetting('tabLayout', item.checked ? 'top' : 'side') },
      { label: 'Split View', accelerator: 'CmdOrCtrl+Shift+\\', click: focused(w => w.send('command', 'split')) },
      { label: 'Reader Mode', accelerator: 'CmdOrCtrl+Shift+E', click: focused((w, t) => activeWc(w, t) && readerMode(activeWc(w, t))) },
      { label: 'Picture in Picture', accelerator: 'CmdOrCtrl+Shift+P', click: focused(w => w.send('command', 'pip')) },
      { label: 'Take Screenshot', accelerator: 'CmdOrCtrl+Shift+2', click: focused((w, t) => activeWc(w, t) && screenshot(activeWc(w, t))) },
      { type: 'separator' },
      { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: focused((w, t) => t && w.zoom(t.id, 0)) },
      { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: focused((w, t) => t && w.zoom(t.id, 0.5)) },
      { label: 'Zoom In ', accelerator: 'CmdOrCtrl+=', visible: false, click: focused((w, t) => t && w.zoom(t.id, 0.5)) },
      { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: focused((w, t) => t && w.zoom(t.id, -0.5)) },
      { type: 'separator' },
      { label: 'Developer Tools', accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I', click: focused((w, t) => activeWc(w, t) && activeWc(w, t).toggleDevTools()) },
      { label: 'View Source', accelerator: isMac ? 'Alt+Cmd+U' : 'Ctrl+U', click: focused((w, t) => t && w.createTab('view-source:' + t.url)) },
      { type: 'separator' }, { role: 'togglefullscreen' },
    ] },
    { label: 'History', submenu: [
      { label: 'Back', accelerator: 'CmdOrCtrl+[', click: focused((w, t) => activeWc(w, t) && activeWc(w, t).navigationHistory.goBack()) },
      { label: 'Forward', accelerator: 'CmdOrCtrl+]', click: focused((w, t) => activeWc(w, t) && activeWc(w, t).navigationHistory.goForward()) },
      { label: 'Back ', accelerator: 'CmdOrCtrl+Left', visible: false, click: focused((w, t) => activeWc(w, t) && activeWc(w, t).navigationHistory.goBack()) },
      { label: 'Forward ', accelerator: 'CmdOrCtrl+Right', visible: false, click: focused((w, t) => activeWc(w, t) && activeWc(w, t).navigationHistory.goForward()) },
      { type: 'separator' },
      { label: 'Show All History', accelerator: 'CmdOrCtrl+Y', click: focused(w => w.createTab('lumen://history')) },
      { label: 'Downloads', accelerator: 'CmdOrCtrl+Shift+J', click: focused(w => w.createTab('lumen://downloads')) },
    ] },
    { label: 'Bookmarks', submenu: [
      { label: 'Bookmark This Page', accelerator: 'CmdOrCtrl+D', click: focused((w, t) => { if (t) { if (D.isBookmarked(t.url)) D.removeBookmark(t.url); else D.addBookmark(t.url, t.title); w.pushState(); w.send('toast', D.isBookmarked(t.url) ? 'Bookmarked' : 'Bookmark removed') } }) },
      { label: 'Show All Bookmarks', accelerator: 'CmdOrCtrl+Alt+B', click: focused(w => w.createTab('lumen://bookmarks')) },
      { label: 'Passwords', click: focused(w => w.createTab('lumen://passwords')) },
      { label: 'Extensions', click: focused(w => w.createTab('lumen://extensions')) },
      { label: 'Chrome Web Store', click: focused(w => w.createTab('https://chromewebstore.google.com/')) },
    ] },
    { label: 'Tab', submenu: [
      { label: 'Next Tab', accelerator: isMac ? 'Alt+Cmd+Right' : 'Ctrl+PageDown', click: focused(w => w.cycle(1)) },
      { label: 'Previous Tab', accelerator: isMac ? 'Alt+Cmd+Left' : 'Ctrl+PageUp', click: focused(w => w.cycle(-1)) },
      { label: 'Pin Tab', click: focused((w, t) => { if (t) { t.pinned = !t.pinned; w.moveTab(t.id, w.order.filter(i => i !== t.id && w.tabs.get(i).pinned).length) } }) },
      { label: 'Mute Tab', accelerator: 'CmdOrCtrl+Shift+M', click: focused((w, t) => { if (t && t.view) { t.muted = !t.muted; t.view.webContents.setAudioMuted(t.muted); w.pushState() } }) },
      { label: 'Duplicate Tab', click: focused((w, t) => t && w.createTab(t.url, { index: w.order.indexOf(t.id) + 1 })) },
    ] },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl))
}

// ---------------------------------------------------------------- tab sleeping
setInterval(() => {
  const mins = D.settings.get('sleepTabsAfterMin')
  if (!mins) return
  const cutoff = Date.now() - mins * 60000
  for (const w of windows) for (const t of w.tabs.values()) if (t.view && t.lastActive < cutoff) w.sleep(t)
}, 60000)

// ---------------------------------------------------------------- open URLs from the OS
const pendingOpen = []
function openExternalURL(url) {
  if (!app.isReady() || !mainSession) { pendingOpen.push(url); return }
  const w = windows.find(x => !x.incognito) || createWindow({ urls: [] })
  w.createTab(url); w.win.show(); w.win.focus()
}
app.on('open-url', (e, url) => { e.preventDefault(); openExternalURL(url) })
app.on('open-file', (e, file) => { e.preventDefault(); openExternalURL('file://' + file) })
app.on('second-instance', (e, argv) => {
  const urls = argv.filter(a => /^(https?|file):/.test(a))
  if (urls.length) urls.forEach(openExternalURL)
  else { const w = lastFocused(); if (w) { if (w.win.isMinimized()) w.win.restore(); w.win.focus() } else createWindow({}) }
})

// ---------------------------------------------------------------- lifecycle
let quitting = false
function flushAll() {
  saveSessionNow()
  for (const s of [D.settings, D.bookmarks, D.passwords, D.permissions, D.session, Passkeys.store]) s.flush()
  D.historyStore.replace([...D.historyMap.values()].sort((a, b) => b.t - a.t)); D.historyStore.flush()
}
app.on('before-quit', () => {
  quitting = true
  flushAll()
  // a downloaded update is applied when you quit, so the next launch is already new
  if (Updater.isReady()) Updater.install(false, { fromQuit: true })
})
ipcMain.handle('update:action', (e, name) => {
  switch (name) {
    case 'state': return Updater.getState()
    case 'check': return Updater.check(true)
    case 'download': return Updater.download()
    case 'install': return Updater.install(true)
    case 'later': return Updater.later()
    case 'skip': return Updater.skip()
    case 'cancel': return Updater.cancel()
  }
})
app.on('window-all-closed', () => { if (!isMac) app.quit() })
app.on('activate', () => { if (!windows.length && app.isReady() && mainSession) createWindow({}) })
process.on('uncaughtException', err => { console.error('uncaught', err); log('UNCAUGHT', err && err.stack || err) })
process.on('unhandledRejection', err => { console.error('unhandled', err); log('UNHANDLED', err && err.stack || err) })

app.whenReady().then(async () => {
  nativeTheme.themeSource = D.settings.get('theme') || 'system'
  app.userAgentFallback = chromeUA(app.userAgentFallback)
  mainSession = session.fromPartition('persist:lumen')
  setupSession(mainSession)
  for (const origin of ['https://www.youtube.com', 'https://m.youtube.com', 'https://music.youtube.com', 'https://youtube.com']) {
    mainSession.clearStorageData({ origin, storages: ['serviceworkers'] }).catch(() => {})
  }
  buildMenu()
  await Promise.race([setupExtensions(), new Promise(r => setTimeout(r, 4000))])
  setupAdblock() // loads in the background; blocking turns on as soon as lists are ready
  const saved = D.session.get().windows || []
  const restore = D.settings.get('restoreSession')
  const argUrls = process.argv.slice(1).filter(a => /^(https?|file):/.test(a))
  if (saved.length) {
    saved.forEach(sw => {
      const tabs = restore ? sw.tabs : sw.tabs.filter(t => t.pinned)
      createWindow({ restore: tabs.length ? { tabs, active: restore ? sw.active : 0 } : null, bounds: sw.bounds })
    })
  } else createWindow({})
  for (const u of [...argUrls, ...pendingOpen.splice(0)]) openExternalURL(u)
  Updater.onState(s => broadcast('update', s))
  Updater.start({
    autoUpdate: () => D.settings.get('autoUpdate'),
    autoDownload: () => D.settings.get('autoUpdate'),
    cardEnabled: () => true,
    skipped: () => D.settings.get('skippedVersion'),
    setSkipped: v => D.settings.set('skippedVersion', v),
    flush: () => { quitting = true; flushAll() },
    toast: msg => broadcast('toast', msg),
    notify: (title, body) => { try { const { Notification } = require('electron'); if (Notification.isSupported()) new Notification({ title, body, silent: true }).show() } catch {} },
  })
  log('boot ' + app.getVersion())
  Sync.start()
  nativeTheme.on('updated', () => { broadcast('theme', nativeTheme.shouldUseDarkColors); for (const w of windows) { try { w.win.setBackgroundColor(winBg()) } catch {} } })
  powerMonitor.on('resume', () => Sync.syncNow().catch(() => {}))
})

module.exports = { windows, createWindow, D }
