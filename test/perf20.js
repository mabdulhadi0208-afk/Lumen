// Lumen's 20 ms bar: every user interaction, from the input to its first visual response.
// Inputs go through the real input pipeline (webContents.sendInputEvent) or the exact call a menu accelerator makes.
// Two times per interaction, both wall clock (the main process stamps the input, the renderer stamps the response on
// the same clock): ready, when the response is in the DOM of the renderer that draws it (everything Lumen's code
// does: the main process, IPC, the handler), and frame, the first animation frame that paints it. The 20 ms bar is
// asserted on ready. Frame adds the compositor, which on a software-rendered test machine is slow on its own: the
// log ends with the frame cadence of a 4 px box moving in the chrome, for scale.
// It waits for the machine to be quiet (load average under 3) before measuring, so other work does not skew it.
// Run: xvfb-run -a npx electron test/perf20.js --no-sandbox   (log: /tmp/lumen-perf20.log, PASS / FAIL lines)
//      PERF20_LAX=1: report without failing. PERF20_N: repetitions per interaction (default 20).
const fs = require('fs')
const os = require('os')
const http = require('http')
const LOG = '/tmp/lumen-perf20.log'; fs.writeFileSync(LOG, '')
const out = l => { console.log(l); fs.appendFileSync(LOG, l + '\n') }
const { app } = require('electron')
const DIR = '/tmp/lumen-perf20'
fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(DIR, { recursive: true }); app.setPath('userData', DIR)
// a used profile: 20,000 history pages and 300 bookmarks
{
  const now = Date.now(), hist = []
  const words = ['github', 'news', 'docs', 'mail', 'video', 'shop', 'maps', 'wiki', 'forum', 'blog', 'music', 'cloud', 'learn', 'dev', 'store']
  for (let i = 0; i < 20000; i++) { const w1 = words[i % words.length], w2 = words[(i * 7 + 3) % words.length]; hist.push({ url: `https://${w1}${i % 400}.example.com/${w2}/page-${i}`, title: `${w1} ${w2} page number ${i}`, t: now - i * 60000, visits: 1 + (i % 9) }) }
  fs.writeFileSync(DIR + '/history.json', JSON.stringify(hist))
  fs.writeFileSync(DIR + '/bookmarks.json', JSON.stringify(Array.from({ length: 300 }, (_, i) => ({ id: 'b' + i, url: `http://127.0.0.1:48420/bm${i}`, title: 'Bookmark ' + i, folder: '', updatedAt: now }))))
}
const L = require('../src/main.js')
const N = +process.env.PERF20_N || 20
const LAX = !!process.env.PERF20_LAX
const LIMIT = 20
const wait = ms => new Promise(r => setTimeout(r, ms))
const now = () => performance.timeOrigin + performance.now()
const pct = (a, p) => { const s = a.filter(x => x >= 0).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)] : -1 }
let fails = 0
const rows = []
function report(name, list, limit = LIMIT) {
  const ready = list.map(x => typeof x === 'number' ? x : x.ready), frame = list.map(x => typeof x === 'number' ? x : x.frame)
  const miss = ready.filter(x => x < 0).length
  const r50 = pct(ready, 0.5), r95 = pct(ready, 0.95), f50 = pct(frame, 0.5), f95 = pct(frame, 0.95)
  const ok = !miss && r95 >= 0 && r95 < limit
  if (!ok && !LAX) fails++
  rows.push([name, r50, r95, f50, f95, miss])
  out(`${ok ? 'PASS' : LAX ? 'OVER' : 'FAIL'} ${name}: ready p50 ${r50.toFixed(1)} p95 ${r95.toFixed(1)} ms | first frame p50 ${f50.toFixed(1)} p95 ${f95.toFixed(1)} ms${miss ? ` | ${miss} missed` : ''} (n ${list.length}, limit ${limit} on ready) [${ready.map(x => Math.round(x)).join(' ')}] [${frame.map(x => Math.round(x)).join(' ')}]`)
}

const PAGE = n => `<!doctype html><title>Page ${n}</title><body style="font:16px sans-serif;margin:40px;background:linear-gradient(#fff,#eef)"><h1>Page ${n}</h1><p><a href="/${n}x">next</a></p>${'<p>Plain text to read and to scroll through. </p>'.repeat(200)}`
const srv = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'max-age=600' }); res.end(PAGE(req.url.replace(/\W/g, '') || 'home')) })

