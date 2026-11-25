// Lumen Reader (4.0): the article alone, set like a premium reading app. Themes (Auto, Light, Sepia, Dark), serif or
// sans, text size, line spacing and column width, a table of contents for long articles, the time left, and the
// A-, A+ and Exit bar. Runs in the tab's preload world (main.js readerMode), so it can remember the reader's choices
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
  const LIGHT = `--bg:#f7f7fb;--paper:#ffffff;--fg:#17181f;--fg2:#4f5260;--mut:#8b8d98;--line:rgba(20,24,48,.1);--chip:rgba(20,24,48,.055);
      --glass:linear-gradient(180deg,rgba(255,255,255,.86),rgba(250,250,255,.74));--spec:inset 0 1px 0 rgba(255,255,255,.95);--glint:.5;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 80%,transparent),rgba(255,255,255,.95) 30%,rgba(255,255,255,.2) 62%,color-mix(in srgb,var(--accent3) 75%,transparent));
      --shadow:0 1px 2px rgba(14,18,40,.06),0 12px 30px rgba(14,18,40,.08),0 26px 60px color-mix(in srgb,var(--accent) 18%,rgba(14,18,40,.1));--neb:16%;color-scheme:light`
  const DARK = `--bg:#0b0d16;--paper:#11141f;--fg:#e8e9f2;--fg2:#b0b3c2;--mut:#7f8291;--line:rgba(255,255,255,.1);--chip:rgba(255,255,255,.07);
      --glass:linear-gradient(180deg,color-mix(in srgb,var(--accent) 9%,rgba(32,36,54,.86)),color-mix(in srgb,var(--accent) 5%,rgba(17,20,32,.8)));--spec:inset 0 1px 0 rgba(255,255,255,.16);--glint:.14;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 95%,transparent),rgba(255,255,255,.3) 30%,rgba(255,255,255,.05) 62%,color-mix(in srgb,var(--accent3) 90%,transparent));
      --shadow:0 1px 2px rgba(0,0,0,.5),0 12px 30px rgba(0,0,0,.35),0 26px 60px color-mix(in srgb,var(--accent) 22%,rgba(0,0,0,.45));--neb:20%;color-scheme:dark`
  const SEPIA = `--bg:#f3e9d6;--paper:#f8f0e0;--fg:#3b2f22;--fg2:#5f4f3d;--mut:#937f66;--line:rgba(91,66,34,.16);--chip:rgba(91,66,34,.08);
      --glass:linear-gradient(180deg,rgba(255,250,240,.84),rgba(246,236,216,.74));--spec:inset 0 1px 0 rgba(255,253,245,.95);--glint:.45;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 60%,#b98a4e),rgba(255,250,240,.95) 30%,rgba(255,250,240,.2) 62%,color-mix(in srgb,var(--accent3) 55%,#b98a4e));
      --shadow:0 1px 2px rgba(70,45,10,.08),0 12px 30px rgba(70,45,10,.1),0 26px 60px color-mix(in srgb,#b98a4e 22%,rgba(70,45,10,.1));--neb:9%;color-scheme:light`
  style.textContent = `
    :root{--accent:${ACC};--accent2:oklch(from var(--accent) calc(l - .02) c calc(h + 40));--accent3:oklch(from var(--accent) calc(l + .04) c calc(h + 95));
      --nova:linear-gradient(135deg,var(--accent),var(--accent2) 55%,var(--accent3));--spring:${SPRING};--jelly:${JELLY};
      --halo:0 0 0 4px color-mix(in srgb,var(--accent) 18%,transparent),0 0 24px color-mix(in srgb,var(--accent) 32%,transparent);
      --size:20px;--lh:1.75;--w:700px;--sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;
      --serif:"Iowan Old Style","Charter","Source Serif Pro","Source Serif 4",Georgia,serif;--body:var(--serif);
      --display:ui-rounded,"SF Pro Rounded","Segoe UI Variable Display","Nunito",system-ui,sans-serif;${LIGHT}}
    :root[data-lr-theme=dark]{${DARK}}
    :root[data-lr-theme=sepia]{${SEPIA}}
    @media (prefers-color-scheme:dark){:root[data-lr-theme=auto]{${DARK}}}
    :root[data-lr-font=sans]{--body:var(--sans)}:root[data-lr-font=rounded]{--body:var(--display)}
    :root[data-lr-align=justify] .lr-body p{text-align:justify}
    .lr-body > *{transition:opacity .45s,filter .45s}
    :root.lr-focus .lr-body > :not(.lr-cur){opacity:.28;filter:saturate(.6)}
    .lr-speaking{border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,transparent);box-shadow:0 0 0 8px color-mix(in srgb,var(--accent) 12%,transparent),0 0 30px color-mix(in srgb,var(--accent) 22%,transparent)}
    .lr-tools .say.on{color:#fff;background:var(--nova);box-shadow:var(--halo)}
    .lr-cover{position:relative;margin:-34px -34px 26px;height:240px;overflow:hidden;border-radius:30px 30px 0 0}
    .lr-cover img{width:100%;height:100%;object-fit:cover;border-radius:0;box-shadow:none;display:block;animation:kb 1.6s var(--spring) both}
    @keyframes kb{from{transform:scale(1.08);opacity:0}}
    .lr-cover::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,color-mix(in srgb,var(--paper) 70%,transparent))}
    .lr-body img{cursor:zoom-in;transition:transform .5s var(--jelly),box-shadow .3s}
    .lr-body img:hover{transform:translateY(-2px)}
    .lr-lb{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:5vh 5vw;background:color-mix(in srgb,var(--bg) 70%,transparent);-webkit-backdrop-filter:blur(18px) saturate(1.4);backdrop-filter:blur(18px) saturate(1.4);cursor:zoom-out;animation:lbin .3s ease both}
    .lr-lb img{max-width:100%;max-height:90vh;border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.35),0 0 0 1px var(--line);animation:lbpop .6s var(--spring) both;cursor:zoom-out}
    @keyframes lbin{from{opacity:0}}@keyframes lbpop{from{transform:scale(.86);opacity:0}}
    .lr-tog{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;padding:10px 12px;border-radius:16px;background:var(--chip);font:650 13px var(--sans);color:var(--fg)}
    .lr-tog small{display:block;font:500 11.5px var(--sans);color:var(--mut);margin-top:2px}
    .lr-tog button{all:unset;position:relative;flex:none;width:42px;height:26px;border-radius:99px;background:color-mix(in srgb,var(--fg) 16%,transparent);transition:background .25s}
    .lr-tog button::after{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);transition:transform .5s var(--jelly)}
    .lr-tog button[aria-checked=true]{background:var(--nova);box-shadow:var(--halo)}
    .lr-tog button[aria-checked=true]::after{transform:translateX(16px)}
    .lr-tog button:focus-visible{outline:none;box-shadow:var(--halo)}
    mark.lr-hl{color:inherit;background:linear-gradient(180deg,transparent 12%,color-mix(in srgb,var(--accent) 38%,transparent) 12%,color-mix(in srgb,var(--accent3) 34%,transparent) 92%,transparent 92%);border-radius:4px;box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 12%,transparent);cursor:pointer;-webkit-box-decoration-break:clone;box-decoration-break:clone;animation:hl .5s var(--spring) both}
    @keyframes hl{from{background-size:0 100%}to{background-size:100% 100%}}
    mark.lr-hl{background-repeat:no-repeat}
    .lr-glass.lr-sel{position:fixed;z-index:25;display:flex;gap:2px;padding:5px;border-radius:999px;font:700 12.5px var(--sans);transform-origin:50% 100%;animation:selin .45s var(--spring) both}
    @keyframes selin{from{opacity:0;transform:translateY(6px) scale(.9)}}
    .lr-sel button{all:unset;display:flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px;color:var(--fg);cursor:default;transition:background .2s,transform .5s var(--jelly)}
    .lr-sel button svg{width:14px;height:14px}
    .lr-sel button:hover{background:color-mix(in srgb,var(--accent) 14%,transparent)}.lr-sel button:active{transform:scale(.94)}
    .lr-sel button.pri{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 12px color-mix(in srgb,var(--accent) 36%,transparent)}
    .lr-sel button:focus-visible,.lr-resume button:focus-visible{outline:none;box-shadow:var(--halo)}
    .lr-glass.lr-resume{position:fixed;left:50%;bottom:26px;z-index:24;display:flex;align-items:center;gap:14px;padding:10px 10px 10px 12px;border-radius:22px;font:600 13px var(--sans);color:var(--fg);translate:-50% 0;animation:resin .7s .5s var(--spring) both}
    @keyframes resin{from{opacity:0;transform:translateY(20px) scale(.94)}}
    .lr-resume .tile{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 8px 20px color-mix(in srgb,var(--accent) 45%,transparent);flex:none}
    .lr-resume .tile svg{width:20px;height:20px}
    .lr-resume b{display:block;font:800 15px/1.15 var(--display);letter-spacing:-.02em}
    .lr-resume small{display:block;font:550 12px var(--sans);color:var(--mut);margin-top:2px}
    .lr-resume button{all:unset;height:36px;padding:0 16px;border-radius:999px;font:700 13px var(--sans);cursor:default;transition:transform .5s var(--jelly)}
    .lr-resume button:active{transform:scale(.95)}
    .lr-resume .go{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 6px 16px color-mix(in srgb,var(--accent) 40%,transparent)}
    .lr-resume .no{color:var(--fg2);background:var(--chip)}
    .lr-resume.gone{display:none}
    .lr-keys{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:7px 8px;align-items:center;margin-top:4px;font:550 12px var(--sans);color:var(--fg2)}
    .lr-keys kbd{font:700 11px/1 var(--sans);min-width:22px;text-align:center;padding:4px 6px;border-radius:7px;background:var(--chip);color:var(--fg);box-shadow:inset 0 -1px 0 var(--line)}
    :root[data-lr-lh=compact]{--lh:1.55}:root[data-lr-lh=airy]{--lh:2}
    :root[data-lr-width=narrow]{--w:600px}:root[data-lr-width=wide]{--w:860px}
    html{background:var(--bg);color:var(--fg);scroll-padding-top:90px}
    html,body{margin:0}
    body{background:var(--bg);transition:background-color .35s,color .35s}
    body::before{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;background:
      radial-gradient(40% 34% at 10% 0%,color-mix(in srgb,var(--accent) var(--neb),transparent),transparent 70%),
      radial-gradient(36% 30% at 94% 6%,color-mix(in srgb,var(--accent3) calc(var(--neb) * .8),transparent),transparent 70%),
      radial-gradient(50% 40% at 50% 112%,color-mix(in srgb,var(--accent2) calc(var(--neb) * .6),transparent),transparent 70%)}
    ::selection{background:color-mix(in srgb,var(--accent) 30%,transparent)}
    button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
    .lr-glass{position:relative;isolation:isolate;background:radial-gradient(180px circle at var(--gx,20%) var(--gy,-30%),rgb(255 255 255/var(--glint)),transparent 70%),radial-gradient(120% 120% at 0% 0%,color-mix(in srgb,var(--accent) 14%,transparent),transparent 60%),var(--glass);
      -webkit-backdrop-filter:var(--lens,) blur(22px) saturate(1.9);backdrop-filter:var(--lens,) blur(22px) saturate(1.9);box-shadow:var(--spec),var(--shadow)}
    .lr-glass::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;background:var(--edge);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
    .lr-bar{position:fixed;left:0;top:0;height:3px;width:100%;transform-origin:0 50%;transform:scaleX(0);background:var(--nova);box-shadow:0 0 14px var(--accent);z-index:20}
    .lr-tools{position:fixed;top:16px;right:18px;z-index:12;display:flex;align-items:center;gap:3px;padding:5px;border-radius:999px;font:650 13px var(--sans);animation:drop .7s .1s var(--spring) both}
    @keyframes drop{from{opacity:0;transform:translateY(-14px) scale(.94)}}
    .lr-tools button{all:unset;box-sizing:border-box;position:relative;min-width:36px;height:34px;padding:0 11px;border-radius:999px;display:grid;place-items:center;color:var(--fg2);cursor:default;transition:background .2s,color .2s,transform .5s var(--jelly),box-shadow .25s}
    .lr-tools button svg{width:17px;height:17px}
    .lr-tools button:hover{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--fg);transform:translateY(-1px)}
    .lr-tools button:active{transform:scale(.94)}
    .lr-tools button[aria-expanded=true]{color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent)}
    .lr-tools button:focus-visible,.lr-pop button:focus-visible,.lr-pop a:focus-visible,.lr-rail a:focus-visible,.lr-end button:focus-visible{outline:none;box-shadow:var(--halo)}
    .lr-tools .sep{width:1px;height:18px;margin:0 3px;background:var(--line)}
    .lr-tools .ex{color:#fff;padding:0 15px;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 14px color-mix(in srgb,var(--accent) 38%,transparent)}
    .lr-tools .ex:hover{color:#fff;background:var(--nova);filter:brightness(1.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),var(--halo)}
    .lr-left{display:flex;align-items:center;gap:7px;height:34px;padding:0 12px 0 10px;border-radius:999px;color:var(--fg2);font:700 12.5px var(--sans);white-space:nowrap;font-variant-numeric:tabular-nums}
    .lr-left i{position:relative;width:16px;height:16px;border-radius:50%;background:conic-gradient(var(--accent) calc(var(--p,0) * 1turn),var(--chip) 0);flex:none}
    .lr-left i::after{content:'';position:absolute;inset:3.5px;border-radius:50%;background:var(--paper)}
    .lr-pop{position:fixed;top:64px;right:18px;z-index:13;width:330px;max-height:calc(100vh - 90px);overflow:auto;padding:16px;border-radius:24px;font:13px/1.4 var(--sans);color:var(--fg);
      opacity:0;visibility:hidden;transform:translateY(-8px) scale(.94);transform-origin:top right;transition:opacity .16s,transform .55s var(--spring),visibility 0s .2s;scrollbar-width:none}
    .lr-pop.on{opacity:1;visibility:visible;transform:none;transition:opacity .16s,transform .55s var(--spring),visibility 0s}
    .lr-pop h4{margin:2px 2px 12px;font:800 17px/1.1 var(--display);letter-spacing:-.03em;background:linear-gradient(120deg,var(--fg) 30%,color-mix(in srgb,var(--accent) 80%,var(--fg)));-webkit-background-clip:text;background-clip:text;color:transparent}
    .lr-pop .lab{margin:14px 2px 7px;font:800 10.5px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
    .lr-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border-radius:16px;background:var(--chip)}
    .lr-seg button{all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:36px;padding:6px 4px;border-radius:12px;font:650 12px var(--sans);color:var(--fg2);cursor:default;text-align:center;transition:background .2s,color .2s,transform .5s var(--jelly),box-shadow .25s}
    .lr-seg button:hover{color:var(--fg);background:color-mix(in srgb,var(--accent) 10%,transparent)}
    .lr-seg button:active{transform:scale(.95)}
    .lr-seg button[aria-pressed=true]{color:var(--fg);background:var(--paper);box-shadow:0 1px 2px rgba(0,0,0,.08),0 4px 14px color-mix(in srgb,var(--accent) 22%,transparent),inset 0 0 0 1.5px color-mix(in srgb,var(--accent) 55%,transparent)}
    .lr-seg .sw{width:34px;height:26px;border-radius:9px;display:grid;place-items:center;font:700 13px var(--serif);box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
    .lr-seg .ag{font-size:22px;line-height:1;font-weight:600}
    .lr-seg .ln{display:flex;flex-direction:column;gap:var(--g);width:22px}.lr-seg .ln i{height:2px;border-radius:2px;background:currentColor;opacity:.7}
    .lr-seg .wd{height:14px;border-radius:4px;border:1.5px solid currentColor;opacity:.75}
    .lr-size{display:flex;align-items:center;gap:8px;padding:4px;border-radius:16px;background:var(--chip)}
    .lr-size button{all:unset;box-sizing:border-box;width:44px;height:36px;border-radius:12px;display:grid;place-items:center;font:750 13px var(--sans);color:var(--fg2);transition:background .2s,transform .5s var(--jelly)}
    .lr-size button:hover{background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--fg)}.lr-size button:active{transform:scale(.92)}
    .lr-size .big{font-size:18px}
    .lr-size .tr{flex:1;position:relative;height:6px;border-radius:6px;background:color-mix(in srgb,var(--fg) 10%,transparent)}
    .lr-size .tr i{position:absolute;left:0;top:0;bottom:0;border-radius:inherit;background:var(--nova);box-shadow:0 0 8px color-mix(in srgb,var(--accent) 60%,transparent);transition:width .45s var(--spring)}
    .lr-size .val{min-width:44px;text-align:center;font:800 13px var(--display);color:var(--fg);font-variant-numeric:tabular-nums}
    .lr-tocp{width:310px}
    .lr-tocp nav,.lr-rail nav{display:flex;flex-direction:column;gap:2px;counter-reset:s}
    .lr-tocp a,.lr-rail a{display:flex;align-items:baseline;gap:10px;padding:8px 10px;border-radius:12px;color:var(--fg2);text-decoration:none;font:600 13.5px/1.3 var(--sans);transition:background .2s,color .2s,transform .5s var(--jelly)}
    .lr-tocp a.h3,.lr-rail a.h3{padding-left:30px;font-weight:500;font-size:12.5px}
    .lr-tocp a:hover,.lr-rail a:hover{background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--fg);transform:translateX(2px)}
    .lr-tocp a.on,.lr-rail a.on{color:var(--fg);background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 18%,transparent),color-mix(in srgb,var(--accent3) 8%,transparent));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 24%,transparent)}
    .lr-tocp a.h2::before,.lr-rail a.h2::before{counter-increment:s;content:counter(s,decimal-leading-zero);font:800 11px var(--display);color:var(--accent);min-width:18px}
    .lr-tocp a.done,.lr-rail a.done{color:var(--mut)}
    .lr-rail{position:fixed;top:120px;left:16px;width:184px;box-sizing:border-box;z-index:5;padding:14px 10px 12px;border-radius:24px;display:none;max-height:calc(100vh - 160px);overflow:auto;scrollbar-width:none;animation:rail .7s .35s var(--spring) both}
    @keyframes rail{from{opacity:0;transform:translateX(-14px)}}
    .lr-rail .rt{margin:0 8px 8px;font:800 10.5px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
    html.lr-has-rail .lr-rail{display:block}
    .lr{max-width:var(--w);margin:0 auto;padding:92px 32px 140px;font:var(--size)/var(--lh) var(--body);transition:max-width .5s var(--spring)}
    .lr-hero{position:relative;isolation:isolate;overflow:hidden;margin:0 -32px 48px;padding:34px 34px 32px;border-radius:30px;
      background:radial-gradient(120% 140% at 0% 0%,color-mix(in srgb,var(--accent) 24%,transparent),transparent 55%),radial-gradient(90% 140% at 100% 100%,color-mix(in srgb,var(--accent3) 20%,transparent),transparent 60%),var(--glass);
      -webkit-backdrop-filter:blur(24px) saturate(1.7);backdrop-filter:blur(24px) saturate(1.7);box-shadow:var(--spec),inset 0 -22px 40px -30px color-mix(in srgb,var(--accent3) 60%,transparent),var(--shadow);animation:land .8s var(--spring) both}
    @keyframes land{from{opacity:0;transform:translateY(-12px) scale(.97)}}
    .lr-hero::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;background:var(--edge);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
    .lr-hero::after{content:'';position:absolute;inset:-10% auto -10% 0;width:40%;z-index:-1;pointer-events:none;background:linear-gradient(105deg,transparent,rgba(255,255,255,.42),transparent);transform:translateX(-120%) skewX(-12deg);animation:sweep 1.3s .35s cubic-bezier(.3,.6,.3,1) both}
    @keyframes sweep{to{transform:translateX(360%) skewX(-12deg)}}
    .lr-orb{position:absolute;z-index:-2;border-radius:50%;filter:blur(38px);pointer-events:none}
    .lr-orb.o1{width:260px;height:220px;left:-80px;top:-120px;background:color-mix(in srgb,var(--accent) 42%,transparent)}
    .lr-orb.o2{width:240px;height:200px;right:-90px;bottom:-110px;background:color-mix(in srgb,var(--accent3) 30%,transparent)}
    .lr-ghost{position:absolute;right:-26px;top:-30px;width:210px;height:210px;color:var(--accent);opacity:.08;z-index:-1;pointer-events:none}
    .meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font:700 12.5px var(--sans);color:var(--fg2);margin-bottom:18px}
    .meta span{padding:5px 11px;border-radius:999px;background:color-mix(in srgb,var(--accent) 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 18%,transparent)}
    .meta .site{display:flex;align-items:center;gap:7px;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 4px 14px color-mix(in srgb,var(--accent) 34%,transparent)}
    .meta .site svg{width:13px;height:13px}
    h1.t{margin:0;font:800 clamp(32px,4.6vw,50px)/1.06 var(--display);letter-spacing:-.045em;background:linear-gradient(120deg,var(--fg) 30%,color-mix(in srgb,var(--accent) 80%,var(--fg)) 78%,var(--accent3));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:3px;text-wrap:balance}
    .lr-lead{margin:14px 0 0;font:500 17px/1.5 var(--sans);color:var(--fg2);text-wrap:pretty}
    .lr-by{margin-top:14px;font:700 13px var(--sans);color:var(--fg2)}
    .lr-body > p:first-of-type::first-letter{float:left;font:800 3.5em/.88 var(--display);margin:.06em .1em 0 0;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent}
    .lr-body{animation:rise .8s .14s var(--spring) both;text-wrap:pretty;hyphens:auto}
    @keyframes rise{from{opacity:0;transform:translateY(16px)}}
    .lr-body p{margin:0 0 1.1em}
    img,video,figure{max-width:100%;height:auto;border-radius:18px}
    img,video{box-shadow:0 14px 40px color-mix(in srgb,var(--accent) 14%,rgba(0,0,0,.14))}
    figure{margin:2em 0}figcaption{font:13px/1.5 var(--sans);color:var(--mut);margin-top:10px;text-align:center}
    a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px;text-decoration-color:color-mix(in srgb,var(--accent) 45%,transparent)}
    a:hover{text-decoration-color:var(--accent)}
    pre,code{font:.8em/1.6 ui-monospace,"SF Mono",Menlo,Consolas,monospace;white-space:pre-wrap}
    pre{padding:16px 18px;border-radius:16px;background:var(--glass);box-shadow:var(--spec),inset 0 0 0 1px var(--line)}
    blockquote{position:relative;margin:1.8em 0;padding:20px 24px 20px 30px;border-radius:20px;color:var(--fg);font-size:1.12em;font-style:italic;line-height:1.55;background:radial-gradient(100% 140% at 0% 0%,color-mix(in srgb,var(--accent) 14%,transparent),transparent 60%),var(--glass);box-shadow:var(--spec),inset 0 0 0 1px var(--line)}
    blockquote::before{content:'';position:absolute;left:12px;top:16px;bottom:16px;width:4px;border-radius:4px;background:var(--nova);box-shadow:0 0 12px var(--accent)}
    h2,h3,h4{font-family:var(--display);font-weight:800;letter-spacing:-.03em;line-height:1.2;margin:2em 0 .6em;color:var(--fg)}
    h2{font-size:1.5em}h3{font-size:1.22em}
    hr{border:0;height:1px;margin:2.4em 0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 40%,var(--line)),transparent)}
    table{border-collapse:collapse;font:15px/1.5 var(--sans)}td,th{padding:6px 10px;border-bottom:1px solid var(--line)}
    .lr-end{position:relative;isolation:isolate;overflow:hidden;margin-top:70px;padding:30px;border-radius:28px;text-align:center;font:600 14px var(--sans);color:var(--fg2)}
    .lr-end .big{font:800 26px/1.1 var(--display);letter-spacing:-.03em;color:var(--fg);margin:12px 0 6px}
    .lr-end .tile{width:52px;height:52px;margin:0 auto;border-radius:17px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 10px 26px color-mix(in srgb,var(--accent) 45%,transparent)}
    .lr-end .tile svg{width:24px;height:24px}
    .lr-end .row{display:flex;justify-content:center;gap:10px;margin-top:18px}
    .lr-end button{all:unset;box-sizing:border-box;height:38px;padding:0 18px;border-radius:999px;font:700 13.5px var(--sans);cursor:default;background:var(--chip);color:var(--fg);box-shadow:inset 0 0 0 1px var(--line);transition:transform .5s var(--jelly),box-shadow .25s}
    .lr-end button:hover{transform:translateY(-1px)}.lr-end button:active{transform:scale(.95)}
    .lr-end button.pri{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 6px 16px color-mix(in srgb,var(--accent) 38%,transparent)}
    @media (max-width:760px){.lr{padding:84px 20px 120px}.lr-hero{margin:0 -20px 40px;padding:26px 22px}.lr-cover{margin:-26px -22px 22px;height:180px}.lr-tools .lr-left{display:none}}
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
  }
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n }
  const bar = el('div', 'lr-bar')
  const tools = el('div', 'lr-tools lr-glass')
  tools.setAttribute('role', 'toolbar'); tools.setAttribute('aria-label', 'Reader')
  tools.innerHTML = `<span class="lr-left" aria-live="off"><i></i><span></span></span><span class="sep"></span>
    <button class="toc" title="Contents" aria-label="Contents" aria-expanded="false">${I.toc}</button>
    <button class="say" title="Read aloud (S)" aria-label="Read aloud" aria-pressed="false">${I.say}</button>
    <button class="sm" title="Smaller text" aria-label="Smaller text">A-</button><button class="lg" title="Larger text" aria-label="Larger text">A+</button>
    <button class="aa" title="Text and theme" aria-label="Text and theme" aria-expanded="false">${I.aa}</button><span class="sep"></span>
    <button class="ex" title="Leave Reader Mode">Exit Reader</button>`

  // the typography panel
  const panel = el('div', 'lr-pop lr-panel lr-glass')
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Text and theme')
  const seg = (key, items) => `<div class="lr-seg" role="group">${items.map(([v, label, art]) => `<button data-${key}="${v}" aria-pressed="false">${art || ''}<span>${label}</span></button>`).join('')}</div>`
  panel.innerHTML = '<h4>Make it yours</h4>' +
    '<div class="lab">Theme</div>' + seg('theme', [['auto', 'Auto', '<span class="sw" style="background:linear-gradient(135deg,#fff 50%,#141725 50%);color:#888">Aa</span>'], ['light', 'Light', '<span class="sw" style="background:#fff;color:#17181f">Aa</span>'], ['sepia', 'Sepia', '<span class="sw" style="background:#f3e9d6;color:#3b2f22">Aa</span>'], ['dark', 'Dark', '<span class="sw" style="background:#11141f;color:#e8e9f2">Aa</span>']]) +
    '<div class="lab">Typeface</div>' + seg('font', [['serif', 'Serif', '<span class="ag" style="font-family:var(--serif)">Ag</span>'], ['sans', 'Sans', '<span class="ag" style="font-family:var(--sans)">Ag</span>'], ['rounded', 'Rounded', '<span class="ag" style="font-family:var(--display);font-weight:700">Ag</span>']]) +
    '<div class="lab">Text size</div><div class="lr-size"><button class="sm2" aria-label="Smaller text">A</button><span class="tr"><i></i></span><span class="val"></span><button class="lg2 big" aria-label="Larger text">A</button></div>' +
    '<div class="lab">Line spacing</div>' + seg('lh', [['compact', 'Tight', '<span class="ln" style="--g:3px"><i></i><i></i><i></i></span>'], ['normal', 'Normal', '<span class="ln" style="--g:5px"><i></i><i></i><i></i></span>'], ['airy', 'Airy', '<span class="ln" style="--g:7px"><i></i><i></i><i></i></span>']]) +
    '<div class="lab">Width</div>' + seg('width', [['narrow', 'Narrow', '<span class="wd" style="width:14px"></span>'], ['medium', 'Medium', '<span class="wd" style="width:20px"></span>'], ['wide', 'Wide', '<span class="wd" style="width:28px"></span>']]) +
    '<div class="lab">Alignment</div>' + seg('align', [['left', 'Left', '<span class="ln" style="--g:4px"><i></i><i style="width:70%"></i><i style="width:85%"></i></span>'], ['justify', 'Justified', '<span class="ln" style="--g:4px"><i></i><i></i><i></i></span>']]) +
    '<div class="lr-tog"><span>Focus<small>Dim everything but the paragraph you are reading</small></span><button class="focus" role="switch" aria-checked="false" aria-label="Focus"></button></div>' +
    '<div class="lab">Keys</div><div class="lr-keys"><kbd>-</kbd><span>Smaller</span><kbd>=</kbd><span>Larger</span><kbd>[</kbd><span>Previous section</span><kbd>]</kbd><span>Next section</span><kbd>C</kbd><span>Contents</span><kbd>S</kbd><span>Read aloud</span><kbd>F</kbd><span>Focus</span><kbd>Esc</kbd><span>Close</span></div>'

  // the article
  const wrap = el('div', 'lr')
  const hero = el('header', 'lr-hero')
  const meta = el('div', 'meta')
  for (const [cls, txt] of [['site', host], ['', `${mins} min read`], ['', `${words.toLocaleString()} words`]]) { const s = el('span', cls); s.textContent = txt; if (cls === 'site') s.insertAdjacentHTML('afterbegin', I.book); meta.appendChild(s) }
  const h = el('h1', 't'); h.textContent = title
  hero.append(el('span', 'lr-orb o1'), el('span', 'lr-orb o2'), el('span', 'lr-ghost', I.book.replace('stroke-width="1.6"', 'stroke-width=".7"')))
  if (cover) { const c = el('div', 'lr-cover'); const im = new Image(); im.alt = ''; im.src = cover; im.onerror = () => c.remove(); c.appendChild(im); hero.appendChild(c) }
  hero.append(meta, h)
  if (lead && lead.length > 30 && !clone.textContent.slice(0, 600).includes(lead.slice(0, 40))) { const l = el('p', 'lr-lead'); l.textContent = lead.slice(0, 300); hero.appendChild(l) }
  if (byline && byline.length < 80) { const b = el('div', 'lr-by'); b.textContent = 'By ' + byline; hero.appendChild(b) }
  clone.classList.add('lr-body')
  // the title is in the hero now; drop the article's own copy of it
  const dup = clone.querySelector('h1'); if (dup && dup.textContent.trim() === title) dup.remove()
  const end = el('div', 'lr-end lr-glass', `<div class="tile">${I.done}</div><div class="big">The end</div><div class="stat">${words.toLocaleString()} words from ${host.replace(/[<>&"]/g, '')}</div><div class="row"><button class="top">Back to top</button><button class="hls" hidden>Copy highlights</button><button class="pri leave">Exit Reader</button></div>`)
  wrap.append(hero, clone, end)

  // contents: every h2 and h3 of the article, shown from the toolbar and, when there is room, as a rail on the left
  const heads = [...clone.querySelectorAll('h2, h3')].filter(x => x.textContent.trim().length > 1).slice(0, 60)
  const hasToc = heads.filter(x => x.tagName === 'H2').length >= 2 || heads.length >= 3
  let tocp = null, rail = null
  const tocLinks = []
  if (hasToc) {
    const list = () => { const n = el('nav'); heads.forEach((x, i) => { const a = el('a', x.tagName.toLowerCase()); a.href = '#'; a.textContent = x.textContent.trim().slice(0, 90); a.dataset.i = i; a.onclick = e => { e.preventDefault(); x.scrollIntoView({ behavior: STILL ? 'auto' : 'smooth', block: 'start' }); closePops() }; tocLinks.push(a); n.appendChild(a) }); return n }
    tocp = el('div', 'lr-pop lr-tocp lr-glass', '<h4>Contents</h4>'); tocp.setAttribute('role', 'dialog'); tocp.setAttribute('aria-label', 'Contents'); tocp.appendChild(list())
    rail = el('aside', 'lr-rail lr-glass', '<div class="rt">Contents</div>'); rail.appendChild(list())
  } else tools.querySelector('.toc').remove()
  document.body.append(bar, tools, panel, ...(tocp ? [tocp, rail] : []), wrap)

  // choices
  const root = document.documentElement
  const apply = () => {
    P.size = Math.max(14, Math.min(30, Math.round(+P.size || 20)))
    root.style.setProperty('--size', P.size + 'px')
    root.dataset.lrTheme = P.theme; root.dataset.lrFont = P.font; root.dataset.lrLh = P.lh; root.dataset.lrWidth = P.width; root.dataset.lrAlign = P.align
    root.classList.toggle('lr-focus', !!P.focus); panel.querySelector('.focus').setAttribute('aria-checked', String(!!P.focus))
    panel.querySelectorAll('.lr-seg button').forEach(b => { const k = Object.keys(b.dataset)[0]; b.setAttribute('aria-pressed', String(P[k] === b.dataset[k])) })
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
  panel.querySelectorAll('.lr-seg button').forEach(b => { b.onclick = () => { const k = Object.keys(b.dataset)[0]; set(k, b.dataset[k]) } })
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
    lens(p)
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
  const syncHl = () => { const b = end.querySelector('.hls'), n = hlCount(); b.hidden = !n; b.textContent = n === 1 ? 'Copy 1 highlight' : `Copy ${n} highlights` }
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
    const card = el('div', 'lr-resume lr-glass', `<span class="tile">${I.back}</span><span><b>Pick up where you left off</b><small>${Math.round(savedPos * 100)}% read, about ${left} min left</small></span><button class="go">Continue</button><button class="no">Start over</button>`)
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
    const room = (innerWidth - w - 64) / 2 - 32   // left of the hero, which sticks out 32px
    const fits = room >= 184 + 30
    root.classList.toggle('lr-has-rail', fits)
    if (fits) rail.style.left = Math.round(Math.max(16, room - 184 - 22)) + 'px'
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
    if (lensDone.has(tools)) lens(tools)
    ring.style.setProperty('--p', p.toFixed(3))
    const left = Math.ceil(words * (1 - p) / WPM)
    leftEl.textContent = p >= 0.995 ? 'Finished' : p < 0.01 ? `${mins} min read` : left <= 1 ? 'Under a minute left' : `${left} min left`
    if (P.focus) {
      const line = innerHeight * 0.42; let best = null
      for (const x of clone.children) { const q = x.getBoundingClientRect(); if (q.top <= line) best = x; else break }
      for (const x of clone.querySelectorAll(':scope > .lr-cur')) if (x !== best) x.classList.remove('lr-cur')
      if (best) best.classList.add('lr-cur')
    }
    if (p >= 0.995 && !endStat) { endStat = true; const took = Math.max(1, Math.round((Date.now() - started) / 60000)); end.querySelector('.stat').textContent = `${words.toLocaleString()} words from ${host}, read in ${took} min` }
    if (tocLinks.length) {
      let cur = -1
      heads.forEach((x, i) => { if (x.getBoundingClientRect().top < 140) cur = i })
      tocLinks.forEach(a => { const i = +a.dataset.i; a.classList.toggle('on', i === cur); a.classList.toggle('done', i < cur) })
    }
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick) } }, { passive: true })

  // liquid glass lens for the floating glass (toolbar, panels, rail): bends the article at the rim
  const lensDone = new WeakMap(), lensSvg = new WeakMap()
  function lens(n) {
    if (STILL || !n.isConnected) return
    requestAnimationFrame(() => {
      const w = Math.round(n.offsetWidth / 2) * 2, hh = Math.round(n.offsetHeight / 2) * 2
      if (w < 16 || hh < 16 || w * hh > 700000 || lensDone.get(n) === w + 'x' + hh) return
      lensDone.set(n, w + 'x' + hh)
      const rad = Math.min(parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0, w / 2, hh / 2), bezel = Math.max(6, Math.min(rad * 1.2 + 6, Math.min(w, hh) / 2, 30))
      const s = Math.min(1, 160 / Math.max(w, hh)), cw = Math.ceil(w * s), ch = Math.ceil(hh * s)
      const sdf = (px, py) => { const qx = Math.abs(px - w / 2) - (w / 2 - rad), qy = Math.abs(py - hh / 2) - (hh / 2 - rad); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad }
      const c = document.createElement('canvas'); c.width = cw; c.height = ch
      const x = c.getContext('2d'), img = x.createImageData(cw, ch), d = img.data
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
        const px = (i + .5) / s, py = (j + .5) / s, dist = -sdf(px, py); let dx = 0, dy = 0
        if (dist > 0 && dist < bezel) { const t = 1 - dist / bezel, mm = t * t * (1.4 - .4 * t), nx = sdf(px + 1, py) - sdf(px - 1, py), ny = sdf(px, py + 1) - sdf(px, py - 1), l = Math.hypot(nx, ny) || 1; dx = -nx / l * mm; dy = -ny / l * mm }
        const o = (j * cw + i) * 4; d[o] = 128 + dx * 127; d[o + 1] = 128 + dy * 127; d[o + 2] = 128; d[o + 3] = 255
      }
      x.putImageData(img, 0, 0)
      const id = 'lr-lens-' + Math.random().toString(36).slice(2), sc = Math.round(Math.min(bezel * 1.1, 34) * .8)
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;width:0;height:0'
      svg.innerHTML = `<filter id="${id}" x="0" y="0" width="${w}" height="${hh}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${c.toDataURL()}" x="0" y="0" width="${w}" height="${hh}" preserveAspectRatio="none" result="map"/>` +
        [['r', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['g', 1.07, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['b', 1.15, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']].map(([k, mm, v]) => `<feDisplacementMap in="SourceGraphic" in2="map" scale="${Math.round(sc * mm)}" xChannelSelector="R" yChannelSelector="G" result="d${k}"/><feColorMatrix in="d${k}" type="matrix" values="${v}" result="${k}"/>`).join('') +
        '<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>'
      const prev = lensSvg.get(n); if (prev) prev.remove()
      lensSvg.set(n, svg); document.body.appendChild(svg)
      n.style.setProperty('--lens', `url(#${id})`)
    })
  }
  // the specular glint follows the pointer over the glass
  if (!STILL) for (const n of [tools, panel, tocp, rail, end].filter(Boolean)) n.addEventListener('pointermove', e => { const q = n.getBoundingClientRect(); n.style.setProperty('--gx', Math.round(e.clientX - q.left) + 'px'); n.style.setProperty('--gy', Math.round(e.clientY - q.top) + 'px') })

  apply()
  window.scrollTo(0, 0)
  tick()
  setTimeout(() => { lens(tools); if (rail && root.classList.contains('lr-has-rail')) lens(rail) }, 900)
})()
