// 4.0 for Surge and Koi: the Nova right-click menu does what the system menu did, the update card follows Lumen's real
// download, Koi's menu draws its icons (no text symbols that could turn into emoji), the capsules draw, and nothing in
// a Surge or Koi window keeps animating or polling while it sits unseen.
process.env.LUMEN_APPS_ANYWHERE = '1'
const fs = require('fs'), path = require('path')
const { app, BrowserWindow, Tray, webContents } = require('electron')
fs.rmSync('/tmp/lumen-apps40', { recursive: true, force: true }); fs.mkdirSync('/tmp/lumen-apps40', { recursive: true })
fs.writeFileSync('/tmp/lumen-apps40/settings.json', JSON.stringify({ introSeen: true })); app.setPath('userData', '/tmp/lumen-apps40')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
let fails = 0; try { fs.unlinkSync('/tmp/lumen-apps40.log') } catch {}
const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-apps40.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))
const trays = []; const oOn = Tray.prototype.on
Tray.prototype.on = function (ev, fn) { trays.push({ ev, fn, koi: /apps[\\/]koi/.test(new Error().stack) }); return oOn.call(this, ev, fn) }
const L = require('../src/main.js'); const Apps = require('../src/apps.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
const find = re => BrowserWindow.getAllWindows().find(b => !b.isDestroyed() && re.test(b.webContents.getURL()))
const settings = () => JSON.parse(fs.readFileSync('/tmp/lumen-apps40/apps/surge/settings.json', 'utf8'))
app.whenReady().then(async () => {
  await wait(8000)
  ok(Apps.isRunning('surge') && Apps.isRunning('koi'), 'Surge and Koi run')

  // ---- the Nova right-click menu
  const rc = trays.find(t => !t.koi && t.ev === 'right-click'); ok(!!rc, "Surge's menu-bar icon has a right-click menu")
  rc && rc.fn(); await wait(1800)
  const mw = find(/surge[\\/]lumen-menu\.html/)
  ok(!!mw && mw.isVisible(), 'right-click opens the Nova menu (not the system menu)')
  if (mw) {
    const q = s => mw.webContents.executeJavaScript(s)
    const labels = await q(`[...document.querySelectorAll('.mi .lb')].map(e => e.textContent)`)
    LOG('    items: ' + labels.join(' | '))
    ok(['Settings', 'Quick Notes', 'Mute all sounds', 'Launch at login', 'Quit Surge'].every(l => labels.some(x => x.startsWith(l))), 'it has every item the system menu had')
    ok(await q(`document.querySelectorAll('.mi .ic svg').length`) === labels.length, 'every item has a drawn icon')
    ok(await q(`document.querySelectorAll('.mi.checkbox .sw').length`) >= 2, 'on/off items are switches')
    ok(await q(`!!document.querySelector('.mn-stats .ch.mods')`), 'the header says how many modules are on')
    const b = mw.getBounds(); ok(b.width === 300 && b.height > 150 && b.height < 700, 'the window fits the menu: ' + JSON.stringify(b))
    fs.writeFileSync(`${SHOTS}/apps40-menu.png`, (await mw.webContents.capturePage()).toPNG())
    const before = !!settings().muted
    await q(`document.querySelector('.mi.checkbox[data-id]') && [...document.querySelectorAll('.mi.checkbox')].find(b => /Mute/.test(b.textContent)).click()`); await wait(1200)
    ok(!!settings().muted === !before, 'picking Mute all sounds really mutes Surge')
    ok(!mw.isVisible(), 'and the menu closes')
    rc.fn(); await wait(1200); await q(`[...document.querySelectorAll('.mi.checkbox')].find(b => /Mute/.test(b.textContent)).click()`); await wait(1200)
    ok(!!settings().muted === before, 'and picking it again unmutes')
    rc.fn(); await wait(1200)
    mw.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); await wait(600)
    ok(!mw.isVisible(), 'Esc closes the menu')
  }

  // ---- the update card follows the real download
  const real = globalThis.__lumenApps.state
  globalThis.__lumenApps.state = () => ({ status: 'downloading', current: '1.23.0', latest: '4.0.0', progress: 37, speed: 5e6, eta: 12 })
  Apps.poke('lumen:popover', { x: 500, y: 90, width: 30, height: 30 }); await wait(2600)
  const pop = find(/surge[\\/]popover\.html/)
  if (pop) {
    const u = () => pop.webContents.executeJavaScript(`(() => { const b = document.getElementById('upd'); return { show: b.style.display, st: b.dataset.st, p: getComputedStyle(b).getPropertyValue('--lu-p').trim(), t: (document.querySelector('#upd .lu-t') || {}).textContent, s: (document.querySelector('#upd .lu-s') || {}).textContent, pc: (document.querySelector('#upd .lu-pc') || {}).textContent } })()`)
    let r = await u(); LOG('    ' + JSON.stringify(r))
    ok(r.show === 'flex' && r.st === 'downloading' && r.p === '37' && /4\.0\.0/.test(r.t) && /37%/.test(r.s) && /37/.test(r.pc), "Surge's menu shows Lumen's download at 37%")
    globalThis.__lumenApps.state = () => ({ status: 'downloading', current: '1.23.0', latest: '4.0.0', progress: 81, speed: 5e6, eta: 3 })
    await wait(2600); r = await u()
    ok(r.p === '81', 'and follows it to 81% on its own')
    globalThis.__lumenApps.state = () => ({ status: 'ready', current: '1.23.0', latest: '4.0.0', progress: 100 })
    await wait(2600); r = await u()
    ok(r.st === 'ready' && /ready/.test(r.t) && /Restart/.test(await pop.webContents.executeJavaScript(`document.getElementById('updBtn').textContent`)), 'then says it is ready, with Restart')
    pop.hide()
  } else ok(false, "Surge's menu")
  globalThis.__lumenApps.state = () => ({ status: 'downloading', current: '1.23.0', latest: '4.0.0', progress: 55, speed: 5e6, eta: 6 })
  const kt = trays.find(t => t.koi && t.ev === 'click'); kt && kt.fn(); await wait(2000)
  const kp = find(/koi[\\/]renderer[\\/]popover\.html/)
  if (kp) {
    await kp.webContents.executeJavaScript(`__pop.show(200); 1`); await wait(1500)
    const r = await kp.webContents.executeJavaScript(`(() => { const b = document.getElementById('upb'); return { show: b.classList.contains('show'), lu: b.classList.contains('lu'), p: getComputedStyle(b).getPropertyValue('--lu-p').trim(), w: (b.querySelector('.lu-bar i') || {}).offsetWidth, bw: (b.querySelector('.lu-bar') || {}).offsetWidth } })()`)
    LOG('    koi ' + JSON.stringify(r))
    ok(r.show && r.lu && r.p === '55' && r.bw > 0 && Math.abs(r.w / r.bw - .55) < .08, "Koi's update block bar tracks the real progress (55%)")
    // icons: drawn, never text symbols
    const ic = await kp.webContents.executeJavaScript(`[...document.querySelectorAll('.row .ic')].map(e => ({ svg: !!e.querySelector('svg'), text: e.textContent.trim() }))`)
    ok(ic.length >= 7 && ic.every(x => x.svg && !x.text), "Koi's menu icons are drawn line icons with no text symbols")
    kt.fn(); await wait(800)
  } else ok(false, "Koi's menu")
  globalThis.__lumenApps.state = real

  // ---- no emoji-capable symbol anywhere in Surge and Koi without the text selector
  const bad = []
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'node_modules') walk(p) } else if (/\.(html|js|css)$/.test(f)) { const s = fs.readFileSync(p, 'utf8'); for (const m of s.matchAll(/\p{Extended_Pictographic}(?!︎)/gu)) bad.push(path.relative(path.join(__dirname, '..'), p) + ' U+' + m[0].codePointAt(0).toString(16)) } } }
  walk(path.join(__dirname, '..', 'apps'))
  ok(!bad.length, 'no emoji-capable symbols in Surge or Koi ' + bad.slice(0, 5).join(', '))

  // ---- the capsules draw (charge, Caps Lock)
  const ov = find(/surge[\\/]glow\.html/)
  if (ov) {
    ov.showInactive()
    const lit = async () => ov.webContents.executeJavaScript(`(() => { const c = document.getElementById('c'), x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(Math.round(w / 2 - 150), Math.round(h - 260), 300, 220).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++; return n })()`)
    await ov.webContents.executeJavaScript(`engine.fire('plug', 67); 1`); await wait(1400)
    ok(await lit() > 4000, 'the charge capsule draws')
    await wait(4000)
    await ov.webContents.executeJavaScript(`engine.fire('hud', 100, { hud: { text: 'Caps Lock on' } }); 1`); await wait(700)
    ok(await lit() > 2000, 'the Caps Lock capsule draws')
    await wait(1800)
  }

  // ---- nothing keeps running unseen
  await wait(6000)
  const idle = []
  for (const w of webContents.getAllWebContents().filter(w => /apps[\\/](surge|koi)/.test(w.getURL()))) {
    const bw = BrowserWindow.fromWebContents(w); if (bw && bw.isVisible()) continue
    const r = await w.executeJavaScript(`new Promise(res => { let n = 0; const o = window.requestAnimationFrame; window.requestAnimationFrame = function (cb) { n++; return o.call(window, cb) }; setTimeout(() => { window.requestAnimationFrame = o; res({ raf: n, inf: document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).length }) }, 1500) })`).catch(() => ({ raf: 0, inf: 0 }))
    idle.push(w.getURL().replace(/.*apps[\\/]/, '') + ' raf=' + r.raf + ' inf=' + r.inf)
    ok(r.raf === 0 && r.inf === 0, 'unseen and still: ' + w.getURL().replace(/.*apps[\\/]/, '') + ' (' + r.raf + ' frames, ' + r.inf + ' endless animations)')
  }

  ok(!errs.length, 'no crashes ' + errs.join(' | ').slice(0, 400))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
