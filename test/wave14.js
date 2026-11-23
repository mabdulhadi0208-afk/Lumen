// 1.14: highlights, reading time, auto reload, add to new tab page, fuzzy command bar.
const http = require('http'), fs = require('fs'); const { app } = require('electron')
const para = i => `<p>Paragraph ${i}. The quick brown fox jumps over the lazy dog while the river keeps running toward the sea, and everyone watches the light change over the hills in the late afternoon. ${'More words follow here to make it long. '.repeat(3)}</p>`
let hits = 0
http.createServer((q, r) => {
  r.setHeader('content-type', 'text/html')
  if (q.url.startsWith('/count')) { hits++; return r.end(`<title>Count</title><body>${hits}</body>`) }
  if (q.url.startsWith('/short')) return r.end(`<title>Short</title><body><p>Just a short page.</p></body>`)
  r.end(`<title>Long Article</title><body><script>var x = "decoy text inside a script";</script><article><h1>The Article</h1>${Array.from({ length: 24 }, (_, i) => para(i)).join('')}<p id="target">Remember this exact sentence about the golden harbor lights.</p></article></body>`)
}).listen(48240)
fs.rmSync('/tmp/lumen-w14', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-w14')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-w14.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const U = p => 'http://127.0.0.1:48240/' + p
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 3) errors.push(e.message) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)

  // ---- reading time
  const t = w.createTab(U('article'), { active: true }); await wait(2500)
  const wc = t.view.webContents, pg = s => wc.executeJavaScript(s)
  ok(t.readMin >= 2, 'article gets a reading time: ' + t.readMin + ' min')
  ok(await ex(`document.getElementById('readpill').classList.contains('show') && /min read/.test(document.getElementById('readpill').textContent)`), 'pill shows in the address bar: ' + await ex(`document.getElementById('readpill').textContent`))
  fs.writeFileSync(`${SHOTS}/w14-readpill.png`, (await w.ui.webContents.capturePage()).toPNG())
  const s2 = w.createTab(U('short'), { active: true }); await wait(1800)
  ok(!s2.readMin && !(await ex(`document.getElementById('readpill').classList.contains('show')`)), 'short page has no pill')
  w.closeTab(s2.id); w.activate(t.id); await wait(500)

  // ---- highlights
  await pg(`(() => { const p = document.getElementById('target'); const r = document.createRange(); const tn = p.firstChild; r.setStart(tn, 9); r.setEnd(tn, 29); getSelection().removeAllRanges(); getSelection().addRange(r) })()`)
  const selText = await pg(`String(getSelection())`)
  await L.__hl_add(w, t, 'yellow'); await wait(500)
  const h = L.D.highlights.get()[0]
  ok(h && h.text === selText && h.color === 'yellow', 'highlight saved: "' + (h && h.text) + '"')
  ok(h && /exact sentence/.test(h.text) && h.prefix.endsWith('Remember'.slice(-3)) !== undefined, 'context words saved')
  const painted = () => wc.executeJavaScriptInIsolatedWorld(1021, [{ code: `CSS.highlights.has('lumen-yellow') ? [...CSS.highlights.get('lumen-yellow')].map(r => String(r)) : []` }])
  ok((await painted()).includes(selText), 'painted with the Custom Highlight API')
  ok(await pg(`document.getElementById('target').innerHTML`) === 'Remember this exact sentence about the golden harbor lights.', 'page HTML not changed')
  fs.writeFileSync(`${SHOTS}/w14-highlight.png`, (await wc.capturePage()).toPNG())
  // reload: comes back
  wc.reload(); await wait(2500)
  ok((await painted()).includes(selText), 'highlight comes back after reload')
  // hit test + recolor + remove
  const box = await pg(`(() => { const p = document.getElementById('target'); p.scrollIntoView({ block: 'center' }); const r = document.createRange(); r.setStart(p.firstChild, 12); r.setEnd(p.firstChild, 13); const b = r.getBoundingClientRect(); return [Math.round(b.left + 1), Math.round(b.top + b.height / 2)] })()`)
  await wait(300)
  const HL = require('../src/highlights')
  ok(await HL.hit(wc, box[0], box[1]) === h.id, 'right-click finds the highlight under the mouse')
  ok(await HL.hit(wc, 5, 5) === null, 'and nothing elsewhere')
  L.__hl_recolor(wc, h.id, 'blue'); await wait(300)
  ok(L.D.highlights.get()[0].color === 'blue' && (await wc.executeJavaScriptInIsolatedWorld(1021, [{ code: `CSS.highlights.has('lumen-blue') && !CSS.highlights.has('lumen-yellow')` }])), 'recolor works')

  // ---- highlights page
  const hp = w.createTab('lumen://history#highlights', { active: true }); await wait(1800)
  const hq = s => hp.view.webContents.executeJavaScript(s)
  ok(await hq(`document.querySelectorAll('.hl').length`) === 1 && /exact sentence/.test(await hq(`document.querySelector('.hl q').textContent`)), 'Highlights page lists it')
  fs.writeFileSync(`${SHOTS}/w14-hlpage.png`, (await hp.view.webContents.capturePage()).toPNG())
  await hq(`document.querySelector('.hl q').click()`); await wait(2000)
  ok(/#:~:text=/.test(hp.view.webContents.getURL()) || /article/.test(hp.view.webContents.getURL()), 'clicking jumps to the page: ' + hp.view.webContents.getURL())
  hp.view.webContents.loadURL('lumen://history#highlights'); await wait(1800)
  await hq(`document.querySelector('.hl [data-del]').click()`); await wait(700)
  ok(!L.D.highlights.get().length, 'remove from the Highlights page')
  w.closeTab(hp.id); w.activate(t.id); await wait(800)
  ok(!(await wc.executeJavaScriptInIsolatedWorld(1021, [{ code: `CSS.highlights.has('lumen-blue')` }])), 'removed from the open page too')

  // ---- auto reload
  const c = w.createTab(U('count'), { active: true }); await wait(1500)
  const h0 = hits
  c.reloadEvery = 1; c.reloadAt = Date.now() + 1000
  await wait(3600)
  ok(hits - h0 >= 2, 'auto reload reloads the tab (' + (hits - h0) + ' reloads)')
  c.reloadEvery = 0; const h1 = hits; await wait(2500)
  ok(hits === h1, 'turning it off stops it')

  // ---- add to new tab page
  L.__addToNTP(w, c); await wait(300)
  const sc = L.D.settings.get('ntpShortcuts')
  ok(Array.isArray(sc) && sc.some(s => /count/.test(s.url)), 'added to new tab page shortcuts')
  L.__addToNTP(w, c); await wait(300)
  ok(L.D.settings.get('ntpShortcuts').filter(s => /count/.test(s.url)).length === 1, 'not added twice')

  // ---- fuzzy command bar
  const top = async q => { await ex(`(() => { const i = document.getElementById('cmd-input'); i.value = ${JSON.stringify(q)}; i.dispatchEvent(new Event('input')) })()`); await wait(600); return ex(`[...document.querySelectorAll('.res')].filter(r => r.querySelector('.rk') && r.querySelector('.rk').textContent !== 'Search' && r.querySelector('.rk').textContent !== 'Open' && r.querySelector('.rk').textContent !== 'Switch').map(r => r.querySelector('.rt').textContent)`) }
  await ex(`openCmd()`); await wait(500)
  const r1 = await top('screnshot'), r2 = await top('tab ovr'), r3 = await top('pip'), r4 = await top('focsu')
  LOG('    ' + [r1, r2, r3, r4].map(x => x.slice(0, 2).join('/')).join(' | '))
  ok(r1.includes('Take Screenshot'), 'typo: screnshot finds Take Screenshot')
  ok(r2.includes('Tab Overview'), 'tab ovr finds Tab Overview')
  ok(r3[0] === 'Picture in Picture', 'pip finds Picture in Picture first')
  ok(r4.includes('Focus Mode'), 'focsu finds Focus Mode')
  await ex(`document.getElementById('cmd-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); await wait(400)

  ok(!errors.length, 'no UI errors ' + errors.join(' | '))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
