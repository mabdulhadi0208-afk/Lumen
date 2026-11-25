// Runs in every page. Internal lumen:// pages get the Lumen API; websites get the password manager.
const { ipcRenderer, contextBridge } = require('electron')

if (location.protocol === 'lumen:') {
  const settingsListeners = new Set()
  ipcRenderer.on('lumen:settings', (e, s) => settingsListeners.forEach(fn => fn(s)))
  contextBridge.exposeInMainWorld('lumen', {
    invoke: (action, ...args) => ipcRenderer.invoke('lumen', action, ...args),
    onSettings: fn => { settingsListeners.add(fn) },
  })
} else if (/^https?:$/.test(location.protocol)) {
  // ------------------------------------------------------------ dark mode helpers (see darkPage in main.js)
  try {
    globalThis.__lumenFetch = async url => {
      const r = await ipcRenderer.invoke('lumen:css', String(url))
      if (!r || !r.ok) throw new Error('fetch failed')
      const bin = atob(r.b64), bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return new Response(bytes, { status: 200, headers: { 'content-type': r.type || 'text/css' } })
    }
    globalThis.__lumenDRFetch = async req => {
      const r = await ipcRenderer.invoke('lumen:css', String(req.url))
      if (!r || !r.ok) throw new Error('fetch failed')
      if (req.responseType === 'data-url') return `data:${(r.type || req.mimeType || 'application/octet-stream').split(';')[0]};base64,${r.b64}`
      const bin = atob(r.b64), bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return new TextDecoder().decode(bytes)
    }
    if (process.isMainFrame !== false && window === top) {
      const c = ipcRenderer.sendSync('lumen:dark-early')
      if (c) {
        // this site is known to be light: start dark right away so there is no white flash while it loads
        const put = () => { if (!document.documentElement || document.getElementById('lumen-dark-early')) return !!document.documentElement; const st = document.createElement('style'); st.id = 'lumen-dark-early'; st.textContent = `html, body { background: ${c} !important; } body { opacity: 0 !important; }`; document.documentElement.appendChild(st); return true }
        if (!put()) { const mo = new MutationObserver(() => { if (put()) mo.disconnect() }); mo.observe(document, { childList: true }) }
        setTimeout(() => { const e = document.getElementById('lumen-dark-early'); if (e) e.remove() }, 1500)
      }
    }
  } catch {}
  // ------------------------------------------------------------ Google sign-in: look like Firefox, which Google allows
  if (location.hostname === 'accounts.google.com') {
    try {
      const ua = ipcRenderer.sendSync('lumen:auth-ua')
      if (ua) contextBridge.executeInMainWorld({
        func: ua => {
          const def = (o, k, v) => { try { Object.defineProperty(o, k, { get: () => v, configurable: true }) } catch {} }
          const N = Navigator.prototype
          def(N, 'userAgent', ua); def(N, 'appVersion', ua.replace(/^Mozilla\//, '')); def(N, 'vendor', ''); def(N, 'userAgentData', undefined)
          def(N, 'productSub', '20100101'); def(N, 'oscpu', /Mac/.test(ua) ? 'Intel Mac OS X 10.15' : 'Windows NT 10.0; Win64; x64')
          try { delete window.chrome } catch {}
        },
        args: [ua],
      })
    } catch {}
  }

  // ------------------------------------------------------------ Peek: Shift + click a link to preview it in a floating window
  addEventListener('click', e => {
    if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.button !== 0) return
    const a = e.target.closest && e.target.closest('a[href]')
    if (!a || !/^https?:/.test(a.href)) return
    e.preventDefault(); e.stopImmediatePropagation()
    ipcRenderer.send('peek:open', a.href)
  }, true)

  // ------------------------------------------------------------ trackpad swipe back / forward, and video speed keys
  let QOL = { swipe: true, speed: true, accent: '#5b8cff', motion: 'jelly' }
  try { QOL = { ...QOL, ...(ipcRenderer.sendSync('lumen:qol') || {}) } } catch {}
  const ACC = /^#[0-9a-f]{3,8}$/i.test(QOL.accent || '') ? QOL.accent : '#5b8cff'
  const STILL = QOL.motion === 'off' || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)

  // ------------------------------------------------------------ Lumen 4.0 in-page kit
  // Everything Lumen draws inside a web page lives in a closed shadow root (the page cannot see or restyle it), is
  // made only when it is first needed, and is removed when it closes. Liquid glass: deep blur, a refractive gradient
  // rim with a faint chromatic fringe, a specular top edge, an inner caustic glow, stacked plates for depth and an
  // accent halo. Popovers carry the Settings hero DNA: a glossy glowing icon tile with halo rings, a huge title, a
  // light pool and a giant faded glyph bleeding off the edge. Springs are CSS linear() curves of a toned down jelly spring.
  // Nothing loops: entrances play once, and Motion Off or reduced motion makes everything still and instant.
  const SPRING = 'linear(0,.161,.458,.726,.907,1.005,1.042,1.045,1.033,1.02,1.009,1.002,.999,.998,.998,.999,.999,1)'
  const JELLY = 'linear(0,.091,.297,.538,.76,.933,1.047,1.108,1.126,1.116,1.091,1.06,1.032,1.01,.995,.987,.984,.985,.988,.992,.996,.999,1.001,1.002,1.001,1)'
  let kitCSS = null
  const novaCSS = () => kitCSS || (kitCSS = `:host{all:initial}
    *{box-sizing:border-box}
    .nv{--accent:${ACC};--accent2:oklch(from var(--accent) calc(l - .02) c calc(h + 40));--accent3:oklch(from var(--accent) calc(l + .04) c calc(h + 95));
      --nova:linear-gradient(135deg,var(--accent),var(--accent2) 55%,var(--accent3));--spring:${SPRING};--jelly:${JELLY};
      --fg:#10131d;--fg2:rgba(16,19,29,.66);--fg3:rgba(16,19,29,.46);--line:rgba(20,24,48,.1);--chip:rgba(20,24,48,.06);
      --glass:linear-gradient(180deg,rgba(255,255,255,.9),rgba(247,248,255,.84));--glint:.55;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 85%,transparent),rgba(255,255,255,.95) 30%,rgba(255,255,255,.2) 62%,color-mix(in srgb,var(--accent3) 80%,transparent));
      --shadow:0 1px 2px rgba(14,18,40,.08),0 10px 24px rgba(14,18,40,.1),0 26px 60px color-mix(in srgb,var(--accent) 26%,rgba(14,18,40,.14)),0 0 70px color-mix(in srgb,var(--accent) 16%,transparent);
      --spec:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -1px 0 rgba(255,255,255,.35);
      --caustic:inset 0 -18px 30px -22px color-mix(in srgb,var(--accent3) 70%,transparent),inset 0 18px 34px -26px color-mix(in srgb,var(--accent) 60%,transparent);
      --halo:0 0 0 4px color-mix(in srgb,var(--accent) 18%,transparent),0 0 24px color-mix(in srgb,var(--accent) 34%,transparent);
      --sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;
      --display:ui-rounded,"SF Pro Rounded","Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;
      font:13.5px/1.35 var(--sans);color:var(--fg);-webkit-font-smoothing:antialiased;letter-spacing:normal;text-align:left;direction:ltr;-webkit-user-select:none;user-select:none}
    @media (prefers-color-scheme:dark){.nv{--fg:#f1f3fb;--fg2:rgba(241,243,251,.7);--fg3:rgba(241,243,251,.46);--line:rgba(255,255,255,.11);--chip:rgba(255,255,255,.08);
      --glass:linear-gradient(180deg,color-mix(in srgb,var(--accent) 10%,rgba(30,34,52,.9)),color-mix(in srgb,var(--accent) 6%,rgba(14,17,28,.9)));--glint:.16;
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 95%,transparent),rgba(255,255,255,.32) 30%,rgba(255,255,255,.06) 62%,color-mix(in srgb,var(--accent3) 90%,transparent));
      --shadow:0 1px 2px rgba(0,0,0,.5),0 10px 24px rgba(0,0,0,.36),0 26px 60px color-mix(in srgb,var(--accent) 30%,rgba(0,0,0,.5)),0 0 80px color-mix(in srgb,var(--accent) 24%,transparent);
      --spec:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(255,255,255,.04)}}
    .glass{position:relative;isolation:isolate;
      background:radial-gradient(180px circle at var(--gx,20%) var(--gy,-30%),rgb(255 255 255/var(--glint)),transparent 70%),
        radial-gradient(120% 90% at 0% 0%,color-mix(in srgb,var(--accent) 20%,transparent),transparent 62%),
        radial-gradient(90% 90% at 100% 100%,color-mix(in srgb,var(--accent3) 17%,transparent),transparent 62%),var(--glass);
      -webkit-backdrop-filter:blur(24px) saturate(2);backdrop-filter:blur(24px) saturate(2);box-shadow:var(--spec),var(--caustic),var(--shadow)}
    .glass::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;background:var(--edge);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;z-index:3}
    .glass::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:2;
      box-shadow:inset 1.5px 0 0 color-mix(in srgb,#ff4d8d 30%,transparent),inset -1.5px 0 0 color-mix(in srgb,#2fd3ff 30%,transparent);
      background:linear-gradient(180deg,rgba(255,255,255,.32),transparent 34%);mix-blend-mode:soft-light}
    .tile{display:grid;place-items:center;flex:none;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -6px 12px -6px rgba(0,0,0,.25),0 8px 20px color-mix(in srgb,var(--accent) 50%,transparent),0 0 26px color-mix(in srgb,var(--accent) 30%,transparent)}
    .gt{background:linear-gradient(120deg,var(--fg) 25%,color-mix(in srgb,var(--accent) 85%,var(--fg)) 70%,var(--accent3));-webkit-background-clip:text;background-clip:text;color:transparent}
    kbd{font:700 10.5px/1 var(--sans);padding:3px 6px;border-radius:6px;background:var(--chip);color:var(--fg2);box-shadow:inset 0 -1px 0 var(--line)}
    .sweep{position:absolute;inset:0;z-index:1;pointer-events:none;border-radius:inherit;overflow:hidden}
    .sweep::before{content:'';position:absolute;inset:-20% auto -20% 0;width:45%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.5),transparent);transform:translateX(-120%) skewX(-12deg);animation:nv-sweep 1.1s .15s cubic-bezier(.3,.6,.3,1) both}
    @keyframes nv-sweep{to{transform:translateX(330%) skewX(-12deg)}}
    @media (prefers-color-scheme:dark){.sweep::before{opacity:.35}}
    ${STILL ? '*,*::before,*::after{animation:none!important;transition:none!important}.sweep{display:none}' : ''}`)

  // the specular glint follows the pointer while it is over the glass (nothing moves when it is still)
  function glint(el) {
    if (STILL) return
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.setProperty('--gx', Math.round(e.clientX - r.left) + 'px'); el.style.setProperty('--gy', Math.round(e.clientY - r.top) + 'px') })
  }
  // a host element for one in-page surface: fixed, topmost, invisible to the page's styles
  function surface(cssText) {
    const host = document.createElement('div')
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;top:0;left:0;' + (cssText || '')
    const sh = host.attachShadow({ mode: 'closed' })
    return { host, sh }
  }
  // a liquid glass account menu under a sign-in field, shared by Lumen Passwords, Lumen Passkeys and the strong
  // password offer. A hero band on top (glossy glowing tile with halo rings, a huge title, a light pool and a giant
  // faded glyph bleeding off the edge), two glass plates stacked behind it for depth, a glow ring around the field,
  // and a highlight that slides between the rows on a jelly spring.
  function accountMenu(anchor, { kind, title, sub, rows, badge, onPick }) {
    const { host, sh } = surface()
    const r = anchor.getBoundingClientRect()
    const W = Math.max(370, Math.min(420, Math.round(r.width) + 30))
    const gen = kind === 'generate'
    const H = 100 + (gen ? 112 : Math.min(rows.length, 5) * 64) + 60
    const below = r.bottom + 12 + H < innerHeight || r.top < H
    const left = Math.round(Math.max(8, Math.min(r.left, innerWidth - W - 8)))
    const pos = below ? `top:${Math.round(r.bottom + 12)}px` : `bottom:${Math.round(innerHeight - r.top + 12)}px`
    const fr = parseFloat(getComputedStyle(anchor).borderTopLeftRadius) || 6
    const icon = gen ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.8 13.2 4v4c0 3.1-2.2 5.4-5.2 6.2C5 13.4 2.8 11.1 2.8 8V4z"/><path d="m5.6 8.1 1.7 1.7 3.2-3.4"/></svg>'
      : kind === 'passkey'
      ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.6"/><path d="M1.8 13.5c.4-2.6 2.2-4 4.2-4 1 0 1.8.3 2.5.8"/><circle cx="12" cy="9.5" r="1.8"/><path d="M12 11.3v3M12 13h1.4"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="4.8" cy="8" r="2.9"/><path d="M7.7 8h6.6M12.2 8v2.6M14.3 8v1.8"/></svg>'
    const bare = icon.replace(/^<svg[^>]*>|<\/svg>$/g, '')
    const goWord = kind === 'passkey' ? 'Sign in' : gen ? 'Use' : 'Fill'
    const enter = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5v3.5a1.5 1.5 0 0 1-1.5 1.5H2.5M5 5 2.5 7.5 5 10"/></svg>'
    const dy = below ? 1 : -1
    sh.innerHTML = `<style>${novaCSS()}
      .fr{position:fixed;left:${Math.round(r.left - 4)}px;top:${Math.round(r.top - 4)}px;width:${Math.round(r.width + 8)}px;height:${Math.round(r.height + 8)}px;border-radius:${Math.round(fr + 4)}px;pointer-events:none;
        box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 70%,transparent),0 0 0 6px color-mix(in srgb,var(--accent) 16%,transparent),0 0 26px color-mix(in srgb,var(--accent) 40%,transparent);opacity:0;transform:scale(1.06);transition:opacity .2s,transform .6s var(--jelly)}
      .mw{position:fixed;left:${left}px;${pos};width:${W}px;transform-origin:${below ? 'top' : 'bottom'} ${r.left - left < W / 2 ? 'left' : 'right'};
        opacity:0;transform:translateY(${-14 * dy}px) scale(.86);transition:opacity .18s,transform .75s var(--jelly)}
      .on .mw{opacity:1;transform:none}.on .fr{opacity:1;transform:none}
      .off .mw{opacity:0;transform:translateY(${-6 * dy}px) scale(.95);transition:opacity .14s,transform .2s ease-in}.off .fr{opacity:0;transition:opacity .14s}
      .deck{position:absolute;inset:0;border-radius:28px;z-index:-1;background:var(--glass);box-shadow:var(--spec),0 10px 30px color-mix(in srgb,var(--accent) 18%,rgba(14,18,40,.1))}
      .deck::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;background:var(--edge);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:.7}
      .d1{transform:translateY(${11 * dy}px) scale(.94);opacity:.75}.d2{transform:translateY(${21 * dy}px) scale(.87);opacity:.45}
      .m{border-radius:28px;overflow:hidden}
      .hb{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;gap:18px;padding:22px 20px 20px 22px;z-index:4;
        background:radial-gradient(120% 150% at 0% 0%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 58%),radial-gradient(90% 140% at 100% 100%,color-mix(in srgb,var(--accent3) 22%,transparent),transparent 62%)}
      .hb::after{content:'';position:absolute;left:18px;right:18px;bottom:0;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--accent) 45%,var(--line)),transparent)}
      .blob{position:absolute;z-index:-1;border-radius:50%;pointer-events:none}
      .b1{width:220px;height:170px;left:-70px;top:-100px;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 55%,transparent),transparent)}
      .b2{width:200px;height:150px;right:-60px;bottom:-110px;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent3) 44%,transparent),transparent)}
      .pool{position:absolute;z-index:-1;left:28%;top:-70px;width:56%;height:120px;border-radius:50%;background:radial-gradient(closest-side,rgb(255 255 255/calc(var(--glint) * 1.2)),transparent);pointer-events:none}
      .hart{position:absolute;z-index:-1;right:-46px;top:-44px;width:190px;height:190px;color:var(--accent);opacity:.15;transform:rotate(-12deg);pointer-events:none;animation:artin 1.3s .1s var(--spring) both}
      @keyframes artin{from{opacity:0;transform:rotate(-30deg) scale(.7) translateY(20px)}}
      .hic{position:relative;width:58px;height:58px;flex:none;display:grid;place-items:center;border-radius:19px;color:#fff;
        background:linear-gradient(180deg,rgba(255,255,255,.36),transparent 52%),linear-gradient(145deg,color-mix(in srgb,var(--accent) 70%,white),var(--accent) 50%,var(--accent3));
        box-shadow:0 14px 30px color-mix(in srgb,var(--accent) 52%,transparent),0 0 0 7px color-mix(in srgb,var(--accent) 15%,transparent),inset 0 1px 0 rgba(255,255,255,.6),inset 0 -3px 8px rgba(0,0,0,.16);animation:icin .9s .08s var(--jelly) both}
      .hic::after{content:'';position:absolute;inset:-14px;border-radius:29px;border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);pointer-events:none;animation:ringin 1s .2s ease both}
      .hic svg{width:28px;height:28px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
      @keyframes icin{from{opacity:0;transform:scale(.5) rotate(-16deg)}}@keyframes ringin{from{opacity:0;transform:scale(.7)}}
      .htx{flex:1;min-width:0;margin-left:4px}
      .t{font:800 22px/1.05 var(--display);letter-spacing:-.04em;padding-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .s{font-size:12.5px;color:var(--fg2);margin-top:5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .bd{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:52px;height:52px;padding:0 8px;border-radius:17px;background:color-mix(in srgb,var(--accent) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 24%,transparent),var(--spec)}
      .bd b{font:800 22px/1 var(--display);letter-spacing:-.04em;color:var(--fg)}
      .bd small{font:800 8.5px/1 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--fg3);margin-top:4px}
      .l{position:relative;z-index:4;display:flex;flex-direction:column;gap:4px;padding:10px;max-height:${5 * 64 + 16}px;overflow:auto;scrollbar-width:none}
      .hl{position:absolute;left:10px;right:10px;top:0;border-radius:18px;pointer-events:none;opacity:0;
        background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 24%,transparent),color-mix(in srgb,var(--accent3) 14%,transparent));
        box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 36%,transparent),var(--halo);transition:transform .55s var(--jelly),opacity .15s}
      .hl.on{opacity:1}
      .i{position:relative;display:flex;align-items:center;gap:14px;min-height:60px;padding:8px 10px;border-radius:18px;cursor:default;
        transition:transform .5s var(--jelly);animation:rin .6s var(--jelly) both;animation-delay:calc(120ms + var(--n) * 55ms)}
      @keyframes rin{from{opacity:0;transform:translateY(${12 * dy}px) scale(.94)}}
      .i:not(.cur):hover{background:var(--chip)}
      .i.cur{transform:translateX(3px)}
      .i:active{transform:scale(.96)}
      .av{position:relative;width:44px;height:44px;flex:none;border-radius:15px;display:grid;place-items:center;color:#fff;font:800 19px var(--display);letter-spacing:-.02em;overflow:hidden;
        background:linear-gradient(180deg,rgba(255,255,255,.34),transparent 55%),var(--nova);filter:hue-rotate(calc(var(--n) * 42deg));box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -3px 6px rgba(0,0,0,.14),0 8px 18px color-mix(in srgb,var(--accent) 40%,transparent)}
      .av svg{width:20px;height:20px}
      .tx{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
      .u{font:750 15px/1.2 var(--sans);letter-spacing:-.012em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .d{color:var(--fg3);font-size:12px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:550}
      .d.dots{letter-spacing:3px;font-size:10px}
      .pw{font:650 15.5px/1.25 ui-monospace,"SF Mono",Menlo,Consolas,monospace;letter-spacing:.02em;color:var(--fg);white-space:nowrap;padding:7px 10px;margin:3px 0 2px;border-radius:11px;background:var(--chip);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden;text-overflow:ellipsis}
      .pw .n{color:var(--accent);font-weight:800}.pw .up{color:color-mix(in srgb,var(--accent3) 70%,var(--fg))}.pw .h{color:var(--fg3)}
      .meter{display:flex;align-items:center;gap:4px;font:700 11px var(--sans);color:var(--fg2)}
      .meter i{width:26px;height:5px;border-radius:5px;background:var(--nova);box-shadow:0 0 8px color-mix(in srgb,var(--accent) 55%,transparent);transform-origin:0 50%;animation:bar .6s var(--jelly) both;animation-delay:calc(280ms + var(--k) * 90ms)}
      @keyframes bar{from{transform:scaleX(0);opacity:0}}
      .meter{white-space:nowrap}.meter span{margin-left:8px}.meter em{font-style:normal;color:var(--fg3);margin-left:auto;padding-left:8px}
      .i.gen .av{display:none}.i.gen{padding:10px 12px}
      .go{flex:none;display:flex;align-items:center;gap:6px;height:30px;padding:0 13px;border-radius:999px;color:#fff;font:750 12px var(--sans);background:var(--nova);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 16px color-mix(in srgb,var(--accent) 45%,transparent);opacity:0;transform:scale(.6) translateX(-6px);transition:opacity .15s,transform .5s var(--jelly)}
      .go svg{width:12px;height:12px}
      .i.cur .go{opacity:1;transform:none}
      .f{position:relative;z-index:4;display:flex;gap:6px;align-items:center;padding:11px 18px 13px;border-top:1px solid var(--line);background:color-mix(in srgb,var(--accent) 4%,transparent);color:var(--fg3);font-size:11.5px;font-weight:600;white-space:nowrap}
      .f .sp{flex:1}.f .lk{display:flex;align-items:center;gap:6px;color:var(--fg2)}.f .lk b{width:18px;height:18px;border-radius:6px;display:grid;place-items:center;color:#fff;background:var(--nova)}.f .lk svg{width:10px;height:10px}
      /* the header is a rich, dark aurora in every theme: deep ink, vivid colour fields (accent, deep pink, cyan),
         a dot texture and orbit rings, white type; the selection is a solid glossy colour bar, like macOS but more */
      .hb{color:#fff;background:radial-gradient(85% 150% at 0% 0%,color-mix(in oklab,var(--accent) 95%,transparent),transparent 65%),radial-gradient(70% 140% at 100% 0%,oklch(.62 .27 0 / .95),transparent 65%),radial-gradient(80% 150% at 70% 140%,color-mix(in oklab,var(--accent3) 95%,transparent),transparent 65%),radial-gradient(55% 120% at 30% 140%,oklch(.76 .17 205 / .85),transparent 65%),color-mix(in oklab,var(--accent) 30%,#07081a);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.32),inset 0 -1px 0 rgba(0,0,0,.45)}
      .hb::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(rgba(255,255,255,.28) 1px,transparent 1.5px) 0 0/12px 12px;-webkit-mask:linear-gradient(100deg,transparent 35%,#000 80%);mask:linear-gradient(100deg,transparent 35%,#000 80%);opacity:.55}
      .hb::after{left:auto;right:-70px;top:-90px;bottom:auto;width:250px;height:250px;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 21px,rgba(255,255,255,.13) 21px 22px);z-index:-1}
      .blob{display:none}.pool{background:radial-gradient(closest-side,rgba(255,255,255,.22),transparent)}
      .hart{color:#fff;opacity:.16}
      .hic{box-shadow:0 14px 30px rgba(0,0,0,.4),0 0 0 7px rgba(255,255,255,.1),inset 0 1px 0 rgba(255,255,255,.65),inset 0 -3px 8px rgba(0,0,0,.2)}.hic::after{border-color:rgba(255,255,255,.22)}
      .hb .gt{background:linear-gradient(120deg,#fff 45%,color-mix(in srgb,var(--accent3) 35%,#fff));-webkit-background-clip:text;background-clip:text;color:transparent}
      .hb .s{color:rgba(255,255,255,.74)}
      .bd{background:rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.32),inset 0 0 0 .5px rgba(255,255,255,.2),0 6px 16px rgba(0,0,0,.25)}.bd b{color:#fff}.bd small{color:rgba(255,255,255,.62)}
      .m{box-shadow:var(--spec),var(--caustic),0 0 0 .5px rgba(0,0,0,.35),0 2px 6px rgba(14,18,40,.12),0 22px 50px color-mix(in srgb,var(--accent) 38%,rgba(14,18,40,.2)),0 14px 50px -10px oklch(.6 .27 0 / .4)}
      .deck{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 60%,#0b0c16),color-mix(in srgb,oklch(.6 .27 0) 40%,#0b0c16));box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 12px 30px color-mix(in srgb,var(--accent) 35%,transparent)}
      .d1{opacity:.9}.d2{opacity:.6}
      .hl{background:linear-gradient(180deg,rgba(255,255,255,.28),transparent 55%),var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -2px 6px rgba(0,0,0,.15),0 8px 22px color-mix(in srgb,var(--accent) 50%,transparent)}
      .i.cur .u{color:#fff}.i.cur .d{color:rgba(255,255,255,.82)}
      .i.cur .av{box-shadow:0 0 0 2px rgba(255,255,255,.65),0 6px 14px rgba(0,0,0,.25)}
      .i.cur .go{background:rgba(255,255,255,.24);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 0 0 .5px rgba(255,255,255,.4)}
      .i.cur .pw{background:rgba(0,0,0,.2);box-shadow:inset 0 1px 2px rgba(0,0,0,.25);color:#fff}.i.cur .pw .n{color:#ffe27a}.i.cur .pw .up{color:#bdf4ff}.i.cur .pw .h{color:rgba(255,255,255,.5)}
      .i.cur .meter{color:#fff}.i.cur .meter i{background:#fff;box-shadow:0 0 8px rgba(255,255,255,.6)}.i.cur .meter em{color:rgba(255,255,255,.7)}
      .f{background:rgba(0,0,0,.18)}
      /* obsidian glass in every theme: a deep tinted body under the aurora, never washed-out white */
      .nv{--fg:#f5f6fc;--fg2:rgba(245,246,252,.74);--fg3:rgba(245,246,252,.52);--line:rgba(255,255,255,.12);--chip:rgba(255,255,255,.08);--glint:.18;--glass:linear-gradient(180deg,color-mix(in srgb,var(--accent) 16%,rgba(26,28,44,.93)),color-mix(in srgb,oklch(.6 .27 0) 9%,rgba(12,13,22,.95)));--edge:linear-gradient(140deg,rgba(255,255,255,.8),color-mix(in srgb,var(--accent) 80%,transparent) 22%,rgba(255,255,255,.05) 48%,rgba(255,255,255,.02) 66%,color-mix(in srgb,var(--accent3) 85%,transparent) 92%);--spec:inset 0 1px 0 rgba(255,255,255,.26),inset 0 -1px 0 rgba(0,0,0,.35);--caustic:inset 0 -22px 36px -28px color-mix(in srgb,var(--accent3) 75%,transparent);color:var(--fg);color-scheme:dark}
    </style><div class="nv"><div class="fr"></div><div class="mw"><span class="deck d2"></span><span class="deck d1"></span>
      <div class="m glass" role="listbox" aria-label="${title}">
      <div class="hb"><span class="blob b1"></span><span class="blob b2"></span><span class="pool"></span><span class="sweep"></span>
        <svg class="hart" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width=".7" stroke-linecap="round" stroke-linejoin="round">${bare}</svg>
        <span class="hic">${icon}</span><span class="htx"><div class="t gt"></div><div class="s"></div></span>${badge ? '<span class="bd"><b></b><small></small></span>' : ''}</div>
      <div class="l"><span class="hl"></span>${rows.map((_, i) => `<div class="i" role="option" aria-selected="false" style="--n:${i}"><span class="av"></span><span class="tx"><span class="u"></span><span class="d"></span></span><span class="go">${goWord}${enter}</span></div>`).join('')}</div>
      <div class="f"><kbd>&#8593;</kbd><kbd>&#8595;</kbd><span>choose</span><kbd>Return</kbd><span>${kind === 'passkey' ? 'sign in' : gen ? 'use' : 'fill'}</span><span class="sp"></span><span class="lk"><b><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="2.5" y="5.5" width="7" height="5" rx="1.4"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5"/></svg></b>On this device</span></div></div></div></div>`
    sh.querySelector('.t').textContent = title
    sh.querySelector('.s').textContent = sub
    if (badge) { sh.querySelector('.bd b').textContent = badge.n; sh.querySelector('.bd small').textContent = badge.label }
    const items = [...sh.querySelectorAll('.i')]
    items.forEach((el, i) => {
      const row = rows[i], name = String(row.name || '').trim() || 'No username'
      el.querySelector('.u').textContent = name
      if (row.icon) el.querySelector('.av').innerHTML = row.icon
      else el.querySelector('.av').textContent = (name[0] || '?').toUpperCase()
      const d = el.querySelector('.d')
      if (row.pw) {
        // the suggested password, digits and capitals picked out, and how strong it is
        const pw = document.createElement('span'); pw.className = 'pw'
        for (const ch of row.pw) { const s = document.createElement('span'); s.className = /\d/.test(ch) ? 'n' : /[A-Z]/.test(ch) ? 'up' : ch === '-' ? 'h' : ''; s.textContent = ch; pw.appendChild(s) }
        d.replaceWith(pw); el.classList.add('gen')
        const m = document.createElement('span'); m.className = 'meter'
        m.innerHTML = '<i style="--k:0"></i><i style="--k:1"></i><i style="--k:2"></i><i style="--k:3"></i><span></span><em></em>'
        m.querySelector('span').textContent = 'Very strong'; m.querySelector('em').textContent = row.bits || ''
        pw.after(m)
      } else if (row.detail) d.textContent = row.detail
      else { d.classList.add('dots'); d.textContent = '•••••••••' }
      el.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); onPick(i) })
    })
    const nv = sh.querySelector('.nv'), card = sh.querySelector('.m'), hl = sh.querySelector('.hl')
    let cur = -1
    const setCur = i => {
      cur = i
      items.forEach((el, j) => { el.classList.toggle('cur', j === i); el.setAttribute('aria-selected', String(j === i)) })
      const it = items[i]
      if (!it) return
      // the first time it appears in place; after that it slides from row to row on the jelly spring
      const first = !hl.classList.contains('on')
      if (first) hl.style.transition = 'none'
      hl.style.height = it.offsetHeight + 'px'; hl.style.transform = `translateY(${it.offsetTop}px)`
      if (first) { hl.classList.add('on'); void hl.offsetWidth; hl.style.transition = '' }
      it.scrollIntoView({ block: 'nearest' })
    }
    items.forEach((el, i) => el.addEventListener('mouseenter', () => setCur(i)))
    // the page only ever sees an empty div; nothing it can read is in it
    document.documentElement.appendChild(host)
    glint(card)
    requestAnimationFrame(() => requestAnimationFrame(() => nv.classList.add('on')))
    const close = now => {
      if (!host.isConnected) return
      if (STILL || now) { host.remove(); return }
      nv.classList.remove('on'); nv.classList.add('off'); setTimeout(() => host.remove(), 200)
    }
    const move = d => setCur(((cur < 0 && d < 0 ? 0 : cur) + d + items.length) % items.length)
    return { host, close, move, get cur() { return cur } }
  }
  // 4.1 drawing kit for the swipe bead and the speed badge: a static grain tile and two layers of specks that drift
  // once while the piece is on screen (transform and opacity only; still under Motion Off / reduced motion)
  const GRAIN41 = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAQAAAACj/OVAAAGtklEQVR42l1YSZIkMQjjyIkT//8q04kWXBMdFV2Vi41BCEFMREX+ffrvW/x9cjq+b4nPXvv7hrv7V/ut9u5ej28NfL53vv94u3cV/n2/pvzw3y1s1ftI72K5ZvwtsZvsh/eaW37Xmp/ku8nf3ya1m/TfGimzsX/C8rUt99S1CyQOsNbtHRm2z9e+27B/jfsW/9Zsmob3OnSA0oFlwXeaCDpx5LC/638vf+es3XRPiqswg9spLPAGPIN15L36Dr3WwG3rFNqEh+m8fQ4v0FmKJSO/C9fn5v3/PYu38U4PAhf3gv5/EMJp4Ih1Cs+RAIFB9S3Tgzh9b8KhxWhhzRL01h8N73Op4EPfdry+C+L3XoOBtD7k8AaU1icwCniIexeh+ru3GzWRt0CZjQax23Dcoo2mXdLs2VJvDjZfEEUwokVQvWYQMOWc41k2eoQ6zOBii10+sc6n/U0HZlzU4eBe0MAvtEL2JfPGkSBO5dAm5EvJQfA0I9s/iV7wAvwFZAcAO3q9cGsTFfavbYR3I1KDOAPo6ext00Mz1YKO1xljjLk6/kC8kPYgJC5R5+TFLlyahDw85VjqpCC/fQKrmhHaAccpQXqgry+C+7eOJK+uYblkUIqn+akHhsKIcmJkkDmVhy0aBoVHEYkNGnvO6IQnfzaTongqmM37kQxP6nQd5hdXgxq5Ln4/ZM/ycmXaTpoUriWKbQ+ogTRkqqJjk0t+hqzTzLA6aZKkyaP7JMAP5y/3DDwjb31r0ea9aQDBzcbbbhrm0vpNaoYiTOeNKAqK5lsAz/WPeUZezyH7Tz+FFUQFboEZyDGgFSuAyPone7ESQUMWHXP6KOmL8G/zUTvZ4fBSNKPixzusPnf92f7kQK8LmLxKBnER+IjFLGkvKZDVBTRg+l641SkAljyegGyA6u549SihFakMVfoWu4wqfDJri8Wp7DluS1aSHFiLWzeUHHGiQpomiETBoJ0cxVg2U6rpvRS4wDRNaYBaTRAPKf2NsPWNVEw+8TTJU5JBfm16kBRBFAwvSMrCiFqunaNIbpCC2LKogxTBIg9TTtm9PBLf2s0EdQU85tRM0elyOeMocp9Tr+IUxlfEdnQB/MOpiUCfEPbJyJ+uhq4tpHNqWSBZ2mGZKON8ISnWgLoKKJKXi4/5j2pake2DD4ldS5eqvAp0sGCfg6myxZ6s+0VgJHMISS8ZrFpS43pAIQV8nxghgZOhiyj1Q0dPqh2v7pJLVIDYW5B9itxpXaqc5ratkvCUGz5iOXVwGGaW+gqQGvGcNLjnKCMtgnPk5CbLLg57wrzQtFtaXDx4Cg5YhuwtLX4Ac0/VTHigRMqOhbbiEe/XXbgVi0d+tJI8eO4QBytr8+Slta0y8ZFPgESSqk82NemrTOYZxvCEeykxLlFB8aHjSDmctqJclNRJ+jwephT3sk7QI8s17J/O7UEppuLW8sPWaEar59jBbIPsYhujSh5ipLjWLaXQJSiAzwDZNXtQFRc3z/GDWPZBxJ7TQ4LYLXjZEHWErJRsYbR6nyiXMtkkZx6mzwn7i7mmuu72lDKing4Kur0tqFGoUyHP0zE8I1IXXYZ7JBK0qmaakMN4fSiQFcdxRHki9iiPWhQeT1visYF6KBGgyLmfZCoVK/bMQbSXMsL6ks4ICntrcnY/5bpYRmC4p7D6phxBYFDW3GkA1zmmVydrst5TGEltHZhEYnOzm7Q+TcuOFzLSvaxiFwVpVDHDldxT4L+KBpmZ6kPm9Lm6f+S3U0bgQM6dYGozoBD7A3k9F6d70lJS0lMFW8fKn6LqOJ2SZLPDxUtdFGcvTh3XlNRY4gYUZNOio48DH/Hwbks2dVf8oJR2M6WerjJOKDpHQeR5HT7AURI9qgnveE7ErKvaYGquyUmrAs4I1KtIiECLear0zNYqHm585ojXmKv/d2IP+QTkwPpjL8Z//S9LE3up63WvQ0xP4MqQL3MmVSpD0FdRRYE4+dE3kQT+o4iy4JfY0LDvIj9qzKXybiJXaoM4TtvRF1N8NIPIB3cdrmyeyUjSKkvhvB5Gl6zUFpoVGgkhJ0lezjhJJgsFyOS22gmrtuOeIo2pf7ieQxiQTGQUwHyMFhVZ/VZAS4x8yq6osKXeVBVpfLE7oYTcb1cFPJ7SoFGDVU5CuQDVjhsDYzjK2k5EwcIQJ1wcKQNfg8oxn7K0svheY27sYoTAYafn4SJL9v+UZxUaIl9iil0xcDbBJSdNElatThe5OBpIa6iSngJIsQMtI8lHdckz3rxa9omuyq1YXXfozqQ0/nrmF5DNjP0/BrKunYJNSMYAAAAASUVORK5CYII=")'
  const MOTES41 = `.gr{position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;background:${GRAIN41};mix-blend-mode:overlay;opacity:.9}
    .mt{position:absolute;inset:-10%;z-index:-1;pointer-events:none;opacity:0}
    .mt.a{background:radial-gradient(1.8px 1.8px at 14% 30%,#fff,transparent),radial-gradient(1.3px 1.3px at 38% 78%,rgba(255,255,255,.8),transparent),radial-gradient(2.2px 2.2px at 70% 24%,#fff,transparent),radial-gradient(1.2px 1.2px at 86% 66%,rgba(255,255,255,.7),transparent);animation:mta 1.8s .1s ease-out both}
    .mt.b{background:radial-gradient(1.2px 1.2px at 24% 62%,rgba(255,255,255,.75),transparent),radial-gradient(2px 2px at 58% 44%,#fff0fa,transparent),radial-gradient(1.4px 1.4px at 44% 12%,rgba(255,255,255,.7),transparent),radial-gradient(1.6px 1.6px at 8% 86%,rgba(255,255,255,.7),transparent);animation:mtb 2.2s .2s ease-out both}
    @keyframes mta{0%{opacity:0;transform:translate3d(0,8px,0)}30%{opacity:.9}100%{opacity:.55;transform:translate3d(4px,-8px,0)}}
    @keyframes mtb{0%{opacity:0;transform:translate3d(0,-4px,0)}35%{opacity:.7}100%{opacity:.35;transform:translate3d(-5px,7px,0)}}`
  if (QOL.swipe && window === window.top) {
    let acc = 0, timer = null, ui = null
    const canScrollX = (el, dir) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        if (n.scrollWidth > n.clientWidth + 1) {
          const ov = getComputedStyle(n).overflowX
          if (ov === 'auto' || ov === 'scroll') { if (dir < 0 ? n.scrollLeft > 0 : n.scrollLeft + n.clientWidth < n.scrollWidth - 1) return true }
        }
      }
      const se = document.scrollingElement
      return se && (dir < 0 ? se.scrollLeft > 0 : se.scrollLeft + innerWidth < se.scrollWidth - 1)
    }
    // 4.1: a gem of colour slides in from the edge on a pool of saturated light. A glass bead with a spectral ring that
    // fills as you swipe; when letting go will go, it floods with the banner gradient (pink, violet, cyan), squishes on
    // a jelly spring and a hero tag springs out beside it: a colour banner with a huge word and a giant faded arrow
    // bleeding off its edge. Only transform and opacity move; two blurs at most (the bead; the tag is opaque colour).
    const show = p => {
      if (!ui) {
        const { host, sh } = surface('right:0;bottom:0;pointer-events:none')
        const AR = '<path d="M10 3.5 5.5 8l4.5 4.5"/>'
        sh.innerHTML = `<style>${novaCSS()}
          .nv{position:fixed;inset:0;pointer-events:none;--pink:#ec3d97;--amber:#ffad33;--cyan:#22c4e8;
            --banner:radial-gradient(70% 120% at 0% 0%,rgba(255,255,255,.4),transparent 60%),radial-gradient(60% 140% at 100% 100%,color-mix(in srgb,var(--cyan) 70%,transparent),transparent 70%),linear-gradient(120deg,var(--pink),var(--accent2) 52%,var(--accent))}
          .edge{position:absolute;top:0;bottom:0;left:0;width:240px;opacity:0;
            background:radial-gradient(48% 34% at 0% 50%,color-mix(in srgb,var(--pink) 55%,transparent),transparent 100%),radial-gradient(70% 58% at 0% 46%,color-mix(in srgb,var(--accent2) 36%,transparent),transparent 100%),radial-gradient(40% 70% at 0% 60%,color-mix(in srgb,var(--cyan) 22%,transparent),transparent 100%)}
          .edge::after{content:'';position:absolute;left:0;top:18%;bottom:18%;width:3px;border-radius:3px;background:linear-gradient(180deg,transparent,var(--pink) 30%,var(--accent2) 55%,var(--cyan) 80%,transparent);box-shadow:0 0 18px var(--pink),0 0 4px #fff}
          .edge.r{left:auto;right:0;transform:scaleX(-1)}
          .w{position:absolute;top:50%;width:76px;height:76px;margin-top:-38px}
          .c{position:absolute;inset:0;border-radius:50%;display:grid;place-items:center;color:var(--fg);transition:transform .5s var(--jelly)}
          .c.glass{box-shadow:var(--spec),var(--caustic),0 14px 34px -8px color-mix(in srgb,var(--pink) 45%,transparent),0 0 0 6px color-mix(in srgb,var(--accent) 10%,transparent),var(--shadow)}
          .c .fill{position:absolute;inset:4px;border-radius:50%;z-index:1;background:var(--banner);opacity:0;transform:scale(.3);transition:opacity .16s,transform .55s var(--jelly);
            box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -10px 16px -8px rgba(40,0,60,.4),0 12px 34px color-mix(in srgb,var(--pink) 60%,transparent),0 0 46px color-mix(in srgb,var(--accent2) 50%,transparent)}
          .c .fill::after{content:'';position:absolute;left:14%;right:14%;top:7%;height:40%;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,0))}
          .c.go .fill{opacity:1;transform:none}
          .c svg.ar{position:relative;z-index:4;width:30px;height:30px;color:color-mix(in srgb,var(--accent) 70%,var(--fg));transition:transform .5s var(--jelly)}
          .c.go svg.ar{transform:scale(1.2);color:#fff;filter:drop-shadow(0 2px 3px rgba(60,0,60,.4))}
          .ring{position:absolute;inset:-4px;width:84px;height:84px;z-index:4;transform:rotate(-90deg);overflow:visible}
          .ring circle{fill:none;stroke-width:3.5;stroke-linecap:round}
          .ring .bg{stroke:color-mix(in srgb,var(--accent) 16%,transparent)}
          .ring .fg{stroke:url(#swg);stroke-dasharray:251;stroke-dashoffset:251}
          .lb{position:absolute;isolation:isolate;top:50%;width:212px;margin-top:-38px;height:76px;border-radius:26px;overflow:hidden;opacity:0;transform:translateX(-14px) scale(.8);transition:opacity .16s,transform .6s var(--jelly);
            background:var(--banner);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -14px 24px -16px rgba(40,0,60,.45),0 18px 40px -12px color-mix(in srgb,var(--pink) 70%,transparent),0 0 0 1px rgba(255,255,255,.22)}
          .lb::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;background:linear-gradient(120deg,rgba(255,255,255,.9),rgba(255,255,255,.15) 40%,rgba(255,255,255,.55));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
          .lb .wm{position:absolute;right:-26px;top:-30px;width:130px;height:130px;color:#fff;opacity:.2;transform:rotate(-8deg)}
          .lb .pool{position:absolute;left:-30px;top:-50px;width:160px;height:100px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.45),transparent)}
          .lb .in{position:relative;display:flex;flex-direction:column;justify-content:center;height:100%;padding:0 20px}
          .lb .tx{font:850 30px/1 var(--display);letter-spacing:-.045em;text-shadow:0 2px 14px rgba(60,0,60,.3)}
          .lb small{display:block;font:700 11px/1.2 var(--sans);color:rgba(255,255,255,.85);margin-top:5px;letter-spacing:.01em}
          .w .lb{top:0;margin-top:0}
          .w.l .lb{left:90px}.w.r .lb{right:90px;transform:translateX(14px) scale(.8)}.w.r .lb .wm{right:auto;left:-26px;transform:rotate(8deg) scaleX(-1)}
          .c.go~.lb{opacity:1;transform:none}
          ${MOTES41}.lb .mt{animation-play-state:paused}.c.go~.lb .mt{animation-play-state:running}</style>
          <div class="nv"><div class="edge"></div><div class="w"><div class="c glass"><span class="fill"></span><svg class="ring" viewBox="0 0 84 84"><defs><linearGradient id="swg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ec3d97"/><stop offset=".5" stop-color="${ACC}"/><stop offset="1" stop-color="#22c4e8"/></linearGradient></defs><circle class="bg" cx="42" cy="42" r="40"/><circle class="fg" cx="42" cy="42" r="40"/></svg><svg class="ar" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${AR}</svg></div><div class="lb"><span class="gr"></span><span class="mt a"></span><span class="mt b"></span><span class="pool"></span><svg class="wm" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${AR}</svg><div class="in"><span class="tx"></span><small>Let go to leave this page</small></div></div></div></div>`
        document.documentElement.appendChild(host)
        ui = { host, sh, w: sh.querySelector('.w'), c: sh.querySelector('.c'), ring: sh.querySelector('.ring .fg'), edge: sh.querySelector('.edge'), tx: sh.querySelector('.lb .tx'), lb: sh.querySelector('.lb'), lens: false }
      }
      const back = p < 0, k = Math.min(1, Math.abs(p) / 220)
      const x = Math.round(k * 96 - 76)
      ui.w.className = 'w ' + (back ? 'l' : 'r')
      // the bead rides on transform only: pinned to its edge, slid in with translateX
      ui.w.style.left = back ? '0' : ''; ui.w.style.right = back ? '' : '0'
      ui.w.style.transform = `translateX(${back ? x : -x}px)`
      ui.edge.className = 'edge' + (back ? '' : ' r'); ui.edge.style.opacity = String(Math.min(1, k * 1.2) * (k >= 1 ? 1 : 0.7))
      const go = k >= 1
      if (ui.c.classList.contains('go') !== go) { ui.c.classList.toggle('go', go); ui.tx.textContent = back ? 'Back' : 'Forward' }
      ui.c.style.transform = `scale(${0.6 + k * 0.4}) rotate(${back ? 0 : 180}deg)`; ui.c.style.opacity = String(Math.min(1, k * 1.8))
      ui.ring.style.strokeDashoffset = String(251 * (1 - k))
    }
    const reset = () => { acc = 0; if (ui) { ui.host.remove(); ui = null } }
    addEventListener('wheel', e => {
      if (e.ctrlKey || Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5 || Math.abs(e.deltaX) < 1) return
      const dir = Math.sign(e.deltaX)
      if (acc === 0 && canScrollX(e.target, dir)) return
      if (acc !== 0 && Math.sign(acc) !== dir && Math.abs(acc) < 30) { reset(); return }
      acc += e.deltaX
      show(acc)
      clearTimeout(timer)
      timer = setTimeout(() => { if (Math.abs(acc) >= 220) ipcRenderer.send('nav:swipe', acc < 0 ? 'back' : 'forward'); reset() }, 140)
    }, { passive: true, capture: true })
  }
  if (QOL.speed && !/(^|\.)youtube\.com$/.test(location.hostname)) {
    let badge = null
    addEventListener('keydown', e => {
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || (e.key !== '>' && e.key !== '<')) return
      const a = document.activeElement
      if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return
      const vids = [...document.querySelectorAll('video')].filter(v => v.readyState > 0)
      const v = vids.find(v => !v.paused) || vids.sort((x, y) => y.clientWidth * y.clientHeight - x.clientWidth * x.clientHeight)[0]
      if (!v) return
      e.preventDefault(); e.stopPropagation()
      v.playbackRate = Math.max(0.25, Math.min(4, Math.round((v.playbackRate + (e.key === '>' ? 0.25 : -0.25)) * 100) / 100))
      // 4.1: a hero capsule over the video. A colour banner on the left (pink to violet to cyan, a light pool, a giant
      // faded dial bleeding off its edge) holds a glossy dial tile whose needle swings to the speed; then the huge
      // number in gradient type, and a meter of light from 0.25x to 4x with marks at 1x and 2x.
      // One blur (the capsule). The meter grows with scaleX, the number pops once: transform and opacity only.
      if (!badge || !badge.host.isConnected) {
        const { host, sh } = surface('transform:translateX(-50%);pointer-events:none')
        host.id = '__lumen_speed'
        const DIAL = '<path d="M2.5 11.5a5.5 5.5 0 1 1 11 0"/><path class="nd" d="m8 11.5 3-4"/><circle cx="8" cy="11.5" r=".6" fill="currentColor"/>'
        const pct = r => ((r - 0.25) / 3.75 * 100).toFixed(2) + '%'
        sh.innerHTML = `<style>${novaCSS()}
          .nv{--pink:#ec3d97;--amber:#ffad33;--cyan:#22c4e8;
            --banner:radial-gradient(70% 120% at 0% 0%,rgba(255,255,255,.42),transparent 60%),radial-gradient(70% 140% at 100% 100%,color-mix(in srgb,var(--cyan) 70%,transparent),transparent 70%),linear-gradient(130deg,var(--pink),var(--accent2) 55%,var(--accent))}
          .p{display:flex;align-items:stretch;gap:0;padding:6px;border-radius:30px;opacity:0;transform:translateY(-14px) scale(.82);transition:opacity .18s,transform .7s var(--jelly)}
          .p.on{opacity:1;transform:none}
          .p.glass{box-shadow:var(--spec),var(--caustic),0 0 0 6px color-mix(in srgb,var(--accent) 9%,transparent),0 22px 50px -16px color-mix(in srgb,var(--pink) 55%,transparent),var(--shadow)}
          .bn{position:relative;z-index:4;width:84px;border-radius:24px;overflow:hidden;display:grid;place-items:center;background:var(--banner);
            box-shadow:inset 0 1px 0 rgba(255,255,255,.65),inset 0 -12px 20px -14px rgba(40,0,60,.5),0 10px 26px -8px color-mix(in srgb,var(--pink) 70%,transparent)}
          .bn .wm{position:absolute;right:-30px;bottom:-34px;width:104px;height:104px;color:#fff;opacity:.2;transform:rotate(-14deg)}
          .bn .pool{position:absolute;left:-20px;top:-40px;width:110px;height:80px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.5),transparent)}
          .tile{position:relative;width:52px;height:52px;border-radius:18px;color:#fff;
            background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.08) 55%),rgba(255,255,255,.14);
            box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(255,255,255,.4),0 0 0 5px rgba(255,255,255,.12),0 10px 22px -6px rgba(40,0,60,.45)}
          .tile svg{width:28px;height:28px;filter:drop-shadow(0 2px 2px rgba(40,0,60,.35))}
          .tile .nd{transform-origin:8px 11.5px;transition:transform .6s var(--jelly)}
          .tx{position:relative;z-index:4;display:flex;flex-direction:column;justify-content:center;gap:7px;padding:8px 22px 9px 18px}
          .row{display:flex;align-items:baseline;gap:12px}
          .n{display:inline-block;font:850 40px/.95 var(--display);letter-spacing:-.05em;font-variant-numeric:tabular-nums;padding-right:3px;
            background:linear-gradient(120deg,var(--fg) 15%,color-mix(in srgb,var(--pink) 80%,var(--fg)) 60%,var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
          .lbl{font:800 10px/1.15 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--fg3);margin-left:auto;text-align:right}
          .lbl b{display:block;font:800 12.5px/1.1 var(--display);letter-spacing:-.01em;text-transform:none;color:color-mix(in srgb,var(--pink) 70%,var(--fg));margin-top:2px}
          .m{position:relative;width:200px;height:9px;border-radius:9px;background:var(--chip);box-shadow:inset 0 1px 2px rgba(0,0,0,.14),inset 0 0 0 1px var(--line);overflow:visible}
          .m i{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,var(--cyan),var(--accent) 35%,var(--accent2) 65%,var(--pink));
            box-shadow:0 0 12px color-mix(in srgb,var(--pink) 60%,transparent),inset 0 1px 0 rgba(255,255,255,.55);transform-origin:0 50%;transform:scaleX(0);transition:transform .6s var(--spring)}
          .m b{position:absolute;top:-4px;bottom:-4px;width:2px;border-radius:2px;background:var(--fg3)}
          .m b::after{position:absolute;top:13px;left:50%;transform:translateX(-50%);font:800 8.5px/1 var(--sans);color:var(--fg3);letter-spacing:.02em}
          .m b.x1{left:${pct(1)}}.m b.x1::after{content:'1x'}.m b.x2{left:${pct(2)}}.m b.x2::after{content:'2x'}
          .hint{display:flex;align-items:center;gap:4px;font:650 10.5px var(--sans);color:var(--fg3);margin-top:9px}.hint kbd{padding:2px 5px;font-size:9.5px}
          .pop .n{animation:pop .55s var(--jelly)}@keyframes pop{from{transform:scale(1.28) translateY(-2px)}}
          .pop .tile{animation:tpop .6s var(--jelly)}@keyframes tpop{from{transform:scale(.86) rotate(-8deg)}}
          ${MOTES41}</style>
          <div class="nv"><div class="p glass" role="status" aria-live="polite"><span class="sweep"></span><span class="bn"><span class="gr"></span><span class="mt a"></span><span class="mt b"></span><span class="pool"></span><svg class="wm" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round">${DIAL}</svg><span class="tile"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${DIAL}</svg></span></span><span class="tx"><span class="row"><span class="n"></span><span class="lbl">Playback<b>Speed</b></span></span><span class="m"><i></i><b class="x1"></b><b class="x2"></b></span><span class="hint"><kbd>Shift</kbd><kbd>&lt;</kbd><kbd>&gt;</kbd> slower, faster</span></span></div></div>`
        document.documentElement.appendChild(host)
        badge = { host, sh, pill: sh.querySelector('.p'), lens: false }
      }
      const r = v.getBoundingClientRect(), { host, sh, pill } = badge
      host.style.left = Math.round(Math.max(170, Math.min(innerWidth - 170, r.left + r.width / 2))) + 'px'; host.style.top = Math.max(10, Math.round(r.top + 22)) + 'px'
      sh.querySelector('.n').textContent = v.playbackRate + 'x'
      sh.querySelector('.m i').style.transform = `scaleX(${((v.playbackRate - 0.25) / 3.75).toFixed(3)})`
      sh.querySelector('.tile .nd').style.transform = `rotate(${Math.max(-60, Math.min(80, (v.playbackRate - 1) * 30))}deg)`
      pill.classList.remove('pop'); void pill.offsetWidth; pill.classList.add('on', 'pop')
      clearTimeout(badge.t); badge.t = setTimeout(() => { pill.classList.remove('on'); badge.t2 = setTimeout(() => { if (badge && !pill.classList.contains('on')) { badge.host.remove(); badge = null } }, 400) }, 1200)
      clearTimeout(badge.t2)
    }, true)
  }

  // ------------------------------------------------------------ Reader mode (src/reader.js runs in this world): remember its choices
  globalThis.__lumenReaderSave = prefs => { try { ipcRenderer.send('reader:prefs', prefs) } catch {} }
  globalThis.__lumenReaderPos = v => { try { ipcRenderer.send('reader:pos', +v) } catch {} }

  // ------------------------------------------------------------ YouTube: its service worker serves a half-loaded page in
  // Lumen (the navigation preload it relies on gets cancelled), so Shorts never load. YouTube runs fine without one.
  if (/(^|\.)youtube\.com$/.test(location.hostname)) {
    try {
      contextBridge.executeInMainWorld({
        func: () => {
          try {
            const SWC = window.ServiceWorkerContainer
            if (SWC) SWC.prototype.register = function () { return Promise.reject(new DOMException('Service workers are turned off for this site in Lumen.', 'SecurityError')) }
            if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {})
          } catch {}
        },
      })
    } catch {}
  }

  // ------------------------------------------------------------ YouTube: notice a video that never starts (an error on the
  // player, or no picture after 20 seconds while it is meant to be playing) and tell Lumen once per video
  if (/(^|\.)youtube\.com$/.test(location.hostname)) {
    let key = '', since = 0, told = ''
    setInterval(() => {
      if (document.hidden || !/^\/(watch|shorts\/)/.test(location.pathname)) { since = 0; return }
      const k = location.pathname + location.search
      if (k !== key) { key = k; since = Date.now(); return }
      const v = document.querySelector('#movie_player video, #shorts-player video, video')
      const err = document.querySelector('.ytp-error'), errOn = !!(err && err.offsetParent !== null && err.getClientRects().length)
      const ad = !!document.querySelector('.ad-showing')
      const waiting = !v || (v.currentTime < 0.5 && !(v.paused && v.readyState >= 1))
      if (!(errOn || (waiting && !ad))) { since = Date.now(); return }
      if (told !== k && Date.now() - since > (errOn ? 4000 : 20000)) { told = k; ipcRenderer.send('yt:stuck') }
    }, 2000)
  }

  // ------------------------------------------------------------ passkeys (Lumen's own authenticator)
  try {
    contextBridge.exposeInMainWorld('__lumenPasskeys', {
      create: req => ipcRenderer.invoke('pk:create', req),
      get: req => ipcRenderer.invoke('pk:get', req),
      cond: req => ipcRenderer.invoke('pk:cond', req),
      cancel: () => ipcRenderer.invoke('pk:cond-cancel'),
    })
    contextBridge.executeInMainWorld({
      func: () => {
        const PK = window.__lumenPasskeys
        if (!PK || !navigator.credentials || !window.PublicKeyCredential) return
        const b2u = buf => {
          const b = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
          let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
          return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        }
        const u2b = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a.buffer }
        const err = (name, msg) => new DOMException(msg || 'The operation either timed out or was not allowed.', name)
        const def = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: true })
        function cred(r, kind) {
          const resp = Object.create((kind === 'create' ? AuthenticatorAttestationResponse : AuthenticatorAssertionResponse).prototype)
          def(resp, 'clientDataJSON', u2b(r.clientDataJSON))
          if (kind === 'create') {
            def(resp, 'attestationObject', u2b(r.attestationObject))
            def(resp, 'getTransports', () => ['internal', 'hybrid'])
            def(resp, 'getAuthenticatorData', () => u2b(r.authenticatorData))
            def(resp, 'getPublicKey', () => u2b(r.publicKey))
            def(resp, 'getPublicKeyAlgorithm', () => -7)
          } else {
            def(resp, 'authenticatorData', u2b(r.authenticatorData))
            def(resp, 'signature', u2b(r.signature))
            def(resp, 'userHandle', r.userHandle ? u2b(r.userHandle) : null)
          }
          const c = Object.create(PublicKeyCredential.prototype)
          const ext = kind === 'create' ? { credProps: { rk: true } } : {}
          def(c, 'id', r.id); def(c, 'rawId', u2b(r.id)); def(c, 'type', 'public-key'); def(c, 'authenticatorAttachment', 'platform'); def(c, 'response', resp)
          def(c, 'getClientExtensionResults', () => ext)
          def(c, 'toJSON', () => ({
            id: r.id, rawId: r.id, type: 'public-key', authenticatorAttachment: 'platform', clientExtensionResults: ext,
            response: kind === 'create'
              ? { clientDataJSON: r.clientDataJSON, attestationObject: r.attestationObject, authenticatorData: r.authenticatorData, transports: ['internal', 'hybrid'], publicKey: r.publicKey, publicKeyAlgorithm: -7 }
              : { clientDataJSON: r.clientDataJSON, authenticatorData: r.authenticatorData, signature: r.signature, userHandle: r.userHandle || null },
          }))
          return c
        }
        const C = navigator.credentials
        const origCreate = C.create.bind(C), origGet = C.get.bind(C)
        C.create = async function (opts) {
          if (!opts || !opts.publicKey) return origCreate(opts)
          const p = opts.publicKey
          const r = await PK.create({
            rp: { id: p.rp && p.rp.id, name: p.rp && p.rp.name },
            user: { id: p.user ? b2u(p.user.id) : '', name: p.user && p.user.name, displayName: p.user && p.user.displayName },
            challenge: b2u(p.challenge), algs: (p.pubKeyCredParams || []).map(x => x.alg), exclude: (p.excludeCredentials || []).map(x => b2u(x.id)),
          })
          if (r.error) throw err(r.error, r.message)
          return cred(r, 'create')
        }
        const reqOf = p => ({ rpId: p.rpId, challenge: b2u(p.challenge), allow: (p.allowCredentials || []).map(x => b2u(x.id)) })
        C.get = async function (opts) {
          if (!opts || !opts.publicKey) return origGet(opts)
          if (opts.signal && opts.signal.aborted) throw err('AbortError', 'Aborted')
          const p = opts.publicKey
          if (opts.mediation === 'conditional') {
            // passkey autofill: resolves when the user picks a Lumen passkey under the sign-in field
            return new Promise((res, rej) => {
              let done = false
              if (opts.signal) opts.signal.addEventListener('abort', () => { if (done) return; done = true; PK.cancel(); rej(err('AbortError', 'Aborted')) })
              PK.cond(reqOf(p)).then(r => { if (done) return; done = true; if (r.error) rej(err(r.error, r.message)); else res(cred(r, 'get')) },
                () => { if (!done) { done = true; rej(err('NotAllowedError')) } })
            })
          }
          const r = await PK.get(reqOf(p))
          if (r.fallback) return origGet(opts)
          if (r.error) throw err(r.error, r.message)
          return cred(r, 'get')
        }
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true
        PublicKeyCredential.isConditionalMediationAvailable = async () => true
        // sites ask this before offering "Create a passkey" or "Sign in with a passkey": tell them the truth about Lumen
        const origCaps = PublicKeyCredential.getClientCapabilities && PublicKeyCredential.getClientCapabilities.bind(PublicKeyCredential)
        PublicKeyCredential.getClientCapabilities = async () => {
          let c = {}; try { c = origCaps ? await origCaps() : {} } catch {}
          return { ...c, passkeyPlatformAuthenticator: true, userVerifyingPlatformAuthenticator: true, conditionalGet: true, conditionalCreate: false,
            'extension:prf': false, 'extension:largeBlob': false, 'extension:credBlob': false, 'extension:getCredBlob': false, 'extension:hmacCreateSecret': false }
        }
      },
    })
  } catch {}

  // passkey autofill menu: shown under a sign-in field while the site waits for a passkey
  try {
    let pk = null, pkList = []
    const closePk = () => { if (pk) { pk.close(); pk = null } }
    const pickPk = i => { const c = pkList[i]; if (pk) { pk.close(true); pk = null } if (c) ipcRenderer.invoke('pk:pick', c.credId).catch(() => {}) }
    const wantsPasskey = el => el && el.tagName === 'INPUT' && /\bwebauthn\b/i.test(el.getAttribute('autocomplete') || '')
    document.addEventListener('focusin', async e => {
      const el = e.target
      if (!wantsPasskey(el)) return
      let list = []; try { list = await ipcRenderer.invoke('pk:accounts') } catch {}
      if (!list.length || document.activeElement !== el) return
      closePk()
      pkList = list
      const site = location.hostname.replace(/^www\./, '')
      pk = accountMenu(el, {
        kind: 'passkey', title: 'Lumen Passkeys',
        sub: (list.length === 1 ? '1 passkey' : list.length + ' passkeys') + (site ? ' for ' + site : ''),
        rows: list.map(c => ({ name: c.userName, detail: 'Sign in with a passkey' })),
        onPick: pickPk,
      })
    }, true)
    document.addEventListener('focusout', e => { if (wantsPasskey(e.target)) setTimeout(closePk, 150) }, true)
    // keyboard: arrows choose an account, Enter signs in, Escape closes; keys are only taken while the menu is open
    document.addEventListener('keydown', e => {
      if (!pk) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); pk.move(e.key === 'ArrowDown' ? 1 : -1) }
      else if (e.key === 'Enter' && pk.cur >= 0) { e.preventDefault(); e.stopPropagation(); pickPk(pk.cur) }
      else if (e.key === 'Escape') closePk()
    }, true)
  } catch {}

  // ------------------------------------------------------------ password manager
  let creds = null
  const isVisible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }
  const pwFields = root => [...root.querySelectorAll('input[type="password"]')].filter(isVisible)
  function userFieldFor(pw) {
    const scope = pw.form || document
    const inputs = [...scope.querySelectorAll('input')].filter(i => isVisible(i) && /^(text|email|tel|)$/.test(i.type) && !i.readOnly)
    const before = inputs.filter(i => i.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING)
    const pick = before.reverse().find(i => /user|email|login|name|account|phone|id/i.test((i.name || '') + (i.id || '') + (i.autocomplete || '') + (i.placeholder || ''))) || before[0]
    return pick || null
  }
  function setValue(el, v) {
    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    proto.set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
  function fill(c, pw) {
    const u = userFieldFor(pw)
    if (u && c.username && !u.value) setValue(u, c.username)
    setValue(pw, c.password)
  }
  async function getCreds() { if (!creds) { try { creds = await ipcRenderer.invoke('pw:get') } catch { creds = [] } } return creds }

  let menu = null, menuKeys = null
  function closeMenu(now) {
    if (menu) { menu.close(now === true); menu = null }
    if (menuKeys) { menuKeys.el.removeEventListener('keydown', menuKeys.fn, true); menuKeys = null }
  }
  // the autofill dropdown: a liquid glass card under the field, a row per saved account with its initial,
  // arrow keys and Enter to pick, Esc to close. Keys are only taken from the field while it is open.
  function menuKeysFor(anchor, m, pick) {
    const fn = e => {
      if (menu !== m) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); m.move(e.key === 'ArrowDown' ? 1 : -1) }
      else if (e.key === 'Enter' && m.cur >= 0) { e.preventDefault(); e.stopPropagation(); pick(m.cur) }
      else if (e.key === 'Escape') { e.stopPropagation(); closeMenu() }
    }
    anchor.addEventListener('keydown', fn, true); menuKeys = { el: anchor, fn }
    menu = m
  }
  // a strong password for a sign-up form: made on this device, shown only inside Lumen's menu, and only put into
  // the page when the user picks it (Lumen then offers to save it when the form is sent, as for any password)
  function strongPassword() {
    const A = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for (;;) {
      const r = crypto.getRandomValues(new Uint32Array(18)); let out = ''
      for (let i = 0; i < 18; i++) { if (i && i % 6 === 0) out += '-'; out += A[r[i] % A.length] }
      if (/[a-z]/.test(out) && /[A-Z]/.test(out) && /\d/.test(out)) return out
    }
  }
  const isNewPassword = pw => { const ac = pw.getAttribute('autocomplete') || ''; return /\bnew-password\b/i.test(ac) || (!/current-password/i.test(ac) && !!pw.form && pwFields(pw.form).length === 2) }
  function showGenerator(anchor) {
    closeMenu()
    const pass = strongPassword(), site = location.hostname.replace(/^www\./, '')
    const pick = () => { pwFields(anchor.form || document).forEach(p => { if (!p.value || p === anchor) setValue(p, pass) }); closeMenu(true) }
    const m = accountMenu(anchor, {
      kind: 'generate', title: 'Strong password', sub: 'Made on this device' + (site ? ' for ' + site : ''),
      badge: { n: '105', label: 'bits' },
      rows: [{ name: 'Use a strong password', pw: pass, bits: pass.length + ' characters', icon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.8 13.2 4v4c0 3.1-2.2 5.4-5.2 6.2C5 13.4 2.8 11.1 2.8 8V4z"/><path d="m5.6 8.1 1.7 1.7 3.2-3.4"/></svg>' }],
      onPick: pick,
    })
    menuKeysFor(anchor, m, pick)
  }
  function showMenu(anchor, list) {
    closeMenu()
    const site = location.hostname.replace(/^www\./, '')
    const pick = i => { const pw = anchor.type === 'password' ? anchor : pwFields(anchor.form || document)[0]; if (pw) fill(list[i], pw); closeMenu(true) }
    const m = accountMenu(anchor, {
      kind: 'password', title: 'Lumen Passwords',
      sub: (list.length === 1 ? '1 saved account' : list.length + ' saved accounts') + (site ? ' for ' + site : ''),
      rows: list.map(c => ({ name: c.username })),
      onPick: pick,
    })
    menuKeysFor(anchor, m, pick)
  }

  async function scan() {
    const pws = pwFields(document)
    if (!pws.length) return
    const list = await getCreds()
    for (const pw of pws) {
      if (pw.dataset.lumen) continue
      if (isNewPassword(pw)) {
        pw.dataset.lumen = '1'
        pw.addEventListener('focus', () => { if (!pw.value) showGenerator(pw) })
        pw.addEventListener('blur', () => setTimeout(closeMenu, 120))
        continue
      }
      if (!list.length) continue
      pw.dataset.lumen = '1'
      const u = userFieldFor(pw)
      if (list.length === 1 && !pw.value) fill(list[0], pw)
      for (const el of [pw, u].filter(Boolean)) {
        el.addEventListener('focus', () => { if (list.length > 1 || !pw.value) showMenu(el, list) })
        el.addEventListener('blur', () => setTimeout(closeMenu, 120))
      }
    }
  }

  // capture credentials when a login form is submitted
  let last = null
  function snapshot(root) {
    const pw = pwFields(root || document).find(p => p.value)
    if (!pw) return null
    const u = userFieldFor(pw)
    return { username: u ? u.value.trim() : '', password: pw.value }
  }
  function report(s) {
    if (!s || !s.password || s.password.length < 3) return
    if (last && last.username === s.username && last.password === s.password && Date.now() - last.t < 4000) return
    last = { ...s, t: Date.now() }
    ipcRenderer.send('pw:submit', s)
  }
  document.addEventListener('submit', e => report(snapshot(e.target)), true)
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button, input[type=submit], [role=button]')
    if (b) { const s = snapshot(b.form || document); if (s) setTimeout(() => report(s), 0) }
  }, true)
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const s = snapshot(e.target.form || document); if (s) report(s) } }, true)
  window.addEventListener('pagehide', () => report(snapshot(document)))

  ipcRenderer.on('lumen:fill-generated', (e, pass) => {
    const pws = pwFields(document)
    const focused = document.activeElement
    const targets = focused && focused.type === 'password' ? pwFields(focused.form || document) : pws
    targets.forEach(p => setValue(p, pass))
  })

  const start = () => {
    scan()
    let t
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 400) }).observe(document.documentElement, { childList: true, subtree: true })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
}
