/* Lumen Nova pickers for lumen:// pages (docs/NOVA.md).
 *
 * The open list of a <select>, the colour picker and the date picker used to be drawn by the system. Here the page
 * draws them itself as liquid glass panels. The real <select> and <input> stay in the page and keep their values,
 * so every page reads them as before; only the pop-up is ours. All three work from the keyboard:
 *   list     Arrow keys, Home, End, Page Up/Down, letters to jump, Enter or Space to pick, Escape to close
 *   colour   Arrow keys move the shade (Shift for big steps), the hue slider and a hex field, Enter to keep
 *   date     Arrow keys move a day or a week, Page Up/Down a month, Home/End the week, Enter to pick
 */
;(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>'
  const CHEV = d => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d ? 'm6 3.5 4.5 4.5L6 12.5' : 'M10 3.5 5.5 8l4.5 4.5'}"/></svg>`
  let cur = null   // { el, owner, onKey, done }
  let seq = 0

  function close(focusOwner) {
    if (!cur) return
    const c = cur; cur = null
    c.owner.removeAttribute('aria-expanded'); c.owner.classList.remove('npk-open')
    c.el.classList.add('out'); c.el.inert = true
    setTimeout(() => c.el.remove(), 180)
    if (c.done) c.done()
    if (focusOwner) c.owner.focus({ preventScroll: true })
  }
  // put the panel under its owner, or above it when there is no room below; never off screen
  function place(el, owner) {
    const a = owner.getBoundingClientRect(), vw = innerWidth, vh = innerHeight
    el.style.minWidth = Math.max(200, Math.round(a.width)) + 'px'
    const w = el.offsetWidth, h = el.offsetHeight
    const below = vh - a.bottom - 12, above = a.top - 12
    const up = h > below && above > below
    const maxH = Math.max(160, (up ? above : below) - 8)
    el.style.maxHeight = maxH + 'px'
    const hh = Math.min(h, maxH)
    let left = Math.min(Math.max(10, a.left), vw - w - 10)
    el.style.left = Math.max(10, left) + 'px'
    el.style.top = (up ? Math.max(10, a.top - hh - 8) : a.bottom + 8) + 'px'
    el.style.transformOrigin = `${Math.round(a.left + a.width / 2 - left)}px ${up ? '100%' : '0'}`
    el.classList.toggle('up', up)
  }
  function open(owner, el, onKey, done) {
    close(false)
    el.classList.add('npk'); el.setAttribute('data-npk', '')
    document.body.appendChild(el)
    owner.setAttribute('aria-expanded', 'true'); owner.classList.add('npk-open')
    cur = { el, owner, onKey, done }
    place(el, owner)
    return el
  }
  const fire = (el, ...types) => types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })))

  // ------------------------------------------------------------------ the list of a <select>
  function openSelect(sel) {
    if (sel.disabled) return
    const id = 'npk' + (++seq)
    const el = document.createElement('div')
    el.className = 'npk-list'; el.setAttribute('role', 'listbox'); el.id = id
    const label = sel.getAttribute('aria-label') || (sel.closest('.row') && (sel.closest('.row').querySelector('.t') || {}).textContent) || ''
    if (label) el.setAttribute('aria-label', label.trim())
    const many = sel.options.length > 14
    let html = many ? `<div class="npk-q"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="7" cy="7" r="4.6"/><path d="m10.5 10.5 3.2 3.2"/></svg><input type="text" placeholder="Type to filter" spellcheck="false" autocomplete="off" aria-label="Filter"></div>` : ''
    html += '<div class="npk-items">'
    let i = 0
    for (const ch of sel.children) {
      if (ch.tagName === 'OPTGROUP') { html += `<div class="npk-grp" role="presentation">${esc(ch.label)}</div>`; for (const o of ch.children) html += opt(o, i++) }
      else if (ch.tagName === 'OPTION') html += opt(ch, i++)
    }
    html += '</div>'
    function opt(o, n) { return `<div class="npk-opt${o.selected ? ' sel' : ''}${o.disabled ? ' dis' : ''}" role="option" id="${id}-${n}" data-i="${o.index}" aria-selected="${o.selected}"${o.disabled ? ' aria-disabled="true"' : ''}><span>${esc(o.textContent)}</span><i>${CHECK}</i></div>` }
    el.innerHTML = html
    const items = () => [...el.querySelectorAll('.npk-opt:not(.dis):not([hidden])')]
    let act = null
    const setAct = (o, scroll = true) => {
      if (act) act.classList.remove('act')
      act = o; if (!o) { el.removeAttribute('aria-activedescendant'); return }
      o.classList.add('act'); el.setAttribute('aria-activedescendant', o.id)
      if (scroll) o.scrollIntoView({ block: 'nearest' })
    }
    const pick = o => {
      if (!o) return
      const n = +o.dataset.i
      if (sel.selectedIndex !== n) { sel.selectedIndex = n; fire(sel, 'input', 'change') }
      el.querySelectorAll('.npk-opt.sel').forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-selected', 'false') })
      o.classList.add('sel', 'picked')
      close(true)
    }
    open(sel, el, e => {
      const list = items(), k = e.key, at = list.indexOf(act)
      const go = n => { e.preventDefault(); setAct(list[Math.max(0, Math.min(list.length - 1, n))]) }
      if (k === 'ArrowDown') return go(at + 1)
      if (k === 'ArrowUp') return go(at < 0 ? list.length - 1 : at - 1)
      if (k === 'Home' && !q) return go(0)
      if (k === 'End' && !q) return go(list.length - 1)
      if (k === 'PageDown') return go(at + 8)
      if (k === 'PageUp') return go(at - 8)
      if (k === 'Enter' || (k === ' ' && !q)) { e.preventDefault(); return pick(act) }
      if (k === 'Escape') { e.preventDefault(); return close(true) }
      if (k === 'Tab') { e.preventDefault(); return pick(act) }
      // letters jump to the next option that starts with them
      if (!q && k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        clearTimeout(openSelect.tt); openSelect.typed = (openSelect.typed || '') + k.toLowerCase(); openSelect.tt = setTimeout(() => { openSelect.typed = '' }, 700)
        const t = openSelect.typed, start = t.length === 1 ? at + 1 : Math.max(0, at)
        const hit = [...list.slice(start), ...list.slice(0, start)].find(o => o.textContent.trim().toLowerCase().startsWith(t))
        if (hit) setAct(hit)
      }
    })
    const q = el.querySelector('.npk-q input')
    if (q) {
      q.oninput = () => {
        const v = q.value.trim().toLowerCase()
        el.querySelectorAll('.npk-opt').forEach(o => { o.hidden = !!v && !o.textContent.toLowerCase().includes(v) })
        el.querySelectorAll('.npk-grp').forEach(g => { let n = g.nextElementSibling, any = false; while (n && !n.classList.contains('npk-grp')) { if (!n.hidden) any = true; n = n.nextElementSibling } g.hidden = !any })
        setAct(items()[0] || null)
      }
      setTimeout(() => q.focus({ preventScroll: true }), 0)
    }
    el.addEventListener('mousemove', e => { const o = e.target.closest('.npk-opt:not(.dis)'); if (o && o !== act) setAct(o, false) })
    el.addEventListener('click', e => { const o = e.target.closest('.npk-opt:not(.dis)'); if (o) pick(o) })
    setAct(el.querySelector('.npk-opt.sel:not(.dis)') || items()[0])
    // stagger the rows in, a few at a time
    el.querySelectorAll('.npk-opt').forEach((o, n) => { if (n < 14) o.style.setProperty('--n', n) })
  }

  // ------------------------------------------------------------------ the colour picker
  const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255] }
  const rgb2hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
  function rgb2hsv(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx] }
  function hsv2rgb(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)) }; return [f(5) * 255, f(3) * 255, f(1) * 255] }
  const PRESETS = ['#5b8cff', '#7c5cff', '#a855f7', '#e5487d', '#ef4444', '#f0763b', '#e8b22c', '#84cc16', '#2fb67c', '#16a3b8', '#0ea5e9', '#7a7d87']
  function openColor(inp) {
    const anchor = inp.closest('label, .cswatch') || inp
    let [h, s, v] = rgb2hsv(...hex2rgb(inp.value || '#5b8cff'))
    const start = inp.value
    const el = document.createElement('div')
    el.className = 'npk-color'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', (anchor.getAttribute('title') || 'Pick a color'))
    el.innerHTML = `<div class="npc-sv" role="slider" tabindex="0" aria-label="Shade" aria-valuetext=""><i class="npc-knob"></i></div>
      <div class="npc-hue" role="slider" tabindex="0" aria-label="Hue" aria-valuemin="0" aria-valuemax="360"><i class="npc-knob"></i></div>
      <div class="npc-row"><span class="npc-prev"><i></i></span><label class="npc-hex"><span>Hex</span><input type="text" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex color"></label><button type="button" class="npc-done">Done</button></div>
      <div class="npc-sw" role="group" aria-label="Suggested colors">${PRESETS.map(c => `<button type="button" style="--c:${c}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>`
    const sv = el.querySelector('.npc-sv'), hue = el.querySelector('.npc-hue'), hexI = el.querySelector('.npc-hex input')
    const paint = (push = true) => {
      const hex = rgb2hex(...hsv2rgb(h, s, v))
      el.style.setProperty('--h', h.toFixed(1)); el.style.setProperty('--c', hex)
      sv.querySelector('.npc-knob').style.cssText = `left:${(s * 100).toFixed(2)}%;top:${((1 - v) * 100).toFixed(2)}%`
      hue.querySelector('.npc-knob').style.left = (h / 360 * 100).toFixed(2) + '%'
      sv.setAttribute('aria-valuetext', `saturation ${Math.round(s * 100)} percent, brightness ${Math.round(v * 100)} percent`)
      hue.setAttribute('aria-valuenow', Math.round(h))
      if (document.activeElement !== hexI) hexI.value = hex
      el.querySelectorAll('.npc-sw button').forEach(b => b.classList.toggle('on', b.dataset.c === hex))
      if (push && inp.value !== hex) { inp.value = hex; fire(inp, 'input') }
    }
    const drag = (area, fn) => area.addEventListener('pointerdown', e => {
      e.preventDefault(); area.focus({ preventScroll: true }); area.setPointerCapture(e.pointerId)
      const r = area.getBoundingClientRect(), mv = ev => { fn(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height))); paint() }
      mv(e); area.onpointermove = mv; area.onpointerup = () => { area.onpointermove = null }
    })
    drag(sv, (x, y) => { s = x; v = 1 - y }); drag(hue, x => { h = x * 359.9 })
    sv.addEventListener('keydown', e => { const st = e.shiftKey ? .1 : .02, m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key]; if (!m) return; e.preventDefault(); e.stopPropagation(); s = Math.max(0, Math.min(1, s + m[0])); v = Math.max(0, Math.min(1, v + m[1])); paint() })
    hue.addEventListener('keydown', e => { const st = e.shiftKey ? 30 : 4, m = { ArrowLeft: -st, ArrowDown: -st, ArrowRight: st, ArrowUp: st, Home: -999, End: 999 }[e.key]; if (m == null) return; e.preventDefault(); e.stopPropagation(); h = Math.max(0, Math.min(359.9, h + m)); paint() })
    hexI.addEventListener('input', () => { const m = hexI.value.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i); if (m) { [h, s, v] = rgb2hsv(...hex2rgb(m[1])); paint() } })
    el.querySelector('.npc-sw').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; [h, s, v] = rgb2hsv(...hex2rgb(b.dataset.c)); paint() }
    el.querySelector('.npc-done').onclick = () => close(true)
    open(anchor, el, e => {
      if (e.key === 'Escape') { e.preventDefault(); if (inp.value !== start) { inp.value = start; fire(inp, 'input') } close(true) }
      else if (e.key === 'Enter') { e.preventDefault(); close(true) }
      else if (e.key === 'Tab') { // keep focus inside the panel
        const f = [...el.querySelectorAll('[tabindex="0"], input, button')]; const i = f.indexOf(document.activeElement)
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus()
      }
    }, () => { if (inp.value !== start) fire(inp, 'change') })
    cur.owner = anchor
    paint(false)
    setTimeout(() => sv.focus({ preventScroll: true }), 0)
  }

  // ------------------------------------------------------------------ the date picker
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null }
  function openDate(inp) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let picked = parse(inp.value), focus = new Date(picked || today), view = new Date(focus.getFullYear(), focus.getMonth(), 1)
    const first = (() => { try { const w = new Intl.Locale(navigator.language).weekInfo; return w ? w.firstDay % 7 : 0 } catch { return 0 } })()
    const el = document.createElement('div')
    el.className = 'npk-date'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Choose a date')
    const days = [...Array(7)].map((_, i) => new Date(2023, 0, 1 + ((i + first) % 7)).toLocaleDateString([], { weekday: 'narrow' }))
    const draw = (dir = 0) => {
      const y = view.getFullYear(), m = view.getMonth()
      const lead = (new Date(y, m, 1).getDay() - first + 7) % 7
      let cells = ''
      for (let i = 0; i < 42; i++) {
        const d = new Date(y, m, 1 - lead + i), t = d.getTime()
        const cls = [d.getMonth() !== m ? 'other' : '', t === today.getTime() ? 'today' : '', picked && t === picked.getTime() ? 'sel' : '', t === focus.getTime() ? 'act' : ''].join(' ')
        cells += `${i % 7 === 0 ? '<div class="npd-wk" role="row">' : ''}<button type="button" role="gridcell" class="npd-d ${cls}" data-d="${iso(d)}" tabindex="${t === focus.getTime() ? 0 : -1}" aria-selected="${!!(picked && t === picked.getTime())}" aria-label="${esc(d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))}">${d.getDate()}</button>${i % 7 === 6 ? '</div>' : ''}`
      }
      el.innerHTML = `<div class="npd-head"><button type="button" class="npd-nav" data-nav="-1" aria-label="Previous month">${CHEV(0)}</button><b aria-live="polite">${esc(view.toLocaleDateString([], { month: 'long', year: 'numeric' }))}</b><button type="button" class="npd-nav" data-nav="1" aria-label="Next month">${CHEV(1)}</button></div>
        <div class="npd-days" aria-hidden="true">${days.map(d => `<span>${esc(d)}</span>`).join('')}</div>
        <div class="npd-grid ${dir > 0 ? 'fwd' : dir < 0 ? 'back' : ''}" role="grid">${cells}</div>
        <div class="npd-foot"><button type="button" class="npd-btn" data-today>Today</button>${inp.value ? '<button type="button" class="npd-btn" data-clear>Clear</button>' : ''}</div>`
    }
    const pick = s => { if (inp.value !== s) { inp.value = s; fire(inp, 'input', 'change') } close(true) }
    const move = (d, keep = true) => {
      const was = view.getTime(); focus = d
      if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1)
      draw(view.getTime() > was ? 1 : view.getTime() < was ? -1 : 0)
      if (keep) { const b = el.querySelector('.npd-d.act'); if (b) b.focus({ preventScroll: true }) }
    }
    el.addEventListener('click', e => {
      const n = e.target.closest('[data-nav]'); if (n) { const k = +n.dataset.nav; move(new Date(focus.getFullYear(), focus.getMonth() + k, Math.min(focus.getDate(), 28)), false); el.querySelector(`[data-nav="${k}"]`).focus(); return }
      const d = e.target.closest('[data-d]'); if (d) return pick(d.dataset.d)
      if (e.target.closest('[data-today]')) return pick(iso(today))
      if (e.target.closest('[data-clear]')) return pick('')
    })
    draw()
    open(inp, el, e => {
      const k = e.key, add = n => new Date(focus.getFullYear(), focus.getMonth(), focus.getDate() + n)
      const inGrid = !!document.activeElement.closest('.npd-grid')
      if (k === 'Escape') { e.preventDefault(); return close(true) }
      if (k === 'Tab') { const f = [...el.querySelectorAll('button[tabindex="0"], .npd-nav, .npd-btn')]; const i = f.indexOf(document.activeElement); e.preventDefault(); return f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus() }
      if (!inGrid) return
      const m = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[k]
      if (m) { e.preventDefault(); return move(add(document.dir === 'rtl' && Math.abs(m) === 1 ? -m : m)) }
      if (k === 'PageUp' || k === 'PageDown') { e.preventDefault(); const s = k === 'PageUp' ? -1 : 1; return move(new Date(focus.getFullYear() + (e.shiftKey ? s : 0), focus.getMonth() + (e.shiftKey ? 0 : s), Math.min(focus.getDate(), 28))) }
      if (k === 'Home') { e.preventDefault(); return move(add(-((focus.getDay() - first + 7) % 7))) }
      if (k === 'End') { e.preventDefault(); return move(add(6 - (focus.getDay() - first + 7) % 7)) }
      if (k === 'Enter' || k === ' ') { e.preventDefault(); return pick(iso(focus)) }
    })
    setTimeout(() => { const b = el.querySelector('.npd-d.act'); if (b) b.focus({ preventScroll: true }) }, 0)
  }

  // ------------------------------------------------------------------ wiring
  const isSel = t => t && t.tagName === 'SELECT' && !t.multiple && !(t.size > 1)
  const isColor = t => t && t.tagName === 'INPUT' && t.type === 'color'
  const isDate = t => t && t.tagName === 'INPUT' && t.type === 'date'
  document.addEventListener('mousedown', e => {
    if (e.button !== 0) return
    const t = e.target
    if (cur && cur.el.contains(t)) return
    const owner = cur && cur.owner
    if (isSel(t) || isDate(t)) {
      e.preventDefault()
      const again = owner === t; close(false)
      if (!again) { t.focus({ preventScroll: true }); (isSel(t) ? openSelect : openDate)(t) }
      return
    }
    if (cur && !(owner && owner.contains(t))) close(false)
  }, true)
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('input[type=color]') || (e.target.tagName === 'LABEL' && e.target.querySelector('input[type=color]'))
    if (!isColor(t)) return
    e.preventDefault()
    if (cur && cur.owner === (t.closest('label, .cswatch') || t)) return close(false)
    openColor(t)
  }, true)
  document.addEventListener('keydown', e => {
    if (cur) {
      if (cur.onKey) cur.onKey(e)
      if (e.defaultPrevented) e.stopImmediatePropagation()
      return
    }
    const t = e.target
    if (isSel(t) && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'F4')) { e.preventDefault(); e.stopImmediatePropagation(); openSelect(t) }
    else if (isDate(t) && (e.key === ' ' || e.key === 'Enter' || (e.altKey && e.key === 'ArrowDown') || e.key === 'F4')) { e.preventDefault(); e.stopImmediatePropagation(); openDate(t) }
  }, true)
  addEventListener('resize', () => { if (cur) place(cur.el, cur.owner) })
  // the page scrolled under an open panel: keep it on its owner, and close it once the owner has left the screen
  addEventListener('scroll', e => {
    if (!cur || (e.target && e.target.nodeType === 1 && cur.el.contains(e.target))) return
    const r = cur.owner.getBoundingClientRect()
    if (r.bottom < 0 || r.top > innerHeight) close(false); else place(cur.el, cur.owner)
  }, true)
  addEventListener('blur', () => close(false))
  window.NovaPick = { close, openSelect, openColor, openDate, get open() { return !!cur } }
})()
