// Nova surfaces drawn by Lumen itself instead of the system: right-click menus and dialogs (docs/NOVA.md).
//
// Each browser window gets a transparent WebContentsView laid over the whole window: ui/menu.html for menus,
// ui/dialog.html for dialogs. The view covers the window so a click anywhere outside the menu closes it, and so a
// dialog can dim the window behind its sheet. The views are separate renderers and cannot see the page through
// backdrop-filter. Up to 4.5.1 Lumen handed them a snapshot of what is underneath for the glass to refract; since
// 4.6 every Nova surface is solid (Maison), the views are transparent, so the window simply shows through and
// nothing is captured (NOVA_GLASS = false): opening a menu, a dialog or a toast no longer reads the page back.
//
// Menus take the same item objects Electron's Menu.buildFromTemplate takes (label, click, type, checked, enabled,
// submenu, accelerator, role, icon), and every click handler stays here in the main process. If the Nova view cannot
// load, Lumen falls back to the native menu or dialog, so nothing is ever lost.
const { WebContentsView, Menu, dialog, nativeImage, ipcMain, webContents: allWebContents } = require('electron')
const path = require('path')
const NOVA_GLASS = false

const ROOT = path.join(__dirname, '..')
const PRELOAD = path.join(__dirname, 'preload-nova.js')
let CFG = { accent: () => '#5b8cff', motion: () => 'jelly', dark: () => false, log: () => {} }
const NATIVE = () => process.env.LUMEN_NATIVE_MENUS === '1'

function configure(o) { CFG = { ...CFG, ...o } }
function theme(host) {
  return { accent: CFG.accent() || '#5b8cff', motion: CFG.motion() || 'jelly', dark: !!CFG.dark(), incognito: !!(host && host.incognito), platform: process.platform }
}

// ------------------------------------------------------------------ overlay views
const byWc = new Map()   // overlay webContents id -> { host, kind }

function makeView(host, kind) {
  const view = new WebContentsView({
    webPreferences: { preload: PRELOAD, sandbox: true, contextIsolation: true, spellcheck: false, backgroundThrottling: false, devTools: true },
  })
  view.setBackgroundColor('#00000000')
  const wc = view.webContents
  byWc.set(wc.id, { host, kind })
  wc.once('destroyed', () => byWc.delete(wc.id))
  const o = { view, kind, loaded: false, failed: false }
  o.ready = new Promise(resolve => {
    const done = ok => { if (o.loaded || o.failed) return; if (ok) o.loaded = true; else o.failed = true; resolve(ok) }
    wc.once('did-finish-load', () => done(true))
    wc.once('did-fail-load', () => done(false))
    wc.once('render-process-gone', () => done(false))
    setTimeout(() => done(false), 6000)
  })
  wc.on('render-process-gone', () => { o.failed = true })
  // a Nova surface never navigates anywhere and never opens windows
  wc.on('will-navigate', e => e.preventDefault())
  wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  wc.loadFile(path.join(ROOT, 'ui', kind === 'menu' ? 'menu.html' : kind === 'toast' ? 'toast.html' : 'dialog.html')).catch(() => {})
  return o
}
function fit(host, o) {
  try { const [w, h] = host.win.getContentSize(); o.view.setBounds({ x: 0, y: 0, width: w, height: h }) } catch {}
}
// while a Nova surface is up, the chrome's window-drag areas must not swallow clicks meant for the menu or dialog
function noDrag(host, on) {
  const wc = host.ui && host.ui.webContents; if (!wc || wc.isDestroyed()) return
  const n = host._nova || {}
  if (on && !n.dragKey) { n.dragKey = 'pending'; wc.insertCSS('*, *::before, *::after { -webkit-app-region: no-drag !important; }').then(k => { if (n.dragKey === 'pending') n.dragKey = k; else wc.removeInsertedCSS(k).catch(() => {}) }).catch(() => { n.dragKey = null }) }
  if (!on && n.dragKey) { const k = n.dragKey; n.dragKey = null; if (k !== 'pending') wc.removeInsertedCSS(k).catch(() => {}) }
}
function anyAttached(host) { const n = host._nova; return !!(n && [n.menu, n.dialog].some(o => o && o.attached)) }
function attach(host, o) {
  fit(host, o)
  noDrag(host, true)
  try { host.win.contentView.addChildView(o.view) } catch {}
  o.attached = true
}
function detach(host, o) {
  o.attached = false
  try { host.win.contentView.removeChildView(o.view) } catch {}
  if (!anyAttached(host)) noDrag(host, false)
}
function destroy(o) {
  try { if (!o.view.webContents.isDestroyed()) o.view.webContents.close() } catch {}
}

