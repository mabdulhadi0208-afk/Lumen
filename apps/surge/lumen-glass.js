// Lumen liquid glass for Surge and Koi (docs/NOVA.md, "Real liquid glass"). Copied into apps/ by tools/import-apps.py
// and loaded in every Surge and Koi window, after the window's own scripts. Looks only: it never touches ids, classes,
// handlers or IPC.
//  - lens: glass bends what is behind it. Each glass surface gets its own SVG displacement filter, sized to it and
//    strongest at the rim, with the red, green and blue channels bent by slightly different amounts (a chromatic
//    fringe). The stylesheet uses it as `backdrop-filter: var(--nv-lens) blur() saturate()`.
//  - glint: a specular highlight that follows the pointer across each glass surface on a soft spring
//    (--gx / --gy on the surface), and rests at the top-left when the pointer leaves.
//  - rolling digits for the Surge Dock clock (lumenRoll), used by a small patch in dock.html.
// Calm under reduced motion: no lens, no glint movement, digits change without rolling.
(() => {
  if (window.__lumenGlass) return; window.__lumenGlass = true
  const d = document, root = d.documentElement
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const NS = 'http://www.w3.org/2000/svg'
  const lensOK = (() => { try { return CSS.supports('backdrop-filter', 'url(#a) blur(2px)') || CSS.supports('-webkit-backdrop-filter', 'url(#a) blur(2px)') } catch { return false } })()

  /* ---------------------------------------------------------------- the lens */
  // which surfaces bend their backdrop (only where there is something behind them to bend: the glass in opaque windows)
  const LENS = {
    settings: 'aside,.card,.mod,.step,.theme,.hero,.toast,.nsearch,.status,.vol',
    ksettings: '.card,.perm,.rec',
    kapp: '.ctl,#cap,.wn>div,#toast,.menubar,.mkc',
    kupdate: '',
    popover: '', notes: '', clip: '', launchpad: '', dock: '', kpop: '', dialog: '.card',
  }
  const tag = root.dataset.lg || ''
  let host = null, seq = 0
  const maps = new Map(), owned = new WeakMap()
  function defs() {
    if (host) return host
    const svg = d.createElementNS(NS, 'svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0')
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'
    host = d.createElementNS(NS, 'defs'); svg.appendChild(host); (d.body || root).appendChild(svg); return host
  }
  // a displacement map for a rounded rectangle: neutral inside, pushed inward toward the rim (a thick lens edge)
  function mapFor(w, h, r, band) {
    const k = `${w}x${h}r${r}b${band}`; if (maps.has(k)) return maps.get(k)
    const s = Math.min(1, 360 / Math.max(w, h)), W = Math.max(8, Math.round(w * s)), H = Math.max(8, Math.round(h * s)), R = Math.min(r * s, W / 2, H / 2), B = Math.max(2, band * s)
    const c = d.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), img = x.createImageData(W, H), p = img.data
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
      const px = i + .5 - W / 2, py = y + .5 - H / 2, qx = Math.abs(px) - (W / 2 - R), qy = Math.abs(py) - (H / 2 - R)
      const sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R
      let t = Math.max(0, Math.min(1, 1 + sd / B)); t = t * t * t           // 0 inside, rising sharply to 1 at the rim
      let nx = 0, ny = 0
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = Math.sign(px) * qx / l; ny = Math.sign(py) * qy / l }
      else if (qx > qy) nx = Math.sign(px); else ny = Math.sign(py)
      const o = (y * W + i) * 4; p[o] = 128 - nx * t * 127; p[o + 1] = 128 - ny * t * 127; p[o + 2] = 128; p[o + 3] = 255
    }
    x.putImageData(img, 0, 0); const u = c.toDataURL(); maps.set(k, u); return u
  }
  function lensFor(el) {
    const r = el.getBoundingClientRect(), w = Math.round(el.offsetWidth || r.width), h = Math.round(el.offsetHeight || r.height)
    if (w < 24 || h < 16) return
    const cs = getComputedStyle(el), rad = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, w / 2, h / 2)
    const band = Math.max(10, Math.min(28, Math.min(w, h) * .22)), sc = Math.round(Math.max(14, Math.min(34, Math.min(w, h) * .14)))
    const key = `${w}x${h}r${Math.round(rad)}`
    const prev = owned.get(el); if (prev && prev.key === key) return
    const id = prev ? prev.id : 'lumen-lens-' + (++seq)
    let f = prev && d.getElementById(id)
    if (!f) { f = d.createElementNS(NS, 'filter'); f.id = id; defs().appendChild(f) }
    f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', w); f.setAttribute('height', h)
    f.setAttribute('filterUnits', 'userSpaceOnUse'); f.setAttribute('primitiveUnits', 'userSpaceOnUse'); f.setAttribute('color-interpolation-filters', 'sRGB')
    const ch = (n, s) => `<feDisplacementMap in="SourceGraphic" in2="m" scale="${s}" xChannelSelector="R" yChannelSelector="G" result="d${n}"/><feColorMatrix in="d${n}" type="matrix" values="${n === 'r' ? '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0' : n === 'g' ? '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0' : '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0'} 0 0 0 1 0" result="${n}"/>`
    f.innerHTML = `<feImage href="${mapFor(w, h, Math.round(rad), Math.round(band))}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>${ch('r', sc)}${ch('g', Math.round(sc * .9))}${ch('b', Math.round(sc * .8))}<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/>`
    owned.set(el, { id, key }); el.style.setProperty('--nv-lens', `url(#${id})`)
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(es => { for (const e of es) lensFor(e.target) }) : null
  const seen = new WeakSet()
  function scanLens() {
    const sel = LENS[tag]; if (!sel || !lensOK || still()) return
    for (const el of d.querySelectorAll(sel)) { if (seen.has(el)) continue; seen.add(el); lensFor(el); ro && ro.observe(el) }
  }
  if (lensOK && !still()) root.classList.add('lg-lens')

  /* ---------------------------------------------------------------- the glint */
  const GLINT = '[data-glint],.card,.mod,.step,.theme,.hero,aside,.panel,header,.q,.m,.it,.a,.w,.box,.pad,.win,#panel,.row,.up-b,.go,.perm,.ctl,#cap,.wn>div,.chip,.dl,.ib,.btn'
  const live = new Map()   // element -> spring state
  let raf = 0
  function step() {
    raf = 0; let any = false
    for (const [el, s] of live) {
      s.vx = (s.vx + (s.tx - s.x) * .16) * .72; s.vy = (s.vy + (s.ty - s.y) * .16) * .72; s.x += s.vx; s.y += s.vy   // a soft, lightly damped spring
      s.vo = (s.vo + (s.to - s.o) * .14) * .7; s.o += s.vo
      el.style.setProperty('--gx', s.x.toFixed(1) + 'px'); el.style.setProperty('--gy', s.y.toFixed(1) + 'px'); el.style.setProperty('--go', Math.max(0, Math.min(1, s.o)).toFixed(3))
      if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) + Math.abs(s.to - s.o) < .3 && Math.abs(s.vx) + Math.abs(s.vy) < .1) { if (s.to === 0) { live.delete(el); el.style.removeProperty('--gx'); el.style.removeProperty('--gy'); el.style.removeProperty('--go') } }
      else any = true
    }
    if (any) raf = requestAnimationFrame(step)
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(step) }
  let over = new Set()
  addEventListener('pointermove', e => {
    if (still()) return
    const now = new Set(); let n = e.target && e.target.closest ? e.target.closest(GLINT) : null
    for (let k = 0; n && k < 3; k++, n = n.parentElement && n.parentElement.closest(GLINT)) now.add(n)
    for (const el of now) {
      const r = el.getBoundingClientRect(), z = (r.width / (el.offsetWidth || r.width)) || 1
      const x = (e.clientX - r.left) / z, y = (e.clientY - r.top) / z
      let s = live.get(el); if (!s) { s = { x, y, vx: 0, vy: 0, o: 0, vo: 0 }; live.set(el, s) }
      s.tx = x; s.ty = y; s.to = 1
    }
    for (const el of over) if (!now.has(el)) { const s = live.get(el); if (s) s.to = 0 }
    over = now; kick()
  }, { passive: true })
  d.addEventListener('pointerleave', () => { for (const el of over) { const s = live.get(el); if (s) s.to = 0 } over = new Set(); kick() })

  /* ---------------------------------------------------------------- rolling digits (Surge Dock clock) */
  window.lumenRoll = (el, text) => {
    const parts = String(text).match(/\d|:|[^\d:]+/g) || []
    const mask = parts.map(p => /^\d$/.test(p) ? 'd' : p === ':' ? ':' : 'x').join('')
    const fresh = el.dataset.rollMask !== mask
    if (fresh) {
      el.dataset.rollMask = mask
      el.innerHTML = parts.map(p => /^\d$/.test(p) ? `<span class="lg-rd"><span class="lg-rs">${'0123456789'.split('').map(n => `<b>${n}</b>`).join('')}</span></span>` : p === ':' ? '<i>:</i>' : `<span class="lg-rx">${p.trim()}</span>`).join('')
    }
    const strips = el.querySelectorAll('.lg-rs'); let k = 0
    for (const p of parts) if (/^\d$/.test(p)) { const s = strips[k++]; if (!s) continue; if (fresh || still()) { s.style.transition = 'none'; s.style.setProperty('--d', p); void s.offsetWidth; s.style.transition = '' } else s.style.setProperty('--d', p) }
    el.setAttribute('aria-label', String(text))
  }

  /* ---------------------------------------------------------------- hero banners */
  // Lumen's hero energy on Surge's and Koi's big banners: drifting saturated colour blobs, a large faint outline of the
  // page's icon, a glowing gradient icon tile and one light sweep when the page opens. Decoration only (aria-hidden),
  // appended inside the banner; nothing the tools' own scripts look for is moved or renamed.
  const BOLT = '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>'
  const FAN = '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2.2"/><path d="M8 12h12M8.4 10.6 18.6 5.6M8.4 13.4l10.2 5M8 11.2l11.6-2.6M8 12.8l11.6 2.6"/></svg>'
  const HERO = { settings: '.hero,.card.mh', ksettings: '.lg-khero', kpop: '.hd' }
  function decorate() {
    const sel = HERO[tag]; if (!sel) return
    if (tag === 'ksettings' && !d.querySelector('.lg-khero')) {
      const h1 = d.querySelector('body > h1'), sub = h1 && h1.nextElementSibling && h1.nextElementSibling.classList.contains('sub') ? h1.nextElementSibling : null
      if (h1) { const w = d.createElement('div'); w.className = 'lg-khero'; h1.before(w); w.appendChild(h1); sub && w.appendChild(sub) }
    }
    let k = 0
    for (const el of d.querySelectorAll(sel)) {
      k++
      if (el.querySelector(':scope > .lg-deco')) continue
      const icon = el.querySelector('.mic svg, .lg svg')
      const art = icon ? icon.outerHTML : tag[0] === 'k' ? FAN : BOLT
      const deco = d.createElement('div'); deco.className = 'lg-deco'; deco.setAttribute('aria-hidden', 'true')
      deco.innerHTML = `<i class="lg-orb a"></i><i class="lg-orb b"></i><i class="lg-orb c"></i><span class="lg-art">${art}</span><i class="lg-sweep"></i>`
      el.prepend(deco)
      if (el.classList.contains('hero') || el.classList.contains('lg-khero')) {
        const t = d.createElement('div'); t.className = 'lg-hic'; t.setAttribute('aria-hidden', 'true'); t.innerHTML = tag[0] === 'k' ? FAN : BOLT
        deco.after(t)
      }
      // each module page has its own colour, turned round the wheel from your accent
      if (el.matches('.card.mh')) { const i = [...d.querySelectorAll('nav button')].findIndex(b => b.dataset.p === el.dataset.mh); el.style.setProperty('--ic', `oklch(from var(--nv-a) calc(l + .02) calc(c + .02) calc(h + ${((i < 0 ? 0 : i) * 29) % 200 - 60}))`) }
    }
  }

  /* ---------------------------------------------------------------- start */
  const start = () => { decorate(); scanLens(); new MutationObserver(() => { clearTimeout(start.t); start.t = setTimeout(() => { decorate(); scanLens() }, 60) }).observe(d.body, { childList: true, subtree: true }) }
  if (d.body) start(); else addEventListener('DOMContentLoaded', start)
})()
