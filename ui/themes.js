// Browser themes. dark = the chrome uses light text. glass = translucent frosted surfaces.
window.LUMEN_THEMES = {
  default: { name: 'Default', bg: '', dark: null },
  glass: { name: 'Glass', dark: false, glass: true, bg: 'radial-gradient(70% 90% at 10% 0%, rgba(140,170,255,.55), transparent 60%), radial-gradient(60% 80% at 100% 100%, rgba(255,170,220,.45), transparent 60%), linear-gradient(135deg, #eef2fb, #e6e9f7)' },
  glassdark: { name: 'Dark Glass', dark: true, glass: true, bg: 'radial-gradient(70% 90% at 10% 0%, rgba(90,110,255,.45), transparent 60%), radial-gradient(60% 80% at 100% 100%, rgba(190,90,255,.35), transparent 60%), linear-gradient(135deg, #12141f, #1a1630)' },
  midnight: { name: 'Midnight', dark: true, bg: 'linear-gradient(160deg, #0f1430, #1b1f45 55%, #0c0f24)' },
  aurora: { name: 'Aurora', dark: true, bg: 'radial-gradient(80% 100% at 0% 0%, #1fb59a66, transparent 60%), radial-gradient(70% 90% at 100% 100%, #7c4dff66, transparent 60%), linear-gradient(135deg, #0d1b2a, #1a1035)' },
  sunset: { name: 'Sunset', dark: true, bg: 'linear-gradient(135deg, #ff7e5f, #c94b8a 55%, #5b2a86)' },
  ocean: { name: 'Ocean', dark: true, bg: 'linear-gradient(150deg, #0b486b, #1572a1 50%, #0d3b66)' },
  forest: { name: 'Forest', dark: true, bg: 'linear-gradient(150deg, #134e3a, #1f6f4a 55%, #0f3d2e)' },
  rose: { name: 'Rose', dark: false, bg: 'linear-gradient(135deg, #ffe3ec, #ffd1dc 50%, #f9e0ff)' },
  sand: { name: 'Sand', dark: false, bg: 'linear-gradient(135deg, #f7efe3, #efe2cc 55%, #f3e9dc)' },
  graphite: { name: 'Graphite', dark: true, bg: 'linear-gradient(160deg, #2a2b30, #1e1f23)' },
}
window.themeBg = (id, custom) => {
  if (id === 'custom' && custom) {
    const lum = hex => { const n = parseInt((hex || '#000000').slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 }
    return { bg: `linear-gradient(${custom.angle || 135}deg, ${custom.a}, ${custom.b})`, dark: (lum(custom.a) + lum(custom.b)) / 2 < 0.6, glass: !!custom.glass }
  }
  return window.LUMEN_THEMES[id] || window.LUMEN_THEMES.default
}
