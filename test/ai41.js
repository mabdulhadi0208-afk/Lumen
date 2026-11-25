// Lumen AI 4.1: the Ask Lumen panel, the command bar answers and actions, the selection bubble, writing help and
// Settings, all against a local mock of the Claude API (LUMEN_AI_API) that streams fake SSE answers.
// Prints PASS and FAIL lines (also to /tmp/lumen-ai41.log) and writes screenshots to /tmp/lumen-shots/41-ai-*.png.
//   xvfb-run -a npx electron test/ai41.js --no-sandbox
process.env.LUMEN_NATIVE_MENUS = '1'
const fs = require('fs'), http = require('http')
const { app, BrowserWindow, nativeTheme, dialog } = require('electron')
fs.rmSync('/tmp/lumen-ai41', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-ai41')
dialog.showMessageBox = async () => ({ response: 0 })
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const LOGF = '/tmp/lumen-ai41.log'; try { fs.unlinkSync(LOGF) } catch {}
let fails = 0, passes = 0
const LOG = m => { console.log(m); try { fs.appendFileSync(LOGF, m + '\n') } catch {} }
const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (c) passes++; else fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))

// ---------------------------------------------------------------- the mock Claude API
const posts = []   // every POST /v1/messages: { key, body, aborted }
const slowSeen = new Set()
const textOf = c => typeof c === 'string' ? c : (c || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
const ANSWER = [
  '## Glass in short\n\nGlass is **amorphous**: its atoms have no tidy order, so it lets light straight through.',
  { cite: true, text: ' That is why the page calls it a material of light.' },
  '\n\n- It is mostly *silica*\n- Soda lowers the melting point, see `Na2CO3`\n  - nested detail\n\n```js\nconst glass = { clear: true }\n```\n\n| Kind | Use |\n| --- | --- |\n| Soda-lime | Windows |\n| Borosilicate | Labware |\n\nSafety: <script>window.__pwned = 1</script> and <img src=x onerror="window.__pwned=2"> and [bad link](javascript:alert(1)) stay plain text. Read more at https://example.com/glass.\n',
]
const sse = (res, ev) => res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`)
async function streamAnswer(req, res, body) {
  const last = textOf(body.messages[body.messages.length - 1].content)
  const first = body.messages[0].content
  const doc = Array.isArray(first) ? first.find(b => b.type === 'document') : null
  const docText = doc ? doc.source.data : ''
  let aborted = false; const rec = posts[posts.length - 1]
  res.on('close', () => { if (!res.writableEnded) { aborted = true; rec.aborted = true } })
  res.writeHead(200, { 'content-type': 'text/event-stream' })
  sse(res, { type: 'message_start', message: { usage: { input_tokens: 10, cache_read_input_tokens: 0 } } })
  const words = async (idx, text, ms) => {
    sse(res, { type: 'content_block_start', index: idx, content_block: { type: 'text', text: '' } })
    for (let i = 0; i < text.length && !aborted; i += 6) { sse(res, { type: 'content_block_delta', index: idx, delta: { type: 'text_delta', text: text.slice(i, i + 6) } }); await wait(ms) }
  }
  if (/SLOW/.test(last) && !slowSeen.has(last)) {
    slowSeen.add(last)
    await words(0, 'This answer takes its time. '.repeat(60), 40)
    if (!aborted) { sse(res, { type: 'content_block_stop', index: 0 }); sse(res, { type: 'message_delta', delta: { stop_reason: 'end_turn' } }); sse(res, { type: 'message_stop' }); res.end() }
    return
  }
  if (body.system && /Do exactly the task asked/.test(body.system)) {
    await words(0, 'Hello, world. This reads much better now.', 10)
    sse(res, { type: 'content_block_stop', index: 0 }); sse(res, { type: 'message_delta', delta: { stop_reason: 'end_turn' } }); res.end(); return
  }
  let i = 0
  for (const part of ANSWER) {
    if (aborted) return
    if (typeof part === 'string') { await words(i, part, 14); sse(res, { type: 'content_block_stop', index: i }) }
    else {
      sse(res, { type: 'content_block_start', index: i, content_block: { type: 'text', text: '', citations: [] } })
      const m = docText.match(/Glass has always[^.]*\./) || [docText.slice(0, 80)]
      const docs = Array.isArray(first) ? first.filter(b => b.type === 'document').length : 0
      sse(res, { type: 'content_block_delta', index: i, delta: { type: 'citations_delta', citation: { type: 'char_location', cited_text: m[0], document_index: Math.max(0, docs - 1), document_title: doc ? doc.title : '', start_char_index: 0, end_char_index: 10 } } })
      sse(res, { type: 'content_block_delta', index: i, delta: { type: 'text_delta', text: part.text } })
      sse(res, { type: 'content_block_stop', index: i })
    }
    i++
  }
  sse(res, { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 99 } }); sse(res, { type: 'message_stop' }); res.end()
}
const mock = http.createServer((req, res) => {
  const key = req.headers['x-api-key'] || ''
  if (req.method === 'GET' && req.url.startsWith('/v1/models')) {
    if (/bad/.test(key)) { res.writeHead(401, { 'content-type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })); return }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [{ id: 'claude-haiku-5-5' }] })); return
  }
  let b = ''; req.on('data', d => b += d); req.on('end', () => {
    let body = {}; try { body = JSON.parse(b) } catch {}
    posts.push({ key, body, headers: req.headers, aborted: false })
    if (/bad/.test(key)) { res.writeHead(401, { 'content-type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })); return }
    if (/rate/.test(key)) { res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '12' }); res.end(JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'rate limited' } })); return }
    if (/busy/.test(key)) { res.writeHead(529, { 'content-type': 'application/json' }); res.end(JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } })); return }
    if (!body.stream) {
      // the command bar planner
      const txt = textOf(body.messages[0].content)
      const yt = [...txt.matchAll(/^(\d+)\t[^\n]*YouTube[^\n]*$/gm)].map(m => +m[1])
      const reply = /close/i.test(txt.split('\n')[0]) ? { reply: `Closing your ${yt.length} YouTube tabs.`, actions: [{ do: 'close', tabs: yt }] } : { reply: 'Nothing to do.', actions: [] }
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(reply) }], stop_reason: 'end_turn' })); return
    }
    streamAnswer(req, res, body).catch(() => {})
  })
}).listen(0, '127.0.0.1')

// ---------------------------------------------------------------- web pages
const PARA = i => `<p>Paragraph ${i}. Makers learned to read the moods of the furnace, the way molten glass slumps and gathers, the way a rim holds a thread of colour that the middle never shows.</p>`
const ARTICLE = `<!doctype html><title>The quiet art of glass</title><style>body{margin:0;font:17px/1.6 Georgia,serif;color:#1b1d24;background:linear-gradient(160deg,#fff4f9,#eef3ff)}main{padding:40px 60px;max-width:760px}</style><main><article><h1>The quiet art of glass</h1>${Array.from({ length: 14 }, (_, i) => PARA(i + 1)).join('')}<p id="key">Glass has always been a material of light, bending what lies behind it and catching the sun at its edges.</p>${Array.from({ length: 10 }, (_, i) => PARA(i + 20)).join('')}</article></main>`
const SECOND = `<!doctype html><title>Notes on a slower internet</title><body style="font:17px/1.6 Georgia,serif;padding:40px 60px;background:#f7fbff"><article><h1>Notes on a slower internet</h1><p>Glass has always been a good metaphor for screens, the author argues.</p>${PARA(1)}</article></body>`
const YT = n => `<!doctype html><title>Cat video ${n} - YouTube</title><body style="background:#111;color:#eee;font:18px system-ui;padding:40px"><h1>Cat video ${n}</h1></body>`
const FORM = `<!doctype html><title>Write a note</title><body style="font:16px system-ui;padding:40px;background:#fff"><h1>Write a note</h1><textarea id="ta" style="width:600px;height:120px;font:16px system-ui">helo wrold this is my note</textarea></body>`
const site = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' })
  if (req.url.startsWith('/youtube')) return res.end(YT(req.url.slice(-1)))
  res.end({ '/article': ARTICLE, '/second': SECOND, '/form': FORM }[req.url] || ARTICLE)
}).listen(0, '127.0.0.1')

