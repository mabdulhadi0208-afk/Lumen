// Lumen — main process.
const {
  app, BaseWindow, WebContentsView, session, ipcMain, Menu, nativeTheme, protocol, dialog, shell,
  clipboard, webContents, systemPreferences, net, desktopCapturer, nativeImage, powerMonitor, screen, BrowserWindow,
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
const Nova = require('./nova')
const { Store: WStore } = require('./store')
let wallpaperStore
app.whenReady().then(() => { wallpaperStore = new WStore('wallpaper', { image: '' }) })

const isMac = process.platform === 'darwin'
const ROOT = path.join(__dirname, '..')
const ICON = path.join(ROOT, 'build', 'icon.png')

app.setName('Lumen')
app.commandLine.appendSwitch('enable-smooth-scrolling')
protocol.registerSchemesAsPrivileged([
  { scheme: 'lumen', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } },
])

// Clean, plain-Chrome user agent so sites (and Google sign-in) treat Lumen like Chrome.
const ARRIVE_BG = '#05060d'   // the restart screen's ink (ui/update.html and Intro.arrive in ui/intro.js)
// what a window or a view paints before its page does: the Nova porcelain or ink (docs/NOVA.md), never flat grey.
// Private windows are always deep violet ink; Lumen's own pages paint porcelain or ink, web pages white or ink.
const NOVA_BG = { light: '#f5f6fb', dark: '#0a0c15', private: '#0c081a' }
const winBg = (incognito = false) => incognito ? NOVA_BG.private : nativeTheme.shouldUseDarkColors ? NOVA_BG.dark : NOVA_BG.light
const tabBg = (url = '', incognito = false) => {
  const own = !url || /^(lumen|about|chrome):/.test(url)
  if (incognito && own) return NOVA_BG.private
  if (nativeTheme.shouldUseDarkColors) return own ? NOVA_BG.dark : '#0a0c15'
  return own ? NOVA_BG.light : '#ffffff'
}
// Lumen is Chromium, so it says so, exactly the way Chrome does: no Electron or app tokens, and the reduced version
// form real Chrome sends (Chrome/140.0.0.0). A full Electron build number or a mixed identity is what makes Google's
// sign-in say "This browser or app may not be secure".
function chromeUA(ua) { return ua.replace(/\sElectron\/\S+/, '').replace(/\s(Lumen|lumen)\/\S+/, '').replace(/Chrome\/(\d+)\.[\d.]+/, 'Chrome/$1.0.0.0') }
// Compatibility mode, the fallback: on Google's sign-in pages only, present as the current Firefox release.
function firefoxUA() {
  const v = 128 + Math.floor((Date.now() - Date.UTC(2024, 6, 9)) / (28 * 864e5)) - 1
  const os = isMac ? 'Macintosh; Intel Mac OS X 10.15' : 'Windows NT 10.0; Win64; x64'
  return `Mozilla/5.0 (${os}; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`
}
const isGoogleSignIn = url => /^https:\/\/accounts\.google\.com\//.test(url || '')
const googleCompat = () => D.settings.get('googleSignInMode') === 'firefox'

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
let mainSession, extensions = null, blocker = null, addingTab = false, blockedTotal = 0, blockedSaveT = null
// ads and trackers blocked per day (local date -> count), the last two weeks, for the New Tab
let blockedDays = null
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function loadBlockedDays() { if (!blockedDays) { const b = D.settings.get('blockedDays'); blockedDays = b && typeof b === 'object' && !Array.isArray(b) ? { ...b } : {} } return blockedDays }
function bumpBlockedDay() {
  const days = loadBlockedDays(), k = dayKey()
  days[k] = (days[k] || 0) + 1
  const keys = Object.keys(days); if (keys.length > 14) for (const old of keys.sort().slice(0, keys.length - 14)) delete days[old]
}
function blockedWeek() { const days = loadBlockedDays(), out = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push({ day: dayKey(d), n: days[dayKey(d)] || 0 }) } return out }
// the New Tab weather: Open-Meteo for a city the user typed (no key, no location access). Cached for 20 minutes.
const weatherCache = new Map()
async function weatherFor(city) {
  const q = String(city || '').trim().slice(0, 80); if (!q) return null
  const hit = weatherCache.get(q.toLowerCase()); if (hit && Date.now() - hit.at < 20 * 60000) return hit.v
  const get = async u => { const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000); try { const r = await net.fetch(u, { signal: ctrl.signal }); if (!r.ok) throw new Error('http ' + r.status); return await r.json() } finally { clearTimeout(t) } }
  try {
    const g = await get('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' + encodeURIComponent(q))
    const p = g && g.results && g.results[0]; if (!p) return { error: 'notfound' }
    const fahrenheit = ['US', 'LR', 'MM', 'BS', 'KY', 'PW', 'FM', 'MH'].includes(p.country_code)
    const f = await get(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto${fahrenheit ? '&temperature_unit=fahrenheit' : ''}`)
    const c = f && f.current; if (!c) return { error: 'failed' }
    const v = { name: p.name, country: p.country || '', temp: Math.round(c.temperature_2m), code: c.weather_code, day: !!c.is_day, hi: Math.round(f.daily.temperature_2m_max[0]), lo: Math.round(f.daily.temperature_2m_min[0]), unit: fahrenheit ? 'F' : 'C' }
    weatherCache.set(q.toLowerCase(), { at: Date.now(), v }); return v
  } catch { return { error: 'offline' } }
}
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
    if (googleCompat() && isGoogleSignIn(d.url)) {
      h['User-Agent'] = firefoxUA()
      for (const k of Object.keys(h)) if (/^sec-ch-ua/i.test(k)) delete h[k]
    } else if (isGoogleSignIn(d.url)) {
      // 4.2: Chrome mode lists Google Chrome among its brands, the way Chrome does (the page sees the same list)
      for (const k of Object.keys(h)) {
        if (/^sec-ch-ua$/i.test(k) && !/Google Chrome/.test(h[k])) { const m = /"Chromium";v="(\d+)"/.exec(h[k]); if (m) h[k] += `, "Google Chrome";v="${m[1]}"` }
        if (/^sec-ch-ua-full-version-list$/i.test(k) && !/Google Chrome/.test(h[k])) { const m = /"Chromium";v="([\d.]+)"/.exec(h[k]); if (m) h[k] += `, "Google Chrome";v="${m[1]}"` }
      }
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

// The filter lists go stale fast: uBlock's quick fixes, which keep YouTube playing, expire every 8 hours. Lumen starts
// from the saved copy (instant), then fetches fresh lists in the background at launch, every 8 hours and after sleep,
// and swaps them in. If a download fails, the lists it already has keep working.
const ADBLOCK_MAX_AGE = 8 * 3600e3
const adCachePath = () => path.join(app.getPath('userData'), D.settings.get('hideCookieBanners') ? 'adblock-engine-full.bin' : 'adblock-engine.bin')
const adblockAge = () => { try { return Date.now() - fs.statSync(adCachePath()).mtimeMs } catch { return Infinity } }
let adRefreshing = null
function refreshAdblock(force) {
  if (adRefreshing) return adRefreshing
  if (!force && adblockAge() < ADBLOCK_MAX_AGE) return Promise.resolve(false)
  log('adblock: fetching fresh filter lists')
  adRefreshing = setupAdblock({ fresh: true }).finally(() => { adRefreshing = null })
  return adRefreshing
}
// fetch the filter lists (Lumen's network stack, on the main process: it only waits), then parse and serialize them on a
// worker thread: a second or more of CPU that used to freeze the browser at first launch and on every list refresh
async function buildAdblockEngine(full) {
  const A = require('@ghostery/adblocker')
  const fetchImpl = (url, opts) => net.fetch(url, opts)
  const [lists, resources] = await Promise.all([A.fetchLists(fetchImpl, full ? A.fullLists : A.adsAndTrackingLists), A.fetchResources(fetchImpl)])
  const text = lists.join('\n')
  try {
    const { Worker } = require('worker_threads')
    return await new Promise((res, rej) => {
      const wk = new Worker(path.join(__dirname, 'adblock-worker.js'), { workerData: { text, resources } })
      wk.once('message', m => { wk.terminate().catch(() => {}); m && m.ok ? res(m.buf) : rej(new Error(m && m.error || 'adblock worker failed')) })
      wk.once('error', rej)
      wk.once('exit', code => rej(new Error('adblock worker exited ' + code)))
    })
  } catch (e) {
    // no worker threads here: build it the old way (slow, but the lists still work)
    log('adblock: worker failed, parsing on the main thread:', e && e.message)
    const engine = A.FiltersEngine.parse(text, {})
    if (resources !== undefined) engine.updateResources(resources, '' + resources.length)
    return engine.serialize()
  }
}
async function setupAdblock({ fresh = false } = {}) {
  try {
    const { ElectronBlocker } = require('@ghostery/adblocker-electron')
    const full = !!D.settings.get('hideCookieBanners')
    const cache = adCachePath(), tmp = cache + '.new'
    if (fresh) await fs.promises.rm(tmp, { force: true }).catch(() => {})
    let tm
    const timeout = new Promise((_, rej) => { tm = setTimeout(() => rej(new Error('adblock list timeout')), fresh ? 90000 : 15000) })
    const old = blocker
    // the saved engine loads in tens of milliseconds; building one from the lists happens on a worker thread
    const load = async () => {
      if (!fresh) { try { return ElectronBlocker.deserialize(new Uint8Array(await fs.promises.readFile(cache))) } catch {} }
      const buf = await buildAdblockEngine(full)
      await fs.promises.writeFile(fresh ? tmp : cache, buf)
      return ElectronBlocker.deserialize(buf)
    }
    const next = await Promise.race([load(), timeout]).finally(() => clearTimeout(tm))
    if (fresh) { await fs.promises.rename(tmp, cache); log('adblock: fresh filter lists in use') }
    D.settings.set({ adblockUpdatedAt: fresh ? Date.now() : (D.settings.get('adblockUpdatedAt') || (() => { try { return fs.statSync(cache).mtimeMs } catch { return Date.now() } })()) })
    if (old) for (const ses of sessionsReady) { try { if (old.isBlockingEnabled(ses)) old.disableBlockingInSession(ses) } catch {} }
    blocker = next
    allowSites(blocker)
    if (!blockedTotal) blockedTotal = D.settings.get('blockedTotal') || 0
    if (!D.settings.get('statsSince')) D.settings.set({ statsSince: Date.now() })
    blocker.on('request-blocked', req => {
      const id = req.tabId
      if (id == null) return
      blockedByWc.set(id, (blockedByWc.get(id) || 0) + 1)
      blockedTotal++; bumpBlockedDay(); if (!blockedSaveT) blockedSaveT = setTimeout(() => { blockedSaveT = null; D.settings.set({ blockedTotal, blockedDays }) }, 15000)
      // the shield in the toolbar counts the tab in front only: a background tab's blocked requests send nothing
      const w = winForWc(id), a = w && w.active()
      if (a && a.view && !a.view.webContents.isDestroyed() && a.view.webContents.id === id) w.pushStateSoon()
    })
    if (D.settings.get('adblock')) for (const ses of sessionsReady) { try { blocker.enableBlockingInSession(ses) } catch {} }
    return true
  } catch (e) {
    // a failed refresh keeps the lists already in use
    if (fresh) log('adblock: could not refresh the lists, keeping the current ones:', e.message)
    else { console.error('adblock unavailable:', e.message); blocker = null }
    return false
  }
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
        const r = await novaDialog(lastFocused(), {
          type: 'question', buttons: ['Add extension', 'Cancel'], defaultId: 0, cancelId: 1, kind: 'extension', title: 'Extension',
          message: `Add "${d.localizedName}" to Lumen?`,
          detail: 'It will be able to read and change data on the sites it asks for.',
          icon: d.icon || 'puzzle',
        })
        return { action: r.response === 0 ? 'allow' : 'deny' }
      },
    })
  } catch (e) { console.error('extensions unavailable:', e.message) }
}

// ---------------------------------------------------------------- internal pages (lumen://)
const PAGES = ['newtab', 'settings', 'history', 'downloads', 'bookmarks', 'passwords', 'extensions', 'error', 'crashed', 'about', 'parcels', 'readlater']
const INTERNAL_CACHE = new Map()
// 4.2: what the preloaded Settings page can become in place: any Settings section, and the library pages
const SET_SPARE_URL = /^lumen:\/\/(settings\/?(general|appearance|apps|ai|privacy|sync|import|about|passwords|extensions|history|bookmarks|readlater|downloads|parcels)?\/?|history|bookmarks|readlater|downloads|passwords|extensions|parcels)\/?(#[\w-]*)?$/
async function serveInternal(req) {
  const u = new URL(req.url)
  let file
  if (u.host === 'assets' && u.pathname === '/themes.js') { const f = path.join(ROOT, 'ui', 'themes.js'); let b = INTERNAL_CACHE.get(f); if (!b) INTERNAL_CACHE.set(f, b = await fs.promises.readFile(f)); return new Response(b, { headers: { 'content-type': 'text/javascript; charset=utf-8' } }) }
  if (u.host === 'assets' && u.pathname === '/jelly.js') { const f = path.join(ROOT, 'ui', 'jelly.js'); let b = INTERNAL_CACHE.get(f); if (!b) INTERNAL_CACHE.set(f, b = await fs.promises.readFile(f)); return new Response(b, { headers: { 'content-type': 'text/javascript; charset=utf-8' } }) }
  if (u.host === 'assets' && u.pathname === '/icons.js') { const f = path.join(ROOT, 'ui', 'icons.js'); let b = INTERNAL_CACHE.get(f); if (!b) INTERNAL_CACHE.set(f, b = await fs.promises.readFile(f)); return new Response(b, { headers: { 'content-type': 'text/javascript; charset=utf-8' } }) }
  if (u.host === 'assets') file = path.join(ROOT, 'pages', path.normalize(u.pathname).replace(/^(\.\.[/\\])+/, ''))
  else if (PAGES.includes(u.host)) file = path.join(ROOT, 'pages', 'app.html')
  else file = path.join(ROOT, 'pages', 'app.html')
  if (!file.startsWith(path.join(ROOT, 'pages'))) return new Response('Not found', { status: 404 })
  try {
    // 4.2: Lumen's own files are read once and kept in memory (they never change while Lumen runs), so a page asks
    // the disk for nothing when it opens
    let body = INTERNAL_CACHE.get(file)
    if (!body) { body = await fs.promises.readFile(file); if (body.length < 4e6) INTERNAL_CACHE.set(file, body) }
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
      novaDialog(winForWc(wc.id) || lastFocused(), { type: 'question', buttons: ['Open', 'Cancel'], defaultId: 0, cancelId: 1, kind: 'external', icon: 'link', message: 'Open this link in another app?', detail: ext }).then(r => callback(r.response === 0), () => callback(false))
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
  spareChanged()
  d._item = item
  const push = () => broadcast('downloads', listDownloads())
  item.on('updated', (ev, state) => {
    d.received = item.getReceivedBytes(); d.total = item.getTotalBytes(); d.state = state === 'interrupted' ? 'interrupted' : 'progressing'
    d.paused = item.isPaused(); if (!d.path) { d.path = item.getSavePath(); d.name = path.basename(d.path) || d.name }
    pushSoon()
  })
  item.once('done', (ev, state) => {
    d.state = state; d.received = item.getReceivedBytes(); d.path = item.getSavePath(); d.name = path.basename(d.path) || d.name
    dlExists.delete(d.path)
    delete d._item
    if (state === 'completed' && isMac) app.dock && app.dock.downloadFinished(d.path)
    push()
  })
  let t; const pushSoon = () => { if (!t) t = setTimeout(() => { t = null; push() }, 200) }
  push()
  const w = winForWc(wc && wc.id) || lastFocused()
  if (w) w.send('download-started', d.id)
}
// whether each file is still on disk: looked up at most every few seconds per file (the list goes to the chrome five
// times a second while something downloads, and it was a synchronous disk check for each of up to 100 files)
const dlExists = new Map()
function fileExists(p) {
  if (!p) return false
  const hit = dlExists.get(p), now = Date.now()
  if (hit && now - hit.at < 4000) return hit.v
  let v = false; try { v = fs.existsSync(p) } catch {}
  dlExists.set(p, { at: now, v }); if (dlExists.size > 300) dlExists.delete(dlExists.keys().next().value)
  return v
}
const listDownloads = () => downloads.slice(0, 100).map(({ _item, ...d }) => ({ ...d, exists: d.state === 'progressing' ? false : fileExists(d.path) }))

// ---------------------------------------------------------------- windows & tabs
const windows = []
let tabSeq = 0, incognitoSeq = 0
// spareGen goes up whenever something the New Tab page shows changes, so a preloaded New Tab knows it is out of date
let spareGen = 0
// banner dots on lumen:// pages only move while someone can see them: 'lm-away' pauses them (app in the background,
// or a preloaded New Tab waiting off screen). Off-screen scrolling and hidden tabs are handled in the page itself.
function setAway(wc, away) { try { if (wc && !wc.isDestroyed() && (wc.getURL() || '').startsWith('lumen://')) wc.executeJavaScript(`document.documentElement.classList.toggle('lm-away', ${!!away})`, true).catch(() => {}) } catch {} }
function spareChanged() { spareGen++; for (const w of windows) w.refreshSpareSoon() }
for (const st of [D.bookmarks, D.readLater, D.archive, D.highlights, D.historyStore]) st.onChange(spareChanged)
{ // settings: everything but the ad counters, which tick all the time while browsing
  const sig = d => { try { const { blockedTotal, blockedDays, adblockUpdatedAt, ...r } = d || {}; return JSON.stringify(r) } catch { return '' } }
  let last = sig(D.settings.get())
  D.settings.onChange(d => { const n = sig(d); if (n !== last) { last = n; spareChanged() } })
}
const closedTabs = []
// history changes go to the chrome's own copy (it searches history as you type without asking): batched, and a
// big batch becomes "reload it"
let histOps = [], histT = null
D.onHistory(op => {
  histOps.push(op)
  if (histT) return
  histT = setTimeout(() => {
    histT = null
    const ops = histOps.length > 300 || histOps.some(o => o[0] === 'reset') ? [['reset']] : histOps
    histOps = []
    broadcast('hist', ops)
  }, 120)
})
// goes up whenever the bookmarks change, so the chrome's bookmarks bar fetches them only then
let bmRev = 0
D.bookmarks.onChange(() => { bmRev++; for (const w of windows) w.pushStateSoon() })

function lastFocused() {
  const f = BaseWindow.getFocusedWindow()
  return windows.find(w => w.win === f) || windows[windows.length - 1] || null
}
// which window a webContents belongs to: remembered when a tab's view is made (this runs for every blocked request)
const wcOwner = new Map()
function winForWc(wcId) {
  if (wcId == null) return null
  const known = wcOwner.get(wcId)
  if (known && windows.includes(known)) return known
  return windows.find(w => w.ui.webContents.id === wcId || (w.spare && w.spare.view && !w.spare.view.webContents.isDestroyed() && w.spare.view.webContents.id === wcId) || [...w.tabs.values()].some(t => t.view && !t.view.webContents.isDestroyed() && t.view.webContents.id === wcId)) || null
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
      // right after an update it opens in the same ink the restart screen ended on, never grey
      backgroundColor: Updater.arriving() ? ARRIVE_BG : winBg(incognito),
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
    this.arrived = !incognito && Updater.arriving()
    const arrive = !incognito && Updater.arriving() ? { arrive: app.getVersion(), aicon: String(D.settings.get('appIcon') || 'default'), aacc: String(D.settings.get('accent') || '') } : {}
    this.ui.webContents.loadFile(path.join(ROOT, 'ui', 'index.html'), { query: { incognito: incognito ? '1' : '0', platform: process.platform, ...arrive } })
    const fit = () => { const [w, h] = this.win.getContentSize(); this.ui.setBounds({ x: 0, y: 0, width: w, height: h }); if (this.fullscreenTab) this.layout() }
    fit()
    this.win.on('resize', fit)
    this.win.on('enter-full-screen', () => { this.send('fullscreen', true); this.pushStateSoon() })
    this.win.on('leave-full-screen', () => { this.send('fullscreen', false); if (this.fullscreenTab) { this.fullscreenTab = false; this.layout() } })
    this.win.on('focus', () => { const t = this.active(); if (t && t.view && !this.overlay) t.view.webContents.focus(); if (t && t.view) setAway(t.view.webContents, false) })
    this.win.on('blur', () => { const t = this.active(); if (t && t.view) setAway(t.view.webContents, true) })
    this.win.on('close', () => { saveSessionNow() })
    this.win.on('closed', () => {
      if (this.peek && !this.peek.webContents.isDestroyed()) this.peek.webContents.close()   // a peeked video must not keep playing
      for (const t of this.tabs.values()) this.destroyView(t)
      this.dropSpare(); this.dropSetSpare(); clearTimeout(this._setT)
      if (!this.ui.webContents.isDestroyed()) this.ui.webContents.close()
      windows.splice(windows.indexOf(this), 1)
      saveSession()
    })
    // shown as soon as the chrome's document is ready (its scripts have run), not when every image in it has loaded:
    // restored tabs' and bookmarks' favicons come over the network and held the window back for seconds. Until the
    // chrome paints, the window shows its Nova background, as designed.
    let shown = false
    const ready = () => { if (shown || this.win.isDestroyed()) return; shown = true; this.win.show(); this.pushState(); setTimeout(() => Nova.prewarm(this), 1500); setTimeout(() => this.warmSpare(), 2600); this._setT = setTimeout(() => this.warmSetSpare(), 7000) }
    this.ui.webContents.once('dom-ready', ready)
    this.ui.webContents.once('did-finish-load', ready)
    this.ui.webContents.on('did-start-loading', () => { this._lastState = null; this._hover = undefined })
    this.ui.webContents.on('render-process-gone', () => { this._lastState = null; setTimeout(() => { if (!this.ui.webContents.isDestroyed()) this.ui.webContents.reload() }, 300) })
    this.ui.webContents.on('before-input-event', (e, input) => this.handleKeys(e, input))
    windows.push(this)
  }

  send(ch, data) { if (!this.ui.webContents.isDestroyed()) this.ui.webContents.send(ch, data) }
  // the link under the pointer: only when it changes (every tab switch cleared it again, every hover repeated it)
  hoverURL(u) { u = u || ''; if (u === this._hover) return; this._hover = u; this.send('hover-url', u) }
  active() { return this.tabs.get(this.activeId) }
  tabByWc(id) { return [...this.tabs.values()].find(t => t.view && !t.view.webContents.isDestroyed() && t.view.webContents.id === id) }

  createTab(url = 'lumen://newtab', { active = true, pinned = false, index = null, title = '', favicon = '', asleep = false, openerId = null } = {}) {
    // a New Tab takes the preloaded one when it is ready: the page is already drawn, so it shows at once
    const sp = url === 'lumen://newtab' && !asleep ? this.takeSpare() : !asleep && SET_SPARE_URL.test(url) ? this.takeSetSpare() : null
    const t = sp || { url, title: title || '', favicon, loading: false, audible: false, muted: false, asleep: false, crashed: false, view: null, zoom: 0, canBack: false, canForward: false }
    Object.assign(t, { id: ++tabSeq, pinned, lastActive: Date.now(), opener: openerId })
    if (sp) { delete t.spare; if (title) t.title = title }
    // Reload Every: setting it starts the reload clock (which stops by itself once no tab uses it)
    let re = 0
    Object.defineProperty(t, 'reloadEvery', { configurable: true, enumerable: true, get: () => re, set: v => { re = v; if (v) watchAutoReload() } })
    this.tabs.set(t.id, t)
    let idx = index
    if (idx == null) {
      if (openerId && this.order.includes(openerId)) {
        idx = this.order.indexOf(openerId) + 1
        while (idx < this.order.length && this.tabs.get(this.order[idx]).opener === openerId) idx++
      } else idx = this.order.length
    }
    this.order.splice(idx, 0, t.id)
    if (sp && sp.setSpare) this.adoptSetSpare(t, url)
    else if (sp) this.adoptSpare(t)
    else if (asleep && !active) { t.asleep = true }
    else this.makeView(t)
    if (active) this.activate(t.id)
    else this.pushState()
    saveSession()
    return t
  }

  // ---- the preloaded New Tab (Chrome does the same): one hidden lumen://newtab per window, loaded and drawn ahead of
  // time at the size of the page area. It is never on screen and never in the tab strip until a New Tab takes it.
  // When what it shows changes (history, bookmarks, settings and so on) it redraws itself in the background.
  warmSpare() {
    clearTimeout(this._spareT); this._spareT = null
    if (this.win.isDestroyed() || this.spare || process.env.LUMEN_NO_SPARE === '1') return
    const t = { id: 0, spare: true, url: 'lumen://newtab', title: '', favicon: '', pinned: false, loading: false, audible: false, muted: false, asleep: false, crashed: false, lastActive: 0, view: null, zoom: 0, canBack: false, canForward: false, opener: null }
    this.spare = t
    t.gen = spareGen; t.readyAt = 0
    this.makeView(t)
    // it stays attached (so it is drawn and kept drawn, like any visible page) but under everything and just outside the
    // window, at the page area's exact size: taking it is then only a move, no layout and no first paint
    // drawn once at the page area's size and kept off the window: attaching it (even off screen) broke keyboard input in
    // the visible tab's menus, so it waits detached and is drawn the moment it is taken
    t.view.setBounds({ x: 0, y: 0, width: Math.max(1, this.rect.width), height: Math.max(1, this.rect.height) })
    const wc = t.view.webContents
    wc.once('render-process-gone', () => { if (this.spare === t) this.dropSpare() })
    wc.once('did-finish-load', () => this.spareWhenDrawn(t))
  }
  placeSpare() {
    const t = this.spare; if (!t || !t.view || process.env.LUMEN_SPARE_PEEK !== '1') return
    try { this.win.contentView.addChildView(t.view, 0) } catch {}
    const r = this.rect, w = Math.max(1, r.width), h = Math.max(1, r.height)
    // On macOS a view outside the window is still a visible page to Chromium, so it keeps its drawn frame; Windows and
    // Linux count it as covered and let it rest, and it is then drawn the moment it is taken. LUMEN_SPARE_PEEK (tests on
    // Linux only) leaves one row of it under the chrome so it stays drawn there too, to measure the drawn case.
    const peek = process.env.LUMEN_SPARE_PEEK === '1'
    try { t.view.setBounds(peek ? { x: r.x, y: r.y - 1, width: w, height: h } : { x: -w - 400, y: r.y, width: w, height: h }); t.view.setVisible(true) } catch {}
  }
  // ready once the page has drawn its widgets (a short poll right after it loads, then nothing)
  spareWhenDrawn(t, tries = 0) {
    if (this.spare !== t || !t.view || t.view.webContents.isDestroyed()) return
    t.view.webContents.executeJavaScript(`!!(document.querySelector('#ntp') && document.querySelector('#widgets [data-w]'))`, true).then(ok => {
      if (this.spare !== t) return
      if (ok) { t.readyAt = Date.now(); setAway(t.view.webContents, true); if (t.gen !== spareGen) this.refreshSpareSoon(); return }
      if (tries < 50) setTimeout(() => this.spareWhenDrawn(t, tries + 1), 120)
    }).catch(() => {})
  }
  takeSpare() {
    const t = this.spare
    if (!t) return null
    const fresh = t.readyAt && t.gen === spareGen && t.view && !t.view.webContents.isDestroyed() && !t.crashed && !t.loading && (t.url || '').startsWith('lumen://newtab')
    if (!fresh) { if (t.readyAt || t.crashed) this.dropSpare(); return null }   // out of date: this New Tab loads the usual way
    this.spare = null
    clearTimeout(this._spareRT); this._spareRT = null
    setImmediate(() => setAway(t.view && t.view.webContents, !this.win.isFocused()))
    return t
  }
  adoptSpare(t) {
    const wc = t.view.webContents
    // on top of everything (it was underneath); activate() then moves it into the page area
    try { this.win.contentView.addChildView(t.view) } catch {}
    t.adopted = true
    setImmediate(() => {
      if (wc.isDestroyed()) return
      if (extensions && !this.incognito) { addingTab = true; try { extensions.addTab(wc, this.win) } catch {} finally { addingTab = false } }
      // a light entrance that starts from what is already on screen (nothing fades in from invisible)
      wc.executeJavaScript(`(() => { if (document.body.dataset.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches) return; const e = 'cubic-bezier(.3,1.3,.5,1)'; const h = document.getElementById('hero'); if (h) h.animate([{ transform: 'translateY(6px) scale(.992)' }, { transform: 'none' }], { duration: 620, easing: e }); [...document.querySelectorAll('#widgets > [data-w]')].forEach((c, i) => c.animate([{ transform: 'translateY(10px)' }, { transform: 'none' }], { duration: 640, delay: 40 + Math.min(i, 10) * 35, easing: e, fill: 'backwards' })); const q = document.getElementById('q'); if (q && document.activeElement !== q) q.focus({ preventScroll: true }) })()`, true).catch(() => {})
    })
    // the next one is made once this one is on screen and things are quiet
    this._spareT = setTimeout(() => this.warmSpare(), 2500)
  }
  // ---- 4.2: a preloaded Settings page too, so Cmd , opens it at once. Made a while after the New Tab one, when Lumen
  // is quiet; it renders afresh from the current settings the moment it is taken, so it is never out of date.
  warmSetSpare() {
    clearTimeout(this._setT); this._setT = null
    if (this.win.isDestroyed() || this.setSpare || this.incognito || process.env.LUMEN_NO_SPARE === '1') return
    const t = { id: 0, spare: true, setSpare: true, url: 'lumen://settings/?spare=1', title: 'Settings', favicon: '', pinned: false, loading: false, audible: false, muted: false, asleep: false, crashed: false, lastActive: 0, view: null, zoom: 0, canBack: false, canForward: false, opener: null }
    this.setSpare = t; t.readyAt = 0
    this.makeView(t)
    t.view.setBounds({ x: 0, y: 0, width: Math.max(1, this.rect.width), height: Math.max(1, this.rect.height) })
    const wc = t.view.webContents
    wc.once('render-process-gone', () => { if (this.setSpare === t) this.dropSetSpare() })
    wc.once('did-finish-load', () => {
      const check = (n = 0) => wc.isDestroyed() || this.setSpare !== t ? 0 : wc.executeJavaScript(`!!(document.querySelector('.shell .nav') && document.querySelector('#main') && typeof window.__lumenGo === 'function')`, true).then(ok => { if (ok) { t.readyAt = Date.now(); setAway(wc, true) } else if (n < 50) setTimeout(() => check(n + 1), 120) }).catch(() => {})
      check()
    })
  }
  takeSetSpare() {
    const t = this.setSpare
    if (!t || !t.readyAt || !t.view || t.view.webContents.isDestroyed() || t.crashed || t.loading) return null
    this.setSpare = null
    setImmediate(() => setAway(t.view && t.view.webContents, !this.win.isFocused()))
    return t
  }
  adoptSetSpare(t, url) {
    const wc = t.view.webContents
    delete t.setSpare
    t.url = url || 'lumen://settings/general'   // never the preload's own address (a restored session would reopen it empty)
    try { this.win.contentView.addChildView(t.view) } catch {}
    t.adopted = true
    // fresh settings, drawn in place (the sidebar stays, the page beside it springs in like any section switch)
    wc.executeJavaScript(`(async () => { try { const i = await lumen.invoke('settings'); if (i && i.settings) { S = i.settings; applyLook(S) } } catch {} window.__lumenGo(${JSON.stringify(url || 'lumen://settings/general')}, true); return true })()`, true).catch(() => {})
    // the next one is made a few seconds later, so History right after Settings is instant too
    this._setT = setTimeout(() => this.warmSetSpare(), 3500)
  }
  dropSetSpare() {
    const t = this.setSpare; this.setSpare = null
    if (t && t.view) { try { this.win.contentView.removeChildView(t.view) } catch {} try { if (!t.view.webContents.isDestroyed()) t.view.webContents.close({ waitForBeforeUnload: false }) } catch {} t.view = null }
  }
  dropSpare() {
    const t = this.spare; this.spare = null
    clearTimeout(this._spareRT); this._spareRT = null
    if (t && t.view) { try { this.win.contentView.removeChildView(t.view) } catch {} try { if (!t.view.webContents.isDestroyed()) t.view.webContents.close({ waitForBeforeUnload: false }) } catch {} t.view = null }
    if (!this.win.isDestroyed() && !this._spareT) this._spareT = setTimeout(() => this.warmSpare(), 1500)
  }
  // redraw the hidden New Tab when its data changed: a moment after the change, at most every few seconds. It loads
  // afresh (the page keeps its own copy of the settings, so a redraw in place could show old ones)
  refreshSpareSoon() {
    const t = this.spare
    if (!t || !t.readyAt || this._spareRT) return
    const wait = Math.max(1200, 4000 - (Date.now() - (t.refreshedAt || 0)))
    this._spareRT = setTimeout(() => {
      this._spareRT = null
      if (this.spare !== t || !t.view || t.view.webContents.isDestroyed()) return
      const wc = t.view.webContents
      t.refreshedAt = Date.now(); t.readyAt = 0; t.gen = spareGen
      wc.once('did-finish-load', () => this.spareWhenDrawn(t))
      wc.reload()
    }, wait)
  }

  makeView(t) {
    const view = new WebContentsView({
      webPreferences: { session: this.ses, sandbox: true, contextIsolation: true, plugins: true, spellcheck: true, scrollBounce: false, autoplayPolicy: 'no-user-gesture-required' },
    })
    view.setBorderRadius(this.fullscreenTab ? 0 : 10)
    view.setBackgroundColor(tabBg(t.url, this.incognito))
    t.view = view; t.asleep = false
    const wc = view.webContents
    { const id = wc.id; wcOwner.set(id, this); wc.once('destroyed', () => { if (wcOwner.get(id) === this) wcOwner.delete(id) }) }
    // the colour under the page follows what it is (a Lumen page or a web page), so nothing flashes on the way in
    wc.on('did-start-navigation', e => { if (e.isMainFrame && !e.isSameDocument) { try { view.setBackgroundColor(tabBg(e.url, this.incognito)) } catch {} } })
    // the extensions library marks every added tab as active; ignore that so background tabs stay in the background
    if (extensions && !this.incognito && !t.spare) { addingTab = true; try { extensions.addTab(wc, this.win) } catch {} finally { addingTab = false } }
    const upd = () => { if (!t.spare) this.pushStateSoon(this.activeId === t.id || this.splitId === t.id) }
    wc.on('page-title-updated', (e, title) => { t.title = title; D.updateHistoryTitle(wc.getURL(), title); upd() })
    wc.on('page-favicon-updated', (e, icons) => { t.favicon = icons[icons.length - 1] || icons[0] || ''; upd() })
    wc.on('did-start-loading', () => { t.loading = true; t.crashed = false; upd() })
    wc.on('did-stop-loading', () => { t.loading = false; upd() })
    wc.on('did-finish-load', () => {
      offerTranslate(this, t).catch(() => {}); darkPage(wc); paintHighlights(wc); parcelPage(this, t); googleBlockCheck(this, t); siteIconScan(this, t, wc)
      // the reading time is only shown for the tab in front: a background tab counts its words when it comes forward
      // (reading the text of every paragraph forces the page to lay out)
      if (this.activeId === t.id || this.splitId === t.id) { t.readDue = false; readingTime(this, t) } else { t.readMin = 0; t.readDue = true }
    })
    wc.on('did-navigate-in-page', () => googleBlockCheck(this, t))
    wc.on('did-navigate', () => darkKeys.delete(wc.id))
    wc.on('did-stop-loading', () => setTimeout(() => { if (this.activeId === t.id) snapTab(t) }, 350))
    wc.once('destroyed', () => darkKeys.delete(wc.id))
    wc.on('dom-ready', () => darkPage(wc))
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
      if (t.spare) return
      if (!this.incognito) { D.addHistory(t.url, wc.getTitle()); if (/^https?:/.test(t.url)) spareChanged() }
      applySiteZoom(t)
      if (t.translated) t.translated = false
      upd(); saveSession()
    }
    wc.on('did-navigate', nav)
    wc.on('did-navigate-in-page', (e, url, isMain) => { if (isMain) nav() })
    wc.on('did-fail-load', (e, code, desc, url, isMain) => {
      if (!isMain || code === -3 || code === -27) return
      t.loading = false
      wc.loadURL(`lumen://error/?code=${code}&desc=${encodeURIComponent(desc)}&url=${encodeURIComponent(url)}`)
    })
    wc.on('render-process-gone', (e, d) => {
      if (d.reason === 'clean-exit') return
      t.crashed = true; t.loading = false; upd()
      // show Lumen's crashed page in the tab, with the address it was on, so one click brings it back
      const was = (() => { try { return wc.getURL() } catch { return '' } })() || t.url || ''
      if (/^lumen:\/\/crashed/.test(was)) return
      t.crashedUrl = was
      setTimeout(() => {
        if (wc.isDestroyed() || !this.tabs.has(t.id) || t.view !== view) return
        wc.loadURL('lumen://crashed/?url=' + encodeURIComponent(was) + '&reason=' + encodeURIComponent(d.reason || '')).then(() => { t.crashed = true; upd() }, () => {})
      }, 120)
    })
    wc.on('unresponsive', () => { t.hung = true; upd() })
    wc.on('responsive', () => { t.hung = false; upd() })
    wc.on('audio-state-changed', e => { t.audible = e.audible; upd() })
    wc.on('media-started-playing', () => { t.playing = true; t.mediaAt = Date.now(); upd() })
    wc.on('media-paused', () => { t.playing = false; t.mediaAt = Date.now(); upd() })
    wc.on('update-target-url', (e, url) => { if (this.activeId === t.id) this.hoverURL(url) })
    wc.on('found-in-page', (e, r) => this.send('find-result', { active: r.activeMatchOrdinal, total: r.matches }))
    wc.on('zoom-changed', (e, dir) => { this.zoom(t.id, dir === 'in' ? 0.5 : -0.5) })
    wc.on('enter-html-full-screen', () => { this.fullscreenTab = true; if (!this.win.isFullScreen()) this.win.setFullScreen(true); this.layout() })
    wc.on('leave-html-full-screen', () => { this.fullscreenTab = false; this.layout() })
    wc.on('context-menu', (e, params) => this.contextMenu(t, params))
    wc.on('before-input-event', (e, input) => this.handleKeys(e, input))
    // a site's popup window gets the same rule as its tab: it can never open Lumen's internal pages
    wc.on('did-create-window', win => {
      const guard = (e, u) => { if (String(u).startsWith('lumen://')) e.preventDefault() }
      win.webContents.on('will-navigate', guard); win.webContents.on('will-redirect', guard)
      win.webContents.setWindowOpenHandler(d => d.url.startsWith('lumen://') ? { action: 'deny' } : { action: 'allow' })
    })
    wc.setWindowOpenHandler(d => {
      if (d.url.startsWith('lumen://') && !wc.getURL().startsWith('lumen://')) return { action: 'deny' }
      if (d.disposition === 'new-window' && d.features) {
        return { action: 'allow', overrideBrowserWindowOptions: { width: 520, height: 680, autoHideMenuBar: true, backgroundColor: winBg(this.incognito), webPreferences: { session: this.ses } } }
      }
      const bg = d.disposition === 'background-tab' || (D.settings.get('linksBackground') && d.disposition === 'foreground-tab')
      this.createTab(d.url, { active: !bg, openerId: t.id })
      return { action: 'deny' }
    })
    // "Leave this page?": when Lumen itself started the navigation (address bar, Back, Forward, Reload) the page stays
    // put for now, a Nova dialog asks, and Leave redoes the navigation. A link the page itself follows has no target
    // Lumen can redo, so that one still asks the quick system way.
    for (const fn of ['loadURL', 'reload', 'reloadIgnoringCache']) {
      const orig = wc[fn].bind(wc)
      wc[fn] = (...a) => { t.intent = { at: Date.now(), redo: () => orig(...a) }; return orig(...a) }
    }
    const nh = wc.navigationHistory
    for (const fn of ['goBack', 'goForward', 'goToIndex', 'goToOffset']) {
      if (!nh || typeof nh[fn] !== 'function') continue
      const orig = nh[fn].bind(nh)
      try { nh[fn] = (...a) => { t.intent = { at: Date.now(), redo: () => orig(...a) }; return orig(...a) } } catch {}
    }
    wc.on('will-prevent-unload', e => {
      if (t.leaveOK && Date.now() - t.leaveOK < 5000) { t.leaveOK = 0; e.preventDefault(); return }
      const it = t.intent && Date.now() - t.intent.at < 2000 ? t.intent : null
      t.intent = null
      if (!it) {
        const r = dialog.showMessageBoxSync(this.win, { type: 'question', buttons: ['Leave', 'Stay'], message: 'Leave this page?', detail: 'Changes you made may not be saved.', defaultId: 0, cancelId: 1 })
        if (r === 0) e.preventDefault()
        return
      }
      novaDialog(this, { buttons: ['Leave', 'Stay'], defaultId: 0, cancelId: 1, kind: 'leave', icon: 'leave', message: 'Leave this page?', detail: 'Changes you made may not be saved.' })
        .then(r => { if (r.response === 0 && !wc.isDestroyed()) { t.leaveOK = Date.now(); try { it.redo() } catch {} } }).catch(() => {})
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
    const fresh = t.adopted; t.adopted = false   // a just-taken New Tab: nothing to undo in it, and the rest can wait a frame
    if (t.view && !t.asleep && !fresh) t.view.webContents.executeJavaScript('document.pictureInPictureElement && document.exitPictureInPicture()', true).catch(() => {})
    if (this.splitId) {
      if (id === this.splitId) this.splitId = this.activeId
      else if (id !== this.activeId) this.splitId = null
    }
    if (this.activeId && this.activeId !== id) { this.lastTabId = this.activeId; snapTab(this.tabs.get(this.activeId)) }
    this.activeId = id
    t.lastActive = Date.now()
    if (t.offerLater) { t.offerLater = false; setTimeout(() => offerTranslate(this, t).catch(() => {}), 400) }
    if (t.readDue) { t.readDue = false; setTimeout(() => { if (this.tabs.has(t.id)) readingTime(this, t) }, 250) }
    if (D.settings.get('soundActiveOnly')) for (const o of this.tabs.values()) if (o.view && o.id !== id && o.id !== this.splitId) { o.view.webContents.setAudioMuted(true); o.autoMuted = true }
    if (t.autoMuted && t.view) { t.view.webContents.setAudioMuted(!!t.muted); t.autoMuted = false }
    if (!t.view) this.makeView(t)
    this.layout()
    if (!this.overlay) t.view.webContents.focus()
    if (extensions && !this.incognito) { const wc = t.view.webContents; const sel = () => { try { if (!wc.isDestroyed() && this.activeId === t.id) extensions.selectTab(wc) } catch {} }; if (fresh) setImmediate(sel); else sel() }
    if (fresh) setImmediate(() => this.hoverURL('')); else this.hoverURL('')
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
      const [cw, ch] = this.win.getContentSize()
      const r = this.focusMode && !this.focusPeek ? { x: 0, y: 0, width: cw, height: ch } : this.rect
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
        a.view.setBorderRadius(r === this.rect ? 10 : 0)
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
    this.placeSpare()
    Nova.restack(this)
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
    v.setBackgroundColor(tabBg(url, this.incognito))
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

  // quiet: raise the UI above the page without taking keyboard focus (used for hover cards)
  setOverlay(on, quiet = false) {
    if (this.overlay === on) return
    this.overlay = on
    if (on) { this.win.contentView.addChildView(this.ui); Nova.restack(this); this.quietOverlay = quiet; if (!quiet) this.ui.webContents.focus() }
    else {
      this.win.contentView.addChildView(this.ui, 0)
      this.layout()
      if (!this.quietOverlay) { const a = this.active(); if (a && a.view) a.view.webContents.focus() }
      this.quietOverlay = false
    }
  }

  closeTab(id, { undo = false } = {}) {
    const t = this.tabs.get(id)
    if (!t) return
    const url = t.view ? t.view.webContents.getURL() : t.url
    if (!this.incognito && url && url !== 'lumen://newtab/') closedTabs.push({ url, title: t.title, index: this.order.indexOf(id), pinned: t.pinned })
    if (closedTabs.length > 30) closedTabs.shift()
    if (/^https?:/.test(url || '')) spareChanged()
    AIHost.tabClosed(this, id); Agent.tabClosed(id)
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
    thumbQueue.delete(t); t.thumbImg = null
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
      winFull: this.win.isFullScreen(), url: a ? a.url : '', zoom: a ? Math.round(Math.pow(1.2, a.zoom || 0) * 100) : 100,
      bookmarked: a ? D.isBookmarked(a.url) : false,
      blocked: awc ? (blockedByWc.get(awc.id) || 0) : 0,
      translated: !!(a && a.translated),
      readMin: (a && a.readMin) || 0,
      reloadEvery: (a && a.reloadEvery) || 0,
      adOff: a ? adAllowed(awc ? awc.getURL() : a.url) : false,
      secure: a ? /^(https|lumen):/.test(a.url) : true,
      closedCount: closedTabs.length,
      bmRev,
    }
  }
  // the chrome re-renders on every state it gets, so an update identical to the last one is not sent
  pushState() {
    clearTimeout(this._pst); this._pst = null
    const s = this.serialize(); let sig = null
    try { sig = JSON.stringify(s) } catch {}
    if (sig && sig === this._lastState) return
    // while the chrome is still loading a message can arrive before it listens: remember nothing until it has loaded
    let loading = true; try { loading = this.ui.webContents.isLoading() } catch {}
    this._lastState = loading ? null : sig
    this.send('state', s)
  }
  // background changes are gathered for 50 ms; fast (the tab in front loading, navigating, changing title) goes out
  // on the next turn of the event loop, so the toolbar answers within the same frame
  pushStateSoon(fast) {
    if (this._pst && (!fast || this._pstFast)) return
    clearTimeout(this._pst); this._pstFast = !!fast
    this._pst = setTimeout(() => this.pushState(), fast ? 0 : 50)
  }

  async contextMenu(t, p) {
    const wc = t.view.webContents
    const items = []
    const web = /^https?:/.test(wc.getURL()) && !this.incognito
    // right-clicked on a highlight: offer to recolor or remove it
    const hitId = web && D.highlights.get().length ? await HL.hit(wc, Math.round(p.x / (wc.getZoomFactor() || 1)), Math.round(p.y / (wc.getZoomFactor() || 1))) : null
    if (wc.isDestroyed()) return
    if (hitId) {
      items.push({ label: 'Highlight Color', submenu: Object.keys(HL.COLORS).map(c => ({ label: c[0].toUpperCase() + c.slice(1), type: 'radio', checked: (D.highlights.get().find(h => h.id === hitId) || {}).color === c, click: () => recolorHighlight(wc, hitId, c) })) })
      items.push({ label: 'Remove Highlight', click: () => removeHighlight(hitId, wc) }, { type: 'separator' })
    }
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
      if (Parcels.looksLikeTracking(p.selectionText.trim()) && p.selectionText.trim().length < 40) items.push({ label: `Track Parcel ${Parcels.clean(p.selectionText)} (${Parcels.carrierName(Parcels.detect(p.selectionText))})`, click: () => trackNumber(this, p.selectionText.trim(), wc.getURL()) })
      if (web) items.push({ label: 'Highlight', submenu: Object.keys(HL.COLORS).map(c => ({ label: c[0].toUpperCase() + c.slice(1), click: () => addHighlight(this, t, c) })) })
      if (/^https?:/.test(wc.getURL()) && p.selectionText.trim().length < 300) items.push({ label: 'Copy Link to Highlight', click: () => { const u = cleanURL(wc.getURL()).split('#')[0]; const txt = p.selectionText.trim().replace(/\s+/g, ' '); const words = txt.split(' '); const frag = words.length > 8 ? encodeURIComponent(words.slice(0, 4).join(' ')).replace(/-/g, '%2D') + ',' + encodeURIComponent(words.slice(-4).join(' ')).replace(/-/g, '%2D') : encodeURIComponent(txt).replace(/-/g, '%2D'); clipboard.writeText(u + '#:~:text=' + frag); this.send('toast', 'Link to highlight copied') } })
      { const st = p.selectionText.slice(0, 6000), ai = mode => () => this.send('command', { ai: mode, text: st, tabId: t.id }), words = st.trim().split(/\s+/).length
        items.push({ label: 'Lumen AI', submenu: [{ label: 'Explain', click: ai('explain') }, ...(words <= 4 ? [{ label: 'Define', click: ai('define') }] : []), ...(words >= 25 ? [{ label: 'Summarize', click: ai('summarize') }] : []), { label: 'Rewrite More Clearly', click: ai('rewrite') }, { label: `Translate to ${Translate.langName(Translate.target(D.settings))}`, click: ai('translate') }, { type: 'separator' }, { label: 'Ask About This...', click: ai('ask') }] }) }
      items.push({ label: `Translate to ${Translate.langName(Translate.target(D.settings))}`, click: () => Translate.bubble(wc, p.selectionText.slice(0, 4000), Translate.target(D.settings), { accent: D.settings.get('accent'), dark: nativeTheme.shouldUseDarkColors, motion: D.settings.get('motion') }).catch(e => this.send('toast', 'Translation failed')) })
      items.push({ label: `Search ${(SEARCH[D.settings.get('searchEngine')] || SEARCH.google).name} for "${q.length > 30 ? q.slice(0, 30) + '...' : q}"`, click: () => this.createTab(toURL(q), { openerId: t.id }) })
      sep()
    }
    if (p.isEditable) {
      items.push({ label: 'Undo', role: 'undo', enabled: p.editFlags.canUndo }, { label: 'Redo', role: 'redo', enabled: p.editFlags.canRedo }, { type: 'separator' })
      items.push({ label: 'Cut', role: 'cut', enabled: p.editFlags.canCut }, { label: 'Copy', role: 'copy', enabled: p.editFlags.canCopy }, { label: 'Paste', role: 'paste', enabled: p.editFlags.canPaste }, { label: 'Paste and Match Style', role: 'pasteAndMatchStyle' }, { label: 'Select All', role: 'selectAll' })
      if (p.formControlType === 'input-password' || /pass/i.test(p.inputFieldType || '')) items.push({ type: 'separator' }, { label: 'Suggest Strong Password', click: () => wc.send('lumen:fill-generated', genPassword()) })
      else if (p.selectionText && p.selectionText.trim()) { const st = p.selectionText.slice(0, 8000), ai = mode => () => this.send('command', { ai: mode, text: st, tabId: t.id, write: true }); items.push({ type: 'separator' }, { label: 'Lumen AI Writing', submenu: [{ label: 'Improve Writing', click: ai('improve') }, { label: 'Make Shorter', click: ai('shorten') }, { label: 'Fix Spelling and Grammar', click: ai('grammar') }] }) }
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
      items.push({ label: 'Print...', click: () => printPage(this, wc) })
      sep()
      items.push({ label: 'View Page Source', click: () => this.createTab('view-source:' + wc.getURL(), { openerId: t.id }) })
    }
    if (extensions && !this.incognito) {
      try { const ext = extensions.getContextMenuItems(wc, p); if (ext.length) { sep(); items.push(...ext) } } catch {}
    }
    sep()
    items.push({ label: 'Inspect', click: () => { wc.inspectElement(p.x, p.y); if (wc.isDevToolsOpened()) wc.devToolsWebContents && wc.devToolsWebContents.focus() } })
    let at
    try { const b = t.view.getBounds(); at = { x: b.x + p.x, y: b.y + p.y } } catch {}
    Nova.popupMenu(this, items, { at, wc, source: wc, kind: 'page' })
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
    } else if (mod && !input.shift && !input.alt && (input.key === 't' || input.key === 'T')) {
      // Cmd T is handled right here, before the key goes anywhere else: the New Tab is on screen in the next frame
      e.preventDefault(); this.createTab()
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
      tabs: w.order.map(id => { const t = w.tabs.get(id); return { url: crashedOrigin((t.view && !t.view.webContents.isDestroyed() ? t.view.webContents.getURL() : t.url) || t.url), title: t.title, pinned: t.pinned, favicon: t.favicon, group: t.group || null } }),
    })),
  }
  // once the last window has closed (the normal way to quit on Windows) keep the tabs it saved on close
  if (data.windows.length || (quitting && windows.length)) D.session.replace(data)
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
const HL = require('./highlights')
const Parcels = require('./parcels')
Parcels.store.onChange(() => spareChanged())

