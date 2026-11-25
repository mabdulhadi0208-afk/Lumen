// Lumen AI: the Claude API with the user's own key (kept here, in the main process, and never shown to a page).
// Streaming answers, page grounding with cited quotes, prompt caching of the page, and errors that read as sentences.
const { net } = require('electron')
const D = require('./data')

// read on every call so tests can point it at a local mock server
const API = () => process.env.LUMEN_AI_API || 'https://api.anthropic.com/v1/messages'
const MODELS_URL = () => API().replace(/\/messages\/?$/, '/models')
const MODELS = { fast: 'claude-haiku-5-5', smart: 'claude-sonnet-5-5', best: 'claude-opus-5-5' }
// Effort per tier: a side panel answer should arrive quickly, Best is allowed to think harder.
const EFFORT = { fast: 'low', smart: 'low', best: 'medium' }
const TIER_NAMES = { fast: 'Fast', smart: 'Smart', best: 'Best' }

const key = () => { const k = D.settings.get('aiKey'); return k ? D.dec(k) : '' }
const ready = () => !!key()
function setKey(k) {
  k = String(k || '').trim()
  D.settings.set({ aiKey: k ? D.enc(k) : '' })
  return ready()
}
const tier = () => MODELS[D.settings.get('aiModel')] ? D.settings.get('aiModel') : 'fast'
const model = () => MODELS[tier()]

function headers(k = key(), withFallback = false) {
  const h = { 'content-type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' }
  if (withFallback) h['anthropic-beta'] = 'server-side-fallback-2026-07-01'
  return h
}

// An error that knows what went wrong, so the panel can show the right card and the right button.
// kind: nokey | badkey | rate | overloaded | offline | toolong | refusal | other
function aiError(kind, message, extra) { const e = new Error(message); e.kind = kind; Object.assign(e, extra || {}); return e }
const MESSAGES = {
  nokey: 'Add your Claude API key in Settings, Lumen AI, to start asking.',
  badkey: 'That API key was not accepted. It may have been revoked or mistyped.',
  rate: 'You are sending requests faster than your API plan allows.',
  overloaded: 'Claude is very busy right now. Your key is fine.',
  offline: 'Lumen could not reach the AI service. Check your internet connection.',
  toolong: 'This is more text than the model can read at once. Try a shorter selection or fewer tabs.',
  refusal: 'Claude declined to answer this one.',
}
function errFor(status, body, h) {
  let msg = '', type = ''
  try { const j = JSON.parse(body); msg = j.error.message || ''; type = j.error.type || '' } catch { msg = String(body || '').slice(0, 200) }
  if (status === 401 || status === 403 || type === 'authentication_error' || type === 'permission_error') return aiError('badkey', MESSAGES.badkey)
  if (status === 429) { const ra = Math.max(1, Math.min(600, parseInt(h && h.get && h.get('retry-after'), 10) || 20)); return aiError('rate', MESSAGES.rate, { retryAfter: ra }) }
  if (status === 529 || status === 503 || status === 500 || type === 'overloaded_error') return aiError('overloaded', MESSAGES.overloaded)
  if (status === 413 || /prompt is too long|too many tokens|context/i.test(msg)) return aiError('toolong', MESSAGES.toolong)
  if (status === 402 || type === 'billing_error') return aiError('other', 'Your Anthropic account is out of credit. Add credit at console.anthropic.com, then try again.')
  return aiError('other', `The AI request failed (${status})${msg ? ': ' + msg : ''}`)
}

// A failed connection (offline, captive portal, blocked) reads as a plain sentence, not a net:: code.
async function post(body, signal, withFallback) {
  try { return await net.fetch(API(), { method: 'POST', headers: headers(key(), withFallback), signal, body: JSON.stringify(body) }) }
  catch (e) {
    if (e.name === 'AbortError' || (signal && signal.aborted)) { const a = new Error('Stopped'); a.name = 'AbortError'; throw a }
    throw aiError('offline', MESSAGES.offline)
  }
}

