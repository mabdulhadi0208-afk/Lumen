// Lumen AI 4.1 in the browser chrome: the Ask Lumen panel (a real chat per tab, streamed with a smooth typing reveal,
// safe Markdown, cited quotes that jump to the page, stop, regenerate, copy), answers and actions in the command bar,
// and the results of the selection bubble and of writing help. Runs on top of ui.js (same window, its globals).
// Zero lag: nothing runs while the panel is closed; streamed text reaches the DOM once per animation frame, only the
// last Markdown block is rebuilt, and every loop ends when its text has been shown. Model output is never parsed as
// HTML: the Markdown renderer builds DOM nodes and puts all text in through text nodes.

// ---------------------------------------------------------------- icons drawn here (no emoji anywhere)
const AI_IC = {
  copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8.5" rx="2"/><path d="M10.5 3.6A1.8 1.8 0 0 0 8.8 2.5H4.3A1.8 1.8 0 0 0 2.5 4.3v4.5a1.8 1.8 0 0 0 1.1 1.7"/></svg>',
  regen: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.3 6.4A5.5 5.5 0 0 0 3.2 5M2.7 9.6A5.5 5.5 0 0 0 12.8 11"/><path d="M13.5 2.8v3.7H9.8M2.5 13.2V9.5h3.7"/></svg>',
  stop: '<svg viewBox="0 0 16 16"><rect x="4" y="4" width="8" height="8" rx="2.2" fill="currentColor"/></svg>',
  quote: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 9.6C3 7 4.4 5 6.6 4.2l.5 1C5.9 5.8 5.3 6.7 5.2 7.7h.4a1.9 1.9 0 1 1-2.6 1.9zm6 0C9 7 10.4 5 12.6 4.2l.5 1c-1.2.6-1.8 1.5-1.9 2.5h.4a1.9 1.9 0 1 1-2.6 1.9z"/></svg>',
  replace: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 11.5h3l7-7a2 2 0 0 0-3-3l-7 7zM8.5 3.5l3 3"/><path d="M9 14h4.5"/></svg>',
  tabs: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4.5" width="10" height="9" rx="2"/><path d="M5 2.5h7a2 2 0 0 1 2 2v7"/></svg>',
  pen: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 13.5h3l7-7a2 2 0 0 0-3-3l-7 7zM8.5 5.5l2 2"/></svg>',
  wifi: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M1.8 6.2a9 9 0 0 1 12.4 0M4 8.6a5.8 5.8 0 0 1 8 0M6.2 11a2.6 2.6 0 0 1 3.6 0"/><circle cx="8" cy="13.2" r=".6" fill="currentColor"/><path d="M2.5 2.5l11 11"/></svg>',
  hourglass: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2h8M4 14h8M5 2c0 3 6 3 6 6s-6 3-6 6M11 2c0 3-6 3-6 6s6 3 6 6"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5c.6 4.6 2.4 7.8 5.4 9.3 1.4.7 3 1 5.1 1.2-2.1.2-3.7.5-5.1 1.2-3 1.5-4.8 4.7-5.4 9.3-.6-4.6-2.4-7.8-5.4-9.3C5.2 12.5 3.6 12.2 1.5 12c2.1-.2 3.7-.5 5.1-1.2 3-1.5 4.8-4.7 5.4-9.3z"/></svg>',
  enter: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3v5a2 2 0 0 1-2 2H3.5M6 7l-3 3 3 3"/></svg>',
}
const aiIcon = k => AI_IC[k] || ICONS[k] || ''

