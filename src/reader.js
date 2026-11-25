// Lumen Reader (4.1): the article alone, set like a premium magazine. A dark cover spread opens it: generative art
// painted from the page's own colours, a huge editorial title, the byline and numbers, the parts of the article as
// chips, and the lead picture tilted in 3D on the right (or, with no picture, a type card with the title's first
// letter). Six themes (Auto, Paper, Sepia, Sage, Dusk, Night), serif, sans or rounded type, text size, spacing and
// width, a contents rail that fills as you read, Spotlight focus, and an obsidian glass console at the bottom.
// Runs in the tab's preload world (main.js readerMode), so it can remember the reader's choices without the page
// seeing them. Nothing moves at idle: entrances and presses play once, the progress and time left only change while
// you scroll, and Motion Off or reduced motion makes everything still.
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
  const title = ((document.querySelector('h1') || {}).textContent || document.title || '').trim()
  const metaOf = sel => { const m = document.querySelector(sel); return m ? String(m.getAttribute('content') || '').trim() : '' }
  const byline = metaOf('meta[name="author"]') || metaOf('meta[property="article:author"]')
  const lead = metaOf('meta[name="description"]') || metaOf('meta[property="og:description"]')
  let cover = ''
  for (const im of best.querySelectorAll('img')) { const q = im.getBoundingClientRect(); const src = im.currentSrc || im.src; if (q.width >= 420 && q.height >= 200 && /^https?:/.test(src)) { cover = src; break } }
  // the page's own colours, read before the page is cleared: they paint the generative art in the masthead
  const pageCols = (() => {
    const out = [], seen = []
    const add = (r, g, b) => {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0
      if (sat < 0.28 || mx < 50) return
      const h = Math.round(Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI + 360) % 360
      if (seen.some(x => Math.min(Math.abs(x - h), 360 - Math.abs(x - h)) < 28)) return
      seen.push(h); out.push(`rgb(${r} ${g} ${b})`)
    }
    const eat = s => { for (const m of String(s || '').matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g)) if (m[4] === undefined || +m[4] > 0.5) add(+m[1], +m[2], +m[3]) }
    const hex = String(metaOf('meta[name="theme-color"]')).match(/^#([0-9a-f]{6})$/i)
    if (hex) add(parseInt(hex[1].slice(0, 2), 16), parseInt(hex[1].slice(2, 4), 16), parseInt(hex[1].slice(4), 16))
    try {
      for (const n of [...document.querySelectorAll('header, nav, h1, h2, a, button, [class*="logo"], [class*="brand"], [class*="hero"]')].slice(0, 120)) {
        if (out.length >= 3) break
        const cs = getComputedStyle(n); eat(cs.backgroundColor); eat(cs.backgroundImage); eat(cs.color)
      }
    } catch {}
    return out
  })()
  // a small seeded random, so each article always gets the same art
  let seed = 7; for (const ch of title + location.host) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const clone = best.cloneNode(true)
  clone.querySelectorAll('script, style, iframe, form, button, nav, aside, footer, input, select, textarea, [class*="share"], [class*="related"], [class*="promo"], [class*="newsletter"], [aria-hidden="true"]').forEach(n => n.remove())
  clone.querySelectorAll('*').forEach(n => { n.removeAttribute('style'); n.removeAttribute('class'); n.removeAttribute('width'); n.removeAttribute('height'); for (const a of [...n.attributes]) if (/^on/i.test(a.name)) n.removeAttribute(a.name) })
  clone.querySelectorAll('img').forEach(img => { const s = img.getAttribute('data-src') || img.getAttribute('data-lazy-src'); if (s) img.src = s; img.loading = 'lazy' })
  if (cover) { const dupe = [...clone.querySelectorAll('img')].find(im => im.src === cover); if (dupe) (dupe.closest('figure') || dupe).remove() }
  const host = location.host.replace(/^www\./, '')
  const words = clone.textContent.trim().split(/\s+/).length
  const WPM = 230, mins = Math.max(1, Math.round(words / WPM))

  // saved choices, put in by main.js (sanitised there)
  let P = { size: 20, theme: 'auto', font: 'serif', lh: 'normal', width: 'medium', align: 'left', focus: false }
  try { P = { ...P, ...JSON.parse('__LUMEN_READER_PREFS__') } } catch {}
  const save = () => { try { if (typeof globalThis.__lumenReaderSave === 'function') globalThis.__lumenReaderSave({ ...P }) } catch {} }

  document.documentElement.dataset.lumenReader = '1'
  document.head.innerHTML = '<meta charset="utf-8"><meta name="viewport" content="width=device-width"><title></title>'
  document.title = title
  document.body.innerHTML = ''
  for (const a of [...document.body.attributes]) document.body.removeAttribute(a.name)
  for (const a of [...document.documentElement.attributes]) if (!/^(lang|dir|data-lumen-reader)$/.test(a.name)) document.documentElement.removeAttribute(a.name)
  const ACC = '__LUMEN_ACCENT__', STILL = '__LUMEN_MOTION__' === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches
  const SPRING = 'linear(0,.161,.458,.726,.907,1.005,1.042,1.045,1.033,1.02,1.009,1.002,.999,.998,.998,.999,.999,1)'
  const JELLY = 'linear(0,.091,.297,.538,.76,.933,1.047,1.108,1.126,1.116,1.091,1.06,1.032,1.01,.995,.987,.984,.985,.988,.992,.996,.999,1.001,1.002,1.001,1)'
  const style = document.createElement('style')
  // six reading themes: each one sets the page, the paper, the ink and the glass
  const T = {
    light: `--bg:#f6f5f2;--paper:#ffffff;--fg:#16171d;--fg2:#4a4d5a;--mut:#8b8d98;--line:rgba(20,24,48,.1);--chip:rgba(20,24,48,.055);
      --glass:linear-gradient(180deg,rgba(255,255,255,.9),rgba(252,252,255,.8));--spec:inset 0 1px 0 rgba(255,255,255,.95);--glint:.5;--scrim:246,245,242;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 80%,transparent),rgba(255,255,255,.95) 30%,rgba(255,255,255,.2) 62%,color-mix(in srgb,var(--accent3) 75%,transparent));
      --shadow:0 1px 2px rgba(14,18,40,.06),0 18px 40px rgba(14,18,40,.1),0 40px 90px color-mix(in srgb,var(--amb) 26%,rgba(14,18,40,.12));--neb:18%;color-scheme:light`,
    sepia: `--bg:#f1e6d0;--paper:#f8efdd;--fg:#3a2d1f;--fg2:#5f4e3b;--mut:#937f66;--line:rgba(91,66,34,.16);--chip:rgba(91,66,34,.08);
      --glass:linear-gradient(180deg,rgba(255,250,238,.9),rgba(246,235,212,.8));--spec:inset 0 1px 0 rgba(255,253,245,.95);--glint:.45;--scrim:241,230,208;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 55%,#b98a4e),rgba(255,250,240,.95) 30%,rgba(255,250,240,.2) 62%,color-mix(in srgb,var(--accent3) 50%,#b98a4e));
      --shadow:0 1px 2px rgba(70,45,10,.08),0 18px 40px rgba(70,45,10,.12),0 40px 90px color-mix(in srgb,#b98a4e 26%,rgba(70,45,10,.12));--neb:10%;color-scheme:light`,
    sage: `--bg:#e7ede3;--paper:#f2f6ef;--fg:#1d2a21;--fg2:#41544a;--mut:#7d8f84;--line:rgba(30,60,40,.13);--chip:rgba(30,60,40,.07);
      --glass:linear-gradient(180deg,rgba(248,252,245,.9),rgba(234,242,230,.8));--spec:inset 0 1px 0 rgba(255,255,255,.9);--glint:.45;--scrim:231,237,227;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 50%,#5f9b72),rgba(255,255,255,.9) 30%,rgba(255,255,255,.2) 62%,color-mix(in srgb,var(--accent3) 50%,#5f9b72));
      --shadow:0 1px 2px rgba(20,50,30,.08),0 18px 40px rgba(20,50,30,.1),0 40px 90px color-mix(in srgb,#5f9b72 24%,rgba(20,50,30,.12));--neb:12%;color-scheme:light`,
    dusk: `--bg:#19141f;--paper:#221b2a;--fg:#f1e8ee;--fg2:#c7b9c4;--mut:#8f8094;--line:rgba(255,220,240,.1);--chip:rgba(255,220,240,.07);
      --glass:linear-gradient(180deg,color-mix(in srgb,var(--accent3) 10%,rgba(44,34,52,.88)),color-mix(in srgb,var(--accent3) 6%,rgba(26,20,32,.84)));--spec:inset 0 1px 0 rgba(255,235,245,.16);--glint:.14;--scrim:25,20,31;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent3) 90%,transparent),rgba(255,255,255,.28) 30%,rgba(255,255,255,.05) 62%,color-mix(in srgb,var(--accent) 90%,transparent));
      --shadow:0 1px 2px rgba(0,0,0,.5),0 18px 40px rgba(0,0,0,.4),0 40px 90px color-mix(in srgb,var(--amb) 30%,rgba(0,0,0,.5));--neb:22%;color-scheme:dark`,
    dark: `--bg:#0a0c14;--paper:#11141f;--fg:#ebecf4;--fg2:#b2b5c4;--mut:#7f8291;--line:rgba(255,255,255,.1);--chip:rgba(255,255,255,.07);
      --glass:linear-gradient(180deg,color-mix(in srgb,var(--accent) 9%,rgba(32,36,54,.88)),color-mix(in srgb,var(--accent) 5%,rgba(17,20,32,.84)));--spec:inset 0 1px 0 rgba(255,255,255,.16);--glint:.14;--scrim:10,12,20;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 95%,transparent),rgba(255,255,255,.3) 30%,rgba(255,255,255,.05) 62%,color-mix(in srgb,var(--accent3) 90%,transparent));
      --shadow:0 1px 2px rgba(0,0,0,.5),0 18px 40px rgba(0,0,0,.4),0 40px 90px color-mix(in srgb,var(--amb) 30%,rgba(0,0,0,.5));--neb:24%;color-scheme:dark`,
  }
  style.textContent = `
    :root{--accent:${ACC};--accent2:oklch(from var(--accent) calc(l - .02) c calc(h + 40));--accent3:oklch(from var(--accent) calc(l + .04) c calc(h + 95));--amb:var(--accent);
      --nova:linear-gradient(135deg,var(--accent),var(--accent2) 55%,var(--accent3));--spring:${SPRING};--jelly:${JELLY};
      --halo:0 0 0 4px color-mix(in srgb,var(--accent) 18%,transparent),0 0 24px color-mix(in srgb,var(--accent) 32%,transparent);
      --size:20px;--lh:1.75;--w:700px;--sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;
      --serif:"Iowan Old Style","Charter","Source Serif Pro","Source Serif 4","Georgia",serif;--body:var(--serif);--title:var(--serif);
      --display:ui-rounded,"SF Pro Rounded","Segoe UI Variable Display","Nunito",system-ui,sans-serif;--ch:clamp(300px,58vh,540px);${T.light}}
    :root[data-lr-theme=dark]{${T.dark}}:root[data-lr-theme=sepia]{${T.sepia}}:root[data-lr-theme=sage]{${T.sage}}:root[data-lr-theme=dusk]{${T.dusk}}
    @media (prefers-color-scheme:dark){:root[data-lr-theme=auto]{${T.dark}}}
    :root[data-lr-font=sans]{--body:var(--sans);--title:var(--display)}:root[data-lr-font=rounded]{--body:var(--display);--title:var(--display)}
    :root[data-lr-align=justify] .lr-body p{text-align:justify}
    :root[data-lr-lh=compact]{--lh:1.55}:root[data-lr-lh=airy]{--lh:2}
    :root[data-lr-width=narrow]{--w:600px}:root[data-lr-width=wide]{--w:860px}
    html{background:var(--bg);color:var(--fg);scroll-padding-top:40px;overflow-x:clip}
    html,body{margin:0}
    body{background:var(--bg)}
    body::before{content:'';position:fixed;inset:0;z-index:-3;pointer-events:none;background:
      radial-gradient(46% 38% at 6% 0%,color-mix(in srgb,var(--amb) var(--neb),transparent),transparent 70%),
      radial-gradient(40% 34% at 96% 8%,color-mix(in srgb,var(--accent3) calc(var(--neb) * .8),transparent),transparent 70%),
      radial-gradient(60% 44% at 50% 112%,color-mix(in srgb,var(--accent2) calc(var(--neb) * .7),transparent),transparent 70%)}
    ::selection{background:color-mix(in srgb,var(--accent) 30%,transparent)}
    button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
    .lr-glass{position:relative;isolation:isolate;background:radial-gradient(200px circle at var(--gx,20%) var(--gy,-30%),rgb(255 255 255/var(--glint)),transparent 70%),radial-gradient(120% 120% at 0% 0%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 60%),radial-gradient(100% 100% at 100% 100%,color-mix(in srgb,var(--accent3) 12%,transparent),transparent 60%),var(--glass);
      -webkit-backdrop-filter:blur(24px) saturate(1.9);backdrop-filter:blur(24px) saturate(1.9);box-shadow:var(--spec),inset 0 -20px 36px -30px color-mix(in srgb,var(--accent3) 70%,transparent),var(--shadow)}
    .lr-glass::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;background:var(--edge);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}


    /* Lumen's own chrome over the article (dock, sheets, rail, bars) is obsidian glass in every theme, like a HUD:
       a deep tinted body, a bright specular rim, an inner refraction sheen and layered coloured shadows */
    .lr-tools,.lr-pop,.lr-rail,.lr-side,.lr-sel,.lr-resume,.lr-end{--fg:#f5f6fc;--fg2:rgba(245,246,252,.74);--mut:rgba(245,246,252,.52);--line:rgba(255,255,255,.13);--chip:rgba(255,255,255,.08);--paper:rgba(255,255,255,.16);--glint:.2;
      --glass:linear-gradient(180deg,color-mix(in srgb,var(--accent) 18%,rgba(30,32,48,.84)),color-mix(in srgb,var(--accent3) 12%,rgba(12,13,22,.9)));
      --spec:inset 0 1px 0 rgba(255,255,255,.28),inset 0 -1px 0 rgba(0,0,0,.35),inset 0 0 0 .5px rgba(255,255,255,.08);
      --edge:linear-gradient(140deg,rgba(255,255,255,.75),color-mix(in srgb,var(--accent) 80%,transparent) 22%,rgba(255,255,255,.05) 48%,rgba(255,255,255,.02) 66%,color-mix(in srgb,var(--accent3) 85%,transparent) 92%);
      --shadow:0 0 0 .5px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.22),0 16px 36px rgba(6,8,20,.32),0 34px 80px color-mix(in srgb,var(--accent) 38%,transparent),0 10px 40px -10px color-mix(in srgb,var(--accent3) 50%,transparent);
      color:var(--fg);color-scheme:dark}
    .lr-glass::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(118deg,rgba(255,255,255,.16),rgba(255,255,255,.04) 22%,transparent 38%,transparent 72%,rgba(255,255,255,.05) 88%,transparent)}
    .lr-pop .lr-seg,.lr-pop .lr-size,.lr-pop .lr-tog{background:rgba(0,0,0,.22);box-shadow:inset 0 1px 2px rgba(0,0,0,.35),inset 0 0 0 .5px rgba(255,255,255,.06)}
    .lr-pop .lr-seg button[aria-pressed=true]{background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.1));box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 4px 14px color-mix(in srgb,var(--accent) 40%,transparent),inset 0 0 0 1px color-mix(in srgb,var(--accent) 70%,transparent)}
    /* a jelly pop on every press, played once */
    .lr-pop-now{animation:jp .6s var(--jelly) both!important}
    @keyframes jp{from{transform:scale(.84)}}
    /* reading progress: a glowing line across the very top */
    .lr-bar{position:fixed;left:0;top:0;height:4px;width:100%;transform-origin:0 50%;transform:scaleX(0);background:var(--nova);box-shadow:0 0 18px var(--accent),0 0 4px var(--accent);z-index:20;border-radius:0 4px 4px 0}

    /* the dock: an obsidian console floating at the bottom: progress dial, time left, a well of tools, Exit */
    .lr-tools{position:fixed;left:50%;bottom:20px;translate:-50% 0;z-index:12;display:flex;align-items:center;gap:6px;padding:7px;border-radius:26px;font:650 13px var(--sans);animation:dock .9s .45s var(--jelly) both}
    @keyframes dock{from{opacity:0;transform:translateY(60px) scale(.8)}}
    .lr-tools .well{display:flex;align-items:center;gap:2px;padding:3px;border-radius:19px;background:rgba(0,0,0,.26);box-shadow:inset 0 1px 3px rgba(0,0,0,.4),inset 0 0 0 .5px rgba(255,255,255,.06),0 1px 0 rgba(255,255,255,.08)}
    .lr-tools button{all:unset;box-sizing:border-box;position:relative;min-width:42px;height:42px;padding:0 12px;border-radius:16px;display:grid;place-items:center;color:var(--fg2);cursor:default;font:750 14px var(--sans);transition:transform .5s var(--jelly)}
    .lr-tools button::before{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06));box-shadow:inset 0 1px 0 rgba(255,255,255,.22);opacity:0;transition:opacity .18s}
    .lr-tools button > *{position:relative}
    .lr-tools button svg{width:19px;height:19px}
    .lr-tools button:hover{color:var(--fg);transform:translateY(-2px)}.lr-tools button:hover::before{opacity:1}
    .lr-tools button:active{transform:scale(.92)}
    .lr-tools button[aria-expanded=true],.lr-tools .say.on{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 18px color-mix(in srgb,var(--accent) 55%,transparent)}
    .lr-tools button:focus-visible,.lr-pop button:focus-visible,.lr-pop a:focus-visible,.lr-rail a:focus-visible,.lr-end button:focus-visible,.lr-begin:focus-visible{outline:none;box-shadow:var(--halo)}
    .lr-tools .sep{display:none}
    .lr-tools .ex{color:#fff;height:46px;padding:0 22px;border-radius:19px;white-space:nowrap;font:800 14px var(--sans);background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -2px 6px rgba(0,0,0,.2),0 8px 24px color-mix(in srgb,var(--accent) 55%,transparent)}
    .lr-tools .ex:hover{color:#fff}
    .lr-left{display:flex;align-items:center;gap:11px;height:46px;padding:0 14px 0 6px;color:var(--fg);white-space:nowrap;font-variant-numeric:tabular-nums}
    .lr-left i{position:relative;display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:conic-gradient(var(--accent),var(--accent3) calc(var(--p,0) * 1turn),rgba(255,255,255,.1) 0);flex:none;box-shadow:0 0 18px color-mix(in srgb,var(--accent) 45%,transparent)}
    .lr-left i::after{content:'';position:absolute;inset:4px;border-radius:50%;background:radial-gradient(circle at 50% 30%,#2a2d40,#101220);box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}
    .lr-left i b{position:relative;z-index:1;font:800 10.5px/1 var(--display);color:#fff;font-style:normal}
    .lr-left > span{display:flex;flex-direction:column;gap:3px}
    .lr-left > span b{font:800 17px/1 var(--display);letter-spacing:-.03em}
    .lr-left > span small{font:700 9.5px/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}

    /* sheets rise out of the dock */
    .lr-pop{position:fixed;left:50%;bottom:90px;translate:-50% 0;z-index:13;box-sizing:border-box;width:380px;max-width:calc(100vw - 24px);max-height:calc(100vh - 120px);overflow:auto;padding:22px;border-radius:30px;font:13px/1.4 var(--sans);color:var(--fg);
      opacity:0;visibility:hidden;transform:translateY(24px) scale(.9);transform-origin:50% 100%;transition:opacity .16s,transform .6s var(--jelly),visibility 0s .2s;scrollbar-width:none}
    .lr-pop.on{opacity:1;visibility:visible;transform:none;transition:opacity .16s,transform .6s var(--jelly),visibility 0s}
    .lr-pop .ph{display:flex;align-items:center;gap:14px;margin:0 0 16px}
    .lr-pop .ph .tile{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;color:#fff;background:var(--nova);flex:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 10px 24px color-mix(in srgb,var(--accent) 45%,transparent)}
    .lr-pop .ph .tile svg{width:22px;height:22px}
    .lr-pop h4{margin:0;font:800 26px/1.05 var(--display);letter-spacing:-.035em;background:linear-gradient(120deg,var(--fg) 30%,color-mix(in srgb,var(--accent) 80%,var(--fg)) 75%,var(--accent3));-webkit-background-clip:text;background-clip:text;color:transparent}
    .lr-pop .ph small{display:block;margin-top:4px;font:600 12px var(--sans);color:var(--mut)}
    .lr-pop .lab{margin:16px 2px 8px;font:800 10.5px/1 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}
    .lr-panel{width:640px}
    .lr-panel .cols{display:grid;grid-template-columns:1fr 1fr;gap:0 22px}
    .lr-panel .cols > div > .lab:first-child{margin-top:0}
    .lr-themes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .lr-themes button{all:unset;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;cursor:default;font:700 11.5px var(--sans);color:var(--fg2);text-align:center;transition:transform .5s var(--jelly)}
    .lr-themes button:hover{transform:translateY(-2px)}.lr-themes button:active{transform:scale(.95)}
    .lr-themes .pv{position:relative;height:62px;border-radius:14px;padding:9px 10px;display:flex;flex-direction:column;gap:5px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.1),0 4px 12px rgba(0,0,0,.08);transition:none}
    .lr-themes .pv b{display:block;height:6px;width:62%;border-radius:4px;background:var(--nova)}
    .lr-themes .pv i{display:block;height:3px;border-radius:3px;background:currentColor;opacity:.55}.lr-themes .pv i:last-child{width:70%}
    .lr-themes .pv.auto{background:linear-gradient(135deg,#fff 50%,#11141f 50%);color:#777}
    .lr-themes button[aria-pressed=true]{color:var(--fg)}
    .lr-themes button[aria-pressed=true] .pv{box-shadow:0 0 0 2.5px var(--accent),0 0 0 6px color-mix(in srgb,var(--accent) 20%,transparent),0 10px 24px color-mix(in srgb,var(--accent) 34%,transparent)}
    .lr-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border-radius:16px;background:var(--chip)}
    .lr-seg button{all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:40px;padding:6px 4px;border-radius:12px;font:650 11.5px var(--sans);color:var(--fg2);cursor:default;text-align:center;transition:transform .5s var(--jelly)}
    .lr-seg button:hover{color:var(--fg);background:color-mix(in srgb,var(--accent) 10%,transparent)}
    .lr-seg button:active{transform:scale(.95)}
    .lr-seg button[aria-pressed=true]{color:var(--fg);background:var(--paper);box-shadow:0 1px 2px rgba(0,0,0,.08),0 4px 14px color-mix(in srgb,var(--accent) 22%,transparent),inset 0 0 0 1.5px color-mix(in srgb,var(--accent) 55%,transparent)}
    .lr-seg.fonts button{min-height:64px}
    .lr-seg .ag{font-size:30px;line-height:1;font-weight:600}
    .lr-seg .ln{display:flex;flex-direction:column;gap:var(--g);width:22px}.lr-seg .ln i{height:2px;border-radius:2px;background:currentColor;opacity:.7}
    .lr-seg .wd{height:14px;border-radius:4px;border:1.5px solid currentColor;opacity:.75}
    .lr-size{display:flex;align-items:center;gap:8px;padding:4px;border-radius:16px;background:var(--chip)}
    .lr-size button{all:unset;box-sizing:border-box;width:40px;height:38px;border-radius:12px;display:grid;place-items:center;font:750 13px var(--serif);color:var(--fg2);transition:transform .5s var(--jelly)}
    .lr-size button:hover{background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--fg)}.lr-size button:active{transform:scale(.92)}
    .lr-size .big{font-size:21px}
    .lr-size .tr{flex:1;position:relative;height:6px;border-radius:6px;background:color-mix(in srgb,var(--fg) 10%,transparent)}
    .lr-size .tr i{position:absolute;left:0;top:0;bottom:0;border-radius:inherit;background:var(--nova);box-shadow:0 0 8px color-mix(in srgb,var(--accent) 60%,transparent)}
    .lr-size .tr i::after{content:'';position:absolute;right:-8px;top:50%;width:16px;height:16px;margin-top:-8px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25),0 0 0 3px color-mix(in srgb,var(--accent) 40%,transparent)}
    .lr-size .val{min-width:46px;text-align:center;font:800 13px var(--display);color:var(--fg);font-variant-numeric:tabular-nums}
    .lr-tog{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:18px;background:var(--chip);font:700 13.5px var(--sans);color:var(--fg)}
    .lr-tog small{display:block;font:500 11.5px var(--sans);color:var(--mut);margin-top:2px}
    .lr-tog button{all:unset;position:relative;flex:none;width:44px;height:27px;border-radius:99px;background:color-mix(in srgb,var(--fg) 16%,transparent);transition:none}
    .lr-tog button::after{content:'';position:absolute;left:3px;top:3px;width:21px;height:21px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);transition:transform .5s var(--jelly)}
    .lr-tog button[aria-checked=true]{background:var(--nova);box-shadow:var(--halo)}
    .lr-tog button[aria-checked=true]::after{transform:translateX(17px)}
    .lr-tog button:focus-visible{outline:none;box-shadow:var(--halo)}
    .lr-keys{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:7px 8px;align-items:center;font:550 12px var(--sans);color:var(--fg2)}
    .lr-keys kbd{font:700 11px/1 var(--sans);min-width:22px;text-align:center;padding:5px 6px;border-radius:7px;background:var(--chip);color:var(--fg);box-shadow:inset 0 -1px 0 var(--line)}
    .lr-tocp{width:420px}
    .lr-tocp nav,.lr-rail nav{display:flex;flex-direction:column;gap:2px;counter-reset:s}
    .lr-tocp a{display:flex;align-items:center;gap:14px;padding:10px 12px;border-radius:16px;color:var(--fg2);text-decoration:none;font:650 15px/1.25 var(--sans);transition:transform .5s var(--jelly)}
    .lr-tocp a.h3{padding-left:52px;font-weight:550;font-size:13.5px}
    .lr-tocp a .mn{margin-left:auto;font:700 11px var(--sans);color:var(--mut);white-space:nowrap}
    .lr-tocp a.h2::before{counter-increment:s;content:counter(s,decimal-leading-zero);flex:none;width:28px;font:800 20px/1 var(--display);letter-spacing:-.04em;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent}
    .lr-tocp a:hover{background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--fg);transform:translateX(3px)}
    .lr-tocp a.on{color:var(--fg);background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 20%,transparent),color-mix(in srgb,var(--accent3) 8%,transparent));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 26%,transparent)}
    .lr-tocp a.done{color:var(--mut)}

    .lr-side{position:fixed;top:50%;right:16px;width:196px;box-sizing:border-box;z-index:5;padding:18px 16px 16px;border-radius:26px;display:none;
      opacity:0;transform:translate(24px,-50%) scale(.94);transition:opacity .25s,transform .7s var(--jelly);pointer-events:none;font:600 12px var(--sans)}
    html.lr-has-rail .lr-side{display:block}
    html.lr-past .lr-side{opacity:1;transform:translate(0,-50%);pointer-events:auto}
    .lr-side .rt{margin:0 0 12px;font:800 10.5px/1 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}
    .lr-side .big{display:flex;align-items:baseline;gap:6px}
    .lr-side .big b{font:800 40px/1 var(--display);letter-spacing:-.05em;background:linear-gradient(120deg,#fff 30%,color-mix(in srgb,var(--accent3) 60%,#fff));-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums}
    .lr-side .big small{font:700 11px var(--sans);color:var(--mut);text-transform:uppercase;letter-spacing:.1em}
    .lr-side .m{height:5px;margin:10px 0 14px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden}
    .lr-side .m i{display:block;height:100%;border-radius:inherit;background:var(--nova);transform-origin:0 50%;transform:scaleX(0);transition:transform .4s var(--spring)}
    .lr-side .kv{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line);color:var(--fg2)}
    .lr-side .kv b{color:var(--fg);font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;text-align:right}
    .lr-side .q{margin-top:10px;padding:11px 12px;border-radius:14px;background:rgba(0,0,0,.22);box-shadow:inset 0 1px 2px rgba(0,0,0,.3);font:italic 500 12.5px/1.45 var(--serif);color:var(--mut)}
    .lr-side .q.on{color:var(--fg);background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 30%,rgba(0,0,0,.2)),color-mix(in srgb,var(--accent3) 22%,rgba(0,0,0,.2)))}
    /* the contents rail: a track that fills as you read, shown once you are past the masthead */
    .lr-rail{position:fixed;top:50%;left:16px;width:196px;box-sizing:border-box;z-index:5;padding:18px 14px 14px 12px;border-radius:26px;display:none;max-height:calc(100vh - 160px);overflow:auto;scrollbar-width:none;
      opacity:0;transform:translate(-24px,-50%) scale(.94);transition:opacity .25s,transform .7s var(--jelly);pointer-events:none}
    html.lr-has-rail .lr-rail{display:block}
    html.lr-past .lr-rail{opacity:1;transform:translate(0,-50%);pointer-events:auto}
    .lr-rail .rt{margin:0 6px 12px 30px;font:800 10.5px/1 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}
    .lr-rail nav{position:relative;padding-left:22px}
    .lr-rail nav::before{content:'';position:absolute;left:11px;top:10px;bottom:10px;width:2px;border-radius:2px;background:var(--line)}
    .lr-rail nav::after{content:'';position:absolute;left:11px;top:10px;width:2px;height:calc(100% - 20px);transform-origin:50% 0;transform:scaleY(var(--rp,0));border-radius:2px;background:var(--nova);box-shadow:0 0 10px var(--accent);transition:transform .5s var(--spring)}
    .lr-rail a{position:relative;display:block;padding:7px 8px;border-radius:12px;color:var(--fg2);text-decoration:none;font:650 13px/1.3 var(--sans);transition:transform .5s var(--jelly)}
    .lr-rail a::before{content:'';position:absolute;left:-15px;top:50%;width:8px;height:8px;margin-top:-4px;border-radius:50%;background:var(--paper);box-shadow:inset 0 0 0 2px var(--line);z-index:1;transition:transform .5s var(--jelly)}
    .lr-rail a.h3{font-size:12px;font-weight:550;padding-left:16px}
    .lr-rail a:hover{background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--fg);transform:translateX(2px)}
    .lr-rail a.done{color:var(--mut)}.lr-rail a.done::before{background:var(--accent);box-shadow:none}
    .lr-rail a.on{color:var(--fg);background:color-mix(in srgb,var(--accent) 12%,transparent)}
    .lr-rail a.on::before{background:var(--nova);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 22%,transparent),0 0 12px var(--accent);transform:scale(1.35)}

    /* the masthead: a dark, rich cover spread in every theme. Generative art from the page's own colours fills it;
       the title is set huge and white on the left, the lead picture floats on the right like a magazine cover */
    .lr-hero{position:relative;isolation:isolate;overflow:hidden;display:flow-root;min-height:min(84vh,720px);color:#fff;background:#07080f;border-radius:0 0 44px 44px;
      box-shadow:0 40px 90px -30px color-mix(in srgb,var(--g1) 55%,transparent),inset 0 -1px 0 rgba(255,255,255,.14)}
    .lr-hero,.lr-end{--g1:${pageCols[0] || 'var(--accent)'};--g2:${pageCols[1] || 'oklch(from var(--accent) .64 .25 calc(h + 70))'};--g3:${pageCols[2] || 'oklch(from var(--accent) .7 .2 calc(h + 200))'};
      --g4:oklch(from var(--g1) .66 .24 calc(h + 150));--g5:oklch(.6 .27 0)}
    .lr-gen{position:absolute;inset:0;z-index:-2;width:100%;height:100%;animation:genin 2.2s cubic-bezier(.2,.7,.2,1) both}
    @keyframes genin{from{opacity:0;transform:scale(1.08)}}
    .lr-hero::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(90deg,rgba(5,6,12,.82) 0%,rgba(5,6,12,.55) 42%,rgba(5,6,12,.08) 75%),linear-gradient(0deg,rgba(5,6,12,.7),transparent 45%)}
    .lr-hero::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--g1) 80%,#fff),transparent);opacity:.7}
    .lr-hgrid{position:relative;box-sizing:border-box;max-width:1240px;min-height:inherit;margin:0 auto;padding:76px 56px 44px;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:28px 56px;align-items:end}
    .lr-htext{animation:htx 1s .2s var(--jelly) both}
    @keyframes htx{from{opacity:0;transform:translateY(40px)}}
    .lr-kick{display:flex;align-items:center;gap:16px;margin-bottom:24px}
    .lr-ic{position:relative;width:56px;height:56px;flex:none;display:grid;place-items:center;border-radius:18px;color:#fff;
      background:linear-gradient(180deg,rgba(255,255,255,.4),transparent 52%),linear-gradient(145deg,color-mix(in srgb,var(--accent) 70%,white),var(--accent) 50%,var(--accent3));
      box-shadow:0 14px 34px color-mix(in srgb,var(--accent) 60%,transparent),0 0 0 7px rgba(255,255,255,.08),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -3px 8px rgba(0,0,0,.2);animation:icin 1s .45s var(--jelly) both}
    .lr-ic::after{content:'';position:absolute;inset:-15px;border-radius:28px;border:1px solid rgba(255,255,255,.16);pointer-events:none;animation:ring 1.2s .6s ease both}
    .lr-ic svg{width:27px;height:27px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
    @keyframes icin{from{opacity:0;transform:scale(.4) rotate(-18deg)}}@keyframes ring{from{opacity:0;transform:scale(.6)}}
    .lr-kick .kt{display:flex;flex-direction:column;gap:6px;margin-left:8px}
    .lr-kick .site{font:800 12.5px/1 var(--sans);letter-spacing:.2em;text-transform:uppercase;color:#fff}
    .lr-kick .kt small{font:650 12px/1 var(--sans);letter-spacing:.04em;color:rgba(255,255,255,.6)}
    .lr-kick .rule{flex:1;height:1px;max-width:220px;background:linear-gradient(90deg,rgba(255,255,255,.5),transparent)}
    h1.t{margin:0;font:700 clamp(42px,5.7vw,88px)/.98 var(--title);letter-spacing:-.04em;text-wrap:balance;padding-bottom:8px;
      background:linear-gradient(175deg,#fff 40%,color-mix(in srgb,var(--g1) 30%,#fff) 75%,color-mix(in srgb,var(--g2) 45%,#fff));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 24px rgba(0,0,0,.35))}
    :root[data-lr-font=sans] h1.t,:root[data-lr-font=rounded] h1.t{font-weight:800;letter-spacing:-.05em}
    .lr-lead{margin:22px 0 0;max-width:34em;font:italic 400 clamp(18px,1.7vw,23px)/1.5 var(--serif);color:rgba(255,255,255,.8);text-wrap:pretty}
    .lr-byrow{display:flex;flex-wrap:wrap;align-items:center;gap:14px 0;margin-top:28px;font:650 13px var(--sans);color:rgba(255,255,255,.72)}
    .lr-byrow .av{width:42px;height:42px;margin-right:12px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 17px var(--display);background:linear-gradient(180deg,rgba(255,255,255,.35),transparent 55%),var(--nova);box-shadow:0 0 0 3px rgba(255,255,255,.14),0 8px 20px color-mix(in srgb,var(--accent) 50%,transparent)}
    .lr-byrow .who{padding-right:20px}
    .lr-byrow .who b{display:block;font:750 15px var(--sans);color:#fff}
    .lr-byrow .who small{display:block;font:600 12px var(--sans);color:rgba(255,255,255,.55);margin-top:2px}
    .lr-byrow .st{display:flex;flex-direction:column;padding:0 20px;border-left:1px solid rgba(255,255,255,.18)}
    .lr-byrow .st b{font:800 24px/1 var(--display);letter-spacing:-.035em;color:#fff;font-variant-numeric:tabular-nums}
    .lr-byrow .st small{margin-top:4px;font:800 9.5px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.5)}
    .lr-begin{all:unset;display:inline-flex;align-items:center;gap:10px;margin-left:22px;height:50px;padding:0 26px 0 28px;border-radius:999px;color:#0a0b12;font:800 15px var(--sans);cursor:default;
      background:linear-gradient(180deg,#fff,#e9eaf3);box-shadow:inset 0 -2px 0 rgba(0,0,0,.08),0 0 0 6px rgba(255,255,255,.08),0 14px 36px color-mix(in srgb,var(--g1) 55%,transparent);transition:transform .5s var(--jelly)}
    .lr-begin svg{width:16px;height:16px;transition:transform .5s var(--jelly)}
    .lr-begin:hover{transform:translateY(-3px)}.lr-begin:hover svg{transform:translateY(3px)}.lr-begin:active{transform:scale(.95)}
    /* the right page of the spread: the lead picture, tilted in 3D with a bright rim and coloured shadows */
    .lr-hpic{position:relative;align-self:center;perspective:1400px;animation:hpic 1.3s .35s var(--jelly) both}
    @keyframes hpic{from{opacity:0;transform:translateX(60px) scale(.9)}}
    .lr-cover{position:relative;border-radius:28px;overflow:hidden;height:min(56vh,480px);transform:rotateY(-11deg) rotateX(4deg) rotateZ(1deg);transform-style:preserve-3d;
      box-shadow:0 0 0 1px rgba(255,255,255,.16),0 30px 60px rgba(0,0,0,.45),0 60px 120px -20px color-mix(in srgb,var(--g1) 60%,transparent),-30px 40px 90px -30px color-mix(in srgb,var(--g2) 60%,transparent)}
    .lr-cover img{width:100%;height:100%;object-fit:cover;display:block;border-radius:0;box-shadow:none}
    .lr-cover::before{content:'';position:absolute;inset:0;z-index:2;border-radius:inherit;padding:1.5px;pointer-events:none;background:linear-gradient(140deg,rgba(255,255,255,.9),rgba(255,255,255,.1) 30%,transparent 60%,color-mix(in srgb,var(--g2) 80%,transparent));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
    .lr-cover::after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(125deg,rgba(255,255,255,.34),rgba(255,255,255,.06) 30%,transparent 46%),linear-gradient(0deg,rgba(0,0,0,.35),transparent 40%)}
    .lr-cover .cap{position:absolute;left:18px;bottom:16px;z-index:3;font:800 10.5px/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.85)}
    /* no picture: the right page is a type specimen card, the title's first letter set huge over the art */
    .lr-mono{position:relative;isolation:isolate;overflow:hidden;border-radius:28px;height:min(56vh,480px);display:flex;flex-direction:column;justify-content:space-between;padding:26px;transform:rotateY(-11deg) rotateX(4deg) rotateZ(1deg);
      background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 50%,rgba(255,255,255,.08));-webkit-backdrop-filter:blur(18px) saturate(1.6);backdrop-filter:blur(18px) saturate(1.6);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 0 0 1px rgba(255,255,255,.14),0 30px 60px rgba(0,0,0,.4),0 60px 120px -20px color-mix(in srgb,var(--g1) 55%,transparent)}
    .lr-mono .lt{position:absolute;right:-4%;bottom:-16%;z-index:-1;font:700 min(30vw,400px)/1 var(--serif);letter-spacing:-.05em;background:linear-gradient(160deg,#fff,color-mix(in srgb,var(--g1) 70%,#fff) 45%,var(--g2));-webkit-background-clip:text;background-clip:text;color:transparent;opacity:.92}
    .lr-mono .no{font:800 11px/1 var(--sans);letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.78)}
    .lr-mono .no b{display:block;margin-top:10px;font:800 46px/1 var(--display);letter-spacing:-.05em;color:#fff}
    .lr-mono .spec{display:flex;gap:18px;font:700 11px var(--sans);letter-spacing:.06em;color:rgba(255,255,255,.75)}
    .lr-mono .spec b{display:block;font:800 22px/1 var(--display);letter-spacing:-.03em;color:#fff;margin-bottom:4px}
    .lr-strip{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:22px;border-top:1px solid rgba(255,255,255,.14)}
    .lr-strip .lab{font:800 10px/1 var(--sans);letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-right:10px}
    .lr-strip a{display:flex;align-items:center;gap:9px;height:38px;padding:0 15px 0 6px;border-radius:999px;color:#fff;text-decoration:none;font:700 13px var(--sans);background:rgba(255,255,255,.09);-webkit-backdrop-filter:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 .5px rgba(255,255,255,.12),0 6px 16px rgba(0,0,0,.2);transition:transform .5s var(--jelly);animation:chip .7s var(--jelly) both;animation-delay:calc(.8s + var(--n) * 70ms)}
    .lr-strip a b{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:800 10.5px var(--display);background:linear-gradient(180deg,rgba(255,255,255,.35),transparent 55%),var(--nova);filter:hue-rotate(calc(var(--n) * 48deg));box-shadow:0 3px 10px rgba(0,0,0,.3)}
    .lr-strip a:hover{transform:translateY(-3px)}.lr-strip a:active{transform:scale(.94)}
    @keyframes chip{from{opacity:0;transform:translateY(16px) scale(.9)}}
    .lr-end{-webkit-backdrop-filter:none;backdrop-filter:none}
    @media (max-width:980px){.lr-hgrid{grid-template-columns:1fr;gap:34px;padding:90px 30px 56px}.lr-hpic{max-width:460px}.lr-cover,.lr-mono{height:240px;transform:none}.lr-hero::before{background:linear-gradient(0deg,rgba(5,6,12,.8),rgba(5,6,12,.35))}}

    /* the article */
    .lr{max-width:var(--w);margin:0 auto;padding:64px 32px 170px;font:var(--size)/var(--lh) var(--body);font-kerning:normal;font-variant-ligatures:common-ligatures;font-variant-numeric:oldstyle-nums proportional-nums}
    .lr-body{animation:rise .9s .3s var(--spring) both;text-wrap:pretty;hyphens:auto;counter-reset:sec}
    @keyframes rise{from{opacity:0;transform:translateY(24px)}}
    .lr-body > *{transition:opacity .45s}
    .lr-body p{margin:0 0 1.15em}
    .lr-body > p:first-of-type{font-size:1.16em;line-height:1.62;color:var(--fg)}
    .lr-body > p:first-of-type::first-letter{float:left;font:700 4.6em/.8 var(--title);margin:.07em .09em 0 -.02em;padding-right:.02em;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 6px 14px color-mix(in srgb,var(--accent) 30%,transparent))}
    .lr-body h2,.lr-body h3,.lr-body h4{font-family:var(--display);font-weight:800;letter-spacing:-.035em;line-height:1.12;color:var(--fg);text-wrap:balance}
    .lr-body h2{position:relative;font-size:1.9em;margin:2.4em 0 .7em;padding-top:1.1em;background:linear-gradient(90deg,var(--accent),var(--accent3) 64px,var(--line) 64px) top left/100% 2px no-repeat}
    .lr-body h2::before{counter-increment:sec;content:counter(sec,decimal-leading-zero);display:block;margin-bottom:.12em;font:700 2.1em/.9 var(--title);letter-spacing:-.04em;color:transparent;-webkit-text-stroke:1.5px color-mix(in srgb,var(--accent) 75%,transparent);opacity:.9}
    .lr-body h3{font-size:1.3em;margin:1.8em 0 .5em}
    .lr-body h4{font-size:1.1em;margin:1.6em 0 .4em}
    img,video,figure{max-width:100%;height:auto;border-radius:22px}
    .lr-body img,.lr-body video{box-shadow:0 2px 6px rgba(0,0,0,.08),0 24px 60px color-mix(in srgb,var(--amb) 22%,rgba(0,0,0,.16));cursor:zoom-in;transition:transform .5s var(--jelly)}
    .lr-body img:hover{transform:translateY(-3px) scale(1.005)}
    .lr-body figure{margin:2.6em 0}
    @media (min-width:880px){.lr-body figure,.lr-body > img{margin-left:-48px;margin-right:-48px;max-width:calc(100% + 96px)}.lr-body figure img{width:100%}}
    figcaption{font:italic 14px/1.5 var(--serif);color:var(--mut);margin-top:14px;text-align:center}
    a{color:var(--accent);text-decoration-thickness:1.5px;text-underline-offset:4px;text-decoration-color:color-mix(in srgb,var(--accent) 40%,transparent);transition:none}
    a:hover{text-decoration-color:var(--accent)}
    pre,code{font:.8em/1.6 ui-monospace,"SF Mono",Menlo,Consolas,monospace;white-space:pre-wrap}
    pre{padding:18px 20px;border-radius:18px;background:var(--glass);box-shadow:var(--spec),inset 0 0 0 1px var(--line)}
    .lr-body blockquote{position:relative;margin:2.4em -8px;padding:1.6em .8em 1.1em;text-align:center;color:var(--fg);font:italic 500 1.42em/1.38 var(--title);letter-spacing:-.01em;text-wrap:balance;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
    .lr-body blockquote::before{content:'\\201C';position:absolute;left:50%;top:-.62em;translate:-50% 0;padding:0 .2em;font:700 2.6em/1 var(--serif);font-style:normal;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent}
    .lr-body blockquote p{margin:0}
    .lr-body hr{border:0;height:auto;margin:2.6em 0;text-align:center;overflow:visible}
    .lr-body hr::after{content:'\\00B7\\2003\\00B7\\2003\\00B7';font:800 1.4em/1 var(--serif);color:var(--accent)}
    table{border-collapse:collapse;font:15px/1.5 var(--sans)}td,th{padding:8px 12px;border-bottom:1px solid var(--line)}
    mark.lr-hl{color:inherit;background:linear-gradient(180deg,transparent 12%,color-mix(in srgb,var(--accent) 38%,transparent) 12%,color-mix(in srgb,var(--accent3) 34%,transparent) 92%,transparent 92%);background-repeat:no-repeat;border-radius:4px;box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 12%,transparent);cursor:pointer;-webkit-box-decoration-break:clone;box-decoration-break:clone;animation:hl .5s var(--spring) both}
    @keyframes hl{from{background-size:0 100%}to{background-size:100% 100%}}
    .lr-speaking{border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,transparent);box-shadow:0 0 0 10px color-mix(in srgb,var(--accent) 12%,transparent),0 0 34px color-mix(in srgb,var(--accent) 22%,transparent)}

    /* focus: a spotlight on the paragraph you are reading */
    .lr-veil{position:fixed;left:0;right:0;height:30vh;z-index:4;pointer-events:none;opacity:0;transition:opacity .5s}
    .lr-veil.top{top:0;background:linear-gradient(180deg,var(--bg) 10%,transparent)}
    .lr-veil.bot{bottom:0;background:linear-gradient(0deg,var(--bg) 20%,transparent)}
    :root.lr-focus .lr-veil{opacity:.92}
    :root.lr-focus .lr-body > :not(.lr-cur){opacity:.22}
    :root.lr-focus .lr-body > .lr-cur{position:relative}
    :root.lr-focus .lr-body > .lr-cur::after{content:'';position:absolute;left:-26px;top:.3em;bottom:.3em;width:4px;border-radius:4px;background:var(--nova);box-shadow:0 0 16px var(--accent)}

    /* the finish: a dark bookend to the masthead, on its own generative art */
    .lr-end{position:relative;isolation:isolate;overflow:hidden;margin-top:100px;padding:54px 40px 40px;border-radius:38px;text-align:center;font:600 14px var(--sans);color:var(--fg2);background:#07080f}
    .lr-end .lr-gen{z-index:-1}
    .lr-end .shade{position:absolute;inset:0;z-index:-1;background:radial-gradient(70% 60% at 50% 45%,rgba(5,6,12,.62),rgba(5,6,12,.12))}
    .lr-end button[hidden]{display:none}
    .lr-end .tile{width:78px;height:78px;margin:0 auto;border-radius:26px;display:grid;place-items:center;color:#fff;background:linear-gradient(180deg,rgba(255,255,255,.4),transparent 52%),var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 0 0 9px rgba(255,255,255,.07),0 18px 44px color-mix(in srgb,var(--accent) 60%,transparent)}
    .lr-end .tile svg{width:36px;height:36px}
    .lr-end .big{font:700 52px/1 var(--title);letter-spacing:-.04em;margin:24px 0 10px;color:#fff}
    .lr-end .nums{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:30px auto 0;max-width:480px}
    .lr-end .nums div{padding:16px 8px;border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.04));box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 0 0 .5px rgba(255,255,255,.1),0 10px 24px rgba(0,0,0,.25)}
    .lr-end .nums b{display:block;font:800 32px/1 var(--display);letter-spacing:-.04em;color:#fff;font-variant-numeric:tabular-nums}
    .lr-end .nums small{display:block;margin-top:7px;font:800 10px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}
    .lr-end .row{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:28px}
    .lr-end button{all:unset;box-sizing:border-box;height:46px;padding:0 24px;border-radius:999px;font:750 14px var(--sans);cursor:default;background:rgba(255,255,255,.1);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 0 0 .5px rgba(255,255,255,.12);transition:transform .5s var(--jelly)}
    .lr-end button:hover{transform:translateY(-2px)}.lr-end button:active{transform:scale(.95)}
    .lr-end button.pri{color:#0a0b12;background:linear-gradient(180deg,#fff,#e9eaf3);box-shadow:0 0 0 5px rgba(255,255,255,.08),0 10px 26px color-mix(in srgb,var(--accent) 50%,transparent)}

    /* selection bar, resume card, lightbox */
    .lr-glass.lr-sel{position:fixed;z-index:25;display:flex;gap:2px;padding:6px;border-radius:999px;font:700 13px var(--sans);transform-origin:50% 100%;animation:selin .5s var(--jelly) both}
    @keyframes selin{from{opacity:0;transform:translateY(8px) scale(.86)}}
    .lr-sel button{all:unset;display:flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:999px;color:var(--fg);cursor:default;transition:transform .5s var(--jelly)}
    .lr-sel button svg{width:15px;height:15px}
    .lr-sel button:hover{background:color-mix(in srgb,var(--accent) 14%,transparent)}.lr-sel button:active{transform:scale(.94)}
    .lr-sel button.pri{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 12px color-mix(in srgb,var(--accent) 36%,transparent)}
    .lr-sel button:focus-visible,.lr-resume button:focus-visible{outline:none;box-shadow:var(--halo)}
    .lr-glass.lr-resume{position:fixed;left:50%;top:22px;z-index:24;display:flex;align-items:center;gap:16px;padding:12px 12px 12px 14px;border-radius:26px;font:600 13px var(--sans);color:var(--fg);translate:-50% 0;animation:resin .8s .6s var(--jelly) both}
    @keyframes resin{from{opacity:0;transform:translateY(-30px) scale(.9)}}
    .lr-resume .tile{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 8px 20px color-mix(in srgb,var(--accent) 45%,transparent);flex:none}
    .lr-resume .tile svg{width:22px;height:22px}
    .lr-resume b{display:block;font:800 17px/1.15 var(--display);letter-spacing:-.025em}
    .lr-resume small{display:block;font:550 12.5px var(--sans);color:var(--mut);margin-top:3px}
    .lr-resume .m{position:relative;width:100%;height:4px;margin-top:7px;border-radius:4px;background:var(--chip)}
    .lr-resume .m i{position:absolute;left:0;top:0;bottom:0;border-radius:inherit;background:var(--nova);box-shadow:0 0 8px var(--accent)}
    .lr-resume button{all:unset;height:40px;padding:0 18px;border-radius:999px;font:750 13.5px var(--sans);cursor:default;transition:transform .5s var(--jelly)}
    .lr-resume button:active{transform:scale(.95)}
    .lr-resume .go{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 6px 16px color-mix(in srgb,var(--accent) 40%,transparent)}
    .lr-resume .no{color:var(--fg2);background:var(--chip)}
    .lr-resume.gone{display:none}
    .lr-lb{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:5vh 5vw;background:color-mix(in srgb,var(--bg) 72%,transparent);-webkit-backdrop-filter:blur(22px) saturate(1.5);backdrop-filter:blur(22px) saturate(1.5);cursor:zoom-out;animation:lbin .3s ease both}
    .lr-lb img{max-width:100%;max-height:90vh;border-radius:24px;box-shadow:0 40px 100px rgba(0,0,0,.4),0 0 0 1px var(--line);animation:lbpop .7s var(--jelly) both;cursor:zoom-out}
    @keyframes lbin{from{opacity:0}}@keyframes lbpop{from{transform:scale(.82);opacity:0}}
    @media (max-width:760px){.lr{padding:48px 20px 150px}.lr-tools .lr-left{display:none}.lr-byrow .st{display:none}}
    ${STILL ? '*,*::before,*::after{animation:none!important;transition:none!important}html{scroll-behavior:auto}' : ''}`
  document.head.appendChild(style)

  const I = {
    mark: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 3 3.5 3.5-6 6H3.5V9z"/><path d="M2.5 14.5h11"/></svg>',
    copy: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="8.5" height="8.5" rx="2"/><path d="M11 5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5.5A1.5 1.5 0 0 0 4 11h1"/></svg>',
    back: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v7M4.5 7 8 10.5 11.5 7"/><path d="M3 13.5h10"/></svg>',
    say: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6v4h2.5l3.5 3V3L5 6z"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8"/></svg>',
    stop: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="4" width="8" height="8" rx="2"/></svg>',
    toc: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 4h7.5M6 8h7.5M6 12h7.5"/><circle cx="2.8" cy="4" r=".9" fill="currentColor"/><circle cx="2.8" cy="8" r=".9" fill="currentColor"/><circle cx="2.8" cy="12" r=".9" fill="currentColor"/></svg>',
    aa: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 13 5 3.5 8.5 13M2.8 9.8h4.4"/><path d="M10 9.2c.4-.9 1.3-1.4 2.3-1.4 1.4 0 2.2.8 2.2 2.2V13m0-2.2c-.5-.3-1.2-.4-1.9-.4-1.2 0-2.2.5-2.2 1.4 0 .8.7 1.3 1.6 1.3 1.2 0 2.5-.8 2.5-2.3"/></svg>',
    book: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.6C6.6 2.7 4.6 2.4 2 2.6v9.8c2.6-.2 4.6.1 6 1 1.4-.9 3.4-1.2 6-1V2.6c-2.6-.2-4.6.1-6 1zM8 3.6v9.8"/></svg>',
    done: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>',
    down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5"/></svg>',
  }
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n }
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))
  const bar = el('div', 'lr-bar')
  const tools = el('div', 'lr-tools lr-glass')
  tools.setAttribute('role', 'toolbar'); tools.setAttribute('aria-label', 'Reader')
  tools.innerHTML = `<span class="lr-left" aria-live="off"><i><b>0%</b></i><span><b></b><small></small></span></span><span class="well">
    <button class="toc" title="Contents (C)" aria-label="Contents" aria-expanded="false">${I.toc}</button>
    <button class="say" title="Read aloud (S)" aria-label="Read aloud" aria-pressed="false">${I.say}</button>
    <button class="sm" title="Smaller text" aria-label="Smaller text">A-</button><button class="lg" title="Larger text" aria-label="Larger text">A+</button>
    <button class="aa" title="Text and theme" aria-label="Text and theme" aria-expanded="false">${I.aa}</button></span>
    <button class="ex" title="Leave Reader Mode">Exit Reader</button>`

  // the typography sheet: themes as little pages on the left, the type on the right
  const panel = el('div', 'lr-pop lr-panel lr-glass')
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Text and theme')
  const seg = (key, items, cls) => `<div class="lr-seg${cls ? ' ' + cls : ''}" role="group">${items.map(([v, label, art]) => `<button data-${key}="${v}" aria-pressed="false">${art || ''}<span>${label}</span></button>`).join('')}</div>`
  const PV = { light: 'background:#fff;color:#17181f', sepia: 'background:#f1e6d0;color:#3a2d1f', sage: 'background:#e7ede3;color:#1d2a21', dusk: 'background:#221b2a;color:#f1e8ee', dark: 'background:#11141f;color:#ebecf4' }
  const themeBtn = (v, label) => `<button data-theme="${v}" aria-pressed="false"><span class="pv${v === 'auto' ? ' auto' : ''}" style="${PV[v] || ''}"><b></b><i></i><i></i><i></i></span><span>${label}</span></button>`
  panel.innerHTML = `<div class="ph"><span class="tile">${I.aa}</span><span><h4>Make it yours</h4><small>Lumen remembers these for every article</small></span></div><div class="cols"><div>` +
    '<div class="lab">Theme</div><div class="lr-themes" role="group">' + [['auto', 'Auto'], ['light', 'Paper'], ['sepia', 'Sepia'], ['sage', 'Sage'], ['dusk', 'Dusk'], ['dark', 'Night']].map(([v, l]) => themeBtn(v, l)).join('') + '</div>' +
    '<div class="lab">Focus</div><div class="lr-tog"><span>Spotlight<small>Dim all but the paragraph you are reading</small></span><button class="focus" role="switch" aria-checked="false" aria-label="Focus"></button></div>' +
    '<div class="lab">Keys</div><div class="lr-keys"><kbd>-</kbd><span>Smaller</span><kbd>=</kbd><span>Larger</span><kbd>[</kbd><span>Previous</span><kbd>]</kbd><span>Next</span><kbd>C</kbd><span>Contents</span><kbd>S</kbd><span>Read aloud</span><kbd>F</kbd><span>Focus</span><kbd>Esc</kbd><span>Close</span></div>' +
    '</div><div>' +
    '<div class="lab">Typeface</div>' + seg('font', [['serif', 'Serif', '<span class="ag" style="font-family:var(--serif)">Ag</span>'], ['sans', 'Sans', '<span class="ag" style="font-family:var(--sans)">Ag</span>'], ['rounded', 'Rounded', '<span class="ag" style="font-family:var(--display);font-weight:700">Ag</span>']], 'fonts') +
    '<div class="lab">Text size</div><div class="lr-size"><button class="sm2" aria-label="Smaller text">A</button><span class="tr"><i></i></span><span class="val"></span><button class="lg2 big" aria-label="Larger text">A</button></div>' +
    '<div class="lab">Line spacing</div>' + seg('lh', [['compact', 'Tight', '<span class="ln" style="--g:3px"><i></i><i></i><i></i></span>'], ['normal', 'Normal', '<span class="ln" style="--g:5px"><i></i><i></i><i></i></span>'], ['airy', 'Airy', '<span class="ln" style="--g:7px"><i></i><i></i><i></i></span>']]) +
    '<div class="lab">Width</div>' + seg('width', [['narrow', 'Narrow', '<span class="wd" style="width:14px"></span>'], ['medium', 'Medium', '<span class="wd" style="width:20px"></span>'], ['wide', 'Wide', '<span class="wd" style="width:28px"></span>']]) +
    '<div class="lab">Alignment</div>' + seg('align', [['left', 'Left', '<span class="ln" style="--g:4px"><i></i><i style="width:70%"></i><i style="width:85%"></i></span>'], ['justify', 'Justified', '<span class="ln" style="--g:4px"><i></i><i></i><i></i></span>']]) +
    '</div></div>'

  // generative art from the page's colours: deep ink, glowing colour fields, contour lines, orbits, a dot field,
  // star specks and a fine hatch. Drawn once as a static picture; nothing in it moves.
  function genArt(tag) {
    const R = (a, b) => a + rnd() * (b - a), f = n => n.toFixed(1)
    const G = ['var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)', 'var(--g5)']
    let o = `<svg class="lr-gen" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>`
    G.forEach((c, i) => { o += `<radialGradient id="${tag}r${i}"><stop offset="0" style="stop-color:${c};stop-opacity:1"/><stop offset=".45" style="stop-color:${c};stop-opacity:.55"/><stop offset="1" style="stop-color:${c};stop-opacity:0"/></radialGradient>` })
    o += `<linearGradient id="${tag}ln" x2="1" y2="1"><stop offset="0" style="stop-color:var(--g1)"/><stop offset=".5" style="stop-color:var(--g5)"/><stop offset="1" style="stop-color:var(--g2)"/></linearGradient>`
    o += `<pattern id="${tag}dt" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="#fff"/></pattern>`
    o += `<pattern id="${tag}ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0v7" stroke="#fff" stroke-width=".6"/></pattern>`
    o += `<radialGradient id="${tag}mk"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="${tag}m"><rect width="1600" height="900" fill="url(#${tag}mk)"/></mask></defs>`
    o += `<rect width="1600" height="900" style="fill:color-mix(in oklab,var(--g1) 22%,#05060c)"/>`
    // colour fields
    for (let i = 0; i < 8; i++) o += `<circle cx="${f(R(-100, 1700))}" cy="${f(R(-150, 1000))}" r="${f(R(220, 560))}" fill="url(#${tag}r${i % 5})" opacity="${f(R(0.45, 0.95))}" style="mix-blend-mode:screen"/>`
    // the dot field, fading out from its centre
    const dx = R(900, 1400), dy = R(120, 500)
    o += `<g mask="url(#${tag}m)" opacity=".22"><rect x="${f(dx - 420)}" y="${f(dy - 320)}" width="840" height="640" fill="url(#${tag}dt)"/></g>`
    // contour lines
    for (let i = 0; i < 30; i++) {
      const y = R(-60, 960), a = R(40, 200), c = rnd() < 0.18
      o += `<path d="M-60 ${f(y)} C ${f(R(250, 600))} ${f(y - a)}, ${f(R(800, 1100))} ${f(y + a)}, 1660 ${f(y + R(-120, 120))}" fill="none" stroke="${c ? 'url(#' + tag + 'ln)' : '#fff'}" stroke-width="${f(c ? R(1.4, 2.6) : R(0.6, 1.4))}" opacity="${f(c ? R(0.35, 0.7) : R(0.04, 0.14))}"/>`
    }
    // orbits with planets
    const ox = R(1050, 1450), oy = R(160, 600)
    for (let i = 0; i < 5; i++) {
      const r = 90 + i * R(55, 80)
      o += `<circle cx="${f(ox)}" cy="${f(oy)}" r="${f(r)}" fill="none" stroke="${i === 2 ? 'url(#' + tag + 'ln)' : '#fff'}" stroke-width="${i === 2 ? 2.2 : 1}" opacity="${i === 2 ? 0.75 : 0.13}"${i === 3 ? ' stroke-dasharray="2 9"' : ''}/>`
      const t = R(0, Math.PI * 2), pr = R(4, 11)
      o += `<circle cx="${f(ox + Math.cos(t) * r)}" cy="${f(oy + Math.sin(t) * r)}" r="${f(pr * 3.2)}" fill="url(#${tag}r${i % 5})" opacity=".9"/><circle cx="${f(ox + Math.cos(t) * r)}" cy="${f(oy + Math.sin(t) * r)}" r="${f(pr / 2.2)}" fill="#fff" opacity=".95"/>`
    }
    // star specks
    for (let i = 0; i < 70; i++) o += `<circle cx="${f(R(0, 1600))}" cy="${f(R(0, 900))}" r="${f(R(0.5, 1.9))}" fill="#fff" opacity="${f(R(0.15, 0.85))}"/>`
    // a fine hatch for texture
    o += `<rect width="1600" height="900" fill="url(#${tag}ht)" opacity=".05"/></svg>`
    return o
  }

  // the masthead: a dark cover spread
  const root = document.documentElement
  const hero = el('header', 'lr-hero')
  hero.insertAdjacentHTML('afterbegin', genArt('h'))
  const hgrid = el('div', 'lr-hgrid'), htext = el('div', 'lr-htext'), hpic = el('div', 'lr-hpic')
  const kick = el('div', 'lr-kick', `<span class="lr-ic">${I.book}</span><span class="kt"><span class="site"></span><small>Lumen Reader</small></span><span class="rule"></span>`)
  kick.querySelector('.site').textContent = host
  const h = el('h1', 't'); h.textContent = title
  htext.append(kick, h)
  if (lead && lead.length > 30 && !clone.textContent.slice(0, 600).includes(lead.slice(0, 40))) { const l = el('p', 'lr-lead'); l.textContent = lead.slice(0, 300); htext.appendChild(l) }
  const by = byline && byline.length < 80 ? byline : ''
  const row = el('div', 'lr-byrow', `<span class="av"></span><span class="who"><b></b><small></small></span><span class="st"><b>${mins}</b><small>min read</small></span><span class="st"><b>${words.toLocaleString()}</b><small>words</small></span><span class="st sec"><b></b><small>sections</small></span>`)
  row.querySelector('.av').textContent = (by || host || title || 'L')[0].toUpperCase()
  row.querySelector('.who b').textContent = by ? 'By ' + by : host
  row.querySelector('.who small').textContent = by ? host : 'In Lumen Reader'
  row.appendChild(el('button', 'lr-begin', 'Start reading' + I.down)); htext.appendChild(row)
  let coverImg = null
  if (cover) {
    const c = el('div', 'lr-cover'); coverImg = new Image(); coverImg.alt = ''; coverImg.src = cover; c.append(coverImg, el('span', 'cap', 'Lead picture'))
    coverImg.onerror = () => { c.replaceWith(monoCard()) }
    hpic.appendChild(c)
  } else hpic.appendChild(monoCard())
  function monoCard() {
    const m = el('div', 'lr-mono', `<span class="lt"></span><span class="no">Lumen Reader<b></b></span><span class="spec"><span><b>${mins}</b>min</span><span><b>${words.toLocaleString()}</b>words</span><span><b class="ns"></b>parts</span></span>`)
    m.querySelector('.lt').textContent = (title.match(/[\p{L}\p{N}]/u) || ['L'])[0].toUpperCase()
    m.querySelector('.no b').textContent = host.split('.')[0].slice(0, 14)
    return m
  }
  hgrid.append(htext, hpic); hero.appendChild(hgrid)
  clone.classList.add('lr-body')
  // the title is in the masthead now; drop the article's own copy of it
  const dup = clone.querySelector('h1'); if (dup && dup.textContent.trim() === title) dup.remove()
  const wrap = el('div', 'lr')
  const end = el('div', 'lr-end lr-glass', genArt('e') + `<span class="shade"></span><div class="tile">${I.done}</div><div class="big">You reached the end</div><div class="stat">${words.toLocaleString()} words from ${esc(host)}</div>
    <div class="nums"><div><b class="n-min">${mins}</b><small>Minutes</small></div><div><b>${words.toLocaleString()}</b><small>Words</small></div><div><b class="n-hl">0</b><small>Highlights</small></div></div>
    <div class="row"><button class="top">Back to top</button><button class="hls" hidden>Copy highlights</button><button class="pri leave">Exit Reader</button></div>`)
  wrap.append(clone, end)
  const veils = [el('div', 'lr-veil top'), el('div', 'lr-veil bot')]

  // contents: every h2 and h3 of the article, from the dock and, when there is room, as a rail on the left
  const heads = [...clone.querySelectorAll('h2, h3')].filter(x => x.textContent.trim().length > 1).slice(0, 60)
  const hasToc = heads.filter(x => x.tagName === 'H2').length >= 2 || heads.length >= 3
  // minutes per section, for the contents sheet
  const secMins = heads.map((x, i) => { let n = 0; for (let s = x.nextElementSibling; s && s !== heads[i + 1]; s = s.nextElementSibling) n += (s.textContent || '').trim().split(/\s+/).length; return Math.max(1, Math.round(n / WPM)) })
  let tocp = null, rail = null
  const tocLinks = []
  if (hasToc) {
    const list = withMins => { const n = el('nav'); heads.forEach((x, i) => { const a = el('a', x.tagName.toLowerCase()); a.href = '#'; const t = el('span'); t.textContent = x.textContent.trim().slice(0, 90); a.appendChild(t); if (withMins) a.appendChild(el('span', 'mn', secMins[i] + ' min')); a.dataset.i = i; a.onclick = e => { e.preventDefault(); x.scrollIntoView({ behavior: STILL ? 'auto' : 'smooth', block: 'start' }); closePops() }; tocLinks.push(a); n.appendChild(a) }); return n }
    tocp = el('div', 'lr-pop lr-tocp lr-glass', `<div class="ph"><span class="tile">${I.toc}</span><span><h4>Contents</h4><small>${heads.length} sections, ${mins} min in all</small></span></div>`); tocp.setAttribute('role', 'dialog'); tocp.setAttribute('aria-label', 'Contents'); tocp.appendChild(list(true))
    rail = el('aside', 'lr-rail lr-glass', '<div class="rt">Contents</div>'); rail.appendChild(list(false))
  } else tools.querySelector('.toc').remove()
  // the masthead's footer strip: what is in the article, each part a jump
  const h2s = heads.filter(x => x.tagName === 'H2')
  row.querySelector('.st.sec b').textContent = h2s.length; if (!h2s.length) row.querySelector('.st.sec').remove()
  for (const n of hero.querySelectorAll('.lr-mono .ns')) n.textContent = Math.max(1, h2s.length)
  if (h2s.length >= 2) {
    const strip = el('nav', 'lr-strip', '<span class="lab">In this article</span>')
    h2s.slice(0, 6).forEach((x, i) => { const a = el('a'); a.href = '#'; a.style.setProperty('--n', i); const nb = el('b'); nb.textContent = String(i + 1).padStart(2, '0'); const t = el('span'); t.textContent = x.textContent.trim().slice(0, 40); a.append(nb, t); a.onclick = e => { e.preventDefault(); x.scrollIntoView({ behavior: STILL ? 'auto' : 'smooth', block: 'start' }) }; strip.appendChild(a) })
    hgrid.appendChild(strip)
  }
  // the right margin: your reading at a glance, and your latest highlight
  const side = el('aside', 'lr-side lr-glass', `<div class="rt">Your reading</div><div class="big"><b class="sp">0%</b><small>read</small></div><div class="m"><i></i></div>
    <div class="kv"><span>Time left</span><b class="sl">${mins} min</b></div><div class="kv"><span>Now</span><b class="ss">Opening</b></div><div class="kv"><span>Highlights</span><b class="sh">0</b></div><div class="q">Select any words to highlight them.</div>`)
  document.body.append(bar, hero, wrap, ...veils, ...(tocp ? [tocp, rail] : []), side, panel, tools)
  // every control answers a press with one jelly pop
  if (!STILL) document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.lr-tools button, .lr-pop button, .lr-end button, .lr-begin, .lr-strip a, .lr-resume button, .lr-tocp a, .lr-rail a')
    if (!b) return
    b.classList.remove('lr-pop-now'); void b.offsetWidth; b.classList.add('lr-pop-now')
    b.addEventListener('animationend', () => b.classList.remove('lr-pop-now'), { once: true })
  }, true)
  hero.querySelector('.lr-begin').onclick = () => wrap.scrollIntoView({ behavior: STILL ? 'auto' : 'smooth', block: 'start' })

  // the cover's own colour tints the glow around the page (same-origin pictures only; others keep the accent)
  if (coverImg) coverImg.addEventListener('load', () => {
    try { const c = document.createElement('canvas'); c.width = c.height = 6; const x = c.getContext('2d'); x.drawImage(coverImg, 0, 0, 6, 6); const d = x.getImageData(0, 0, 6, 6).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] } const n = d.length / 4, col = `rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`; root.style.setProperty('--amb', col); if (!pageCols.length) for (const n2 of [hero, end]) n2.style.setProperty('--g1', `oklch(from ${col} .62 calc(c * 1.4) h)`) } catch {}
  }, { once: true })

  // choices
  const apply = () => {
    P.size = Math.max(14, Math.min(30, Math.round(+P.size || 20)))
    root.style.setProperty('--size', P.size + 'px')
    root.dataset.lrTheme = P.theme; root.dataset.lrFont = P.font; root.dataset.lrLh = P.lh; root.dataset.lrWidth = P.width; root.dataset.lrAlign = P.align
    root.classList.toggle('lr-focus', !!P.focus); panel.querySelector('.focus').setAttribute('aria-checked', String(!!P.focus))
    panel.querySelectorAll('.lr-seg button, .lr-themes button').forEach(b => { const k = Object.keys(b.dataset)[0]; b.setAttribute('aria-pressed', String(P[k] === b.dataset[k])) })
    panel.querySelector('.val').textContent = P.size + ' px'
    panel.querySelector('.tr i').style.width = ((P.size - 14) / 16 * 100).toFixed(1) + '%'
    fitRail()
  }
  const set = (k, v) => { P[k] = v; apply(); save() }
  const setSize = d => set('size', P.size + d)
  tools.querySelector('.sm').onclick = () => setSize(-1)
  tools.querySelector('.lg').onclick = () => setSize(1)
  panel.querySelector('.sm2').onclick = () => setSize(-1)
  panel.querySelector('.lg2').onclick = () => setSize(1)
  panel.querySelectorAll('.lr-seg button, .lr-themes button').forEach(b => { b.onclick = () => { const k = Object.keys(b.dataset)[0]; set(k, b.dataset[k]) } })
  const leave = () => location.reload()
  tools.querySelector('.ex').onclick = leave
  end.querySelector('.leave').onclick = leave
  panel.querySelector('.focus').onclick = () => { set('focus', !P.focus); tick() }
  end.querySelector('.top').onclick = () => scrollTo({ top: 0, behavior: STILL ? 'auto' : 'smooth' })

  // popovers: one open at a time; Esc or a click outside closes; focus goes in for the keyboard and comes back
  let open = null
  const btnFor = p => p === panel ? tools.querySelector('.aa') : tools.querySelector('.toc')
  function closePops(back) {
    if (!open) return
    const p = open; open = null; p.classList.remove('on'); btnFor(p).setAttribute('aria-expanded', 'false')
    if (back) btnFor(p).focus({ preventScroll: true })
  }
  function toggle(p, kb) {
    if (open === p) { closePops(); return }
    closePops(); open = p; p.classList.add('on'); btnFor(p).setAttribute('aria-expanded', 'true')
    if (p === tocp) { const a = tocLinks.find(x => x.classList.contains('on') && tocp.contains(x)); if (a) a.scrollIntoView({ block: 'nearest' }) }
    // opened from the keyboard: focus goes to the current choice inside
    if (kb) { const f = p.querySelector('[aria-pressed=true], a.on, a, button'); if (f) f.focus({ preventScroll: true }) }
  }
  tools.querySelector('.aa').onclick = e => toggle(panel, e.detail === 0)
  if (tocp) tools.querySelector('.toc').onclick = e => toggle(tocp, e.detail === 0)
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && selBar) { hideSel(); return }
    if (e.key === 'Escape') { if (lb) { e.preventDefault(); closeLb(); return } if (open) { e.preventDefault(); closePops(true); return } }
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
    const a = document.activeElement
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return
    const k = e.key.toLowerCase()
    const act = { '-': () => setSize(-1), '=': () => setSize(1), '+': () => setSize(1), '[': () => jump(-1), ']': () => jump(1), c: () => tocp && toggle(tocp, true), s: () => speak(), f: () => { set('focus', !P.focus); tick() } }[k]
    if (act) { e.preventDefault(); act() }
  }, true)
  // [ and ]: the previous or next section
  function jump(d) {
    if (!heads.length) return
    let cur = -1; heads.forEach((x, i) => { if (x.getBoundingClientRect().top < 150) cur = i })
    const t = d > 0 ? heads[cur + 1] : (cur >= 0 && heads[cur].getBoundingClientRect().top < 60 ? heads[cur - 1] : heads[cur])
    if (t) t.scrollIntoView({ behavior: STILL ? 'auto' : 'smooth', block: 'start' }); else if (d < 0) scrollTo({ top: 0, behavior: STILL ? 'auto' : 'smooth' })
  }
  // read aloud: from the paragraph you are at, one paragraph after another, the one being read lit up
  const sayBtn = tools.querySelector('.say')
  const blocks = () => [...clone.querySelectorAll('p, h2, h3, h4, li, blockquote')].filter(x => x.textContent.trim().length > 1 && !x.closest('blockquote p, li li'))
  let speaking = null
  function stopSpeaking() {
    if (!speaking) return
    speaking.stop = true; try { speechSynthesis.cancel() } catch {}
    if (speaking.el) speaking.el.classList.remove('lr-speaking')
    speaking = null; sayBtn.classList.remove('on'); sayBtn.setAttribute('aria-pressed', 'false'); sayBtn.innerHTML = I.say
  }
  function speak() {
    if (speaking) { stopSpeaking(); return }
    if (!('speechSynthesis' in window)) return
    const list = blocks(); let i = list.findIndex(x => x.getBoundingClientRect().bottom > 110); if (i < 0) i = 0
    const run = { stop: false, el: null }; speaking = run
    sayBtn.classList.add('on'); sayBtn.setAttribute('aria-pressed', 'true'); sayBtn.innerHTML = I.stop
    const lang = document.documentElement.lang || 'en'
    const next = () => {
      if (run.stop) return
      if (run.el) run.el.classList.remove('lr-speaking')
      const x = list[i++]; if (!x) { stopSpeaking(); return }
      run.el = x; x.classList.add('lr-speaking')
      const q = x.getBoundingClientRect(); if (q.top < 80 || q.bottom > innerHeight - 40) x.scrollIntoView({ behavior: STILL ? 'auto' : 'smooth', block: 'center' })
      const u = new SpeechSynthesisUtterance(x.textContent.trim().slice(0, 3000)); u.lang = lang; u.rate = 1.02
      u.onend = next; u.onerror = () => stopSpeaking()
      try { speechSynthesis.speak(u) } catch { stopSpeaking() }
    }
    next()
  }
  sayBtn.onclick = () => speak()
  addEventListener('pagehide', stopSpeaking)
  // select text in the article: a glass bar offers Highlight, Copy and Read aloud. Highlights stay while you read;
  // click one to remove it, and the end card copies them all.
  let selBar = null
  const hideSel = () => { if (selBar) { selBar.remove(); selBar = null } }
  const hlCount = () => clone.querySelectorAll('mark.lr-hl').length
  const syncHl = () => { const b = end.querySelector('.hls'), n = hlCount(); b.hidden = !n; b.textContent = n === 1 ? 'Copy 1 highlight' : `Copy ${n} highlights`; end.querySelector('.n-hl').textContent = n; side.querySelector('.sh').textContent = n; const last = clone.querySelectorAll('mark.lr-hl'); side.querySelector('.q').textContent = n ? '"' + last[last.length - 1].textContent.trim().slice(0, 120) + '"' : 'Select any words to highlight them.'; side.querySelector('.q').classList.toggle('on', !!n) }
  function highlight(range) {
    const top = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer
    const w = document.createTreeWalker(top, NodeFilter.SHOW_TEXT), nodes = []
    for (let n; (n = w.nextNode());) if (range.intersectsNode(n) && n.nodeValue.trim() && !n.parentNode.closest('mark.lr-hl')) nodes.push(n)
    const sc = range.startContainer, so = range.startOffset, ec = range.endContainer, eo = range.endOffset
    for (const t of nodes) {
      const st = t === sc ? so : 0, en = t === ec ? eo : t.length
      if (st >= en) continue
      let x = t; if (st > 0) x = x.splitText(st); if (en - st < x.length) x.splitText(en - st)
      const m = document.createElement('mark'); m.className = 'lr-hl'; x.parentNode.insertBefore(m, x); m.appendChild(x)
    }
    getSelection().removeAllRanges(); syncHl()
  }
  clone.addEventListener('click', e => {
    const m = e.target.closest && e.target.closest('mark.lr-hl'); if (!m || !getSelection().isCollapsed) return
    m.replaceWith(...m.childNodes); clone.normalize(); syncHl()
  })
  end.querySelector('.hls').onclick = () => {
    const txt = [...clone.querySelectorAll('mark.lr-hl')].reduce((a, m) => { const p = m.closest('p, li, blockquote, h2, h3') || m; const last = a[a.length - 1]; if (last && last.p === p) last.t += m.textContent; else a.push({ p, t: m.textContent }); return a }, []).map(x => '"' + x.t.trim() + '"').join('\n\n')
    navigator.clipboard.writeText(`${title}\n${location.href}\n\n${txt}`).then(() => { end.querySelector('.hls').textContent = 'Copied' }, () => {})
  }
  const showSel = () => {
    hideSel()
    const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed) return
    const range = sel.getRangeAt(0); if (!clone.contains(range.commonAncestorContainer)) return
    const text = sel.toString().trim(); if (text.length < 2) return
    const q = range.getBoundingClientRect()
    selBar = el('div', 'lr-sel lr-glass', `<button class="pri hl">${I.mark}Highlight</button><button class="cp">${I.copy}Copy</button><button class="sp">${I.say}Read</button>`)
    selBar.setAttribute('role', 'toolbar'); selBar.setAttribute('aria-label', 'Selection')
    document.body.appendChild(selBar)
    const bw = selBar.offsetWidth, bh = selBar.offsetHeight
    selBar.style.left = Math.round(Math.max(10, Math.min(innerWidth - bw - 10, q.left + q.width / 2 - bw / 2))) + 'px'
    selBar.style.top = Math.round(q.top - bh - 12 > 60 ? q.top - bh - 12 : q.bottom + 12) + 'px'
    selBar.querySelector('.hl').onmousedown = e => { e.preventDefault(); highlight(range); hideSel() }
    selBar.querySelector('.cp').onmousedown = e => { e.preventDefault(); navigator.clipboard.writeText(text).catch(() => {}); hideSel() }
    selBar.querySelector('.sp').onmousedown = e => { e.preventDefault(); try { stopSpeaking(); speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.slice(0, 3000)); u.lang = document.documentElement.lang || 'en'; speechSynthesis.speak(u) } catch {} hideSel() }
  }
  document.addEventListener('mouseup', e => { if (selBar && selBar.contains(e.target)) return; setTimeout(showSel, 0) })
  document.addEventListener('keyup', e => { if (e.shiftKey && /^Arrow/.test(e.key)) showSel() })
  addEventListener('scroll', hideSel, { passive: true })
  document.addEventListener('mousedown', e => { if (selBar && !selBar.contains(e.target)) hideSel() })

  // pick up where you left off: Lumen remembers how far you got in each article (in Lumen, not in the page)
  const savedPos = +'__LUMEN_READER_POS__' || 0
  let posT = 0
  const savePos = () => { try { const m = root.scrollHeight - innerHeight; if (m > 0 && typeof globalThis.__lumenReaderPos === 'function') globalThis.__lumenReaderPos(Math.round(scrollY / m * 1000) / 1000) } catch {} }
  addEventListener('scroll', () => { if (!posT) posT = setTimeout(() => { posT = 0; savePos() }, 1500) }, { passive: true })
  addEventListener('pagehide', savePos)
  if (savedPos > 0.04 && savedPos < 0.97) {
    const left = Math.max(1, Math.ceil(words * (1 - savedPos) / WPM))
    const card = el('div', 'lr-resume lr-glass', `<span class="tile">${I.back}</span><span><b>Pick up where you left off</b><small>${Math.round(savedPos * 100)}% read, about ${left} min left</small><span class="m"><i style="width:${Math.round(savedPos * 100)}%"></i></span></span><button class="go">Continue</button><button class="no">Start over</button>`)
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Continue reading')
    document.body.appendChild(card)
    const gone = () => { card.classList.add('gone'); setTimeout(() => card.remove(), 50) }
    card.querySelector('.go').onclick = () => { gone(); scrollTo({ top: savedPos * (root.scrollHeight - innerHeight), behavior: STILL ? 'auto' : 'smooth' }) }
    card.querySelector('.no').onclick = gone
    setTimeout(() => { if (card.isConnected && scrollY < 40) gone() }, 12000)
    addEventListener('scroll', function f() { if (scrollY > 200) { gone(); removeEventListener('scroll', f) } }, { passive: true })
  }

  // pictures open big on a glass backdrop
  let lb = null
  function closeLb() { if (lb) { lb.remove(); lb = null } }
  clone.addEventListener('click', e => {
    const im = e.target.closest && e.target.closest('img'); if (!im || e.target.closest('a')) return
    e.preventDefault(); closeLb()
    lb = el('div', 'lr-lb'); const big = new Image(); big.src = im.currentSrc || im.src; big.alt = im.alt || ''; lb.appendChild(big)
    lb.onclick = closeLb; document.body.appendChild(lb)
  })
  addEventListener('mousedown', e => { if (open && !open.contains(e.target) && !tools.contains(e.target)) closePops() }, true)

  // the rail only shows when it fits beside the column
  function fitRail() {
    const w = { narrow: 600, medium: 700, wide: 860 }[P.width] || 700
    const room = (innerWidth - w) / 2 - 48   // left of the column, less the room wide pictures break out into
    const fits = room >= 196 + 28
    root.classList.toggle('lr-has-rail', fits)
    const x = Math.round(Math.max(16, (room - 196) / 2)) + 'px'
    if (fits && rail) rail.style.left = x
    if (fits) side.style.right = x
  }
  addEventListener('resize', fitRail)

  // progress, the time left and the current section: worked out only while scrolling
  const leftB = tools.querySelector('.lr-left > span b'), leftS = tools.querySelector('.lr-left > span small'), ring = tools.querySelector('.lr-left i'), pct = ring.querySelector('b')
  let queued = false, endStat = false
  const started = Date.now()
  const tick = () => {
    queued = false
    const m = root.scrollHeight - innerHeight, p = m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 1
    bar.style.transform = `scaleX(${p})`
    ring.style.setProperty('--p', p.toFixed(3))
    const left = Math.ceil(words * (1 - p) / WPM)
    const [lb, ls] = p >= 0.995 ? ['Done', 'finished'] : p < 0.01 ? [`${mins} min`, 'read'] : left <= 1 ? ['< 1 min', 'left'] : [`${left} min`, 'left']
    leftB.textContent = lb; leftS.textContent = ls; pct.textContent = Math.round(p * 100) + '%'
    if (P.focus) {
      const line = innerHeight * 0.42; let best = null
      for (const x of clone.children) { const q = x.getBoundingClientRect(); if (q.top <= line) best = x; else break }
      for (const x of clone.querySelectorAll(':scope > .lr-cur')) if (x !== best) x.classList.remove('lr-cur')
      if (best) best.classList.add('lr-cur')
    }
    side.querySelector('.sp').textContent = Math.round(p * 100) + '%'
    side.querySelector('.m i').style.transform = `scaleX(${p.toFixed(3)})`
    side.querySelector('.sl').textContent = p >= 0.995 ? 'Done' : left <= 1 ? '< 1 min' : left + ' min'
    if (p >= 0.995 && !endStat) { endStat = true; const took = Math.max(1, Math.round((Date.now() - started) / 60000)); end.querySelector('.stat').textContent = `${words.toLocaleString()} words from ${host}, read in ${took} min`; end.querySelector('.n-min').textContent = took }
    root.classList.toggle('lr-past', wrap.getBoundingClientRect().top < innerHeight * 0.5)
    if (tocLinks.length) {
      let cur = -1
      heads.forEach((x, i) => { if (x.getBoundingClientRect().top < 140) cur = i })
      tocLinks.forEach(a => { const i = +a.dataset.i; a.classList.toggle('on', i === cur); a.classList.toggle('done', i < cur) })
      side.querySelector('.ss').textContent = cur >= 0 ? heads[cur].textContent.trim().slice(0, 28) : 'Opening'
      if (rail) rail.querySelector('nav').style.setProperty('--rp', heads.length > 1 ? (Math.max(0, cur) / (heads.length - 1)).toFixed(3) : '0')
    }
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick) } }, { passive: true })


  // the specular glint follows the pointer over the glass
  if (!STILL) for (const n of [tools, panel, tocp, rail].filter(Boolean)) n.addEventListener('pointermove', e => { const q = n.getBoundingClientRect(); n.style.setProperty('--gx', Math.round(e.clientX - q.left) + 'px'); n.style.setProperty('--gy', Math.round(e.clientY - q.top) + 'px') })

  apply()
  window.scrollTo(0, 0)
  tick()
})()
