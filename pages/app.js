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
Jelly.init({ buttons: '.btn, .ib, .seg button, .swatches button, .nav a, .ntp .foot a, .customize, .cswatch, .gtoggle, .sb-eng', cards: '.tile, .err .ico, .key, .wpb, .thb, .icb, .rc, .pcard, .clkb, .hero-ic, .an-dial', press: '.list .row, a.row.hit' })
Jelly.smoothScroll(window)

// ======================================================================= new tab
// The New Tab (home) lives in pages/home.js and pages/home.css. It defines newTab() and buildClock().

// ======================================================================= settings shell
const SECTIONS = [
  ['general', 'General', 'gear'], ['appearance', 'Appearance', 'moon'], ['apps', 'Surge and Koi', 'sparkle'], ['ai', 'Lumen AI', 'bolt'], ['privacy', 'Privacy and security', 'shield'],
  ['passwords', 'Passwords', 'key'], ['sync', 'Sync', 'reload'], ['import', 'Move from Chrome', 'arrowRight'],
  ['extensions', 'Extensions', 'puzzle'], ['history', 'History', 'clock'], ['bookmarks', 'Bookmarks', 'star'],
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
  root.innerHTML = `<div class="shell"><nav class="nav"><div class="navhead"><img class="navlogo" src="lumen://assets/icon-${esc(S.appIcon || 'default')}.png" alt=""><h1>Lumen</h1></div><div class="navsearch">${ICONS.search}<input type="search" id="setq" placeholder="Search settings" spellcheck="false" autocomplete="off"><kbd>/</kbd></div>${SECTIONS.map(([id, label, icon]) => `${NAV_GROUPS[id] ? `<div class="navgrp">${NAV_GROUPS[id]}</div>` : ''}<a title="${label}" href="${id === 'history' || id === 'bookmarks' || id === 'downloads' || id === 'passwords' || id === 'extensions' || id === 'parcels' ? 'lumen://' + id : 'lumen://settings/' + id}" class="${id === active ? 'on' : ''}">${ICONS[icon]}${label}</a>`).join('')}</nav><main class="main rise" id="main"></main></div>`
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
  q.onkeydown = e => { if (e.key === 'Enter') { const a = document.querySelector('#main a.hit'); if (a) location.href = a.href } else if (e.key === 'Escape') { q.value = ''; q.oninput() } }
}
const sw = (key, on) => `<label class="switch"><input type="checkbox" data-set="${key}" ${on ? 'checked' : ''}><span></span></label>`
const row = (t, d, ctl) => `<div class="row"><div class="grow"><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>${ctl || ''}</div>`
const seg = (key, opts, val) => `<div class="seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`
function bindSettings(m) {
  m.querySelectorAll('[data-set]').forEach(el => el.addEventListener('change', () => { S[el.dataset.set] = el.checked; L.invoke('setSetting', el.dataset.set, el.checked) }))
  m.querySelectorAll('[data-seg]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b))
    let v = b.dataset.v; if (/^\d+$/.test(v)) v = parseInt(v)
    S[g.dataset.seg] = v; L.invoke('setSetting', g.dataset.seg, v)
  }))
  m.querySelectorAll('select[data-sel]').forEach(el => el.addEventListener('change', () => { S[el.dataset.sel] = el.value; L.invoke('setSetting', el.dataset.sel, el.value) }))
}

