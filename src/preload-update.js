const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('lumenUpdate', {
  action: name => ipcRenderer.invoke('update:action', name),
  on: fn => { ipcRenderer.on('update:state', (e, s) => fn(s)) },
})
