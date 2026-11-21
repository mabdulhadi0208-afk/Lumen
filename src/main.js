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
const Translate = require('./translate')
const Groups = require('./groups')
const { Store: WStore } = require('./store')
let wallpaperStore
app.whenReady().then(() => { wallpaperStore = new WStore('wallpaper', { image: '' }) })

const isMac = process.platform === 'darwin'
const ROOT = path.join(__dirname, '..')
const ICON = path.join(ROOT, 'build', 'icon.png')

app.setName('Lumen')
app.commandLine.appendSwitch('enable-smooth-scrolling')
try { if (require('./data').settings.get('forceDark')) app.commandLine.appendSwitch('enable-features', 'WebContentsForceDark') } catch {}
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

// search shortcuts: "yt lofi", "gh electron", "w saturn", "amz usb c cable"...
const SHORTCUTS = {
  yt: ['YouTube', 'https://www.youtube.com/results?search_query=%s'], gh: ['GitHub', 'https://github.com/search?q=%s'],
  w: ['Wikipedia', 'https://en.wikipedia.org/w/index.php?search=%s'], amz: ['Amazon', 'https://www.amazon.sa/s?k=%s'],
  maps: ['Google Maps', 'https://www.google.com/maps/search/%s'], img: ['Google Images', 'https://www.google.com/search?tbm=isch&q=%s'],
  r: ['Reddit', 'https://www.reddit.com/search/?q=%s'], x: ['X', 'https://x.com/search?q=%s'], tr: ['Google Translate', 'https://translate.google.com/?sl=auto&op=translate&text=%s'],
  noon: ['noon', 'https://www.noon.com/saudi-en/search/?q=%s'], so: ['Stack Overflow', 'https://stackoverflow.com/search?q=%s'], npm: ['npm', 'https://www.npmjs.com/search?q=%s'],
  sp: ['Spotify', 'https://open.spotify.com/search/%s'], ai: ['Claude', 'https://claude.ai/new?q=%s'], news: ['Google News', 'https://news.google.com/search?q=%s'],
}
function shortcutFor(text) {
  if (D.settings.get('searchShortcuts') === false) return null
  const m = String(text || '').trim().match(/^([a-z]{1,5})\s+(.+)$/i)
  if (!m || !SHORTCUTS[m[1].toLowerCase()]) return null
  const [name, url] = SHORTCUTS[m[1].toLowerCase()]
  return { name, query: m[2], url: url.replace('%s', encodeURIComponent(m[2])) }
}