// keep Nova surfaces above everything else in the window (called after the window re-stacks its views)
function restack(host) {
  const n = host._nova; if (!n) return
  if (n.toast && n.toast.attached) { placeToast(host); try { host.win.contentView.addChildView(n.toast.view) } catch {} }
  for (const o of [n.menu, n.dialog]) if (o && o.attached) { fit(host, o); try { host.win.contentView.addChildView(o.view) } catch {} }
}
// load the menu surface ahead of time so the first right-click is instant
function prewarm(host) {
  try { if (NATIVE() || !host || host.win.isDestroyed()) return; const n = setup(host); if (!n.menu) n.menu = makeView(host, 'menu'); if (!n.spare) n.spare = makeView(host, 'dialog') } catch {}
}
function setup(host) {
  if (host._nova) return host._nova
  const n = host._nova = { menu: null, dialog: null, queue: Promise.resolve(), menuState: null }
  host.win.on('resize', () => restack(host))
  host.win.on('blur', () => { if (n.menuState) closeMenu(host, 'blur') })
  host.win.on('closed', () => {
    if (n.menuState) closeMenu(host, 'closed')
    if (n.dialogState) n.dialogState.finish(null)
    for (const o of [n.menu, n.dialog, n.spare, n.toast]) if (o) destroy(o)
    n.menu = n.dialog = n.spare = n.toast = null
  })
  return n
}

// a small, blurred-anyway picture of what is under the glass: every visible view of the window, in stacking order
async function snapshot(host, skip) {
  const out = []
  try {
    const kids = host.win.contentView.children.filter(v => v !== skip && !(host._nova && [host._nova.menu, host._nova.dialog].some(o => o && o.view === v)))
    const caps = await Promise.all(kids.map(async v => {
      try {
        if (v.getVisible && !v.getVisible()) return null
        const b = v.getBounds(); if (b.width < 2 || b.height < 2) return null
        if (b.x + b.width <= 0 || b.y + b.height <= 0) return null   // off screen (the preloaded New Tab waits there): nothing to show
        const img = await Promise.race([v.webContents.capturePage(), new Promise(r => setTimeout(() => r(null), 600))])
        if (!img || img.isEmpty()) return null
        const small = img.resize({ width: Math.max(1, Math.round(b.width / 2)), quality: 'good' })
        return { src: small.toDataURL(), x: b.x, y: b.y, w: b.width, h: b.height }
      } catch { return null }
    }))
    for (const c of caps) if (c) out.push(c)
  } catch {}
  return out
}

