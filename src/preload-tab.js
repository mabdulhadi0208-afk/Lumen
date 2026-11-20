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
  let QOL = { swipe: true, speed: true }
  try { QOL = ipcRenderer.sendSync('lumen:qol') || QOL } catch {}
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
        sh.innerHTML = '<style>.c{width:44px;height:44px;margin-top:-22px;border-radius:50%;background:rgba(30,32,40,.82);display:grid;place-items:center;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:background .15s}.c.go{background:#5b8cff}</style><div class="c"><svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg></div>'
        document.documentElement.appendChild(ind)
      }
      const back = p < 0, k = Math.min(1, Math.abs(p) / 220)
      ind.style.left = back ? (k * 60 - 44) + 'px' : ''
      ind.style.right = back ? '' : (k * 60 - 44) + 'px'
      const c = sh.querySelector('.c'); c.classList.toggle('go', k >= 1)
      c.style.transform = `scale(${0.6 + k * 0.4}) rotate(${back ? 0 : 180}deg)`; c.style.opacity = k
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
      let b = document.getElementById('__lumen_speed')
      if (!b) { b = document.createElement('div'); b.id = '__lumen_speed'; b.style.cssText = 'position:fixed;z-index:2147483647;padding:8px 14px;border-radius:999px;background:rgba(20,22,30,.85);color:#fff;font:600 15px -apple-system,Segoe UI,sans-serif;pointer-events:none;transition:opacity .4s'; document.documentElement.appendChild(b) }
      const r = v.getBoundingClientRect()
      b.style.left = (r.left + r.width / 2 - 30) + 'px'; b.style.top = (r.top + 20) + 'px'
      b.textContent = v.playbackRate + 'x'; b.style.opacity = '1'
      clearTimeout(b._t); b._t = setTimeout(() => { b.style.opacity = '0' }, 900)
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

  let menu = null
  function closeMenu() { if (menu) { menu.remove(); menu = null } }
  function showMenu(anchor, list) {
    closeMenu()
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;z-index:2147483647;top:0;left:0'
    const sh = host.attachShadow({ mode: 'closed' })
    const r = anchor.getBoundingClientRect()
    sh.innerHTML = `<style>
      .m{position:fixed;left:${Math.round(r.left)}px;top:${Math.round(r.bottom + 6)}px;min-width:${Math.max(220, Math.round(r.width))}px;background:rgba(250,250,252,.96);backdrop-filter:blur(20px);border:1px solid rgba(0,0,0,.08);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.18);font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d1d1f;padding:6px;transform-origin:top left;animation:p .32s cubic-bezier(.2,1.25,.4,1)}
      @keyframes p{from{opacity:0;transform:scale(.96) translateY(-4px)}to{opacity:1;transform:none}}
      @media (prefers-color-scheme:dark){.m{background:rgba(40,41,46,.96);color:#f2f2f4;border-color:rgba(255,255,255,.1)}}
      .h{font-size:11px;opacity:.55;padding:4px 8px 6px;letter-spacing:.02em}
      .i{padding:8px 10px;border-radius:8px;cursor:pointer;display:flex;flex-direction:column;gap:1px}
      .i:hover{background:rgba(91,140,255,.14)}
      .u{font-weight:600}.d{opacity:.5;letter-spacing:2px;font-size:11px}
    </style><div class="m"><div class="h">Lumen Passwords</div>${list.map((c, i) => `<div class="i" data-i="${i}"><span class="u"></span><span class="d">••••••••</span></div>`).join('')}</div>`
    sh.querySelectorAll('.i').forEach((el, i) => {
      el.querySelector('.u').textContent = list[i].username || '(no username)'
      el.addEventListener('mousedown', e => { e.preventDefault(); const pw = anchor.type === 'password' ? anchor : pwFields(anchor.form || document)[0]; if (pw) fill(list[i], pw); closeMenu() })
    })
    document.documentElement.appendChild(host)
    menu = host
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
