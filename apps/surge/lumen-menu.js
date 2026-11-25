// Surge's menu-bar right-click menu inside Lumen, drawn in Lumen Nova (a small glass window of Surge's own) instead of
// the plain system menu. It takes the same template Surge builds for Menu.buildFromTemplate (labels, separators,
// checkboxes, accelerators, disabled status lines and submenus) and calls the same click handlers, so every item
// still does its job. Copied into apps/surge by tools/import-apps.py.
//   lumenMenu.popup(template, anchorBounds, { battery, on, total, muted })   the last part fills the menu's header
const path = require('path')
const { BrowserWindow, screen } = require('electron')
const MAC = process.platform === 'darwin'
const W = 300
let win = null, fns = new Map(), anchor = null, shownAt = 0

// "Cmd+Shift+N" -> the symbols a Mac menu shows, or "Ctrl+Shift+N" on Windows
function acc(a) {
  if (!a) return ''
  const p = String(a).split('+')
  if (!MAC) return p.map(k => /^(CommandOrControl|CmdOrCtrl|Cmd|Command)$/i.test(k) ? 'Ctrl' : k === 'Alt' || k === 'Option' ? 'Alt' : k).join('+')
  const S = { CommandOrControl: '⌘', CmdOrCtrl: '⌘', Cmd: '⌘', Command: '⌘', Control: '⌃', Ctrl: '⌃', Alt: '⌥', Option: '⌥', Shift: '⇧' }
  return p.map(k => S[k] || k).join('')
}
function serialize(tpl, out = []) {
  for (const it of tpl || []) {
    if (!it || it.visible === false) continue
    if (it.type === 'separator') { if (out.length && out[out.length - 1].type !== 'separator') out.push({ type: 'separator' }); continue }
    const id = 'm' + fns.size
    fns.set(id, it)
    const sub = Array.isArray(it.submenu) ? serialize(it.submenu, []) : null
    out.push({ id, label: String(it.label || ''), type: it.type === 'checkbox' || it.type === 'radio' ? it.type : sub ? 'submenu' : 'normal', checked: !!it.checked, enabled: it.enabled !== false, acc: acc(it.accelerator), sub })
  }
  while (out.length && out[out.length - 1].type === 'separator') out.pop()
  return out
}
function place(h) {
  if (!win || win.isDestroyed()) return
  let a = anchor
  const pt = screen.getCursorScreenPoint()
  if (!a || !(a.width > 0)) a = { x: pt.x, y: pt.y, width: 0, height: 0 }
  const wa = screen.getDisplayNearestPoint({ x: Math.round(a.x + a.width / 2), y: Math.round(a.y + a.height / 2) }).workArea
  const H = Math.max(80, Math.min(Math.ceil(h), wa.height - 16))
  let x = Math.round(a.x + a.width / 2 - W / 2); x = Math.max(wa.x + 6, Math.min(x, wa.x + wa.width - W - 6))
  const below = a.y + a.height / 2 < wa.y + wa.height / 2
  let y = below ? Math.round(a.y + a.height + 2) : Math.round(a.y - H - 2); y = Math.max(wa.y + 4, Math.min(y, wa.y + wa.height - H - 4))
  win.setBounds({ x, y, width: W, height: H })
  win.webContents.send('lumen-menu:edge', below ? 'top' : 'bottom')
}
function hide() { if (win && !win.isDestroyed() && win.isVisible()) { win.webContents.send('lumen-menu:out'); setTimeout(() => { try { win && !win.isDestroyed() && win.hide() } catch {} }, 120) } }
function ensure() {
  if (win && !win.isDestroyed()) return win
  win = new BrowserWindow({ width: W, height: 300, show: false, frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, resizable: false, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, alwaysOnTop: true, skipTaskbar: true, title: 'Surge',
    webPreferences: { preload: path.join(__dirname, 'lumen-menu-preload.js'), contextIsolation: true, nodeIntegration: false } })
  win.setAlwaysOnTop(true, 'pop-up-menu'); try { win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }) } catch {}
  win.on('blur', () => { if (Date.now() - shownAt > 150) hide() })
  win.on('closed', () => { win = null })
  win.webContents.on('ipc-message', (_e, ch, a, b) => {
    if (ch === 'lumen-menu:size') { place(Number(a) || 300); if (!win.isVisible()) { shownAt = Date.now(); win.show(); win.focus() } }
    else if (ch === 'lumen-menu:close') hide()
    else if (ch === 'lumen-menu:pick') {
      const it = fns.get(String(a)); hide()
      if (!it || typeof it.click !== 'function' || it.enabled === false) return
      const item = { ...it, checked: it.type === 'checkbox' ? !!b : it.type === 'radio' ? true : it.checked }
      setTimeout(() => { try { it.click(item, null, {}) } catch (e) { console.error('[menu]', e) } }, 30)
    }
  })
  win.loadFile(path.join(__dirname, 'lumen-menu.html'))
  return win
}
function popup(template, bounds, info) {
  fns = new Map(); anchor = bounds || null
  const items = serialize(template)
  const w = ensure()
  const send = () => { try { w.webContents.send('lumen-menu:show', { items, mac: MAC, info: info || {} }) } catch {} }
  if (w.webContents.isLoading()) w.webContents.once('did-finish-load', send); else send()
  return true
}
module.exports = { popup, hide, _acc: acc }
