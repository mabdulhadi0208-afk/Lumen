// Browser themes. dark = the chrome uses light text. glass = translucent frosted surfaces (drawn solid since 4.5).
// 4.6: every theme is one calm, deep or soft tone (no more multi-colour washes); Lumen paints it flat.
window.LUMEN_THEMES = {
  default: { name: 'Default', bg: '', dark: null },
  glass: { name: 'Paper', dark: false, glass: true, bg: 'linear-gradient(135deg, #f4f0e8, #ebe5da)' },
  glassdark: { name: 'Ink', dark: true, glass: true, bg: 'linear-gradient(135deg, #12141f, #16150f)' },
  midnight: { name: 'Midnight', dark: true, bg: 'linear-gradient(160deg, #141823, #1a1e2a)' },
  aurora: { name: 'Moss', dark: true, bg: 'linear-gradient(135deg, #18201c, #1f2924)' },
  sunset: { name: 'Clay', dark: true, bg: 'linear-gradient(135deg, #3b2c25, #2f231e)' },
  ocean: { name: 'Ocean', dark: true, bg: 'linear-gradient(150deg, #1a2a33, #20323d)' },
  forest: { name: 'Forest', dark: true, bg: 'linear-gradient(150deg, #17271f, #1d3026)' },
  rose: { name: 'Rose', dark: false, bg: 'linear-gradient(135deg, #ffe3ec, #f1e3df)' },
  sand: { name: 'Sand', dark: false, bg: 'linear-gradient(135deg, #f4ece0, #ece2d2)' },
  graphite: { name: 'Graphite', dark: true, bg: 'linear-gradient(160deg, #2a2927, #201f1d)' },
}
window.themeBg = (id, custom) => {
  if (id === 'custom' && custom) {
    const lum = hex => { const n = parseInt((hex || '#000000').slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 }
    return { bg: `linear-gradient(${custom.angle || 135}deg, ${custom.a}, ${custom.b})`, dark: (lum(custom.a) + lum(custom.b)) / 2 < 0.6, glass: !!custom.glass }
  }
  return window.LUMEN_THEMES[id] || window.LUMEN_THEMES.default
}

// 4.5.1: one flat colour for a theme or wallpaper background (the average of the colours in its gradient), and
// whether ink or paper reads on it. Lumen 4.5 draws backgrounds as a single calm tone, never as a multi-colour wash.
window.flatColor = (css, fallback) => {
  // every colour in the value (hex, rgb, hsl, oklch, oklab, color(), ...), read back as sRGB through a 1 px canvas
  const cx = (window.__flatCx = window.__flatCx || (() => { const c = document.createElement('canvas'); c.width = c.height = 1; return c.getContext('2d', { willReadFrequently: true }) })())
  const toks = String(css || '').match(/(?:rgba?|hsla?|hwb|oklch|oklab|lch|lab|color)\((?:[^()]|\([^()]*\))*\)|#[0-9a-f]{3,8}\b/gi) || []
  let w = 0, r = 0, g = 0, b = 0
  for (const t of toks) {
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = t; cx.fillRect(0, 0, 1, 1)
    const d = cx.getImageData(0, 0, 1, 1).data, a = d[3] / 255; if (!(a > 0)) continue
    // translucent stops (glows laid over a base) count by their opacity; the opaque base counts fully
    const k = a >= 0.99 ? 1 : a * 0.25; r += d[0] * k; g += d[1] * k; b += d[2] * k; w += k
  }
  if (!w) return fallback || null
  const c = v => Math.max(0, Math.min(255, Math.round(v / w)))
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`
}
window.lumaOf = c => { const m = String(c || '').match(/[\d.]+/g); if (!m) return 1; const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(+m[0]) + .7152 * f(+m[1]) + .0722 * f(+m[2]) }
