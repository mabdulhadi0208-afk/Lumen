/* Lumen browser chrome. Everything moves on springs (see spring.js). No emoji anywhere. */
const api = window.lumenUI
const $ = s => document.querySelector(s)
const params = new URLSearchParams(location.search)
const IS_MAC = params.get('platform') === 'darwin'
const INCOGNITO = params.get('incognito') === '1'
document.body.classList.toggle('nonmac', !IS_MAC)
document.body.classList.toggle('incognito', INCOGNITO)

let S = { tabs: [], activeId: null, url: '', canBack: false, canForward: false, bookmarked: false, blocked: 0, secure: true, zoom: 100 }
let settings = { motion: 'calm', sidebarCollapsed: false, sidebarWidth: 248, accent: '#5b8cff' }
let engines = {}
let downloads = []
let updateState = {}

const ROW = 36
Jelly.init({
  buttons: '.ib, .btn, .pin, .site, .update, .wincontrols button, .tab .x, .tab .audio, .popover .seg button, .mm-tile',
  cards: '.prompt, .newtab',
  press: '.popover .item',
})
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// ---------------------------------------------------------------- icons on static buttons
const setIcon = (sel, name) => { const el = $(sel); if (el) el.insertAdjacentHTML('afterbegin', ICONS[name]) }
setIcon('#btn-sidebar', 'sidebar'); setIcon('#btn-back', 'back'); setIcon('#btn-forward', 'forward'); setIcon('#btn-reload', 'reload')
setIcon('#btn-star', 'star'); setIcon('#btn-settings', 'gear'); setIcon('#btn-downloads', 'download'); setIcon('#btn-split', 'split'); setIcon('#btn-menu', 'more')
setIcon('#find-prev', 'back'); setIcon('#find-next', 'forward'); setIcon('#find-close', 'close')
$('#find-prev').firstChild.style.transform = 'rotate(90deg)'; $('#find-next').firstChild.style.transform = 'rotate(90deg)'
$('.newtab .plus').innerHTML = ICONS.plus
$('#kbd-newtab').textContent = IS_MAC ? 'Cmd T' : 'Ctrl T'
if (!IS_MAC) {
  $('#wincontrols').innerHTML = `<button data-w="close" class="x" title="Close">${ICONS.winClose}</button><button data-w="min" title="Minimize">${ICONS.winMin}</button><button data-w="max" title="Maximize">${ICONS.winMax}</button>`
  $('#wincontrols').addEventListener('click', e => { const b = e.target.closest('button'); if (b) api.do('windowControl', b.dataset.w) })
}

// ---------------------------------------------------------------- favicons
function hue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360; return h }
function hostOf(url) { try { return new URL(url).host.replace(/^www\./, '') } catch { return '' } }
function favHTML(t) {
  const url = t.url || ''
  if (url.startsWith('lumen://')) {
    const page = hostOf(url).split('.')[0] || url.slice(8).split('/')[0]
    const map = { newtab: 'globe', settings: 'gear', history: 'clock', downloads: 'download', bookmarks: 'star', passwords: 'key', extensions: 'puzzle', error: 'globe' }
    return `<span class="fav" style="color:var(--fg2)">${ICONS[map[page] || 'globe']}</span>`
  }
  const host = hostOf(url)
  const letter = esc((host[0] || '?').toUpperCase())
  const fallback = `<span class="fav" style="background:hsl(${hue(host)} 55% 52%)">${letter}</span>`
  if (!t.favicon) return fallback
  return `<img src="${esc(t.favicon)}" draggable="false" data-fallback="${esc(fallback)}">`
}
document.addEventListener('error', e => {
  const img = e.target
  if (img.tagName === 'IMG' && img.dataset.fallback) img.outerHTML = img.dataset.fallback
}, true)

function titleOf(t) {
  if (t.title) return t.title
  if ((t.url || '').startsWith('lumen://newtab')) return 'New Tab'
  return hostOf(t.url) || t.url || 'New Tab'
}

