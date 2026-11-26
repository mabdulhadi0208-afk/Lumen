// Lumen 4.2 Home banner layout: Modern (words left, clock right, the default) and Classic (clock left, words right).
// Checks the sides at 1440 px, no overlap at 900 px, that the choice persists and applies live from Settings and from
// Customize, and that only the arrangement changes: the greeting, clock, chips and banner look exactly the same.
// Run: xvfb-run -a npx electron test/layout42.js --no-sandbox   (log: /tmp/lumen-layout42.log)
const fs = require('fs'); const { app, nativeTheme } = require('electron')
fs.rmSync('/tmp/lumen-layout42', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-layout42')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-layout42.log'; fs.writeFileSync(LOG, '')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const errors = []
app.on('web-contents-created', (e, wc) => wc.on('console-message', (a, b, c) => {
  const lvl = typeof a === 'object' && a && a.level !== undefined ? a.level : b, msg = typeof a === 'object' && a && a.message !== undefined ? a.message : c
  if ((lvl === 'error' || lvl === 3) && !/favicon|ERR_|net::|Failed to load resource/i.test(msg)) errors.push(String(msg).slice(0, 200))
}))

// the look of the banner, its greeting, clock and chips: everything but where they sit
const LOOK = `(() => {
  const P = ['color', 'font-family', 'font-size', 'font-weight', 'font-variant-numeric', 'letter-spacing', 'line-height', 'text-transform', '-webkit-text-fill-color',
    'background-color', 'background-image', 'background-size', 'box-shadow', 'border-radius', 'opacity', 'mask-image', '-webkit-mask-image', 'filter', 'backdrop-filter',
    'animation-name', 'animation-duration', 'transition-property', 'transition-duration', 'height', 'min-height']
  const pick = (el, pseudo) => { if (!el) return null; const cs = getComputedStyle(el, pseudo); return Object.fromEntries(P.map(p => [p, cs.getPropertyValue(p)])) }
  const q = s => document.querySelector(s)
  return JSON.stringify({
    hero: pick(q('#hero')), heroRim: pick(q('#hero'), '::before'), mesh: pick(q('.hm-mesh')), amb: pick(q('.hm-amb')), dots: pick(q('.amb-dots')),
    greet: pick(q('#greet')), date: pick(q('#date')), sub: pick(q('#hsub')),
    clock: pick(q('#clock')), digit: pick(q('#clock b')), sec: pick(q('.ck-sec')), divider: { ...pick(q('#cktile'), '::before'), height: null },
    chips: [...document.querySelectorAll('.hm-act')].map(e => pick(e)), keys: [...document.querySelectorAll('.hm-act kbd')].map(e => pick(e)),
    tile: { 'align-self': getComputedStyle(q('#cktile')).alignSelf }, heroW: q('#hero').getBoundingClientRect().width,
  })
})()`

app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  w.win.setContentSize(1440, 900); await wait(600)

  let t = null
  const open = async () => { t = w.createTab('lumen://newtab', { active: true }); await wait(4500) }
  const pg = s => t.view.webContents.executeJavaScript(s)
  const shot = async name => { const img = await t.view.webContents.capturePage(); const f = `${SHOTS}/layout42-${name}.png`; fs.writeFileSync(f, img.toPNG()); console.log('shot ' + f) }
  const rects = () => pg(`JSON.stringify((() => { const r = e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom } }; return { clock: r(document.getElementById('clockwrap') || document.getElementById('clock')), greet: r(document.getElementById('greet')), hi: r(document.querySelector('.hm-hi')), tile: r(document.getElementById('cktile')), hero: r(document.getElementById('hero')), chips: [...document.querySelectorAll('.hm-act')].filter(e => e.offsetParent).map(r) } })())`).then(JSON.parse)
  const settled = async () => { for (let i = 0; i < 30 && await pg(`(() => { const els = [document.getElementById('cktile'), document.querySelector('.hm-hi'), document.getElementById('greet'), document.getElementById('clockwrap') || document.getElementById('clock')].filter(Boolean); return els.some(e => e.style.translate || e.style.scale || e.style.transform || e.getAnimations().some(a => a.playState === 'running' && a.effect && isFinite(a.effect.getComputedTiming().endTime))) || document.getElementById('hero').classList.contains('enter') })()`); i++) await wait(200) }
  const noOverlap = R => (R.clock.r <= R.hi.l + .5 || R.hi.r <= R.clock.l + .5 || R.clock.b <= R.hi.t + .5 || R.hi.b <= R.clock.t + .5)
  const spills = R => [R.clock, R.greet, R.hi, R.tile, ...R.chips].some(r => r.l < R.hero.l - .5 || r.r > R.hero.r + .5)

  // ---- Modern is the default
  await open(); await settled()
  ok(L.D.settings.get('ntpBanner') === 'modern' && await pg(`document.getElementById('hero').dataset.layout === 'modern' && !document.getElementById('hero').classList.contains('classic')`), 'Modern is the default layout')
  let R = await rects()
  ok(R.greet.r <= R.clock.l && R.hi.r <= R.tile.l + .5, `Modern at 1440: the greeting is left of the clock (greet ${R.greet.r | 0} <= clock ${R.clock.l | 0})`)
  ok(!spills(R) && noOverlap(R), 'Modern at 1440: nothing spills or overlaps')
  const lookModern = await pg(LOOK)

  // ---- Customize has the switch, and it applies live with no reload
  await pg(`document.getElementById('cust').click()`); await wait(900)
  ok(JSON.stringify(await pg(`[...document.querySelectorAll('#hlay button')].map(b => b.textContent + (b.classList.contains('on') ? '*' : ''))`)) === '["Modern*","Classic"]', 'Customize shows Banner layout: Modern and Classic')
  await pg(`window.__mark = 1; document.querySelector('#hlay [data-v="classic"]').click()`); await wait(120)
  ok(await pg(`!!(document.getElementById('cktile').style.translate || document.querySelector('.hm-hi').style.translate)`), 'the switch glides on a jelly spring')
  await wait(400)
  ok(L.D.settings.get('ntpBanner') === 'classic' && await pg(`window.__mark === 1 && document.getElementById('hero').classList.contains('classic') && document.querySelector('#hlay [data-v="classic"]').classList.contains('on')`), 'Classic from Customize saves and applies live, no reload')
  await pg(`document.getElementById('dclose').click()`); await wait(800); await settled()
  R = await rects()
  ok(R.clock.r <= R.greet.l && R.tile.r <= R.hi.l + .5, `Classic at 1440: the clock is left of the greeting (clock ${R.clock.r | 0} <= greet ${R.greet.l | 0})`)
  ok(!spills(R) && noOverlap(R), 'Classic at 1440: nothing spills or overlaps')
  ok(await pg(`(() => { const el = document.getElementById('cktile'), d = getComputedStyle(el, '::before'); return Math.abs(parseFloat(d.left) + parseFloat(d.width) - el.offsetWidth) < 1.5 })()`), 'Classic: the hairline divider sits between the clock and the words')
  const lookClassic = await pg(LOOK)
  const a = JSON.parse(lookModern), b = JSON.parse(lookClassic), diff = []
  const cmp = (x, y, path) => { if (x && typeof x === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y || {})])) cmp(x[k], (y || {})[k], path + '.' + k) } else if (x !== y) diff.push(`${path}: ${x} != ${y}`) }
  cmp(a, b, 'look')
  ok(!diff.length && a.chips.length === 4, 'greeting, clock, chips and banner background look identical in both layouts' + (diff.length ? ': ' + diff.slice(0, 6).join(' | ') : ''))

  // ---- it persists into a new tab
  await open(); await settled()
  ok(await pg(`document.getElementById('hero').dataset.layout === 'classic' && document.querySelector('#hlay [data-v="classic"]').classList.contains('on')`), 'Classic persists into a new tab')

  // ---- screenshots, dark and light
  for (const theme of ['dark', 'light']) {
    nativeTheme.themeSource = theme; await wait(900)
    for (const lay of ['classic', 'modern']) {
      await ex(`api.do('setSetting','ntpBanner','${lay}')`); await wait(1400)
      await pg(`scrollTo(0, 0)`); await wait(200)
      await shot(`${lay}-${theme}`)
    }
  }
  nativeTheme.themeSource = 'system'; await wait(400)

  // ---- 900 px: both layouts stack, no overlap
  w.win.setContentSize(900, 760); await wait(1500)
  for (const lay of ['classic', 'modern']) {
    await ex(`api.do('setSetting','ntpBanner','${lay}')`); await wait(1400); await settled()
    R = await rects()
    ok(noOverlap(R) && R.clock.b <= R.greet.t, `${lay} at 900: the clock and greeting do not overlap`)
    ok(!spills(R) && await pg(`[...document.querySelectorAll('#hero, .hm-hi, #clock')].every(e => { const r = e.getBoundingClientRect(); return r.left >= -.5 && r.right <= innerWidth + .5 })`), `${lay} at 900: nothing spills`)
  }
  w.win.setContentSize(1440, 900); await wait(800)

  // ---- Settings, Appearance: the same choice, and the open Home tab follows it live
  const home = t
  const st = w.createTab('lumen://settings/appearance', { active: true }); await wait(3000)
  const sp = s => st.view.webContents.executeJavaScript(s)
  ok(JSON.stringify(await sp(`[...document.querySelectorAll('[data-seg="ntpBanner"] .vc > b')].map(b => b.textContent)`)) === '["Modern","Classic"]', 'Settings, Appearance has Home banner layout: Modern and Classic')
  ok(await sp(`document.querySelector('[data-seg="ntpBanner"] [data-v="modern"]').classList.contains('on')`), 'Settings shows the current choice')
  await sp(`document.querySelector('[data-seg="ntpBanner"]').scrollIntoView({ block: 'center' })`); await wait(700)
  await sp(`document.querySelector('[data-seg="ntpBanner"] [data-v="classic"]').click()`); await wait(1200)
  ok(L.D.settings.get('ntpBanner') === 'classic', 'Classic from Settings saves')
  ok(await home.view.webContents.executeJavaScript(`document.getElementById('hero').classList.contains('classic')`), 'the open Home tab switches to Classic live')
  { const img = await st.view.webContents.capturePage(); fs.writeFileSync(`${SHOTS}/layout42-settings.png`, img.toPNG()); console.log('shot ' + SHOTS + '/layout42-settings.png') }
  await sp(`document.querySelector('[data-seg="ntpBanner"] [data-v="modern"]').click()`); await wait(1000)
  ok(L.D.settings.get('ntpBanner') === 'modern' && await home.view.webContents.executeJavaScript(`!document.getElementById('hero').classList.contains('classic')`), 'back to Modern from Settings, live')

  // ---- only known values are honoured
  await ex(`api.do('setSetting','ntpBanner','sideways')`); await wait(800)
  ok(await home.view.webContents.executeJavaScript(`document.getElementById('hero').dataset.layout === 'modern'`), 'an unknown value falls back to Modern')
  await ex(`api.do('setSetting','ntpBanner','modern')`); await wait(300)

  ok(!errors.length, 'no page errors ' + errors.join(' | '))
  console.log(fails ? 'FAILED' : 'ALL PASS'); fs.appendFileSync(LOG, (fails ? 'FAILED' : 'ALL PASS') + '\n'); app.exit(fails ? 1 : 0)
})