function toURL(text) {
  const t = (text || '').trim()
  if (!t) return null
  if (/^(https?|file|lumen|chrome-extension|about|data|view-source):/i.test(t)) return t
  if (/^localhost(:\d+)?(\/.*)?$/i.test(t) || /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(t)) return 'http://' + t
  if (!/\s/.test(t) && /^[^\s/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(t)) return 'https://' + t
  const sc = shortcutFor(t); if (sc) return sc.url
  const eng = SEARCH[D.settings.get('searchEngine')] || SEARCH.google
  return eng.url.replace('%s', encodeURIComponent(t))
}

// ---------------------------------------------------------------- clean links
const TRACKING = /^(utm_[a-z_]+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|yclid|twclid|ttclid|li_fat_id|igshid|igsh|mc_cid|mc_eid|_hsenc|_hsmi|mkt_tok|oly_anon_id|oly_enc_id|vero_id|rb_clickid|s_cid|epik|srsltid)$/i
function cleanURL(u) {
  try {
    const url = new URL(u)
    if (!/^https?:$/.test(url.protocol)) return u
    let changed = false
    for (const k of [...url.searchParams.keys()]) {
      if (TRACKING.test(k) || (k === 'si' && /(^|\.)(youtube\.com|youtu\.be|spotify\.com)$/.test(url.hostname))) { url.searchParams.delete(k); changed = true }
    }
    return changed ? url.toString() : u
  } catch { return u }
}
function upgradeURL(u) {
  if (!u) return u
  let out = D.settings.get('cleanLinks') ? cleanURL(u) : u
  if (D.settings.get('httpsOnly') && /^http:\/\//.test(out) && !/^http:\/\/(localhost|127\.|\[::1\]|192\.168\.|10\.)/.test(out)) out = out.replace(/^http:/, 'https:')
  return out
}

// ---------------------------------------------------------------- sessions
let mainSession, extensions = null, blocker = null, addingTab = false
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
    const full = !!D.settings.get('hideCookieBanners')
    const cache = path.join(app.getPath('userData'), full ? 'adblock-engine-full.bin' : 'adblock-engine.bin')
    const fetchImpl = (url, opts) => net.fetch(url, opts)
    const caching = { path: cache, read: fs.promises.readFile, write: fs.promises.writeFile }
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('adblock list timeout')), 15000))
    const old = blocker
    const next = await Promise.race([full ? ElectronBlocker.fromPrebuiltFull(fetchImpl, caching) : ElectronBlocker.fromPrebuiltAdsAndTracking(fetchImpl, caching), timeout])
    if (old) for (const ses of sessionsReady) { try { if (old.isBlockingEnabled(ses)) old.disableBlockingInSession(ses) } catch {} }
    blocker = next
    allowSites(blocker)
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
// ---- sites where the ad blocker is turned off (it broke something there)
const siteKey = u => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return /^(https?)$/.test(new URL(u).protocol.slice(0, -1)) ? h : '' } catch { return '' } }
function adAllowed(url) {
  const h = siteKey(url); if (!h) return false
  const list = D.settings.get('adblockAllow') || []
  return list.some(a => h === a || h.endsWith('.' + a))
}
function topURLOf(details) {
  try { if (details.frame && details.frame.top && details.frame.top.url) return details.frame.top.url } catch {}
  try { const wc = details.webContentsId && webContents.fromId(details.webContentsId); if (wc && !wc.isDestroyed()) return wc.getURL() } catch {}
  return details.referrer || ''
}
function allowSites(b) {
  const br = b.onBeforeRequest, hr = b.onHeadersReceived, cf = b.onInjectCosmeticFilters
  b.onBeforeRequest = (details, cb) => (details.resourceType !== 'mainFrame' && adAllowed(topURLOf(details))) ? cb({}) : br(details, cb)
  b.onHeadersReceived = (details, cb) => adAllowed(details.resourceType === 'mainFrame' ? details.url : topURLOf(details)) ? cb({}) : hr(details, cb)
  b.onInjectCosmeticFilters = (event, url, msg) => {
    let top = url; try { top = event.sender.getURL() || url } catch {}
    return adAllowed(top) || adAllowed(url) ? undefined : cf(event, url, msg)
  }
}
function toggleSiteAdblock(w, on) {
  const t = w.active(); if (!t) return
  const url = t.view ? t.view.webContents.getURL() : t.url
  const h = siteKey(url); if (!h) return
  let list = (D.settings.get('adblockAllow') || []).filter(a => !(h === a || h.endsWith('.' + a)))
  if (!on) list.push(h)
  D.settings.set({ adblockAllow: list })
  if (t.view) { blockedByWc.delete(t.view.webContents.id); t.view.webContents.reload() }
  w.pushState()
  w.send('toast', on ? `Ad blocker back on for ${h}` : `Ad blocker off for ${h}`)
  for (const x of windows) for (const tt of x.tabs.values()) if (tt.view && (tt.url || '').startsWith('lumen://settings')) tt.view.webContents.send('lumen:settings', publicSettings())
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
      selectTab(wc) { if (addingTab) return; const w = winForWc(wc.id); if (w) { const t = w.tabByWc(wc.id); if (t) w.activate(t.id) } },
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
  if (u.host === 'assets' && u.pathname === '/themes.js') return new Response(await fs.promises.readFile(path.join(ROOT, 'ui', 'themes.js')), { headers: { 'content-type': 'text/javascript; charset=utf-8' } })
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
  if (permission === 'notifications' && D.settings.get('blockNotifications')) return callback(false)
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
    this.groups = new Map()
    this.groupSeq = 0
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
    // the extensions library marks every added tab as active; ignore that so background tabs stay in the background
    if (extensions && !this.incognito) { addingTab = true; try { extensions.addTab(wc, this.win) } catch {} finally { addingTab = false } }
    const upd = () => this.pushStateSoon()
    wc.on('page-title-updated', (e, title) => { t.title = title; D.updateHistoryTitle(wc.getURL(), title); upd() })
    wc.on('page-favicon-updated', (e, icons) => { t.favicon = icons[icons.length - 1] || icons[0] || ''; upd() })
    wc.on('did-start-loading', () => { t.loading = true; t.crashed = false; upd() })
    wc.on('did-stop-loading', () => { t.loading = false; upd() })
    wc.on('did-finish-load', () => { offerTranslate(this, t).catch(() => {}) })
    wc.on('will-navigate', e => {
      // web pages may not open Lumen's internal pages (same rule Chrome uses for chrome://)
      if (e.url.startsWith('lumen://') && !(wc.getURL() || '').startsWith('lumen://')) e.preventDefault()
    })
    wc.on('did-start-navigation', (e) => { if (e.isMainFrame && !e.isSameDocument) blockedByWc.set(wc.id, 0) })
    // clean tracking parameters out of links, and upgrade to HTTPS when asked: on clicks and on redirects
    const fixNav = e => {
      if (e.isMainFrame === false) return
      const better = upgradeURL(e.url)
      if (better !== e.url) { e.preventDefault(); wc.loadURL(better).catch(() => {}) }
    }
    wc.on('will-navigate', fixNav)
    wc.on('will-redirect', fixNav)
    const nav = () => {
      t.url = wc.getURL(); t.canBack = wc.navigationHistory.canGoBack(); t.canForward = wc.navigationHistory.canGoForward()
      if (!this.incognito) D.addHistory(t.url, wc.getTitle())
      applySiteZoom(t)
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
    wc.on('media-started-playing', () => { t.playing = true; t.mediaAt = Date.now(); upd() })
    wc.on('media-paused', () => { t.playing = false; t.mediaAt = Date.now(); upd() })
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
      const bg = d.disposition === 'background-tab' || (D.settings.get('linksBackground') && d.disposition === 'foreground-tab')
      this.createTab(d.url, { active: !bg, openerId: t.id })
      return { action: 'deny' }
    })
    wc.on('will-prevent-unload', e => {
      const r = dialog.showMessageBoxSync({ type: 'question', buttons: ['Leave', 'Stay'], message: 'Leave this page?', detail: 'Changes you made may not be saved.', defaultId: 0, cancelId: 1 })
      if (r === 0) e.preventDefault()
    })
    wc.loadURL(upgradeURL(t.url) || 'lumen://newtab').catch(() => {})
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
    if (this.activeId && this.activeId !== id) this.lastTabId = this.activeId
    this.activeId = id
    t.lastActive = Date.now()
    if (D.settings.get('soundActiveOnly')) for (const o of this.tabs.values()) if (o.view && o.id !== id && o.id !== this.splitId) { o.view.webContents.setAudioMuted(true); o.autoMuted = true }
    if (t.autoMuted && t.view) { t.view.webContents.setAudioMuted(!!t.muted); t.autoMuted = false }
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
    if (this.peek) { this.win.contentView.addChildView(this.peek); this.peek.setBounds(this.peekRect()) }
  }

  // ---- Peek: a floating preview of a link above the current page
  peekRect() {
    const [W, H] = this.win.getContentSize()
    const w = Math.round(Math.min(1100, W * 0.82)), top = 146
    return { x: Math.round((W - w) / 2), y: top, width: w, height: Math.max(200, H - top - 24) }
  }
  openPeek(url) {
    this.closePeek()
    const v = new WebContentsView({ webPreferences: { session: this.ses, sandbox: true, contextIsolation: true, plugins: true } })
    v.setBorderRadius(14)
    v.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#1e1f23' : '#ffffff')
    this.peek = v
    this.setOverlay(true)
    this.win.contentView.addChildView(v)
    v.setBounds(this.peekRect())
    const wc = v.webContents
    wc.setWindowOpenHandler(d => { this.createTab(d.url); return { action: 'deny' } })
    wc.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'Escape') { e.preventDefault(); this.closePeek() } })
    wc.on('page-title-updated', (e, title) => this.send('peek', { open: true, title, url: wc.getURL(), rect: this.peekRect() }))
    wc.on('did-navigate', () => this.send('peek', { open: true, title: wc.getTitle(), url: wc.getURL(), rect: this.peekRect() }))
    wc.loadURL(upgradeURL(url)).catch(() => {})
    wc.focus()
    this.send('peek', { open: true, title: '', url, rect: this.peekRect() })
  }
  closePeek(action) {
    const v = this.peek; if (!v) return
    const url = v.webContents.getURL()
    this.peek = null
    try { this.win.contentView.removeChildView(v) } catch {}
    try { v.webContents.close() } catch {}
    this.send('peek', { open: false })
    this.setOverlay(false)
    if (action === 'tab') this.createTab(url)
    if (action === 'split') { const n = this.createTab(url, { active: false }); this.splitId = n.id; this.layout(); this.pushState() }
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
    this.pruneGroups()
    if (!this.order.length) { this.win.close(); return }
    this.pushState(); saveSession()
  }

  moveTab(id, toIndex) {
    const i = this.order.indexOf(id)
    if (i < 0) return
    this.order.splice(i, 1)
    this.order.splice(Math.max(0, Math.min(toIndex, this.order.length)), 0, id)
    // a moved tab joins the group it lands inside, and leaves its group when dropped outside it
    const t = this.tabs.get(id), j = this.order.indexOf(id)
    const prev = this.tabs.get(this.order[j - 1]), next = this.tabs.get(this.order[j + 1])
    if (t && !t.pinned) {
      if (prev && next && prev.group && prev.group === next.group) t.group = prev.group
      else if (!((prev && prev.group && prev.group === t.group) || (next && next.group && next.group === t.group))) t.group = null
    }
    this.pruneGroups()
    this.layout(); this.pushState(); saveSession()
  }

  // ---- tab groups
  pruneGroups() { for (const id of [...this.groups.keys()]) if (![...this.tabs.values()].some(t => t.group === id)) this.groups.delete(id) }
  regroupOrder() {
    const pinned = this.order.filter(i => this.tabs.get(i).pinned)
    const rest = this.order.filter(i => !this.tabs.get(i).pinned)
    const seen = [], byGroup = new Map()
    for (const i of rest) { const g = this.tabs.get(i).group; if (g) { if (!byGroup.has(g)) { byGroup.set(g, []); seen.push(g) } byGroup.get(g).push(i) } }
    const out = []; const placed = new Set()
    for (const i of rest) {
      const g = this.tabs.get(i).group
      if (!g) out.push(i)
      else if (!placed.has(g)) { placed.add(g); out.push(...byGroup.get(g)) }
    }
    this.order = [...pinned, ...out]
  }
  newGroup(ids, name, color) {
    const id = 'g' + (++this.groupSeq)
    this.groups.set(id, { id, name: name || 'New group', color: color || Groups.COLORS[(this.groupSeq - 1) % Groups.COLORS.length], collapsed: false })
    for (const tid of ids) { const t = this.tabs.get(tid); if (t && !t.pinned) t.group = id }
    this.regroupOrder(); this.pruneGroups(); this.layout(); this.pushState(); saveSession()
    return id
  }
  applyAutoGroups(list) {
    for (const t of this.tabs.values()) t.group = null
    this.groups.clear()
    const head = [], rank = new Map()
    list.forEach((g, gi) => {
      const id = 'g' + (++this.groupSeq)
      this.groups.set(id, { id, name: g.name, color: g.color || Groups.COLORS[gi % Groups.COLORS.length], collapsed: false })
      g.ids.forEach(tid => { const t = this.tabs.get(tid); if (t && !t.pinned) { t.group = id; rank.set(tid, gi) } })
    })
    const pinned = this.order.filter(i => this.tabs.get(i).pinned)
    const grouped = this.order.filter(i => !this.tabs.get(i).pinned && this.tabs.get(i).group).sort((a, b) => rank.get(a) - rank.get(b))
    const loose = this.order.filter(i => !this.tabs.get(i).pinned && !this.tabs.get(i).group)
    this.order = [...pinned, ...grouped, ...loose]
    this.pruneGroups(); this.layout(); this.pushState(); saveSession()
  }
  setGroup(id, patch) { const g = this.groups.get(id); if (g) { Object.assign(g, patch); this.pushState(); saveSession() } }
  ungroup(id) { for (const t of this.tabs.values()) if (!id || t.group === id) t.group = null; if (id) this.groups.delete(id); else this.groups.clear(); this.pushState(); saveSession() }
  closeGroup(id) { for (const t of [...this.tabs.values()]) if (t.group === id) this.closeTab(t.id); this.groups.delete(id) }

  zoom(id, delta) {
    const t = this.tabs.get(id); if (!t || !t.view) return
    const wc = t.view.webContents
    const z = delta === 0 ? 0 : Math.max(-6, Math.min(8, wc.getZoomLevel() + delta))
    wc.setZoomLevel(z); t.zoom = z
    const h = siteKey(wc.getURL())
    if (h && !this.incognito && D.settings.get('rememberZoom') !== false) { const zs = { ...(D.settings.get('zoomBySite') || {}) }; if (z) zs[h] = z; else delete zs[h]; D.settings.set({ zoomBySite: zs }) }
    this.pushState()
  }

  serialize() {
    const a = this.active()
    const awc = a && a.view && a.view.webContents
    return {
      tabs: this.order.map(id => {
        const t = this.tabs.get(id)
        return { id: t.id, title: t.title, url: t.url, favicon: t.favicon, pinned: t.pinned, loading: t.loading, audible: t.audible, muted: t.muted, asleep: t.asleep, crashed: t.crashed, hung: !!t.hung, playing: !!t.playing, mediaAt: t.mediaAt || 0, group: t.group || null }
      }),
      activeId: this.activeId, splitId: this.splitId, incognito: this.incognito, groups: [...this.groups.values()],
      canBack: !!(awc && awc.navigationHistory.canGoBack()), canForward: !!(awc && awc.navigationHistory.canGoForward()),
      url: a ? a.url : '', zoom: a ? Math.round(Math.pow(1.2, a.zoom || 0) * 100) : 100,
      bookmarked: a ? D.isBookmarked(a.url) : false,
      blocked: awc ? (blockedByWc.get(awc.id) || 0) : 0,
      adOff: a ? adAllowed(awc ? awc.getURL() : a.url) : false,
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
      if (/^https?:/.test(p.linkURL)) items.push({ label: 'Peek Link', click: () => this.openPeek(p.linkURL) })
      items.push({ label: 'Open Link in Split View', click: () => { const n = this.createTab(p.linkURL, { active: false, openerId: t.id }); this.splitId = n.id; this.activate(t.id) } })
      items.push({ label: 'Open Link in New Window', click: () => createWindow({ urls: [p.linkURL] }) })
      if (!this.incognito) items.push({ label: 'Open Link in Private Window', click: () => createWindow({ urls: [p.linkURL], incognito: true }) })
      items.push({ label: 'Copy Link', click: () => clipboard.writeText(p.linkURL) })
      sep()
    }
    if (p.mediaType === 'image' && /^https?:/.test(p.srcURL)) {
      items.push({ label: 'Search Image with Google Lens', click: () => this.createTab('https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(p.srcURL), { openerId: t.id }) })
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
      if (/^https?:/.test(wc.getURL()) && p.selectionText.trim().length < 300) items.push({ label: 'Copy Link to Highlight', click: () => { const u = cleanURL(wc.getURL()).split('#')[0]; const txt = p.selectionText.trim().replace(/\s+/g, ' '); const words = txt.split(' '); const frag = words.length > 8 ? encodeURIComponent(words.slice(0, 4).join(' ')).replace(/-/g, '%2D') + ',' + encodeURIComponent(words.slice(-4).join(' ')).replace(/-/g, '%2D') : encodeURIComponent(txt).replace(/-/g, '%2D'); clipboard.writeText(u + '#:~:text=' + frag); this.send('toast', 'Link to highlight copied') } })
      items.push({ label: 'Explain with Lumen AI', click: () => this.send('command', { ai: 'explain', text: p.selectionText.slice(0, 6000) }) })
      items.push({ label: `Translate to ${Translate.langName(Translate.target(D.settings))}`, click: () => Translate.bubble(wc, p.selectionText.slice(0, 4000), Translate.target(D.settings)).catch(e => this.send('toast', 'Translation failed')) })
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
      if (D.settings.get('adblock') && siteKey(wc.getURL())) { const off = adAllowed(wc.getURL()); items.push({ label: off ? 'Turn Ad Blocker Back On for This Site' : 'Turn Off Ad Blocker for This Site', click: () => toggleSiteAdblock(this, off) }) }
      items.push({ label: 'Copy Link as Markdown', click: () => { clipboard.writeText(`[${wc.getTitle().replace(/[\[\]]/g, '')}](${cleanURL(wc.getURL())})`); this.send('toast', 'Markdown link copied') } })
      items.push({ label: 'Send to Phone with QR Code', click: () => this.send('command', 'qr') })
      items.push({ label: 'Summarize with Lumen AI', click: () => this.send('command', { ai: 'summarize' }) })
      items.push({ label: 'Translate Page', click: () => translateTab(this, t) })
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
    for (const g of restore.groups || []) { w.groups.set(g.id, { ...g }); const n = parseInt(String(g.id).slice(1)) || 0; if (n > w.groupSeq) w.groupSeq = n }
    restore.tabs.forEach((t, i) => { const x = w.createTab(t.url, { active: false, pinned: t.pinned, title: t.title, favicon: t.favicon, asleep: i !== restore.active }); if (t.group && w.groups.has(t.group)) x.group = t.group })
    w.pruneGroups()
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
      groups: [...w.groups.values()],
      tabs: w.order.map(id => { const t = w.tabs.get(id); return { url: (t.view && !t.view.webContents.isDestroyed() ? t.view.webContents.getURL() : t.url) || t.url, title: t.title, pinned: t.pinned, favicon: t.favicon, group: t.group || null } }),
    })),
  }
  if (data.windows.length || quitting) D.session.replace(data)
}