// ---------------------------------------------------------------- safe Markdown (DOM only, never innerHTML)
const MK = '\uE000', MK2 = '\uE001'   // a citation marker inside the streamed text: MK n MK2
const mdClean = s => String(s || '').replace(/\uE000\d+\uE001/g, '')
function mdBlocks(src) {
  const L = String(src).split('\n'), out = []
  const isItem = l => /^\s*([-*+•]|\d{1,3}[.)])\s+/.test(l)
  const isTableRow = l => /^\s*\|.*\|\s*$/.test(l)
  const starts = (l, n) => /^\s*(```|~~~)/.test(l) || /^#{1,6}\s/.test(l) || /^\s*>/.test(l) || isItem(l) || (isTableRow(l) && n !== undefined && /^\s*\|?\s*:?-{2,}/.test(n))
  let i = 0
  while (i < L.length) {
    const l = L[i]; let m
    if ((m = l.match(/^\s*(```|~~~)\s*([\w+#.-]*)/))) {
      const fence = m[1], lang = m[2], body = [], s0 = i; i++
      while (i < L.length && !L[i].trim().startsWith(fence)) body.push(L[i++])
      const closed = i < L.length; if (closed) i++
      out.push({ t: 'code', lang, text: body.join('\n'), open: !closed, src: L.slice(s0, i).join('\n') }); continue
    }
    if (!l.trim()) { i++; continue }
    if ((m = l.match(/^(#{1,6})\s+(.*)/))) { out.push({ t: 'h', level: m[1].length, text: m[2], src: l }); i++; continue }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { out.push({ t: 'hr', src: l }); i++; continue }
    if (/^\s*>/.test(l)) { const s0 = i, b = []; while (i < L.length && /^\s*>/.test(L[i])) b.push(L[i++].replace(/^\s*>\s?/, '')); out.push({ t: 'quote', text: b.join('\n'), src: L.slice(s0, i).join('\n') }); continue }
    if (isTableRow(l) && i + 1 < L.length && /^\s*\|?\s*:?-{2,}/.test(L[i + 1])) {
      const s0 = i, cells = r => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
      const head = cells(l), align = cells(L[i + 1]).map(c => /^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : '')
      i += 2; const rows = []
      while (i < L.length && isTableRow(L[i])) rows.push(cells(L[i++]))
      out.push({ t: 'table', head, align, rows, src: L.slice(s0, i).join('\n') }); continue
    }
    if (isItem(l)) {
      const s0 = i, items = []
      while (i < L.length) {
        const x = L[i]
        if (isItem(x)) { const mm = x.match(/^(\s*)([-*+•]|\d{1,3}[.)])\s+(.*)/); items.push({ level: mm[1].replace(/\t/g, '  ').length >= 2 ? 1 : 0, ord: /\d/.test(mm[2]), start: parseInt(mm[2], 10) || 1, text: mm[3] }); i++ }
        else if (x.trim() && /^\s{2,}\S/.test(x) && items.length) { items[items.length - 1].text += ' ' + x.trim(); i++ }
        else if (!x.trim() && i + 1 < L.length && isItem(L[i + 1])) i++
        else break
      }
      out.push({ t: 'list', items, src: L.slice(s0, i).join('\n') }); continue
    }
    const s0 = i, b = []
    while (i < L.length && L[i].trim() && (i === s0 || !starts(L[i], L[i + 1]))) b.push(L[i++])
    out.push({ t: 'p', text: b.join('\n'), src: L.slice(s0, i).join('\n') })
  }
  return out
}
const INLINE = /(`+)([^`]+?)\1|\*\*(?!\s)(.+?)(?<!\s)\*\*|(?<![\w])__(?!\s)(.+?)(?<!\s)__(?![\w])|(?<![\w*])\*(?!\s)([^*\n]+?)\*(?![\w*])|(?<![\w_])_(?!\s)([^_\n]+?)_(?![\w_])|~~(.+?)~~|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"\]])|\uE000(\d+)\uE001/g
function mdInline(s, parent, ctx) {
  let last = 0, m
  const re = new RegExp(INLINE.source, 'g')
  const text = t => { if (t) parent.appendChild(document.createTextNode(t)) }
  const wrap = (tag, inner, cls) => { const el = document.createElement(tag); if (cls) el.className = cls; mdInline(inner, el, ctx); parent.appendChild(el) }
  while ((m = re.exec(s))) {
    text(s.slice(last, m.index)); last = re.lastIndex
    if (m[2] !== undefined) { const c = document.createElement('code'); c.textContent = m[2]; parent.appendChild(c) }
    else if (m[3] !== undefined || m[4] !== undefined) wrap('strong', m[3] !== undefined ? m[3] : m[4])
    else if (m[5] !== undefined || m[6] !== undefined) wrap('em', m[5] !== undefined ? m[5] : m[6])
    else if (m[7] !== undefined) wrap('del', m[7])
    else if (m[8] !== undefined || m[10] !== undefined) {
      const a = document.createElement('a'); a.className = 'a4-link'; a.href = m[9] || m[10]; a.dataset.url = m[9] || m[10]
      a.title = m[9] || m[10]; if (m[8] !== undefined) mdInline(m[8], a, ctx); else a.textContent = (m[10].replace(/^https?:\/\/(www\.)?/, '').slice(0, 48))
      parent.appendChild(a)
    } else if (m[11] !== undefined) {
      const n = +m[11], b = document.createElement('button')
      b.className = 'a4-cite'; b.type = 'button'; b.dataset.n = n; b.textContent = n
      const c = ctx && ctx.cites && ctx.cites.find(x => x.n === n)
      if (c) b.title = '"' + c.quote.slice(0, 160) + (c.quote.length > 160 ? '...' : '') + '"'
      parent.appendChild(b)
    }
  }
  text(s.slice(last))
}
function mdBlockEl(b, ctx) {
  let el
  if (b.t === 'code') {
    el = document.createElement('div'); el.className = 'a4-code'
    const h = document.createElement('div'); h.className = 'a4-code-h'
    const lang = document.createElement('span'); lang.textContent = b.lang || 'code'
    const cp = document.createElement('button'); cp.type = 'button'; cp.className = 'a4-copy'; cp.innerHTML = AI_IC.copy + '<span>Copy</span>'; cp.dataset.copy = '1'
    h.append(lang, cp)
    const pre = document.createElement('pre'), code = document.createElement('code'); code.textContent = b.text; pre.appendChild(code)
    el.append(h, pre)
  } else if (b.t === 'h') { el = document.createElement(b.level <= 2 ? 'h3' : 'h4'); mdInline(b.text, el, ctx) }
  else if (b.t === 'hr') el = document.createElement('hr')
  else if (b.t === 'quote') { el = document.createElement('blockquote'); mdInline(b.text, el, ctx) }
  else if (b.t === 'table') {
    el = document.createElement('div'); el.className = 'a4-table'
    const t = document.createElement('table'), th = document.createElement('thead'), tr = document.createElement('tr')
    b.head.forEach((c, i) => { const x = document.createElement('th'); if (b.align[i]) x.style.textAlign = b.align[i]; mdInline(c, x, ctx); tr.appendChild(x) })
    th.appendChild(tr); t.appendChild(th)
    const tb = document.createElement('tbody')
    for (const r of b.rows) { const rr = document.createElement('tr'); b.head.forEach((_, i) => { const x = document.createElement('td'); if (b.align[i]) x.style.textAlign = b.align[i]; mdInline(r[i] || '', x, ctx); rr.appendChild(x) }); tb.appendChild(rr) }
    t.appendChild(tb); el.appendChild(t)
  } else if (b.t === 'list') {
    const root = document.createElement(b.items[0] && b.items[0].ord ? 'ol' : 'ul')
    if (b.items[0] && b.items[0].ord && b.items[0].start > 1) root.start = b.items[0].start
    let lastLi = null, sub = null
    for (const it of b.items) {
      const li = document.createElement('li'); mdInline(it.text, li, ctx)
      if (it.level && lastLi) { if (!sub) { sub = document.createElement(it.ord ? 'ol' : 'ul'); lastLi.appendChild(sub) } sub.appendChild(li) }
      else { root.appendChild(li); lastLi = li; sub = null }
    }
    el = root
  } else { el = document.createElement('p'); mdInline(b.text, el, ctx) }
  return el
}
// renders src into box, keeping the nodes of blocks that did not change; new blocks rise in once
function mdRender(box, src, ctx, animate) {
  const blocks = mdBlocks(src)
  const cache = box._md || (box._md = [])
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i], c = cache[i]
    if (c && c.src === b.src && c.t === b.t) continue
    const el = mdBlockEl(b, ctx)
    if (c) { box.replaceChild(el, c.el) } else { box.appendChild(el); if (animate) el.classList.add('a4-in') }
    cache[i] = { src: b.src, t: b.t, el }
  }
  while (cache.length > blocks.length) { const c = cache.pop(); c.el.remove() }
}

