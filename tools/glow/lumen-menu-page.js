// Draws Surge's right-click menu from the items Surge sent: a line icon picked from each label, Nova switches for
// on/off items, key chips for shortcuts, status lines as soft notes, and submenus that open in place.
// Arrow keys move, Enter picks, Right and Left open and close a submenu, Esc closes.
(() => {
  const api = window.lumenMenu || { on() {}, pick() {}, size() {}, close() {} }
  const $ = id => document.getElementById(id)
  const P = {
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z"/>',
    note: '<path d="M6 3.5h9l3 3v14H6z"/><path d="M9 10h6M9 13.5h6M9 17h4"/>',
    mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    power: '<path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>',
    quit: '<path d="M7 7l10 10M17 7 7 17"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    clip: '<rect x="6" y="4" width="12" height="17" rx="2.5"/><path d="M9.5 4V3h5v1"/><path d="M9 10h6M9 14h6"/>',
    cup: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5v2.5M12 3.5v2.5"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
    spot: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    keys: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.1M10 10h.1M14 10h.1M18 10h.1M7 14h10"/>',
    dot: '<circle cx="12" cy="12" r="3.2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
  }
  const pick = (l, it) => {
    const s = l.toLowerCase()
    if (/^settings/.test(s)) return 'gear'; if (/note/.test(s)) return 'note'; if (/mute|sound/.test(s)) return 'mute'
    if (/login/.test(s)) return 'power'; if (/^quit/.test(s)) return 'quit'; if (/glow|charg|battery|plugged/.test(s)) return 'bolt'
    if (/clipboard/.test(s)) return 'clip'; if (/picker/.test(s)) return 'grid'; if (/awake|caffeine|keep/.test(s)) return 'cup'
    if (/focus|break|timer|min/.test(s)) return 'timer'; if (/spotlight/.test(s)) return 'spot'; if (/cpu|memory|load/.test(s)) return 'chart'
    if (/typing|keys/.test(s)) return 'keys'; if (it && it.parentCopy) return 'copy'; if (it && !it.enabled) return 'info'
    return 'dot'
  }
  const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${P[k] || P.dot}</svg>`
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  let state = new Map()
  function row(it, i, nested) {
    if (it.type === 'separator') return '<div class="ms" role="separator"></div>'
    if (!it.enabled && it.type === 'normal') return `<div class="mi st" style="--i:${i}"><span class="ic">${svg(pick(it.label, it))}</span><span class="lb">${esc(it.label)}</span></div>`
    state.set(it.id, it)
    const right = it.type === 'checkbox' ? `<span class="sw${it.checked ? ' on' : ''}"><i></i></span>`
      : it.type === 'radio' ? `<span class="rd${it.checked ? ' on' : ''}"></span>`
      : it.type === 'submenu' ? `<span class="cnt">${(it.sub || []).filter(x => x.type !== 'separator').length || ''}</span><svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>`
      : it.acc ? `<span class="kb">${[...(/\+/.test(it.acc) ? it.acc.split('+') : it.acc.match(/[⌘⌃⌥⇧]|[^⌘⌃⌥⇧]+/g) || [])].map(k => `<kbd>${esc(k)}</kbd>`).join('')}</span>` : ''
    const icon = nested ? (it.type === 'normal' && !/picker/i.test(it.label) ? 'copy' : pick(it.label, it)) : pick(it.label, it)
    const cls = ['mi', it.type, /^quit/i.test(it.label) ? 'dg' : '', it.enabled ? '' : 'off'].filter(Boolean).join(' ')
    const sub = it.type === 'submenu' ? `<div class="sub" role="menu"><div class="subin">${(it.sub || []).map((s, k) => row(s, k, true)).join('')}</div></div>` : ''
    return `<button class="${cls}" role="menuitem" data-id="${it.id}" style="--i:${i}" ${it.enabled ? '' : 'disabled'}${it.type === 'checkbox' ? ` aria-checked="${it.checked}"` : ''}><span class="ic">${svg(icon)}</span><span class="lb">${esc(it.label)}</span>${right}</button>${sub}`
  }
  function fit() { api.size(Math.ceil($('mn').getBoundingClientRect().height + 28)) }
  function render(d) {
    state = new Map()
    document.body.classList.remove('out'); document.body.classList.toggle('mac', !!d.mac)
    $('list').innerHTML = (d.items || []).map((it, i) => row(it, i, false)).join('')
    // the header's live line: battery (with a little level bar), how many modules are on, and Muted when it is
    const f = d.info || {}, b = f.battery, st = []
    if (b && b.level != null) st.push(`<span class="ch bat${b.charging ? ' chg' : ''}${b.level <= 20 && !b.charging ? ' low' : ''}" style="--lv:${Math.max(4, Math.min(100, b.level))}"><i class="cell"><i></i></i>${b.level}%${b.charging ? ' <em>charging</em>' : ''}</span>`)
    if (f.on != null) st.push(`<span class="ch mods"><i class="dots">${'<i></i>'.repeat(Math.min(5, f.on || 0))}</i>${f.on}${f.total ? ' of ' + f.total : ''} on</span>`)
    if (f.muted) st.push('<span class="ch mute">Muted</span>')
    $('stats').innerHTML = st.join(''); $('stats').hidden = !st.length
    const mn = $('mn'); mn.classList.remove('in'); void mn.offsetWidth; mn.classList.add('in')
    requestAnimationFrame(() => { fit(); const f = $('list').querySelector('button.mi:not([disabled])'); f && f.focus({ preventScroll: true }) })
  }
  function open(btn, on) {
    const sub = btn.nextElementSibling; if (!sub || !sub.classList.contains('sub')) return
    const o = on == null ? !btn.classList.contains('open') : on
    btn.classList.toggle('open', o); sub.classList.toggle('open', o)
    setTimeout(fit, 10); setTimeout(fit, 320)
  }
  function act(btn) {
    const it = state.get(btn.dataset.id); if (!it || btn.disabled) return
    if (it.type === 'submenu') return open(btn)
    if (it.type === 'checkbox') { const s = btn.querySelector('.sw'); s && s.classList.toggle('on'); btn.classList.add('flash'); setTimeout(() => api.pick(it.id, !it.checked), 170); return }
    btn.classList.add('flash'); setTimeout(() => api.pick(it.id), 110)
  }
  $('list').addEventListener('click', e => { const b = e.target.closest('button.mi'); if (b) act(b) })
  $('list').addEventListener('pointermove', e => { const b = e.target.closest('button.mi'); if (b && document.activeElement !== b) b.focus({ preventScroll: true }) })
  addEventListener('keydown', e => {
    const all = [...document.querySelectorAll('button.mi:not([disabled])')].filter(b => b.offsetParent && !(b.closest('.sub') && !b.closest('.sub').classList.contains('open')))
    const i = all.indexOf(document.activeElement)
    if (e.key === 'Escape') { e.preventDefault(); document.body.classList.add('out'); api.close() }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]; n && n.focus() }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.activeElement && document.activeElement.matches('button.mi') && act(document.activeElement) }
    else if (e.key === 'ArrowRight' && document.activeElement && document.activeElement.classList.contains('submenu')) open(document.activeElement, true)
    else if (e.key === 'ArrowLeft') { const s = document.activeElement && document.activeElement.closest('.sub'); const b = s ? s.previousElementSibling : document.activeElement; if (b && b.classList.contains('submenu')) { open(b, false); b.focus() } }
  })
  api.on('show', render)
  api.on('out', () => document.body.classList.add('out'))
  api.on('edge', e => document.body.classList.toggle('up', e === 'bottom'))
})()
