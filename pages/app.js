/* Lumen internal pages: new tab, settings, history, bookmarks, downloads, passwords, extensions, error. */
const L = window.lumen
const root = document.getElementById('root')
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const hostOf = u => { try { return new URL(u).host.replace(/^www\./, '') } catch { return '' } }
const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h }
const letterFav = host => `<span class="fav" style="background:hsl(${hue(host)} 55% 52%)">${esc((host[0] || '?').toUpperCase())}</span>`
const fav = url => { const h = hostOf(url); if (!h) return letterFav('?'); return `<img class="fav" src="${esc(new URL(url).origin)}/favicon.ico" data-h="${esc(h)}">` }
document.addEventListener('error', e => { if (e.target.tagName === 'IMG' && e.target.dataset.h !== undefined) e.target.outerHTML = letterFav(e.target.dataset.h) }, true)
const $ = s => document.querySelector(s)
// a small message that springs up at the bottom of an internal page
function flash(msg) {
  let el = document.getElementById('pflash'); if (!el) { el = document.createElement('div'); el.id = 'pflash'; document.body.appendChild(el) }
  el.textContent = msg; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show')
  clearTimeout(flash.t); flash.t = setTimeout(() => el.classList.remove('show'), 2600)
}
const $$ = s => [...document.querySelectorAll(s)]
function novaConfirm({ title, text, ok = 'OK', cancel = 'Cancel', danger = false, icon }) {
  return new Promise(res => {
    const d = document.createElement('div'); d.className = 'dialog-wrap nv-wrap'
    d.innerHTML = `<div class="nv-dlg ${danger ? 'danger' : ''}" role="alertdialog" aria-modal="true" aria-label="${esc(title)}"><div class="nv-ico">${icon || ICONS.info}</div><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}<div class="actions"><button class="btn" data-r="0">${esc(cancel)}</button><button class="btn primary ${danger ? 'danger-p' : ''}" data-r="1">${esc(ok)}</button></div></div>`
    document.body.appendChild(d)
    let over = false
    const done = v => { if (over) return; over = true; removeEventListener('keydown', key, true); d.classList.add('out'); setTimeout(() => d.remove(), 220); res(v) }
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); done(false) } else if (e.key === 'Enter') { e.preventDefault(); done(document.activeElement && document.activeElement.dataset.r === '0' ? false : true) } }
    addEventListener('keydown', key, true)
    d.onclick = e => { const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); else if (e.target === d) done(false) }
    setTimeout(() => { const b = d.querySelector('[data-r="1"]'); if (b) b.focus() }, 40)
  })
}

let S = {}, ENGINES = {}, VERSION = '', PLATFORM = ''
const page = location.host
const sub = location.pathname.replace(/^\/+|\/+$/g, '')

function applyLook(s) {
  document.documentElement.style.setProperty('--accent', s.accent || '#5b8cff')
  document.body.dataset.motion = s.motion
  Jelly.setMode(s.motion === 'lively' ? 'jelly' : s.motion)
  const was = window.Glass && Glass.on
  if (window.Glass) { Glass.setMode(Jelly.getMode()); if (was !== Glass.on && typeof buildClock === 'function' && document.getElementById('clock')) buildClock() }
}
Jelly.init({ buttons: '.btn, .ib, .seg button, .swatches button, .vc, .fchip, .npd-nav, .nav a, .ntp .foot a, .customize, .cswatch, .gtoggle, .sb-eng', cards: '.tile, .err .ico, .key, .wpb, .thb, .icb, .rc, .pcard, .clkb, .hero-ic, .an-dial', press: '.list .row, a.row.hit' })
Jelly.smoothScroll(window)

// ======================================================================= new tab
function greeting() { const h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
// every wallpaper has some fine structure (rings, light shafts, star dust) so the liquid glass has something to bend
const WALLPAPERS = {
  aurora: { name: 'Aurora', css: '' },
  sunset: { name: 'Sunset', css: 'radial-gradient(34% 28% at 50% 64%, #ffd27acc, #ff8a5c66 45%, transparent 72%), repeating-radial-gradient(circle at 50% 64%, rgba(255,214,170,.12) 0 2px, transparent 2px 34px), radial-gradient(55% 45% at 12% 12%, #c94b9a88, transparent 70%), radial-gradient(50% 42% at 88% 18%, #7b4dd888, transparent 70%), linear-gradient(180deg, #22113a, #5a2346 55%, #8a3b45 72%, #1d1128)' },
  ocean: { name: 'Ocean', css: 'radial-gradient(48% 40% at 28% 28%, #2bd4ff77, transparent 70%), radial-gradient(45% 45% at 80% 74%, #3d6dff88, transparent 70%), repeating-radial-gradient(ellipse 140% 60% at 50% 120%, rgba(160,230,255,.11) 0 2px, transparent 2px 28px), linear-gradient(175deg, #061a2e, #0c3352 50%, #062036)' },
  forest: { name: 'Forest', css: 'radial-gradient(45% 40% at 22% 20%, #4be3a077, transparent 70%), radial-gradient(45% 45% at 82% 80%, #c8e06a55, transparent 70%), repeating-linear-gradient(100deg, rgba(200,255,220,.07) 0 3px, transparent 3px 40px), linear-gradient(165deg, #0a1f16, #14382a 55%, #07150e)' },
  dusk: { name: 'Dusk', css: 'radial-gradient(45% 40% at 25% 25%, #8a63f288, transparent 70%), radial-gradient(45% 40% at 80% 72%, #f0763b66, transparent 70%), radial-gradient(1.3px 1.3px at 20% 30%, #fff, transparent) 0 0 / 120px 120px, radial-gradient(1px 1px at 70% 60%, #ffffffcc, transparent) 0 0 / 90px 90px, repeating-conic-gradient(from 0deg at 50% 115%, rgba(255,255,255,.05) 0 2deg, transparent 2deg 9deg), linear-gradient(160deg, #161230, #2a1f45 55%, #0f0c20)' },
  nebula: { name: 'Nebula', css: 'radial-gradient(34% 30% at 30% 40%, #ff4fa377, transparent 70%), radial-gradient(40% 35% at 72% 56%, #4f7bff88, transparent 70%), radial-gradient(24% 24% at 55% 28%, #a35bff77, transparent 70%), radial-gradient(1.3px 1.3px at 10% 20%, #fff, transparent) 0 0 / 97px 97px, radial-gradient(1px 1px at 60% 70%, #ffffffbb, transparent) 0 0 / 61px 61px, radial-gradient(1.7px 1.7px at 40% 50%, #cfe0ff, transparent) 0 0 / 173px 173px, linear-gradient(160deg, #070818, #120d2c 50%, #05060f)' },
  ember: { name: 'Ember', css: 'radial-gradient(42% 36% at 70% 80%, #ff6a3d99, transparent 70%), radial-gradient(35% 30% at 24% 18%, #ffb34766, transparent 70%), repeating-linear-gradient(60deg, rgba(255,190,140,.08) 0 2px, transparent 2px 30px), repeating-linear-gradient(-60deg, rgba(255,190,140,.06) 0 2px, transparent 2px 30px), linear-gradient(170deg, #1c0d0a, #3a1510 55%, #120806)' },
  plain: { name: 'Plain', css: 'var(--bg)' },
}
function addShortcutDialog(onSave) {
  const d = document.createElement('div'); d.className = 'ntp-modal'
  d.innerHTML = `<form class="ntp-card rise"><div class="sc-head"><span class="sc-prev" id="sc-prev">${ICONS.globe}</span><div><h3>Add shortcut</h3><p>It shows up on every new tab.</p></div></div><label>Website address<input type="text" id="sc-url" placeholder="example.com" required spellcheck="false" autocomplete="off"></label><label>Name <input type="text" id="sc-name" placeholder="Optional"></label><div class="row2"><button type="button" class="btn" id="sc-cancel">Cancel</button><button class="btn primary">Add shortcut</button></div></form>`
  document.body.appendChild(d)
  d.querySelector('#sc-url').focus()
  // the preview turns into the site's letter as you type
  d.querySelector('#sc-url').oninput = e => { const h = hostOf(/^https?:\/\//i.test(e.target.value) ? e.target.value : 'https://' + e.target.value.trim()); $('#sc-prev').innerHTML = h && h.includes('.') ? letterFav(h.replace(/^www\./, '')) : ICONS.globe }
  d.querySelector('#sc-cancel').onclick = () => d.remove()
  d.onclick = e => { if (e.target === d) d.remove() }
  d.onkeydown = e => { if (e.key === 'Escape') d.remove() }
  d.querySelector('form').onsubmit = e => {
    e.preventDefault()
    let url = d.querySelector('#sc-url').value.trim(); if (!url) return
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    let host; try { host = new URL(url).host } catch { return }
    onSave({ url, title: d.querySelector('#sc-name').value.trim() || host.replace(/^www\./, '') }); d.remove()
  }
}

// ---------------------------------------------------------------- the New Tab clock: Glass, Minimal, Analog or Off
// Stored in ntpClock: true (or 'glass') is Glass, the default; 'minimal' and 'analog'; false is Off.
const clockStyle = () => S.ntpClock === false || S.ntpClock === 'off' ? 'off' : S.ntpClock === 'minimal' || S.ntpClock === 'analog' ? S.ntpClock : 'glass'
const nowText = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '').trim()
const SUN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/></svg>'
const MOON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"/></svg>'
const CK = { timer: 0, cells: [], txt: '', glyph: null }
// the digits are cut out of glass: a mask strip of 0-9 (and a second 0, so 9 rolls forward into 0) per layer
function glyphStrips(fs) {
  const fam = getComputedStyle(document.documentElement).getPropertyValue('--display').trim() || 'system-ui'
  const key = fs + fam
  if (CK.glyph && CK.glyph.key === key) return CK.glyph
  const dpr = Math.min(2, devicePixelRatio || 1), font = `800 ${fs}px ${fam}`
  const m = document.createElement('canvas').getContext('2d'); m.font = font
  const cw = Math.ceil(Math.max(...'0123456789'.split('').map(c => m.measureText(c).width)) * 1.04 + fs * .02), ch = Math.ceil(fs * 1.02)
  const asc = m.measureText('0').actualBoundingBoxAscent || fs * .72
  const strip = kind => {
    const c = document.createElement('canvas'); c.width = cw * dpr; c.height = ch * 11 * dpr
    const x = c.getContext('2d'); x.scale(dpr, dpr); x.font = font; x.textAlign = 'center'; x.fillStyle = x.strokeStyle = '#fff'; x.lineJoin = 'round'
    for (let i = 0; i < 11; i++) { const y = i * ch + ch / 2 + asc / 2, t = String(i % 10); if (kind === 'rim') { x.lineWidth = Math.max(1.5, fs * .026); x.strokeText(t, cw / 2, y) } else x.fillText(t, cw / 2, y) }
    return `url(${c.toDataURL()})`
  }
  const ccw = Math.round(fs * .3), r = fs * .068
  const colon = kind => {
    const c = document.createElement('canvas'); c.width = ccw * dpr; c.height = ch * dpr
    const x = c.getContext('2d'); x.scale(dpr, dpr); x.fillStyle = x.strokeStyle = '#fff'; x.lineWidth = Math.max(1.5, fs * .026)
    for (const y of [ch / 2 - asc * .26, ch / 2 + asc * .3]) { x.beginPath(); x.arc(ccw / 2, y, r, 0, 7); if (kind === 'rim') x.stroke(); else x.fill() }
    return `url(${c.toDataURL()})`
  }
  return (CK.glyph = { key, cw, ch, ccw, m: strip('fill'), mr: strip('rim'), cm: colon('fill'), cmr: colon('rim') })
}
const unwrap = (prev, t) => prev + ((((t - prev) % 360) + 540) % 360 - 180)
function rollSpring(set, p) {
  const s = new Jelly.Spring(p, 'jelly', v => { set(v); if (v === 10 && !s.vel) setTimeout(() => { if (s.t === 10) s.set(0) }, 0) })
  s.d = p
  return s
}
const rollTo = (s, d) => { if (s.d === d) return; const cur = s.d; s.d = d; s.to(d === 0 && cur === 9 ? 10 : d) }
const anglesOf = d => ({ h: (d.getHours() % 12 + d.getMinutes() / 60) * 30, m: (d.getMinutes() + d.getSeconds() / 60) * 6, s: d.getSeconds() * 6 })
function buildClock() {
  const c = $('#clock'); if (!c) return
  const style = clockStyle(), d = new Date(), txt = nowText(d)
  CK.cells = []; CK.secs = null; CK.hands = null; CK.sec = null; CK.txt = txt; CK.style = style
  if (style === 'glass') {
    const fs = Math.round(innerWidth <= 560 ? 84 : Math.min(176, Math.max(104, innerWidth * .135)))
    const g = glyphStrips(fs)
    c.style.setProperty('--m', g.m); c.style.setProperty('--mr', g.mr); c.style.setProperty('--fs', fs + 'px')
    const lens = Glass.lens(g.cw, g.ch, Math.min(g.cw, g.ch) * .45, 1.35), lensC = Glass.lens(g.ccw, g.ch, g.ccw * .45, 1.2)
    c.innerHTML = [...txt].map((ch, n) => /\d/.test(ch)
      ? `<span class="cg-cell" style="--cw:${g.cw}px;--ch:${g.ch}px;--n:${n};--p:${ch}"><i class="cg-sh"><b></b></i><i class="cg-body"></i><i class="cg-rim"></i><i class="cg-hi"></i></span>`
      : `<span class="cg-cell colon" style="--cw:${g.ccw}px;--ch:${g.ch}px;--n:${n};--m:${g.cm};--mr:${g.cmr}"><i class="cg-sh"><b></b></i><i class="cg-body"></i><i class="cg-rim"></i><i class="cg-hi"></i></span>`).join('')
    c.querySelectorAll('.cg-cell').forEach(e => { const b = e.querySelector('.cg-body'); if (lens) b.style.setProperty('--lens', e.classList.contains('colon') ? lensC : lens) })
    CK.cells = [...c.querySelectorAll('.cg-cell')].map((e, i) => /\d/.test(txt[i]) ? rollSpring(v => e.style.setProperty('--p', v.toFixed(4)), +txt[i]) : null)
    const tr = $('.cg-track'); if (tr) tr.style.setProperty('--tw', Math.round(c.getBoundingClientRect().width * .8) + 'px')
  } else if (style === 'minimal') {
    const strip = '<span class="mn-strip">' + '01234567890'.split('').map(x => `<span>${x}</span>`).join('') + '</span>'
    const digits = txt.replace(/\D/g, ''), s = String(d.getSeconds()).padStart(2, '0')
    c.innerHTML = [...txt].map(ch => /\d/.test(ch) ? `<span class="mn-cell">${strip}</span>` : `<span class="mn-colon">${esc(ch)}</span>`).join('') + `<span class="mn-sec"><span class="mn-cell">${strip}</span><span class="mn-cell">${strip}</span></span>`
    const cells = [...c.querySelectorAll(':scope > .mn-cell')], secs = [...c.querySelectorAll('.mn-sec .mn-cell')]
    cells.forEach((e, i) => e.style.setProperty('--p', digits[i])); secs.forEach((e, i) => e.style.setProperty('--p', s[i]))
    CK.cells = cells.map((e, i) => rollSpring(v => e.style.setProperty('--p', v.toFixed(4)), +digits[i]))
    CK.secs = secs.map((e, i) => rollSpring(v => e.style.setProperty('--p', v.toFixed(4)), +s[i]))
  } else if (style === 'analog') {
    c.innerHTML = `<div class="an-dial"><b class="an-n n12">12</b><b class="an-n n3">3</b><b class="an-n n6">6</b><b class="an-n n9">9</b><i class="an-hand an-h"></i><i class="an-hand an-m"></i><i class="an-hand an-s"></i><i class="an-c"></i></div>`
    c.querySelector('.an-dial').style.setProperty('--d', c.offsetWidth + 'px')
    const hand = sel => { const e = c.querySelector(sel); return new Jelly.Spring(0, 'jelly', v => e.style.setProperty('--a', v.toFixed(2) + 'deg')) }
    CK.hands = { h: hand('.an-h'), m: hand('.an-m'), s: hand('.an-s') }
    const a = anglesOf(d); for (const k in a) CK.hands[k].set(a[k])
  }
  const tr = $('.cg-track i, .mn-line i')
  if (tr) { CK.sec = new Jelly.Spring(0, 'jelly', v => tr.style.setProperty('--s', v.toFixed(3))); CK.sec.set(d.getSeconds()) }
}
function tickClock() {
  const c = $('#clock'), d = new Date()
  if (c) {
    const txt = nowText(d)
    if (CK.style === 'glass' || CK.style === 'minimal') {
      if (txt.length !== CK.txt.length) buildClock()
      else if (txt !== CK.txt) {
        CK.txt = txt
        if (CK.style === 'glass') [...txt].forEach((ch, i) => CK.cells[i] && rollTo(CK.cells[i], +ch))
        else txt.replace(/\D/g, '').split('').forEach((ch, i) => CK.cells[i] && rollTo(CK.cells[i], +ch))
      }
      if (CK.secs) String(d.getSeconds()).padStart(2, '0').split('').forEach((ch, i) => rollTo(CK.secs[i], +ch))
    } else if (CK.style === 'analog' && CK.hands) { const a = anglesOf(d); for (const k in a) CK.hands[k].to(unwrap(CK.hands[k].t, a[k])) }
    if (CK.sec) CK.sec.to(d.getSeconds())
  }
  const dt = $('#date')
  if (dt) {
    const h = d.getHours(), night = h < 6 || h >= 19
    const dl = `<span class="dt-ic ${night ? 'night' : ''}">${night ? MOON : SUN}</span><b>${greeting()}</b><i></i><span>${esc(d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))}</span>`
    if (dt.dataset.v !== dl) { dt.dataset.v = dl; dt.innerHTML = dl }
  }
  clearTimeout(CK.timer); CK.timer = setTimeout(tickClock, 1000 - Date.now() % 1000 + 8)
}
function clockMarkup(style, lightWp) {
  if (style === 'off') return '<div class="clockwrap ck-off"></div>'
  return `<div class="clockwrap ck-${style} ${lightWp ? 'light-wp' : ''}" id="clockwrap"><div class="clock" id="clock" role="timer" aria-live="off"></div>${style === 'glass' ? '<div class="cg-track"><i></i></div>' : style === 'minimal' ? '<div class="mn-line"><i></i></div>' : ''}</div>`
}

async function newTab() {
  document.title = 'New Tab'
  const custom = Array.isArray(S.ntpShortcuts)
  const sites = custom ? S.ntpShortcuts : (S.homeTiles ? (await L.invoke('topSites')).map(s => ({ url: s.url, title: s.host.replace(/^www\./, '') })) : [])
  const wp = S.ntpWallpaper === 'custom' || WALLPAPERS[S.ntpWallpaper] ? S.ntpWallpaper : 'aurora'
  // jump back in: the last few pages you were on, one per site
  let recent = []
  if (S.ntpRecent !== false) { try { const seen = new Set(); for (const h of await L.invoke('history', '')) { const k = hostOf(h.url); if (!k || seen.has(k) || !/^https?:/.test(h.url)) continue; seen.add(k); recent.push(h); if (recent.length === 4) break } } catch {} }
  let parcels = []; if (S.ntpParcels !== false) { try { parcels = ((await L.invoke('parcels')) || []).filter(p => p.status !== 'delivered' || Date.now() - p.delivered < 864e5).slice(0, 4) } catch {} }
  let later = []; if (S.ntpReadLater !== false) { try { later = (await L.invoke('readLater', 4)) || [] } catch {} }
  let stats = null; if (S.ntpStats !== false) { try { stats = await L.invoke('stats') } catch {} }
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'Just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : Math.round(m / 1440) + ' d ago' }
  const img = wp === 'custom' ? await L.invoke('wallpaper') : ''
  const style = clockStyle(), lightWp = (wp === 'aurora' || wp === 'plain') && !matchMedia('(prefers-color-scheme: dark)').matches
  root.innerHTML = `<div class="ntp wp-${esc(wp)}" id="ntp">
    <div class="ntp-bg" style="${wp === 'custom' && img ? `background-image:url('${img}')` : WALLPAPERS[wp] && WALLPAPERS[wp].css ? `background:${WALLPAPERS[wp].css}` : ''}"></div>
    ${clockMarkup(style, lightWp)}<div class="date" id="date"></div>
    <form class="searchbox rise" style="animation-delay:.08s" id="sf">${ICONS.search}<input id="q" autofocus placeholder="Search ${esc(ENGINES[S.searchEngine] || 'Google')} or type an address" spellcheck="false" autocomplete="off"><span class="sb-eng">${esc(ENGINES[S.searchEngine] || 'Google')}<kbd>Enter</kbd></span></form>
    <div class="tiles" id="tiles">${sites.map((s, i) => `<div class="tile rise" style="animation-delay:${0.12 + i * 0.03}s;--th:hsl(${hue(hostOf(s.url) || '?')} 72% 56%)" data-url="${esc(s.url)}" data-i="${i}"><div class="ti">${fav(s.url)}</div><span>${esc(s.title || hostOf(s.url))}</span><button class="tx" title="Remove">${ICONS.close}</button></div>`).join('')}${sites.length < 12 ? `<div class="tile add rise" style="animation-delay:${0.12 + sites.length * 0.03}s" id="addtile"><div class="ti">${ICONS.plus}</div><span>Add</span></div>` : ''}</div>
    ${stats && stats.blocked > 0 ? `<div class="nstats rise" style="animation-delay:.26s"><span class="ns-i">${ICONS.shield}</span><b>${stats.blocked.toLocaleString('en-US')}</b> ads and trackers blocked${stats.blocked > 400 ? `<i></i>about <b>${stats.blocked * 0.05 < 90 ? Math.round(stats.blocked * 0.05) + ' sec' : Math.round(stats.blocked * 0.05 / 60) + ' min'}</b> saved` : ''}</div>` : ''}
    ${recent.length ? `<div class="recent rise" style="animation-delay:.3s"><div class="rc-h">Jump back in</div><div class="rc-list">${recent.map(h => `<a class="rc" href="${esc(h.url)}"><span class="rc-f">${fav(h.url)}</span><span class="rc-b"><b>${esc(h.title || hostOf(h.url))}</b><i>${esc(hostOf(h.url).replace(/^www\./, ''))}  ·  ${ago(h.t)}</i></span></a>`).join('')}</div></div>` : ''}
    ${S.ntpParcels !== false ? parcelsRow(parcels) : ''}
    ${later.length ? `<div class="recent later rise" style="animation-delay:.34s"><div class="rc-h">Read later</div><div class="rc-list" id="rl">${later.map(h => `<a class="rc" href="${esc(h.url)}" data-rl="${esc(h.url)}"><span class="rc-f">${fav(h.url)}</span><span class="rc-b"><b>${esc(h.title || hostOf(h.url))}</b><i>${esc(hostOf(h.url).replace(/^www\./, ''))}  ·  saved ${ago(h.t).toLowerCase()}</i></span><button class="tx rl-x" title="Remove">${ICONS.close}</button></a>`).join('')}</div></div>` : ''}
    <div class="foot"><a href="lumen://history">${ICONS.clock}History</a><a href="lumen://bookmarks">${ICONS.star}Bookmarks</a><a href="lumen://passwords">${ICONS.key}Passwords</a><a href="lumen://settings">${ICONS.gear}Settings</a></div>
    <button class="customize" id="cust">${ICONS.tune}<span>Customize</span></button>
  </div>
  <aside class="drawer" id="drawer">
    <div class="dh"><b>Customize</b><button class="ib" id="dclose" title="Close">${ICONS.close}</button></div>
    <p class="dsub">Make the New Tab page yours.</p>
    <div class="dl">Clock</div>
    <div class="clkpick" id="clk">${[['glass', 'Glass', '<b>9:41</b>'], ['minimal', 'Minimal', '<b>9:41</b>'], ['analog', 'Analog', '<b></b>'], ['off', 'Off', '<b></b>']].map(([v, l, art]) => `<button class="clkb ${style === v ? 'on' : ''}" data-clk="${v}" title="${l} clock"><i class="cp cp-${v}">${art}</i><span>${l}</span></button>`).join('')}</div>
    <div class="dl">Wallpaper</div>
    <div class="wps">${Object.entries(WALLPAPERS).map(([k, v]) => `<button class="wpb ${k === wp ? 'on' : ''}" data-wp="${k}" title="${v.name}"><i class="wp-${k}" style="${v.css && v.css !== 'var(--bg)' ? `background:${v.css}` : ''}"></i><span>${v.name}</span></button>`).join('')}
      <label class="wpb ${wp === 'custom' ? 'on' : ''}" title="Your own image"><i class="wpup">${ICONS.plus}</i><span>Your image</span><input type="file" id="wpfile" accept="image/*" hidden></label></div>
    <div class="dl">Shortcuts</div>
    <div class="seg" id="scmode"><button data-v="auto" class="${custom ? '' : 'on'}">Most visited</button><button data-v="mine" class="${custom ? 'on' : ''}">My shortcuts</button></div>
    <div class="dl">Sections</div>
    <label class="drow"><span><em style="--ic:var(--accent)">${ICONS.clock}</em>Show Jump back in</span><span class="switch"><input type="checkbox" id="rcsw" ${S.ntpRecent !== false ? 'checked' : ''}><span></span></span></label>
    <label class="drow"><span><em style="--ic:oklch(from var(--accent) l c calc(h + 140))">${ICONS.box}</em>Show Parcels</span><span class="switch"><input type="checkbox" id="pcsw" ${S.ntpParcels !== false ? 'checked' : ''}><span></span></span></label>
    <label class="drow"><span><em style="--ic:oklch(from var(--accent) l c calc(h + 70))">${ICONS.book}</em>Show Read later</span><span class="switch"><input type="checkbox" id="rlsw" ${S.ntpReadLater !== false ? 'checked' : ''}><span></span></span></label>
  </aside>`
  buildClock(); tickClock()
  // the cursor is a small drop of liquid glass that bends the page under it
  if (!window.__trail) window.__trail = Jelly.trail({ size: 30, style: `backdrop-filter:${Glass.lens(30, 30, 15, 1.6)} blur(.5px) saturate(1.6) brightness(1.08);background:radial-gradient(circle at 34% 28%, rgba(255,255,255,.55), rgba(255,255,255,0) 40%), radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.45), inset 0 -3px 6px color-mix(in srgb, var(--accent) 30%, transparent), 0 4px 14px rgba(0,0,0,.18)` })
  $('#sf').onsubmit = e => { e.preventDefault(); const v = $('#q').value.trim(); if (v) L.invoke('navigate', v) }
  setTimeout(() => $('#q').focus(), 30)
  const save = list => { S.ntpShortcuts = list; L.invoke('setSetting', 'ntpShortcuts', list).then(newTab) }
  $('#pcsw').onchange = async e => { S.ntpParcels = e.target.checked; await L.invoke('setSetting', 'ntpParcels', e.target.checked); newTab().then(() => $('#drawer').classList.add('open')) }
  if ($('#pc')) $('#pc').onclick = e => {
    if (e.target.closest('[data-pcadd]')) { e.preventDefault(); return addParcelDialog(() => newTab()) }
    if (e.target.closest('[data-pcauto]')) { e.preventDefault(); L.invoke('setSetting', 'parcelsAuto', true).then(() => { S.parcelsAuto = true; flash('Orders you place will be saved here'); newTab() }); return }
    const a = e.target.closest('[data-pid]'); if (!a) return
    e.preventDefault(); L.invoke('parcelOpen', a.dataset.pid, e.metaKey || e.ctrlKey)
  }
  if ($('#rl')) $('#rl').onclick = async e => {
    const a = e.target.closest('[data-rl]'); if (!a) return
    e.preventDefault()
    await L.invoke('readLaterDone', a.dataset.rl)
    if (e.target.closest('.rl-x')) { a.style.transition = 'opacity .25s, transform .35s cubic-bezier(.3,1.4,.5,1)'; a.style.opacity = '0'; a.style.transform = 'scale(.92)'; setTimeout(newTab, 260); return }
    if (e.metaKey || e.ctrlKey) { L.invoke('open', a.dataset.rl, true); newTab() } else L.invoke('navigate', a.dataset.rl)
  }
  $('#rlsw').onchange = async e => { S.ntpReadLater = e.target.checked; await L.invoke('setSetting', 'ntpReadLater', e.target.checked); newTab().then(() => $('#drawer').classList.add('open')) }
  $('#rcsw').onchange = async e => { S.ntpRecent = e.target.checked; await L.invoke('setSetting', 'ntpRecent', e.target.checked); newTab() }
  $('#tiles').onclick = e => {
    if (e.target.closest('#addtile')) return addShortcutDialog(sc => save([...sites, sc]))
    const t = e.target.closest('.tile'); if (!t) return
    if (e.target.closest('.tx')) { e.stopPropagation(); return save(sites.filter((_, i) => i !== +t.dataset.i)) }
    if (e.metaKey || e.ctrlKey) L.invoke('open', t.dataset.url, true); else L.invoke('navigate', t.dataset.url)
  }
  const drawer = $('#drawer')
  $('#cust').onclick = () => drawer.classList.add('open')
  $('#dclose').onclick = () => drawer.classList.remove('open')
  drawer.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => { S.ntpWallpaper = b.dataset.wp; L.invoke('setSetting', 'ntpWallpaper', b.dataset.wp).then(() => newTab().then(() => $('#drawer').classList.add('open'))) })
  $('#wpfile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return
    const bmp = await createImageBitmap(f)
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    if (await L.invoke('wallpaper', c.toDataURL('image/jpeg', 0.86))) { S.ntpWallpaper = 'custom'; await L.invoke('setSetting', 'ntpWallpaper', 'custom'); await newTab(); $('#drawer').classList.add('open') }
  }
  $('#scmode').onclick = e => { const b = e.target.closest('button'); if (!b) return; save(b.dataset.v === 'mine' ? sites.slice() : null) }
  $('#clk').onclick = e => {
    const b = e.target.closest('[data-clk]'); if (!b) return
    const v = { glass: true, minimal: 'minimal', analog: 'analog', off: false }[b.dataset.clk]
    S.ntpClock = v; L.invoke('setSetting', 'ntpClock', v).then(() => newTab().then(() => $('#drawer').classList.add('open')))
  }
  if (!newTab.rs) { newTab.rs = true; let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if ($('#clock')) buildClock() }, 200) }) }
}