// ---------------------------------------------------------------- state
let aiOpen = false, aiSeq = 0, aiShown = null, aiSt = {}, aiReadyKnown = false
const convs = new Map()          // tab id -> conversation
const reqs = new Map()           // request id -> bot message
let pendingQuote = ''
const LABELS = { summarize: 'Summarize this page', keypoints: 'Key points', explain: 'Explain this', define: 'Define this', rewrite: 'Rewrite this more clearly', translate: 'Translate this', tabs: 'Compare my open tabs', improve: 'Improve my writing', shorten: 'Make it shorter', grammar: 'Fix spelling and grammar' }
const TOOL = new Set(['improve', 'shorten', 'grammar'])
const PAGE_MODES = new Set(['summarize', 'keypoints', 'explain', 'define'])
function convFor(tabId, reset) {
  let c = convs.get(tabId)
  if (!c || reset) {
    if (c) { for (const m of c.msgs) if (m.req && reqs.has(m.req)) api.do('aiStop', m.req); api.do('aiForget', c.id) }
    c = { id: 'c' + (++aiSeq) + '-' + tabId, tabId, ctx: null, msgs: [], busy: null }
    convs.set(tabId, c)
  }
  return c
}

// ---------------------------------------------------------------- the panel
const panel = $('#aipanel')
panel.innerHTML = `
  <div class="a4-hero">
    <span class="a4-glyph" aria-hidden="true">${AI_IC.spark}</span><i class="a4-pool" aria-hidden="true"></i><i class="a4-grain" aria-hidden="true"></i>
    <div class="a4-top">
      <span class="a4-orb" aria-hidden="true">${AI_IC.spark}</span>
      <div class="grow"><div class="a4-eye">Lumen AI<b id="ai-tier">Fast</b></div><div class="a4-title" id="ai-title">Ask anything</div></div>
      <button class="a4-ib" id="ai-clear" title="New chat">${ICONS.plus}</button><button class="a4-ib" id="ai-close" title="Close Lumen AI">${ICONS.close}</button>
    </div>
    <div class="a4-ctx" id="ai-ctx"><span class="a4-fav" id="ai-fav"></span><span class="a4-ctx-t" id="ai-page"></span></div>
  </div>
  <div class="ai-actions a4-chips">
    <button class="ai-chip" data-ai="summarize">${ICONS.book}<span>Summarize</span></button>
    <button class="ai-chip" data-ai="keypoints">${ICONS.layers}<span>Key points</span></button>
    <button class="ai-chip" data-ai="explain">${ICONS.sparkle}<span>Explain selection</span></button>
    <button class="ai-chip" data-ai="tabs">${AI_IC.tabs}<span>All tabs</span><b id="ai-ntabs"></b></button>
  </div>
  <div class="ai-log" id="ai-log" aria-live="polite"></div>
  <div class="ai-nokey" id="ai-nokey">
    <div class="a4-setup">
      <span class="a4-orb big" aria-hidden="true">${AI_IC.spark}</span>
      <h4>Bring your own Claude key</h4>
      <p>Lumen AI runs on Claude with your own API key. Your key stays on this device, and nothing is sent until you ask.</p>
      <ol class="a4-steps"><li><b>1</b><span>Open the Anthropic Console and sign in</span></li><li><b>2</b><span>Create a key under API Keys</span></li><li><b>3</b><span>Paste it in Settings, Lumen AI</span></li></ol>
      <div class="a4-row"><button class="btn primary" id="ai-addkey">${ICONS.key}<span>Add API key</span></button><button class="btn" id="ai-console">Open Console</button></div>
    </div>
  </div>
  <div class="a4-quote" id="ai-quote" hidden><span>${AI_IC.quote}</span><div class="a4-quote-t" id="ai-quote-t"></div><button class="a4-ib sm" id="ai-quote-x" title="Remove">${ICONS.close}</button></div>
  <form class="ai-input" id="ai-form"><textarea id="ai-q" rows="1" placeholder="Ask about this page"></textarea><button class="ai-send" id="ai-send" type="submit" title="Send">${ICONS.arrowRight}</button></form>
  <div class="a4-foot">Answers can be wrong. Check what matters.</div>`
const aiLog = $('#ai-log'), aiQ = $('#ai-q')

async function refreshAI(opts) {
  const st = await api.do('aiStatus', opts || {}).catch(() => null) || {}
  aiSt = st; aiReadyKnown = !!st.ready
  panel.classList.toggle('nokey', !st.ready)
  $('#ai-tier').textContent = st.tierName || 'Fast'
  $('#ai-ntabs').textContent = st.tabs > 1 ? st.tabs : ''
  paintCtx()
  return st
}
function paintCtx() {
  const c = convs.get(aiShown)
  const tabs = c && c.ctx === 'tabs'
  $('#ai-title').textContent = tabs ? 'Your open tabs' : aiSt.web ? 'Ask this page' : 'Ask anything'
  const t = (typeof S !== 'undefined' && S.tabs.find(x => x.id === aiShown)) || null
  $('#ai-page').textContent = tabs ? `${aiSt.tabs || ''} tabs in this window` : (aiSt.title || hostOf(aiSt.url || '') || 'New Tab')
  $('#ai-fav').innerHTML = tabs ? AI_IC.tabs : t ? favHTML(t) : ICONS.globe
  aiQ.placeholder = tabs ? 'Ask about all your tabs' : aiSt.web ? 'Ask about this page' : 'Ask Lumen AI anything'
  panel.querySelector('[data-ai="summarize"]').disabled = panel.querySelector('[data-ai="keypoints"]').disabled = !aiSt.web
}
function openAI() {
  if (aiOpen) { refreshAI(); aiQ.focus(); return }
  aiOpen = true; panel.classList.add('open')
  aiW.to(AI_W)
  aiShown = S.activeId
  refreshAI().then(() => showConv(true))
  requestAnimationFrame(() => Jelly.kick && Jelly.kick(panel.querySelector('.a4-orb'), 0.9, 0.7))
  setTimeout(() => aiQ.focus(), 120)
}
function closeAI() { aiOpen = false; panel.classList.remove('open'); aiW.to(0) }
function toggleAI() { aiOpen ? closeAI() : openAI() }

