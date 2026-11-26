// Lumen 4.2 lag probe: how long every common action takes from the trigger to the result being drawn on screen,
// and the longest frame the chrome drops while it animates. Not part of the suite; run before and after changes.
// Run: xvfb-run -a npx electron test/perf42.js --no-sandbox   (log: /tmp/lumen-perf42.log)
const fs = require('fs'); const { app } = require('electron')
const DIR = process.env.PERF42_DIR || '/tmp/lumen-perf42'
fs.rmSync(DIR, { recursive: true, force: true }); app.setPath('userData', DIR)
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-perf42.log'; fs.writeFileSync(LOG, '')
const out = l => { console.log(l); fs.appendFileSync(LOG, l + '\n') }
const res = {}
const rec = (k, v) => { (res[k] = res[k] || []).push(Math.round(v)) }
// a page counts as shown when its main content exists and two frames have been drawn after it
const shownJS = sel => `new Promise(r => { const t0 = performance.now(); const go = () => { if (document.querySelector(${JSON.stringify(sel)})) requestAnimationFrame(() => requestAnimationFrame(() => r(true))); else if (performance.now() - t0 < 8000) setTimeout(go, 4); else r(false) }; go() })`
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ui = w.ui.webContents, ex = s => ui.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  for (let i = 0; i < 300; i++) L.D.addHistory('https://site' + (i % 40) + '.example/p' + i, 'Page ' + i)
  w.win.setContentSize(1280, 820); await wait(4000)
  // frame gaps in the chrome while something animates
  const gapStart = () => ex(`window.__gaps = []; window.__gapOn = true; (() => { let last = performance.now(); const f = now => { if (!window.__gapOn) return; window.__gaps.push(now - last); last = now; requestAnimationFrame(f) }; requestAnimationFrame(f) })()`)
  const gapStop = () => ex(`window.__gapOn = false; Math.round(Math.max(0, ...window.__gaps.slice(1)))`)
  // time a page opening in a tab: from the call to its content being drawn
  const pageOpen = async (name, fn, sel) => {
    const t0 = Date.now(); const t = fn(); await wait(1)
    const tab = t && t.view ? t : w.active()
    let ok = false; for (let i = 0; i < 400 && !ok; i++) { try { if (tab.view && !tab.view.webContents.isLoading()) ok = await tab.view.webContents.executeJavaScript(shownJS(sel)) } catch {} if (!ok) await wait(5) }
    rec(name, Date.now() - t0); return tab
  }
  for (let round = 0; round < 3; round++) {
    // Settings (a fresh tab each time)
    for (const sub of ['', 'appearance', 'privacy', 'ai']) {
      const t = await pageOpen('settings/' + (sub || 'general'), () => w.createTab('lumen://settings/' + sub), 'main h2, #main h2, .set-sec, h2')
      await wait(500); w.closeTab ? w.closeTab(t.id) : null; await wait(4500)
    }
    for (const p of ['history', 'bookmarks', 'downloads', 'passwords']) { const t = await pageOpen(p, () => w.createTab('lumen://' + p), 'h2'); await wait(400); w.closeTab && w.closeTab(t.id); await wait(4500) }
    { const t = await pageOpen('newtab', () => w.createTab('lumen://newtab'), '#widgets [data-w]'); await wait(2800) }
    // AI panel open and close
    await gapStart(); let t0 = Date.now(); await ex(`openAI(); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`); rec('ai open (to first frame)', Date.now() - t0)
    await wait(700); rec('ai open: worst frame', await gapStop())
    await gapStart(); await ex(`closeAI()`); await wait(700); rec('ai close: worst frame', await gapStop())
    // command bar
    await gapStart(); t0 = Date.now(); await ex(`openCmd(); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`); rec('cmd K open (to first frame)', Date.now() - t0)
    await wait(600); rec('cmd K: worst frame', await gapStop())
    await ex(`closeCmd(true)`); await wait(300)
    // tab switch
    const ids = w.order.slice(-3)
    for (const id of ids) { await gapStart(); t0 = Date.now(); w.activate(id); await ex(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`); rec('tab switch', Date.now() - t0); await wait(500); rec('tab switch: worst frame', await gapStop()) }
    // menus
    t0 = Date.now(); L.__appMenu(w); await wait(16)
    let mv = null; for (let i = 0; i < 200 && !mv; i++) { mv = L.__nova && L.__nova.__view && L.__nova.__view(w); await wait(5) }
    rec('app menu (call)', Date.now() - t0); await wait(500); ui.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); await wait(500)
  }
  out('action'.padEnd(34) + 'runs (ms)                      median')
  for (const [k, v] of Object.entries(res)) { const s = [...v].sort((a, b) => a - b); out(k.padEnd(34) + v.join(', ').padEnd(31) + s[Math.floor(s.length / 2)]) }
  app.exit(0)
})
