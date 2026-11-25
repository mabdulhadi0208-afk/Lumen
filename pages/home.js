/* Lumen 4.1 home: the New Tab page (lumen://newtab).
 *
 * The hero is a quiet stage: deep ink lit by one soft accent glow, a fine grid and tiny drifting dots, the date,
 * a big confident greeting, a muted line about your day and four chips on the left, and a lock-screen clock (thin
 * tabular numerals, a seconds hairline) on the right behind a hairline divider. No orbs, bubbles or watermark.
 * Under it: a fat search pill (suggestions, Cmd K, Ask), the pulse (big stat tiles for your day), and a grid of
 * liquid-glass widgets you can drag around on springs and switch on and off. The background is Match theme by
 * default (it follows the browser theme), or any theme, wallpaper or photo. The private window gets its own look.
 *
 * Cheap on purpose: the shell paints before any widget data arrives, the glass is painted (no live blur, no SVG
 * lens), and the entrance is one wave of jelly springs on transform and opacity that clears itself when done.
 *
 * Loaded before app.js; uses its helpers (L, S, esc, hostOf, fav, flash, ICONS ...) only when called.
 * Defines window.newTab and window.buildClock. Styles: pages/home.css.
 *
 * Idle budget: nothing loops. The clock ticks once a second (and stops while the tab is hidden), Surge and Koi
 * status is refreshed every 20 s while visible, and every other motion runs once, on entry or on interaction.
 */
