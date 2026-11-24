// Google sign-in: one consistent Chrome identity everywhere (page, HTTP, workers, Google's own page), no Electron marks,
// and an automatic switch to compatibility mode when Google shows "This browser or app may not be secure".
const http = require('http'), fs = require('fs'); const { app } = require('electron')
let seen = []
http.createServer((q, r) => {
  seen.push({ url: q.url, ua: q.headers['user-agent'], ch: q.headers['sec-ch-ua'] || '' })
  if (q.url === '/w.js') { r.setHeader('content-type', 'text/javascript'); return r.end(`postMessage(navigator.userAgent)`) }
  r.setHeader('content-type', 'text/html'); r.end(`<title>UA</title><body>ua</body>`)
}).listen(48270)
fs.rmSync('/tmp/lumen-gsi', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-gsi')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-gsignin.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
app.whenReady().then(async () => {
  await wait(3500); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  ok(L.D.settings.get('googleSignInMode') === 'chrome', 'standard mode by default')

  const t = w.createTab('http://127.0.0.1:48270/', { active: true }); await wait(1800)
  const pg = s => t.view.webContents.executeJavaScript(s)
  const jsUA = await pg('navigator.userAgent'), httpUA = seen[seen.length - 1].ua
  const workerUA = await pg(`new Promise(r => { const wk = new Worker('/w.js'); wk.onmessage = e => r(e.data) })`)
  LOG('    ' + jsUA)
  ok(!/Electron|Lumen/i.test(jsUA + httpUA + workerUA), 'no Electron or Lumen in any identity')
  ok(/Chrome\/\d+\.0\.0\.0 Safari\/537\.36$/.test(jsUA), 'reduced Chrome version, like real Chrome')
  ok(jsUA === httpUA && jsUA === workerUA, 'page, HTTP and worker all say the same thing')
  ok(/Chromium/.test(seen[seen.length - 1].ch || '') || seen.some(s => /Chromium/.test(s.ch)), 'client hints say Chromium: ' + (seen[seen.length - 1].ch || '(none on http)'))
  ok(await pg(`navigator.webdriver === false`), 'not flagged as automated')

  // Google's own sign-in page sees the same Chrome identity in standard mode
  const g = w.createTab('https://accounts.google.com/ServiceLogin', { active: true }); await wait(7000)
  const gUA = await g.view.webContents.executeJavaScript('navigator.userAgent').catch(() => '')
  if (/accounts\.google\.com/.test(g.view.webContents.getURL())) ok(gUA === jsUA, 'Google sign-in page sees the same Chrome identity: ' + gUA)
  else LOG('SKIP Google page not reachable here')

  // Google rejects: Lumen switches mode once and starts the sign-in again
  g.view.webContents.loadURL('https://accounts.google.com/signin/rejected?continue=' + encodeURIComponent('https://mail.google.com/')); await wait(6000)
  if (/accounts\.google\.com/.test(g.view.webContents.getURL())) {
    ok(L.D.settings.get('googleSignInMode') === 'firefox', 'blocked page switches to compatibility mode')
    ok(/ServiceLogin|signin|identifier/.test(g.view.webContents.getURL()) && !/rejected/.test(g.view.webContents.getURL()), 'and restarts the sign-in: ' + g.view.webContents.getURL().slice(0, 90))
    await wait(4000)
    const fUA = await g.view.webContents.executeJavaScript('navigator.userAgent').catch(() => '')
    ok(/Firefox\//.test(fUA), 'compatibility mode presents as Firefox on the sign-in page')
    ok(/Toast|Google blocked|another mode/i.test(await ex(`document.getElementById('toast').textContent`)), 'and tells you')
  } else LOG('SKIP Google rejected page not reachable here')

  // the setting is in Privacy
  const s = w.createTab('lumen://settings/privacy', { active: true }); await wait(1800)
  ok(await s.view.webContents.executeJavaScript(`!!document.querySelector('[data-seg=googleSignInMode]')`), 'Google sign-in switch in Settings, Privacy')
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
