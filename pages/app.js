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
const $$ = s => [...document.querySelectorAll(s)]

let S = {}, ENGINES = {}, VERSION = '', PLATFORM = ''
const page = location.host
const sub = location.pathname.replace(/^\/+|\/+$/g, '')

function applyLook(s) {
  document.documentElement.style.setProperty('--accent', s.accent || '#5b8cff')
  document.body.dataset.motion = s.motion
  Jelly.setMode(s.motion === 'lively' ? 'jelly' : s.motion)
}
Jelly.init({ buttons: '.btn, .ib, .seg button, .swatches button, .nav a, .ntp .foot a, .customize', cards: '.tile, .err .ico, .key, .wpb', press: '.list .row' })
Jelly.smoothScroll(window)

// ======================================================================= new tab
function greeting() { const h = new Date().getHours(); return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const WALLPAPERS = {
  aurora: { name: 'Aurora', css: '' },
  sunset: { name: 'Sunset', css: 'radial-gradient(60% 50% at 20% 20%, #ff8a5c55, transparent 70%), radial-gradient(55% 50% at 80% 75%, #c94b9a55, transparent 70%), linear-gradient(160deg, #2a1a3a, #40243f 50%, #1f1530)' },
  ocean: { name: 'Ocean', css: 'radial-gradient(60% 55% at 25% 30%, #2bb6d955, transparent 70%), radial-gradient(50% 50% at 80% 70%, #3d6dff55, transparent 70%), linear-gradient(170deg, #0c1f33, #0f2f4a 55%, #0a1828)' },
  forest: { name: 'Forest', css: 'radial-gradient(60% 50% at 20% 25%, #3ccf8e44, transparent 70%), radial-gradient(50% 50% at 80% 75%, #c8e06a33, transparent 70%), linear-gradient(165deg, #0f2219, #163326 55%, #0c1a14)' },
  dusk: { name: 'Dusk', css: 'radial-gradient(60% 50% at 25% 25%, #8a63f255, transparent 70%), radial-gradient(55% 50% at 80% 70%, #f0763b44, transparent 70%), linear-gradient(160deg, #1a1630, #2a1f3f 55%, #120f22)' },
  plain: { name: 'Plain', css: 'var(--bg)' },
}
function addShortcutDialog(onSave) {
  const d = document.createElement('div'); d.className = 'ntp-modal'
  d.innerHTML = `<form class="ntp-card rise"><h3>Add shortcut</h3><input type="text" id="sc-name" placeholder="Name"><input type="text" id="sc-url" placeholder="Website address" required><div class="row2"><button type="button" class="btn" id="sc-cancel">Cancel</button><button class="btn primary">Add</button></div></form>`
  document.body.appendChild(d)
  d.querySelector('#sc-url').focus()
  d.querySelector('#sc-cancel').onclick = () => d.remove()
  d.onclick = e => { if (e.target === d) d.remove() }
  d.querySelector('form').onsubmit = e => {
    e.preventDefault()
    let url = d.querySelector('#sc-url').value.trim(); if (!url) return
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    let host; try { host = new URL(url).host } catch { return }
    onSave({ url, title: d.querySelector('#sc-name').value.trim() || host.replace(/^www\./, '') }); d.remove()
  }
}
async function newTab() {
  document.title = 'New Tab'
  const custom = Array.isArray(S.ntpShortcuts)
  const sites = custom ? S.ntpShortcuts : (S.homeTiles ? (await L.invoke('topSites')).map(s => ({ url: s.url, title: s.host.replace(/^www\./, '') })) : [])
  const wp = S.ntpWallpaper || 'aurora'
  const img = wp === 'custom' ? await L.invoke('wallpaper') : ''
  root.innerHTML = `<div class="ntp wp-${esc(wp)}" id="ntp">
    <div class="ntp-bg" style="${wp === 'custom' && img ? `background-image:url('${img}')` : WALLPAPERS[wp] && WALLPAPERS[wp].css ? `background:${WALLPAPERS[wp].css}` : ''}"></div>
    ${S.ntpClock !== false ? `<div class="clock rise" id="clock"></div><div class="date rise" style="animation-delay:.04s" id="date"></div>` : '<div style="height:40px"></div>'}
    <form class="searchbox rise" style="animation-delay:.08s" id="sf">${ICONS.search}<input id="q" autofocus placeholder="Search ${esc(ENGINES[S.searchEngine] || 'Google')} or type an address" spellcheck="false" autocomplete="off"></form>
    <div class="tiles" id="tiles">${sites.map((s, i) => `<div class="tile rise" style="animation-delay:${0.12 + i * 0.03}s" data-url="${esc(s.url)}" data-i="${i}"><div class="ti">${fav(s.url)}</div><span>${esc(s.title || hostOf(s.url))}</span><button class="tx" title="Remove">${ICONS.close}</button></div>`).join('')}${sites.length < 12 ? `<div class="tile add rise" style="animation-delay:${0.12 + sites.length * 0.03}s" id="addtile"><div class="ti">${ICONS.plus}</div><span>Add</span></div>` : ''}</div>
    <div class="foot"><a href="lumen://history">History</a><a href="lumen://bookmarks">Bookmarks</a><a href="lumen://passwords">Passwords</a><a href="lumen://settings">Settings</a></div>
    <button class="customize" id="cust">${ICONS.tune}<span>Customize</span></button>
  </div>
  <aside class="drawer" id="drawer">
    <div class="dh"><b>Customize</b><button class="ib" id="dclose">${ICONS.close}</button></div>
    <div class="dl">Wallpaper</div>
    <div class="wps">${Object.entries(WALLPAPERS).map(([k, v]) => `<button class="wpb ${k === wp ? 'on' : ''}" data-wp="${k}" title="${v.name}"><i class="wp-${k}" style="${v.css && v.css !== 'var(--bg)' ? `background:${v.css}` : ''}"></i><span>${v.name}</span></button>`).join('')}
      <label class="wpb ${wp === 'custom' ? 'on' : ''}" title="Your own image"><i class="wpup">${ICONS.plus}</i><span>Your image</span><input type="file" id="wpfile" accept="image/*" hidden></label></div>
    <div class="dl">Shortcuts</div>
    <div class="seg" id="scmode"><button data-v="auto" class="${custom ? '' : 'on'}">Most visited</button><button data-v="mine" class="${custom ? 'on' : ''}">My shortcuts</button></div>
    <label class="drow"><span>Show clock</span><span class="switch"><input type="checkbox" id="clk" ${S.ntpClock !== false ? 'checked' : ''}><span></span></span></label>
  </aside>`
  const tick = () => {
    const c = $('#clock'); if (!c) return
    const d = new Date()
    const tt = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '')
    if (c.dataset.t !== tt) { c.dataset.t = tt; c.textContent = tt; Jelly.letters(c) }
    $('#date').textContent = greeting() + '  ·  ' + d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  }
  tick(); clearInterval(window.__clk); window.__clk = setInterval(tick, 5000)
  if (!window.__trail) window.__trail = Jelly.trail({ size: 26, style: 'border:1.5px solid color-mix(in srgb, var(--accent) 70%, transparent);background:color-mix(in srgb, var(--accent) 10%, transparent)' })
  $('#sf').onsubmit = e => { e.preventDefault(); const v = $('#q').value.trim(); if (v) L.invoke('navigate', v) }
  setTimeout(() => $('#q').focus(), 30)
  const save = list => { S.ntpShortcuts = list; L.invoke('setSetting', 'ntpShortcuts', list).then(newTab) }
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
  $('#clk').onchange = e => { S.ntpClock = e.target.checked; L.invoke('setSetting', 'ntpClock', e.target.checked).then(() => newTab().then(() => $('#drawer').classList.add('open'))) }
}