// ---------------------------------------------------------------- layout (sidebar + content rect, all sprung)
const sidebar = $('#sidebar')
let sidebarW = 248
let collapsed = false
let peeking = false
const sideX = new Spring(0, 'calm', () => queueLayout())      // content left edge offset (sidebar visible amount)
const findH = new Spring(0, 'calm', () => queueLayout())
const barH = new Spring(88, 'calm', () => queueLayout())   // height of the top bar in the tabs-on-top layout
new ResizeObserver(() => { if (TOP) barH.to(sidebar.offsetHeight) }).observe(sidebar)
const peekX = new Spring(0, 'calm', v => { sidebar.style.transform = `translateX(${v}px)` })
let layoutQueued = false
function queueLayout() { if (!layoutQueued) { layoutQueued = true; requestAnimationFrame(doLayout) } }
let lastRectKey = ''
function doLayout() {
  layoutQueued = false
  const W = innerWidth, H = innerHeight
  const left = TOP ? 8 : Math.round(8 + sideX.value)
  const barTop = TOP ? Math.round(barH.value) : 8
  const top = Math.round(barTop + findH.value)
  const rect = { x: left, y: top, width: Math.max(80, W - left - 8), height: Math.max(80, H - top - 8) }
  const sh = $('#content-shadow')
  Object.assign(sh.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px', height: rect.height + 'px' })
  const fb = $('#findbar')
  const fbW = Math.min(420, rect.width - 16)
  Object.assign(fb.style, { left: (rect.x + rect.width - fbW) + 'px', top: barTop + 'px', width: fbW + 'px', opacity: Math.min(1, findH.value / 46), transform: `translateY(${(findH.value - 46) * 0.25}px)` })
  if (!TOP && (!collapsed || peeking)) sidebar.style.width = sidebarW + 'px'
  $('#resizer').style.left = (sidebarW - 4) + 'px'
  const key = JSON.stringify(rect)
  if (key !== lastRectKey) { lastRectKey = key; api.do('layout', rect) }
}
addEventListener('resize', queueLayout)

function setCollapsed(c, { save = true, instant = false } = {}) {
  if (TOP) c = false
  collapsed = c
  document.body.classList.toggle('collapsed', c)
  const target = c ? 0 : sidebarW - 8
  if (instant) sideX.set(target); else sideX.to(target)
  if (c) { if (instant) peekX.set(-sidebarW - 12); else peekX.to(-sidebarW - 12) }
  else {
    const wasPeeking = peeking
    peeking = false; sidebar.classList.remove('peek'); peekX.to(0)
    if (wasPeeking && !overlayOpen) api.do('overlay', false)
  }
  api.do('trafficLights', !c, TOP ? { x: 16, y: 15 } : { x: 16, y: 18 })
  if (save) api.do('setSetting', 'sidebarCollapsed', c)
}
$('#btn-sidebar').onclick = () => setCollapsed(!collapsed)

// peek the sidebar while collapsed
let peekCloseTimer
function openPeek() {
  if (TOP || !collapsed || peeking) return
  peeking = true
  api.do('overlay', true)
  api.do('trafficLights', true)
  sidebar.classList.add('peek')
  peekX.set(-sidebarW - 12); peekX.to(0)
}
function closePeek() {
  if (!peeking || overlayOpen) return
  peekX.to(-sidebarW - 12)
  peekX.onRest = () => {
    peekX.onRest = null
    if (peekX.target < 0) { peeking = false; sidebar.classList.remove('peek'); api.do('trafficLights', false); if (!overlayOpen) api.do('overlay', false) }
  }
}
$('#peekzone').addEventListener('mouseenter', openPeek)
sidebar.addEventListener('mouseenter', () => clearTimeout(peekCloseTimer))
sidebar.addEventListener('mouseleave', () => { if (peeking && !prompts.length) peekCloseTimer = setTimeout(closePeek, 220) })

// resize the sidebar
$('#resizer').addEventListener('pointerdown', e => {
  e.preventDefault()
  const r = e.target; r.setPointerCapture(e.pointerId)
  const move = ev => { sidebarW = Math.max(200, Math.min(420, ev.clientX + 4)); sideX.set(sidebarW - 8); queueLayout() }
  const up = () => { r.removeEventListener('pointermove', move); r.removeEventListener('pointerup', up); api.do('setSetting', 'sidebarWidth', sidebarW) }
  r.addEventListener('pointermove', move); r.addEventListener('pointerup', up)
})

// ---------------------------------------------------------------- toolbar
$('#btn-back').onclick = () => api.do('back')
$('#btn-forward').onclick = () => api.do('forward')
$('#btn-reload').onclick = e => { const a = activeTab(); if (a && a.loading) api.do('stop'); else api.do('reload', e.shiftKey) }
$('#btn-star').onclick = () => api.do('bookmark')
$('#btn-settings').onclick = () => api.do('openPage', 'settings')
$('#btn-menu').onclick = () => openMainMenu()
$('#btn-split').onclick = () => toggleSplit()
$('#btn-newtab').onclick = () => api.do('newTab')
$('#urltext').onclick = () => openCmd('location')
$('#btn-site').onclick = () => openSiteInfo()
$('#btn-downloads').onclick = () => openDownloads()
$('#btn-update').onclick = () => api.do('update', 'install')

function toggleSplit() {
  if (S.splitId) return api.do('unsplit')
  const i = S.tabs.findIndex(t => t.id === S.activeId)
  const other = S.tabs[i + 1] || S.tabs[i - 1]
  if (other) api.do('split', other.id)
  else toast('Open another tab to use split view')
}
const activeTab = () => S.tabs.find(t => t.id === S.activeId)

// ---------------------------------------------------------------- render state
function renderChrome() {
  const a = activeTab()
  $('#btn-back').disabled = !S.canBack
  $('#btn-forward').disabled = !S.canForward
  $('#btn-reload').innerHTML = a && a.loading ? ICONS.stop : ICONS.reload
  $('#btn-star').innerHTML = S.bookmarked ? ICONS.starFill : ICONS.star
  $('#btn-star').classList.toggle('on', S.bookmarked)
  $('#btn-split').classList.toggle('on', !!S.splitId)
  const url = S.url || ''
  const ut = $('#urltext')
  let host = '', path = ''
  if (!url || url.startsWith('lumen://newtab')) { ut.classList.add('empty'); host = 'Search or enter address' }
  else {
    ut.classList.remove('empty')
    if (url.startsWith('lumen://')) { const p = url.slice(8).split('/')[0]; host = p.charAt(0).toUpperCase() + p.slice(1); path = '' }
    else { try { const u = new URL(url); host = u.host.replace(/^www\./, ''); path = (u.pathname === '/' ? '' : u.pathname) + u.search } catch { host = url } }
  }
  ut.querySelector('.host').textContent = host
  ut.querySelector('.path').textContent = path
  const site = $('#btn-site')
  site.innerHTML = url.startsWith('lumen://') || !url ? ICONS.search : (S.secure ? ICONS.tune : ICONS.unlock)
  site.classList.toggle('insecure', !S.secure && !!url && !url.startsWith('lumen://'))
  const sh = $('#shield')
  sh.textContent = S.blocked > 999 ? '999+' : S.blocked
  sh.classList.toggle('show', S.blocked > 0)
  document.title = a ? titleOf(a) : 'Lumen'
}

// ---------------------------------------------------------------- tabs list (springs)
const tabsEl = $('#tabs'), pinsEl = $('#pins'), pill = $('#pill')
Jelly.smoothScroll($('#tablist'))
const tabViews = new Map() // id -> { el, g: SpringGroup }
// Tabs run down the sidebar, or across the top bar when the layout is "top". p = position along that axis.
let TOP = false
const GAP = 6
let tabW = 200
const stepOf = () => TOP ? tabW + GAP : ROW
function measureTabW(n) {
  const avail = $('#tablist').clientWidth || 600
  tabW = Math.max(84, Math.min(220, Math.floor((avail - Math.max(0, n - 1) * GAP) / Math.max(1, n))))
}
const pillG = new SpringGroup({ p: 0, o: 0, s: 1, w: 200 }, 'calm', v => {
  pill.style.transform = TOP ? `translateX(${v.p}px) scale(${v.s})` : `translateY(${v.p}px) scale(${v.s})`
  if (TOP) pill.style.width = v.w + 'px'; else pill.style.width = ''
  pill.style.opacity = Math.max(0, Math.min(1, v.o))
})
let drag = null

function tabInner(t) {
  return `<span class="icon">${favHTML(t)}${t.loading ? '<span class="spinner"></span>' : ''}</span>
    <span class="title">${esc(titleOf(t))}</span>
    <span class="split-badge">SPLIT</span>
    <button class="audio" title="${t.muted ? 'Unmute' : 'Mute'}">${t.muted ? ICONS.muted : ICONS.speaker}</button>
    <button class="x" title="Close tab">${ICONS.close}</button>`
}
function tabSig(t) { return [t.title, t.url, t.favicon, t.loading, t.muted, t.audible].join('|') }

function renderTabs() {
  const pinned = S.tabs.filter(t => t.pinned)
  const list = S.tabs.filter(t => !t.pinned)
  if (TOP) measureTabW(list.length)
  const step = stepOf()

  // pinned tabs
  const pinIds = pinned.map(t => String(t.id)).join(',')
  if (pinsEl.dataset.ids !== pinIds) {
    pinsEl.dataset.ids = pinIds
    pinsEl.innerHTML = pinned.map(t => `<div class="pin" data-id="${t.id}" title="${esc(titleOf(t))}">${favHTML(t)}<span class="dot"></span></div>`).join('')
  }
  for (const t of pinned) {
    const el = pinsEl.querySelector(`[data-id="${t.id}"]`)
    if (!el) continue
    el.classList.toggle('active', t.id === S.activeId)
    el.classList.toggle('asleep', t.asleep)
    el.classList.toggle('audible', t.audible)
    el.title = titleOf(t)
  }

  // list
  const seen = new Set()
  list.forEach((t, i) => {
    seen.add(t.id)
    let v = tabViews.get(t.id)
    const p = i * step
    if (!v) {
      const el = document.createElement('div')
      el.className = 'tab'
      el.dataset.id = t.id
      el.innerHTML = tabInner(t)
      tabsEl.appendChild(el)
      v = { el, sig: tabSig(t) }
      const paint = st => {
        const q = v.q ? Math.max(-0.075, Math.min(0.075, v.q.value)) : 0
        el.style.transform = (TOP ? `translate(${st.p}px, ${st.e}px)` : `translate(${st.e}px, ${st.p}px)`) + ` scale(${st.s * (1 + q)}, ${st.s * (1 - q)})`
        el.style.opacity = Math.max(0, Math.min(1, st.o))
        if (TOP) el.style.width = tabW + 'px'; else el.style.width = ''
      }
      v.paint = paint
      v.g = new SpringGroup({ p, o: 0, s: 0.9, e: TOP ? 10 : -14 }, 'calm', paint)
      v.q = new Spring(0, 'bounce', () => paint(v.g.state))
      v.g.to({ o: 1, s: 1, e: 0 })
      tabViews.set(t.id, v)
      bindTab(v, t.id)
    } else if (v.sig !== tabSig(t)) {
      v.sig = tabSig(t)
      v.el.innerHTML = tabInner(t)
    }
    v.index = i
    if (!(drag && drag.id === t.id && drag.active)) v.g.to({ p })
    v.paint(v.g.state)
    v.el.classList.toggle('active', t.id === S.activeId)
    v.el.classList.toggle('asleep', t.asleep)
    v.el.classList.toggle('audible', t.audible)
    v.el.classList.toggle('muted', t.muted)
    v.el.classList.toggle('insplit', t.id === S.splitId || (S.splitId && t.id === S.activeId))
    v.el.title = titleOf(t)
  })
  for (const [id, v] of tabViews) {
    if (seen.has(id) || v.leaving) continue
    v.leaving = true
    v.el.style.pointerEvents = 'none'
    v.g.to({ o: 0, s: 0.9, e: TOP ? 8 : -8 })
    v.g.onRest(() => { v.el.remove(); tabViews.delete(id) })
  }
  if (TOP) { tabsEl.style.height = ''; tabsEl.style.width = Math.max(0, list.length * step - GAP) + 'px' }
  else { tabsEl.style.width = ''; tabsEl.style.height = list.length * ROW + 'px' }

  const act = tabViews.get(S.activeId)
  if (act && !act.leaving) {
    const p = act.index * step
    if (pillG.state.o < 0.05) pillG.set({ p, w: tabW })
    pillG.to({ p, o: 1, w: tabW })
    if (!drag) act.el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  } else pillG.to({ o: 0 })
}

function setTabLayout(top) {
  TOP = top
  document.body.classList.toggle('toplayout', top)
  // re-seat every tab and the pill on the new axis without animating across the screen
  const list = S.tabs.filter(t => !t.pinned)
  if (TOP) measureTabW(list.length)
  for (const [, v] of tabViews) { v.g.set({ p: (v.index || 0) * stepOf(), e: 0 }) }
  const act = tabViews.get(S.activeId)
  pillG.set({ p: act ? act.index * stepOf() : 0, w: tabW })
  renderTabs()
}
addEventListener('resize', () => { if (TOP) renderTabs() })

function bindTab(v, id) {
  const el = v.el
  const coord = e => TOP ? e.clientX : e.clientY
  el.addEventListener('pointerdown', e => {
    if (e.button === 1) { e.preventDefault(); return }
    if (e.button !== 0 || e.target.closest('.x, .audio')) return
    drag = { id, active: false, start: coord(e), startPos: v.index * stepOf(), index: v.index }
    el.setPointerCapture(e.pointerId)
    // press squashes the tab a little
    v.g.to({ s: 0.97 })
  })
  el.addEventListener('pointermove', e => {
    if (!drag || drag.id !== id) return
    const d = coord(e) - drag.start
    if (!drag.active && Math.abs(d) > 4) { drag.active = true; el.classList.add('dragging'); v.g.to({ s: 1.02 }) }
    if (!drag.active) return
    const step = stepOf()
    const count = S.tabs.filter(t => !t.pinned).length
    const p = Math.max(-6, Math.min((count - 1) * step + 6, drag.startPos + d))
    v.g.set({ p })
    const to = Math.max(0, Math.min(count - 1, Math.round(p / step)))
    drag.index = to
    // shift the others into their new slots
    const ids = S.tabs.filter(t => !t.pinned).map(t => t.id).filter(x => x !== id)
    ids.splice(to, 0, id)
    ids.forEach((tid, i) => { if (tid !== id) { const o = tabViews.get(tid); if (o) o.g.to({ p: i * step }) } })
    if (S.activeId !== id) { const ai = ids.indexOf(S.activeId); if (ai >= 0 && tabViews.get(S.activeId)) pillG.to({ p: ai * step }) }
    else pillG.set({ p })
  })
  const end = e => {
    if (!drag || drag.id !== id) return
    const d = drag; drag = null
    el.classList.remove('dragging')
    v.g.to({ s: 1 }, { velocity: d.active ? 0 : 1.4 })
    if (d.active) {
      // dropped: squash flat, then bounce once or twice
      v.q.to(0, { velocity: 3 })
      const pinnedCount = S.tabs.filter(t => t.pinned).length
      v.g.to({ p: d.index * stepOf() })
      // reorder locally right away so nothing jumps, then tell the browser
      const moved = S.tabs.find(t => t.id === id)
      const rest = S.tabs.filter(t => t.id !== id)
      rest.splice(pinnedCount + d.index, 0, moved)
      S.tabs = rest
      renderTabs()
      api.do('move', id, pinnedCount + d.index)
    } else if (e.type === 'pointerup') api.do('activate', id)
  }
  el.addEventListener('pointerup', end)
  el.addEventListener('pointercancel', end)
  el.addEventListener('auxclick', e => { if (e.button === 1) api.do('close', id) })
  el.addEventListener('click', e => {
    if (e.target.closest('.x')) { e.stopPropagation(); api.do('close', id) }
    else if (e.target.closest('.audio')) { e.stopPropagation(); api.do('mute', id) }
  })
  el.addEventListener('contextmenu', e => { e.preventDefault(); api.do('tabMenu', id) })
  el.addEventListener('dblclick', e => { if (!e.target.closest('button')) api.do('pin', id) })
}

pinsEl.addEventListener('click', e => { const p = e.target.closest('.pin'); if (p) api.do('activate', +p.dataset.id) })
pinsEl.addEventListener('auxclick', e => { const p = e.target.closest('.pin'); if (p && e.button === 1) api.do('close', +p.dataset.id) })
pinsEl.addEventListener('contextmenu', e => { const p = e.target.closest('.pin'); if (p) { e.preventDefault(); api.do('tabMenu', +p.dataset.id) } })
// double click empty tab area -> new tab
$('#tablist').addEventListener('dblclick', e => { if (e.target === $('#tablist') || e.target === tabsEl) api.do('newTab') })

// ---------------------------------------------------------------- overlay management
let overlayOpen = null // 'cmd' | 'pop' | null
const overlay = $('#overlay'), scrim = $('#scrim')
const scrimS = new Spring(0, 'calm', v => { scrim.style.opacity = Math.max(0, Math.min(1, v)) })
function showOverlay(kind) {
  overlayOpen = kind
  overlay.classList.add('show')
  api.do('overlay', true)
}
function hideOverlay() {
  overlayOpen = null
  overlay.classList.remove('show')
  if (!peeking) api.do('overlay', false)
  else api.do('focusTab')
}
scrim.addEventListener('mousedown', () => { if (overlayOpen === 'cmd') closeCmd(); else if (overlayOpen === 'pop') closePopover() })

// ---------------------------------------------------------------- command bar
const cmd = $('#cmdbar'), cmdInput = $('#cmd-input'), cmdResults = $('#cmd-results')
const cmdG = new SpringGroup({ s: 0.9, o: 0, y: -14 }, 'calm', v => { cmd.style.transform = `translateY(${v.y}px) scale(${v.s})`; cmd.style.opacity = Math.max(0, Math.min(1, v.o)) })
$('#cmdicon').innerHTML = ICONS.search
let cmdMode = 'newtab', results = [], sel = 0, suggestSeq = 0, lastTyped = ''

const COMMANDS = [
  { t: 'New Private Window', k: ['private', 'incognito'], i: 'mask', run: () => api.do('newWindow', true) },
  { t: 'New Window', k: ['window'], i: 'tabs', run: () => api.do('newWindow', false) },
  { t: 'Settings', k: ['settings', 'preferences', 'options'], i: 'gear', run: () => api.do('openPage', 'settings') },
  { t: 'History', k: ['history'], i: 'clock', run: () => api.do('openPage', 'history') },
  { t: 'Downloads', k: ['downloads'], i: 'download', run: () => api.do('openPage', 'downloads') },
  { t: 'Bookmarks', k: ['bookmarks'], i: 'star', run: () => api.do('openPage', 'bookmarks') },
  { t: 'Passwords', k: ['passwords', 'logins', 'keys'], i: 'key', run: () => api.do('openPage', 'passwords') },
  { t: 'Extensions', k: ['extensions', 'addons', 'plugins'], i: 'puzzle', run: () => api.do('openPage', 'extensions') },
  { t: 'Chrome Web Store', k: ['web store', 'chrome store', 'extensions store'], i: 'puzzle', run: () => api.do('newTab', 'https://chromewebstore.google.com/') },
  { t: 'Split View', k: ['split', 'side by side'], i: 'split', run: () => toggleSplit() },
  { t: 'Reader Mode', k: ['reader', 'read'], i: 'book', run: () => api.do('reader') },
  { t: 'Picture in Picture', k: ['pip', 'picture', 'video'], i: 'pip', run: () => api.do('pip') },
  { t: 'Take Screenshot', k: ['screenshot', 'capture'], i: 'camera', run: () => api.do('screenshot') },
  { t: 'Reopen Closed Tab', k: ['reopen', 'undo close', 'restore'], i: 'reload', run: () => api.do('reopen') },
  { t: 'Toggle Sidebar', k: ['sidebar', 'hide sidebar', 'focus'], i: 'sidebar', run: () => { if (!TOP) setCollapsed(!collapsed) } },
  { t: 'Tabs on Top', k: ['top', 'tabs on top', 'horizontal', 'layout', 'sidebar up'], i: 'tabs', run: () => api.do('setSetting', 'tabLayout', 'top') },
  { t: 'Tabs in Sidebar', k: ['side', 'tabs in sidebar', 'vertical', 'layout', 'sidebar left'], i: 'sidebar', run: () => api.do('setSetting', 'tabLayout', 'side') },
  { t: 'Developer Tools', k: ['devtools', 'inspect', 'console'], i: 'bolt', run: () => api.do('devtools') },
  { t: 'Clear Browsing Data', k: ['clear', 'delete history', 'cookies'], i: 'close', run: () => api.do('openPage', 'settings/privacy') },
  { t: 'Replay Intro', k: ['intro', 'tutorial', 'tour', 'welcome'], i: 'bolt', run: () => playIntro() },
  { t: 'Check for Updates', k: ['update', 'version'], i: 'download', run: () => api.do('openPage', 'settings/about') },
]

function looksLikeURL(q) {
  return /^(https?|file|lumen|about):/i.test(q) || /^localhost(:\d+)?/.test(q) || (!/\s/.test(q) && /^[^\s/]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(q))
}

async function openCmd(mode, prefill) {
  if (overlayOpen === 'pop') closePopover(true)
  cmdMode = mode
  if (prefill === undefined && mode === 'location') { const u = S.url || ''; prefill = u.startsWith('lumen://newtab') ? '' : u }
  cmdInput.value = prefill || ''
  cmdInput.placeholder = mode === 'location' ? 'Search or enter address' : 'Search, enter address, or type a command'
  showOverlay('cmd')
  cmd.classList.add('show')
  cmdG.set({ s: 0.9, o: 0, y: -14 }).to({ s: 1, o: 1, y: 0 })
  scrimS.to(1)
  api.do('focusUI')
  requestAnimationFrame(() => { cmdInput.focus(); cmdInput.select() })
  lastTyped = cmdInput.value
  refresh(cmdInput.value)
}
function closeCmd(instant) {
  if (overlayOpen !== 'cmd') return
  overlayOpen = 'closing'
  scrimS.to(0)
  const done = () => { cmd.classList.remove('show'); cmdResults.innerHTML = ''; if (overlayOpen === 'closing') hideOverlay() }
  if (instant || getMotion() === 'off') { cmdG.set({ o: 0 }); done(); return }
  cmdG.to({ s: 0.98, o: 0, y: -4 })
  setTimeout(done, 140)
}

function buildResults(q, data) {
  const out = []
  const eng = engines[settings.searchEngine] || 'Google'
  const qq = q.trim()
  if (qq) {
    if (looksLikeURL(qq)) out.push({ sec: '', icon: ICONS.globe, title: qq, sub: '', key: 'Open', go: () => go(qq) })
    else out.push({ sec: '', icon: ICONS.search, title: qq, sub: '  ' + eng, key: 'Search', go: () => go(qq) })
  }
  const lq = qq.toLowerCase()
  const cmds = lq ? COMMANDS.filter(c => c.t.toLowerCase().includes(lq) || c.k.some(k => k.startsWith(lq) || lq.startsWith(k))).slice(0, 3) : []
  for (const c of cmds) out.push({ sec: 'Actions', icon: ICONS[c.i], title: c.t, sub: '', key: 'Run', go: () => { closeCmd(true); c.run() } })
  for (const t of (data.tabs || [])) out.push({ sec: 'Open tabs', icon: favHTML(t), title: titleOf(t), sub: hostOf(t.url), key: 'Switch', go: () => { closeCmd(true); api.do('switchTab', t.id, t.win) } })
  const seenUrls = new Set()
  for (const b of (data.bookmarks || [])) { seenUrls.add(b.url); out.push({ sec: 'Bookmarks', icon: ICONS.starFill, title: b.title || b.url, sub: hostOf(b.url), key: '', go: () => go(b.url) }) }
  for (const h of (data.history || [])) {
    if (seenUrls.has(h.url)) continue
    seenUrls.add(h.url)
    out.push({ sec: qq ? 'History' : 'Frequently visited', icon: favHTML({ url: h.url, favicon: '' }), title: h.title || h.url, sub: hostOf(h.url), key: '', go: () => go(h.url) })
  }
  for (const s of (data.search || [])) if (s.toLowerCase() !== lq) out.push({ sec: 'Suggestions', icon: ICONS.search, title: s, sub: '', key: '', go: () => go(s) })
  if (!qq) for (const c of COMMANDS.slice(0, 4)) out.push({ sec: 'Actions', icon: ICONS[c.i], title: c.t, sub: '', key: '', go: () => { closeCmd(true); c.run() } })
  return out
}

function renderResults() {
  let html = '', lastSec = null
  results.forEach((r, i) => {
    if (r.sec !== lastSec && r.sec) html += `<div class="sec">${esc(r.sec)}</div>`
    lastSec = r.sec
    html += `<div class="res${i === sel ? ' sel' : ''}" data-i="${i}"><span class="ri">${r.icon}</span><span class="rt">${esc(r.title)}</span><span class="ru">${r.sub ? esc(r.sub) : ''}</span><span class="rk">${esc(r.key || '')}</span></div>`
  })
  cmdResults.innerHTML = html
  const s = cmdResults.querySelector('.res.sel'); if (s) s.scrollIntoView({ block: 'nearest' })
}

async function refresh(q) {
  const my = ++suggestSeq
  const typed = q.slice(0, cmdInput.selectionStart === cmdInput.selectionEnd ? q.length : cmdInput.selectionStart)
  results = buildResults(typed, {}); sel = 0; renderResults()
  const data = await api.do('suggest', typed)
  if (my !== suggestSeq || overlayOpen !== 'cmd') return
  results = buildResults(typed, data || {}); sel = 0; renderResults()
  // inline completion of a domain you have been to
  if (typed && !/\s/.test(typed) && inlineAllowed && data && data.history) {
    const t = typed.toLowerCase()
    for (const h of data.history) {
      const bare = h.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
      if (bare.toLowerCase().startsWith(t) && bare.length > t.length && !bare.slice(t.length).includes('?')) {
        const host = bare.split('/')[0]
        const completion = host.toLowerCase().startsWith(t) ? host : bare
        if (completion.length > typed.length && cmdInput.value === typed) {
          cmdInput.value = typed + completion.slice(typed.length)
          cmdInput.setSelectionRange(typed.length, cmdInput.value.length)
          results.unshift({ sec: '', icon: ICONS.globe, title: completion, sub: '', key: 'Open', go: () => go(completion) })
          results = results.filter((r, i) => i === 0 || r.title !== typed)
          sel = 0; renderResults()
        }
        break
      }
    }
  }
}
let inlineAllowed = true
cmdInput.addEventListener('beforeinput', e => { inlineAllowed = /^insert/.test(e.inputType) && !e.inputType.includes('Paste') })
let refreshT
cmdInput.addEventListener('input', () => { clearTimeout(refreshT); refreshT = setTimeout(() => refresh(cmdInput.value), 40) })
cmdInput.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); renderResults() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); renderResults() }
  else if (e.key === 'Escape') { e.preventDefault(); closeCmd() }
  else if (e.key === 'Enter') {
    e.preventDefault()
    forceNewTab = e.metaKey || e.ctrlKey || e.shiftKey
    const r = results[sel]
    if (r) r.go(); else if (cmdInput.value.trim()) go(cmdInput.value.trim())
    else if (cmdMode === 'newtab') { closeCmd(true); api.do('newTab') }
  } else if (e.key === 'Tab' && cmdInput.selectionStart !== cmdInput.selectionEnd) {
    e.preventDefault(); cmdInput.setSelectionRange(cmdInput.value.length, cmdInput.value.length)
  }
})
cmdResults.addEventListener('mousemove', e => { const r = e.target.closest('.res'); if (r && +r.dataset.i !== sel) { sel = +r.dataset.i; renderResults() } })
cmdResults.addEventListener('mousedown', e => { const r = e.target.closest('.res'); if (r) { e.preventDefault(); forceNewTab = e.metaKey || e.ctrlKey; results[+r.dataset.i].go() } })
let forceNewTab = false
function go(text) {
  const a = activeTab()
  const inNew = cmdMode === 'newtab' ? !(a && (a.url || '').startsWith('lumen://newtab')) : false
  closeCmd(true)
  api.do('navigate', text, inNew || forceNewTab)
  forceNewTab = false
}

