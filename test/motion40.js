// Lumen motion (rule 3): jelly springs on every interactive element and every open, close and appear, in the chrome,
// on the lumen:// pages and in the Nova menus and dialogs, and nothing at all with Motion Off.
// Checks the springs by sampling what is on screen frame by frame (computed transform and opacity), with real input
// events where the pointer matters. Also records frame strips to /tmp/lumen-shots/401-motion-*.png.
// Run: xvfb-run -a npx electron test/motion40.js --no-sandbox   (log: /tmp/lumen-motion40.log)
// STRIPS_ONLY=1 STRIP_TAG=before records only the strips (works on older builds too).
const fs = require('fs'); const { app, BrowserWindow } = require('electron')
fs.rmSync('/tmp/lumen-motion40', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-motion40')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-motion40.log'; fs.writeFileSync(LOG, '')
const STRIPS_ONLY = !!process.env.STRIPS_ONLY, TAG = process.env.STRIP_TAG || 'after'
let fails = 0; const out = l => { console.log(l); fs.appendFileSync(LOG, l + '\n') }
const ok = (c, m) => { if (STRIPS_ONLY) return; out((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const errors = []
app.on('web-contents-created', (e, wc) => wc.on('console-message', (a, b, c) => {
  const lvl = typeof a === 'object' && a && a.level !== undefined ? a.level : b, msg = typeof a === 'object' && a && a.message !== undefined ? a.message : c
  if ((lvl === 'error' || lvl === 3) && !/favicon|ERR_|net::|Failed to load resource/i.test(msg)) errors.push(String(msg).slice(0, 200))
}))

// ---------------------------------------------------------------- sampling helpers (run inside a page)
// sample(wc, expr, ms): evaluates expr on every animation frame for ms and returns the values
// (a view taken off the window stops getting frames: the timer hands back what was seen so far)
const sample = (wc, expr, ms = 500) => Promise.race([
  wc.executeJavaScript(`new Promise(res => { const o = [], t0 = performance.now(); setTimeout(() => res(o), ${ms + 250}); const f = () => { try { o.push(${expr}) } catch { o.push(null) } if (performance.now() - t0 < ${ms}) requestAnimationFrame(f); else res(o) }; f() })`),
  wait(ms + 1500).then(() => []),
])
const SC = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const m = new DOMMatrix(getComputedStyle(e).transform); return +Math.hypot(m.a, m.b).toFixed(4) })()`
const OP = sel => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? +(+getComputedStyle(e).opacity).toFixed(3) : null })()`
const distinct = a => new Set(a.filter(x => x != null).map(x => typeof x === 'number' ? x.toFixed(3) : JSON.stringify(x))).size
const nums = a => a.filter(x => typeof x === 'number')
const center = (wc, sel) => wc.executeJavaScript(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width * .62), y: Math.round(r.top + r.height * .58), w: r.width, h: r.height, l: r.left, t: r.top } })()`)
const move = (wc, x, y) => wc.sendInputEvent({ type: 'mouseMove', x, y })
// hover then press the element under a real pointer; returns the scale samples of each phase
async function hoverPress(wc, sel) {
  move(wc, 2, 2); await wait(400)
  // follow the same element all the way through, even if pressing it changes which selector matches it
  const tagged = await wc.executeJavaScript(`(() => { for (const x of document.querySelectorAll('[data-hp]')) x.removeAttribute('data-hp'); const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.setAttribute('data-hp', '1'); return true })()`)
  if (!tagged) return null
  sel = '[data-hp="1"]'
  const c = await center(wc, sel); if (!c) return null
  await wait(150)
  const hs = sample(wc, SC(sel), 450); move(wc, c.x - 3, c.y - 2); await wait(30); move(wc, c.x, c.y); const hover = await hs
  const ps = sample(wc, SC(sel), 260); wc.sendInputEvent({ type: 'mouseDown', x: c.x, y: c.y, button: 'left', clickCount: 1 }); const press = await ps
  const tr = await wc.executeJavaScript(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})).transitionProperty`)
  wc.sendInputEvent({ type: 'mouseUp', x: c.x + 400, y: c.y + 400, button: 'left', clickCount: 1 }); move(wc, 2, 2); await wait(500)
  return { hover: nums(hover), press: nums(press), tr }
}
const jellyOK = r => r && Math.max(...r.hover) >= 1.015 && distinct(r.hover) >= 4 && Math.min(...r.press) <= 0.985 && !/(^|, )(transform|all|scale|translate)(,|$)/.test(r.tr)
const fmt = r => r ? `hover max ${Math.max(...r.hover).toFixed(3)} over ${distinct(r.hover)} frames, press min ${Math.min(...r.press).toFixed(3)}` : 'missing'

