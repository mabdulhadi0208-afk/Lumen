// 4.4.22: Downloads, made over. What is downloading now sits in a lit In progress card with its speed and the time
// left; files are grouped into In progress, Finished and Stopped; kind filters with counts and a search narrow the
// list; a check springs onto a file as it finishes; Copy download link; and the numbers of a finished file never turn
// back into "X of X" while another file downloads (a bug in 4.4.21). The History page draws faster (lag fix).
// Run: xvfb-run -a npx electron test/downloads4422.js --no-sandbox   (log: /tmp/lumen-downloads4422.log)
const fs = require('fs'), http = require('http'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-downloads4422', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-downloads4422')
fs.rmSync('/tmp/lumen-downloads4422-files', { recursive: true, force: true }); fs.mkdirSync('/tmp/lumen-downloads4422-files', { recursive: true }); app.setPath('downloads', '/tmp/lumen-downloads4422-files')
const LOG = '/tmp/lumen-downloads4422.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const guard = setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 170000)
// a local site: small files arrive at once; "slow" files trickle in (about 2.5 MB a second) until told to finish
let release = false
const site = http.createServer((q, r) => {
  const name = decodeURIComponent(q.url.slice(1))
  if (name.startsWith('slow')) {
    const total = 30 * 1024 * 1024; r.writeHead(200, { 'content-type': 'application/zip', 'content-length': total, 'content-disposition': `attachment; filename="${name}"` })
    let s = 0; const iv = setInterval(() => { if (r.destroyed) return clearInterval(iv); const n = release ? total - s : Math.min(256 * 1024, total - s); if (n > 0) { r.write(Buffer.alloc(n)); s += n } if (s >= total) { clearInterval(iv); r.end() } }, 100); return
  }
  r.writeHead(200, { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"` }); r.end(Buffer.alloc(60 * 1024))
}).listen(0, '127.0.0.1')
const L = require('../src/main.js')
app.on('window-all-closed', () => {})

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  const base = `http://127.0.0.1:${site.address().port}/`
  for (const n of ['Quarterly report.pdf', 'Holiday photo.jpg', 'Notes.docx', 'Podcast.mp3']) { w.ses.downloadURL(base + encodeURIComponent(n)); await wait(250) }
  await wait(800)
  w.ses.downloadURL(base + 'slow-dataset.zip'); await wait(2500)

  const t = w.createTab('lumen://downloads', { active: true }); await wait(3000)
  const pg = s => t.view.webContents.executeJavaScript(s)
  const errors = []; t.view.webContents.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })

  // main process: a live speed for the download that is still coming in
  const live = L.__downloads().find(d => d.state === 'progressing')
  ok(live && live.speed > 500 * 1024 && live.speed < 20 * 1024 * 1024, 'the live download has a speed: ' + (live && live.speed))
  ok(L.__downloads().every(d => !('_t' in d) && !('_r' in d) && !('_item' in d)), 'the list sent to pages carries no internal fields')

  // groups and the spotlight
  const groups = await pg(`[...document.querySelectorAll('.dlgroup')].map(x => x.textContent.trim())`)
  ok(groups.length === 2 && /^In progress\s*1$/.test(groups[0]) && /^Finished\s*4$/.test(groups[1]), 'downloads are grouped into In progress and Finished: ' + JSON.stringify(groups))
  const lv = await pg(`(() => { const r = document.querySelector('.dllist.live .dlrow'); return r && { text: r.querySelector('.d').textContent, bar: r.querySelector('.dlbar i').style.transform, tall: r.offsetHeight } })()`)
  ok(lv && /MB of 30\.0 MB/.test(lv.text) && /MB\/s/.test(lv.text) && /(s|min) left/.test(lv.text), 'the live row says its speed and the time left: ' + (lv && lv.text))
  ok(lv && /^scaleX\(0\.\d+\)$/.test(lv.bar), 'the live bar grows as a transform: ' + (lv && lv.bar))
  ok(lv && lv.tall >= 88, 'the In progress row is the bigger spotlight row: ' + (lv && lv.tall))
  const gl = await pg(`document.querySelector('#dlglance').textContent`)
  ok(/MB\/s right now/.test(gl), 'the glance card shows the total speed right now')

  // the 4.4.21 bug: while something downloads, the finished files must keep their own line (size, site, time)
  await wait(2200)
  const fin = await pg(`[...document.querySelectorAll('.dllist.done .dlrow .d')].map(x => x.textContent)`)
  ok(fin.length === 4 && fin.every(s => !/ of /.test(s) && /KB/.test(s) && /127\.0\.0\.1/.test(s) && /ago|just now/.test(s)), 'finished files keep their size, site and time while another downloads: ' + JSON.stringify(fin))
  ok(await pg(`document.querySelectorAll('.dllist.done .ftype.done .dlok').length === 4`), 'each finished file has its check')

  // kind filters: only kinds you have, with counts
  const kinds = await pg(`[...document.querySelectorAll('.dlseg [data-k]')].map(b => b.dataset.k + ':' + b.querySelector('em').textContent)`)
  ok(kinds.join() === 'all:5,docs:2,images:1,media:1,archives:1', 'kind filters show the kinds you have, with counts: ' + kinds.join())
  await pg(`document.querySelector('.dlseg [data-k="docs"]').click()`); await wait(300)
  let names = await pg(`[...document.querySelectorAll('.dlrow .dlname')].map(x => x.textContent)`)
  ok(names.length === 2 && names.every(n => /\.(pdf|docx)$/.test(n)), 'Documents shows only documents: ' + names.join())
  ok(await pg(`document.querySelector('.dlseg [data-k="docs"]').classList.contains('on') && !!document.querySelector('.dlseg.has-ind')`), 'the chosen filter is lit, with the spring indicator')
  await pg(`document.querySelector('.dlseg [data-k="all"]').click()`); await wait(300)

  // search by name or site
  await pg(`{ const q = document.getElementById('dlq'); q.value = 'holiday'; q.dispatchEvent(new Event('input')) }`); await wait(400)
  names = await pg(`[...document.querySelectorAll('.dlrow .dlname')].map(x => x.textContent)`)
  ok(names.length === 1 && names[0] === 'Holiday photo.jpg', 'search finds a download by name: ' + names.join())
  await pg(`{ const q = document.getElementById('dlq'); q.value = 'nothing like this'; q.dispatchEvent(new Event('input')) }`); await wait(400)
  ok(await pg(`/No downloads match/.test(document.getElementById('out').textContent)`), 'a search with no match says so')
  await pg(`{ const q = document.getElementById('dlq'); q.value = ''; q.dispatchEvent(new Event('input')) }`); await wait(400)

  // copy the download link
  await pg(`navigator.clipboard.writeText = async s => { window.__copied = s }; document.querySelector('.dllist.done .dlrow [data-a="copylink"]').click()`); await wait(300)
  ok(/^http:\/\/127\.0\.0\.1:\d+\/.+/.test(await pg('window.__copied')), 'Copy download link copies the address the file came from')

  try { fs.mkdirSync('/tmp/lumen-shots', { recursive: true }); fs.writeFileSync('/tmp/lumen-shots/downloads4422.png', (await t.view.webContents.capturePage()).toPNG()) } catch {}

  // the file finishes: it moves to Finished and its check springs in
  release = true
  let done = false; for (let i = 0; i < 60 && !done; i++) { await wait(250); done = L.__downloads().every(d => d.state === 'completed') }
  await wait(1600)
  const after = await pg(`({ groups: [...document.querySelectorAll('.dlgroup')].map(x => x.textContent.trim()), landed: [...document.querySelectorAll('.dlrow.landed .dlname')].map(x => x.textContent), glance: document.querySelector('#dlglance').textContent })`)
  ok(done && after.groups.length === 1 && /^Finished\s*5$/.test(after.groups[0]), 'when it finishes it joins Finished: ' + JSON.stringify(after.groups))
  ok(after.landed.length === 1 && after.landed[0] === 'slow-dataset.zip', 'the file that just finished lands with its check: ' + after.landed.join())
  ok(/All done/.test(after.glance), 'the glance card says All done')
  ok(L.__downloads().every(d => d.speed === 0 && d.ended > 0), 'finished downloads keep no speed and know when they ended')

  // remove one
  await pg(`document.querySelector('.dlrow [data-a="remove"]').click()`); await wait(900)
  ok(await pg(`document.querySelectorAll('.dlrow').length === 4`), 'Remove from list takes a row away')

  // the History page: drawn in one go, still with every row (lag fix)
  for (let i = 0; i < 500; i++) L.D.addHistory('https://site' + (i % 40) + '.example/p' + i, 'Page number ' + i)
  const h = w.createTab('lumen://history', { active: true }); await wait(3500)
  const hp = await h.view.webContents.executeJavaScript(`(async () => { const runs = []; for (let k = 0; k < 3; k++) { const t0 = performance.now(); await historyPage(document.getElementById('main')); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); runs.push(Math.round(performance.now() - t0)) } return { runs, rows: document.querySelectorAll('#out .row').length + document.querySelectorAll('#out .hmore').length } })()`)
  ok(hp.rows >= 20, 'History still lists the pages: ' + hp.rows)
  ok(Math.min(...hp.runs) < 400, 'History draws in under 400 ms with 500 pages: ' + hp.runs.join(', '))

  ok(!errors.length, 'no errors on the Downloads page' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''))
  clearTimeout(guard); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
