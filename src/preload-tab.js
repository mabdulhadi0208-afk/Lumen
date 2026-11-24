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
  const ACC = QOL.accent || '#5b8cff'
  const STILL = QOL.motion === 'off' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
  // Nova tokens for the bits Lumen draws inside pages (all in closed shadow roots, so the page cannot restyle them)
  const NOVA_CSS = `:host{all:initial}
    *{box-sizing:border-box}
    .nv{--accent:${ACC};--accent2:oklch(from var(--accent) calc(l - .02) c calc(h + 40));--accent3:oklch(from var(--accent) calc(l + .04) c calc(h + 95));
      --nova:linear-gradient(135deg,var(--accent),var(--accent2) 55%,var(--accent3));
      --fg:#141722;--fg2:rgba(20,23,34,.62);--fg3:rgba(20,23,34,.4);--line:rgba(20,24,48,.09);
      --glass:linear-gradient(180deg,rgba(255,255,255,.82),rgba(250,251,255,.72));
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 75%,transparent),rgba(255,255,255,.7) 36%,rgba(255,255,255,.18) 64%,color-mix(in srgb,var(--accent3) 65%,transparent));
      --shadow:0 2px 6px rgba(14,18,40,.08),0 16px 40px color-mix(in srgb,var(--accent) 24%,rgba(14,18,40,.14)),0 0 40px color-mix(in srgb,var(--accent) 14%,transparent);
      --spec:inset 0 1px 0 rgba(255,255,255,.8);
      font:13px/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;color:var(--fg);-webkit-font-smoothing:antialiased;letter-spacing:normal;text-align:left}
    @media (prefers-color-scheme:dark){.nv{--fg:#eef0fa;--fg2:rgba(238,240,250,.66);--fg3:rgba(238,240,250,.4);--line:rgba(255,255,255,.1);
      --glass:linear-gradient(180deg,color-mix(in srgb,var(--accent) 8%,rgba(28,32,50,.86)),color-mix(in srgb,var(--accent) 5%,rgba(16,19,31,.84)));
      --edge:linear-gradient(135deg,color-mix(in srgb,var(--accent) 90%,transparent),rgba(255,255,255,.18) 36%,rgba(255,255,255,.05) 64%,color-mix(in srgb,var(--accent3) 80%,transparent));
      --shadow:0 2px 6px rgba(0,0,0,.4),0 16px 40px color-mix(in srgb,var(--accent) 26%,rgba(0,0,0,.42)),0 0 46px color-mix(in srgb,var(--accent) 20%,transparent);
      --spec:inset 0 1px 0 rgba(255,255,255,.16)}}
    .glass{position:relative;isolation:isolate;background:radial-gradient(120% 90% at 0% 0%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 60%),radial-gradient(90% 90% at 100% 100%,color-mix(in srgb,var(--accent3) 14%,transparent),transparent 60%),var(--glass);
      -webkit-backdrop-filter:blur(26px) saturate(1.9);backdrop-filter:blur(26px) saturate(1.9);box-shadow:var(--spec),var(--shadow)}
    .glass::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:var(--edge);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
    .glass::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.35),transparent 40%);mix-blend-mode:soft-light}
    ${STILL ? '*{animation:none!important;transition:none!important}' : ''}`
  globalThis.__lumenNovaCSS = NOVA_CSS
  if (QOL.swipe && window === window.top) {
    let acc = 0, timer = null, ind = null, sh = null
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
    const show = p => {
      if (!ind) {
        ind = document.createElement('div'); ind.style.cssText = 'position:fixed;top:50%;z-index:2147483647;pointer-events:none'
        sh = ind.attachShadow({ mode: 'closed' })
        // a liquid glass bead slides in from the edge; its ring fills as you swipe and it lights up when letting go will go
        sh.innerHTML = `<style>${NOVA_CSS}
          .c{width:56px;height:56px;margin-top:-28px;border-radius:50%;display:grid;place-items:center;color:var(--fg);transition:transform .35s cubic-bezier(.3,1.5,.5,1),color .2s}
          .c .fill{position:absolute;inset:4px;border-radius:50%;background:var(--nova);opacity:0;transform:scale(.4);transition:opacity .2s,transform .45s cubic-bezier(.3,1.6,.5,1);box-shadow:0 8px 24px color-mix(in srgb,var(--accent) 50%,transparent),inset 0 1px 0 rgba(255,255,255,.5)}
          .c.go{color:#fff}.c.go .fill{opacity:1;transform:none}
          .c svg.ar{position:relative;z-index:2;width:22px;height:22px;transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
          .c.go svg.ar{transform:scale(1.12);color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
          .ring{position:absolute;inset:-3px;width:62px;height:62px;z-index:1;transform:rotate(-90deg)}
          .ring circle{fill:none;stroke:var(--accent);stroke-width:2.5;stroke-linecap:round;stroke-dasharray:182;stroke-dashoffset:182;filter:drop-shadow(0 0 4px var(--accent))}
          .lb{position:absolute;top:64px;left:50%;translate:-50% 0;padding:4px 10px;border-radius:999px;font:700 11px/1.2 -apple-system,"Segoe UI",system-ui,sans-serif;letter-spacing:.02em;white-space:nowrap;opacity:0;transition:opacity .2s,transform .35s cubic-bezier(.3,1.5,.5,1);transform:translateY(-4px);color:var(--fg)}
          .c.go+.lb{opacity:1;transform:none}</style>
          <div class="nv"><div class="c glass"><span class="fill"></span><svg class="ring" viewBox="0 0 62 62"><circle cx="31" cy="31" r="29"/></svg><svg class="ar" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg></div><div class="lb glass"></div></div>`
        document.documentElement.appendChild(ind)
      }
      const back = p < 0, k = Math.min(1, Math.abs(p) / 220)
      ind.style.left = back ? (k * 74 - 56) + 'px' : ''
      ind.style.right = back ? '' : (k * 74 - 56) + 'px'
      const c = sh.querySelector('.c'); c.classList.toggle('go', k >= 1)
      c.style.transform = `scale(${0.62 + k * 0.38}) rotate(${back ? 0 : 180}deg)`; c.style.opacity = Math.min(1, k * 1.6)
      sh.querySelector('.ring circle').style.strokeDashoffset = String(182 * (1 - k))
      const lb = sh.querySelector('.lb'); lb.textContent = back ? 'Back' : 'Forward'; lb.style.marginLeft = back ? '0' : '0'
    }
    const reset = () => { acc = 0; if (ind) { ind.remove(); ind = null } }
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
    addEventListener('keydown', e => {
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || (e.key !== '>' && e.key !== '<')) return
      const a = document.activeElement
      if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return
      const vids = [...document.querySelectorAll('video')].filter(v => v.readyState > 0)
      const v = vids.find(v => !v.paused) || vids.sort((x, y) => y.clientWidth * y.clientHeight - x.clientWidth * x.clientHeight)[0]
      if (!v) return
      e.preventDefault(); e.stopPropagation()
      v.playbackRate = Math.max(0.25, Math.min(4, Math.round((v.playbackRate + (e.key === '>' ? 0.25 : -0.25)) * 100) / 100))
      // a glass speed pill over the video: the big number, and a meter from 0.25x to 4x
      let b = document.getElementById('__lumen_speed')
      if (!b) {
        b = document.createElement('div'); b.id = '__lumen_speed'; b.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;transform:translateX(-50%)'
        const sh = b.attachShadow({ mode: 'closed' })
        sh.innerHTML = `<style>${NOVA_CSS}
          .p{display:flex;align-items:center;gap:12px;padding:10px 16px 10px 10px;border-radius:999px;opacity:0;transform:translateY(-8px) scale(.9);transition:opacity .25s,transform .45s cubic-bezier(.3,1.5,.5,1)}
          .p.on{opacity:1;transform:none}
          .ic{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:0 6px 16px color-mix(in srgb,var(--accent) 45%,transparent),inset 0 1px 0 rgba(255,255,255,.45)}
          .ic svg{width:16px;height:16px;transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
          .n{font:800 22px/1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;letter-spacing:-.03em;min-width:62px;background:linear-gradient(120deg,var(--fg) 40%,var(--accent));-webkit-background-clip:text;background-clip:text;color:transparent}
          .m{width:86px;height:6px;border-radius:9px;background:var(--line);overflow:hidden}
          .m i{display:block;height:100%;border-radius:inherit;background:var(--nova);box-shadow:0 0 8px var(--accent);transition:width .4s cubic-bezier(.3,1.4,.5,1)}
          .pop .n{animation:pop .4s cubic-bezier(.3,1.6,.5,1)}@keyframes pop{from{transform:scale(1.25)}}</style>
          <div class="nv"><div class="p glass"><span class="ic"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 11.5a5.5 5.5 0 1 1 11 0"/><path d="m8 11.5 3-4"/></svg></span><span class="n"></span><span class="m"><i></i></span></div></div>`
        b._sh = sh; document.documentElement.appendChild(b)
      }
      const r = v.getBoundingClientRect(), sh = b._sh, pill = sh.querySelector('.p')
      b.style.left = Math.round(r.left + r.width / 2) + 'px'; b.style.top = Math.max(8, Math.round(r.top + 20)) + 'px'
      sh.querySelector('.n').textContent = v.playbackRate + 'x'
      sh.querySelector('.m i').style.width = Math.round((v.playbackRate - 0.25) / 3.75 * 100) + '%'
      sh.querySelector('.ic svg').style.transform = `rotate(${(v.playbackRate - 1) * 30}deg)`
      pill.classList.remove('pop'); void pill.offsetWidth; pill.classList.add('on', 'pop')
      clearTimeout(b._t); b._t = setTimeout(() => { pill.classList.remove('on') }, 1100)
    }, true)
  }

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
        C.get = async function (opts) {
          if (!opts || !opts.publicKey) return origGet(opts)
          if (opts.mediation === 'conditional') return new Promise((_, rej) => { if (opts.signal) opts.signal.addEventListener('abort', () => rej(err('AbortError', 'Aborted'))) })
          const p = opts.publicKey
          const r = await PK.get({ rpId: p.rpId, challenge: b2u(p.challenge), allow: (p.allowCredentials || []).map(x => b2u(x.id)) })
          if (r.error) throw err(r.error, r.message)
          return cred(r, 'get')
        }
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true
        PublicKeyCredential.isConditionalMediationAvailable = async () => false
      },
    })
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
  function closeMenu() {
    if (menu) { const m = menu; menu = null; const card = m._card; if (card && !STILL) { card.classList.remove('on'); setTimeout(() => m.remove(), 140) } else m.remove() }
    if (menuKeys) { menuKeys.el.removeEventListener('keydown', menuKeys.fn, true); menuKeys = null }
  }
  // the autofill dropdown: a liquid glass card under the field, a row per saved account with its initial,
  // arrow keys and Enter to pick, Esc to close
  function showMenu(anchor, list) {
    closeMenu()
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0'
    const sh = host.attachShadow({ mode: 'closed' })
    const r = anchor.getBoundingClientRect()
    const below = r.bottom + 8 + Math.min(list.length, 5) * 52 + 60 < innerHeight
    const top = below ? Math.round(r.bottom + 8) : null, bottom = below ? null : Math.round(innerHeight - r.top + 8)
    const left = Math.round(Math.max(8, Math.min(r.left, innerWidth - Math.max(260, r.width) - 8)))
    const site = location.hostname.replace(/^www\./, '')
    sh.innerHTML = `<style>${globalThis.__lumenNovaCSS || ''}
      .m{position:fixed;left:${left}px;${below ? 'top:' + top : 'bottom:' + bottom}px;width:${Math.max(268, Math.min(360, Math.round(r.width)))}px;border-radius:18px;padding:8px;
        transform-origin:${below ? 'top' : 'bottom'} left;opacity:0;transform:translateY(${below ? -6 : 6}px) scale(.94);transition:opacity .18s,transform .5s cubic-bezier(.3,1.45,.5,1);overflow:hidden}
      .m.on{opacity:1;transform:none}
      .orb{position:absolute;z-index:-1;width:160px;height:160px;left:-60px;top:-80px;border-radius:50%;filter:blur(26px);background:color-mix(in srgb,var(--accent) 34%,transparent);animation:drift 12s ease-in-out infinite alternate}
      @keyframes drift{to{transform:translate(70px,40px) scale(1.15)}}
      .h{display:flex;align-items:center;gap:9px;padding:4px 6px 10px}
      .k{width:26px;height:26px;border-radius:9px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:0 6px 14px color-mix(in srgb,var(--accent) 45%,transparent),inset 0 1px 0 rgba(255,255,255,.45)}
      .k svg{width:14px;height:14px}
      .t{font:800 13.5px/1.1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;letter-spacing:-.02em}
      .s{font-size:11px;color:var(--fg3);margin-top:1px}
      .i{position:relative;display:flex;align-items:center;gap:11px;padding:8px 10px;border-radius:12px;cursor:default;transition:background .15s,transform .35s cubic-bezier(.3,1.5,.5,1)}
      .i.cur{background:linear-gradient(90deg,color-mix(in srgb,var(--accent) 20%,transparent),color-mix(in srgb,var(--accent3) 12%,transparent));box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 18%,transparent),0 4px 14px color-mix(in srgb,var(--accent) 20%,transparent);transform:translateX(2px)}
      .i:active{transform:scale(.97)}
      .av{width:32px;height:32px;flex:none;border-radius:50%;display:grid;place-items:center;color:#fff;font:800 14px ui-rounded,system-ui,sans-serif;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 4px 10px color-mix(in srgb,var(--accent) 32%,transparent)}
      .tx{display:flex;flex-direction:column;gap:2px;min-width:0}
      .u{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .d{color:var(--fg3);letter-spacing:2.5px;font-size:10px;line-height:1}
      .f{display:flex;gap:6px;align-items:center;padding:8px 8px 2px;margin-top:4px;border-top:1px solid var(--line);color:var(--fg3);font-size:11px}
      kbd{font:650 10px -apple-system,"Segoe UI",system-ui,sans-serif;padding:1px 5px;border-radius:5px;background:var(--line);color:var(--fg2)}
    </style><div class="nv"><div class="m glass"><span class="orb"></span>
      <div class="h"><span class="k"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="10.5" r="3"/><path d="m7.6 8.4 5.65-5.65M11 5l1.5 1.5M12.5 3.5 14 5"/></svg></span><span><div class="t">Lumen Passwords</div><div class="s"></div></span></div>
      ${list.map((c, i) => `<div class="i" data-i="${i}"><span class="av"></span><span class="tx"><span class="u"></span><span class="d">&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;</span></span></div>`).join('')}
      <div class="f"><kbd>&#8593;</kbd><kbd>&#8595;</kbd> to choose, <kbd>Enter</kbd> to fill</div></div></div>`
    sh.querySelector('.s').textContent = (list.length === 1 ? '1 saved account' : list.length + ' saved accounts') + (site ? ' for ' + site : '')
    const items = [...sh.querySelectorAll('.i')]
    const pick = i => { const pw = anchor.type === 'password' ? anchor : pwFields(anchor.form || document)[0]; if (pw) fill(list[i], pw); closeMenu() }
    let cur = -1
    const setCur = i => { cur = i; items.forEach((el, j) => el.classList.toggle('cur', j === i)) }
    items.forEach((el, i) => {
      const name = list[i].username || 'No username'
      el.querySelector('.u').textContent = name
      el.querySelector('.av').textContent = (name.trim()[0] || '?').toUpperCase()
      el.addEventListener('mouseenter', () => setCur(i))
      el.addEventListener('mousedown', e => { e.preventDefault(); pick(i) })
    })
    const fn = e => {
      if (!menu) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setCur(((cur < 0 && e.key === 'ArrowUp' ? 0 : cur) + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length) }
      else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); e.stopPropagation(); pick(cur) }
      else if (e.key === 'Escape') { e.stopPropagation(); closeMenu() }
    }
    anchor.addEventListener('keydown', fn, true); menuKeys = { el: anchor, fn }
    document.documentElement.appendChild(host)
    menu = host; host._card = sh.querySelector('.m')
    requestAnimationFrame(() => requestAnimationFrame(() => host._card && host._card.classList.add('on')))
  }

  async function scan() {
    const pws = pwFields(document)
    if (!pws.length) return
    const list = await getCreds()
    if (!list.length) return
    for (const pw of pws) {
      if (pw.dataset.lumen) continue
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
