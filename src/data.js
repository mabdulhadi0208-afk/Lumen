// All persistent user data: settings, bookmarks, history, passwords, site permissions, session.
const { safeStorage } = require('electron')
const { Store, uid } = require('./store')

const settings = new Store('settings', {
  searchEngine: 'google',
  motion: 'jelly',           // jelly | calm | off
  theme: 'system',           // system | light | dark
  accent: '#5b8cff',
  adblock: true,
  blockTrackers: true,
  httpsOnly: false,
  sleepTabsAfterMin: 30,
  restoreSession: true,
  sidebarCollapsed: false,
  tabLayout: 'top',          // top | side
  sidebarWidth: 248,
  introSeen: false,
  autoPip: true,
  browserTheme: 'default',
  themeCustom: { a: '#5b8cff', b: '#8a63f2', angle: 135, glass: false },
  compact: false,
  appIcon: 'default', aiModel: 'fast', aiTabGroups: true, adblockAllow: [], searchShortcuts: true, translateFlipDir: true, darkOffSites: [], bookmarksBar: true, blockedTotal: 0, statsSince: 0, darkStyle: 'balanced', uiSounds: false, rememberZoom: true, zoomBySite: {}, soundActiveOnly: false, linksBackground: false, confirmQuit: true, wheelTabs: true, aiKey: '',
  cleanLinks: true,
  swipeNav: true,
  videoSpeedKeys: true,
  hideCookieBanners: true,
  blockNotifications: false,
  forceDark: false,
  translateTo: '',            // '' = system language
  offerTranslate: true,
  neverTranslate: [],
  alwaysTranslate: [],
  ntpShortcuts: null,        // null = most visited
  ntpWallpaper: 'theme',      // Match theme: the home background follows the browser theme
  ntpClock: true,
  ntpBanner: 'modern',
  sync: { enabled: false, folder: '', lastSync: 0 },
  autoUpdate: true,
  askWhereToSave: false,
  doNotTrack: true,
  showSuggestions: true,
  homeTiles: true,
  archiveTabsAfterH: 0,       // 0 = never
  parcelsAuto: null,          // null = not asked yet
  googleSignInMode: 'chrome', // chrome | firefox (compatibility)
  whatsNewSeen: '',           // last version whose what's-new film was shown
})

const bookmarks = new Store('bookmarks', [])
const passwords = new Store('passwords', [])
const permissions = new Store('permissions', {}) // { origin: { permission: 'allow'|'deny' } }
const session = new Store('session', { windows: [] })
const historyStore = new Store('history', [])
const readLater = new Store('readlater', [])
const archive = new Store('archive', [])
const highlights = new Store('highlights', [])   // { id, url, title, text, prefix, suffix, color, t }
// tabs that closed themselves after sitting unused; newest first
function addArchive(url, title, t) { archive.replace([{ url, title: String(title || url).slice(0, 300), t: t || Date.now(), at: Date.now() }, ...archive.get().filter(x => x.url !== url)].slice(0, 500)) }
function removeArchive(url) { archive.replace(archive.get().filter(x => x.url !== url)) }

// ---------- read later ----------
// Pages saved to read later, newest first. Opening one from the list takes it off.
const isReadLater = url => readLater.get().some(x => x.url === url)
function addReadLater(url, title) {
  if (!/^https?:/.test(url)) return false
  readLater.replace([{ url, title: String(title || url).slice(0, 300), t: Date.now() }, ...readLater.get().filter(x => x.url !== url)].slice(0, 300))
  return true
}
function removeReadLater(url) { readLater.replace(readLater.get().filter(x => x.url !== url)) }

