// 4.6: the flow hover never hides a label on the surfaces flow451 does not reach: the right-click menu, the dialog
// buttons and its account list, the toast's action button and the update card's buttons, light and dark. Each control
// is hovered (DevTools protocol; menu rows get the .on the pointer gives them), the fill finishes, and its label, icons
// and key caps must contrast with the colour that flowed in (at least 3:1).
// Run: xvfb-run -a npx electron test/flow46.js --no-sandbox   (log: /tmp/lumen-flow46.log)
const fs = require('fs'), path = require('path'); const { app, BrowserWindow, nativeTheme } = require('electron')
fs.rmSync('/tmp/lumen-flow46', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-flow46')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-flow46.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
app.on('window-all-closed', () => {})
const PROBE = `(() => {
  const cv = document.createElement('canvas').getContext('2d')
  window.__rgba = c => { const m = String(c).match(/^color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)(?: \\/ ([\\d.]+))?\\)/); if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]]
    const n = String(c).match(/rgba?\\(([^)]+)\\)/); if (n) { const p = n[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] }
    cv.fillStyle = '#000'; cv.fillStyle = c; const h = cv.fillStyle; if (h[0] === '#') return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 1]; return window.__rgba(h) }
  window.__lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b) }
  window.__cr = (a, b) => { const x = __lum(a), y = __lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
  if (!document.getElementById('__still')) { const s = document.createElement('style'); s.id = '__still'; s.textContent = 'html:root body *, html:root body *::before, html:root body *::after { transition-duration: 0s !important; transition-delay: 0s !important; animation-duration: 0s !important; animation-delay: 0s !important; }'; document.head.appendChild(s) }
  return true })()`
const CHECK = i => `(() => {
  const e = document.querySelector('[data-fi="${i}"]'); if (!e) return null
  const f = __rgba(getComputedStyle(e, '::before').backgroundColor); if (f[3] < .5) return { skip: true }
  const name = (e.id ? '#' + e.id : '') + '.' + String(e.className).trim().split(/\\s+/).join('.') + ' "' + (e.textContent || e.getAttribute('aria-label') || e.title || '').trim().slice(0, 24) + '"'
  const bad = []
  const look = (el, what) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return
    const c = __rgba(cs.webkitTextFillColor && !/currentcolor/i.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color); if (c[3] < .3) return
    // a part with its own opaque chip (an initial in a circle) is read against that chip, not the fill
    let under = f; for (let p = el; p && p !== e; p = p.parentElement) { const b = __rgba(getComputedStyle(p).backgroundColor); if (b[3] > .5) { under = b; break } }
    const cr = __cr(c, under); if (cr < 3) bad.push(what + ' ' + cr.toFixed(2)) }
  const txt = [...e.childNodes].some(n => n.nodeType === 3 && n.data.trim()); if (txt) look(e, 'label')
  e.querySelectorAll('span, b, kbd, svg, small, em, i').forEach(k => { if (k.closest('svg') && k.tagName.toLowerCase() !== 'svg') return; if (k.tagName.toLowerCase() === 'svg' || [...k.childNodes].some(n => n.nodeType === 3 && n.data.trim())) look(k, k.tagName.toLowerCase()) })
  return { name, bad } })()`
async function audit(wc, sel, where, { cls = '' } = {}) {
  await wc.executeJavaScript(PROBE)
  const n = await wc.executeJavaScript(`(() => { let i = 0; document.querySelectorAll('[data-fi]').forEach(x => x.removeAttribute('data-fi')); for (const e of document.querySelectorAll(${JSON.stringify(sel)})) { const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue; if (getComputedStyle(e).visibility === 'hidden') continue; e.setAttribute('data-fi', i++) } return i })()`)
  const d = wc.debugger; if (!d.isAttached()) d.attach('1.3')
  await d.sendCommand('DOM.enable'); await d.sendCommand('CSS.enable')
  const { root } = await d.sendCommand('DOM.getDocument', { depth: -1 })
  const bad = []; let checked = 0
  for (let i = 0; i < n; i++) {
    let r
    if (cls) { r = await wc.executeJavaScript(`(() => { const e = document.querySelector('[data-fi="${i}"]'); document.querySelectorAll('.${cls}').forEach(x => x.classList.remove('${cls}')); e.classList.add('${cls}'); return 1 })()`); await wait(520); r = await wc.executeJavaScript(CHECK(i)).catch(() => null) }
    else {
      const { nodeId } = await d.sendCommand('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-fi="${i}"]` }); if (!nodeId) continue
      // the fill and the label's colour change take .42 s: read them once they have finished, as you would see them
      await d.sendCommand('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] }); await wait(520)
      r = await wc.executeJavaScript(CHECK(i)).catch(() => null)
      await d.sendCommand('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] })
    }
    if (!r || r.skip) continue; checked++
    if (r.bad.length) bad.push(r.name + ': ' + r.bad.join(', '))
  }
  try { d.detach() } catch {}
  ok(checked > 0 && !bad.length, `${where}: ${checked} flow fills checked, every label, icon and key cap contrasts with its fill` + (bad.length ? '\n   ' + bad.join('\n   ') : ''))
}
const pageParams = (o = {}) => ({ x: 300, y: 200, linkURL: 'https://example.com/', linkText: 'Example', srcURL: '', mediaType: 'none', selectionText: 'quiet art', isEditable: false, misspelledWord: '', dictionarySuggestions: [], editFlags: { canCopy: true }, formControlType: 'none', inputFieldType: '', ...o })
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  w.win.setContentSize(1280, 800); await wait(500)
  const page = 'data:text/html,' + encodeURIComponent('<title>Flow test</title><body style="background:#fff">Flow <a href="https://example.com/">a link</a></body>')
  for (const theme of ['light', 'dark']) {
    L.D.settings.set({ theme }); await ex(`lumenUI.do('setSetting', 'theme', ${JSON.stringify(theme)})`); nativeTheme.themeSource = theme; await wait(900)
    const t = w.createTab(page, { active: true }); await wait(1500)
    // the right-click menu
    await w.contextMenu(t, pageParams()); await wait(1300)
    const mv = w._nova && w._nova.menu && w._nova.menu.view
    ok(!!mv, `${theme}: the right-click menu opened in Lumen's own view`)
    if (mv) await audit(mv.webContents, '.row:not(.off)', `${theme} right-click menu`, { cls: 'on' })
    t.view.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); try { mv && mv.webContents.executeJavaScript(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`) } catch {} await wait(700)
    // a dialog with buttons, and one with an account list
    for (const [nm, opts] of [['dialog', { buttons: ['Quit', 'Cancel'], defaultId: 0, cancelId: 1, icon: 'quit', message: 'Quit Lumen with 4 tabs open?', detail: 'Your tabs come back.' }],
      ['account list', { buttons: ['alice@example.com', 'bob@example.com', 'Cancel'], defaultId: 0, cancelId: 2, list: true, icon: 'key', title: 'Passkey', message: 'Sign in with a passkey', detail: 'Choose an account.' }]]) {
      const p = L.__novaDialog(w, opts); await wait(1200)
      const dv = w._nova && w._nova.dialog && w._nova.dialog.view
      if (dv) await audit(dv.webContents, '.btn, .choice', `${theme} ${nm}`)
      else ok(false, `${theme} ${nm}: the dialog opened in Lumen's own view`)
      if (dv) dv.webContents.executeJavaScript(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`).catch(() => {})
      await Promise.race([p, wait(2500)]); await wait(500)
    }
    // the toast's action button
    await ex(`toast('Tab closed', { label: 'Undo', run: () => {} })`); await wait(900)
    const tv = w._nova && w._nova.toast && w._nova.toast.view
    if (tv && tv.getVisible && tv.getVisible()) await audit(tv.webContents, '.btn', `${theme} toast`)
    else await audit(w.ui.webContents, '#toast button', `${theme} toast`)
    await wait(3000)
    w.closeTab(t.id); await wait(400)
    // the update card, in each state with buttons
    for (const st of ['available', 'downloading', 'ready', 'error']) {
      const win = new BrowserWindow({ width: 600, height: 350, show: false, transparent: true, frame: false, webPreferences: { preload: path.join(__dirname, 'fixtures/fake-update-preload.js'), contextIsolation: true, sandbox: false } })
      await win.loadFile(path.join(__dirname, '../ui/update.html'), { search: 's=' + st }); await wait(1600)
      await audit(win.webContents, '.btn, .row .lnk', `${theme} update card (${st})`)
      win.destroy()
    }
  }
  const l = fails ? 'FAILED ' + fails : 'ALL PASS'; console.log(l); fs.appendFileSync(LOG, l + '\n'); app.exit(fails ? 1 : 0)
})