// ---------------------------------------------------------------- smart grouping
async function autoGroupWindow(w) {
  const tabs = w.order.map(i => w.tabs.get(i)).filter(t => !t.pinned).map(t => ({ id: t.id, url: t.view ? t.view.webContents.getURL() : t.url, title: t.title || '' }))
  let groups = null
  if (AI.ready() && D.settings.get('aiTabGroups') !== false) { try { groups = await AI.groupTabs(tabs) } catch (e) { log('ai grouping failed', e.message) } }
  if (!groups) groups = Groups.autoGroup(tabs)
  if (!groups.length) { w.send('toast', 'Not enough similar tabs to group'); return 0 }
  w.applyAutoGroups(groups)
  w.send('toast', `Sorted into ${groups.length} group${groups.length > 1 ? 's' : ''}`)
  return groups.length
}
const AI = require('./ai')

// ---------------------------------------------------------------- translator
async function translateTab(w, t) {
  if (!t || !t.view) return
  const wc = t.view.webContents
  if (await Translate.isTranslated(wc)) { await Translate.showOriginal(wc); w.send('toast', 'Showing the original'); return }
  const to = Translate.target(D.settings)
  w.send('toast', `Translating to ${Translate.langName(to)}...`)
  try { const r = await Translate.translatePage(wc, to); w.send('toast', r.ok ? `Translated to ${Translate.langName(to)}` : r.error) }
  catch (e) { log('translate failed', e.message); w.send('toast', 'Translation failed. Check your connection.') }
}
const offered = new Set()
async function offerTranslate(w, t) {
  if (!t.view || !D.settings.get('offerTranslate') || !/^https?:/.test(t.view.webContents.getURL())) return
  const wc = t.view.webContents
  const lang = await Translate.pageLang(wc)
  const to = Translate.target(D.settings)
  if (!lang || lang === to || (D.settings.get('neverTranslate') || []).includes(lang)) return
  if ((D.settings.get('alwaysTranslate') || []).includes(lang)) return translateTab(w, t)
  const key = t.id + '|' + new URL(wc.getURL()).host
  if (offered.has(key)) return
  offered.add(key)
  const id = ++promptSeq
  pendingPrompts.set(id, ans => {
    if (ans.allow) { translateTab(w, t); if (ans.always) D.settings.set('alwaysTranslate', [...(D.settings.get('alwaysTranslate') || []), lang]) }
    else if (ans.never) D.settings.set('neverTranslate', [...(D.settings.get('neverTranslate') || []), lang])
  })
  w.send('prompt', { id, kind: 'translate', tabId: t.id, host: new URL(wc.getURL()).host, text: `This page is in ${Translate.langName(lang)}. Translate it to ${Translate.langName(to)}?`, lang: Translate.langName(lang) })
}

