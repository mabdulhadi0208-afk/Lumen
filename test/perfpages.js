// Lumen perf workloads (docs/PERF.md). Not part of the suite.
// For each workload it reports the CPU time Lumen's processes spent (seconds of CPU, summed per process type), which
// holds up on a busy machine far better than wall-clock times, plus frame gaps and wall times as a second view.
// Run: LUMEN_APPS_ANYWHERE=1 xvfb-run -a npx electron test/perfpages.js --no-sandbox   (log: /tmp/lumen-perfpages.log)
const fs = require('fs')
const LOG = '/tmp/lumen-perfpages.log'; fs.writeFileSync(LOG, '')
const out = l => { console.log(l); fs.appendFileSync(LOG, l + '\n') }
const { app } = require('electron')
const DIR = '/tmp/lumen-perfpages'
fs.rmSync(DIR, { recursive: true, force: true }); app.setPath('userData', DIR)
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))] }
// CPU seconds so far, per process type (processes that went away keep what they had)
const seen = new Map()
const cpuNow0 = () => { for (const p of app.getAppMetrics()) seen.set(p.pid, { type: p.type, s: p.cpu.cumulativeCPUUsage || 0 }); const r = {}; for (const v of seen.values()) r[v.type] = (r[v.type] || 0) + v.s; return r }
// the main process's event loop: the longest time a 10 ms timer was held up (a stall the whole browser feels)
let lastTick = 0, stall = 0
setInterval(() => { const n = performance.now(); if (lastTick) stall = Math.max(stall, n - lastTick - 10); lastTick = n }, 10)
const stallReset = () => { stall = 0; lastTick = performance.now() }
let cpuCalls = 0
const cpuNow = () => { if (cpuCalls++ % 2 === 0) stallReset(); return cpuNow0() }
const cpuDiff = (a, b) => { const r = {}; let t = 0; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (b[k] || 0) - (a[k] || 0); if (d > 0.005) r[k] = +d.toFixed(2); t += d } const st = stall; stallReset(); return `CPU ${t.toFixed(2)}s ${JSON.stringify(r)} | main stall max ${st.toFixed(0)}ms` }
const frames = wc => wc.executeJavaScript(`window.__gaps = []; window.__lt = 0; (function f(ts) { if (window.__lt) __gaps.push(ts - __lt); __lt = ts; window.__raf = requestAnimationFrame(f) })(performance.now()); 1`)
const framesEnd = async wc => { const g = await wc.executeJavaScript(`cancelAnimationFrame(__raf); __gaps.slice(2)`); return g.length ? `frames ${g.length}, median ${med(g).toFixed(1)}ms, p95 ${pct(g, .95).toFixed(1)}ms, over 33ms ${g.filter(x => x > 33.4).length}` : 'no frames' }
const only = (process.env.ONLY || '').split(',').filter(Boolean), want = k => !only.length || only.includes(k)

