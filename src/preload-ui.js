// Bridge for the browser chrome (sidebar, command bar, prompts).
const { contextBridge, ipcRenderer } = require('electron')

try { require('electron-chrome-extensions/browser-action').injectBrowserAction() } catch (e) { console.warn('browser actions unavailable', e.message) }

const channels = ['peek', 'state', 'settings', 'downloads', 'download-started', 'prompt', 'command', 'update', 'hover-url', 'find-result', 'toast', 'theme', 'fullscreen']
contextBridge.exposeInMainWorld('lumenUI', {
  do: (action, ...args) => ipcRenderer.invoke('ui', action, ...args),
  on: (ch, fn) => { if (channels.includes(ch)) ipcRenderer.on(ch, (e, d) => fn(d)) },
})
