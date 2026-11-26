// Lumen AI host (main process): turns what the user asked for in the panel, the command bar or the selection bubble
// into Claude requests, and carries the answers back. Nothing here runs until the user asks for something:
// no page is read and no request is made in the background.
const { ipcMain, clipboard } = require('electron')
const AI = require('./ai')
const D = require('./data')
const Translate = require('./translate')

let ctx = { log: () => {}, winForWc: () => null }
function init(c) {
  ctx = { ...ctx, ...c }
  // a button in the selection bubble inside a web page (src/preload-tab.js)
  ipcMain.on('ai:sel', (e, m) => {
    const w = ctx.winForWc(e.sender.id); if (!w || !m) return
    const t = w.tabByWc(e.sender.id); if (!t) return
    const action = String(m.action || '')
    if (!SEL_ACTIONS.has(action)) return
    w.send('command', { ai: action, text: String(m.text || '').slice(0, 6000), tabId: t.id, from: 'bubble' })
  })
}
const SEL_ACTIONS = new Set(['explain', 'summarize', 'translate', 'rewrite', 'define', 'ask'])

// ---------------------------------------------------------------- reading pages
const PAGE_TEXT_JS = `(() => {
  const pick = document.querySelector('article') || document.querySelector('main') || document.querySelector('[role=main]') || document.body
  let t = (pick && pick.innerText || '').replace(/\\n{3,}/g, '\\n\\n').trim()
  if (t.length < 400 && pick !== document.body) t = (document.body.innerText || '').trim()
  return { title: document.title, url: location.href, text: t.slice(0, 60000), sel: String(getSelection() || '').slice(0, 6000) }
})()`
const viewOf = t => (t && t.view && !t.view.webContents.isDestroyed() ? t.view.webContents : null)
const isWeb = u => /^https?:|^file:/.test(u || '')
// 4.2: the page is read as soon as the panel opens (or Ask Lumen is picked), not after the question is sent, so the
// answer starts sooner. A pre-read is used if it is under a minute old and the tab is still on the same address.
const preRead = new Map()   // tabId -> { at, url, p: Promise }
function prefetch(t) {
  const wc = viewOf(t); if (!wc) return
  const url = wc.getURL(); if (!isWeb(url)) return
  const have = preRead.get(t.id)
  if (have && have.url === url && Date.now() - have.at < 20000) return
  preRead.set(t.id, { at: Date.now(), url, p: readTabNow(t, 60000) })
  if (preRead.size > 20) preRead.delete(preRead.keys().next().value)
}
async function readTab(t, limit = 60000) {
  const wc = viewOf(t), pre = t && preRead.get(t.id)
  if (pre && wc && pre.url === wc.getURL() && Date.now() - pre.at < 60000 && limit >= 60000) {
    preRead.delete(t.id)
    try { const p = await pre.p; if (p && p.text) { try { p.sel = String(await wc.executeJavaScriptInIsolatedWorld(1018, [{ code: 'String(getSelection()||"").slice(0,6000)' }]) || '') } catch {} return p } } catch {}
  }
  return readTabNow(t, limit)
}
async function readTabNow(t, limit = 60000) {
  const wc = viewOf(t)
  if (!wc) return { title: t ? t.title || '' : '', url: t ? t.url || '' : '', text: '', sel: '', asleep: true }
  const url = wc.getURL()
  if (!isWeb(url)) return { title: wc.getTitle(), url, text: '', sel: '', internal: true }
  try {
    const p = await wc.executeJavaScriptInIsolatedWorld(1018, [{ code: PAGE_TEXT_JS }])
    p.text = String(p.text || '').slice(0, limit)
    return p
  } catch { return { title: wc.getTitle(), url, text: '', sel: '' } }
}

// The documents of a conversation are read once, on its first question, and reused byte for byte for every follow-up,
// so the cached prefix (system, page) stays valid and follow-ups only pay for the new question.
const convDocs = new Map()   // conversation id -> { docs: [{ tabId, page }] }
function rememberDocs(conv, v) { convDocs.delete(conv); convDocs.set(conv, v); while (convDocs.size > 24) convDocs.delete(convDocs.keys().next().value) }

