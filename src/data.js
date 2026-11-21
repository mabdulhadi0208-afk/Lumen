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
  appIcon: 'default', aiModel: 'fast', aiTabGroups: true, adblockAllow: [], searchShortcuts: true, translateFlipDir: true, rememberZoom: true, zoomBySite: {}, soundActiveOnly: false, linksBackground: false, confirmQuit: true, wheelTabs: true, aiKey: '',
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
  ntpWallpaper: 'aurora',
  ntpClock: true,
  sync: { enabled: false, folder: '', lastSync: 0 },
  autoUpdate: true,
  askWhereToSave: false,
  doNotTrack: true,
  showSuggestions: true,
  homeTiles: true,
})

const bookmarks = new Store('bookmarks', [])
const passwords = new Store('passwords', [])
const permissions = new Store('permissions', {}) // { origin: { permission: 'allow'|'deny' } }
const session = new Store('session', { windows: [] })
const historyStore = new Store('history', [])

// ---------- history ----------
const historyMap = new Map()
for (const h of historyStore.get()) historyMap.set(h.url, h)
function addHistory(url, title) {
  if (!/^https?:/.test(url)) return
  let h = historyMap.get(url)
  if (h) { h.visits++; h.t = Date.now(); if (title) h.title = title }
  else { h = { url, title: title || url, t: Date.now(), visits: 1 }; historyMap.set(url, h) }
  flushHistory()
}
function updateHistoryTitle(url, title) {
  const h = historyMap.get(url)
  if (h && title) { h.title = title; flushHistory() }
}
let histTimer
function flushHistory() {
  clearTimeout(histTimer)
  histTimer = setTimeout(() => {
    let arr = [...historyMap.values()].sort((a, b) => b.t - a.t)
    if (arr.length > 20000) {
      arr = arr.slice(0, 20000)
      historyMap.clear(); for (const h of arr) historyMap.set(h.url, h)
    }
    historyStore.replace(arr)
  }, 800)
}
function listHistory(q = '', limit = 300) {
  const arr = [...historyMap.values()].sort((a, b) => b.t - a.t)
  if (!q) return arr.slice(0, limit)
  const s = q.toLowerCase()
  return arr.filter(h => h.url.toLowerCase().includes(s) || (h.title || '').toLowerCase().includes(s)).slice(0, limit)
}
function deleteHistory(url) { historyMap.delete(url); flushHistory() }
function clearHistory(sinceMs = 0) {
  if (!sinceMs) historyMap.clear()
  else for (const [k, h] of historyMap) if (h.t >= Date.now() - sinceMs) historyMap.delete(k)
  flushHistory()
}
function topSites(n = 8) {
  const byHost = new Map()
  for (const h of historyMap.values()) {
    let host; try { host = new URL(h.url).host } catch { continue }
    const cur = byHost.get(host)
    const score = h.visits + (Date.now() - h.t < 7 * 864e5 ? 3 : 0)
    if (!cur) byHost.set(host, { url: new URL(h.url).origin, title: h.title, host, score })
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
  addHistory, updateHistoryTitle, listHistory, deleteHistory, clearHistory, topSites,
  liveBookmarks, addBookmark, removeBookmark, editBookmark, isBookmarked,
  savePassword, hasPassword, credentialsFor, listPasswords, revealPassword, deletePassword, updatePassword,
  enc, dec, historyMap, flushHistory,
}
