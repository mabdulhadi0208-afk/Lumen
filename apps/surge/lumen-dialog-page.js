// Fills the Nova dialog from its address (#{...}) and answers with the button picked. Enter picks the default, Esc cancels.
(() => {
  let o = {}; try { o = JSON.parse(decodeURIComponent(location.hash.slice(1))) } catch {}
  const $ = id => document.getElementById(id), api = window.lumenDialog || { answer() {}, size() {} }
  const ICON = {
    question: '<rect x="3" y="4" width="18" height="11" rx="3"/><path d="M6.5 19h11"/><path d="M9.6 8.1a2.4 2.4 0 1 1 3.2 2.3c-.5.2-.8.6-.8 1.1"/>',
    warning: '<path d="M12 3.5 2.8 19.2a1.2 1.2 0 0 0 1 1.8h16.4a1.2 1.2 0 0 0 1-1.8z"/><path d="M12 9.5v4.5M12 17.2v.1"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
    info: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  }
  document.body.classList.add('t-' + (ICON[o.type] ? o.type : 'info'))
  $('orb').innerHTML = `<svg viewBox="0 0 24 24">${ICON[o.type] || ICON.info}</svg>`
  $('msg').textContent = o.message || ''
  for (const para of String(o.detail || '').split(/\n\s*\n/)) { if (!para.trim()) continue; const p = document.createElement('p'); p.textContent = para.trim(); $('det').appendChild(p) }
  const btns = (o.buttons || ['OK']).map((t, i) => { const b = document.createElement('button'); b.textContent = t; b.className = i === o.defaultId ? 'def' : 'can'; b.onclick = () => pick(i); return b })
  // the default button sits on the right, like a Mac dialog
  btns.slice().reverse().forEach((b, k) => { b.style.setProperty('--i', k); $('row').appendChild(b) })
  let picked = false
  function pick(i) { if (picked) return; picked = true; document.body.classList.add('out'); setTimeout(() => api.answer(i), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200) }
  addEventListener('keydown', e => { if (e.key === 'Escape') pick(o.cancelId); else if (e.key === 'Enter') pick(o.defaultId) })
  const fit = () => api.size(Math.ceil($('card').getBoundingClientRect().height + 48))
  requestAnimationFrame(() => { fit(); const d = btns[o.defaultId]; d && d.focus() })
  addEventListener('load', fit)
})()