// a watcher in a renderer. ready: the first moment cond is true (checked on every DOM change, scroll, visibility
// change and frame, so it costs the page nothing while it works); frame: the first animation frame in which it is
// true (the frame that paints it). Both are wall-clock times; -1 if it never happens within 3 s.
async function arm(wc, cond, key = '__w') {
  await wc.executeJavaScript(`window.${key} = new Promise(res => {
    const t0 = performance.now(), T = () => performance.timeOrigin + performance.now(); let ready = 0, done = false
    const ok = () => { try { return !!(${cond}) } catch { return false } }
    const chk = () => { if (!ready && ok()) ready = T() }
    const mo = new MutationObserver(chk); mo.observe(document, { subtree: true, childList: true, attributes: true, characterData: true })
    const ev = () => chk(); addEventListener('scroll', ev, true); document.addEventListener('visibilitychange', ev)
    const end = r => { if (done) return; done = true; mo.disconnect(); removeEventListener('scroll', ev, true); document.removeEventListener('visibilitychange', ev); res(r) }
    const f = () => { if (ok()) { if (!ready) ready = T(); return end({ ready, frame: T() }) } if (performance.now() - t0 > 3000) return end({ ready: ready || -1, frame: -1 }); requestAnimationFrame(f) }
    requestAnimationFrame(f)
  }); 1`, true)
  return () => wc.executeJavaScript(`window.${key}`, true)
}
// every measurement keeps both numbers; report() asserts on ready and shows the frame times next to it
const since = (t0, r) => { if (typeof r === 'number') return r < 0 ? -1 : r - t0; const o = { ready: r.ready < 0 ? -1 : r.ready - t0, frame: r.frame < 0 ? -1 : r.frame - t0 }; return o }
const key = (wc, keyCode, modifiers = []) => { wc.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); wc.sendInputEvent({ type: 'char', keyCode: keyCode === 'Space' ? ' ' : keyCode, modifiers }); wc.sendInputEvent({ type: 'keyUp', keyCode, modifiers }) }
const click = (wc, x, y, button = 'left') => { wc.sendInputEvent({ type: 'mouseMove', x, y }); wc.sendInputEvent({ type: 'mouseDown', x, y, button, clickCount: 1 }); wc.sendInputEvent({ type: 'mouseUp', x, y, button, clickCount: 1 }) }
const MOD = process.platform === 'darwin' ? 'meta' : 'control'

async function quiet() {
  const t0 = Date.now()
  while (os.loadavg()[0] >= 3 && Date.now() - t0 < 20 * 60000) await wait(5000)
  const l = os.loadavg()[0]
  out(`load average ${l.toFixed(2)} after waiting ${Math.round((Date.now() - t0) / 1000)} s${l >= 3 ? ' (STILL BUSY: numbers are inflated)' : ''}`)
}

