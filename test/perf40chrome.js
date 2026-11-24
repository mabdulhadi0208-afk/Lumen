// Idle CPU and running animations in the chrome after 10 s idle (Lumen 4.0 check). Not part of the suite.
const fs = require('fs'), http = require('http')
const { app } = require('electron')
const DIR = '/tmp/lumen-40perf'
fs.rmSync(DIR, { recursive: true, force: true }); app.setPath('userData', DIR)
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end('<title>Idle page</title><body style="background:linear-gradient(135deg,#ffd6e0,#c9e4ff);font:20px sans-serif;padding:40px"><h1>Still</h1></body>') }).listen(48242, '127.0.0.1')
const ANIMS = `document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.transitionProperty || 'waapi') + ':' + (a.effect && a.effect.getTiming().iterations) + ':' + (a.effect && a.effect.target ? (a.effect.target.id || a.effect.target.className || a.effect.target.tagName) : '')).slice(0, 30)`
app.whenReady().then(async () => {
  await wait(7000)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  for (let i = 0; i < 3; i++) w.createTab('http://127.0.0.1:48242/' + i, { active: true })
  await wait(3000)
  // open and close the command bar, a popover, a toast and a menu, then leave everything alone
  await ex(`openCmd('newtab')`); await wait(800); await ex(`closeCmd(true)`)
  await ex(`openMainMenu()`); await wait(800); await ex(`closePopover(true)`)
  await ex(`toast('Hello there')`); await wait(300)
  await w.contextMenu(w.active(), { x: 300, y: 300, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '', isEditable: false, misspelledWord: '', dictionarySuggestions: [], editFlags: {}, formControlType: 'none', inputFieldType: '' }); await wait(800)
  L.__nova.closeMenu(w, 'x')
  await wait(10000)
  app.getAppMetrics()
  await wait(5000)
  const m = app.getAppMetrics()
  const tot = m.reduce((a, p) => a + (p.cpu ? p.cpu.percentCPUUsage : 0), 0)
  console.log('IDLE CPU total ' + tot.toFixed(2) + '% :: ' + m.map(p => p.type + '=' + (p.cpu ? p.cpu.percentCPUUsage.toFixed(2) : '?')).join(' '))
  console.log('UI running animations: ' + JSON.stringify(await ex(ANIMS)))
  const st = L.__nova.state(w)
  if (st.menuView) console.log('menu view running animations: ' + JSON.stringify(await st.menuView.webContents.executeJavaScript(ANIMS)))
  for (const v of w.win.contentView.children) { try { const n = await v.webContents.executeJavaScript(`document.getAnimations().filter(a => a.playState === 'running').length`); console.log('view ' + v.webContents.getURL().slice(0, 60) + ' running=' + n) } catch {} }
  app.exit(0)
})