// ======================================================================= settings shell
const SECTIONS = [
  ['general', 'General', 'gear'], ['appearance', 'Appearance', 'moon'], ['privacy', 'Privacy and security', 'shield'],
  ['passwords', 'Passwords', 'key'], ['sync', 'Sync', 'reload'], ['import', 'Move from Chrome', 'arrowRight'],
  ['extensions', 'Extensions', 'puzzle'], ['history', 'History', 'clock'], ['bookmarks', 'Bookmarks', 'star'],
  ['downloads', 'Downloads', 'download'], ['about', 'About Lumen', 'bolt'],
]
function shell(active) {
  root.innerHTML = `<div class="shell"><nav class="nav"><h1>Lumen</h1>${SECTIONS.map(([id, label, icon]) => `<a href="${id === 'history' || id === 'bookmarks' || id === 'downloads' || id === 'passwords' || id === 'extensions' ? 'lumen://' + id : 'lumen://settings/' + id}" class="${id === active ? 'on' : ''}">${ICONS[icon]}${label}</a>`).join('')}</nav><main class="main rise" id="main"></main></div>`
  document.title = active === 'general' ? 'Settings' : (SECTIONS.find(s => s[0] === active) || [, 'Settings'])[1]
  return $('#main')
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
    ${row('Picture in picture when you switch tabs', 'A playing video pops out into a floating window when you leave its tab, and back in when you return.', sw('autoPip', S.autoPip !== false))}
  </div>
  <div class="card"><h3>QUALITY OF LIFE</h3>
    ${row('Clean links', 'Removes tracking junk like utm_source and fbclid from links before they open.', sw('cleanLinks', S.cleanLinks !== false))}
    ${row('Swipe to go back and forward', 'Two-finger swipe left or right on the trackpad.', sw('swipeNav', S.swipeNav !== false))}
    ${row('Video speed keys', 'Shift + &gt; speeds up and Shift + &lt; slows down any video, on any site.', sw('videoSpeedKeys', S.videoSpeedKeys !== false))}
    ${row('Hide cookie pop-ups', 'Blocks cookie consent banners and other annoyances along with ads.', sw('hideCookieBanners', S.hideCookieBanners !== false))}
    ${row('Block notification requests', 'Sites never ask to send you notifications.', sw('blockNotifications', !!S.blockNotifications))}
    ${row('Dark mode for every website', 'Turns light sites dark. Takes effect after Lumen restarts.', sw('forceDark', !!S.forceDark) + '<button class="btn sm" id="restart">Restart</button>')}
  </div>
  <div class="card"><h3>PERFORMANCE</h3>
    ${row('Sleep inactive tabs', 'Frees memory from tabs you have not looked at in a while. They wake up instantly when you click them.', seg('sleepTabsAfterMin', [[0, 'Never'], [15, '15 min'], [30, '30 min'], [60, '1 hour'], [240, '4 hours']], S.sleepTabsAfterMin))}
  </div>
  <div class="card"><h3>DOWNLOADS</h3>
    ${row('Ask where to save each file', 'Otherwise files go straight to your Downloads folder.', sw('askWhereToSave', S.askWhereToSave))}
  </div>`
  bindSettings(m)
  $('#restart').onclick = () => L.invoke('restart')
  const b = $('#mkdef'); if (b) b.onclick = async () => { await L.invoke('defaultBrowser', 'set'); setTimeout(() => general(m), 1200) }
}

function appearance(m) {
  const colors = ['#5b8cff', '#7c5cff', '#e5487d', '#f0763b', '#e8b22c', '#2fb67c', '#16a3b8', '#7a7d87']
  m.innerHTML = `<h2>Appearance</h2><p class="lead">Make it yours.</p>
  <div class="card">
    ${row('Tabs', 'Down the side in a sidebar, or across the top like Chrome.', seg('tabLayout', [['side', 'Sidebar'], ['top', 'Top']], S.tabLayout || 'top'))}
    ${row('Theme', '', seg('theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], S.theme))}
    ${row('Accent color', '', `<div class="swatches">${colors.map(c => `<button data-c="${c}" style="background:${c};color:${c}" class="${c === S.accent ? 'on' : ''}"></button>`).join('')}</div>`)}
    ${row('Motion', 'Jelly is the default: things overshoot a little and settle with a soft wobble. Calm barely overshoots. Off removes animation. Scrolling always glides straight to a stop.', seg('motion', [['jelly', 'Jelly'], ['calm', 'Calm'], ['off', 'Off']], S.motion === 'lively' ? 'jelly' : S.motion))}
  </div>
  <p class="note">Tip: hide the sidebar with Shift + ${PLATFORM === 'darwin' ? 'Cmd' : 'Ctrl'} + S and move your mouse to the left edge to peek at it. Switch between sidebar and top tabs with Option + ${PLATFORM === 'darwin' ? 'Cmd' : 'Ctrl'} + S.</p>`
  bindSettings(m)
  m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    m.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b))
    S.accent = b.dataset.c; L.invoke('setSetting', 'accent', b.dataset.c); applyLook(S)
  })
}

const PERM_NAMES = { 'media-audio': 'Microphone', 'media-video': 'Camera', 'media-audio+video': 'Camera and microphone', geolocation: 'Location', notifications: 'Notifications', 'clipboard-read': 'Clipboard', 'display-capture': 'Screen sharing', midi: 'MIDI', midiSysex: 'MIDI control', 'idle-detection': 'Idle detection', 'window-management': 'Window management' }
async function privacy(m) {
  const perms = await L.invoke('permissions')
  const sites = Object.entries(perms)
  m.innerHTML = `<h2>Privacy and security</h2><p class="lead">Ads and trackers are blocked out of the box. No account, no telemetry.</p>
  <div class="card">
    ${row('Block ads and trackers', 'Built in, works on every site, faster pages and less data. No extension needed.', sw('adblock', S.adblock))}
    ${row('Ask sites not to track you', 'Sends Global Privacy Control and Do Not Track with every request.', sw('doNotTrack', S.doNotTrack))}
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
  bindSettings(m)
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
function alertBox(msg) { const n = document.createElement('p'); n.className = 'note'; n.style.color = '#e5484d'; n.textContent = msg; $('#main').prepend(n); setTimeout(() => n.remove(), 4000) }

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
      <div class="row"><div class="grow" id="msg" style="color:#e5484d;font-size:13px"></div><button class="btn primary" id="on">Turn on sync</button></div>
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
  <div class="toolbar"><a class="btn primary" style="display:inline-flex;align-items:center" href="https://chromewebstore.google.com/" id="store">Open Chrome Web Store</a><button class="btn" id="unpacked">Load unpacked</button></div>
  <div class="card list">${list.length ? list.map(x => `<div class="row">${x.icon ? `<img src="${x.icon}" style="width:28px;height:28px">` : `<span style="width:28px;display:grid;place-items:center;color:var(--fg3)">${ICONS.puzzle}</span>`}<div class="grow"><div class="t">${esc(x.name)} <span style="color:var(--fg3);font-weight:400;font-size:12px">${esc(x.version)}</span></div><div class="d">${esc(x.description).slice(0, 140)}</div></div><button class="btn sm danger" data-rm="${x.id}">Remove</button></div>`).join('') : '<div class="empty">No extensions yet</div>'}</div>
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
  m.innerHTML = `<h2>History</h2><p class="lead">Everything you have visited, searchable.</p><div class="toolbar"><input type="search" id="q" placeholder="Search history"><button class="btn" id="clr">Clear browsing data</button></div><div id="out"></div>`
  const draw = async q => {
    const list = await L.invoke('history', q)
    if (!list.length) { $('#out').innerHTML = `<div class="empty">${q ? 'No matches' : 'Nothing here yet'}</div>`; return }
    let html = '', cur = null
    for (const h of list) {
      const lab = dayLabel(h.t)
      if (lab !== cur) { if (cur) html += '</div>'; html += `<div class="daylabel">${esc(lab)}</div><div class="card list">`; cur = lab }
      html += `<div class="row" data-url="${esc(h.url)}"><span style="width:64px;color:var(--fg3);font-size:12.5px;flex:none">${new Date(h.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>${fav(h.url)}<div class="grow"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(h.title || h.url)}</div><div class="d">${esc(hostOf(h.url))}</div></div><button class="ib" data-del title="Remove">${ICONS.close}</button></div>`
    }
    $('#out').innerHTML = html + '</div>'
  }
  let t; $('#q').oninput = e => { clearTimeout(t); t = setTimeout(() => draw(e.target.value), 120) }
  $('#clr').onclick = () => { location.href = 'lumen://settings/privacy' }
  $('#out').onclick = async e => {
    const r = e.target.closest('[data-url]'); if (!r) return
    if (e.target.closest('[data-del]')) { await L.invoke('deleteHistory', r.dataset.url); r.remove(); return }
    if (e.metaKey || e.ctrlKey) L.invoke('open', r.dataset.url, true); else L.invoke('navigate', r.dataset.url)
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
  m.innerHTML = `<h2>Downloads</h2><p class="lead">Files you downloaded since Lumen started.</p><div class="toolbar"><div style="flex:1"></div><button class="btn" id="clr">Clear list</button></div><div class="card list" id="out"></div>`
  const draw = async () => {
    const list = await L.invoke('downloads')
    $('#out').innerHTML = list.length ? list.map(d => {
      const pct = d.total ? Math.round(d.received / d.total * 100) : 0
      const status = d.state === 'progressing' ? `${fmtBytes(d.received)} of ${d.total ? fmtBytes(d.total) : 'unknown'}${d.paused ? ', paused' : ''}` : d.state === 'completed' ? (d.exists ? fmtBytes(d.total || d.received) + '  ·  ' + esc(hostOf(d.url)) : 'Moved or deleted') : d.state === 'cancelled' ? 'Cancelled' : 'Failed'
      return `<div class="row" data-id="${d.id}"><span style="color:var(--fg3)">${ICONS.download}</span><div class="grow"><div class="t" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.name)}</div><div class="d">${status}</div>${d.state === 'progressing' ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}</div>
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
  const desc = s => !s ? '' : s.status === 'checking' ? 'Checking for updates...' : s.status === 'downloading' ? `Downloading update... ${Math.round((s.progress || 0) * 100)}%` : s.status === 'ready' ? `Version ${esc(s.latest)} is ready. Restart to finish updating.` : s.status === 'available' ? (s.reason || `Version ${esc(s.latest)} is available.`) : s.status === 'uptodate' ? 'Lumen is up to date.' : s.status === 'unpacking' ? 'Unpacking the update...' : s.status === 'installing' ? 'Restarting...' : s.status === 'error' ? 'Could not check for updates. ' + esc(s.error || '') : ''
  m.innerHTML = `<h2>About Lumen</h2><p class="lead">A fast, private browser with Chrome's engine and a calmer feel.</p>
  <div class="card">
    ${row('Version ' + esc(VERSION), `<span id="ud">${desc(st)}</span>`, `<button class="btn" id="chk">Check for updates</button><button class="btn primary ${st && st.status === 'ready' ? '' : 'hidden'}" id="rst">Restart</button>`)}
    ${row('Automatic updates', 'Download updates in the background and install them when you quit.', sw('autoUpdate', S.autoUpdate))}
  </div>
  <div class="card">
    ${row('Engine', 'Chromium, the same engine as Google Chrome, so every site works the same.', '')}
    ${row('Built in', 'Ad and tracker blocking, password manager, encrypted sync, split view, reader mode, picture in picture, tab sleeping, Chrome extensions.', '')}
  </div>`
  bindSettings(m)
  $('#chk').onclick = async () => { $('#ud').textContent = 'Checking for updates...'; const s = await L.invoke('update', 'check'); $('#ud').innerHTML = desc(s); $('#rst').classList.toggle('hidden', !(s && s.status === 'ready')) }
  $('#rst').onclick = () => L.invoke('update', 'install')
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
function errorPage() {
  const p = new URLSearchParams(location.search)
  const code = p.get('code') || '', url = p.get('url') || ''
  const [title, text] = ERRORS[code] || (parseInt(code) <= -200 && parseInt(code) > -300 ? ERRORS['-200'] : ['This page is not working', 'Something went wrong while loading it.'])
  document.title = hostOf(url) || 'Error'
  root.innerHTML = `<div class="err"><div class="rise"><div class="ico">${ICONS.globe}</div><h1>${esc(title)}</h1><p>${esc(text)}</p><code>${esc(hostOf(url) || url)}  ·  ${esc(p.get('desc') || '')}</code><button class="btn primary" id="retry">Try again</button></div></div>`
  $('#retry').onclick = () => L.invoke('retry', url)
}

// ======================================================================= boot
;(async () => {
  const init = await L.invoke('settings')
  S = init.settings; ENGINES = init.engines; VERSION = init.version; PLATFORM = init.platform
  applyLook(S)
  L.onSettings(s => { S = s; applyLook(s) })
  const routes = {
    newtab: newTab, error: errorPage,
    history: () => historyPage(shell('history')), bookmarks: () => bookmarksPage(shell('bookmarks')), downloads: () => downloadsPage(shell('downloads')),
    passwords: () => passwords(shell('passwords')), extensions: () => extensionsPage(shell('extensions')), about: () => about(shell('about')),
    settings: () => {
      const s = sub || 'general'
      const fn = { general, appearance, privacy, passwords, sync, import: importPage, extensions: extensionsPage, about, history: historyPage, bookmarks: bookmarksPage, downloads: downloadsPage }[s] || general
      fn(shell(s in { general: 1, appearance: 1, privacy: 1, passwords: 1, sync: 1, import: 1, extensions: 1, about: 1 } ? s : 'general'))
    },
  }
  ;(routes[page] || routes.newtab)()
})()
