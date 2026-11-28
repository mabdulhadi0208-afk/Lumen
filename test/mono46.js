// 4.6: no rainbow anywhere ("remove all rainbow ... just modern no more colourful stuff"). For every lumen:// page
// (New Tab and each Settings section) and the browser chrome with its menus, light and dark, every visible element's
// background, gradient, text, border, shadow, fill and stroke is read back, and any saturated colour that is not the
// one accent (or the warning red on a danger control) fails the test, with the element named.
// Run: xvfb-run -a npx electron test/mono46.js --no-sandbox   (log: /tmp/lumen-mono46.log)
const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-mono46', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-mono46')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-mono46.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const AUDIT = `(() => {
  const rgba = c => { const m = String(c).match(/^color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)(?: \\/ ([\\d.]+))?\\)/); if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]]
    const n = String(c).match(/rgba?\\(([^)]+)\\)/); if (n) { const p = n[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] } return null }
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]
    const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; return [h, s, l] }
  const acc = (() => { const d = document.createElement('i'); d.style.color = 'var(--accent)'; document.body.appendChild(d); const c = rgba(getComputedStyle(d).color); d.remove(); return c })()
  const near = (a, b, t) => b && Math.abs(a[0] - b[0]) < t && Math.abs(a[1] - b[1]) < t && Math.abs(a[2] - b[2]) < t
  const out = [], grayC = new Map()
  // a parent drawn through filter: grayscale(1) shows its children in greys, whatever their own colours say
  const gray = e => { if (!e || e === document.documentElement) return false; if (grayC.has(e)) return grayC.get(e); const f = getComputedStyle(e).filter; const g = /grayscale\((1|100%)\)|saturate\(0\)/.test(f) || gray(e.parentElement); grayC.set(e, g); return g }
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('img, video, canvas, iframe, webview, .fav, .favicon, .appicon, .app-ic, .icb, .wpsw, .thumb, .tg-shot, .ntp-bg, [data-mono-ok]')) continue
    const r = e.getBoundingClientRect(); if (r.width < 3 || r.height < 3 || r.bottom < 0 || r.top > innerHeight * 2.5 || r.right < 0 || r.left > innerWidth) continue
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < .05 || cs.display === 'none') continue
    if (gray(e)) continue
    const danger = !!e.closest('.danger, .bad, .warn, .error, .err, [data-kind="danger"], [data-kind="clear"], .del, .rm')
    const chk = (what, str) => { for (const c of String(str).match(/(?:rgba?|color)\\([^)]*\\)/g) || []) { const v = rgba(c); if (!v || v[3] < .12) continue
      const [h, s, l] = hsl(v); const span = Math.max(v[0], v[1], v[2]) - Math.min(v[0], v[1], v[2]); if (s < .3 || span < 30) continue
      if (near(v, acc, 18)) continue
      if (danger && (h < 20 || h > 335)) continue
      return what + ' ' + c } }
    const bad = chk('background', cs.backgroundColor) || chk('gradient', cs.backgroundImage) || chk('text', cs.color) || chk('shadow', cs.boxShadow) || chk('border', cs.borderTopColor) || (e instanceof SVGElement ? chk('fill', cs.fill) || chk('stroke', cs.stroke) : '')
    if (bad) { const cl = e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className; out.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (cl ? '.' + String(cl).trim().split(/\\s+/).slice(0, 3).join('.') : '') + ': ' + bad) }
  }
  return [...new Set(out)].slice(0, 25)
})()`
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  w.win.setContentSize(1280, 800); await wait(500)
  const SECS = (process.env.SECS || 'general,appearance,apps,ai,privacy,passwords,sync,import,extensions,history,bookmarks,readlater,parcels,downloads,about').split(',')
  for (const theme of (process.env.THEMES || 'light,dark').split(',')) {
    L.D.settings.set({ theme }); await ex(`lumenUI.do('setSetting', 'theme', ${JSON.stringify(theme)})`); await wait(900)
    const t = w.createTab('lumen://newtab', { active: true }); await wait(3200)
    const audit = async (wc, where) => { const bad = await wc.executeJavaScript(AUDIT).catch(e => ['audit failed: ' + e.message]); ok(!bad.length, `${theme} ${where}: no colour but the one accent` + (bad.length ? '\n   ' + bad.join('\n   ') : '')) }
    await audit(t.view.webContents, 'New Tab')
    for (const s of SECS) {
      await t.view.webContents.loadURL('lumen://settings/' + s); await wait(1800)
      await audit(t.view.webContents, 'Settings ' + s)
      await t.view.webContents.executeJavaScript('scrollTo(0, 900)'); await wait(700)
      await audit(t.view.webContents, 'Settings ' + s + ', lower')
    }
    await audit(w.ui.webContents, 'chrome')
    await ex(`openMainMenu()`); await wait(900); await audit(w.ui.webContents, 'main menu'); await ex(`closePopover(true)`); await wait(500)
    await ex(`openCmd('newtab')`); await wait(800); await audit(w.ui.webContents, 'command bar'); await ex(`closeCmd(true)`); await wait(500)
    w.closeTab(t.id); await wait(400)
  }
  const l = fails ? 'FAILED ' + fails : 'ALL PASS'; console.log(l); fs.appendFileSync(LOG, l + '\n'); app.exit(fails ? 1 : 0)
})