// draws the conversation of the active tab (its nodes are kept on the messages, so switching back is instant)
function showConv(force) {
  if (!aiOpen) return
  const id = S.activeId
  if (!force && id === aiShown && aiLog.childNodes.length) return
  aiShown = id
  const c = convs.get(id)
  aiLog.textContent = ''
  if (!c || !c.msgs.length) aiLog.appendChild(welcomeEl())
  else for (const m of c.msgs) { aiLog.appendChild(msgEl(m)); if (m.role === 'bot') paintMsg(m) }
  panel.classList.toggle('busy', !!(c && c.busy))
  paintCtx()
  aiLog.scrollTop = aiLog.scrollHeight
  kickReveal()
}
function welcomeEl() {
  const el = document.createElement('div'); el.className = 'a4-welcome'
  const web = !!aiSt.web
  const sug = web
    ? [['summarize', 'book', 'Summarize this page'], ['keypoints', 'layers', 'What are the key points?'], ['chat:Explain the hardest idea on this page in simple words.', 'sparkle', 'Explain it simply'], ['tabs', 'tabs', 'Compare all my tabs']]
    : [['tabs', 'tabs', 'Compare all my tabs'], ['chat:Help me write a short, friendly email to ', 'pen', 'Help me write an email'], ['chat:Explain how ', 'sparkle', 'Explain how something works']]
  el.innerHTML = `<div class="a4-w-eye">${web ? 'Grounded in this page' : 'Your assistant'}</div><div class="a4-w-t">${web ? 'What would you like to know?' : 'How can I help?'}</div>
    <div class="a4-sugs">${sug.map(([k, i, t], n) => `<button class="a4-sug" data-run="${esc(k)}" style="--d:${n * 45}ms"><span>${aiIcon(i)}</span>${esc(t)}</button>`).join('')}</div>
    <div class="a4-tips"><span><kbd>${K.cmd}</kbd><kbd>K</kbd> then a question</span><span>Select text for quick actions</span></div>`
  return el
}

// ---------------------------------------------------------------- messages
function msgEl(m) {
  if (m.el) return m.el
  const el = document.createElement('div')
  el.className = 'ai-msg ' + m.role
  if (m.role === 'user') {
    const t = document.createElement('div'); t.className = 'a4-u'; t.textContent = m.label || m.text; el.appendChild(t)
    if (m.quote) { const q = document.createElement('blockquote'); q.textContent = m.quote.length > 280 ? m.quote.slice(0, 280) + '...' : m.quote; el.appendChild(q) }
  } else if (m.role === 'note') { const p = document.createElement('p'); p.textContent = m.text; el.appendChild(p) }
  else {
    el.dataset.id = m.req || ''
    el.innerHTML = '<div class="a4-md"></div><div class="a4-src"></div><div class="a4-bar"></div>'
    m.md = el.firstChild; m.shown = m.shown || 0
  }
  m.el = el
  if (aiOpen) requestAnimationFrame(() => Jelly.kick && Jelly.kick(el, 0.5, 0.4))
  return el
}
function revealTo(m) {
  // a citation marker is shown whole or not at all
  let n = Math.min(m.raw.length, m.shown)
  const a = m.raw.lastIndexOf(MK, n - 1), b = m.raw.lastIndexOf(MK2, n - 1)
  if (a > b) { const e = m.raw.indexOf(MK2, a); n = e < 0 ? a : e + 1 }
  return n
}
// paints a bot message in its current state (dots, streaming text, answer with actions, stopped, error)
function paintMsg(m) {
  if (!m.el) return
  const el = m.el
  el.classList.toggle('err', m.state === 'error')
  el.classList.toggle('streaming', m.state === 'wait' || m.state === 'stream')
  if (m.state === 'wait' && !m.raw) { if (!m.md.querySelector('.ai-dots')) { m.md.textContent = ''; m.md._md = null; m.md.innerHTML = '<div class="ai-dots"><i></i><i></i><i></i></div>' } return }
  if (m.state === 'error') { paintError(m); return }
  if (m.md.querySelector('.ai-dots')) { m.md.textContent = ''; m.md._md = null }
  const n = m.state === 'stream' || m.state === 'wait' ? revealTo(m) : m.raw.length
  mdRender(m.md, m.raw.slice(0, n), m, m.state === 'stream')
  let caret = m.md.querySelector('.a4-caret')
  if (m.state === 'stream' || (m.state === 'wait' && m.raw)) {
    if (!caret) { caret = document.createElement('i'); caret.className = 'a4-caret' }
    const last = m.md.lastElementChild
    const host = last && last.classList.contains('a4-code') ? last.querySelector('code') : last && (last.lastElementChild && /^(LI)$/.test(last.lastElementChild.tagName) ? last.lastElementChild : last)
    if (host && caret.parentNode !== host) host.appendChild(caret)
    else if (!host && caret.parentNode !== m.md) m.md.appendChild(caret)
    else if (host && host.lastChild !== caret) host.appendChild(caret)
  } else if (caret) caret.remove()
  paintSources(m)
  paintBar(m)
}
function paintSources(m) {
  const box = m.el.querySelector('.a4-src')
  const done = m.state !== 'stream' && m.state !== 'wait'
  if (!m.cites.length || !done) { if (box.childNodes.length) box.textContent = ''; return }
  if (box.dataset.n === String(m.cites.length)) return
  box.dataset.n = m.cites.length; box.textContent = ''
  const h = document.createElement('div'); h.className = 'a4-src-h'; h.textContent = m.cites.length === 1 ? 'Source' : `${m.cites.length} sources`
  box.appendChild(h)
  const multi = new Set(m.cites.map(c => c.tabId)).size > 1
  for (const c of m.cites.slice(0, 12)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'a4-srcq'; b.dataset.n = c.n
    const n = document.createElement('b'); n.textContent = c.n
    const q = document.createElement('span'); q.textContent = c.quote.length > 150 ? c.quote.slice(0, 150) + '...' : c.quote
    b.append(n, q)
    if (multi && c.title) { const t = document.createElement('em'); t.textContent = c.title; b.appendChild(t) }
    box.appendChild(b)
  }
}
function paintBar(m) {
  const bar = m.el.querySelector('.a4-bar')
  const key = m.state + (m.last ? 'L' : '') + (m.write ? 'W' : '')
  if (bar.dataset.k === key) return
  bar.dataset.k = key; bar.textContent = ''
  if (m.state !== 'done' && m.state !== 'stopped') return
  const btn = (k, icon, label, primary) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'a4-act' + (primary ? ' primary' : ''); b.dataset.act = k; b.innerHTML = aiIcon(icon); const s = document.createElement('span'); s.textContent = label; b.appendChild(s); bar.appendChild(b); return b }
  if (m.state === 'stopped') { const s = document.createElement('span'); s.className = 'a4-stopped'; s.textContent = 'Stopped'; bar.appendChild(s) }
  if (m.write && m.state === 'done') btn('replace', 'replace', 'Replace in page', true)
  if (m.raw) btn('copy', 'copy', 'Copy')
  if (m.last) btn('regen', 'regen', m.state === 'stopped' ? 'Try again' : 'Regenerate')
}
const ERR_INFO = {
  nokey: ['key', 'Add your Claude key', [['settings', 'Add API key', true]]],
  badkey: ['key', 'Your key was not accepted', [['settings', 'Check your key', true], ['retry', 'Try again']]],
  rate: ['hourglass', 'Slow down a little', [['retry', 'Try again', true]]],
  overloaded: ['hourglass', 'Claude is busy', [['retry', 'Try again', true], ['fast', 'Use Fast']]],
  offline: ['wifi', 'You seem to be offline', [['retry', 'Try again', true]]],
  toolong: ['book', 'That is a lot to read', []],
  refusal: ['shield', 'Claude did not answer', [['retry', 'Ask again']]],
  nopage: ['globe', 'Open a web page first', []],
  other: ['warn', 'Something went wrong', [['retry', 'Try again', true]]],
}
function paintError(m) {
  if (m.md.dataset.err === m.err.kind + m.err.message) return
  const [icon, title, acts] = ERR_INFO[m.err.kind] || ERR_INFO.other
  m.md._md = null; m.md.textContent = ''; m.md.dataset.err = m.err.kind + m.err.message
  const card = document.createElement('div'); card.className = 'a4-err k-' + (ERR_INFO[m.err.kind] ? m.err.kind : 'other')
  card.innerHTML = `<span class="a4-err-ic">${aiIcon(icon)}</span><div class="grow"><b></b><p></p></div>`
  card.querySelector('b').textContent = title
  card.querySelector('p').textContent = m.err.message + (m.err.kind === 'rate' && m.err.retryAfter ? ` Try again in about ${m.err.retryAfter} seconds.` : '')
  const row = document.createElement('div'); row.className = 'a4-err-acts'
  for (const [k, l, p] of acts) { if (k === 'fast' && aiSt.tier === 'fast') continue; const b = document.createElement('button'); b.type = 'button'; b.className = 'a4-act' + (p ? ' primary' : ''); b.dataset.act = k; b.textContent = l; row.appendChild(b) }
  if (row.childNodes.length) card.querySelector('.grow').appendChild(row)
  m.md.appendChild(card)
  m.el.querySelector('.a4-bar').textContent = ''; m.el.querySelector('.a4-bar').dataset.k = ''
}

