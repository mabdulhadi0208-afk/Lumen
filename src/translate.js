// Built-in translator: whole-page translation (with Show original), selection translation, and an offer
// to translate when a page is in another language. Uses Google Translate's public web endpoint.
const { net, app } = require('electron')

const WORLD = 1017 // isolated world: page scripts can't see or tamper with the translator
const NAMES = new Intl.DisplayNames(['en'], { type: 'language' })
const langName = code => { try { return NAMES.of(code) || code } catch { return code } }
const target = settings => { const v = settings.get('translateTo') || app.getLocale() || 'en'; return /^zh/i.test(v) ? 'zh-CN' : v.split('-')[0] }

async function translateBatch(texts, to) {
  const body = new URLSearchParams()
  for (const t of texts) body.append('q', t)
  const r = await net.fetch(`https://translate.googleapis.com/translate_a/t?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&format=text`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: body.toString(),
  })
  if (!r.ok) throw new Error('Translate service answered ' + r.status)
  const j = await r.json()
  const arr = Array.isArray(j) ? j : [j]
  return arr.map(x => Array.isArray(x) ? x[0] : x)
}
async function translateTexts(texts, to) {
  const out = new Array(texts.length)
  let batch = [], idx = [], chars = 0
  const flush = async () => {
    if (!batch.length) return
    const res = await translateBatch(batch, to)
    idx.forEach((k, i) => { out[k] = res[i] != null ? res[i] : texts[k] })
    batch = []; idx = []; chars = 0
  }
  for (let i = 0; i < texts.length; i++) {
    if (chars + texts[i].length > 4500 || batch.length >= 100) await flush()
    batch.push(texts[i]); idx.push(i); chars += texts[i].length
  }
  await flush()
  return out
}

const COLLECT = `(() => {
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SVG', 'MATH', 'KBD', 'SAMP'])
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => {
    if (!n.nodeValue || !/\\p{L}/u.test(n.nodeValue) || n.nodeValue.trim().length < 2) return NodeFilter.FILTER_REJECT
    for (let p = n.parentElement; p; p = p.parentElement) { if (SKIP.has(p.tagName) || p.isContentEditable || p.getAttribute('translate') === 'no' || p.classList.contains('notranslate')) return NodeFilter.FILTER_REJECT }
    return NodeFilter.FILTER_ACCEPT } })
  const nodes = []; let n; while ((n = w.nextNode()) && nodes.length < 4000) nodes.push(n)
  window.__lumenTr = { nodes, orig: nodes.map(n => n.nodeValue) }
  return nodes.map(n => n.nodeValue.trim())
})()`
const APPLY = list => `(() => { const t = window.__lumenTr; if (!t) return 0; const L = ${JSON.stringify(list)}; t.nodes.forEach((n, i) => { if (L[i] == null) return; const o = t.orig[i]; const lead = o.match(/^\\s*/)[0], tail = o.match(/\\s*$/)[0]; n.nodeValue = lead + L[i] + tail }); document.documentElement.dataset.lumenTranslated = '1'; return t.nodes.length })()`
const RESTORE = `(() => { const t = window.__lumenTr; if (!t) return false; t.nodes.forEach((n, i) => { n.nodeValue = t.orig[i] }); delete document.documentElement.dataset.lumenTranslated; return true })()`

async function translatePage(wc, to) {
  const texts = await wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: COLLECT }])
  if (!texts || !texts.length) return { ok: false, error: 'Nothing to translate on this page' }
  const done = await translateTexts(texts, to)
  await wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: APPLY(done) }])
  return { ok: true, count: texts.length }
}
const showOriginal = wc => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: RESTORE }])
const isTranslated = wc => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: `document.documentElement.dataset.lumenTranslated === '1'` }]).catch(() => false)
const pageLang = wc => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: `((document.documentElement.lang || (document.querySelector('meta[http-equiv="content-language" i]') || {}).content || '') + '').split(/[-_]/)[0].toLowerCase()` }]).catch(() => '')

async function bubble(wc, text, to) {
  const [res] = await translateTexts([text], to)
  const code = `(() => {
    const sel = getSelection(); const r = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : { left: 40, bottom: 40 }
    document.getElementById('__lumen_tr_bubble')?.remove()
    const host = document.createElement('div'); host.id = '__lumen_tr_bubble'
    host.style.cssText = 'position:fixed;z-index:2147483647;left:' + Math.max(8, Math.min(innerWidth - 380, r.left)) + 'px;top:' + Math.min(innerHeight - 80, r.bottom + 8) + 'px'
    const sh = host.attachShadow({ mode: 'closed' })
    sh.innerHTML = '<style>.b{max-width:360px;background:rgba(250,250,252,.97);color:#1d1d1f;border-radius:14px;box-shadow:0 14px 44px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.06);padding:12px 14px;font:14px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;animation:p .45s cubic-bezier(.3,1.3,.5,1)}@keyframes p{from{opacity:0;transform:translateY(-6px) scale(.96)}}@media (prefers-color-scheme:dark){.b{background:rgba(40,41,46,.97);color:#f2f2f4}}.h{font-size:11px;opacity:.55;margin-bottom:4px;letter-spacing:.02em}.x{float:right;cursor:default;opacity:.5;margin-left:10px}</style><div class="b"><span class="x">Close</span><div class="h">Lumen Translate  ·  ${langName(to)}</div><div class="t"></div></div>'
    sh.querySelector('.t').textContent = ${JSON.stringify(res || '')}
    sh.querySelector('.x').onclick = () => host.remove()
    document.documentElement.appendChild(host)
    setTimeout(() => addEventListener('mousedown', function f(e) { if (!e.composedPath().includes(host)) { host.remove(); removeEventListener('mousedown', f) } }), 50)
  })()`
  await wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code }])
}

module.exports = { translatePage, showOriginal, isTranslated, pageLang, bubble, target, langName, translateTexts }