async function general(m) {
  const isDefault = await L.invoke('defaultBrowser')
  m.innerHTML = `<h2>General</h2><p class="lead">The basics.</p>
  <div class="card">
    ${row('Default browser', isDefault ? 'Lumen is your default browser.' : 'Open links from other apps in Lumen.', isDefault ? '<span class="pill">Default</span>' : '<button class="btn primary" id="mkdef">Make default</button>')}
    ${row('Search engine', 'Used in the address bar and on the new tab page.', `<select data-sel="searchEngine">${Object.entries(ENGINES).map(([k, v]) => `<option value="${k}" ${k === S.searchEngine ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`)}
    ${row('Search suggestions', 'Show suggestions from your search engine as you type.', sw('showSuggestions', S.showSuggestions))}
    ${row('Open where you left off', 'Bring back your tabs when Lumen starts. Pinned tabs always come back.', sw('restoreSession', S.restoreSession))}
    ${row('Show frequently visited on new tab', '', sw('homeTiles', S.homeTiles))}
    ${row('Translate pages into', 'Lumen offers to translate pages in other languages. Right-click selected text to translate just that.', `<select data-sel="translateTo">${[['', 'System language'], ['en', 'English'], ['ar', 'Arabic'], ['ur', 'Urdu'], ['hi', 'Hindi'], ['fr', 'French'], ['es', 'Spanish'], ['de', 'German'], ['tr', 'Turkish'], ['zh-CN', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['ru', 'Russian'], ['pt', 'Portuguese'], ['it', 'Italian'], ['id', 'Indonesian']].map(([v, l]) => `<option value="${v}" ${v === (S.translateTo || '') ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
    ${row('Offer to translate', 'Ask when a page is in another language.', sw('offerTranslate', S.offerTranslate !== false))}
    ${row('Flip the page direction', 'When Arabic turns into English (or the other way), the layout switches from right-to-left to left-to-right to match.', sw('translateFlipDir', S.translateFlipDir !== false))}
    ${row('Picture in picture when you switch tabs', 'A playing video pops out into a floating window when you leave its tab, and back in when you return.', sw('autoPip', S.autoPip !== false))}
  </div>
  <div class="card"><h3>QUALITY OF LIFE</h3>
    ${row('Clean links', 'Removes tracking junk like utm_source and fbclid from links before they open.', sw('cleanLinks', S.cleanLinks !== false))}
    ${row('Swipe to go back and forward', 'Two-finger swipe left or right on the trackpad.', sw('swipeNav', S.swipeNav !== false))}
    ${row('Video speed keys', 'Shift + &gt; speeds up and Shift + &lt; slows down any video, on any site.', sw('videoSpeedKeys', S.videoSpeedKeys !== false))}
    ${row('Hide cookie pop-ups', 'Blocks cookie consent banners and other annoyances along with ads.', sw('hideCookieBanners', S.hideCookieBanners !== false))}
    ${row('Block notification requests', 'Sites never ask to send you notifications.', sw('blockNotifications', !!S.blockNotifications))}
    ${row('Search shortcuts', 'Type yt, gh, w, amz, noon, maps, img, r, x, sp, tr, so, npm, news or ai, then a space and your search. Example: yt lofi beats.', sw('searchShortcuts', S.searchShortcuts !== false))}
    ${row('Remember zoom for each site', 'A site you zoomed stays zoomed next time.', sw('rememberZoom', S.rememberZoom !== false))}
    ${row('Scroll on the tab bar to switch tabs', 'Works when tabs are on top.', sw('wheelTabs', S.wheelTabs !== false))}
    ${row('Only play sound from the tab you are on', 'Other tabs are muted while you look at something else.', sw('soundActiveOnly', !!S.soundActiveOnly))}
    ${row('Open new tabs from links in the background', 'Links that open a new tab stay behind the page you are reading.', sw('linksBackground', !!S.linksBackground))}
    ${row('Ask before quitting', 'Asks before Cmd Q closes a window with several tabs.', sw('confirmQuit', S.confirmQuit !== false))}
    ${row('Dark mode for every website', 'Turns light sites dark and leaves sites that are already dark alone. Turn it off for one site from the lock icon in the address bar.', sw('forceDark', !!S.forceDark))}
    ${row('Dark mode style', 'Soft is easier on the eyes, Deep is true black.', seg('darkStyle', [['soft', 'Soft'], ['balanced', 'Balanced'], ['deep', 'Deep']], S.darkStyle || 'balanced'))}
  </div>
  <div class="card"><h3>PERFORMANCE</h3>
    ${row('Sleep inactive tabs', 'Frees memory from tabs you have not looked at in a while. They wake up instantly when you click them.', seg('sleepTabsAfterMin', [[0, 'Never'], [15, '15 min'], [30, '30 min'], [60, '1 hour'], [240, '4 hours']], S.sleepTabsAfterMin))}
  </div>
  <div class="card"><h3>PARCELS</h3>
    ${row('Save orders to Parcels automatically', 'When you place an order, the order page is saved so you can get back to it in one click, and it stays until it is delivered.', sw('parcelsAuto', S.parcelsAuto === true))}
  </div>
  <div class="card"><h3>TIDY TABS</h3>
    ${row('Archive tabs you have not used', 'Tabs you have not opened in this long close themselves. Pinned tabs and tabs playing sound stay. Find them again in History, Archived tabs.', seg('archiveTabsAfterH', [[0, 'Never'], [12, '12 hours'], [24, '1 day'], [168, '1 week']], S.archiveTabsAfterH || 0))}
  </div>
  <div class="card"><h3>DOWNLOADS</h3>
    ${row('Ask where to save each file', 'Otherwise files go straight to your Downloads folder.', sw('askWhereToSave', S.askWhereToSave))}
  </div>`
  bindSettings(m)
  const rs = $('#restart'); if (rs) rs.onclick = () => L.invoke('restart')
  const b = $('#mkdef'); if (b) b.onclick = async () => { await L.invoke('defaultBrowser', 'set'); setTimeout(() => general(m), 1200) }
}

async function aiPage(m) {
  const st = await L.invoke('aiStatus') || {}
  m.innerHTML = `<h2>Lumen AI</h2><p class="lead">Summarize any page, ask questions about it, or get a highlighted paragraph explained. Open it with Shift ${PLATFORM === 'darwin' ? 'Cmd' : 'Ctrl'} A, from the menu, or by right-clicking a page.</p>
  <div class="card"><h3>CLAUDE API KEY</h3>
    ${row(st.ready ? 'Key saved' : 'No key yet', st.ready ? 'Your key is stored encrypted on this device and only sent to Anthropic.' : 'Lumen AI runs on Claude with your own API key. Create one at console.anthropic.com, under API Keys, then paste it here.', st.ready ? '<span class="pill">Connected</span><button class="btn sm" id="aikeyrm">Remove</button>' : '')}
    <div class="row"><input id="aikey" type="password" placeholder="sk-ant-..." autocomplete="off" spellcheck="false" style="flex:1"><button class="btn primary" id="aikeysave">${st.ready ? 'Replace' : 'Save key'}</button></div>
  </div>
  <div class="card"><h3>OPTIONS</h3>
    ${row('Model', 'Fast is quicker and cheaper. Smart writes deeper answers.', seg('aiModel', [['fast', 'Fast'], ['smart', 'Smart']], S.aiModel || 'fast'))}
    ${row('Use AI to sort tab groups', 'When on, Sort tabs into groups sends your tab titles and links to Claude for smarter groups. When off, Lumen groups tabs on your device.', sw('aiTabGroups', S.aiTabGroups !== false))}
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

function appearance(m) {
  const colors = ['#5b8cff', '#7c5cff', '#e5487d', '#f0763b', '#e8b22c', '#2fb67c', '#16a3b8', '#7a7d87']
  m.innerHTML = `<h2>Appearance</h2><p class="lead">Make it yours.</p>
  <div class="card">
    ${row('Tabs', 'Down the side in a sidebar, or across the top like Chrome.', seg('tabLayout', [['side', 'Sidebar'], ['top', 'Top']], S.tabLayout || 'top'))}
    ${row('Compact mode', 'Thinner bars and tabs, more room for the page.', sw('compact', !!S.compact))}
    ${row('Bookmarks bar', 'Shows your bookmarks under the address bar when tabs are on top.', sw('bookmarksBar', S.bookmarksBar !== false))}
    ${row('Interface sounds', 'Soft pops when you open, close and switch tabs.', sw('uiSounds', !!S.uiSounds))}
  </div>
  <div class="card"><h3>BROWSER THEME</h3>
    <div class="themes">${Object.entries(LUMEN_THEMES).map(([k, v]) => `<button class="thb ${k === (S.browserTheme || 'default') ? 'on' : ''}" data-th="${k}"><i style="background:${v.bg || 'linear-gradient(135deg, #e9ecf2, #d9dde6)'}"><b class="${v.dark ? 'dk' : ''}"></b></i><span>${v.name}</span></button>`).join('')}
      <button class="thb ${S.browserTheme === 'custom' ? 'on' : ''}" data-th="custom"><i id="cprev" style="background:linear-gradient(${(S.themeCustom || {}).angle || 135}deg, ${(S.themeCustom || {}).a || '#5b8cff'}, ${(S.themeCustom || {}).b || '#8a63f2'})"><b></b></i><span>Custom</span></button></div>
    <div class="row" id="customrow" style="${S.browserTheme === 'custom' ? '' : 'display:none'}"><div class="grow"><div class="t">Your colors</div><div class="d">Pick two colors for the gradient.</div></div>
      ${[['ca', (S.themeCustom || {}).a || '#5b8cff', 'First color'], ['cb', (S.themeCustom || {}).b || '#8a63f2', 'Second color']].map(([id, v, t]) => `<label class="cswatch" title="${t}" style="--c:${esc(v)}"><input type="color" id="${id}" value="${esc(v)}"><i></i><span>${esc(v)}</span></label>`).join('')}
      <span class="angchip" style="--a:${(S.themeCustom || {}).angle || 135}deg"><em></em><select id="cang">${[90, 135, 180, 225].map(a => `<option value="${a}" ${a === ((S.themeCustom || {}).angle || 135) ? 'selected' : ''}>${a} degrees</option>`).join('')}</select></span>
      <label class="gtoggle">Glass<span class="switch"><input type="checkbox" id="cglass" ${(S.themeCustom || {}).glass ? 'checked' : ''}><span></span></span></label></div>
  </div>
  <div class="card"><h3>APP ICON</h3>
    <div class="icons">${['default', 'midnight', 'sunset', 'mint', 'ocean', 'gold', 'rose', 'mono'].map(k => `<button class="icb ${k === (S.appIcon || 'default') ? 'on' : ''}" data-ic="${k}"><img src="lumen://assets/icon-${k}.png" alt=""><span>${k[0].toUpperCase() + k.slice(1)}</span></button>`).join('')}</div>
    <p class="note" style="padding:0 18px 14px">Changes Lumen's icon in the Dock while it's running.</p>
  </div>
  <div class="card"><h3>COLORS AND MOTION</h3>
    ${row('Theme', '', seg('theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], S.theme))}
    ${row('Accent color', '', `<div class="swatches">${colors.map(c => `<button data-c="${c}" style="background:${c};color:${c}" class="${c === S.accent ? 'on' : ''}"></button>`).join('')}</div>`)}
    ${row('Motion', 'Jelly is the default: things overshoot a little and settle with a soft wobble. Calm barely overshoots. Off removes animation. Scrolling always glides straight to a stop.', seg('motion', [['jelly', 'Jelly'], ['calm', 'Calm'], ['off', 'Off']], S.motion === 'lively' ? 'jelly' : S.motion))}
  </div>
  <p class="note">Tip: hide the sidebar with Shift + ${PLATFORM === 'darwin' ? 'Cmd' : 'Ctrl'} + S and move your mouse to the left edge to peek at it. Switch between sidebar and top tabs with Option + ${PLATFORM === 'darwin' ? 'Cmd' : 'Ctrl'} + S.</p>`
  bindSettings(m)
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
  m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    m.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b))
    S.accent = b.dataset.c; L.invoke('setSetting', 'accent', b.dataset.c); applyLook(S)
  })
}