// ---------------------------------------------------------------- translator
async function translateTab(w, t, toLang) {
  if (!t || !t.view) return
  const wc = t.view.webContents
  if (trJobs.has(w)) return
  if (await Translate.isTranslated(wc)) {
    await Translate.showOriginal(wc); t.translated = false; w.pushState()
    w.send('translating', { phase: 'original' })
    if (!toLang) return
  }
  const to = toLang || Translate.target(D.settings)
  const started = Date.now()
  const from = await Translate.pageLang(wc)
  const job = { cancelled: false }; trJobs.set(w, job)
  const name = Translate.langName(to)
  const info = { to: name, toCode: to, fromCode: from || '', from: from ? Translate.langName(from) : '', rtl: Translate.dirOf(to) === 'rtl', flip: !!from && Translate.dirOf(from) !== Translate.dirOf(to) }
  w.send('translating', { phase: 'start', ...info })
  try {
    const r = await Translate.translatePage(wc, to, {
      flipDir: D.settings.get('translateFlipDir') !== false,
      isCancelled: () => job.cancelled || wc.isDestroyed(),
      onProgress: (n, total, sample) => w.send('translating', { phase: 'progress', n, total, sample }),
    })
    if (r.ok) { t.translated = true; t.trFrom = from; w.pushState(); w.send('translating', { phase: 'done', ...info, count: r.count, ms: Date.now() - started, always: (D.settings.get('alwaysTranslate') || []).includes(from) }) }
    else w.send('translating', { phase: 'error', text: r.error })
  } catch (e) {
    if (e.cancelled) { await Translate.showOriginal(wc).catch(() => {}); w.send('translating', { phase: 'cancelled' }) }
    else { log('translate failed', e.message); w.send('translating', { phase: 'error', text: 'Translation failed. Check your connection.' }) }
  } finally { if (trJobs.get(w) === job) trJobs.delete(w) }
}
const trJobs = new Map()
const offered = new Set()
async function offerTranslate(w, t) {
  if (!t.view || !D.settings.get('offerTranslate') || !/^https?:/.test(t.view.webContents.getURL())) return
  const wc = t.view.webContents
  if (t.translated || trJobs.has(w)) return
  const lang = await Translate.pageLang(wc)
  const to = Translate.target(D.settings)
  const same = (a, b) => String(a).split('-')[0] === String(b).split('-')[0]
  if (!lang || same(lang, to) || (D.settings.get('neverTranslate') || []).includes(lang)) return
  if ((D.settings.get('alwaysTranslate') || []).includes(lang)) return translateTab(w, t)
  const key = t.id + '|' + new URL(wc.getURL()).host
  if (offered.has(key)) return
  if (w.activeId !== t.id) { t.offerLater = true; return }   // ask when the tab is actually in front
  offered.add(key)
  const id = ++promptSeq
  pendingPrompts.set(id, ans => {
    if (ans.allow) { translateTab(w, t, ans.to && ans.to !== to ? ans.to : undefined); if (ans.always) D.settings.set({ alwaysTranslate: [...new Set([...(D.settings.get('alwaysTranslate') || []), lang])] }) }
    else if (ans.never) D.settings.set({ neverTranslate: [...new Set([...(D.settings.get('neverTranslate') || []), lang])] })
  })
  w.send('trask', { id, tabId: t.id, host: new URL(wc.getURL()).host, from: lang, fromName: Translate.langName(lang), to, toName: Translate.langName(to), rtl: Translate.dirOf(lang) === 'rtl' })
}