const API_URL = () => `http://127.0.0.1:${mock.address().port}/v1/messages`
process.env.LUMEN_AI_API = 'http://127.0.0.1:9/v1/messages'   // set for real once the mock is listening
const L = require('../src/main.js')
const AI = require('../src/ai.js')
const AIHost = require('../src/ai-host.js')
app.quit = () => {}

let painter = null
async function shot(w, name) {
  try {
    const parts = []
    for (const v of w.win.contentView.children) {
      if (v.getVisible && !v.getVisible()) continue
      const b = v.getBounds(); if (b.width < 2) continue
      const img = await Promise.race([v.webContents.capturePage(), wait(1500).then(() => null)]); if (!img || img.isEmpty()) continue
      parts.push({ src: img.toDataURL(), ...b })
    }
    const [W, H] = w.win.getContentSize()
    if (!painter) { painter = new BrowserWindow({ show: false, width: 200, height: 200 }); await painter.loadURL('data:text/html,<body></body>') }
    const url = await painter.webContents.executeJavaScript(`(async () => {
      const c = document.createElement('canvas'); c.width = ${W}; c.height = ${H}; const x = c.getContext('2d')
      x.fillStyle = '#888'; x.fillRect(0, 0, ${W}, ${H})
      for (const p of ${JSON.stringify(parts)}) { const im = new Image(); im.src = p.src; await im.decode(); x.drawImage(im, p.x, p.y, p.width, p.height) }
      return c.toDataURL('image/png') })()`)
    const f = `${SHOTS}/41-ai-${name}.png`
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'))
    LOG('    shot ' + f)
  } catch (e) { LOG('    shot failed ' + name + ': ' + e.message) }
}

app.whenReady().then(() => main().catch(e => { LOG('FAIL test crashed: ' + (e && e.stack || e)); finish() }))
function finish() {
  LOG(errs.length ? 'ERRORS\n' + errs.join('\n') : 'NO ERRORS')
  LOG(`ai41: ${passes} passed, ${fails} failed`)
  try { mock.close(); site.close() } catch {}
  setTimeout(() => app.exit(fails || errs.length ? 1 : 0), 300)
}
async function until(fn, ms = 6000, step = 60) { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await wait(step) } return null }