app.whenReady().then(async () => {
  await new Promise(r => srv.listen(48420, '127.0.0.1', r))
  const U = p => 'http://127.0.0.1:48420/' + p
  for (let i = 0; i < 2000 && !L.windows[0]; i++) await wait(5)
  const w = L.windows[0], ui = w.ui.webContents, ex = s => ui.executeJavaScript(s)
  await wait(4000)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  w.win.setContentSize(1280, 820); await wait(500)
  const tabs = []
  for (let i = 0; i < 6; i++) { tabs.push(w.createTab(U('t' + i), { active: true })); await wait(500) }
  await wait(4000)
  await quiet()
  const center = sel => ex(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } })()`)
  const settle = () => wait(260)

  // ---- tab switch, by clicking a tab: the chrome's response, and the page's first frame
  {
    const chrome = [], page = []
    for (let i = 0; i < N; i++) {
      const t = tabs[i % tabs.length]; if (t.id === w.activeId) continue
      const p = await center(`.tab[data-id="${t.id}"]`); if (!p) continue
      const c = await arm(ui, `document.querySelector('.tab[data-id="${t.id}"]').classList.contains('active')`)
      const pg = t.view ? await arm(t.view.webContents, `document.visibilityState === 'visible'`) : null
      const t0 = now(); click(ui, p.x, p.y)
      chrome.push(since(t0, await c())); if (pg) page.push(since(t0, await pg()))
      await settle()
    }
    report('tab switch (click): chrome', chrome); report('tab switch (click): page on screen', page)
  }
  // ---- tab switch, Ctrl Tab
  {
    const chrome = [], page = []
    for (let i = 0; i < N; i++) {
      const next = w.order[(w.order.indexOf(w.activeId) + 1) % w.order.length], t = w.tabs.get(next)
      const c = await arm(ui, `S.activeId === ${next} && document.querySelector('.tab[data-id="${next}"]').classList.contains('active')`)
      const pg = t.view ? await arm(t.view.webContents, `document.visibilityState === 'visible'`) : null
      const t0 = now(); ui.focus(); key(ui, 'Tab', ['control'])
      chrome.push(since(t0, await c())); if (pg) page.push(since(t0, await pg()))
      await settle()
    }
    report('tab switch (Ctrl Tab): chrome', chrome); report('tab switch (Ctrl Tab): page on screen', page)
  }
  // ---- Cmd T: the tab in the strip, and the New Tab page's first frame
  {
    const chrome = [], page = []
    for (let i = 0; i < Math.min(N, 12); i++) {
      for (let k = 0; k < 100 && !(w.spare && w.spare.readyAt); k++) await wait(100)
      await wait(300)
      const n = w.order.length + 1
      const c = await arm(ui, `S.tabs.length === ${n} && document.querySelectorAll('#tabs .tab:not([style*="pointer-events: none"])').length >= ${n - S_PINNED()}`)
      const sp = w.spare && w.spare.view && w.spare.view.webContents
      const pg = sp ? await arm(sp, `document.visibilityState === 'visible'`) : null
      const t0 = now(); ui.focus(); key(ui, 'T', [MOD])
      chrome.push(since(t0, await c())); if (pg) page.push(since(t0, await pg()))
      await wait(900)
      if (w.order.length > 8) { for (const id of w.order.slice(6)) w.closeTab(id); await wait(600) }
    }
    report('Cmd T: chrome', chrome); report('Cmd T: New Tab page on screen', page)
  }
  function S_PINNED() { return 0 }
  // ---- close a tab with its X: the chrome's response, and the next tab's first frame
  {
    const chrome = []
    for (let i = 0; i < Math.min(N, 12); i++) {
      const t = w.createTab(U('close' + i), { active: true }); await wait(1200)
      const p = await center(`.tab[data-id="${t.id}"] .x`); if (!p) continue
      const c = await arm(ui, `!S.tabs.some(x => x.id === ${t.id}) || !document.querySelector('.tab[data-id="${t.id}"]') || document.querySelector('.tab[data-id="${t.id}"]').style.pointerEvents === 'none'`)
      const t0 = now(); click(ui, p.x, p.y)
      chrome.push(since(t0, await c()))
      await wait(500)
    }
    report('close tab (X): chrome', chrome)
  }
  // ---- back and forward: the chrome shows the navigation (address or loading)
  {
    const res = []
    const t = tabs[0]; w.activate(t.id); await wait(400)
    t.view.webContents.loadURL(U('backA')); await wait(900); t.view.webContents.loadURL(U('backB')); await wait(900)
    for (let i = 0; i < Math.min(N, 12); i++) {
      const back = i % 2 === 0, sel = back ? '#btn-back' : '#btn-forward'
      const p = await center(sel); if (!p) continue
      const want = back ? 'backA' : 'backB'
      const c = await arm(ui, `(S.url || '').endsWith('${want}') || (S.tabs.find(x => x.id === S.activeId) || {}).loading || document.querySelector('#loadbar.show, .loadbar.show')`)
      const t0 = now(); click(ui, p.x, p.y)
      res.push(since(t0, await c()))
      await wait(900)
    }
    report('back / forward: chrome', res)
  }
  // ---- Cmd K (the accelerator sends this) and the address bar (a click on it)
  {
    const k = [], a = []
    for (let i = 0; i < Math.min(N, 12); i++) {
      let c = await arm(ui, `document.getElementById('cmdbar').classList.contains('show')`)
      let t0 = now(); w.send('command', 'palette'); k.push(since(t0, await c())); await wait(700); await ex(`closeCmd(true); 1`); await wait(400)
      const p = await center('#urltext')
      c = await arm(ui, `document.getElementById('cmdbar').classList.contains('show')`)
      t0 = now(); click(ui, p.x, p.y); a.push(since(t0, await c())); await wait(700); await ex(`closeCmd(true); 1`); await wait(400)
    }
    report('Cmd K opens the command bar', k); report('address bar opens on click', a)
  }
  // ---- typing in the command bar and the address bar: keystroke to this query's local results on screen
  for (const [mode, word] of [['newtab', 'github mail p'], ['location', 'docs docs pa']]) {
    await ex(`openCmd(${JSON.stringify(mode)}, ''); 1`)
    await wait(1200)   // the bar has finished opening before the first key
    await ex(`if (!window.__rrw) { window.__rrw = 1; const o = renderResults; renderResults = function () { const r = o.apply(this, arguments); if (results.some(x => x.sec === 'History')) window.__kd = cmdInput.value.slice(0, cmdInput.selectionStart === cmdInput.selectionEnd ? cmdInput.value.length : cmdInput.selectionStart); return r } } window.__kd = null; 1`)
    const res = []
    for (let i = 1; i <= word.length; i++) {
      const typed = word.slice(0, i), ch = word[i - 1]
      const c = await arm(ui, `window.__kd === ${JSON.stringify(typed)} || (window.__kd || '').toLowerCase() === ${JSON.stringify(typed)}`)
      const t0 = now(); key(ui, ch === ' ' ? 'Space' : ch)
      res.push(since(t0, await c()))
      await wait(150)
    }
    await ex(`closeCmd(true); 1`); await wait(500)
    report(`typing in the ${mode === 'newtab' ? 'command bar' : 'address bar'}: key to local results`, res)
  }
  // ---- popovers in the chrome: the main menu and site info
  {
    const mm = [], si = []
    const t = tabs[1]; w.activate(t.id); await wait(600)
    for (let i = 0; i < Math.min(N, 12); i++) {
      let p = await center('#btn-menu'), c = await arm(ui, `document.getElementById('popover').classList.contains('show') && document.querySelector('#popover .mm-tiles')`)
      let t0 = now(); click(ui, p.x, p.y); mm.push(since(t0, await c())); await wait(500); await ex(`closePopover(true); 1`); await wait(400)
      p = await center('#btn-site'); c = await arm(ui, `document.getElementById('popover').classList.contains('show') && document.querySelector('#popover .si-head')`)
      t0 = now(); click(ui, p.x, p.y); si.push(since(t0, await c())); await wait(500); await ex(`closePopover(true); 1`); await wait(400)
    }
    report('main menu popover', mm); report('site info popover', si)
  }
  // ---- right-click menus (Nova): on the page, and on a tab
  {
    const pg = [], tb = []
    const N2 = L.__nova
    for (let i = 0; i < Math.min(N, 12); i++) {
      const mv = N2.state(w).menuView; if (!mv) { await wait(500); continue }
      const mwc = mv.webContents, a = w.active()
      let c = await arm(mwc, `typeof root !== 'undefined' && root && root.isConnected && document.body.style.opacity === '1'`)
      let t0 = now(); click(a.view.webContents, 300, 300, 'right'); pg.push(since(t0, await c()))
      await wait(400); N2.closeMenu(w, 'dismiss'); await wait(500)
      const p = await center(`.tab[data-id="${a.id}"]`)
      c = await arm(mwc, `typeof root !== 'undefined' && root && root.isConnected && document.body.style.opacity === '1'`)
      t0 = now(); click(ui, p.x, p.y, 'right'); tb.push(since(t0, await c()))
      await wait(400); N2.closeMenu(w, 'dismiss'); await wait(500)
    }
    report('right-click menu on a page', pg); report('right-click menu on a tab', tb)
  }
  // ---- a Nova dialog (the one Quit asks)
  {
    const res = []
    for (let i = 0; i < Math.min(N, 10); i++) {
      for (let k = 0; k < 40 && !(w._nova && w._nova.spare && w._nova.spare.loaded); k++) await wait(100)
      const sp = w._nova && w._nova.spare; if (!sp) { await wait(1500); continue }
      const c = await arm(sp.view.webContents, `document.getElementById('sheet').classList.contains('go')`)
      const t0 = now(); const pr = L.__novaDialog(w, { buttons: ['Quit', 'Cancel'], cancelId: 1, kind: 'quit', icon: 'quit', message: 'Quit Lumen with 6 tabs open?' })
      res.push(since(t0, await c()))
      await wait(500); try { sp.view.webContents.send('nova:dialog-key', 'Escape') } catch {} const st = w._nova.dialogState; if (st) st.finish(null); await pr; await wait(1600)
    }
    report('dialog', res)
  }
  // ---- Settings: switching sections, and scrolling; Home: scrolling
  {
    const t = tabs[2]; w.activate(t.id); await wait(300)
    const pwc = t.view.webContents
    pwc.loadURL('lumen://settings/general'); await wait(2500)
    const sw = [], sc = [], hs = []
    const secs = ['appearance', 'privacy', 'general', 'sync', 'ai']
    for (let i = 0; i < Math.min(N, 10); i++) {
      const s = secs[i % secs.length]
      const p = await pwc.executeJavaScript(`(() => { const a = [...document.querySelectorAll('.nav a')].find(a => a.href.endsWith('/${s}')); if (!a) return null; const r = a.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } })()`)
      if (!p) continue
      const c = await arm(pwc, `[...document.querySelectorAll('.nav a.on')].some(a => a.href.endsWith('/${s}'))`, '__ws')
      const t0 = now(); click(pwc, p.x, p.y)
      // the new document arrives with its own window: the old watcher dies with the old one
      let r = -1; try { r = await Promise.race([c(), wait(3000).then(() => -2)]) } catch { r = -2 }
      if (r === -2) { const c2 = await arm(pwc, `[...document.querySelectorAll('.nav a.on')].some(a => a.href.endsWith('/${s}'))`, '__ws').catch(() => null); r = c2 ? await c2() : -1 }
      sw.push(since(t0, r))
      await wait(2500)
    }
    report('Settings: switch section (sidebar click)', sw)
    const scroll = async (list, label) => {
      for (let i = 0; i < Math.min(N, 12); i++) {
        await pwc.executeJavaScript(`(document.scrollingElement || document.documentElement).scrollTop = ${i % 2 ? 300 : 0}; window.__sy = (document.scrollingElement || document.documentElement).scrollTop; [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).forEach(e => { e.__st = e.scrollTop }); 1`); await wait(300)
        const c = await arm(pwc, `(document.scrollingElement || document.documentElement).scrollTop !== window.__sy || [...document.querySelectorAll('*')].some(e => e.__st !== undefined && e.scrollTop !== e.__st)`, '__wsc')
        const t0 = now(); pwc.sendInputEvent({ type: 'mouseWheel', x: 640, y: 400, deltaX: 0, deltaY: i % 2 ? 120 : -120, wheelTicksY: i % 2 ? 1 : -1, canScroll: true })
        list.push(since(t0, await c())); await wait(400)
      }
      report(label, list)
    }
    // a little scroll up first so both directions can move
    await scroll(sc, 'Settings: scroll (wheel to first moved frame)')
    pwc.loadURL('lumen://newtab'); await wait(3000)
    await scroll(hs, 'Home: scroll (wheel to first moved frame)')
  }

  await ex(`window.__x = document.createElement('div'); __x.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:4px;background:red;z-index:99999'; document.body.appendChild(__x); window.__k = 0; (function f() { __x.style.left = ((++__k) % 50) + 'px'; if (__k < 200) requestAnimationFrame(f) })(); 1`)
  const cadence = await ex(`new Promise(res => { const g = []; let l = 0; const f = t => { if (l) g.push(t - l); l = t; if (g.length < 120) requestAnimationFrame(f); else { g.sort((a, b) => a - b); __x.remove(); res({ p50: +g[60].toFixed(1), p95: +g[114].toFixed(1), max: +g[119].toFixed(1) }) } }; requestAnimationFrame(f) })`)
  out('')
  out('| Interaction | ready p50 | ready p95 | frame p50 | frame p95 |')
  out('| --- | --- | --- | --- | --- |')
  for (const [n, a, b, c, d, m] of rows) out(`| ${n} | ${a.toFixed(1)} | ${b.toFixed(1)}${m ? ` (${m} missed)` : ''} | ${c.toFixed(1)} | ${d.toFixed(1)} |`)
  out(`frame cadence of this machine (a 4 px box moving in the chrome): ${JSON.stringify(cadence)}`)
  out(fails ? `perf20: ${fails} FAIL` : 'perf20: all PASS')
  srv.close()
  app.exit(fails ? 1 : 0)
})
