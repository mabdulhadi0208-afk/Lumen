// The Nova menu's only bridge: receive the items, say which one was picked, how tall the menu is, or to close.
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('lumenMenu', {
  on: (ch, cb) => ipcRenderer.on('lumen-menu:' + ch, (_e, p) => cb(p)),
  pick: (id, checked) => ipcRenderer.send('lumen-menu:pick', id, checked),
  size: h => ipcRenderer.send('lumen-menu:size', h),
  close: () => ipcRenderer.send('lumen-menu:close'),
})