// one loop for every streaming answer on screen: it reveals text a frame at a time and ends when all is shown
let revealing = false
function kickReveal() { if (!revealing) { revealing = true; requestAnimationFrame(revealTick) } }
function revealTick() {
  let more = false
  for (const m of reqs.values()) {
    if (!onScreen(m)) continue
    if (m.state === 'wait' && !m.raw) continue
    const behind = m.raw.length - m.shown
    if (behind > 0) {
      m.shown += Math.max(3, Math.ceil(behind / 7))
      paintMsg(m)
      stick()
      if (m.shown < m.raw.length) more = true
    }
  }
  for (const m of finishing) { if (onScreen(m) && m.shown < m.raw.length) { m.shown += Math.max(4, Math.ceil((m.raw.length - m.shown) / 5)); paintMsg(m); stick(); more = true } else { finishing.delete(m); paintMsg(m); stick() } }
  if (more) requestAnimationFrame(revealTick); else revealing = false
}
const finishing = new Set()
// only answers someone can see are drawn: a closed panel costs nothing, and catches up when it opens
const onScreen = m => !!(m.el && m.el.isConnected && (cmdAI && cmdAI.m === m ? overlayOpen === 'cmd' : aiOpen))
let stickPending = false
function stick() {
  // follow the answer while the reader is at the bottom; leave them be if they scrolled up to read
  const log = aiLog
  if (log.scrollHeight - log.scrollTop - log.clientHeight < 90) log.scrollTop = log.scrollHeight
}