// ======================================================================= settings shell
const SECTIONS = [
  ['general', 'General', 'gear'], ['appearance', 'Appearance', 'moon'], ['apps', 'Surge and Koi', 'sparkle'], ['ai', 'Lumen AI', 'bolt'], ['privacy', 'Privacy and security', 'shield'],
  ['passwords', 'Passwords', 'key'], ['sync', 'Sync', 'reload'], ['import', 'Move from Chrome', 'arrowRight'],
  ['extensions', 'Extensions', 'puzzle'], ['history', 'History', 'clock'], ['bookmarks', 'Bookmarks', 'star'], ['readlater', 'Read later', 'book'],
  ['parcels', 'Parcels', 'box'], ['downloads', 'Downloads', 'download'], ['about', 'About Lumen', 'info'],
]
const NAV_GROUPS = { general: 'Browser', passwords: 'You', history: 'Library' }
// Nova: the page's cards come in one after another, 50ms apart, and pop in as they scroll into view
function stagger(main) {
  const mo = new MutationObserver(() => {
    [...main.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 10)))
    clearTimeout(stagger.t); stagger.t = setTimeout(() => Jelly.entrances('#main .card'), 60)
  })
  mo.observe(main, { childList: true })
}
function shell(active) {
  CUR_SECTION = active
  root.innerHTML = `<div class="shell"><nav class="nav"><div class="navhead"><img class="navlogo" src="lumen://assets/icon-${esc(S.appIcon || 'default')}.png" alt=""><h1>Lumen</h1></div><div class="navsearch">${ICONS.search}<input type="search" id="setq" placeholder="Search settings" spellcheck="false" autocomplete="off"><kbd>/</kbd></div>${SECTIONS.map(([id, label, icon]) => `${NAV_GROUPS[id] ? `<div class="navgrp">${NAV_GROUPS[id]}</div>` : ''}<a title="${label}" href="${id === 'history' || id === 'bookmarks' || id === 'readlater' || id === 'downloads' || id === 'passwords' || id === 'extensions' || id === 'parcels' ? 'lumen://' + id : 'lumen://settings/' + id}" class="${id === active ? 'on' : ''}">${ICONS[icon]}${label}</a>`).join('')}</nav><main class="main rise" id="main"></main></div>`
  document.title = active === 'general' ? 'Settings' : (SECTIONS.find(s => s[0] === active) || [, 'Settings'])[1]
  bindSettingsSearch(active)
  stagger($('#main'))
  // arriving from a search result: scroll to that setting and make it glow
  if (location.hash.length > 1) setTimeout(() => {
    const want = decodeURIComponent(location.hash.slice(1)).toLowerCase()
    const r = [...document.querySelectorAll('#main .row')].find(x => (x.querySelector('.t') || {}).textContent?.trim().toLowerCase() === want)
    if (r) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.add('flash'); setTimeout(() => r.classList.remove('flash'), 2400) }
  }, 350)
  return $('#main')
}
// ---- settings search: every row of every settings page, found by its name or description
let SET_INDEX = null
async function settingsIndex() {
  if (SET_INDEX) return SET_INDEX
  const out = []
  for (const [id, fn] of [['general', general], ['appearance', appearance], ['ai', aiPage], ['privacy', privacy], ['sync', sync], ['import', importPage]]) {
    const d = document.createElement('div')
    try { await fn(d) } catch {}
    const label = (SECTIONS.find(s => s[0] === id) || [, id])[1]
    d.querySelectorAll('.row').forEach(r => { const t = r.querySelector('.t'); if (t && t.textContent.trim()) out.push({ id, label, t: t.textContent.trim(), d: ((r.querySelector('.d') || {}).textContent || '').trim() }) })
  }
  return (SET_INDEX = out)
}
function bindSettingsSearch(active) {
  const q = $('#setq'); if (!q) return
  let saved = null
  q.oninput = async () => {
    const v = q.value.trim().toLowerCase(), m = $('#main')
    if (v.length < 2) { if (saved !== null) { m.innerHTML = ''; saved = null; const r = location.href; location.replace(r.split('#')[0]) } return }
    if (saved === null) saved = true
    const idx = await settingsIndex()
    if (q.value.trim().toLowerCase() !== v) return
    const words = v.split(/\s+/)
    const hits = idx.filter(x => words.every(w => (x.t + ' ' + x.d + ' ' + x.label).toLowerCase().includes(w))).slice(0, 40)
    const mark = s => esc(s).replace(new RegExp('(' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi'), '<mark>$1</mark>')
    m.innerHTML = `<h2>Search</h2><p class="lead">${hits.length ? hits.length + ' setting' + (hits.length > 1 ? 's' : '') + ' found' : 'Nothing matches that. Try another word.'}</p>` + (hits.length ? `<div class="card list">${hits.map(x => `<a class="row hit" href="lumen://settings/${x.id}#${encodeURIComponent(x.t)}"><div class="grow"><div class="t">${mark(x.t)}</div>${x.d ? `<div class="d">${mark(x.d)}</div>` : ''}</div><span class="pill">${esc(x.label)}</span><span class="hitgo">${ICONS.arrowRight}</span></a>`).join('')}</div>` : '')
  }
  if (!bindSettingsSearch.k) { bindSettingsSearch.k = true; addEventListener('keydown', e => { const t = document.activeElement; if (e.key === '/' && !e.metaKey && !e.ctrlKey && !(t && /INPUT|SELECT|TEXTAREA/.test(t.tagName)) && $('#setq')) { e.preventDefault(); $('#setq').focus() } }) }
  // arrow keys walk the results, Enter opens the one that is lit
  q.onkeydown = e => {
    const hits = [...document.querySelectorAll('#main a.hit')], at = hits.findIndex(a => a.classList.contains('act'))
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!hits.length) return; e.preventDefault()
      const n = (at + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length
      hits.forEach((a, i) => a.classList.toggle('act', i === n)); hits[n].scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') { const a = hits[Math.max(0, at)]; if (a) location.href = a.href } else if (e.key === 'Escape') { q.value = ''; q.oninput() }
  }
}
const sw = (key, on) => `<label class="switch"><input type="checkbox" data-set="${key}" ${on ? 'checked' : ''}><span></span></label>`
const row = (t, d, ctl) => `<div class="row"><div class="grow"><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>${ctl || ''}</div>`
const seg = (key, opts, val) => `<div class="seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`
// ---------------------------------------------------------------- Lumen 4.0 settings pieces
const tint = n => `oklch(from var(--accent) l c calc(h + ${n}))`
// a feature tile: its icon and live state on top, a tiny picture of what it does, then the words. The whole tile flips the switch.
function ft(key, on, title, desc, icon, hue, art = '', o = {}) {
  return `<div class="ftile row ${on ? 'is-on' : ''} ${o.wide ? 'wide' : ''}" style="--ic:${tint(hue)}"><div class="ft-top"><span class="ft-ic">${ICONS[icon] || ''}</span><span class="ft-st"><i></i><b>${on ? 'On' : 'Off'}</b></span>${o.input || sw(key, on)}</div>${art ? `<div class="ft-art" aria-hidden="true">${art}</div>` : ''}<div class="grow"><div class="t">${title}</div>${desc ? `<div class="d">${desc}</div>` : ''}${o.extra || ''}</div></div>`
}
const ftCard = (h, tiles, before = '') => `<div class="card fcard">${h ? `<h3>${h}</h3>` : ''}${before}<div class="ftiles">${tiles.join('')}</div></div>`
// live numbers at the top of a section
const glance = items => `<div class="glance">${items.filter(Boolean).map(([v, l, icon, hue, cls = '', extra = '']) => `<div class="gl ${cls}" style="--ic:${tint(hue)}"><span class="gl-ic">${ICONS[icon] || ''}</span><div><b>${v}</b><span>${l}</span>${extra}</div></div>`).join('')}</div>`
// big picture choices that behave like a segmented control (data-seg)
const vchoice = (key, opts, val) => `<div class="vch" data-seg="${key}" role="group">${opts.map(([v, l, art, sub, inner]) => `<button class="vc ${String(v) === String(val) ? 'on' : ''}" data-v="${v}" aria-pressed="${String(v) === String(val)}"><span class="vc-art ${art}" aria-hidden="true">${inner || (art.startsWith('tabs') ? '<i></i><i></i><i></i>' : '<i></i>')}</span><b>${l}</b>${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>`
const vrow = (t, d, body) => `<div class="row stack"><div class="grow"><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>${body}</div>`
const chip = (txt, cls = '') => `<span class="fa-chip ${cls}">${txt}</span>`
const K = (...k) => k.map(x => `<kbd>${x}</kbd>`).join('')
const faIc = (icon, x) => `<span class="fa-ic ${x ? 'x' : ''}">${ICONS[icon] || ''}</span>`
const ARR = `<span class="fa-arr">${ICONS.arrowRight}</span>`
const MOD = () => PLATFORM === 'darwin' ? 'Cmd' : 'Ctrl'
function bindSettings(m) {
  m.querySelectorAll('[data-set]').forEach(el => el.addEventListener('change', () => { S[el.dataset.set] = el.checked; L.invoke('setSetting', el.dataset.set, el.checked) }))
  m.querySelectorAll('[data-seg]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    g.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); if (x.hasAttribute('aria-pressed')) x.setAttribute('aria-pressed', String(x === b)) })
    let v = b.dataset.v; if (/^\d+$/.test(v)) v = parseInt(v)
    S[g.dataset.seg] = v; L.invoke('setSetting', g.dataset.seg, v)
  }))
  m.querySelectorAll('select[data-sel]').forEach(el => el.addEventListener('change', () => { S[el.dataset.sel] = el.value; L.invoke('setSetting', el.dataset.sel, el.value) }))
  bindTiles(m)
}
// a tile lights up with its switch, and a click anywhere on the tile flips the switch
function bindTiles(m) {
  m.querySelectorAll('.ftile').forEach(t => {
    if (t.dataset.bound) return; t.dataset.bound = '1'
    const i = t.querySelector('.ft-top input[type=checkbox]'); if (!i) return
    const paint = () => { t.classList.toggle('is-on', i.checked); const b = t.querySelector('.ft-st b'); if (b) b.textContent = i.checked ? 'On' : 'Off' }
    i.addEventListener('change', paint)
    t.addEventListener('click', e => { if (e.target.closest('.switch, button, select, a, input, label, .seg, .vch')) return; if (!i.disabled) i.click() })
  })
}

async function general(m) {
  const isDefault = await L.invoke('defaultBrowser')
  const eng = ENGINES[S.searchEngine] || 'Google'
  const sleep = { 0: 'Never', 15: '15 min', 30: '30 min', 60: '1 hour', 240: '4 hours' }[S.sleepTabsAfterMin || 0] || 'Never'
  const arch = { 0: 'Never', 12: '12 hours', 24: '1 day', 168: '1 week' }[S.archiveTabsAfterH || 0] || 'Never'
  const on = k => S[k] !== false
  m.innerHTML = `<h2>General</h2><p class="lead">How Lumen opens, searches, plays and tidies up after itself. Every change works right away.</p>
  ${glance([[isDefault ? 'Default' : 'Not default', 'Your browser', 'globe', 0, isDefault ? 'good' : ''], [esc(eng), 'Searches with', 'search', 50], [sleep, 'Tabs sleep after', 'moon', 200], [arch, 'Unused tabs archived', 'layers', 260]])}
  <div class="card"><h3>ESSENTIALS</h3>
    ${row('Default browser', isDefault ? 'Lumen is your default browser.' : 'Open links from other apps in Lumen.', isDefault ? '<span class="pill">Default</span>' : '<button class="btn primary" id="mkdef">Make default</button>')}
    ${row('Search engine', 'Used in the address bar and on the new tab page.', `<select data-sel="searchEngine" aria-label="Search engine">${Object.entries(ENGINES).map(([k, v]) => `<option value="${k}" ${k === S.searchEngine ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`)}
  </div>
  ${ftCard('EVERYDAY', [
    ft('restoreSession', !!S.restoreSession, 'Open where you left off', 'Bring back your tabs when Lumen starts. Pinned tabs always come back.', 'reload', 0, `<span class="fa-tabs"><i class="on"></i><i></i><i></i></span>${ARR}<span class="fa-tabs"><i class="on"></i><i></i><i></i></span>`),
    ft('showSuggestions', !!S.showSuggestions, 'Search suggestions', 'Show suggestions from your search engine as you type.', 'search', 30, '<span class="fa-list"><i>lofi be</i><i>lofi beats</i><i>lofi beats to study</i></span>'),
    ft('homeTiles', !!S.homeTiles, 'Show frequently visited on new tab', 'The sites you open most, one click away on every new tab.', 'star', 60, `${faIc('globe')}${faIc('star')}${faIc('book')}${faIc('plus')}`),
    ft('searchShortcuts', on('searchShortcuts'), 'Search shortcuts', 'Type yt, gh, w, amz, noon, maps, img, r, x, sp, tr, so, npm, news or ai, then a space and your search. Example: yt lofi beats.', 'bolt', 90, `${chip('yt', 'ac')}${chip('lofi beats')}${ARR}${faIc('play')}`),
    ft('cleanLinks', on('cleanLinks'), 'Clean links', 'Removes tracking junk like utm_source and fbclid from links before they open.', 'link', 120, chip('shop.com/item<s>?utm_source=mail</s>', 'mono')),
    ft('linksBackground', !!S.linksBackground, 'Open new tabs from links in the background', 'Links that open a new tab stay behind the page you are reading.', 'tabs', 150, `<span class="fa-tabs"><i class="on"></i><i></i><i class="zz"></i></span>`),
  ])}
  ${ftCard('PAGES AND MEDIA', [
    ft('autoPip', S.autoPip !== false, 'Picture in picture when you switch tabs', 'A playing video pops out into a floating window when you leave its tab, and back in when you return.', 'pip', 180, '<span class="fa-page"><span class="vid"></span></span>'),
    ft('videoSpeedKeys', on('videoSpeedKeys'), 'Video speed keys', 'Shift + &gt; speeds up and Shift + &lt; slows down any video, on any site.', 'play', 210, `${K('Shift', '&gt;')}${chip('1.5x', 'ac')}`),
    ft('soundActiveOnly', !!S.soundActiveOnly, 'Only play sound from the tab you are on', 'Other tabs are muted while you look at something else.', 'speaker', 240, `${faIc('speaker')}${faIc('muted', true)}${faIc('muted', true)}`),
    ft('rememberZoom', on('rememberZoom'), 'Remember zoom for each site', 'A site you zoomed stays zoomed next time.', 'search', 270, `${chip('example.com')}${chip('125%', 'ac')}`),
    ft('swipeNav', on('swipeNav'), 'Swipe to go back and forward', 'Two-finger swipe left or right on the trackpad.', 'back', 300, `${faIc('back')}<span class="fa-page"></span>${faIc('forward')}`),
    ft('wheelTabs', on('wheelTabs'), 'Scroll on the tab bar to switch tabs', 'Works when tabs are on top.', 'tabsTop', 330, '<span class="fa-tabs"><i></i><i class="on"></i><i></i><i></i></span>'),
  ])}
  ${ftCard('A CALMER WEB', [
    ft('hideCookieBanners', on('hideCookieBanners'), 'Hide cookie pop-ups', 'Blocks cookie consent banners and other annoyances along with ads.', 'shield', 140, `<span class="fa-page"><span class="ban"></span></span>${ARR}<span class="fa-page"></span>`),
    ft('blockNotifications', !!S.blockNotifications, 'Block notification requests', 'Sites never ask to send you notifications.', 'info', 20, `${chip('Allow notifications?')}${faIc('close', true)}`),
    ft('confirmQuit', on('confirmQuit'), 'Ask before quitting', `Asks before ${MOD()} Q closes a window with several tabs.`, 'winClose', 350, `${K(MOD(), 'Q')}${ARR}${chip('Quit Lumen?', 'ac')}`),
    ft('parcelsAuto', S.parcelsAuto === true, 'Save orders to Parcels automatically', 'When you place an order, the order page is saved so you can get back to it in one click, and it stays until it is delivered.', 'box', 100, `${chip('Order placed')}${ARR}${faIc('box')}`),
    ft('askWhereToSave', !!S.askWhereToSave, 'Ask where to save each file', 'Otherwise files go straight to your Downloads folder.', 'download', 200, `${faIc('download')}${ARR}${faIc('folder')}`),
  ])}
  <div class="card fcard"><h3>TRANSLATE</h3>
    ${row('Translate pages into', 'Lumen offers to translate pages in other languages. Right-click selected text to translate just that.', `<select data-sel="translateTo" aria-label="Translate pages into">${[['', 'System language'], ['en', 'English'], ['ar', 'Arabic'], ['ur', 'Urdu'], ['hi', 'Hindi'], ['fr', 'French'], ['es', 'Spanish'], ['de', 'German'], ['tr', 'Turkish'], ['zh-CN', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['ru', 'Russian'], ['pt', 'Portuguese'], ['it', 'Italian'], ['id', 'Indonesian']].map(([v, l]) => `<option value="${v}" ${v === (S.translateTo || '') ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
    <div class="ftiles">
      ${ft('offerTranslate', S.offerTranslate !== false, 'Offer to translate', 'Ask when a page is in another language.', 'translate', 60, `${chip('Bonjour')}${ARR}${chip('Hello', 'ac')}`)}
      ${ft('translateFlipDir', S.translateFlipDir !== false, 'Flip the page direction', 'When Arabic turns into English (or the other way), the layout switches from right-to-left to left-to-right to match.', 'split', 100, `${chip('RTL')}${ARR}${chip('LTR', 'ac')}`)}
    </div>
  </div>
  <div class="card vcard" style="--ic:${tint(250)}"><div class="vart" aria-hidden="true"><span class="fa-page"></span><span class="fa-page soft"></span><span class="fa-page dk"></span><span class="fa-page deep"></span><span class="lbl">Every site, your way</span></div><div class="vrows"><h3>DARK MODE</h3>
    ${row('Dark mode for every website', 'Turns light sites dark and leaves sites that are already dark alone. Turn it off for one site from the lock icon in the address bar.', sw('forceDark', !!S.forceDark))}
    ${row('Dark mode style', 'Soft is easier on the eyes, Deep is true black.', seg('darkStyle', [['soft', 'Soft'], ['balanced', 'Balanced'], ['deep', 'Deep']], S.darkStyle || 'balanced'))}
  </div></div>
  <div class="card vcard" style="--ic:${tint(200)}"><div class="vart" aria-hidden="true"><span class="fa-tabs"><i class="on"></i><i></i><i class="zz"></i><i class="zz"></i><i class="zz"></i><i></i></span><span class="lbl">Tabs that look after themselves</span></div><div class="vrows"><h3>TABS</h3>
    ${row('Sleep inactive tabs', 'Frees memory from tabs you have not looked at in a while. They wake up instantly when you click them.', seg('sleepTabsAfterMin', [[0, 'Never'], [15, '15 min'], [30, '30 min'], [60, '1 hour'], [240, '4 hours']], S.sleepTabsAfterMin || 0))}
    ${row('Archive tabs you have not used', 'Tabs you have not opened in this long close themselves. Pinned tabs and tabs playing sound stay. Find them again in History, Archived tabs.', seg('archiveTabsAfterH', [[0, 'Never'], [12, '12 hours'], [24, '1 day'], [168, '1 week']], S.archiveTabsAfterH || 0))}
  </div></div>`
  bindSettings(m)
  const b = $('#mkdef'); if (b) b.onclick = async () => { await L.invoke('defaultBrowser', 'set'); setTimeout(() => general(m), 1200) }
}

async function aiPage(m) {
  const st = await L.invoke('aiStatus') || {}
  const bars = hs => hs.map(h => `<i style="height:${h}px"></i>`).join('')
  m.innerHTML = `<h2>Lumen AI</h2><p class="lead">Summarize any page, ask questions about it, or get a highlighted paragraph explained. Open it with Shift ${MOD()} A, from the menu, or by right-clicking a page.</p>
  <div class="glance aiuses">${[['book', 'Summarize', 'Any page in a few lines'], ['search', 'Ask', 'Questions about the page'], ['sparkle', 'Explain', 'Right-click selected text']].map(([i, t, d], n) => `<div class="gl" style="--ic:${tint(n * 70)}"><span class="gl-ic">${ICONS[i]}</span><div><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>
  <div class="card"><h3>CLAUDE API KEY</h3>
    <div class="row aikeyrow"><span class="aiorb ${st.ready ? '' : 'off'}">${ICONS.sparkle}</span><div class="grow"><div class="t">${st.ready ? 'Key saved' : 'No key yet'}</div><div class="d">${st.ready ? 'Your key is stored encrypted on this device and only sent to Anthropic.' : 'Lumen AI runs on Claude with your own API key. Create one at console.anthropic.com, under API Keys, then paste it here.'}</div></div>${st.ready ? '<span class="pill">Connected</span><button class="btn sm" id="aikeyrm">Remove</button>' : ''}</div>
    <div class="row keyfield"><input id="aikey" type="password" placeholder="sk-ant-..." autocomplete="off" spellcheck="false" aria-label="Claude API key"><button class="btn primary" id="aikeysave">${st.ready ? 'Replace' : 'Save key'}</button></div>
  </div>
  <div class="card fcard"><h3>OPTIONS</h3>
    ${vrow('Model', 'Fast is quicker and cheaper. Smart writes deeper answers.', vchoice('aiModel', [['fast', 'Fast', 'mdl', 'Quick answers, low cost', `<em>Fast</em>${bars([14, 22, 18, 28])}`], ['smart', 'Smart', 'mdl', 'Deeper, more careful answers', `<em>Smart</em>${bars([24, 36, 46, 56])}`]], S.aiModel || 'fast'))}
    <div class="ftiles">${ft('aiTabGroups', S.aiTabGroups !== false, 'Use AI to sort tab groups', 'When on, Sort tabs into groups sends your tab titles and links to Claude for smarter groups. When off, Lumen groups tabs on your device.', 'layers', 140, `<span class="fa-tabs"><i class="on"></i><i class="on"></i></span><span class="fa-tabs"><i></i><i></i><i></i></span>`)}</div>
  </div>
  <p class="note">Page text is sent to Anthropic only when you ask Lumen AI something. Nothing is sent in the background.</p>`
  bindSettings(m)
  $('#aikeysave').onclick = async () => {
    const v = $('#aikey').value.trim()
    if (!/^sk-ant-/.test(v)) { $('#aikey').focus(); $('#aikey').style.boxShadow = '0 0 0 2px #e5484d'; return }
    await L.invoke('aiSetKey', v); aiPage(m)
  }
  const rm = $('#aikeyrm'); if (rm) rm.onclick = async () => { await L.invoke('aiSetKey', ''); aiPage(m) }
}

// Appearance: a live picture of your browser at the top that follows every change
function paintPreview() {
  const a = $('#apv'); if (!a) return
  const th = LUMEN_THEMES[S.browserTheme] || null, tc = S.themeCustom || {}
  const dark = S.theme === 'dark' || (S.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
  const bg = S.browserTheme === 'custom' ? `linear-gradient(${tc.angle || 135}deg, ${tc.a || '#5b8cff'}, ${tc.b || '#8a63f2'})` : (th && th.bg) || ''
  const chromeDark = S.browserTheme && S.browserTheme !== 'default' ? (S.browserTheme === 'custom' ? dark : !!(th && th.dark)) : dark
  a.classList.toggle('dark', chromeDark); a.classList.toggle('side', S.tabLayout === 'side'); a.classList.toggle('compact', !!S.compact)
  a.classList.toggle('no-bm', S.bookmarksBar === false || S.tabLayout === 'side')
  a.style.background = bg
  const f = $('#apvf'); if (f) f.innerHTML = [S.tabLayout === 'side' ? 'Tabs in the sidebar' : 'Tabs on top', S.compact ? 'Compact' : 'Roomy', (S.browserTheme === 'custom' ? 'Your colors' : (th ? th.name : 'Default')) + ' theme', { jelly: 'Jelly', lively: 'Jelly', calm: 'Calm', off: 'No' }[S.motion || 'jelly'] + ' motion', { system: 'Follows your computer', light: 'Light', dark: 'Dark' }[S.theme || 'system']].map(x => `<span><i></i>${esc(x)}</span>`).join('')
}
function appearance(m) {
  const colors = ['#5b8cff', '#7c5cff', '#e5487d', '#f0763b', '#e8b22c', '#2fb67c', '#16a3b8', '#7a7d87']
  const own = S.accent && !colors.includes(S.accent)
  m.innerHTML = `<h2>Appearance</h2><p class="lead">Make it yours. The picture below follows every change, and so does all of Lumen.</p>
  <div class="apv-stage"><div class="apv" id="apv" role="img" aria-label="A preview of your browser"><div class="apv-bar"><span class="apv-dots"><i></i><i></i><i></i></span><span class="apv-tabs"><i class="on"></i><i></i><i></i></span></div><div class="apv-url">lumen</div><div class="apv-bm"><i></i><i></i><i></i><i></i></div><div class="apv-body"><div class="apv-side"><i class="on"></i><i></i><i></i><i></i></div><div class="apv-page"><b></b><i></i><i></i><i></i><em></em></div></div></div>
    <div class="apv-tx"><h3>Your Lumen</h3><p>Tabs, theme, color and motion, all in one look. Change anything on this page and watch it here.</p><div class="apv-facts" id="apvf"></div></div></div>
  <div class="card fcard"><h3>LAYOUT</h3>
    ${vrow('Tabs', 'Down the side in a sidebar, or across the top like Chrome.', vchoice('tabLayout', [['top', 'Top', 'tabs-top', 'Across the top, like Chrome'], ['side', 'Sidebar', 'tabs-side', 'Down the side, room for long titles']], S.tabLayout || 'top'))}
    <div class="ftiles">
      ${ft('compact', !!S.compact, 'Compact mode', 'Thinner bars and tabs, more room for the page.', 'minus', 40, '<span class="fa-tabs"><i class="on"></i><i></i><i></i></span>')}
      ${ft('bookmarksBar', S.bookmarksBar !== false, 'Bookmarks bar', 'Shows your bookmarks under the address bar when tabs are on top.', 'star', 90, `${chip(ICONS.star + 'Docs')}${chip(ICONS.star + 'Mail')}${chip(ICONS.star + 'News')}`)}
      ${ft('uiSounds', !!S.uiSounds, 'Interface sounds', 'Soft pops when you open, close and switch tabs.', 'speaker', 140, `${faIc('speaker')}${chip('pop', 'ac')}${chip('tick')}`)}
    </div>
  </div>
  <div class="card"><h3>BROWSER THEME</h3>
    <div class="themes">${Object.entries(LUMEN_THEMES).map(([k, v]) => `<button class="thb ${k === (S.browserTheme || 'default') ? 'on' : ''}" data-th="${k}"><i style="background:${v.bg || 'linear-gradient(135deg, #e9ecf2, #d9dde6)'}"><b class="${v.dark ? 'dk' : ''}"></b></i><span>${v.name}</span></button>`).join('')}
      <button class="thb ${S.browserTheme === 'custom' ? 'on' : ''}" data-th="custom"><i id="cprev" style="background:linear-gradient(${(S.themeCustom || {}).angle || 135}deg, ${(S.themeCustom || {}).a || '#5b8cff'}, ${(S.themeCustom || {}).b || '#8a63f2'})"><b></b></i><span>Custom</span></button></div>
    <div class="row" id="customrow" style="${S.browserTheme === 'custom' ? '' : 'display:none'}"><div class="grow"><div class="t">Your colors</div><div class="d">Pick two colors for the gradient.</div></div>
      ${[['ca', (S.themeCustom || {}).a || '#5b8cff', 'First color'], ['cb', (S.themeCustom || {}).b || '#8a63f2', 'Second color']].map(([id, v, t]) => `<label class="cswatch" title="${t}" style="--c:${esc(v)}"><input type="color" id="${id}" value="${esc(v)}" aria-label="${t}"><i></i><span>${esc(v)}</span></label>`).join('')}
      <span class="angchip" style="--a:${(S.themeCustom || {}).angle || 135}deg"><em></em><select id="cang" aria-label="Gradient angle">${[90, 135, 180, 225].map(a => `<option value="${a}" ${a === ((S.themeCustom || {}).angle || 135) ? 'selected' : ''}>${a} degrees</option>`).join('')}</select></span>
      <label class="gtoggle">Glass<span class="switch"><input type="checkbox" id="cglass" ${(S.themeCustom || {}).glass ? 'checked' : ''}><span></span></span></label></div>
  </div>
  <div class="card"><h3>APP ICON</h3>
    <div class="icons">${['default', 'midnight', 'sunset', 'mint', 'ocean', 'gold', 'rose', 'mono'].map(k => `<button class="icb ${k === (S.appIcon || 'default') ? 'on' : ''}" data-ic="${k}"><img src="lumen://assets/icon-${k}.png" alt=""><span>${k[0].toUpperCase() + k.slice(1)}</span></button>`).join('')}</div>
    <p class="note" style="padding:0 18px 14px">Changes Lumen's icon in the Dock while it's running.</p>
  </div>
  <div class="card fcard"><h3>COLORS AND MOTION</h3>
    ${vrow('Theme', 'Follow your computer, or pick one.', vchoice('theme', [['system', 'System', 'th-system', 'Matches your computer'], ['light', 'Light', 'th-light', 'Porcelain and glass'], ['dark', 'Dark', 'th-dark', 'Deep ink and star dust']], S.theme || 'system'))}
    ${row('Accent color', 'Every glow, gradient and highlight in Lumen comes from this one color.', `<div class="swatches big">${colors.map(c => `<button data-c="${c}" style="background:${c};color:${c}" class="${c === S.accent ? 'on' : ''}" aria-label="Accent ${c}"></button>`).join('')}<label class="accent-custom ${own ? 'on' : ''}" title="Your own color" style="--cc:${own ? esc(S.accent) : '#fff'}"><input type="color" id="accentc" value="${esc(own ? S.accent : '#5b8cff')}" aria-label="Your own accent color"></label></div>`)}
    ${vrow('Motion', 'Jelly is the default: things overshoot a little and settle with a soft wobble. Calm barely overshoots. Off removes animation. Scrolling always glides straight to a stop. Point at one to feel it.', vchoice('motion', [['jelly', 'Jelly', 'mo mo-jelly', 'Overshoots, then settles'], ['calm', 'Calm', 'mo mo-calm', 'Barely overshoots'], ['off', 'Off', 'mo mo-off', 'No animation at all']], S.motion === 'lively' ? 'jelly' : S.motion || 'jelly'))}
  </div>
  <p class="note">Tip: hide the sidebar with Shift + ${MOD()} + S and move your mouse to the left edge to peek at it. Switch between sidebar and top tabs with Option + ${MOD()} + S.</p>`
  bindSettings(m)
  m.querySelectorAll('.vc-art.mo').forEach(a => a.style.setProperty('--w', a.offsetWidth + 'px'))
  m.querySelectorAll('[data-th]').forEach(b => b.onclick = () => {
    m.querySelectorAll('[data-th]').forEach(x => x.classList.toggle('on', x === b))
    S.browserTheme = b.dataset.th; L.invoke('setSetting', 'browserTheme', b.dataset.th)
    $('#customrow').style.display = b.dataset.th === 'custom' ? '' : 'none'
  })
  const saveCustom = () => {
    const c = { a: $('#ca').value, b: $('#cb').value, angle: +$('#cang').value, glass: $('#cglass').checked }
    $('#cprev').style.background = `linear-gradient(${c.angle}deg, ${c.a}, ${c.b})`
    for (const id of ['ca', 'cb']) { const l = $('#' + id).closest('.cswatch'); l.style.setProperty('--c', $('#' + id).value); l.querySelector('span').textContent = $('#' + id).value }
    $('#cang').closest('.angchip').style.setProperty('--a', c.angle + 'deg')
    S.themeCustom = c; L.invoke('setSetting', 'themeCustom', c)
  }
  for (const id of ['ca', 'cb', 'cang', 'cglass']) $('#' + id).addEventListener(id === 'cglass' || id === 'cang' ? 'change' : 'input', saveCustom)
  m.querySelectorAll('[data-ic]').forEach(b => b.onclick = () => {
    m.querySelectorAll('[data-ic]').forEach(x => x.classList.toggle('on', x === b))
    S.appIcon = b.dataset.ic; L.invoke('setSetting', 'appIcon', b.dataset.ic)
  })
  const setAccent = c => { S.accent = c; applyLook(S); clearTimeout(setAccent.t); setAccent.t = setTimeout(() => L.invoke('setSetting', 'accent', c), 120) }
  m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    m.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); $('.accent-custom').classList.remove('on')
    setAccent(b.dataset.c)
  })
  $('#accentc').addEventListener('input', e => {
    const c = e.target.value; m.querySelectorAll('[data-c]').forEach(x => x.classList.remove('on'))
    const l = $('.accent-custom'); l.classList.add('on'); l.style.setProperty('--cc', c); setAccent(c)
  })
  const repaint = () => requestAnimationFrame(paintPreview)
  for (const ev of ['click', 'change', 'input']) m.addEventListener(ev, repaint)
  paintPreview()
}

const PERM_NAMES = { 'media-audio': 'Microphone', 'media-video': 'Camera', 'media-audio+video': 'Camera and microphone', geolocation: 'Location', notifications: 'Notifications', 'clipboard-read': 'Clipboard', 'display-capture': 'Screen sharing', midi: 'MIDI', midiSysex: 'MIDI control', 'idle-detection': 'Idle detection', 'window-management': 'Window management' }
const PERM_ICON = { 'media-audio': ['speaker', 300], 'media-video': ['camera', 0], 'media-audio+video': ['camera', 0], geolocation: ['location', 140], notifications: ['info', 40], 'clipboard-read': ['file', 200], 'display-capture': ['layers', 250], midi: ['keyboard', 80], midiSysex: ['keyboard', 80], 'idle-detection': ['clock', 170], 'window-management': ['tabs', 220] }
// the ad blocker's filter lists: how fresh they are, and a button to fetch them now (they refresh every 8 hours anyway)
const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + (m === 1 ? ' minute' : ' minutes') + ' ago' : m < 1440 ? Math.round(m / 60) + (Math.round(m / 60) === 1 ? ' hour' : ' hours') + ' ago' : Math.round(m / 1440) + (Math.round(m / 1440) === 1 ? ' day' : ' days') + ' ago' }
async function adblockFreshness(m) {
  const when = m.querySelector('#abl-when'), b = m.querySelector('#abl-go'); if (!when || !b) return
  const paint = i => { when.textContent = i.updatedAt ? `Updated ${ago(i.updatedAt)}. Lumen gets fresh lists every 8 hours, so sites like YouTube keep working.` : 'Lumen gets fresh lists every 8 hours, so sites like YouTube keep working.'; b.classList.toggle('busy', !!i.refreshing) }
  paint(await L.invoke('adblockInfo'))
  b.onclick = async () => {
    if (b.classList.contains('busy')) return
    b.classList.add('busy'); b.querySelector('.abl-t').textContent = 'Updating'
    const ok = await L.invoke('adblockRefresh').catch(() => false)
    b.classList.remove('busy'); b.classList.add(ok ? 'done' : 'fail'); b.querySelector('.abl-t').textContent = ok ? 'Up to date' : 'Could not update'
    paint(await L.invoke('adblockInfo'))
    setTimeout(() => { b.classList.remove('done', 'fail'); b.querySelector('.abl-t').textContent = 'Update now' }, 2600)
  }
}
async function privacy(m) {
  const perms = await L.invoke('permissions')
  let stats = {}; try { stats = (await L.invoke('stats')) || {} } catch {}
  const sites = Object.entries(perms), allow = S.adblockAllow || []
  const nPerm = sites.reduce((n, [, p]) => n + Object.keys(p).length, 0), blocked = stats.blocked || 0
  const saved = blocked * 0.05 < 90 ? Math.round(blocked * 0.05) + ' seconds' : Math.round(blocked * 0.05 / 60) + ' minutes'
  const sch = (id, on, dis) => `<label class="switch"><input type="checkbox" ${id ? `id="${id}"` : ''} ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}><span></span></label>`
  m.innerHTML = `<h2>Privacy and security</h2><p class="lead">Ads and trackers are blocked out of the box. No account, no telemetry.</p>
  ${glance([[blocked.toLocaleString('en-US'), 'Ads and trackers blocked', 'shield', 140, 'good'], [S.httpsOnly ? 'On' : 'Off', 'Secure connections only', 'lock', 200], [String(allow.length), allow.length === 1 ? 'Site with ads allowed' : 'Sites with ads allowed', 'globe', 40], [String(nPerm), nPerm === 1 ? 'Site permission' : 'Site permissions', 'key', 300]])}
  <div class="card fcard"><h3>SHIELDS</h3>
    <div class="shieldrow"><span class="shield-big ${S.adblock ? '' : 'off'}" id="shbig">${ICONS.shield}</span><div class="grow"><b>${blocked.toLocaleString('en-US')}</b><span>${blocked ? `ads and trackers kept off your pages, about ${saved} of loading saved` : 'ads and trackers will be counted here as Lumen blocks them'}</span></div></div>
    <div class="ftiles">
      ${ft('adblock', !!S.adblock, 'Block ads and trackers', 'Built in, works on every site, faster pages and less data. No extension needed.', 'shield', 140, `<span class="fa-page"><span class="ban"></span></span>${ARR}<span class="fa-page"></span>`)}
      ${ft('doNotTrack', !!S.doNotTrack, 'Ask sites not to track you', 'Sends Global Privacy Control and Do Not Track with every request.', 'mask', 260, `${chip('Sec-GPC: 1', 'mono')}${chip('DNT: 1', 'mono ac')}`)}
      ${ft('httpsOnly', !!S.httpsOnly, 'Always use secure connections', 'Upgrades sites to HTTPS when they support it.', 'lock', 200, `${chip('http://', 'mono')}${ARR}${chip(ICONS.lock + 'https://', 'mono ac')}`)}
    </div>
    ${row('Filter lists', '<span id="abl-when">Checking</span>', '<button class="btn sm abl-btn" id="abl-go"><span class="abl-spin"></span><span class="abl-t">Update now</span></button>')}
    ${row('Sites where the ad blocker is off', allow.length ? 'If a site looks broken or is missing things, turn the blocker off just there from the shield in the address bar.' : 'None yet. If a site looks broken or is missing things, click the shield in the address bar and turn the blocker off just for that site.', '')}
    ${allow.length ? `<div class="allowchips">${allow.map(h => `<span class="allowchip">${letterFav(h)}${esc(h)}<button class="btn sm" data-unallow="${esc(h)}">Block ads again</button></span>`).join('')}</div>` : ''}
    ${row('Google sign-in', 'If Google says this browser may not be secure, switch modes and sign in again. Lumen also switches by itself once when that happens.', seg('googleSignInMode', [['chrome', 'Standard'], ['firefox', 'Compatibility']], S.googleSignInMode || 'chrome'))}
  </div>
  <div class="card fcard"><h3>CLEAR BROWSING DATA</h3>
    <div class="clrgrid">
      ${ft('', true, 'History', 'Pages you visited. Always cleared.', 'clock', 0, '', { input: sch('', true, true) })}
      ${ft('', false, 'Cookies and site data', 'Signs you out of most sites.', 'key', 60, '', { input: sch('cc', false) })}
      ${ft('', true, 'Cached images and files', 'Pages load from the web again.', 'file', 120, '', { input: sch('ca', true) })}
    </div>
    <div class="row clrfoot"><div class="grow"><div class="t">Time range</div><div class="d">How far back to clear.</div></div><select id="range" aria-label="Time range"><option value="3600000">Last hour</option><option value="86400000">Last 24 hours</option><option value="604800000">Last 7 days</option><option value="0" selected>All time</option></select><button class="btn primary" id="clear">${ICONS.trash}Clear data</button></div>
  </div>
  <div class="card"><h3>SITE PERMISSIONS</h3>
    ${sites.length ? sites.map(([origin, p]) => `<div class="permsite">${fav(origin)}<div class="grow"><div class="t">${esc(hostOf(origin))}</div>${Object.entries(p).map(([k, v]) => { const [ic, hh] = PERM_ICON[k] || ['info', 0]; return `<div class="permline"><span class="pn" style="--ic:${tint(hh)}">${ICONS[ic] || ''}${esc(PERM_NAMES[k] || k)}</span>${seg('', [['allow', 'Allow'], ['deny', 'Block']], v).replace('data-seg=""', `data-origin="${esc(origin)}" data-perm="${esc(k)}"`)}<button class="ib" data-del-origin="${esc(origin)}" data-del-perm="${esc(k)}" title="Remove">${ICONS.close}</button></div>` }).join('')}</div></div>`).join('') : '<div class="row"><div class="d">Sites you allow or block camera, location, notifications and more will show up here.</div></div>'}
  </div>`
  bindSettings(m); adblockFreshness(m)
  const ab = m.querySelector('[data-set=adblock]'); if (ab) ab.addEventListener('change', () => $('#shbig').classList.toggle('off', !ab.checked))
  m.querySelectorAll('[data-unallow]').forEach(b => b.onclick = async () => { S.adblockAllow = (S.adblockAllow || []).filter(x => x !== b.dataset.unallow); await L.invoke('setSetting', 'adblockAllow', S.adblockAllow); privacy(m) })
  $('#clear').onclick = async () => {
    const b = $('#clear'); b.disabled = true; b.lastChild.textContent = 'Clearing'
    await L.invoke('clearHistory', parseInt($('#range').value), $('#cc').checked, $('#ca').checked)
    b.classList.add('cleared'); b.lastChild.textContent = 'Cleared'; flash('Browsing data cleared')
    setTimeout(() => { b.disabled = false; b.classList.remove('cleared'); b.lastChild.textContent = 'Clear data' }, 1800)
  }
  m.querySelectorAll('[data-origin]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b))
    L.invoke('setPermission', g.dataset.origin, g.dataset.perm, b.dataset.v)
  }))
  m.querySelectorAll('[data-del-origin]').forEach(b => b.onclick = async () => { await L.invoke('setPermission', b.dataset.delOrigin, b.dataset.delPerm, null); privacy(m) })
}

let confirmDelete = false
// a rough strength score from 0 to 4: length, variety, and no obvious patterns
function pwScore(v) {
  if (!v) return 0
  let s = 0; if (v.length >= 8) s++; if (v.length >= 12) s++; if (v.length >= 16) s++
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(v)).length; if (kinds >= 3) s++
  if (/^(password|qwerty|123456|letmein|hunter)/i.test(v) || /(.)\1{3,}/.test(v) || kinds < 2) s = Math.min(s, 1)
  return Math.max(0, Math.min(4, s))
}
async function passwords(m) {
  const list = await L.invoke('passwords')
  const health = await L.invoke('passwordHealth') || {}
  const pks = await L.invoke('passkeys')
  const weakN = Object.values(health).filter(h => h.weak).length, reusedN = Object.values(health).filter(h => h.reused).length
  const risky = list.filter(p => health[p.id] && (health[p.id].weak || health[p.id].reused)).length
  const pct = list.length ? Math.round((list.length - risky) / list.length * 100) : 100
  m.innerHTML = `<h2>Passwords</h2><p class="lead">Passwords and passkeys, saved and filled in for you, encrypted with your ${PLATFORM === 'darwin' ? 'macOS Keychain' : 'system keychain'}. Syncs end-to-end encrypted if you turn on Sync.</p>
  ${glance([[String(list.length), list.length === 1 ? 'Saved password' : 'Saved passwords', 'key', 0], [String(pks.length), pks.length === 1 ? 'Passkey' : 'Passkeys', 'shield', 300], [String(reusedN), 'Reused', 'reload', 40, reusedN ? 'warn' : 'good'], [String(weakN), 'Weak', 'info', 40, weakN ? 'warn' : 'good']])}
  ${list.length ? `<div class="card health"><div class="pwhealth"><span class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${risky ? '#ffb15c' : 'var(--accent)'}"/><stop offset="1" style="stop-color:${risky ? '#f0763b' : 'var(--accent3)'}"/></linearGradient></defs><circle class="bg" cx="50" cy="50" r="42"/><circle class="fg" cx="50" cy="50" r="42" stroke-dasharray="264" stroke-dashoffset="${(264 - 264 * pct / 100).toFixed(1)}"/></svg><b>${pct}</b></span><div class="grow"><div class="t">${risky ? 'Some passwords could be stronger' : 'Your passwords look good'}</div><div class="d">${list.length} saved  ·  ${reusedN} reused  ·  ${weakN} weak. ${pct} out of 100 are safe. Checked on this device only.</div></div>${risky ? '<button class="btn sm" id="onlyrisk">Show them</button>' : ''}</div></div>` : ''}
  <div class="toolbar"><input type="search" id="q" placeholder="Search passwords"><button class="btn primary" id="add">${ICONS.plus}Add</button><button class="btn" id="imp">Import CSV</button><button class="btn" id="exp">Export</button></div>
  <div class="card hidden" id="addcard"><h3>ADD PASSWORD</h3><div class="row" style="gap:8px;flex-wrap:wrap"><input type="text" id="a-site" placeholder="Website" style="flex:1" aria-label="Website"><input type="text" id="a-user" placeholder="Username" style="flex:1" aria-label="Username"><input type="text" id="a-pass" placeholder="Password" style="flex:1" aria-label="Password"><button class="btn" id="a-gen">${ICONS.sparkle}Generate</button><button class="btn primary" id="a-save">Save</button></div><div class="pwm" id="pwm" data-s="0"><span></span><b>Type or generate a password</b></div></div>
  <div class="card list" id="list"></div>
  <div class="card pkcard"><h3>PASSKEYS</h3><div class="list" id="pklist"></div></div>
  <p class="note">When a site offers to create a passkey, Lumen saves it here and signs you in with Touch ID next time. Passkeys sync with Sync on, end-to-end encrypted.</p>
  <p class="note">In Chrome: Settings, Passwords and autofill, Google Password Manager, Settings, Export passwords. Then import the CSV here.</p>`
  let onlyRisk = false
  const draw = q => {
    const f = list.filter(p => (!q || p.origin.includes(q) || p.username.toLowerCase().includes(q)) && (!onlyRisk || (health[p.id] && (health[p.id].weak || health[p.id].reused))))
    $('#list').innerHTML = f.length ? f.map(p => `<div class="row" data-id="${p.id}">${fav(p.origin)}<div class="grow"><div class="t">${esc(hostOf(p.origin))} ${health[p.id] && health[p.id].reused ? '<span class="pill warn">Reused</span>' : ''} ${health[p.id] && health[p.id].weak ? '<span class="pill warn">Weak</span>' : ''}</div><div class="d">${esc(p.username || '(no username)')}</div></div><span class="mono pw" style="color:var(--fg3)">••••••••••</span><button class="btn sm" data-a="show">Show</button><button class="btn sm" data-a="copy">Copy</button><button class="ib" data-a="del" title="Delete">${ICONS.close}</button></div>`).join('') : `<div class="empty">${q ? 'No matches' : 'No saved passwords yet. Lumen will offer to save them when you sign in to sites.'}</div>`
  }
  draw('')
  $('#q').oninput = e => draw(e.target.value.toLowerCase())
  const orb = $('#onlyrisk'); if (orb) orb.onclick = () => { onlyRisk = !onlyRisk; orb.textContent = onlyRisk ? 'Show all' : 'Show them'; draw($('#q').value.toLowerCase()) }
  $('#list').onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return
    const r = b.closest('[data-id]'), id = r.dataset.id
    if (b.dataset.a === 'show') {
      const pw = r.querySelector('.pw')
      if (b.textContent === 'Hide') { pw.textContent = '••••••••••'; b.textContent = 'Show'; return }
      const v = await L.invoke('revealPassword', id); if (v == null) return
      pw.textContent = v; pw.style.color = 'var(--fg)'; b.textContent = 'Hide'
    }
    if (b.dataset.a === 'copy') { await L.invoke('copyPassword', id); b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1400) }
    if (b.dataset.a === 'del') { await L.invoke('deletePassword', id); passwords(m) }
  }
  $('#pklist').innerHTML = pks.length ? pks.map(p => `<div class="row" data-pk="${p.id}">${fav('https://' + p.rpId)}<div class="grow"><div class="t">${esc(p.rpId)}</div><div class="d">${esc(p.userName || 'Account')}  ·  saved ${new Date(p.createdAt).toLocaleDateString()}${p.lastUsed ? '  ·  last used ' + new Date(p.lastUsed).toLocaleDateString() : ''}</div></div><span class="pill">Passkey</span><button class="ib" data-a="delpk" title="Delete">${ICONS.close}</button></div>`).join('') : '<div class="empty">No passkeys yet. Sites like Google, GitHub, Amazon and PayPal can save one for you.</div>'
  $('#pklist').onclick = async e => { const b = e.target.closest('[data-a="delpk"]'); if (!b) return; if (!confirmDelete) { confirmDelete = true; b.title = 'Click again to delete'; b.style.color = '#e5484d'; setTimeout(() => { confirmDelete = false }, 3000); return } await L.invoke('deletePasskey', b.closest('[data-pk]').dataset.pk); passwords(m) }
  $('#add').onclick = () => { $('#addcard').classList.toggle('hidden'); if (!$('#addcard').classList.contains('hidden')) $('#a-site').focus() }
  const meter = () => { const v = $('#a-pass').value, sc = pwScore(v), mt = $('#pwm'); mt.style.setProperty('--s', v ? (sc + 1) / 5 : 0); mt.dataset.s = sc; mt.querySelector('b').textContent = v ? ['Very weak', 'Weak', 'Okay', 'Strong', 'Very strong'][sc] : 'Type or generate a password' }
  $('#a-pass').oninput = meter
  $('#a-gen').onclick = async () => { $('#a-pass').value = await L.invoke('genPassword'); meter() }
  $('#a-save').onclick = async () => { if (await L.invoke('addPassword', $('#a-site').value, $('#a-user').value, $('#a-pass').value)) passwords(m) }
  $('#imp').onclick = async () => { const r = await L.invoke('importPasswords'); if (r && r.ok) { passwords(m) } else if (r && r.error) alertBox(r.error) }
  $('#exp').onclick = async () => { await L.invoke('exportPasswords') }
}
function alertBox(msg) { const n = document.createElement('p'); n.className = 'note errnote'; n.setAttribute('role', 'alert'); n.textContent = msg; const m = $('#main'), h = m.querySelector(':scope > .hero'); if (h) h.after(n); else m.prepend(n); setTimeout(() => { n.style.transition = 'opacity .3s, transform .4s'; n.style.opacity = '0'; n.style.transform = 'translateY(-6px) scale(.98)'; setTimeout(() => n.remove(), 400) }, 4000) }

async function sync(m) {
  const st = await L.invoke('sync', 'status')
  const when = st.lastSync ? new Date(st.lastSync).toLocaleString() : 'Not yet'
  const what = `<div class="whatsyncs">${[['star', 'Bookmarks'], ['key', 'Passwords'], ['shield', 'Passkeys'], ['gear', 'Settings']].map(([i, l], n) => `<span class="hero-chip" style="--ic:${tint(n * 60)}">${ICONS[i]}${l}</span>`).join('')}</div>`
  const viz = mid => `<div class="syncviz"><span class="dev">${ICONS.globe}</span><span class="link"></span><span class="dev cloud">${mid}</span><span class="link"></span><span class="dev">${ICONS.globe}</span></div>`
  m.innerHTML = `<h2>Sync</h2><p class="lead">Your bookmarks, passwords and settings on every Mac and PC you use. Encrypted on this device with your passphrase before anything leaves it. No account needed.</p>
  ${st.enabled ? `<div class="card syncon">${viz(ICONS.reload)}<div class="synccap"><b>Sync is on</b><span>Last synced ${esc(when)}</span></div>${what}
      ${row('Sync is on', `<span class="folderchip">${ICONS.folder}<span>${esc(st.folder)}</span></span>`, '<span class="pill">On</span>')}
      ${row('Last synced', esc(when), `<button class="btn" id="now">${ICONS.reload}Sync now</button>`)}
      ${row('Turn off sync', 'Your data stays on this device.', '<button class="btn danger" id="off">Turn off</button>')}
    </div>` : `<div class="card">${viz(ICONS.lock)}<div class="synccap"><b>Your things, on every computer</b><span>Locked here with your passphrase before they leave this device.</span></div>${what}</div>
    <div class="card steps"><h3>TURN ON SYNC</h3>
      ${row('Sync folder', st.icloud ? 'iCloud Drive (recommended on Mac). Or pick a Dropbox, Google Drive or OneDrive folder.' : 'Pick a folder that syncs between your computers, like Dropbox, Google Drive, OneDrive or iCloud Drive.', `<span class="folderchip">${ICONS.folder}<span class="mono" id="folder">${esc(st.folder || 'None')}</span></span><button class="btn" id="pick">Choose</button>`)}
      <div class="row"><div class="grow"><div class="t">Sync passphrase</div><div class="d">Use the same passphrase on each computer. Lumen cannot recover it for you.</div></div><input type="password" id="pp" placeholder="At least 8 characters" style="width:220px" aria-label="Sync passphrase"></div>
      <div class="row"><div class="grow"><div class="t">Turn it on</div><div class="d errtext" id="msg"></div></div><button class="btn primary" id="on">Turn on sync</button></div>
    </div>`}
  <div class="glance e2e">${[['lock', 'Encrypted here', 'Locked with your passphrase first'], ['folder', 'Your own folder', 'No Lumen account, ever'], ['key', 'Only you hold the key', 'Lumen cannot read it']].map(([i, t, d], n) => `<div class="gl" style="--ic:${tint(120 + n * 60)}"><span class="gl-ic">${ICONS[i]}</span><div><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>`
  let folder = st.folder
  const p = $('#pick'); if (p) p.onclick = async () => { const f = await L.invoke('sync', 'pickFolder'); if (f) { folder = f; $('#folder').textContent = f } }
  const on = $('#on'); if (on) on.onclick = async () => {
    if (!folder) { $('#msg').textContent = 'Choose a sync folder first.'; return }
    on.disabled = true; on.textContent = 'Turning on...'
    const r = await L.invoke('sync', 'enable', $('#pp').value, folder)
    if (r && r.ok) sync(m); else { $('#msg').textContent = (r && r.error) || 'Could not turn on sync'; on.disabled = false; on.textContent = 'Turn on sync'; await L.invoke('sync', 'disable') }
  }
  const now = $('#now'); if (now) now.onclick = async () => { now.lastChild.textContent = 'Syncing...'; now.classList.add('busy'); const r = await L.invoke('sync', 'now'); if (r && !r.ok) alertBox(r.error); sync(m) }
  const off = $('#off'); if (off) off.onclick = async () => { if (await novaConfirm({ title: 'Turn off sync?', text: 'Your data stays on this device. Other computers stop getting changes from this one.', ok: 'Turn off', danger: true, icon: ICONS.reload })) { await L.invoke('sync', 'disable'); sync(m) } }
}

const BR_COLOR = { chrome: '#4285f4', brave: '#fb542b', edge: '#0f7bd8', arc: '#ff5f7e', vivaldi: '#ef3939', opera: '#ff1b2d', chromium: '#4a7fd6' }
async function importPage(m) {
  const list = await L.invoke('importables')
  const col = b => BR_COLOR[String(b.id).toLowerCase()] || BR_COLOR[String(b.name).toLowerCase().split(' ')[0]] || 'var(--accent)'
  m.innerHTML = `<h2>Move from Chrome</h2><p class="lead">Bring your bookmarks and extensions over in one click. Passwords come over with a CSV export.</p>
  <div class="card">${list.length ? `<h3>FOUND ON THIS COMPUTER</h3><div class="brgrid">${list.map(b => `<div class="brcard row" style="--bc:${col(b)}"><div class="brhead"><span class="brlogo">${esc((b.name || '?')[0])}</span><div class="grow"><div class="t">${esc(b.name)}</div><div class="d">Bookmarks and extensions</div></div></div><div class="brrow"><span>Bring extensions too</span><label class="switch"><input type="checkbox" data-ext="${b.id}" checked aria-label="Bring extensions from ${esc(b.name)} too"><span></span></label></div><button class="btn primary" data-imp="${b.id}">${ICONS.arrowRight}Import from ${esc(b.name)}</button></div>`).join('')}</div>` : row('No other browsers found', 'Lumen looks for Chrome, Brave, Edge and Arc on this computer.', '')}</div>
  <div class="card steps"><h3>PASSWORDS</h3>
    ${row('Export them from Chrome', 'In Chrome: Settings, Passwords and autofill, Google Password Manager, Settings, Export passwords.', '')}
    ${row('Passwords', 'Import that CSV file here. Lumen keeps them encrypted.', '<button class="btn primary" id="pw">Import passwords CSV</button>')}
    ${row('Delete the CSV', 'It holds your passwords in plain text, so throw it away once they are in.', '')}
  </div>
  <p class="note" id="res"></p>`
  m.querySelectorAll('[data-imp]').forEach(b => b.onclick = async () => {
    b.disabled = true; b.textContent = 'Importing...'
    const r = await L.invoke('importFrom', b.dataset.imp, m.querySelector(`[data-ext="${b.dataset.imp}"]`).checked)
    b.outerHTML = `<span class="brdone">${ICONS.check}Imported ${r.bookmarks} bookmarks${r.extensions ? ` and ${r.extensions} extensions` : ''}</span>`
    $('#res').textContent = `Imported ${r.bookmarks} bookmarks${r.extensions ? ` and ${r.extensions} extensions` : ''}.`
  })
  $('#pw').onclick = async () => { const r = await L.invoke('importPasswords'); if (r && r.ok) $('#res').textContent = `Imported ${r.count} passwords.`; else if (r && r.error) $('#res').textContent = r.error }
}

async function extensionsPage(m) {
  const list = await L.invoke('extensions')
  m.innerHTML = `<h2>Extensions</h2><p class="lead">Lumen runs Chrome extensions. Get them from the Chrome Web Store, same as in Chrome.</p>
  ${glance([[String(list.length), list.length === 1 ? 'Extension installed' : 'Extensions installed', 'puzzle', 0], ['Web Store', 'Where they come from', 'globe', 80], ['Same as Chrome', 'They install and update', 'check', 160, 'good']])}
  <div class="toolbar"><a class="btn primary" href="https://chromewebstore.google.com/" id="store">${ICONS.puzzle}Open Chrome Web Store</a><button class="btn" id="unpacked">${ICONS.folder}Load unpacked</button></div>
  ${list.length ? `<div class="extgrid">${list.map(x => `<div class="card extcard"><div class="eh">${x.icon ? `<img class="extico" src="${x.icon}" alt="">` : `<span class="extico">${ICONS.puzzle}</span>`}<div class="grow" style="min-width:0"><div class="t">${esc(x.name)}</div><span class="extver">${esc(x.version)}</span></div></div><div class="d">${esc(x.description).slice(0, 200)}</div><div class="ef"><span class="pill">Turned on</span><button class="btn sm danger" data-rm="${x.id}">Remove</button></div></div>`).join('')}</div>` : '<div class="card"><div class="empty">No extensions yet. Add one from the Chrome Web Store.</div></div>'}
  <p class="note">Some extensions that depend on features only Google Chrome has may not work fully.</p>`
  $('#store').onclick = e => { e.preventDefault(); L.invoke('open', 'https://chromewebstore.google.com/') }
  $('#unpacked').onclick = async () => { if (await L.invoke('loadUnpacked')) extensionsPage(m) }
  m.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { b.disabled = true; await L.invoke('removeExtension', b.dataset.rm); extensionsPage(m) })
}

function dayLabel(t) {
  const d = new Date(t), today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today - new Date(d).setHours(0, 0, 0, 0)) / 864e5)
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}
// the library tabs over History, Highlights, Archived tabs and Read later
const LIB_TABS = [['history', 'History', 'clock'], ['highlights', 'Highlights', 'sparkle'], ['archive', 'Archived tabs', 'layers'], ['readlater', 'Read later', 'book']]
const libTabs = on => `<div class="seg big" id="hseg">${LIB_TABS.map(([k, l, i]) => `<button ${k === on ? 'class="on" aria-current="page"' : `data-go="${k}"`}>${ICONS[i]}${l}</button>`).join('')}</div>`
function bindLibTabs(m) {
  $('#hseg').onclick = e => {
    const b = e.target.closest('[data-go]'); if (!b) return
    const g = b.dataset.go
    if (g === 'readlater') { location.href = 'lumen://readlater'; return }
    if (page !== 'history') { location.href = 'lumen://history' + (g === 'history' ? '' : '#' + g); return }
    if (g === 'history') history.replaceState(null, '', location.pathname); else location.hash = g
    historyPage(m)
  }
}
const siteHue = u => `hsl(${hue(hostOf(u) || '?')} 72% 56%)`
const shortAgo = t => { const mm = Math.round((Date.now() - t) / 60000); return mm < 1 ? 'just now' : mm < 60 ? mm + ' min ago' : mm < 1440 ? Math.round(mm / 60) + ' hr ago' : Math.round(mm / 1440) + ' d ago' }
// the last 7 days as little glass bars, today on the right
function weekBars(all) {
  const day0 = new Date().setHours(0, 0, 0, 0), n = [0, 0, 0, 0, 0, 0, 0]
  for (const h of all) { const d = Math.floor((day0 - new Date(h.t).setHours(0, 0, 0, 0)) / 864e5); if (d >= 0 && d < 7) n[6 - d]++ }
  const mx = Math.max(1, ...n)
  return `<span class="wk" aria-hidden="true">${n.map((v, i) => `<i style="--v:${(v / mx).toFixed(3)};--d:${i}" class="${i === 6 ? 'now' : ''}"><em>${new Date(day0 - (6 - i) * 864e5).toLocaleDateString([], { weekday: 'narrow' })}</em></i>`).join('')}</span>`
}
function topHosts(list, n) { const c = new Map(); for (const h of list) { const k = hostOf(h.url); if (k) c.set(k, (c.get(k) || 0) + (h.visits || 1)) } return [...c].sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]) }
async function historyPage(m) {
  if (location.hash === '#archive') return archivePage(m)
  if (location.hash === '#highlights') return highlightsPage(m)
  let all = await L.invoke('history', '')
  const day0 = new Date().setHours(0, 0, 0, 0), today = all.filter(h => h.t >= day0).length, week = all.filter(h => h.t >= day0 - 6 * 864e5).length
  const top = topHosts(all.filter(h => h.t >= day0 - 6 * 864e5), 5)
  m.innerHTML = `<h2>History</h2><p class="lead">Everything you have visited, searchable. It stays on this device.</p>${libTabs('history')}
    ${glance([[String(today), today === 1 ? 'Page today' : 'Pages today', 'clock', 0], [String(week), week === 1 ? 'Page this week' : 'Pages this week', 'layers', 60, 'wkgl', weekBars(all)], [top.length ? esc(top[0].replace(/^www\./, '')) : 'Nothing yet', 'Where you spend time', 'star', 120, '', top.length ? `<span class="favs">${top.map(h => fav('https://' + h)).join('')}</span>` : '']])}
    <div class="toolbar"><input type="search" id="q" placeholder="Search history"><button class="btn" id="clr">${ICONS.trash}Clear browsing data</button></div><div id="out"></div>`
  bindLibTabs(m)
  const draw = async q => {
    const list = q ? await L.invoke('history', q) : all
    if (!list.length) { $('#out').innerHTML = `<div class="empty">${q ? 'No matches' : 'Nothing here yet'}</div>`; return }
    let html = '', cur = null, n = 0, run = null
    const days = new Map(); for (const h of list) { const lab = dayLabel(h.t); days.set(lab, (days.get(lab) || 0) + 1) }
    for (const h of list) {
      const lab = dayLabel(h.t)
      if (lab !== cur) { if (cur) html += '</div>'; html += `<div class="daylabel">${esc(lab)} <b>${days.get(lab)}</b></div><div class="card list tl">`; cur = lab }
      // three or more pages in a row from one site fold into one line you can open up
      const host = hostOf(h.url), prev = list[n - 1], same = !!prev && hostOf(prev.url) === host && dayLabel(prev.t) === lab
      if (!same) { let k = n + 1; while (k < list.length && hostOf(list[k].url) === host && dayLabel(list[k].t) === lab) k++; run = k - n >= 3 ? { id: 'g' + n, start: n, more: k - n - 1 } : null }
      const fold = !!run && same
      if (fold && n === run.start + 1) html += `<button class="hmore" data-g="${run.id}">${fav(h.url)}<span>${run.more} more from ${esc(host.replace(/^www\./, ''))}</span>${ICONS.arrowRight}</button>`
      html += `<div class="row ${fold ? 'hfold' : ''}" ${fold ? `data-g="${run.id}"` : ''} data-url="${esc(h.url)}"><span class="htime">${new Date(h.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>${fav(h.url)}<div class="grow"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(h.title || h.url)}</div><div class="d">${esc(hostOf(h.url))}</div></div>${h.visits > 1 ? `<span class="hvisits">${h.visits} visits</span>` : ''}<button class="ib hov" data-forget title="Forget everything from ${esc(hostOf(h.url))}">${ICONS.trash || ICONS.close}</button><button class="ib" data-del title="Remove">${ICONS.close}</button></div>`
      n++
    }
    $('#out').innerHTML = html + '</div>'
  }
  let t; $('#q').oninput = e => { clearTimeout(t); t = setTimeout(() => draw(e.target.value), 120) }
  $('#clr').onclick = () => { location.href = 'lumen://settings/privacy' }
  $('#out').onclick = async e => {
    const g = e.target.closest('.hmore'); if (g) { g.remove(); $$(`.hfold[data-g="${g.dataset.g}"]`).forEach((x, i) => { x.classList.remove('hfold'); x.style.animationDelay = i * 30 + 'ms'; x.classList.add('unfold') }); return }
    const r = e.target.closest('[data-url]'); if (!r) return
    if (e.target.closest('[data-del]')) { await L.invoke('deleteHistory', r.dataset.url); r.remove(); return }
    if (e.target.closest('[data-forget]')) {
      const host = hostOf(r.dataset.url)
      if (!await novaConfirm({ title: `Forget ${host}?`, text: `Remove every page from ${host} from your history?`, ok: 'Remove', danger: true, icon: ICONS.trash || ICONS.close })) return
      const n = await L.invoke('deleteHistoryHost', host); all = await L.invoke('history', ''); draw($('#q').value); flash(`Forgot ${n} page${n === 1 ? '' : 's'} from ${host}`); return
    }
    if (e.metaKey || e.ctrlKey) L.invoke('open', r.dataset.url, true); else L.invoke('navigate', r.dataset.url)
  }
  draw('')
}

// ======================================================================= parcels
const PSTAT = { placed: ['Order placed', 'st-placed'], transit: ['On the way', 'st-transit'], out: ['Out for delivery', 'st-out'], delivered: ['Delivered', 'st-done'] }
const PSTEP = { placed: 0, transit: 1, out: 2, delivered: 3 }
const pAgo = t => { if (!t) return 'not checked yet'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : Math.round(m / 1440) + ' d ago' }
function parcelsRow(list) {
  const auto = S.parcelsAuto === true
  return `<div class="recent parcels rise" style="animation-delay:.32s"><div class="rc-h">Parcels</div><div class="pc-list" id="pc">
    ${list.map(p => `<a class="pcard ${PSTAT[p.status] ? PSTAT[p.status][1] : ''}" href="${esc(p.open)}" data-pid="${esc(p.id)}">
      <span class="pc-ico">${ICONS.box}</span><span class="pc-b"><b>${esc(p.name || p.carrierName || 'Parcel')}</b><i>${esc(ARRIVE(p) || p.statusText || (PSTAT[p.status] || PSTAT.placed)[0])}${p.carrierName ? '  ·  ' + esc(p.carrierName) : p.shop ? '  ·  ' + esc(p.shop) : ''}</i>
      <span class="pc-steps">${[0, 1, 2, 3].map(i => `<s class="${i <= (PSTEP[p.status] || 0) ? 'on' : ''}"></s>`).join('')}</span></span></a>`).join('')}
    <a class="pcard add" href="#" data-pcadd><span class="pc-ico">${ICONS.plus}</span><span class="pc-b"><b>Track a parcel</b><i>${auto ? 'Orders you place show up here' : 'Paste a tracking number'}</i></span></a>
    ${!auto && S.parcelsAuto !== false && !list.length ? `<a class="pcard auto" href="#" data-pcauto><span class="pc-ico">${ICONS.bolt}</span><span class="pc-b"><b>Save my orders</b><i>Lumen remembers orders you place</i></span></a>` : ''}
  </div></div>`
}
const ARRIVE = p => { if (p.status === 'delivered') return ''; if (p.expected) { const d = new Date(p.expected + 'T00:00'); const days = Math.round((d - new Date(new Date().toDateString())) / 864e5); return days === 0 ? 'Arrives today' : days === 1 ? 'Arrives tomorrow' : days > 1 && days < 7 ? 'Arrives ' + d.toLocaleDateString([], { weekday: 'long' }) : days < 0 ? 'Was due ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Arrives ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' }) } return p.eta ? 'Arrives ' + p.eta : '' }
// add a parcel, or edit one (pass it in)
async function addParcelDialog(done, edit) {
  const carriers = await L.invoke('parcelCarriers')
  const clip = edit ? null : await L.invoke('parcelClipboard').catch(() => null)
  const regions = [...new Set(carriers.map(c => c.region))]
  const opts = q => regions.map(r => { const cs = carriers.filter(c => c.region === r && (!q || c.name.toLowerCase().includes(q))); return cs.length ? `<optgroup label="${esc(r)}">${cs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</optgroup>` : '' }).join('')
  const d = document.createElement('div'); d.className = 'dialog-wrap'
  d.innerHTML = `<form class="dialog pdialog"><div class="pd-ico">${ICONS.box}</div><h3>${edit ? 'Edit parcel' : 'Track a parcel'}</h3><p class="sub">${edit ? 'Change the name, carrier or when you expect it.' : 'It stays here until it is delivered. Lumen checks on it for you.'}</p>
    ${clip ? `<button type="button" class="pd-clip" id="pclip">${ICONS.link || ''}<span>Use <b>${esc(clip.number)}</b> from your clipboard</span></button>` : ''}
    <label><span>Tracking number${edit && !edit.number ? ' <span class="opt">optional for saved orders</span>' : ''}</span><input id="pn" ${edit && !edit.number ? '' : 'required'} placeholder="1Z999AA10123456784" spellcheck="false" autocomplete="off" value="${esc(edit ? edit.number || '' : '')}"></label>
    <div class="pd-row"><label>Name<input id="pname" placeholder="New headphones" autocomplete="off" value="${esc(edit ? edit.name || '' : '')}"></label>
    <label>Expected<input id="pexp" type="date" value="${esc(edit ? edit.expected || '' : '')}"></label></div>
    <label><span>Carrier <span class="opt">${carriers.length - 1} to choose from</span></span><div class="pd-car"><input id="pcq" placeholder="Search carriers" autocomplete="off"><select id="pcar" size="1"><option value="">Detect for me</option>${opts('')}<option value="other">Any carrier (17track)</option></select></div></label>
    <label><span>Tracking or order link <span class="opt">optional, always opens first</span></span><input id="purl" placeholder="https://..." autocomplete="off" value="${esc(edit ? edit.url || '' : '')}"></label>
    <div class="pd-detect" id="pdet"></div>
    <div class="actions"><button type="button" class="btn" id="pcancel">Cancel</button><button class="btn primary">${edit ? 'Save' : 'Start tracking'}</button></div></form>`
  document.body.appendChild(d)
  const f = d.querySelector('form'), pn = d.querySelector('#pn'), car = d.querySelector('#pcar')
  if (edit && edit.carrier) car.value = edit.carrier
  pn.focus()
  const detect = async () => { const v = pn.value.trim(); if (v.length < 8) { $('#pdet').textContent = ''; return } const c = await L.invoke('parcelDetect', v); const n = (carriers.find(x => x.id === c) || {}).name; $('#pdet').textContent = car.value ? '' : c === 'other' ? 'Carrier not recognized yet. Pick it below, or paste the tracking link.' : 'Looks like ' + n + '. Opens on ' + n + '.' }
  pn.oninput = detect; car.onchange = detect
  d.querySelector('#pcq').oninput = e => { const keep = car.value; const q = e.target.value.trim().toLowerCase(); car.innerHTML = `<option value="">Detect for me</option>${opts(q)}<option value="other">Any carrier (17track)</option>`; if (keep && [...car.options].some(o => o.value === keep)) car.value = keep; else if (q && car.options.length > 1) car.selectedIndex = 1; detect() }
  if (clip) d.querySelector('#pclip').onclick = () => { pn.value = clip.number; d.querySelector('#pclip').remove(); detect(); d.querySelector('#pname').focus() }
  d.querySelector('#pcancel').onclick = () => d.remove()
  d.onclick = e => { if (e.target === d) d.remove() }
  d.onkeydown = e => { if (e.key === 'Escape') d.remove() }
  f.onsubmit = async e => {
    e.preventDefault()
    const o = { number: pn.value, name: $('#pname').value.trim(), carrier: car.value, url: $('#purl').value.trim(), expected: $('#pexp').value }
    const p = edit ? await L.invoke('parcelEdit', edit.id, o) : await L.invoke('parcelAdd', o)
    if (!edit && p && o.expected) await L.invoke('parcelEdit', p.id, { ...o, number: undefined, url: undefined })
    d.remove(); if (p) { flash(edit ? 'Saved' : 'Tracking ' + (p.name || p.number)); done && done(p) }
  }
}
async function parcelsPage(m) {
  document.title = 'Parcels'
  let list = await L.invoke('parcels'), q = ''
  const RANK = { out: 0, transit: 1, placed: 2, delivered: 3 }
  const draw = () => {
    const f = list.filter(p => !q || [p.name, p.number, p.orderNo, p.shop, p.carrierName, p.statusText].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (RANK[a.status] - RANK[b.status]) || (b.added - a.added))
    const act = f.filter(p => p.status !== 'delivered'), done = f.filter(p => p.status === 'delivered')
    const row = p => { const arr = ARRIVE(p); return `<div class="row prow ${PSTAT[p.status] ? PSTAT[p.status][1] : ''}" data-id="${esc(p.id)}"><span class="pc-ico">${ICONS.box}</span>
      <div class="grow"><div class="t"><span class="pname" data-act="edit" title="Edit">${esc(p.name || p.carrierName || 'Parcel')}</span>${arr ? `<span class="eta">${esc(arr)}</span>` : ''}</div>
      <div class="d">${esc(p.statusText || '')}${p.number ? `  ·  ${esc(p.carrierName)} <span class="pnum" data-act="copy" title="Copy">${esc(p.number)}</span>` : ''}${p.orderNo ? '  ·  Order ' + esc(p.orderNo) : ''}${p.shop ? '  ·  ' + esc(p.shop) : ''}${p.checked ? '  ·  checked ' + pAgo(p.checked) : ''}</div>
      <div class="psteps">${['Placed', 'On the way', 'Out for delivery', 'Delivered'].map((l, i) => `<div class="ps ${i <= (PSTEP[p.status] || 0) ? 'on' : ''}"><s></s><em>${l}</em></div>`).join('')}</div></div>
      <button class="btn sm primary" data-act="open">${p.url ? 'Open order' : 'Track'}</button>
      <div class="pmore"><button class="ib" data-act="edit" title="Edit">${ICONS.tune || ICONS.gear}</button>${p.number ? `<button class="ib" data-act="copy" title="Copy tracking number">${ICONS.link || ''}</button>` : ''}${p.url && p.track ? `<button class="ib" data-act="track" title="Carrier page">${ICONS.globe}</button>` : ''}<button class="ib" data-act="${p.status === 'delivered' ? 'undeliver' : 'deliver'}" title="${p.status === 'delivered' ? 'Not delivered yet' : 'Mark delivered'}">${p.status === 'delivered' ? ICONS.reload : ICONS.check || ICONS.starFill}</button><button class="ib" data-act="del" title="Remove">${ICONS.close}</button></div></div>` }
    $('#plist').innerHTML = list.length ? (act.length ? `<div class="daylabel">On the way  <b>${act.length}</b></div><div class="card list">${act.map(row).join('')}</div>` : (q ? '' : `<div class="empty">Nothing on the way right now.</div>`)) + (done.length ? `<div class="daylabel">Delivered</div><div class="card list">${done.map(row).join('')}</div>` : '') + (q && !f.length ? '<div class="empty">No parcels match that.</div>' : '')
      : `<div class="empty big"><div class="pc-hero">${ICONS.box}</div>Nothing on the way. ${S.parcelsAuto === true ? 'Orders you place will show up here.' : 'Add a tracking number, or turn on saving orders automatically.'}<div class="ptips"><b>Tips</b><span>Right-click a tracking number on any page and pick Track Parcel.</span><span>Paste a tracking number in the address bar or command bar.</span><span>Lumen knows ${'over 160'} carriers and finds most of them by the number alone.</span></div></div>`
  }
  m.innerHTML = `<h2>Parcels</h2><p class="lead">Everything on its way to you. Parcels stay here until they are delivered.</p>
    <div class="toolbar"><button class="btn primary" id="padd">${ICONS.plus} Track a parcel</button><input type="search" id="pq" placeholder="Search parcels"><button class="btn" id="pref">Check all now</button>
    <label class="pauto">Save orders <label class="switch"><input type="checkbox" id="pautosw" ${S.parcelsAuto === true ? 'checked' : ''}><span></span></label></label></div><div id="plist"></div>`
  $('#padd').onclick = () => addParcelDialog(async () => { list = await L.invoke('parcels'); draw() })
  $('#pq').oninput = e => { q = e.target.value.trim().toLowerCase(); draw() }
  $('#pref').onclick = async () => { $('#pref').disabled = true; $('#pref').textContent = 'Checking...'; list = await L.invoke('parcelRefresh'); draw(); $('#pref').disabled = false; $('#pref').textContent = 'Check all now'; flash('All parcels checked') }
  $('#pautosw').onchange = e => { S.parcelsAuto = e.target.checked; L.invoke('setSetting', 'parcelsAuto', e.target.checked) }
  $('#plist').onclick = async e => {
    const b = e.target.closest('[data-act]'), r = e.target.closest('[data-id]'); if (!b || !r) return
    const id = r.dataset.id, a = b.dataset.act, p = list.find(x => x.id === id)
    if (a === 'open') return L.invoke('parcelOpen', id, e.metaKey || e.ctrlKey)
    if (a === 'track') return L.invoke('navigate', p.track)
    if (a === 'copy') { await navigator.clipboard.writeText(p.number); flash('Tracking number copied'); return }
    if (a === 'edit') return addParcelDialog(async () => { list = await L.invoke('parcels'); draw() }, p)
    if (a === 'del') { await L.invoke('parcelRemove', id); flash('Parcel removed') }
    if (a === 'deliver' || a === 'undeliver') { await L.invoke('parcelDelivered', id, a === 'deliver'); if (a === 'deliver') flash('Marked delivered') }
    list = await L.invoke('parcels'); draw()
  }
  draw()
}

// ======================================================================= Surge and Koi
const APP_INFO = {
  surge: { tag: 'Your Mac, with superpowers', text: 'Charge glow, keyboard and mouse sounds, click ripples, cursor spotlight, night tint, a new Dock, caffeine, clipboard history, a focus timer, quick notes and more. Each one is a switch in Surge settings.',
    keys: [['Ctrl Opt G', 'Preview the glow'], ['Ctrl Opt N', 'Quick notes'], ['Ctrl Opt S', 'Cursor spotlight'], ['Ctrl Opt K', 'Keyboard sounds'], ['Ctrl Opt V', 'Clipboard history'], ['Ctrl Opt D', 'Surge Dock']],
    actions: [['settings', 'Open Surge'], ['notes', 'Quick notes']] },
  koi: { tag: 'Every app, one key away', text: 'Press Option Space and your apps bloom around the cursor in a springy fan. Hover, type a letter, scroll for more, and press Return to open.',
    keys: [['Opt Space', 'Open the fan'], ['Your own', 'Jump straight to any app']],
    actions: [['open', 'Open the fan'], ['hotkeys', 'Hotkeys'], ['tour', 'Take the tour']] },
}
async function appsPage(m) {
  const r = await L.invoke('apps')
  const draw = d => {
    m.innerHTML = `<h2>Surge and Koi</h2><p class="lead">Two tools that used to be separate apps now live inside Lumen. They work just like before, update with Lumen, and keep your old settings.</p>
    ${d.list.map(a => { const i = APP_INFO[a.id]; return `<div class="card appcard ${a.running ? 'on' : ''} ${a.supported ? '' : 'na'}" data-app="${a.id}">
      <div class="apphead"><span class="appicon">${appLogo(a.id)}</span><div class="grow"><div class="appname">${esc(a.name)} <span class="appstate">${!a.supported ? 'Mac only' : a.running ? 'Running' : a.enabled ? 'Starting after restart' : 'Off'}</span></div><div class="apptag">${esc(i.tag)}</div></div>
      ${a.supported ? `<label class="switch"><input type="checkbox" data-appsw="${a.id}" ${a.enabled ? 'checked' : ''}><span></span></label>` : ''}</div>
      <p class="apptext">${esc(i.text)}</p>
      <div class="appkeys">${i.keys.map(([k, t]) => `<span><kbd>${esc(k)}</kbd>${esc(t)}</span>`).join('')}</div>
      ${a.running ? `<div class="appacts">${i.actions.map(([k, t], n) => `<button class="btn ${n ? '' : 'primary'}" data-open="${k}">${esc(t)}</button>`).join('')}</div>` : ''}
    </div>` }).join('')}
    <div class="card fcard"><h3>HOW THEY RUN</h3><div class="ftiles">
      ${ft('toolbarApps', !!d.toolbarApps, 'Show in the toolbar', 'Surge and Koi buttons next to Reload, in your accent color.', 'sparkle', 0, `${faIc('reload')}${faIc('bolt')}${faIc('sparkle')}`)}
      ${ft('backgroundApps', !!d.backgroundApps, 'Keep Surge and Koi running when Lumen quits', `${PLATFORM === 'darwin' ? 'Cmd Q' : 'Ctrl Q'} closes your windows and Lumen keeps running quietly for Surge and Koi. Open Lumen again and every window and tab comes back. ${PLATFORM === 'darwin' ? 'Cmd Option Q' : 'Exit Lumen, Surge and Koi'} quits everything.`, 'moon', 120, `${K(MOD(), 'Q')}${ARR}${faIc('bolt')}${faIc('sparkle')}`)}
      ${ft('openAtLogin', !!d.openAtLogin, 'Start Lumen when you log in', 'Lumen opens quietly in the background so Surge and Koi are ready, without opening a window.', 'bolt', 240, `${chip('Log in')}${ARR}${chip('Ready', 'ac')}`)}
    </div>
      ${row('Keyboard and mouse access', 'Keyboard sounds, click ripples and typing stats need macOS to allow Lumen in Privacy and Security, Accessibility and Input Monitoring. Surge asks when you turn one of them on.', '')}
    </div>`
    bindSettings(m)
  }
  draw(r)
  m.onclick = async e => {
    const b = e.target.closest('[data-open]'), c = e.target.closest('[data-app]')
    if (b && c) L.invoke('appOpen', c.dataset.app, b.dataset.open)
  }
  m.onchange = async e => {
    const s = e.target.closest('[data-appsw]'); if (!s) return
    const res = await L.invoke('appSet', s.dataset.appsw, s.checked)
    if (res && res.restart) { if (await novaConfirm({ title: 'Restart Lumen?', text: 'Restart Lumen to turn it back on now?', ok: 'Restart', cancel: 'Later', icon: ICONS.reload })) L.invoke('restart') }
    else flash(s.checked ? 'Turned on' : 'Turned off')
    draw(await L.invoke('apps'))
  }
}

const HL_COLORS = [['yellow', 'Yellow', '#ffc800'], ['green', 'Green', '#34c759'], ['blue', 'Blue', '#0a84ff'], ['pink', 'Pink', '#ff2d87']]
async function highlightsPage(m) {
  let list = await L.invoke('highlights'), color = ''
  const pagesN = new Set(list.map(h => h.url)).size
  m.innerHTML = `<h2>Highlights</h2><p class="lead">Select text on any page, right-click and pick Highlight. It stays there every time you come back.</p>
    ${libTabs('highlights')}
    ${glance([[String(list.length), list.length === 1 ? 'Highlight' : 'Highlights', 'sparkle', 0], [String(pagesN), pagesN === 1 ? 'Page' : 'Pages', 'file', 70]])}
    <div class="toolbar"><input type="search" id="q" placeholder="Search highlights"></div><div class="fchips" id="hlf"></div><div id="out"></div>`
  bindLibTabs(m)
  const chips = () => { $('#hlf').innerHTML = list.length ? [['', 'All', ''], ...HL_COLORS].map(([k, l, c]) => { const n = k ? list.filter(h => h.color === k).length : list.length; return n || !k ? `<button class="fchip ${color === k ? 'on' : ''}" data-hc="${k}">${c ? `<i style="background:${c};box-shadow:0 0 8px ${c}"></i>` : ''}${l} <b>${n}</b></button>` : '' }).join('') : '' }
  const draw = q => {
    const f = list.filter(h => (!q || (h.text + ' ' + h.title + ' ' + h.url).toLowerCase().includes(q.toLowerCase())) && (!color || h.color === color))
    if (!f.length) { $('#out').innerHTML = `<div class="empty">${q || color ? 'No matches' : 'No highlights yet.'}</div>`; return }
    const pages = new Map(); for (const h of f) { if (!pages.has(h.url)) pages.set(h.url, []); pages.get(h.url).push(h) }
    $('#out').innerHTML = [...pages].map(([url, hs]) => `<div class="card hlcard"><a class="hlhead" data-go="${esc(url)}">${fav(url)}<div class="grow"><div class="t">${esc(hs[0].title || hostOf(url))}</div><div class="d">${esc(hostOf(url))}  ·  ${hs.length} highlight${hs.length > 1 ? 's' : ''}</div></div></a>${hs.map(h => `<div class="hl" data-id="${esc(h.id)}" data-url="${esc(url)}" data-text="${esc(h.text.slice(0, 120))}"><span class="hlbar hl-${esc(h.color)}"></span><q>${esc(h.text.length > 420 ? h.text.slice(0, 420) + '...' : h.text)}</q><button class="ib hov" data-copy title="Copy">${ICONS.link || ICONS.close}</button><button class="ib hov" data-del title="Remove">${ICONS.close}</button></div>`).join('')}</div>`).join('')
  }
  chips()
  $('#hlf').onclick = e => { const b = e.target.closest('[data-hc]'); if (!b) return; color = b.dataset.hc; chips(); draw($('#q').value) }
  $('#q').oninput = e => draw(e.target.value)
  $('#out').onclick = async e => {
    const head = e.target.closest('[data-go]'); if (head) { L.invoke('navigate', head.dataset.go); return }
    const r = e.target.closest('.hl'); if (!r) return
    if (e.target.closest('[data-del]')) { await L.invoke('highlightRemove', r.dataset.id); list = list.filter(h => h.id !== r.dataset.id); chips(); draw($('#q').value); flash('Highlight removed'); return }
    if (e.target.closest('[data-copy]')) { await navigator.clipboard.writeText(list.find(h => h.id === r.dataset.id).text); flash('Copied'); return }
    // jump straight to the passage on the page
    const words = r.dataset.text.trim().split(/\s+/), frag = (words.length > 8 ? [words.slice(0, 4).join(' '), words.slice(-4).join(' ')] : [words.join(' ')]).map(x => encodeURIComponent(x).replace(/-/g, '%2D')).join(',')
    L.invoke('navigate', r.dataset.url + '#:~:text=' + frag)
  }
  draw('')
}

// a glass tile for one saved page: a header in the site's own color with its icon, then the title
const pageTile = (x, cls, foot, extra = '') => `<div class="card bmt ${cls}" data-url="${esc(x.url)}"${x.id ? ` data-id="${esc(x.id)}"` : ''} style="--th:${siteHue(x.url)}" tabindex="0"><div class="bm-head" data-l="${esc((hostOf(x.url) || '?').replace(/^www\./, '')[0].toUpperCase())}">${extra}${fav(x.url)}</div><div class="t">${esc(x.title || x.url)}</div><div class="d">${esc(hostOf(x.url).replace(/^www\./, ''))}</div><div class="bm-foot">${foot}</div><button class="ib bm-x" data-del title="Remove">${ICONS.close}</button></div>`
async function archivePage(m) {
  const list = await L.invoke('archive')
  const on = !!S.archiveTabsAfterH
  m.innerHTML = `<h2>Archived tabs</h2><p class="lead">Tabs that tidied themselves away after you stopped using them. Open one and it comes right back.</p>
    ${libTabs('archive')}
    ${on ? '' : `<div class="card vcard" style="--ic:${tint(250)}"><div class="vart" aria-hidden="true"><span class="fa-tabs"><i class="on"></i><i></i><i class="zz"></i><i class="zz"></i></span><span class="lbl">Tidy tabs is off</span></div><div class="vrows"><h3>TIDY TABS</h3>${row('Archive tabs you have not used', 'Turn it on and tabs you have not opened in a while close themselves and wait here.', '<a class="btn primary" href="lumen://settings/general#Archive%20tabs%20you%20have%20not%20used">Turn on tab archiving</a>')}</div></div>`}
    <div class="toolbar"><input type="search" id="q" placeholder="Search archived tabs">${list.length ? `<button class="btn" id="clrA">${ICONS.trash}Clear archive</button>` : ''}</div><div id="out"></div>`
  bindLibTabs(m)
  const draw = q => {
    const f = list.filter(x => !q || (x.title + ' ' + x.url).toLowerCase().includes(q.toLowerCase()))
    $('#out').innerHTML = f.length ? `<div class="bmgrid">${f.map(x => pageTile(x, '', `<span class="grow">Archived ${shortAgo(x.at)}</span><button class="btn sm primary" data-open>Open</button>`)).join('')}</div>`
      : `<div class="empty">${q ? 'No matches' : 'No archived tabs yet. Idle tabs land here when tab archiving is on.'}</div>`
  }
  $('#q').oninput = e => draw(e.target.value)
  if ($('#clrA')) $('#clrA').onclick = async () => { if (!await novaConfirm({ title: 'Clear the archive?', text: `Remove all ${list.length} archived tabs?`, ok: 'Clear', danger: true, icon: ICONS.trash })) return; await L.invoke('archiveRemove'); archivePage(m) }
  const act = async (e, r) => {
    if (e.target.closest('[data-del]')) { await L.invoke('archiveRemove', r.dataset.url); list.splice(list.findIndex(x => x.url === r.dataset.url), 1); r.remove(); return }
    await L.invoke('archiveRemove', r.dataset.url)
    if (e.metaKey || e.ctrlKey) { L.invoke('open', r.dataset.url, true); r.remove() } else L.invoke('navigate', r.dataset.url)
  }
  $('#out').onclick = e => { const r = e.target.closest('[data-url]'); if (r) act(e, r) }
  $('#out').onkeydown = e => { const r = e.target.closest('.bmt'); if (r && e.target === r && e.key === 'Enter') act(e, r) }
  draw('')
}

// ======================================================================= read later
async function readLaterPage(m) {
  let list = (await L.invoke('readLater', 300)) || [], q = '', sort = 'new'
  m.innerHTML = `<h2>Read later</h2><p class="lead">Pages you saved with ${MOD()} Shift D or from the menu. Open one and it comes off the list, so this stays short.</p>
    ${libTabs('readlater')}<div id="rlglance"></div>
    <div class="toolbar"><input type="search" id="q" placeholder="Search saved pages"><div class="seg" id="rlsort"><button data-v="new" class="on">Newest</button><button data-v="old">Oldest</button></div><button class="btn" id="rlall">${ICONS.tabs}Open all</button></div><div id="out"></div>`
  bindLibTabs(m)
  const draw = () => {
    const sites = new Set(list.map(x => hostOf(x.url))).size, oldest = list.length ? Math.min(...list.map(x => x.t)) : 0
    $('#rlglance').innerHTML = glance([[String(list.length), list.length === 1 ? 'Page saved' : 'Pages saved', 'book', 70], [String(sites), sites === 1 ? 'Site' : 'Sites', 'globe', 130], [oldest ? shortAgo(oldest) : 'Nothing yet', 'Oldest one saved', 'clock', 200, oldest && Date.now() - oldest > 7 * 864e5 ? 'warn' : '']])
    $('#rlall').disabled = !list.length
    const f = list.filter(x => !q || (x.title + ' ' + x.url).toLowerCase().includes(q)).sort((a, b) => sort === 'new' ? b.t - a.t : a.t - b.t)
    $('#out').innerHTML = f.length ? `<div class="rlgrid">${f.map(x => pageTile(x, 'rlc' + (Date.now() - x.t > 7 * 864e5 ? ' old' : ''), `<span class="grow">${esc(hostOf(x.url).replace(/^www\./, ''))}</span><button class="btn sm primary" data-open>Read now</button>`, `<span class="rl-age"><i></i>Saved ${shortAgo(x.t)}</span>`).replace('<div class="d">' + esc(hostOf(x.url).replace(/^www\./, '')) + '</div>', '')).join('')}</div>`
      : `<div class="empty">${q ? 'No matches' : `Nothing saved for later. On any page press ${MOD()} Shift D, and it waits here until you are ready.`}</div>`
  }
  const done = async (r, how) => {
    const url = r.dataset.url
    await L.invoke('readLaterDone', url); list = list.filter(x => x.url !== url)
    if (how === 'remove') { r.classList.add('gone'); setTimeout(draw, 300); flash('Removed from Read later'); return }
    if (how === 'tab') { L.invoke('open', url, true); r.classList.add('gone'); setTimeout(draw, 300); return }
    L.invoke('navigate', url)
  }
  $('#out').onclick = e => { const r = e.target.closest('[data-url]'); if (!r) return; done(r, e.target.closest('[data-del]') ? 'remove' : e.metaKey || e.ctrlKey ? 'tab' : 'go') }
  $('#out').onkeydown = e => { const r = e.target.closest('.bmt'); if (r && e.target === r && e.key === 'Enter') done(r, e.metaKey || e.ctrlKey ? 'tab' : 'go'); if (r && e.target === r && (e.key === 'Delete' || e.key === 'Backspace')) done(r, 'remove') }
  $('#q').oninput = e => { q = e.target.value.trim().toLowerCase(); draw() }
  $('#rlsort').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('#rlsort').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); sort = b.dataset.v; draw() }
  $('#rlall').onclick = async () => {
    if (list.length > 6 && !await novaConfirm({ title: `Open ${list.length} pages?`, text: 'Each one opens in its own tab and comes off the list.', ok: 'Open all', icon: ICONS.tabs })) return
    for (const x of list) { L.invoke('open', x.url, true); await L.invoke('readLaterDone', x.url) }
    flash(`Opened ${list.length} page${list.length === 1 ? '' : 's'}`); list = []; draw()
  }
  draw()
}

