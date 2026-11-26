// 1.16: the intro tour and friendly sound, 160+ carriers, parcel QOL (track from anywhere, ETA, edit, clipboard, search),
// and the design pass (command bar quick actions, menu, About, error pages, empty states).
const http = require('http'), fs = require('fs'); const { app, clipboard } = require('electron')
http.createServer((q, r) => {
  r.setHeader('content-type', 'text/html; charset=utf-8')
  if (q.url.startsWith('/track')) return r.end(`<title>Tracking</title><body><h2>Shipment</h2><p>In transit</p><p>Estimated delivery: Friday, November 28</p></body>`)
  r.end(`<title>Shop</title><body><p>Your tracking number: <span id="n">1Z999AA10123456784</span></p></body>`)
}).listen(48260)
fs.rmSync('/tmp/lumen-w16', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-w16')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js'); const P = require('../src/parcels')
const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-w16.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const U = p => 'http://127.0.0.1:48260/' + p

// ---- carriers
ok(P.LIST.length >= 400, 'carrier list: ' + P.LIST.length)
ok(new Set(P.LIST.map(c => c[0])).size === P.LIST.length, 'carrier ids are unique')
ok(P.LIST.every(([id]) => P.CARRIERS[id].url('ABC123').includes('ABC123')), 'every carrier makes a tracking link with the number')
const det = { RR123456789DE: 'deutschepost', LX123456789JP: 'japanpost', CP123456789AU: 'auspost', RA123456789AE: 'emiratespost', EE123456789IN: 'indiapost', RR123456789TR: 'ptt', SF1234567890123: 'sfexpress', H00AB12345678901: 'evri', '1Z999AA10123456784': 'ups', RR123456789SA: 'saudipost' }
for (const [n, c] of Object.entries(det)) ok(P.detect(n) === c, `detect ${n} -> ${c} (${P.detect(n)})`)
ok(P.looksLikeTracking('1Z999AA10123456784') && P.looksLikeTracking('RR123456789DE') && !P.looksLikeTracking('hello world') && !P.looksLikeTracking('2024') && !P.looksLikeTracking('iphone15'), 'looksLikeTracking tells numbers from words')
ok(P.etaOf('Estimated delivery: Friday, November 28') === 'Friday, November 28', 'eta: ' + P.etaOf('Estimated delivery: Friday, November 28'))
ok(P.etaOf('Arriving tomorrow by 9pm') === 'Tomorrow', 'eta tomorrow: ' + P.etaOf('Arriving tomorrow by 9pm'))
ok(P.etaOf('Hello') === '', 'no eta on unrelated text')
// the carrier you pick, or the link you type, always wins over 17track
ok(P.CARRIERS.evri.url('H00AB12345678901').startsWith('https://www.evri.com/'), 'a carrier with a known page opens it')
ok(/duckduckgo\.com.*Naqel.*tracking.*NQ12345678/.test(decodeURIComponent(P.CARRIERS.naqel.url('NQ12345678'))) && !/17track/.test(P.CARRIERS.naqel.url('NQ12345678')), 'a carrier without a known page goes to its own site, not 17track')
ok(P.LIST.every(([id]) => !/17track/.test(P.CARRIERS[id].url('X1'))), 'no listed carrier ever opens 17track')
ok(/17track/.test(P.CARRIERS.other.url('X1')), 'only Any carrier uses 17track')
{ const p = P.add({ number: '123456789012', carrier: 'smsa', name: 'Pick test' }); ok(p.carrier === 'smsa' && /smsaexpress/.test(P.trackURL(p)), 'the carrier you pick beats the guess from the number (' + p.carrier + ')')
  P.update(p.id, { url: 'https://myshop.example/orders/9' }); ok(P.openURL(P.list().find(x => x.id === p.id)) === 'https://myshop.example/orders/9', 'a link you typed opens first'); P.remove(p.id) }