function requestBody({ system, messages, maxTokens }, streaming) {
  const t = tier(), body = { model: MODELS[t], max_tokens: maxTokens, system, messages, output_config: { effort: EFFORT[t] } }
  if (streaming) body.stream = true
  // the conversation so far is cached too, so a follow-up only pays for the new question
  body.cache_control = { type: 'ephemeral' }
  // Sonnet and Opus: if Claude declines on a safety classifier, the API retries on a fallback model in the same call
  if (t !== 'fast') body.fallbacks = 'default'
  return { body, withFallback: t !== 'fast' }
}

// Streams a reply. on({ text }) for text, on({ cite }) when a text block with citations closes. Returns the full text.
async function stream(req, on, signal) {
  if (!ready()) throw aiError('nokey', MESSAGES.nokey)
  const { body, withFallback } = requestBody({ maxTokens: 16000, ...req }, true)
  const res = await post(body, signal, withFallback)
  if (!res.ok) throw errFor(res.status, await res.text().catch(() => ''), res.headers)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = '', full = '', stop = '', usage = null
  const blocks = new Map()   // index -> { text: bool, cites: [] }
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let i
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const chunk = buf.slice(0, i); buf = buf.slice(i + 2)
        const line = chunk.split('\n').find(l => l.startsWith('data:'))
        if (!line) continue
        let ev; try { ev = JSON.parse(line.slice(5).trim()) } catch { continue }
        if (ev.type === 'content_block_start') blocks.set(ev.index, { text: ev.content_block && ev.content_block.type === 'text', cites: [] })
        else if (ev.type === 'content_block_delta' && ev.delta) {
          const b = blocks.get(ev.index) || { text: true, cites: [] }
          if (ev.delta.type === 'text_delta' && ev.delta.text) { full += ev.delta.text; on({ text: ev.delta.text }) }
          else if (ev.delta.type === 'citations_delta' && ev.delta.citation) b.cites.push(ev.delta.citation)
          blocks.set(ev.index, b)
        } else if (ev.type === 'content_block_stop') {
          const b = blocks.get(ev.index)
          if (b && b.cites.length) for (const c of b.cites) on({ cite: { quote: String(c.cited_text || '').trim(), doc: c.document_index | 0, title: c.document_title || '' } })
        } else if (ev.type === 'message_delta' && ev.delta) { if (ev.delta.stop_reason) stop = ev.delta.stop_reason; if (ev.usage) usage = ev.usage }
        else if (ev.type === 'message_start' && ev.message && ev.message.usage) usage = ev.message.usage
        else if (ev.type === 'error') {
          const t = ev.error && ev.error.type
          if (t === 'overloaded_error') throw aiError('overloaded', MESSAGES.overloaded)
          if (t === 'rate_limit_error') throw aiError('rate', MESSAGES.rate, { retryAfter: 20 })
          throw aiError('other', (ev.error && ev.error.message) || 'The answer was cut off by an error.')
        }
      }
    }
  } catch (e) {
    if (e.name === 'AbortError' || (signal && signal.aborted)) { const a = new Error('Stopped'); a.name = 'AbortError'; throw a }
    if (e.kind) throw e
    throw aiError('offline', 'The connection dropped while Claude was answering. Try again.')
  }
  if (stop === 'refusal' && !full.trim()) throw aiError('refusal', MESSAGES.refusal)
  return { text: full, stop, usage }
}

async function once({ system, messages, maxTokens = 4000 }, signal) {
  if (!ready()) throw aiError('nokey', MESSAGES.nokey)
  const { body, withFallback } = requestBody({ system, messages, maxTokens }, false)
  const res = await post(body, signal, withFallback)
  const text = await res.text()
  if (!res.ok) throw errFor(res.status, text, res.headers)
  const j = JSON.parse(text)
  if (j.stop_reason === 'refusal') throw aiError('refusal', MESSAGES.refusal)
  return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('')
}