// ---------------------------------------------------------------- Surge and Koi, their own apps again (4.0)
// Lumen 4.0 is just the browser: Surge and Koi no longer run inside it. People who had them get one card, once, with
// the links to the standalone apps; Settings keeps a "Get Surge and Koi" card for later. Nothing is downloaded or
// written anywhere for them: the links open on GitHub and the person installs the apps as usual.
const SEPARATE_APPS = {
  surge: { name: 'Surge', url: 'https://github.com/mabdulhadi0208-afk/surge/releases/latest' },
  koi: { name: 'Koi', url: 'https://github.com/mabdulhadi0208-afk/mabdulhadi0208-afk-koi/releases/latest' },
}
function getSeparateApp(id) { const a = SEPARATE_APPS[id]; if (!a) return false; shell.openExternal(a.url).catch(e => log('open ' + id + ' failed', e.message)); return true }
// had Surge or Koi inside Lumen (3.x): their data folders, or settings only they ever wrote
function hadBuiltInApps() {
  try { if (['surge', 'koi'].some(id => fs.existsSync(path.join(app.getPath('userData'), 'apps', id)))) return true } catch {}
  const s = D.settings.get()
  return !!(s.apps && typeof s.apps === 'object') || s.backgroundToldOnce != null || s.axVersion != null || s.axGranted != null || s.openAtLogin === true
}
// The login item only ever existed so Surge and Koi were ready at login (Lumen opened hidden, without a window).
// With them gone it would just start an invisible browser, so it is switched off once, here.
function retireLoginItem() {
  if (D.settings.get('openAtLogin') === undefined) return
  const was = D.settings.get('openAtLogin'); D.settings.set({ openAtLogin: undefined })
  if (!was || !app.isPackaged || (!isMac && process.platform !== 'win32')) return
  try { app.setLoginItemSettings({ openAtLogin: false, args: ['--hidden'] }); log('login item removed (it was only for Surge and Koi)') } catch (e) { log('login item removal failed', e.message) }
}
// decided once per install: a fresh user never sees the card, someone with old Surge or Koi data sees it once
function separateAppsCheck() {
  if (D.settings.get('separateAppsShown') != null) return
  const had = hadBuiltInApps()
  retireLoginItem()
  if (!had) { D.settings.set({ separateAppsShown: false }); return }
  let tries = 0
  const wait = () => {
    const w = windows.find(x => !x.incognito && !x.win.isDestroyed())
    // never over the intro or the restart arrival, and only once a window is up; give up quietly after a few minutes
    if (!w || w.introOn || w.overlay || !w.win.isVisible()) { if (++tries < 120) setTimeout(wait, 1500); return }
    D.settings.set({ separateAppsShown: true }); D.settings.flush()   // stored first: a crash here never brings it back
    novaDialog(w, { type: 'info', kind: 'apps', icon: 'apps', title: 'Lumen 4.0',
      buttons: ['Get Surge and Koi', 'Not now'], defaultId: 0, cancelId: 1,
      message: 'Surge and Koi are now their own apps',
      detail: 'Lumen is just the browser now, so it is lighter and faster, and your Mac runs smoother when it is closed. Download them as separate apps to keep using them. You can also get them one at a time in Settings.' })
      .then(r => { if (r.response === 0) { getSeparateApp('surge'); getSeparateApp('koi') } }, () => {})
  }
  setTimeout(wait, 3500)
}

