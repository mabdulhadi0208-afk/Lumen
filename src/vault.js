// 4.4.23: Lumen's key vault. One random 256-bit key (AES-256-GCM) encrypts passkey private keys and passwords.
//
// Why: Electron's safeStorage keeps its key in the macOS Keychain, and the Keychain only hands that key to the same
// code signature that saved it. Lumen's releases are ad-hoc signed, so every update has a new signature, and macOS
// may refuse the new build the old key. Everything encrypted with safeStorage alone could then never be opened again.
//
// The vault key is wrapped with safeStorage ("ss"; on Windows this is DPAPI, tied to the user, not the build).
// The owner chose (4.4.23) not to keep a second, signature-free Keychain copy, because any program running as the
// user could read it. So after an update macOS may ask once to let Lumen use "Lumen Safe Storage" (Always Allow);
// until then the passkeys and passwords are kept, marked locked, never deleted, and Try again opens them.
// The "escrow" slot below is only used by tests (LUMEN_VAULT_ESCROW, a folder); macEscrow is kept for the day Lumen
// ships with a Developer ID and the trade-off is decided again.
// When one copy opens and the other does not, the other is written again. A vault key that cannot be opened is
// never replaced or thrown away: it stays on file and Lumen tries it again on the next start, while new secrets
// go into a new key next to it.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')
const electron = require('electron')

const SERVICE = 'app.lumen.vault'
let ss = null            // safeStorage (replaceable for tests)
let escrow = null        // { read(id) -> hex|'' , write(id, hex) -> bool }
let fileOverride = null
let cache = null         // { keys: Map(id -> Buffer), current: id }

const fp = key => crypto.createHash('sha256').update(key).digest('hex').slice(0, 12)
const file = () => fileOverride || path.join(electron.app.getPath('userData'), 'vault.json')
const safe = () => ss || electron.safeStorage
const ssOK = () => { try { return safe().isEncryptionAvailable() } catch { return false } }

// macOS: the Keychain through /usr/bin/security (an Apple-signed tool whose identity never changes)
const macEscrow = {
  read(id) {
    try { return execFileSync('/usr/bin/security', ['find-generic-password', '-s', SERVICE, '-a', 'vault-' + id, '-w'], { timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
  },
  write(id, hex) {
    // the secret goes in on stdin (interactive mode), never on the command line where other programs could see it
    try { execFileSync('/usr/bin/security', ['-i'], { input: `add-generic-password -U -s ${SERVICE} -l ${SERVICE} -a vault-${id} -T /usr/bin/security -w ${hex}\n`, timeout: 4000, stdio: ['pipe', 'ignore', 'ignore'] }) } catch { return false }
    return this.read(id) === hex
  },
}
// tests: a folder stands in for the Keychain
const dirEscrow = dir => ({
  read: id => { try { return fs.readFileSync(path.join(dir, 'vault-' + id), 'utf8').trim() } catch { return '' } },
  write: (id, hex) => { try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'vault-' + id), hex); return true } catch { return false } },
})
function getEscrow() {
  if (escrow) return escrow
  if (process.env.LUMEN_VAULT_ESCROW) return (escrow = dirEscrow(process.env.LUMEN_VAULT_ESCROW))
  return (escrow = { read: () => '', write: () => false })
}

function readFile() { try { const o = JSON.parse(fs.readFileSync(file(), 'utf8')); if (o && Array.isArray(o.keys)) return o } catch {} return null }
function writeFile(o) {
  const f = file(); fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f + '.tmp', JSON.stringify(o, null, 1)); fs.renameSync(f + '.tmp', f)
}
function openEntry(e) {
  const tryHex = hex => { if (!/^[0-9a-f]{64}$/.test(hex || '')) return null; const k = Buffer.from(hex, 'hex'); return fp(k) === e.id ? k : null }
  let key = null, from = ''
  // on a Mac the escrow comes first: it never asks for permission, so an update does not bring up a Keychain prompt
  const order = process.platform === 'darwin' || process.env.LUMEN_VAULT_ESCROW ? ['escrow', 'ss'] : ['ss', 'escrow']
  for (const way of order) {
    if (key) break
    if (way === 'escrow') { key = tryHex(getEscrow().read(e.id)); if (key) from = 'escrow' }
    else if (e.ss && ssOK()) { try { key = tryHex(safe().decryptString(Buffer.from(e.ss, 'base64'))); if (key) from = 'ss' } catch {} }
  }
  return { key, from }
}