// ---------------------------------------------------------------- popovers (site info, downloads)
const pop = $('#popover')
const popG = new SpringGroup({ s: 0.96, o: 0, y: -6 }, 'calm', v => { pop.style.transform = `translateY(${v.y}px) scale(${v.s})`; pop.style.opacity = Math.max(0, Math.min(1, v.o)) })
function openPopover(html, anchor, { above = false, wide = false } = {}) {
  if (overlayOpen === 'cmd') closeCmd(true)
  pop.innerHTML = html
  pop.classList.toggle('wide', wide)
  const r = anchor.getBoundingClientRect()
  overlay.classList.add('show')   // the overlay must be visible to measure the popover
  pop.classList.add('show')
  const h = pop.offsetHeight, pw = pop.offsetWidth || 300
  pop.style.left = Math.max(8, Math.min(innerWidth - pw - 8, wide ? r.right - pw : r.left)) + 'px'
  pop.style.top = (above ? Math.max(8, r.top - h - 8) : r.bottom + 8) + 'px'
  pop.style.transformOrigin = above ? '20px 100%' : '20px 0'
  showOverlay('pop')
  scrimS.to(0.35)
  popG.set({ s: 0.88, o: 0, y: above ? 12 : -12 }).to({ s: 1, o: 1, y: 0 })
  api.do('focusUI')
}
function closePopover(instant) {
  if (overlayOpen !== 'pop') return
  overlayOpen = 'closing'
  scrimS.to(0)
  const done = () => { pop.classList.remove('show'); if (overlayOpen === 'closing') hideOverlay() }
  if (instant) { popG.set({ o: 0 }); done(); return }
  popG.to({ s: 0.98, o: 0 })
  setTimeout(done, 130)
}
addEventListener('keydown', e => { if (e.key === 'Escape') { if (overlayOpen === 'pop') closePopover(); else if (findOpen) closeFind() } })

