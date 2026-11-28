// 4.4.24: hovering tab previews must never leave the chrome raised over the page (ghost cards, stale page on macOS)
const http = require('http'), fs = require('fs'); const { app } = require('electron')
http.createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end(`<title>Page ${q.url}</title><body style="margin:0;height:100vh;background:#cde">Page ${q.url}</body>`) }).listen(48424)
fs.rmSync('/tmp/lumen-ghost', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-ghost')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-ghost4424.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 3) errors.push(e.message) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  const tabs = []; for (const p of ['a', 'b', 'c', 'd']) { tabs.push(w.createTab('http://127.0.0.1:48424/' + p, { active: true })); await wait(700) }
  await wait(800)
  const show = t => ex(`tcShow(${t.id}, document.querySelector('.tab[data-id="${t.id}"]'))`)
  const down = () => { const k = w.win.contentView.children, a = w.active(); return !w.overlay && k.indexOf(w.ui) >= 0 && a && a.view && k.indexOf(w.ui) < k.indexOf(a.view) }
  const cardGone = () => ex(`!document.getElementById('tabcard').classList.contains('show') && !tcShown`)
  const css = await ex(`(() => { const s = getComputedStyle(document.getElementById('tabcard')); return s.backdropFilter + '|' + s.boxShadow })()`)
  ok(/^none\|/.test(css), 'tab card has no backdrop-filter: ' + css.split('|')[0])
  // 1. hover several tabs in a row, then move away
  for (const t of tabs) { await show(t); await wait(250) }
  ok(w.overlay === true && w.quietOverlay === true, 'card raises the chrome quietly while shown')
  await ex(`tabsEl.dispatchEvent(new PointerEvent('pointerleave'))`); await wait(1200)
  ok(down(), 'after hovering 4 tabs and leaving: overlay lowered, chrome under the page')
  ok(await cardGone(), 'card hidden after leaving')
  // 2. switch tabs mid-hover
  await show(tabs[1]); await wait(300)
  w.activate(tabs[0].id); await wait(1200)
  ok(down(), 'tab switched mid-hover: overlay lowered, chrome under the new page')
  ok(await cardGone(), 'card hidden after a tab switch')
  // 3. window blur
  await show(tabs[2]); await wait(300)
  await ex(`window.dispatchEvent(new Event('blur'))`); w.win.emit('blur'); await wait(1200)
  ok(down(), 'window blur mid-hover: overlay lowered')
  ok(await cardGone(), 'card hidden after blur')
  // 4. pointer lands outside the tabs without a pointerleave (the macOS drag-gap case)
  await show(tabs[3]); await wait(300)
  await ex(`document.getElementById('pill') ? document.getElementById('pill').dispatchEvent(new PointerEvent('pointerover', { bubbles: true })) : document.body.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }))`); await wait(1200)
  ok(down(), 'pointer over the chrome outside the tabs: overlay lowered')
  ok(await cardGone(), 'card hidden when the pointer is elsewhere')
  // 5. hide while spring is mid-flight, then show and hide again quickly
  await show(tabs[0]); await ex(`tcHide()`); await show(tabs[1]); await wait(80); await ex(`tcHide()`); await wait(1400)
  ok(down(), 'rapid show/hide races: overlay lowered')
  // 6. another overlay user resets while the card is up
  await show(tabs[2]); await wait(200)
  await ex(`showOverlay('pop')`); await wait(150); await ex(`hideOverlay()`); await ex(`tcHide()`); await wait(1400)
  ok(down(), 'popover opened and closed during hover: overlay lowered')
  ok(!errors.length, 'no UI errors ' + errors.join('|'))
  const l = fails ? 'FAILED' : 'ALL PASS'; console.log(l); fs.appendFileSync(LOG, l + '\n'); app.exit(fails ? 1 : 0)
})