// ---------- history ----------
const historyMap = new Map()
for (const h of historyStore.get()) historyMap.set(h.url, h)
// sorted history and Most visited are worked out once per change, not on every New Tab (history can hold 20,000 pages)
let histSorted = null, topCache = null
const histChanged = () => { histSorted = null; topCache = null }
// the chrome keeps its own copy of history to search as you type (no message per key): it gets these changes
const histListeners = new Set()
const histEvent = op => { for (const fn of histListeners) { try { fn(op) } catch {} } }
function onHistory(fn) { histListeners.add(fn); return () => histListeners.delete(fn) }
const historyCompact = () => sortedHistory().map(h => [h.url, h.title, h.visits, h.t])
function addHistory(url, title) {
  if (!/^https?:/.test(url)) return
  // a visit is always the newest page: it moves to the front of the sorted list (no re-sort of 20,000 pages per click)
  const sorted = histSorted
  histChanged()
  let h = historyMap.get(url)
  if (h) { h.visits++; h.t = Math.max(Date.now(), sorted && sorted[0] ? sorted[0].t : 0); if (title) h.title = title }
  else { h = { url, title: title || url, t: Date.now(), visits: 1 }; if (sorted && sorted[0] && sorted[0].t > h.t) h.t = sorted[0].t; historyMap.set(url, h) }
  if (sorted) { const i = sorted.indexOf(h); histSorted = i === 0 ? sorted.slice() : i > 0 ? [h, ...sorted.slice(0, i), ...sorted.slice(i + 1)] : [h, ...sorted] }
  histEvent(['add', h.url, h.title, h.visits, h.t])
  flushHistory()
}
function updateHistoryTitle(url, title) {
  const h = historyMap.get(url)
  if (h && title && h.title !== title) { h.title = title; topCache = null; lastSearch = null; histEvent(['title', url, title]); flushHistory() }
}
let histTimer
const sortedHistory = () => histSorted || (histSorted = [...historyMap.values()].sort((a, b) => b.t - a.t))
// history is written at most every few seconds while you browse (each write serializes the whole list), and right
// away on quit (flushAll in main.js)
function flushHistory() {
  if (histTimer) return
  histTimer = setTimeout(() => {
    histTimer = null
    let arr = sortedHistory()
    if (arr.length > 20000) {
      arr = arr.slice(0, 20000)
      historyMap.clear(); for (const h of arr) historyMap.set(h.url, h)
      histChanged(); histEvent(['reset'])
    }
    historyStore.replace(arr.slice())
  }, 3000)
}
// Searching history as you type: every page's lower-cased url and title are worked out once (and again only when its
// title changes), and a query that extends the last one only looks through the last one's matches. With 20,000 pages
// a keystroke costs a millisecond or two instead of lower-casing 40,000 strings.
const lowKeys = new WeakMap()   // entry -> { title, url, low }
const lowOf = h => { let k = lowKeys.get(h); if (!k || k.title !== h.title || k.url !== h.url) { k = { title: h.title, url: h.url, u: h.url.toLowerCase(), ti: (h.title || '').toLowerCase() }; lowKeys.set(h, k) } return k }
let lastSearch = null   // { list (the sorted array it ran on), s, hits }
function listHistory(q = '', limit = 300) {
  const arr = sortedHistory()
  if (!q) return arr.slice(0, limit)
  const s = q.toLowerCase()
  const from = lastSearch && lastSearch.list === arr && s.startsWith(lastSearch.s) ? lastSearch.hits : arr
  const hits = []
  for (const h of from) { const k = lowOf(h); if (k.u.includes(s) || k.ti.includes(s)) hits.push(h) }
  lastSearch = { list: arr, s, hits }
  return hits.slice(0, limit)
}
function deleteHistory(url) { historyMap.delete(url); histChanged(); histEvent(['reset']); flushHistory() }
// forget a whole site: every page on that host and its subdomains
function deleteHistoryHost(host) {
  host = String(host || '').replace(/^www\./, ''); if (!host) return 0
  let n = 0
  for (const k of [...historyMap.keys()]) { let h = ''; try { h = new URL(k).hostname.replace(/^www\./, '') } catch {} if (h === host || h.endsWith('.' + host)) { historyMap.delete(k); n++ } }
  histChanged(); histEvent(['reset']); flushHistory(); return n
}
function clearHistory(sinceMs = 0) {
  if (!sinceMs) historyMap.clear()
  else for (const [k, h] of historyMap) if (h.t >= Date.now() - sinceMs) historyMap.delete(k)
  histChanged(); histEvent(['reset']); flushHistory()
}
function topSites(n = 8) {
  if (topCache && topCache.n >= n && Date.now() - topCache.at < 10 * 60000) return topCache.list.slice(0, n).map(x => ({ ...x }))
  const list = topSitesNow(Math.max(n, 12)); topCache = { n: Math.max(n, 12), at: Date.now(), list }
  return list.slice(0, n).map(x => ({ ...x }))
}
function topSitesNow(n) {
  const byHost = new Map(), now = Date.now()
  for (const h of historyMap.values()) {
    let u; try { u = new URL(h.url) } catch { continue }
    const host = u.host, cur = byHost.get(host)
    const score = h.visits + (now - h.t < 7 * 864e5 ? 3 : 0)
    if (!cur) byHost.set(host, { url: u.origin, title: h.title, host, score })
    else cur.score += score
  }
  return [...byHost.values()].sort((a, b) => b.score - a.score).slice(0, n)
}