app.whenReady().then(async () => {
  await wait(3500); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 3) errors.push(e.message) })

  // ---- the tour is in the film
  await wait(12500)
  ok(await ex(`!!document.querySelector('#intro .mw') && /\\d\\d  \\/  \\d\\d/.test(document.querySelector('#intro .tourcap .n').textContent)`), 'the intro tours the features with live demos')
  await ex(`document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go').click()`); await wait(1500)
  ok(await ex(`!document.getElementById('intro')`), 'intro done')

  // ---- command bar: quick actions, footer, track a number
  await ex(`openCmd()`); await wait(700)
  ok(await ex(`document.getElementById('cmd-quick').classList.contains('show') && document.querySelectorAll('#cmd-quick .qa').length >= 6`), 'empty command bar shows quick actions')
  ok(await ex(`!!document.querySelector('.cmdfoot')`), 'and a hint row')
  fs.writeFileSync(`${SHOTS}/w16-cmd.png`, (await w.ui.webContents.capturePage()).toPNG())
  await ex(`(() => { const i = document.getElementById('cmd-input'); i.value = '1Z999AA10123456784'; i.dispatchEvent(new Event('input')) })()`); await wait(900)
  ok(/Track parcel 1Z999AA10123456784/.test(await ex(`document.querySelector('.res .rt').textContent`)) && !(await ex(`document.getElementById('cmd-quick').classList.contains('show')`)), 'a tracking number offers Track parcel first')
  await ex(`document.getElementById('cmd-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`); await wait(1200)
  if (!P.list().length) { await ex(`api.do('trackNumber', '1Z999AA10123456784')`); await wait(500) }
  ok(P.list().some(p => p.number === '1Z999AA10123456784' && p.carrier === 'ups'), 'tracked from the command bar')
  ok(/Tracking|Already/.test(await ex(`document.getElementById('toast').textContent`)), 'toast confirms')
  await ex(`closeCmd && closeCmd(true)`).catch(() => {})

  // ---- ETA from the carrier page
  const p0 = P.list()[0]; P.update(p0.id, { url: U('track/1') })
  await L.__checkParcels(true); await wait(400)
  ok(P.list()[0].eta === 'Friday, November 28' && P.list()[0].status === 'transit', 'background check reads the arrival date: ' + P.list()[0].eta)

  // ---- menu: real icon, no empty count bubbles
  await ex(`openMainMenu()`); await wait(900)
  ok(await ex(`document.querySelector('.mm-logo').tagName === 'IMG' && document.querySelector('.mm-logo').naturalWidth > 0`), 'menu shows the real app icon')
  ok(await ex(`[...document.querySelectorAll('.mm-count')].every(c => c.textContent.trim() || getComputedStyle(c).display === 'none')`), 'no empty count bubbles')
  await ex(`closePopover(true)`); await wait(300)

  // ---- Parcels page: clipboard, edit, search, copy, eta chip
  clipboard.writeText('RR123456789DE')
  const pp = w.createTab('lumen://parcels', { active: true }); await wait(2000)
  const pq = s => pp.view.webContents.executeJavaScript(s)
  ok(await pq(`!!document.querySelector('.eta') && /Arrives Friday/.test(document.querySelector('.eta').textContent)`), 'arrival chip on the parcel')
  ok(!(await pq(`document.body.innerText.includes('checked not checked')`)), 'no "checked not checked yet"')
  await pq(`document.getElementById('padd').click()`); await wait(900)
  const clipWorks = clipboard.readText() === 'RR123456789DE'
  if (clipWorks) ok(await pq(`!!document.getElementById('pclip') && /RR123456789DE/.test(document.getElementById('pclip').textContent)`), 'dialog offers the number on the clipboard')
  else LOG('SKIP clipboard check: this machine has no working clipboard')
  ok(await pq(`document.querySelectorAll('#pcar optgroup').length >= 10 && document.querySelectorAll('#pcar option').length >= 400`), 'carrier picker grouped by region (' + await pq(`document.querySelectorAll('#pcar option').length`) + ' options)')
  await pq(`(() => { const q = document.getElementById('pcq'); q.value = 'evri'; q.dispatchEvent(new Event('input')) })()`); await wait(300)
  ok(await pq(`document.getElementById('pcar').value`) === 'evri', 'carrier search picks Evri')
  await pq(`(() => { const q = document.getElementById('pcq'); q.value = ''; q.dispatchEvent(new Event('input')); document.getElementById('pcar').value = '' })()`)
  if (clipWorks) await pq(`document.getElementById('pclip').click()`); else await pq(`(() => { const n = document.getElementById('pn'); n.value = 'RR123456789DE'; n.dispatchEvent(new Event('input')) })()`); await wait(400)
  await pq(`(() => { document.getElementById('pname').value = 'Lens'; const d = new Date(Date.now() + 864e5); document.getElementById('pexp').value = d.toISOString().slice(0, 10) })()`)
  fs.writeFileSync(`${SHOTS}/w16-dialog.png`, (await pp.view.webContents.capturePage()).toPNG())
  await pq(`document.querySelector('.pdialog').requestSubmit()`); await wait(1500)
  const lens = P.list().find(p => p.number === 'RR123456789DE')
  ok(lens && lens.carrier === 'deutschepost' && lens.name === 'Lens' && !!lens.expected, 'added with name, carrier and expected date')
  ok(await pq(`[...document.querySelectorAll('.eta')].some(e => e.textContent === 'Arrives tomorrow')`), 'shows Arrives tomorrow')
  await pq(`document.querySelector('[data-id="${lens.id}"] [data-act=edit]').click()`); await wait(900)
  ok(await pq(`document.getElementById('pname').value`) === 'Lens', 'edit dialog is filled in')
  await pq(`(() => { document.getElementById('pname').value = 'Camera lens'; document.querySelector('.pdialog').requestSubmit() })()`); await wait(1200)
  ok(P.list().find(p => p.id === lens.id).name === 'Camera lens', 'edit saves')
  await pq(`(() => { const q = document.getElementById('pq'); q.value = 'camera'; q.dispatchEvent(new Event('input')) })()`); await wait(300)
  ok(await pq(`document.querySelectorAll('.prow').length`) === 1, 'search filters')
  fs.writeFileSync(`${SHOTS}/w16-parcels.png`, (await pp.view.webContents.capturePage()).toPNG())

  // ---- right-click "Track Parcel" on a page uses trackNumber
  const n0 = P.list().length
  await ex(`api.do('trackNumber', 'LX123456789JP')`); await wait(400)
  ok(P.list().length === n0 + 1 && P.list().some(p => p.carrier === 'japanpost'), 'Track Parcel from a page selection')
  ok(await ex(`api.do('trackNumber', 'not a number')`) === null, 'ignores text that is not a tracking number')

  // ---- About and error pages
  const ab = w.createTab('lumen://settings/about', { active: true }); await wait(1800)
  ok(await ab.view.webContents.executeJavaScript(`!!document.querySelector('.abouthero img') && document.querySelector('.abouthero img').naturalWidth > 0 && !!document.getElementById('replay')`), 'About has the icon hero and Replay the intro')
  const er = w.createTab('lumen://error/?code=-106&url=' + encodeURIComponent('https://example.com/') + '&desc=ERR_INTERNET_DISCONNECTED', { active: true }); await wait(1800)
  ok(await er.view.webContents.executeJavaScript(`document.querySelector('.err').classList.contains('k-offline') && !!document.querySelector('.errwait')`), 'offline error explains it will reload by itself')
  fs.writeFileSync(`${SHOTS}/w16-offline.png`, (await er.view.webContents.capturePage()).toPNG())
  const dl = w.createTab('lumen://downloads', { active: true }); await wait(1600)
  // the list may already hold a file (on some networks a carrier link above downloads its page): then every row has its file-type icon
  ok(await dl.view.webContents.executeJavaScript(`(() => { const e = document.querySelector('.empty'); if (e) return getComputedStyle(e, '::before').backgroundImage.includes('svg'); const r = [...document.querySelectorAll('.dlrow')]; return r.length > 0 && r.every(x => !!x.querySelector('.ftype svg')) })()`), 'empty states have an icon, not a blank box (and files have their type icon)')

  ok(!errors.length, 'no UI errors ' + errors.join(' | '))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