// ---------------------------------------------------------------- Lumen AI
const PAGE_TEXT_JS = `(() => {
  const pick = document.querySelector('article') || document.querySelector('main') || document.querySelector('[role=main]') || document.body
  let t = (pick && pick.innerText || '').replace(/\\n{3,}/g, '\\n\\n').trim()
  if (t.length < 400 && pick !== document.body) t = (document.body.innerText || '').trim()
  return { title: document.title, url: location.href, text: t.slice(0, 60000), sel: String(getSelection() || '').slice(0, 6000) }
})()`
async function pageInfo(w) {
  const t = w.tabs.get(w.activeId)
  const wc = t && t.view && !t.view.webContents.isDestroyed() ? t.view.webContents : null
  if (!wc) return null
  const url = wc.getURL()
  if (!/^https?:|^file:/.test(url)) return { title: wc.getTitle(), url, text: '', sel: '', internal: true }
  try { return await wc.executeJavaScriptInIsolatedWorld(1018, [{ code: PAGE_TEXT_JS }]) } catch { return { title: wc.getTitle(), url, text: '', sel: '' } }
}
const aiRuns = new Map()
async function aiAsk(w, req) {
  const id = req.id
  const send = m => w.send('ai', { id, ...m })
  const ctl = new AbortController(); aiRuns.set(id, ctl)
  try {
    const page = await pageInfo(w)
    if (!page || page.internal || !page.text) {
      if (req.mode !== 'chat') throw new Error('Open a web page first, then ask Lumen AI about it.')
    }
    let prompt
    if (req.mode === 'summarize') prompt = 'Summarize this page. Start with a one-sentence overview, then the key points as a short bulleted list, then anything important to watch out for, if there is any.'
    else if (req.mode === 'explain') prompt = `Explain this passage from the page in plain language. Say what it means and why it matters in the context of the page. Keep it short.\n\n<passage>\n${String(req.text || (page && page.sel) || '').slice(0, 6000)}\n</passage>`
    else if (req.mode === 'keypoints') prompt = 'List the 5 most important points on this page, one line each.'
    else prompt = String(req.text || '').slice(0, 8000)
    const history = (req.history || []).slice(-8).filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content).map(m => ({ role: m.role, content: String(m.content).slice(0, 12000) }))
    const first = page && page.text ? pageBlock(page) + '\n\n' : ''
    // the page goes into the first user turn so follow-up questions keep it
    const messages = history.length
      ? [{ role: 'user', content: first + history[0].content }, ...history.slice(1), { role: 'user', content: prompt }]
      : [{ role: 'user', content: first + prompt }]
    send({ start: true, title: page ? page.title : '', url: page ? page.url : '' })
    const full = await AI.stream({ system: AI.SYSTEM, messages }, d => send({ delta: d }), ctl.signal)
    send({ done: true, text: full, prompt })
  } catch (e) {
    if (e.name === 'AbortError') send({ done: true, stopped: true })
    else send({ error: e.message || String(e) })
  } finally { aiRuns.delete(id) }
}
const pageBlock = p => AI.pageBlock(p)