// ---------------------------------------------------------------- Google sign-in
// If Google still says "This browser or app may not be secure", switch to the other sign-in mode once and start the
// sign-in again, so it just works on the second try. The mode that worked is kept.
let googleRetried = false
// scrolls the page's main scroller back to the top: the document, or the scrolled box under the middle of the window
// (web apps like Gmail scroll a box, not the page). An ease-out glide, no overshoot; instant with Motion Off.
// A wheel or a key press stops it. Resolves true if there was anything to scroll.
const SCROLL_TOP = `(() => {
  const still = __STILL__ || matchMedia('(prefers-reduced-motion: reduce)').matches
  const canScroll = el => { if (!el || el.scrollTop <= 0) return false; const o = getComputedStyle(el).overflowY; return el === document.scrollingElement || o === 'auto' || o === 'scroll' || o === 'overlay' }
  let el = document.scrollingElement && document.scrollingElement.scrollTop > 0 ? document.scrollingElement : null
  if (!el) { let n = document.elementFromPoint(innerWidth / 2, innerHeight / 2); while (n && !canScroll(n)) n = n.parentElement; el = n }
  if (!el) for (const n of document.querySelectorAll('main, [role=main], div, section')) { if (n.scrollTop > 0 && n.clientHeight > innerHeight * .4 && canScroll(n)) { el = n; break } }
  if (!el) return false
  const from = el.scrollTop
  if (still) { el.scrollTop = 0; return true }
  const ms = Math.min(720, 320 + Math.sqrt(from) * 6), t0 = performance.now(); let stop = false
  const halt = () => { stop = true }
  addEventListener('wheel', halt, { once: true, passive: true }); addEventListener('keydown', halt, { once: true }); addEventListener('touchstart', halt, { once: true, passive: true })
  const ease = k => 1 - Math.pow(1 - k, 4)
  const step = now => { if (stop) return; const k = Math.min(1, (now - t0) / ms); el.scrollTop = from * (1 - ease(k)); if (k < 1) requestAnimationFrame(step); else { removeEventListener('wheel', halt); removeEventListener('keydown', halt); removeEventListener('touchstart', halt) } }
  requestAnimationFrame(step)
  return true })()`
// remembers the sharpest icon the page offers, so Home can show the site's real logo instead of a letter.
// Read in an isolated world; never in private windows. Touch icons are full-bleed squares, the rest sit on white.
const ICON_SCAN = `(() => { const out = []
  for (const l of document.querySelectorAll('link[rel][href]')) {
    const rel = l.rel.toLowerCase().split(/\\s+/); const touch = rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')
    if (!touch && !rel.includes('icon')) continue
    const sz = (l.getAttribute('sizes') || '').toLowerCase(), svg = /svg/.test(l.type || '') || /\\.svg(\\?|$)/i.test(l.href)
    let s = 0; for (const m of sz.matchAll(/(\\d+)x(\\d+)/g)) s = Math.max(s, +m[1])
    if (sz === 'any' || svg) s = Math.max(s, 256); if (!s) s = touch ? 180 : /\\.ico(\\?|$)/i.test(l.href) ? 32 : 48
    out.push([l.href, s, touch ? 'touch' : 'icon'])
  }
  return out })()`
async function siteIconScan(w, t, wc) {
  if (w.incognito || t.spare) return
  let host; try { const u = new URL(wc.getURL()); if (u.protocol !== 'https:') return; host = u.host } catch { return }
  try {
    const list = await wc.executeJavaScriptInIsolatedWorld(1013, [{ code: ICON_SCAN }])
    if (!Array.isArray(list) || !list.length) return
    // a touch icon wins from 120px up (it is drawn for exactly this); otherwise the biggest icon
    const ok = list.filter(x => Array.isArray(x) && /^https:\/\//.test(x[0]) && x[1] >= 32)
    const best = ok.filter(x => x[2] === 'touch' && x[1] >= 120).sort((a, b) => b[1] - a[1])[0] || ok.sort((a, b) => b[1] - a[1])[0]
    if (best) D.setSiteIcon(host, best[0], best[1], best[2])
  } catch {}
}
async function googleBlockCheck(w, t) {
  const wc = t.view && t.view.webContents
  if (!wc || wc.isDestroyed() || !isGoogleSignIn(wc.getURL())) return
  await new Promise(r => setTimeout(r, 900))
  if (wc.isDestroyed() || !isGoogleSignIn(wc.getURL())) return
  const blocked = /\/signin\/rejected/.test(wc.getURL()) || await wc.executeJavaScriptInIsolatedWorld(1024, [{ code: `/(browser or app may not be secure|this browser or app may not be secure|try using a different browser)/i.test((document.body && document.body.innerText || '').slice(0, 4000))` }]).catch(() => false)
  if (!blocked) return
  log('google sign-in blocked, mode', D.settings.get('googleSignInMode') || 'chrome')
  if (googleRetried) { setSetting('googleSignInMode', 'chrome'); w.send('toast', 'Google is still blocking this sign-in. Reload the page to try again.'); googleRetried = false; return }
  googleRetried = true
  setSetting('googleSignInMode', googleCompat() ? 'chrome' : 'firefox')
  let cont = ''; try { cont = new URL(wc.getURL()).searchParams.get('continue') || '' } catch {}
  w.send('toast', 'Google blocked that sign-in. Trying again in another mode.')
  wc.loadURL('https://accounts.google.com/ServiceLogin' + (cont ? '?continue=' + encodeURIComponent(cont) : ''))
}

// ---------------------------------------------------------------- highlights
const hlFor = url => { const k = HL.pageKey(url); return k ? D.highlights.get().filter(h => h.url === k) : [] }
async function paintHighlights(wc, tries = 0) {
  if (!wc || wc.isDestroyed() || !/^https?:/.test(wc.getURL())) return
  const list = hlFor(wc.getURL()); if (!list.length) return
  try {
    await wc.insertCSS(HL.CSS)
    const n = await HL.restore(wc, list.map(h => ({ id: h.id, text: h.text, prefix: h.prefix || '', suffix: h.suffix || '', color: h.color })))
    // pages that build their text after loading: look again a little later
    if (n < list.length && tries < 3) setTimeout(() => paintHighlights(wc, tries + 1), 1500 * (tries + 1))
  } catch {}
}
async function addHighlight(w, t, color) {
  const wc = t.view && t.view.webContents; if (!wc || wc.isDestroyed()) return
  const id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  try {
    await wc.insertCSS(HL.CSS)
    const r = await HL.add(wc, id, color)
    if (!r || !r.text) return
    D.highlights.replace([{ id, url: HL.pageKey(wc.getURL()), title: wc.getTitle(), text: r.text, prefix: r.prefix, suffix: r.suffix, color, t: Date.now() }, ...D.highlights.get()].slice(0, 3000))
    w.send('toast', 'Highlighted. Find it again in History, Highlights.')
  } catch (e) { log('highlight failed', e.message) }
}
function removeHighlight(id, wc) {
  D.highlights.replace(D.highlights.get().filter(h => h.id !== id))
  const all = wc ? [wc] : windows.flatMap(w => [...w.tabs.values()].filter(t => t.view && !t.view.webContents.isDestroyed()).map(t => t.view.webContents))
  for (const c of all) HL.remove(c, id)
}
function recolorHighlight(wc, id, color) {
  D.highlights.replace(D.highlights.get().map(h => h.id === id ? { ...h, color } : h))
  HL.recolor(wc, id, color)
}

// ---------------------------------------------------------------- parcels
const PARCEL_WORLD = 1023
const sameHost = (a, b) => { try { return new URL(a).host.replace(/^www\./, '') === new URL(b).host.replace(/^www\./, '') } catch { return false } }
const stripHash = u => String(u || '').split('#')[0]
// every page load: is this an order page to save, or a page about a parcel we already track?
async function parcelPage(w, t) {
  const wc = t.view && t.view.webContents
  if (!wc || wc.isDestroyed() || w.incognito) return
  const url = wc.getURL(); if (!/^https?:/.test(url)) return
  const known = Parcels.active().filter(p => stripHash(p.url) === stripHash(url) || (p.number && stripHash(Parcels.trackURL(p)) === stripHash(url)))
  const auto = D.settings.get('parcelsAuto') === true
  if (!known.length && !auto) return
  try {
    await new Promise(r => setTimeout(r, 1200))   // order pages often fill in their details just after loading
    if (wc.isDestroyed()) return
    if (known.length) {
      const text = await wc.executeJavaScriptInIsolatedWorld(PARCEL_WORLD, [{ code: `(document.body && document.body.innerText || '').slice(0, 20000)` }])
      const st = Parcels.statusOf(text)
      for (const p of known) if (Parcels.setStatus(p, st, text) && st.status === 'delivered') w.send('toast', `${p.name || 'Your parcel'} was delivered`)
    }
    if (!auto) return
    const r = await wc.executeJavaScriptInIsolatedWorld(PARCEL_WORLD, [{ code: Parcels.ORDER_SCAN }])
    if (!r) return
    const shop = new URL(url).host.replace(/^www\./, '')
    const before = Parcels.list().length
    const p = Parcels.add({ url, orderNo: r.orderNo, number: r.tracking[0] || '', shop, name: 'Order from ' + Parcels.shopName(shop), source: 'auto' })
    for (const n of r.tracking.slice(1)) Parcels.add({ number: n, url, shop, name: p ? p.name : '', source: 'auto' })
    if (p) { Parcels.setStatus(p, Parcels.statusOf(r.text) || { status: p.status, text: p.statusText }, r.text); if (Parcels.list().length > before) w.send('parcel-saved', { id: p.id, name: p.name }) }
  } catch (e) { log('parcel scan failed', e.message) }
}
// background check: open each parcel's page out of sight, read the status, close it
let parcelBusy = false
async function checkParcels(force = false) {
  if (parcelBusy || !mainSession) return
  parcelBusy = true
  try {
    Parcels.prune()
    const due = Parcels.active().filter(p => Parcels.openURL(p) && (force || Date.now() - (p.checked || 0) > 2 * 3600000))
    for (const p of due.slice(0, 8)) {
      let win
      try {
        win = new BrowserWindow({ show: false, width: 1100, height: 900, webPreferences: { session: mainSession, sandbox: true, contextIsolation: true } })
        win.webContents.setAudioMuted(true)
        await Promise.race([win.loadURL(Parcels.openURL(p)), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 25000))])
        await new Promise(r => setTimeout(r, 3500))
        const text = await win.webContents.executeJavaScript(`(document.body && document.body.innerText || '').slice(0, 20000)`)
        const st = Parcels.statusOf(text)
        const was = p.status
        if (st) Parcels.setStatus(p, st, text); else { const eta = Parcels.etaOf(text); Parcels.update(p.id, { checked: Date.now(), ...(eta ? { eta } : {}) }) }
        if (st && st.status !== was) {
          const msg = st.status === 'delivered' ? `${p.name || 'Your parcel'} was delivered` : `${p.name || 'Your parcel'}: ${st.text}`
          for (const w of windows) w.send('toast', msg)
          try { const { Notification } = require('electron'); if (Notification.isSupported()) new Notification({ title: 'Lumen Parcels', body: msg, silent: false }).show() } catch {}
        }
      } catch (e) { Parcels.update(p.id, { checked: Date.now() }); log('parcel check failed', p.id, e.message) }
      finally {   // close gently so the page can finish what it was doing, then make sure it is gone
        try { if (win && !win.isDestroyed()) { win.webContents.stop(); win.close(); const ww = win; setTimeout(() => { try { if (!ww.isDestroyed()) ww.destroy() } catch {} }, 3000) } } catch {}
      }
    }
  } finally { parcelBusy = false }
}
setInterval(() => checkParcels().catch(() => {}), 30 * 60000)
// a tracking number from the command bar or a right-click on a page
function trackNumber(w, n, from = '') {
  if (!Parcels.looksLikeTracking(n)) return null
  const before = Parcels.list().length
  const p = Parcels.add({ number: n, name: '', source: 'manual', shop: from ? (() => { try { return new URL(from).host.replace(/^www\./, '') } catch { return '' } })() : '' })
  if (!p) return null
  w.send('parcel-saved', { id: p.id, name: Parcels.list().length > before ? `Tracking ${p.number}` : 'Already tracking that one' })
  setTimeout(() => checkParcels(true).catch(() => {}), 400)
  return parcelView(p)
}
const parcelView = p => ({ ...p, carrierName: p.carrier ? Parcels.carrierName(p.carrier) : '', open: Parcels.openURL(p), track: p.number ? Parcels.trackURL(p) : '' })