const PERM_NAMES = { 'media-audio': 'Microphone', 'media-video': 'Camera', 'media-audio+video': 'Camera and microphone', geolocation: 'Location', notifications: 'Notifications', 'clipboard-read': 'Clipboard', 'display-capture': 'Screen sharing', midi: 'MIDI', midiSysex: 'MIDI control', 'idle-detection': 'Idle detection', 'window-management': 'Window management' }
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
  const sites = Object.entries(perms)
  m.innerHTML = `<h2>Privacy and security</h2><p class="lead">Ads and trackers are blocked out of the box. No account, no telemetry.</p>
  <div class="card">
    ${row('Block ads and trackers', 'Built in, works on every site, faster pages and less data. No extension needed.', sw('adblock', S.adblock))}
    ${row('Filter lists', '<span id="abl-when">Checking</span>', '<button class="btn sm abl-btn" id="abl-go"><span class="abl-spin"></span><span class="abl-t">Update now</span></button>')}
    ${row('Sites where the ad blocker is off', (S.adblockAllow || []).length ? 'If a site looks broken or is missing things, turn the blocker off just there from the shield in the address bar.' : 'None yet. If a site looks broken or is missing things, click the shield in the address bar and turn the blocker off just for that site.', '')}
    ${(S.adblockAllow || []).map(h => `<div class="row"><div class="grow"><div class="t" style="font-weight:500">${esc(h)}</div></div><button class="btn sm" data-unallow="${esc(h)}">Block ads again</button></div>`).join('')}
    ${row('Ask sites not to track you', 'Sends Global Privacy Control and Do Not Track with every request.', sw('doNotTrack', S.doNotTrack))}
    ${row('Google sign-in', 'If Google says this browser may not be secure, switch modes and sign in again. Lumen also switches by itself once when that happens.', seg('googleSignInMode', [['chrome', 'Standard'], ['firefox', 'Compatibility']], S.googleSignInMode || 'chrome'))}
    ${row('Always use secure connections', 'Upgrades sites to HTTPS when they support it.', sw('httpsOnly', S.httpsOnly))}
  </div>
  <div class="card"><h3>CLEAR BROWSING DATA</h3>
    ${row('Time range', '', `<select id="range"><option value="3600000">Last hour</option><option value="86400000">Last 24 hours</option><option value="604800000">Last 7 days</option><option value="0" selected>All time</option></select>`)}
    ${row('History', '', '<label class="switch"><input type="checkbox" checked disabled><span></span></label>')}
    ${row('Cookies and site data', 'Signs you out of most sites.', '<label class="switch"><input type="checkbox" id="cc"><span></span></label>')}
    ${row('Cached images and files', '', '<label class="switch"><input type="checkbox" id="ca" checked><span></span></label>')}
    <div class="row"><div class="grow"></div><button class="btn primary" id="clear">Clear data</button></div>
  </div>
  <div class="card"><h3>SITE PERMISSIONS</h3>
    ${sites.length ? sites.map(([origin, p]) => Object.entries(p).map(([k, v]) => `<div class="row"><div class="grow"><div class="t">${esc(hostOf(origin))}</div><div class="d">${esc(PERM_NAMES[k] || k)}</div></div>${seg('', [['allow', 'Allow'], ['deny', 'Block']], v).replace('data-seg=""', `data-origin="${esc(origin)}" data-perm="${esc(k)}"`)}<button class="ib" data-del-origin="${esc(origin)}" data-del-perm="${esc(k)}" title="Remove">${ICONS.close}</button></div>`).join('')).join('') : '<div class="row"><div class="d">Sites you allow or block camera, location, notifications and more will show up here.</div></div>'}
  </div>`
  bindSettings(m); adblockFreshness(m)
  m.querySelectorAll('[data-unallow]').forEach(b => b.onclick = async () => { S.adblockAllow = (S.adblockAllow || []).filter(x => x !== b.dataset.unallow); await L.invoke('setSetting', 'adblockAllow', S.adblockAllow); privacy(m) })
  $('#clear').onclick = async () => {
    const b = $('#clear'); b.disabled = true; b.textContent = 'Clearing...'
    await L.invoke('clearHistory', parseInt($('#range').value), $('#cc').checked, $('#ca').checked)
    b.textContent = 'Cleared'; setTimeout(() => { b.disabled = false; b.textContent = 'Clear data' }, 1500)
  }
  m.querySelectorAll('[data-origin]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return
    g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b))
    L.invoke('setPermission', g.dataset.origin, g.dataset.perm, b.dataset.v)
  }))
  m.querySelectorAll('[data-del-origin]').forEach(b => b.onclick = async () => { await L.invoke('setPermission', b.dataset.delOrigin, b.dataset.delPerm, null); privacy(m) })
}

