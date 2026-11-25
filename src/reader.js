// Lumen Reader (4.1): the article alone, set like a premium reading app. A cinematic masthead (the lead picture
// full-bleed with a glass title plate floating over it), six themes (Auto, Paper, Sepia, Sage, Dusk, Night), serif,
// sans or rounded type, text size, line spacing and column width, a contents rail that fills as you read, a Spotlight
// focus mode, and a glass dock at the bottom with the time left, A-, A+ and Exit. Runs in the tab's preload world (main.js readerMode), so it can remember the reader's choices
// without the page seeing them. Nothing moves at idle: entrances play once, the progress bar and the time left only
// change while you scroll, and Motion Off or reduced motion makes everything still.
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

    /* reading progress: a glowing line across the very top */
    .lr-bar{position:fixed;left:0;top:0;height:4px;width:100%;transform-origin:0 50%;transform:scaleX(0);background:var(--nova);box-shadow:0 0 18px var(--accent),0 0 4px var(--accent);z-index:20;border-radius:0 4px 4px 0}

    /* the dock: one glass capsule floating at the bottom, like a reading app */
    .lr-tools{position:fixed;left:50%;bottom:22px;translate:-50% 0;z-index:12;display:flex;align-items:center;gap:4px;padding:7px;border-radius:999px;font:650 13px var(--sans);animation:dock .8s .35s var(--jelly) both}
    @keyframes dock{from{opacity:0;transform:translateY(40px) scale(.86)}}
    .lr-tools button{all:unset;box-sizing:border-box;position:relative;min-width:42px;height:42px;padding:0 12px;border-radius:999px;display:grid;place-items:center;color:var(--fg2);cursor:default;font:750 14px var(--sans);transition:transform .5s var(--jelly)}
    .lr-tools button svg{width:19px;height:19px}
    .lr-tools button:hover{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--fg);transform:translateY(-2px)}
    .lr-tools button:active{transform:scale(.94)}
    .lr-tools button[aria-expanded=true]{color:#fff;background:var(--nova);box-shadow:var(--halo)}
    .lr-tools button:focus-visible,.lr-pop button:focus-visible,.lr-pop a:focus-visible,.lr-rail a:focus-visible,.lr-end button:focus-visible,.lr-begin:focus-visible{outline:none;box-shadow:var(--halo)}
    .lr-tools .sep{width:1px;height:24px;margin:0 4px;background:var(--line)}
    .lr-tools .ex{color:#fff;padding:0 20px;white-space:nowrap;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 6px 18px color-mix(in srgb,var(--accent) 42%,transparent)}
    .lr-tools .ex:hover{color:#fff;background:var(--nova);filter:brightness(1.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),var(--halo)}
    .lr-tools .say.on{color:#fff;background:var(--nova);box-shadow:var(--halo)}
    .lr-left{display:flex;align-items:center;gap:10px;height:42px;padding:0 14px 0 8px;border-radius:999px;color:var(--fg);font:750 13.5px var(--sans);white-space:nowrap;font-variant-numeric:tabular-nums}
    .lr-left i{position:relative;width:28px;height:28px;border-radius:50%;background:conic-gradient(var(--accent),var(--accent3) calc(var(--p,0) * 1turn),var(--chip) 0);flex:none;box-shadow:0 0 14px color-mix(in srgb,var(--accent) 35%,transparent)}
    .lr-left i::after{content:'';position:absolute;inset:4px;border-radius:50%;background:var(--paper)}

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

    /* the masthead: the lead picture full-bleed, and a glass title plate that floats over its lower edge */
    .lr-hero{position:relative;isolation:isolate;display:flow-root;padding:0 16px;margin-bottom:8px}
    .lr-cover{position:absolute;left:0;right:0;top:0;height:var(--ch);overflow:hidden;z-index:-1}
    .lr-cover img{width:100%;height:100%;object-fit:cover;display:block;animation:kb 2.4s cubic-bezier(.2,.7,.2,1) both}
    @keyframes kb{from{transform:scale(1.12);opacity:0}}
    .lr-cover::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(var(--scrim),0) 30%,rgba(var(--scrim),.55) 70%,rgb(var(--scrim)) 100%)}
    .lr-aura{position:absolute;left:0;right:0;top:0;height:var(--ch);z-index:-2;overflow:hidden;pointer-events:none}
    .lr-aura span{position:absolute;border-radius:50%}
    .lr-aura .a1{width:56vw;height:46vh;left:-10vw;top:-16vh;background:radial-gradient(closest-side,color-mix(in srgb,var(--amb) 55%,transparent),transparent)}
    .lr-aura .a2{width:46vw;height:40vh;right:-8vw;top:4vh;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent3) 42%,transparent),transparent)}
    .lr-aura .a3{width:40vw;height:30vh;left:30vw;top:24vh;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent2) 34%,transparent),transparent)}
    .lr-ghost{position:absolute;right:max(16px,calc(50% - 640px));top:26px;width:min(34vw,360px);height:min(34vw,360px);color:var(--accent);opacity:.1;z-index:-1;pointer-events:none}
    html.lr-cov .lr-ghost{display:none}
    .lr-plate{position:relative;isolation:isolate;overflow:hidden;box-sizing:border-box;max-width:calc(var(--w) + 200px);margin:0 auto;margin-top:calc(var(--ch) - 170px);padding:46px 60px 42px;border-radius:36px;animation:plate 1s .15s var(--jelly) both}
    html:not(.lr-cov) .lr-plate{margin-top:120px}
    @keyframes plate{from{opacity:0;transform:translateY(60px) scale(.94)}}
    .lr-plate::after{content:'';position:absolute;inset:-10% auto -10% 0;width:40%;z-index:-1;pointer-events:none;background:linear-gradient(105deg,transparent,rgba(255,255,255,.45),transparent);transform:translateX(-120%) skewX(-12deg);animation:sweep 1.4s .7s cubic-bezier(.3,.6,.3,1) both}
    @keyframes sweep{to{transform:translateX(360%) skewX(-12deg)}}
    .lr-orb{position:absolute;z-index:-2;border-radius:50%;pointer-events:none}
    .lr-orb.o1{width:300px;height:240px;left:-100px;top:-140px;background:radial-gradient(closest-side,color-mix(in srgb,var(--amb) 50%,transparent),transparent)}
    .lr-orb.o2{width:280px;height:220px;right:-110px;bottom:-130px;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent3) 40%,transparent),transparent)}
    .lr-kick{display:flex;align-items:center;gap:16px;margin-bottom:26px}
    .lr-ic{position:relative;width:64px;height:64px;flex:none;display:grid;place-items:center;border-radius:21px;color:#fff;
      background:linear-gradient(180deg,rgba(255,255,255,.36),transparent 52%),linear-gradient(145deg,color-mix(in srgb,var(--accent) 70%,white),var(--accent) 50%,var(--accent3));
      box-shadow:0 16px 36px color-mix(in srgb,var(--accent) 50%,transparent),0 0 0 8px color-mix(in srgb,var(--accent) 14%,transparent),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -3px 8px rgba(0,0,0,.16);animation:icin 1s .35s var(--jelly) both}
    .lr-ic::after{content:'';position:absolute;inset:-16px;border-radius:31px;border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);pointer-events:none;animation:ring 1.2s .5s ease both}
    .lr-ic svg{width:30px;height:30px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
    @keyframes icin{from{opacity:0;transform:scale(.5) rotate(-14deg)}}@keyframes ring{from{opacity:0;transform:scale(.7)}}
    .lr-kick .kt{display:flex;flex-direction:column;gap:5px;margin-left:8px}
    .lr-kick .site{font:800 13px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
    .lr-kick .kt small{font:650 12px/1 var(--sans);color:var(--mut)}
    .lr-kick .rule{flex:1;height:1px;background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 50%,transparent),transparent)}
    .lr-art{position:absolute;z-index:-1;right:-70px;top:-60px;width:380px;height:380px;color:var(--accent);opacity:.13;transform:rotate(-12deg);pointer-events:none;animation:artin 1.6s .3s var(--spring) both}
    .lr-art svg{width:100%;height:100%}
    @keyframes artin{from{opacity:0;transform:rotate(-30deg) scale(.7) translateY(30px)}}
    .lr-pool{position:absolute;z-index:-1;left:20%;top:-120px;width:60%;height:220px;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,rgba(255,255,255,calc(var(--glint) * 1.1)),transparent)}
    .lr-plate{box-shadow:var(--spec),inset 0 0 0 1px color-mix(in srgb,var(--accent) 22%,transparent),inset 0 -24px 44px -26px color-mix(in srgb,var(--accent3) 70%,transparent),inset 0 24px 50px -34px color-mix(in srgb,var(--accent) 55%,transparent),0 30px 80px color-mix(in srgb,var(--amb) 30%,transparent),var(--shadow);
      background:radial-gradient(240px circle at var(--gx,20%) var(--gy,-30%),rgb(255 255 255/var(--glint)),transparent 70%),radial-gradient(120% 150% at 0% 0%,color-mix(in srgb,var(--accent) 26%,transparent),transparent 55%),radial-gradient(90% 140% at 100% 100%,color-mix(in srgb,var(--accent3) 22%,transparent),transparent 60%),var(--glass)}
    .lr-plate.lr-glass::before{background:linear-gradient(120deg,color-mix(in srgb,#fff 75%,var(--accent)),color-mix(in srgb,var(--accent) 70%,transparent) 20%,transparent 45%,transparent 65%,color-mix(in srgb,var(--accent3) 65%,transparent) 90%)}
    h1.t{margin:0;font:700 clamp(40px,5.8vw,74px)/1.02 var(--title);letter-spacing:-.035em;background:linear-gradient(120deg,var(--fg) 35%,color-mix(in srgb,var(--accent) 80%,var(--fg)) 80%,var(--accent3));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:6px;text-wrap:balance}
    :root[data-lr-font=sans] h1.t,:root[data-lr-font=rounded] h1.t{font-weight:800;letter-spacing:-.045em}
    .lr-lead{margin:18px 0 0;font:italic 400 clamp(18px,1.7vw,22px)/1.5 var(--serif);color:var(--fg2);text-wrap:pretty}
    .lr-byrow{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-top:28px;padding-top:22px;border-top:1px solid var(--line);font:650 13px var(--sans);color:var(--fg2)}
    .lr-byrow .av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 16px var(--display);background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 6px 16px color-mix(in srgb,var(--accent) 40%,transparent)}
    .lr-byrow .who b{display:block;font:750 14.5px var(--sans);color:var(--fg)}
    .lr-byrow .who small{display:block;font:600 12px var(--sans);color:var(--mut);margin-top:1px}
    .lr-byrow .st{display:flex;flex-direction:column;padding:0 14px;border-left:1px solid var(--line)}
    .lr-byrow .st b{font:800 20px/1.05 var(--display);letter-spacing:-.03em;color:var(--fg);font-variant-numeric:tabular-nums}
    .lr-byrow .st small{font:700 10px/1.4 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
    .lr-begin{all:unset;margin-left:auto;display:flex;align-items:center;gap:8px;height:42px;padding:0 20px;border-radius:999px;color:#fff;font:750 14px var(--sans);background:var(--nova);cursor:default;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 8px 22px color-mix(in srgb,var(--accent) 42%,transparent);transition:transform .5s var(--jelly)}
    .lr-begin:hover{transform:translateY(-2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),var(--halo)}.lr-begin:active{transform:scale(.95)}
    .lr-begin svg{width:15px;height:15px}

    /* the article */
    .lr{max-width:var(--w);margin:0 auto;padding:64px 32px 170px;font:var(--size)/var(--lh) var(--body);font-kerning:normal;font-variant-ligatures:common-ligatures;font-variant-numeric:oldstyle-nums proportional-nums}
    .lr-body{animation:rise .9s .3s var(--spring) both;text-wrap:pretty;hyphens:auto;counter-reset:sec}
    @keyframes rise{from{opacity:0;transform:translateY(24px)}}
    .lr-body > *{transition:opacity .45s}
    .lr-body p{margin:0 0 1.15em}
    .lr-body > p:first-of-type{font-size:1.16em;line-height:1.62;color:var(--fg)}
    .lr-body > p:first-of-type::first-letter{float:left;font:700 4.6em/.8 var(--title);margin:.07em .09em 0 -.02em;padding-right:.02em;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 6px 14px color-mix(in srgb,var(--accent) 30%,transparent))}
    .lr-body h2,.lr-body h3,.lr-body h4{font-family:var(--display);font-weight:800;letter-spacing:-.035em;line-height:1.12;color:var(--fg);text-wrap:balance}
    .lr-body h2{position:relative;font-size:1.8em;margin:2.4em 0 .7em;padding-top:1.1em;background:linear-gradient(90deg,var(--accent),var(--accent3) 64px,var(--line) 64px) top left/100% 2px no-repeat}
    .lr-body h2::before{counter-increment:sec;content:counter(sec,decimal-leading-zero);display:block;margin-bottom:.35em;font:800 .5em/1 var(--display);letter-spacing:.14em;color:var(--accent)}
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

    /* the finish */
    .lr-end{position:relative;isolation:isolate;overflow:hidden;margin-top:90px;padding:44px 36px 36px;border-radius:34px;text-align:center;font:600 14px var(--sans);color:var(--fg2)}
    .lr-end .orb{position:absolute;z-index:-1;border-radius:50%;pointer-events:none;width:400px;height:280px;left:50%;top:-160px;translate:-50% 0;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 48%,transparent),transparent)}
    .lr-end .tile{width:72px;height:72px;margin:0 auto;border-radius:24px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 0 0 8px color-mix(in srgb,var(--accent) 14%,transparent),0 16px 40px color-mix(in srgb,var(--accent) 50%,transparent)}
    .lr-end .tile svg{width:34px;height:34px}
    .lr-end .big{font:800 44px/1 var(--display);letter-spacing:-.045em;margin:20px 0 8px;background:linear-gradient(120deg,var(--fg) 30%,color-mix(in srgb,var(--accent) 80%,var(--fg)) 75%,var(--accent3));-webkit-background-clip:text;background-clip:text;color:transparent}
    .lr-end .nums{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:24px auto 0;max-width:460px}
    .lr-end .nums div{padding:14px 8px;border-radius:20px;background:var(--chip);box-shadow:inset 0 0 0 1px var(--line)}
    .lr-end .nums b{display:block;font:800 28px/1 var(--display);letter-spacing:-.04em;color:var(--fg);font-variant-numeric:tabular-nums}
    .lr-end .nums small{display:block;margin-top:6px;font:700 10.5px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
    .lr-end .row{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:24px}
    .lr-end button{all:unset;box-sizing:border-box;height:44px;padding:0 22px;border-radius:999px;font:750 14px var(--sans);cursor:default;background:var(--chip);color:var(--fg);box-shadow:inset 0 0 0 1px var(--line);transition:transform .5s var(--jelly)}
    .lr-end button:hover{transform:translateY(-2px)}.lr-end button:active{transform:scale(.95)}
    .lr-end button.pri{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 8px 22px color-mix(in srgb,var(--accent) 42%,transparent)}

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
    @media (max-width:760px){.lr{padding:48px 20px 150px}.lr-plate{padding:30px 26px 28px;border-radius:28px}.lr-tools .lr-left{display:none}.lr-byrow .st{display:none}}
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
  tools.innerHTML = `<span class="lr-left" aria-live="off"><i></i><span></span></span><span class="sep"></span>
    <button class="toc" title="Contents (C)" aria-label="Contents" aria-expanded="false">${I.toc}</button>
    <button class="say" title="Read aloud (S)" aria-label="Read aloud" aria-pressed="false">${I.say}</button>
    <button class="sm" title="Smaller text" aria-label="Smaller text">A-</button><button class="lg" title="Larger text" aria-label="Larger text">A+</button>
    <button class="aa" title="Text and theme" aria-label="Text and theme" aria-expanded="false">${I.aa}</button><span class="sep"></span>
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

  // the masthead
  const root = document.documentElement
  const hero = el('header', 'lr-hero')
  hero.append(el('div', 'lr-aura', '<span class="a1"></span><span class="a2"></span><span class="a3"></span>'), el('span', 'lr-ghost', I.book.replace('stroke-width="1.6"', 'stroke-width=".5"')))
  let coverImg = null
  if (cover) { const c = el('div', 'lr-cover'); coverImg = new Image(); coverImg.alt = ''; coverImg.src = cover; coverImg.onerror = () => { c.remove(); root.classList.remove('lr-cov') }; c.appendChild(coverImg); hero.appendChild(c); root.classList.add('lr-cov') }
  const plate = el('div', 'lr-plate lr-glass')
  plate.append(el('span', 'lr-orb o1'), el('span', 'lr-orb o2'))
  // the Settings hero DNA: a glossy glowing tile with halo rings, and a giant faded glyph bleeding off the edge
  plate.append(el('span', 'lr-art', I.book.replace('stroke-width="1.6"', 'stroke-width=".55"')), el('span', 'lr-pool'))
  const kick = el('div', 'lr-kick', `<span class="lr-ic">${I.book}</span><span class="kt"><span class="site"></span><small>Lumen Reader</small></span><span class="rule"></span>`)
  kick.querySelector('.site').textContent = host
  const h = el('h1', 't'); h.textContent = title
  plate.append(kick, h)
  if (lead && lead.length > 30 && !clone.textContent.slice(0, 600).includes(lead.slice(0, 40))) { const l = el('p', 'lr-lead'); l.textContent = lead.slice(0, 300); plate.appendChild(l) }
  const by = byline && byline.length < 80 ? byline : ''
  const row = el('div', 'lr-byrow', `<span class="av"></span><span class="who"><b></b><small></small></span><span class="st"><b>${mins}</b><small>min read</small></span><span class="st"><b>${words.toLocaleString()}</b><small>words</small></span><button class="lr-begin">Start reading${I.down}</button>`)
  row.querySelector('.av').textContent = (by || host)[0].toUpperCase()
  row.querySelector('.who b').textContent = by ? 'By ' + by : host
  row.querySelector('.who small').textContent = by ? host : 'In Lumen Reader'
  plate.appendChild(row)
  hero.appendChild(plate)
  clone.classList.add('lr-body')
  // the title is in the masthead now; drop the article's own copy of it
  const dup = clone.querySelector('h1'); if (dup && dup.textContent.trim() === title) dup.remove()
  const wrap = el('div', 'lr')
  const end = el('div', 'lr-end lr-glass', `<span class="orb"></span><div class="tile">${I.done}</div><div class="big">You reached the end</div><div class="stat">${words.toLocaleString()} words from ${esc(host)}</div>
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
  document.body.append(bar, hero, wrap, ...veils, ...(tocp ? [tocp, rail] : []), panel, tools)
  hero.querySelector('.lr-begin').onclick = () => wrap.scrollIntoView({ behavior: STILL ? 'auto' : 'smooth', block: 'start' })

  // the cover's own colour tints the glow around the page (same-origin pictures only; others keep the accent)
  if (coverImg) coverImg.addEventListener('load', () => {
    try { const c = document.createElement('canvas'); c.width = c.height = 6; const x = c.getContext('2d'); x.drawImage(coverImg, 0, 0, 6, 6); const d = x.getImageData(0, 0, 6, 6).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] } const n = d.length / 4; root.style.setProperty('--amb', `rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`) } catch {}
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
  const syncHl = () => { const b = end.querySelector('.hls'), n = hlCount(); b.hidden = !n; b.textContent = n === 1 ? 'Copy 1 highlight' : `Copy ${n} highlights`; end.querySelector('.n-hl').textContent = n }
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
    if (!rail) return
    const w = { narrow: 600, medium: 700, wide: 860 }[P.width] || 700
    const room = (innerWidth - w) / 2 - 48   // left of the column, less the room wide pictures break out into
    const fits = room >= 196 + 28
    root.classList.toggle('lr-has-rail', fits)
    if (fits) rail.style.left = Math.round(Math.max(16, (room - 196) / 2)) + 'px'
  }
  addEventListener('resize', fitRail)

  // progress, the time left and the current section: worked out only while scrolling
  const leftEl = tools.querySelector('.lr-left span'), ring = tools.querySelector('.lr-left i')
  let queued = false, endStat = false
  const started = Date.now()
  const tick = () => {
    queued = false
    const m = root.scrollHeight - innerHeight, p = m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 1
    bar.style.transform = `scaleX(${p})`
    ring.style.setProperty('--p', p.toFixed(3))
    const left = Math.ceil(words * (1 - p) / WPM)
    leftEl.textContent = p >= 0.995 ? 'Finished' : p < 0.01 ? `${mins} min read` : left <= 1 ? 'Under a minute left' : `${left} min left`
    if (P.focus) {
      const line = innerHeight * 0.42; let best = null
      for (const x of clone.children) { const q = x.getBoundingClientRect(); if (q.top <= line) best = x; else break }
      for (const x of clone.querySelectorAll(':scope > .lr-cur')) if (x !== best) x.classList.remove('lr-cur')
      if (best) best.classList.add('lr-cur')
    }
    if (p >= 0.995 && !endStat) { endStat = true; const took = Math.max(1, Math.round((Date.now() - started) / 60000)); end.querySelector('.stat').textContent = `${words.toLocaleString()} words from ${host}, read in ${took} min`; end.querySelector('.n-min').textContent = took }
    root.classList.toggle('lr-past', wrap.getBoundingClientRect().top < innerHeight * 0.5)
    if (tocLinks.length) {
      let cur = -1
      heads.forEach((x, i) => { if (x.getBoundingClientRect().top < 140) cur = i })
      tocLinks.forEach(a => { const i = +a.dataset.i; a.classList.toggle('on', i === cur); a.classList.toggle('done', i < cur) })
      if (rail) rail.querySelector('nav').style.setProperty('--rp', heads.length > 1 ? (Math.max(0, cur) / (heads.length - 1)).toFixed(3) : '0')
    }
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick) } }, { passive: true })


  // the specular glint follows the pointer over the glass
  if (!STILL) for (const n of [tools, panel, tocp, rail, end, plate].filter(Boolean)) n.addEventListener('pointermove', e => { const q = n.getBoundingClientRect(); n.style.setProperty('--gx', Math.round(e.clientX - q.left) + 'px'); n.style.setProperty('--gy', Math.round(e.clientY - q.top) + 'px') })

  apply()
  window.scrollTo(0, 0)
  tick()
})()