const PERM_NAMES = { 'media-audio': 'Microphone', 'media-video': 'Camera', 'media-audio+video': 'Camera and microphone', geolocation: 'Location', notifications: 'Notifications', 'clipboard-read': 'Clipboard', 'display-capture': 'Screen sharing', midi: 'MIDI', midiSysex: 'MIDI control', 'idle-detection': 'Idle detection', 'window-management': 'Window management' }
async function openSiteInfo() {
  if (!S.url || S.url.startsWith('lumen://')) { openCmd('location'); return }
  const info = await api.do('siteInfo')
  if (!info) return
  const perms = Object.entries(info.permissions || {})
  const html = `
    <h3>${esc(info.host)}</h3>
    <div class="sub">${info.secure ? ICONS.lock + ' Connection is secure' : ICONS.unlock + ' Connection is not secure'}</div>
    <div class="item"><span class="ri">${ICONS.shield}</span><div class="grow">${info.blocked} ads and trackers blocked<div class="small">On this page</div></div></div>
    <div class="item"><span class="ri">${ICONS.search}</span><div class="grow">Zoom</div><div class="zoom"><button class="ib sm" data-z="-0.5">${ICONS.minus}</button><span id="zv">${S.zoom}%</span><button class="ib sm" data-z="0.5">${ICONS.plus}</button></div></div>
    ${perms.length ? '<div class="sep"></div>' + perms.map(([k, v]) => `<div class="item"><span class="ri">${ICONS.check}</span><div class="grow">${esc(PERM_NAMES[k] || k)}</div><div class="small">${v === 'allow' ? 'Allowed' : 'Blocked'}</div></div>`).join('') + `<div class="item" data-act="reset"><span class="ri">${ICONS.reload}</span><div class="grow">Reset permissions</div></div>` : ''}
    <div class="sep"></div>
    <div class="item" data-act="reader"><span class="ri">${ICONS.book}</span><div class="grow">Reader mode</div></div>
    <div class="item" data-act="pip"><span class="ri">${ICONS.pip}</span><div class="grow">Picture in picture</div></div>
    <div class="item" data-act="shot"><span class="ri">${ICONS.camera}</span><div class="grow">Take screenshot</div></div>`
  openPopover(html, $('#urlbar'))
  pop.onclick = async e => {
    const z = e.target.closest('[data-z]')
    if (z) { await api.do('zoom', parseFloat(z.dataset.z)); setTimeout(() => { const zv = $('#zv'); if (zv) zv.textContent = S.zoom + '%' }, 60); return }
    const it = e.target.closest('[data-act]'); if (!it) return
    const act = it.dataset.act
    closePopover(true)
    if (act === 'reset') { await api.do('resetSite'); toast('Permissions reset') }
    if (act === 'reader') api.do('reader')
    if (act === 'pip') api.do('pip')
    if (act === 'shot') api.do('screenshot')
  }
}


