// Lumen 4.0 update card for Surge and Koi (CLAUDE.md rule 12). Copied into apps/ by tools/import-apps.py and loaded in
// Surge's menu, Surge's Settings and Koi's menu. Surge and Koi update together with Lumen, so the card speaks about
// Lumen: its version going from the one you have to the new one, a ring and a bar that follow the real download
// (percent, speed and time left from Lumen's updater), and one clear button. Nothing loops: the ring and the bar move
// only when the progress does, and they jump straight there under reduced motion.
//   lumenUpd(box, state, { text, btn, poll })   renders into an existing banner (keeps its ids and handlers)
//   the Updates page in Surge's Settings gets a full card of its own (#pane-updater), filled here as well
(() => {
  if (window.lumenUpd) return
  const d = document
  const v = x => String(x || '').replace(/^v/, '')
  const MB = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(b >= 1e8 ? 0 : 1) + ' MB'
  const left = s => s >= 90 ? Math.round(s / 60) + ' min left' : Math.max(1, Math.round(s)) + ' s left'
  const BUSY = ['checking', 'downloading', 'verifying', 'unpacking', 'installing']
  const SHOW = ['available', 'downloading', 'verifying', 'unpacking', 'ready', 'installing', 'error']
  const ICON = {
    down: '<path d="M12 5v10M7.5 10.8 12 15.3l4.5-4.5"/><path d="M6 19h12"/>',
    ready: '<path d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5-2-5.5L4.5 11 10 9z"/>',
    restart: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.2h-4.2"/>',
    check: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    warn: '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4.2M12 17v.1"/>',
  }
  // what the card says for each step of Lumen's updater
  function info(u) {
    const st = u.status || 'idle', p = Math.max(0, Math.min(100, Math.round(u.progress || 0))), nv = v(u.latest), cur = v(u.current)
    const o = { st, p, nv, cur, icon: 'down', title: 'Lumen ' + nv, sub: '', btn: '', busy: BUSY.includes(st), show: SHOW.includes(st) }
    if (st === 'available') { o.title = 'Lumen ' + nv + ' is out'; o.sub = 'Surge and Koi update with it'; o.btn = 'Get it'; o.p = 0 }
    else if (st === 'downloading') { o.sub = [p + '%', u.speed > 0 ? MB(u.speed) + '/s' : '', u.eta > 0 ? left(u.eta) : ''].filter(Boolean).join('  ·  '); o.btn = p + '%' }
    else if (st === 'verifying') { o.sub = 'Checking the download'; o.btn = 'Checking'; o.p = Math.max(p, 99) }
    else if (st === 'unpacking') { o.sub = 'Getting it ready'; o.btn = 'Almost'; o.p = 100 }
    else if (st === 'ready') { o.icon = 'ready'; o.title = 'Lumen ' + nv + ' is ready'; o.sub = 'Restart to finish. Your tabs come right back.'; o.btn = 'Restart'; o.p = 100 }
    else if (st === 'installing') { o.icon = 'restart'; o.title = 'Restarting Lumen'; o.sub = 'See you in a moment'; o.btn = 'Restarting'; o.p = 100 }
    else if (st === 'checking') { o.icon = 'check'; o.title = 'Checking for updates'; o.sub = 'This takes a second'; o.btn = 'Checking'; o.p = 0 }
    else if (st === 'error') { o.icon = 'warn'; o.title = 'Update paused'; o.sub = String(u.error || 'Lumen will try again soon').replace(/\.$/, '').slice(0, 90); o.btn = 'Try again'; o.p = 0 }
    else { o.icon = 'ready'; o.title = cur ? 'Lumen ' + cur : 'Lumen'; o.sub = 'You are up to date'; o.btn = 'Check now'; o.p = 0 }
    return o
  }
  const svg = (k, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`
  function parts(box, text) {
    if (box.__lu) return box.__lu
    box.classList.add('lu')
    const ring = d.createElement('div'); ring.className = 'lu-ring'; ring.innerHTML = '<span class="lu-ic"></span>'   // the ring itself is drawn by CSS from --lu-p
    const old = box.querySelector(':scope > svg'); if (old) old.replaceWith(ring); else box.prepend(ring)
    let t = text.querySelector('b'), s = text.querySelector('small')
    if (!t) { text.textContent = ''; t = d.createElement('b'); text.appendChild(t) }
    if (!s) { s = d.createElement('small'); text.appendChild(s) }
    t.classList.add('lu-t'); s.classList.add('lu-s')
    const vr = d.createElement('span'); vr.className = 'lu-v'; vr.setAttribute('aria-hidden', 'true'); t.after(vr)
    const bar = d.createElement('span'); bar.className = 'lu-bar'; bar.innerHTML = '<i></i>'; text.appendChild(bar)
    text.classList.add('lu-tx')
    return (box.__lu = { ring, ic: ring.querySelector('.lu-ic'), t, s, vr, bar, text })
  }
  window.lumenUpd = function (box, u, o = {}) {
    if (!box || !u) return
    const i = info(u), P = parts(box, o.text || box)
    box.dataset.st = i.st; box.style.setProperty('--lu-p', i.p)
    box.classList.toggle('lu-busy', i.busy)
    // while it downloads, the orb shows the percent itself; otherwise an icon for the step
    const face = i.st === 'downloading' ? 'pc' : i.icon
    if (P.ic.dataset.k !== face) { P.ic.dataset.k = face; P.ic.innerHTML = face === 'pc' ? '<b class="lu-pc"><span></span><small>%</small></b>' : svg(i.icon) }
    if (face === 'pc') P.ic.querySelector('span').textContent = i.p
    P.t.textContent = i.title; P.s.textContent = i.sub
    P.vr.innerHTML = i.cur && i.nv && i.cur !== i.nv ? `<s>${i.cur}</s><svg viewBox="0 0 16 8"><path d="M1 4h13M10.5 1 14 4l-3.5 3"/></svg><em>${i.nv}</em>` : ''
    P.bar.hidden = !(i.st === 'downloading' || i.st === 'verifying' || i.st === 'unpacking')
    if (o.btn) { o.btn.textContent = i.btn || o.btn.textContent; o.btn.disabled = i.busy; o.btn.classList.toggle('lu-go', i.st === 'ready' || i.st === 'available') }
    // while Lumen is downloading, keep the numbers live (only while this window is on screen)
    clearTimeout(box.__luT)
    if (o.poll && i.busy) box.__luT = setTimeout(() => { if (!d.hidden) o.poll() }, 900)
    return i
  }
  window.lumenUpd.info = info

  /* ---------------------------------------------------------------- Surge Settings: the Updates page */
  function settingsCard() {
    const pane = d.getElementById('pane-updater'), api = window.surge
    if (!pane || !api || pane.querySelector('.lu-card')) return
    const head = pane.querySelector('.card.mh')
    const card = d.createElement('div'); card.className = 'card lu-card'
    card.innerHTML = `<div class="lu-hero"><div class="lu-tx"><span class="lu-eye">Surge updates with Lumen</span><b></b><small></small></div><button class="btn lu-btn" type="button"></button></div>
      <div class="lu-steps"><span data-s="get"><i></i>Download</span><span data-s="check"><i></i>Verify</span><span data-s="ready"><i></i>Ready</span><span data-s="go"><i></i>Restart</span></div>`
    ;(head || pane.firstChild) ? (head ? head.after(card) : pane.prepend(card)) : pane.appendChild(card)
    const box = card.querySelector('.lu-hero'), btn = card.querySelector('.lu-btn')
    let last = { status: 'idle' }
    const ORDER = { available: 0, downloading: 1, verifying: 2, unpacking: 2, ready: 3, installing: 4 }
    async function refresh() {
      if (d.hidden || !pane.classList.contains('on')) return
      try { last = (await api.action('updater', 'state')) || last } catch {}
      const i = lumenUpd(box, last, { text: box.querySelector('.lu-tx'), btn, poll: refresh })
      const n = ORDER[i.st] ?? -1
      card.querySelectorAll('.lu-steps span').forEach((s, k) => { s.classList.toggle('done', n > k || (n === 4)); s.classList.toggle('now', n === k) })
      card.dataset.st = i.st
    }
    btn.onclick = async () => {
      const st = last.status
      if (st === 'ready') api.action('updater', 'install')
      else if (st === 'available') api.action('updater', 'download')
      else if (!BUSY.includes(st)) { last = { ...last, status: 'checking' }; lumenUpd(box, last, { text: box.querySelector('.lu-tx'), btn }); try { last = (await api.action('updater', 'check')) || last } catch {} }
      setTimeout(refresh, 300)
    }
    // refresh when the page opens, when the window comes back, and every few seconds while it is open
    new MutationObserver(() => { if (pane.classList.contains('on')) refresh() }).observe(pane, { attributes: true, attributeFilter: ['class'] })
    d.addEventListener('visibilitychange', refresh)
    setInterval(refresh, 4000)
    refresh()
  }
  const start = () => { settingsCard(); if (!d.querySelector('.lu-card') && d.documentElement.dataset.lg === 'settings') new MutationObserver((_, ob) => { if (d.getElementById('pane-updater')) { ob.disconnect(); settingsCard() } }).observe(d.body, { childList: true, subtree: true }) }
  if (d.body) start(); else addEventListener('DOMContentLoaded', start)
})()