function load() {
  if (cache) return cache
  const o = readFile() || { v: 1, keys: [] }
  const keys = new Map()
  let dirty = false
  for (const e of o.keys) {
    const { key, from } = openEntry(e)
    if (!key) { e.locked = Date.now(); continue }
    keys.set(e.id, key)
    if (e.locked) { delete e.locked; dirty = true }
    // put back whichever copy was missing or no longer opens
    if (from !== 'ss' && ssOK()) { try { e.ss = safe().encryptString(key.toString('hex')).toString('base64'); dirty = true } catch {} }
    if (from !== 'escrow' && !e.escrow) { if (getEscrow().write(e.id, key.toString('hex'))) { e.escrow = true; dirty = true } }
    else if (from !== 'escrow' && e.escrow && getEscrow().read(e.id) !== key.toString('hex')) getEscrow().write(e.id, key.toString('hex'))
  }
  let current = o.current && keys.has(o.current) ? o.current : null
  if (!current) {
    // no usable key yet (first start, or every saved key is locked for now): make a new one, keep the old ones listed
    const key = crypto.randomBytes(32), id = fp(key), hex = key.toString('hex')
    const e = { id, createdAt: Date.now() }
    if (ssOK()) { try { e.ss = safe().encryptString(hex).toString('base64') } catch {} }
    e.escrow = getEscrow().write(id, hex)
    if (!e.ss && !e.escrow) {
      // nowhere safe to keep it: do not encrypt with a key that would be gone on the next start
      cache = { keys, current: null, file: o }
      return cache
    }
    o.keys.push(e); keys.set(id, key); current = id; o.current = id; dirty = true
  }
  if (o.current !== current) { o.current = current; dirty = true }
  if (dirty) { try { writeFile(o) } catch {} }
  cache = { keys, current, file: o }
  return cache
}

// 'v1:<key id>:<base64 iv|tag|ciphertext>'
function seal(str) {
  const c = load(); if (!c.current) return null
  const iv = crypto.randomBytes(12), ci = crypto.createCipheriv('aes-256-gcm', c.keys.get(c.current), iv)
  const ct = Buffer.concat([ci.update(String(str), 'utf8'), ci.final()])
  return `v1:${c.current}:` + Buffer.concat([iv, ci.getAuthTag(), ct]).toString('base64')
}
// the plain text, or null if the key is not available (locked) or the data was damaged
function open(s) {
  const m = /^v1:([0-9a-f]{12}):(.+)$/.exec(s || ''); if (!m) return null
  const key = load().keys.get(m[1]); if (!key) return null
  try {
    const b = Buffer.from(m[2], 'base64'), d = crypto.createDecipheriv('aes-256-gcm', key, b.subarray(0, 12))
    d.setAuthTag(b.subarray(12, 28))
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')
  } catch { return null }
}
const isSealed = s => /^v1:/.test(s || '')
function status() { const c = load(); return { ready: !!c.current, keys: c.file.keys.length, locked: c.file.keys.filter(e => !c.keys.has(e.id)).length } }
// forget what was read, so the next use tries the Keychain again
function reset() { cache = null }

module.exports = { seal, open, isSealed, status, reset, safeStorage: safe, _test: { setSafeStorage: s => { ss = s; cache = null }, setEscrow: e => { escrow = e; cache = null }, setFile: f => { fileOverride = f; cache = null }, dirEscrow } }