// ---------------------------------------------------------------- asking
function history(c, before) {
  const out = []
  for (const m of c.msgs) {
    if (m === before) break
    if (m.role === 'user' && !m.solo && m.prompt && m.answer && m.answer.state === 'done' && m.answer.raw) out.push({ role: 'user', content: m.prompt }, { role: 'assistant', content: mdClean(m.answer.raw) })
  }
  return out.slice(-16)
}
async function aiRun(mode, text, opts = {}) {
  if (!aiOpen) openAI()
  const st = await refreshAI(mode === 'explain' && !text ? { sel: true } : null)
  if (!st.ready) return
  if (mode === 'explain' && !text) text = st.sel
  const tabId = opts.tabId != null && S.tabs.some(t => t.id === opts.tabId) ? opts.tabId : st.tabId
  if (mode === 'ask') { setQuote(text); aiQ.focus(); return }
  if (mode === 'explain' && !text) { note(tabId, 'Highlight some text on the page first, then press Explain selection, or use the bubble that appears over your selection.'); return }
  let c = convFor(tabId)
  if (mode === 'tabs' && c.ctx && c.ctx !== 'tabs') c = convFor(tabId, true)
  else if (c.ctx === 'tabs' && PAGE_MODES.has(mode)) c = convFor(tabId, true)
  if (!c.ctx) c.ctx = mode === 'tabs' ? 'tabs' : TOOL.has(mode) ? (st.web ? 'page' : 'none') : st.web ? 'page' : 'none'
  if (c.busy) api.do('aiStop', c.busy)
  let shown = mode === 'chat' ? text : LABELS[mode] || text, quote = ''
  if (['explain', 'define', 'rewrite', 'translate'].includes(mode) || TOOL.has(mode)) quote = text
  if (mode === 'chat' && opts.quote) { quote = opts.quote; text = `About this passage from the page:\n<passage>\n${opts.quote.slice(0, 6000)}\n</passage>\n\n${text}` ; shown = opts.shown || shown }
  if (mode === 'tabs' && text) shown = text
  const u = { role: 'user', mode, text, label: shown, quote, tabId, solo: TOOL.has(mode), write: !!opts.write || TOOL.has(mode) }
  c.msgs.push(u)
  send(c, u)
}
function send(c, u, bot) {
  for (const m of c.msgs) m.last = false
  const id = 'r' + (++aiSeq)
  const b = bot || { role: 'bot' }
  Object.assign(b, { req: id, raw: '', shown: 0, cites: [], state: 'wait', err: null, last: true, write: u.write, user: u, tabId: u.tabId })
  if (b.md) { b.md._md = null; b.md.textContent = ''; b.md.dataset.err = '' ; b.el.querySelector('.a4-src').dataset.n = '' }
  if (b.el) b.el.dataset.id = id
  if (!bot) c.msgs.push(b)
  u.answer = b
  reqs.set(id, b); c.busy = id
  if (aiOpen && aiShown === c.tabId) {
    const w = aiLog.querySelector('.a4-welcome'); if (w) w.remove()
    if (!u.el || !u.el.isConnected) aiLog.appendChild(msgEl(u))
    if (!b.el || !b.el.isConnected) aiLog.appendChild(msgEl(b))
    paintMsg(b); panel.classList.add('busy'); paintCtx()
    aiLog.scrollTop = aiLog.scrollHeight
  }
  for (const m of c.msgs) if (m.role === 'bot' && m !== b && m.el) paintBar(m)
  api.do('aiAsk', { id, conv: c.id, tabId: u.tabId, mode: u.mode, text: u.text, ctx: c.ctx, history: u.solo ? [] : history(c, u) })
}
function note(tabId, text) {
  const c = convFor(tabId), m = { role: 'note', text }
  c.msgs.push(m)
  if (aiOpen && aiShown === tabId) { const w = aiLog.querySelector('.a4-welcome'); if (w) w.remove(); aiLog.appendChild(msgEl(m)); aiLog.scrollTop = aiLog.scrollHeight }
}
function convOfReq(id) { for (const c of convs.values()) if (c.busy === id || c.msgs.some(m => m.req === id)) return c; return null }
api.on('ai', ev => {
  const m = reqs.get(ev.id)
  if (!m) return
  if (ev.start) { m.docs = ev.docs; return }
  if (ev.delta) { m.raw += ev.delta.replace(/[\uE000\uE001]/g, ''); if (m.state === 'wait') m.state = 'stream'; if (onScreen(m)) kickReveal(); return }
  if (ev.cite) {
    if (!m.cites.some(c => c.n === ev.cite.n)) m.cites.push(ev.cite)
    m.raw += MK + ev.cite.n + MK2
    return
  }
  if (ev.done || ev.error) {
    const c = convOfReq(ev.id)
    if (c && c.busy === ev.id) c.busy = null
    if (ev.error) { m.state = 'error'; m.err = { kind: ev.kind || 'other', message: ev.error, retryAfter: ev.retryAfter } }
    else if (ev.stopped) m.state = 'stopped'
    else { m.state = 'done'; if (m.user && ev.prompt) m.user.prompt = ev.prompt }
    reqs.delete(ev.id)
    if (m.onDone) m.onDone(m)
    if (c && aiOpen && aiShown === c.tabId) panel.classList.remove('busy')
    if (onScreen(m)) {
      if (m.state !== 'error' && m.shown < m.raw.length) { finishing.add(m); kickReveal() } else paintMsg(m)
      stick()
    }
  }
})

// ---------------------------------------------------------------- panel events
function setQuote(t) {
  pendingQuote = String(t || '').trim()
  $('#ai-quote').hidden = !pendingQuote
  $('#ai-quote-t').textContent = pendingQuote.length > 220 ? pendingQuote.slice(0, 220) + '...' : pendingQuote
  if (pendingQuote) requestAnimationFrame(() => Jelly.kick && Jelly.kick($('#ai-quote'), 0.6, 0.4))
}
$('#ai-quote-x').onclick = () => setQuote('')
$('#ai-form').addEventListener('submit', e => {
  e.preventDefault()
  const c = convs.get(S.activeId)
  if (c && c.busy && !aiQ.value.trim()) { api.do('aiStop', c.busy); return }
  const q = aiQ.value.trim(); if (!q) return
  aiQ.value = ''; aiQ.style.height = ''
  const quote = pendingQuote; setQuote('')
  const cur = convs.get(S.activeId)
  aiRun(cur && cur.ctx === 'tabs' ? 'tabs' : 'chat', q, quote ? { quote, shown: q } : {})
})
aiQ.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#ai-form').requestSubmit() } else if (e.key === 'Escape') closeAI() })
aiQ.addEventListener('input', () => { aiQ.style.height = ''; aiQ.style.height = Math.min(140, aiQ.scrollHeight) + 'px'; panel.classList.toggle('typing', !!aiQ.value.trim()) })
$('#ai-send').addEventListener('click', e => { const c = convs.get(S.activeId); if (c && c.busy && !aiQ.value.trim()) { e.preventDefault(); api.do('aiStop', c.busy) } })
panel.querySelector('.ai-actions').addEventListener('click', e => { const b = e.target.closest('[data-ai]'); if (b && !b.disabled) aiRun(b.dataset.ai) })
$('#ai-close').onclick = closeAI
$('#ai-clear').onclick = () => { const id = S.activeId; convFor(id, true); setQuote(''); showConv(true); aiQ.focus() }
$('#ai-addkey').onclick = () => api.do('openPage', 'settings/ai')
$('#ai-console').onclick = () => api.do('navigate', 'https://console.anthropic.com/settings/keys', true)
aiLog.addEventListener('click', e => {
  const sug = e.target.closest('.a4-sug')
  if (sug) { const r = sug.dataset.run; if (r.startsWith('chat:')) { aiQ.value = r.slice(5); aiQ.focus(); aiQ.setSelectionRange(aiQ.value.length, aiQ.value.length); if (/[.?]$/.test(aiQ.value)) $('#ai-form').requestSubmit() } else aiRun(r); return }
  const msgEl_ = e.target.closest('.ai-msg.bot')
  const c = convs.get(S.activeId)
  const m = c && msgEl_ ? c.msgs.find(x => x.el === msgEl_) : null
  handleMsgClick(e, m, c)
})
function handleMsgClick(e, m, c) {
  const link = e.target.closest('a.a4-link')
  if (link) { e.preventDefault(); if (/^https?:/.test(link.dataset.url || '')) api.do('navigate', link.dataset.url, true); return true }
  if (!m) return false
  const cp = e.target.closest('[data-copy]')
  if (cp) { const code = cp.closest('.a4-code').querySelector('code').textContent; api.do('copyText', code); flash(cp, 'Copied'); return true }
  const cite = e.target.closest('.a4-cite, .a4-srcq')
  if (cite) {
    const q = m.cites.find(x => x.n === +cite.dataset.n)
    if (q) { cite.classList.add('hit'); api.do('aiCite', { tabId: q.tabId, quote: q.quote }).then(r => { cite.classList.remove('hit'); if (r && !r.found) toast(r.gone ? 'That tab is closed' : 'Could not find that passage on the page') }) }
    return true
  }
  const act = e.target.closest('[data-act]')
  if (!act) return false
  const k = act.dataset.act
  if (k === 'copy') { api.do('copyText', mdClean(m.raw)); flash(act, 'Copied') }
  else if (k === 'replace') { api.do('aiReplace', { tabId: m.tabId, text: mdClean(m.raw).trim() }).then(ok => toast(ok ? 'Replaced in the page' : 'That field is gone')) }
  else if (k === 'settings') api.do('openPage', 'settings/ai')
  else if (k === 'fast') { api.do('setSetting', 'aiModel', 'fast'); aiSt.tier = 'fast'; if (c && m.user) send(c, m.user, m) }
  else if ((k === 'regen' || k === 'retry') && c && m.user) send(c, m.user, m)
  return true
}
function flash(b, label) {
  const s = b.querySelector('span'); if (!s) return
  const was = s.textContent; s.textContent = label; b.classList.add('ok')
  Jelly.kick && Jelly.kick(b, 0.6, 0.4)
  setTimeout(() => { s.textContent = was; b.classList.remove('ok') }, 1300)
}
// tabs: show the conversation of the tab in front, forget the ones of tabs that closed
api.on('state', s => {
  if (convs.size) { const live = new Set(s.tabs.map(t => t.id)); for (const id of convs.keys()) if (!live.has(id)) convs.delete(id) }
  if (aiOpen && s.activeId !== aiShown) refreshAI().then(() => showConv())
})

