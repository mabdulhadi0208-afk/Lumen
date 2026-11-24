// The Nova dialog's only bridge: send back which button was picked, and how tall the dialog wants to be.
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('lumenDialog', { answer: i => ipcRenderer.send('lumen-dialog:answer', i), size: h => ipcRenderer.send('lumen-dialog:size', h) })
