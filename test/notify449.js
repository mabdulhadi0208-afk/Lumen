// 4.4.9: parcel news takes you to the parcel. A background check that finds news shows a system notification and a
// toast with View; both open Parcels (reusing an open Parcels tab) and light up that parcel. Quitting while a
// check is loading a carrier's page ends that check at once, and no new one starts.
// Run: xvfb-run -a npx electron test/notify449.js --no-sandbox   (log: /tmp/lumen-notify449.log)
const fs = require('fs'), http = require('http'); const electron = require('electron'); const { app } = electron
fs.rmSync('/tmp/lumen-notify449', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-notify449')
const LOG = '/tmp/lumen-notify449.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 170000)
const site = http.createServer((q, r) => {
  if (q.url.startsWith('/slow')) return   // a carrier page that never finishes loading
  r.writeHead(200, { 'content-type': 'text/html' })
  if (q.url.startsWith('/track/a')) return r.end('<title>Tracking</title><h2>Shipment</h2><p>Out for delivery</p><p>Estimated delivery: today</p>')
  r.end('<title>Home</title>Home')
}).listen(0, '127.0.0.1')
// system notifications, recorded instead of shown
const notes = []
class FakeNote { constructor(o) { this.o = o; this.h = {}; notes.push(this) } on(e, f) { this.h[e] = f; return this } show() { this.shown = true } click() { this.h.click && this.h.click() } static isSupported() { return true } }
const L = require('../src/main.js'); const P = require('../src/parcels')
L.__setParcelNote(o => new FakeNote(o))

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  const U = p => `http://127.0.0.1:${site.address().port}${p}`
  const urlOf = t => t.view.webContents.getURL()
  const until = async (f, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await f(); if (v) return v; await wait(250) } return f() }

  // a parcel whose page now says Out for delivery
  P.add({ number: '1Z999AA10123456784', carrier: 'ups', url: U('/track/a'), name: 'New headphones', source: 'manual' })
  P.add({ number: '612345678901', carrier: 'fedex', name: 'Desk lamp', source: 'manual' })
  P.update(P.list().find(p => p.number === '612345678901').id, { checked: Date.now() })   // not due for a check
  const a = P.list().find(p => p.name === 'New headphones')
  await L.__checkParcels(true)
  ok(P.list().find(p => p.id === a.id).status === 'out', 'the background check finds Out for delivery')
  const n = notes.find(x => /New headphones/.test(x.o.body))
  ok(!!n && n.shown && n.o.title === 'Lumen Parcels', 'a system notification says so: ' + (n && n.o.body))
  ok(await ex(`document.getElementById('toast').textContent.includes('New headphones') && !!document.querySelector('#toast .toast-btn')`), 'the toast says so too, with a View button')

  // clicking the notification opens Parcels on that parcel
  const tabs0 = w.tabs.size
  n.click(); await wait(400)
  const pt = await until(() => [...w.tabs.values()].find(t => /^lumen:\/\/parcels/.test(urlOf(t))))
  ok(!!pt && w.tabs.size === tabs0 + 1 && w.activeId === pt.id, 'clicking the notification opens Parcels in a new tab, in front')
  const px = s => pt.view.webContents.executeJavaScript(s)
  ok(await until(() => px(`(document.querySelector('.prow.pfocus') || {}).dataset?.id === ${JSON.stringify(a.id)}`), 4000), 'the parcel it was about lights up')
  ok(await until(() => px(`location.hash === ''`), 3000), 'and the address is tidied afterwards')
  await until(() => px(`!document.querySelector('.prow.pfocus')`), 4000)
  try { fs.mkdirSync('/tmp/lumen-shots', { recursive: true }); await wait(200); fs.writeFileSync('/tmp/lumen-shots/notify449.png', (await pt.view.webContents.capturePage()).toPNG()) } catch {}

  // the toast's View reuses the Parcels tab instead of opening another
  w.createTab(U('/'), { active: true }); await wait(900)
  const tabs1 = w.tabs.size
  w.send('parcel-news', { msg: 'New headphones: Out for delivery', id: a.id }); await wait(500)
  await ex(`document.querySelector('#toast .toast-btn').click()`); await wait(900)
  ok(w.tabs.size === tabs1 && w.activeId === pt.id && /^lumen:\/\/parcels/.test(urlOf(pt)), 'View in the toast goes back to the Parcels tab you already have')
  ok(await until(() => px(`!!document.querySelector('.prow.pfocus')`), 4000), 'and lights the parcel up again')

  // quitting while a check is loading a carrier page ends it right away
  P.update(a.id, { url: U('/slow'), checked: 0 })
  const run = L.__checkParcels(true); await wait(1500)
  ok(L.__parcelState().busy && L.__parcelState().win, 'a check is loading a slow carrier page')
  app.emit('before-quit', { preventDefault() {} })
  await wait(300)
  ok(!L.__parcelState().win, 'quitting closes that page at once')
  await Promise.race([run, wait(5000)])
  ok(!L.__parcelState().busy, 'and the check winds down instead of waiting for the page')
  P.update(a.id, { checked: 0 })
  await L.__checkParcels(true)
  ok(!L.__parcelState().win && !L.__parcelState().busy, 'no new check starts once Lumen is quitting')

  ok(!errors.length, 'no errors in the browser chrome' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