async function docsFor(w, req) {
  const conv = String(req.conv || req.id)
  const have = convDocs.get(conv)
  if (have && (req.history || []).length) return have
  let v = { docs: [] }
  if (req.ctx === 'tabs') {
    // every tab in this window: loaded tabs give their text, sleeping ones their title and address. About 120k
    // characters in all, so a window full of long articles still fits comfortably.
    const ids = w.order.slice(0, 30), per = Math.max(3000, Math.floor(120000 / Math.max(1, ids.length)))
    const pages = await Promise.all(ids.map(id => readTab(w.tabs.get(id), per).then(p => ({ tabId: id, page: p })).catch(() => null)))
    v.docs = pages.filter(x => x && !x.page.internal && (x.page.text || x.page.url))
      .map(x => ({ tabId: x.tabId, page: { ...x.page, text: x.page.text || `(This tab is asleep. Only its title and address are known.)` } }))
  } else if (req.ctx === 'page') {
    const t = w.tabs.get(req.tabId)
    const p = t ? await readTab(t) : null
    if (p && p.text) v.docs = [{ tabId: req.tabId, page: p }]
  }
  rememberDocs(conv, v)
  return v
}

// ---------------------------------------------------------------- prompts
function lang() { try { return Translate.langName(Translate.target(D.settings)) } catch { return 'English' } }
const clip = (s, n) => String(s || '').slice(0, n)
const PROMPTS = {
  summarize: () => 'Summarize this page. Start with a one-sentence overview in bold, then the key points as a short bulleted list, then anything important to watch out for, if there is any.',
  keypoints: () => 'List the 5 most important points on this page as a numbered list, one line each.',
  explain: s => `Explain this passage from the page in plain language. Say what it means and why it matters in the context of the page. Keep it short.\n\n<passage>\n${clip(s, 6000)}\n</passage>`,
  define: s => `Define "${clip(s, 200)}" as it is used here. Give a one-line definition in bold, then a short plain explanation and one example.`,
  rewrite: s => `Rewrite this passage so it is clearer and easier to read, keeping its meaning. Reply with the rewritten passage only.\n\n<passage>\n${clip(s, 6000)}\n</passage>`,
  translate: s => `Translate this text into ${lang()}. Keep the meaning, tone and formatting. Reply with the translation only.\n\n<text>\n${clip(s, 6000)}\n</text>`,
  improve: s => `Improve this text: make it clearer, smoother and more natural while keeping the author's meaning, voice and language.\n\n<text>\n${clip(s, 8000)}\n</text>`,
  shorten: s => `Make this text noticeably shorter while keeping everything important, the author's voice and language.\n\n<text>\n${clip(s, 8000)}\n</text>`,
  grammar: s => `Fix the spelling, grammar and punctuation of this text. Change nothing else, and keep its language.\n\n<text>\n${clip(s, 8000)}\n</text>`,
  tabs: s => s ? clip(s, 8000) : 'Give me an overview of my open tabs: one line on what each is about, then what they have in common, how they differ, and anything I should look at first.',
}
// answers that replace the user's own text: no chat around them, no documents
const TOOL_MODES = new Set(['improve', 'shorten', 'grammar'])

// ---------------------------------------------------------------- asking
const runs = new Map()   // request id -> { ctl, w, tabId }
async function ask(w, req) {
  const id = String(req.id || '')
  if (!id) return
  const send = m => w.send('ai', { id, ...m })
  const ctl = new AbortController(); runs.set(id, { ctl, w, tabId: req.tabId })
  try {
    const mode = String(req.mode || 'chat')
    const text = String(req.text || '')
    let system = AI.SYSTEM, messages, docs = [], prompt = ''
    if (TOOL_MODES.has(mode)) {
      system = AI.SYSTEM_TOOL
      messages = [{ role: 'user', content: PROMPTS[mode](text) }]
    } else {
      const v = await docsFor(w, req)
      docs = v.docs
      if (req.ctx === 'page' && !docs.length && ['summarize', 'keypoints'].includes(mode)) throw AI.aiError('nopage', 'Open a web page first, then ask Lumen AI about it.')
      prompt = PROMPTS[mode] ? PROMPTS[mode](text) : clip(text, 8000)
      const history = (req.history || []).slice(-16).filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .map(m => ({ role: m.role, content: clip(m.content, 12000) }))
      // the documents go into the first user turn, so every follow-up keeps them (and the cache) unchanged
      const lead = docs.map((d, i) => AI.docBlock(d.page, i === docs.length - 1))
      const first = c => lead.length ? [...lead, { type: 'text', text: c }] : c
      messages = history.length
        ? [{ role: 'user', content: first(history[0].content) }, ...history.slice(1), { role: 'user', content: prompt }]
        : [{ role: 'user', content: first(prompt) }]
    }
    const pg = docs[0] && docs[0].page
    send({ start: true, docs: docs.map(d => ({ tabId: d.tabId, title: d.page.title, url: d.page.url })), title: pg ? pg.title : '', url: pg ? pg.url : '', tier: AI.tier() })
    const seen = new Map()
    const res = await AI.stream({ system, messages }, ev => {
      if (ev.text) send({ delta: ev.text })
      else if (ev.cite && ev.cite.quote) {
        const d = docs[ev.cite.doc] || docs[0]
        const k = (d ? d.tabId : '') + '|' + ev.cite.quote
        if (!seen.has(k)) seen.set(k, seen.size + 1)
        send({ cite: { n: seen.get(k), quote: clip(ev.cite.quote, 600), tabId: d ? d.tabId : req.tabId, title: d ? d.page.title : ev.cite.title } })
      }
    }, ctl.signal)
    send({ done: true, text: res.text, prompt, stop: res.stop })
  } catch (e) {
    if (e.name === 'AbortError') send({ done: true, stopped: true })
    else send({ error: e.message || String(e), kind: e.kind || 'other', retryAfter: e.retryAfter || 0 })
  } finally { runs.delete(id) }
}
function stop(id) { const r = runs.get(id); if (r) r.ctl.abort() }
// a tab that closes takes its unfinished answers with it
function tabClosed(w, tabId) {
  preRead.delete(tabId)
  for (const [id, r] of runs) if (r.w === w && r.tabId === tabId) r.ctl.abort()
}

