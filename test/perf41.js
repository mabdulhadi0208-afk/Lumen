// Lumen 4.1 lag probe: numbers for every place the browser can stall, with ceilings so a regression fails.
// Measures startup (first window, first paint of the chrome), main-process event-loop delay (max and p99) during
// startup, idle, tab open, tab switching, navigation and typing in the command bar, IPC messages per second to the
// chrome, command bar keystroke-to-suggestions latency over 20,000 history pages, tab switch latency, memory after
// opening and closing 30 tabs (and leaked webContents and listeners), and idle CPU per process.
// Run: xvfb-run -a npx electron test/perf41.js --no-sandbox   (log: /tmp/lumen-perf41.log, PASS / FAIL lines)
//      PERF41_LAX=1 prints the numbers without failing (for a busy machine)
// Ceilings sit well under what 4.0 measured (startup stall 1.6-2.7 s, keystroke p95 0.3-1.2 s, typing stall 350 ms,
// tab switch p95 190-270 ms) with headroom for a busy 4-core test machine.
const T0 = Date.now()
const fs = require('fs')
const http = require('http')
const { monitorEventLoopDelay } = require('perf_hooks')
const LOG = '/tmp/lumen-perf41.log'; fs.writeFileSync(LOG, '')
const out = l => { console.log(l); fs.appendFileSync(LOG, l + '\n') }
const eld = monitorEventLoopDelay({ resolution: 5 }); eld.enable()
const { app, webContents, ipcMain, session, nativeTheme, powerMonitor } = require('electron')
const DIR = '/tmp/lumen-perf41'
fs.rmSync(DIR, { recursive: true, force: true }); app.setPath('userData', DIR)
// a profile that has been used: 20,000 history pages, 300 bookmarks, a few sessions' worth of settings
fs.mkdirSync(DIR, { recursive: true })
{
  const now = Date.now(), hist = []
  const words = ['github', 'news', 'docs', 'mail', 'video', 'shop', 'maps', 'wiki', 'forum', 'blog', 'music', 'cloud', 'learn', 'dev', 'store']
  for (let i = 0; i < 20000; i++) { const w1 = words[i % words.length], w2 = words[(i * 7) % words.length]; hist.push({ url: `https://${w1}${i % 400}.example.com/${w2}/page-${i}?ref=${i % 13}`, title: `${w1} ${w2} page number ${i} with a fairly ordinary title`, t: now - i * 60000, visits: 1 + (i % 9) }) }
  fs.writeFileSync(DIR + '/history.json', JSON.stringify(hist))
  fs.writeFileSync(DIR + '/bookmarks.json', JSON.stringify(Array.from({ length: 300 }, (_, i) => ({ id: 'b' + i, url: `https://site${i}.example.org/`, title: 'Bookmark ' + i, folder: '', updatedAt: now }))))
}
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
const LAX = !!process.env.PERF41_LAX
let fails = 0
const check = (name, v, max, unit = 'ms') => { const ok = v <= max; if (!ok && !LAX) fails++; out(`${ok ? 'PASS' : LAX ? 'OVER' : 'FAIL'} ${name}: ${typeof v === 'number' ? +v.toFixed(2) : v} ${unit} (ceiling ${max})`) }
const ms = ns => ns / 1e6
const loop = () => { const r = { max: ms(eld.max), p99: ms(eld.percentile(99)) }; eld.reset(); return r }
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0 }
const p95 = a => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(s.length * .95) - 1)] || 0 }

