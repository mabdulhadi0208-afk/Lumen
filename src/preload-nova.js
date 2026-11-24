// Bridge for Lumen's own menus and dialogs (ui/menu.html, ui/dialog.html): they hear only their own channels
// and can only answer the main process.
const { contextBridge, ipcRenderer } = require('electron')

const channels = ['nova:menu-open', 'nova:menu-close', 'nova:menu-key', 'nova:menu-backdrop', 'nova:dialog-open', 'nova:dialog-backdrop', 'nova:toast', 'nova:toast-close', 'nova:toast-backdrop']
contextBridge.exposeInMainWorld('nova', {
  on: (ch, fn) => { if (channels.includes(ch)) ipcRenderer.on(ch, (e, d) => fn(d)) },
  send: (action, data) => ipcRenderer.send('nova', String(action), data),
})