// ---------------------------------------------------------------- cited quotes: find, scroll to and light up
const HIGHLIGHT_JS = quote => `(() => {
  const want = ${JSON.stringify(String(quote))}.replace(/\\s+/g, ' ').trim()
  if (!want) return { found: false }
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg)$/
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && !SKIP.test(n.parentElement.nodeName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT })
  let all = '', map = [], prevSpace = true
  for (let n; (n = walker.nextNode());) {
    const s = n.nodeValue
    for (let i = 0; i < s.length; i++) {
      const sp = /\\s/.test(s[i])
      if (sp) { if (prevSpace) continue; all += ' '; map.push([n, i]); prevSpace = true }
      else { all += s[i]; map.push([n, i]); prevSpace = false }
    }
  }
  const low = all.toLowerCase()
  const tries = [want, want.slice(0, 120), want.slice(0, 60), want.slice(-60)].map(x => x.trim()).filter(x => x.length > 3)
  let at = -1, len = 0
  for (const t of tries) { at = all.indexOf(t); if (at < 0) at = low.indexOf(t.toLowerCase()); if (at >= 0) { len = t.length; break } }
  if (at < 0) return { found: false }
  const [sn, so] = map[at], [en, eo] = map[at + len - 1]
  const r = document.createRange(); r.setStart(sn, so); r.setEnd(en, eo + 1)
  try { CSS.highlights.set('lumen-cite', new Highlight(r)) } catch {}
  const box = r.getBoundingClientRect()
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  scrollBy({ top: box.top - innerHeight * 0.38, behavior: still ? 'instant' : 'smooth' })
  // a ring of light settles around the passage once, then fades away
  const ring = () => {
    const b = r.getBoundingClientRect()
    const host = document.createElement('div')
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483646;pointer-events:none;left:' + (b.left - 8) + 'px;top:' + (b.top - 6) + 'px;width:' + (b.width + 16) + 'px;height:' + (b.height + 12) + 'px'
    const sh = host.attachShadow({ mode: 'closed' })
    sh.innerHTML = '<style>i{position:absolute;inset:0;border-radius:10px;box-shadow:0 0 0 2px #ff4fb8,0 0 0 6px rgba(255,79,184,.22),0 10px 34px rgba(255,79,184,.35);animation:p 1.5s cubic-bezier(.3,1.4,.5,1) both}@keyframes p{0%{opacity:0;transform:scale(1.12)}22%{opacity:1;transform:scale(.985)}38%{transform:scale(1.01)}70%{opacity:1;transform:none}100%{opacity:0;transform:none}}' + (still ? 'i{animation:none;opacity:1}' : '') + '</style><i></i>'
    document.documentElement.appendChild(host)
    setTimeout(() => host.remove(), 1600)
  }
  setTimeout(ring, still ? 0 : 420)
  return { found: true, text: r.toString().slice(0, 200) }
})()`
const CITE_CSS = '::highlight(lumen-cite){background-color:rgba(255,79,184,.28);color:inherit;text-decoration:underline 2px rgba(255,79,184,.85);text-underline-offset:3px}'
async function cite(w, { tabId, quote }) {
  const t = w.tabs.get(tabId)
  if (!t) return { found: false, gone: true }
  if (w.activeId !== tabId) w.activate(tabId)
  let wc = viewOf(t)
  for (let i = 0; i < 40 && (!wc || wc.isLoading()); i++) { await new Promise(r => setTimeout(r, 125)); wc = viewOf(t) }
  if (!wc) return { found: false }
  try { await wc.insertCSS(CITE_CSS) } catch {}
  try { return await wc.executeJavaScriptInIsolatedWorld(1018, [{ code: HIGHLIGHT_JS(quote) }]) } catch { return { found: false } }
}