// add or edit a bookmark in a Nova sheet: name, address and folder (an existing one, or a new one)
function bookmarkDialog(b, folders, done) {
  const d = document.createElement('div'); d.className = 'dialog-wrap'
  const fs = folders.filter(Boolean)
  d.innerHTML = `<form class="dialog pdialog bmdialog"><div class="sc-head"><span class="sc-prev" id="bm-prev">${b ? letterFav(hostOf(b.url).replace(/^www\./, '') || '?') : ICONS.star}</span><div><h3>${b ? 'Edit bookmark' : 'Add a bookmark'}</h3><p class="sub" style="margin:2px 0 0">${b ? 'Rename it, move it or point it somewhere new.' : 'It shows up here and in the bookmarks bar.'}</p></div></div>
    <label>Name<input id="bm-t" autocomplete="off" value="${esc(b ? b.title : '')}" placeholder="My favourite site"></label>
    <label>Address<input id="bm-u" required autocomplete="off" spellcheck="false" value="${esc(b ? b.url : '')}" placeholder="example.com"></label>
    <div class="pd-row"><label>Folder<select id="bm-f"><option value="">No folder</option>${fs.map(f => `<option ${b && b.folder === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}<option value="+new">New folder...</option></select></label><label class="hidden" id="bm-nfw">New folder<input id="bm-nf" autocomplete="off" placeholder="Reading"></label></div>
    <div class="actions"><button type="button" class="btn" id="bm-c">Cancel</button><button class="btn primary">${b ? 'Save' : 'Add bookmark'}</button></div></form>`
  document.body.appendChild(d)
  const close = () => d.remove(), sel = d.querySelector('#bm-f')
  sel.onchange = () => { const n = sel.value === '+new'; d.querySelector('#bm-nfw').classList.toggle('hidden', !n); if (n) d.querySelector('#bm-nf').focus() }
  d.querySelector('#bm-u').oninput = e => { const h = hostOf(/^https?:\/\//i.test(e.target.value) ? e.target.value : 'https://' + e.target.value.trim()); d.querySelector('#bm-prev').innerHTML = h && h.includes('.') ? letterFav(h.replace(/^www\./, '')) : ICONS.star }
  d.querySelector('#bm-c').onclick = close
  d.onclick = e => { if (e.target === d) close() }
  d.onkeydown = e => { if (e.key === 'Escape') close() }
  setTimeout(() => d.querySelector(b ? '#bm-t' : '#bm-u').focus(), 40)
  d.querySelector('form').onsubmit = async e => {
    e.preventDefault()
    let url = d.querySelector('#bm-u').value.trim(); if (!/^[a-z]+:\/\//i.test(url)) url = 'https://' + url
    try { new URL(url) } catch { d.querySelector('#bm-u').focus(); return }
    const title = d.querySelector('#bm-t').value.trim() || hostOf(url), folder = sel.value === '+new' ? d.querySelector('#bm-nf').value.trim() : sel.value
    if (b) await L.invoke('editBookmark', b.id, { title, url, folder })
    else { const nb = await L.invoke('addBookmark', url, title); if (nb && nb.id && folder) await L.invoke('editBookmark', nb.id, { folder }) }
    close(); flash(b ? 'Bookmark saved' : 'Bookmark added'); done()
  }
}
async function bookmarksPage(m) {
  let all = await L.invoke('bookmarks'), folder = null, q = ''
  const folders = () => [...new Set(all.map(b => b.folder || ''))].sort((a, b) => a.localeCompare(b))
  m.innerHTML = `<h2>Bookmarks</h2><p class="lead">Press ${MOD()} + D on any page to save it here. Point at one to edit it.</p>
    <div id="bmglance"></div>
    <div class="toolbar"><input type="search" id="q" placeholder="Search bookmarks"><button class="btn primary" id="bmadd">${ICONS.plus}Add bookmark</button></div><div class="fchips" id="bmf"></div><div id="out"></div>`
  const draw = () => {
    const fo = folders()
    $('#bmglance').innerHTML = glance([[String(all.length), all.length === 1 ? 'Bookmark' : 'Bookmarks', 'star', 30], [String(fo.filter(Boolean).length), fo.filter(Boolean).length === 1 ? 'Folder' : 'Folders', 'folder', 90], [String(new Set(all.map(b => hostOf(b.url))).size), 'Sites', 'globe', 150]])
    if (folder !== null && !fo.includes(folder)) folder = null
    $('#bmf').innerHTML = fo.length > 1 ? [[null, 'All'], ...fo.map(f => [f, f || 'Unfiled'])].map(([k, l]) => `<button class="fchip ${folder === k ? 'on' : ''}" data-f="${k === null ? '*' : esc(k)}">${k === null ? ICONS.star : ICONS.folder}${esc(l)} <b>${k === null ? all.length : all.filter(b => (b.folder || '') === k).length}</b></button>`).join('') : ''
    const f = all.filter(b => (!q || (b.title || '').toLowerCase().includes(q) || b.url.toLowerCase().includes(q)) && (folder === null || (b.folder || '') === folder))
    if (!f.length) { $('#out').innerHTML = `<div class="empty">${q ? 'No matches' : 'No bookmarks yet'}</div>`; return }
    const groups = {}
    for (const b of f) (groups[b.folder || ''] = groups[b.folder || ''] || []).push(b)
    $('#out').innerHTML = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).map(([fo, items]) => `${fo || Object.keys(groups).length > 1 ? `<div class="daylabel">${esc(fo || 'Unfiled')} <b>${items.length}</b></div>` : ''}<div class="bmgrid">${items.map(b => pageTile(b, '', `<span class="grow">${esc(fo || 'Bookmarks')}</span><button class="ib" data-edit title="Edit">${ICONS.tune}</button>`)).join('')}</div>`).join('')
  }
  const reload = async () => { all = await L.invoke('bookmarks'); draw() }
  draw()
  $('#bmadd').onclick = () => bookmarkDialog(null, folders(), reload)
  $('#q').oninput = e => { q = e.target.value.toLowerCase(); draw() }
  $('#bmf').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; folder = b.dataset.f === '*' ? null : b.dataset.f; draw() }
  const act = async (e, r) => {
    if (e.target.closest('[data-edit]')) return bookmarkDialog(all.find(b => b.id === r.dataset.id), folders(), reload)
    if (e.target.closest('[data-del]')) { await L.invoke('removeBookmark', r.dataset.id); all.splice(all.findIndex(b => b.id === r.dataset.id), 1); r.classList.add('rlc', 'gone'); setTimeout(draw, 300); return }
    if (e.metaKey || e.ctrlKey) L.invoke('open', r.dataset.url, true); else L.invoke('navigate', r.dataset.url)
  }
  $('#out').onclick = e => { const r = e.target.closest('[data-id]'); if (r) act(e, r) }
  $('#out').onkeydown = e => { const r = e.target.closest('.bmt'); if (r && e.target === r && e.key === 'Enter') act(e, r) }
}

function fmtBytes(n) { if (!n) return '0 B'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++ } return n.toFixed(i ? 1 : 0) + ' ' + u[i] }
const FKIND = [[/\.pdf$/i, 'PDF', '#e5484d', 'file'], [/\.(png|jpe?g|gif|webp|heic|svg|avif|bmp)$/i, 'IMG', '#12b886', 'camera'], [/\.(zip|rar|7z|gz|tgz|bz2|xz|tar)$/i, 'ZIP', '#e8a02c', 'box'], [/\.(mp4|mov|mkv|webm|avi|m4v)$/i, 'VIDEO', '#845ef7', 'play'], [/\.(mp3|wav|m4a|flac|aac|ogg)$/i, 'AUDIO', '#e5487d', 'speaker'], [/\.(docx?|pages|rtf|txt|md|odt)$/i, 'DOC', '#3b82f6', 'file'], [/\.(xlsx?|csv|numbers|ods)$/i, 'SHEET', '#16a34a', 'layers'], [/\.(pptx?|key|odp)$/i, 'SLIDES', '#f0763b', 'layers'], [/\.(dmg|pkg|exe|msi|deb|appimage|rpm)$/i, 'APP', '#64748b', 'download']]
const fkind = n => FKIND.find(k => k[0].test(n || '')) || [null, (String(n).split('.').pop() || 'FILE').slice(0, 5).toUpperCase(), '#7c86a2', 'file']
async function downloadsPage(m) {
  m.innerHTML = `<h2>Downloads</h2><p class="lead">Files you downloaded since Lumen started.</p><div id="dlglance"></div><div class="toolbar"><div style="flex:1"></div><button class="btn" id="clr">${ICONS.trash || ''}Clear list</button></div><div class="card list" id="out"></div>`
  let last = '', lastG = '', timer = 0
  const draw = async () => {
    clearTimeout(timer)
    if (!document.getElementById('out')) return
    const list = await L.invoke('downloads')
    const busy = list.filter(d => d.state === 'progressing').length, total = list.filter(d => d.state === 'completed').reduce((s, d) => s + (d.total || d.received || 0), 0)
    const g = glance([[String(list.length), list.length === 1 ? 'File' : 'Files', 'download', 0], [fmtBytes(total), 'Downloaded', 'box', 70], [String(busy), busy === 1 ? 'Downloading now' : 'Downloading now', 'reload', 150, busy ? '' : 'good']])
    if (g !== lastG) { lastG = g; $('#dlglance').innerHTML = g }
    const html = list.length ? list.map(d => {
      const pct = d.total ? Math.round(d.received / d.total * 100) : 0, k = fkind(d.name), live = d.state === 'progressing', ok = d.state === 'completed' && d.exists
      const status = live ? `${fmtBytes(d.received)} of ${d.total ? fmtBytes(d.total) : 'unknown'}${d.paused ? ', paused' : ''}` : d.state === 'completed' ? (d.exists ? fmtBytes(d.total || d.received) + '  ·  ' + esc(hostOf(d.url)) : 'Moved or deleted') : d.state === 'cancelled' ? 'Cancelled' : 'Failed'
      return `<div class="row dlrow" data-id="${d.id}"><span class="ftype ${live ? 'busy' : ok ? '' : 'bad'}" style="--fc:${k[2]}">${ICONS[k[3]] || ''}${esc(k[1])}</span><div class="grow"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.name)}</div><div class="d">${status}${live && d.total ? `  ·  <span class="dlpct">${pct}%</span>` : ''}</div>${live ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</div>
        ${ok ? '<button class="btn sm primary" data-a="open">Open</button><button class="btn sm" data-a="show">Show in folder</button>' : ''}
        ${live ? `<button class="btn sm" data-a="pause">${d.paused ? 'Resume' : 'Pause'}</button><button class="btn sm danger" data-a="cancel">Cancel</button>` : ''}
        ${d.state === 'interrupted' || d.state === 'cancelled' ? '<button class="btn sm" data-a="retry">Retry</button>' : ''}
        <button class="ib" data-a="remove" title="Remove from list">${ICONS.close}</button></div>`
    }).join('') : '<div class="empty">No downloads yet</div>'
    // only touch the page when something changed, so nothing redraws at idle
    if (html !== last) {
      const bars = list.length && last && list.every(d => document.querySelector(`.dlrow[data-id="${d.id}"]`)) && html.replace(/width:\d+%|\d+(\.\d)? [KMG]?B of|\d+%/g, '') === last.replace(/width:\d+%|\d+(\.\d)? [KMG]?B of|\d+%/g, '')
      if (bars) list.forEach(d => { const r = document.querySelector(`.dlrow[data-id="${d.id}"]`), b = r.querySelector('.bar i'), pct = d.total ? Math.round(d.received / d.total * 100) : 0; if (b) b.style.width = pct + '%'; const t = r.querySelector('.d'); if (t) t.innerHTML = `${fmtBytes(d.received)} of ${d.total ? fmtBytes(d.total) : 'unknown'}${d.paused ? ', paused' : ''}${d.total ? `  ·  <span class="dlpct">${pct}%</span>` : ''}` })
      else $('#out').innerHTML = html
      last = html
    }
    timer = setTimeout(draw, busy ? 1000 : 4000)
  }
  $('#out').onclick = async e => { const b = e.target.closest('[data-a]'); if (!b) return; await L.invoke('download', +b.closest('[data-id]').dataset.id, b.dataset.a); draw() }
  $('#clr').onclick = async () => { await L.invoke('download', -1, 'clear'); draw() }
  draw()
}

async function about(m) {
  const st = await L.invoke('update', 'state')
  const desc = s => !s ? '' : s.status === 'checking' ? 'Checking for updates...' : s.status === 'downloading' ? `Downloading update... ${Math.round(s.progress || 0)}%` : s.status === 'ready' ? `Version ${esc(s.latest)} is ready. Restart to finish updating.` : s.status === 'available' ? (s.reason || `Version ${esc(s.latest)} is available.`) : s.status === 'uptodate' ? 'Lumen is up to date.' : s.status === 'unpacking' ? 'Unpacking the update...' : s.status === 'installing' ? 'Restarting...' : s.status === 'error' ? 'Could not check for updates. ' + esc(s.error || '') : ''
  const title = s => !s ? 'Updates' : s.status === 'ready' ? 'Ready to restart' : s.status === 'downloading' || s.status === 'unpacking' ? 'Getting the update' : s.status === 'checking' ? 'Checking' : s.status === 'uptodate' ? 'You have the latest Lumen' : s.status === 'available' ? 'An update is available' : s.status === 'error' ? 'Updates' : 'Updates'
  m.innerHTML = `<div class="abouthero rise"><img class="ahicon" src="lumen://assets/icon-${esc(S.appIcon || 'default')}.png" alt=""><div><h2>Lumen</h2><div class="ahver">Version ${esc(VERSION)}</div><p class="lead">A fast, private browser with Chrome's engine and a calmer feel.</p>
    <div class="ahbtns"><button class="btn" id="replay">${ICONS.play}Replay the intro</button><a class="btn" href="lumen://settings/general">${ICONS.gear}Settings</a></div></div></div>
  <div class="card"><h3>UPDATES</h3>
    <div class="row updrow"><span class="updorb" id="udorb"></span><div class="grow"><div class="t" id="udt"></div><div class="d"><span id="ud">${desc(st)}</span></div><div class="bar hidden" id="udbar"><i></i></div></div><div class="updbtns"><button class="btn" id="chk">Check for updates</button><button class="btn primary ${st && st.status === 'ready' ? '' : 'hidden'}" id="rst">${ICONS.reload}Restart</button></div></div>
    ${row('Automatic updates', 'Download updates in the background and install them when you quit.', sw('autoUpdate', S.autoUpdate))}
  </div>
  <div class="card"><h3>INSIDE LUMEN</h3>
    ${row('Engine', 'Chromium, the same engine as Google Chrome, so every site works the same.', '<span class="pill">Chromium</span>')}
    <div class="builtins">${[['shield', 'Ad and tracker blocking'], ['key', 'Password manager'], ['lock', 'Encrypted sync'], ['split', 'Split view'], ['book', 'Reader mode'], ['pip', 'Picture in picture'], ['moon', 'Tab sleeping'], ['puzzle', 'Chrome extensions'], ['sparkle', 'Lumen AI'], ['box', 'Parcels'], ['translate', 'Translate'], ['bolt', 'Surge and Koi']].map(([i, t], n) => `<span style="--ic:${tint(n * 30)}">${ICONS[i] || ''}${t}</span>`).join('')}</div>
  </div>`
  bindSettings(m)
  let poll = 0
  const paint = s => {
    const busy = s && /checking|downloading|unpacking|installing/.test(s.status)
    $('#ud').innerHTML = desc(s) || 'Lumen checks for updates by itself. You can also check now.'; $('#udt').textContent = title(s)
    const orb = $('#udorb'); orb.className = 'updorb' + (s && s.status === 'uptodate' ? ' ok' : '') + (busy ? ' busy' : '')
    orb.innerHTML = s && s.status === 'uptodate' ? ICONS.check : s && s.status === 'ready' ? ICONS.reload : ICONS.download
    const bar = $('#udbar'); bar.classList.toggle('hidden', !(s && (s.status === 'downloading' || s.status === 'unpacking'))); bar.firstChild.style.width = Math.round(s && s.status === 'unpacking' ? 100 : (s && s.progress) || 0) + '%'
    $('#rst').classList.toggle('hidden', !(s && s.status === 'ready'))
    clearTimeout(poll); if (busy && document.getElementById('udorb')) poll = setTimeout(async () => paint(await L.invoke('update', 'state')), 1000)
  }
  paint(st)
  $('#chk').onclick = async () => { paint({ status: 'checking' }); paint(await L.invoke('update', 'check')) }
  $('#rst').onclick = () => L.invoke('update', 'install')
  $('#replay').onclick = () => L.invoke('replayIntro')
}

// ======================================================================= error page
const ERRORS = {
  '-105': ['Cannot find this site', 'Check the address for typos. The site may also be down.'],
  '-106': ['You are offline', 'Check your internet connection and try again.'],
  '-102': ['This site refused to connect', 'The server is not accepting connections right now.'],
  '-118': ['This site took too long to respond', 'The server may be busy. Try again in a moment.'],
  '-109': ['This site cannot be reached', 'The address is unreachable.'],
  '-200': ['Your connection is not private', 'The certificate for this site is not valid. Someone could be trying to steal your information.'],
  '-201': ['Your connection is not private', 'The certificate for this site is not valid.'],
  '-202': ['Your connection is not private', 'The certificate for this site is not trusted.'],
}
// each kind of failure gets its own picture and the most useful next step
const ERR_KIND = code => { const c = parseInt(code); if (c === -106 || c === -21) return 'offline'; if (c === -105 || c === -137) return 'dns'; if (c <= -200 && c > -300) return 'cert'; if (c === -118 || c === -7) return 'slow'; if (c === -102 || c === -109 || c === -100 || c === -101) return 'refused'; return 'other' }
const ERR_ART = {
  offline: '<path d="M2 6.5a9 9 0 0 1 3-1.9M14 6.5a9 9 0 0 0-6-2.3M4.2 8.9a5.5 5.5 0 0 1 2.3-1.2M11.8 8.9a5.5 5.5 0 0 0-1.6-1M6.6 11.2a2.2 2.2 0 0 1 2.8 0M2.5 2.5l11 11"/>',
  dns: '<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3M5.5 7h3"/>',
  cert: '<rect x="3" y="7" width="10" height="7" rx="1.6"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2M8 9.8v1.8"/>',
  slow: '<circle cx="8" cy="8.5" r="5.5"/><path d="M8 5.5v3l2 1.5M6.5 1.5h3"/>',
  refused: '<path d="M6 2v3M10 2v3M4.5 5h7v3a3.5 3.5 0 0 1-7 0zM8 11.5V14"/>',
  other: '<circle cx="8" cy="8" r="6"/><path d="M8 4.8v3.6M8 10.9v.1"/>',
}
const ERR_TRY = {
  offline: ['Check that Wi-Fi is on, or that the network cable is plugged in.', 'Restart your router if other devices are offline too.', 'Turn a VPN or proxy off for a moment.'],
  dns: ['Check the address for typos.', 'Search for the site instead. It may have moved.', 'If other sites work, this one may be down.'],
  cert: ['Go back, and do not type passwords or card numbers here.', 'Check the date and time on your computer. A wrong clock breaks certificates.', 'If this is your own site, renew its certificate.'],
  slow: ['Try again in a moment. The server may be busy.', 'Check whether other sites load quickly.', 'A VPN or weak Wi-Fi can make sites time out.'],
  refused: ['Try again in a moment.', 'The site may be down for maintenance.', 'A firewall or VPN can block the connection.'],
  other: ['Try again.', 'Go back and open the link again.', 'If it keeps happening, the site may be having trouble.'],
  crash: ['Reload. Most crashes do not happen twice.', 'Close tabs you are not using to free up memory.', 'If one site keeps crashing, try it in a private window.'],
}
const errScene = (art, big) => `<div class="scene" aria-hidden="true"><span class="orbit o2"></span><span class="orbit"></span><span class="bigk">${big}</span><span class="sat s1"></span><span class="sat s2"></span><span class="sat s3"></span><div class="ico"><svg viewBox="0 0 16 16" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${art}</svg></div></div>`
const errTries = kind => `<div class="tries"><b>Things to try</b>${ERR_TRY[kind].map(t => `<span>${esc(t)}</span>`).join('')}</div>`
function errorPage() {
  const p = new URLSearchParams(location.search)
  const code = p.get('code') || '', url = p.get('url') || '', desc = p.get('desc') || ''
  const [title, text] = ERRORS[code] || (parseInt(code) <= -200 && parseInt(code) > -300 ? ERRORS['-200'] : ['This page is not working', 'Something went wrong while loading it.'])
  const kind = ERR_KIND(code), host = hostOf(url), back = history.length > 1
  document.title = host || 'Error'
  root.innerHTML = `<div class="err k-${kind}"><div class="errglow"></div><div class="err4">${errScene(ERR_ART[kind], esc(String(Math.abs(parseInt(code)) || '')))}<div class="rise">
    <div class="crash-why">${{ offline: 'No internet', dns: 'Address not found', cert: 'Certificate problem', slow: 'Timed out', refused: 'Connection refused', other: 'Could not load' }[kind]}</div>
    <h1>${esc(title)}</h1><p>${esc(text)}</p>
    <code>${esc(host || url)}${desc ? '  ·  ' + esc(desc) : ''}</code>
    ${kind === 'offline' ? '<div class="errwait"><i></i>Lumen will reload the page as soon as you are back online</div>' : ''}
    <div class="erracts">${back ? `<button class="btn ${kind === 'cert' ? 'primary' : ''}" id="eback">${ICONS.back}${kind === 'cert' ? 'Back to safety' : 'Go back'}</button>` : ''}${kind === 'dns' && host ? `<button class="btn" id="esearch">${ICONS.search}Search for ${esc(host.replace(/^www\./, ''))}</button>` : ''}<button class="btn ${kind === 'cert' && back ? '' : 'primary'}" id="retry">${ICONS.reload}Try again</button></div>
    ${kind === 'cert' ? `<details class="errdetails"><summary>What happened</summary><div>Lumen stopped before loading ${esc(host || 'this site')} because its security certificate could not be checked. The site may be set up wrong, or someone may be pretending to be it. Lumen will not load it for you.${desc ? `<code>${esc(desc)}</code>` : ''}</div></details>` : ''}
    ${errTries(kind)}
  </div></div></div>`
  $('#retry').onclick = () => L.invoke('retry', url)
  if ($('#eback')) $('#eback').onclick = () => history.back()
  if ($('#esearch')) $('#esearch').onclick = () => L.invoke('navigate', host.replace(/^www\./, '').split('.')[0] + ' ' + host)
  if (kind === 'offline') addEventListener('online', () => L.invoke('retry', url), { once: true })
  setTimeout(() => { const b = $(kind === 'cert' && back ? '#eback' : '#retry'); if (b) b.focus({ preventScroll: true }) }, 80)
}

// ======================================================================= crashed tab
const CRASH_WHY = { oom: 'It ran out of memory', crashed: 'The page stopped working', killed: 'The page was stopped', 'launch-failed': 'The page could not start', 'integrity-failure': 'The page could not start', abnormal: 'The page stopped working' }
function crashedPage() {
  const p = new URLSearchParams(location.search)
  const url = p.get('url') || '', host = hostOf(url), why = CRASH_WHY[p.get('reason')] || ''
  document.title = host ? host + ' crashed' : 'This tab crashed'
  root.innerHTML = `<div class="err crash"><div class="errglow"></div><div class="err4">${errScene('<path d="M3 3.5h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM2 6h12"/><path d="m6 8.2 1.6 1.6M7.6 8.2 6 9.8M8.6 8.2l1.6 1.6M10.2 8.2 8.6 9.8"/>', `<span class="bigic">${ICONS.crash || ''}</span>`)}<div class="rise">
    <div class="crash-why">${esc(why || 'The page stopped working')}</div>
    <h1>This tab crashed</h1><p>Something went wrong while showing ${host ? esc(host.replace(/^www\./, '')) : 'this page'}. Your other tabs are fine. Reload to try again.</p>
    ${url ? `<code>${esc(url)}</code>` : '<div style="height:26px"></div>'}
    <div class="erracts"><button class="btn" id="cnew">${ICONS.plus}Open New Tab</button><button class="btn primary" id="creload">${ICONS.reload}Reload</button></div>
    ${errTries('crash')}
  </div></div></div>`
  $('#creload').onclick = () => L.invoke('retry', /^(https?|lumen):\/\//i.test(url) ? url : 'lumen://newtab')
  $('#cnew').onclick = () => L.invoke('retry', 'lumen://newtab')
  setTimeout(() => $('#creload').focus(), 60)
}

// ======================================================================= section heroes and springy segmented controls
// Pages keep writing a plain <h2> and lead; this dresses them up as a lit liquid-glass hero with the section's icon,
// in the same color as its chip in the sidebar.
let CUR_SECTION = ''
const HERO_HUE = [0, 40, 85, 140, 200, 250, 300]
const HERO_ICON = { Search: 'search', Highlights: 'sparkle', 'Archived tabs': 'layers' }
let heroSeen = ''
function springPop(el, from) {
  // the hero icon lands with a real Jelly spring: scale and a small turn settle together
  if (!window.Jelly || Jelly.getMode() === 'off') return
  const s = new Jelly.Spring(from, 'jelly', v => { el.style.transform = `scale(${v.toFixed(4)}) rotate(${((1 - v) * -40).toFixed(2)}deg)` })
  s.to(1)
}
function buildHero(main) {
  const h2 = main.querySelector(':scope > h2'); if (!h2) return
  const lead = h2.nextElementSibling && h2.nextElementSibling.matches('p.lead') ? h2.nextElementSibling : null
  const title = h2.textContent.trim()
  const idx = Math.max(0, SECTIONS.findIndex(s => s[0] === CUR_SECTION))
  const icon = HERO_ICON[title] || (SECTIONS[idx] || [])[2] || 'gear'
  const hero = document.createElement('header'); hero.className = 'hero'
  hero.style.setProperty('--ic', `oklch(from var(--accent) l c calc(h + ${HERO_HUE[idx % 7]}))`)
  hero.innerHTML = `<i class="hero-orb a"></i><i class="hero-orb b"></i><i class="hero-orb c"></i><span class="hero-art" aria-hidden="true">${ICONS[icon] || ''}</span><span class="hero-ic" aria-hidden="true">${ICONS[icon] || ''}</span><div class="hero-tx"></div>`
  main.insertBefore(hero, h2)
  const tx = hero.querySelector('.hero-tx'); tx.append(h2); if (lead) tx.append(lead)
  // a page that redraws itself keeps its hero still; a new page gets the full entrance
  if (heroSeen !== title) { hero.classList.add('enter'); springPop(hero.querySelector('.hero-ic'), 0.45) }
  heroSeen = title
}
function segIndicator(g) {
  g.classList.add('has-ind')
  const ind = document.createElement('i'); ind.className = 'seg-ind'; ind.setAttribute('aria-hidden', 'true'); g.prepend(ind)
  let sx = null, sw = null
  const render = () => { ind.style.transform = `translateX(${sx.v.toFixed(2)}px)`; ind.style.width = Math.max(0, sw.v).toFixed(2) + 'px' }
  const place = animate => {
    const b = g.querySelector('button.on'); if (!b || !b.offsetWidth) { ind.style.opacity = '0'; return }
    const x = b.offsetLeft, w = b.offsetWidth
    if (!sx) { sx = new Jelly.Spring(x, 'jelly', render); sw = new Jelly.Spring(w, 'jelly', render); render() }
    if (animate) { sx.to(x); sw.to(w) } else { sx.set(x); sw.set(w) }
    ind.style.opacity = '1'
  }
  place(false)
  g.addEventListener('click', () => requestAnimationFrame(() => place(true)))
  if (window.ResizeObserver) new ResizeObserver(() => place(false)).observe(g)
}
function decorate() {
  const v = location.hash === '#highlights' || location.hash === '#archive' ? location.hash.slice(1) : page === 'settings' ? (sub || 'general') : page
  if (document.body.dataset.view !== v) document.body.dataset.view = v
  const main = document.getElementById('main'); if (main) buildHero(main)
  if (window.Jelly) root.querySelectorAll('.seg:not(.has-ind)').forEach(segIndicator)
}
new MutationObserver(decorate).observe(root, { childList: true, subtree: true })

// ======================================================================= boot
;(async () => {
  const init = await L.invoke('settings')
  S = init.settings; ENGINES = init.engines; VERSION = init.version; PLATFORM = init.platform
  applyLook(S)
  L.onSettings(s => { S = s; applyLook(s) })
  const routes = {
    newtab: newTab, error: errorPage, crashed: crashedPage,
    parcels: () => parcelsPage(shell('parcels')),
    history: () => historyPage(shell('history')), readlater: () => readLaterPage(shell('readlater')), bookmarks: () => bookmarksPage(shell('bookmarks')), downloads: () => downloadsPage(shell('downloads')),
    passwords: () => passwords(shell('passwords')), extensions: () => extensionsPage(shell('extensions')), about: () => about(shell('about')),
    settings: () => {
      const s = sub || 'general'
      const fn = { apps: appsPage, general, appearance, ai: aiPage, privacy, passwords, sync, import: importPage, extensions: extensionsPage, about, history: historyPage, bookmarks: bookmarksPage, downloads: downloadsPage }[s] || general
      fn(shell(s in { apps: 1, general: 1, appearance: 1, ai: 1, privacy: 1, passwords: 1, sync: 1, import: 1, extensions: 1, about: 1 } ? s : 'general'))
    },
  }
  ;(routes[page] || routes.newtab)()
})()