// ---------------------------------------------------------------- main menu
const K = IS_MAC ? { cmd: 'Cmd', sh: 'Shift', opt: 'Opt' } : { cmd: 'Ctrl', sh: 'Shift', opt: 'Alt' }
async function openMainMenu() {
  const info = await api.do('menuInfo') || {}
  const up = info.update || {}
  const updateLine = up.status === 'ready' ? `<div class="mm-update" data-mm="install">${ICONS.download}<span>Lumen ${esc(String(up.latest || '').replace(/^v/, ''))} is ready</span><b>Restart</b></div>`
    : up.status === 'downloading' ? `<div class="mm-update quiet">${ICONS.download}<span>Downloading update  ${Math.round((up.progress || 0))}%</span></div>` : ''
  const item = (act, icon, label, keys, extra = '') => `<div class="item mm" data-mm="${act}"><span class="ri">${ICONS[icon]}</span><div class="grow">${label}</div>${extra}${keys ? `<kbd>${keys}</kbd>` : ''}</div>`
  const html = `
    <div class="mm-head"><div class="mm-logo"></div><div class="grow"><div class="mm-title">Lumen${info.incognito ? ' <span class="mm-pill">Private</span>' : ''}</div><div class="mm-sub">Version ${esc(info.version || '')}</div></div><button class="ib sm" data-mm="settings" title="Settings">${ICONS.gear}</button></div>
    ${updateLine}
    <div class="mm-tiles">
      <button class="mm-tile" data-mm="newtab">${ICONS.plus}<span>New Tab</span></button>
      <button class="mm-tile" data-mm="newwindow">${ICONS.tabs}<span>New Window</span></button>
      <button class="mm-tile" data-mm="private">${ICONS.mask}<span>Private</span></button>
    </div>
    <div class="mm-zoom"><span class="ri">${ICONS.search}</span><span class="grow">Zoom</span><button class="ib sm" data-mm="zoomout">${ICONS.minus}</button><span id="mm-z">${info.zoom || 100}%</span><button class="ib sm" data-mm="zoomin">${ICONS.plus}</button><button class="ib sm" data-mm="fullscreen" title="Full screen">${ICONS.split}</button></div>
    <div class="sep"></div>
    ${item('history', 'clock', 'History', `${K.cmd} Y`)}
    ${item('downloads', 'download', 'Downloads', `${K.sh} ${K.cmd} J`)}
    ${item('bookmarks', 'star', 'Bookmarks', `${K.opt} ${K.cmd} B`)}
    ${item('passwords', 'key', 'Passwords and passkeys', '', `<span class="mm-count">${(info.passwords || 0) + (info.passkeys || 0) || ''}</span>`)}
    ${item('extensions', 'puzzle', 'Extensions', '')}
    <div class="sep"></div>
    ${item('find', 'search', 'Find in page', `${K.cmd} F`)}
    ${item('reader', 'book', 'Reader mode', `${K.sh} ${K.cmd} E`)}
    ${item('pip', 'pip', 'Picture in picture', `${K.sh} ${K.cmd} P`)}
    ${item('split', 'split', S.splitId ? 'Exit split view' : 'Split view', `${K.sh} ${K.cmd} \\`)}
    ${item('screenshot', 'camera', 'Take screenshot', `${K.sh} ${K.cmd} 2`)}
    ${item('print', 'arrowRight', 'Print', `${K.cmd} P`)}
    <div class="sep"></div>
    ${item('layout', 'tabs', info.tabLayout === 'top' ? 'Move tabs to the sidebar' : 'Move tabs to the top', `${K.opt} ${K.cmd} S`)}
    ${item('intro', 'bolt', 'Replay intro', '')}`
  openPopover(html, $('#btn-menu'), { above: !TOP, wide: true })
  pop.onclick = async e => {
    const b = e.target.closest('[data-mm]'); if (!b) return
    const a = b.dataset.mm
    if (a === 'zoomin' || a === 'zoomout') { await api.do('zoom', a === 'zoomin' ? 0.5 : -0.5); setTimeout(() => { const z = $('#mm-z'); if (z) z.textContent = S.zoom + '%' }, 60); return }
    closePopover(true)
    const run = {
      settings: () => api.do('openPage', 'settings'), install: () => api.do('update', 'install'),
      newtab: () => api.do('newTab'), newwindow: () => api.do('newWindow', false), private: () => api.do('newWindow', true),
      fullscreen: () => api.do('fullscreen'),
      history: () => api.do('openPage', 'history'), downloads: () => api.do('openPage', 'downloads'), bookmarks: () => api.do('openPage', 'bookmarks'),
      passwords: () => api.do('openPage', 'passwords'), extensions: () => api.do('openPage', 'extensions'),
      find: () => openFind(), reader: () => api.do('reader'), pip: () => api.do('pip').then(ok => { if (ok === false) toast('No video on this page') }),
      split: () => toggleSplit(), screenshot: () => api.do('screenshot'), print: () => api.do('print'),
      layout: () => api.do('setSetting', 'tabLayout', TOP ? 'side' : 'top'), intro: () => playIntro(),
    }[a]
    if (run) run()
  }
}

