// Cmd T speed: from the key reaching Lumen to the New Tab on screen, 20 times, plus idle CPU and memory with the
// preloaded New Tab kept drawn. Not part of the suite (timings depend on the machine).
// Run: xvfb-run -a npx electron test/newtabspeed.js --no-sandbox   (log: /tmp/lumen-newtabspeed.log)
//      LUMEN_NO_SPARE=1 ... for the same numbers without the preloaded New Tab
const fs = require('fs')
const { performance } = require('perf_hooks')
const LOG = '/tmp/lumen-newtabspeed.log'; fs.writeFileSync(LOG, '')
const out = l => { console.log(l); fs.appendFileSync(LOG, l + '\n') }
const { app } = require('electron')
fs.rmSync('/tmp/lumen-newtabspeed', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-newtabspeed')
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
const now = () => performance.timeOrigin + performance.now()
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const p95 = a => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(s.length * .95) - 1)] }
const f = x => x.toFixed(2)
app.whenReady().then(async () => {
  await wait(6000)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  w.win.setContentSize(1280, 820)
  w.createTab('data:text/html,<title>page</title><body style="background:linear-gradient(135deg,#ffd6e0,#c9e4ff)"><h1>A page</h1>', { active: true })
  await wait(3000)
  // the chrome notes when the state with one more tab arrives, and the second frame after it (on screen)
  await ex(`window.__nt = null; api.on('state', s => { const n = window.__ntWant; if (!n || s.tabs.length < n) return; window.__ntWant = 0; const a = performance.timeOrigin + performance.now(); requestAnimationFrame(() => { const b = performance.timeOrigin + performance.now(); requestAnimationFrame(() => { window.__nt = { ipc: a, f1: b, f2: performance.timeOrigin + performance.now() } }) }) }); 1`)
  const R = { main: [], ipc: [], f1: [], f2: [], page: [] }; let used = 0
  for (let i = 0; i < 20; i++) {
    for (let k = 0; k < 120 && !(process.env.LUMEN_NO_SPARE || (w.spare && w.spare.readyAt)); k++) await wait(100)
    await wait(300)
    const n = w.order.length + 1
    await ex(`window.__nt = null; window.__ntWant = ${n}; 1`)
    const hadSpare = !!(w.spare && w.spare.readyAt)
    const t0 = now()
    w.handleKeys({ preventDefault() {} }, { type: 'keyDown', key: 't', control: process.platform !== 'darwin', meta: process.platform === 'darwin', shift: false, alt: false })
    const t1 = now()
    const t = w.active()
    // the page itself: two frames after a message sent right away
    const pg = t.view.webContents.executeJavaScript(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(performance.timeOrigin + performance.now()))))`, true).catch(() => 0)
    let c = null; for (let k = 0; k < 400 && !c; k++) { c = await ex(`window.__nt`); if (!c) await wait(5) }
    const p = await pg
    if (hadSpare && !t.view.webContents.isLoading()) used++
    R.main.push(t1 - t0); if (c) { R.ipc.push(c.ipc - t0); R.f1.push(c.f1 - t0); R.f2.push(c.f2 - t0) } if (p) R.page.push(p - t0)
    await wait(1200)
    if (w.order.length > 6) { for (const id of w.order.slice(1, -1)) w.closeTab(id); await wait(500) }
  }
  out(`Cmd T x20 (preloaded New Tab used ${used}/20)`)
  out(`  main process, key to createTab done: median ${f(med(R.main))} ms, p95 ${f(p95(R.main))} ms`)
  out(`  + IPC, state in the chrome: median ${f(med(R.ipc))} ms, p95 ${f(p95(R.ipc))} ms`)
  out(`  chrome first frame: median ${f(med(R.f1))} ms, p95 ${f(p95(R.f1))} ms; on screen (second frame): median ${f(med(R.f2))} ms, p95 ${f(p95(R.f2))} ms`)
  out(`  New Tab page, two frames: median ${f(med(R.page))} ms, p95 ${f(p95(R.page))} ms`)
  // idle with the preloaded New Tab kept drawn (sitting on a plain page)
  w.activate(w.order[0]); await wait(5000)
  const snap = () => new Map(app.getAppMetrics().map(p => [p.pid, p]))
  const a = snap(); await wait(30000); const b = snap()
  let cpu = 0, mem = 0; const types = {}
  for (const [pid, p] of b) { const d = (p.cpu.cumulativeCPUUsage || 0) - ((a.get(pid) || { cpu: {} }).cpu.cumulativeCPUUsage || 0); cpu += d; types[p.type] = +((types[p.type] || 0) + d).toFixed(2); mem += p.memory.workingSetSize }
  out(`Idle 30 s: CPU ${(cpu / 30 * 100).toFixed(2)}% of one core ${JSON.stringify(types)}; memory ${(mem / 1024).toFixed(0)} MB over ${b.size} processes`)
  if (w.spare && w.spare.view) { const pid = w.spare.view.webContents.getOSProcessId(), p = b.get(pid); if (p) out(`  the preloaded New Tab: CPU ${(((p.cpu.cumulativeCPUUsage || 0) - ((a.get(pid) || { cpu: {} }).cpu.cumulativeCPUUsage || 0)) / 30 * 100).toFixed(2)}%, memory ${(p.memory.workingSetSize / 1024).toFixed(0)} MB`) }
  if (process.env.DETAIL) for (const wc of require('electron').webContents.getAllWebContents()) { try { out('  ' + wc.getURL().slice(0, 50) + ' ' + await wc.executeJavaScript(`document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.transitionProperty || 'waapi') + ':' + (a.effect && a.effect.getTiming().iterations) + '@' + (a.effect && a.effect.target ? String(a.effect.target.id || a.effect.target.className || '').slice(0, 20) : '')).slice(0, 6).join(',') + ' ' + document.visibilityState`)) } catch {} }
  app.exit(0)
})