// ------------------------------------------------------------------ menus
const ACCEL_MAC = { CmdOrCtrl: '⌘', CommandOrControl: '⌘', Cmd: '⌘', Command: '⌘', Ctrl: '⌃', Control: '⌃', Alt: '⌥', Option: '⌥', Shift: '⇧', Super: '⌘', Meta: '⌘' }
const ACCEL_WIN = { CmdOrCtrl: 'Ctrl', CommandOrControl: 'Ctrl', Cmd: 'Ctrl', Command: 'Ctrl', Control: 'Ctrl', Option: 'Alt', Super: 'Win', Meta: 'Win' }
function keycaps(acc) {
  if (!acc || typeof acc !== 'string') return null
  const mac = process.platform === 'darwin'
  return acc.split('+').map(k => (mac ? ACCEL_MAC : ACCEL_WIN)[k] || (k === 'Plus' ? '+' : k === ',' ? ',' : k.length === 1 ? k.toUpperCase() : k))
}
const ROLE_LABEL = { copy: 'Copy', cut: 'Cut', paste: 'Paste', undo: 'Undo', redo: 'Redo', selectAll: 'Select All', pasteAndMatchStyle: 'Paste and Match Style', delete: 'Delete' }
const ROLE_ACCEL = { copy: 'CmdOrCtrl+C', cut: 'CmdOrCtrl+X', paste: 'CmdOrCtrl+V', undo: 'CmdOrCtrl+Z', redo: 'Shift+CmdOrCtrl+Z', selectAll: 'CmdOrCtrl+A', pasteAndMatchStyle: 'Shift+Alt+CmdOrCtrl+V' }
function iconURL(icon) {
  try {
    if (!icon) return null
    const img = typeof icon === 'string' ? nativeImage.createFromPath(icon) : icon
    if (img && img.isEmpty && !img.isEmpty()) return img.resize({ width: 32, height: 32 }).toDataURL()
  } catch {}
  return null
}
// flatten a template into plain data for the renderer, keeping the real items (and their handlers) here by id
function serialize(items, map, prefix = '') {
  const out = []
  let i = 0
  for (const it of items || []) {
    if (!it || it.visible === false) continue
    const id = prefix + (i++)
    if (it.type === 'separator') { if (out.length && out[out.length - 1].type !== 'separator') out.push({ id, type: 'separator' }); continue }
    map.set(id, it)
    const sub = Array.isArray(it.submenu) ? it.submenu : (it.submenu && it.submenu.items) ? it.submenu.items : null
    out.push({
      id, type: sub ? 'submenu' : (it.type === 'checkbox' || it.type === 'radio') ? it.type : 'normal',
      label: String(it.label || ROLE_LABEL[it.role] || ''), sublabel: it.sublabel || '',
      enabled: it.enabled !== false, checked: !!it.checked,
      keys: keycaps(it.accelerator || (it.role && ROLE_ACCEL[it.role])), role: it.role || '', icon: iconURL(it.icon), swatch: it.swatch || null,
      submenu: sub ? serialize(sub, map, id + '.') : undefined,
    })
  }
  while (out.length && out[out.length - 1].type === 'separator') out.pop()
  return out
}
function nativeMenu(host, items) {
  try { Menu.buildFromTemplate(items).popup({ window: host.win }) } catch (e) { CFG.log('native menu failed', e && e.message) }
}
function runRole(wc, role) {
  if (!wc || wc.isDestroyed()) return
  const fn = { copy: 'copy', cut: 'cut', paste: 'paste', undo: 'undo', redo: 'redo', selectAll: 'selectAll', pasteAndMatchStyle: 'pasteAndMatchStyle', delete: 'delete' }[role]
  if (fn && typeof wc[fn] === 'function') wc[fn]()
}

/**
 * Show a Lumen-drawn menu.
 * items: Electron menu template. at: { x, y } in window content coordinates (default: the cursor).
 * opts.wc: the webContents that role items (copy, paste...) act on. opts.source: the webContents that keeps
 * keyboard focus while the menu is open (its keys drive the menu), default: the focused one.
 */
