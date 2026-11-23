// Parcels: track deliveries by tracking number, and save orders automatically from order confirmation pages.
// A parcel stays until it is delivered. Status is read from the carrier's or shop's own page, in the background,
// with the user's own session, so signed-in order pages work too.
const { Store } = require('./store')

const store = new Store('parcels', [])   // { id, number, carrier, name, url, shop, orderNo, status, statusText, added, checked, delivered, source }
const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

// ------------------------------------------------------------ carriers
const CARRIERS = {
  ups: { name: 'UPS', re: /^1Z[0-9A-Z]{16}$/, url: n => `https://www.ups.com/track?tracknum=${n}` },
  amazon: { name: 'Amazon', re: /^TB[ACM]\d{12}$/, url: n => `https://track.amazon.com/tracking/${n}` },
  usps: { name: 'USPS', re: /^(9[1-5]\d{18,20}|[A-Z]{2}\d{9}US)$/, url: n => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
  royalmail: { name: 'Royal Mail', re: /^[A-Z]{2}\d{9}GB$/, url: n => `https://www.royalmail.com/track-your-item#/tracking-results/${n}` },
  canadapost: { name: 'Canada Post', re: /^([A-Z]{2}\d{9}CA|\d{16})$/, url: n => `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${n}` },
  saudipost: { name: 'Saudi Post', re: /^[A-Z]{2}\d{9}SA$/, url: n => `https://splonline.com.sa/en/shipmentdetailsstatic/?tid=${n}` },
  chinapost: { name: 'China Post', re: /^[A-Z]{2}\d{9}CN$/, url: n => `https://t.17track.net/en#nums=${n}` },
  dhl: { name: 'DHL', re: /^(\d{10}|JJD\d{10,}|JVGL\d{10,}|[A-Z]{3}\d{7})$/, url: n => `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}` },
  fedex: { name: 'FedEx', re: /^(\d{12}|\d{15}|\d{20}|\d{22})$/, url: n => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  smsa: { name: 'SMSA', re: /^\d{12}$/, url: n => `https://www.smsaexpress.com/trackingdetails?tracknumbers=${n}` },
  aramex: { name: 'Aramex', re: /^\d{11}$/, url: n => `https://www.aramex.com/us/en/track/results?mode=0&ShipmentNumber=${n}` },
  other: { name: 'Any carrier', re: /^$/, url: n => `https://t.17track.net/en#nums=${n}` },
}
const clean = n => String(n || '').toUpperCase().replace(/[\s-]/g, '')
function detect(n) {
  n = clean(n)
  for (const [k, c] of Object.entries(CARRIERS)) if (k !== 'other' && c.re.test(n)) return k
  return 'other'
}
const trackURL = p => (CARRIERS[p.carrier] || CARRIERS.other).url(encodeURIComponent(p.number))
const carrierName = k => (CARRIERS[k] || CARRIERS.other).name

// ------------------------------------------------------------ status from page text
// newest wording wins: a page that says "Delivered" anywhere near the top is delivered
function statusOf(text) {
  const t = String(text || '').slice(0, 20000)
  const notYet = /(estimated|expected|scheduled|arriving|will be|to be|attempted|failed|out for|not yet|by \w+day)\s+deliver/i
  if (/(has been|was|been|successfully|package|parcel|item|shipment|order)\s+delivered\b/i.test(t) || /(^|\n)\s*delivered\b/i.test(t) || /status\s*[:\-]?\s*delivered\b/i.test(t) || /تم التوصيل|تم التسليم/.test(t)) {
    // "Delivered" that is really "estimated delivery" does not count
    const m = t.match(/(^|\n)\s*delivered\b[^\n]{0,60}/i)
    if (!m || !notYet.test(m[0])) return { status: 'delivered', text: 'Delivered' }
  }
  if (/out for delivery|with (the )?courier for delivery|قيد التوصيل|خرجت للتوصيل/i.test(t)) return { status: 'out', text: 'Out for delivery' }
  if (/in transit|on (its|the) way|departed|arrived at|shipped|dispatched|في الطريق|تم الشحن/i.test(t)) return { status: 'transit', text: 'On the way' }
  if (/label created|order (placed|confirmed|received)|processing|preparing/i.test(t)) return { status: 'placed', text: 'Order placed' }
  return null
}

// ------------------------------------------------------------ order pages
// runs inside the page; returns what it found, or null when this is not an order page
const ORDER_SCAN = `(() => {
  const url = location.href, text = (document.body && document.body.innerText || '').slice(0, 30000)
  const urlHit = /(order[-_ ]?(confirm\\w*|complete\\w*|success|received|details?|placed|status|summary)|thank[-_ ]?you|checkout\\/(success|complete|thank\\w*)|purchase\\/(complete|success)|\\/orders?\\/[\\w-]{5,}|order-?id=|orderid=)/i.test(url)
  const textHit = /(thank(s| you) for (your )?(order|purchase|shopping)|your order (has been |is )?(placed|confirmed|received)|order (has been )?(placed|confirmed)|order (number|no\\.?|#|id)\\s*[:#]?\\s*[A-Z0-9-]{5,}|تم تأكيد طلبك|رقم الطلب|شكرا لطلبك)/i.test(text)
  if (!textHit || (!urlHit && !/thank(s| you) for (your )?(order|purchase)/i.test(text))) return null
  const om = text.match(/(?:order|طلب)\\s*(?:number|no\\.?|#|id|رقم)?\\s*[:#]?\\s*#?\\s*([A-Z0-9][A-Z0-9-]{4,30})/i)
  // tracking numbers: strong patterns anywhere, plain digits only right after the word tracking
  const tr = new Set()
  for (const m of text.matchAll(/\\b(1Z[0-9A-Z]{16}|TB[ACM]\\d{12}|[A-Z]{2}\\d{9}[A-Z]{2})\\b/g)) tr.add(m[1])
  for (const m of text.matchAll(/(?:tracking|track|airway ?bill|awb|رقم التتبع|رقم الشحنة)[^\\n\\d]{0,30}(\\d{10,22})/gi)) tr.add(m[1])
  return { url, title: document.title, orderNo: om ? om[1] : '', tracking: [...tr].slice(0, 3), text: text.slice(0, 6000) }
})()`

function list() { return store.get() }
function active() { return store.get().filter(p => p.status !== 'delivered') }
function add({ number = '', name = '', carrier = '', url = '', shop = '', orderNo = '', source = 'manual' } = {}) {
  number = clean(number)
  if (!number && !url) return null
  const all = store.get()
  const same = all.find(p => (number && p.number === number) || (orderNo && p.orderNo === orderNo && p.shop === shop) || (!number && url && p.url === url))
  if (same) {   // the same order seen again: fill in what we learned (a tracking number, a better name)
    if (number && !same.number) { same.number = number; same.carrier = carrier || detect(number) }
    if (url && !same.url) same.url = url
    if (name && (!same.name || same.source === 'auto')) same.name = name
    store.save(); return same
  }
  const p = { id: uid(), number, carrier: number ? (CARRIERS[carrier] ? carrier : detect(number)) : '', name: String(name || '').slice(0, 80), url, shop, orderNo, status: 'placed', statusText: number ? 'Waiting for news' : 'Order placed', added: Date.now(), checked: 0, delivered: 0, source }
  store.replace([p, ...all].slice(0, 200))
  return p
}
function update(id, patch) { const p = store.get().find(x => x.id === id); if (p) { Object.assign(p, patch); store.save() } return p }
function remove(id) { store.replace(store.get().filter(p => p.id !== id)) }
function setStatus(p, st) {
  if (!st) return false
  const changed = st.status !== p.status
  p.status = st.status; p.statusText = st.text; p.checked = Date.now()
  if (st.status === 'delivered' && !p.delivered) p.delivered = Date.now()
  store.save(); return changed
}
// delivered parcels leave the list after three days
function prune() { const cut = Date.now() - 3 * 864e5; const keep = store.get().filter(p => p.status !== 'delivered' || p.delivered > cut); if (keep.length !== store.get().length) store.replace(keep) }
// the page that best answers "where is my order": the shop's order page, or the carrier's tracking page
// "amazon.sa" -> "Amazon", "shop.example.co.uk" -> "Example", "127.0.0.1" -> "127.0.0.1"
function shopName(host) {
  host = String(host || '').replace(/^www\./, '').replace(/:\d+$/, '')
  if (!host || /^[\d.]+$/.test(host) || host === 'localhost') return host || 'a shop'
  const parts = host.split('.')
  let i = parts.length - 2
  if (i > 0 && /^(co|com|org|net|gov|ac|edu)$/.test(parts[i]) && parts[i + 1].length === 2) i--
  const n = parts[Math.max(0, i)]
  return n.charAt(0).toUpperCase() + n.slice(1)
}
const openURL = p => p.url || (p.number ? trackURL(p) : '')

module.exports = { shopName, store, CARRIERS, detect, trackURL, carrierName, statusOf, ORDER_SCAN, list, active, add, update, remove, setStatus, prune, openURL, clean }
