// Lumen 4.1 home: how smooth and how cheap the New Tab is.
// Records requestAnimationFrame deltas during the entrance, wheel scrolling, and opening and closing every panel
// (Customize, suggestions, the engine list), the time to first paint, and the renderer's idle CPU over 20 s.
// Run: LUMEN_APPS_ANYWHERE=1 xvfb-run -a npx electron test/perf41home.js --no-sandbox   (log: /tmp/lumen-perf41home.log)
const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-perf41home', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-perf41home')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-perf41home.log'; fs.writeFileSync(LOG, '')
const say = l => { console.log(l); fs.appendFileSync(LOG, l + '\n') }
// a frame counts as dropped when it took longer than 1.5 frames at 60 Hz
const PROBE = `window.__fr = { d: [], last: 0, on: true }; (function f(t) { const F = window.__fr; if (F.last) F.d.push(t - F.last); F.last = t; if (F.on) requestAnimationFrame(f) })(performance.now()); requestAnimationFrame(t => { window.__fr.last = t })`
const READ = `(() => { const F = window.__fr; F.on = false; const d = F.d.slice(1); return JSON.stringify({ n: d.length, dropped: d.filter(x => x > 25).length, worst: Math.round(Math.max(0, ...d)), p95: Math.round(d.slice().sort((a, b) => a - b)[Math.floor(d.length * .95)] || 0), avg: +(d.reduce((a, b) => a + b, 0) / (d.length || 1)).toFixed(1) }) })()`
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  for (const [u, t] of [['https://github.com/a', 'GitHub thing'], ['https://news.example.com/', 'Some news'], ['https://docs.example.org/x', 'Docs page']]) L.D.addHistory(u, t)
  L.D.addReadLater('https://example.com/later', 'Saved article')
  w.win.setContentSize(1280, 820); await wait(800)
  say('machine: ' + require('os').cpus().length + ' cores, load ' + require('os').loadavg().map(x => x.toFixed(1)).join(' ') + ', software GL under xvfb')

  // the same probe on two other Lumen pages, as a baseline for this machine
  for (const u of ['lumen://settings/general', 'lumen://history']) {
    const t = w.createTab(u, { active: true }), wc = t.view.webContents
    await new Promise(r => wc.once('dom-ready', r)); await wc.executeJavaScript(PROBE); await wait(3000)
    const e = JSON.parse(await wc.executeJavaScript(READ)), fcp = Math.round(await wc.executeJavaScript(`(performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || -1`))
    say(`baseline ${u}: first contentful paint ${fcp} ms, first 3 s ${JSON.stringify(e)}`)
    t.view.webContents.close ? 0 : 0
  }
  for (let run = 1; run <= 2; run++) {
    const t0 = Date.now()
    const t = w.createTab('lumen://newtab', { active: true }), wc = t.view.webContents
    await new Promise(r => wc.once('dom-ready', r))
    await wc.executeJavaScript(PROBE)
    await wait(3000)
    const ent = JSON.parse(await wc.executeJavaScript(READ))
    const paint = JSON.parse(await wc.executeJavaScript(`JSON.stringify({ fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || -1), shell: Math.round((performance.getEntriesByName('lumen-home-shell')[0] || {}).startTime || -1), grid: Math.round((performance.getEntriesByName('lumen-home-grid')[0] || {}).startTime || -1) })`))
    say(`new tab ${run}: first contentful paint ${paint.fcp} ms after navigation, home shell drawn at ${paint.shell} ms, widgets in at ${paint.grid} ms (tab created to probe: ${Date.now() - t0 - 3000} ms)`)
    say(`entrance ${run}: ${JSON.stringify(ent)}`)
    if (run === 2) {
      const pg = s => wc.executeJavaScript(s)
      // wheel scrolling down and back up
      await pg(PROBE)
      for (let i = 0; i < 24; i++) { wc.sendInputEvent({ type: 'mouseWheel', x: 640, y: 500, deltaX: 0, deltaY: i < 12 ? -120 : 120 }); await wait(60) }
      await wait(800)
      say('scrolling: ' + await pg(READ))
      await pg(`scrollTo(0, 0)`); await wait(500)
      // Customize: open and close
      await pg(PROBE); await pg(`document.getElementById('cust').click()`); await wait(1200); await pg(`document.getElementById('dclose').click()`); await wait(1200)
      say('Customize open and close: ' + await pg(READ))
      // suggestions: type, then Escape
      await pg(PROBE); await pg(`(() => { const q = document.getElementById('q'); q.focus(); q.value = 'docs'; q.dispatchEvent(new Event('input')) })()`); await wait(1000)
      await pg(`document.getElementById('q').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await wait(600)
      say('suggestions open and close: ' + await pg(READ))
      // the engine list
      await pg(PROBE); await pg(`document.getElementById('keng').click()`); await wait(800); await pg(`document.getElementById('keng').click()`); await wait(600)
      say('engine list open and close: ' + await pg(READ))
      // idle
      await pg(`(() => { const q = document.getElementById('q'); q.value = ''; q.blur(); scrollTo(0, 0) })()`)
      wc.sendInputEvent({ type: 'mouseMove', x: 5, y: 790 }); await wait(3000)
      const pid = wc.getOSProcessId()
      app.getAppMetrics(); await wait(20000)
      const m = app.getAppMetrics().find(x => x.pid === pid)
      const g1 = app.getAppMetrics().find(x => x.type === 'GPU')
      say('idle CPU of the New Tab renderer over 20 s, banner dots drifting: ' + (m ? m.cpu.percentCPUUsage.toFixed(2) : '?') + '%' + (g1 ? ', GPU process ' + g1.cpu.percentCPUUsage.toFixed(2) + '%' : ''))
      say('animations running when idle: ' + await pg(`JSON.stringify((() => { const r = document.getAnimations().filter(a => a.playState === 'running'), amb = r.filter(a => a.effect && a.effect.target && a.effect.target.closest('.hm-amb')); return { bannerDots: amb.length, other: r.length - amb.length } })())`))
      // and the same 20 s with the banner scrolled away (the dots pause)
      await pg(`scrollTo(0, document.documentElement.scrollHeight)`); await wait(1500)
      app.getAppMetrics(); await wait(20000)
      const m2 = app.getAppMetrics().find(x => x.pid === pid), gpu = app.getAppMetrics().find(x => x.type === 'GPU')
      say('idle CPU with the banner off screen (dots paused): ' + (m2 ? m2.cpu.percentCPUUsage.toFixed(2) : '?') + '%' + (gpu ? ', GPU process ' + gpu.cpu.percentCPUUsage.toFixed(2) + '%' : ''))
    }
  }
  app.exit(0)
})