let confirmDelete = false
async function passwords(m) {
  const list = await L.invoke('passwords')
  m.innerHTML = `<h2>Passwords</h2><p class="lead">Passwords and passkeys, saved and filled in for you, encrypted with your ${PLATFORM === 'darwin' ? 'macOS Keychain' : 'system keychain'}. Syncs end-to-end encrypted if you turn on Sync.</p>
  <div class="toolbar"><input type="search" id="q" placeholder="Search passwords"><button class="btn" id="add">Add</button><button class="btn" id="imp">Import CSV</button><button class="btn" id="exp">Export</button></div>
  <div class="card list" id="list"></div>
  <div class="card hidden" id="addcard"><h3>ADD PASSWORD</h3><div class="row" style="gap:8px;flex-wrap:wrap"><input type="text" id="a-site" placeholder="Website" style="flex:1"><input type="text" id="a-user" placeholder="Username" style="flex:1"><input type="text" id="a-pass" placeholder="Password" style="flex:1"><button class="btn" id="a-gen">Generate</button><button class="btn primary" id="a-save">Save</button></div></div>
  <h3 style="margin:26px 4px 10px;font-size:15px">Passkeys</h3>
  <div class="card list" id="pklist"></div>
  <p class="note">When a site offers to create a passkey, Lumen saves it here and signs you in with Touch ID next time. Passkeys sync with Sync on, end-to-end encrypted.</p>
  <p class="note">In Chrome: Settings, Passwords and autofill, Google Password Manager, Settings, Export passwords. Then import the CSV here.</p>`
  const health = await L.invoke('passwordHealth') || {}
  const weakN = Object.values(health).filter(h => h.weak).length, reusedN = Object.values(health).filter(h => h.reused).length
  if (list.length) $('#main').querySelector('.toolbar').insertAdjacentHTML('beforebegin', `<div class="card health"><div class="row"><span class="hscore ${weakN + reusedN ? 'warn' : 'ok'}">${ICONS.shield}</span><div class="grow"><div class="t">${weakN + reusedN ? 'Some passwords could be stronger' : 'Your passwords look good'}</div><div class="d">${list.length} saved  ·  ${reusedN} reused  ·  ${weakN} weak. Checked on this device only.</div></div>${weakN + reusedN ? '<button class="btn sm" id="onlyrisk">Show them</button>' : ''}</div></div>`)
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
  const pks = await L.invoke('passkeys')
  $('#pklist').innerHTML = pks.length ? pks.map(p => `<div class="row" data-pk="${p.id}">${fav('https://' + p.rpId)}<div class="grow"><div class="t">${esc(p.rpId)}</div><div class="d">${esc(p.userName || 'Account')}  ·  saved ${new Date(p.createdAt).toLocaleDateString()}${p.lastUsed ? '  ·  last used ' + new Date(p.lastUsed).toLocaleDateString() : ''}</div></div><span class="pill">Passkey</span><button class="ib" data-a="delpk" title="Delete">${ICONS.close}</button></div>`).join('') : '<div class="empty">No passkeys yet. Sites like Google, GitHub, Amazon and PayPal can save one for you.</div>'
  $('#pklist').onclick = async e => { const b = e.target.closest('[data-a="delpk"]'); if (!b) return; if (!confirmDelete) { confirmDelete = true; b.title = 'Click again to delete'; b.style.color = '#e5484d'; setTimeout(() => { confirmDelete = false }, 3000); return } await L.invoke('deletePasskey', b.closest('[data-pk]').dataset.pk); passwords(m) }
  $('#add').onclick = () => $('#addcard').classList.toggle('hidden')
  $('#a-gen').onclick = async () => { $('#a-pass').value = await L.invoke('genPassword') }
  $('#a-save').onclick = async () => { if (await L.invoke('addPassword', $('#a-site').value, $('#a-user').value, $('#a-pass').value)) passwords(m) }
  $('#imp').onclick = async () => { const r = await L.invoke('importPasswords'); if (r && r.ok) { passwords(m) } else if (r && r.error) alertBox(r.error) }
  $('#exp').onclick = async () => { await L.invoke('exportPasswords') }
}
function alertBox(msg) { const n = document.createElement('p'); n.className = 'note errnote'; n.setAttribute('role', 'alert'); n.textContent = msg; const m = $('#main'), h = m.querySelector(':scope > .hero'); if (h) h.after(n); else m.prepend(n); setTimeout(() => { n.style.transition = 'opacity .3s, transform .4s'; n.style.opacity = '0'; n.style.transform = 'translateY(-6px) scale(.98)'; setTimeout(() => n.remove(), 400) }, 4000) }

