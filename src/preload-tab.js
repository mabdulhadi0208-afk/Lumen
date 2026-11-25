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
  // made only when it is first needed, and is removed when it closes. Liquid glass: a lens that bends the page at
  // the rim (an SVG displacement filter, with a faint chromatic fringe), a refractive gradient rim, a specular top
  // edge, an inner caustic glow and an accent halo. Springs are CSS linear() curves of a toned down jelly spring.
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
      -webkit-backdrop-filter:var(--lens,) blur(22px) saturate(2);backdrop-filter:var(--lens,) blur(22px) saturate(2);box-shadow:var(--spec),var(--caustic),var(--shadow)}
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

  // the lens: a displacement map that is still in the middle and bends hard at the rim, one filter per size
  const NS = 'http://www.w3.org/2000/svg'
  const sdf = (px, py, w, h, r) => { const qx = Math.abs(px - w / 2) - (w / 2 - r), qy = Math.abs(py - h / 2) - (h / 2 - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r }
  const lensMaps = new Map()
  function lensMap(w, h, r, bezel) {
    const key = `${w}x${h}r${r}`
    if (lensMaps.has(key)) return lensMaps.get(key)
    const s = Math.min(1, 160 / Math.max(w, h)), cw = Math.max(2, Math.ceil(w * s)), ch = Math.max(2, Math.ceil(h * s))
    const c = document.createElement('canvas'); c.width = cw; c.height = ch
    const x = c.getContext('2d'), img = x.createImageData(cw, ch), d = img.data
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const px = (i + 0.5) / s, py = (j + 0.5) / s, dist = -sdf(px, py, w, h, r)
      let dx = 0, dy = 0
      if (dist > 0 && dist < bezel) {
        const t = 1 - dist / bezel, m = t * t * (1.4 - 0.4 * t)
        const nx = sdf(px + 1, py, w, h, r) - sdf(px - 1, py, w, h, r), ny = sdf(px, py + 1, w, h, r) - sdf(px, py - 1, w, h, r), l = Math.hypot(nx, ny) || 1
        dx = -nx / l * m; dy = -ny / l * m
      }
      const o = (j * cw + i) * 4; d[o] = 128 + dx * 127; d[o + 1] = 128 + dy * 127; d[o + 2] = 128; d[o + 3] = 255
    }
    x.putImageData(img, 0, 0)
    const url = c.toDataURL(); if (lensMaps.size > 24) lensMaps.clear(); lensMaps.set(key, url)
    return url
  }
  let lensSeq = 0
  function addLens(sh, el, k = 1) {
    if (STILL || !el.isConnected) return
    const w = Math.round(el.offsetWidth / 2) * 2, h = Math.round(el.offsetHeight / 2) * 2
    if (w < 16 || h < 16 || w * h > 600000) return
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2)
    const bezel = Math.max(6, Math.min(r * 1.2 + 6, Math.min(w, h) / 2, 30)), scale = Math.round(Math.min(bezel * 1.1, 34) * k)
    const id = 'lumen-lens-' + (++lensSeq)
    const ch = [['r', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['g', 1.07, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['b', 1.15, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']]
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;width:0;height:0'
    svg.innerHTML = `<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${lensMap(w, h, Math.round(r), bezel)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
      ch.map(([n, m, v]) => `<feDisplacementMap in="SourceGraphic" in2="map" scale="${Math.round(scale * m)}" xChannelSelector="R" yChannelSelector="G" result="d${n}"/><feColorMatrix in="d${n}" type="matrix" values="${v}" result="${n}"/>`).join('') +
      '<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>'
    sh.appendChild(svg)
    el.style.setProperty('--lens', `url(#${id})`)
  }
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
  // a liquid glass account menu under a sign-in field, shared by Lumen Passwords and Lumen Passkeys
  function accountMenu(anchor, { kind, title, sub, rows, hint, onPick }) {
    const { host, sh } = surface()
    const r = anchor.getBoundingClientRect()
    const W = Math.max(300, Math.min(380, Math.round(r.width)))
    const H = 92 + Math.min(rows.length, 5) * 58 + 44
    const below = r.bottom + 10 + H < innerHeight || r.top < H
    const left = Math.round(Math.max(8, Math.min(r.left, innerWidth - W - 8)))
    const pos = below ? `top:${Math.round(r.bottom + 10)}px` : `bottom:${Math.round(innerHeight - r.top + 10)}px`
    const icon = kind === 'generate' ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.8 13.2 4v4c0 3.1-2.2 5.4-5.2 6.2C5 13.4 2.8 11.1 2.8 8V4z"/><path d="m5.6 8.1 1.7 1.7 3.2-3.4"/></svg>'
      : kind === 'passkey'
      ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.6"/><path d="M1.8 13.5c.4-2.6 2.2-4 4.2-4 1 0 1.8.3 2.5.8"/><circle cx="12" cy="9.5" r="1.8"/><path d="M12 11.3v3M12 13h1.4"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="4.8" cy="8" r="2.9"/><path d="M7.7 8h6.6M12.2 8v2.6M14.3 8v1.8"/></svg>'
    sh.innerHTML = `<style>${novaCSS()}
      .m{position:fixed;left:${left}px;${pos};width:${W}px;border-radius:24px;padding:10px;overflow:hidden;transform-origin:${below ? 'top' : 'bottom'} ${r.left - left < W / 2 ? 'left' : 'right'};
        opacity:0;transform:translateY(${below ? -10 : 10}px) scale(.9);transition:opacity .16s,transform .6s var(--spring)}
      .m.on{opacity:1;transform:none}
      .m.off{opacity:0;transform:translateY(${below ? -6 : 6}px) scale(.96);transition:opacity .14s,transform .2s ease-in}
      .blob{position:absolute;z-index:-1;border-radius:50%;filter:blur(28px);pointer-events:none}
      .b1{width:190px;height:150px;left:-60px;top:-70px;background:color-mix(in srgb,var(--accent) 42%,transparent)}
      .b2{width:170px;height:130px;right:-70px;bottom:-60px;background:color-mix(in srgb,var(--accent3) 32%,transparent)}
      .ghost{position:absolute;right:-18px;top:-22px;width:120px;height:120px;color:var(--accent);opacity:.09;pointer-events:none;z-index:0}
      .h{position:relative;z-index:4;display:flex;align-items:center;gap:12px;padding:6px 8px 12px}
      .h .tile{width:40px;height:40px;border-radius:13px}.h .tile svg{width:20px;height:20px}
      .t{font:800 17px/1.1 var(--display);letter-spacing:-.03em}
      .s{font-size:12px;color:var(--fg3);margin-top:3px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${W - 90}px}
      .l{position:relative;z-index:4;display:flex;flex-direction:column;gap:3px;max-height:${5 * 58}px;overflow:auto;scrollbar-width:none}
      .i{position:relative;display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:15px;cursor:default;
        transition:background .18s,box-shadow .25s,transform .5s var(--jelly);animation:rin .55s var(--spring) both;animation-delay:calc(60ms + var(--n) * 45ms)}
      @keyframes rin{from{opacity:0;transform:translateY(8px) scale(.97)}}
      .i:hover{background:var(--chip)}
      .i.cur{background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 22%,transparent),color-mix(in srgb,var(--accent3) 14%,transparent));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 34%,transparent),var(--halo);transform:translateX(3px)}
      .i:active{transform:scale(.96)}
      .av{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 16px var(--display);letter-spacing:-.02em;
        background:var(--nova);filter:hue-rotate(calc(var(--n) * 38deg));box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 5px 14px color-mix(in srgb,var(--accent) 38%,transparent)}
      .tx{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
      .u{font:700 14.5px/1.2 var(--sans);letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .d{color:var(--fg3);font-size:12px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .d.dots{letter-spacing:3px;font-size:10px}
      .d.mono{font:600 12.5px/1.2 ui-monospace,"SF Mono",Menlo,Consolas,monospace;letter-spacing:.02em;color:var(--fg2)}
      .av svg{width:18px;height:18px}
      .strength{display:flex;gap:3px;margin-top:5px}.strength i{width:22px;height:4px;border-radius:4px;background:var(--nova);box-shadow:0 0 6px color-mix(in srgb,var(--accent) 50%,transparent)}
      .go{flex:none;display:flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;color:#fff;font:750 11.5px var(--sans);background:var(--nova);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 4px 12px color-mix(in srgb,var(--accent) 40%,transparent);opacity:0;transform:scale(.7);transition:opacity .15s,transform .45s var(--jelly)}
      .go svg{width:11px;height:11px}
      .i.cur .go{opacity:1;transform:none}
      .f{position:relative;z-index:4;display:flex;gap:6px;align-items:center;padding:10px 8px 2px;margin-top:6px;border-top:1px solid var(--line);color:var(--fg3);font-size:11.5px;font-weight:550;white-space:nowrap}
      .f .sp{flex:1}.f .lk{display:flex;align-items:center;gap:5px;color:var(--fg3)}.f .lk svg{width:11px;height:11px}
    </style><div class="nv"><div class="m glass" role="listbox" aria-label="${title}"><span class="blob b1"></span><span class="blob b2"></span><span class="sweep"></span>
      <svg class="ghost" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${icon.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
      <div class="h"><span class="tile">${icon}</span><span><div class="t gt"></div><div class="s"></div></span></div>
      <div class="l">${rows.map((_, i) => `<div class="i" role="option" aria-selected="false" style="--n:${i}"><span class="av"></span><span class="tx"><span class="u"></span><span class="d"></span></span><span class="go">${kind === 'passkey' ? 'Sign in' : kind === 'generate' ? 'Use' : 'Fill'}<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5v3.5a1.5 1.5 0 0 1-1.5 1.5H2.5M5 5 2.5 7.5 5 10"/></svg></span></div>`).join('')}</div>
      <div class="f"><kbd>&#8593;</kbd><kbd>&#8595;</kbd><span>choose</span><kbd>Return</kbd><span>${kind === 'passkey' ? 'sign in' : 'fill'}</span><span class="sp"></span><span class="lk"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2.5" y="5.5" width="7" height="5" rx="1.4"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5"/></svg>On this device</span></div></div></div>`
    sh.querySelector('.t').textContent = title
    sh.querySelector('.s').textContent = sub
    const items = [...sh.querySelectorAll('.i')]
    items.forEach((el, i) => {
      const name = String(rows[i].name || '').trim() || 'No username'
      el.querySelector('.u').textContent = name
      if (rows[i].icon) el.querySelector('.av').innerHTML = rows[i].icon
      else el.querySelector('.av').textContent = (name[0] || '?').toUpperCase()
      if (rows[i].mono) el.querySelector('.d').classList.add('mono')
      const d = el.querySelector('.d')
      if (rows[i].detail) d.textContent = rows[i].detail
      else { d.classList.add('dots'); d.textContent = '•••••••••' }
      el.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); onPick(i) })
    })
    const card = sh.querySelector('.m')
    let cur = -1
    const setCur = i => {
      cur = i
      items.forEach((el, j) => { el.classList.toggle('cur', j === i); el.setAttribute('aria-selected', String(j === i)) })
      if (items[i]) items[i].scrollIntoView({ block: 'nearest' })
    }
    items.forEach((el, i) => el.addEventListener('mouseenter', () => setCur(i)))
    // the page only ever sees an empty div; nothing it can read is in it
    document.documentElement.appendChild(host)
    glint(card)
    requestAnimationFrame(() => { addLens(sh, card, 0.9); requestAnimationFrame(() => card.classList.add('on')) })
    const close = now => {
      if (!host.isConnected) return
      if (STILL || now) { host.remove(); return }
      card.classList.remove('on'); card.classList.add('off'); setTimeout(() => host.remove(), 200)
    }
    const move = d => setCur(((cur < 0 && d < 0 ? 0 : cur) + d + items.length) % items.length)
    return { host, close, move, get cur() { return cur } }
  }
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
    // a liquid glass bead slides in from the edge with an accent glow along that edge; its ring fills as you swipe,
    // and when letting go will go it fills with the accent and says so
    const show = p => {
      if (!ui) {
        const { host, sh } = surface('right:0;bottom:0;pointer-events:none')
        sh.innerHTML = `<style>${novaCSS()}
          .nv{position:fixed;inset:0;pointer-events:none}
          .edge{position:absolute;top:0;bottom:0;width:180px;opacity:0;background:radial-gradient(60% 46% at 0% 50%,color-mix(in srgb,var(--accent) 34%,transparent),transparent 100%)}
          .edge.r{right:0;transform:scaleX(-1)}
          .w{position:absolute;top:50%;width:68px;height:68px;margin-top:-34px}
          .c{position:absolute;inset:0;border-radius:50%;display:grid;place-items:center;color:var(--fg);transition:transform .5s var(--jelly),box-shadow .3s}
          .c .fill{position:absolute;inset:5px;border-radius:50%;background:var(--nova);opacity:0;transform:scale(.3);z-index:1;transition:opacity .18s,transform .55s var(--jelly);box-shadow:0 10px 30px color-mix(in srgb,var(--accent) 60%,transparent),inset 0 1px 0 rgba(255,255,255,.55),inset 0 -8px 14px -8px rgba(0,0,0,.3)}
          .c.go{box-shadow:var(--spec),var(--halo),var(--shadow)}
          .c.go .fill{opacity:1;transform:none}
          .c svg.ar{position:relative;z-index:4;width:26px;height:26px;transition:transform .5s var(--jelly)}
          .c.go svg.ar{transform:scale(1.15);color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
          .ring{position:absolute;inset:-4px;width:76px;height:76px;z-index:4;transform:rotate(-90deg);overflow:visible}
          .ring circle{fill:none;stroke-width:3;stroke-linecap:round}
          .ring .bg{stroke:color-mix(in srgb,var(--accent) 18%,transparent)}
          .ring .fg{stroke:var(--accent);stroke-dasharray:226;stroke-dashoffset:226;filter:drop-shadow(0 0 5px var(--accent))}
          .lb{position:absolute;top:80px;padding:7px 13px;border-radius:999px;font:800 13px/1.1 var(--display);letter-spacing:-.01em;white-space:nowrap;opacity:0;transform:translateY(-6px) scale(.9);transition:opacity .18s,transform .5s var(--jelly);color:var(--fg)}
          .lb small{display:block;font:600 10.5px/1.2 var(--sans);color:var(--fg3);margin-top:2px;letter-spacing:0}
          .w.l .lb{left:0}.w.r .lb{right:0}
          .c.go~.lb{opacity:1;transform:none}</style>
          <div class="nv"><div class="edge"></div><div class="w"><div class="c glass"><span class="fill"></span><svg class="ring" viewBox="0 0 76 76"><circle class="bg" cx="38" cy="38" r="36"/><circle class="fg" cx="38" cy="38" r="36"/></svg><svg class="ar" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg></div><div class="lb glass"><span class="tx"></span><small>Let go to leave this page</small></div></div></div>`
        document.documentElement.appendChild(host)
        ui = { host, sh, w: sh.querySelector('.w'), c: sh.querySelector('.c'), ring: sh.querySelector('.ring .fg'), edge: sh.querySelector('.edge'), tx: sh.querySelector('.lb .tx'), lb: sh.querySelector('.lb'), lens: false }
      }
      const back = p < 0, k = Math.min(1, Math.abs(p) / 220)
      const off = Math.round(k * 84 - 68) + 'px'
      ui.w.className = 'w ' + (back ? 'l' : 'r')
      ui.w.style.left = back ? off : ''; ui.w.style.right = back ? '' : off
      ui.edge.className = 'edge' + (back ? '' : ' r'); ui.edge.style.opacity = String(Math.min(1, k * 1.2) * (k >= 1 ? 1 : 0.7))
      const go = k >= 1
      if (ui.c.classList.contains('go') !== go) { ui.c.classList.toggle('go', go); ui.tx.textContent = back ? 'Back' : 'Forward' }
      ui.c.style.transform = `scale(${0.6 + k * 0.4}) rotate(${back ? 0 : 180}deg)`; ui.c.style.opacity = String(Math.min(1, k * 1.8))
      ui.ring.style.strokeDashoffset = String(226 * (1 - k))
      if (!ui.lens && k > 0.5) { ui.lens = true; addLens(ui.sh, ui.c, 0.8) }
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
      // a glass speed capsule over the video: a dial tile, the big number, and a meter from 0.25x to 4x with a mark at 1x
      if (!badge || !badge.host.isConnected) {
        const { host, sh } = surface('transform:translateX(-50%);pointer-events:none')
        host.id = '__lumen_speed'
        sh.innerHTML = `<style>${novaCSS()}
          .p{display:flex;align-items:center;gap:14px;padding:10px 20px 10px 10px;border-radius:999px;opacity:0;transform:translateY(-10px) scale(.88);transition:opacity .2s,transform .6s var(--spring)}
          .p.on{opacity:1;transform:none}
          .p .tile{width:44px;height:44px;border-radius:50%;position:relative;z-index:4}
          .p .tile svg{width:22px;height:22px;transition:transform .55s var(--jelly)}
          .tx{position:relative;z-index:4;display:flex;flex-direction:column;gap:5px}
          .row{display:flex;align-items:baseline;gap:10px}
          .n{font:800 28px/1 var(--display);letter-spacing:-.04em;font-variant-numeric:tabular-nums;padding-right:2px}
          .lbl{font:700 10.5px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--fg3);margin-left:auto}
          .m{position:relative;width:150px;height:7px;border-radius:9px;background:var(--chip);box-shadow:inset 0 1px 2px rgba(0,0,0,.12)}
          .m i{position:absolute;left:0;top:0;bottom:0;border-radius:inherit;background:var(--nova);box-shadow:0 0 10px var(--accent);transition:width .55s var(--spring)}
          .m b{position:absolute;top:-3px;bottom:-3px;width:2px;border-radius:2px;left:${(0.75 / 3.75 * 100).toFixed(2)}%;background:var(--fg3)}
          .hint{display:flex;align-items:center;gap:4px;font:600 10.5px var(--sans);color:var(--fg3);margin-top:2px}.hint kbd{padding:2px 5px;font-size:9.5px}
          .pop .n{animation:pop .5s var(--jelly)}@keyframes pop{from{transform:scale(1.22)}}</style>
          <div class="nv"><div class="p glass" role="status" aria-live="polite"><span class="sweep"></span><span class="tile"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 11.5a5.5 5.5 0 1 1 11 0"/><path d="m8 11.5 3-4"/></svg></span><span class="tx"><span class="row"><span class="n gt"></span><span class="lbl">Playback</span></span><span class="m"><i></i><b></b></span><span class="hint"><kbd>Shift</kbd><kbd>&lt;</kbd><kbd>&gt;</kbd> slower, faster</span></span></div></div>`
        document.documentElement.appendChild(host)
        badge = { host, sh, pill: sh.querySelector('.p'), lens: false }
      }
      const r = v.getBoundingClientRect(), { host, sh, pill } = badge
      host.style.left = Math.round(Math.max(130, Math.min(innerWidth - 130, r.left + r.width / 2))) + 'px'; host.style.top = Math.max(10, Math.round(r.top + 22)) + 'px'
      sh.querySelector('.n').textContent = v.playbackRate + 'x'
      sh.querySelector('.m i').style.width = Math.round((v.playbackRate - 0.25) / 3.75 * 100) + '%'
      sh.querySelector('.tile svg').style.transform = `rotate(${Math.max(-60, Math.min(80, (v.playbackRate - 1) * 30))}deg)`
      pill.classList.remove('pop'); void pill.offsetWidth; pill.classList.add('on', 'pop')
      if (!badge.lens) { badge.lens = true; requestAnimationFrame(() => addLens(sh, pill, 0.8)) }
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
      rows: [{ name: 'Use a strong password', detail: pass, mono: true, icon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.8 13.2 4v4c0 3.1-2.2 5.4-5.2 6.2C5 13.4 2.8 11.1 2.8 8V4z"/><path d="m5.6 8.1 1.7 1.7 3.2-3.4"/></svg>' }],
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