async function popupMenu(host, items, { at, wc, source, kind = 'menu' } = {}) {
  if (!items || !items.length) return
  if (NATIVE() || !host || !host.win || host.win.isDestroyed()) return host && nativeMenu(host, items)
  const n = setup(host)
  if (n.menuState) closeMenu(host, 'replaced')
  if (!n.menu || n.menu.failed) { if (n.menu) destroy(n.menu); n.menu = makeView(host, 'menu') }
  const o = n.menu
  const map = new Map()
  const data = serialize(items, map)
  if (!data.length) return
  const ok = await o.ready
  if (!ok || o.failed || host.win.isDestroyed()) { CFG.log('nova menu unavailable, native fallback'); return nativeMenu(host, items) }
  if (!at) {
    try { const { screen } = require('electron'); const p = screen.getCursorScreenPoint(), b = host.win.getContentBounds(); at = { x: p.x - b.x, y: p.y - b.y } } catch { at = { x: 40, y: 40 } }
  }
  const src = source || allWebContents.getFocusedWebContents() || null
  const st = n.menuState = { map, items, wc, src, kind, opened: Date.now(), keys: [] }
  // the page keeps keyboard focus (so nothing on it blurs or loses its selection); its keys drive the menu instead
  const fwd = (e, input) => {
    if (n.menuState !== st || input.type !== 'keyDown') return
    e.preventDefault()
    try { o.view.webContents.send('nova:menu-key', { key: input.key, shift: input.shift }) } catch {}
  }
  const targets = new Set([src, host.ui && host.ui.webContents].filter(x => x && !x.isDestroyed()))
  try { const a = host.active && host.active(); if (a && a.view) targets.add(a.view.webContents) } catch {}
  for (const t of targets) { t.on('before-input-event', fwd); st.keys.push(() => { try { t.off('before-input-event', fwd) } catch {} }) }
  attach(host, o)
  o.view.webContents.send('nova:menu-open', { items: data, x: Math.round(at.x), y: Math.round(at.y), kind, theme: theme(host) })
  // the glass refracts a picture of what is underneath; it arrives a moment after the menu, which is already open
  if (NOVA_GLASS) snapshot(host).then(shots => { if (n.menuState === st && shots.length) o.view.webContents.send('nova:menu-backdrop', shots) }).catch(() => {})
}
function closeMenu(host, why) {
  const n = host._nova; if (!n || !n.menuState) return
  const st = n.menuState; n.menuState = null
  st.keys.forEach(f => f())
  const o = n.menu
  if (o) {
    try { o.view.webContents.send('nova:menu-close', why || '') } catch {}
    // the renderer plays its short exit, then the view comes off the window
    clearTimeout(o._detachT)
    o._detachT = setTimeout(() => { if (!n.menuState && o.attached) detach(host, o) }, why === 'pick' ? 140 : 110)
  }
  if (why !== 'pick' && why !== 'blur' && why !== 'closed') { try { if (st.src && !st.src.isDestroyed()) st.src.focus() } catch {} }
}
function pick(host, id) {
  const n = host._nova; if (!n || !n.menuState) return
  const st = n.menuState, it = st.map.get(String(id))
  if (!it || it.enabled === false) return
  closeMenu(host, 'pick')
  try { if (st.src && !st.src.isDestroyed()) st.src.focus() } catch {}
  setImmediate(() => {
    try {
      if (typeof it.click === 'function') it.click({ ...it, checked: it.type === 'checkbox' ? !it.checked : true }, host.win, {})
      else if (it.role) runRole(st.wc || st.src, it.role)
    } catch (e) { CFG.log('menu item failed', e && e.stack || e) }
  })
}

// ------------------------------------------------------------------ dialogs
function nativeDialog(host, opts) {
  const { fields, list, ...o } = opts
  const parent = host && host.win && !host.win.isDestroyed() ? host.win : undefined
  if (fields) return Promise.resolve({ response: o.cancelId != null ? o.cancelId : 1, checkboxChecked: false, values: {} })
  const nat = { type: o.type || 'question', buttons: o.buttons || ['OK'], defaultId: o.defaultId, cancelId: o.cancelId, title: o.title, message: o.message || '', detail: o.detail, checkboxLabel: o.checkboxLabel, checkboxChecked: !!o.checkboxChecked }
  if (o.icon && typeof o.icon !== 'string') nat.icon = o.icon
  return (parent ? dialog.showMessageBox(parent, nat) : dialog.showMessageBox(nat)).then(r => ({ ...r, values: {} }))
}
function dialogIcon(icon) {
  if (!icon) return null
  if (typeof icon === 'string' && /^(key|lock|quit|link|leave|apps|puzzle|warning|info|question|user|printer)$/.test(icon)) return { glyph: icon }
  const u = iconURL(icon)
  return u ? { src: u } : null
}

/**
 * A Nova dialog: a glass sheet over the dimmed window. Same answer shape as dialog.showMessageBox:
 * { response, checkboxChecked }, plus { values } for dialogs with text fields.
 * opts: title, message, detail, buttons, defaultId, cancelId, checkboxLabel, checkboxChecked, icon (a nativeImage,
 * a path, or a glyph name), fields ([{ name, label, type, value }]), list (true: the buttons before cancelId are shown
 * as a list of choices, as for picking a passkey account), kind (a short word for tests and styling).
 */