;(function () {
  const H = {}   // page state
  const qs = s => document.querySelector(s)
  const dark = () => matchMedia('(prefers-color-scheme: dark)').matches
  const still = () => Jelly.getMode() === 'off'
  const cmdKey = () => PLATFORM === 'darwin' ? 'Cmd' : 'Ctrl'

  // ---------------------------------------------------------------- wallpapers: all of them are made from your accent
  // dark: true means the wallpaper is always dark, so the page switches to light text over it
  const WALLPAPERS = {
    auto: { name: 'Sky' },
    aurora: { name: 'Aurora' },
    nebula: { name: 'Nebula', dark: true },
    sunset: { name: 'Glow', dark: true },
    ocean: { name: 'Tide', dark: true },
    dusk: { name: 'Dusk', dark: true },
    ember: { name: 'Ember', dark: true },
    forest: { name: 'Silk' },
    plain: { name: 'Plain' },
  }

  // ---------------------------------------------------------------- widgets
  // span: how many of the 6 columns a widget wants on a wide window
  const WIDGETS = {
    shortcuts: { name: 'Shortcuts', icon: 'star', span: 4, hue: 0 },
    stats: { name: 'Blocked today', icon: 'shield', span: 2, hue: 140 },
    recent: { name: 'Jump back in', icon: 'clock', span: 4, hue: 40, key: 'ntpRecent' },
    apps: { name: 'Surge and Koi', icon: 'bolt', span: 2, hue: 290 },
    later: { name: 'Read later', icon: 'book', span: 3, hue: 70, key: 'ntpReadLater' },
    parcels: { name: 'Parcels', icon: 'box', span: 3, hue: 200, key: 'ntpParcels' },
    focus: { name: 'Focus', icon: 'hourglass', span: 2, hue: 320 },
    notes: { name: 'Quick note', icon: 'file', span: 2, hue: 100 },
    calendar: { name: 'Calendar', icon: 'cal', span: 2, hue: 220 },
    clocks: { name: 'World clocks', icon: 'globe', span: 2, hue: 260 },
    bookmarks: { name: 'Bookmarks', icon: 'star', span: 3, hue: 30 },
    highlights: { name: 'Highlights', icon: 'sparkle', span: 3, hue: 330 },
    downloads: { name: 'Downloads', icon: 'download', span: 2, hue: 150 },
    weather: { name: 'Weather', icon: 'location', span: 2, hue: 175 },
    wallpaper: { name: 'Wallpaper', icon: 'layers', span: 2, hue: 250 },
    privacy: { name: 'Private window', icon: 'mask', span: 2, hue: 280, private: true },
  }
  const DEFAULT_ORDER = ['shortcuts', 'stats', 'recent', 'apps', 'focus', 'later', 'parcels', 'notes', 'calendar', 'clocks', 'bookmarks', 'highlights', 'downloads', 'weather', 'wallpaper']
  const SIZES = [[2, 'S'], [3, 'M'], [4, 'L'], [6, 'Full']]
  const spanOf = id => { const z = S.ntpSizes && S.ntpSizes[id]; return [2, 3, 4, 6].includes(z) ? z : WIDGETS[id].span }
  const hidden = () => Array.isArray(S.ntpHide) ? S.ntpHide : ['weather']
  const widgetOn = id => { const w = WIDGETS[id]; if (!w) return false; if (w.key) return S[w.key] !== false; if (id === 'stats') return S.ntpStats !== false; return !hidden().includes(id) }
  function order() {
    const saved = Array.isArray(S.ntpOrder) ? S.ntpOrder.filter(id => WIDGETS[id] && !WIDGETS[id].private) : []
    return [...saved, ...DEFAULT_ORDER.filter(id => !saved.includes(id))]
  }
  async function setWidget(id, on) {
    const w = WIDGETS[id]
    if (w.key) { S[w.key] = on; await L.invoke('setSetting', w.key, on); return }
    if (id === 'stats') { S.ntpStats = on; await L.invoke('setSetting', 'ntpStats', on); return }
    const h = hidden().filter(x => x !== id); if (!on) h.push(id)
    S.ntpHide = h; await L.invoke('setSetting', 'ntpHide', h)
  }

  // ---------------------------------------------------------------- small helpers
  const XI = {
    cal: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.2" y="3" width="11.6" height="10.8" rx="2.4"/><path d="M2.2 6.6h11.6M5.4 1.8v2.4M10.6 1.8v2.4"/><path d="M5.2 9.4h.01M8 9.4h.01M10.8 9.4h.01M5.2 11.6h.01M8 11.6h.01"/></svg>',
    chev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 6.2 3.5 3.6 3.5-3.6"/></svg>',
    left: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.8 3.8 5.6 8l4.2 4.2"/></svg>',
    right: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 3.8 10.4 8l-4.2 4.2"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="2.8" height="10" rx="1"/><rect x="9.2" y="3" width="2.8" height="10" rx="1"/></svg>',
    playf: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.2v9.6c0 .5.5.8.9.5l7.2-4.8a.6.6 0 0 0 0-1L5.9 2.7c-.4-.3-.9 0-.9.5z"/></svg>',
  }
  const ic = n => ICONS[n] || XI[n] || ''
  function greeting() { const h = new Date().getHours(); return h < 5 ? ['Good', 'night'] : h < 12 ? ['Good', 'morning'] : h < 18 ? ['Good', 'afternoon'] : ['Good', 'evening'] }
  const ago = t => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'Just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : m < 2880 ? 'Yesterday' : Math.round(m / 1440) + ' days ago' }
  const icTile = (id, extra = '') => `<span class="hm-ic" style="--ic:oklch(from var(--accent) l c calc(h + ${WIDGETS[id].hue}))" aria-hidden="true">${ic(WIDGETS[id].icon)}</span>${extra}`
  const grip = id => `<button class="hm-grip" data-grip="${id}" title="Drag to move, or use the arrow keys" aria-label="Move ${esc(WIDGETS[id].name)}"><i></i><i></i><i></i><i></i><i></i><i></i></button>`
  const head = (id, title, right = '') => `<span class="hm-wm" aria-hidden="true">${ic(WIDGETS[id].icon)}</span><div class="hm-h">${icTile(id)}<b>${esc(title || WIDGETS[id].name)}</b>${right}${H.private ? '' : grip(id)}</div>`
  // site faces show the site's real logo: the sharpest icon Lumen saw on that site (its touch icon, an SVG or its
  // biggest PNG), else its /apple-touch-icon.png, else its favicon; the glossy letter tile stays under it as the fallback
  const siteFace = url => {
    const h = hostOf(url) || '?', web = /^https?:/.test(url), o = web ? new URL(url).origin : ''
    const ic = web && H.icons && H.icons[h]
    const img = web ? `<img class="hm-lg" data-k="${ic ? esc(ic.k) : 'touch'}" data-alt="${esc(o)}/favicon.ico" decoding="async" src="${esc(ic ? ic.u : o + '/apple-touch-icon.png')}" alt="">` : ''
    return `<span class="hm-face" style="--th:${hue(h)}"><b>${esc(h[0].toUpperCase())}</b>${img}</span>`
  }
  const logoFail = im => { const alt = im.dataset.alt; if (alt && im.src !== alt) { im.dataset.k = 'icon'; im.src = alt; im.dataset.alt = '' } else { const f = im.parentNode; im.remove(); f && f.classList.remove('lg', 'lg-touch', 'lg-icon', 'lg-small') } }
  document.addEventListener('error', e => { if (e.target.classList && e.target.classList.contains('hm-lg')) logoFail(e.target) }, true)
  document.addEventListener('load', e => {
    const im = e.target; if (!im.classList || !im.classList.contains('hm-lg')) return
    if (im.naturalWidth < 8) return logoFail(im)
    const f = im.parentNode; f.classList.remove('lg-touch', 'lg-icon', 'lg-small')
    f.classList.add('lg', im.dataset.k === 'touch' ? 'lg-touch' : 'lg-icon')
    if (im.dataset.k !== 'touch' && im.naturalWidth < 48 && !/\.svg(\?|$)/i.test(im.src)) f.classList.add('lg-small')
  }, true)

  // the banner layout (setting ntpBanner): Modern (words left, clock right, the default) or Classic (clock left, words
  // right). Only the arrangement changes; see .hm-hero.classic in home.css.
  const heroLayout = () => S.ntpBanner === 'classic' ? 'classic' : 'modern'

  // ---------------------------------------------------------------- the clock: Glass, Minimal, Analog or Off (setting ntpClock)
  // saved values stay as they were (true or 'glass', 'minimal', 'analog', false or 'off'); the new names map onto them
  const clockStyle = () => { const v = S.ntpClock; return v === false || v === 'off' ? 'off' : v === 'minimal' || v === 'stacked' ? 'minimal' : v === 'analog' || v === 'watch' ? 'analog' : 'glass' }
  const nowText = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '').trim()
  const ampm = d => (d.toLocaleTimeString([], { hour: 'numeric' }).match(/[AP]M/i) || [''])[0].toUpperCase()
  // ---------------------------------------------------------------- the clock itself
  // Plain text (tabular figures), set once a second on a timer aligned to the second, and never while hidden.
  // Display: thin and huge. Stacked: hours over minutes. Watch: a hairline face. A changed digit slides in once.
  const CK = { timer: 0, txt: '', style: '', min: -1 }
  const anglesOf = d => ({ h: (d.getHours() % 12 + d.getMinutes() / 60) * 30, m: (d.getMinutes() + d.getSeconds() / 60) * 6, s: d.getSeconds() * 6 })
  function clockSize() {
    const hero = qs('#hero'), w = hero ? hero.clientWidth : innerWidth
    return Math.round(w < 620 ? 92 : Math.min(156, Math.max(96, w * .122)))
  }
  const hm = d => { const [h, m] = nowText(d).split(':'); return [h, m || '00'] }
  const digitsHTML = (s, n0) => [...s].map((ch, i) => `<b style="--n:${n0 + i}">${ch}</b>`).join('')
  function buildClock() {
    const c = qs('#clock'), wrap = qs('#clockwrap'); if (!c || !wrap) return
    const style = clockStyle(), d = new Date()
    CK.style = style; CK.min = -1
    wrap.style.setProperty('--fs', clockSize() + 'px')
    const ap = qs('#ampm'); if (ap) ap.textContent = ampm(d)
    if (style === 'analog') {
      c.innerHTML = '<i class="wt"></i><i class="wh h"></i><i class="wh m"></i><i class="wh s"></i><i class="wc"></i>'
      CK.txt = ''
    } else {
      const [h, m] = hm(d)
      c.innerHTML = style === 'minimal'
        ? `<span class="ck-h">${digitsHTML(h.padStart(2, '0'), 0)}</span><span class="ck-m">${digitsHTML(m, 2)}</span>`
        : `<span class="ck-h">${digitsHTML(h, 0)}</span><span class="ck-col" style="--n:${h.length}"><i></i><i></i></span><span class="ck-m">${digitsHTML(m, h.length + 1)}</span>`
      CK.txt = h + ':' + m
    }
    paintSeconds(d)
  }
  // once a second: the seconds hairline, the colon, the watch hands
  function paintSeconds(d) {
    const wrap = qs('#clockwrap'); if (!wrap) return
    const s = d.getSeconds()
    wrap.style.setProperty('--s', (s / 59).toFixed(4))
    const col = wrap.querySelector('.ck-col'); if (col) col.classList.toggle('dim', s % 2 === 1)
    if (CK.style === 'analog') { const a = anglesOf(d); for (const k of ['h', 'm', 's']) { const e = wrap.querySelector('.wh.' + k); if (e) e.style.setProperty('--a', a[k].toFixed(2) + 'deg') } }
  }
  // the minute changed: only the digits that differ are replaced, each slides up into place once
  function setDigits(d) {
    const c = qs('#clock'); if (!c || CK.style === 'analog') return
    let [h, m] = hm(d)
    if (CK.style === 'minimal') h = h.padStart(2, '0')
    const next = h + ':' + m
    if (next === CK.txt) return
    if (next.length !== CK.txt.length) { buildClock(); return }
    const bs = [...c.querySelectorAll('b')], chars = (h + m).split('')
    bs.forEach((b, i) => {
      if (b.textContent === chars[i]) return
      b.textContent = chars[i]
      if (!still() && b.animate) b.animate([{ transform: 'translateY(.18em)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2, .8, .2, 1)' })
    })
    CK.txt = next
    const ap = qs('#ampm'); if (ap) ap.textContent = ampm(d)
  }
  function tickClock() {
    clearTimeout(CK.timer)
    if (document.hidden || !qs('#ntp')) return   // a hidden New Tab costs nothing; it catches up when shown
    const d = new Date()
    if (qs('#clock')) { setDigits(d); paintSeconds(d) }
    if (CK.min !== d.getMinutes()) { CK.min = d.getMinutes(); heroText(d); paintZones(d); if (H.wp === 'auto' && skyFor(d.getHours()) !== H.sky) paintWallpaper(true) }
    // wake once a second, just after it turns; Off only needs the minute
    CK.timer = setTimeout(tickClock, CK.style === 'off' || !qs('#clock') ? 60000 - Date.now() % 60000 + 20 : 1000 - Date.now() % 1000 + 8)
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && qs('#ntp')) { tickClock(); refreshApps() } })

  // the line under the greeting and the ring for the day
  function heroText(d = new Date()) {
    const g = qs('#greet')
    if (g && !H.private) {
      const [a, b] = greeting(), name = (S.ntpName || '').trim()
      const html = name ? `${a} ${b}, <em>${esc(name)}</em>` : `${a} <em>${b}</em>`
      if (g.dataset.v !== html) { g.dataset.v = html; g.innerHTML = html }
    }
    const dt = qs('#date')
    if (dt) {
      // the eyebrow over the clock: the day, a dot, the date and, when it is set, the weather
      let wx = ''
      if (!H.private && H.weather && !H.weather.error && widgetOn('weather')) { const k = wxKind(H.weather.code, H.weather.day); wx = `<i class="hm-dot"></i><span class="hm-wx">${wxIcon(k)}${H.weather.temp}°</span>` }
      const html = `<span>${esc(d.toLocaleDateString([], { weekday: 'long' }))}</span><i class="hm-dot"></i><span>${esc(d.toLocaleDateString([], { month: 'long', day: 'numeric' }))}</span>${wx}`
      if (dt.dataset.v !== html) { dt.dataset.v = html; dt.innerHTML = html }
    }
    const sub = qs('#hsub')
    if (sub) {
      // the muted line under the title: what your day looks like, in one plain sentence
      let t
      if (H.private) t = 'Nothing you do here is saved. Close the window and it is gone.'
      else {
        const bits = [], n = H.home ? H.home.today || 0 : 0, moving = (H.parcels || []).filter(p => p.status !== 'delivered').length
        if (n) bits.push(`${n.toLocaleString('en-US')} ${n === 1 ? 'tracker' : 'trackers'} blocked`)
        if (H.laterCount) bits.push(`${H.laterCount} ${H.laterCount === 1 ? 'story' : 'stories'} saved to read`)
        if (moving) bits.push(`${moving} ${moving === 1 ? 'parcel' : 'parcels'} on the way`)
        const list = bits.length > 1 ? bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1] : bits[0]
        t = focusLeft() > 0 ? (S.ntpFocus && S.ntpFocus.end ? `Deep in focus, ${Math.ceil(focusLeft() / 60000)} min to go. Everything else can wait.` : 'Focus is paused. Pick it back up when you are ready.')
          : list ? `Here is your day so far: ${list}.` : 'A fresh start. Search, ask, or pick up right where you left off.'
      }
      if (sub.textContent !== t) sub.textContent = t
    }
    const px = qs('#pulsex')
    if (px) {
      // the pulse of your day: big glass stat tiles under the search, each one takes you to its widget
      const tiles = []
      const tile = (icon, hueOff, n, label, go, txt) => tiles.push(`<button class="hm-stat hm-lq" data-go="${esc(go)}" style="--ic:oklch(from var(--accent) l c calc(h + ${hueOff}))"><span class="hm-ic" aria-hidden="true">${icon}</span><span class="hm-st"><b${typeof n === 'number' ? ` data-n="${n}"` : ''}>${typeof n === 'number' ? n.toLocaleString('en-US') : esc(n)}</b><i>${esc(label)}</i></span>${txt || ''}</button>`)
      const blocked = H.home ? H.home.today || 0 : 0
      if (H.private) {
        tile(ICONS.mask, 280, 'Private', 'nothing here is saved', '')
        tile(ICONS.shield, 140, blocked, 'blocked today', '')
      } else {
        // a little picture in the corner of each tile: the week as bars, a fanned stack of pages, a parcel's road
        const week = (H.home && H.home.week) || [], top = Math.max(1, ...week.map(x => x.n || 0))
        const bars = week.length ? `<span class="hm-viz bars" aria-hidden="true">${week.map((x, i) => `<i style="--h:${Math.max(.14, (x.n || 0) / top).toFixed(3)};--i:${i}"></i>`).join('')}</span>` : ''
        tile(ICONS.shield, 140, blocked, 'blocked today', widgetOn('stats') ? 'w:stats' : '', bars)
        tile(ICONS.book, 70, H.laterCount || 0, 'in Read later', widgetOn('later') ? 'w:later' : 'lumen://readlater', `<span class="hm-viz pages" aria-hidden="true"><i></i><i></i><i></i></span>`)
        const moving = (H.parcels || []).filter(p => p.status !== 'delivered').length
        if (focusLeft() > 0) tile(ic('hourglass'), 320, mmss(focusLeft()), S.ntpFocus && S.ntpFocus.end ? 'focus left' : 'focus paused', 'w:focus')
        else tile(ICONS.box, 200, moving, moving === 1 ? 'parcel on the way' : 'parcels on the way', 'lumen://parcels', `<span class="hm-viz road" aria-hidden="true"><i></i><i></i><i></i><b></b></span>`)
      }
      const html = tiles.join('')
      if (px.dataset.v !== html) { px.dataset.v = html; px.innerHTML = html; if (H.ready && !H.counted) { H.counted = true; countUp(px) } }
    }
    const hero = qs('#hero'); if (hero) { const h = d.getHours(); hero.dataset.tod = h >= 5 && h < 9 ? 'dawn' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night' }
    ringPaint(d)
  }
  // the ring shows how much of today has gone, or what is left of a focus session
  function ringPaint(d = new Date()) {
    const ring = qs('#ring'); if (!ring) return
    const left = focusLeft(), F = S.ntpFocus
    if (left > 0 && F) {
      ring.classList.add('focus')
      ring.style.setProperty('--p', (left / F.len).toFixed(4))
      ring.querySelector('b').textContent = mmss(left)
      ring.querySelector('span').textContent = F.end ? 'focus left' : 'paused'
    } else {
      ring.classList.remove('focus')
      const p = (d.getHours() * 60 + d.getMinutes()) / 1440
      ring.style.setProperty('--p', p.toFixed(4))
      ring.querySelector('b').textContent = Math.round(p * 100) + '%'
      ring.querySelector('span').textContent = 'of today'
    }
  }

  // ---------------------------------------------------------------- focus sessions (setting ntpFocus: { len, end, left, done, day })
  const mmss = ms => { const t = Math.ceil(ms / 1000), m = Math.floor(t / 60), x = t % 60; return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}` }
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }
  // time left: counting down (end), paused (left) or nothing
  const focusLeft = () => { const F = S.ntpFocus; if (!F) return 0; if (F.end) return Math.max(0, F.end - Date.now()); return F.left || 0 }
  const focusDone = () => { const F = S.ntpFocus; return F && F.day === todayKey() ? F.done || 0 : 0 }
  let fT = 0
  function saveFocus(F) { S.ntpFocus = F; return L.invoke('setSetting', 'ntpFocus', F) }
  function focusTick() {
    clearTimeout(fT)
    const F = S.ntpFocus
    if (F && F.end && F.end <= Date.now()) {
      // a session finished (maybe while the tab was hidden)
      saveFocus({ len: F.len, end: 0, left: 0, done: focusDone() + 1, day: todayKey() })
      if (qs('#ntp')) { flash('Focus session done. Time for a break.'); const c = qs('[data-w="focus"]'); if (c && window.Jelly) Jelly.kick(c, 1, 1) }
    }
    paintFocus(); ringPaint(); heroText()
    if (S.ntpFocus && S.ntpFocus.end && !document.hidden && qs('#ntp')) fT = setTimeout(focusTick, 1000 - (S.ntpFocus.end - Date.now()) % 1000 + 5)
  }
  function paintFocus() {
    const box = qs('[data-w="focus"]'); if (!box) return
    const F = S.ntpFocus, left = focusLeft(), len = F ? F.len : (H.focusLen || 25 * 60e3)
    const t = box.querySelector('.fc-t'); if (t) t.textContent = mmss(left || len)
    const r = box.querySelector('.fc-ring'); if (r) r.style.setProperty('--p', left ? (left / len).toFixed(4) : 1)
    box.classList.toggle('running', !!(F && F.end)); box.classList.toggle('paused', !!(F && !F.end && F.left))
    const go = box.querySelector('#fcgo'); if (go) { go.innerHTML = F && F.end ? `${XI.pause}<span>Pause</span>` : `${XI.playf}<span>${F && F.left ? 'Resume' : 'Start'}</span>` }
    const n = box.querySelector('.fc-n'); if (n) n.textContent = focusDone() ? `${focusDone()} done today` : 'Silence the noise'
  }

  function clockMarkup(style) {
    if (style === 'off') return ''
    if (style === 'analog') return `<div class="hm-clock ck-${style}" id="clockwrap"><div class="clock" id="clock" role="timer" aria-live="off"></div></div>`
    return `<div class="hm-clock ck-${style}" id="clockwrap"><div class="ck-top"><div class="clock" id="clock" role="timer" aria-live="off"></div><span class="hm-ampm" id="ampm"></span></div><div class="ck-sec" aria-hidden="true"><i class="ck-run"></i><i class="ck-tip"></i></div></div>`
  }

  // ---------------------------------------------------------------- weather (Open-Meteo, the city you typed; off by default)
  const WX = {
    clear: ['Clear', '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>'],
    night: ['Clear', '<path d="M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7z"/>'],
    cloud: ['Cloudy', '<path d="M7 18.5h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18.5z"/>'],
    part: ['Partly cloudy', '<path d="M8.5 4.2v1.4M3.6 9.2H2.2M4.9 5.6l1 1M12.1 5.6l-1 1"/><path d="M5.6 11.2a3.2 3.2 0 0 1 5.9-2.4"/><path d="M8.5 19.5h9a3.6 3.6 0 0 0 .4-7.2 5 5 0 0 0-9.6 1.1 3.1 3.1 0 0 0 .2 6.1z"/>'],
    fog: ['Fog', '<path d="M4 9h16M3 13h18M5 17h14"/>'],
    rain: ['Rain', '<path d="M7 15h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>'],
    snow: ['Snow', '<path d="M7 14h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 14z"/><path d="M8 18h.01M12 20h.01M16 18h.01M10 21.5h.01M14 21.5h.01"/>'],
    storm: ['Thunderstorm', '<path d="M7 14h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 14z"/><path d="m12.5 15-2 3.5h3l-2 3.5"/>'],
  }
  const wxKind = (code, day = true) => code === 0 || code === 1 ? (day ? 'clear' : 'night') : code === 2 ? 'part' : code === 3 ? 'cloud' : code === 45 || code === 48 ? 'fog' : (code >= 71 && code <= 77) || code === 85 || code === 86 ? 'snow' : code >= 95 ? 'storm' : code >= 51 ? 'rain' : 'cloud'
  const wxIcon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${WX[k][1]}</svg>`
  async function loadWeather() {
    H.weather = null
    if (H.private || !widgetOn('weather') || !(S.ntpWeather || '').trim()) return
    try { H.weather = await L.invoke('weather', S.ntpWeather) } catch { H.weather = { error: 'offline' } }
  }

  // ---------------------------------------------------------------- data for the widgets
  async function loadData() {
    const safe = async (fn, fb) => { try { return (await fn()) || fb } catch { return fb } }
    const custom = Array.isArray(S.ntpShortcuts)
    H.custom = custom
    const [home, top, hist, parcels, later, apps] = await Promise.all([
      safe(() => L.invoke('home'), { private: false, today: 0, week: [], total: 0, adblock: true, apps: [] }),
      custom || !S.homeTiles ? [] : safe(() => L.invoke('topSites'), []),
      safe(() => L.invoke('history', ''), []),
      safe(() => L.invoke('parcels'), []),
      safe(() => L.invoke('readLater', 300), []),
      safe(() => L.invoke('apps'), { list: [] }),
    ])
    H.home = home; H.private = !!home.private
    H.sites = custom ? S.ntpShortcuts : top.map(s => ({ url: s.url, title: s.host.replace(/^www\./, '') }))
    const seen = new Set(); H.recent = []
    for (const h of hist) { const k = hostOf(h.url); if (!k || seen.has(k) || !/^https?:/.test(h.url)) continue; seen.add(k); H.recent.push(h); if (H.recent.length === 4) break }
    H.parcels = parcels.filter(p => p.status !== 'delivered' || Date.now() - p.delivered < 864e5).slice(0, 4)
    H.laterCount = later.length; H.later = later.slice(0, 4)
    H.apps = (apps.list || []).filter(a => a.supported)
    if (!H.private) {
      const [bm, hl, dl] = await Promise.all([safe(() => L.invoke('bookmarks'), []), safe(() => L.invoke('highlights'), []), safe(() => L.invoke('downloads'), [])])
      H.bookmarks = bm.filter(b => /^https?:/.test(b.url || '')).slice(0, 8)
      H.highlights = hl.filter(h => (h.text || '').trim().length > 12)
      H.hl = 0
      H.downloads = dl.slice(0, 3)
    } else { H.bookmarks = []; H.highlights = []; H.downloads = [] }
    // the logos Lumen remembers for every site the widgets show, fetched in one go before the first paint
    const hosts = new Set(); const addH = u => { const h = /^https?:/.test(u || '') && hostOf(u); if (h) hosts.add(h) }
    for (const x of [...(H.sites || []), ...H.recent, ...((H.home && H.home.closed) || []), ...H.later, ...H.bookmarks, ...H.highlights.slice(0, 20)]) addH(x && x.url)
    H.icons = H.private ? {} : await safe(() => L.invoke('siteIcons', [...hosts]), {})
    await loadWeather()
  }

  // ---------------------------------------------------------------- widget bodies
  const R = {}
  R.shortcuts = () => {
    const s = H.sites
    return `${head('shortcuts', H.custom ? 'Your shortcuts' : 'Most visited', `<span class="hm-note">${H.custom && !H.private ? 'Drag to reorder' : ''}</span>`)}
    <div class="tiles" id="tiles">${s.map((x, i) => `<div class="tile" style="--i:${i}" data-url="${esc(x.url)}" data-i="${i}" title="${esc(x.url)}"><div class="ti">${siteFace(x.url)}</div><span>${esc(x.title || hostOf(x.url))}</span>${H.private ? '' : `<button class="tx" title="Remove" aria-label="Remove ${esc(x.title || hostOf(x.url))}">${ICONS.close}</button>`}</div>`).join('')}${s.length < 12 && !H.private ? `<div class="tile add" style="--i:${s.length}" id="addtile" role="button" tabindex="0"><div class="ti">${ICONS.plus}</div><span>Add</span></div>` : ''}</div>`
  }
  R.stats = () => {
    const h = H.home, wk = h.week && h.week.length ? h.week : [], max = Math.max(1, ...wk.map(x => x.n))
    const saved = h.today * 0.05
    if (!h.adblock) return `${head('stats', 'Ad blocker')}<div class="st-off"><p>The ad blocker is off, so ads and trackers load on every page.</p><button class="btn primary" id="adon">${ICONS.shield}Turn it on</button></div>`
    return `${head('stats')}<div class="st-big"><b id="stn" data-n="${h.today}">${still() ? h.today.toLocaleString('en-US') : '0'}</b><span>ads and trackers</span></div>
      <div class="st-bars" aria-label="The last 7 days">${wk.map((x, i) => `<i style="--h:${Math.max(.06, x.n / max).toFixed(3)};--i:${i}" class="${i === 6 ? 'today' : ''}" title="${esc(new Date(x.day + 'T12:00').toLocaleDateString([], { weekday: 'long' }))}: ${x.n.toLocaleString('en-US')}"></i>`).join('')}</div>
      <p class="st-sub">${h.total.toLocaleString('en-US')} all time${saved >= 1 ? `<i></i>about ${saved < 90 ? Math.round(saved) + ' sec' : Math.round(saved / 60) + ' min'} saved today` : ''}</p>`
  }
  const rowHTML = (h, later, tag) => `<a class="hm-row" href="${esc(h.url)}"${later ? ` data-rl="${esc(h.url)}"` : ''}>${siteFace(h.url)}<span class="hm-rb"><b>${esc(h.title || hostOf(h.url))}</b><i>${esc(hostOf(h.url))}</i></span><em>${tag || (later ? 'Saved ' + ago(h.t).toLowerCase() : ago(h.t))}</em>${later ? `<button class="tx rl-x" title="Remove" aria-label="Remove from Read later">${ICONS.close}</button>` : ''}</a>`
  R.recent = () => {
    const closed = (H.home && H.home.closed) || [], tab = H.recentTab === 'closed' && closed.length ? 'closed' : 'history'
    const seg = closed.length ? `<div class="hm-seg" id="rcseg" role="tablist"><button data-v="history" class="${tab === 'history' ? 'on' : ''}" role="tab">Visited</button><button data-v="closed" class="${tab === 'closed' ? 'on' : ''}" role="tab">Closed</button></div>` : ''
    const list = tab === 'closed' ? closed.slice(0, 4).map(c => rowHTML({ url: c.url, title: c.title, t: 0 }, false, 'Reopen')) : H.recent.map(h => rowHTML(h))
    return `${head('recent', 'Pick up where you left off', seg)}<div class="hm-rows">${list.length ? list.join('') : '<p class="hm-empty">Pages you visit show up here.</p>'}</div>`
  }
  R.later = () => `${head('later', 'Read later', H.laterCount > 4 ? `<span class="hm-note">${H.laterCount} saved</span>` : '')}<div class="hm-rows" id="rl">${H.later.length ? H.later.map(h => rowHTML(h, true)).join('') : `<p class="hm-empty">Press ${cmdKey()} Shift S on any page to save it for later.</p>`}</div>`
  R.parcels = () => {
    const auto = S.parcelsAuto === true, list = H.parcels
    return `${head('parcels', 'Parcels', `<a class="hm-more" href="lumen://parcels">See all</a>`)}<div class="pc-list" id="pc">
    ${list.map(p => `<a class="pcard ${PSTAT[p.status] ? PSTAT[p.status][1] : ''}" href="${esc(p.open)}" data-pid="${esc(p.id)}">
      <span class="pc-ico">${ICONS.box}</span><span class="pc-b"><b>${esc(p.name || p.carrierName || 'Parcel')}</b><i>${esc(ARRIVE(p) || p.statusText || (PSTAT[p.status] || PSTAT.placed)[0])}${p.carrierName ? '  ·  ' + esc(p.carrierName) : p.shop ? '  ·  ' + esc(p.shop) : ''}</i>
      <span class="pc-steps">${[0, 1, 2, 3].map(i => `<s class="${i <= (PSTEP[p.status] || 0) ? 'on' : ''}"></s>`).join('')}</span></span></a>`).join('')}
    <a class="pcard add" href="#" data-pcadd><span class="pc-ico">${ICONS.plus}</span><span class="pc-b"><b>Track a parcel</b><i>${auto ? 'Orders you place show up here' : 'Paste a tracking number'}</i></span></a>
    ${!auto && S.parcelsAuto !== false && !list.length ? `<a class="pcard auto" href="#" data-pcauto><span class="pc-ico">${ICONS.bolt}</span><span class="pc-b"><b>Save my orders</b><i>Lumen remembers orders you place</i></span></a>` : ''}
    </div>`
  }
  const appState = a => a.running ? ['Running', 'on'] : a.enabled ? ['Starting after restart', 'wait'] : ['Off', 'off']
  R.apps = () => `${head('apps', 'Surge and Koi', `<a class="hm-more hm-icob" href="lumen://settings/apps" title="Surge and Koi settings" aria-label="Surge and Koi settings">${ICONS.gear}</a>`)}<div class="ap-list" id="apps">${H.apps.map(a => { const [t, c] = appState(a); return `<button class="ap ${c}" data-app="${esc(a.id)}"><span class="ap-logo">${appLogo(a.id)}</span><span class="ap-b"><b>${esc(a.name)}</b><i class="ap-st"><s></s>${t}</i></span></button>` }).join('')}</div>`
  R.weather = () => {
    const w = H.weather, city = (S.ntpWeather || '').trim()
    if (!city || (w && w.error === 'notfound')) return `${head('weather')}<form class="wx-set" id="wxform"><p>${w && w.error === 'notfound' ? `No place called ${esc(city)}. Try another spelling.` : 'Type your city. Lumen asks Open-Meteo for its weather; it never uses your location.'}</p><div><input id="wxcity" placeholder="City" value="${esc(city)}" spellcheck="false" autocomplete="off" maxlength="80"><button class="btn primary">Show</button></div></form>`
    if (!w || w.error) return `${head('weather')}<div class="wx-err"><p>Weather is not available right now.</p><button class="btn" id="wxretry">Try again</button></div>`
    const k = wxKind(w.code, w.day)
    return `${head('weather', w.name, '<button class="hm-more" id="wxedit">Change</button>')}<div class="wx"><span class="wx-ic wx-${k}">${wxIcon(k)}</span><div><b class="wx-t">${w.temp}<sup>°${w.unit}</sup></b><span class="wx-d">${esc(WX[k][0])}</span><span class="wx-hl">High ${w.hi}°  ·  Low ${w.lo}°</span></div></div>`
  }
  R.wallpaper = () => {
    const wp = H.wp
    return `${head('wallpaper', 'Wallpaper', '<button class="hm-more" id="wpmore">More</button>')}<div class="wpq">${['theme', ...Object.keys(WALLPAPERS)].map(k => `<button class="wpqb ${k === wp ? 'on' : ''}" data-wp="${k}" title="${esc(wpName(k))}" aria-label="${esc(wpName(k))} wallpaper" aria-pressed="${k === wp}">${swatch(k)}</button>`).join('')}</div>`
  }
  R.focus = () => {
    const len = S.ntpFocus ? S.ntpFocus.len : (H.focusLen || 25 * 60e3)
    return `${head('focus')}<div class="fc">
      <div class="fc-ring" style="--p:1"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="rt" cx="60" cy="60" r="52"/><circle class="rp" cx="60" cy="60" r="52" pathLength="100"/></svg><b class="fc-t">${mmss(len)}</b><span class="fc-n"></span></div>
      <div class="fc-side"><div class="fc-len" id="fclen">${[15, 25, 50].map(m => `<button data-m="${m}" class="${len === m * 60e3 ? 'on' : ''}">${m}<small>min</small></button>`).join('')}</div>
      <div class="fc-acts"><button class="btn primary" id="fcgo"></button><button class="ib fc-reset" id="fcreset" title="Reset" aria-label="Reset">${ICONS.reload}</button></div></div></div>`
  }
  R.notes = () => `${head('notes', 'Quick note', '<span class="hm-note" id="ntsaved"></span>')}<textarea class="nt" id="hmnote" placeholder="Jot something down. It saves as you type." spellcheck="true" maxlength="4000">${esc(S.ntpNote || '')}</textarea>`
  R.calendar = () => {
    const now = new Date(), off = H.calOff || 0, m = new Date(now.getFullYear(), now.getMonth() + off, 1)
    let first = 1; try { const lo = new Intl.Locale(navigator.language), wi = lo.weekInfo || lo.getWeekInfo(); first = wi.firstDay % 7 } catch { first = /^en-US/.test(navigator.language) ? 0 : 1 }
    const lead = (m.getDay() - first + 7) % 7, days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
    const names = [...Array(7)].map((_, i) => new Date(2024, 0, 7 + first + i).toLocaleDateString([], { weekday: 'narrow' }))
    const cells = []
    for (let i = 0; i < lead; i++) cells.push('<i></i>')
    for (let d = 1; d <= days; d++) {
      const dd = new Date(m.getFullYear(), m.getMonth(), d), today = dd.toDateString() === now.toDateString(), wk = dd.getDay() === 0 || dd.getDay() === 6
      cells.push(`<b class="${today ? 'today' : ''}${wk ? ' wk' : ''}${dd < new Date(now.toDateString()) ? ' past' : ''}" title="${esc(dd.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))}">${d}</b>`)
    }
    return `${head('calendar', m.toLocaleDateString([], { month: 'long', year: m.getFullYear() === now.getFullYear() ? undefined : 'numeric' }), `<div class="cal-nav">${off ? '<button class="hm-more" data-cal="0">Today</button>' : ''}<button class="ib" data-cal="-1" aria-label="Previous month">${XI.left}</button><button class="ib" data-cal="1" aria-label="Next month">${XI.right}</button></div>`)}
      <div class="cal"><div class="cal-h">${names.map(n => `<span>${esc(n)}</span>`).join('')}</div><div class="cal-g">${cells.join('')}</div></div>`
  }
  // world clocks (setting ntpZones)
  const ZONES0 = ['America/New_York', 'Europe/London', 'Asia/Tokyo']
  const zones = () => { const here = Intl.DateTimeFormat().resolvedOptions().timeZone; const z = Array.isArray(S.ntpZones) && S.ntpZones.length ? S.ntpZones : ZONES0.filter(x => x !== here); return z.slice(0, 4) }
  const cityOf = z => z.split('/').pop().replace(/_/g, ' ')
  function zoneRow(z, d = new Date()) {
    let t = '', day = '', hr = 12
    try {
      t = d.toLocaleTimeString([], { timeZone: z, hour: 'numeric', minute: '2-digit' })
      hr = +new Intl.DateTimeFormat('en-US', { timeZone: z, hour: 'numeric', hourCycle: 'h23' }).format(d)
      const ymd = o => new Intl.DateTimeFormat('en-CA', { timeZone: o, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
      const a = ymd(z), b = ymd(Intl.DateTimeFormat().resolvedOptions().timeZone)
      day = a > b ? 'Tomorrow' : a < b ? 'Yesterday' : 'Today'
    } catch { t = '--' }
    const night = hr < 6 || hr >= 19
    return `<div class="zc ${night ? 'night' : ''}" data-z="${esc(z)}"><span class="zc-ic">${night ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"/></svg>' : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/></svg>'}</span><span class="zc-b"><b>${esc(cityOf(z))}</b><i>${day}</i></span><em>${esc(t)}</em><button class="tx zc-x" title="Remove" aria-label="Remove ${esc(cityOf(z))}">${ICONS.close}</button></div>`
  }
  function paintZones(d = new Date()) { const box = qs('#zones'); if (!box) return; const html = zones().map(z => zoneRow(z, d)).join(''); if (box.dataset.v !== html) { box.dataset.v = html; box.innerHTML = html } }
  R.clocks = () => `${head('clocks', 'World clocks', zones().length < 4 ? '<button class="hm-more" id="zadd">Add</button>' : '')}<div class="zl" id="zones"></div>
    <form class="zform hidden" id="zform"><input id="zin" list="zlist" placeholder="Type a city, like Paris" spellcheck="false" autocomplete="off"><datalist id="zlist"></datalist><button class="btn primary">Add</button></form>`
  R.bookmarks = () => `${head('bookmarks', 'Bookmarks', '<a class="hm-more" href="lumen://bookmarks">All</a>')}<div class="bk">${H.bookmarks.map(b => `<a class="bkc" href="${esc(b.url)}" title="${esc(b.url)}">${siteFace(b.url)}<span>${esc(b.title || hostOf(b.url))}</span></a>`).join('')}</div>`
  R.highlights = () => {
    const h = H.highlights[H.hl % H.highlights.length]
    const col = { yellow: '#ffd43b', green: '#51cf66', blue: '#4dabf7', pink: '#f783ac', purple: '#b197fc' }[h.color] || 'var(--ic)'
    return `${head('highlights', 'From your highlights', H.highlights.length > 1 ? '<button class="hm-more" id="hlnext">Another</button>' : '')}<a class="hq" href="${esc(h.url)}" style="--hc:${col}"><q>${esc(h.text.length > 240 ? h.text.slice(0, 237) + '...' : h.text)}</q><span>${siteFace(h.url)}<b>${esc(h.title || hostOf(h.url))}</b></span></a>`
  }
  const fmtB = n => { if (!n) return '0 B'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++ } return n.toFixed(i ? 1 : 0) + ' ' + u[i] }
  R.downloads = () => `${head('downloads', 'Downloads', '<a class="hm-more" href="lumen://downloads">All</a>')}<div class="dls" id="dls">${H.downloads.map(d => {
    const p = d.total ? Math.min(1, d.received / d.total) : 0, done = d.state === 'completed'
    const ext = ((d.name || '').split('.').pop() || '').slice(0, 4).toUpperCase()
    return `<button class="dlr ${esc(d.state)}" data-dl="${d.id}" title="${done ? 'Open' : ''}"><span class="dl-ic">${esc(ext || 'FILE')}</span><span class="dl-b"><b>${esc(d.name || 'Download')}</b><i>${done ? (d.exists === false ? 'Moved or deleted' : fmtB(d.total || d.received)) : d.state === 'progressing' ? `${fmtB(d.received)} of ${fmtB(d.total)}` : d.state === 'cancelled' ? 'Cancelled' : 'Failed'}</i>${d.state === 'progressing' ? `<s style="--p:${p.toFixed(3)}"></s>` : ''}</span></button>`
  }).join('')}</div>`
  R.privacy = () => `<span class="hm-wm" aria-hidden="true">${ic(WIDGETS.privacy.icon)}</span><div class="hm-h">${icTile('privacy')}<b>How private works</b></div><ul class="pv">
    <li>${ICONS.clock}<span><b>No history</b>Pages you visit here are not saved.</span></li>
    <li>${ICONS.trash}<span><b>Cookies go away</b>Sign-ins and site data are wiped when you close this window.</span></li>
    <li>${ICONS.download}<span><b>Downloads stay</b>Files you download and bookmarks you add are kept.</span></li></ul>`

  // which widgets show, in their order
  function visibleWidgets() {
    if (H.private) return ['shortcuts', 'privacy', 'stats'].filter(id => id !== 'shortcuts' || H.sites.length)
    // widgets with nothing to show yet stay out of the way until they do
    const has = { apps: H.apps.length, bookmarks: H.bookmarks.length, highlights: H.highlights.length, downloads: H.downloads.length }
    return order().filter(id => widgetOn(id) && (!(id in has) || has[id]))
  }
  const card = (id, i) => `<section class="hm-card hm-lq w-${id}${id === 'parcels' ? ' recent parcels' : id === 'later' ? ' later' : id === 'recent' ? ' recent' : ''}" data-w="${id}" style="--i:${i};--ic:oklch(from var(--accent) l c calc(h + ${WIDGETS[id].hue}))" aria-label="${esc(WIDGETS[id].name)}">${R[id]()}</section>`

  // spread the widgets over the columns so every row is full: the last widget of a row takes what is left
  function layout() {
    const g = qs('#widgets'); if (!g) return
    const w = g.clientWidth, cols = w >= 880 ? 6 : w >= 600 ? 4 : 2
    g.style.setProperty('--cols', cols)
    const items = [...g.children].filter(e => e.dataset.w)
    let row = [], used = 0
    const flush = () => { if (row.length) { const last = row[row.length - 1]; last.sp += cols - used } for (const r of row) r.el.style.gridColumn = 'span ' + r.sp; row = []; used = 0 }
    for (const el of items) {
      const want = spanOf(el.dataset.w)
      let sp = cols === 6 ? want : cols === 4 ? (want >= 4 ? 4 : 2) : 2
      if (used + sp > cols) flush()
      row.push({ el, sp }); used += sp
      if (used === cols) flush()
    }
    flush()
  }

  function renderGrid(enter) {
    const g = qs('#widgets'); if (!g) return
    const ids = visibleWidgets()
    g.classList.toggle('enter', !!enter)
    g.innerHTML = ids.map(card).join('') || '<p class="hm-none">Every widget is switched off. Turn them on in Customize.</p>'
    layout(); bindGrid(); countUp()
  }
  function rerender(id) {
    const el = qs(`#widgets [data-w="${id}"]`); if (!el) return
    el.innerHTML = R[id](); bindGrid(); if (id === 'stats') countUp()
  }
  function countUp(box) {
    if (box) { box.querySelectorAll('[data-n]').forEach(countOne); return }
    countOne(qs('#stn'))
  }
  function countOne(n) {
    if (!n || still()) return
    const to = +n.dataset.n; if (!to) { n.textContent = '0'; return }
    // counts up on the wall clock (an ease-out with a tiny overshoot), so a slow frame never leaves it short
    const t0 = performance.now(), dur = 1100
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3)
      n.textContent = Math.round(to * e).toLocaleString('en-US')
      if (k < 1 && n.isConnected) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  // ---------------------------------------------------------------- drag to rearrange, on springs (widgets and shortcut tiles)
  // Items move with the individual CSS translate / scale / rotate properties, so Jelly's own transform hover still works.
  const bodies = new WeakMap()
  function bodyOf(el) {
    let b = bodies.get(el); if (b) return b
    // the card in your hand gets its own layer (so following the pointer only composites); at rest the layer goes
    const render = () => { el.style.translate = `${b.x.v.toFixed(2)}px ${b.y.v.toFixed(2)}px`; el.style.scale = b.s.v.toFixed(4); el.style.rotate = b.r.v.toFixed(3) + 'deg'; if (!b.x.v && !b.y.v && b.s.v === 1 && !b.r.v && !b.drag) { el.style.translate = el.style.scale = el.style.rotate = ''; el.style.removeProperty('will-change') } else if (b.drag && !el.style.willChange) el.style.willChange = 'translate, scale, rotate' }
    b = { x: new Jelly.Spring(0, 'jelly', render), y: new Jelly.Spring(0, 'jelly', render), s: new Jelly.Spring(1, 'bounce', render), r: new Jelly.Spring(0, 'jelly', render), drag: false }
    bodies.set(el, b); return b
  }
  // move `el` to before `ref` (or to the end), springing every item from its old place to its new one
  function flipMove(box, sel, el, ref, after) {
    const items = [...box.querySelectorAll(sel)]
    const before = new Map(items.map(e => [e, [e.offsetLeft, e.offsetTop]]))
    box.insertBefore(el, ref); if (after) after()
    for (const e of items) {
      if (bodies.get(e) && bodies.get(e).drag) continue
      const [l, t] = before.get(e), dl = l - e.offsetLeft, dt = t - e.offsetTop
      if (!dl && !dt) continue
      const b = bodyOf(e); b.x.set(b.x.v + dl); b.y.set(b.y.v + dt); b.x.to(0); b.y.to(0)
    }
  }
  function sortable(box, { item, handle, onDrop, after }) {
    box.addEventListener('pointerdown', e => {
      if (e.button !== 0 || H.private) return
      const h = e.target.closest(handle); if (!h || !box.contains(h)) return
      if (e.target.closest('input, textarea, a, button:not(.hm-grip):not(.tile), .tx')) return
      const el = h.closest(item); if (!el || !el.parentNode || el.parentNode !== box) return
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop
      let on = false, last = null, lx = sx
      const b = bodyOf(el)
      const place = ev => { b.x.set(ev.clientX - sx - (el.offsetLeft - ox)); b.y.set(ev.clientY - sy - (el.offsetTop - oy)) }
      const move = ev => {
        if (!on) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 7) return
          on = true; b.drag = true; el.classList.add('dragging'); box.classList.add('sorting'); b.s.to(1.04)
          try { el.setPointerCapture(e.pointerId) } catch {}
        }
        place(ev)
        b.r.to(Math.max(-3, Math.min(3, (ev.clientX - lx) * 0.18))); lx = ev.clientX
        const br = box.getBoundingClientRect(), px = ev.clientX - br.left + box.scrollLeft, py = ev.clientY - br.top
        const over = [...box.querySelectorAll(item)].find(o => o !== el && px >= o.offsetLeft && px <= o.offsetLeft + o.offsetWidth && py >= o.offsetTop && py <= o.offsetTop + o.offsetHeight)
        if (!over) { last = null; return }
        if (over === last) return
        last = over
        const list = [...box.querySelectorAll(item)], a = list.indexOf(el), t = list.indexOf(over)
        flipMove(box, item, el, a < t ? over.nextSibling : over, after)
        place(ev)
      }
      const up = () => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up)
        if (!on) return
        b.drag = false; el.classList.remove('dragging'); box.classList.remove('sorting')
        b.x.to(0); b.y.to(0); b.s.to(1); b.r.to(0)
        // the click that ends a drag does not open anything
        const eat = ev => { ev.stopPropagation(); ev.preventDefault() }
        el.addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => el.removeEventListener('click', eat, { capture: true }), 0)
        onDrop([...box.querySelectorAll(item)])
      }
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up)
    })
  }
  const saveOrder = list => { const ids = list.map(e => e.dataset.w); const rest = order().filter(id => !ids.includes(id)); S.ntpOrder = [...ids, ...rest]; return L.invoke('setSetting', 'ntpOrder', S.ntpOrder) }
  // the grip also works from the keyboard: arrows move the widget one place
  function keyMove(e) {
    const gb = e.target.closest('.hm-grip'); if (!gb) return
    const k = e.key; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) return
    e.preventDefault()
    const box = qs('#widgets'), el = gb.closest('[data-w]'), list = [...box.querySelectorAll('[data-w]')], i = list.indexOf(el)
    const j = k === 'ArrowLeft' || k === 'ArrowUp' ? i - 1 : i + 1
    if (j < 0 || j >= list.length) return
    flipMove(box, '[data-w]', el, j > i ? list[j].nextSibling : list[j], layout)
    const b = bodyOf(el); b.s.set(1.05); b.s.to(1)
    gb.focus(); saveOrder([...box.querySelectorAll('[data-w]')])
  }

  // ---------------------------------------------------------------- binding
  function bindGrid() {
    const g = qs('#widgets')
    const tiles = qs('#tiles')
    if (tiles && !tiles.dataset.b) {
      tiles.dataset.b = 1
      tiles.onclick = e => {
        if (e.target.closest('#addtile')) return addShortcutDialog(sc => saveSites([...H.sites, sc]))
        const t = e.target.closest('.tile'); if (!t || t.id === 'addtile') return
        if (e.target.closest('.tx')) { e.stopPropagation(); return saveSites(H.sites.filter((_, i) => i !== +t.dataset.i)) }
        if (e.metaKey || e.ctrlKey) L.invoke('open', t.dataset.url, true); else L.invoke('navigate', t.dataset.url)
      }
      tiles.onkeydown = e => { if (e.key === 'Enter' && e.target.id === 'addtile') e.target.click() }
      sortable(tiles, { item: '.tile:not(.add)', handle: '.tile:not(.add)', onDrop: list => { const next = list.map(e => H.sites[+e.dataset.i]); if (next.some((s, i) => s !== H.sites[i])) saveSites(next, true) } })
    }
    const pc = qs('#pc')
    if (pc) pc.onclick = e => {
      if (e.target.closest('[data-pcadd]')) { e.preventDefault(); return addParcelDialog(async () => { H.parcels = ((await L.invoke('parcels')) || []).slice(0, 4); rerender('parcels'); heroText() }) }
      if (e.target.closest('[data-pcauto]')) { e.preventDefault(); L.invoke('setSetting', 'parcelsAuto', true).then(() => { S.parcelsAuto = true; flash('Orders you place will be saved here'); rerender('parcels') }); return }
      const a = e.target.closest('[data-pid]'); if (!a) return
      e.preventDefault(); L.invoke('parcelOpen', a.dataset.pid, e.metaKey || e.ctrlKey)
    }
    const rl = qs('#rl')
    if (rl) rl.onclick = async e => {
      const a = e.target.closest('[data-rl]'); if (!a) return
      e.preventDefault()
      await L.invoke('readLaterDone', a.dataset.rl)
      if (e.target.closest('.rl-x')) {
        a.style.transition = 'opacity .25s, transform .35s cubic-bezier(.3,1.4,.5,1)'; a.style.opacity = '0'; a.style.transform = 'scale(.92)'
        const later = (await L.invoke('readLater', 300)) || []; H.laterCount = later.length; H.later = later.slice(0, 4)
        setTimeout(() => { rerender('later'); heroText() }, 260); return
      }
      if (e.metaKey || e.ctrlKey) { L.invoke('open', a.dataset.rl, true); a.remove() } else L.invoke('navigate', a.dataset.rl)
    }
    const recentRows = qs('.w-recent .hm-rows')
    if (recentRows) recentRows.onclick = e => { const a = e.target.closest('a.hm-row'); if (!a) return; e.preventDefault(); if (e.metaKey || e.ctrlKey) L.invoke('open', a.href, true); else L.invoke('navigate', a.href) }
    const apps = qs('#apps')
    if (apps) apps.onclick = async e => {
      const b = e.target.closest('[data-app]'); if (!b) return
      const a = H.apps.find(x => x.id === b.dataset.app)
      if (a && a.running) { if (!(await L.invoke('appOpen', a.id, 'open'))) location.href = 'lumen://settings/apps' } else location.href = 'lumen://settings/apps'
    }
    const adon = qs('#adon'); if (adon) adon.onclick = async () => { await L.invoke('setSetting', 'adblock', true); H.home.adblock = true; rerender('stats'); flash('Ad blocker is on') }
    const wf = qs('#wxform'); if (wf) wf.onsubmit = async e => {
      e.preventDefault(); const v = qs('#wxcity').value.trim(); if (!v) return
      S.ntpWeather = v; await L.invoke('setSetting', 'ntpWeather', v)
      const box = qs('.w-weather'); if (box) box.classList.add('busy')
      await loadWeather(); rerender('weather'); heroText()
    }
    const wr = qs('#wxretry'); if (wr) wr.onclick = async () => { await loadWeather(); rerender('weather'); heroText() }
    const we = qs('#wxedit'); if (we) we.onclick = () => { const el = qs('.w-weather'); el.innerHTML = `${head('weather')}<form class="wx-set" id="wxform"><p>Type your city. Lumen asks Open-Meteo for its weather; it never uses your location.</p><div><input id="wxcity" placeholder="City" value="${esc(S.ntpWeather || '')}" spellcheck="false" autocomplete="off" maxlength="80"><button class="btn primary">Show</button></div></form>`; bindGrid(); qs('#wxcity').focus(); qs('#wxcity').select() }
    const rcseg = qs('#rcseg'); if (rcseg) rcseg.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; H.recentTab = b.dataset.v; rerender('recent') }
    // focus
    const fl = qs('#fclen'); if (fl) fl.onclick = e => {
      const b = e.target.closest('[data-m]'); if (!b) return
      const len = +b.dataset.m * 60e3; H.focusLen = len
      const F = S.ntpFocus
      if (F && F.end) { saveFocus({ ...F, len, end: Date.now() + len }) } else saveFocus({ len, end: 0, left: 0, done: focusDone(), day: todayKey() })
      fl.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); focusTick()
    }
    const go = qs('#fcgo'); if (go) go.onclick = () => {
      const F = S.ntpFocus, len = F ? F.len : (H.focusLen || 25 * 60e3)
      if (F && F.end) saveFocus({ ...F, end: 0, left: Math.max(1000, F.end - Date.now()) })            // pause
      else saveFocus({ len, end: Date.now() + (F && F.left ? F.left : len), left: 0, done: focusDone(), day: todayKey() })   // start or resume
      const c = qs('[data-w="focus"]'); if (c && window.Jelly) Jelly.kick(c, .6, .4)
      focusTick()
    }
    const fr = qs('#fcreset'); if (fr) fr.onclick = () => { const F = S.ntpFocus; saveFocus(F ? { len: F.len, end: 0, left: 0, done: focusDone(), day: todayKey() } : null); focusTick() }
    if (qs('[data-w="focus"]')) paintFocus()
    // note: saves as you type
    const nt = qs('#hmnote'); if (nt && !nt.dataset.b) {
      nt.dataset.b = 1; let t = 0
      nt.oninput = () => { clearTimeout(t); const sv = qs('#ntsaved'); if (sv) sv.textContent = 'Saving'; t = setTimeout(async () => { S.ntpNote = nt.value; await L.invoke('setSetting', 'ntpNote', nt.value); const s2 = qs('#ntsaved'); if (s2) s2.textContent = 'Saved' }, 450) }
    }
    // calendar
    const cn = qs('.cal-nav'); if (cn) cn.onclick = e => { const b = e.target.closest('[data-cal]'); if (!b) return; H.calOff = +b.dataset.cal === 0 ? 0 : (H.calOff || 0) + +b.dataset.cal; rerender('calendar'); const g2 = qs('.cal-g'); if (g2 && window.Jelly && !still()) g2.animate([{ transform: `translateX(${+b.dataset.cal * 18}px)`, opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: Jelly.EASE }) }
    // world clocks: add a city, remove one
    if (qs('#zones')) {
      paintZones()
      qs('#zones').onclick = async e => { const x = e.target.closest('.zc-x'); if (!x) return; const z = x.closest('[data-z]').dataset.z; S.ntpZones = zones().filter(v => v !== z); await L.invoke('setSetting', 'ntpZones', S.ntpZones); rerender('clocks') }
      const za = qs('#zadd'); if (za) za.onclick = () => {
        const f = qs('#zform'); f.classList.toggle('hidden')
        if (!f.classList.contains('hidden')) { const dlst = qs('#zlist'); if (!dlst.children.length) { let all = []; try { all = Intl.supportedValuesOf('timeZone') } catch {} dlst.innerHTML = all.map(z => `<option value="${esc(cityOf(z))}">${esc(z)}</option>`).join('') } qs('#zin').focus() }
      }
      qs('#zform').onsubmit = async e => {
        e.preventDefault()
        const v = qs('#zin').value.trim().toLowerCase().replace(/\s+/g, '_'); if (!v) return
        let all = []; try { all = Intl.supportedValuesOf('timeZone') } catch {}
        const z = all.find(x => x.toLowerCase() === v) || all.find(x => x.split('/').pop().toLowerCase() === v) || all.find(x => x.toLowerCase().includes(v))
        if (!z) { flash('No time zone for that city. Try a big city nearby.'); return }
        S.ntpZones = [...zones().filter(x => x !== z), z].slice(-4); await L.invoke('setSetting', 'ntpZones', S.ntpZones); rerender('clocks')
      }
    }
    const hn = qs('#hlnext'); if (hn) hn.onclick = () => { H.hl++; rerender('highlights'); const q = qs('.hq'); if (q && !still()) q.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: Jelly.EASE }) }
    const hq = qs('.hq'); if (hq) hq.onclick = e => { e.preventDefault(); L.invoke('navigate', hq.getAttribute('href')) }
    const bk = qs('.bk'); if (bk) bk.onclick = e => { const a = e.target.closest('a.bkc'); if (!a) return; e.preventDefault(); if (e.metaKey || e.ctrlKey) L.invoke('open', a.href, true); else L.invoke('navigate', a.href) }
    const dls = qs('#dls'); if (dls) {
      dls.onclick = e => { const b = e.target.closest('[data-dl]'); if (!b) return; L.invoke('download', +b.dataset.dl, b.classList.contains('completed') ? 'open' : 'show') }
      // only while something is downloading and the page is shown: refresh the bars every 2 s
      clearInterval(H.dlT)
      if (H.downloads.some(d => d.state === 'progressing')) H.dlT = setInterval(async () => { if (document.hidden || !qs('#dls')) return clearInterval(H.dlT); H.downloads = ((await L.invoke('downloads')) || []).slice(0, 3); rerender('downloads') }, 2000)
    }
    g.querySelectorAll('.wpq [data-wp]').forEach(b => b.onclick = () => setWallpaper(b.dataset.wp))
    const wm = qs('#wpmore'); if (wm) wm.onclick = openDrawer
  }
  async function saveSites(list, quiet) {
    H.sites = list; H.custom = true; S.ntpShortcuts = list
    await L.invoke('setSetting', 'ntpShortcuts', list)
    if (!quiet) rerender('shortcuts')
    else { const t = qs('#tiles'); if (t) [...t.querySelectorAll('.tile:not(.add)')].forEach((e, i) => e.dataset.i = i); const n = qs('.w-shortcuts .hm-h b'); if (n) n.textContent = 'Your shortcuts' }
  }
  async function setWallpaper(k) {
    S.ntpWallpaper = k; await L.invoke('setSetting', 'ntpWallpaper', k)
    H.wp = k; await paintWallpaper(true)
    document.querySelectorAll('[data-wp]').forEach(b => { const on = b.dataset.wp === k; b.classList.toggle('on', on); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', on) })
    const up = qs('#wpup'); if (up) up.classList.toggle('on', k === 'custom')
  }
  // ---------------------------------------------------------------- theme backgrounds
  // One per browser theme (ui/themes.js), plus Match theme, which follows whichever theme is on (the default).
  const isThemeKey = k => k === 'theme' || /^th:/.test(k || '')
  const themeIdOf = k => k === 'theme' ? (S.browserTheme || 'default') : String(k).slice(3)
  const themeSig = () => (S.browserTheme || 'default') + JSON.stringify(S.themeCustom || {})
  // { bg, dark, glass } for a theme key, or null when the theme has no background of its own (Default)
  function themeOf(k) {
    if (!isThemeKey(k)) return null
    const id = themeIdOf(k), T = window.LUMEN_THEMES || {}
    const t = id === 'custom' ? (window.themeBg ? themeBg('custom', S.themeCustom) : null) : T[id]
    return t && t.bg ? { bg: t.bg, dark: !!t.dark, glass: !!t.glass } : null
  }
  function wpKey() {
    const k = S.ntpWallpaper
    if (k === 'custom' || WALLPAPERS[k] || k === 'theme') return k
    if (/^th:/.test(k || '') && (window.LUMEN_THEMES || {})[k.slice(3)]) return k
    return 'theme'
  }
  const themeTiles = () => ['theme', ...Object.keys(window.LUMEN_THEMES || {}).map(id => 'th:' + id)]
  const wpName = k => k === 'theme' ? 'Match theme' : isThemeKey(k) ? ((window.LUMEN_THEMES || {})[k.slice(3)] || {}).name || 'Theme' : (WALLPAPERS[k] || {}).name || ''
  // a swatch: the background, with a little pane of liquid glass on it
  function swatch(k) {
    const look = themeOf(k)
    if (look) return `<i class="wpsw wp-theme lqsw${look.glass ? ' wp-glass' : ''}${look.dark ? ' dk' : ''}" style="--thbg:${esc(look.bg)}"></i>`
    return `<i class="wpsw wp-${isThemeKey(k) ? 'aurora' : k}${isThemeKey(k) ? ' lqsw' : ''}"></i>`
  }
  // the wallpaper layer cross-fades to the next one
  // Sky follows the hour: Glow at dawn, Aurora by day, Dusk in the evening, Nebula at night
  const skyFor = (h = new Date().getHours()) => h >= 5 && h < 9 ? 'sunset' : h >= 9 && h < 17 ? 'aurora' : h >= 17 && h < 20 ? 'dusk' : 'nebula'
  async function paintWallpaper(fade) {
    const ntp = qs('#ntp'); if (!ntp) return
    H.sky = skyFor()
    H.themeSeen = themeSig()
    const wp = H.wp === 'auto' ? H.sky : H.wp, img = wp === 'custom' ? await L.invoke('wallpaper') : ''
    const look = H.private ? null : themeOf(wp)
    const meta = WALLPAPERS[wp] || {}
    // a theme background brings its own light or dark; the others are dark when the wallpaper always is
    const onDark = H.private || wp === 'custom' || (look ? look.dark : !!meta.dark)
    ntp.classList.toggle('on-dark', onDark)
    ntp.classList.toggle('on-light', !!(look && !look.dark))
    for (const k of [...ntp.classList]) if (k.startsWith('wp-')) ntp.classList.remove(k)
    const cls = H.private ? 'private' : look ? 'theme' : isThemeKey(wp) ? 'aurora' : wp
    ntp.classList.add('wp-' + (H.private ? 'private' : isThemeKey(wp) ? 'theme' : wp))
    const old = ntp.querySelector('.ntp-bg')
    const bg = document.createElement('div'); bg.className = 'ntp-bg wpsw wp-' + cls + (look && look.glass ? ' wp-glass' : '')
    if (look) bg.style.setProperty('--thbg', look.bg)
    // the Match theme tiles show whatever theme is on now
    document.querySelectorAll('[data-wp="theme"] i').forEach(i => { i.outerHTML = swatch('theme') })
    if (wp === 'custom' && img && !H.private) bg.style.backgroundImage = `url('${img}')`
    if (old && fade && !still()) { bg.classList.add('fadein'); old.after(bg); setTimeout(() => old.remove(), 700) } else { if (old) old.replaceWith(bg); else ntp.prepend(bg) }
  }

  // ---------------------------------------------------------------- search with suggestions
  function bindSearch() {
    const f = qs('#sf'), q = qs('#q'), box = qs('#sug')
    let items = [], sel = -1, seq = 0, t = 0, typed = ''
    const go = (it, bg) => { if (!it) return; if (it.ask) return L.invoke('homeCmd', { ask: it.ask }); if (it.tab) return L.invoke('navigate', it.url); if (bg) L.invoke('open', it.url || it.text, true); else L.invoke('navigate', it.url || it.text) }
    const close = () => { box.classList.remove('open'); f.parentNode.classList.remove('sugging'); items = []; sel = -1 }
    const paint = () => box.querySelectorAll('.sg').forEach((e, i) => e.classList.toggle('on', i === sel))
    const draw = (r, text) => {
      items = []
      const answer = r.calc != null ? `${text.replace(/^=/, '')} = ${Number(r.calc).toLocaleString('en-US', { maximumFractionDigits: 10 })}` : r.conv ? r.conv.text : ''
      const rows = []
      if (answer) rows.push(`<div class="sg-answer">${ICONS.sparkle}<b>${esc(answer)}</b></div>`)
      const add = (it, ic, title, sub, kind) => { items.push(it); rows.push(`<button type="button" class="sg" data-n="${items.length - 1}"><span class="sg-ic">${ic}</span><span class="sg-b"><b>${title}</b>${sub ? `<i>${sub}</i>` : ''}</span>${kind ? `<em>${kind}</em>` : ''}</button>`) }
      const hl = s => { const i = s.toLowerCase().indexOf(text.toLowerCase()); return i < 0 || !text ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + text.length)) + '</mark>' + esc(s.slice(i + text.length)) }
      const question = text && (/\?$/.test(text) || /^(how|why|what|who|when|where|which|can|should|explain|write|summarize|compare)\b/i.test(text)) && text.split(/\s+/).length >= 3
      if (question) add({ ask: text }, ICONS.sparkle, hl(text), '', 'Ask Lumen AI')
      if (text) add({ text }, ICONS.search, hl(text), '', ENGINES[S.searchEngine] || 'Google')
      for (const s of (r.search || []).filter(x => x.toLowerCase() !== text.toLowerCase()).slice(0, 4)) add({ text: s }, ICONS.search, hl(s), '', '')
      for (const b of (r.bookmarks || []).slice(0, 2)) add({ url: b.url }, ICONS.star, hl(b.title || hostOf(b.url)), esc(hostOf(b.url)), 'Bookmark')
      for (const h of (r.history || []).slice(0, text ? 4 : 5)) add({ url: h.url }, siteFace(h.url), hl(h.title || hostOf(h.url)), esc(hostOf(h.url)), text ? 'History' : 'Top site')
      if (!rows.length) return close()
      box.innerHTML = rows.join(''); sel = -1
      box.classList.add('open'); f.parentNode.classList.add('sugging')
    }
    const ask = async () => {
      const text = q.value.trim(), my = ++seq
      if (!text) return close()
      // local results (history, bookmarks) at once; the search engine's suggestions join when they arrive
      let r = null; try { r = await L.invoke('suggest', text, { local: true }) } catch {}
      if (my !== seq || !r) return
      draw(r, text)
      if (!r.webPending) return
      await new Promise(res => setTimeout(res, 90)); if (my !== seq) return   // a pause in typing before the network
      let search = null; try { search = await L.invoke('suggestWeb', text) } catch {}
      // not while you are arrowing through the list: the rows would move under the selection
      if (my !== seq || !search || !search.length || sel >= 0) return
      r.search = search; draw(r, text)
    }
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(ask, 12) })
    // a click in the empty pill shows your top sites
    q.addEventListener('click', async () => { if (q.value.trim() || box.classList.contains('open')) return; const my = ++seq; let r = null; try { r = await L.invoke('suggest', '') } catch {} if (my === seq && r && !q.value.trim()) draw(r, '') })
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return
        e.preventDefault()
        if (sel === -1) typed = q.value
        const n = items.length
        sel = e.key === 'ArrowDown' ? (sel + 1 >= n ? -1 : sel + 1) : (sel - 1 < -1 ? n - 1 : sel - 1)
        paint(); q.value = sel >= 0 && items[sel].text ? items[sel].text : typed
      }
      else if (e.key === 'Escape') { if (box.classList.contains('open')) { e.preventDefault(); close() } }
    })
    box.addEventListener('pointerdown', e => e.preventDefault())
    box.addEventListener('click', e => { const b = e.target.closest('.sg'); if (!b) return; go(items[+b.dataset.n], e.metaKey || e.ctrlKey); close() })
    q.addEventListener('blur', () => setTimeout(close, 120))
    f.onsubmit = e => { e.preventDefault(); if (sel >= 0 && items[sel]) return go(items[sel]); const v = q.value.trim(); if (v) L.invoke('navigate', v) }
    qs('#kcmd').onclick = () => L.invoke('homeCmd', 'palette')
    // the engine chip: pick where searches go
    const engs = qs('#engs'), keng = qs('#keng')
    const closeEngs = () => { engs.classList.remove('open'); keng.setAttribute('aria-expanded', 'false') }
    keng.onclick = e => {
      e.stopPropagation()
      if (engs.classList.contains('open')) return closeEngs()
      engs.innerHTML = Object.entries(ENGINES).map(([k, n]) => `<button type="button" class="eg ${k === (S.searchEngine || 'google') ? 'on' : ''}" data-eng="${esc(k)}" role="option"><span class="hm-face" style="--th:${hue(n)}"><b>${esc(n[0])}</b></span><b>${esc(n)}</b>${k === (S.searchEngine || 'google') ? `<i>${ICONS.check}</i>` : ''}</button>`).join('')
      engs.classList.add('open'); keng.setAttribute('aria-expanded', 'true')
      const r = keng.getBoundingClientRect(), br = engs.parentNode.getBoundingClientRect()
      engs.style.left = Math.max(0, Math.min(br.width - 230, r.left - br.left + r.width / 2 - 115)) + 'px'
    }
    engs.onclick = async e => {
      const b = e.target.closest('[data-eng]'); if (!b) return
      S.searchEngine = b.dataset.eng; await L.invoke('setSetting', 'searchEngine', b.dataset.eng)
      const n = ENGINES[b.dataset.eng]; keng.querySelector('span').textContent = n; if (!H.private) q.placeholder = `Search ${n} or type an address`
      closeEngs(); q.focus(); flash('Searches now go to ' + n)
    }
    document.addEventListener('pointerdown', e => { if (!e.target.closest('#engs, #keng')) closeEngs() })
    qs('#kask').onclick = () => { const v = q.value.trim(); L.invoke('homeCmd', v ? { ask: v } : 'ai') }
  }

  // ---------------------------------------------------------------- customize drawer
  function drawerHTML() {
    const style = clockStyle(), wp = H.wp
    const all = order().filter(id => id !== 'apps' || H.apps.length)
    return `<aside class="drawer" id="drawer" aria-label="Customize">
    <div class="dh"><b>Customize</b><button class="ib" id="dclose" title="Close" aria-label="Close">${ICONS.close}</button></div>
    <p class="dsub">Make your home yours. Drag widgets on the page to move them.</p>
    <div class="dl">Clock</div>
    <div class="clkpick" id="clk">${[['glass', 'Display', '<b>9:41</b>'], ['minimal', 'Stacked', '<b>09\n<i>41</i></b>'], ['analog', 'Watch', '<b></b>'], ['off', 'Off', '<b></b>']].map(([v, l, art]) => `<button class="clkb ${style === v ? 'on' : ''}" data-clk="${v}" title="${l} clock"><i class="cp cp-${v}">${art}</i><span>${l}</span></button>`).join('')}</div>
    <div class="dl">Banner layout</div>
    <div class="seg" id="hlay"><button data-v="modern" class="${heroLayout() === 'modern' ? 'on' : ''}" title="Words on the left, clock on the right">Modern</button><button data-v="classic" class="${heroLayout() === 'classic' ? 'on' : ''}" title="Clock on the left, words on the right">Classic</button></div>
    <div class="dl">Greeting</div>
    <label class="dfield"><span>Your name, for the greeting</span><input id="hmname" placeholder="Optional" maxlength="40" value="${esc(S.ntpName || '')}" spellcheck="false" autocomplete="off"></label>
    <div class="dl">Theme backgrounds</div>
    <div class="wps wpth">${themeTiles().map(k => `<button class="wpb ${k === wp ? 'on' : ''}" data-wp="${esc(k)}" title="${esc(wpName(k))}">${swatch(k)}<span>${esc(wpName(k))}</span></button>`).join('')}</div>
    <div class="dl">Wallpapers and photos</div>
    <div class="wps">${Object.entries(WALLPAPERS).map(([k, v]) => `<button class="wpb ${k === wp ? 'on' : ''}" data-wp="${k}" title="${v.name}">${swatch(k)}<span>${v.name}</span></button>`).join('')}
      <label class="wpb ${wp === 'custom' ? 'on' : ''}" id="wpup" title="Your own image"><i class="wpup">${ICONS.plus}</i><span>Your image</span><input type="file" id="wpfile" accept="image/*" hidden></label></div>
    <div class="dl">Shortcuts</div>
    <div class="seg" id="scmode"><button data-v="auto" class="${H.custom ? '' : 'on'}">Most visited</button><button data-v="mine" class="${H.custom ? 'on' : ''}">My shortcuts</button></div>
    <div class="dl">Widgets</div>
    <div id="wlist">${all.map(id => `<div class="drow wrow"><label class="wr-top"><span><em style="--ic:oklch(from var(--accent) l c calc(h + ${WIDGETS[id].hue}))">${ic(WIDGETS[id].icon)}</em>${esc(WIDGETS[id].name)}</span><span class="switch"><input type="checkbox" data-wsw="${id}" ${widgetOn(id) ? 'checked' : ''}><span></span></span></label><div class="wsz" aria-label="Size of ${esc(WIDGETS[id].name)}">${SIZES.map(([n, l]) => `<button data-wsz="${id}" data-v="${n}" class="${spanOf(id) === n ? 'on' : ''}">${l}</button>`).join('')}</div></div>`).join('')}</div>
    <label class="dfield ${widgetOn('weather') ? '' : 'hidden'}" id="wxrow"><span>Weather city</span><input id="hmcity" placeholder="City" maxlength="80" value="${esc(S.ntpWeather || '')}" spellcheck="false" autocomplete="off"></label>
    <div class="dl">Keys</div>
    <div class="dkeys"><span><kbd>/</kbd>Search</span><span><kbd>${cmdKey()} K</kbd>Command bar</span><span><kbd>${PLATFORM === 'darwin' ? 'Option' : 'Alt'} 1-9</kbd>Open a shortcut</span><span><kbd>Arrows</kbd>Move a widget by its grip</span></div>
    <button class="btn dreset" id="hmreset">${ICONS.reload}Reset the layout</button>
  </aside>`
  }
  // the drawer slides on a spring: a little overshoot in, a soft settle out
  let dS = null
  function drawerSpring(d) {
    if (dS && dS.el === d) return dS
    const off = () => d.offsetWidth + 40
    const sp = new Jelly.Spring(off(), 'jelly', v => {
      d.style.transform = `translateX(${v.toFixed(1)}px)`
      d.style.visibility = v >= off() - 1 && !d.classList.contains('open') ? 'hidden' : 'visible'
    })
    sp.set(off())
    dS = { el: d, sp, off }
    return dS
  }
  function openDrawer() {
    const d = qs('#drawer'); if (!d) return
    d.classList.add('open'); d.style.visibility = 'visible'; drawerSpring(d).sp.to(0)
    setTimeout(() => { const b = d.querySelector('.clkb.on'); if (b) b.focus({ preventScroll: true }) }, 60)
  }
  function closeDrawer() { const d = qs('#drawer'); if (!d) return; d.classList.remove('open'); const s2 = drawerSpring(d); s2.sp.to(s2.off()) }
  function bindDrawer() {
    const drawer = qs('#drawer'); if (!drawer) return
    drawerSpring(drawer)
    qs('#cust').onclick = () => drawer.classList.contains('open') ? closeDrawer() : openDrawer()
    qs('#dclose').onclick = closeDrawer
    drawer.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); qs('#cust').focus() } })
    qs('#ntp').addEventListener('pointerdown', e => { if (drawer.classList.contains('open') && !e.target.closest('#cust, #wpmore')) closeDrawer() })
    drawer.querySelector('#wlist').addEventListener('click', async e => {
      const b = e.target.closest('[data-wsz]'); if (!b) return
      e.preventDefault()
      const id = b.dataset.wsz, n = +b.dataset.v
      S.ntpSizes = { ...(S.ntpSizes || {}), [id]: n }; await L.invoke('setSetting', 'ntpSizes', S.ntpSizes)
      b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b))
      const box = qs('#widgets'), items = [...box.querySelectorAll('[data-w]')], before = new Map(items.map(x => [x, [x.offsetLeft, x.offsetTop]]))
      layout()
      for (const x of items) { const [l, t] = before.get(x), bd = bodyOf(x); bd.x.set(l - x.offsetLeft); bd.y.set(t - x.offsetTop); bd.x.to(0); bd.y.to(0) }
    })
    drawer.querySelectorAll('.wps [data-wp]').forEach(b => b.onclick = () => setWallpaper(b.dataset.wp))
    qs('#wpfile').onchange = async e => {
      const f = e.target.files[0]; if (!f) return
      const bmp = await createImageBitmap(f)
      const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
      if (await L.invoke('wallpaper', c.toDataURL('image/jpeg', 0.86))) setWallpaper('custom')
    }
    qs('#scmode').onclick = async e => {
      const b = e.target.closest('button'); if (!b) return
      const mine = b.dataset.v === 'mine'
      S.ntpShortcuts = mine ? H.sites.slice() : null; await L.invoke('setSetting', 'ntpShortcuts', S.ntpShortcuts)
      H.custom = mine; if (!mine) H.sites = S.homeTiles ? ((await L.invoke('topSites')) || []).map(s => ({ url: s.url, title: s.host.replace(/^www\./, '') })) : []
      rerender('shortcuts')
    }
    qs('#clk').onclick = async e => {
      const b = e.target.closest('[data-clk]'); if (!b) return
      const v = { glass: true, minimal: 'minimal', analog: 'analog', off: false }[b.dataset.clk]
      S.ntpClock = v; await L.invoke('setSetting', 'ntpClock', v)
      drawer.querySelectorAll('.clkb').forEach(x => x.classList.toggle('on', x === b))
      const slot = qs('#clockslot'); slot.innerHTML = clockMarkup(clockStyle()); qs('#hero').classList.toggle('no-clock', clockStyle() === 'off')
      buildClock(); tickClock()
    }
    qs('#hlay').onclick = async e => {
      const b = e.target.closest('[data-v]'); if (!b) return
      S.ntpBanner = b.dataset.v; applyHeroLayout()
      await L.invoke('setSetting', 'ntpBanner', b.dataset.v)
    }
    qs('#wlist').onchange = async e => {
      const s = e.target.closest('[data-wsw]'); if (!s) return
      await setWidget(s.dataset.wsw, s.checked)
      if (s.dataset.wsw === 'weather') { qs('#wxrow').classList.toggle('hidden', !s.checked); await loadWeather() }
      renderGrid(false); heroText()
    }
    let nt = 0
    qs('#hmname').oninput = e => { clearTimeout(nt); nt = setTimeout(() => { S.ntpName = e.target.value.trim(); L.invoke('setSetting', 'ntpName', S.ntpName); heroText() }, 250) }
    qs('#hmcity').onchange = async e => { S.ntpWeather = e.target.value.trim(); await L.invoke('setSetting', 'ntpWeather', S.ntpWeather); await loadWeather(); rerender('weather'); heroText() }
    qs('#hmreset').onclick = async () => {
      S.ntpOrder = []; S.ntpHide = ['weather']; S.ntpSizes = {}; await L.invoke('setSetting', 'ntpSizes', {})
      drawer.querySelectorAll('[data-wsz]').forEach(x => x.classList.toggle('on', +x.dataset.v === spanOf(x.dataset.wsz))); S.ntpRecent = S.ntpReadLater = S.ntpParcels = S.ntpStats = true
      for (const [k, v] of [['ntpOrder', []], ['ntpHide', ['weather']], ['ntpRecent', true], ['ntpReadLater', true], ['ntpParcels', true], ['ntpStats', true]]) await L.invoke('setSetting', k, v)
      drawer.querySelectorAll('[data-wsw]').forEach(x => { x.checked = widgetOn(x.dataset.wsw) }); qs('#wxrow').classList.add('hidden')
      renderGrid(false); heroText(); flash('Layout reset')
    }
  }

  // ---------------------------------------------------------------- the page
  let apT = 0
  async function refreshApps() {
    clearInterval(apT)
    if (H.private || !qs('#apps')) return
    apT = setInterval(async () => {
      if (document.hidden || !qs('#apps')) return clearInterval(apT)
      let r; try { r = await L.invoke('apps') } catch { return }
      const next = (r.list || []).filter(a => a.supported)
      if (JSON.stringify(next) !== JSON.stringify(H.apps)) { H.apps = next; rerender('apps') }
    }, 20000)
  }

  // ---------------------------------------------------------------- the entrance: everything lands on jelly springs, in one wave
  // Uses the individual translate / scale / rotate properties (Jelly's hover owns transform) and clears them once it settles,
  // so after the entrance nothing on the page is moving and nothing keeps a style around.
  function springIn(el, delay, { y = 34, s = .92, r = 0, fade = true } = {}) {
    if (!el || still()) return
    const props = ['opacity', 'translate', 'scale', 'rotate']
    if (!el.isConnected) return
    const set = p => {
      if (fade) el.style.opacity = Math.max(0, Math.min(1, p * 1.6)).toFixed(3)
      el.style.translate = `0 ${((1 - p) * y).toFixed(2)}px`; el.style.scale = (s + (1 - s) * p).toFixed(4)
      if (r) el.style.rotate = ((1 - p) * r).toFixed(2) + 'deg'
    }
    el.style.willChange = 'translate, scale, rotate, opacity'
    set(0)
    setTimeout(() => {
      const sp = new Jelly.Spring(0, 'jelly', p => { if (p === 1 && !sp.vel) { props.forEach(k => el.style.removeProperty(k)); el.style.removeProperty('will-change') } else set(p) })
      sp.to(1)
    }, delay)
  }
  function choreograph() {
    if (still()) return
    const at = sel => qs(sel)
    springIn(at('#cktile'), 120, { y: 22, s: .94 })
    springIn(at('.hm-badge'), 160, { y: 18 })
    springIn(at('#date'), 160, { y: 22, s: .9 })
    springIn(at('#greet'), 230, { y: 34, s: .92 })
    springIn(at('#hsub'), 310, { y: 26, s: .96 })
    springIn(at('.hm-sbox'), 380, { y: 54, s: .9 })
    document.querySelectorAll('#pulse .hm-stat').forEach((e, i) => springIn(e, 440 + i * 60, { y: 40, s: .88, r: i % 2 ? 1.5 : -1.5 }))
    springIn(at('.hm-sechead'), 560, { y: 26 })
  }
  // the widgets fall in as a wave from the top left corner (positions are all read first, then styles are written)
  function choreographGrid() {
    const g = qs('#widgets'); if (!g || still()) return
    const half = g.clientWidth / 2
    const plan = [...g.children].filter(e => e.dataset.w).map(e => [e, Math.round(e.offsetTop / 3.4) + Math.round(e.offsetLeft / 26), e.offsetLeft > half])
    plan.forEach(([e, d, right]) => springIn(e, 80 + d, { y: 56, s: .9, r: right ? 1.2 : -1.2 }))
    springIn(qs('.hm-foot'), 420, { y: 20 })
  }

  // the banner's chips lift on hover and squish on press, on jelly springs (translate and scale only, cleared once they settle)
  function springChips(box) {
    if (!box || !window.Jelly) return
    box.querySelectorAll('.hm-act').forEach(el => {
      let lift = null, sq = null
      const paint = () => {
        if (!lift || !sq) return
        if (!lift.vel && !sq.vel && lift.v === 0 && sq.v === 1) { el.style.removeProperty('translate'); el.style.removeProperty('scale'); return }
        el.style.translate = `0 ${(-lift.v).toFixed(2)}px`; el.style.scale = sq.v.toFixed(4)
      }
      lift = new Jelly.Spring(0, 'jelly', paint); sq = new Jelly.Spring(1, 'jelly', paint)
      el.addEventListener('pointerenter', () => { if (!still()) { lift.to(2); sq.to(1.035) } })
      el.addEventListener('pointerleave', () => { lift.to(0); sq.to(1) })
      el.addEventListener('pointerdown', () => { if (!still()) sq.to(.95) })
      el.addEventListener('pointerup', () => { if (!still()) sq.to(1.035) })
    })
  }

  // switch the banner layout in place: the clock and the words glide to their new sides on a jelly spring (FLIP on
  // translate only, cleared once it settles). Looks, colours and every other animation stay exactly as they are.
  function applyHeroLayout() {
    const hero = qs('#hero'); if (!hero) return
    const want = heroLayout()
    const sw = qs('#hlay'); if (sw) sw.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.v === want))
    if (hero.dataset.layout === want) return
    const parts = [qs('#cktile'), hero.querySelector('.hm-hi')].filter(Boolean)
    const before = parts.map(el => el.getBoundingClientRect())
    hero.classList.toggle('classic', want === 'classic'); hero.dataset.layout = want
    if (still() || !window.Jelly) return
    parts.forEach((el, i) => {
      el.style.removeProperty('translate')
      const a = el.getBoundingClientRect(), d = { x: before[i].left - a.left, y: before[i].top - a.top }
      if (Math.abs(d.x) < 1 && Math.abs(d.y) < 1) return
      if (!el._hl) el._hl = { d, sp: new Jelly.Spring(0, 'jelly', p => {
        const o = el._hl.d
        if (p === 0 && !el._hl.sp.vel) { el.style.removeProperty('translate'); return }
        el.style.translate = `${(o.x * p).toFixed(2)}px ${(o.y * p).toFixed(2)}px`
      }) }
      el._hl.d = d; el._hl.sp.set(1); el._hl.sp.to(0)
    })
  }

  async function newTab() {
    document.title = 'New Tab'
    document.body.classList.add('home-page')
    // the first frame must not wait for anything slow: one small call tells us if this is a private window,
    // the shell (hero, search, the pulse) paints and starts its entrance, and the widgets fill in after
    try { H.home = (await L.invoke('home')) || null } catch { H.home = null }
    H.private = !!(H.home && H.home.private); H.ready = false
    H.sites = H.sites || []; H.apps = H.apps || []; H.parcels = H.parcels || []; H.laterCount = H.laterCount || 0
    H.wp = wpKey()
    const style = clockStyle(), p = H.private, eng = ENGINES[S.searchEngine] || 'Google'
    root.innerHTML = `<div class="ntp home${p ? ' private' : ''}" id="ntp" data-nolens>
    <div class="ntp-bg"></div>
    <div class="hm-wrap">
      <header class="hm-hero enter ${style === 'off' ? 'no-clock' : ''}${heroLayout() === 'classic' ? ' classic' : ''}" id="hero" data-layout="${heroLayout()}">
        <span class="hm-amb" aria-hidden="true"><i class="amb-dots"></i><i class="amb-fine"></i><i class="amb-spark"></i></span><i class="hm-mesh" aria-hidden="true"></i>
        <div class="hm-tile" id="cktile">
          <div id="clockslot">${clockMarkup(style)}</div>
        </div>
        <div class="hm-hi">
          ${p ? `<span class="hm-badge" data-in>${ICONS.mask}Private window</span>` : `<p class="hm-date" id="date" data-in></p>`}
          ${p ? `<h1 class="hm-greet" id="greet" data-in>Browse <em>privately</em></h1>` : `<h1 class="hm-greet" id="greet" data-in></h1>`}
          <p class="hm-sub" id="hsub" data-in></p>
          ${p ? '' : `<div class="hm-acts" id="acts"><button class="hm-act pri" data-act="ask" style="--i:0">${ICONS.sparkle}Ask Lumen</button><button class="hm-act" data-act="cmd" style="--i:1" aria-label="Command bar, ${cmdKey()} K">${ICONS.search}<kbd>${cmdKey()}</kbd><kbd>K</kbd></button><button class="hm-act" data-act="focus" style="--i:2">${ic('hourglass')}Focus</button><a class="hm-act" href="lumen://readlater" style="--i:3">${ICONS.book}Read later</a></div>`}
        </div>
      </header>
      <div class="hm-sbox" data-in><form class="hm-search hm-lq" id="sf" role="search">
        <span class="hm-sic">${ICONS.search}</span>
        <input id="q" autofocus placeholder="${p ? 'Search privately' : 'Search ' + esc(eng)} or type an address" spellcheck="false" autocomplete="off" aria-label="Search or type an address">
        <button type="button" class="hm-eng" id="keng" title="Search engine" aria-haspopup="listbox"><span>${esc(eng)}</span>${XI.chev}</button>
        <button type="button" class="hm-k" id="kcmd" title="Open the command bar">${cmdKey()} K</button>
        <button type="button" class="hm-ask" id="kask" title="Ask Lumen AI">${ICONS.sparkle}<span>Ask</span></button>
      </form><div class="hm-sug hm-glass" id="sug" role="listbox"></div><div class="hm-engs hm-glass" id="engs" role="listbox" aria-label="Search engine"></div></div>
      <section class="hm-pulse" id="pulse" aria-label="Your day">
        <div class="hm-stat hm-ringt hm-lq" data-in><div class="hm-ring" id="ring" aria-label="How much of today has gone"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--rc0)"/><stop offset=".55" style="stop-color:var(--rc1)"/><stop offset="1" style="stop-color:var(--rc2)"/></linearGradient></defs><circle class="rt" cx="60" cy="60" r="48"/><circle class="rp" cx="60" cy="60" r="48" pathLength="100"/></svg><b></b><span>of today</span></div></div>
        <div class="hm-pulsex" id="pulsex"></div>
      </section>
      <div class="hm-sechead" data-in>
        <div class="hm-sect"><span class="hm-kicker">${p ? 'Private window' : 'Your space'}</span><h2>${p ? 'Nothing here <em>follows you</em>' : 'Everything, <em>at a glance</em>'}</h2></div>
        ${p ? '' : `<button class="hm-cust" id="cust" aria-label="Customize">${ICONS.tune}<span>Customize</span></button>`}
      </div>
      <div class="hm-grid enter" id="widgets"></div>
      <nav class="hm-foot" data-in>
        <a href="lumen://history">${ICONS.clock}History</a><a href="lumen://bookmarks">${ICONS.star}Bookmarks</a><a href="lumen://passwords">${ICONS.key}Passwords</a><a href="lumen://settings">${ICONS.gear}Settings</a>
      </nav>
    </div>
  </div>
`
    paintWallpaper(false)
    heroText(); choreograph()
    try { performance.mark('lumen-home-shell') } catch {}
    // the clock is plain text now, so it is in the very first frame
    buildClock(); tickClock()
    // the banner's ambient dots only move while the banner is on screen and the tab is visible
    { const hero = qs('#hero'), pause = () => hero.classList.toggle('amb-paused', document.hidden || hero.dataset.off === '1')
      if (window.IntersectionObserver) new IntersectionObserver(es => { hero.dataset.off = es[0].isIntersecting ? '' : '1'; pause() }).observe(hero)
      if (!newTab.vis) { newTab.vis = true; document.addEventListener('visibilitychange', () => { const h = qs('#hero'); if (h) h.classList.toggle('amb-paused', document.hidden || h.dataset.off === '1') }) } }
    bindSearch()
    setTimeout(() => { const q = qs('#q'); if (q) q.focus() }, 30)
    await loadData(); H.ready = true
    if (!qs('#ntp')) return
    if (!p) { root.insertAdjacentHTML('beforeend', drawerHTML()) }
    heroText(); focusTick()
    const acts = qs('#acts')
    springChips(acts)
    if (acts) acts.onclick = e => {
      const b = e.target.closest('[data-act]'); if (!b) return
      if (window.Jelly) Jelly.kick(b, .6, .3)
      const k = b.dataset.act
      if (k === 'ask') qs('#kask').click()
      else if (k === 'cmd') qs('#kcmd').click()
      else if (k === 'focus') { const c = qs('[data-w="focus"]'); if (c) { c.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' }); const go = qs('#fcgo'); if (go && !(S.ntpFocus && S.ntpFocus.end)) go.click() } }
    }
    qs('#pulse').onclick = e => {
      const b = e.target.closest('[data-go]'); if (!b || !b.dataset.go) return
      const go = b.dataset.go
      if (window.Jelly) Jelly.kick(b, .5, .2)
      if (go.startsWith('w:')) { const c = qs(`[data-w="${go.slice(2)}"]`); if (!c) return; c.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' }); const bd = bodyOf(c); bd.s.set(1.035); bd.s.to(1); c.classList.add('ping'); setTimeout(() => c.classList.remove('ping'), 1200) }
      else location.href = go
    }
    renderGrid(true); choreographGrid()
    try { performance.mark('lumen-home-grid') } catch {}
    bindDrawer(); refreshApps()
    const g = qs('#widgets')
    sortable(g, { item: '[data-w]', handle: '.hm-h', onDrop: list => saveOrder(list), after: layout })
    g.addEventListener('keydown', keyMove)
    if (!newTab.keys) {
      newTab.keys = true
      addEventListener('keydown', e => {
        if (!qs('#ntp')) return
        const typing = e.target.closest && e.target.closest('input, textarea, [contenteditable]')
        if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); qs('#q').focus(); return }
        if (e.altKey && !e.metaKey && !e.ctrlKey && /^Digit[1-9]$/.test(e.code)) { const s2 = H.sites[+e.code.slice(5) - 1]; if (s2) { e.preventDefault(); L.invoke('navigate', s2.url) } }
      })
    }
    if (window.ResizeObserver) { let w = g.clientWidth; new ResizeObserver(() => { if (g.clientWidth !== w) { w = g.clientWidth; layout() } }).observe(g) }
    // (no glass droplet following the cursor here: a lens over moving content costs every frame)
    // the entrance plays once; after it nothing on the page moves on its own
    setTimeout(() => { const h = qs('#hero'); if (h) h.classList.remove('enter'); if (g) g.classList.remove('enter') }, 2600)
    if (!newTab.rs) { newTab.rs = true; let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (qs('#clock')) buildClock() }, 200) }) }
    matchMedia('(prefers-color-scheme: dark)').onchange = () => { if (qs('#ntp')) paintWallpaper(false) }
    if (!newTab.th && L.onSettings) { newTab.th = true; L.onSettings(s => { if (qs('#ntp') && isThemeKey(H.wp) && themeSig() !== H.themeSeen) paintWallpaper(true); if (s && qs('#ntp')) { S.ntpBanner = s.ntpBanner; applyHeroLayout() } }) }
  }

  // ---------------------------------------------------------------- add a shortcut
  function addShortcutDialog(onSave) {
    const d = document.createElement('div'); d.className = 'ntp-modal'
    d.innerHTML = `<form class="ntp-card rise"><div class="sc-head"><span class="sc-prev" id="sc-prev">${ICONS.globe}</span><div><h3>Add shortcut</h3><p>It shows up on every new tab.</p></div></div><label>Website address<input type="text" id="sc-url" placeholder="example.com" required spellcheck="false" autocomplete="off"></label><label>Name <input type="text" id="sc-name" placeholder="Optional"></label><div class="row2"><button type="button" class="btn" id="sc-cancel">Cancel</button><button class="btn primary">Add shortcut</button></div></form>`
    document.body.appendChild(d)
    d.querySelector('#sc-url').focus()
    d.querySelector('#sc-url').oninput = e => { const h = hostOf(/^https?:\/\//i.test(e.target.value) ? e.target.value : 'https://' + e.target.value.trim()); qs('#sc-prev').innerHTML = h && h.includes('.') ? letterFav(h.replace(/^www\./, '')) : ICONS.globe }
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

  window.newTab = newTab
  window.buildClock = buildClock
  window.__home = { H, order, widgetOn, layout, WIDGETS }
})()