// Checks a key without spending anything: listing models is free. { ok, kind, message }
async function validate(k) {
  k = String(k || '').trim()
  if (!/^sk-ant-[A-Za-z0-9_-]{8,}$/.test(k)) return { ok: false, kind: 'format', message: 'Claude API keys start with sk-ant- and are about 100 characters long. Copy the whole key.' }
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000)
  try {
    const res = await net.fetch(MODELS_URL() + '?limit=1', { headers: headers(k), signal: ctl.signal })
    if (res.ok) return { ok: true }
    const e = errFor(res.status, await res.text().catch(() => ''), res.headers)
    // a busy or rate limited service still proves the key was read
    if (e.kind === 'rate' || e.kind === 'overloaded') return { ok: true, note: e.message }
    return { ok: false, kind: e.kind, message: e.message }
  } catch { return { ok: false, kind: 'offline', message: MESSAGES.offline } }
  finally { clearTimeout(t) }
}

const SYSTEM = `You are Lumen AI, the assistant built into the Lumen web browser. You help the user with the web pages they are looking at.
When documents are provided, answer from them and cite the passages you rely on. If they do not contain the answer, say so briefly, then give your best general answer and label it as general knowledge.
Format with Markdown: short paragraphs, bullet lists only for several separate items, a table only for real comparisons, fenced code blocks for code. Use a heading only in long answers. Never use emoji.
Be direct and concise; lead with the answer. Match the language the user writes in; when there is no user text, use the language of the page.`

const SYSTEM_TOOL = `You are Lumen AI inside the Lumen web browser. Do exactly the task asked and reply with the result only: no preamble, no quotes around it, no notes after it, never emoji.`

// a page as a citable document; the big block is marked for caching so follow-up questions about it are cheap
function docBlock(page, cache) {
  const b = { type: 'document', source: { type: 'text', media_type: 'text/plain', data: page.text || ' ' }, title: String(page.title || page.url || 'Page').slice(0, 200), context: String(page.url || '').slice(0, 500), citations: { enabled: true } }
  if (cache) b.cache_control = { type: 'ephemeral' }
  return b
}

// Ask the model to sort tabs into groups. Returns [{ name, color, ids }] or throws.
async function groupTabs(tabs) {
  if (tabs.length < 2) return []
  const list = tabs.map(t => `${t.id}\t${(t.title || '').slice(0, 80)}\t${t.url.slice(0, 120)}`).join('\n')
  const out = await once({
    system: 'You sort browser tabs into a few groups. Reply with JSON only, no prose.',
    messages: [{ role: 'user', content: `Sort these tabs into 2 to 6 groups by what they are for, such as Work, Shopping, Video, Social, News, Research, or a topic name. Use short group names of one or two words, no emoji. Leave a tab out if it fits nowhere. Each group needs at least 2 tabs.
Colors to choose from: blue, purple, pink, orange, yellow, green, teal, gray.
Tabs (id, title, url):
${list}

Reply as: {"groups":[{"name":"Work","color":"green","ids":[1,2]}]}` }],
    maxTokens: 4000,
  })
  const m = out.match(/\{[\s\S]*\}/)
  const j = JSON.parse(m ? m[0] : out)
  const valid = new Set(tabs.map(t => t.id)), used = new Set()
  return (j.groups || []).map(g => ({
    name: String(g.name || 'Group').replace(/[^\p{L}\p{N} &'-]/gu, '').slice(0, 24) || 'Group',
    color: ['blue', 'purple', 'pink', 'orange', 'yellow', 'green', 'teal', 'gray'].includes(g.color) ? g.color : 'blue',
    ids: (g.ids || []).map(Number).filter(id => valid.has(id) && !used.has(id) && used.add(id)),
  })).filter(g => g.ids.length >= 2)
}

module.exports = { ready, setKey, stream, once, validate, groupTabs, docBlock, SYSTEM, SYSTEM_TOOL, MODELS, TIER_NAMES, tier, model, aiError, MESSAGES }
