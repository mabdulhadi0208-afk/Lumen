// 4.5.1: the flow hover never hides a label. For every flow control in the chrome, on New Tab and on Settings, light
// and dark, force :hover (DevTools protocol), let the fill finish, and check that the label, its icons and its key caps
// contrast with the colour that flowed in (at least 3:1). Fills that are only a faint tint are skipped: the label sits
// on the surface behind them, which the rest of the suite checks.
// Run: xvfb-run -a npx electron test/flow451.js --no-sandbox   (log: /tmp/lumen-flow451.log)
const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-flow451', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-flow451')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-flow451.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const UI_FLOW = '.ib, .newtab, .tab, .popover .item, .res, .qa, .tg-close, .ta-btn, .tr-btn, .mm-tile, .clip, .bm, .pin, .update, .prompt .btn, .popover .btn, .np-main, #toast button'
const PAGE_FLOW = '.btn, .chip, .fchip, .allowchip, .hm-act, .pill, .getapp, .hm-cust'
// reads every colour as rgba numbers (rgb(), color(srgb ...), and anything the canvas understands)
const PROBE = `(() => {
  const cv = document.createElement('canvas').getContext('2d')
  window.__rgba = c => { const m = String(c).match(/^color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)(?: \\/ ([\\d.]+))?\\)/); if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]]
    const n = String(c).match(/rgba?\\(([^)]+)\\)/); if (n) { const p = n[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
    cv.fillStyle = '#000'; cv.fillStyle = c; const h = cv.fillStyle; if (h[0] === '#') return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 1]; return window.__rgba(h) }
  window.__lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b) }
  window.__cr = (a, b) => { const x = __lum(a), y = __lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
  if (!document.getElementById('__still')) { const s = document.createElement('style'); s.id = '__still'; s.textContent = 'html:root body *, html:root body *::before, html:root body *::after { transition-duration: 0s !important; transition-delay: 0s !important; }'; document.head.appendChild(s) }
  return true })()`
const CHECK = i => `(() => {
  const e = document.querySelector('[data-fi="${i}"]'); if (!e) return null
  const f = __rgba(getComputedStyle(e, '::before').backgroundColor); if (f[3] < .5) return { skip: true }
  const name = (e.id ? '#' + e.id : '') + '.' + String(e.className).trim().split(/\\s+/).join('.') + ' "' + (e.textContent || e.getAttribute('aria-label') || e.title || '').trim().slice(0, 24) + '"'
  const bad = []
  const look = (el, what) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return
    const c = __rgba(cs.webkitTextFillColor && !/currentcolor/i.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color); if (c[3] < .3) return
    const cr = __cr(c, f); if (cr < 3) bad.push(what + ' ' + cr.toFixed(2)) }
  const txt = [...e.childNodes].some(n => n.nodeType === 3 && n.data.trim()); if (txt) look(e, 'label')
  e.querySelectorAll('span, b, kbd, svg, small, em').forEach(k => { if (k.closest('svg') && k.tagName.toLowerCase() !== 'svg') return; if (k.tagName.toLowerCase() === 'svg' || [...k.childNodes].some(n => n.nodeType === 3 && n.data.trim())) look(k, k.tagName.toLowerCase()) })
  return { name, bad } })()`
async function audit(wc, sel, where) {
  await wc.executeJavaScript(PROBE)
  const n = await wc.executeJavaScript(`(() => { let i = 0; document.querySelectorAll('[data-fi]').forEach(x => x.removeAttribute('data-fi')); for (const e of document.querySelectorAll(${JSON.stringify(sel)})) { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue; e.setAttribute('data-fi', i++) } return i })()`)
  const d = wc.debugger; if (!d.isAttached()) d.attach('1.3')
  await d.sendCommand('DOM.enable'); await d.sendCommand('CSS.enable')
  const { root } = await d.sendCommand('DOM.getDocument', { depth: -1 })
  const bad = []; let checked = 0
  for (let i = 0; i < n; i++) {
    const { nodeId } = await d.sendCommand('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-fi="${i}"]` }); if (!nodeId) continue
    await d.sendCommand('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] }); await wait(30)
    const r = await wc.executeJavaScript(CHECK(i)).catch(() => null)
    await d.sendCommand('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] })
    if (!r || r.skip) continue; checked++
    if (r.bad.length) bad.push(r.name + ': ' + r.bad.join(', '))
  }
  ok(!bad.length, `${where}: ${checked} flow fills checked, every label, icon and key cap contrasts with its fill` + (bad.length ? '\n   ' + bad.join('\n   ') : ''))
  return checked
}
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  w.win.setContentSize(1280, 800); await wait(500)
  const page = 'data:text/html,' + encodeURIComponent('<title>Flow test</title><body style="background:#fff">Flow</body>')
  for (const theme of ['light', 'dark']) {
    L.D.settings.set({ theme }); await ex(`lumenUI.do('setSetting', 'theme', ${JSON.stringify(theme)})`); await wait(900)
    w.createTab(page, { active: true }); await wait(1200)
    await audit(w.ui.webContents, UI_FLOW, `${theme} chrome`)
    await ex(`openCmd('newtab')`); await wait(900); await audit(w.ui.webContents, '.res, .qa', `${theme} command bar`); await ex(`closeCmd(true)`); await wait(600)
    await ex(`openMainMenu()`); await wait(900); await audit(w.ui.webContents, '.popover .item, .mm-tile, .popover .btn', `${theme} main menu`); await ex(`closePopover(true)`); await wait(600)
    for (const [url, nm] of [['lumen://newtab', 'New Tab'], ['lumen://settings/appearance', 'Settings'], ['lumen://history', 'History'], ['lumen://downloads', 'Downloads']]) {
      const t = w.createTab(url, { active: true }); await wait(3200)
      await audit(t.view.webContents, PAGE_FLOW, `${theme} ${nm}`)
      if (nm === 'New Tab') { await t.view.webContents.executeJavaScript(`scrollTo(0, document.documentElement.scrollHeight)`); await wait(500); await audit(t.view.webContents, PAGE_FLOW, `${theme} New Tab, lower half`) }
    }
    // a light and a dark New Tab background of your own: the banner's chips flip with it
    for (const th of ['rose', 'midnight']) {
      await ex(`lumenUI.do('setSetting', 'browserTheme', '${th}')`); await wait(800)
      const t = w.createTab('lumen://newtab', { active: true }); await wait(3200)
      await audit(t.view.webContents, '.hm-act, .hm-cust', `${theme} New Tab on ${th}`)
      const ban = await t.view.webContents.executeJavaScript(`(() => { const h = document.querySelector('.hm-hero'); const b = getComputedStyle(h).backgroundColor, g = getComputedStyle(document.getElementById('greet') || document.querySelector('.hm-greet')).color; return { b, g, cr: __cr(__rgba(b), __rgba(g)) } })()`)
      ok(ban.cr >= 4.5, `${theme} New Tab on ${th}: the banner (${ban.b}) takes the background's tone and its greeting reads (${ban.cr.toFixed(1)}:1)`)
    }
    await ex(`lumenUI.do('setSetting', 'browserTheme', 'default')`); await wait(600)
  }
  const l = fails ? 'FAILED ' + fails : 'ALL PASS'; console.log(l); fs.appendFileSync(LOG, l + '\n'); app.exit(fails ? 1 : 0)
})
