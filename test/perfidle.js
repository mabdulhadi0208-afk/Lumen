// Who uses the CPU while Lumen sits idle: every webContents (tabs, chrome, Nova views, Surge and Koi windows) with its
// renderer CPU, whether it is visible, and how many animations run in it. Not part of the suite.
// Run: LUMEN_APPS_ANYWHERE=1 xvfb-run -a npx electron test/perfidle.js --no-sandbox   (log: /tmp/lumen-perfidle.log)
const fs = require('fs')
const LOG = '/tmp/lumen-perfidle.log'; fs.writeFileSync(LOG, '')
const out = l => { console.log(l); fs.appendFileSync(LOG, l + '\n') }
// main-process timer wake-ups: every timer callback that runs, counted by where it was set
const wakes = new Map(); let counting = false
const tag = () => { const l = (new Error().stack.split('\n')[3] || '').trim(); return l.replace(/^at /, '').replace(/\(?\/.*\/(src|node_modules|apps)\//, '$1/').slice(0, 90) }
for (const k of ['setTimeout', 'setInterval']) { const o = global[k]; global[k] = (fn, ms, ...a) => { const t = tag(); return o(typeof fn === 'function' ? (...x) => { if (counting) wakes.set(t + ' (' + k + ' ' + ms + ')', (wakes.get(t + ' (' + k + ' ' + ms + ')') || 0) + 1); return fn(...x) } : fn, ms, ...a) } }
const { app, webContents, BrowserWindow } = require('electron')
const DIR = '/tmp/lumen-perfidle'
fs.rmSync(DIR, { recursive: true, force: true }); app.setPath('userData', DIR)
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
const seen = new Map()
const snap = () => { const m = new Map(); for (const p of app.getAppMetrics()) m.set(p.pid, { type: p.type, s: p.cpu.cumulativeCPUUsage || 0 }); return m }
async function report(label, ms) {
  wakes.clear(); counting = true
  const a = snap(); await wait(ms); const b = snap()
  counting = false
  const wk = [...wakes].filter(([k]) => !/perfidle/.test(k)).sort((x, y) => y[1] - x[1])
  const d = pid => ((b.get(pid) || {}).s || 0) - ((a.get(pid) || {}).s || 0)
  const types = {}; for (const [pid, v] of b) types[v.type] = +((types[v.type] || 0) + d(pid)).toFixed(2)
  const tot = Object.values(types).reduce((x, y) => x + y, 0)
  out(`${label}: CPU seconds in ${ms / 1000}s ${JSON.stringify(types)} = ${(tot / ms * 1e5).toFixed(2)}% of one core | main timer wake-ups ${wk.reduce((x, y) => x + y[1], 0)}: ${wk.slice(0, 6).map(([k, v]) => v + 'x ' + k).join('; ')}`)
  for (const wc of webContents.getAllWebContents()) {
    let pid; try { pid = wc.getOSProcessId() } catch { continue }
    const bw = BrowserWindow.fromWebContents(wc)
    let anim = '?'; try { anim = await wc.executeJavaScript(`document.getAnimations().filter(a => a.playState === 'running').length + (document.hidden ? ' hidden' : ' visible')`) } catch {}
    out(`   ${d(pid).toFixed(2)}s pid ${pid} ${(wc.getURL() || '').replace(/^file:\/\/.*\/(apps|ui)\//, '$1/').replace(/\?.*/, '').slice(0, 60)} ${bw ? 'win' + (bw.isVisible() ? '+shown' : '-hidden') : 'view'} anims ${anim} throttle=${wc.getBackgroundThrottling()}`)
  }
}
app.whenReady().then(async () => {
  await wait(6000)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  w.win.setContentSize(1280, 820)
  w.createTab('data:text/html,<title>x</title><h1>Still</h1>', { active: true }); await wait(6000)
  await report('IDLE on a static page', 30000)
  w.createTab('lumen://newtab', { active: true }); await wait(6000)
  await report('IDLE on New Tab', 30000)
  if (process.env.EXP) {
    const nt = w.active().view.webContents
    await nt.executeJavaScript(`document.activeElement && document.activeElement.blur(); 1`); await wait(1500)
    await report('IDLE on New Tab, search not focused', 10000)
    await nt.executeJavaScript(`document.querySelector('#clockslot').style.display = 'none'; 1`); await wait(1500)
    await report('IDLE on New Tab, no clock either', 10000)
  }
  w.createTab('lumen://settings', { active: true }); await wait(6000)
  await report('IDLE on Settings', 30000)
  app.exit(0)
})