function novaDialog(host, opts = {}) {
  const buttons = opts.buttons && opts.buttons.length ? opts.buttons : ['OK']
  const cancelId = opts.cancelId != null ? opts.cancelId : Math.max(0, buttons.findIndex(b => /^(cancel|no|stay|keep running)$/i.test(b)))
  const o2 = { ...opts, buttons, cancelId, defaultId: opts.defaultId != null ? opts.defaultId : 0 }
  if (NATIVE() || !host || !host.win || host.win.isDestroyed()) return nativeDialog(host, o2)
  const n = setup(host)
  // one dialog at a time per window; the next one waits its turn
  const run = n.queue.then(() => showDialog(host, o2)).catch(e => { CFG.log('nova dialog failed', e && e.stack || e); return nativeDialog(host, o2) })
  n.queue = run.catch(() => {})
  return run
}
async function showDialog(host, opts) {
  if (host.win.isDestroyed()) return { response: opts.cancelId, checkboxChecked: false, values: {} }
  const n = setup(host)
  if (n.menuState) closeMenu(host, 'dialog')
  // a dialog view is kept loaded ahead of time, so the sheet appears at once; the next spare loads behind it
  const o = n.dialog = n.spare && !n.spare.failed ? n.spare : makeView(host, 'dialog')
  n.spare = null
  setTimeout(() => { if (!host.win.isDestroyed() && !n.spare) n.spare = makeView(host, 'dialog') }, 1200)
  const ok = await o.ready
  if (!ok || host.win.isDestroyed()) { destroy(o); n.dialog = null; if (host.win.isDestroyed()) return { response: opts.cancelId, checkboxChecked: false, values: {} }; return nativeDialog(host, opts) }
  const prevFocus = allWebContents.getFocusedWebContents()
  return new Promise(resolve => {
    let settled = false
    const finish = r => {
      if (settled) return; settled = true
      n.dialogState = null
      const res = r || { response: opts.cancelId, checkboxChecked: !!opts.checkboxChecked, values: {} }
      setTimeout(() => {
        detach(host, o); destroy(o); if (n.dialog === o) n.dialog = null
        try { if (prevFocus && !prevFocus.isDestroyed() && !host.win.isDestroyed()) prevFocus.focus() } catch {}
      }, r ? 170 : 0)
      resolve(res)
    }
    n.dialogState = { finish, opts, view: o.view }
    o.view.webContents.once('render-process-gone', () => finish(null))
    attach(host, o)
    o.view.webContents.focus()
    const payload = {
      title: opts.title || '', message: opts.message || '', detail: opts.detail || '', buttons: opts.buttons, defaultId: opts.defaultId, cancelId: opts.cancelId,
      checkboxLabel: opts.checkboxLabel || '', checkboxChecked: !!opts.checkboxChecked, icon: dialogIcon(opts.icon), fields: opts.fields || null, list: !!opts.list, error: opts.error || '',
      kind: opts.kind || '', theme: theme(host),
    }
    o.view.webContents.send('nova:dialog-open', payload)
    if (NOVA_GLASS) snapshot(host).then(shots => { if (!settled && shots.length) o.view.webContents.send('nova:dialog-backdrop', shots) }).catch(() => {})
  })
}

