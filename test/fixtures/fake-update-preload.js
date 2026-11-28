// test/flow46.js and test/qol46.js: the update card's bridge, with a made-up state instead of the real updater.
// The state comes from the page's query (?s=available|ready|...); actions are recorded in window.__acts.
const { contextBridge, ipcRenderer } = require('electron')
const st = new URLSearchParams(location.search).get('s') || 'available'
const state = { status: st, current: '4.5.1', latest: 'v4.6.0', size: 120e6, progress: 42, bytes: 50e6, speed: 6e6, eta: 12, lastCheck: Date.now(), verified: st === 'ready', notes: ['Paper and ink everywhere', 'Export and import your settings', 'Search the shortcut sheet'] }
const acts = []
contextBridge.exposeInMainWorld('lumenUpdate', { action: name => { acts.push(name); ipcRenderer.send('fake-update-act', name); return Promise.resolve(name === 'state' ? state : null) }, on: () => {} })
contextBridge.exposeInMainWorld('__fakeActs', () => acts.slice())
