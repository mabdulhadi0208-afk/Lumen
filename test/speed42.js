// Lumen 4.2 "no lag anywhere": Settings sections switch in place (no reload, Back works), a preloaded Settings page
// opens Settings and the library pages (History, Bookmarks, Downloads...) at once and in step with the current
// settings, the web page is resized at most twice while the AI panel slides (never every frame), the command bar's
// glass never waits on a fresh page picture, and Lumen AI warms its connection and reads the page when the panel
// opens; Fast answers without thinking first. Against a local mock of the Claude API.
// Run: xvfb-run -a npx electron test/speed42.js --no-sandbox   (log: /tmp/lumen-speed42.log)
const fs = require('fs'), http = require('http'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-speed42', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-speed42')
const LOG = '/tmp/lumen-speed42.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const hits = { models: 0, posts: [] }
const mock = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/v1/models')) { hits.models++; res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"data":[{"id":"claude-haiku-5-5"}]}'); return }
  let b = ''; req.on('data', d => b += d); req.on('end', () => {
    let body = {}; try { body = JSON.parse(b) } catch {}
    hits.posts.push(body)
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    const sse = o => res.write(`event: ${o.type}\ndata: ${JSON.stringify(o)}\n\n`)
    sse({ type: 'message_start', message: { usage: { input_tokens: 10 } } })
    sse({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })
    sse({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Glass bends light.' } })
    sse({ type: 'content_block_stop', index: 0 }); sse({ type: 'message_delta', delta: { stop_reason: 'end_turn' } }); sse({ type: 'message_stop' }); res.end()
  })
}).listen(0, '127.0.0.1')
const site = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>Glass</title><body style="font:17px Georgia"><article><h1>Glass</h1>' + '<p>Glass has always been a material of light, bending what lies behind it.</p>'.repeat(20) + '</article></body>') }).listen(0, '127.0.0.1')
process.env.LUMEN_AI_API = 'http://127.0.0.1:9/v1/messages'
const L = require('../src/main.js'); const AI = require('../src/ai.js')
app.whenReady().then(async () => {
  await wait(4000); process.env.LUMEN_AI_API = `http://127.0.0.1:${mock.address().port}/v1/messages`
  const w = L.windows[0], ui = w.ui.webContents, ex = s => ui.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  w.win.setContentSize(1280, 820)
  L.D.addHistory('https://glass.example/a', 'Glass A')
  await wait(9000)   // the New Tab and Settings spares are made while Lumen is quiet

  // ---- the preloaded Settings page
  ok(!!w.setSpare && !!w.setSpare.readyAt, 'a Settings page is preloaded while Lumen is quiet')
  const spWc = w.setSpare && w.setSpare.view.webContents
  L.D.settings.set({ compact: true })    // changed after the preload: the page must show it
  let t = w.createTab('lumen://settings/'); await wait(700)
  ok(t.view && spWc && t.view.webContents.id === spWc.id, 'Cmd , takes the preloaded page')
  const pg = s => t.view.webContents.executeJavaScript(s)
  ok(await pg(`document.querySelector('.nav a.on') && document.querySelector('.nav a.on').dataset.sec === 'general' && !!document.querySelector('#main .card')`), 'it shows General, drawn')
  ok(await pg(`S.compact === true`), 'it reads the settings fresh when taken (a change made after the preload shows)')

  // ---- sections switch in place
  await pg(`window.__mark = Math.random(); true`)
  const mark = await pg('window.__mark')
  await pg(`document.querySelector('.nav a[data-sec="privacy"]').click(); true`); await wait(500)
  ok(await pg(`window.__mark`) === mark && await pg(`location.href`) === 'lumen://settings/privacy' && await pg(`document.querySelector('.nav a.on').dataset.sec`) === 'privacy', 'clicking a section switches in place: no reload, the address follows')
  ok(await pg(`document.body.dataset.view`) === 'privacy' && await pg(`!!document.querySelector('#main .card')`), 'the new section is drawn')
  await pg(`document.querySelector('.nav a[data-sec="history"]').click(); true`); await wait(600)
  ok(await pg(`window.__mark`) === mark && /lumen:\/\/settings\/history/.test(await pg('location.href')) && await pg(`document.body.dataset.view`) === 'history', 'History from the sidebar opens in place too')
  t.view.webContents.goBack(); await wait(600)
  ok(await pg(`location.href`) === 'lumen://settings/privacy' && await pg(`document.querySelector('.nav a.on').dataset.sec`) === 'privacy' && await pg(`window.__mark`) === mark, 'Back returns to the last section, still without a reload')
  ok(/settings\/privacy/.test(w.tabs.get(t.id).url), 'the tab knows its address (' + w.tabs.get(t.id).url + ')')
  // search, then a result opens in place and lights the row
  await pg(`(() => { const q = document.getElementById('setq'); q.value = 'compact'; q.dispatchEvent(new Event('input')) })()`); await wait(900)
  const hit = await pg(`(() => { const a = document.querySelector('#main a.hit'); if (!a) return ''; const h = a.getAttribute('href'); a.click(); return h })()`); await wait(900)
  ok(hit && await pg(`window.__mark`) === mark && await pg('location.href') === hit, 'a search result opens its section in place (' + hit + ')')
  // an open Settings tab and Cmd , with a section
  w.activate(w.order[0]); await wait(300)
  await ui.executeJavaScript(`api.do('openPage', 'settings/appearance')`).catch(() => {}); await wait(800)
  ok(w.activeId === t.id && await pg('location.href') === 'lumen://settings/appearance' && await pg(`window.__mark`) === mark, 'opening a section from elsewhere switches the open Settings tab in place')

  // ---- the next preloaded page becomes History at once
  await wait(4500)
  ok(!!w.setSpare && !!w.setSpare.readyAt, 'a new Settings page is preloaded right after one is taken')
  const sp2 = w.setSpare.view.webContents.id
  const t0 = Date.now(); const h = w.createTab('lumen://history'); await wait(400)
  ok(h.view.webContents.id === sp2 && await h.view.webContents.executeJavaScript(`document.body.dataset.view === 'history' && !!document.querySelector('.nav a.on[data-sec="history"]')`), 'Cmd Y takes the preloaded page and shows History in it')

  // ---- the AI panel: the page is not resized on every frame
  const site1 = w.createTab(`http://127.0.0.1:${site.address().port}/a`, { active: true }); await wait(1500)
  let layouts = 0; const lay0 = w.layout.bind(w); w.layout = (...a) => { layouts++; return lay0(...a) }
  await ex(`openAI(); true`); await wait(1600)
  const openN = layouts; layouts = 0
  await ex(`closeAI(); true`); await wait(1600)
  const closeN = layouts; w.layout = lay0
  ok(openN >= 1 && openN <= 3, `opening the AI panel resizes the page ${openN} time(s), not every frame`)
  ok(closeN >= 1 && closeN <= 3, `closing it resizes the page ${closeN} time(s)`)

  // ---- Lumen AI: warm and pre-read when the panel opens, no thinking on Fast
  AI.setKey('sk-ant-good-key-0123456789'); await wait(200)
  const m0 = hits.models
  await ex(`openAI(); true`); await wait(1200)
  ok(hits.models > m0, 'opening the panel warms the connection to the AI service (a free request)')
  const host = require('../src/ai-host.js')
  await ex(`aiRun('summarize'); true`); await wait(2000)
  const last = hits.posts[hits.posts.length - 1] || {}
  ok(last.thinking && last.thinking.type === 'disabled' && last.model === 'claude-haiku-5-5', 'Fast answers without thinking first (' + JSON.stringify(last.thinking) + ')')
  const doc = JSON.stringify(last.messages || '')
  ok(/material of light/.test(doc), 'the page text went with the question (pre-read)')
  L.D.settings.set({ aiModel: 'smart' }); await ex(`aiRun('chat', 'And why?'); true`).catch(() => {}); await wait(1500)
  const last2 = hits.posts[hits.posts.length - 1] || {}
  ok(!last2.thinking, 'Smart keeps thinking (no thinking override)')
  await ex(`closeAI(); true`)

  // ---- the command bar: its glass uses the last picture at once
  await wait(2000); const act = w.active(); act.thumbImg = null; await wait(500); fs.appendFileSync(LOG, 'before open thumbImg=' + !!act.thumbImg + ' active=' + act.url + '\n'); let firstSnap = 0; const tOpen = Date.now(); act.thumb = 'old'
  const poll = setInterval(() => { if (!firstSnap && (act.thumbImg || act.thumb !== 'old')) firstSnap = Date.now() - tOpen }, 10)
  await ex(`openCmd(); true`); await wait(1400); clearInterval(poll)
  ok(firstSnap > 400, 'the command bar does not take a fresh page picture while it opens (first one at ' + firstSnap + ' ms)')
  await ex(`closeCmd(true); true`)

  console.log(fails ? `SPEED42 ${fails} FAILED` : 'SPEED42 ALL PASS'); fs.appendFileSync(LOG, fails ? `${fails} FAILED\n` : 'ALL PASS\n')
  mock.close(); site.close(); app.exit(fails ? 1 : 0)
})