function fmtBytes(n) { if (!n) return '0 B'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++ } return n.toFixed(i ? 1 : 0) + ' ' + u[i] }
function downloadsHTML() {
  const list = downloads.slice(0, 8)
  if (!list.length) return '<div class="empty">No downloads yet</div>'
  return `<h3>Downloads</h3><div style="height:6px"></div>` + list.map(d => {
    const pct = d.total ? Math.round(d.received / d.total * 100) : 0
    const status = d.state === 'progressing' ? `${fmtBytes(d.received)} of ${d.total ? fmtBytes(d.total) : '?'}${d.paused ? ' (paused)' : ''}` : d.state === 'completed' ? (d.exists ? fmtBytes(d.total || d.received) : 'Moved or deleted') : d.state === 'cancelled' ? 'Cancelled' : 'Failed'
    return `<div class="item" data-id="${d.id}" data-act="${d.state === 'completed' ? 'open' : ''}"><span class="ri">${ICONS.download}</span><div class="grow"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.name)}</div><div class="small">${esc(status)}</div>${d.state === 'progressing' ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</div>
      ${d.state === 'completed' && d.exists ? `<button class="ib sm" data-act="show" title="Show in folder">${ICONS.folder}</button>` : ''}
      ${d.state === 'progressing' ? `<button class="ib sm" data-act="cancel" title="Cancel">${ICONS.close}</button>` : ''}
      ${d.state === 'interrupted' || d.state === 'cancelled' ? `<button class="ib sm" data-act="retry" title="Retry">${ICONS.reload}</button>` : ''}</div>`
  }).join('') + `<div class="sep"></div><div class="item" data-act="all"><span class="ri">${ICONS.arrowRight}</span><div class="grow">Show all downloads</div></div>`
}
function openDownloads() {
  openPopover(downloadsHTML(), $('#btn-downloads'), { above: true })
  $('#btn-downloads').classList.remove('done')
  pop.onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b || !b.dataset.act) return
    const item = e.target.closest('[data-id]')
    const act = b.dataset.act
    if (act === 'all') { closePopover(true); api.do('openPage', 'downloads'); return }
    if (item) api.do('download', +item.dataset.id, act)
    if (act === 'open' || act === 'show') closePopover(true)
  }
}
function renderDownloadsButton() {
  const btn = $('#btn-downloads')
  btn.classList.toggle('show', downloads.length > 0)
  const live = downloads.filter(d => d.state === 'progressing')
  btn.classList.toggle('active', live.length > 0)
  if (live.length) {
    const tot = live.reduce((a, d) => a + (d.total || 0), 0), got = live.reduce((a, d) => a + d.received, 0)
    btn.querySelector('.ring circle').style.strokeDashoffset = 66 - 66 * (tot ? got / tot : 0.1)
  }
  if (overlayOpen === 'pop' && pop.querySelector('[data-id]')) pop.innerHTML = downloadsHTML()
}

