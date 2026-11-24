// Nova line icons: 16px grid, rounded 1.6 strokes, drawn with currentColor. No emoji anywhere.
const I = (d, extra = '') => `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`
window.ICONS = {
  back: I('<path d="M9.75 3.25 5 8l4.75 4.75"/>'),
  forward: I('<path d="M6.25 3.25 11 8l-4.75 4.75"/>'),
  reload: I('<path d="M13.25 8.25a5.25 5.25 0 1 1-1.6-4.05"/><path d="M13.25 2.25V5.5H10"/>'),
  stop: I('<path d="m4.5 4.5 7 7m0-7-7 7"/>'),
  sidebar: I('<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="3"/><path d="M6.25 2.75v10.5"/><path d="M3.75 5.5h.75M3.75 7.5h.75"/>'),
  plus: I('<path d="M8 3.25v9.5M3.25 8h9.5"/>'),
  close: I('<path d="m4.75 4.75 6.5 6.5m0-6.5-6.5 6.5"/>'),
  lock: I('<rect x="3.5" y="7" width="9" height="6.5" rx="1.8"/><path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7"/>'),
  unlock: I('<rect x="3.5" y="7" width="9" height="6.5" rx="1.8"/><path d="M5.5 7V5.25a2.5 2.5 0 0 1 4.9-.7"/>'),
  tune: I('<path d="M3 5h6M12 5h1M3 11h1M7 11h6"/><circle cx="10.5" cy="5" r="1.5"/><circle cx="5.5" cy="11" r="1.5"/>'),
  star: I('<path d="m8 2.25 1.75 3.55 3.9.57-2.83 2.75.67 3.9L8 11.17l-3.49 1.85.67-3.9-2.83-2.75 3.9-.57z"/>'),
  starFill: I('<path d="m8 2.25 1.75 3.55 3.9.57-2.83 2.75.67 3.9L8 11.17l-3.49 1.85.67-3.9-2.83-2.75 3.9-.57z" fill="currentColor"/>'),
  shield: I('<path d="M8 1.9 3 3.9v3.7c0 3 2.1 5.4 5 6.5 2.9-1.1 5-3.5 5-6.5V3.9z"/><path d="m5.9 8 1.5 1.5 2.8-3"/>'),
  gear: I('<path d="M12.85 6.79L14.34 7.10L14.34 8.90L12.85 9.21L12.28 10.58L13.12 11.84L11.84 13.12L10.58 12.28L9.21 12.85L8.90 14.34L7.10 14.34L6.79 12.85L5.42 12.28L4.16 13.12L2.88 11.84L3.72 10.58L3.15 9.21L1.66 8.90L1.66 7.10L3.15 6.79L3.72 5.42L2.88 4.16L4.16 2.88L5.42 3.72L6.79 3.15L7.10 1.66L8.90 1.66L9.21 3.15L10.58 3.72L11.84 2.88L13.12 4.16L12.28 5.42Z" stroke-width="1.35"/><circle cx="8" cy="8" r="2"/>'),
  download: I('<path d="M8 2.5v8M4.75 7.5 8 10.75l3.25-3.25M3 13.25h10"/>'),
  split: I('<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="3"/><path d="M8 2.75v10.5"/>'),
  more: I('<circle cx="3.5" cy="8" r="1.05" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.05" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.05" fill="currentColor" stroke="none"/>'),
  search: I('<circle cx="7.25" cy="7.25" r="4.5"/><path d="m10.6 10.6 3.15 3.15"/>'),
  globe: I('<circle cx="8" cy="8" r="5.75"/><path d="M2.25 8h11.5M8 2.25c1.6 1.6 2.4 3.5 2.4 5.75S9.6 12.15 8 13.75C6.4 12.15 5.6 10.25 5.6 8S6.4 3.85 8 2.25z"/>'),
  clock: I('<circle cx="8" cy="8" r="5.75"/><path d="M8 5v3.25l2 1.25"/>'),
  tabs: I('<rect x="2" y="4.75" width="12" height="8.75" rx="2.6"/><path d="M4.5 2.5h7"/>'),
  bolt: I('<path d="M9.1 1.75 3.6 9.1h4.1l-.9 5.15 5.6-7.4H8.3z"/>'),
  arrowRight: I('<path d="M3 8h10M9 4l4 4-4 4"/>'),
  speaker: I('<path d="M2.75 6.25h2.5L8.5 3.5v9l-3.25-2.75h-2.5z"/><path d="M11 5.75a3.2 3.2 0 0 1 0 4.5M12.75 4a5.7 5.7 0 0 1 0 8"/>'),
  muted: I('<path d="M2.75 6.25h2.5L8.5 3.5v9l-3.25-2.75h-2.5z"/><path d="m11 6 3 3m0-3-3 3"/>'),
  moon: I('<path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z"/>'),
  mask: I('<path d="M2 6.5c2-.8 4-1 6-1s4 .2 6 1c0 3-1.5 4.5-3.25 4.5-1.4 0-2-1.25-2.75-1.25S6.65 11 5.25 11C3.5 11 2 9.5 2 6.5z"/><circle cx="5.25" cy="7.75" r=".75" fill="currentColor"/><circle cx="10.75" cy="7.75" r=".75" fill="currentColor"/>'),
  book: I('<path d="M2.5 3.5c1.8-.7 3.6-.6 5.5.5v9c-1.9-1.1-3.7-1.2-5.5-.5zM13.5 3.5c-1.8-.7-3.6-.6-5.5.5v9c1.9-1.1 3.7-1.2 5.5-.5z"/>'),
  camera: I('<rect x="2" y="4.5" width="12" height="8.5" rx="2"/><path d="M5.5 4.5 6.5 3h3l1 1.5"/><circle cx="8" cy="8.75" r="2.25"/>'),
  key: I('<circle cx="5.5" cy="10.5" r="3"/><path d="m7.6 8.4 5.65-5.65M11 5l1.5 1.5M12.5 3.5 14 5"/>'),
  puzzle: I('<path d="M3 5.5h2.5a1.5 1.5 0 1 1 3 0H11v2.5a1.5 1.5 0 1 1 0 3V13H8.5a1.5 1.5 0 1 0-3 0H3z"/>'),
  pip: I('<rect x="2" y="3" width="12" height="10" rx="2"/><rect x="8" y="8" width="4.5" height="3.5" rx="1" fill="currentColor" stroke="none"/>'),
  folder: I('<path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"/>'),
  info: I('<circle cx="8" cy="8" r="6"/><path d="M8 7.2v3.8M8 5v.1"/>'),
  sparkle: I('<path d="M8 1.75c.5 3.2 1.85 4.6 5.25 5.25-3.4.65-4.75 2.05-5.25 5.25C7.5 9.05 6.15 7.65 2.75 7 6.15 6.35 7.5 4.95 8 1.75z"/><path d="M13 11.5v2.5M11.75 12.75h2.5"/>'),
  check: I('<path d="m3.5 8.5 3 3 6-7"/>'),
  minus: I('<path d="M3.5 8h9"/>'),
  winMin: I('<path d="M4 8h8"/>', 'stroke-width="1"'),
  winMax: I('<rect x="4.5" y="4.5" width="7" height="7" rx=".5"/>', 'stroke-width="1"'),
  winClose: I('<path d="m4.5 4.5 7 7m0-7-7 7"/>', 'stroke-width="1"'),
  phone: I('<rect x="4.5" y="1.5" width="7" height="13" rx="1.6"/><path d="M7 12h2"/>'),
  box: I('<path d="M8 1.8 13.6 4.6v6.8L8 14.2 2.4 11.4V4.6z"/><path d="M2.6 4.7 8 7.4l5.4-2.7M8 7.4v6.6M5.2 3.2l5.5 2.8"/>'),
  trash: I('<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.7 9.2a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8L12 4"/>'),
  link: I('<path d="M6.5 9.5 9.5 6.5"/><path d="M7.5 4.5 9 3a2.5 2.5 0 0 1 3.5 3.5L11 8"/><path d="M8.5 11.5 7 13a2.5 2.5 0 0 1-3.5-3.5L5 8"/>'),
  translate: I('<path d="M2 3.5h7M5.5 2v1.5M3.5 3.5c.6 2.4 2.2 4.2 4.5 5.2M7.5 3.5C7 5.8 5.4 7.8 2.5 9"/><path d="M8.5 14l3-7.5 3 7.5M9.6 11.5h3.8"/>'),
  printer: I('<path d="M4.5 6V2.5h7V6"/><rect x="2" y="6" width="12" height="5.5" rx="1.5"/><path d="M4.5 9.5h7V14h-7z"/>'),
  layers: I('<path d="M8 2 14 5 8 8 2 5z"/><path d="m2 8 6 3 6-3"/><path d="m2 11 6 3 6-3"/>'),
  play: I('<path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.4-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z"/>'),
  sidebarL: I('<rect x="2" y="2.5" width="12" height="11" rx="2"/><path d="M6 2.5v11"/>'),
  tabsTop: I('<rect x="2" y="2.5" width="12" height="11" rx="2"/><path d="M2 6h12"/>'),
}

