// Lumen 4.0 home (lumen://newtab): widgets on and off, drag to reorder (and it persists), suggestions,
// the private look, narrow windows, Motion Off, and idle CPU of the New Tab renderer.
// Run: xvfb-run -a npx electron test/home40.js --no-sandbox   (log: /tmp/lumen-home40.log)
const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-home40', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-home40')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-home40.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const errors = []
app.on('web-contents-created', (e, wc) => wc.on('console-message', (a, b, c) => {
  const lvl = typeof a === 'object' && a && a.level !== undefined ? a.level : b, msg = typeof a === 'object' && a && a.message !== undefined ? a.message : c
  if ((lvl === 'error' || lvl === 3) && !/favicon|ERR_|net::|Failed to load resource/i.test(msg)) errors.push(String(msg).slice(0, 200))
}))
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  for (const [u, t] of [['https://github.com/a', 'GitHub thing'], ['https://news.example.com/', 'Some news'], ['https://docs.example.org/x', 'Docs page']]) L.D.addHistory(u, t)
  L.D.addReadLater('https://example.com/later', 'Saved article')
  L.D.settings.set({ ntpShortcuts: ['https://a.example', 'https://b.example', 'https://c.example'].map(url => ({ url, title: url.slice(8, 9).toUpperCase() })) })
  w.win.setContentSize(1280, 820); await wait(500)

  const open = async (ww = w) => { const t = ww.createTab('lumen://newtab', { active: true }); await wait(4500); return t }
  let t = await open()
  const pg = s => t.view.webContents.executeJavaScript(s)
  const ids = () => pg(`[...document.querySelectorAll('#widgets [data-w]')].map(e => e.dataset.w).join(',')`)

  // ---- the page
  ok(await pg(`!!document.querySelector('#hero #clock') && !!document.querySelector('#greet').textContent.trim()`), 'hero has the clock and a greeting')
  ok(await pg(`!!document.querySelector('#sf #q') && !!document.querySelector('#kcmd') && !!document.querySelector('#kask')`), 'search pill with Cmd K and Ask')
  const first = await ids()
  ok(/^shortcuts,stats,recent,focus,later,parcels,notes,calendar,clocks,wallpaper$/.test(first), 'default widgets in order: ' + first)
  ok(await pg(`document.querySelectorAll('#tiles .tile[data-url]').length`) === 3, 'three shortcut tiles')
  ok(await pg(`(() => { const all = [...document.querySelectorAll('#widgets [data-w], #hero, #sf')].map(e => e.getBoundingClientRect()); return all.every(r => r.left >= 0 && r.right <= innerWidth + .5) })()`), 'everything sits inside the page at 1280')
  ok(await pg(`(() => { const c = [...document.querySelectorAll('#widgets [data-w]')].map(e => e.getBoundingClientRect()); for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) { const a = c[i], b = c[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) return false } return true })()`), 'no two widgets overlap')
  ok(await pg(`(() => { const g = document.querySelector('#widgets'), cols = +getComputedStyle(g).getPropertyValue('--cols'); const rows = {}; for (const e of g.querySelectorAll('[data-w]')) { const top = Math.round(e.offsetTop); rows[top] = (rows[top] || 0) + +e.style.gridColumn.replace('span ', '') } return Object.values(rows).every(n => n === cols) })()`), 'every row of widgets is full')
  const home = await pg(`lumen.invoke('home')`)
  ok(home && typeof home.today === 'number' && home.week.length === 7 && home.private === false, 'home data: blocked today and the week')

  // ---- widgets on and off from Customize
  await pg(`document.getElementById('cust').click()`); await wait(900)
  ok(await pg(`document.getElementById('drawer').classList.contains('open')`), 'Customize opens')
  await pg(`(() => { const s = document.querySelector('[data-wsw="recent"]'); s.checked = false; s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await wait(800)
  ok(!(await ids()).includes('recent') && L.D.settings.get('ntpRecent') === false, 'switching off Jump back in hides it and saves it')
  await pg(`(() => { const s = document.querySelector('[data-wsw="calendar"]'); s.checked = false; s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await wait(800)
  ok(!(await ids()).includes('calendar') && (L.D.settings.get('ntpHide') || []).includes('calendar'), 'switching off Calendar hides it and saves it')
  ok(!(await pg(`!!document.querySelector('[data-wsw="apps"]')`)), 'no Surge and Koi widget (they are their own apps in 4.0)')
  await pg(`(() => { const s = document.querySelector('[data-wsw="weather"]'); s.checked = true; s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await wait(800)
  ok((await ids()).includes('weather') && !(L.D.settings.get('ntpHide') || []).includes('weather') && await pg(`!!document.querySelector('#wxcity')`), 'weather switches on and asks for a city (off by default)')
  for (const id of ['recent', 'calendar']) { await pg(`(() => { const s = document.querySelector('[data-wsw="${id}"]'); s.checked = true; s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await wait(600) }
  await pg(`(() => { const s = document.querySelector('[data-wsw="weather"]'); s.checked = false; s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await wait(600)
  ok((await ids()) === first, 'switched back on, back in place: ' + await ids())
  await pg(`document.getElementById('dclose').click()`); await wait(800)

  // ---- drag a widget by its header onto another one, with real pointer events
  const wc = t.view.webContents
  const rect = sel => pg(`JSON.stringify((() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })())`).then(JSON.parse)
  const drag = async (from, to, steps = 14) => {
    wc.sendInputEvent({ type: 'mouseMove', x: Math.round(from.x), y: Math.round(from.y) }); await wait(60)
    wc.sendInputEvent({ type: 'mouseDown', x: Math.round(from.x), y: Math.round(from.y), button: 'left', clickCount: 1 }); await wait(60)
    for (let i = 1; i <= steps; i++) { wc.sendInputEvent({ type: 'mouseMove', x: Math.round(from.x + (to.x - from.x) * i / steps), y: Math.round(from.y + (to.y - from.y) * i / steps), button: 'left', modifiers: ['leftButtonDown'] }); await wait(35) }
    await wait(250)
    wc.sendInputEvent({ type: 'mouseUp', x: Math.round(to.x), y: Math.round(to.y), button: 'left', clickCount: 1 }); await wait(900)
  }
  await pg(`scrollTo(0, 0)`); await wait(300)
  const sh = await rect('[data-w="stats"] .hm-h b'), dst = await rect('[data-w="shortcuts"]')
  let anim = null
  setTimeout(async () => { anim = await pg(`JSON.stringify({ drag: !!document.querySelector('.hm-card.dragging'), tr: (document.querySelector('[data-w="stats"]') || {}).style.translate || '' })`).catch(() => null) }, 600)
  await drag({ x: sh.x + 10, y: sh.y + 8 }, { x: dst.x + 60, y: dst.y + 60 })
  await wait(1500)
  ok(anim && JSON.parse(anim).drag && JSON.parse(anim).tr, 'the card lifts and follows the pointer while dragging ' + anim)
  const after = await ids()
  ok(after.startsWith('stats,shortcuts'), 'dragging Blocked today onto Shortcuts moves it first: ' + after)
  ok(JSON.stringify(L.D.settings.get('ntpOrder') || []).startsWith('["stats","shortcuts"'), 'the new order is saved: ' + JSON.stringify(L.D.settings.get('ntpOrder')))
  const until = async (js, ms = 8000) => { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await pg(js); if (v === true || v === '[]') return v; await wait(250) } return v }
  const settle = await until(`JSON.stringify([...document.querySelectorAll('#widgets [data-w]')].map(e => [e.style.translate, e.style.scale, e.style.rotate].join('|')).filter(x => x !== '||'))`)
  ok(settle === '[]', 'cards spring back into the grid after the drop ' + settle)
  // and from the keyboard: the grip moves the widget one place
  await pg(`(() => { const g = document.querySelector('[data-w="later"] .hm-grip'); g.focus(); g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })) })()`); await wait(900)
  const kb = await ids()
  ok(kb.split(',').indexOf('later') === after.split(',').indexOf('later') - 1 && (L.D.settings.get('ntpOrder') || []).indexOf('later') === kb.split(',').indexOf('later'), 'arrow keys on the grip move a widget one place and save: ' + kb)
  // persists across a reload and a fresh tab
  t.view.webContents.reload(); await wait(4500)
  ok((await ids()) === kb, 'order survives a reload: ' + await ids())
  t = await open()
  ok((await ids()) === kb, 'and shows on a new tab')

  // ---- drag a shortcut tile to reorder the shortcuts
  await pg(`scrollTo(0, 0)`); await wait(300)
  const ta = await rect('#tiles .tile[data-i="0"] .ti'), tc = await rect('#tiles .tile[data-i="2"] .ti')
  await drag({ x: ta.x + ta.w / 2, y: ta.y + ta.h / 2 }, { x: tc.x + tc.w / 2, y: tc.y + tc.h / 2 })
  const sc = (L.D.settings.get('ntpShortcuts') || []).map(s => s.title).join('')
  ok(sc === 'BCA', 'dragging a shortcut tile reorders the shortcuts: ' + sc)
  ok(/^https?:\/\/(a|b|c)\.example/.test(w.active().url) === false && /newtab/.test(t.view.webContents.getURL()), 'the drop did not open the site')

  // ---- search suggestions
  await pg(`(() => { const q = document.getElementById('q'); q.focus(); q.value = 'docs'; q.dispatchEvent(new Event('input')) })()`); await wait(1200)
  ok(await pg(`document.getElementById('sug').classList.contains('open') && document.querySelectorAll('#sug .sg').length >= 2`), 'typing shows suggestions (' + await pg(`document.querySelectorAll('#sug .sg').length`) + ')')
  ok(await pg(`[...document.querySelectorAll('#sug .sg b')].some(b => /Docs page/.test(b.textContent))`), 'history matches are in the list')
  await pg(`document.getElementById('q').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))`); await wait(200)
  ok(await pg(`!!document.querySelector('#sug .sg.on')`), 'arrow keys move through suggestions')
  await pg(`document.getElementById('q').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await wait(300)
  ok(!(await pg(`document.getElementById('sug').classList.contains('open')`)), 'Escape closes them')
  await pg(`(() => { const q = document.getElementById('q'); q.value = '12*12'; q.dispatchEvent(new Event('input')) })()`); await wait(900)
  ok(/144/.test(await pg(`(document.querySelector('#sug .sg-answer') || {}).textContent || ''`)), 'the calculator answers in the pill')
  await pg(`(() => { const q = document.getElementById('q'); q.value = ''; q.dispatchEvent(new Event('input')); q.blur() })()`); await wait(400)

  // ---- wallpaper from the widget follows the accent
  await pg(`document.querySelector('.wpq [data-wp="nebula"]').click()`); await wait(1200)
  ok(L.D.settings.get('ntpWallpaper') === 'nebula' && await pg(`document.getElementById('ntp').classList.contains('on-dark') && !!document.querySelector('.ntp-bg.wp-nebula')`), 'wallpaper switches from the widget, with light text over it')
  const bgA = await pg(`getComputedStyle(document.querySelector('.ntp-bg')).backgroundImage`)
  await ex(`api.do('setSetting','accent','#e5487d')`); await wait(900)
  const bgB = await pg(`getComputedStyle(document.querySelector('.ntp-bg')).backgroundImage`)
  ok(bgA !== bgB, 'the wallpaper changes with the accent')
  await ex(`api.do('setSetting','accent','#5b8cff')`); await pg(`document.querySelector('.wpq [data-wp="aurora"]').click()`); await wait(900)

  // ---- focus, note, calendar, engine, sizes
  await pg(`scrollTo(0, 0); document.getElementById('fcgo').click()`); await wait(2300)
  const F1 = L.D.settings.get('ntpFocus')
  ok(F1 && F1.end > Date.now() && F1.len === 25 * 60e3, 'Focus starts a 25 minute session')
  ok(await pg(`document.getElementById('ring').classList.contains('focus') && /^2[45]:\\d\\d$/.test(document.querySelector('#ring b').textContent)`), 'the hero ring counts the session down: ' + await pg(`document.querySelector('#ring b').textContent`))
  await pg(`document.getElementById('fcgo').click()`); await wait(500)
  const F2 = L.D.settings.get('ntpFocus')
  ok(F2 && !F2.end && F2.left > 20 * 60e3, 'pause keeps the time left')
  await pg(`document.getElementById('fcreset').click()`); await wait(400)
  ok(!(L.D.settings.get('ntpFocus') || {}).left && !(await pg(`document.getElementById('ring').classList.contains('focus')`)), 'reset puts the ring back to the day')
  await pg(`(() => { const n = document.getElementById('hmnote'); n.value = 'Buy oat milk'; n.dispatchEvent(new Event('input')) })()`); await wait(900)
  ok(L.D.settings.get('ntpNote') === 'Buy oat milk', 'the quick note saves as you type')
  const m0 = await pg(`document.querySelector('[data-w="calendar"] .hm-h b').textContent`)
  await pg(`document.querySelector('[data-cal="1"]').click()`); await wait(500)
  const m1 = await pg(`document.querySelector('[data-w="calendar"] .hm-h b').textContent`)
  ok(m0 !== m1 && await pg(`!!document.querySelector('[data-cal="0"]')`), 'calendar flips to the next month: ' + m0 + ' -> ' + m1)
  ok(await pg(`document.querySelectorAll('.cal-g b.today').length`) === 0, 'and today is only marked in its own month')
  await pg(`document.querySelector('[data-cal="0"]').click()`); await wait(400)
  ok(await pg(`document.querySelectorAll('.cal-g b.today').length`) === 1, 'Today brings it back')
  await pg(`document.getElementById('keng').click()`); await wait(500)
  ok(await pg(`document.getElementById('engs').classList.contains('open') && document.querySelectorAll('#engs [data-eng]').length >= 4`), 'the engine chip lists search engines')
  await pg(`document.querySelector('#engs [data-eng="duckduckgo"]').click()`); await wait(500)
  ok(L.D.settings.get('searchEngine') === 'duckduckgo' && /DuckDuckGo/.test(await pg(`document.getElementById('q').placeholder`)), 'picking one changes where searches go')
  await ex(`api.do('setSetting','searchEngine','google')`)
  await pg(`document.getElementById('cust').click()`); await wait(900)
  await pg(`document.querySelector('[data-wsz="stats"][data-v="6"]').click()`); await wait(800)
  ok((L.D.settings.get('ntpSizes') || {}).stats === 6 && await pg(`document.querySelector('[data-w="stats"]').style.gridColumn`) === 'span 6', 'a widget can be made full width')
  await pg(`document.querySelector('[data-wsz="stats"][data-v="2"]').click()`); await wait(500)
  await pg(`document.getElementById('dclose').click()`); await wait(2500)
  ok(await until(`getComputedStyle(document.getElementById('drawer')).visibility === 'hidden'`) === true, 'the drawer springs closed')

  // ---- 900 px wide
  w.win.setContentSize(900, 760); await wait(1500)
  ok(await pg(`(() => { const all = [...document.querySelectorAll('#widgets [data-w], #hero, #sf, .hm-hi, #clock')].map(e => e.getBoundingClientRect()); return all.every(r => r.left >= -.5 && r.right <= innerWidth + .5) })()`), 'nothing spills at 900 px')
  ok(await pg(`(() => { const c = document.getElementById('clockwrap').getBoundingClientRect(), h = document.querySelector('.hm-hi').getBoundingClientRect(); return c.right <= h.left || c.bottom <= h.top })()`), 'clock and greeting do not overlap at 900 px')
  ok(await pg(`[...document.querySelectorAll('.hm-h > b')].every(b => b.scrollWidth <= b.clientWidth + 1 || getComputedStyle(b).textOverflow === 'ellipsis')`), 'widget titles fit')
  w.win.setContentSize(1280, 820); await wait(1200)

  // ---- idle: no running animations and a quiet renderer
  await pg(`scrollTo(0, 0); document.activeElement && document.activeElement.blur()`)
  wc.sendInputEvent({ type: 'mouseMove', x: 5, y: 790 }); await wait(10000)
  const running = await pg(`JSON.stringify(document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.constructor.name) + ':' + (a.effect && a.effect.target ? (a.effect.target.className || a.effect.target.tagName) : '')))`)
  ok(running === '[]', 'no animation running after 10 s idle ' + running)
  const pid = t.view.webContents.getOSProcessId()
  app.getAppMetrics(); await wait(10000)
  const m = app.getAppMetrics().find(x => x.pid === pid)
  const cpu = m ? m.cpu.percentCPUUsage : -1
  fs.appendFileSync(LOG, 'IDLE CPU New Tab renderer: ' + cpu.toFixed(2) + '%\n'); console.log('IDLE CPU', cpu.toFixed(2) + '%')
  ok(cpu >= 0 && cpu < 5, 'New Tab renderer idle CPU under 5%: ' + cpu.toFixed(2) + '%')

  // ---- Motion Off: still and instant
  await ex(`api.do('setSetting','motion','off')`); await wait(600)
  t = await open()
  ok(await pg(`document.getAnimations().filter(a => a.playState === 'running').length`) === 0, 'Motion Off: nothing animates on open')
  await ex(`api.do('setSetting','motion','lively')`); await wait(400)

  // ---- the private window has its own home
  const pw = L.createWindow({ incognito: true }); await wait(4500)
  const pt = pw.active() || pw.createTab('lumen://newtab', { active: true }); await wait(4500)
  const pp = s => pt.view.webContents.executeJavaScript(s)
  ok(await pp(`document.getElementById('ntp').classList.contains('private') && !!document.querySelector('.ntp-bg.wp-private')`), 'private window gets the private look')
  const pids = await pp(`[...document.querySelectorAll('#widgets [data-w]')].map(e => e.dataset.w).join(',')`)
  ok(/privacy/.test(pids) && !/recent|later|parcels/.test(pids), 'private home explains itself and hides your history: ' + pids)
  ok(!(await pp(`!!document.getElementById('cust')`)), 'no Customize in a private window')
  pw.win.close(); await wait(500)

  ok(!errors.length, 'no page errors ' + errors.join(' | '))
  console.log(fails ? 'FAILED' : 'ALL PASS'); fs.appendFileSync(LOG, (fails ? 'FAILED' : 'ALL PASS') + '\n'); app.exit(fails ? 1 : 0)
})