// a small site to browse: pages with a title, a favicon and some text, a page that changes its title as it goes
const srv = http.createServer((req, res) => {
  if (req.url.startsWith('/fav')) { res.writeHead(200, { 'content-type': 'image/svg+xml' }); return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#5b8cff"/></svg>') }
  const n = req.url.replace(/\W/g, '') || 'home'
  res.writeHead(200, { 'content-type': 'text/html' })
  res.end(`<!doctype html><title>Page ${n}</title><link rel="icon" href="/fav${n}.svg"><body style="font:16px sans-serif;margin:40px"><h1>Page ${n}</h1>${'<p>Some ordinary text on an ordinary page, to look like a site. </p>'.repeat(60)}<script>let k = 0; const t = setInterval(() => { document.title = 'Page ${n} ' + (++k); if (k > 4) clearInterval(t) }, 300)</script>`)
})

// startup: when the first window exists and when its chrome has painted
let tWin = 0
const poll = setInterval(() => { if (!tWin && L.windows[0]) tWin = Date.now() }, 2)

app.whenReady().then(async () => {
  const tReady = Date.now()
  await new Promise(r => srv.listen(0, '127.0.0.1', r))
  const BASE = `http://127.0.0.1:${srv.address().port}/`
  for (let i = 0; i < 2000 && !L.windows[0]; i++) await wait(5)
  const w = L.windows[0], uwc = w.ui.webContents
  if (uwc.isLoading()) await new Promise(r => uwc.once('did-finish-load', r))
  const tLoad = Date.now()
  const fcp = await uwc.executeJavaScript(`new Promise(r => { const f = () => { const e = performance.getEntriesByName('first-contentful-paint')[0]; e ? r(performance.timeOrigin + e.startTime) : setTimeout(f, 10) }; f() })`)
  clearInterval(poll)
  out(`startup: app ready ${tReady - T0} ms, first window ${tWin - T0} ms, chrome loaded ${tLoad - T0} ms, chrome first paint ${Math.round(fcp - T0)} ms`)
  await wait(3000)
  const lStart = loop()
  out(`  event loop during startup: max ${lStart.max.toFixed(1)} ms, p99 ${lStart.p99.toFixed(1)} ms`)
  check('startup to chrome first paint', fcp - T0, 4000)
  check('startup event-loop stall max', lStart.max, 700)

  // count every message to the chrome, and its size
  const ipc = { n: 0, bytes: 0, by: {} }
  const send0 = uwc.send.bind(uwc)
  uwc.send = (ch, ...a) => { ipc.n++; ipc.by[ch] = (ipc.by[ch] || 0) + 1; try { ipc.bytes += JSON.stringify(a).length } catch {} return send0(ch, ...a) }
  const ipcReset = () => { const r = { n: ipc.n, bytes: ipc.bytes, by: ipc.by }; ipc.n = 0; ipc.bytes = 0; ipc.by = {}; return r }
  // and every call the chrome makes
  let inv = 0; const h0 = ipcMain._invokeHandlers && ipcMain._invokeHandlers.get('ui')
  if (h0) ipcMain._invokeHandlers.set('ui', (...a) => { inv++; return h0(...a) })

  const ex = s => uwc.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  w.win.setContentSize(1280, 820)
  w.createTab(BASE + 'start', { active: true }); await wait(3000)

  // ---- idle
  ipcReset(); inv = 0; loop()
  await wait(10000)
  let r = ipcReset(), l = loop()
  out(`idle 10 s: ${r.n} messages to the chrome (${(r.n / 10).toFixed(1)}/s, ${r.bytes} bytes) ${JSON.stringify(r.by)}, ${inv} calls from it; event loop max ${l.max.toFixed(1)} ms p99 ${l.p99.toFixed(1)} ms`)
  check('idle messages to the chrome per second', r.n / 10, 0.5, '/s')
  check('idle calls from the chrome per second', inv / 10, 0.5, '/s')

  // ---- browsing: open 6 tabs, navigate each twice (titles change as pages load)
  ipcReset(); inv = 0; loop()
  const tb = Date.now()
  const opened = []
  for (let i = 0; i < 6; i++) { opened.push(w.createTab(BASE + 'b' + i, { active: true })); await wait(400) }
  for (const t of opened) { w.activate(t.id); t.view.webContents.loadURL(BASE + 'n' + t.id); await wait(500) }
  await wait(2500)
  const bs = (Date.now() - tb) / 1000
  r = ipcReset(); l = loop()
  out(`browsing ${bs.toFixed(1)} s: ${r.n} messages to the chrome (${(r.n / bs).toFixed(1)}/s, ${(r.bytes / 1024).toFixed(0)} KB) ${JSON.stringify(r.by)}, ${inv} calls from it (${(inv / bs).toFixed(1)}/s); event loop max ${l.max.toFixed(1)} ms p99 ${l.p99.toFixed(1)} ms`)
  check('browsing messages to the chrome per second', r.n / bs, 25, '/s')
  check('browsing bytes to the chrome per second', r.bytes / bs / 1024, 60, 'KB/s')
  check('browsing calls from the chrome per second', inv / bs, 6, '/s')
  check('browsing event-loop stall max', l.max, 150)

  // ---- tab switching: from the switch to the chrome drawing the new state
  await ex(`window.__sw = null; api.on('state', s => { if (s.activeId !== window.__swWant) return; window.__swWant = 0; const a = performance.timeOrigin + performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => { window.__sw = { ipc: a, f2: performance.timeOrigin + performance.now() } })) }); 1`)
  const sw = { main: [], f2: [] }; loop()
  for (let i = 0; i < 24; i++) {
    const t = opened[i % opened.length]
    if (t.id === w.activeId) continue
    await ex(`window.__sw = null; window.__swWant = ${t.id}; 1`)
    const a = performance.timeOrigin + performance.now()
    w.activate(t.id)
    sw.main.push(performance.timeOrigin + performance.now() - a)
    let c = null; for (let k = 0; k < 300 && !c; k++) { c = await ex(`window.__sw`); if (!c) await wait(4) }
    if (c) sw.f2.push(c.f2 - a)
    await wait(250)
  }
  l = loop()
  out(`tab switch x${sw.main.length}: main process median ${med(sw.main).toFixed(2)} ms p95 ${p95(sw.main).toFixed(2)} ms; on screen in the chrome median ${med(sw.f2).toFixed(1)} ms p95 ${p95(sw.f2).toFixed(1)} ms; event loop max ${l.max.toFixed(1)} ms p99 ${l.p99.toFixed(1)} ms`)
  check('tab switch, main process (median)', med(sw.main), 12)
  check('tab switch, on screen (p95)', p95(sw.f2), 120)
  check('tab switch event-loop stall max', l.max, 150)

  // ---- command bar: keystroke to local results (history, bookmarks, tabs) on screen, over 20,000 history pages
  await ex(`openCmd('newtab'); if (!window.__rrw) { window.__rrw = 1; const o = renderResults; renderResults = function () { const r = o.apply(this, arguments); if (results.some(x => x.sec === 'History')) window.__kd = cmdInput.value.slice(0, cmdInput.selectionStart === cmdInput.selectionEnd ? cmdInput.value.length : cmdInput.selectionStart); return r } } 1`); await wait(600)
  const word = 'github github'
  const kt = []; loop()
  for (let i = 1; i <= word.length; i++) {
    const v = word.slice(0, i)
    // from the key to the next frame after the command bar drew this query's history results
    const d = await ex(`new Promise(res => { const t0 = performance.now(), want = ${JSON.stringify(v)}; window.__kd = null
      cmdInput.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText' })); cmdInput.value = want; cmdInput.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }))
      const f = () => { if (window.__kd === want) requestAnimationFrame(() => res(performance.now() - t0)); else if (performance.now() - t0 > 4000) res(-1); else setTimeout(f, 1) }; f() })`)
    kt.push(d)
    await wait(120)
  }
  l = loop()
  await ex(`closeCmd(true); 1`)
  const good = kt.filter(x => x >= 0)
  out(`command bar keystroke to history results on screen x${kt.length}: median ${med(good).toFixed(1)} ms p95 ${p95(good).toFixed(1)} ms (missed ${kt.length - good.length}) [${kt.map(x => Math.round(x)).join(' ')}]; event loop while typing max ${l.max.toFixed(1)} ms p99 ${l.p99.toFixed(1)} ms`)
  if (L.__suggest) {
    const st = []
    for (const q of ['g', 'gi', 'git', 'gith', 'githu', 'github', 'github n', 'docs', 'wiki page', 'zzz']) { const a = performance.now(); await L.__suggest(w, q, { local: true }); st.push(performance.now() - a) }
    out(`  suggest() local part over 20,000 pages: median ${med(st).toFixed(2)} ms, max ${Math.max(...st).toFixed(2)} ms`)
    check('suggest() local, max', Math.max(...st), 40)
  }
  check('command bar keystroke to results (p95)', good.length === kt.length ? p95(good) : 9999, 400)
  check('typing event-loop stall max', l.max, 200)

  // ---- memory: open and close 30 tabs
  for (const id of w.order.slice(1)) w.closeTab(id)
  await wait(3000)
  const rss = () => app.getAppMetrics().reduce((s, p) => s + p.memory.workingSetSize, 0) / 1024
  const listeners = () => {
    const s = session.fromPartition('persist:lumen'), n = e => e.eventNames().reduce((a, k) => a + e.listenerCount(k), 0)
    return { ipcMain: n(ipcMain), app: n(app), nativeTheme: n(nativeTheme), powerMonitor: n(powerMonitor), session: n(s), win: n(w.win), ui: n(uwc) }
  }
  const base = { rss: rss(), main: process.memoryUsage().rss / 1048576, wcs: webContents.getAllWebContents().length, ls: listeners() }
  out(`memory before: ${base.rss.toFixed(0)} MB over all processes, main ${base.main.toFixed(0)} MB, ${base.wcs} webContents, listeners ${JSON.stringify(base.ls)}`)
  loop()
  const t30 = []
  for (let i = 0; i < 30; i++) { t30.push(w.createTab(BASE + 'm' + i, { active: i % 3 === 0 })); await wait(120) }
  await wait(4000)
  const peak = rss()
  l = loop()
  out(`  30 tabs open: ${peak.toFixed(0)} MB; event loop while opening max ${l.max.toFixed(1)} ms p99 ${l.p99.toFixed(1)} ms`)
  check('opening 30 tabs event-loop stall max', l.max, 200)
  for (const t of t30) w.closeTab(t.id)
  await wait(6000)
  try { global.gc && global.gc() } catch {}
  await wait(2000)
  const after = { rss: rss(), main: process.memoryUsage().rss / 1048576, wcs: webContents.getAllWebContents().length, ls: listeners() }
  out(`memory after closing them: ${after.rss.toFixed(0)} MB (${(after.rss - base.rss >= 0 ? '+' : '') + (after.rss - base.rss).toFixed(0)} MB), main ${after.main.toFixed(0)} MB, ${after.wcs} webContents, listeners ${JSON.stringify(after.ls)}`)
  check('RSS back near baseline after 30 tabs', after.rss - base.rss, 120, 'MB')
  check('leaked webContents after 30 tabs', after.wcs - base.wcs, 0, '')
  const grew = Object.keys(after.ls).filter(k => after.ls[k] > base.ls[k] + 2)
  check('leaked listeners after 30 tabs', grew.length, 0, grew.length ? '(' + grew.map(k => `${k} ${base.ls[k]}->${after.ls[k]}`).join(', ') + ')' : '')

  // ---- idle CPU per process, on a plain page (Home and Settings have banner animations that are left as designed)
  w.createTab(BASE + 'still', { active: true })
  for (const id of w.order.slice(0, -1)) w.closeTab(id)
  await wait(5000)
  const snap = () => new Map(app.getAppMetrics().map(p => [p.pid, p]))
  // the delay histogram's own 5 ms timer would be most of the main process's idle CPU: off while measuring that
  eld.disable()
  const a = snap(); const ca = process.cpuUsage(); ipcReset()
  await wait(20000)
  const b = snap(); const cb = process.cpuUsage(ca); r = ipcReset()
  eld.enable(); eld.reset(); await wait(1000); l = loop()
  const per = {}; let worst = 0
  for (const [pid, p] of b) { const d = ((p.cpu.cumulativeCPUUsage || 0) - ((a.get(pid) || { cpu: {} }).cpu.cumulativeCPUUsage || 0)) / 20 * 100; per[p.type + ':' + pid] = +d.toFixed(2); if (p.type !== 'GPU') worst = Math.max(worst, d) }
  const mainPct = (cb.user + cb.system) / 1e6 / 20 * 100
  out(`idle 20 s CPU per process (% of a core): ${JSON.stringify(per)}; main by process.cpuUsage ${mainPct.toFixed(2)}%; ${r.n} messages to the chrome; event loop max ${l.max.toFixed(1)} ms`)
  check('idle CPU, worst non-GPU process', worst, 3, '%')
  check('idle CPU, main process', mainPct, 1.5, '%')

  out(fails ? `perf41: ${fails} FAIL` : 'perf41: all PASS')
  srv.close()
  app.exit(fails ? 1 : 0)
})
