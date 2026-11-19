// Move in from Chrome (or Brave, Edge, Arc): bookmarks, passwords (CSV export) and extensions.
const fs = require('fs')
const os = require('os')
const path = require('path')
const D = require('./data')

const home = os.homedir()
const mac = p => path.join(home, 'Library', 'Application Support', p)
const win = p => path.join(process.env.LOCALAPPDATA || '', p)
const BROWSERS = {
  chrome: { name: 'Google Chrome', dirs: [mac('Google/Chrome'), win('Google/Chrome/User Data')] },
  brave: { name: 'Brave', dirs: [mac('BraveSoftware/Brave-Browser'), win('BraveSoftware/Brave-Browser/User Data')] },
  edge: { name: 'Microsoft Edge', dirs: [mac('Microsoft Edge'), win('Microsoft/Edge/User Data')] },
  arc: { name: 'Arc', dirs: [mac('Arc/User Data')] },
}

function profileDir(key) {
  for (const d of BROWSERS[key].dirs) {
    const p = path.join(d, 'Default')
    if (fs.existsSync(p)) return p
  }
  return null
}
function available() {
  return Object.entries(BROWSERS).filter(([k]) => profileDir(k)).map(([k, v]) => ({ id: k, name: v.name }))
}

function importBookmarks(key) {
  const dir = profileDir(key)
  if (!dir) return { ok: false, error: 'Browser not found' }
  let json
  try { json = JSON.parse(fs.readFileSync(path.join(dir, 'Bookmarks'), 'utf8')) } catch { return { ok: false, error: 'No bookmarks file' } }
  let n = 0
  const walk = (node, folder) => {
    if (!node) return
    if (node.type === 'url' && /^https?:/.test(node.url)) { D.addBookmark(node.url, node.name, folder); n++ }
    for (const c of node.children || []) walk(c, node.type === 'folder' && node.name && !['Bookmarks bar', 'Bookmarks Bar', 'Other bookmarks'].includes(node.name) ? node.name : folder)
  }
  for (const root of Object.values(json.roots || {})) walk(root, '')
  return { ok: true, count: n }
}

function extensionIds(key) {
  const dir = profileDir(key)
  if (!dir) return []
  try {
    return fs.readdirSync(path.join(dir, 'Extensions')).filter(id => /^[a-p]{32}$/.test(id))
  } catch { return [] }
}

// Chrome: Settings > Passwords > Export passwords gives a CSV: name,url,username,password,note
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cur); rows.push(row); row = []; cur = ''
    } else cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows.filter(r => r.some(x => x))
}
function importPasswordsCSV(file) {
  const rows = parseCSV(fs.readFileSync(file, 'utf8'))
  if (!rows.length) return { ok: false, error: 'Empty file' }
  const head = rows[0].map(h => h.trim().toLowerCase())
  const iu = head.findIndex(h => h === 'url' || h === 'origin' || h === 'website'), iuser = head.findIndex(h => h === 'username' || h === 'login'), ip = head.indexOf('password')
  if (iu < 0 || iuser < 0 || ip < 0) return { ok: false, error: 'This does not look like a password export' }
  let n = 0
  for (const r of rows.slice(1)) {
    let origin; try { origin = new URL(r[iu]).origin } catch { continue }
    if (!r[ip]) continue
    D.savePassword(origin, r[iuser] || '', r[ip]); n++
  }
  return { ok: true, count: n }
}
function exportPasswordsCSV(file) {
  const esc = s => '"' + String(s).replace(/"/g, '""') + '"'
  const lines = ['name,url,username,password']
  for (const p of D.listPasswords()) lines.push([new URL(p.origin).host, p.origin, p.username, D.revealPassword(p.id)].map(esc).join(','))
  fs.writeFileSync(file, lines.join('\n'))
  return { ok: true }
}

module.exports = { available, importBookmarks, extensionIds, importPasswordsCSV, exportPasswordsCSV, BROWSERS }