async function sync(m) {
  const st = await L.invoke('sync', 'status')
  const when = st.lastSync ? new Date(st.lastSync).toLocaleString() : 'Not yet'
  m.innerHTML = `<h2>Sync</h2><p class="lead">Your bookmarks, passwords and settings on every Mac and PC you use. Encrypted on this device with your passphrase before anything leaves it. No account needed.</p>
  ${st.enabled ? `<div class="card">
      ${row('Sync is on', esc(st.folder), '<span class="pill">On</span>')}
      ${row('Last synced', esc(when), '<button class="btn" id="now">Sync now</button>')}
      ${row('Turn off sync', 'Your data stays on this device.', '<button class="btn danger" id="off">Turn off</button>')}
    </div>` : `<div class="card"><h3>TURN ON SYNC</h3>
      ${row('Sync folder', st.icloud ? 'iCloud Drive (recommended on Mac). Or pick a Dropbox, Google Drive or OneDrive folder.' : 'Pick a folder that syncs between your computers, like Dropbox, Google Drive, OneDrive or iCloud Drive.', `<span class="mono" id="folder" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg3)">${esc(st.folder || 'None')}</span><button class="btn" id="pick">Choose</button>`)}
      <div class="row"><div class="grow"><div class="t">Sync passphrase</div><div class="d">Use the same passphrase on each computer. Lumen cannot recover it for you.</div></div><input type="password" id="pp" placeholder="At least 8 characters" style="width:220px"></div>
      <div class="row"><div class="grow errtext" id="msg"></div><button class="btn primary" id="on">Turn on sync</button></div>
    </div>`}`
  let folder = st.folder
  const p = $('#pick'); if (p) p.onclick = async () => { const f = await L.invoke('sync', 'pickFolder'); if (f) { folder = f; $('#folder').textContent = f } }
  const on = $('#on'); if (on) on.onclick = async () => {
    if (!folder) { $('#msg').textContent = 'Choose a sync folder first.'; return }
    on.disabled = true; on.textContent = 'Turning on...'
    const r = await L.invoke('sync', 'enable', $('#pp').value, folder)
    if (r && r.ok) sync(m); else { $('#msg').textContent = (r && r.error) || 'Could not turn on sync'; on.disabled = false; on.textContent = 'Turn on sync'; await L.invoke('sync', 'disable') }
  }
  const now = $('#now'); if (now) now.onclick = async () => { now.textContent = 'Syncing...'; const r = await L.invoke('sync', 'now'); if (r && !r.ok) alertBox(r.error); sync(m) }
  const off = $('#off'); if (off) off.onclick = async () => { await L.invoke('sync', 'disable'); sync(m) }
}

async function importPage(m) {
  const list = await L.invoke('importables')
  m.innerHTML = `<h2>Move from Chrome</h2><p class="lead">Bring your bookmarks and extensions over in one click. Passwords come over with a CSV export.</p>
  <div class="card">${list.length ? list.map(b => row(esc(b.name), 'Bookmarks and extensions', `<label style="display:flex;gap:6px;align-items:center;font-size:13px;color:var(--fg2)"><input type="checkbox" data-ext="${b.id}" checked> Extensions</label><button class="btn primary" data-imp="${b.id}">Import</button>`)).join('') : row('No other browsers found', 'Lumen looks for Chrome, Brave, Edge and Arc on this computer.', '')}</div>
  <div class="card">${row('Passwords', 'Export them from Chrome as a CSV, then import that file.', '<button class="btn" id="pw">Import passwords CSV</button>')}</div>
  <p class="note" id="res"></p>`
  m.querySelectorAll('[data-imp]').forEach(b => b.onclick = async () => {
    b.disabled = true; b.textContent = 'Importing...'
    const r = await L.invoke('importFrom', b.dataset.imp, m.querySelector(`[data-ext="${b.dataset.imp}"]`).checked)
    b.textContent = 'Done'
    $('#res').textContent = `Imported ${r.bookmarks} bookmarks${r.extensions ? ` and ${r.extensions} extensions` : ''}.`
  })
  $('#pw').onclick = async () => { const r = await L.invoke('importPasswords'); if (r && r.ok) $('#res').textContent = `Imported ${r.count} passwords.`; else if (r && r.error) $('#res').textContent = r.error }
}