// Surge and Koi logos, drawn in the accent color you pick in Lumen (and turned a little round the color wheel for the
// second stop, so blue goes to purple, pink goes to orange and so on). Used in the toolbar, Settings and the intro.
let logoN = 0
window.appLogo = (id, cls = '') => {
  const n = ++logoN, g = `lg${n}`, h = `lh${n}`
  const a = 'var(--accent, #5b8cff)'
  const glyph = id === 'surge'
    ? `<path d="M26.6 9.5 13.8 27.4h9.3L20.9 38.5 34.2 20.1h-9.4z" fill="#fff" filter="url(#${h})"/>`
    : `<circle cx="24" cy="24" r="11" fill="none" stroke="#fff" stroke-width="4.2"/><circle cx="24" cy="24" r="4.6" fill="#fff"/>`
  return `<svg class="applogo ${cls}" viewBox="0 0 48 48" aria-hidden="true"><defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:oklch(from ${a} calc(l + .07) c h)"/><stop offset="1" style="stop-color:oklch(from ${a} calc(l - .05) c calc(h + ${id === 'surge' ? 40 : 28}))"/></linearGradient>
    <filter id="${h}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#000" flood-opacity=".25"/></filter></defs>
    <rect x="2" y="2" width="44" height="44" rx="12.5" fill="url(#${g})"/>
    <rect x="2.5" y="2.5" width="43" height="43" rx="12" fill="none" stroke="#fff" stroke-opacity=".28"/>
    <path d="M2 14.5C2 7.6 7.6 2 14.5 2h19C40.4 2 46 7.6 46 14.5V18c-7 3-14.4 4.4-22 4.4S9 21 2 18z" fill="#fff" opacity=".13"/>
    ${glyph}</svg>`
}
