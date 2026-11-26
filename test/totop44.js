// 4.1.6: clicking the tab you are already on sends its page back to the top (the document, or a web app's inner
// scroller), with an ease-out glide and a hop on the tab; clicking another tab only switches to it; Motion Off is instant.
// Run: xvfb-run -a npx electron test/totop44.js --no-sandbox   (log: /tmp/lumen-totop44.log)
const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-totop44', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-totop44')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-totop44.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const LONG = 'data:text/html,' + encodeURIComponent('<title>Long</title><body style="margin:0"><div style="height:6000px;background:linear-gradient(#fff,#88f)">top</div></body>')
const APP = 'data:text/html,' + encodeURIComponent('<title>App</title><body style="margin:0;overflow:hidden"><header style="height:60px">bar</header><main id="m" style="height:calc(100vh - 60px);overflow:auto"><div style="height:5000px">inner</div></main></body>')
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ui = w.ui.webContents, ex = s => ui.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  w.win.setContentSize(1280, 820); await wait(400)
  const a = w.createTab(LONG, { active: true }); await wait(1500)
  const b = w.createTab(APP, { active: false }); await wait(1500)
  const pa = s => a.view.webContents.executeJavaScript(s), pb = s => b.view.webContents.executeJavaScript(s)
  const click = async id => {
    const r = await ex(`(() => { const e = document.querySelector('.tab[data-id="${id}"]') || [...document.querySelectorAll('.tab')].find(t => t.dataset.id == ${id}); if (!e) return null; const q = e.querySelector('.title').getBoundingClientRect(); return { x: Math.round(q.left + 10), y: Math.round(q.top + q.height / 2) } })()`)
    if (!r) return false
    ui.sendInputEvent({ type: 'mouseDown', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await wait(60)
    ui.sendInputEvent({ type: 'mouseUp', x: r.x, y: r.y, button: 'left', clickCount: 1 }); return true
  }
  ok(await ex(`!!document.querySelector('.tab[data-id]')`), 'tabs carry their id')

  await pa('scrollTo(0, 3000)'); await wait(200)
  ok(await click(a.id), 'found the active tab'); await wait(150)
  const mid = await pa('scrollY')
  await wait(900)
  ok(mid > 0 && mid < 3000, 'the page glides up, not a jump (mid-way at ' + mid + ')')
  ok(await pa('scrollY') === 0, 'the active tab click brings the page to the top')
  ok(await ex(`[...document.querySelectorAll('.tab')].find(t => t.dataset.id == ${a.id}).classList.contains('totop')`), 'the tab hops (totop)')

  // a click on the tab you are not on only switches to it
  await pb(`document.getElementById('m').scrollTop = 2000`); await wait(100)
  await click(b.id); await wait(1000)
  ok(w.activeId === b.id && await pb(`document.getElementById('m').scrollTop`) === 2000, 'clicking another tab switches to it and keeps its scroll')
  // now it is active: a second click scrolls the web app's inner scroller
  await wait(500); await click(b.id); await wait(1200)
  ok(await pb(`document.getElementById('m').scrollTop`) === 0, 'a web app that scrolls a box goes to the top too')

  // already at the top: nothing happens, no hop
  await ex(`[...document.querySelectorAll('.tab')].forEach(t => t.classList.remove('totop'))`)
  await wait(500); await click(b.id); await wait(700)
  ok(!(await ex(`[...document.querySelectorAll('.tab')].find(t => t.dataset.id == ${b.id}).classList.contains('totop')`)), 'at the top already: no hop')

  // wheel during the glide stops it
  await pb(`document.getElementById('m').scrollTop = 4000`); await wait(200)
  await click(b.id); await wait(120)
  await pb(`dispatchEvent(new WheelEvent('wheel'))`); const held = await pb(`document.getElementById('m').scrollTop`); await wait(800)
  ok(held > 0 && await pb(`document.getElementById('m').scrollTop`) === held, 'scrolling with the wheel stops the glide where it is')

  // Motion Off: instant
  L.D.settings.set({ motion: 'off' }); await wait(300)
  await pb(`document.getElementById('m').scrollTop = 3000`); await wait(200)
  await click(b.id); await wait(250)
  ok(await pb(`document.getElementById('m').scrollTop`) === 0, 'with Motion Off it is instant')
  console.log(fails ? `TOTOP44 ${fails} FAILED` : 'TOTOP44 ALL PASS'); fs.appendFileSync(LOG, fails ? `${fails} FAILED\n` : 'ALL PASS\n')
  app.exit(fails ? 1 : 0)
})
