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

// The selection translation: a liquid glass card under the selected text, light or dark like Lumen, in the user's
// accent. It opens at once with a shimmer while the translation loads, then shows it big, with the original
// underneath, Listen, Copy and Close. It lives in a closed shadow root in Lumen's own isolated world, so the page
// can neither see nor restyle it, and it never takes focus from the page; Esc or a click outside closes it.
function bubbleUI(C) {
  const prev = window.__lumenTrBubble; if (prev) prev.close(true)
  const sel = getSelection(), rr = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null
  const r = rr && (rr.width || rr.height) ? rr : { left: 40, bottom: 40, top: 40 }
  const W = Math.min(440, innerWidth - 16), below = r.bottom + 260 < innerHeight || r.top < 260
  const host = document.createElement('div'); host.id = '__lumen_tr_bubble'
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;left:' + Math.round(Math.max(8, Math.min(innerWidth - W - 8, r.left))) + 'px;' + (below ? 'top:' + Math.round(r.bottom + 12) : 'bottom:' + Math.round(Math.max(8, innerHeight - r.top + 12))) + 'px;width:' + W + 'px'
  const sh = host.attachShadow({ mode: 'closed' })
  const SPRING = 'linear(0,.161,.458,.726,.907,1.005,1.042,1.045,1.033,1.02,1.009,1.002,.999,.998,.998,.999,.999,1)'
  const JELLY = 'linear(0,.091,.297,.538,.76,.933,1.047,1.108,1.126,1.116,1.091,1.06,1.032,1.01,.995,.987,.984,.985,.988,.992,.996,.999,1.001,1.002,1.001,1)'
  const dark = C.dark === true || (C.dark === null && matchMedia('(prefers-color-scheme: dark)').matches)
  const ic = {
    tr: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3.5h7M5.5 2v1.5M3.5 3.5c.6 2.4 2.2 4.2 4.5 5.2M7.5 3.5C7 5.8 5.4 7.8 2.5 9"/><path d="M8.5 14l3-7.5 3 7.5M9.6 11.5h3.8"/></svg>',
    x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m4 4 8 8m0-8-8 8"/></svg>',
    copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="8.5" height="8.5" rx="2"/><path d="M11 5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5.5A1.5 1.5 0 0 0 4 11h1"/></svg>',
    ok: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>',
    say: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6v4h2.5l3.5 3V3L5 6z"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8"/></svg>',
  }
  sh.innerHTML = '<style>:host{all:initial}*{box-sizing:border-box}' +
    '.b{--accent:' + C.acc + ';--accent2:oklch(from var(--accent) calc(l - .02) c calc(h + 40));--accent3:oklch(from var(--accent) calc(l + .04) c calc(h + 95));--nova:linear-gradient(135deg,var(--accent),var(--accent2) 55%,var(--accent3));--spring:' + SPRING + ';--jelly:' + JELLY + ';' +
    '--fg:#10131d;--fg2:rgba(16,19,29,.68);--fg3:rgba(16,19,29,.46);--line:rgba(20,24,48,.1);--chip:rgba(20,24,48,.06);--glint:.55;' +
    '--glass:linear-gradient(180deg,rgba(255,255,255,.9),rgba(247,248,255,.84));' +
    '--edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 85%,transparent),rgba(255,255,255,.95) 30%,rgba(255,255,255,.2) 62%,color-mix(in srgb,var(--accent3) 80%,transparent));' +
    '--shadow:0 1px 2px rgba(14,18,40,.08),0 10px 24px rgba(14,18,40,.1),0 26px 60px color-mix(in srgb,var(--accent) 26%,rgba(14,18,40,.14)),0 0 70px color-mix(in srgb,var(--accent) 16%,transparent);' +
    '--spec:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(255,255,255,.35);' +
    '--sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;--display:ui-rounded,"SF Pro Rounded","Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;' +
    'position:relative;isolation:isolate;overflow:hidden;border-radius:24px;padding:16px 18px 14px;font:14px/1.5 var(--sans);-webkit-font-smoothing:antialiased;color:var(--fg);text-align:left;direction:ltr;' +
    'background:radial-gradient(200px circle at var(--gx,15%) var(--gy,-20%),rgb(255 255 255/var(--glint)),transparent 70%),radial-gradient(120% 100% at 0% 0%,color-mix(in srgb,var(--accent) 20%,transparent),transparent 60%),radial-gradient(100% 100% at 100% 100%,color-mix(in srgb,var(--accent3) 17%,transparent),transparent 60%),var(--glass);' +
    '-webkit-backdrop-filter:var(--lens,) blur(22px) saturate(2);backdrop-filter:var(--lens,) blur(22px) saturate(2);' +
    'box-shadow:var(--spec),inset 0 -18px 30px -22px color-mix(in srgb,var(--accent3) 70%,transparent),inset 0 18px 34px -26px color-mix(in srgb,var(--accent) 60%,transparent),var(--shadow);' +
    'transform-origin:' + (below ? 'top' : 'bottom') + ' left;opacity:0;transform:translateY(' + (below ? -10 : 10) + 'px) scale(.9);transition:opacity .16s,transform .6s var(--spring)}' +
    '.b.on{opacity:1;transform:none}.b.off{opacity:0;transform:scale(.96);transition:opacity .14s,transform .2s ease-in}' +
    '.b.dark{--fg:#f1f3fb;--fg2:rgba(241,243,251,.72);--fg3:rgba(241,243,251,.48);--line:rgba(255,255,255,.11);--chip:rgba(255,255,255,.08);--glint:.16;' +
    '--glass:linear-gradient(180deg,color-mix(in srgb,var(--accent) 10%,rgba(30,34,52,.9)),color-mix(in srgb,var(--accent) 6%,rgba(14,17,28,.9)));' +
    '--edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 95%,transparent),rgba(255,255,255,.32) 30%,rgba(255,255,255,.06) 62%,color-mix(in srgb,var(--accent3) 90%,transparent));' +
    '--shadow:0 1px 2px rgba(0,0,0,.5),0 10px 24px rgba(0,0,0,.36),0 26px 60px color-mix(in srgb,var(--accent) 30%,rgba(0,0,0,.5)),0 0 80px color-mix(in srgb,var(--accent) 24%,transparent);--spec:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(255,255,255,.04)}' +
    '.b::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;z-index:5;background:var(--edge);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}' +
    '.b::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:4;box-shadow:inset 1.5px 0 0 color-mix(in srgb,#ff4d8d 30%,transparent),inset -1.5px 0 0 color-mix(in srgb,#2fd3ff 30%,transparent);background:linear-gradient(180deg,rgba(255,255,255,.3),transparent 34%);mix-blend-mode:soft-light}' +
    '.blob{position:absolute;z-index:-1;border-radius:50%;filter:blur(30px);pointer-events:none}.b1{width:220px;height:170px;left:-70px;top:-90px;background:color-mix(in srgb,var(--accent) 42%,transparent)}.b2{width:200px;height:150px;right:-80px;bottom:-70px;background:color-mix(in srgb,var(--accent3) 30%,transparent)}' +
    '.ghost{position:absolute;right:-22px;top:-26px;width:150px;height:150px;color:var(--accent);opacity:.08;pointer-events:none;z-index:0}' +
    '.sw{position:absolute;inset:0;z-index:1;pointer-events:none;border-radius:inherit;overflow:hidden}.sw::before{content:"";position:absolute;inset:-20% auto -20% 0;width:45%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.5),transparent);transform:translateX(-120%) skewX(-12deg);animation:sweep 1.1s .15s cubic-bezier(.3,.6,.3,1) both}.dark .sw::before{opacity:.35}' +
    '@keyframes sweep{to{transform:translateX(330%) skewX(-12deg)}}' +
    '.z{position:relative;z-index:3}' +
    '.h{display:flex;align-items:center;gap:12px;margin-bottom:12px}' +
    '.k{width:42px;height:42px;flex:none;border-radius:14px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -6px 12px -6px rgba(0,0,0,.25),0 8px 20px color-mix(in srgb,var(--accent) 50%,transparent),0 0 26px color-mix(in srgb,var(--accent) 30%,transparent)}.k svg{width:21px;height:21px}' +
    '.ti{flex:1;min-width:0}.t1{font:800 18px/1.1 var(--display);letter-spacing:-.03em;background:linear-gradient(120deg,var(--fg) 25%,color-mix(in srgb,var(--accent) 85%,var(--fg)) 70%,var(--accent3));-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '.t2{display:flex;gap:6px;margin-top:5px}.chip{font:700 11px/1 var(--sans);padding:4px 9px;border-radius:999px;color:var(--fg2);background:color-mix(in srgb,var(--accent) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 20%,transparent)}' +
    'button{font:inherit;color:inherit;border:0;margin:0;cursor:default;-webkit-tap-highlight-color:transparent}' +
    'button:focus-visible{outline:none;box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 22%,transparent),0 0 24px color-mix(in srgb,var(--accent) 40%,transparent)!important}' +
    '.x{width:30px;height:30px;flex:none;border-radius:50%;display:grid;place-items:center;padding:0;background:var(--chip);transition:transform .5s var(--jelly),background .2s}.x:hover{background:color-mix(in srgb,var(--accent) 22%,transparent);transform:rotate(90deg)}.x svg{width:12px;height:12px}' +
    '.t{font:500 18px/1.5 var(--sans);letter-spacing:-.005em;max-height:240px;overflow:auto;-webkit-user-select:text;user-select:text;padding:2px 2px 4px;scrollbar-width:thin;overflow-wrap:anywhere}' +
    '.t.load{display:flex;flex-direction:column;gap:9px;padding:6px 2px 8px}.t.load i{display:block;height:13px;border-radius:7px;background:linear-gradient(90deg,var(--chip) 0%,color-mix(in srgb,var(--accent) 22%,transparent) 50%,var(--chip) 100%);background-size:200% 100%;animation:shim 1.1s ease-in-out 6}.t.load i:nth-child(2){width:86%}.t.load i:nth-child(3){width:58%}' +
    '@keyframes shim{from{background-position:120% 0}to{background-position:-80% 0}}' +
    '.t.err{font-size:14.5px;color:var(--fg2)}' +
    '.o{margin-top:10px;padding:10px 12px;border-radius:14px;background:var(--chip);font:13px/1.45 var(--sans);color:var(--fg2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;-webkit-user-select:text;user-select:text}.o{cursor:default;transition:background .2s}.o:hover{background:color-mix(in srgb,var(--accent) 10%,var(--chip))}.o.open{display:block;max-height:160px;overflow:auto}.o:focus-visible{outline:none;box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 22%,transparent)}.o b{font:800 10px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--fg3);margin-right:6px}' +
    '.f{display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:12px}.f .sp{flex:1;font:600 11px var(--sans);color:var(--fg3)}' +
    '.btn{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 15px;border-radius:999px;font:700 13px var(--sans);transition:transform .5s var(--jelly),background .2s,box-shadow .25s}.btn svg{width:14px;height:14px}.btn:hover{transform:translateY(-1px)}.btn:active{transform:scale(.95)}.btn:disabled{opacity:.45}' +
    '.sec{background:var(--chip);box-shadow:inset 0 0 0 1px var(--line)}.sec:hover{background:color-mix(in srgb,var(--accent) 16%,transparent)}.sec.on{color:var(--accent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 40%,transparent)}' +
    '.pri{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 16px color-mix(in srgb,var(--accent) 42%,transparent)}.pri:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 0 0 4px color-mix(in srgb,var(--accent) 18%,transparent),0 8px 24px color-mix(in srgb,var(--accent) 50%,transparent)}' +
    (C.still ? '*,*::before,*::after{animation:none!important;transition:none!important}.sw{display:none}' : '') + '</style>' +
    '<div class="b' + (dark ? ' dark' : '') + '" role="dialog" aria-label="Lumen Translate"><span class="blob b1"></span><span class="blob b2"></span><span class="sw"></span>' +
    '<svg class="ghost" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3.5h7M5.5 2v1.5M3.5 3.5c.6 2.4 2.2 4.2 4.5 5.2M7.5 3.5C7 5.8 5.4 7.8 2.5 9"/><path d="M8.5 14l3-7.5 3 7.5M9.6 11.5h3.8"/></svg>' +
    '<div class="z"><div class="h"><span class="k">' + ic.tr + '</span><span class="ti"><div class="t1">Translate</div><div class="t2"><span class="chip c1">Auto detected</span><span class="chip c2"></span></div></span><button class="x" title="Close" aria-label="Close">' + ic.x + '</button></div>' +
    '<div class="t load" aria-live="polite"><i></i><i></i><i></i></div><div class="o" role="button" tabindex="0" aria-expanded="false" title="Show all of the original"><b>Original</b><span class="os"></span></div>' +
    '<div class="f"><span class="sp">Esc to close</span><button class="btn sec say" disabled>' + ic.say + '<span>Listen</span></button><button class="btn pri cp" disabled>' + ic.copy + '<span>Copy</span></button></div></div></div>'
  const b = sh.querySelector('.b'), t = sh.querySelector('.t'), cp = sh.querySelector('.cp'), say = sh.querySelector('.say')
  sh.querySelector('.c2').textContent = 'Into ' + C.to
  sh.querySelector('.os').textContent = C.text
  const orig = sh.querySelector('.o'), flip = () => { const o = orig.classList.toggle('open'); orig.setAttribute('aria-expanded', String(o)) }
  orig.onclick = flip; orig.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip() } }
  let res = ''
  const onDown = e => { if (!e.composedPath().includes(host)) close() }
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
  function close(now) {
    removeEventListener('mousedown', onDown, true); removeEventListener('keydown', onKey, true)
    if (!host.isConnected) return
    try { if (speechSynthesis.speaking) speechSynthesis.cancel() } catch {}
    if (window.__lumenTrBubble === api) window.__lumenTrBubble = null
    if (now || C.still) { host.remove(); return }
    b.classList.remove('on'); b.classList.add('off'); setTimeout(() => host.remove(), 200)
  }
  sh.querySelector('.x').onclick = () => close()
  cp.onclick = () => { navigator.clipboard.writeText(res).then(() => { cp.innerHTML = ic.ok + '<span>Copied</span>' }, () => { cp.lastChild.textContent = 'Could not copy' }) }
  say.onclick = () => {
    try {
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); say.classList.remove('on'); return }
      const u = new SpeechSynthesisUtterance(res); u.lang = C.code; u.onend = u.onerror = () => say.classList.remove('on')
      say.classList.add('on'); speechSynthesis.speak(u)
    } catch {}
  }
  if (!C.still) b.addEventListener('pointermove', e => { const q = b.getBoundingClientRect(); b.style.setProperty('--gx', Math.round(e.clientX - q.left) + 'px'); b.style.setProperty('--gy', Math.round(e.clientY - q.top) + 'px') })
  document.documentElement.appendChild(host)
  setTimeout(() => { if (host.isConnected) addEventListener('mousedown', onDown, true) }, 50)
  addEventListener('keydown', onKey, true)
  // the lens: still in the middle, bending the page hard at the rim, with a faint chromatic fringe
  const lens = () => {
    if (C.still || !host.isConnected) return
    const w = Math.round(b.offsetWidth / 2) * 2, h = Math.round(b.offsetHeight / 2) * 2; if (w < 16 || h < 16) return
    const rad = 24, bezel = 30, s = Math.min(1, 160 / Math.max(w, h)), cw = Math.ceil(w * s), ch = Math.ceil(h * s)
    const sdf = (px, py) => { const qx = Math.abs(px - w / 2) - (w / 2 - rad), qy = Math.abs(py - h / 2) - (h / 2 - rad); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad }
    const c = document.createElement('canvas'); c.width = cw; c.height = ch
    const x = c.getContext('2d'), img = x.createImageData(cw, ch), d = img.data
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const px = (i + .5) / s, py = (j + .5) / s, dist = -sdf(px, py); let dx = 0, dy = 0
      if (dist > 0 && dist < bezel) { const tt = 1 - dist / bezel, m = tt * tt * (1.4 - .4 * tt), nx = sdf(px + 1, py) - sdf(px - 1, py), ny = sdf(px, py + 1) - sdf(px, py - 1), l = Math.hypot(nx, ny) || 1; dx = -nx / l * m; dy = -ny / l * m }
      const o = (j * cw + i) * 4; d[o] = 128 + dx * 127; d[o + 1] = 128 + dy * 127; d[o + 2] = 128; d[o + 3] = 255
    }
    x.putImageData(img, 0, 0)
    const id = 'lumen-tr-lens-' + Date.now(), sc = 30
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.cssText = 'position:absolute;width:0;height:0'
    svg.innerHTML = '<filter id="' + id + '" x="0" y="0" width="' + w + '" height="' + h + '" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="' + c.toDataURL() + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" result="map"/>' +
      [['r', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['g', 1.07, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['b', 1.15, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']].map(([n, m, v]) => '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + Math.round(sc * m) + '" xChannelSelector="R" yChannelSelector="G" result="d' + n + '"/><feColorMatrix in="d' + n + '" type="matrix" values="' + v + '" result="' + n + '"/>').join('') +
      '<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>'
    const old = sh.querySelector('svg.lens'); if (old) old.remove()
    svg.classList.add('lens'); sh.appendChild(svg); b.style.setProperty('--lens', 'url(#' + id + ')')
  }
  requestAnimationFrame(() => { lens(); requestAnimationFrame(() => b.classList.add('on')) })
  const api = {
    close,
    set(R) {
      if (!host.isConnected) return
      t.classList.remove('load')
      if (R.error) { t.classList.add('err'); t.textContent = 'Lumen could not reach the translator. Check your connection and try again.'; return }
      res = R.res || ''; t.textContent = res; t.dir = C.dir
      cp.disabled = false; say.disabled = !('speechSynthesis' in window)
      if (C.src) sh.querySelector('.c1').textContent = 'From ' + C.src
      requestAnimationFrame(lens)
    },
  }
  window.__lumenTrBubble = api
}

async function bubble(wc, text, to, { accent = '#5b8cff', dark = null, motion = 'jelly' } = {}) {
  const acc = /^#[0-9a-f]{3,8}$/i.test(String(accent)) ? accent : '#5b8cff'
  const cfg = { to: langName(to), code: to, dir: dirOf(to), acc, dark, still: motion === 'off', text: String(text).slice(0, 600) }
  await wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: `(${bubbleUI.toString()})(${JSON.stringify(cfg)})` }])
  let R
  try { const [res] = await translateTexts([text], to); R = { res: res || '' } } catch (e) { R = { error: true } }
  await wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code: `window.__lumenTrBubble && window.__lumenTrBubble.set(${JSON.stringify(R)})` }]).catch(() => {})
}

module.exports = { dirOf, translatePage, showOriginal, isTranslated, pageLang, bubble, target, langName, translateTexts }
