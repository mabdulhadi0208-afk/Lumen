// 1.15: the new intro (with the parcels question), parcels: carriers, status words, auto-saved orders, the page, the new tab row, background checks.
const http = require('http'), fs = require('fs'); const { app } = require('electron')
let stage = 'Out for delivery'
http.createServer((q, r) => {
  r.setHeader('content-type', 'text/html; charset=utf-8')
  if (q.url.startsWith('/checkout/thank-you')) return r.end(`<title>Order confirmed</title><body><h1>Thank you for your order!</h1><p>Order number: ABC-12345</p><p>Your tracking number is 1Z999AA10123456784</p><p>Estimated delivery Friday.</p></body>`)
  if (q.url.startsWith('/blog')) return r.end(`<title>How to order pizza</title><body><h1>How to order pizza online</h1><p>Pick a place, choose toppings and place your order.</p></body>`)
  if (q.url.startsWith('/orders/77')) return r.end(`<title>Order 77</title><body><h1>Order #A77-7777</h1><p>Status: Delivered</p><p>Delivered on Monday</p></body>`)
  if (q.url.startsWith('/track')) return r.end(`<title>Tracking</title><body><h2>Shipment</h2><p>${stage}</p><p>Estimated delivery: today</p></body>`)
  r.end('<title>Home</title><body>Home</body>')
}).listen(48250)
fs.rmSync('/tmp/lumen-w15', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-w15')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js'); const P = require('../src/parcels')
const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-w15.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const U = p => 'http://127.0.0.1:48250/' + p

// ---- pure logic first
const det = { '1Z999AA10123456784': 'ups', 'TBA123456789012': 'amazon', '9400111899223456789012': 'usps', 'RR123456789GB': 'royalmail', 'RR123456789SA': 'saudipost', 'JJD0123456789': 'dhl', '1234567890': 'dhl', '123456789012': 'fedex', '12345678901': 'aramex', 'XYZ': 'other' }
for (const [n, c] of Object.entries(det)) ok(P.detect(n) === c, `carrier ${n} -> ${c} (${P.detect(n)})`)
ok(P.detect('1z 999 aa1 0123 4567 84') === 'ups', 'spaces and lower case are fine')
const st = t => (P.statusOf(t) || {}).status
ok(st('Status: Delivered\nSigned by J. SMITH') === 'delivered', 'Delivered')
ok(st('Your package was delivered at 2:14 PM') === 'delivered', 'was delivered')
ok(st('Estimated delivery Friday\nIn transit') === 'transit', 'Estimated delivery is not delivered')
ok(st('Out for delivery') === 'out', 'Out for delivery')
ok(st('تم التوصيل') === 'delivered', 'Arabic delivered')
ok(st('Hello world') === undefined, 'nothing found on an unrelated page')

