// Lumen Nova app icon: one master SVG template, recolored per variant.
// tools/icons/render.js turns it into build/icon.svg and every icon PNG.

const VARIANTS = {
  //          tile gradient: a (top-left), b (middle), c (bottom-right); deep shade; core tint; ring tint
  default:  { a: '#4467ff', b: '#7a4ff2', c: '#ef4f9c', deep: '#170f5c', core: '#cfd6ff', ring: '#ffd2f0' },
  midnight: { a: '#1b2b72', b: '#111a4d', c: '#2e2a7a', deep: '#04061c', core: '#b9c9ff', ring: '#8fb0ff' },
  sunset:   { a: '#ffae3d', b: '#ff5f6d', c: '#d6338a', deep: '#6e1236', core: '#ffe2c4', ring: '#ffe9b0' },
  mint:     { a: '#34e0b0', b: '#13b59a', c: '#0b8a8a', deep: '#033f42', core: '#d4fff0', ring: '#c8fff0' },
  ocean:    { a: '#31d6f0', b: '#1477d6', c: '#0b2f86', deep: '#030f3d', core: '#cdf4ff', ring: '#9ff0ff' },
  gold:     { a: '#ffe08a', b: '#e9a823', c: '#a9620a', deep: '#4a2502', core: '#fff1c9', ring: '#fff3c4' },
  rose:     { a: '#ffb1cc', b: '#ff6f9f', c: '#d93a78', deep: '#6b0f3a', core: '#ffe0ec', ring: '#ffe3ef' },
  mono:     { a: '#8c9099', b: '#4a4d55', c: '#1f2126', deep: '#050608', core: '#e9ebf0', ring: '#f2f3f6' },
}

// Continuous-corner squircle (superellipse, n = 4.4) on the macOS Big Sur grid:
// an 824px tile centered on a 1024px canvas, leaving room for the drop shadow.
function squircle(cx = 512, cy = 512, r = 412, n = 4.4, steps = 360) {
  const pts = []
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const c = Math.cos(t), s = Math.sin(t)
    const x = cx + r * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)
    const y = cy + r * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)
    pts.push(x.toFixed(2) + ' ' + y.toFixed(2))
  }
  return 'M ' + pts.join(' L ') + ' Z'
}

// Four-point nova spark centered on (x, y) with radius r; k pinches the waist.
function spark(x, y, r, k = 0.16) {
  const w = r * k
  return `M ${x} ${y - r} Q ${x + w} ${y - w} ${x + r} ${y} Q ${x + w} ${y + w} ${x} ${y + r} ` +
    `Q ${x - w} ${y + w} ${x - r} ${y} Q ${x - w} ${y - w} ${x} ${y - r} Z`
}