async function main() {
  await wait(5000)
  process.env.LUMEN_AI_API = API_URL()
  const w = L.windows[0]
  const uiErrs = []
  w.ui.webContents.on('console-message', (e) => { const lv = e.level !== undefined ? e.level : arguments[1]; if (lv === 'error' || lv === 3) uiErrs.push(e.message) })
  const ex = s => w.ui.webContents.executeJavaScript(s)
  const tabWc = () => w.active().view.webContents
  const inPage = s => tabWc().executeJavaScript(s)
  const isoPage = (s, world = 1018) => tabWc().executeJavaScriptInIsolatedWorld(world, [{ code: s }])
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`).catch(() => {}); await wait(2200)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`).catch(() => {}); await wait(1000)
  w.win.setContentSize(1360, 860); await wait(500)
  const base = `http://127.0.0.1:${site.address().port}`
  const open = async (path, active = true) => { const t = w.createTab(base + path, { active }); await until(() => t.view && !t.view.webContents.isLoading() && t.view.webContents.getURL().includes(path), 8000); await wait(300); return t }
  const art = await open('/article')
  const cnt = () => posts.length
  const bubbleOn = async sel => until(async () => { await inPage(sel + `; document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }))`); await wait(450); return isoPage(`__lumenAISel.shown()`, 999).catch(() => false) }, 6000, 300)
  const SEL_P = `(() => { const p = document.getElementById('key'); const r = document.createRange(); r.selectNodeContents(p); getSelection().removeAllRanges(); getSelection().addRange(r) })()`
  const SEL_W = `(() => { const t = document.getElementById('key').firstChild; const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 5); getSelection().removeAllRanges(); getSelection().addRange(r) })()`

  // ---------------------------------------------------------------- nothing is sent without the user asking
  await ex(`openAI()`); await wait(900)
  ok(await ex(`document.getElementById('aipanel').classList.contains('nokey')`), 'no key: the panel shows the key setup')
  ok(await ex(`!!document.querySelector('#aipanel .a4-setup .a4-steps') && document.querySelectorAll('#aipanel .a4-steps li').length === 3`), 'no key: three setup steps')
  await shot(w, 'nokey-light')
  await ex(`aiRun('summarize')`); await wait(500)
  ok(cnt() === 0, 'no key: asking sends nothing')
  await ex(`closeAI()`); await wait(400)
  AI.setKey('sk-ant-good-key-0123456789')
  art.view.webContents.reload(); await until(() => !art.view.webContents.isLoading(), 6000); await wait(500)
  await ex(`openAI()`); await wait(900)
  ok(await ex(`!document.getElementById('aipanel').classList.contains('nokey')`), 'with a key the panel is ready')
  ok(await ex(`!!document.querySelector('#aipanel .a4-welcome .a4-sug')`), 'welcome suggestions shown')
  await shot(w, 'welcome-light')
  // select text, open the command bar and type a question, switch tabs: still nothing sent
  await inPage(`(() => { const p = document.getElementById('key'); const r = document.createRange(); r.selectNodeContents(p); getSelection().removeAllRanges(); getSelection().addRange(r); p.scrollIntoView(); document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 })) })()`); await wait(400)
  await ex(`openCmd('newtab')`); await wait(300)
  await ex(`cmdInput.value = 'what is glass made of?'; cmdInput.dispatchEvent(new Event('input'))`); await wait(500)
  ok(await ex(`results.length > 0 && results[0].ai === true && /Ask Lumen AI/.test(results[0].sub)`), 'command bar offers Ask Lumen AI for a question (first row)')
  await ex(`closeCmd(true)`); await wait(300)
  ok(cnt() === 0, 'no request is made without a user action (panel, selection, command bar typing): ' + cnt())

  // ---------------------------------------------------------------- the selection bubble
  const sel = await until(() => isoPage(`globalThis.__lumenAISel ? { shown: __lumenAISel.shown(), acts: __lumenAISel.actions() } : null`, 999).catch(() => null), 3000)
  if (sel && !sel.shown) { await inPage(`document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }))`); await wait(400) }
  const sel2 = await isoPage(`globalThis.__lumenAISel ? { shown: __lumenAISel.shown(), acts: __lumenAISel.actions() } : null`, 999).catch(() => null)
  ok(sel2 && sel2.shown, 'selection bubble appears over selected text')
  ok(sel2 && ['explain', 'translate', 'rewrite', 'ask'].every(a => sel2.acts.includes(a)) && sel2.acts.length === 4, 'selection bubble actions: ' + (sel2 && sel2.acts.join(',')))
  await ex(`closeAI()`); await wait(700)
  // the page view was resized by the panel closing, which dismisses the bubble: select again
  const again = await until(async () => { await inPage(`document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }))`); await wait(400); return isoPage(`__lumenAISel.shown()`, 999) }, 5000, 300)
  ok(again, 'bubble shows again after a new selection')
  await shot(w, 'bubble-light')
  // 4.1.1: the bubble sits under the end of the selection as a small orb, never over the selected text or the line above
  await wait(500)
  const geo = await inPage(`(() => { const q = [...getSelection().getRangeAt(0).getClientRects()].filter(x => x.width && x.height); return { top: q[0].top, bottom: q.at(-1).bottom, right: q.at(-1).right } })()`)
  const bo1 = await isoPage(`({ mini: __lumenAISel.mini(), r: __lumenAISel.rect() })`, 999)
  ok(bo1.mini && bo1.r.width < 60, 'bubble starts as a small orb: ' + Math.round(bo1.r.width) + 'px')
  ok(bo1.r.top >= geo.bottom - 1 || bo1.r.bottom <= geo.top + 1, 'bubble does not cover the selected text or the line above (bubble top ' + Math.round(bo1.r.top) + ', selection ' + Math.round(geo.top) + '-' + Math.round(geo.bottom) + ')')
  ok(Math.abs((bo1.r.left + bo1.r.width / 2) - geo.right) < 40, 'orb sits at the end of the selection (orb centre ' + Math.round(bo1.r.left + bo1.r.width / 2) + ', selection end ' + Math.round(geo.right) + ')')
  await isoPage(`__lumenAISel.open()`, 999); await wait(800)
  const bo2 = await isoPage(`({ mini: __lumenAISel.mini(), r: __lumenAISel.rect() })`, 999)
  const vis = await isoPage(`__lumenAISel.rect()`, 999)
  ok(!bo2.mini, 'hovering the orb opens the full bar')
  ok(Math.abs(bo2.r.top - bo1.r.top) < 1 && (bo2.r.top >= geo.bottom - 1 || bo2.r.bottom <= geo.top + 1), 'the open bar stays under the selection')
  ok(vis.right <= 1360 + 1 && vis.left >= 0, 'the open bar stays on screen')
  await shot(w, 'bubble-open-light')
  ok(cnt() === 0, 'showing the bubble sends nothing')
  await isoPage(`__lumenAISel.press('explain')`, 999); await wait(300)
  await until(() => ex(`!!document.querySelector('#aipanel .ai-msg.bot') && !document.getElementById('aipanel').classList.contains('busy')`), 8000)
  ok(cnt() === 1 && /Explain this passage/.test(textOf(posts[0].body.messages.at(-1).content)) && /Glass has always been a material of light/.test(textOf(posts[0].body.messages.at(-1).content)), 'bubble Explain asks about the selected passage')
  ok(await ex(`/Explain this/.test((document.querySelector('#aipanel .ai-msg.user') || {}).innerText) && !!document.querySelector('#aipanel .ai-msg.user blockquote')`), 'explain shows the quoted passage')
  // a single word offers Define
  await bubbleOn(SEL_W)
  const s3 = await isoPage(`({ shown: __lumenAISel.shown(), acts: __lumenAISel.actions() })`, 999)
  ok(s3.shown && s3.acts.includes('define') && !s3.acts.includes('summarize'), 'one word offers Define')
  await isoPage(`__lumenAISel.press('define')`, 999); await wait(300)
  await until(() => posts.length >= 2 && ex(`!document.getElementById('aipanel').classList.contains('busy')`), 8000)
  ok(/Define "Glass"/.test(textOf(posts[1].body.messages.at(-1).content)), 'Define sends the word')
  await bubbleOn(SEL_P)
  await isoPage(`__lumenAISel.press('translate')`, 999); await wait(300)
  await until(() => posts.length >= 3 && ex(`!document.getElementById('aipanel').classList.contains('busy')`), 8000)
  ok(/^Translate this text into /.test(textOf(posts[2].body.messages.at(-1).content)), 'Translate sends the passage with the target language')
  await bubbleOn(SEL_P)
  await isoPage(`__lumenAISel.press('ask')`, 999); await wait(600)
  ok(await ex(`!document.getElementById('ai-quote').hidden && /Glass has always/.test(document.getElementById('ai-quote-t').textContent)`), 'Ask puts the passage above the composer')
  ok(posts.length === 3, 'Ask waits for the question')
  await ex(`document.getElementById('ai-quote-x').click()`)

  // ---------------------------------------------------------------- streaming, markdown, safety, citations
  await ex(`document.getElementById('ai-clear').click()`); await wait(300)
  const before = posts.length
  await ex(`aiRun('summarize')`)
  let partial = false
  for (let i = 0; i < 120 && !partial; i++) {
    await wait(25)
    partial = await ex(`(() => { const m = document.querySelector('#aipanel .ai-msg.bot.streaming .a4-md'); return !!m && m.innerText.length > 10 && m.innerText.length < 200 && !!m.querySelector('.a4-caret') })()`)
  }
  ok(partial, 'streaming: text appears a little at a time with a caret')
  await until(() => ex(`!document.getElementById('aipanel').classList.contains('busy') && !document.querySelector('#aipanel .ai-msg.bot.streaming')`), 8000)
  await wait(400)
  const req1 = posts[before].body
  ok(req1.model === 'claude-haiku-5-5' && req1.stream === true && req1.output_config && req1.output_config.effort === 'low', 'request: Fast tier, streaming, low effort')
  const d1 = Array.isArray(req1.messages[0].content) && req1.messages[0].content.find(b => b.type === 'document')
  ok(d1 && d1.citations && d1.citations.enabled && /Glass has always/.test(d1.source.data) && d1.title === 'The quiet art of glass', 'page sent as a citable document')
  ok(d1 && d1.cache_control && d1.cache_control.type === 'ephemeral' && req1.cache_control && req1.cache_control.type === 'ephemeral', 'prompt caching on the page block and the conversation')
  ok(posts[before].headers['x-api-key'] === 'sk-ant-good-key-0123456789' && posts[before].headers['anthropic-version'] === '2023-06-01', 'key sent only in the request header')
  const md = await ex(`(() => { const m = [...document.querySelectorAll('#aipanel .ai-msg.bot .a4-md')].pop(); return { h: m.querySelectorAll('h3').length, li: m.querySelectorAll('ul li').length, nested: m.querySelectorAll('ul ul li').length, code: !!m.querySelector('.a4-code pre code') && /const glass/.test(m.querySelector('.a4-code code').textContent), copy: !!m.querySelector('.a4-code [data-copy]'), th: m.querySelectorAll('.a4-table th').length, td: m.querySelectorAll('.a4-table td').length, strong: m.querySelectorAll('strong').length, em: m.querySelectorAll('em').length, inl: m.querySelectorAll('p code, li code').length, link: [...m.querySelectorAll('a.a4-link')].map(a => a.dataset.url), cite: m.querySelectorAll('.a4-cite').length, text: m.innerText } })()`)
  ok(md.h === 1 && md.li >= 2 && md.nested === 1, 'markdown: heading, list, nested list')
  ok(md.code && md.copy, 'markdown: code block with a copy button')
  ok(md.th === 2 && md.td === 4, 'markdown: table')
  ok(md.strong >= 1 && md.em >= 1 && md.inl >= 1, 'markdown: bold, italic, inline code')
  ok(md.link.length === 1 && md.link[0] === 'https://example.com/glass', 'markdown: only http(s) links become links: ' + JSON.stringify(md.link))
  const safe = await ex(`(() => { const log = document.getElementById('ai-log'); return { script: log.querySelectorAll('script').length, img: log.querySelectorAll('img:not(.fav):not([src^="data:"])').length, onerr: log.querySelectorAll('[onerror]').length, pwned: window.__pwned === undefined, shown: /<script>window.__pwned = 1<\\/script>/.test(log.innerText) } })()`)
  ok(safe.script === 0 && safe.onerr === 0 && safe.img === 0 && safe.pwned, 'markdown safety: no script or img elements made from model text, nothing ran')
  ok(safe.shown, 'markdown safety: the tags are shown as text')
  const unit = await ex(`(() => { const d = document.createElement('div'); mdRender(d, '<img src=x onerror="window.__pwned=3">**b** <b onclick=x>x</b> [x](javascript:alert(1))', null); return d.querySelectorAll('img,b[onclick],a').length === 0 && d.querySelectorAll('strong').length === 1 })()`)
  ok(unit, 'markdown safety: HTML in Markdown stays text')
  ok(md.cite === 1 && await ex(`document.querySelectorAll('#aipanel .a4-srcq').length === 1`), 'citation chip and source quote rendered')
  ok(await ex(`(() => { const b = [...document.querySelectorAll('#aipanel .ai-msg.bot')].pop().querySelector('.a4-bar'); return !!b.querySelector('[data-act=copy]') && !!b.querySelector('[data-act=regen]') })()`), 'answer actions: copy and regenerate')
  await shot(w, 'answer-light')
  // click the citation: the page scrolls to the passage and lights it up
  await inPage(`getSelection().removeAllRanges(); scrollTo(0, 0)`); await wait(200)
  await ex(`document.querySelector('#aipanel .a4-cite').click()`); await wait(1400)
  const hl = await isoPage(`(() => { const h = CSS.highlights.get('lumen-cite'); if (!h) return null; const r = [...h][0]; const b = r.getBoundingClientRect(); return { text: r.toString(), top: b.top, vh: innerHeight, y: scrollY } })()`)
  ok(hl && /^Glass has always been a material of light/.test(hl.text), 'citation click highlights the quoted passage: ' + JSON.stringify(hl && hl.text.slice(0, 50)))
  ok(hl && hl.y > 100 && hl.top > 0 && hl.top < hl.vh, 'citation click scrolls the passage into view')
  await shot(w, 'cite-light')
  // copy
  await ex(`[...document.querySelectorAll('#aipanel [data-act=copy]')].pop().click()`); await wait(200)
  const { clipboard } = require('electron')
  const cbText = String(await clipboard.readText() || ''); ok(/Glass in short/.test(cbText) && !/[\uE000\uE001]/.test(cbText), 'copy answer puts clean text on the clipboard: ' + JSON.stringify(cbText.slice(0, 40)))

  // ---------------------------------------------------------------- follow-up keeps the page and the cache
  const b2 = posts.length
  await ex(`document.getElementById('ai-q').value = 'What is it made of?'; document.getElementById('ai-form').requestSubmit()`)
  await until(() => posts.length > b2 && ex(`!document.getElementById('aipanel').classList.contains('busy')`), 8000); await wait(300)
  const req2 = posts[b2].body
  ok(req2.messages.length === 3 && req2.messages[1].role === 'assistant' && textOf(req2.messages[2].content) === 'What is it made of?', 'follow-up carries the conversation')
  ok(JSON.stringify(req2.messages[0].content.find(b => b.type === 'document')) === JSON.stringify(d1), 'follow-up reuses the page block byte for byte (cache hit)')
  ok(!//.test(JSON.stringify(req2.messages[1])), 'history has no citation markers')

  // ---------------------------------------------------------------- stop and regenerate
  const b3 = posts.length
  await ex(`document.getElementById('ai-q').value = 'SLOW please'; document.getElementById('ai-form').requestSubmit()`)
  await until(() => ex(`(() => { const m = document.querySelector('#aipanel .ai-msg.bot.streaming .a4-md'); return !!m && m.innerText.length > 20 })()`), 5000)
  ok(await ex(`document.getElementById('aipanel').classList.contains('busy')`), 'busy while streaming (send turns into stop)')
  await ex(`document.getElementById('ai-send').click()`); await wait(700)
  ok(posts[b3] && posts[b3].aborted, 'stop aborts the request')
  ok(await ex(`!document.getElementById('aipanel').classList.contains('busy') && !!document.querySelector('#aipanel .a4-stopped')`), 'stopped answer is marked Stopped')
  const nBots = await ex(`document.querySelectorAll('#aipanel .ai-msg.bot').length`)
  await ex(`[...document.querySelectorAll('#aipanel [data-act=regen]')].pop().click()`)
  await until(() => posts.length > b3 + 1 && ex(`!document.getElementById('aipanel').classList.contains('busy')`), 8000); await wait(500)
  ok(posts.length === b3 + 2 && textOf(posts[b3 + 1].body.messages.at(-1).content) === 'SLOW please', 'regenerate asks the same question again')
  ok(await ex(`document.querySelectorAll('#aipanel .ai-msg.bot').length`) === nBots && await ex(`/Glass in short/.test([...document.querySelectorAll('#aipanel .ai-msg.bot')].pop().innerText)`), 'regenerate replaces the answer in place')

  // ---------------------------------------------------------------- abort on tab close
  const t2 = await open('/second')
  await wait(300)
  const b4 = posts.length
  await ex(`aiRun('chat', 'SLOW about this tab')`)
  await until(() => posts.length > b4, 4000); await wait(500)
  ok(AIHost.__runs.size === 1, 'one run in flight')
  w.closeTab(t2.id); await wait(800)
  ok(posts[b4] && posts[b4].aborted && AIHost.__runs.size === 0, 'closing the tab aborts its answer')
  await wait(500)

  // ---------------------------------------------------------------- all tabs
  const t3 = await open('/second')
  const b5 = posts.length
  await ex(`aiRun('tabs')`)
  await until(() => posts.length > b5 && ex(`!document.getElementById('aipanel').classList.contains('busy')`), 8000); await wait(400)
  const docs = (posts[b5].body.messages[0].content || []).filter(b => b.type === 'document')
  ok(docs.length >= 2 && docs.some(d => /quiet art/.test(d.title)) && docs.some(d => /slower internet/.test(d.title)), 'All tabs sends every tab as its own document (' + docs.length + ')')
  ok(await ex(`document.getElementById('ai-title').textContent === 'Your open tabs'`), 'panel switches to the all-tabs view')
  await shot(w, 'alltabs-light')
  // conversations belong to tabs
  w.activate(art.id); await wait(900)
  ok(await ex(`/Glass in short/.test(document.getElementById('ai-log').innerText) && !/open tabs/i.test(document.getElementById('ai-title').textContent)`), 'each tab keeps its own chat')
  w.closeTab(t3.id); await wait(500)

  // ---------------------------------------------------------------- errors: bad key, offline, rate limit, busy
  const errFor = async (k, label) => {
    await ex(`document.getElementById('ai-clear').click()`); await wait(200)
    await ex(`aiRun('chat', 'hello there')`)
    return until(() => ex(`(() => { const e = document.querySelector('#aipanel .a4-err'); return e ? e.className + '|' + e.innerText : '' })()`), 6000)
  }
  AI.setKey('sk-ant-bad-key-0123456789')
  let e = await errFor()
  ok(/k-badkey/.test(e || '') && /not accepted/.test(e) && /Check your key/.test(e), 'bad key: clear card with a way to fix it')
  await shot(w, 'error-badkey-light')
  AI.setKey('sk-ant-good-key-0123456789'); process.env.LUMEN_AI_API = 'http://127.0.0.1:9/v1/messages'
  e = await errFor()
  ok(/k-offline/.test(e || '') && /internet/.test(e) && /Try again/.test(e), 'offline: card with Try again')
  await shot(w, 'error-offline-light')
  process.env.LUMEN_AI_API = API_URL()
  const bt = posts.length
  await ex(`document.querySelector('#aipanel .a4-err [data-act=retry]').click()`)
  await until(() => posts.length > bt && ex(`!document.getElementById('aipanel').classList.contains('busy')`), 6000); await wait(300)
  ok(await ex(`!document.querySelector('#aipanel .a4-err') && /Glass in short/.test(document.getElementById('ai-log').innerText)`), 'Try again recovers once back online')
  AI.setKey('sk-ant-rate-key-0123456789')
  e = await errFor()
  ok(/k-rate/.test(e || '') && /12 seconds/.test(e), 'rate limit: says when to try again')
  AI.setKey('sk-ant-busy-key-0123456789')
  e = await errFor()
  ok(/k-overloaded/.test(e || '') && /busy/.test(e), 'overloaded: friendly busy card')
  AI.setKey('sk-ant-good-key-0123456789')
  ok((await AI.validate('nope')).kind === 'format' && (await AI.validate('sk-ant-bad-key-0123456789')).kind === 'badkey' && (await AI.validate('sk-ant-good-key-0123456789')).ok, 'key validation: format, bad and good')
  await ex(`document.getElementById('ai-clear').click()`); await wait(200)

  // ---------------------------------------------------------------- writing help
  const tf = await open('/form')
  await inPage(`(() => { const t = document.getElementById('ta'); t.focus(); t.setSelectionRange(0, 10) })()`)
  w.send('command', { ai: 'improve', text: 'helo wrold', tabId: tf.id, write: true })
  await until(() => ex(`!!document.querySelector('#aipanel [data-act=replace]')`), 8000)
  const wreq = posts[posts.length - 1].body
  ok(/Do exactly the task asked/.test(wreq.system) && wreq.messages.length === 1 && !JSON.stringify(wreq.messages).includes('"document"'), 'writing help sends only the selected text')
  await shot(w, 'writing-light')
  await ex(`document.querySelector('#aipanel [data-act=replace]').click()`); await wait(800)
  const val = await inPage(`document.getElementById('ta').value`)
  ok(/^Hello, world\. This reads much better now\. this is my note$/.test(val), 'Replace in page puts the new text in the field: ' + JSON.stringify(val))
  w.closeTab(tf.id); await wait(400)
  await ex(`closeAI()`); await wait(500)

  // ---------------------------------------------------------------- command bar: answer and action
  w.activate(art.id); await wait(500)
  const b6 = posts.length
  await ex(`openCmd('newtab')`); await wait(300)
  await ex(`cmdInput.value = 'what is glass made of?'; cmdInput.dispatchEvent(new Event('input'))`); await wait(500)
  await ex(`cmdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`)
  let mid = false
  for (let i = 0; i < 100 && !mid; i++) { await wait(25); mid = await ex(`(() => { const m = document.querySelector('#cmd-ai .a4-md'); return !!m && m.innerText.length > 5 && !!m.querySelector('.a4-caret') })()`) }
  ok(mid, 'Cmd K: the answer streams inline')
  await until(() => ex(`/Glass in short/.test((document.querySelector('#cmd-ai .a4-md') || {}).innerText || '') && !document.querySelector('#cmd-ai .a4-caret')`), 8000)
  ok(posts.length === b6 + 1 && !(posts[b6].body.messages[0].content || []).find?.(b => b.type === 'document'), 'Cmd K: a general question does not send the page')
  ok(await ex(`document.getElementById('cmdbar').classList.contains('aimode') && getComputedStyle(document.getElementById('cmd-results')).display === 'none'`), 'Cmd K: the answer replaces the results')
  await shot(w, 'cmdk-answer-light')
  await ex(`cmdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`); await wait(900)
  ok(await ex(`document.getElementById('aipanel').classList.contains('open') && /what is glass made of\\?/.test(document.getElementById('ai-log').innerText) && /Glass in short/.test(document.getElementById('ai-log').innerText)`), 'Cmd K: Enter continues the answer in the panel')
  await ex(`closeAI()`); await wait(400)
  // natural-language action
  const y1 = await open('/youtube-1', false), y2 = await open('/youtube-2', false)
  w.activate(art.id); await wait(400)
  const nTabs = w.order.length
  await ex(`openCmd('newtab')`); await wait(300)
  await ex(`cmdInput.value = 'close all youtube tabs'; cmdInput.dispatchEvent(new Event('input'))`); await wait(500)
  ok(await ex(`results[0] && results[0].ai && /Do it with Lumen AI/.test(results[0].sub)`), 'Cmd K: an action request offers Do it with Lumen AI')
  ok(posts.length === b6 + 1, 'Cmd K: typing an action sends nothing')
  await ex(`cmdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`)
  await until(() => ex(`!!document.querySelector('#cmd-ai .a4k-step.s-close')`), 6000); await wait(500)
  ok(await ex(`document.querySelectorAll('#cmd-ai .a4k-step.s-close .a4k-item').length === 2 && /Closing your 2 YouTube tabs/.test(document.querySelector('#cmd-ai .a4k-reply').textContent)`), 'Cmd K: the plan is shown before anything happens')
  ok(w.order.length === nTabs, 'Cmd K: nothing closed before confirming')
  const planReq = posts[posts.length - 1].body
  ok(!planReq.stream && /Cat video 1 - YouTube/.test(textOf(planReq.messages[0].content)), 'planner gets the open tabs')
  await shot(w, 'cmdk-action-light')
  await ex(`cmdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`); await wait(900)
  ok(!w.tabs.has(y1.id) && !w.tabs.has(y2.id) && w.order.length === nTabs - 2 && w.tabs.has(art.id), 'Cmd K: Enter closes exactly the YouTube tabs')

  // ---------------------------------------------------------------- Settings, Lumen AI
  const st = await open('/article')
  st.view.webContents.loadURL('lumen://settings/ai'); await until(() => !st.view.webContents.isLoading(), 6000); await wait(1500)
  const sp = s => st.view.webContents.executeJavaScript(s)
  ok(await sp(`document.querySelectorAll('.vch[data-seg=aiModel] .vc').length === 3 && /Best/.test(document.querySelector('.vch[data-seg=aiModel]').innerText)`), 'Settings: Fast, Smart and Best')
  ok(await sp(`(() => { const p = document.querySelector('.ai4-plist'); return p ? p.textContent : 'none' })()`).then(t => { LOG('    privacy: ' + t.slice(0, 80)); return /Nothing is sent until you ask/.test(t) }), 'Settings: privacy notes')
  ok(await sp(`!!document.querySelector('[data-set=aiSelBubble]')`), 'Settings: selection bubble switch')
  await shot(w, 'settings-light')
  await sp(`document.querySelector('.vch[data-seg=aiModel] .vc[data-v=best]').click()`); await wait(400)
  ok(L.D.settings.get('aiModel') === 'best' && AI.model() === 'claude-opus-5-5', 'Best uses Claude Opus 5.5')
  L.D.settings.set({ aiModel: 'fast' })
  await sp(`document.getElementById('aikeyrm').click()`); await wait(800)
  ok(!AI.ready() && await sp(`document.querySelectorAll('.ai4-steps li').length === 3`), 'Settings: removing the key shows the setup steps')
  await sp(`document.getElementById('aikey').value = 'sk-ant-bad-key-0123456789'; document.getElementById('aikeysave').click()`); await wait(1200)
  ok(await sp(`document.getElementById('aikeymsg').classList.contains('bad') && /not accepted/.test(document.getElementById('aikeymsg').textContent)`) && !AI.ready(), 'Settings: a bad key is checked and refused')
  await shot(w, 'settings-badkey-light')
  await sp(`document.getElementById('aikey').value = 'sk-ant-good-key-0123456789'; document.getElementById('aikeysave').click()`)
  await until(() => AI.ready(), 4000); await wait(150)
  ok(AI.ready() && await sp(`document.getElementById('aikeymsg').classList.contains('good')`), 'Settings: a good key is checked and saved')
  const keyLeak = await sp(`document.documentElement.innerHTML.includes('sk-ant-good-key')`)
  ok(!keyLeak, 'the key is never shown back to the page')

  // ---------------------------------------------------------------- dark
  nativeTheme.themeSource = 'dark'; await wait(1200)
  await shot(w, 'settings-dark')
  w.activate(art.id); await wait(500)
  await ex(`openAI()`); await wait(900)
  await shot(w, 'answer-dark')
  await ex(`document.getElementById('ai-clear').click()`); await wait(700)
  await shot(w, 'welcome-dark')
  await ex(`closeAI()`); await wait(500)
  art.view.webContents.reload(); await until(() => !art.view.webContents.isLoading(), 6000); await wait(600)
  await inPage(`(() => { const p = document.getElementById('key'); const r = document.createRange(); r.selectNodeContents(p); getSelection().removeAllRanges(); getSelection().addRange(r); p.scrollIntoView({ block: 'center' }); document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 })) })()`); await wait(800)
  await shot(w, 'bubble-dark')
  await inPage(`getSelection().removeAllRanges(); document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))`); await wait(300)
  await ex(`openCmd('newtab')`); await wait(300)
  await ex(`cmdInput.value = 'how do I recycle glass?'; cmdInput.dispatchEvent(new Event('input'))`); await wait(500)
  await ex(`cmdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`)
  await until(() => ex(`/Glass in short/.test((document.querySelector('#cmd-ai .a4-md') || {}).innerText || '') && !document.querySelector('#cmd-ai .a4-caret')`), 8000); await wait(300)
  await shot(w, 'cmdk-answer-dark')
  await ex(`closeCmd(true)`); await wait(300)
  AI.setKey('')
  await ex(`openAI()`); await wait(900)
  await shot(w, 'nokey-dark')
  await ex(`closeAI()`); await wait(500)

  // ---------------------------------------------------------------- idle: nothing loops once it is all over
  const anims = await ex(`document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity && a.effect.target && a.effect.target.closest && a.effect.target.closest('#aipanel, #cmd-ai')).length`)
  ok(anims === 0, 'no infinite animation in the AI surfaces at rest (' + anims + ')')
  ok(!uiErrs.length, 'no errors in the chrome console' + (uiErrs.length ? ': ' + uiErrs.slice(0, 3).join(' | ') : ''))
  finish()
}