// every visible interactive element of a page that is not a Jelly body
const UNBOUND = (extraSkip = '') => `(() => { const miss = {}; let n = 0
  for (const e of document.querySelectorAll('button, a[href], [role=button], label.switch, .switch, summary, select, .ftile')) {
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue
    if (e.closest('[hidden], [aria-hidden=true]${extraSkip ? ', ' + extraSkip : ''}')) continue
    n++; if (Jelly.bound(e)) continue
    const k = e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).join('.') : '') + (e.id ? '#' + e.id : '')
    miss[k] = (miss[k] || 0) + 1 }
  return { n, miss: Object.keys(miss) } })()`

// ---------------------------------------------------------------- frame strips
let painter = null
async function strip(name, frames) {
  const imgs = frames.filter(Boolean).map(i => ({ src: i.toDataURL(), w: i.getSize().width, h: i.getSize().height })); if (!imgs.length) return
  if (!painter) { painter = new BrowserWindow({ show: false, width: 200, height: 200 }); await painter.loadURL('data:text/html,<body></body>') }
  const url = await painter.webContents.executeJavaScript(`(async () => { const ims = ${JSON.stringify(imgs)}; const G = 8, W = ims.reduce((s, i) => s + i.w + G, G), H = Math.max(...ims.map(i => i.h)) + G * 2
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#20222a'; x.fillRect(0, 0, W, H)
    let px = G; for (const i of ims) { const im = new Image(); im.src = i.src; await im.decode(); x.drawImage(im, px, G, i.w, i.h); px += i.w + G }
    return c.toDataURL('image/png') })()`)
  const file = `${SHOTS}/401-motion-${name}-${TAG}.png`; fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); out('    strip ' + file)
}
// six frames of a view (or a region of it), as fast as they can be taken, right after trigger()
async function film(wc, rect, trigger, n = 6, gap = 35) {
  const fr = []; const p = trigger()
  for (let i = 0; i < n; i++) { fr.push(await wc.capturePage(rect).catch(() => null)); await wait(gap) }
  await p; return fr
}