// ---------------------------------------------------------------- app icon
const APP_ICONS = ['default', 'midnight', 'sunset', 'mint', 'ocean', 'gold', 'rose', 'mono']
function applyAppIcon() {
  const id = APP_ICONS.includes(D.settings.get('appIcon')) ? D.settings.get('appIcon') : 'default'
  try {
    const img = nativeImage.createFromPath(path.join(ROOT, 'build', 'icons', id + '.png'))
    if (img.isEmpty()) return
    if (isMac && app.dock) app.dock.setIcon(img)
    else for (const w of windows) { try { w.win.setIcon(img) } catch {} }
  } catch (e) { log('icon failed', e.message) }
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
// tiny calculator for the address bar: + - * / ^ % ( ) and sqrt, pi
function calcOf(q) {
  const s = String(q || '').replace(/\s+/g, '').replace(/[x\u00d7]/g, '*').replace(/\u00f7/g, '/').replace(/,/g, '').replace(/^=/, '')
  if (!/[-+*/^%]/.test(s.replace(/^-/, '')) && !/sqrt|pi/.test(s)) return null
  if (/^[\d-]+$/.test(s) && (s.match(/-/g) || []).length >= 2) return null   // dates and phone numbers
  if (!/^[\d.+\-*/^%()]*(sqrt|pi)?[\d.+\-*/^%()sqrtpi]*$/.test(s) || s.length > 80) return null
  let i = 0
  const peek = () => s[i], eat = c => s[i] === c && ++i
  function num() {
    if (s.startsWith('pi', i)) { i += 2; return Math.PI }
    if (s.startsWith('sqrt', i)) { i += 4; return Math.sqrt(atom()) }
    const m = s.slice(i).match(/^\d*\.?\d+/); if (!m) throw 0
    i += m[0].length; return parseFloat(m[0])
  }
  function atom() {
    if (eat('-')) return -atom()
    if (eat('+')) return atom()
    if (eat('(')) { const v = expr(); if (!eat(')')) throw 0; return v }
    let v = num(); if (eat('%')) v /= 100; return v
  }
  function power() { const b = atom(); return eat('^') ? Math.pow(b, power()) : b }
  function term() { let v = power(); for (;;) { if (eat('*')) v *= power(); else if (eat('/')) v /= power(); else if (peek() === '(') v *= power(); else return v } }
  function expr() { let v = term(); for (;;) { if (eat('+')) v += term(); else if (eat('-')) v -= term(); else return v } }
  try { const v = expr(); if (i !== s.length || !isFinite(v)) return null; return +v.toPrecision(12) } catch { return null }
}

async function suggest(w, text) {
  const q = (text || '').trim()
  const out = { query: q, tabs: [], history: [], bookmarks: [], search: [] }
  const sc = shortcutFor(q); if (sc) out.shortcut = { name: sc.name, query: sc.query }
  const calc = calcOf(q); if (calc !== null) out.calc = calc
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
      case 'newTabAfter': { const ref = w.tabs.get(a[0]); if (!ref) return; const n = w.createTab('lumen://newtab', { active: true, index: w.order.indexOf(ref.id) + 1 }); if (ref.group && !ref.pinned) { n.group = ref.group; w.layout(); w.pushState(); saveSession() } return n.id }
      case 'navigate': {
        const url = upgradeURL(toURL(a[0])); if (!url) return
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
      case 'autoGroup': return autoGroupWindow(w)
      case 'aiAsk': aiAsk(w, a[0] || {}); return true
      case 'aiStop': { const c = aiRuns.get(a[0]); if (c) c.abort(); return true }
      case 'aiStatus': { const pi = await pageInfo(w).catch(() => null); return { ready: AI.ready(), title: pi ? pi.title : '', url: pi ? pi.url : '', sel: pi ? pi.sel : '' } }
      case 'ungroupAll': return w.ungroup(null)
      case 'groupToggle': { const g = w.groups.get(a[0]); if (g) w.setGroup(a[0], { collapsed: !g.collapsed }); return }
      case 'groupRename': return w.setGroup(a[0], { name: String(a[1] || '').slice(0, 40) || 'Group' })
      case 'groupMenu': {
        const g = w.groups.get(a[0]); if (!g) return
        Menu.buildFromTemplate([
          { label: g.collapsed ? 'Expand' : 'Collapse', click: () => w.setGroup(g.id, { collapsed: !g.collapsed }) },
          { label: 'Rename', click: () => w.send('command', 'rename-group:' + g.id) },
          { label: 'Color', submenu: Groups.COLORS.map(c => ({ label: c[0].toUpperCase() + c.slice(1), type: 'radio', checked: g.color === c, click: () => w.setGroup(g.id, { color: c }) })) },
          { label: 'New Tab in Group', click: () => { const last = [...w.order].reverse().find(i => w.tabs.get(i).group === g.id); const n = w.createTab('lumen://newtab', { index: w.order.indexOf(last) + 1 }); n.group = g.id; w.pushState() } },
          { type: 'separator' },
          { label: 'Ungroup', click: () => w.ungroup(g.id) },
          { label: 'Close Group', click: () => w.closeGroup(g.id) },
        ]).popup({ window: w.win })
        return
      }
      case 'peekClose': return w.closePeek(a[0])
      case 'peekOpen': return a[0] && w.openPeek(a[0])
      case 'media': {
        const x = w.tabs.get(a[0]); if (!x || !x.view) return
        if (a[1] === 'go') return w.activate(x.id)
        return x.view.webContents.executeJavaScript(`(() => { const m = [...document.querySelectorAll('video,audio')]; const p = m.filter(v => !v.paused); if (p.length) { p.forEach(v => v.pause()); return 'paused' } const v = m.sort((a, b) => (b.currentTime > 0) - (a.currentTime > 0))[0]; if (v) { v.play(); return 'playing' } return 'none' })()`, true).catch(() => 'none')
      }
      case 'copyAllLinks': { clipboard.writeText(w.order.map(i => { const x = w.tabs.get(i); return cleanURL(x.view ? x.view.webContents.getURL() : x.url) }).filter(u => /^https?:/.test(u)).join('\n')); w.send('toast', 'All tab links copied'); return }
      case 'saveSession': {
        const tabs = w.order.map(i => { const x = w.tabs.get(i); return { url: x.view ? x.view.webContents.getURL() : x.url, title: x.title } }).filter(x => /^https?:/.test(x.url))
        if (!tabs.length) { w.send('toast', 'No web pages to save'); return }
        const list = D.settings.get('savedSessions') || []
        list.unshift({ id: Date.now().toString(36), name: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), tabs })
        D.settings.set('savedSessions', list.slice(0, 12)); w.send('toast', `Saved ${tabs.length} tabs`); return
      }
      case 'restoreSession': { const s = (D.settings.get('savedSessions') || []).find(x => x.id === a[0]); if (s) createWindow({ urls: s.tabs.map(x => x.url) }); return }
      case 'deleteSession': D.settings.set('savedSessions', (D.settings.get('savedSessions') || []).filter(x => x.id !== a[0])); return
      case 'translate': return t && translateTab(w, t)
      case 'fullscreen': return w.win.setFullScreen(!w.win.isFullScreen())
      case 'savePage': return wc && savePage(wc)
      case 'reopenAt': { const i = closedTabs.length - 1 - a[0]; const c = closedTabs.splice(i, 1)[0]; if (c) w.createTab(c.url, { pinned: c.pinned }); return }
      case 'closeDuplicates': { const urlOf = x => x.view ? x.view.webContents.getURL() : x.url; const seen = new Set(t ? [urlOf(t)] : []); let n = 0; for (const id of [...w.order]) { if (id === w.activeId) continue; const x = w.tabs.get(id); const u = urlOf(x); if (seen.has(u) && !x.pinned) { w.closeTab(id); n++ } else seen.add(u) } w.send('toast', n ? `Closed ${n} duplicate tab${n > 1 ? 's' : ''}` : 'No duplicate tabs'); return n }
      case 'closeOthers': { for (const id of [...w.order]) if (id !== w.activeId && !w.tabs.get(id).pinned) w.closeTab(id); return }
      case 'muteOthers': { for (const x of w.tabs.values()) if (x.id !== w.activeId && x.view) { x.muted = true; x.view.webContents.setAudioMuted(true) } w.pushState(); return }
      case 'restart': app.relaunch(); app.quit(); return
      case 'menuInfo': return { sessions: (D.settings.get('savedSessions') || []).map(s => ({ id: s.id, name: s.name, count: s.tabs.length })), closed: closedTabs.slice(-5).reverse().map(c => ({ title: c.title || c.url, url: c.url })), version: app.getVersion(), update: Updater.getState(), zoom: t ? Math.round(Math.pow(1.2, t.zoom || 0) * 100) : 100, incognito: w.incognito, tabLayout: D.settings.get('tabLayout'), fullscreen: w.win.isFullScreen(), passkeys: Passkeys.list().length, passwords: D.listPasswords().length }
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
      case 'qr': { const u = wc ? cleanURL(wc.getURL()) : ''; if (!/^https?:/.test(u)) return null; return { url: u, img: await require('qrcode').toDataURL(u, { margin: 1, width: 440, errorCorrectionLevel: 'M' }) } }
      case 'pageStats': { if (!wc) return null; try { return await wc.executeJavaScriptInIsolatedWorld(1019, [{ code: `(() => { const el = document.querySelector('article') || document.querySelector('main') || document.body; const words = ((el && el.innerText) || '').trim().split(/\\s+/).filter(Boolean).length; return { words, mins: Math.max(1, Math.round(words / 230)) } })()` }]) } catch { return null } }
      case 'clearSiteData': { if (!wc) return; let origin = ''; try { origin = new URL(wc.getURL()).origin } catch { return } await w.ses.clearStorageData({ origin }); try { await w.ses.clearData({ origins: [origin] }) } catch {} wc.reload(); w.send('toast', 'Site data cleared'); return }
      case 'lastTab': { if (w.lastTabId && w.tabs.has(w.lastTabId)) w.activate(w.lastTabId); return }
      case 'pasteGo': { const txt = String(await clipboard.readText() || '').trim().slice(0, 4000); if (txt) { const url = toURL(txt); if (url) w.createTab(url, { active: true }) } return }
      case 'copyText': clipboard.writeText(String(a[0] || '')); return
      case 'duplicateTab': { if (t) w.createTab(wc ? wc.getURL() : t.url, { active: true, index: w.order.indexOf(t.id) + 1 }); return }
      case 'siteAdblock': return toggleSiteAdblock(w, !!a[0])
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
  return { url: t.url, host: origin ? new URL(origin).host : '', secure: /^https:/.test(t.url), permissions: D.permissions.get()[origin] || {}, blocked: t.view ? (blockedByWc.get(t.view.webContents.id) || 0) : 0, adblock: !!D.settings.get('adblock'), adOff: adAllowed(t.view ? t.view.webContents.getURL() : t.url) }
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
    ...(t.pinned ? [] : [
      { label: 'Add to New Group', click: () => w.newGroup([id]) },
      ...(w.groups.size ? [{ label: 'Move to Group', submenu: [...w.groups.values()].filter(g => g.id !== t.group).map(g => ({ label: g.name, click: () => { t.group = g.id; w.regroupOrder(); w.layout(); w.pushState(); saveSession() } })) }] : []),
      ...(t.group ? [{ label: 'Remove from Group', click: () => { t.group = null; w.regroupOrder(); w.pruneGroups(); w.layout(); w.pushState(); saveSession() } }] : []),
      { type: 'separator' },
    ]),
    { label: 'Copy Link', click: () => clipboard.writeText(cleanURL(t.view ? t.view.webContents.getURL() : t.url)) },
    { label: 'Copy All Tab Links', click: () => { clipboard.writeText(w.order.map(i => { const x = w.tabs.get(i); return cleanURL(x.view ? x.view.webContents.getURL() : x.url) }).filter(u => /^https?:/.test(u)).join('\n')); w.send('toast', 'All tab links copied') } },
    { label: 'Bookmark', click: () => { D.addBookmark(t.url, t.title); w.pushState() } },
    { label: 'Move to New Window', enabled: w.order.length > 1, click: () => { const url = t.view ? t.view.webContents.getURL() : t.url; w.closeTab(id); createWindow({ urls: [url] }) } },
    { label: 'Put to Sleep', enabled: !!t.view && id !== w.activeId, click: () => w.sleep(t) },
    { type: 'separator' },
    { label: 'Close Tab', click: () => w.closeTab(id) },
    { label: 'Close Other Tabs', enabled: others.length > 0, click: () => others.filter(i => !w.tabs.get(i).pinned).forEach(i => w.closeTab(i)) },
    { label: D.settings.get('tabLayout') === 'top' ? 'Close Tabs to the Right' : 'Close Tabs Below', click: () => w.order.slice(w.order.indexOf(id) + 1).filter(i => !w.tabs.get(i).pinned).forEach(i => w.closeTab(i)) },
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

const PUBLIC_SETTINGS = ['searchShortcuts', 'rememberZoom', 'soundActiveOnly', 'linksBackground', 'confirmQuit', 'wheelTabs', 'adblockAllow', 'aiModel', 'aiTabGroups', 'browserTheme', 'themeCustom', 'compact', 'appIcon', 'cleanLinks', 'swipeNav', 'videoSpeedKeys', 'hideCookieBanners', 'blockNotifications', 'forceDark', 'translateTo', 'offerTranslate', 'autoPip', 'ntpShortcuts', 'ntpWallpaper', 'ntpClock', 'searchEngine', 'motion', 'theme', 'accent', 'adblock', 'blockTrackers', 'httpsOnly', 'sleepTabsAfterMin', 'restoreSession', 'sidebarCollapsed', 'sidebarWidth', 'tabLayout', 'introSeen', 'autoUpdate', 'askWhereToSave', 'doNotTrack', 'showSuggestions', 'homeTiles']
function publicSettings() { const s = D.settings.get(); return Object.fromEntries(PUBLIC_SETTINGS.map(k => [k, s[k]])) }
function setSetting(k, v) {
  if (!PUBLIC_SETTINGS.includes(k)) return
  if (k === 'tabLayout' && !['side', 'top'].includes(v)) return
  if (k === 'adblockAllow') { if (!Array.isArray(v)) return; v = v.filter(x => typeof x === 'string' && /^[a-z0-9.-]+$/i.test(x)).slice(0, 500) }
  D.settings.set({ [k]: v, ...(!['sidebarCollapsed', 'sidebarWidth', 'introSeen'].includes(k) ? { settingsAt: Date.now() } : {}) })
  if (k === 'adblock') setAdblock(!!v)
  if (k === 'soundActiveOnly' && !v) for (const w of windows) for (const t of w.tabs.values()) if (t.autoMuted && t.view) { t.view.webContents.setAudioMuted(!!t.muted); t.autoMuted = false }
  if (k === 'hideCookieBanners') setupAdblock().then(() => setAdblock(!!D.settings.get('adblock')))
  if (k === 'theme') nativeTheme.themeSource = v
  if (k === 'autoUpdate') Updater.setEnabled(!!v)
  if (k === 'tabLayout') buildMenu()
  if (k === 'appIcon') applyAppIcon()
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
ipcMain.on('nav:swipe', (e, dir) => {
  if (!D.settings.get('swipeNav')) return
  const h = e.sender.navigationHistory
  if (dir === 'back' && h.canGoBack()) h.goBack()
  if (dir === 'forward' && h.canGoForward()) h.goForward()
})
ipcMain.on('peek:open', (e, url) => { const w = winForWc(e.sender.id); if (w && /^https?:/.test(url)) w.openPeek(url) })
ipcMain.on('lumen:qol', e => { e.returnValue = { swipe: !!D.settings.get('swipeNav'), speed: !!D.settings.get('videoSpeedKeys') } })
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
      case 'aiSetKey': return AI.setKey(a[0])
      case 'aiStatus': return { ready: AI.ready() }
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
      case 'passwordHealth': {
        const all = D.listPasswords().map(p => ({ id: p.id, pw: D.revealPassword(p.id) }))
        const counts = {}; for (const p of all) counts[p.pw] = (counts[p.pw] || 0) + 1
        const weak = pw => pw.length < 10 || /^[a-z]+$|^[0-9]+$|^[A-Za-z]+$/.test(pw) || /(password|123456|qwerty|letmein|admin|welcome|iloveyou)/i.test(pw) || new Set(pw).size < 5
        const out = {}; for (const p of all) out[p.id] = { weak: weak(p.pw), reused: counts[p.pw] > 1 }
        return out
      }
      case 'deletePasskey': return Passkeys.remove(a[0])
      case 'revealPassword': {
        if (isMac && systemPreferences.canPromptTouchID && systemPreferences.canPromptTouchID()) {
          try { await systemPreferences.promptTouchID('show a saved password') } catch { return null }
        }
        return D.revealPassword(a[0])
      }
      case 'copyPassword': { const p = D.revealPassword(a[0]); clipboard.writeText(p); setTimeout(async () => { if (String(await clipboard.readText() || '') === p) clipboard.clear() }, 60000); return true }
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
      case 'restart': app.relaunch(); app.quit(); return
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
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { label: 'Quit Lumen', accelerator: 'Cmd+Q', click: () => confirmQuit() },
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
      { label: 'Use Selection for Find', accelerator: 'CmdOrCtrl+E', click: focused(async (w, t) => { const wc = activeWc(w, t); if (!wc) return; const sel = await wc.executeJavaScript('String(getSelection()).slice(0, 200)', true).catch(() => ''); if (sel.trim()) w.send('command', { find: sel.trim() }) }) },
      { label: 'Paste and Go', accelerator: 'CmdOrCtrl+Shift+V', click: focused(async w => { const txt = String(await clipboard.readText() || '').trim().slice(0, 4000); const url = txt && toURL(txt); if (url) { const t = w.active(); if (t && t.view && (t.url || '').startsWith('lumen://newtab')) t.view.webContents.loadURL(url); else w.createTab(url, { active: true }) } }) },
      { label: 'Copy Link as Markdown', accelerator: 'CmdOrCtrl+Alt+C', click: focused((w, t) => { const wc = activeWc(w, t); if (wc) { clipboard.writeText(`[${wc.getTitle().replace(/[\[\]]/g, '')}](${cleanURL(wc.getURL())})`); w.send('toast', 'Markdown link copied') } }) },
      { label: 'Copy Clean Link', accelerator: 'CmdOrCtrl+Shift+C', click: focused((w, t) => { if (t) { clipboard.writeText(cleanURL(t.url)); w.send('toast', 'Clean link copied') } }) },
    ] },
    { label: 'View', submenu: [
      { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: focused((w, t) => activeWc(w, t) && activeWc(w, t).reload()) },
      { label: 'Hard Reload', accelerator: 'CmdOrCtrl+Shift+R', click: focused((w, t) => activeWc(w, t) && activeWc(w, t).reloadIgnoringCache()) },
      { type: 'separator' },
      { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+Shift+S', click: focused(w => w.send('command', 'sidebar')) },
      { label: 'Tabs on Top', type: 'checkbox', checked: D.settings.get('tabLayout') === 'top', accelerator: 'CmdOrCtrl+Alt+S', click: item => setSetting('tabLayout', item.checked ? 'top' : 'side') },
      { label: 'Split View', accelerator: 'CmdOrCtrl+Shift+\\', click: focused(w => w.send('command', 'split')) },
      { label: 'Translate Page', accelerator: isMac ? 'Alt+Cmd+T' : 'Ctrl+Alt+T', click: focused((w, t) => t && translateTab(w, t)) },
      { label: 'Switch to Last Used Tab', accelerator: 'Ctrl+`', click: focused(w => { if (w.lastTabId && w.tabs.has(w.lastTabId)) w.activate(w.lastTabId) }) },
      { label: 'Duplicate Tab', accelerator: 'CmdOrCtrl+Shift+K', click: focused((w, t) => { if (t) w.createTab(t.view ? t.view.webContents.getURL() : t.url, { active: true, index: w.order.indexOf(t.id) + 1 }) }) },
      { label: 'Send Page to Phone', accelerator: 'CmdOrCtrl+Shift+Y', click: focused(w => w.send('command', 'qr')) },
      { label: 'Lumen AI', accelerator: 'CmdOrCtrl+Shift+A', click: focused(w => w.send('command', 'ai')) },
      { label: 'Sort Tabs into Groups', accelerator: 'CmdOrCtrl+Shift+G', click: focused(w => autoGroupWindow(w)) },
      { label: 'Reader Mode', accelerator: 'CmdOrCtrl+Shift+E', click: focused((w, t) => activeWc(w, t) && readerMode(activeWc(w, t))) },
      { label: 'Picture in Picture', accelerator: 'CmdOrCtrl+Shift+P', click: focused(w => w.send('command', 'pip')) },
      { label: 'Take Screenshot', accelerator: 'CmdOrCtrl+Shift+2', click: focused((w, t) => activeWc(w, t) && screenshot(activeWc(w, t))) },
      { type: 'separator' },
      { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: focused((w, t) => t && w.zoom(t.id, 0)) },
      { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: focused((w, t) => t && w.zoom(t.id, 0.5)) },
      { label: 'Zoom In ', accelerator: 'CmdOrCtrl+=', visible: false, click: focused((w, t) => t && w.zoom(t.id, 0.5)) },
      { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: focused((w, t) => t && w.zoom(t.id, -0.5)) },
      { type: 'separator' },
      { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: focused(w => w.send('command', 'shortcuts')) },
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

// ---------------------------------------------------------------- quit guard (only for Cmd+Q, never for updates or shutdown)
function confirmQuit() {
  const n = windows.reduce((a, w) => a + w.tabs.size, 0)
  if (!D.settings.get('confirmQuit') || n < 2) return app.quit()
  const fw = windows.find(w => w.win.isFocused()) || windows[0]
  dialog.showMessageBox(fw ? fw.win : undefined, { type: 'question', buttons: ['Quit', 'Cancel'], defaultId: 0, cancelId: 1, message: `Quit Lumen with ${n} tabs open?`, detail: D.settings.get('restoreSession') !== false ? 'Your tabs will be back next time you open Lumen.' : 'Your tabs will be closed.', checkboxLabel: 'Do not ask again', checkboxChecked: false })
    .then(({ response, checkboxChecked }) => { if (response !== 0) return; if (checkboxChecked) D.settings.set({ confirmQuit: false }); app.quit() })
}

// ---------------------------------------------------------------- remember zoom per site
function applySiteZoom(t) {
  if (!t.view || D.settings.get('rememberZoom') === false) return
  const wc = t.view.webContents, h = siteKey(wc.getURL()); if (!h) return
  const z = (D.settings.get('zoomBySite') || {})[h]
  if (typeof z === 'number' && Math.abs(wc.getZoomLevel() - z) > 0.01) { wc.setZoomLevel(z); t.zoom = z }
  else if (z === undefined && t.zoom) t.zoom = wc.getZoomLevel()
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
      createWindow({ restore: tabs.length ? { tabs, groups: sw.groups || [], active: restore ? sw.active : 0 } : null, bounds: sw.bounds })
    })
  } else createWindow({})
  for (const u of [...argUrls, ...pendingOpen.splice(0)]) openExternalURL(u)
  applyAppIcon()
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

module.exports = { windows, createWindow, D, allowSites, toggleSiteAdblock }
