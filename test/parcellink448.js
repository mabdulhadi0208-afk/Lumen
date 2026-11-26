// 4.4.8: tracking links work everywhere. A carrier's tracking link (the kind shops put in shipping emails and on
// order pages) can be right-clicked, pasted in the command bar, copied before opening Track a parcel, or pasted into
// its number box: Lumen takes the number and the right carrier out of it, and the link opens first.
// Run: xvfb-run -a npx electron test/parcellink448.js --no-sandbox   (log: /tmp/lumen-parcellink448.log)
const fs = require('fs'), http = require('http'); const { app, clipboard } = require('electron')
fs.rmSync('/tmp/lumen-parcellink448', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-parcellink448')
const LOG = '/tmp/lumen-parcellink448.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const UPS = 'https://www.ups.com/track?loc=en_US&tracknum=1Z999AA10123456784&requester=ST/'
const FEDEX = 'https://www.fedex.com/fedextrack/?trknbr=612345678901'
const USPS = 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223197428490'
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(`<!doctype html><title>Your order shipped</title><h1>Your order shipped</h1><p><a id="t" href="${UPS}">Track your package</a> <a id="n" href="https://example.com/about">About us</a></p>`) }).listen(0, '127.0.0.1')
const L = require('../src/main.js'); const P = require('../src/parcels')

// ---- parse, pure
const p1 = P.parse(UPS) || {}
ok(p1.number === '1Z999AA10123456784' && p1.carrier === 'ups' && p1.link === UPS, 'a UPS link gives its number, UPS and the link')
ok((P.parse('  ' + FEDEX + ' ') || {}).carrier === 'fedex', 'spaces around a link are fine')
ok((P.parse('1Z999AA10123456784') || {}).link === '', 'a plain number still works, with no link')
ok(P.parse('https://example.com/blog/2024/123456789') === null && P.parse('hello') === null && P.parse('') === null, 'other links and words are not parcels')

const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 150000)
app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)

  // ---- right-click a tracking link on a page
  const t = w.createTab(`http://127.0.0.1:${site.address().port}/`, { active: true }); await wait(1800)
  let menu = null; const real = L.__nova.popupMenu; L.__nova.popupMenu = (win, tpl) => { menu = tpl }
  const flat = m => (m || []).flatMap(i => [i, ...flat(i.submenu)])
  w.contextMenu(t, { linkURL: UPS, linkText: 'Track your package', x: 20, y: 20, selectionText: '', mediaType: 'none', isEditable: false, editFlags: {} }); await wait(300)
  const item = flat(menu).find(i => /^Track Parcel/.test(i.label || ''))
  ok(!!item && item.label === 'Track Parcel 1Z999AA10123456784 (UPS)', 'right-clicking a tracking link offers Track Parcel with the number and carrier: ' + (item && item.label))
  menu = null; w.contextMenu(t, { linkURL: 'https://example.com/about', x: 20, y: 20, selectionText: '', mediaType: 'none', isEditable: false, editFlags: {} }); await wait(300)
  ok(menu && !flat(menu).some(i => /^Track Parcel/.test(i.label || '')), 'an ordinary link does not offer it')
  L.__nova.popupMenu = real
  if (item) { item.click(); await wait(500) }
  const a = P.list().find(p => p.number === '1Z999AA10123456784')
  ok(!!a && a.carrier === 'ups' && a.url === UPS, 'Track Parcel saves it with UPS and opens the link first')
  ok(await ex(`document.getElementById('toast').textContent.includes('Tracking 1Z999AA10123456784')`), 'a toast says it is tracking it')

  // ---- paste a tracking link in the command bar
  const s = await L.__suggest(w, FEDEX)
  ok(s.parcel && s.parcel.number === '612345678901' && s.parcel.carrier === 'FedEx' && s.parcel.link, 'the command bar offers to track a pasted FedEx link: ' + JSON.stringify(s.parcel))
  await ex(`api.do('trackNumber', ${JSON.stringify(FEDEX)})`); await wait(400)
  ok(P.list().some(p => p.number === '612345678901' && p.carrier === 'fedex' && p.url === FEDEX), 'and choosing it tracks the parcel with FedEx')
  ok(!(await L.__suggest(w, 'https://example.com/about')).parcel, 'an ordinary link in the command bar is not a parcel')

  // ---- Track a parcel: a copied link, and a link pasted into the number box
  // the virtual display has no real clipboard, so hand Lumen what a copy would have put there
  let CLIP = USPS; clipboard.readText = () => CLIP
  const pt = w.createTab('lumen://parcels', { active: true }); await wait(2200)
  const px = s => pt.view.webContents.executeJavaScript(s)
  const until = async (f, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await f(); if (v) return v; await wait(200) } return f() }
  const viaApi = await px(`L.invoke('parcelClipboard')`).catch(e => 'err ' + e.message)
  await px(`document.getElementById('padd').click()`); await until(() => px(`!!document.getElementById('pn')`))
  const ct = await until(() => px(`(document.getElementById('pclip') || {}).textContent || ''`), 2500)
  ok(/9400111899223197428490/.test(ct) && /link you copied/.test(ct), 'the dialog offers the number from the copied link: ' + (ct || JSON.stringify(viaApi)))
  await px(`document.getElementById('pclip') && document.getElementById('pclip').click()`); await wait(400)
  ok(await px(`document.getElementById('pn').value === '9400111899223197428490' && document.getElementById('pcar').value === 'usps' && document.getElementById('purl').value === ${JSON.stringify(USPS)}`), 'using it fills the number, USPS and the link')
  await px(`document.getElementById('pcancel').click()`); await wait(300)
  CLIP = ''
  await px(`document.getElementById('padd').click()`); await until(() => px(`!!document.getElementById('pn')`))
  await px(`(() => { const i = document.getElementById('pn'); i.value = ${JSON.stringify(UPS.replace('1Z999AA10123456784', '1Z12345E0205271688'))}; i.dispatchEvent(new Event('input')) })()`); await wait(700)
  ok(await px(`document.getElementById('pn').value === '1Z12345E0205271688' && document.getElementById('pcar').value === 'ups'`), 'a link pasted into the number box turns into its number and carrier')
  ok(await px(`/Got it from the link: UPS/.test(document.getElementById('pdet').textContent) && !!document.querySelector('#pdet .pd-link svg')`), 'a green note says where it came from')
  try { fs.mkdirSync('/tmp/lumen-shots', { recursive: true }); fs.writeFileSync('/tmp/lumen-shots/parcellink448.png', (await pt.view.webContents.capturePage()).toPNG()) } catch {}
  await px(`document.querySelector('.pdialog').requestSubmit()`); await wait(900)
  ok(P.list().some(p => p.number === '1Z12345E0205271688' && p.carrier === 'ups'), 'and Start tracking saves it')

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  // the result is settled here: a slow shutdown (parcel checks still loading carrier pages) must not change it
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0); setTimeout(() => process.exit(fails ? 1 : 0), 3000)
})