// ---------------------------------------------------------------- reading time
// "6 min read" in the address bar for pages that are mostly an article
async function readingTime(w, t) {
  const wc = t.view && t.view.webContents
  t.readMin = 0
  if (!wc || wc.isDestroyed() || !/^https?:/.test(wc.getURL())) return
  try {
    const words = await wc.executeJavaScriptInIsolatedWorld(1022, [{ code: `(() => { const a = document.querySelector('article') || document.querySelector('main [itemprop=articleBody], [role=main] article, main'); if (!a) return 0; const ps = [...a.querySelectorAll('p')].filter(p => p.innerText.length > 80); if (ps.length < 4) return 0; return ps.reduce((n, p) => n + p.innerText.split(/\\s+/).length, 0) })()` }])
    t.readMin = words >= 350 ? Math.max(2, Math.round(words / 230)) : 0
    if (w.activeId === t.id) w.pushStateSoon()
  } catch {}
}

// ---------------------------------------------------------------- auto reload
// the clock only runs while some tab has Reload Every on (it used to wake Lumen every second, all day)
let reloadTimer = null
function autoReloadTick() {
  const now = Date.now(); let any = false
  for (const w of windows) for (const t of w.tabs.values()) {
    if (!t.reloadEvery) continue
    any = true
    if (!t.view || t.view.webContents.isDestroyed()) continue
    if (now >= (t.reloadAt || 0)) { t.reloadAt = now + t.reloadEvery * 1000; if (!t.view.webContents.isLoading()) t.view.webContents.reload() }
  }
  if (!any) { clearInterval(reloadTimer); reloadTimer = null }
}
function watchAutoReload() { if (!reloadTimer) reloadTimer = setInterval(autoReloadTick, 1000) }

function addToNTP(w, t) {
  const url = t.view && !t.view.webContents.isDestroyed() ? t.view.webContents.getURL() : t.url
  if (!/^https?:/.test(url)) return
  let list = D.settings.get('ntpShortcuts')
  if (!Array.isArray(list)) list = D.topSites(8).map(s => ({ url: s.url, title: (s.host || s.title || '').replace(/^www\./, '') }))
  if (list.some(s => s.url === url)) { w.send('toast', 'Already on your new tab page'); return }
  setSetting('ntpShortcuts', [...list, { url, title: (t.title || new URL(url).host).slice(0, 28) }].slice(0, 12)); w.send('toast', 'Added to your new tab page')
}

// ---------------------------------------------------------------- read later
function toggleReadLater(w, t) {
  if (!t) return
  const url = t.view && !t.view.webContents.isDestroyed() ? t.view.webContents.getURL() : t.url
  if (!/^https?:/.test(url)) { w.send('toast', 'Only web pages can be saved for later'); return }
  if (D.isReadLater(url)) { D.removeReadLater(url); w.send('toast', 'Removed from Read later') }
  else { D.addReadLater(url, t.view ? t.view.webContents.getTitle() : t.title); w.send('toast', 'Saved to Read later') }
}
const readLaterList = n => D.readLater.get().slice(0, n).map(x => ({ url: x.url, title: x.title, t: x.t }))

// ---------------------------------------------------------------- Lumen AI (src/ai-host.js)
const AIHost = require('./ai-host')
const Agent = require('./agent')   // 4.3: Claude in Lumen
AIHost.init({ winForWc, log })

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
let READER_SRC = null   // read once, not from disk on every Reader Mode
function readerMode(wc) {
  const acc = String(D.settings.get('accent') || '#5b8cff'), motion = String(D.settings.get('motion') || 'jelly')
  const code = READER_SRC || (READER_SRC = fs.readFileSync(path.join(__dirname, 'reader.js'), 'utf8'))
    .replace('__LUMEN_ACCENT__', /^#[0-9a-f]{3,8}$/i.test(acc) ? acc : '#5b8cff').replace('__LUMEN_MOTION__', /^[a-z]+$/.test(motion) ? motion : 'jelly')
  // runs in the tab's preload world (999), so it can save the reader's choices and the page cannot see them
  wc.executeJavaScriptInIsolatedWorld(999, [{ code: code.replace('__LUMEN_READER_PREFS__', JSON.stringify(readerPrefs())).replace('__LUMEN_READER_POS__', String(readerPos(wc.getURL()) || 0)) }]).catch(() => {})
}
const READER_CHOICES = { theme: ['auto', 'light', 'sepia', 'sage', 'dusk', 'dark'], font: ['serif', 'sans', 'rounded'], align: ['left', 'justify'], lh: ['compact', 'normal', 'airy'], width: ['narrow', 'medium', 'wide'] }
function readerPrefs(p = D.settings.get('readerPrefs')) {
  const o = {}
  if (p && typeof p === 'object') {
    for (const k in READER_CHOICES) if (READER_CHOICES[k].includes(p[k])) o[k] = p[k]
    if (typeof p.focus === 'boolean') o.focus = p.focus
    if (Number.isFinite(+p.size)) o.size = Math.max(14, Math.min(30, Math.round(+p.size)))
  }
  return o
}
// how far the reader got in each article (the last 60), so Reader offers to pick up where they left off
const readerKey = u => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.origin + x.pathname + x.search : '' } catch { return '' } }
function readerPos(u) { const m = D.settings.get('readerPos'), k = readerKey(u); const v = m && k ? +m[k] : 0; return v > 0 && v < 1 ? v : 0 }
ipcMain.on('reader:pos', (e, v) => {
  const k = readerKey(e.sender.getURL()); v = +v
  if (!k || !(v >= 0 && v <= 1)) return
  const m = { ...(D.settings.get('readerPos') || {}) }; delete m[k]
  if (v > 0.03 && v < 0.97) m[k] = Math.round(v * 1000) / 1000
  const keys = Object.keys(m); for (const x of keys.slice(0, Math.max(0, keys.length - 60))) delete m[x]
  D.settings.set('readerPos', m)
})
ipcMain.on('reader:prefs', (e, p) => { try { D.settings.set('readerPrefs', readerPrefs(p)) } catch {} })
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

// unit converter for the address bar and command bar: "5 km in mi", "72f to c", "3.5 lb kg", "1 gb in mb"
const UNITS = (() => {
  const U = {}, add = (kind, names, f) => { for (const n of names) U[n] = { kind, f, name: names[0] } }
  add('len', ['mm', 'millimeter', 'millimeters', 'millimetre'], 0.001); add('len', ['cm', 'centimeter', 'centimeters', 'centimetre'], 0.01)
  add('len', ['m', 'meter', 'meters', 'metre', 'metres'], 1); add('len', ['km', 'kilometer', 'kilometers', 'kilometre', 'kilometres'], 1000)
  add('len', ['in', 'inch', 'inches'], 0.0254); add('len', ['ft', 'foot', 'feet'], 0.3048); add('len', ['yd', 'yard', 'yards'], 0.9144); add('len', ['mi', 'mile', 'miles'], 1609.344)
  add('mass', ['mg', 'milligram', 'milligrams'], 0.001); add('mass', ['g', 'gram', 'grams'], 1); add('mass', ['kg', 'kilo', 'kilos', 'kilogram', 'kilograms'], 1000)
  add('mass', ['oz', 'ounce', 'ounces'], 28.349523125); add('mass', ['lb', 'lbs', 'pound', 'pounds'], 453.59237); add('mass', ['st', 'stone', 'stones'], 6350.29318); add('mass', ['t', 'ton', 'tons', 'tonne', 'tonnes'], 1e6)
  add('vol', ['ml', 'milliliter', 'milliliters', 'millilitre'], 0.001); add('vol', ['l', 'liter', 'liters', 'litre', 'litres'], 1)
  add('vol', ['tsp', 'teaspoon', 'teaspoons'], 0.00492892); add('vol', ['tbsp', 'tablespoon', 'tablespoons'], 0.0147868); add('vol', ['floz'], 0.0295735)
  add('vol', ['cup', 'cups'], 0.236588); add('vol', ['pt', 'pint', 'pints'], 0.473176); add('vol', ['qt', 'quart', 'quarts'], 0.946353); add('vol', ['gal', 'gallon', 'gallons'], 3.78541)
  add('speed', ['kmh', 'km/h', 'kph'], 1 / 3.6); add('speed', ['mph'], 0.44704); add('speed', ['m/s', 'mps'], 1); add('speed', ['knot', 'knots', 'kn'], 0.514444)
  add('data', ['b', 'byte', 'bytes'], 1); add('data', ['kb', 'kilobyte', 'kilobytes'], 1024); add('data', ['mb', 'megabyte', 'megabytes'], 1048576)
  add('data', ['gb', 'gigabyte', 'gigabytes'], 1073741824); add('data', ['tb', 'terabyte', 'terabytes'], 1099511627776)
  add('time', ['ms', 'millisecond', 'milliseconds'], 0.001); add('time', ['s', 'sec', 'secs', 'second', 'seconds'], 1); add('time', ['min', 'mins', 'minute', 'minutes'], 60)
  add('time', ['h', 'hr', 'hrs', 'hour', 'hours'], 3600); add('time', ['d', 'day', 'days'], 86400); add('time', ['wk', 'week', 'weeks'], 604800); add('time', ['yr', 'year', 'years'], 31557600)
  add('area', ['m2', 'sqm'], 1); add('area', ['km2', 'sqkm'], 1e6); add('area', ['ft2', 'sqft'], 0.09290304); add('area', ['acre', 'acres'], 4046.8564224); add('area', ['ha', 'hectare', 'hectares'], 10000)
  for (const [n, k] of [['c', 'C'], ['celsius', 'C'], ['°c', 'C'], ['f', 'F'], ['fahrenheit', 'F'], ['°f', 'F'], ['k', 'K'], ['kelvin', 'K']]) U[n] = { kind: 'temp', t: k, name: k === 'C' ? '°C' : k === 'F' ? '°F' : 'K' }
  return U
})()
function convOf(q) {
  const m = String(q || '').trim().toLowerCase().replace(/,/g, '').match(/^(-?\d*\.?\d+)\s*([a-z°/0-9]+?)\s+(?:(?:in|to|as|into|=)\s+)?([a-z°/0-9]+)$/)
  if (!m) return null
  const v = parseFloat(m[1]), a = UNITS[m[2]], b = UNITS[m[3]]
  if (!a || !b || a.kind !== b.kind || a === b || !isFinite(v)) return null
  let r
  if (a.kind === 'temp') { const c = a.t === 'C' ? v : a.t === 'F' ? (v - 32) * 5 / 9 : v - 273.15; r = b.t === 'C' ? c : b.t === 'F' ? c * 9 / 5 + 32 : c + 273.15 }
  else r = v * a.f / b.f
  r = +r.toPrecision(Math.abs(r) >= 1 ? 8 : 6)
  const nm = (u, raw) => u.kind === 'temp' ? u.name : raw
  return { value: r, text: `${v.toLocaleString('en-US', { maximumFractionDigits: 10 })} ${nm(a, m[2])} = ${r.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${nm(b, m[3])}` }
}