app.whenReady().then(async () => {
  await wait(6000)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  w.win.setContentSize(1280, 820); await wait(500)
  for (let i = 0; i < 3; i++) w.createTab('data:text/html,<title>t' + i + '</title><body style="background:linear-gradient(135deg,#ffd6e0,#c9e4ff)"><h1>Tab ' + i + '</h1>', { active: true })
  w.createTab('lumen://newtab', { active: true }); await wait(5000)   // warm-up, and the preloaded New Tab gets ready

  if (want('newtab')) {
    // ---- New Tab: what Cmd T does, five times
    const c0 = cpuNow(), wall = [], shown = []
    for (let i = 0; i < 5; i++) {
      const t0 = Date.now(); const t = w.createTab('lumen://newtab', { active: true }); wall.push(Date.now() - t0)
      const wc = t.view.webContents
      if (wc.isLoading()) await new Promise(r => wc.once('did-finish-load', r))
      // a frame of the page with its widgets in it, after the tab was opened
      const at = await wc.executeJavaScript(`new Promise(res => { const f = () => document.querySelector('#hero') && document.querySelectorAll('#widgets [data-w]').length ? requestAnimationFrame(() => res(Date.now())) : setTimeout(f, 10); f() })`)
      shown.push(at - t0)
      await wait(4500)
    }
    out(`NEWTAB x5: ${cpuDiff(c0, cpuNow())} | createTab() median ${med(wall)}ms | widgets in a frame median ${med(shown)}ms (${shown.join(',')})`)
  }
  if (want('idle')) {
    w.activate(w.order[w.order.length - 1]); await wait(4000)
    let c0 = cpuNow(); await wait(20000); out(`IDLE 20s on New Tab: ${cpuDiff(c0, cpuNow())}`)
    w.activate(w.order[0]); await wait(4000)
    c0 = cpuNow(); await wait(20000); out(`IDLE 20s on a web page: ${cpuDiff(c0, cpuNow())}`)
  }
  if (want('scroll')) {
    const CONTROL = 'data:text/html,<title>long</title><body style="font:16px sans-serif;margin:40px">' + '<p>Plain text to scroll, nothing else on the page. </p>'.repeat(400)
    for (const url of [CONTROL, 'lumen://settings/general', 'lumen://settings/appearance', 'lumen://newtab']) {
      const t = w.createTab(url, { active: true }); await wait(4500)
      const wc = t.view.webContents
      if (url.includes('newtab')) w.win.setContentSize(1280, 560)   // so Home has something to scroll
      if (process.env.EXP) await wc.executeJavaScript(process.env.EXP).catch(() => {})
      await wait(800)
      try { wc.debugger.attach('1.3'); await wc.debugger.sendCommand('Performance.enable') } catch {}
      const pm = async () => { try { const { metrics } = await wc.debugger.sendCommand('Performance.getMetrics'); return Object.fromEntries(metrics.map(m => [m.name, m.value])) } catch { return {} } }
      const m0 = await pm()
      const c0 = cpuNow(); await frames(wc)
      // PAD=1: a trackpad instead of a mouse wheel (small pixel steps at 60 per second, the same distance)
      const step = (dir) => process.env.PAD ? { type: 'mouseWheel', x: 700, y: 300, deltaX: 0, deltaY: dir * 50, hasPreciseScrollingDeltas: true, canScroll: true } : { type: 'mouseWheel', x: 700, y: 300, deltaX: 0, deltaY: dir * 100, wheelTicksY: dir, canScroll: true }
      const n = process.env.PAD ? 60 : 30, gap = process.env.PAD ? 16 : 33
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < n; i++) { wc.sendInputEvent(step(-1)); await wait(gap) }
        for (let i = 0; i < n; i++) { wc.sendInputEvent(step(1)); await wait(gap) }
      }
      await wait(600)
      const fr = await framesEnd(wc)
      const moved = await wc.executeJavaScript(`document.scrollingElement.scrollHeight - innerHeight`)
      const m1 = await pm(), dm = k => (((m1[k] || 0) - (m0[k] || 0)) * 1000).toFixed(0)
      out(`SCROLL ${url.slice(0, 32)} (4 s of wheel, +${moved}px page): ${cpuDiff(c0, cpuNow())} | ${fr} | page main thread: script ${dm('ScriptDuration')}ms, style ${dm('RecalcStyleDuration')}ms, layout ${dm('LayoutDuration')}ms, tasks ${dm('TaskDuration')}ms`)
      try { wc.debugger.detach() } catch {}
      w.win.setContentSize(1280, 820); w.closeTab(t.id); await wait(1500)
    }
  }
  if (want('switch')) {
    const ids = w.order.slice(0, 4); const c0 = cpuNow(); const times = []
    await frames(w.ui.webContents)
    for (let i = 0; i < 40; i++) { const h = process.hrtime.bigint(); w.activate(ids[i % ids.length]); times.push(Number(process.hrtime.bigint() - h) / 1e6); await wait(120) }
    await wait(500)
    out(`SWITCH x40: ${cpuDiff(c0, cpuNow())} | activate() median ${med(times).toFixed(2)}ms p95 ${pct(times, .95).toFixed(2)}ms | chrome ${await framesEnd(w.ui.webContents)}`)
  }
  if (want('cmdk')) {
    const c0 = cpuNow(), open = []
    for (let i = 0; i < 8; i++) {
      const ms = await ex(`new Promise(res => { const t0 = performance.now(); openCmd('newtab'); requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t0))) })`)
      open.push(ms); await wait(700); await ex(`closeCmd(true)`); await wait(500)
    }
    out(`CMDK x8: ${cpuDiff(c0, cpuNow())} | open to second frame median ${med(open).toFixed(1)}ms`)
  }
  app.exit(0)
})
