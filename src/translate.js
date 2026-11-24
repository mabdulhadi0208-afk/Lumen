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

// The selection translation: a liquid glass card under the selected text, light or dark like the system,
// in the user's accent, with Copy and Close. Lives in a closed shadow root in Lumen's own isolated world.
async function bubble(wc, text, to, { accent = '#5b8cff', dark = null, motion = 'jelly' } = {}) {
  const [res] = await translateTexts([text], to)
  const acc = /^#[0-9a-f]{3,8}$/i.test(String(accent)) ? accent : '#5b8cff'
  const cfg = { res: res || '', to: langName(to), dir: dirOf(to), acc, dark, still: motion === 'off' }
  const code = `(() => {
    const C = ${JSON.stringify(cfg)}
    const sel = getSelection(); const r = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : { left: 40, bottom: 40, top: 40 }
    document.getElementById('__lumen_tr_bubble')?.remove()
    const host = document.createElement('div'); host.id = '__lumen_tr_bubble'
    const W = Math.min(400, innerWidth - 16), below = r.bottom + 190 < innerHeight
    host.style.cssText = 'position:fixed;z-index:2147483647;left:' + Math.max(8, Math.min(innerWidth - W - 8, r.left)) + 'px;' + (below ? 'top:' + (r.bottom + 10) : 'bottom:' + Math.max(8, innerHeight - r.top + 10)) + 'px;width:' + W + 'px'
    const sh = host.attachShadow({ mode: 'closed' })
    const darkQ = C.dark === null ? '@media (prefers-color-scheme:dark){.b{--dk:1}}' : ''
    sh.innerHTML = '<style>:host{all:initial}*{box-sizing:border-box}' +
      '.b{--accent:' + C.acc + ';--accent2:oklch(from var(--accent) calc(l - .02) c calc(h + 40));--accent3:oklch(from var(--accent) calc(l + .04) c calc(h + 95));--nova:linear-gradient(135deg,var(--accent),var(--accent2) 55%,var(--accent3));' +
      'position:relative;isolation:isolate;overflow:hidden;border-radius:20px;padding:14px 16px 12px;font:14px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;' +
      'color:#141722;background:radial-gradient(120% 100% at 0% 0%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 60%),radial-gradient(100% 100% at 100% 100%,color-mix(in srgb,var(--accent3) 16%,transparent),transparent 60%),linear-gradient(180deg,rgba(255,255,255,.86),rgba(248,249,255,.78));' +
      '-webkit-backdrop-filter:blur(26px) saturate(1.9);backdrop-filter:blur(26px) saturate(1.9);box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 2px 6px rgba(14,18,40,.08),0 18px 46px color-mix(in srgb,var(--accent) 26%,rgba(14,18,40,.16)),0 0 46px color-mix(in srgb,var(--accent) 16%,transparent);' +
      'transform-origin:' + (below ? 'top' : 'bottom') + ' left;animation:in .55s cubic-bezier(.3,1.45,.5,1) both}' +
      '.b.dark{color:#eef0fa;background:radial-gradient(120% 100% at 0% 0%,color-mix(in srgb,var(--accent) 26%,transparent),transparent 60%),radial-gradient(100% 100% at 100% 100%,color-mix(in srgb,var(--accent3) 20%,transparent),transparent 60%),linear-gradient(180deg,rgba(30,34,52,.9),rgba(16,19,31,.88));box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.4),0 18px 46px color-mix(in srgb,var(--accent) 28%,rgba(0,0,0,.45)),0 0 52px color-mix(in srgb,var(--accent) 22%,transparent)}' +
      '.b::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 75%,transparent),rgba(255,255,255,.6) 36%,rgba(255,255,255,.15) 64%,color-mix(in srgb,var(--accent3) 65%,transparent));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}' +
      '.orb{position:absolute;z-index:-1;width:200px;height:200px;left:-70px;top:-110px;border-radius:50%;filter:blur(30px);background:color-mix(in srgb,var(--accent) 36%,transparent);animation:drift 12s ease-in-out infinite alternate}' +
      '.sw{position:absolute;inset:0;z-index:-1;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.4) 50%,transparent 65%);transform:translateX(-110%);animation:sweep 1.3s .2s ease-out both}.dark .sw{opacity:.3}' +
      '@keyframes in{from{opacity:0;transform:translateY(' + (below ? -8 : 8) + 'px) scale(.94)}}@keyframes drift{to{transform:translate(80px,50px) scale(1.15)}}@keyframes sweep{to{transform:translateX(110%)}}' +
      '.h{display:flex;align-items:center;gap:10px;margin-bottom:8px}' +
      '.k{width:30px;height:30px;flex:none;border-radius:10px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:0 6px 16px color-mix(in srgb,var(--accent) 45%,transparent),inset 0 1px 0 rgba(255,255,255,.45)}.k svg{width:16px;height:16px}' +
      '.ti{flex:1;min-width:0}.t1{font:800 13.5px/1.15 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;letter-spacing:-.02em}.t2{font-size:11.5px;opacity:.6;margin-top:1px}' +
      '.x{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;border:0;padding:0;color:inherit;background:rgba(127,127,140,.14);cursor:default;transition:transform .35s cubic-bezier(.3,1.5,.5,1),background .2s}.x:hover{background:color-mix(in srgb,var(--accent) 22%,transparent);transform:rotate(90deg)}.x svg{width:12px;height:12px}' +
      '.t{font-size:15.5px;line-height:1.55;max-height:260px;overflow:auto;user-select:text;padding:2px 2px 4px;scrollbar-width:thin}' +
      '.f{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}' +
      '.c{height:30px;padding:0 14px;border-radius:999px;border:0;font:650 12.5px -apple-system,"Segoe UI",system-ui,sans-serif;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.42),0 6px 16px color-mix(in srgb,var(--accent) 38%,transparent);cursor:default;transition:transform .35s cubic-bezier(.3,1.5,.5,1)}.c:hover{transform:translateY(-1px)}.c:active{transform:scale(.95)}' +
      darkQ + (C.still ? '*{animation:none!important;transition:none!important}' : '') + '</style>' +
      '<div class="b"><span class="orb"></span><span class="sw"></span><div class="h"><span class="k"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3.5h7M5.5 2v1.5M3.5 3.5c.6 2.4 2.2 4.2 4.5 5.2M7.5 3.5C7 5.8 5.4 7.8 2.5 9"/><path d="M8.5 14l3-7.5 3 7.5M9.6 11.5h3.8"/></svg></span>' +
      '<span class="ti"><div class="t1">Lumen Translate</div><div class="t2"></div></span><button class="x" title="Close"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m4 4 8 8m0-8-8 8"/></svg></button></div>' +
      '<div class="t"></div><div class="f"><button class="c">Copy</button></div></div>'
    const b = sh.querySelector('.b')
    if (C.dark === true || (C.dark === null && matchMedia('(prefers-color-scheme: dark)').matches)) b.classList.add('dark')
    sh.querySelector('.t2').textContent = 'Translated to ' + C.to
    const t = sh.querySelector('.t'); t.textContent = C.res; t.dir = C.dir
    sh.querySelector('.x').onclick = () => host.remove()
    const cp = sh.querySelector('.c')
    cp.onclick = () => { navigator.clipboard.writeText(C.res).then(() => { cp.textContent = 'Copied' }, () => { cp.textContent = 'Could not copy' }) }
    document.documentElement.appendChild(host)
    setTimeout(() => addEventListener('mousedown', function f(e) { if (!e.composedPath().includes(host)) { host.remove(); removeEventListener('mousedown', f) } }), 50)
    addEventListener('keydown', function k(e) { if (e.key === 'Escape') { host.remove(); removeEventListener('keydown', k) } })
  })()`
  await wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code }])
}

module.exports = { dirOf, translatePage, showOriginal, isTranslated, pageLang, bubble, target, langName, translateTexts }
