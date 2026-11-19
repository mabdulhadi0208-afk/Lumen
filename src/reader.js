(() => {
  if (document.documentElement.dataset.lumenReader) { location.reload(); return }
  const score = el => {
    const ps = el.querySelectorAll(':scope > p, :scope > div > p, :scope > section > p')
    let s = 0
    ps.forEach(p => { const t = p.textContent.trim(); if (t.length > 60) s += t.length + (t.split(',').length * 10) })
    const cls = (el.className + ' ' + el.id).toLowerCase()
    if (/article|content|post|story|entry|main|body|text/.test(cls)) s *= 1.3
    if (/comment|footer|sidebar|nav|promo|related|share|ad-|advert/.test(cls)) s *= 0.2
    return s
  }
  let best = document.querySelector('article') || null, bestScore = best ? score(best) : 0
  document.querySelectorAll('body, article, main, section, div').forEach(el => { const s = score(el); if (s > bestScore) { best = el; bestScore = s } })
  if (!best || bestScore < 400) return
  const title = (document.querySelector('h1') || {}).textContent || document.title
  const clone = best.cloneNode(true)
  clone.querySelectorAll('script, style, iframe, form, button, nav, aside, footer, [class*="share"], [class*="related"], [class*="promo"], [class*="newsletter"], [aria-hidden="true"]').forEach(n => n.remove())
  clone.querySelectorAll('*').forEach(n => { n.removeAttribute('style'); n.removeAttribute('class'); n.removeAttribute('width'); n.removeAttribute('height') })
  clone.querySelectorAll('img').forEach(img => { const s = img.getAttribute('data-src') || img.getAttribute('data-lazy-src'); if (s) img.src = s })
  const host = location.host.replace(/^www\./, '')
  const words = clone.textContent.trim().split(/\s+/).length
  document.documentElement.dataset.lumenReader = '1'
  document.head.innerHTML = '<meta charset="utf-8"><title></title>'
  document.title = title
  document.body.innerHTML = ''
  document.body.removeAttribute('class'); document.body.removeAttribute('style')
  const style = document.createElement('style')
  style.textContent = `
    :root{color-scheme:light dark;--bg:#fbfaf7;--fg:#1f1f22;--mut:#77777d;--acc:#5b8cff}
    @media (prefers-color-scheme:dark){:root{--bg:#18191c;--fg:#e9e9ec;--mut:#8d8d94}}
    html,body{background:var(--bg);color:var(--fg);margin:0}
    .lr{max-width:680px;margin:0 auto;padding:72px 28px 120px;font:19px/1.7 "Iowan Old Style","Charter",Georgia,serif;animation:in .5s cubic-bezier(.2,1.1,.4,1)}
    @keyframes in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    .meta{font:13px -apple-system,BlinkMacSystemFont,sans-serif;color:var(--mut);letter-spacing:.02em;margin-bottom:14px}
    h1.t{font:700 38px/1.18 -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:-.02em;margin:0 0 36px}
    img,video,figure{max-width:100%;height:auto;border-radius:10px}
    a{color:var(--acc)} pre,code{font-size:15px;white-space:pre-wrap} blockquote{border-left:3px solid var(--acc);margin:0;padding-left:18px;color:var(--mut)}
    h2,h3{font-family:-apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:-.01em;margin-top:2em}`
  document.head.appendChild(style)
  const wrap = document.createElement('div'); wrap.className = 'lr'
  const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = `${host}  ·  ${Math.max(1, Math.round(words / 230))} min read`
  const h = document.createElement('h1'); h.className = 't'; h.textContent = title.trim()
  wrap.append(meta, h, clone)
  document.body.appendChild(wrap)
  window.scrollTo(0, 0)
})()
