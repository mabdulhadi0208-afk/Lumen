// Lumen 4.0 app icon: one master SVG template, recolored per variant.
// tools/icons/render.js turns it into build/icon.svg and every icon PNG.
//
// The identity stays the same (a planet, its ring and a nova spark) but every layer is rebuilt:
//   - a deep nebula tile lit from the spark's corner, with a little star dust and a liquid-glass bezel
//   - the planet is a glass orb: refracted color inside, a caustic where light gathers, a Fresnel rim,
//     a sharp specular and the ring's shadow on it
//   - the ring is a thick glass band with a lit top edge, a darker division and a glow
//   - the spark is a lens flare: a four-point star with long light rays and a small companion star
// Small sizes (64 px and under) get a hinted version: fewer fine lines, a bolder ring, a bigger spark.

const VARIANTS = {
  //          tile gradient a (top-left) / b (middle) / c (bottom-right); deep shade; core and ring tints;
  //          body: the planet's glass color; hot: the light that the spark throws (caustics, flare, rim)
  default:  { a: '#3f63ff', b: '#7440f0', c: '#f04d98', deep: '#0f0a46', core: '#d9e0ff', ring: '#ffd6f1', body: '#8f8bff', hot: '#7ff0ff' },
  midnight: { a: '#1d2f86', b: '#101850', c: '#2c2380', deep: '#02041a', core: '#c4d2ff', ring: '#9cb8ff', body: '#4f63d8', hot: '#74b4ff' },
  sunset:   { a: '#ffb238', b: '#ff5a62', c: '#c92a86', deep: '#5c0c30', core: '#ffe6c8', ring: '#fff0b8', body: '#ff8a6a', hot: '#fff27a' },
  mint:     { a: '#3ef0b8', b: '#12b89a', c: '#08747f', deep: '#022f36', core: '#dafff2', ring: '#d0fff1', body: '#3fd0b0', hot: '#c8ff7e' },
  ocean:    { a: '#36dcf4', b: '#1474dc', c: '#0a257a', deep: '#020b33', core: '#d4f6ff', ring: '#a8f2ff', body: '#3a9cf0', hot: '#7dfff0' },
  gold:     { a: '#ffe48f', b: '#eaa21e', c: '#9a5206', deep: '#3e1d01', core: '#fff3cf', ring: '#fff5cc', body: '#f0b440', hot: '#fffad0' },
  rose:     { a: '#ffb8d2', b: '#ff6a9c', c: '#cf2f6f', deep: '#5c0a33', core: '#ffe4ee', ring: '#ffe7f1', body: '#ff86ae', hot: '#ffd7ae' },
  mono:     { a: '#9296a0', b: '#4a4d56', c: '#1c1e23', deep: '#040507', core: '#eceef3', ring: '#f4f5f8', body: '#8a8e98', hot: '#ffffff' },
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

// A few fixed specks of star dust (only drawn at 128 px and up).
const DUST = [[214, 236, 3.2], [318, 176, 2.2], [602, 168, 2.6], [868, 520, 2.4], [826, 702, 3], [690, 846, 2.2],
  [236, 610, 2.4], [178, 430, 2], [404, 858, 2.6], [930, 380, 1.8], [540, 230, 1.8]]

function svg(id = 'default', size = 1024) {
  const v = VARIANTS[id] || VARIANTS.default
  const small = size <= 64
  const tiny = size <= 24
  const SQ = squircle()
  const TILT = -21
  const PX = 500, PY = 528, PR = small ? 190 : 176 // the planet
  const RX = small ? 340 : 330, RY = small ? 112 : 102 // the ring: an ellipse around the planet, tilted
  const RW = small ? 62 : 46 // ring band width
  const back = `M ${PX - RX} ${PY} A ${RX} ${RY} 0 0 1 ${PX + RX} ${PY}`
  const front = `M ${PX - RX} ${PY} A ${RX} ${RY} 0 0 0 ${PX + RX} ${PY}`
  const SX = small ? 772 : 780, SY = small ? 278 : 270, SR = small ? 96 : 72 // the spark
  const ringT = `rotate(${TILT} ${PX} ${PY})`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0.08" y1="0" x2="0.92" y2="1">
      <stop offset="0" stop-color="${v.a}"/>
      <stop offset="0.5" stop-color="${v.b}"/>
      <stop offset="1" stop-color="${v.c}"/>
    </linearGradient>
    <radialGradient id="nebula" cx="0.42" cy="1.08" r="0.82">
      <stop offset="0" stop-color="${v.deep}" stop-opacity="0.82"/>
      <stop offset="0.55" stop-color="${v.deep}" stop-opacity="0.32"/>
      <stop offset="1" stop-color="${v.deep}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sparkWash" cx="0.78" cy="0.2" r="0.62">
      <stop offset="0" stop-color="${v.hot}" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="${v.hot}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${v.hot}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cornerBloom" cx="0.1" cy="0.06" r="0.6">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="backlight" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.28" stop-color="${v.hot}" stop-opacity="0.6"/>
      <stop offset="0.62" stop-color="${v.core}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${v.core}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="body" cx="0.36" cy="0.28" r="0.82">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.3" stop-color="${v.core}"/>
      <stop offset="0.66" stop-color="${v.body}"/>
      <stop offset="0.9" stop-color="${v.c}"/>
      <stop offset="1" stop-color="${v.deep}"/>
    </radialGradient>
    <radialGradient id="caustic" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.4" stop-color="${v.hot}" stop-opacity="0.75"/>
      <stop offset="1" stop-color="${v.hot}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fresnel" x1="0.85" y1="0.05" x2="0.2" y2="0.95">
      <stop offset="0" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="0.35" stop-color="${v.hot}" stop-opacity="0.65"/>
      <stop offset="0.7" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="${v.hot}" stop-opacity="0.45"/>
    </linearGradient>
    <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.45" stop-color="${v.ring}" stop-opacity="0.32"/>
      <stop offset="0.58" stop-color="${v.ring}" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ringBack" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="0.5" stop-color="${v.ring}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${v.hot}" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="ringFront" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${v.ring}" stop-opacity="0.92"/>
      <stop offset="0.28" stop-color="#ffffff"/>
      <stop offset="0.6" stop-color="${v.core}"/>
      <stop offset="0.86" stop-color="${v.hot}"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
    <linearGradient id="bezel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="0.22" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="0.7" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="${v.hot}" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="glassSheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.26"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ray" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="planet"><circle cx="${PX}" cy="${PY}" r="${PR}"/></clipPath>
    <clipPath id="tile"><path d="${SQ}"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="${v.deep}" flood-opacity="0.42"/>
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
    <filter id="blur60" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
    <filter id="blur28" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
    <filter id="blur14" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>

  <!-- tile: deep nebula, lit from the spark's corner -->
  <path d="${SQ}" fill="url(#bg)" filter="url(#shadow)"/>
  <g clip-path="url(#tile)">
    <rect width="1024" height="1024" fill="url(#nebula)"/>
    <rect width="1024" height="1024" fill="url(#sparkWash)"/>
    <rect width="1024" height="1024" fill="url(#cornerBloom)"/>
    ${small ? '' : DUST.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${(0.35 + (r - 1.8) * 0.3).toFixed(2)}"/>`).join('')}
    ${small ? '' : `<rect x="-200" y="430" width="1500" height="150" fill="url(#sweep)" transform="rotate(-38 512 512)"/>`}

    <!-- backlight: the planet glows from behind -->
    <circle cx="${PX}" cy="${PY}" r="${small ? 320 : 350}" fill="url(#backlight)" opacity="${small ? 0.55 : 0.7}" filter="url(#blur60)"/>

    <!-- back half of the glass ring, behind the planet -->
    <g transform="${ringT}">
      <path d="${back}" fill="none" stroke="url(#ringBack)" stroke-width="${RW - 8}" stroke-linecap="round"/>
      ${small ? '' : `<path d="${back}" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="4" stroke-linecap="round" transform="translate(0 -14)"/>`}
    </g>

    <!-- the planet: a liquid-glass orb -->
    <circle cx="${PX}" cy="${PY}" r="${PR + 18}" fill="#ffffff" opacity="0.35" filter="url(#blur14)"/>
    <circle cx="${PX}" cy="${PY}" r="${PR}" fill="url(#body)"/>
    <g clip-path="url(#planet)">
      ${small ? '' : `<g transform="rotate(${TILT} ${PX} ${PY})" opacity="0.55">
        <rect x="${PX - PR}" y="${PY - 92}" width="${PR * 2}" height="34" fill="url(#band)"/>
        <rect x="${PX - PR}" y="${PY + 70}" width="${PR * 2}" height="24" fill="url(#band)"/>
      </g>`}
      <!-- light gathered through the glass, opposite the highlight -->
      <ellipse cx="${PX + 78}" cy="${PY + 92}" rx="${PR * 0.62}" ry="${PR * 0.44}" transform="rotate(-30 ${PX + 78} ${PY + 92})" fill="url(#caustic)" opacity="${small ? 0.6 : 0.85}" filter="url(#blur28)"/>
      <!-- the ring's shadow across the planet -->
      <g transform="${ringT}">
        <path d="${front}" fill="none" stroke="${v.deep}" stroke-opacity="0.42" stroke-width="${RW + 10}" transform="translate(0 -30)" filter="url(#blur14)"/>
      </g>
      <!-- Fresnel rim, brightest toward the spark -->
      <circle cx="${PX}" cy="${PY}" r="${PR - 6}" fill="none" stroke="url(#fresnel)" stroke-width="${small ? 16 : 14}" opacity="0.8" filter="url(#blur3)"/>
    </g>
    <!-- specular: a soft window highlight and a sharp glint -->
    <ellipse cx="${PX - 62}" cy="${PY - 82}" rx="78" ry="42" transform="rotate(-32 ${PX - 62} ${PY - 82})" fill="#ffffff" opacity="0.92" filter="url(#blur6)"/>
    ${tiny ? '' : `<circle cx="${PX - 108}" cy="${PY - 36}" r="${small ? 14 : 10}" fill="#ffffff" opacity="0.95"/>`}

    <!-- front half of the ring: glow, glass band, lit edge, division -->
    <g transform="${ringT}">
      <path d="${front}" fill="none" stroke="${v.hot}" stroke-opacity="0.45" stroke-width="${RW + 34}" stroke-linecap="round" filter="url(#blur14)"/>
      <path d="${front}" fill="none" stroke="url(#ringFront)" stroke-width="${RW}" stroke-linecap="round"/>
      ${small ? '' : `<path d="M ${PX - RX + 22} ${PY - 8} A ${RX - 20} ${RY - 14} 0 0 0 ${PX + RX - 22} ${PY - 8}" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
      <path d="M ${PX - RX + 34} ${PY + 4} A ${RX - 32} ${RY - 4} 0 0 0 ${PX + RX - 34} ${PY + 4}" fill="none" stroke="${v.b}" stroke-opacity="0.42" stroke-width="5" stroke-linecap="round"/>
      <path d="M ${PX - RX + 44} ${PY + 16} A ${RX - 44} ${RY + 2} 0 0 0 ${PX + RX - 44} ${PY + 16}" fill="none" stroke="${v.deep}" stroke-opacity="0.18" stroke-width="6" stroke-linecap="round"/>`}
    </g>

    <!-- the nova spark: a lens flare with long rays -->
    <circle cx="${SX}" cy="${SY}" r="${SR * 1.25}" fill="${v.hot}" opacity="0.55" filter="url(#blur28)"/>
    ${small ? '' : `<rect x="${SX - 165}" y="${SY - 3}" width="330" height="6" rx="3" fill="url(#ray)"/>
    <rect x="${SX - 150}" y="${SY - 3}" width="300" height="6" rx="3" fill="url(#ray)" transform="rotate(90 ${SX} ${SY})"/>
    <rect x="${SX - 80}" y="${SY - 2}" width="160" height="4" rx="2" fill="url(#ray)" opacity="0.6" transform="rotate(45 ${SX} ${SY})"/>
    <rect x="${SX - 80}" y="${SY - 2}" width="160" height="4" rx="2" fill="url(#ray)" opacity="0.6" transform="rotate(-45 ${SX} ${SY})"/>`}
    <circle cx="${SX}" cy="${SY}" r="${SR * 0.5}" fill="#ffffff" opacity="0.7" filter="url(#blur6)"/>
    <path d="${spark(SX, SY, SR, small ? 0.2 : 0.15)}" fill="#ffffff"/>
    ${small ? '' : `<circle cx="${SX}" cy="${SY}" r="9" fill="${v.hot}" opacity="0.9"/>
    <circle cx="292" cy="780" r="16" fill="#ffffff" opacity="0.4" filter="url(#blur6)"/>
    <path d="${spark(292, 780, 24, 0.2)}" fill="#ffffff" opacity="0.88"/>`}

    <!-- liquid glass: sheen, inner depth and a refractive bezel -->
    <path d="M 100 100 H 924 V 440 C 720 360 330 380 100 500 Z" fill="url(#glassSheen)"/>
    <path d="${SQ}" fill="none" stroke="${v.deep}" stroke-opacity="0.35" stroke-width="28" filter="url(#blur14)" transform="translate(0 10)"/>
    <path d="${SQ}" fill="none" stroke="url(#bezel)" stroke-width="${small ? 12 : 7}"/>
  </g>
</svg>
`
}

module.exports = { VARIANTS, svg, squircle }
