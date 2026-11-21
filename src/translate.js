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
  const r = await net.fetch(`${process.env.LUMEN_TR_API || 'https://translate.googleapis.com'}/translate_a/t?client=gtx&sl=auto&tl=${encodeURIComponent(to)}&dt=t&format=text`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: body.toString(),
  })
  if (!r.ok) throw new Error('Translate service answered ' + r.status)
  const j = await r.json()
  const arr = Array.isArray(j) ? j : [j]
  return arr.map(x => Array.isArray(x) ? x[0] : x)
}
async function translateTexts(texts, to, onProgress, isCancelled) {
  const out = new Array(texts.length)
  let batch = [], idx = [], chars = 0, doneN = 0
  const flush = async () => {
    if (!batch.length) return
    const res = await translateBatch(batch, to)
    idx.forEach((k, i) => { out[k] = res[i] != null ? res[i] : texts[k] })
    // a readable before/after pair from this batch for the live preview
    let sample = null
    for (const k of idx) { const o = texts[k]; if (o.length >= 18 && o.length <= 110 && out[k] && out[k] !== o) { sample = [o, out[k]]; if (o.length >= 30) break } }
    doneN += batch.length
    batch = []; idx = []; chars = 0
    if (onProgress) onProgress(doneN, texts.length, sample)
  }
  for (let i = 0; i < texts.length; i++) {
    if (chars + texts[i].length > 4500 || batch.length >= 100) { await flush(); if (isCancelled && isCancelled()) throw Object.assign(new Error('cancelled'), { cancelled: true }) }
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
const RTL = new Set(['ar', 'he', 'iw', 'fa', 'ur', 'ps', 'yi', 'dv', 'sd', 'ug', 'ckb', 'ku'])
const dirOf = lang => RTL.has(String(lang).split('-')[0].toLowerCase()) ? 'rtl' : 'ltr'
// Swap the page's reading direction to match the new language (Arabic right-to-left becomes English left-to-right and back),
// remembering every original dir and lang so Show Original puts it all back.
const FLIP = dir => `(() => {
  const t = window.__lumenTr; if (!t) return
  const els = [document.documentElement, document.body, ...document.querySelectorAll('[dir]')]
  t.dirs = t.dirs || els.map(e => [e, e.getAttribute('dir'), e.getAttribute('lang')])
  const from = getComputedStyle(document.body).direction
  if (from === '${dir}') return
  for (const [e, d] of t.dirs) { if (e === document.documentElement || e === document.body || d === 'rtl' || d === 'ltr') e.setAttribute('dir', '${dir}') }
  document.documentElement.classList.add('lumen-flipped')
  if (!document.getElementById('lumen-flip-style')) {
    const s = document.createElement('style'); s.id = 'lumen-flip-style'
    s.textContent = 'html.lumen-flipped body { text-align: start; } html.lumen-flipped p, html.lumen-flipped li, html.lumen-flipped h1, html.lumen-flipped h2, html.lumen-flipped h3, html.lumen-flipped h4, html.lumen-flipped td, html.lumen-flipped th, html.lumen-flipped label { text-align: start; }'
    document.head.appendChild(s)
  }
})()`
const APPLY = (list, to) => `(() => { const t = window.__lumenTr; if (!t) return 0; const L = ${JSON.stringify(list)}; t.nodes.forEach((n, i) => { if (L[i] == null) return; const o = t.orig[i]; const lead = o.match(/^\\s*/)[0], tail = o.match(/\\s*$/)[0]; n.nodeValue = lead + L[i] + tail }); t.lang = t.lang === undefined ? document.documentElement.getAttribute('lang') : t.lang; document.documentElement.setAttribute('lang', ${JSON.stringify(to)}); document.documentElement.dataset.lumenTranslated = '1'; return t.nodes.length })()`
const RESTORE = `(() => { const t = window.__lumenTr; if (!t) return false; t.nodes.forEach((n, i) => { n.nodeValue = t.orig[i] });
  if (t.dirs) { for (const [e, d] of t.dirs) { if (d == null) e.removeAttribute('dir'); else e.setAttribute('dir', d) } t.dirs = null }
  if (t.lang !== undefined) { if (t.lang == null) document.documentElement.removeAttribute('lang'); else document.documentElement.setAttribute('lang', t.lang); t.lang = undefined }
  document.documentElement.classList.remove('lumen-flipped'); const s = document.getElementById('lumen-flip-style'); if (s) s.remove()
  delete document.documentElement.dataset.lumenTranslated; return true })()`

async function translatePage(wc, to, { onProgress, isCancelled, flipDir = true } = {}) {
  const texts = await wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: COLLECT }])
  if (!texts || !texts.length) return { ok: false, error: 'Nothing to translate on this page' }
  if (onProgress) onProgress(0, texts.length)
  const done = await translateTexts(texts, to, onProgress, isCancelled)
  await wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: APPLY(done, to) }])
  if (flipDir) await wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: FLIP(dirOf(to)) }]).catch(() => {})
  return { ok: true, count: texts.length }
}
const showOriginal = wc => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: RESTORE }])
const isTranslated = wc => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: `document.documentElement.dataset.lumenTranslated === '1'` }]).catch(() => false)
// The page's language: the script the text is actually written in wins (many sites have no lang tag,
// or a wrong one), and the lang tag only decides between languages that share a script.
const DETECT = `(() => {
  const tag = ((document.documentElement.lang || (document.querySelector('meta[http-equiv="content-language" i]') || {}).content || '') + '').split(/[-_]/)[0].toLowerCase()
  const el = document.querySelector('main') || document.querySelector('article') || document.body
  const txt = ((document.title || '') + ' ' + ((el && el.innerText) || '')).slice(0, 6000)
  const count = re => (txt.match(re) || []).length
  const letters = count(/\\p{L}/gu) || 1
  const S = { arab: count(/[\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF]/g), hebr: count(/[\\u0590-\\u05FF]/g), cyrl: count(/[\\u0400-\\u04FF]/g), hani: count(/[\\u4E00-\\u9FFF]/g), kana: count(/[\\u3040-\\u30FF]/g), hang: count(/[\\uAC00-\\uD7AF]/g), deva: count(/[\\u0900-\\u097F]/g), thai: count(/[\\u0E00-\\u0E7F]/g), grek: count(/[\\u0370-\\u03FF]/g), latn: count(/[A-Za-z\\u00C0-\\u024F]/g) }
  const top = Object.entries(S).sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] / letters < 0.3) return tag
  const k = top[0]
  if (k === 'arab') { if (['ar', 'fa', 'ur', 'ps', 'ku', 'ckb', 'sd', 'ug'].includes(tag)) return tag; if (/[\\u06D2\\u06BA\\u0679\\u0688\\u0691]/.test(txt)) return 'ur'; if (/[\\u067E\\u0686\\u0698\\u06AF]/.test(txt) && !/[\\u0629\\u0649]/.test(txt)) return 'fa'; return 'ar' }
  if (k === 'hebr') return 'he'
  if (k === 'cyrl') return ['ru', 'uk', 'bg', 'sr', 'mk', 'be', 'kk', 'mn'].includes(tag) ? tag : 'ru'
  if (k === 'kana') return 'ja'
  if (k === 'hani') return S.kana > S.hani * 0.15 ? 'ja' : (tag === 'ja' ? 'ja' : 'zh-CN')
  if (k === 'hang') return 'ko'
  if (k === 'deva') return ['hi', 'mr', 'ne'].includes(tag) ? tag : 'hi'
  if (k === 'thai') return 'th'
  if (k === 'grek') return 'el'
  // Latin script: trust the tag unless it names a non-Latin language
  if (tag && !['ar', 'fa', 'ur', 'he', 'ru', 'ja', 'zh', 'ko', 'hi', 'th', 'el', 'uk'].includes(tag)) return tag
  return 'en'
})()`
const pageLang = wc => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: DETECT }]).catch(() => '')

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

module.exports = { dirOf, translatePage, showOriginal, isTranslated, pageLang, bubble, target, langName, translateTexts }