// ---------------------------------------------------------------- find in page
let findOpen = false
const findInput = $('#find-input')
function openFind() {
  findOpen = true
  $('#findbar').classList.add('open')
  findH.to(46)
  api.do('focusUI')
  requestAnimationFrame(() => { findInput.focus(); findInput.select() })
  if (findInput.value) api.do('find', findInput.value)
}
function closeFind() {
  findOpen = false
  $('#findbar').classList.remove('open')
  findH.to(0)
  api.do('stopFind')
  $('#find-count').textContent = ''
  api.do('focusTab')
}
findInput.addEventListener('input', () => { if (findInput.value) api.do('find', findInput.value); else { api.do('stopFind'); $('#find-count').textContent = '' } })
findInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); if (findInput.value) api.do('find', findInput.value, !e.shiftKey, true) }
  if (e.key === 'Escape') { e.preventDefault(); closeFind() }
})
$('#find-next').onclick = () => findInput.value && api.do('find', findInput.value, true, true)
$('#find-prev').onclick = () => findInput.value && api.do('find', findInput.value, false, true)
$('#find-close').onclick = closeFind
api.on('find-result', r => { $('#find-count').textContent = r.total ? `${r.active} of ${r.total}` : 'No results' })

// ---------------------------------------------------------------- prompts (permissions, passwords)
const prompts = []
const promptsEl = $('#prompts')
function addPrompt(p) {
  const el = document.createElement('div')
  el.className = 'prompt'
  if (p.kind === 'permission') {
    el.innerHTML = `<div class="ph">${esc(p.host)}</div><div class="pt">Wants to ${esc(p.text)}</div>
      <label><input type="checkbox" checked> Remember for this site</label>
      <div class="row"><button class="btn primary" data-a="allow">Allow</button><button class="btn" data-a="block">Block</button></div>`
  } else {
    el.innerHTML = `<div class="ph">${esc(p.host)}</div><div class="pt">${esc(p.text)}</div>
      <div class="row"><button class="btn primary" data-a="save">Save</button><button class="btn" data-a="later">Not now</button><div class="spacer"></div><button class="btn" data-a="never">Never</button></div>`
  }
  promptsEl.appendChild(el)
  // pops in on a spring, then hands the card to Jelly for hover tilt
  el.setAttribute('data-nojelly', '')
  const g = new SpringGroup({ y: 28, o: 0, s: 0.88 }, 'calm', v => { el.style.transform = `translateY(${v.y}px) scale(${v.s})`; el.style.opacity = Math.max(0, Math.min(1, v.o)) })
  g.to({ y: 0, o: 1, s: 1 })
  g.onRest(() => { if (el.isConnected) { el.removeAttribute('data-nojelly'); el.style.transform = '' } })
  const entry = { p, el, g }
  prompts.push(entry)
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return
    const a = b.dataset.a
    const remember = el.querySelector('input') ? el.querySelector('input').checked : false
    if (p.kind === 'permission') api.do('prompt', p.id, { allow: a === 'allow', remember })
    else api.do('prompt', p.id, { allow: a === 'save', never: a === 'never' })
    prompts.splice(prompts.indexOf(entry), 1)
    el.setAttribute('data-nojelly', '')
    g.to({ y: 12, o: 0, s: 0.9 })
    g.onRest(() => { el.remove(); if (peeking && !prompts.length) closePeek() })
  })
  if (collapsed) openPeek()
  // permission prompts time out like Chrome's after a while (treated as dismissed)
  setTimeout(() => { if (prompts.includes(entry)) { const btn = el.querySelector(p.kind === 'permission' ? '[data-a="block"]' : '[data-a="later"]'); if (p.kind === 'permission') el.querySelector('input').checked = false; btn.click() } }, 120000)
}

