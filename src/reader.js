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
  const ACC = '__LUMEN_ACCENT__', STILL = '__LUMEN_MOTION__' === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches
  const style = document.createElement('style')
  style.textContent = `
    :root{color-scheme:light dark;--accent:${ACC};--accent2:oklch(from var(--accent) calc(l - .02) c calc(h + 40));--accent3:oklch(from var(--accent) calc(l + .04) c calc(h + 95));
      --nova:linear-gradient(135deg,var(--accent),var(--accent2) 55%,var(--accent3));
      --bg:#f6f5f1;--fg:#1d1e24;--fg2:#5d5f6b;--mut:#8b8d98;--line:rgba(20,24,48,.09);
      --glass:linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,.6));--spec:inset 0 1px 0 rgba(255,255,255,.85);
      --shadow:0 2px 6px rgba(14,18,40,.06),0 20px 50px color-mix(in srgb,var(--accent) 16%,rgba(14,18,40,.1));
      --size:20px;--sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;--display:ui-rounded,"SF Pro Rounded","Nunito",system-ui,var(--sans)}
    @media (prefers-color-scheme:dark){:root{--bg:#0d0f18;--fg:#e9eaf2;--fg2:#a9abb9;--mut:#80838f;--line:rgba(255,255,255,.09);
      --glass:linear-gradient(180deg,color-mix(in srgb,var(--accent) 8%,rgba(30,34,52,.8)),color-mix(in srgb,var(--accent) 5%,rgba(18,21,34,.72)));--spec:inset 0 1px 0 rgba(255,255,255,.12);
      --shadow:0 2px 6px rgba(0,0,0,.4),0 20px 50px color-mix(in srgb,var(--accent) 18%,rgba(0,0,0,.4))}}
    html,body{background:var(--bg);color:var(--fg);margin:0}
    body::before{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;background:
      radial-gradient(40% 34% at 12% 0%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 70%),
      radial-gradient(36% 30% at 92% 8%,color-mix(in srgb,var(--accent3) 13%,transparent),transparent 70%),
      radial-gradient(50% 40% at 50% 110%,color-mix(in srgb,var(--accent2) 10%,transparent),transparent 70%)}
    ::selection{background:color-mix(in srgb,var(--accent) 30%,transparent)}
    .lr-bar{position:fixed;left:0;top:0;height:3px;width:100%;transform-origin:0 50%;transform:scaleX(0);background:var(--nova);box-shadow:0 0 12px var(--accent);z-index:10}
    .lr-tools{position:fixed;top:16px;right:18px;z-index:9;display:flex;gap:4px;padding:5px;border-radius:999px;background:var(--glass);backdrop-filter:blur(22px) saturate(1.8);box-shadow:var(--spec),var(--shadow);font:600 13px var(--sans)}
    .lr-tools button{all:unset;min-width:34px;height:30px;padding:0 10px;border-radius:999px;display:grid;place-items:center;color:var(--fg2);cursor:default;transition:background .2s,color .2s,transform .35s cubic-bezier(.3,1.5,.5,1)}
    .lr-tools button:hover{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--fg);transform:translateY(-1px)}
    .lr-tools button:active{transform:scale(.94)}
    .lr-tools .ex{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 12px color-mix(in srgb,var(--accent) 34%,transparent)}
    .lr-tools .ex:hover{color:#fff;background:var(--nova);filter:brightness(1.06)}
    .lr{max-width:700px;margin:0 auto;padding:84px 28px 140px;font:var(--size)/1.75 "Iowan Old Style","Charter","Source Serif Pro",Georgia,serif}
    .lr-hero{position:relative;isolation:isolate;overflow:hidden;margin:0 -28px 44px;padding:30px 30px 28px;border-radius:28px;background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--accent) 20%,transparent),transparent 55%),radial-gradient(90% 140% at 100% 100%,color-mix(in srgb,var(--accent3) 16%,transparent),transparent 60%),var(--glass);backdrop-filter:blur(24px) saturate(1.6);box-shadow:var(--spec),var(--shadow)}
    .lr-hero::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 70%,transparent),rgba(255,255,255,.5) 36%,transparent 64%,color-mix(in srgb,var(--accent3) 60%,transparent));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
    .lr-hero::after{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.4) 50%,transparent 65%);transform:translateX(-110%);animation:sweep 1.6s .3s ease-out both}
    .lr-orb{position:absolute;z-index:-2;width:240px;height:240px;left:-80px;top:-130px;border-radius:50%;filter:blur(34px);background:color-mix(in srgb,var(--accent) 40%,transparent);animation:orb 14s ease-in-out infinite alternate}
    @keyframes orb{to{transform:translate(110px,40px) scale(1.15)}}@keyframes sweep{to{transform:translateX(110%)}}
    .meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font:600 12.5px var(--sans);color:var(--fg2);margin-bottom:16px}
    .meta span{padding:4px 10px;border-radius:999px;background:color-mix(in srgb,var(--accent) 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 16%,transparent)}
    .meta .site{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 12px color-mix(in srgb,var(--accent) 30%,transparent)}
    h1.t{margin:0;font:800 42px/1.1 var(--display);letter-spacing:-.04em;background:linear-gradient(120deg,var(--fg) 30%,color-mix(in srgb,var(--accent) 80%,var(--fg)) 80%,var(--accent3));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:2px}
    .lr-body > p:first-of-type::first-letter{float:left;font:800 3.4em/.9 var(--display);margin:.06em .1em 0 0;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent}
    .lr-body{animation:rise .7s .12s cubic-bezier(.3,1.2,.5,1) both}
    @keyframes rise{from{opacity:0;transform:translateY(14px)}}
    .lr-hero{animation:land .8s cubic-bezier(.3,1.35,.5,1) both}@keyframes land{from{opacity:0;transform:translateY(-10px) scale(.97)}}
    img,video,figure{max-width:100%;height:auto;border-radius:18px}
    img,video{box-shadow:0 14px 40px color-mix(in srgb,var(--accent) 14%,rgba(0,0,0,.14))}
    figure{margin:2em 0}figcaption{font:13px/1.5 var(--sans);color:var(--mut);margin-top:10px;text-align:center}
    a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--accent) 45%,transparent)}
    a:hover{text-decoration-color:var(--accent)}
    pre,code{font:15px/1.6 ui-monospace,"SF Mono",Menlo,Consolas,monospace;white-space:pre-wrap}
    pre{padding:16px 18px;border-radius:16px;background:var(--glass);box-shadow:var(--spec),inset 0 0 0 1px var(--line)}
    blockquote{position:relative;margin:1.6em 0;padding:16px 22px 16px 26px;border-radius:18px;color:var(--fg2);background:radial-gradient(100% 140% at 0% 0%,color-mix(in srgb,var(--accent) 12%,transparent),transparent 60%),var(--glass);box-shadow:var(--spec),inset 0 0 0 1px var(--line)}
    blockquote::before{content:'';position:absolute;left:10px;top:14px;bottom:14px;width:4px;border-radius:4px;background:var(--nova);box-shadow:0 0 10px var(--accent)}
    h2,h3,h4{font-family:var(--display);font-weight:800;letter-spacing:-.025em;line-height:1.2;margin-top:2em}
    h2{font-size:1.45em}h3{font-size:1.2em}
    hr{border:0;height:1px;margin:2.4em 0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 40%,var(--line)),transparent)}
    table{border-collapse:collapse;font:15px/1.5 var(--sans)}td,th{padding:6px 10px;border-bottom:1px solid var(--line)}
    .lr-end{margin-top:60px;display:flex;align-items:center;gap:12px;font:600 13px var(--sans);color:var(--mut)}
    .lr-end::before,.lr-end::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 40%,var(--line)),transparent)}
    ${STILL ? '*{animation:none!important;transition:none!important}' : ''}`
  document.head.appendChild(style)
  const bar = document.createElement('div'); bar.className = 'lr-bar'
  const tools = document.createElement('div'); tools.className = 'lr-tools'
  tools.innerHTML = '<button class="sm" title="Smaller text">A-</button><button class="lg" title="Larger text">A+</button><button class="ex" title="Leave Reader Mode">Exit Reader</button>'
  let size = 20
  const setSize = d => { size = Math.max(15, Math.min(28, size + d)); document.documentElement.style.setProperty('--size', size + 'px') }
  tools.querySelector('.sm').onclick = () => setSize(-1)
  tools.querySelector('.lg').onclick = () => setSize(1)
  tools.querySelector('.ex').onclick = () => location.reload()
  const wrap = document.createElement('div'); wrap.className = 'lr'
  const hero = document.createElement('header'); hero.className = 'lr-hero'
  const orb = document.createElement('span'); orb.className = 'lr-orb'
  const meta = document.createElement('div'); meta.className = 'meta'
  const mins = Math.max(1, Math.round(words / 230))
  for (const [cls, txt] of [['site', host], ['', `${mins} min read`], ['', `${words.toLocaleString()} words`]]) { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = txt; meta.appendChild(s) }
  const h = document.createElement('h1'); h.className = 't'; h.textContent = title.trim()
  hero.append(orb, meta, h)
  clone.classList.add('lr-body')
  // the title is in the hero now; drop the article's own copy of it
  const dup = clone.querySelector('h1'); if (dup && dup.textContent.trim() === title.trim()) dup.remove()
  const end = document.createElement('div'); end.className = 'lr-end'; end.textContent = 'The end'
  wrap.append(hero, clone, end)
  document.body.append(bar, tools, wrap)
  const prog = () => { const m = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${m > 0 ? Math.min(1, scrollY / m) : 1})` }
  addEventListener('scroll', prog, { passive: true }); prog()
  window.scrollTo(0, 0)
})()