async function extensionsPage(m) {
  const list = await L.invoke('extensions')
  m.innerHTML = `<h2>Extensions</h2><p class="lead">Lumen runs Chrome extensions. Get them from the Chrome Web Store, same as in Chrome.</p>
  <div class="toolbar"><a class="btn primary" href="https://chromewebstore.google.com/" id="store">${ICONS.puzzle}Open Chrome Web Store</a><button class="btn" id="unpacked">Load unpacked</button></div>
  <div class="card list">${list.length ? list.map(x => `<div class="row">${x.icon ? `<img class="extico" src="${x.icon}" alt="">` : `<span class="extico">${ICONS.puzzle}</span>`}<div class="grow"><div class="t">${esc(x.name)}<span class="extver">${esc(x.version)}</span></div><div class="d">${esc(x.description).slice(0, 140)}</div></div><button class="btn sm danger" data-rm="${x.id}">Remove</button></div>`).join('') : '<div class="empty">No extensions yet. Add one from the Chrome Web Store.</div>'}</div>
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
async function historyPage(m) {
  if (location.hash === '#archive') return archivePage(m)
  if (location.hash === '#highlights') return highlightsPage(m)
  m.innerHTML = `<h2>History</h2><p class="lead">Everything you have visited, searchable.</p><div class="seg big" id="hseg"><button class="on">History</button><button data-go="highlights">Highlights</button><button data-go="archive">Archived tabs</button></div><div class="toolbar"><input type="search" id="q" placeholder="Search history"><button class="btn" id="clr">Clear browsing data</button></div><div id="out"></div>`
  $('#hseg').onclick = e => { const b = e.target.closest('[data-go]'); if (b) { location.hash = b.dataset.go; historyPage(m) } }
  const draw = async q => {
    const list = await L.invoke('history', q)
    if (!list.length) { $('#out').innerHTML = `<div class="empty">${q ? 'No matches' : 'Nothing here yet'}</div>`; return }
    let html = '', cur = null
    for (const h of list) {
      const lab = dayLabel(h.t)
      if (lab !== cur) { if (cur) html += '</div>'; html += `<div class="daylabel">${esc(lab)}</div><div class="card list">`; cur = lab }
      html += `<div class="row" data-url="${esc(h.url)}"><span class="htime">${new Date(h.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>${fav(h.url)}<div class="grow"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(h.title || h.url)}</div><div class="d">${esc(hostOf(h.url))}</div></div><button class="ib hov" data-forget title="Forget everything from ${esc(hostOf(h.url))}">${ICONS.trash || ICONS.close}</button><button class="ib" data-del title="Remove">${ICONS.close}</button></div>`
    }
    $('#out').innerHTML = html + '</div>'
  }
  let t; $('#q').oninput = e => { clearTimeout(t); t = setTimeout(() => draw(e.target.value), 120) }
  $('#clr').onclick = () => { location.href = 'lumen://settings/privacy' }
  $('#out').onclick = async e => {
    const r = e.target.closest('[data-url]'); if (!r) return
    if (e.target.closest('[data-del]')) { await L.invoke('deleteHistory', r.dataset.url); r.remove(); return }
    if (e.target.closest('[data-forget]')) {
      const host = hostOf(r.dataset.url)
      if (!await novaConfirm({ title: `Forget ${host}?`, text: `Remove every page from ${host} from your history?`, ok: 'Remove', danger: true, icon: ICONS.trash || ICONS.close })) return
      const n = await L.invoke('deleteHistoryHost', host); draw($('#q').value); flash(`Forgot ${n} page${n === 1 ? '' : 's'} from ${host}`); return
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
    <div class="card">
      ${row('Show in the toolbar', 'Surge and Koi buttons next to Reload, in your accent color.', sw('toolbarApps', d.toolbarApps))}
      ${row('Keep Surge and Koi running when Lumen quits', `${PLATFORM === 'darwin' ? 'Cmd Q' : 'Ctrl Q'} closes your windows and Lumen keeps running quietly for Surge and Koi. Open Lumen again and every window and tab comes back. ${PLATFORM === 'darwin' ? 'Cmd Option Q' : 'Exit Lumen, Surge and Koi'} quits everything.`, sw('backgroundApps', d.backgroundApps))}
      ${row('Start Lumen when you log in', 'Lumen opens quietly in the background so Surge and Koi are ready, without opening a window.', sw('openAtLogin', d.openAtLogin))}
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

async function highlightsPage(m) {
  let list = await L.invoke('highlights')
  m.innerHTML = `<h2>Highlights</h2><p class="lead">Select text on any page, right-click and pick Highlight. It stays there every time you come back.</p>
    <div class="seg big" id="hseg"><button data-go="history">History</button><button class="on">Highlights</button><button data-go="archive">Archived tabs</button></div>
    <div class="toolbar"><input type="search" id="q" placeholder="Search highlights"></div><div id="out"></div>`
  $('#hseg').onclick = e => { const b = e.target.closest('[data-go]'); if (!b) return; if (b.dataset.go === 'history') history.replaceState(null, '', location.pathname); else location.hash = b.dataset.go; historyPage(m) }
  const draw = q => {
    const f = list.filter(h => !q || (h.text + ' ' + h.title + ' ' + h.url).toLowerCase().includes(q.toLowerCase()))
    if (!f.length) { $('#out').innerHTML = `<div class="empty">${q ? 'No matches' : 'No highlights yet.'}</div>`; return }
    const pages = new Map(); for (const h of f) { if (!pages.has(h.url)) pages.set(h.url, []); pages.get(h.url).push(h) }
    $('#out').innerHTML = [...pages].map(([url, hs]) => `<div class="card hlcard"><a class="hlhead" data-go="${esc(url)}">${fav(url)}<div class="grow"><div class="t">${esc(hs[0].title || hostOf(url))}</div><div class="d">${esc(hostOf(url))}  ·  ${hs.length} highlight${hs.length > 1 ? 's' : ''}</div></div></a>${hs.map(h => `<div class="hl" data-id="${esc(h.id)}" data-url="${esc(url)}" data-text="${esc(h.text.slice(0, 120))}"><span class="hlbar hl-${esc(h.color)}"></span><q>${esc(h.text.length > 420 ? h.text.slice(0, 420) + '...' : h.text)}</q><button class="ib hov" data-copy title="Copy">${ICONS.link || ICONS.close}</button><button class="ib hov" data-del title="Remove">${ICONS.close}</button></div>`).join('')}</div>`).join('')
  }
  $('#q').oninput = e => draw(e.target.value)
  $('#out').onclick = async e => {
    const head = e.target.closest('[data-go]'); if (head) { L.invoke('navigate', head.dataset.go); return }
    const r = e.target.closest('.hl'); if (!r) return
    if (e.target.closest('[data-del]')) { await L.invoke('highlightRemove', r.dataset.id); list = list.filter(h => h.id !== r.dataset.id); draw($('#q').value); flash('Highlight removed'); return }
    if (e.target.closest('[data-copy]')) { await navigator.clipboard.writeText(list.find(h => h.id === r.dataset.id).text); flash('Copied'); return }
    // jump straight to the passage on the page
    const words = r.dataset.text.trim().split(/\s+/), frag = (words.length > 8 ? [words.slice(0, 4).join(' '), words.slice(-4).join(' ')] : [words.join(' ')]).map(x => encodeURIComponent(x).replace(/-/g, '%2D')).join(',')
    L.invoke('navigate', r.dataset.url + '#:~:text=' + frag)
  }
  draw('')
}

async function archivePage(m) {
  const list = await L.invoke('archive')
  const ago = t => { const mm = Math.round((Date.now() - t) / 60000); return mm < 1 ? 'just now' : mm < 60 ? mm + ' min ago' : mm < 1440 ? Math.round(mm / 60) + ' hr ago' : Math.round(mm / 1440) + ' d ago' }
  m.innerHTML = `<h2>Archived tabs</h2><p class="lead">Tabs that tidied themselves away after you stopped using them. ${S.archiveTabsAfterH ? '' : '<a href="lumen://settings/general#Archive%20tabs%20you%20have%20not%20used">Turn on tab archiving</a>'}</p>
    <div class="seg big" id="hseg"><button data-go="history">History</button><button data-go="highlights">Highlights</button><button class="on">Archived tabs</button></div>
    <div class="toolbar"><input type="search" id="q" placeholder="Search archived tabs">${list.length ? '<button class="btn" id="clrA">Clear archive</button>' : ''}</div><div id="out"></div>`
  $('#hseg').onclick = e => { const b = e.target.closest('[data-go]'); if (!b) return; if (b.dataset.go === 'history') history.replaceState(null, '', location.pathname); else location.hash = b.dataset.go; historyPage(m) }
  const draw = q => {
    const f = list.filter(x => !q || (x.title + ' ' + x.url).toLowerCase().includes(q.toLowerCase()))
    $('#out').innerHTML = f.length ? `<div class="card list">${f.map(x => `<div class="row" data-url="${esc(x.url)}">${fav(x.url)}<div class="grow"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.title || x.url)}</div><div class="d">${esc(hostOf(x.url))}  ·  archived ${ago(x.at)}</div></div><button class="btn sm" data-open>Open</button><button class="ib" data-del title="Remove">${ICONS.close}</button></div>`).join('')}</div>`
      : `<div class="empty">${q ? 'No matches' : 'No archived tabs yet. Idle tabs land here when tab archiving is on.'}</div>`
  }
  $('#q').oninput = e => draw(e.target.value)
  if ($('#clrA')) $('#clrA').onclick = async () => { await L.invoke('archiveRemove'); archivePage(m) }
  $('#out').onclick = async e => {
    const r = e.target.closest('[data-url]'); if (!r) return
    if (e.target.closest('[data-del]')) { await L.invoke('archiveRemove', r.dataset.url); list.splice(list.findIndex(x => x.url === r.dataset.url), 1); r.remove(); return }
    await L.invoke('archiveRemove', r.dataset.url)
    if (e.target.closest('[data-open]') || true) { if (e.metaKey || e.ctrlKey) { L.invoke('open', r.dataset.url, true); r.remove() } else L.invoke('navigate', r.dataset.url) }
  }
  draw('')
}

async function bookmarksPage(m) {
  m.innerHTML = `<h2>Bookmarks</h2><p class="lead">Press ${PLATFORM === 'darwin' ? 'Cmd' : 'Ctrl'} + D on any page to save it here.</p><div class="toolbar"><input type="search" id="q" placeholder="Search bookmarks"></div><div id="out"></div>`
  const all = await L.invoke('bookmarks')
  const draw = q => {
    const f = all.filter(b => !q || (b.title || '').toLowerCase().includes(q) || b.url.toLowerCase().includes(q))
    if (!f.length) { $('#out').innerHTML = `<div class="empty">${q ? 'No matches' : 'No bookmarks yet'}</div>`; return }
    const groups = {}
    for (const b of f) (groups[b.folder || ''] = groups[b.folder || ''] || []).push(b)
    $('#out').innerHTML = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).map(([folder, items]) => `${folder ? `<div class="daylabel">${esc(folder)}</div>` : ''}<div class="card list">${items.map(b => `<div class="row" data-id="${b.id}" data-url="${esc(b.url)}">${fav(b.url)}<div class="grow"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.title || b.url)}</div><div class="d">${esc(hostOf(b.url))}</div></div><button class="ib" data-del title="Delete">${ICONS.close}</button></div>`).join('')}</div>`).join('')
  }
  draw('')
  $('#q').oninput = e => draw(e.target.value.toLowerCase())
  $('#out').onclick = async e => {
    const r = e.target.closest('[data-id]'); if (!r) return
    if (e.target.closest('[data-del]')) { await L.invoke('removeBookmark', r.dataset.id); all.splice(all.findIndex(b => b.id === r.dataset.id), 1); r.remove(); return }
    if (e.metaKey || e.ctrlKey) L.invoke('open', r.dataset.url, true); else L.invoke('navigate', r.dataset.url)
  }
}

function fmtBytes(n) { if (!n) return '0 B'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++ } return n.toFixed(i ? 1 : 0) + ' ' + u[i] }
async function downloadsPage(m) {
  m.innerHTML = `<h2>Downloads</h2><p class="lead">Files you downloaded since Lumen started.</p><div class="toolbar"><div style="flex:1"></div><button class="btn" id="clr">${ICONS.trash || ''}Clear list</button></div><div class="card list" id="out"></div>`
  const draw = async () => {
    const list = await L.invoke('downloads')
    $('#out').innerHTML = list.length ? list.map(d => {
      const pct = d.total ? Math.round(d.received / d.total * 100) : 0
      const status = d.state === 'progressing' ? `${fmtBytes(d.received)} of ${d.total ? fmtBytes(d.total) : 'unknown'}${d.paused ? ', paused' : ''}` : d.state === 'completed' ? (d.exists ? fmtBytes(d.total || d.received) + '  ·  ' + esc(hostOf(d.url)) : 'Moved or deleted') : d.state === 'cancelled' ? 'Cancelled' : 'Failed'
      return `<div class="row" data-id="${d.id}"><span class="dlico ${d.state === 'progressing' ? 'busy' : d.state === 'completed' && d.exists ? '' : 'bad'}">${ICONS.download}</span><div class="grow"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.name)}</div><div class="d">${status}</div>${d.state === 'progressing' ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</div>
        ${d.state === 'completed' && d.exists ? '<button class="btn sm" data-a="open">Open</button><button class="btn sm" data-a="show">Show in folder</button>' : ''}
        ${d.state === 'progressing' ? `<button class="btn sm" data-a="pause">${d.paused ? 'Resume' : 'Pause'}</button><button class="btn sm danger" data-a="cancel">Cancel</button>` : ''}
        ${d.state === 'interrupted' || d.state === 'cancelled' ? '<button class="btn sm" data-a="retry">Retry</button>' : ''}
        <button class="ib" data-a="remove" title="Remove from list">${ICONS.close}</button></div>`
    }).join('') : '<div class="empty">No downloads yet</div>'
  }
  $('#out').onclick = async e => { const b = e.target.closest('[data-a]'); if (!b) return; await L.invoke('download', +b.closest('[data-id]').dataset.id, b.dataset.a); draw() }
  $('#clr').onclick = async () => { await L.invoke('download', -1, 'clear'); draw() }
  draw(); setInterval(draw, 1000)
}

async function about(m) {
  const st = await L.invoke('update', 'state')
  const desc = s => !s ? '' : s.status === 'checking' ? 'Checking for updates...' : s.status === 'downloading' ? `Downloading update... ${Math.round(s.progress || 0)}%` : s.status === 'ready' ? `Version ${esc(s.latest)} is ready. Restart to finish updating.` : s.status === 'available' ? (s.reason || `Version ${esc(s.latest)} is available.`) : s.status === 'uptodate' ? 'Lumen is up to date.' : s.status === 'unpacking' ? 'Unpacking the update...' : s.status === 'installing' ? 'Restarting...' : s.status === 'error' ? 'Could not check for updates. ' + esc(s.error || '') : ''
  m.innerHTML = `<div class="abouthero rise"><img class="ahicon" src="lumen://assets/icon-${esc(S.appIcon || 'default')}.png" alt=""><div><h2>Lumen</h2><div class="ahver">Version ${esc(VERSION)}</div><p class="lead">A fast, private browser with Chrome's engine and a calmer feel.</p>
    <div class="ahbtns"><button class="btn" id="replay">Replay the intro</button><a class="btn" href="lumen://settings/general">Settings</a></div></div></div>
  <div class="card">
    ${row('Updates', `<span id="ud">${desc(st)}</span>`, `<button class="btn" id="chk">Check for updates</button><button class="btn primary ${st && st.status === 'ready' ? '' : 'hidden'}" id="rst">Restart</button>`)}
    ${row('Automatic updates', 'Download updates in the background and install them when you quit.', sw('autoUpdate', S.autoUpdate))}
  </div>
  <div class="card">
    ${row('Engine', 'Chromium, the same engine as Google Chrome, so every site works the same.', '')}
    ${row('Built in', 'Ad and tracker blocking, password manager, encrypted sync, split view, reader mode, picture in picture, tab sleeping, Chrome extensions.', '')}
  </div>`
  bindSettings(m)
  $('#chk').onclick = async () => { $('#ud').textContent = 'Checking for updates...'; const s = await L.invoke('update', 'check'); $('#ud').innerHTML = desc(s); $('#rst').classList.toggle('hidden', !(s && s.status === 'ready')) }
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
function errorPage() {
  const p = new URLSearchParams(location.search)
  const code = p.get('code') || '', url = p.get('url') || ''
  const [title, text] = ERRORS[code] || (parseInt(code) <= -200 && parseInt(code) > -300 ? ERRORS['-200'] : ['This page is not working', 'Something went wrong while loading it.'])
  const kind = ERR_KIND(code), host = hostOf(url)
  document.title = host || 'Error'
  root.innerHTML = `<div class="err k-${kind}"><div class="errglow"></div><div class="rise">
    <div class="ico"><svg viewBox="0 0 16 16" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ERR_ART[kind]}</svg></div>
    <div class="crash-why">${{ offline: 'No internet', dns: 'Address not found', cert: 'Certificate problem', slow: 'Timed out', refused: 'Connection refused', other: 'Could not load' }[kind]}</div>
    <h1>${esc(title)}</h1><p>${esc(text)}</p>
    <code>${esc(host || url)}  ·  ${esc(p.get('desc') || '')}</code>
    ${kind === 'offline' ? '<div class="errwait"><i></i>Lumen will reload the page as soon as you are back online</div>' : ''}
    <div class="erracts">${history.length > 1 ? '<button class="btn" id="eback">Go back</button>' : ''}${kind === 'dns' && host ? `<button class="btn" id="esearch">Search for ${esc(host.replace(/^www\./, ''))}</button>` : ''}<button class="btn primary" id="retry">Try again</button></div>
  </div></div>`
  $('#retry').onclick = () => L.invoke('retry', url)
  if ($('#eback')) $('#eback').onclick = () => history.back()
  if ($('#esearch')) $('#esearch').onclick = () => L.invoke('navigate', host.replace(/^www\./, '').split('.')[0] + ' ' + host)
  if (kind === 'offline') addEventListener('online', () => L.invoke('retry', url), { once: true })
}

// ======================================================================= crashed tab
const CRASH_WHY = { oom: 'It ran out of memory', crashed: 'The page stopped working', killed: 'The page was stopped', 'launch-failed': 'The page could not start', 'integrity-failure': 'The page could not start', abnormal: 'The page stopped working' }
function crashedPage() {
  const p = new URLSearchParams(location.search)
  const url = p.get('url') || '', host = hostOf(url), why = CRASH_WHY[p.get('reason')] || ''
  document.title = host ? host + ' crashed' : 'This tab crashed'
  root.innerHTML = `<div class="err crash"><div class="errglow"></div><div class="rise">
    <div class="ico"><svg viewBox="0 0 16 16" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3.5h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM2 6h12"/><path d="m6 8.2 1.6 1.6M7.6 8.2 6 9.8M8.6 8.2l1.6 1.6M10.2 8.2 8.6 9.8"/></svg></div>
    ${why ? `<div class="crash-why">${esc(why)}</div>` : ''}
    <h1>This tab crashed</h1><p>Something went wrong while showing ${host ? esc(host.replace(/^www\./, '')) : 'this page'}. Your other tabs are fine. Reload to try again.</p>
    ${url ? `<code>${esc(url)}</code>` : '<div style="height:26px"></div>'}
    <div class="erracts"><button class="btn" id="cnew">Open New Tab</button><button class="btn primary" id="creload">${ICONS.reload}Reload</button></div>
    <p class="crash-tip">If it keeps crashing, the page may need more memory than it can get. Closing a few tabs can help.</p>
  </div></div>`
  $('#creload').onclick = () => L.invoke('retry', /^(https?|lumen):\/\//i.test(url) ? url : 'lumen://newtab')
  $('#cnew').onclick = () => L.invoke('retry', 'lumen://newtab')
  setTimeout(() => $('#creload').focus(), 60)
}

// ======================================================================= section heroes and springy segmented controls
// Pages keep writing a plain <h2> and lead; this dresses them up as a lit liquid-glass hero with the section's icon,
// in the same color as its chip in the sidebar.
let CUR_SECTION = ''
const HERO_HUE = [0, 40, 85, 140, 200, 250, 300]
const HERO_ICON = { Search: 'search', Highlights: 'book', 'Archived tabs': 'layers' }
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
    history: () => historyPage(shell('history')), bookmarks: () => bookmarksPage(shell('bookmarks')), downloads: () => downloadsPage(shell('downloads')),
    passwords: () => passwords(shell('passwords')), extensions: () => extensionsPage(shell('extensions')), about: () => about(shell('about')),
    settings: () => {
      const s = sub || 'general'
      const fn = { apps: appsPage, general, appearance, ai: aiPage, privacy, passwords, sync, import: importPage, extensions: extensionsPage, about, history: historyPage, bookmarks: bookmarksPage, downloads: downloadsPage }[s] || general
      fn(shell(s in { apps: 1, general: 1, appearance: 1, ai: 1, privacy: 1, passwords: 1, sync: 1, import: 1, extensions: 1, about: 1 } ? s : 'general'))
    },
  }
  ;(routes[page] || routes.newtab)()
})()
