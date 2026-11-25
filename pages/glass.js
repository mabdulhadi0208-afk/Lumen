/* Lumen Nova real liquid glass for lumen:// pages (docs/NOVA.md, "Real liquid glass").
 *
 * Every glass surface gets its own SVG lens: a displacement map that is neutral in the middle and bends the
 * backdrop hard at the rim, like the edge of a thick slab of glass. Red, green and blue are bent by slightly
 * different amounts, so the rim shows a faint chromatic fringe. The filter is referenced from CSS as
 * `backdrop-filter: var(--lens, ) var(--blur)`, and --lens is set here per element (it does not inherit).
 * A specular glint follows the pointer on springs (--gx, --gy, --go).
 * Motion Off and reduced motion fall back to plain blur: no lens, no moving glint.
 */
;(function (global) {
  const NS = 'http://www.w3.org/2000/svg'
  const SEL = [
    '.card', '.nav', '.searchbox', '.tile .ti', '.rc', '.pcard', '.date', '.nstats', '.ntp .foot', '.customize', '.drawer',
    '.pdialog', '.ntp-card', '.nv-dlg', '#pflash', '.abouthero', '.err .ico', '.err code', '.errwait', '.seg.big', '.ptips',
    '.toolbar input[type=search]', '.pauto', '.an-dial', '.cg-track', '.crash .ico', '.hero', '.note.errnote', '.drow', '.wpb i', '.hm-glass',
  ].join(',')
  const reduce = global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches
  let on = !reduce, svg = null, seq = 0
  const cache = new Map()      // size key -> { id, uses }
  const keyOf = new WeakMap()  // element -> size key
  const seen = new WeakSet()

  function root() {
    if (svg && svg.isConnected) return svg
    svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true')
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'
    svg.appendChild(document.createElementNS(NS, 'defs'))
    document.body.appendChild(svg)
    return svg
  }

  // signed distance from a point to the edge of a rounded rectangle (negative inside)
  const sdf = (px, py, w, h, r) => {
    const qx = Math.abs(px - w / 2) - (w / 2 - r), qy = Math.abs(py - h / 2) - (h / 2 - r)
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  }
  // the displacement map: R moves x, G moves y, 128 means "stay put"
  function mapURL(w, h, r, bezel) {
    const s = Math.min(1, 240 / Math.max(w, h))
    const cw = Math.max(2, Math.ceil(w * s)), ch = Math.max(2, Math.ceil(h * s))
    const c = document.createElement('canvas'); c.width = cw; c.height = ch
    const x = c.getContext('2d'), img = x.createImageData(cw, ch), d = img.data
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const px = (i + 0.5) / s, py = (j + 0.5) / s
      const dist = -sdf(px, py, w, h, r)
      let dx = 0, dy = 0
      if (dist > 0 && dist < bezel) {
        const t = 1 - dist / bezel, m = t * t * (1.4 - 0.4 * t)
        const nx = sdf(px + 1, py, w, h, r) - sdf(px - 1, py, w, h, r), ny = sdf(px, py + 1, w, h, r) - sdf(px, py - 1, w, h, r)
        const l = Math.hypot(nx, ny) || 1
        dx = -nx / l * m; dy = -ny / l * m
      }
      const o = (j * cw + i) * 4
      d[o] = 128 + dx * 127; d[o + 1] = 128 + dy * 127; d[o + 2] = 128; d[o + 3] = 255
    }
    x.putImageData(img, 0, 0)
    return c.toDataURL()
  }
  const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n }
  // one filter per size (rounded to 2px) and strength, shared by every element of that size
  function lens(w, h, r, k = 1) {
    w = Math.max(4, Math.round(w / 2) * 2); h = Math.max(4, Math.round(h / 2) * 2); r = Math.min(Math.round(r), w / 2, h / 2)
    const key = `${w}x${h}r${r}k${k}`
    let c = cache.get(key)
    if (c) return c
    const bezel = Math.max(6, Math.min(r * 1.25 + 6, Math.min(w, h) / 2, 44))
    const scale = Math.round(Math.min(bezel * 1.15, 46) * k)
    const id = 'lumen-lens-' + (++seq)
    const f = el('filter', { id, x: 0, y: 0, width: w, height: h, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' })
    f.appendChild(el('feImage', { href: mapURL(w, h, r, bezel), x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', result: 'map' }))
    const ch = [['r', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['g', 1.07, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['b', 1.15, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']]
    for (const [n, m, v] of ch) {
      f.appendChild(el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: Math.round(scale * m), xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + n }))
      f.appendChild(el('feColorMatrix', { in: 'd' + n, type: 'matrix', values: v, result: n }))
    }
    f.appendChild(el('feBlend', { in: 'r', in2: 'g', mode: 'screen', result: 'rg' }))
    f.appendChild(el('feBlend', { in: 'rg', in2: 'b', mode: 'screen' }))
    root().firstChild.appendChild(f)
    c = { id, key, uses: 0, url: `url(#${id})` }
    cache.set(key, c)
    return c
  }
  // the CSS a fixed-size round lens needs (the cursor droplet)
  const lensURL = (w, h, r, k) => on ? lens(w, h, r, k).url : ''

  function release(e) {
    const k = keyOf.get(e); if (!k) return
    keyOf.delete(e)
    const c = cache.get(k); if (c && --c.uses <= 0 && cache.size > 60) { cache.delete(k); const f = document.getElementById(c.id); if (f) f.remove() }
  }
  function fit(e) {
    if (!on || !e.isConnected) { release(e); e.style.removeProperty('--lens'); return }
    const w = e.offsetWidth, h = e.offsetHeight
    if (w < 8 || h < 8 || w * h > 2.2e6 || h > 1800) { release(e); e.style.removeProperty('--lens'); return }
    const cs = getComputedStyle(e)
    const r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, Math.min(w, h) / 2)
    const k = parseFloat(cs.getPropertyValue('--lens-k')) || 1
    const c = lens(w, h, r, k)
    const key = c.key
    if (keyOf.get(e) !== key) { release(e); keyOf.set(e, key); c.uses++ }
    e.style.setProperty('--lens', c.url)
  }
  const ro = 'ResizeObserver' in global ? new ResizeObserver(es => es.forEach(x => fit(x.target))) : null
  let queued = false
  function scan() {
    queued = false
    document.querySelectorAll(SEL).forEach(e => {
      if (seen.has(e) || e.closest('[data-nolens]')) return   // a page can opt out (the home page fakes its glass)
      seen.add(e); e.classList.add('lg')
      if (ro) ro.observe(e); else fit(e)
    })
  }
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(scan) } }

  // ---------------------------------------------------------------- the specular glint
  const glints = new WeakMap()
  let cur = null
  function glint(e) {
    let g = glints.get(e); if (g) return g
    const S = global.Jelly && Jelly.Spring
    if (!S) return null
    const set = (n, v) => e.style.setProperty(n, n === '--go' ? v.toFixed(3) : v.toFixed(1) + 'px')
    g = { x: new S(0, 'trail', v => set('--gx', v)), y: new S(0, 'trail', v => set('--gy', v)), o: new S(0, 'jelly', v => set('--go', Math.max(0, v))) }
    glints.set(e, g)
    return g
  }
  function move(ev) {
    if (!on || ev.pointerType === 'touch') return
    const t = ev.target && ev.target.closest ? ev.target.closest('.lg') : null
    if (t !== cur) { if (cur) { const g = glints.get(cur); if (g) g.o.to(0) } cur = t }
    if (!t) return
    const g = glint(t); if (!g) return
    const r = t.getBoundingClientRect()
    const fresh = g.o.v < 0.02
    const x = ev.clientX - r.left, y = ev.clientY - r.top
    if (fresh) { g.x.set(x); g.y.set(y) } else { g.x.to(x); g.y.to(y) }
    g.o.to(1)
  }

  function start() {
    root(); scan()
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true })
    document.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', () => { if (cur) { const g = glints.get(cur); if (g) g.o.to(0); cur = null } })
    addEventListener('resize', () => document.querySelectorAll('.lg').forEach(fit))
  }
  function setMode(m) {
    const was = on
    on = !reduce && m !== 'off'
    document.documentElement.classList.toggle('lg-off', !on)
    if (was !== on) document.querySelectorAll('.lg').forEach(fit)
  }
  if (document.body) start(); else addEventListener('DOMContentLoaded', start)
  global.Glass = { setMode, lens: lensURL, refit: () => document.querySelectorAll('.lg').forEach(fit), get on() { return on }, SEL }
})(window)