// ---------------------------------------------------------------- toast
const toastEl = $('#toast')
const toastG = new SpringGroup({ y: 10, o: 0 }, 'calm', v => { toastEl.style.transform = `translateY(${v.y}px)`; toastEl.style.opacity = Math.max(0, Math.min(1, v.o)) })
let toastT
function toast(msg) {
  toastEl.textContent = msg
  toastEl.style.left = (collapsed && !peeking ? 16 : 14) + 'px'
  toastG.to({ y: 0, o: 1 })
  clearTimeout(toastT)
  toastT = setTimeout(() => toastG.to({ y: 10, o: 0 }), 2000)
}

// ---------------------------------------------------------------- IPC
api.on('state', s => {
  S = s
  renderChrome(); renderTabs()
  $('#extbar').classList.toggle('has', !!document.querySelector('#actions') && ($('#actions').shadowRoot ? $('#actions').shadowRoot.querySelectorAll('.action, button').length > 0 : false))
})
api.on('settings', s => applySettings(s))
api.on('downloads', d => { downloads = d; renderDownloadsButton() })
api.on('download-started', () => { const b = $('#btn-downloads'); b.classList.add('show', 'done'); requestAnimationFrame(() => Jelly.kick(b, 1.2, 1)) })
api.on('prompt', p => addPrompt(p))
api.on('toast', m => toast(m))
api.on('hover-url', u => { const h = $('#hoverurl'); if (u) h.textContent = u; h.classList.toggle('show', !!u) })
api.on('update', u => { updateState = u; $('#btn-update').classList.toggle('show', u.status === 'ready') })
api.on('fullscreen', f => { fullscreenWindow = f })
let fullscreenWindow = false
api.on('command', c => {
  if (c === 'newtab') api.do('newTab')
  else if (c === 'palette') openCmd('newtab')
  else if (c === 'menu') openMainMenu()
  else if (c === 'location') openCmd('location')
  else if (c === 'find') openFind()
  else if (c === 'findNext') { if (!findOpen) openFind(); else if (findInput.value) api.do('find', findInput.value, true, true) }
  else if (c === 'findPrev') { if (findInput.value) api.do('find', findInput.value, false, true) }
  else if (c === 'sidebar') { if (!TOP) setCollapsed(!collapsed) }
  else if (c === 'tabsTop') api.do('setSetting', 'tabLayout', TOP ? 'side' : 'top')
  else if (c === 'split') toggleSplit()
  else if (c === 'pip') api.do('pip').then(ok => { if (ok === false) toast('No video on this page') })
})

function applySettings(s) {
  const prevMotion = settings.motion
  settings = { ...settings, ...s }
  setMotion(settings.motion); Jelly.setMode(settings.motion === 'lively' ? 'jelly' : settings.motion)
  document.documentElement.style.setProperty('--accent', settings.accent || '#5b8cff')
  if (settings.sidebarWidth && settings.sidebarWidth !== sidebarW && !collapsed) { sidebarW = settings.sidebarWidth; sideX.to(sidebarW - 8) }
  if (prevMotion !== settings.motion) document.body.dataset.motion = settings.motion
  const wantTop = settings.tabLayout === 'top'
  if (wantTop !== TOP) {
    setTabLayout(wantTop)
    if (wantTop) { collapsed = false; document.body.classList.remove('collapsed'); peeking = false; sidebar.classList.remove('peek'); peekX.set(0); barH.set(sidebar.offsetHeight) }
    else { sideX.set(sidebarW - 8); if (settings.sidebarCollapsed) setCollapsed(true, { save: false, instant: true }) }
    api.do('trafficLights', !collapsed, wantTop ? { x: 16, y: 15 } : { x: 16, y: 18 })
    queueLayout()
  }
}

// watch for extension actions appearing
const extObserver = new MutationObserver(() => {
  const list = $('#actions')
  const n = list && list.shadowRoot ? list.shadowRoot.querySelectorAll('.action, button').length : 0
  $('#extbar').classList.toggle('has', n > 0)
})
setTimeout(() => { const l = $('#actions'); if (l && l.shadowRoot) extObserver.observe(l.shadowRoot, { childList: true, subtree: true }) }, 500)

// keyboard shortcuts while the chrome itself has focus
addEventListener('keydown', e => {
  const mod = IS_MAC ? e.metaKey : e.ctrlKey
  if (mod && e.key.toLowerCase() === 'l') { e.preventDefault(); openCmd('location') }
})

;(async () => {
  const init = await api.do('ready')
  engines = init.engines
  downloads = init.downloads || []
  updateState = init.update || {}
  $('#btn-update').classList.toggle('show', updateState.status === 'ready')
  applySettings(init.settings)
  sidebarW = init.settings.sidebarWidth || 248
  setCollapsed(!!init.settings.sidebarCollapsed && init.settings.tabLayout !== 'top', { save: false, instant: true })
  renderDownloadsButton()
  queueLayout()
  if (!init.settings.introSeen) playIntro()
})()
function playIntro() {
  api.do('overlay', true); api.do('intro', true)
  Intro.play({ onDone: () => { api.do('intro', false); api.do('setSetting', 'introSeen', true); if (!overlayOpen && !peeking) api.do('overlay', false) } })
}