// legacy helper kept for older tests: adds a static bubble (never used with model text)
function aiBubble(role, html) {
  const el = document.createElement('div'); el.className = 'ai-msg ' + role; el.innerHTML = html
  const w = aiLog.querySelector('.a4-welcome'); if (w) w.remove()
  aiLog.appendChild(el); aiLog.scrollTop = aiLog.scrollHeight
  return el
}

// ---------------------------------------------------------------- the command bar: questions and actions
const AI_Q = /^(what|why|how|who|whom|when|where|which|whats|what's|is|are|can|could|should|would|does|do|did|will|explain|summari[sz]e|tell me|compare|write|draft|translate|define|give me|help me)\b/i
const AI_ACT = /^(close|group|open|reopen|mute|unmute|pin|unpin|switch to|go to|organi[sz]e|sort)\b.*\b(tabs?|pages?|sites?|windows?|youtube|github|videos?|articles?|ones?)\b/i
function aiCmdRows(qq, out) {
  const q = qq.trim(); if (q.length < 4) return
  const words = q.split(/\s+/).length
  if (AI_ACT.test(q) && words >= 2) { out.unshift({ sec: '', icon: `<span class="a4-ri">${AI_IC.spark}</span>`, title: q, sub: '  Do it with Lumen AI', key: 'AI', ai: true, go: () => cmdPlan(q) }); return }
  const qy = /\?\s*$/.test(q) || (AI_Q.test(q) && words >= 3) || words >= 7
  if (!qy) return
  const row = { sec: '', icon: `<span class="a4-ri">${AI_IC.spark}</span>`, title: q, sub: '  Ask Lumen AI', key: 'Ask', ai: true, go: () => cmdAsk(q) }
  if (/\?\s*$/.test(q)) out.unshift(row); else out.splice(Math.min(1, out.length), 0, row)
}
let cmdAI = null   // { kind, m?, token? }
const aiCmdBusy = () => !!cmdAI
function cmdAIBox() {
  let box = $('#cmd-ai')
  if (!box) { box = document.createElement('div'); box.id = 'cmd-ai'; box.className = 'a4k'; $('#cmdbar').insertBefore(box, $('#cmdbar .cmdfoot')) }
  return box
}
function cmdAIEnd() {
  if (!cmdAI) return
  if (cmdAI.m && cmdAI.m.req && reqs.has(cmdAI.m.req)) api.do('aiStop', cmdAI.m.req)
  cmdAI = null
  $('#cmdbar').classList.remove('aimode')
  const b = $('#cmd-ai'); if (b) b.textContent = ''
}
function cmdHead(kind, q) {
  return `<div class="a4k-head"><span class="a4-orb sm">${AI_IC.spark}</span><div class="grow"><div class="a4k-eye">${kind}</div><div class="a4k-q"></div></div></div>`
}
async function cmdAsk(q) {
  const st = await refreshAI()
  if (!st.ready) { closeCmd(true); openAI(); return }
  cmdAIEnd()
  const box = cmdAIBox(); $('#cmdbar').classList.add('aimode')
  box.innerHTML = cmdHead('Lumen AI') + '<div class="ai-msg bot a4k-ans"><div class="a4-md"></div><div class="a4-src"></div><div class="a4-bar"></div></div><div class="a4k-bar"><button class="a4-act primary" data-k="panel">' + AI_IC.enter + '<span>Continue in panel</span></button><button class="a4-act" data-k="copy">' + AI_IC.copy + '<span>Copy</span></button><button class="a4-act" data-k="stop">' + AI_IC.stop + '<span>Stop</span></button></div>'
  box.querySelector('.a4k-q').textContent = q
  const el = box.querySelector('.a4k-ans')
  const id = 'r' + (++aiSeq)
  const page = st.web && /\b(this|the) (page|article|site|post|story|video|doc|document|thread|paper)\b|\bhere\b|summari[sz]e|tl;?dr/i.test(q)
  const u = { role: 'user', mode: 'chat', text: q, label: q, tabId: st.tabId }
  const m = { role: 'bot', req: id, raw: '', shown: 0, cites: [], state: 'wait', el, md: el.firstChild, user: u, tabId: st.tabId, ctx: page ? 'page' : 'none', conv: 'k' + id }
  u.answer = m
  cmdAI = { kind: 'ask', m, q }
  reqs.set(id, m); paintMsg(m)
  m.onDone = mm => { const s = box.querySelector('[data-k="stop"]'); if (s) s.remove(); if (mm.user && mm.state === 'done') mm.user.prompt = mm.user.prompt || q }
  results = [{ go: () => cmdToPanel() }]; sel = 0
  api.do('aiAsk', { id, conv: m.conv, tabId: st.tabId, mode: 'chat', text: q, ctx: m.ctx, history: [] })
}
// the command bar answer moves into the tab's chat, so it can be followed up
function cmdToPanel() {
  if (!cmdAI || cmdAI.kind !== 'ask') return
  const m = cmdAI.m, u = m.user
  const c = convFor(u.tabId, true)
  c.ctx = m.ctx; c.id = m.conv
  const el = m.el; m.el = null; m.md = null
  c.msgs.push(u, m); m.last = true
  if (reqs.has(m.req)) c.busy = m.req
  el.remove()
  cmdAI = null
  closeCmd(true)
  openAI(); showConv(true)
}
async function cmdPlan(q) {
  const st = await refreshAI()
  if (!st.ready) { closeCmd(true); openAI(); return }
  cmdAIEnd()
  const box = cmdAIBox(); $('#cmdbar').classList.add('aimode')
  box.innerHTML = cmdHead('Lumen AI action') + '<div class="a4k-plan"><div class="ai-dots"><i></i><i></i><i></i></div><span class="a4k-wait">Working out what to do</span></div>'
  box.querySelector('.a4k-q').textContent = q
  const my = cmdAI = { kind: 'plan', q }
  results = []; sel = 0
  const p = await api.do('aiPlan', { q })
  if (cmdAI !== my) return
  const plan = box.querySelector('.a4k-plan'); plan.textContent = ''
  if (!p || p.error) {
    const fake = { el: document.createElement('div'), err: { kind: (p && p.kind) || 'other', message: (p && p.error) || 'Lumen AI could not do that.' } }
    fake.md = fake.el; fake.el.innerHTML = ''
    const [icon, title] = ERR_INFO[fake.err.kind] || ERR_INFO.other
    plan.innerHTML = `<div class="a4-err k-${esc(fake.err.kind)}"><span class="a4-err-ic">${aiIcon(icon)}</span><div class="grow"><b>${esc(title)}</b><p></p></div></div>`
    plan.querySelector('p').textContent = fake.err.message
    return
  }
  my.token = p.token
  const reply = document.createElement('div'); reply.className = 'a4k-reply'; reply.textContent = p.reply || (p.steps.length ? 'Here is the plan.' : 'Nothing to do.')
  plan.appendChild(reply)
  const VERB = { close: 'Close', group: 'Group', open: 'Open', switch: 'Go to', mute: 'Mute', unmute: 'Unmute', pin: 'Pin', unpin: 'Unpin' }
  for (const s of p.steps) {
    const row = document.createElement('div'); row.className = 'a4k-step s-' + s.do
    const n = (s.tabs || []).length || (s.urls || []).length
    const h = document.createElement('div'); h.className = 'a4k-step-h'
    h.innerHTML = `<span class="a4k-verb">${esc(VERB[s.do] || s.do)}</span>`
    const t = document.createElement('span'); t.textContent = s.do === 'group' ? `${n} tab${n > 1 ? 's' : ''} as ${s.name}` : s.do === 'open' ? `${n} page${n > 1 ? 's' : ''}` : `${n} tab${n > 1 ? 's' : ''}`
    h.appendChild(t)
    if (s.do === 'group') { const d = document.createElement('i'); d.className = 'a4k-dot'; d.style.background = GROUP_COLORS[s.color] || GROUP_COLORS.pink; h.prepend(d) }
    row.appendChild(h)
    const list = document.createElement('div'); list.className = 'a4k-items'
    for (const x of (s.tabs || []).concat(s.urls || []).slice(0, 6)) {
      const it = document.createElement('div'); it.className = 'a4k-item'
      it.innerHTML = favHTML({ url: x.url, favicon: x.favicon || '' })
      const tt = document.createElement('span'); tt.textContent = x.title || hostOf(x.url); it.appendChild(tt)
      const hh = document.createElement('em'); hh.textContent = hostOf(x.url); it.appendChild(hh)
      list.appendChild(it)
    }
    if (n > 6) { const more = document.createElement('div'); more.className = 'a4k-more'; more.textContent = `and ${n - 6} more`; list.appendChild(more) }
    row.appendChild(list); plan.appendChild(row)
  }
  if (p.steps.length) {
    const bar = document.createElement('div'); bar.className = 'a4k-bar'
    bar.innerHTML = `<button class="a4-act primary" data-k="do">${AI_IC.enter}<span>Do it</span></button><button class="a4-act" data-k="cancel"><span>Cancel</span></button>`
    plan.appendChild(bar)
    results = [{ go: () => cmdDo() }]; sel = 0
  }
  novaStagger(plan.children, { step: 45, y: 6 })
}
async function cmdDo() {
  if (!cmdAI || !cmdAI.token) return
  const token = cmdAI.token; cmdAI = null
  const r = await api.do('aiAct', token)
  closeCmd(true)
  toast(r && r.done ? 'Done' : 'Nothing changed')
}
document.addEventListener('click', e => {
  const box = e.target.closest('#cmd-ai'); if (!box || !cmdAI) return
  const b = e.target.closest('[data-k]')
  if (b) {
    const k = b.dataset.k
    if (k === 'panel') cmdToPanel()
    else if (k === 'copy' && cmdAI.m) { api.do('copyText', mdClean(cmdAI.m.raw)); flash(b, 'Copied') }
    else if (k === 'stop' && cmdAI.m) api.do('aiStop', cmdAI.m.req)
    else if (k === 'do') cmdDo()
    else if (k === 'cancel') closeCmd()
    return
  }
  if (cmdAI.m) handleMsgClick(e, cmdAI.m, null)
})
// typing again leaves the answer; closing the bar stops it
cmdInput.addEventListener('input', () => { if (cmdAI) cmdAIEnd() })
{ const _close = closeCmd; closeCmd = function (instant) { cmdAIEnd(); return _close(instant) } }

// ---------------------------------------------------------------- the chrome's AI commands (menu, shortcut, page)
function aiCommand(c) {
  if (c.ai === 'chat' || c.ai === 'ask') { openAI(); if (c.ai === 'ask') { aiRun('ask', c.text, { tabId: c.tabId }); return } aiRun('chat', c.text, { tabId: c.tabId }); return }
  openAI(); aiRun(c.ai, c.text, { tabId: c.tabId, write: !!c.write })
}
