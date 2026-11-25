// Perf budget check (docs/PERF.md): idle CPU per renderer over 20 s, CPU while switching tabs, main-process timers,
// running infinite animations, stacked backdrop-filters and big blurs in the chrome. Not part of the suite.
// Run: LUMEN_APPS_ANYWHERE=1 xvfb-run -a npx electron test/perfbudget.js --no-sandbox   (log: /tmp/lumen-perfbudget.log)
const fs = require('fs'), http = require('http')
const LOG = '/tmp/lumen-perfbudget.log'; fs.writeFileSync(LOG, '')
const out = l => { console.log(l); fs.appendFileSync(LOG, l + '\n') }
// count main-process intervals that are alive (wrapped before main.js loads so its module-level intervals are seen)
const live = new Map()
const _si = global.setInterval, _ci = global.clearInterval
global.setInterval = (fn, ms, ...a) => { const h = _si(fn, ms, ...a); live.set(h, ms); return h }
global.clearInterval = h => { live.delete(h); return _ci(h) }
const { app, webContents } = require('electron')
const DIR = '/tmp/lumen-perfbudget'
fs.rmSync(DIR, { recursive: true, force: true }); app.setPath('userData', DIR)
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end('<title>Page ' + q.url + '</title><body style="background:linear-gradient(135deg,#ffd6e0,#c9e4ff);font:20px sans-serif;padding:40px"><h1>Still ' + q.url + '</h1>' + '<p>text </p>'.repeat(200) + '</body>') }).listen(48243, '127.0.0.1')
const ANIMS = `document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).map(a => (a.animationName || 'waapi') + '@' + (a.effect.target ? (a.effect.target.id || String(a.effect.target.className).slice(0, 30) || a.effect.target.tagName) : '')).slice(0, 20)`
const LAYERS = `(() => { let bf = 0, big = 0, maxBlur = 0; const A = innerWidth * innerHeight; for (const e of document.querySelectorAll('*')) { const s = getComputedStyle(e); const f = s.backdropFilter || s.webkitBackdropFilter; if (!f || f === 'none') continue; const r = e.getBoundingClientRect(); if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue; bf++; const m = /blur\\(([\\d.]+)px/.exec(f); const b = m ? +m[1] : 0; if (r.width * r.height > A * .25) { big++; maxBlur = Math.max(maxBlur, b) } } return { visibleBackdrop: bf, bigBackdrop: big, maxBigBlur: maxBlur } })()`
const fmt = o => JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +v.toFixed(2)])))
const cpuByView = async ms => {
  app.getAppMetrics(); await wait(ms)
  const m = app.getAppMetrics(); const byPid = new Map(m.map(p => [p.pid, p]))
  const rows = [], types = {}; let tot = 0
  for (const p of m) { const c = p.cpu ? p.cpu.percentCPUUsage : 0; tot += c; types[p.type] = (types[p.type] || 0) + c }
  for (const wc of webContents.getAllWebContents()) { try { const p = byPid.get(wc.getOSProcessId()); if (p) rows.push((wc.getURL() || '?').replace(/\?.*/, '').slice(0, 50) + '=' + p.cpu.percentCPUUsage.toFixed(2)) } catch {} }
  return { tot, rows, types }
}
app.whenReady().then(async () => {
  await wait(6000)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  w.win.setContentSize(1280, 820)
  for (let i = 0; i < 4; i++) w.createTab('http://127.0.0.1:48243/' + i, { active: true })
  w.createTab('lumen://newtab', { active: true })
  await wait(4000)
  await ex(`openCmd('newtab')`); await wait(800); await ex(`closeCmd(true)`)
  await ex(`openMainMenu()`); await wait(800); await ex(`closePopover(true)`)
  await ex(`toast('Hello there')`); await wait(300)
  await w.contextMenu(w.active(), { x: 300, y: 300, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '', isEditable: false, misspelledWord: '', dictionarySuggestions: [], editFlags: {}, formControlType: 'none', inputFieldType: '' }); await wait(800)
  L.__nova.closeMenu(w, 'x')
  await wait(6000)
  out('main-process intervals alive: ' + live.size + ' :: ' + [...live.values()].map(v => v + 'ms').join(' '))
  const idleNtp = await cpuByView(20000)
  out('IDLE(newtab) CPU total ' + idleNtp.tot.toFixed(2) + '% types ' + fmt(idleNtp.types))
  out('  per view: ' + idleNtp.rows.join(' | '))
  w.activate(w.order[1]); await wait(3000)
  const idleWeb = await cpuByView(20000)
  out('IDLE(web) CPU total ' + idleWeb.tot.toFixed(2) + '% types ' + fmt(idleWeb.types))
  out('  per view: ' + idleWeb.rows.join(' | '))
  // switching tabs: 40 switches, 150 ms apart
  app.getAppMetrics(); const ids = w.order.slice(); const times = []
  for (let i = 0; i < 40; i++) { const t0 = process.hrtime.bigint(); w.activate(ids[i % ids.length]); times.push(Number(process.hrtime.bigint() - t0) / 1e6); await wait(150) }
  const sw = app.getAppMetrics(); let swTot = 0; const swTypes = {}
  for (const p of sw) { const c = p.cpu ? p.cpu.percentCPUUsage : 0; swTot += c; swTypes[p.type] = (swTypes[p.type] || 0) + c }
  times.sort((a, b) => a - b)
  out('SWITCH CPU total ' + swTot.toFixed(2) + '% types ' + fmt(swTypes) + ' activate() median ' + times[20].toFixed(2) + 'ms p95 ' + times[38].toFixed(2) + 'ms')
  await wait(2000)
  out('UI infinite animations: ' + JSON.stringify(await ex(ANIMS)))
  out('UI backdrop layers: ' + JSON.stringify(await ex(LAYERS)))
  const ntp = [...w.tabs.values()].find(t => t.url.startsWith('lumen://newtab'))
  if (ntp) { w.activate(ntp.id); await wait(2500); out('NTP infinite animations: ' + JSON.stringify(await ntp.view.webContents.executeJavaScript(ANIMS))); out('NTP backdrop layers: ' + JSON.stringify(await ntp.view.webContents.executeJavaScript(LAYERS))) }
  for (const v of w.win.contentView.children) { try { const n = await v.webContents.executeJavaScript(`document.getAnimations().filter(a => a.playState === 'running').length`); out('view ' + v.webContents.getURL().replace(/\?.*/, '').slice(0, 60) + ' visible=' + v.getVisible() + ' running=' + n + ' throttling=' + v.webContents.getBackgroundThrottling()) } catch {} }
  out('all webContents: ' + webContents.getAllWebContents().length)
  app.exit(0)
})
