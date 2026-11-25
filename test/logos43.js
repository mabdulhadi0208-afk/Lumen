// Home shows each site's real logo: Lumen remembers the sharpest icon a site offers (touch icon, SVG, biggest PNG)
// when you visit it, and the Home faces show it (touch icons edge to edge, others on white), falling back to
// /apple-touch-icon.png, then /favicon.ico, then the letter tile. Private windows remember nothing.
// Run: xvfb-run -a npx electron test/logos43.js --no-sandbox   (log: /tmp/lumen-logos43.log)
const fs = require('fs'); const { app, session, nativeImage } = require('electron')
fs.rmSync('/tmp/lumen-logos43', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-logos43')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-logos43.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const png = (n, [r, g, b]) => { const buf = Buffer.alloc(n * n * 4); for (let i = 0; i < n * n; i++) { const x = i % n, y = (i / n) | 0, on = Math.hypot(x - n / 2, y - n / 2) < n * .3; buf[i * 4] = on ? 255 : b; buf[i * 4 + 1] = on ? 255 : g; buf[i * 4 + 2] = on ? 255 : r; buf[i * 4 + 3] = 255 } return nativeImage.createFromBitmap(buf, { width: n, height: n }).toPNG() }
const SITES = {
  'touch.test': { html: '<link rel="icon" href="/f.png" sizes="32x32"><link rel="apple-touch-icon" href="/t.png" sizes="180x180">', files: { '/t.png': png(180, [230, 40, 60]), '/f.png': png(32, [0, 0, 0]) } },
  'svg.test': { html: '<link rel="shortcut icon" href="/favicon.ico"><link rel="icon" type="image/svg+xml" href="/logo.svg"><link rel="mask-icon" href="/mask.svg">', files: { '/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#1a73e8"/></svg>' } },
  'plain.test': { html: '', files: { '/favicon.ico': png(32, [20, 160, 90]) } },
  'none.test': { html: '', files: {} },
  'www.wsite.test': { html: '<link rel="apple-touch-icon" href="/t.png" sizes="180x180">', files: { '/t.png': png(180, [120, 60, 220]) } },
}
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  const serve = ses => ses.protocol.handle('https', req => {
    const u = new URL(req.url), s = SITES[u.host]
    if (!s) return new Response('no', { status: 404 })
    if (u.pathname === '/') return new Response(`<!doctype html><html><head><title>${u.host}</title>${s.html}</head><body>hi</body></html>`, { headers: { 'content-type': 'text/html' } })
    const f = s.files[u.pathname]; if (!f) return new Response('missing', { status: 404 })
    return new Response(f, { headers: { 'content-type': u.pathname.endsWith('.svg') ? 'image/svg+xml' : 'image/png' } })
  })
  serve(w.ses)
  w.win.setContentSize(1280, 820); await wait(400)
  for (const h of Object.keys(SITES)) { const t = w.createTab('https://' + h + '/', { active: true }); await wait(2200); L.D.addHistory('https://' + h + '/', h) }
  await wait(600)
  const icons = L.D.iconsFor(Object.keys(SITES))
  ok(icons['touch.test'] && icons['touch.test'].u === 'https://touch.test/t.png' && icons['touch.test'].k === 'touch', 'a 180px touch icon wins over a 32px PNG: ' + JSON.stringify(icons['touch.test']))
  ok(icons['svg.test'] && icons['svg.test'].u === 'https://svg.test/logo.svg' && icons['svg.test'].k === 'icon', 'an SVG icon wins over favicon.ico and the mask icon is ignored: ' + JSON.stringify(icons['svg.test']))
  ok(!icons['plain.test'] && !icons['none.test'], 'sites with no icon links remember nothing')
  const wi = L.D.iconsFor(['wsite.test', 'www.wsite.test'])
  ok(wi['wsite.test'] && wi['www.wsite.test'] && wi['wsite.test'].u === 'https://www.wsite.test/t.png', '4.1.5: a www. site is found with or without its www. (pages ask without it)')
  L.D.settings.set({ ntpShortcuts: Object.keys(SITES).map(h => ({ url: 'https://' + h, title: h })) })

  const t = w.createTab('lumen://newtab', { active: true }); await wait(5000)
  const pg = s => t.view.webContents.executeJavaScript(s)
  const faces = await pg(`[...document.querySelectorAll('#tiles .tile[data-url]')].map(x => { const f = x.querySelector('.hm-face'), im = f.querySelector('.hm-lg'); return { u: x.dataset.url, c: f.className, src: im ? im.getAttribute('src') : '', vis: im ? getComputedStyle(im).opacity : '0', letter: getComputedStyle(f.querySelector('b')).visibility, w: im ? im.getBoundingClientRect().width : 0, fw: f.getBoundingClientRect().width } })`)
  const F = h => faces.find(x => x.u.includes(h)) || {}
  fs.appendFileSync(LOG, JSON.stringify(faces, null, 1) + '\n')
  ok(/\blg-touch\b/.test(F('touch.test').c) && F('touch.test').src === 'https://touch.test/t.png' && F('touch.test').letter === 'hidden' && Math.abs(F('touch.test').w - F('touch.test').fw) < 1, 'touch.test shows its touch icon edge to edge, no letter')
  ok(/\blg-icon\b/.test(F('svg.test').c) && !/lg-small/.test(F('svg.test').c) && F('svg.test').src.endsWith('/logo.svg') && F('svg.test').w < F('svg.test').fw * .7, 'svg.test shows its SVG logo centred on white')
  ok(/\blg-icon\b/.test(F('plain.test').c) && /lg-small/.test(F('plain.test').c) && F('plain.test').src.endsWith('/favicon.ico'), 'plain.test falls back from apple-touch-icon.png to its favicon')
  ok(!/\blg\b/.test(F('none.test').c) && F('none.test').src === '' && F('none.test').letter === 'visible', 'none.test keeps the letter tile')
  await wait(800)
  await pg(`document.querySelector('#tiles').scrollIntoView({ block: 'center' })`); await wait(700)
  try { fs.writeFileSync('/tmp/lumen-logos43.png', (await t.view.webContents.capturePage()).toPNG()) } catch (e) { console.log('shot failed', e.message) }
  ok(await pg(`[...document.querySelectorAll('.hm-row .hm-face')].some(f => f.classList.contains('lg'))`), 'the history rows show logos too')

  ok(/\blg-touch\b/.test(F('wsite.test').c), '4.1.5: the www. site shows its logo on Home too')
  // the Add shortcut dialog previews the real logo as you type a site Lumen has seen
  await pg(`document.getElementById('addtile').click()`); await wait(700)
  await pg(`(() => { const i = document.getElementById('sc-url'); i.value = 'touch.test'; i.dispatchEvent(new Event('input', { bubbles: true })) })()`); await wait(1200)
  ok(await pg(`(() => { const im = document.querySelector('#sc-prev img.fav.lgx-touch'); return !!im && im.src === 'https://touch.test/t.png' })()`), '4.1.5: Add shortcut previews the real logo')
  await pg(`(() => { const i = document.getElementById('sc-url'); i.value = 'zz'; i.dispatchEvent(new Event('input', { bubbles: true })) })()`); await wait(600)
  ok(await pg(`!document.querySelector('#sc-prev img')`), '4.1.5: no logo for a half-typed address')
  // Bookmarks and History pages swap their small favicons for the real logos
  for (const h of ['touch.test', 'svg.test', 'none.test']) L.D.addBookmark('https://' + h + '/', h)
  const bt = w.createTab('lumen://bookmarks', { active: true }); await wait(3500)
  const bm = await bt.view.webContents.executeJavaScript(`[...document.querySelectorAll('img.fav')].map(i => i.dataset.h + ':' + i.className + ':' + i.getAttribute('src'))`)
  fs.appendFileSync(LOG, JSON.stringify(bm) + '\n')
  ok(bm.some(x => x.startsWith('touch.test:') && /lgx-touch/.test(x) && x.endsWith('/t.png')) && bm.some(x => x.startsWith('svg.test:') && /lgx-icon/.test(x) && x.endsWith('/logo.svg')), '4.1.5: Bookmarks shows the real logos')
  ok(!bm.some(x => x.startsWith('none.test:') && /lgx/.test(x)), '4.1.5: a site with no logo keeps its letter or favicon')
  await bt.view.webContents.executeJavaScript('scrollTo(0, 560)'); await wait(600)
  try { fs.writeFileSync('/tmp/lumen-logos43-bm.png', (await bt.view.webContents.capturePage()).toPNG()) } catch {}
  const ht = w.createTab('lumen://history', { active: true }); await wait(3500)
  ok(await ht.view.webContents.executeJavaScript(`document.querySelectorAll('img.fav.lgx').length > 0`), '4.1.5: History shows real logos')
  await ht.view.webContents.executeJavaScript('scrollTo(0, 640)'); await wait(600)
  try { fs.writeFileSync('/tmp/lumen-logos43-hist.png', (await ht.view.webContents.capturePage()).toPNG()) } catch {}

  // private windows remember nothing
  const before = JSON.stringify(L.D.iconsFor(['touch.test']))
  const pw = L.createWindow({ incognito: true }); await wait(2500)
  if (pw && pw.ses) serve(pw.ses)
  SITES['priv.test'] = { html: '<link rel="apple-touch-icon" href="/t.png">', files: { '/t.png': png(180, [0, 0, 255]) } }
  if (pw) { pw.createTab('https://priv.test/', { active: true }); await wait(2500) }
  ok(pw && !L.D.iconsFor(['priv.test'])['priv.test'] && JSON.stringify(L.D.iconsFor(['touch.test'])) === before, 'a private window remembers no icons')
  L.D.clearHistory(0)
  ok(!Object.keys(L.D.iconsFor(Object.keys(SITES))).length, 'clearing all history forgets the icons too')
  console.log(fails ? `LOGOS43 ${fails} FAILED` : 'LOGOS43 ALL PASS'); fs.appendFileSync(LOG, fails ? `${fails} FAILED\n` : 'ALL PASS\n')
  app.exit(fails ? 1 : 0)
})