// the search engine's suggestions, fetched apart from the local ones so history, bookmarks and tabs show at once and
// the network never holds them up; answers are kept a minute, so typing back over a word costs nothing
const webSugCache = new Map()
async function webSuggest(w, text) {
  const q = String(text || '').trim()
  const eng = SEARCH[D.settings.get('searchEngine')] || SEARCH.google
  if (!q || !D.settings.get('showSuggestions') || !eng.suggest || (w && w.incognito)) return []
  const key = eng.name + '\n' + q.toLowerCase(), hit = webSugCache.get(key)
  if (hit && Date.now() - hit.at < 60000) return hit.list
  let list = []
  try {
    const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 1500)
    try {
      const r = await net.fetch(eng.suggest.replace('%s', encodeURIComponent(q)), { signal: ctrl.signal })
      const j = await r.json()
      list = (Array.isArray(j) ? (Array.isArray(j[1]) ? j[1] : j.map(x => x.phrase || x)) : []).filter(x => typeof x === 'string').slice(0, 5)
    } finally { clearTimeout(tm) }
    webSugCache.set(key, { at: Date.now(), list })
    if (webSugCache.size > 200) webSugCache.delete(webSugCache.keys().next().value)
  } catch {}
  return list
}
async function suggest(w, text, opts) {
  const local = !!(opts && opts.local)
  const q = (text || '').trim()
  const out = { query: q, tabs: [], history: [], bookmarks: [], search: [] }
  const sc = shortcutFor(q); if (sc) out.shortcut = { name: sc.name, query: sc.query }
  const calc = calcOf(q); if (calc !== null) out.calc = calc
  const conv = calc === null && convOf(q); if (conv) out.conv = conv
  if (q.length < 40 && Parcels.looksLikeTracking(q)) out.parcel = { number: Parcels.clean(q), carrier: Parcels.carrierName(Parcels.detect(q)) }
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
  const web = D.settings.get('showSuggestions') && eng.suggest && !w.incognito
  // local: the caller asks for the search engine's part separately (suggestWeb)
  if (local) { out.webPending = !!web; return out }
  if (web) out.search = await webSuggest(w, q)
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
      case 'close': return w.closeTab(a[0], { undo: true })
      // the chrome already moved the tab on its side: always answer with the real order, even if nothing changed
      case 'move': w._lastState = null; return w.moveTab(a[0], a[1])
      case 'back': return wc && wc.navigationHistory.goBack()
      case 'forward': return wc && wc.navigationHistory.goForward()
      case 'reload': if (t && (t.crashed || !t.view)) { w.destroyView(t); w.makeView(t); w.layout(); return } return wc && (a[0] ? wc.reloadIgnoringCache() : wc.reload())
      case 'stop': return wc && wc.stop()
      case 'layout': w.rect = a[0]; return w.layout()
      case 'overlay': return w.setOverlay(!!a[0], !!a[1])
      // the last picture taken of the tab, without taking a new one; null while none is ready (encoding a waiting one
      // is the slow part, so that waits too)
      case 'tabThumbCached': { const x = w.tabs.get(a[0]); return x && !x.thumbImg && x.thumb && (x.thumbUrl === undefined || x.thumbUrl === (x.view && !x.view.webContents.isDestroyed() ? x.view.webContents.getURL() : x.url)) ? x.thumb : null }
      case 'tabThumb': { const x = w.tabs.get(a[0]); if (!x) return null; if (x.id === w.activeId || x.id === w.splitId) await snapTab(x); return thumbOf(x) }
      case 'suggest': return suggest(w, a[0], a[1])
      case 'suggestWeb': return webSuggest(w, a[0])
      case 'find': if (wc && a[0]) wc.findInPage(a[0], { forward: a[1] !== false, findNext: !!a[2] }); return
      case 'stopFind': if (wc) wc.stopFindInPage('clearSelection'); return
      case 'prompt': { const fn = pendingPrompts.get(a[0]); pendingPrompts.delete(a[0]); if (fn) fn(a[1]); return }
      case 'bookmark': { if (!t) return; if (D.isBookmarked(t.url)) D.removeBookmark(t.url); else D.addBookmark(t.url, t.title); w.pushState(); return }
      case 'pin': { const x = w.tabs.get(a[0]); if (x) { x.pinned = !x.pinned; const others = w.order.filter(i => i !== x.id); const pinnedCount = others.filter(i => w.tabs.get(i).pinned).length; w.moveTab(x.id, x.pinned ? pinnedCount : pinnedCount) } return }
      // click the tab you are already on: the page glides back to the top (its main scroller, even inside web apps)
      case 'scrollTop': { const x = w.tabs.get(a[0]); if (!x || !x.view || x.view.webContents.isDestroyed()) return false; try { return !!(await x.view.webContents.executeJavaScriptInIsolatedWorld(1014, [{ code: SCROLL_TOP.replace('__STILL__', D.settings.get('motion') === 'off' ? 'true' : 'false') }])) } catch { return false } }
      case 'mute': { const x = w.tabs.get(a[0]); if (x && x.view) { x.muted = !x.muted; x.view.webContents.setAudioMuted(x.muted); w.pushState() } return }
      case 'split': { if (a[0] && a[0] !== w.activeId) { w.splitId = a[0]; w.layout(); w.pushState() } return }
      case 'unsplit': w.splitId = null; w.layout(); w.pushState(); return
      case 'tabMenu': return tabMenu(w, a[0])
      case 'appMenu': return Menu.getApplicationMenu() && appMenuPopup(w)
      case 'print': return wc && printPage(w, wc)
      case 'autoGroup': return autoGroupWindow(w)
      case 'agentStart': Agent.start(w, { ...(a[0] || {}), still: D.settings.get('motion') === 'off' }); return true
      case 'agentStop': Agent.stop(String(a[0] || '')); return true
      case 'agentHints': return Agent.hints(w)
      case 'agentReply': Agent.reply(String(a[0] || ''), String(a[1] || ''), a[2] || {}); return true
      case 'aiAsk': case 'aiStop': case 'aiStatus': case 'aiCite': case 'aiPlan': case 'aiAct': case 'aiReplace': case 'aiCopy': case 'aiForget': return AIHost.ui(w, action, a)
      case 'ungroupAll': return w.ungroup(null)
      case 'groupToggle': { const g = w.groups.get(a[0]); if (g) w.setGroup(a[0], { collapsed: !g.collapsed }); return }
      case 'groupRename': return w.setGroup(a[0], { name: String(a[1] || '').slice(0, 40) || 'Group' })
      case 'groupMenu': {
        const g = w.groups.get(a[0]); if (!g) return
        Nova.popupMenu(w, [
          { label: g.collapsed ? 'Expand' : 'Collapse', click: () => w.setGroup(g.id, { collapsed: !g.collapsed }) },
          { label: 'Rename', click: () => w.send('command', 'rename-group:' + g.id) },
          { label: 'Color', submenu: Groups.COLORS.map(c => ({ label: c[0].toUpperCase() + c.slice(1), type: 'radio', checked: g.color === c, click: () => w.setGroup(g.id, { color: c }) })) },
          { label: 'New Tab in Group', click: () => { const last = [...w.order].reverse().find(i => w.tabs.get(i).group === g.id); const n = w.createTab('lumen://newtab', { index: w.order.indexOf(last) + 1 }); n.group = g.id; w.pushState() } },
          { type: 'separator' },
          { label: 'Ungroup', click: () => w.ungroup(g.id) },
          { label: 'Close Group', click: () => w.closeGroup(g.id) },
        ], { kind: 'group' })
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
      case 'readLater': return toggleReadLater(w, t)
      case 'parcelsAuto': setSetting('parcelsAuto', !!a[0]); return true
      case 'parcelsCount': return Parcels.active().length
      case 'trackNumber': return trackNumber(w, a[0])
      case 'focusMode': return setFocusMode(w, a[0] === undefined ? !w.focusMode : a[0])
      case 'archiveNow': return archiveIdleTabs()
      case 'readLaterOpen': { const url = String(a[0] || ''); if (!D.isReadLater(url)) return; D.removeReadLater(url); w.createTab(url, { active: true }); return }
      case 'readLaterRemove': return D.removeReadLater(String(a[0] || ''))
      case 'menuInfo': return { parcels: Parcels.active().length, readLater: readLaterList(6), readLaterCount: D.readLater.get().length, saved: !!t && D.isReadLater(t.view ? t.view.webContents.getURL() : t.url), sessions: (D.settings.get('savedSessions') || []).map(s => ({ id: s.id, name: s.name, count: s.tabs.length })), closed: closedTabs.slice(-5).reverse().map(c => ({ title: c.title || c.url, url: c.url })), version: app.getVersion(), update: Updater.getState(), zoom: t ? Math.round(Math.pow(1.2, t.zoom || 0) * 100) : 100, incognito: w.incognito, tabLayout: D.settings.get('tabLayout'), fullscreen: w.win.isFullScreen(), passkeys: Passkeys.list().length, passwords: D.listPasswords().length }
      case 'zoom': return t && w.zoom(t.id, a[0])
      // a Settings section goes to the open Settings tab (switched in place) when there is one
      case 'openPage': { const pg = String(a[0] || ''); if (/^settings(\/|$)/.test(pg)) { openSettings(w, pg.replace(/^settings\/?/, '')); return } return w.createTab('lumen://' + pg) }
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
      case 'translateTo': return t && translateTab(w, t, String(a[0] || ''))
      case 'translateLangs': { const from = t && t.translated && t.trFrom ? t.trFrom : wc && /^https?:/.test(wc.getURL()) ? await Translate.pageLang(wc) : ''; return { to: Translate.target(D.settings), from, translated: !!(t && t.translated), always: (D.settings.get('alwaysTranslate') || []).includes(from), busy: trJobs.has(w), web: !!(wc && /^https?:/.test(wc.getURL())) } }
      case 'alwaysTranslate': { const l = String(a[0] || ''); if (l) { const s = new Set(D.settings.get('alwaysTranslate') || []); a[1] === false ? s.delete(l) : s.add(l); D.settings.set({ alwaysTranslate: [...s] }) } return }
      case 'translateCancel': { const j = trJobs.get(w); if (j) j.cancelled = true; return }
      case 'histMirror': return D.historyCompact()
      case 'bmAll': return D.liveBookmarks().map(b => [b.url, b.title || ''])
      case 'bmList': return D.liveBookmarks().slice(0, 200).map(b => ({ url: b.url, title: b.title || '' }))
      case 'bmRemove': D.removeBookmark(String(a[0])); w.pushState(); return
      case 'siteDark': return toggleSiteDark(w, !!a[0])
      case 'siteAdblock': return toggleSiteAdblock(w, !!a[0])
      case 'resetSite': { if (!t) return; try { const o = new URL(t.url).origin; const all = D.permissions.get(); delete all[o]; D.permissions.set(all) } catch {} return }
      case 'update': if (a[0] === 'check') return Updater.check(true); if (a[0] === 'install') return Updater.install(true); return Updater.getState()
      case 'trafficLights': if (isMac) { w.win.setWindowButtonVisibility(!!a[0]); if (a[1] && w.win.setWindowButtonPosition) { try { w.win.setWindowButtonPosition(a[1]) } catch {} } } return
      case 'focusUI': w.ui.webContents.focus(); return
      case 'toastView': return w.win.isDestroyed() ? false : Nova.toast(w, a[0] && typeof a[0] === 'object' ? a[0] : null)
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
  return { url: t.url, host: origin ? new URL(origin).host : '', secure: /^https:/.test(t.url), forceDark: !!D.settings.get('forceDark'), darkOff: siteDarkOff(t.view ? t.view.webContents.getURL() : t.url), permissions: D.permissions.get()[origin] || {}, blocked: t.view ? (blockedByWc.get(t.view.webContents.id) || 0) : 0, adblock: !!D.settings.get('adblock'), adOff: adAllowed(t.view ? t.view.webContents.getURL() : t.url) }
}

function reopenClosed(w) {
  const c = closedTabs.pop()
  if (c) w.createTab(c.url, { index: Math.min(c.index, w.order.length), pinned: c.pinned })
}

function tabMenu(w, id) {
  const t = w.tabs.get(id); if (!t) return
  const others = w.order.filter(i => i !== id)
  Nova.popupMenu(w, [
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
    { label: 'Reload Every', submenu: [[0, 'Off'], [30, '30 seconds'], [60, '1 minute'], [300, '5 minutes'], [900, '15 minutes']].map(([sec, l]) => ({ label: l, type: 'radio', checked: (t.reloadEvery || 0) === sec, click: () => { t.reloadEvery = sec; t.reloadAt = Date.now() + sec * 1000; w.pushState(); if (sec) w.send('toast', `Reloads every ${l}`) } })) },
    { label: 'Add to New Tab Page', enabled: /^https?:/.test(t.url), click: () => addToNTP(w, t) },
    { type: 'separator' },
    { label: 'Close Tab', click: () => w.closeTab(id, { undo: true }) },
    { label: 'Close Other Tabs', enabled: others.length > 0, click: () => others.filter(i => !w.tabs.get(i).pinned).forEach(i => w.closeTab(i)) },
    { label: D.settings.get('tabLayout') === 'top' ? 'Close Tabs to the Left' : 'Close Tabs Above', click: () => w.order.slice(0, w.order.indexOf(id)).filter(i => !w.tabs.get(i).pinned).forEach(i => w.closeTab(i)) },
    { label: D.settings.get('tabLayout') === 'top' ? 'Close Tabs to the Right' : 'Close Tabs Below', click: () => w.order.slice(w.order.indexOf(id) + 1).filter(i => !w.tabs.get(i).pinned).forEach(i => w.closeTab(i)) },
    { type: 'separator' },
    { label: 'Mute Other Tabs', enabled: others.length > 0, click: () => { for (const i of others) { const o = w.tabs.get(i); if (o && o.view && !o.muted) { o.muted = true; o.view.webContents.setAudioMuted(true) } } w.pushState() } },
  ], { kind: 'tab' })
}
function appMenuPopup(w) {
  Nova.popupMenu(w, [
    { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => w.createTab() },
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
    { label: 'Print...', accelerator: 'CmdOrCtrl+P', click: () => { const t = w.active(); if (t && t.view) printPage(w, t.view.webContents) } },
    { type: 'separator' },
    { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => openSettings(w) },
  ], { kind: 'app' })
}
function openSettings(w, sub = '') {
  const url = 'lumen://settings/' + sub
  const ex = w.order.map(i => w.tabs.get(i)).find(t => (t.url || '').startsWith('lumen://settings'))
  // an open Settings tab switches section in place (no reload); only an old page without the in-place switch reloads
  if (ex) { w.activate(ex.id); if (sub && ex.view) ex.view.webContents.executeJavaScript(`!!(window.__lumenGo && window.__lumenGo(${JSON.stringify(url)}))`, true).then(ok => { if (!ok) ex.view.webContents.loadURL(url) }, () => ex.view.webContents.loadURL(url)) } else w.createTab(url)
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

const PUBLIC_SETTINGS = ['googleSignInMode', 'ntpParcels', 'parcelsAuto', 'whatsNewSeen', 'archiveTabsAfterH', 'bookmarksBar', 'ntpStats', 'ntpRecent', 'ntpReadLater', 'darkStyle', 'uiSounds', 'darkOffSites', 'translateFlipDir', 'searchShortcuts', 'rememberZoom', 'soundActiveOnly', 'linksBackground', 'confirmQuit', 'wheelTabs', 'adblockAllow', 'aiModel', 'aiTabGroups', 'aiSelBubble', 'browserTheme', 'themeCustom', 'compact', 'appIcon', 'cleanLinks', 'swipeNav', 'videoSpeedKeys', 'hideCookieBanners', 'blockNotifications', 'forceDark', 'translateTo', 'offerTranslate', 'autoPip', 'ntpShortcuts', 'ntpWallpaper', 'ntpClock', 'searchEngine', 'motion', 'theme', 'accent', 'adblock', 'blockTrackers', 'httpsOnly', 'sleepTabsAfterMin', 'restoreSession', 'sidebarCollapsed', 'sidebarWidth', 'tabLayout', 'introSeen', 'autoUpdate', 'askWhereToSave', 'doNotTrack', 'showSuggestions', 'homeTiles', 'ntpOrder', 'ntpHide', 'ntpWeather', 'ntpName', 'ntpNote', 'ntpFocus', 'ntpSizes', 'ntpZones', 'ntpBanner']
function publicSettings() { const s = D.settings.get(); return Object.fromEntries(PUBLIC_SETTINGS.map(k => [k, s[k]])) }
function setSetting(k, v) {
  if (!PUBLIC_SETTINGS.includes(k)) return
  if (k === 'tabLayout' && !['side', 'top'].includes(v)) return
  if (k === 'adblockAllow') { if (!Array.isArray(v)) return; v = v.filter(x => typeof x === 'string' && /^[a-z0-9.-]+$/i.test(x)).slice(0, 500) }
  if (k === 'ntpOrder' || k === 'ntpHide') { if (!Array.isArray(v)) return; v = [...new Set(v.filter(x => typeof x === 'string' && /^[a-z]{1,20}$/.test(x)))].slice(0, 30) }
  if (k === 'ntpNote') v = String(v || '').slice(0, 4000)
  if (k === 'ntpZones') { if (!Array.isArray(v)) return; v = [...new Set(v.filter(z => typeof z === 'string' && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(z)))].slice(0, 4) }
  if (k === 'ntpFocus') v = v && typeof v === 'object' ? { len: Math.max(60e3, Math.min(4 * 3600e3, +v.len || 0)), end: +v.end || 0, left: Math.max(0, +v.left || 0), done: Math.max(0, Math.min(999, +v.done || 0)), day: String(v.day || '').slice(0, 10) } : null
  if (k === 'ntpSizes') { if (!v || typeof v !== 'object' || Array.isArray(v)) return; v = Object.fromEntries(Object.entries(v).filter(([id, n]) => /^[a-z]{1,20}$/.test(id) && [2, 3, 4, 6].includes(n)).slice(0, 30)) }
  if (k === 'ntpWeather' || k === 'ntpName') v = String(v || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, k === 'ntpName' ? 40 : 80)
  D.settings.set({ [k]: v, ...(!['sidebarCollapsed', 'sidebarWidth', 'introSeen'].includes(k) ? { settingsAt: Date.now() } : {}) })
  if (k === 'adblock') setAdblock(!!v)
  if (k === 'darkStyle' && !DARK_STYLES[v]) return
  if (k === 'forceDark' || k === 'darkOffSites' || k === 'darkStyle') setTimeout(darkAll, 0)
  if (k === 'soundActiveOnly' && !v) for (const w of windows) for (const t of w.tabs.values()) if (t.autoMuted && t.view) { t.view.webContents.setAudioMuted(!!t.muted); t.autoMuted = false }
  if (k === 'hideCookieBanners') setupAdblock().then(() => { setAdblock(!!D.settings.get('adblock')); refreshAdblock().catch(() => {}) })
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
const ytFix = new Map()   // webContents id -> { at, offered }
ipcMain.on('yt:stuck', async e => {
  const wc = e.sender, w = winForWc(wc.id); if (!w || !D.settings.get('adblock') || adAllowed(wc.getURL())) return
  const prev = ytFix.get(wc.id)
  if (!prev || Date.now() - prev.at > 10 * 60e3) {
    ytFix.set(wc.id, { at: Date.now() })
    log('youtube: a video is stuck, getting fresh ad-block lists')
    await refreshAdblock(adblockAge() > 30 * 60e3).catch(() => {})
    if (!wc.isDestroyed()) { wc.reload(); w.send('toast', 'The video was stuck, so Lumen got fresh ad-block lists and reloaded it') }
  } else if (!prev.offered) { prev.offered = true; w.send('yt-stuck', siteKey(wc.getURL())) }
})
ipcMain.on('nav:swipe', (e, dir) => {
  if (!D.settings.get('swipeNav')) return
  const h = e.sender.navigationHistory
  if (dir === 'back' && h.canGoBack()) h.goBack()
  if (dir === 'forward' && h.canGoForward()) h.goForward()
})
ipcMain.on('peek:open', (e, url) => { const w = winForWc(e.sender.id); if (w && /^https?:/.test(url)) w.openPeek(url) })
// asked by every page and frame as it starts (without waiting for the answer); pw says whether this site has saved
// passwords, so the page only watches for login fields where there is something to fill in
ipcMain.handle('lumen:qol', e => {
  const a = String(D.settings.get('accent') || '#5b8cff')
  let pw = false
  try { const o = frameOrigin(e); pw = !!o && /^https?:/.test(o) && D.passwords.get().some(p => !p.deleted && p.origin === o) } catch {}
  return { swipe: !!D.settings.get('swipeNav'), speed: !!D.settings.get('videoSpeedKeys'), accent: /^#[0-9a-f]{3,8}$/i.test(a) ? a : '#5b8cff', motion: D.settings.get('motion') || 'jelly', pw, ai: AI.ready() && D.settings.get('aiSelBubble') !== false }
})
ipcMain.on('lumen:auth-ua', e => { e.returnValue = googleCompat() && isGoogleSignIn(e.senderFrame && e.senderFrame.url) ? firefoxUA() : '' })

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
  return {
    async create({ rp, user }) {
      if (w && w.incognito) {
        const r = await novaDialog(w, { type: 'question', buttons: ['Save passkey', 'Cancel'], defaultId: 0, cancelId: 1, kind: 'passkey', icon: 'key', title: 'Passkey', message: `Save a passkey for ${rp}?`, detail: 'You are in a private window. The passkey is still saved in Lumen.' })
        if (r.response !== 0) return false
      } else if (!(isMac && systemPreferences.canPromptTouchID && systemPreferences.canPromptTouchID())) {
        const r = await novaDialog(w, { type: 'question', buttons: ['Save passkey', 'Cancel'], defaultId: 0, cancelId: 1, kind: 'passkey', icon: 'key', title: 'Passkey', message: `Save a passkey for ${rp}?`, detail: `Account: ${user || 'this account'}. Lumen keeps it with your passwords and syncs it if Sync is on.` })
        return r.response === 0
      }
      return verifyUser(`save a passkey for ${user || 'your account'} on ${rp}`)
    },
    async choose({ rp, accounts }) {
      let i = 0
      if (accounts.length > 1) {
        const r = await novaDialog(w, { type: 'question', buttons: [...accounts.slice(0, 6), 'Cancel'], defaultId: 0, cancelId: Math.min(accounts.length, 6), list: true, kind: 'passkey-choose', icon: 'key', title: 'Passkey', message: `Sign in to ${rp} with a passkey`, detail: 'Choose an account.' })
        if (r.response >= Math.min(accounts.length, 6)) return -1
        i = r.response
      } else if (!(isMac && systemPreferences.canPromptTouchID && systemPreferences.canPromptTouchID())) {
        const r = await novaDialog(w, { type: 'question', buttons: ['Sign in', 'Cancel'], defaultId: 0, cancelId: 1, kind: 'passkey', icon: 'key', title: 'Passkey', message: `Sign in to ${rp} as ${accounts[0]}?`, detail: 'Using a passkey saved in Lumen.' })
        return r.response === 0 ? 0 : -1
      }
      return (await verifyUser(`sign in to ${rp} as ${accounts[i]}`)) ? i : -1
    },
    // 4.4.3: say plainly why there is no passkey and offer a way through: your password, or (on a Mac) the site in Safari,
    // where passkeys saved in iCloud Keychain and on your iPhone live. Lumen cannot use those yet.
    async none(rp) {
      if (!isMac) { if (w) w.send('toast', `No Lumen passkey for ${rp}`); return }
      const url = (() => { try { return e.sender.getURL() } catch { return '' } })()
      const r = await novaDialog(w, { type: 'question', buttons: ['Use my password', 'Open in Safari', 'Cancel'], defaultId: 0, cancelId: 2, kind: 'passkey', icon: 'key', title: 'Passkey',
        message: `No passkey for ${rp} is saved in Lumen`,
        detail: 'Passkeys saved in Safari, iCloud Keychain or on your iPhone cannot be used in Lumen yet. Sign in with your password here, or open this page in Safari to use that passkey. Once you are signed in, you can add a passkey in this site\'s security settings while in Lumen, and it will work here every time.' })
      if (r.response === 1 && /^https:/.test(url)) require('child_process').execFile('open', ['-a', 'Safari', url], () => {})
    },
    async locked(rp, user) {
      await novaDialog(w, { type: 'warning', buttons: ['OK'], defaultId: 0, kind: 'passkey', icon: 'key', title: 'Passkey',
        message: `Lumen could not unlock your passkey for ${rp}`,
        detail: `macOS did not let this version of Lumen open the key it saved${user ? ' for ' + user : ''}. This can happen after an update. Sign in with your password, then remove the old passkey in Settings, Passwords and add a new one on the site.` })
    },
    // on Windows, a site with no Lumen passkey goes to Windows Hello (phones, security keys, Windows passkeys)
    fallback: () => process.platform === 'win32',
  }
}
// passkey autofill: a site waits (mediation: 'conditional') until the user picks an account in its sign-in field
const pkPending = new Map()
function pkCancel(id, why) { const p = pkPending.get(id); if (p) { pkPending.delete(id); p.resolve({ error: 'AbortError', message: why || 'The request was aborted.' }) } }
ipcMain.handle('pk:cond', (e, req) => {
  const origin = passkeyFrame(e); if (!origin) return { error: 'NotAllowedError', message: 'Not allowed in this frame.' }
  const id = e.sender.id
  pkCancel(id, 'Replaced by a newer request.')
  if (!pkPending.size || ![...pkPending.values()].some(p => p.wc === e.sender)) e.sender.once('destroyed', () => pkPending.delete(id))
  return new Promise(resolve => pkPending.set(id, { resolve, origin, req: req || {}, wc: e.sender }))
})
ipcMain.handle('pk:cond-cancel', e => pkCancel(e.sender.id))
ipcMain.handle('pk:accounts', e => {
  const p = pkPending.get(e.sender.id), origin = passkeyFrame(e)
  if (!p || p.origin !== origin) return []
  return Passkeys.accounts(origin, p.req)
})
ipcMain.handle('pk:pick', async (e, credId) => {
  const p = pkPending.get(e.sender.id), origin = passkeyFrame(e)
  if (!p || p.origin !== origin || typeof credId !== 'string') return false
  const ask = passkeyAsk(e)
  try {
    const r = await Passkeys.get(origin, { ...p.req, pick: credId }, { ...ask, fallback: null, async none() {}, async choose({ rp, accounts }) { return (await verifyUser(`sign in to ${rp} as ${accounts[0]}`)) ? 0 : -1 } })
    if (r.error || pkPending.get(e.sender.id) !== p) return false
    pkPending.delete(e.sender.id); p.resolve(r); return true
  } catch (err) { log('passkey autofill failed', err.message); return false }
})
ipcMain.handle('pk:create', async (e, req) => {
  const origin = passkeyFrame(e); if (!origin) return { error: 'NotAllowedError', message: 'Not allowed in this frame.' }
  try { const r = await Passkeys.create(origin, req || {}, passkeyAsk(e)); if (!r.error) { const w = winForWc(e.sender.id); if (w) w.send('toast', 'Passkey saved in Lumen'); Sync.syncNow().catch(() => {}) } return r }
  catch (err) { log('passkey create failed', err.message); return { error: 'UnknownError', message: 'Lumen could not create the passkey.' } }
})
ipcMain.handle('pk:get', async (e, req) => {
  const origin = passkeyFrame(e); if (!origin) return { error: 'NotAllowedError', message: 'Not allowed in this frame.' }
  pkCancel(e.sender.id, 'A sign-in button started a new passkey request.')
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
      case 'aiSetKey': { const k = String(a[0] || '').trim(); if (!k) return { ok: true, ready: AI.setKey('') }; const v = await AI.validate(k); if (v.ok || (a[1] && v.kind === 'offline')) AI.setKey(k); return { ...v, ready: AI.ready() } }
      case 'aiStatus': return { ready: AI.ready(), tier: AI.tier() }
      case 'settings': return { settings: publicSettings(), engines: Object.fromEntries(Object.entries(SEARCH).map(([k, v]) => [k, v.name])), version: app.getVersion(), platform: process.platform }
      case 'setSetting': return setSetting(a[0], a[1])
      case 'topSites': return D.topSites(8)
      case 'siteIcons': return w && w.incognito ? {} : D.iconsFor(a[0])
      case 'stats': return { blocked: blockedTotal, since: D.settings.get('statsSince') || 0 }
      case 'home': { const week = blockedWeek(); return { private: !!(w && w.incognito), today: week[6].n, week, total: blockedTotal, adblock: !!D.settings.get('adblock'), closed: w && w.incognito ? [] : closedTabs.slice(-6).reverse().map(c => ({ url: c.url, title: c.title || '' })) } }
      case 'suggest': return suggest(w || { incognito: false }, String(a[0] || '').slice(0, 300), a[1])
      case 'suggestWeb': return webSuggest(w || { incognito: false }, String(a[0] || '').slice(0, 300))
      case 'weather': return weatherFor(a[0])
      case 'homeCmd': { if (!w) return; const c = a[0]; if (c === 'palette' || c === 'ai') w.send('command', c); else if (c && typeof c === 'object' && typeof c.ask === 'string' && c.ask.trim()) w.send('command', { ai: 'chat', text: c.ask.trim().slice(0, 4000) }); return }
      case 'adblockInfo': return { updatedAt: D.settings.get('adblockUpdatedAt') || 0, refreshing: !!adRefreshing }
      case 'adblockRefresh': return refreshAdblock(true)
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
      case 'readLater': return readLaterList(a[0] || 300)
      case 'archive': return D.archive.get().slice(0, 500)
      case 'getApp': return getSeparateApp(String(a[0] || ''))   // the Get Surge and Koi card in Settings
      case 'parcels': Parcels.prune(); return Parcels.list().map(parcelView)
      case 'parcelCarriers': return Object.entries(Parcels.CARRIERS).map(([k, c]) => ({ id: k, name: c.name, region: c.region }))
      case 'parcelDetect': return Parcels.detect(a[0])
      case 'parcelAdd': { const o = a[0] || {}; const url = /^https?:\/\//i.test(String(o.url || '')) ? String(o.url) : ''; const p = Parcels.add({ number: o.number, name: o.name, carrier: o.carrier, url, source: 'manual' }); if (p) setTimeout(() => checkParcels(true).catch(() => {}), 500); return p ? parcelView(p) : null }
      case 'parcelRemove': return Parcels.remove(String(a[0]))
      case 'parcelEdit': { const o = a[1] || {}, p = Parcels.list().find(x => x.id === a[0]); if (!p) return null
        const patch = { name: String(o.name || '').slice(0, 80), expected: /^\d{4}-\d{2}-\d{2}$/.test(o.expected || '') ? o.expected : '' }
        if (o.number !== undefined) { const n = Parcels.clean(o.number); patch.number = n; patch.carrier = n ? (Parcels.CARRIERS[o.carrier] ? o.carrier : Parcels.detect(n)) : '' }
        if (o.url !== undefined) patch.url = /^https?:\/\//i.test(String(o.url || '')) ? String(o.url) : ''
        return parcelView(Parcels.update(p.id, patch)) }
      case 'parcelClipboard': { const c = String(clipboard.readText() || '').trim(); return c.length < 40 && Parcels.looksLikeTracking(c) ? { number: Parcels.clean(c), carrier: Parcels.detect(c) } : null }
      case 'parcelDelivered': { const p = Parcels.list().find(x => x.id === a[0]); if (p) Parcels.setStatus(p, a[1] === false ? { status: 'placed', text: 'Waiting for news' } : { status: 'delivered', text: 'Delivered' }); return true }
      case 'parcelRename': return Parcels.update(String(a[0]), { name: String(a[1] || '').slice(0, 80) })
      case 'parcelOpen': { const p = Parcels.list().find(x => x.id === a[0]); const u = p && Parcels.openURL(p); if (u) { if (a[1] && w) w.createTab(u, { active: false }); else e.sender.loadURL(u) } return }
      case 'parcelRefresh': return checkParcels(true).then(() => Parcels.list().map(parcelView))
      case 'highlights': return D.highlights.get().map(h => ({ id: h.id, url: h.url, title: h.title, text: h.text, color: h.color, t: h.t }))
      case 'highlightRemove': return removeHighlight(String(a[0] || ''))
      case 'archiveRemove': return a[0] ? D.removeArchive(String(a[0])) : D.archive.replace([])
      case 'readLaterDone': return D.removeReadLater(String(a[0] || ''))
      case 'deleteHistory': return D.deleteHistory(a[0])
      case 'deleteHistoryHost': return D.deleteHistoryHost(a[0])
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
      case 'replayIntro': { if (w) { w.win.focus(); w.send('command', 'intro') } return }
      case 'retry': { const u = String(a[0] || ''); if (/^(https?|lumen):\/\//i.test(u)) e.sender.loadURL(u); return }
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
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { label: 'Quit Lumen', accelerator: 'Cmd+Q', click: () => quitLumen() },
    ] }] : []),
    { label: 'File', submenu: [
      { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: focused(w => w.createTab()) },
      { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: () => createWindow({}) },
      { label: 'New Private Window', accelerator: 'CmdOrCtrl+Shift+N', click: () => createWindow({ incognito: true }) },
      { label: 'Reopen Closed Tab', accelerator: 'CmdOrCtrl+Shift+T', click: focused(w => reopenClosed(w)) },
      { label: 'Open Location...', accelerator: 'CmdOrCtrl+L', click: focused(w => w.send('command', 'location')) },
      { type: 'separator' },
      { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: focused((w, t) => t ? w.closeTab(t.id, { undo: true }) : w.win.close()) },
      { label: 'Close Window', accelerator: 'CmdOrCtrl+Shift+W', click: focused(w => w.win.close()) },
      { type: 'separator' },
      { label: 'Save Page As...', accelerator: 'CmdOrCtrl+S', click: focused((w, t) => activeWc(w, t) && savePage(activeWc(w, t))) },
      { label: 'Print...', accelerator: 'CmdOrCtrl+P', click: focused((w, t) => activeWc(w, t) && printPage(w, activeWc(w, t))) },
      ...(isMac ? [] : [{ type: 'separator' }, { label: 'Settings', accelerator: 'Ctrl+,', click: focused(w => openSettings(w)) }, { label: 'Exit', accelerator: 'Ctrl+Q', click: () => quitLumen() }]),
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
      { label: 'Bookmarks Bar', accelerator: 'CmdOrCtrl+Shift+B', click: () => setSetting('bookmarksBar', D.settings.get('bookmarksBar') === false) },
      { label: 'Tab Overview', accelerator: 'CmdOrCtrl+Shift+O', click: focused(w => w.send('command', 'tabgrid')) },
      { label: 'Lumen AI', accelerator: 'CmdOrCtrl+Shift+A', click: focused(w => w.send('command', 'ai')) },
      { label: 'Switch Ask / Do it for Me', accelerator: 'CmdOrCtrl+Alt+A', click: focused(w => w.send('command', 'aimode')) },
      { label: 'Sort Tabs into Groups', accelerator: 'CmdOrCtrl+Alt+G', click: focused(w => autoGroupWindow(w)) },
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
      { label: 'Focus Mode', accelerator: 'CmdOrCtrl+Shift+F', click: focused(w => setFocusMode(w, !w.focusMode)) },
      { label: 'Parcels', accelerator: 'CmdOrCtrl+Alt+P', click: focused(w => w.createTab('lumen://parcels')) },
      { label: 'Save to Read Later', accelerator: 'CmdOrCtrl+Shift+D', click: focused((w, t) => toggleReadLater(w, t)) },
      { label: 'Show Read Later', click: focused(w => w.createTab('lumen://readlater')) },
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

// ---------------------------------------------------------------- tab thumbnails for the hover preview
// only a tab that is on screen can be captured, so each tab keeps the last picture taken while it was visible
async function snapTab(t) {
  if (!t || !t.view || t.view.webContents.isDestroyed() || t.asleep) return
  try {
    let tm
    const img = await Promise.race([t.view.webContents.capturePage(), new Promise(r => { tm = setTimeout(() => r(null), 1500) })]).finally(() => clearTimeout(tm))
    // the picture is kept as taken and encoded later, when nothing is happening (or right away when someone asks for
    // it): shrinking and encoding it took 10 to 40 ms of the main process on every tab switch
    if (img && !img.isEmpty()) { t.thumbImg = img; try { t.thumbImgUrl = t.view.webContents.getURL() } catch {} thumbQueue.add(t); thumbSoon() }
  } catch {}
}
// JPEG: several times quicker to encode than PNG on the main process, and a fraction of the size over IPC
function thumbOf(t) {
  if (t && t.thumbImg) { const img = t.thumbImg; t.thumbImg = null; thumbQueue.delete(t); t.thumbUrl = t.thumbImgUrl; try { t.thumb = 'data:image/jpeg;base64,' + img.resize({ width: 480, quality: 'good' }).toJPEG(84).toString('base64') } catch {} }
  return (t && t.thumb) || null
}
const thumbQueue = new Set()
let thumbT = null
function thumbSoon() {
  clearTimeout(thumbT)
  thumbT = setTimeout(function next() {
    thumbT = null
    const t = thumbQueue.values().next().value; if (!t) return
    thumbOf(t)
    if (thumbQueue.size) thumbT = setTimeout(next, 30)
  }, 1200)
}

// ---------------------------------------------------------------- dark mode for websites
// Only pages that are actually light get turned dark, by inverting the page and flipping images and video back,
// so text always stays readable. Sites that already have a dark design are left alone, and any site can opt out.
const DARK_DETECT = `(() => {
  const early = document.getElementById('lumen-dark-early'); if (early) early.disabled = true
  try {
  const lum = el => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const m = (getComputedStyle(e).backgroundColor.match(/[\\d.]+/g) || []).map(Number); if (m.length >= 3 && (m[3] === undefined || m[3] > 0.5)) return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 } return null }
  const meta = (document.querySelector('meta[name="color-scheme"]') || {}).content || ''
  const pts = [[.5, .5], [.25, .35], [.75, .35], [.5, .85]].map(([x, y]) => lum(document.elementFromPoint(innerWidth * x, innerHeight * y)))
  const base = lum(document.body) ?? lum(document.documentElement) ?? 1
  const vals = pts.map(v => v ?? base)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  // A dark hero banner over a white page (pub.dev, many landing pages) fools the paint samples, so also read
  // the text: on a light page most of the words, down the whole document, are written in dark ink.
  let ink = 0, all = 0
  const w = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT)
  for (let n, seen = 0; (n = w.nextNode()) && seen < 1500; seen++) {
    const len = n.nodeValue.trim().length, el = n.parentElement
    if (len < 3 || !el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || (el.checkVisibility && !el.checkVisibility())) continue
    const m = (getComputedStyle(el).color.match(/[\\d.]+/g) || []).map(Number)
    if (m.length < 3 || m[3] === 0) continue
    all += len; if ((0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 < 0.4) ink += len
  }
  const inky = all > 400 && ink / all > 0.7
  return { light: (avg > 0.55 || inky) && !/^\\s*dark\\s*$/.test(meta), avg, ink: all ? ink / all : 0 }
  } finally { if (early) early.disabled = false }
})()`
// The dark theme itself is built by Dark Reader (MIT): it reads the page's own colors and writes a real dark
// version of them, so logos, photos and brand colors stay right. Lumen decides when: only on pages that are light.
const darkKeys = new Map()      // webContents id -> true while Dark Reader is on for the current document
const darkHosts = new Set()     // hosts known to be light, so the next page there starts dark with no white flash
const darkBusy = new Set()
let DR_SRC = null
const drSrc = () => DR_SRC || (DR_SRC = fs.readFileSync(require.resolve('darkreader'), 'utf8'))
const DARK_STYLES = {
  soft: { brightness: 104, contrast: 90, sepia: 10, darkSchemeBackgroundColor: '#23262d', darkSchemeTextColor: '#dcdfe6' },
  balanced: { brightness: 100, contrast: 96, sepia: 0, darkSchemeBackgroundColor: '#17191d', darkSchemeTextColor: '#e6e8ee' },
  deep: { brightness: 100, contrast: 102, sepia: 0, darkSchemeBackgroundColor: '#000000', darkSchemeTextColor: '#f1f3f6' },
}
const darkTheme = () => DARK_STYLES[D.settings.get('darkStyle')] || DARK_STYLES.balanced
const DR_WORLD = 999   // the preload's world, where the fetch helper for cross-site stylesheets lives
const darkOn = () => `(() => { const R = globalThis.DarkReader; if (!R) return false; if (globalThis.__lumenFetch) R.setFetchMethod(globalThis.__lumenFetch); if (globalThis.__lumenDRFetch) { try { R.Plugins = { fetch: globalThis.__lumenDRFetch } } catch {} } R.enable(${JSON.stringify(darkTheme())}); const e = document.getElementById('lumen-dark-early'); if (e) e.remove(); return true })()`
const DARK_OFF = `(() => { try { globalThis.DarkReader && globalThis.DarkReader.disable() } catch {} const e = document.getElementById('lumen-dark-early'); if (e) e.remove(); return true })()`
const siteDarkOff = url => { const h = siteKey(url); return !!h && (D.settings.get('darkOffSites') || []).some(a => h === a || h.endsWith('.' + a)) }
const darkWanted = url => !!D.settings.get('forceDark') && /^https?:/.test(url) && !siteDarkOff(url)
async function darkPage(wc) {
  if (!wc || wc.isDestroyed()) return
  const url = wc.getURL(), run = code => wc.executeJavaScriptInIsolatedWorld(DR_WORLD, [{ code }])
  if (!darkWanted(url)) { if (darkKeys.delete(wc.id)) run(DARK_OFF).catch(() => {}); return }
  if (darkKeys.has(wc.id) || darkBusy.has(wc.id)) return
  darkBusy.add(wc.id)
  try {
    const r = await wc.executeJavaScriptInIsolatedWorld(1020, [{ code: DARK_DETECT }])
    if (wc.isDestroyed()) return
    if (!r || !r.light) { run(DARK_OFF).catch(() => {}); return }
    await run(`if (!globalThis.DarkReader) { ${drSrc()}\n }; true`)
    const ok = await run(darkOn())
    if (!ok) return
    if (!darkWanted(wc.getURL())) { run(DARK_OFF).catch(() => {}); return }
    darkKeys.set(wc.id, true); darkHosts.add(siteKey(url))
  } catch (e) { log('dark mode failed', e.message) } finally { darkBusy.delete(wc.id) }
}
function darkAll() {
  for (const w of windows) for (const t of w.tabs.values()) {
    if (!t.view || t.view.webContents.isDestroyed()) continue
    const wc = t.view.webContents
    if (darkKeys.has(wc.id) && darkWanted(wc.getURL())) wc.executeJavaScriptInIsolatedWorld(DR_WORLD, [{ code: DARK_OFF }, { code: darkOn() }]).catch(() => {})
    else darkPage(wc)
  }
}
// stylesheets and images on other domains cannot be read from inside the page, so the browser fetches them for the theme engine
ipcMain.handle('lumen:css', async (e, url) => {
  try {
    if (!/^https?:\/\//i.test(String(url))) return { ok: false }
    const r = await e.sender.session.fetch(String(url), { credentials: 'omit' })
    if (!r.ok) return { ok: false }
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length > 6 * 1024 * 1024) return { ok: false }
    return { ok: true, type: r.headers.get('content-type') || '', b64: buf.toString('base64') }
  } catch { return { ok: false } }
})
ipcMain.on('lumen:dark-early', e => {
  let u = ''; try { u = e.senderFrame.url } catch {}
  e.returnValue = darkWanted(u) && darkHosts.has(siteKey(u)) ? darkTheme().darkSchemeBackgroundColor : ''
})
function toggleSiteDark(w, on) {
  const t = w.active(); if (!t || !t.view) return
  const h = siteKey(t.view.webContents.getURL()); if (!h) return
  let list = (D.settings.get('darkOffSites') || []).filter(a => !(h === a || h.endsWith('.' + a)))
  if (!on) list.push(h)
  D.settings.set({ darkOffSites: list })
  darkAll(); w.pushState()
  w.send('toast', on ? `Dark mode on for ${h}` : `Dark mode off for ${h}`)
}

app.on('before-quit', () => { try { if (blockedTotal) D.settings.set({ blockedTotal, ...(blockedDays ? { blockedDays } : {}) }) } catch {} })

// ---------------------------------------------------------------- Nova dialogs and HTTP sign-in
// parent: a Lumen window (or its BaseWindow). Without one, or if the Nova sheet cannot load, the system dialog asks.
function novaDialog(parent, opts) {
  const host = parent && (windows.includes(parent) ? parent : windows.find(w => w.win === parent))
  return Nova.novaDialog(host && !host.win.isDestroyed() ? host : null, opts)
}
function crashedOrigin(u) { try { const x = new URL(u); if (x.protocol === 'lumen:' && x.host === 'crashed' && x.searchParams.get('url')) return x.searchParams.get('url') } catch {} return u }
// sites that use HTTP sign-in (basic and digest auth, and proxies) ask for a username and password in a Nova sheet
app.on('login', (event, wc, details, authInfo, callback) => {
  const w = wc ? winForWc(wc.id) : null
  if (!w) return   // nothing to ask in: Electron's default cancels the sign-in
  event.preventDefault()
  const host = authInfo && authInfo.host ? authInfo.host + (authInfo.port && ![80, 443].includes(authInfo.port) ? ':' + authInfo.port : '') : (() => { try { return new URL(details.url).host } catch { return '' } })()
  const realm = authInfo && authInfo.realm ? `It says: "${String(authInfo.realm).slice(0, 120)}". ` : ''
  novaDialog(w, {
    buttons: ['Sign in', 'Cancel'], defaultId: 0, cancelId: 1, kind: 'login', icon: 'lock', title: authInfo && authInfo.isProxy ? 'Proxy sign-in' : 'Sign in',
    message: `Sign in to ${host}`,
    detail: realm + (/^http:/.test((details && details.url) || '') && !(authInfo && authInfo.isProxy) ? 'This connection is not private, so the password is sent without encryption.' : 'Your username and password go only to this site.'),
    error: details && details.firstAuthAttempt === false ? 'That username or password was not accepted. Try again.' : '',
    fields: [{ name: 'user', label: 'Username' }, { name: 'pass', label: 'Password', type: 'password' }],
  }).then(r => {
    if (r.response === 0 && r.values) callback(String(r.values.user || ''), String(r.values.pass || ''))
    else callback()
  }, () => callback())
})

// ---------------------------------------------------------------- quit guard (only for Cmd+Q, never for updates or shutdown)
// reopening Lumen with no window (Dock click, second launch): a fresh window
function comeBack() {
  if (windows.length) return lastFocused() || windows[0]
  return createWindow({})
}
function restoreWindows(all) {
  const saved = D.session.get().windows || [], restore = all || D.settings.get('restoreSession')
  let first = null
  saved.forEach(sw => {
    const tabs = restore ? sw.tabs : sw.tabs.filter(t => t.pinned)
    const w = createWindow({ restore: tabs.length ? { tabs, groups: sw.groups || [], active: restore ? sw.active : 0 } : null, bounds: sw.bounds })
    first = first || w
  })
  return first || createWindow({})
}
function quitLumen() { confirmQuit() }
function confirmQuit() {
  const n = windows.reduce((a, w) => a + w.tabs.size, 0)
  if (!D.settings.get('confirmQuit') || n < 2) return app.quit()
  const fw = windows.find(w => w.win.isFocused()) || windows[0]
  novaDialog(fw, { type: 'question', buttons: ['Quit', 'Cancel'], defaultId: 0, cancelId: 1, kind: 'quit', icon: 'quit', message: `Quit Lumen with ${n} tabs open?`, detail: D.settings.get('restoreSession') !== false ? 'Your tabs will be back next time you open Lumen.' : 'Your tabs will be closed.', checkboxLabel: 'Do not ask again', checkboxChecked: false })
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

// ---------------------------------------------------------------- tab archive
// Tabs you have not opened for a long time close themselves into the archive (lumen://history), so the strip stays tidy.
// Pinned tabs, tabs playing sound, tabs in split view and the tab in front are never archived.
function archiveIdleTabs(now = Date.now()) {
  const hours = +D.settings.get('archiveTabsAfterH') || 0
  if (!hours) return 0
  const cutoff = now - hours * 3600000
  let n = 0
  for (const w of windows) {
    if (w.incognito) continue
    const idle = [...w.tabs.values()].filter(t => !t.pinned && !t.audible && !t.playing && t.id !== w.activeId && t.id !== w.splitId && t.lastActive < cutoff)
    for (const t of idle) {
      if (w.order.length <= 1) break
      const url = t.view && !t.view.webContents.isDestroyed() ? t.view.webContents.getURL() : t.url
      if (/^https?:/.test(url)) D.addArchive(url, t.title, t.lastActive)
      w.closeTab(t.id); n++
    }
    if (n) w.send('toast', `Archived ${n} idle tab${n > 1 ? 's' : ''}`)
  }
  return n
}
setInterval(() => { try { archiveIdleTabs() } catch (e) { log('archive failed', e.message) } }, 5 * 60000)

// ---------------------------------------------------------------- focus mode
// The page fills the whole window. Touch the top edge with the mouse and the tabs and toolbar come back.
function setFocusMode(w, on) {
  w.focusMode = !!on; w.focusPeek = !!on   // start revealed for a moment so you can see what happened
  clearInterval(w.focusTimer); w.focusTimer = null
  w.layout(); w.send('focus-mode', w.focusMode)
  if (!on) return
  w.send('toast', `Focus mode. Point at the top edge for tabs. ${isMac ? 'Shift Cmd' : 'Shift Ctrl'} F to leave.`)
  let hideAt = Date.now() + 2200
  w.focusTimer = setInterval(() => {
    if (w.win.isDestroyed() || !w.focusMode) { clearInterval(w.focusTimer); return }
    if (!w.win.isFocused() && !w.focusPeek) return
    const p = screen.getCursorScreenPoint(), b = w.win.getContentBounds()
    const inside = p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y - 4 && p.y <= b.y + b.height
    const y = p.y - b.y
    if (!w.focusPeek && inside && y <= 3) { w.focusPeek = true; hideAt = 0; w.layout() }
    else if (w.focusPeek && !w.overlay && Date.now() > hideAt && (!inside || y > w.rect.y + 24)) { w.focusPeek = false; w.layout() }
  }, 90)
}

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
  if (handleArgs(argv)) return
  const urls = argv.filter(a => /^(https?|file):/.test(a))
  if (urls.length) urls.forEach(openExternalURL)
  else { const w = windows.length ? lastFocused() : comeBack(); if (w) { if (w.win.isMinimized()) w.win.restore(); w.win.show(); w.win.focus() } }
})

// ---------------------------------------------------------------- print, Dock menu, Windows jump list
// wc.print() is Chromium's own print dialog (the system one on Mac and Windows); Lumen only steps in when it fails
function printFailed(w, why) {
  if (!why || /cancel/i.test(why)) return false
  return novaDialog(w, { kind: 'print', icon: 'printer', buttons: ['OK'], message: 'Could not print this page', detail: /fail/i.test(why) ? 'The printer or the print system did not take the job. Check that a printer is connected, then try again.' : String(why) }).catch(() => {})
}
function printPage(w, wc) {
  try { wc.print({}, (ok, why) => { if (!ok && w && !w.win.isDestroyed()) printFailed(w, why) }) } catch (e) { printFailed(w, e && e.message || 'failed') }
}
// the windows to open things in from the Dock or the taskbar
function dockWin() { const w = windows.find(x => !x.incognito && !x.win.isDestroyed()) || comeBack(); if (w && w.win.isMinimized()) w.win.restore(); return w }
function dockOpen(url) { const w = dockWin(); if (!w) return; w.createTab(url); w.win.show(); w.win.focus() }
// the five sites you opened last (one per host), for the Dock menu
function recentSites(n = 5) {
  const best = new Map()
  for (const h of D.historyMap.values()) {
    if (!/^https?:/.test(h.url)) continue
    let host; try { host = new URL(h.url).host } catch { continue }
    const b = best.get(host); if (!b || h.t > b.t) best.set(host, h)
  }
  return [...best.values()].sort((a, b) => b.t - a.t).slice(0, n).map(h => ({ title: h.title || h.url, url: h.url }))
}
function dockTemplate(recent = []) {
  const tpl = [
    { label: 'New Window', click: () => { if (isMac && app.dock) app.dock.show(); const w = createWindow({}); w.win.show() } },
    { label: 'New Private Window', click: () => { if (isMac && app.dock) app.dock.show(); const w = createWindow({ incognito: true }); w.win.show() } },
    { label: 'New Tab', click: () => dockOpen('lumen://newtab') },
    { type: 'separator' },
    { label: 'Read Later', click: () => dockOpen('lumen://readlater') },
    { label: 'Downloads', click: () => dockOpen('lumen://downloads') },
  ]
  if (recent.length) tpl.push({ type: 'separator' }, ...recent.map(r => ({ label: r.title.length > 40 ? r.title.slice(0, 39) + '...' : r.title, click: () => openExternalURL(r.url) })))
  return tpl
}
const JUMP = [['--lumen-new-window', 'New Window', 'Open a new Lumen window'], ['--lumen-private', 'New Private Window', 'Open a private window that keeps no history'], ['--lumen-new-tab', 'New Tab', 'Open a new tab']]
function jumpTasks(exe) { return JUMP.map(([arg, title, description]) => ({ program: exe, arguments: arg, iconPath: exe, iconIndex: 0, title, description })) }
// the jump list and the Dock pass these; true when one was handled
function handleArgs(argv) {
  const a = argv || []
  if (a.includes('--lumen-private')) { dockTemplate()[1].click(); return true }
  if (a.includes('--lumen-new-window')) { dockTemplate()[0].click(); return true }
  if (a.includes('--lumen-new-tab')) { dockOpen('lumen://newtab'); return true }
  return false
}
function setupDockAndJumpList() {
  try {
    if (isMac && app.dock) {
      const set = () => { try { app.dock.setMenu(Menu.buildFromTemplate(dockTemplate(recentSites()))) } catch {} }
      set()
      // the recent sites stay fresh: rebuilt when Lumen stops being the active app (as you reach for the Dock)
      app.on('did-resign-active', set)
    }
    if (process.platform === 'win32') app.setUserTasks(jumpTasks(process.execPath))
  } catch (e) { log('dock / jump list failed', e && e.message) }
}

// ---------------------------------------------------------------- lifecycle
let quitting = false
function flushAll() {
  saveSessionNow()
  for (const s of [D.settings, D.bookmarks, D.passwords, D.permissions, D.session, D.readLater, D.archive, D.highlights, Parcels.store, Passkeys.store]) s.flush()
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
app.on('window-all-closed', () => { if (isMac || quitting) return; app.quit() })
app.on('activate', () => { if (!windows.length && app.isReady() && mainSession) comeBack() })
process.on('uncaughtException', err => { console.error('uncaught', err); log('UNCAUGHT', err && err.stack || err) })
process.on('unhandledRejection', err => { console.error('unhandled', err); log('UNHANDLED', err && err.stack || err) })

app.whenReady().then(async () => {
  nativeTheme.themeSource = D.settings.get('theme') || 'system'
  Nova.configure({ accent: () => D.settings.get('accent'), motion: () => D.settings.get('motion'), dark: () => nativeTheme.shouldUseDarkColors, log })
  app.userAgentFallback = chromeUA(app.userAgentFallback)
  mainSession = session.fromPartition('persist:lumen')
  setupSession(mainSession)
  for (const origin of ['https://www.youtube.com', 'https://m.youtube.com', 'https://music.youtube.com', 'https://youtube.com']) {
    mainSession.clearStorageData({ origin, storages: ['serviceworkers'] }).catch(() => {})
  }
  buildMenu()
  await Promise.race([setupExtensions(), new Promise(r => setTimeout(r, 4000))])
  setupAdblock().then(() => setTimeout(() => refreshAdblock().catch(() => {}), 20000)) // loads in the background; blocking turns on as soon as lists are ready, fresh lists follow
  setInterval(() => refreshAdblock().catch(() => {}), 30 * 60e3)
  powerMonitor.on('resume', () => setTimeout(() => refreshAdblock().catch(() => {}), 15000))
  const saved = D.session.get().windows || []
  const argUrls = process.argv.slice(1).filter(a => /^(https?|file):/.test(a))
  if (saved.length) restoreWindows(false)
  else createWindow({})
  for (const u of [...argUrls, ...pendingOpen.splice(0)]) openExternalURL(u)
  handleArgs(process.argv)
  setupDockAndJumpList()
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
    appIcon: () => D.settings.get('appIcon'),
    accent: () => D.settings.get('accent'),
    notify: (title, body) => { try { const { Notification } = require('electron'); if (Notification.isSupported()) new Notification({ title, body, silent: true }).show() } catch {} },
  })
  // the windows opened in the restart screen's ink: back to the normal background once the arrival has played
  if (windows.some(w => w.arrived)) setTimeout(() => { for (const w of windows) { try { w.win.setBackgroundColor(winBg(w.incognito)) } catch {} } }, 6000)
  log('boot ' + app.getVersion())
  separateAppsCheck()
  Sync.start()
  nativeTheme.on('updated', () => { broadcast('theme', nativeTheme.shouldUseDarkColors); for (const w of windows) { try { w.win.setBackgroundColor(winBg(w.incognito)); for (const t of w.tabs.values()) if (t.view && !t.view.webContents.isDestroyed()) t.view.setBackgroundColor(tabBg(t.view.webContents.getURL() || t.url, w.incognito)) } catch {} } })
  powerMonitor.on('resume', () => Sync.syncNow().catch(() => {}))
})

module.exports = { windows, createWindow, D, __suggest: suggest, allowSites, toggleSiteAdblock, __refreshAdblock: refreshAdblock, __adblockAge: adblockAge, __hl_add: addHighlight, __hl_recolor: recolorHighlight, __addToNTP: addToNTP, __checkParcels: checkParcels, __separateApps: { check: separateAppsCheck, had: hadBuiltInApps, LINKS: SEPARATE_APPS }, __nova: Nova, __novaDialog: novaDialog, __tabMenu: tabMenu, __readerMode: readerMode, __appMenu: appMenuPopup, __confirmQuit: confirmQuit, __printFailed: printFailed, __dockTemplate: dockTemplate, __jumpTasks: jumpTasks, __handleArgs: handleArgs, __recentSites: recentSites }
