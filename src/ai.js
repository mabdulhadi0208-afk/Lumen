// Lumen AI: page summaries, questions and explanations through the Claude API, with the user's own key.
const { net } = require('electron')
const D = require('./data')

const API = process.env.LUMEN_AI_API || 'https://api.anthropic.com/v1/messages'
const MODELS = { fast: 'claude-haiku-5-5', smart: 'claude-sonnet-5-5' }

const key = () => { const k = D.settings.get('aiKey'); return k ? D.dec(k) : '' }
const ready = () => !!key()
function setKey(k) {
  k = String(k || '').trim()
  D.settings.set({ aiKey: k ? D.enc(k) : '' })
  return ready()
}
const model = () => MODELS[D.settings.get('aiModel')] || MODELS.fast

function headers() {
  return { 'content-type': 'application/json', 'x-api-key': key(), 'anthropic-version': '2023-06-01' }
}
function errText(status, body) {
  let msg = ''
  try { msg = JSON.parse(body).error.message } catch { msg = String(body || '').slice(0, 200) }
  if (status === 401) return 'That API key was not accepted. Check it in Settings, AI.'
  if (status === 429) return 'Rate limited by the API. Try again in a moment.'
  if (status === 529 || status === 503) return 'The AI service is busy right now. Try again shortly.'
  return `AI request failed (${status})${msg ? ': ' + msg : ''}`
}

// Streams a reply. onDelta(textChunk) is called as text arrives. Returns the whole text.
async function stream({ system, messages, maxTokens = 1500 }, onDelta, signal) {
  if (!ready()) throw new Error('Add your Claude API key in Settings, AI to use Lumen AI.')
  const res = await net.fetch(API, {
    method: 'POST', headers: headers(), signal,
    body: JSON.stringify({ model: model(), max_tokens: maxTokens, system, messages, stream: true }),
  })
  if (!res.ok) throw new Error(errText(res.status, await res.text().catch(() => '')))
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = '', full = ''
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
      if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') { full += ev.delta.text; onDelta(ev.delta.text) }
      else if (ev.type === 'error') throw new Error((ev.error && ev.error.message) || 'AI stream error')
    }
  }
  return full
}

async function once({ system, messages, maxTokens = 1000 }) {
  if (!ready()) throw new Error('No API key')
  const res = await net.fetch(API, { method: 'POST', headers: headers(), body: JSON.stringify({ model: model(), max_tokens: maxTokens, system, messages }) })
  const body = await res.text()
  if (!res.ok) throw new Error(errText(res.status, body))
  const j = JSON.parse(body)
  return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('')
}

const SYSTEM = `You are Lumen AI, the assistant built into the Lumen web browser. You help the user with the web page they are looking at.
Answer from the page content provided. If the page does not contain the answer, say so briefly, then give your best general answer and label it as general knowledge.
Write in clear, plain prose. Use short paragraphs, and bullet points only when listing several separate items. Never use emoji.
Match the language the user writes in; when there is no user text, use the language of the page.`

function pageBlock(page) {
  return `<page>\n<title>${page.title || ''}</title>\n<url>${page.url || ''}</url>\n<content>\n${page.text || ''}\n</content>\n</page>`
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
    maxTokens: 800,
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

module.exports = { ready, setKey, stream, once, groupTabs, SYSTEM, pageBlock, MODELS }
