// Chromium trace of a Settings scroll: which renderer work runs per frame, and which elements repaint. Not part of the suite.
// Run: xvfb-run -a npx electron test/perftrace.js --no-sandbox [url]
const fs = require('fs')
const { app } = require('electron')
fs.rmSync('/tmp/lumen-perftrace', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-perftrace')
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
const URL_ = process.argv.find(a => /^lumen:|^data:/.test(a)) || 'lumen://settings/general'
app.whenReady().then(async () => {
  await wait(6000)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  w.win.setContentSize(1280, 820)
  const t = w.createTab(URL_, { active: true }); await wait(5000)
  const wc = t.view.webContents, dbg = wc.debugger
  if (process.env.EXP) { await wc.executeJavaScript(process.env.EXP).catch(e => console.log('EXP failed', e.message)); await wait(500) }
  dbg.attach('1.3')
  const events = []
  dbg.on('message', (e, method, params) => { if (method === 'Tracing.dataCollected') events.push(...params.value) })
  const done = new Promise(r => dbg.on('message', (e, m) => { if (m === 'Tracing.tracingComplete') r() }))
  await dbg.sendCommand('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink,cc', transferMode: 'ReportEvents' })
  for (let i = 0; i < 40; i++) { wc.sendInputEvent({ type: 'mouseWheel', x: 700, y: 300, deltaX: 0, deltaY: -100, wheelTicksY: -1, canScroll: true }); await wait(33) }
  await wait(300)
  await dbg.sendCommand('Tracing.end'); await done
  const pid = wc.getOSProcessId(); const agg = new Map(), paints = new Map()
  for (const e of events) {
    if (e.pid !== pid || e.ph !== 'X' || !e.dur) continue
    agg.set(e.name, (agg.get(e.name) || 0) + e.dur)
    if (e.name === 'Paint' && e.args && e.args.data) { const k = e.args.data.nodeId + ' layer ' + e.args.data.layerId; paints.set(k, (paints.get(k) || 0) + 1) }
  }
  console.log('TOP ' + [...agg].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => k + '=' + (v / 1000).toFixed(0) + 'ms').join(' | '))
  await dbg.sendCommand('DOM.getDocument', { depth: -1 })
  const top = [...paints].sort((a, b) => b[1] - a[1]).slice(0, 8)
  for (const [k, n] of top) {
    const id = +k.split(' ')[0]; let d = ''
    try { const r = await dbg.sendCommand('DOM.describeNode', { backendNodeId: id }); d = r.node.localName + (r.node.attributes ? '[' + r.node.attributes.join(' ').slice(0, 80) + ']' : '') } catch (e) { d = '?' }
    console.log('PAINT ' + n + 'x node ' + k + ' ' + d)
  }
  app.exit(0)
})