// ---------------------------------------------------------------- natural-language actions (command bar)
const plans = new Map()
const PLAN_SYSTEM = `You turn a browser user's request into actions on their tabs. Reply with JSON only, no prose, no code fence.
Actions you can use:
{"do":"close","tabs":[ids]}  close tabs
{"do":"group","name":"Short name","color":"blue|purple|pink|orange|yellow|green|teal|gray","tabs":[ids]}  put tabs in a group
{"do":"open","urls":["https://..."]}  open pages in new tabs (prefer addresses from the history list)
{"do":"switch","tab":id}  go to a tab
{"do":"mute","tabs":[ids]} / {"do":"unmute","tabs":[ids]}
{"do":"pin","tabs":[ids]} / {"do":"unpin","tabs":[ids]}
Reply as {"reply":"One short sentence saying what you will do","actions":[...]}.
If nothing matches, reply {"reply":"A short sentence saying what you could not find","actions":[]}. Never use emoji.`

async function plan(w, { q }) {
  q = clip(q, 500).trim()
  if (!q) return { error: 'Type what you want done.' }
  const tabs = w.order.map(id => w.tabs.get(id)).filter(Boolean).map(t => {
    const wc = viewOf(t)
    return { id: t.id, title: (wc ? wc.getTitle() : t.title) || '', url: (wc ? wc.getURL() : t.url) || '', pinned: !!t.pinned, muted: !!t.muted, favicon: t.favicon || '' }
  })
  const hist = w.incognito ? [] : D.listHistory('', 80)
  const body = `Request: ${q}

Open tabs (id, title, url, flags):
${tabs.map(t => `${t.id}\t${t.title.slice(0, 90)}\t${t.url.slice(0, 160)}${t.pinned ? '\tpinned' : ''}${t.id === w.activeId ? '\tcurrent' : ''}`).join('\n')}

Recently visited, newest first (title, url):
${hist.map(h => `${String(h.title || '').slice(0, 80)}\t${h.url.slice(0, 160)}`).join('\n') || '(none)'}`
  let out
  try { out = await AI.once({ system: PLAN_SYSTEM, messages: [{ role: 'user', content: body }], maxTokens: 4000 }) }
  catch (e) { return { error: e.message, kind: e.kind || 'other', retryAfter: e.retryAfter || 0 } }
  let j
  try { const m = out.match(/\{[\s\S]*\}/); j = JSON.parse(m ? m[0] : out) } catch { return { error: 'Lumen AI could not work out what to do. Try saying it another way.' } }
  const byId = new Map(tabs.map(t => [t.id, t]))
  const ids = a => [...new Set((Array.isArray(a) ? a : [a]).map(Number))].filter(id => byId.has(id))
  const COLORS = ['blue', 'purple', 'pink', 'orange', 'yellow', 'green', 'teal', 'gray']
  const steps = []
  for (const a of (Array.isArray(j.actions) ? j.actions : []).slice(0, 8)) {
    const kind = String(a && a.do || '')
    if (['close', 'mute', 'unmute', 'pin', 'unpin'].includes(kind)) { const t = ids(a.tabs); if (t.length) steps.push({ do: kind, tabs: t }) }
    else if (kind === 'group') { const t = ids(a.tabs); if (t.length) steps.push({ do: 'group', tabs: t, name: String(a.name || 'Group').replace(/[^\p{L}\p{N} &'-]/gu, '').slice(0, 24) || 'Group', color: COLORS.includes(a.color) ? a.color : 'pink' }) }
    else if (kind === 'switch') { const t = ids(a.tab); if (t.length) steps.push({ do: 'switch', tabs: t.slice(0, 1) }) }
    else if (kind === 'open') { const urls = (Array.isArray(a.urls) ? a.urls : []).map(String).filter(u => /^https?:\/\/[^\s]+$/i.test(u)).slice(0, 10); if (urls.length) steps.push({ do: 'open', urls }) }
  }
  const token = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  plans.set(token, { w, steps }); setTimeout(() => plans.delete(token), 10 * 60 * 1000)
  const hostTitle = u => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
  return {
    token, reply: clip(String(j.reply || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''), 240),
    steps: steps.map(s => ({ do: s.do, name: s.name, color: s.color, tabs: (s.tabs || []).map(id => byId.get(id)).map(t => ({ id: t.id, title: t.title, url: t.url, favicon: t.favicon })), urls: (s.urls || []).map(u => ({ url: u, title: (hist.find(h => h.url === u) || {}).title || hostTitle(u) })) })),
  }
}
function act(w, token) {
  const p = plans.get(token)
  if (!p || p.w !== w) return { done: 0 }
  plans.delete(token)
  let n = 0
  for (const s of p.steps) {
    const live = (s.tabs || []).filter(id => w.tabs.has(id))
    if (s.do === 'close') for (const id of live) { if (w.tabs.size > 1 || id !== w.activeId) { w.closeTab(id, { undo: true }); n++ } }
    else if (s.do === 'group' && live.length) { w.newGroup(live, s.name, s.color); n++ }
    else if (s.do === 'switch' && live.length) { w.activate(live[0]); n++ }
    else if (s.do === 'open') for (const u of s.urls) { w.createTab(u); n++ }
    else if (s.do === 'mute' || s.do === 'unmute') for (const id of live) { const t = w.tabs.get(id); if (t.view) { t.muted = s.do === 'mute'; t.view.webContents.setAudioMuted(t.muted); n++ } }
    else if (s.do === 'pin' || s.do === 'unpin') for (const id of live) {
      const t = w.tabs.get(id); if (!!t.pinned === (s.do === 'pin')) continue
      t.pinned = s.do === 'pin'; n++
      w.moveTab(id, w.order.filter(i => i !== id && w.tabs.get(i).pinned).length)
    }
  }
  if (p.steps.some(s => s.do === 'mute' || s.do === 'unmute')) w.pushState()
  return { done: n }
}
// ---------------------------------------------------------------- writing help: put the new text back in the field
async function replace(w, { tabId, text }) {
  const t = w.tabs.get(tabId); const wc = viewOf(t)
  if (!wc || typeof text !== 'string') return false
  if (w.activeId !== tabId) w.activate(tabId)
  try { w.win.focus() } catch {}
  wc.focus()
  await new Promise(r => setTimeout(r, 30))
  await wc.insertText(text)
  return true
}

// ---------------------------------------------------------------- the chrome's AI actions
async function ui(w, action, a) {
  switch (action) {
    case 'aiAsk': ask(w, a[0] || {}); return true
    case 'aiStop': stop(a[0]); try { require('./agent').stop(String(a[0] || '')) } catch {} return true
    case 'aiStatus': {
      const t = w.active(), wc = viewOf(t)
      const url = wc ? wc.getURL() : (t && t.url) || ''
      const st = { ready: AI.ready(), tier: AI.tier(), tierName: AI.TIER_NAMES[AI.tier()], tabId: t ? t.id : null, title: wc ? wc.getTitle() : (t && t.title) || '', url, web: isWeb(url), tabs: w.order.length, sel: '' }
      // the panel is opening: warm the connection and read the page now, so the first question goes out at once
      if (st.ready) { AI.warm(); if (st.web && !(a[0] && a[0].noPre)) prefetch(t) }
      // the selection is only read when the panel asks for it (Explain), never on a timer
      if (a[0] && a[0].sel && wc && st.web) { try { st.sel = String(await wc.executeJavaScriptInIsolatedWorld(1018, [{ code: 'String(getSelection()||"").slice(0,6000)' }]) || '') } catch {} }
      return st
    }
    case 'aiCite': return cite(w, a[0] || {})
    case 'aiPlan': AI.warm(); return plan(w, a[0] || {})
    case 'aiAct': return act(w, a[0])
    case 'aiReplace': return replace(w, a[0] || {})
    case 'aiCopy': clipboard.writeText(String(a[0] || '')); return true
    case 'aiForget': convDocs.delete(String(a[0] || '')); return true
  }
}

module.exports = { init, ui, tabClosed, readTab, __runs: runs, __plans: plans, __convDocs: convDocs, PROMPTS }
