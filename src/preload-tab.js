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
