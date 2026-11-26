// 4.4.6: Shop support for Parcels. A Shopify store's thank-you and order status pages are saved as an order with the
// store's own name, the tracking number and the right carrier taken from the "Track your order" link, and a Shop tag
// in the Parcels page. Carrier links are read for every carrier Lumen knows; product pages and blogs are left alone.
// Run: xvfb-run -a npx electron test/shop446.js --no-sandbox   (log: /tmp/lumen-shop446.log)
const fs = require('fs'), http = require('http'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-shop446', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-shop446')
const LOG = '/tmp/lumen-shop446.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const HEAD = `<meta name="shopify-checkout-api-token" content="abc"><meta property="og:site_name" content="Northwind Goods">`
const site = http.createServer((q, r) => {
  r.writeHead(200, { 'content-type': 'text/html' })
  if (q.url.startsWith('/checkouts/c/9f8e7d/thank_you')) return r.end(`<!doctype html><head><title>Thank you - Northwind Goods - Checkout</title>${HEAD}</head><body><h2>Confirmation #D7XK4P1L</h2><h1>Thank you, Sam!</h1><p>Your order is confirmed</p><p>You will get a confirmation email soon.</p><a href="https://www.fedex.com/fedextrack/?trknbr=612345678901">Track your order</a></body>`)
  if (q.url.startsWith('/orders/0a1b2c3d4e5f60718293')) return r.end(`<!doctype html><head><title>Order #1042 - Fern and Clay</title><meta property="og:site_name" content="Fern and Clay"><link rel="stylesheet" href="https://cdn.shopify.com/s/files/x.css"></head><body><h1>Order #1042</h1><p>Your order is on its way</p><p>Shipping updates</p><a href="https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223197428490">9400111899223197428490</a></body>`)
  if (q.url.startsWith('/products')) return r.end(`<!doctype html><head><title>Mug</title>${HEAD}</head><body><h1>Stoneware mug</h1><p>Thank you for shopping with us. Order now.</p><a href="https://www.ups.com/track?tracknum=1Z999AA10123456784">ups</a></body>`)
  r.end('<title>Home</title>Home')
}).listen(0, '127.0.0.1')
const L = require('../src/main.js'); const P = require('../src/parcels')

// ---- links, pure
const links = {
  'https://www.ups.com/track?tracknum=1Z999AA10123456784': ['1Z999AA10123456784', 'ups'],
  'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223197428490': ['9400111899223197428490', 'usps'],
  'https://www.fedex.com/fedextrack/?trknbr=612345678901': ['612345678901', 'fedex'],
  'https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=1234567890': ['1234567890', 'dhl'],
  'https://track.amazon.com/tracking/TBA123456789012': ['TBA123456789012', 'amazon'],
  'https://northwind.aftership.com/?tracking_number=1Z999AA10123456784': ['1Z999AA10123456784', 'ups'],
}
for (const [h, [n, c]] of Object.entries(links)) { const f = P.fromLink(h) || {}; ok(f.number === n && f.carrier === c, `link ${new URL(h).hostname} -> ${c} ${n} (${JSON.stringify(f)})`) }
ok(P.fromLink('https://shop.example/products/12345678?id=12345678') === null, 'a product link is not a parcel')
ok(P.fromLink('https://www.amazon.com/dp/B012345678?id=1234567890') === null, 'a shop link on a carrier\'s domain is not a parcel')
ok(P.fromLink('mailto:x@y.z?tracking=1234567890') === null, 'only web links count')

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  L.D.settings.set({ parcelsAuto: true })
  const U = p => `http://127.0.0.1:${site.address().port}${p}`
  const until = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = f(); if (v) return v; await wait(250) } return f() }

  // the thank-you page
  const t = w.createTab(U('/checkouts/c/9f8e7d/thank_you'), { active: true })
  const a = await until(() => P.list().find(p => p.orderNo === 'D7XK4P1L'))
  ok(!!a, 'a Shopify thank-you page is saved as an order')
  ok(a && a.name === 'Order from Northwind Goods', 'named after the store, not the address: ' + (a && a.name))
  ok(a && a.number === '612345678901' && a.carrier === 'fedex', 'tracking number and carrier come from the Track your order link: ' + JSON.stringify(a && { n: a.number, c: a.carrier }))
  ok(a && a.via === 'shop', 'it is marked as a Shop order')
  ok(await until(() => ex(`document.getElementById('toast').textContent.includes('Shop order saved')`), 4000), 'the toast says a Shop order was saved')

  // the order status page, found by the Shopify assets alone
  t.view.webContents.loadURL(U('/orders/0a1b2c3d4e5f60718293/authenticate?key=x'))
  const b = await until(() => P.list().find(p => p.orderNo === '1042'))
  ok(!!b && b.name === 'Order from Fern and Clay' && b.number === '9400111899223197428490' && b.carrier === 'usps' && b.via === 'shop', 'an order status page: store, USPS number from the link: ' + JSON.stringify(b && { n: b.name, o: b.orderNo, c: b.carrier }))
  ok(b && b.status === 'transit', 'and its status is On the way: ' + (b && b.status))

  // a product page in the same store is not an order
  const before = P.list().length
  t.view.webContents.loadURL(U('/products/mug')); await wait(3500)
  ok(P.list().length === before, 'a product page with a carrier link is not saved')

  // same thank-you page again: no second copy
  t.view.webContents.loadURL(U('/checkouts/c/9f8e7d/thank_you')); await wait(3500)
  ok(P.list().filter(p => p.orderNo === 'D7XK4P1L').length === 1, 'seeing the thank-you page again does not save it twice')

  // the Parcels page shows the Shop tag
  const pt = w.createTab('lumen://parcels', { active: true }); await wait(2500)
  const px = s => pt.view.webContents.executeJavaScript(s)
  ok(await px(`document.querySelectorAll('.prow .pvia').length`) === 2, 'both Shop orders wear the Shop tag in Parcels')
  ok(await px(`(() => { const v = document.querySelector('.prow .pvia'); return !!v && v.textContent.trim() === 'Shop' && !!v.querySelector('svg') && v.getBoundingClientRect().height > 10 && v.getBoundingClientRect().height < 30 })()`), 'the tag reads Shop with its bag icon and sits in the row')
  ok(await px(`(() => { const r = document.querySelector('.prow .pvia').getBoundingClientRect(), n = document.querySelector('.prow .pname').getBoundingClientRect(); return r.left >= n.right - 1 && Math.abs((r.top + r.bottom) / 2 - (n.top + n.bottom) / 2) < 8 })()`), 'the tag sits right after the name, on the same line')
  await px(`document.getElementById('pq').value = 'northwind'; document.getElementById('pq').dispatchEvent(new Event('input'))`); await wait(300)
  ok(await px(`document.querySelectorAll('.prow').length`) === 1, 'searching by the store name finds it')
  try { fs.mkdirSync('/tmp/lumen-shots', { recursive: true }); fs.writeFileSync('/tmp/lumen-shots/shop446.png', (await pt.view.webContents.capturePage()).toPNG()) } catch {}

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