// ------------------------------------------------------------------ toasts (tabs on top)
// With tabs on top the chrome has no free room for a toast: drawn in the chrome it covered the tab strip. So the toast
// gets its own small transparent view, sized to the capsule, just under the toolbar over the top of the page. Only the
// capsule itself takes clicks; the rest of the page stays live. The chrome keeps its copy as the source of truth.
const TOAST_PAD = { x: 26, top: 0, bottom: 30 }
function placeToast(host) {
  const n = host._nova, o = n && n.toast; if (!o) return
  const r = host.rect || { x: 0, y: 0, width: 600, height: 400 }
  const st = n.toastState || {}
  const w = Math.min(Math.max(120, (st.w || 300) + TOAST_PAD.x * 2), Math.max(120, r.width - 16))
  const h = (st.h || 44) + 8 + TOAST_PAD.bottom
  try { o.view.setBounds({ x: Math.round(r.x + (r.width - w) / 2), y: Math.round(r.y + 4), width: Math.round(w), height: Math.round(h) }) } catch {}
}
/** data: { msg, label, kind, icon (svg markup), ms }, or null to put the toast away. Answers true when shown here. */
async function toast(host, data) {
  if (NATIVE() || !host || !host.win || host.win.isDestroyed()) return false
  const n = setup(host)
  if (!data) { if (n.toast && n.toast.attached) try { n.toast.view.webContents.send('nova:toast-close') } catch {} ; return true }
  if (!n.toast || n.toast.failed) { if (n.toast) destroy(n.toast); n.toast = makeView(host, 'toast') }
  const o = n.toast
  if (!o.loaded) { const ok = await Promise.race([o.ready, new Promise(r => setTimeout(() => r(false), 1500))]); if (!ok || host.win.isDestroyed()) return false }
  const id = (n.toastSeq = (n.toastSeq || 0) + 1)
  n.toastState = { ...(n.toastState || {}), id }
  placeToast(host)
  if (!o.attached) { try { host.win.contentView.addChildView(o.view) } catch {} o.attached = true }
  else try { host.win.contentView.addChildView(o.view) } catch {}
  // menus and dialogs stay above the toast
  for (const x of [n.menu, n.dialog]) if (x && x.attached) try { host.win.contentView.addChildView(x.view) } catch {}
  o.view.webContents.send('nova:toast', { id, msg: String(data.msg || '').slice(0, 300), label: String(data.label || '').slice(0, 40), kind: data.kind === 'bad' ? 'bad' : '', icon: typeof data.icon === 'string' && /^<svg[\s>]/.test(data.icon) ? data.icon : '', ms: Math.max(1200, Math.min(10000, +data.ms || 2200)), theme: theme(host) })
  return true
}
async function toastBackdrop(host) {
  if (!NOVA_GLASS) return
  const n = host._nova, o = n && n.toast; if (!o || !o.attached || !n.toastState) return
  try {
    const a = host.active && host.active(); if (!a || !a.view) return
    const vb = o.view.getBounds(), tb = a.view.getBounds(), st = n.toastState
    const px = vb.x + TOAST_PAD.x, py = vb.y + 8
    const R = { x: px - 20 - tb.x, y: py - 20 - tb.y, width: (st.w || 300) + 40, height: (st.h || 44) + 40 }
    if (R.x < 0 || R.y < 0 || R.x + R.width > tb.width || R.y + R.height > tb.height) return
    const img = await Promise.race([a.view.webContents.capturePage(R), new Promise(r => setTimeout(() => r(null), 500))])
    if (!img || img.isEmpty() || !o.attached) return
    o.view.webContents.send('nova:toast-backdrop', { src: img.resize({ width: Math.max(1, Math.round(R.width / 2)) }).toDataURL(), x: -20, y: -20, w: R.width, h: R.height })
  } catch {}
}

// ------------------------------------------------------------------ IPC from the Nova views
ipcMain.on('nova', (e, action, a) => {
  const ent = byWc.get(e.sender.id); if (!ent) return
  const { host } = ent
  if (ent.kind === 'menu') {
    if (action === 'pick') pick(host, a)
    else if (action === 'close') closeMenu(host, a || 'dismiss')
  } else if (ent.kind === 'toast') {
    const n = host._nova, o = n && n.toast; if (!o || !n.toastState) return
    const cur = a && typeof a === 'object' ? a.id : a
    if (cur !== n.toastState.id) return
    if (action === 'toast-size') { n.toastState.w = Math.max(60, Math.min(1200, +a.w || 300)); n.toastState.h = Math.max(30, Math.min(120, +a.h || 44)); placeToast(host); toastBackdrop(host) }
    else if (action === 'toast-act') { try { if (host.ui && !host.ui.webContents.isDestroyed()) host.ui.webContents.executeJavaScript('window.__toastAct && window.__toastAct()').catch(() => {}) } catch {} }
    else if (action === 'toast-done') { o.attached = false; try { host.win.contentView.removeChildView(o.view) } catch {} }
  } else if (ent.kind === 'dialog') {
    const st = host._nova && host._nova.dialogState
    if (action === 'answer' && st) st.finish({ response: Number(a && a.response), checkboxChecked: !!(a && a.checkboxChecked), values: (a && a.values) || {} })
  }
})

// for tests and the release gate
function state(host) {
  const n = host && host._nova
  return {
    menuOpen: !!(n && n.menuState), menuView: n && n.menu ? n.menu.view : null, menuItems: n && n.menuState ? [...n.menuState.map.values()].map(i => i.label || ROLE_LABEL[i.role] || '') : [],
    dialogOpen: !!(n && n.dialogState), dialogView: n && n.dialogState ? n.dialogState.view : null,
    toastOpen: !!(n && n.toast && n.toast.attached), toastView: n && n.toast ? n.toast.view : null,
  }
}

// the page that asked gave up (a passkey request it aborted): close its open question as if Cancel was chosen
function closeDialog(host) { const n = host && host._nova; if (n && n.dialogState) n.dialogState.finish(null) }
module.exports = { configure, prewarm, popupMenu, closeMenu, novaDialog, closeDialog, restack, state, keycaps, toast }