app.whenReady().then(async () => {
  await wait(3500); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 3) errors.push(e.message) })
  const shot = async n => fs.writeFileSync(`${SHOTS}/w15-${n}.png`, (await w.ui.webContents.capturePage()).toPNG())

  // ---- the film: grab frames along the way
  ok(await ex(`!!document.getElementById('intro')`), 'intro plays on first launch')
  const filmStart = Date.now()
  for (const [ms, n] of [[1800, 'cold'], [4600, 'warp'], [6400, 'ignite'], [8400, 'logo'], [13500, 'carousel'], [17500, 'carousel2'], [22500, 'whatsnew']]) { await wait(Math.max(0, ms - (Date.now() - filmStart))); await shot('intro-' + n) }
  if (!(await ex(`!!document.querySelector('#intro .ask')`))) { await ex(`document.querySelector('#intro .skip').click()`); await wait(2600) }
  ok(await ex(`!!document.querySelector('#intro .ask') && !!document.querySelector('#intro .go') && !!document.querySelector('#intro .no')`), 'skipping still lands on the parcels question')
  await shot('intro-finale')
  ok(L.D.settings.get('parcelsAuto') === null, 'not decided before answering')
  await ex(`document.querySelector('#intro .go').click()`); await wait(1600)
  ok(await ex(`!document.getElementById('intro')`), 'intro closes')
  ok(L.D.settings.get('parcelsAuto') === true && L.D.settings.get('introSeen') === true, 'Yes saves the choice')

  // ---- auto-saved order
  const t = w.createTab(U('checkout/thank-you?id=9'), { active: true }); await wait(3200)
  const list = P.list()
  ok(list.length === 1, 'order page saved one parcel (' + list.length + ')')
  const p = list[0] || {}
  ok(p.orderNo === 'ABC-12345' && p.number === '1Z999AA10123456784' && p.carrier === 'ups' && /thank-you/.test(p.url), 'with order number, tracking number, carrier and the order page: ' + JSON.stringify({ o: p.orderNo, n: p.number, c: p.carrier }))
  ok(await ex(`document.getElementById('toast').textContent.includes('Order saved')`), 'toast says the order was saved')
  t.view.webContents.reload(); await wait(3000)
  ok(P.list().length === 1, 'same order again is not saved twice')
  t.view.webContents.loadURL(U('blog/pizza')); await wait(3000)
  ok(P.list().length === 1, 'a page that only talks about ordering is ignored')

  // ---- visiting a known page reads its status
  P.add({ url: U('orders/77'), shop: '127.0.0.1', orderNo: 'A77-7777', name: 'Old order', source: 'manual' })
  t.view.webContents.loadURL(U('orders/77')); await wait(3000)
  ok((P.list().find(x => x.orderNo === 'A77-7777') || {}).status === 'delivered', 'opening the order page notices it was delivered')

  // ---- background check
  const bg = P.add({ number: 'TBA000000000777', name: 'Headphones', source: 'manual' })
  P.update(bg.id, { url: U('track/777') })
  await L.__checkParcels(true); await wait(500)
  ok(P.list().find(x => x.id === bg.id).status === 'out', 'background check reads Out for delivery: ' + P.list().find(x => x.id === bg.id).statusText)
  stage = 'Delivered\nLeft at front door'
  await L.__checkParcels(true); await wait(500)
  ok(P.list().find(x => x.id === bg.id).status === 'delivered', 'and later Delivered')

  // ---- new tab page row
  const nt = w.createTab('lumen://newtab', { active: true }); await wait(2200)
  const nq = s => nt.view.webContents.executeJavaScript(s)
  const cards = await nq(`[...document.querySelectorAll('#pc .pcard[data-pid]')].map(c => c.querySelector('b').textContent)`)
  ok(cards.length >= 2, 'new tab page shows parcels: ' + cards.join(', '))
  ok(await nq(`!!document.querySelector('#pc [data-pcadd]')`), 'and a Track a parcel card')
  ok(await nq(`(() => { const r = document.querySelector('.recent.parcels').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 300 })()`), 'row sits inside the page')
  fs.writeFileSync(`${SHOTS}/w15-ntp.png`, (await nt.view.webContents.capturePage()).toPNG())
  await nq(`document.querySelector('#pc [data-pcadd]').click()`); await wait(700)
  await nq(`(() => { document.getElementById('pn').value = 'RR123456789SA'; document.getElementById('pn').dispatchEvent(new Event('input')); document.getElementById('pname').value = 'Books' })()`); await wait(500)
  ok(/Saudi Post/.test(await nq(`document.getElementById('pdet').textContent`)), 'dialog recognizes the carrier while typing')
  fs.writeFileSync(`${SHOTS}/w15-add.png`, (await nt.view.webContents.capturePage()).toPNG())
  await nq(`document.querySelector('.pdialog').requestSubmit()`); await wait(1500)
  ok(P.list().some(x => x.number === 'RR123456789SA' && x.name === 'Books' && x.carrier === 'saudipost'), 'added from the new tab page')
  await nq(`document.querySelector('#pc .pcard[data-pid]').click()`); await wait(1800)
  // the carrier's site is real: its address only shows once it starts answering, which can take a while
  for (let i = 0; i < 40 && !/48250|splonline|17track/.test(nt.view.webContents.getURL()); i++) await wait(250)
  ok(/48250|splonline|17track/.test(nt.view.webContents.getURL()), 'clicking a parcel opens its order page: ' + nt.view.webContents.getURL())

  // ---- parcels page
  const pp = w.createTab('lumen://parcels', { active: true }); await wait(2000)
  const pq = s => pp.view.webContents.executeJavaScript(s)
  ok(await pq(`document.querySelectorAll('.prow').length`) >= 3, 'Parcels page lists them (' + await pq(`document.querySelectorAll('.prow').length`) + ')')
  ok(/^On the way\s*\d*\|Delivered$/.test(await pq(`[...document.querySelectorAll('.daylabel')].map(d => d.textContent.trim()).join('|')`)), 'on the way and delivered sections')
  fs.writeFileSync(`${SHOTS}/w15-page.png`, (await pp.view.webContents.capturePage()).toPNG())
  const books = P.list().find(x => x.name === 'Books')
  await pq(`document.querySelector('[data-id="${books.id}"] [data-act=deliver]').click()`); await wait(800)
  ok(P.list().find(x => x.id === books.id).status === 'delivered', 'mark delivered by hand')
  await pq(`document.querySelector('[data-id="${books.id}"] [data-act=del]').click()`); await wait(800)
  ok(!P.list().some(x => x.id === books.id), 'remove')
  ok(await ex(`api.do('parcelsCount')`) === P.active().length, 'menu count matches')

  // ---- the what's-new cut after an update, asking about parcels if never asked
  L.D.settings.set({ parcelsAuto: null })
  await ex(`playIntro({ whatsNew: '1.15.0', askParcels: true })`); await wait(8200)
  await shot('whatsnew')
  ok(await ex(`!!document.querySelector('#intro .new .eyebrow') && /New in Lumen 1\\.15/.test(document.querySelector('#intro .new .eyebrow').textContent)`) || await ex(`!!document.querySelector('#intro .go')`), "what's new act plays")
  await ex(`document.querySelector('#intro .skip').click()`); await wait(2200)
  ok(await ex(`!!document.querySelector('#intro .ask')`), 'and asks about parcels when it was never asked')
  await ex(`document.querySelector('#intro .no').click()`); await wait(1500)
  ok(L.D.settings.get('parcelsAuto') === false && await ex(`!document.getElementById('intro')`), 'Not now saves no')

  ok(!errors.length, 'no UI errors ' + errors.join(' | '))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
