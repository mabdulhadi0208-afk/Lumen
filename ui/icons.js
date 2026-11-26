// Nova 2 line icons: 16px grid, 1.55 rounded strokes on the half pixel so they stay crisp, plus a soft duotone fill
// (currentColor at low opacity) that gives each one a little body and personality. No emoji anywhere.
const I = (d, extra = '') => `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`
// duotone body: a filled shape at 18% under the strokes
const T = (d, o = 0.18) => `<path d="${d}" fill="currentColor" fill-opacity="${o}" stroke="none"/>`
const C = (cx, cy, r, o = 0.18) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" fill-opacity="${o}" stroke="none"/>`
const DOT = (cx, cy, r = 0.95) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`
window.ICONS = {
  back: I('<path d="M9.6 3.4 5 8l4.6 4.6"/>'),
  forward: I('<path d="M6.4 3.4 11 8l-4.6 4.6"/>'),
  reload: I('<path d="M13.1 8.4A5.1 5.1 0 1 1 11.6 4.4"/><path d="M13 2.4v3.3H9.7"/>'),
  stop: I('<path d="m4.6 4.6 6.8 6.8m0-6.8-6.8 6.8"/>'),
  sidebar: I(T('M3.6 3h2.65v10H3.6A1.6 1.6 0 0 1 2 11.4V4.6A1.6 1.6 0 0 1 3.6 3z', 0.22) + '<rect x="2" y="3" width="12" height="10" rx="2.6"/><path d="M6.25 3v10"/><path d="M3.9 5.6h.6M3.9 7.6h.6"/>'),
  plus: I('<path d="M8 3.4v9.2M3.4 8h9.2"/>', 'stroke-width="1.7"'),
  close: I('<path d="m4.8 4.8 6.4 6.4m0-6.4-6.4 6.4"/>'),
  lock: I(T('M4.9 7.2h6.2a1.4 1.4 0 0 1 1.4 1.4v3.6a1.4 1.4 0 0 1-1.4 1.4H4.9a1.4 1.4 0 0 1-1.4-1.4V8.6a1.4 1.4 0 0 1 1.4-1.4z') + '<rect x="3.5" y="7.2" width="9" height="6.4" rx="1.8"/><path d="M5.6 7.2V5.3a2.4 2.4 0 0 1 4.8 0v1.9"/><path d="M8 9.7v1.2"/>'),
  unlock: I(T('M4.9 7.2h6.2a1.4 1.4 0 0 1 1.4 1.4v3.6a1.4 1.4 0 0 1-1.4 1.4H4.9a1.4 1.4 0 0 1-1.4-1.4V8.6a1.4 1.4 0 0 1 1.4-1.4z') + '<rect x="3.5" y="7.2" width="9" height="6.4" rx="1.8"/><path d="M5.6 7.2V5.3a2.4 2.4 0 0 1 4.6-1"/><path d="M8 9.7v1.2"/>'),
  tune: I('<path d="M2.8 5h6.1M12.3 5h.9M2.8 11h1M7.2 11h6"/>' + C(10.6, 5, 1.7, 0.25) + '<circle cx="10.6" cy="5" r="1.7"/>' + C(5.5, 11, 1.7, 0.25) + '<circle cx="5.5" cy="11" r="1.7"/>'),
  star: I(T('m8 2.3 1.72 3.5 3.86.56-2.79 2.72.66 3.84L8 11.11l-3.45 1.81.66-3.84L2.42 6.36l3.86-.56z') + '<path d="m8 2.3 1.72 3.5 3.86.56-2.79 2.72.66 3.84L8 11.11l-3.45 1.81.66-3.84L2.42 6.36l3.86-.56z"/>'),
  starFill: I('<path d="m8 2.3 1.72 3.5 3.86.56-2.79 2.72.66 3.84L8 11.11l-3.45 1.81.66-3.84L2.42 6.36l3.86-.56z" fill="currentColor"/>'),
  shield: I(T('M8 2 3.2 3.9v3.6c0 2.9 2 5.2 4.8 6.4 2.8-1.2 4.8-3.5 4.8-6.4V3.9z') + '<path d="M8 2 3.2 3.9v3.6c0 2.9 2 5.2 4.8 6.4 2.8-1.2 4.8-3.5 4.8-6.4V3.9z"/><path d="m5.9 8 1.45 1.45L10.2 6.6"/>'),
  gear: I(C(8, 8, 4.4, 0.16) + '<path d="M12.85 6.79L14.34 7.10L14.34 8.90L12.85 9.21L12.28 10.58L13.12 11.84L11.84 13.12L10.58 12.28L9.21 12.85L8.90 14.34L7.10 14.34L6.79 12.85L5.42 12.28L4.16 13.12L2.88 11.84L3.72 10.58L3.15 9.21L1.66 8.90L1.66 7.10L3.15 6.79L3.72 5.42L2.88 4.16L4.16 2.88L5.42 3.72L6.79 3.15L7.10 1.66L8.90 1.66L9.21 3.15L10.58 3.72L11.84 2.88L13.12 4.16L12.28 5.42Z" stroke-width="1.3"/><circle cx="8" cy="8" r="2"/>'),
  download: I(T('M3 11.6h10v1.1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z', 0.22) + '<path d="M8 2.6v7.6M4.9 7.3 8 10.4l3.1-3.1"/><path d="M3 11.6v1.1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1.1"/>'),
  split: I(T('M8 3h4.4A1.6 1.6 0 0 1 14 4.6v6.8a1.6 1.6 0 0 1-1.6 1.6H8z', 0.2) + '<rect x="2" y="3" width="12" height="10" rx="2.6"/><path d="M8 3v10"/>'),
  more: I(DOT(3.6, 8, 1.15) + DOT(8, 8, 1.15) + DOT(12.4, 8, 1.15)),
  search: I(C(7.2, 7.2, 4.4, 0.16) + '<circle cx="7.2" cy="7.2" r="4.4"/><path d="m10.5 10.5 3.2 3.2"/>'),
  globe: I(C(8, 8, 5.7, 0.14) + '<circle cx="8" cy="8" r="5.7"/><path d="M2.4 8h11.2M8 2.3c1.55 1.6 2.35 3.5 2.35 5.7S9.55 12.1 8 13.7C6.45 12.1 5.65 10.2 5.65 8S6.45 3.9 8 2.3z"/>'),
  clock: I(C(8, 8, 5.7, 0.16) + '<circle cx="8" cy="8" r="5.7"/><path d="M8 4.9v3.3l2.1 1.3"/>'),
  tabs: I(T('M4.4 5h7.2A2.4 2.4 0 0 1 14 7.4v3.8a2.4 2.4 0 0 1-2.4 2.4H4.4A2.4 2.4 0 0 1 2 11.2V7.4A2.4 2.4 0 0 1 4.4 5z') + '<rect x="2" y="5" width="12" height="8.6" rx="2.4"/><path d="M4.4 2.6h7.2"/>'),
  bolt: I(T('M9.1 1.8 3.6 9.1h4.1l-.9 5.1 5.6-7.4H8.3z', 0.24) + '<path d="M9.1 1.8 3.6 9.1h4.1l-.9 5.1 5.6-7.4H8.3z"/>'),
  arrowRight: I('<path d="M3 8h9.6M8.8 4.2 12.6 8l-3.8 3.8"/>'),
  speaker: I(T('M2.8 6.2h2.4l3.3-2.7v9l-3.3-2.7H2.8z', 0.24) + '<path d="M2.8 6.2h2.4l3.3-2.7v9l-3.3-2.7H2.8z"/><path d="M11 5.8a3.1 3.1 0 0 1 0 4.4M12.8 4a5.6 5.6 0 0 1 0 8"/>'),
  muted: I(T('M2.8 6.2h2.4l3.3-2.7v9l-3.3-2.7H2.8z', 0.24) + '<path d="M2.8 6.2h2.4l3.3-2.7v9l-3.3-2.7H2.8z"/><path d="m11 6.1 2.9 2.9m0-2.9L11 9"/>'),
  moon: I(T('M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z', 0.22) + '<path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z"/><path d="M11.4 2.3v1.6M10.6 3.1h1.6" stroke-width="1.2"/>'),
  mask: I(T('M2 6.5c2-.8 4-1 6-1s4 .2 6 1c0 3-1.5 4.5-3.25 4.5-1.4 0-2-1.25-2.75-1.25S6.65 11 5.25 11C3.5 11 2 9.5 2 6.5z', 0.22) + '<path d="M2 6.5c2-.8 4-1 6-1s4 .2 6 1c0 3-1.5 4.5-3.25 4.5-1.4 0-2-1.25-2.75-1.25S6.65 11 5.25 11C3.5 11 2 9.5 2 6.5z"/>' + DOT(5.3, 7.8, 0.8) + DOT(10.7, 7.8, 0.8)),
  book: I(T('M2.5 3.5c1.8-.7 3.6-.6 5.5.5v9c-1.9-1.1-3.7-1.2-5.5-.5z', 0.22) + '<path d="M2.5 3.5c1.8-.7 3.6-.6 5.5.5v9c-1.9-1.1-3.7-1.2-5.5-.5zM13.5 3.5c-1.8-.7-3.6-.6-5.5.5v9c1.9-1.1 3.7-1.2 5.5-.5z"/>'),
  camera: I(T('M4 4.6h8a2 2 0 0 1 2 2V11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6.6a2 2 0 0 1 2-2z', 0.14) + '<rect x="2" y="4.6" width="12" height="8.4" rx="2"/><path d="M5.5 4.6 6.5 3h3l1 1.6"/><circle cx="8" cy="8.8" r="2.2"/>' + DOT(11.8, 6.6, 0.6)),
  key: I(C(5.5, 10.5, 3, 0.2) + '<circle cx="5.5" cy="10.5" r="3"/><path d="m7.6 8.4 5.6-5.6M11 5l1.5 1.5M12.6 3.4 14 4.8"/>' + DOT(5.5, 10.5, 0.8)),
  puzzle: I(T('M3 5.5h2.5a1.5 1.5 0 1 1 3 0H11v2.5a1.5 1.5 0 1 1 0 3V13H8.5a1.5 1.5 0 1 0-3 0H3z', 0.2) + '<path d="M3 5.5h2.5a1.5 1.5 0 1 1 3 0H11v2.5a1.5 1.5 0 1 1 0 3V13H8.5a1.5 1.5 0 1 0-3 0H3z"/>'),
  pip: I('<rect x="2" y="3" width="12" height="10" rx="2.2"/><rect x="7.8" y="7.8" width="4.6" height="3.6" rx="1.1" fill="currentColor" stroke="none"/>'),
  folder: I(T('M2.5 6h11v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z', 0.2) + '<path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"/>'),
  info: I(C(8, 8, 6, 0.16) + '<circle cx="8" cy="8" r="6"/><path d="M8 7.3v3.7"/>' + DOT(8, 5, 0.9)),
  sparkle: I(T('M8 1.8c.5 3.2 1.85 4.6 5.2 5.2-3.35.6-4.7 2-5.2 5.2C7.5 9 6.15 7.6 2.8 7 6.15 6.4 7.5 5 8 1.8z', 0.24) + '<path d="M8 1.8c.5 3.2 1.85 4.6 5.2 5.2-3.35.6-4.7 2-5.2 5.2C7.5 9 6.15 7.6 2.8 7 6.15 6.4 7.5 5 8 1.8z"/><path d="M13 11.4v2.6M11.7 12.7h2.6"/>'),
  check: I('<path d="m3.5 8.4 3 3 6-6.9"/>', 'stroke-width="1.8"'),
  warn: I(T('M8 2.3 14.2 13H1.8z', 0.2) + '<path d="M7.1 2.9a1 1 0 0 1 1.8 0l5.4 9.4a1 1 0 0 1-.9 1.5H2.6a1 1 0 0 1-.9-1.5z"/><path d="M8 6.2v3.2"/>' + DOT(8, 11.5, 0.9)),
  minus: I('<path d="M3.6 8h8.8"/>', 'stroke-width="1.7"'),
  winMin: I('<path d="M4 8h8"/>', 'stroke-width="1.15"'),
  winMax: I('<rect x="4.4" y="4.4" width="7.2" height="7.2" rx="1.4"/>', 'stroke-width="1.15"'),
  winClose: I('<path d="m4.6 4.6 6.8 6.8m0-6.8-6.8 6.8"/>', 'stroke-width="1.15"'),
  phone: I(T('M6 1.6h4a1.5 1.5 0 0 1 1.5 1.5v9.8A1.5 1.5 0 0 1 10 14.4H6a1.5 1.5 0 0 1-1.5-1.5V3.1A1.5 1.5 0 0 1 6 1.6z', 0.16) + '<rect x="4.5" y="1.6" width="7" height="12.8" rx="1.6"/><path d="M7 12h2"/>'),
  bag: I(T('M3 5.2h10l-.8 8.6H3.8z', 0.16) + '<path d="M3 5.2h10l-.8 8.6H3.8z"/><path d="M5.6 5.2V4.4a2.4 2.4 0 0 1 4.8 0v.8"/>'),
  box: I(T('M8 1.8 13.6 4.6v6.8L8 14.2 2.4 11.4V4.6z', 0.16) + '<path d="M8 1.8 13.6 4.6v6.8L8 14.2 2.4 11.4V4.6z"/><path d="M2.6 4.7 8 7.4l5.4-2.7M8 7.4v6.6M5.2 3.2l5.5 2.8"/>'),
  trash: I(T('M4 4.2h8l-.7 9a1 1 0 0 1-1 .8H5.7a1 1 0 0 1-1-.8z', 0.18) + '<path d="M2.5 4.2h11M6 4.2V2.6h4v1.6M4 4.2l.7 9a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8l.7-9"/><path d="M6.6 7v4M9.4 7v4" stroke-width="1.2"/>'),
  link: I('<path d="M6.5 9.5 9.5 6.5"/><path d="M7.5 4.5 9 3a2.5 2.5 0 0 1 3.5 3.5L11 8"/><path d="M8.5 11.5 7 13a2.5 2.5 0 0 1-3.5-3.5L5 8"/>'),
  translate: I('<path d="M2 3.5h7M5.5 2v1.5M3.5 3.5c.6 2.4 2.2 4.2 4.5 5.2M7.5 3.5C7 5.8 5.4 7.8 2.5 9"/>' + T('M11.5 6.5 9.6 11.5h3.8z', 0.24) + '<path d="M8.5 14l3-7.5 3 7.5M9.6 11.5h3.8"/>'),
  printer: I(T('M3.5 6h9A1.5 1.5 0 0 1 14 7.5v4h-2.5V9.5h-7v2H2v-4A1.5 1.5 0 0 1 3.5 6z', 0.18) + '<path d="M4.5 6V2.5h7V6"/><rect x="2" y="6" width="12" height="5.5" rx="1.5"/><path d="M4.5 9.5h7V14h-7z"/>'),
  layers: I(T('M8 2 14 5 8 8 2 5z', 0.24) + '<path d="M8 2 14 5 8 8 2 5z"/><path d="m2 8 6 3 6-3"/><path d="m2 11 6 3 6-3"/>'),
  play: I(T('M5 3.2v9.6a.6.6 0 0 0 .9.5l7.4-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z', 0.3) + '<path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.4-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z"/>'),
  sidebarL: I(T('M4 2.5h2v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 0.24) + '<rect x="2" y="2.5" width="12" height="11" rx="2.2"/><path d="M6 2.5v11"/>'),
  tabsTop: I(T('M4.2 2.5h7.6A2.2 2.2 0 0 1 14 4.7V6H2V4.7a2.2 2.2 0 0 1 2.2-2.2z', 0.24) + '<rect x="2" y="2.5" width="12" height="11" rx="2.2"/><path d="M2 6h12"/>'),
  // new in Glow-up 2.0
  crash: I(T('M3.6 2.4h8.8a1.4 1.4 0 0 1 1.4 1.4v8.4a1.4 1.4 0 0 1-1.4 1.4H3.6a1.4 1.4 0 0 1-1.4-1.4V3.8a1.4 1.4 0 0 1 1.4-1.4z', 0.16) + '<path d="M3.6 2.4h8.8a1.4 1.4 0 0 1 1.4 1.4v8.4a1.4 1.4 0 0 1-1.4 1.4H3.6a1.4 1.4 0 0 1-1.4-1.4V3.8a1.4 1.4 0 0 1 1.4-1.4z"/><path d="m5 5.6 1.6 1.6m0-1.6L5 7.2M9.4 5.6 11 7.2m0-1.6L9.4 7.2" stroke-width="1.3"/><path d="M5.4 11.1c1.6-1.3 3.6-1.3 5.2 0"/>'),
  hourglass: I(T('M5 13.4h6c0-2.4-3-3.4-3-5.4 0 2-3 3-3 5.4z', 0.3) + '<path d="M4 2.6h8M4 13.4h8M5 2.6c0 2.6 3 3.4 3 5.4s-3 2.8-3 5.4M11 2.6c0 2.6-3 3.4-3 5.4s3 2.8 3 5.4"/>'),
  location: I(T('M8 14.2s4.6-4.3 4.6-7.6a4.6 4.6 0 0 0-9.2 0c0 3.3 4.6 7.6 4.6 7.6z', 0.2) + '<path d="M8 14.2s4.6-4.3 4.6-7.6a4.6 4.6 0 0 0-9.2 0c0 3.3 4.6 7.6 4.6 7.6z"/><circle cx="8" cy="6.6" r="1.7"/>'),
  keyboard: I(T('M3.4 4h9.2A1.4 1.4 0 0 1 14 5.4v5.2a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 10.6V5.4A1.4 1.4 0 0 1 3.4 4z', 0.14) + '<rect x="2" y="4" width="12" height="8" rx="1.6"/><path d="M5.6 9.6h4.8" />' + DOT(4.6, 6.6, 0.6) + DOT(6.9, 6.6, 0.6) + DOT(9.1, 6.6, 0.6) + DOT(11.4, 6.6, 0.6)),
  file: I(T('M4.2 1.8h5l3 3v8.4a1 1 0 0 1-1 1H4.2a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1z', 0.16) + '<path d="M4.2 1.8h5l3 3v8.4a1 1 0 0 1-1 1H4.2a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1z"/><path d="M9.2 1.8v3h3M5.6 8.6h4.8M5.6 11h3.2"/>'),
  qr: I('<rect x="2.4" y="2.4" width="4.2" height="4.2" rx="1"/><rect x="9.4" y="2.4" width="4.2" height="4.2" rx="1"/><rect x="2.4" y="9.4" width="4.2" height="4.2" rx="1"/>' + DOT(4.5, 4.5, 0.8) + DOT(11.5, 4.5, 0.8) + DOT(4.5, 11.5, 0.8) + '<path d="M9.4 9.4h1.6v1.6M13.6 9.4v.1M9.4 13.6h4.2v-2"/>'),
}

// Surge and Koi logos, drawn in the accent color you pick in Lumen (and turned a little round the color wheel for the
// second stop, so blue goes to purple, pink goes to orange and so on). Used in the toolbar, Settings and the intro.
// Nova 2: a glass bevel, a caustic glow at the bottom and a sharper glyph.
let logoN = 0
window.appLogo = (id, cls = '') => {
  const n = ++logoN, g = `lg${n}`, h = `lh${n}`, c = `lc${n}`
  const a = 'var(--accent, #5b8cff)'
  const glyph = id === 'surge'
    ? `<path d="M26.9 8.8 13.6 27.5h9.4l-2.3 11.7 13.8-19.2h-9.6z" fill="#fff" stroke="#fff" stroke-width=".8" stroke-linejoin="round" filter="url(#${h})"/>`
    : `<g filter="url(#${h})"><circle cx="24" cy="24" r="11.2" fill="none" stroke="#fff" stroke-width="4.2"/><circle cx="24" cy="24" r="4.6" fill="#fff"/><circle cx="31.9" cy="16.1" r="2.6" fill="#fff"/></g>`
  return `<svg class="applogo ${cls}" viewBox="0 0 48 48" aria-hidden="true"><defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:oklch(from ${a} calc(l + .08) c h)"/><stop offset="1" style="stop-color:oklch(from ${a} calc(l - .06) c calc(h + ${id === 'surge' ? 40 : 28}))"/></linearGradient>
    <radialGradient id="${c}" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="${h}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.3" flood-color="#000" flood-opacity=".28"/></filter></defs>
    <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#${g})"/>
    <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#${c})"/>
    <rect x="2.6" y="2.6" width="42.8" height="42.8" rx="12.4" fill="none" stroke="#fff" stroke-opacity=".34"/>
    <path d="M2 15C2 7.8 7.8 2 15 2h18c7.2 0 13 5.8 13 13v2.6c-7 3.2-14.4 4.6-22 4.6S9 20.8 2 17.6z" fill="#fff" opacity=".16"/>
    ${glyph}</svg>`
}