// ---------- bookmarks ----------
const liveBookmarks = () => bookmarks.get().filter(b => !b.deleted)
function addBookmark(url, title, folder = '') {
  const existing = bookmarks.get().find(b => b.url === url && !b.deleted)
  if (existing) return existing
  const b = { id: uid(), url, title: title || url, folder, updatedAt: Date.now() }
  bookmarks.get().push(b); bookmarks.save(); return b
}
function removeBookmark(idOrUrl) {
  for (const b of bookmarks.get()) if ((b.id === idOrUrl || b.url === idOrUrl) && !b.deleted) { b.deleted = true; b.updatedAt = Date.now() }
  bookmarks.save()
}
function editBookmark(id, patch) {
  const b = bookmarks.get().find(x => x.id === id)
  if (b) { Object.assign(b, patch, { updatedAt: Date.now() }); bookmarks.save() }
}
const isBookmarked = url => bookmarks.get().some(b => b.url === url && !b.deleted)

// ---------- passwords ----------
const canEncrypt = () => { try { return safeStorage.isEncryptionAvailable() } catch { return false } }
function enc(s) { return canEncrypt() ? 'e:' + safeStorage.encryptString(s).toString('base64') : 'p:' + Buffer.from(s).toString('base64') }
function dec(s) {
  try {
    if (s.startsWith('e:')) return safeStorage.decryptString(Buffer.from(s.slice(2), 'base64'))
    if (s.startsWith('p:')) return Buffer.from(s.slice(2), 'base64').toString()
  } catch {}
  return ''
}
const livePasswords = () => passwords.get().filter(p => !p.deleted)
function savePassword(origin, username, password) {
  const list = passwords.get()
  const ex = list.find(p => !p.deleted && p.origin === origin && p.username === username)
  if (ex) { ex.password = enc(password); ex.updatedAt = Date.now() }
  else list.push({ id: uid(), origin, username, password: enc(password), updatedAt: Date.now() })
  passwords.save()
}
function hasPassword(origin, username, password) {
  return livePasswords().some(p => p.origin === origin && p.username === username && dec(p.password) === password)
}
function credentialsFor(origin) {
  return livePasswords().filter(p => p.origin === origin).map(p => ({ id: p.id, username: p.username, password: dec(p.password) }))
}
function listPasswords() {
  return livePasswords().map(p => ({ id: p.id, origin: p.origin, username: p.username, updatedAt: p.updatedAt }))
    .sort((a, b) => a.origin.localeCompare(b.origin))
}
function revealPassword(id) { const p = passwords.get().find(x => x.id === id); return p ? dec(p.password) : '' }
function deletePassword(id) {
  const p = passwords.get().find(x => x.id === id)
  if (p) { p.deleted = true; p.password = ''; p.updatedAt = Date.now(); passwords.save() }
}
function updatePassword(id, username, password) {
  const p = passwords.get().find(x => x.id === id)
  if (p) { p.username = username; p.password = enc(password); p.updatedAt = Date.now(); passwords.save() }
}

module.exports = {
  settings, bookmarks, passwords, permissions, session, historyStore,
  addHistory, updateHistoryTitle, listHistory, deleteHistory, deleteHistoryHost, clearHistory, topSites,
  liveBookmarks, addBookmark, removeBookmark, editBookmark, isBookmarked,
  savePassword, hasPassword, credentialsFor, listPasswords, revealPassword, deletePassword, updatePassword,
  enc, dec, historyMap, flushHistory, onHistory, historyCompact,
  readLater, isReadLater, addReadLater, removeReadLater, archive, addArchive, removeArchive, highlights,
}