app.whenReady().then(() => main().catch(e => { out('FAIL test crashed: ' + (e && e.stack || e)); app.exit(1) }))
async function main() {
  await wait(4500); const w = L.windows[0], ui = w.ui.webContents, ex = s => ui.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  w.win.setContentSize(1280, 820); await wait(600)
  const PAGE = 'data:text/html,' + encodeURIComponent('<title>Motion</title><body style="font:18px sans-serif;padding:40px;background:linear-gradient(135deg,#ffd6e0,#c9e4ff)"><h1>Motion test</h1>' + '<p>Some text to look at.</p>'.repeat(30))
  const base = w.createTab(PAGE, { active: true }); await wait(2000)

  // ---------------------------------------------------------------- the motion setting
  if (!STRIPS_ONLY) {
    ok(L.D.settings.get('motion') === 'jelly', 'Motion defaults to Jelly: ' + L.D.settings.get('motion'))
    const m = await ex(`({ j: Jelly.getMode(), s: getMotion(), b: document.body.dataset.motion, rm: matchMedia('(prefers-reduced-motion: reduce)').matches })`)
    ok(m.j === 'jelly' && m.s === 'jelly' && m.b === 'jelly', `the chrome runs on Jelly (Jelly ${m.j}, springs ${m.s}, body ${m.b})`)
    ok(m.rm === false, 'prefers-reduced-motion is not on by accident in Electron')
  }

  // ---------------------------------------------------------------- the chrome: every control is a Jelly body
  if (!STRIPS_ONLY) {
    const cov = await ex(UNBOUND('.tab:not(.newtab), #intro, input'))
    ok(cov.n >= 8 && !cov.miss.length, `every visible control in the chrome has jelly hover and press (${cov.n} checked${cov.miss.length ? ', missing: ' + cov.miss.join(' ') : ''})`)
    for (const sel of ['#btn-reload', '#btn-settings', '#btn-menu', '#btn-newtab', '.urlbar .site']) {
      const r = await hoverPress(ui, sel)
      ok(jellyOK(r), `${sel}: hover lift and press squish on a spring (${fmt(r)})`)
    }
  }
  {
    const c = await center(ui, '#btn-settings'), R = { x: Math.round(c.l - 14), y: Math.round(c.t - 14), width: Math.round(c.w + 28), height: Math.round(c.h + 28) }
    move(ui, 2, 2); await wait(500)
    await strip('hover', await film(ui, R, async () => { move(ui, c.x - 3, c.y - 2); move(ui, c.x, c.y) }))
    await strip('press', await film(ui, R, async () => { ui.sendInputEvent({ type: 'mouseDown', x: c.x, y: c.y, button: 'left', clickCount: 1 }) }))
    ui.sendInputEvent({ type: 'mouseUp', x: 2, y: 2, button: 'left', clickCount: 1 }); move(ui, 2, 2); await wait(500)
  }

  // ---------------------------------------------------------------- tabs: open, close, reorder
  // a recorder in the chrome films every tab that appears, frame by frame, for half a second
  await ex(`window.__tabrec = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('tab') && !n.classList.contains('newtab')) { const rec = { id: n.dataset.id, o: [], s: [] }; __tabrec.push(rec); const t0 = performance.now(); const f = () => { const cs = getComputedStyle(n), m = new DOMMatrix(cs.transform); rec.o.push(+(+cs.opacity).toFixed(3)); rec.s.push(+Math.hypot(m.a, m.b).toFixed(4)); if (performance.now() - t0 < 500) requestAnimationFrame(f) }; f() } }).observe(document.getElementById('tabs') || document.querySelector('.tabs'), { childList: true }); 1`).catch(() => 0)
  const tabsBox = await ex(`(() => { const r = (document.getElementById('tablist')).getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(Math.min(r.width, 560)), height: Math.round(r.height) } })()`)
  let t2 = null
  await strip('tab-open', await film(ui, tabsBox, async () => { t2 = w.createTab(PAGE.replace('Motion', 'Second'), { active: true }) }))
  await wait(700)
  if (!STRIPS_ONLY) {
    const rec = (await ex(`__tabrec`)).find(r => r.id === String(t2.id)) || { o: [], s: [] }
    ok(rec.o.length >= 5 && rec.o.some(o => o > 0.02 && o < 0.98) && Math.min(...rec.s) < 0.97, `a new tab springs in: opacity ${rec.o.slice(0, 6).join(' ')}, scale from ${Math.min(...rec.s)} (${rec.o.length} frames)`)
    // close: the tab fades and shrinks out over several frames, the ones after it slide over on a spring
    const t3 = w.createTab(PAGE.replace('Motion', 'Third'), { active: true }); await wait(900)
    const sOut = sample(ui, `(() => { const e = document.querySelector('.tab[data-id="${t2.id}"]'); return e ? +(+getComputedStyle(e).opacity).toFixed(3) : -1 })()`, 600)
    const sSlide = sample(ui, `(() => { const e = document.querySelector('.tab[data-id="${t3.id}"]'); return e ? +new DOMMatrix(getComputedStyle(e).transform).e.toFixed(1) : null })()`, 600)
    await wait(16); w.closeTab(t2.id)
    const outs = await sOut, slide = nums(await sSlide)
    ok(outs.filter(o => o > 0.02 && o < 0.98).length >= 2, `a closed tab springs out: opacity ${outs.slice(0, 8).join(' ')}`)
    ok(distinct(slide) >= 4, `the tabs after it slide into place on a spring (${distinct(slide)} positions, ${slide[0]} to ${slide[slide.length - 1]})`)
    // reorder: moving a tab slides it to its new place
    const t4 = w.createTab(PAGE.replace('Motion', 'Fourth'), { active: true }); await wait(900)
    const sMove = sample(ui, `(() => { const e = document.querySelector('.tab[data-id="${t4.id}"]'); return e ? +new DOMMatrix(getComputedStyle(e).transform).e.toFixed(1) : null })()`, 600)
    await wait(16); w.moveTab(t4.id, 0)
    const mv = nums(await sMove)
    ok(distinct(mv) >= 4, `a reordered tab springs to its new place (${distinct(mv)} positions, ${mv[0]} to ${mv[mv.length - 1]})`)
    w.closeTab(t3.id); w.closeTab(t4.id); w.activate(base.id); await wait(900)
  }

  // ---------------------------------------------------------------- Cmd K, popovers, toasts
  {
    const sCmd = sample(ui, `(() => { const e = document.querySelector('.cmdbar') || document.getElementById('cmd'); if (!e) return null; const m = new DOMMatrix(getComputedStyle(e).transform); return [+Math.hypot(m.a, m.b).toFixed(4), +(+getComputedStyle(e).opacity).toFixed(3)] })()`, 600)
    await ex(`openCmd('newtab')`); const cmdS = (await sCmd).filter(Boolean)
    if (!STRIPS_ONLY) ok(cmdS.length >= 5 && cmdS.some(([s, o]) => s < 0.99 && o > 0.02) && distinct(cmdS) >= 5, `Cmd K springs open (${distinct(cmdS)} frames, scale ${cmdS.map(x => x[0]).slice(0, 5).join(' ')})`)
    await wait(300); await ex(`closeCmd()`); await wait(600)
    if (!STRIPS_ONLY) {
      const sPop = sample(ui, `(() => { const e = document.getElementById('popover') || document.querySelector('.popover'); if (!e) return null; const m = new DOMMatrix(getComputedStyle(e).transform); return [+Math.hypot(m.a, m.b).toFixed(4), +(+getComputedStyle(e).opacity).toFixed(3)] })()`, 500)
      await ex(`openDownloads()`); const pop = (await sPop).filter(Boolean)
      ok(pop.some(([s, o]) => s < 0.99 || (o > 0.02 && o < 0.98)) && distinct(pop) >= 4, `the downloads popover springs open (${distinct(pop)} frames)`)
      const cov = await ex(UNBOUND('input, .tab:not(.newtab)'))
      ok(!cov.miss.length, `every control in the popover has jelly hover and press${cov.miss.length ? ' (missing: ' + cov.miss.join(' ') + ')' : ''}`)
      await ex(`closePopover()`); await wait(500)
    }
  }

  // ---------------------------------------------------------------- Nova menus and dialogs
  {
    const nv = () => L.__nova.state(w)
    const params = { x: 260, y: 200, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '', isEditable: false, misspelledWord: '', dictionarySuggestions: [], editFlags: {}, formControlType: 'none', inputFieldType: '', pageURL: PAGE, frameURL: PAGE }
    await w.contextMenu(base, params); await wait(800); base.view.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); await wait(500)
    const mv = nv().menuView.webContents
    // a recorder in the menu view films the panel that opens next
    await mv.executeJavaScript(`window.__mrec = null; new MutationObserver(() => { const p = document.querySelector('.panel'); if (!p || __mrec) return; __mrec = []; const t0 = performance.now(); const f = () => { const m = new DOMMatrix(getComputedStyle(p).transform); __mrec.push([+m.a.toFixed(4), +m.d.toFixed(4), +(+getComputedStyle(p).opacity).toFixed(3), getComputedStyle(p).filter]); if (performance.now() - t0 < 450) requestAnimationFrame(f) }; f() }).observe(document.body, { childList: true, subtree: true }); 1`)
    let mrect = null
    const fr = await film(mv, undefined, async () => { await w.contextMenu(base, params) })
    await wait(500)
    mrect = await mv.executeJavaScript(`(() => { const r = document.querySelector('.panel').getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left - 20)), y: Math.max(0, Math.round(r.top - 20)), width: Math.round(r.width + 40), height: Math.round(r.height + 40) } })()`).catch(() => null)
    if (mrect) for (let i = 0; i < fr.length; i++) if (fr[i]) fr[i] = fr[i].crop(mrect)
    await strip('menu-open', fr)
    if (!STRIPS_ONLY) {
      const rec = await mv.executeJavaScript(`__mrec || []`)
      ok(rec.length >= 5 && rec.some(r => r[1] < 0.97) && distinct(rec.map(r => r[1])) >= 4, `a right-click menu springs open (${rec.length} frames, scaleY ${rec.slice(0, 6).map(r => r[1]).join(' ')})`)
      ok(rec.every(r => r[3] === 'none'), 'the menu opens on transform and opacity only (no filter animated)')
      const sClose = sample(mv, `(() => { const p = document.querySelector('.panel'); return p ? +(+getComputedStyle(p).opacity).toFixed(3) : -1 })()`, 200)
      base.view.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' })
      const cl = await sClose
      ok(cl.some(o => o > 0.02 && o < 0.98) || cl.filter(o => o === -1).length === cl.length, `the menu springs shut (${cl.slice(0, 6).join(' ')})`)
    } else base.view.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' })
    await wait(600)

    if (!STRIPS_ONLY) {
      const p = L.__novaDialog(w, { message: 'Keep this?', detail: 'A motion test.', buttons: ['Keep', 'Cancel'], defaultId: 0, cancelId: 1, icon: 'question' })
      for (let i = 0; i < 40 && !nv().dialogView; i++) await wait(25)
      const dv = nv().dialogView.webContents
      const ds = nums(await sample(dv, `(() => { const e = document.getElementById('sheet'); const m = new DOMMatrix(getComputedStyle(e).transform); return +m.d.toFixed(4) })()`, 450))
      ok(ds.some(s => s < 0.985) && distinct(ds) >= 4, `a dialog springs open (${distinct(ds)} frames, scaleY from ${Math.min(...ds)})`)
      ok(await dv.executeJavaScript(`!!window.Jelly && [...document.querySelectorAll('.buttons .btn')].every(b => Jelly.bound(b))`), 'the dialog buttons have jelly hover and press')
      const r = await hoverPress(dv, '.buttons .btn')
      ok(r && Math.max(...r.hover) >= 1.015, `a dialog button lifts under the pointer (${fmt(r)})`)
      await wait(300); dv.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); await p; await wait(500)
    }
  }

  // ---------------------------------------------------------------- Settings
  const openPage = async (url, ms = 3200) => { const t = w.createTab(url, { active: true }); const wc = t.view.webContents; if (wc.isLoading()) await new Promise(r => wc.once('did-finish-load', r)); await wait(ms); return t }
  if (!STRIPS_ONLY) {
    // the sections arrive one after another: read the animations as the page comes in
    const t = w.createTab('lumen://settings/general', { active: true }), wc = t.view.webContents
    await new Promise(r => wc.once('dom-ready', r))
    const stag = await wc.executeJavaScript(`new Promise(res => { const f = () => { const m = document.getElementById('main'); if (!m || m.children.length < 4) return setTimeout(f, 10); requestAnimationFrame(() => res([...m.children].map(c => { const a = c.getAnimations().find(a => a.effect && a.effect.getTiming); return a ? a.effect.getTiming().delay : null }))) }; f() })`)
    const ds = stag.filter(x => x != null)
    ok(ds.length >= 4 && new Set(ds).size >= 3 && ds.every((d, i) => i === 0 || d >= ds[i - 1]), `Settings sections stagger in (delays ${ds.slice(0, 8).join(', ')} ms)`)
    await wait(3000)
    ok(await wc.executeJavaScript(`Jelly.getMode()`) === 'jelly', 'Settings runs on Jelly')
    const cov = await wc.executeJavaScript(UNBOUND('input'))
    ok(cov.n >= 8 && !cov.miss.length, `every control on Settings has jelly hover and press (${cov.n} checked${cov.miss.length ? ', missing: ' + cov.miss.join(' ') : ''})`)
    for (const sel of ['.nav a:not(.on)', '.main .btn', '.main .switch', '.main .ftile', '.main select']) {
      const r = await hoverPress(wc, sel)
      if (r) ok(jellyOK(r), `Settings ${sel}: hover lift and press squish (${fmt(r)})`)
    }
    // a section change: the next section comes in with the hero spring and the stagger
    const navTo = await center(wc, '.nav a[href$="appearance"]')
    wc.sendInputEvent({ type: 'mouseDown', x: navTo.x, y: navTo.y, button: 'left', clickCount: 1 }); wc.sendInputEvent({ type: 'mouseUp', x: navTo.x, y: navTo.y, button: 'left', clickCount: 1 })
    await new Promise(r => wc.once('dom-ready', r))
    const hero = nums(await sample(wc, `(() => { const h = document.querySelector('.hero'); if (!h) return null; return +(parseFloat(getComputedStyle(h).translate.split(' ')[1]) || 0).toFixed(2) })()`, 500))
    ok(distinct(hero) >= 4, `a new section springs in (hero rises over ${distinct(hero)} frames)`)
    await wait(2500)

    // the scroll glide: a mouse-wheel notch and a trackpad swipe both glide, and stop at the ends without bouncing
    const scrollT = () => `document.scrollingElement.scrollTop`
    await wc.executeJavaScript(`scrollTo(0, 0)`); await wait(300)
    const c = { x: 700, y: 400 }
    const sw = sample(wc, scrollT(), 600); wc.sendInputEvent({ type: 'mouseWheel', x: c.x, y: c.y, deltaX: 0, deltaY: -100, wheelTicksY: -1, canScroll: true })
    const wheel = nums(await sw)
    ok(distinct(wheel) >= 6 && wheel[wheel.length - 1] > 50, `a mouse-wheel notch glides (${distinct(wheel)} frames to ${wheel[wheel.length - 1]}px)`)
    const sp = sample(wc, scrollT(), 500)
    for (let i = 0; i < 6; i++) { wc.sendInputEvent({ type: 'mouseWheel', x: c.x, y: c.y, deltaX: 0, deltaY: -24, hasPreciseScrollingDeltas: true, canScroll: true }); await wait(16) }
    const pad = nums(await sp)
    ok(distinct(pad) >= 6, `a trackpad swipe glides (${distinct(pad)} frames, ${pad[0]} to ${pad[pad.length - 1]}px)`)
    await wc.executeJavaScript(`scrollTo(0, 0)`); await wait(300)
    const top = sample(wc, scrollT(), 400); for (let i = 0; i < 4; i++) { wc.sendInputEvent({ type: 'mouseWheel', x: c.x, y: c.y, deltaX: 0, deltaY: 100, wheelTicksY: 1, canScroll: true }); await wait(20) }
    const tp = nums(await top)
    // the bottom: how far past the end the page ever is (lazily drawn cards can change the page's height mid-way)
    for (let i = 0; i < 6; i++) { await wc.executeJavaScript(`scrollTo(0, document.scrollingElement.scrollHeight)`); await wait(250) }
    const bot = sample(wc, `(() => { const s = document.scrollingElement; return +(s.scrollTop - (s.scrollHeight - s.clientHeight)).toFixed(1) })()`, 400)
    for (let i = 0; i < 4; i++) { wc.sendInputEvent({ type: 'mouseWheel', x: c.x, y: c.y, deltaX: 0, deltaY: -100, wheelTicksY: -1, canScroll: true }); await wait(20) }
    const bt = nums(await bot)
    ok(Math.min(...tp) >= 0 && Math.max(...bt) <= 1 && await wc.executeJavaScript(`getComputedStyle(document.documentElement).overscrollBehaviorY === 'none'`), `no rubber-banding at the ends (top min ${Math.min(...tp)}px, bottom at most ${Math.max(...bt)}px past the end)`)
    const settled = await wc.executeJavaScript(`new Promise(res => { let n = 0, last = document.scrollingElement.scrollTop; const f = () => { const v = document.scrollingElement.scrollTop; if (v === last) n++; last = v; if (n > 30) res(true); else requestAnimationFrame(f) }; f() })`)
    ok(settled, 'the glide stops once it settles')
    w.closeTab(t.id); await wait(800)

    // the other pages
    for (const u of ['lumen://history', 'lumen://bookmarks', 'lumen://downloads', 'lumen://readlater', 'lumen://settings/privacy', 'lumen://settings/appearance']) {
      const tt = await openPage(u, 2500)
      const cv = await tt.view.webContents.executeJavaScript(UNBOUND('input'))
      ok(!cv.miss.length, `${u}: every control has jelly hover and press (${cv.n} checked${cv.miss.length ? ', missing: ' + cv.miss.join(' ') : ''})`)
      w.closeTab(tt.id); await wait(500)
    }

    // Home
    L.D.settings.set({ ntpShortcuts: ['https://a.example', 'https://b.example'].map(url => ({ url, title: url.slice(8, 9).toUpperCase() })) })
    const h = await openPage('lumen://newtab', 4000), hw = h.view.webContents
    const hc = await hw.executeJavaScript(UNBOUND('input, .hm-grip, #drawer'))
    ok(!hc.miss.length, `Home: every control has jelly hover and press (${hc.n} checked${hc.miss.length ? ', missing: ' + hc.miss.join(' ') : ''})`)
    for (const sel of ['.hm-stat', '#tiles .tile', '.hm-act']) {
      const r = await hoverPress(hw, sel)
      if (r) ok(Math.max(...r.hover) >= 1.01 && Math.min(...r.press) <= 0.985, `Home ${sel}: hover lift and press squish (${fmt(r)})`)
    }
    w.closeTab(h.id); await wait(600)
  }

  // ---------------------------------------------------------------- Motion Off: nothing animates
  if (!STRIPS_ONLY) {
    await ex(`api.do('setSetting', 'motion', 'off')`); await wait(800)
    ok(await ex(`Jelly.getMode() === 'off' && getMotion() === 'off'`), 'Motion Off reaches the chrome')
    const r = await hoverPress(ui, '#btn-settings')
    ok(r && r.hover.every(s => s === 1) && r.press.every(s => s === 1), `Motion Off: toolbar buttons hold still (${fmt(r)})`)
    await ex(`window.__tabrec = []`)
    const tOff = w.createTab(PAGE.replace('Motion', 'Still'), { active: true }); await wait(700)
    const rec = (await ex(`__tabrec`)).find(x => x.id === String(tOff.id)) || { o: [1], s: [1] }
    ok(rec.o.every(o => o === 1) && rec.s.every(s => s === 1), `Motion Off: a new tab appears in place (${rec.o.slice(0, 4).join(' ')})`)
    const sCmd = sample(ui, `(() => { const e = document.querySelector('.cmdbar'); if (!e || !e.classList.contains('show')) return null; const m = new DOMMatrix(getComputedStyle(e).transform); return [+Math.hypot(m.a, m.b).toFixed(4), +(+getComputedStyle(e).opacity).toFixed(3)] })()`, 300)
    await ex(`openCmd('newtab')`); const cs = (await sCmd).filter(Boolean)
    ok(cs.every(([s, o]) => s === 1 && o === 1), `Motion Off: Cmd K appears at once (${cs.length} frames)`)
    await ex(`closeCmd(true)`); await wait(300)
    const st = await openPage('lumen://settings/general', 1500), sw = st.view.webContents
    const running = await sw.executeJavaScript(`document.getAnimations().filter(a => a.playState === 'running' && (a.effect.getComputedTiming().activeDuration > 1)).map(a => (a.animationName || a.constructor.name) + ':' + (a.effect.target && a.effect.target.className)).slice(0, 5)`)
    ok(!running.length, `Motion Off: nothing animates on Settings${running.length ? ' (' + running.join(', ') + ')' : ''}`)
    const wv = sample(sw, `document.scrollingElement.scrollTop`, 300); sw.sendInputEvent({ type: 'mouseWheel', x: 700, y: 400, deltaX: 0, deltaY: -100, wheelTicksY: -1, canScroll: true })
    ok(distinct(nums(await wv)) <= 3, 'Motion Off: the wheel scrolls without a glide')
    const rr = await hoverPress(sw, '.main .btn')
    ok(!rr || (rr.hover.every(s => s === 1) && rr.press.every(s => s === 1)), `Motion Off: Settings buttons hold still (${fmt(rr)})`)
    await w.contextMenu(base, { x: 260, y: 200, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '', isEditable: false, misspelledWord: '', dictionarySuggestions: [], editFlags: {}, formControlType: 'none', inputFieldType: '' })
    const mv = L.__nova.state(w).menuView.webContents
    const ms = (await sample(mv, `(() => { const p = document.querySelector('.panel'); if (!p) return null; const m = new DOMMatrix(getComputedStyle(p).transform); return [+m.d.toFixed(3), +(+getComputedStyle(p).opacity).toFixed(3)] })()`, 250)).filter(Boolean)
    ok(ms.every(([s, o]) => s === 1 && o === 1), `Motion Off: menus appear at once (${ms.length} frames)`)
    base.view.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); await wait(300)
    await ex(`api.do('setSetting', 'motion', 'jelly')`); await wait(500)
  }

  ok(!errors.length, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  out(fails ? `MOTION40 FAILED ${fails}` : 'MOTION40 ALL PASS')
  app.exit(fails ? 1 : 0)
}
