/* Lumen liquid glass (Nova 2). Real refraction for the browser chrome.
 *
 * Every floating glass surface gets its own SVG lens filter, sized to the surface: a displacement map that pushes the
 * backdrop inward, strongest in a band along the rounded edge (like a thick lens), split into red, green and blue at
 * slightly different strengths so the rim picks up a chromatic fringe. CSS applies it with
 *   backdrop-filter: var(--lens,) blur(..) saturate(..)
 * so where the lens is off (Motion Off, reduced motion, no support) the surface falls back to plain blur.
 *
 * A specular glint follows the pointer across whichever glass surface it is over (--gx, --gy, --go on that surface,
 * sprung through spring.js so it glides and settles, never jumps).
 *
 * The chrome is a transparent page layered over the native web page views, so a backdrop filter cannot see a web page.
 * Glass.under(el) fixes that for overlay surfaces (command bar, popovers): it paints a snapshot of the page into the page
 * area, clipped to just under the surface, so the glass bends and blurs the real page behind it.
 *
 * Cost: maps are rebuilt only when a surface changes size (ResizeObserver), never per frame. No layout reads per frame.
 * No emoji anywhere.
 */
;(function (global) {
  const NS = 'http://www.w3.org/2000/svg'
  const SEL = '.urlbar, .navbtns, .bottomrow, .pill, .popover, .cmdbar, #findbar, #toast, #tabcard, .peekbar, #aipanel, .prompt, .nowplaying, .tg-search, .tr-box, #trask, .wincontrols, .extbar.has, .hoverurl, .pins .pin.active'
  const reduce = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)')
  let svg, defs, enabled = false, seq = 0
  const maps = new Map()     // size key -> filter id
  const seen = new WeakSet()
  const ro = new ResizeObserver(entries => { for (const e of entries) fit(e.target) })

  function supported() {
    try { return CSS.supports('backdrop-filter', 'url(#a) blur(2px)') } catch { return false }
  }
  function want() {
    const m = document.body.dataset.motion
    return supported() && m !== 'off' && !(reduce && reduce.matches)
  }

  // signed distance to a rounded rectangle (negative inside) and the outward normal at that point
  function sdf(px, py, w, h, r) {
    const cx = w / 2, cy = h / 2
    const qx = Math.abs(px - cx) - (cx - r), qy = Math.abs(py - cy) - (cy - r)
    const sx = px < cx ? -1 : 1, sy = py < cy ? -1 : 1
    let d, nx, ny
    if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; d = l - r; nx = sx * qx / l; ny = sy * qy / l }
    else if (qx > qy) { d = Math.max(qx, qy) - r; nx = sx; ny = 0 }
    else { d = Math.max(qx, qy) - r; nx = 0; ny = sy }
    return [d, nx, ny]
  }

  // the displacement map: R and G hold the inward push, 0.5 = none. Built at half size and stretched by feImage.
  function mapURL(w, h, r, band) {
    const k = 0.5, W = Math.max(8, Math.round(w * k)), H = Math.max(8, Math.round(h * k))
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), d = img.data
    const rr = Math.min(r, w / 2, h / 2)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const [dist, nx, ny] = sdf((x + 0.5) / k, (y + 0.5) / k, w, h, rr)
        const t = Math.max(0, Math.min(1, -dist / band))     // 0 at the edge, 1 a band inside
        const m = Math.pow(1 - t, 2)                       // strongest right at the rim, eases to flat glass
        // plus a gentle convex bulge across the whole slab, so the middle magnifies a little like a real drop
        const bx = ((x + 0.5) / k - w / 2) / (w / 2), by = ((y + 0.5) / k - h / 2) / (h / 2)
        const vx = Math.max(-1, Math.min(1, nx * m + 0.22 * bx)), vy = Math.max(-1, Math.min(1, ny * m + 0.22 * by))
        const i = (y * W + x) * 4
        d[i] = Math.round(255 * (0.5 - 0.5 * vx))
        d[i + 1] = Math.round(255 * (0.5 - 0.5 * vy))
        d[i + 2] = 128; d[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    return c.toDataURL()
  }

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag)
    for (const k in attrs) n.setAttribute(k, attrs[k])
    if (parent) parent.appendChild(n)
    return n
  }

  function filterFor(w, h, r) {
    // bucket sizes so a popover that grows by a pixel does not rebuild its lens
    const bw = Math.ceil(w / 6) * 6, bh = Math.ceil(h / 6) * 6, br = Math.round(r)
    const key = bw + 'x' + bh + 'r' + br
    if (maps.has(key)) return maps.get(key)
    const id = 'lumen-lens-' + (++seq)
    const small = Math.min(bw, bh)
    const band = Math.max(8, Math.min(34, small * 0.5))
    const scale = Math.max(14, Math.min(64, small * 0.85))
    const f = el('filter', { id, x: 0, y: 0, width: bw, height: bh, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, defs)
    el('feImage', { href: mapURL(bw, bh, br, band), x: 0, y: 0, width: bw, height: bh, preserveAspectRatio: 'none', result: 'map' }, f)
    const chan = ['1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']
    ;[1, 0.93, 0.86].forEach((s, i) => {
      el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: (scale * s).toFixed(1), xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + i }, f)
      el('feColorMatrix', { in: 'd' + i, type: 'matrix', values: chan[i], result: 'c' + i }, f)
    })
    el('feBlend', { in: 'c0', in2: 'c1', mode: 'screen', result: 'c01' }, f)
    el('feBlend', { in: 'c01', in2: 'c2', mode: 'screen' }, f)
    // keep the defs small: the oldest lenses go once there are many sizes
    if (maps.size > 48) { const [k0, id0] = maps.entries().next().value; maps.delete(k0); const old = document.getElementById(id0); if (old) old.remove() }
    maps.set(key, id)
    return id
  }

  function fit(node) {
    if (!enabled) { node.style.removeProperty('--lens'); return }
    const w = node.offsetWidth, h = node.offsetHeight
    if (w < 8 || h < 8) return
    const r = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 12
    node.style.setProperty('--lens', `url(#${filterFor(w, h, Math.min(r, h / 2, w / 2))})`)
  }

  function track(node) {
    if (seen.has(node)) return
    seen.add(node); ro.observe(node); fit(node)
  }
  function scan() { document.querySelectorAll(SEL).forEach(track) }

  // ---------------------------------------------------------------- the glint that follows the pointer
  let cur = null, fading = null, gx, gy, go
  function clear(n) { if (n) { n.style.removeProperty('--go'); n.style.removeProperty('--gx'); n.style.removeProperty('--gy') } }
  function paint() {
    const t = cur || fading
    if (!t) return
    t.style.setProperty('--gx', gx.value.toFixed(1) + 'px')
    t.style.setProperty('--gy', gy.value.toFixed(1) + 'px')
    t.style.setProperty('--go', Math.max(0, Math.min(1, go.value)).toFixed(3))
  }
  function initSprings() {
    if (gx || typeof Spring === 'undefined') return
    gx = new Spring(0, 'jelly', paint); gy = new Spring(0, 'jelly', paint); go = new Spring(0, 'calm', paint)
  }
  function leave() {
    if (!cur) return
    if (fading && fading !== cur) clear(fading)
    fading = cur; cur = null
    go.onRest = () => { go.onRest = null; if (fading) { clear(fading); fading = null } }
    go.to(0)
  }
  function onMove(e) {
    if (!enabled || !gx) return
    const s = e.target && e.target.closest ? e.target.closest(SEL) : null
    if (s !== cur) {
      leave()
      if (!s) return
      if (fading) { clear(fading); fading = null }
      cur = s; go.onRest = null
      const r = s.getBoundingClientRect()
      gx.set(e.clientX - r.left); gy.set(e.clientY - r.top); go.set(0); go.to(1)
      return
    }
    if (!s) return
    const r = s.getBoundingClientRect()
    gx.to(e.clientX - r.left); gy.to(e.clientY - r.top)
  }

  // ---------------------------------------------------------------- page snapshot under overlay surfaces
  let under = null, underEl = null, underRect = null
  function underLayer() {
    if (underEl) return underEl
    underEl = document.getElementById('pageglass')
    return underEl
  }
  function clipUnder() {
    const u = underLayer(); if (!u || !under || !underRect) return
    const p = underRect
    // the surface's resting box (transforms excluded), inset a little so nothing peeks past its rounded edge
    const L = under.offsetLeft, T = under.offsetTop, W = under.offsetWidth, H = under.offsetHeight
    const r = parseFloat(getComputedStyle(under).borderTopLeftRadius) || 16
    const top = T + 3 - p.y, left = L + 3 - p.x, right = p.x + p.width - (L + W - 3), bottom = p.y + p.height - (T + H - 3)
    u.style.clipPath = `inset(${Math.max(0, top)}px ${Math.max(0, right)}px ${Math.max(0, bottom)}px ${Math.max(0, left)}px round ${Math.max(0, r - 3)}px)`
  }
  const uro = new ResizeObserver(() => clipUnder())
  function underOn(node, rect, src) {
    const u = underLayer(); if (!u || !enabled || !src) return
    if (under && under !== node) { uro.unobserve(under); under.classList.remove('lg-under') }
    under = node; underRect = rect
    Object.assign(u.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px', backgroundImage: `url("${src}")` })
    clipUnder(); uro.observe(node)
    u.classList.add('show'); node.classList.add('lg-under')
  }
  function underOff() {
    const u = underLayer(); if (u) { u.classList.remove('show'); u.style.backgroundImage = '' }
    if (under) { uro.unobserve(under); under.classList.remove('lg-under') }
    under = null
  }

  function setEnabled(on) {
    enabled = on
    document.body.classList.toggle('lens', on)
    if (!on) { underOff(); clear(cur); clear(fading); cur = fading = null }
    document.querySelectorAll(SEL).forEach(n => fit(n))
  }

  function init() {
    svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none' })
    defs = el('defs', {}, svg)
    document.body.prepend(svg)
    initSprings()
    scan()
    // surfaces come and go (popover content, prompts, the pinned tab that is active): pick new ones up as they appear
    new MutationObserver(() => { if (!scan._q) { scan._q = true; requestAnimationFrame(() => { scan._q = false; scan() }) } })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    new MutationObserver(() => { if (want() !== enabled) setEnabled(want()) }).observe(document.body, { attributes: true, attributeFilter: ['data-motion'] })
    if (reduce && reduce.addEventListener) reduce.addEventListener('change', () => setEnabled(want()))
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', leave)
    setEnabled(want())
  }

  global.Glass = { init, refit: n => (n ? fit(n) : document.querySelectorAll(SEL).forEach(fit)), under: underOn, underOff, enabled: () => enabled }
  if (document.body) init(); else addEventListener('DOMContentLoaded', init)
})(window)
