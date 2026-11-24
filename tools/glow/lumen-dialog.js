// Surge's questions inside Lumen ("Replace the macOS Dock?", the Automation permission), shown as a small Lumen Nova
// dialog window of Surge's own instead of a plain system alert. Same call shape and answer as dialog.showMessageBox:
// lumenDialog({ type, message, detail, buttons, defaultId, cancelId }) -> Promise<{ response }>.
// Copied into apps/surge by tools/import-apps.py.
const path = require('path')
const { BrowserWindow, screen } = require('electron')
module.exports = function lumenDialog(o = {}) {
  const buttons = (o.buttons && o.buttons.length ? o.buttons : ['OK']).map(String)
  const cancelId = o.cancelId != null ? o.cancelId : buttons.length - 1, defaultId = o.defaultId != null ? o.defaultId : 0
  return new Promise(resolve => {
    let done = false, w = null
    const finish = i => { if (done) return; done = true; resolve({ response: i, checkboxChecked: false }); setTimeout(() => { try { if (w && !w.isDestroyed()) w.destroy() } catch {} }, 260) }
    let wa = { x: 0, y: 0, width: 1280, height: 800 }
    try { wa = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea } catch {}
    const W = 480, H = 280
    w = new BrowserWindow({ width: W, height: H, x: Math.round(wa.x + (wa.width - W) / 2), y: Math.round(wa.y + wa.height * .24), show: false, frame: false, transparent: true,
      backgroundColor: '#00000000', hasShadow: false, resizable: false, minimizable: false, maximizable: false, fullscreenable: false, alwaysOnTop: true, skipTaskbar: true,
      title: 'Surge', webPreferences: { preload: path.join(__dirname, 'lumen-dialog-preload.js'), contextIsolation: true, nodeIntegration: false } })
    w.webContents.on('ipc-message', (_e, ch, v) => {
      if (ch === 'lumen-dialog:answer') finish(Number(v) || 0)
      else if (ch === 'lumen-dialog:size') { try { w.setContentSize(W, Math.max(170, Math.min(620, Math.ceil(Number(v) || H)))); if (!w.isVisible()) { w.show(); w.focus() } } catch {} }
    })
    w.on('closed', () => finish(cancelId))
    w.loadFile(path.join(__dirname, 'lumen-dialog.html'), { hash: encodeURIComponent(JSON.stringify({ type: o.type || 'info', message: String(o.message || ''), detail: String(o.detail || ''), buttons, defaultId, cancelId })) })
    setTimeout(() => { try { if (w && !w.isDestroyed() && !w.isVisible()) w.show() } catch {} }, 1500)
  })
}