function svg(id = 'default', size = 1024) {
  const v = VARIANTS[id] || VARIANTS.default
  const SQ = squircle()
  const TILT = -22
  const RX = 318, RY = 104 // the ring: an ellipse around the core, tilted
  const back = `M ${512 - RX} 512 A ${RX} ${RY} 0 0 1 ${512 + RX} 512`
  const front = `M ${512 - RX} 512 A ${RX} ${RY} 0 0 0 ${512 + RX} 512`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="${v.a}"/>
      <stop offset="0.52" stop-color="${v.b}"/>
      <stop offset="1" stop-color="${v.c}"/>
    </linearGradient>
    <radialGradient id="nebula" cx="0.5" cy="1.05" r="0.75">
      <stop offset="0" stop-color="${v.deep}" stop-opacity="0.7"/>
      <stop offset="1" stop-color="${v.deep}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="topLight" cx="0.22" cy="0.08" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.36"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="0.3" stop-color="${v.core}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${v.core}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core" cx="0.4" cy="0.34" r="0.72">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.4" stop-color="#ffffff"/>
      <stop offset="0.8" stop-color="${v.core}"/>
      <stop offset="1" stop-color="${v.ring}"/>
    </radialGradient>
    <radialGradient id="coreRim" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.7" stop-color="${v.deep}" stop-opacity="0"/>
      <stop offset="1" stop-color="${v.deep}" stop-opacity="0.2"/>
    </radialGradient>
    <linearGradient id="ringBack" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.5" stop-color="${v.ring}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.32"/>
    </linearGradient>
    <linearGradient id="ringFront" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${v.ring}" stop-opacity="0.85"/>
      <stop offset="0.3" stop-color="#ffffff"/>
      <stop offset="0.62" stop-color="${v.core}"/>
      <stop offset="1" stop-color="${v.ring}"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.7"/>
      <stop offset="0.35" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="0.75" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.22"/>
    </linearGradient>
    <linearGradient id="glassSheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="coreClip" clipPathUnits="userSpaceOnUse"><circle cx="512" cy="512" r="182" transform="rotate(22 512 512)"/></clipPath>
    <clipPath id="tile"><path d="${SQ}"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="${v.deep}" flood-opacity="0.38"/>
    </filter>
    <filter id="blur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="blur14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>

  <!-- tile with soft depth -->
  <path d="${SQ}" fill="url(#bg)" filter="url(#shadow)"/>
  <g clip-path="url(#tile)">
    <rect width="1024" height="1024" fill="url(#nebula)"/>
    <rect width="1024" height="1024" fill="url(#topLight)"/>

    <!-- soft light around the core -->
    <circle cx="512" cy="512" r="330" fill="url(#halo)" opacity="0.62" filter="url(#blur40)"/>

    <!-- back half of the refractive ring, behind the core -->
    <g transform="rotate(${TILT} 512 512)">
      <path d="${back}" fill="none" stroke="url(#ringBack)" stroke-width="40" stroke-linecap="round"/>
    </g>

    <!-- luminous core -->
    <circle cx="512" cy="512" r="200" fill="#ffffff" opacity="0.55" filter="url(#blur14)"/>
    <circle cx="512" cy="512" r="182" fill="url(#core)"/>
    <circle cx="512" cy="512" r="182" fill="url(#coreRim)"/>
    <ellipse cx="458" cy="440" rx="74" ry="44" transform="rotate(-30 458 440)" fill="#ffffff" opacity="0.9" filter="url(#blur6)"/>

    <!-- front half of the ring: glow, glass band, refraction line -->
    <g transform="rotate(${TILT} 512 512)">
      <path d="${front}" fill="none" stroke="${v.deep}" stroke-opacity="0.45" stroke-width="70" stroke-linecap="round" filter="url(#blur14)" clip-path="url(#coreClip)"/>
      <path d="${front}" fill="none" stroke="#ffffff" stroke-opacity="0.4" stroke-width="70" stroke-linecap="round" filter="url(#blur14)"/>
      <path d="${front}" fill="none" stroke="url(#ringFront)" stroke-width="48" stroke-linecap="round"/>
      <path d="M ${512 - RX + 26} 506 A ${RX - 24} ${RY - 12} 0 0 0 ${512 + RX - 26} 506" fill="none" stroke="#ffffff" stroke-opacity="0.9" stroke-width="8" stroke-linecap="round"/>
      <path d="M ${512 - RX + 40} 532 A ${RX - 40} ${RY - 10} 0 0 0 ${512 + RX - 40} 532" fill="none" stroke="${v.b}" stroke-opacity="0.35" stroke-width="10" stroke-linecap="round"/>
    </g>

    <!-- nova spark -->
    <circle cx="772" cy="300" r="46" fill="#ffffff" opacity="0.55" filter="url(#blur14)"/>
    <path d="${spark(772, 300, 62)}" fill="#ffffff"/>

    <!-- liquid glass sheen and refractive edge -->
    <path d="M 100 100 H 924 V 470 C 700 400 330 400 100 520 Z" fill="url(#glassSheen)"/>
    <path d="${SQ}" fill="none" stroke="url(#edge)" stroke-width="7"/>
  </g>
</svg>
`
}

module.exports = { VARIANTS, svg, squircle }
