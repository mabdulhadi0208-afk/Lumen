// End-to-end encrypted sync through any synced folder (iCloud Drive by default, or Dropbox / Google Drive).
// Bookmarks, passwords and settings are merged per item (newest edit wins, deletions carry over).
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const D = require('./data')
const Passkeys = require('./passkeys')

const ICLOUD = path.join(os.homedir(), 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'Lumen')
const SYNC_SETTINGS = ['searchEngine', 'motion', 'theme', 'accent', 'adblock', 'blockTrackers', 'httpsOnly', 'sleepTabsAfterMin', 'doNotTrack', 'showSuggestions', 'homeTiles']

let passphrase = null
function defaultFolder() { return fs.existsSync(path.dirname(ICLOUD)) ? ICLOUD : '' }
function file() { return path.join(D.settings.get('sync').folder || defaultFolder(), 'lumen-sync.bin') }

function loadKey() {
  const s = D.settings.get('sync')
  if (s.key) passphrase = D.dec(s.key) || null
  return passphrase
}
function encrypt(obj, pass) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12)
  const key = crypto.scryptSync(pass, salt, 32)
  const c = crypto.createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([c.update(JSON.stringify(obj)), c.final()])
  return JSON.stringify({ v: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: data.toString('base64') })
}
function decrypt(text, pass) {
  const o = JSON.parse(text)
  const key = crypto.scryptSync(pass, Buffer.from(o.salt, 'base64'), 32)
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(o.iv, 'base64'))
  d.setAuthTag(Buffer.from(o.tag, 'base64'))
  return JSON.parse(Buffer.concat([d.update(Buffer.from(o.data, 'base64')), d.final()]).toString())
}
function mergeLists(local, remote) {
  const map = new Map()
  for (const it of local) map.set(it.id, it)
  for (const it of remote || []) {
    const cur = map.get(it.id)
    if (!cur || (it.updatedAt || 0) > (cur.updatedAt || 0)) map.set(it.id, it)
  }
  return [...map.values()]
}

// 4.4.23: a secret this copy of Lumen cannot open right now (say macOS kept the key from it after an update) is sent
// as "locked", never as empty, and a locked or empty copy never replaces a real one. Before, one sync round could
// wipe a passkey or password for good.
function openAll(list, field) {
  return list.map(p => {
    if (p.deleted) return { ...p, [field]: '' }
    const v = D.decOrNull(p[field])
    return v == null ? { ...p, [field]: '', locked: true } : { ...p, [field]: v, locked: undefined }
  })
}
function mergeSecrets(local, remote, field) {
  const byId = new Map(local.map(p => [p.id, p]))
  const rem = new Map((remote || []).map(p => [p.id, p]))
  return mergeLists(local, remote).map(p => {
    if (p.deleted || p[field]) return p
    // the newest copy has no secret: take it from the other side
    const other = [byId.get(p.id), rem.get(p.id)].find(x => x && x !== p && !x.deleted && x[field])
    return other ? { ...p, [field]: other[field], locked: undefined } : p
  })
}
// writes the merged list back, sealing secrets again; a secret nobody could open keeps its old sealed value
function storeSecrets(store, merged, field) {
  const raw = new Map(store.get().map(p => [p.id, p[field]]))
  store.replace(merged.map(p => {
    const { locked, ...q } = p
    if (q[field]) return { ...q, [field]: D.enc(q[field]) }
    const old = raw.get(p.id)
    if (old && (!q.deleted || q.replacedAt)) return { ...q, [field]: old, ...(locked ? { locked: Date.now() } : {}) }
    return { ...q, [field]: '' }
  }))
}
function localSnapshot() {
  const s = D.settings.get()
  return {
    bookmarks: D.bookmarks.get(),
    passwords: openAll(D.passwords.get(), 'password'),
    passkeys: openAll(Passkeys.store.get(), 'privateKey'),
    settings: Object.fromEntries(SYNC_SETTINGS.map(k => [k, s[k]])),
    settingsAt: s.settingsAt || 0,
    savedAt: Date.now(),
    device: os.hostname(),
  }
}

async function syncNow() {
  const s = D.settings.get('sync')
  if (!s.enabled || !loadKey()) return { ok: false, error: 'Sync is off' }
  const f = file()
  if (!path.dirname(f) || path.dirname(f) === '.') return { ok: false, error: 'No sync folder. Turn on iCloud Drive or pick a folder.' }
  fs.mkdirSync(path.dirname(f), { recursive: true })
  let remote = null
  if (fs.existsSync(f)) {
    try { remote = decrypt(fs.readFileSync(f, 'utf8'), passphrase) }
    catch { return { ok: false, error: 'Wrong sync passphrase for the existing sync file.' } }
  }
  const local = localSnapshot()
  if (remote) {
    D.bookmarks.replace(mergeLists(local.bookmarks, remote.bookmarks))
    storeSecrets(D.passwords, mergeSecrets(local.passwords, remote.passwords, 'password'), 'password')
    storeSecrets(Passkeys.store, mergeSecrets(local.passkeys, remote.passkeys || [], 'privateKey'), 'privateKey')
    if ((remote.settingsAt || 0) > (local.settingsAt || 0)) D.settings.set({ ...remote.settings, settingsAt: remote.settingsAt })
  }
  const out = localSnapshot()
  fs.writeFileSync(f + '.tmp', encrypt(out, passphrase))
  fs.renameSync(f + '.tmp', f)
  D.settings.set('sync', { ...D.settings.get('sync'), lastSync: Date.now() })
  return { ok: true, lastSync: Date.now() }
}

function enable(pass, folder) {
  if (!pass || pass.length < 8) return { ok: false, error: 'Use a passphrase of at least 8 characters.' }
  passphrase = pass
  D.settings.set('sync', { enabled: true, folder: folder || defaultFolder(), key: D.enc(pass), lastSync: 0 })
  return syncNow()
}
function disable() { passphrase = null; D.settings.set('sync', { enabled: false, folder: '', lastSync: 0 }); return { ok: true } }
function status() {
  const s = D.settings.get('sync')
  return { enabled: !!s.enabled, folder: s.folder || defaultFolder(), lastSync: s.lastSync || 0, icloud: !!defaultFolder() }
}

let timer
function start() {
  clearInterval(timer)
  timer = setInterval(() => { syncNow().catch(() => {}) }, 5 * 60 * 1000)
  setTimeout(() => syncNow().catch(() => {}), 8000)
}

module.exports = { _test: { openAll, mergeSecrets, storeSecrets }, syncNow, enable, disable, status, start }
