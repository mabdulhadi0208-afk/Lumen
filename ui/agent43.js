// Claude in Lumen (4.3), in the AI panel: an Ask / Do it for me switch above the box. In Do it for me, what you type
// is a task Claude carries out in this tab (src/agent.js): every step appears live in a timeline, Claude's short
// notes in between, and a card whenever it needs you (Allow or Stop before anything that cannot be undone, or a
// question). The send button stops it. Runs on top of ui.js and ai41.js (same window, their globals).

let agentMode = 'ask'
const agents = new Map()   // run id -> agent message
const AG_IC = {
  read_page: ICONS.book, click: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5v7l2-1.6 1.3 3 1.4-.6-1.3-3h2.6z"/></svg>',
  type: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.8" y="4" width="12.4" height="8" rx="2"/><path d="M4.5 7h.01M7 7h.01M9.5 7h.01M12 7h.01M5 9.6h6"/></svg>',
  press_key: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3v5a2 2 0 0 1-2 2H3.5M6 7l-3 3 3 3"/></svg>',
  scroll: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="1.8" width="6" height="12.4" rx="3"/><path d="M8 4.5v2"/></svg>',
  go_to: ICONS.globe, go_back: ICONS.arrowRight, screenshot: ICONS.camera || ICONS.globe, upload_file: ICONS.download,
  ask_user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.1A8 8 0 1 1 21 12z"/></svg>',
  confirm: ICONS.shield || ICONS.check,
}

// ---------------------------------------------------------------- the switch
const modeEl = document.createElement('div')
modeEl.className = 'ag-mode'; modeEl.id = 'ai-mode'; modeEl.setAttribute('role', 'tablist')
modeEl.innerHTML = `<i class="ag-ind" aria-hidden="true"></i><button type="button" data-m="ask" class="on" role="tab" aria-selected="true">${ICONS.sparkle}<span>Ask</span></button><button type="button" data-m="do" role="tab" aria-selected="false">${AG_IC.click}<span>Do it for me</span></button>`
$('#ai-form').before(modeEl)
const agInd = modeEl.querySelector('.ag-ind')
const agIndG = new SpringGroup({ x: 0, w: 0 }, 'bounce', v => { agInd.style.transform = `translateX(${v.x}px)`; agInd.style.width = v.w + 'px' })
function placeAgInd(instant) { const b = modeEl.querySelector('button.on'); if (!b || !b.offsetWidth) return; const v = { x: b.offsetLeft - 3, w: b.offsetWidth }; instant ? agIndG.set(v) : agIndG.to(v) }
function setAgentMode(m) {
  agentMode = m === 'do' ? 'do' : 'ask'
  modeEl.querySelectorAll('button').forEach(b => { const on = b.dataset.m === agentMode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on) })
  panel.classList.toggle('agentmode', agentMode === 'do')
  placeAgInd()
  paintCtx()
  aiQ.focus()
}
modeEl.addEventListener('click', e => { const b = e.target.closest('button[data-m]'); if (b) setAgentMode(b.dataset.m) })
new ResizeObserver(() => placeAgInd(true)).observe(modeEl)
// keep the placeholder right when the panel repaints its context
const _paintCtx = paintCtx
// in Do it for me the header says so, and the tier chip shows the model the task really runs on (Smart, or Best)
paintCtx = function () {
  _paintCtx()
  const tierEl = $('#ai-tier')
  if (agentMode === 'do') { aiQ.placeholder = 'Tell Claude what to do in this tab'; $('#ai-title').textContent = 'Do it for me'; tierEl.textContent = aiSt.tier === 'best' ? (aiSt.tierName || 'Best') : 'Smart' }
  else tierEl.textContent = aiSt.tierName || 'Fast'
}

// ---------------------------------------------------------------- running a task
function agentEl(m) {
  const el = document.createElement('div')
  el.className = 'ai-msg agent'
  el.innerHTML = `<div class="ag-head"><span class="ag-orb" aria-hidden="true">${AI_IC.spark}</span><b>Claude in Lumen</b><em class="ag-state">Working</em></div><ol class="ag-flow"></ol>`
  m.el = el; m.flow = el.querySelector('.ag-flow'); m.stateEl = el.querySelector('.ag-state')
  return el
}
function agentRun(task) {
  const tabId = S.activeId
  const c = convFor(tabId)
  if (c.busy) api.do('aiStop', c.busy)
  const id = 'g' + (++aiSeq)
  const u = { role: 'user', label: task, text: task, tabId, solo: true }
  const m = { role: 'agent', id, tabId, steps: new Map(), state: 'run' }
  agentEl(m)
  c.msgs.push(u, m); c.busy = id; agents.set(id, m)
  if (aiOpen && aiShown === tabId) {
    const w = aiLog.querySelector('.a4-welcome'); if (w) w.remove()
    aiLog.appendChild(msgEl(u)); aiLog.appendChild(m.el)
    panel.classList.add('busy'); aiLog.scrollTop = aiLog.scrollHeight
    requestAnimationFrame(() => Jelly.kick && Jelly.kick(m.el, 0.6, 0.5))
  }
  api.do('agentStart', { id, tabId, task })
}
const agStick = () => { if (aiLog.scrollHeight - aiLog.scrollTop - aiLog.clientHeight < 140) aiLog.scrollTop = aiLog.scrollHeight }
function agAdd(m, li) { m.flow.appendChild(li); if (!STILL_AG()) li.animate([{ opacity: 0, transform: 'translateY(6px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,1.35,.5,1)' }); agStick() }
const STILL_AG = () => typeof getMotion === 'function' && getMotion() === 'off'
function agThinking(m, on) {
  let t = m.flow.querySelector(':scope > .ag-think')
  if (on && !t) { t = document.createElement('li'); t.className = 'ag-think'; t.innerHTML = '<span class="ai-dots"><i></i><i></i><i></i></span>'; agAdd(m, t) }
  else if (!on && t) t.remove()
}
api.on('agent', ev => {
  const m = agents.get(ev.id); if (!m) return
  if (ev.thinking) { agThinking(m, true); return }
  agThinking(m, false)
  if (ev.say) { const li = document.createElement('li'); li.className = 'ag-say'; li.textContent = ev.say; agAdd(m, li); return }
  if (ev.step) {
    let li = m.steps.get(ev.step.n)
    if (!li) {
      li = document.createElement('li'); li.className = 'ag-step'
      li.innerHTML = `<span class="ag-ic">${AG_IC[ev.step.tool] || AG_IC.click}</span><span class="ag-l"></span><span class="ag-s"></span>`
      li.querySelector('.ag-l').textContent = ev.step.label || ''
      m.steps.set(ev.step.n, li); agAdd(m, li)
    }
    li.dataset.state = ev.step.state
    return
  }
  if (ev.ask) { agAsk(m, ev.ask); return }
  if (ev.done || ev.error) {
    const c = convs.get(m.tabId)
    if (c && c.busy === ev.id) c.busy = null
    agents.delete(ev.id)
    m.state = ev.error ? 'error' : ev.stopped ? 'stopped' : 'done'
    m.stateEl.textContent = ev.error ? 'Could not finish' : ev.stopped ? 'Stopped' : 'Done'
    m.el.dataset.state = m.state
    m.flow.querySelectorAll('.ag-card').forEach(x => x.classList.add('gone'))
    if (ev.error) { const li = document.createElement('li'); li.className = 'ag-err'; li.textContent = ev.error; agAdd(m, li) }
    if (aiOpen && aiShown === m.tabId) panel.classList.remove('busy')
    if (!STILL_AG()) m.el.querySelector('.ag-orb').animate([{ transform: 'scale(1.25) rotate(-12deg)' }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.3,1.5,.5,1)' })
  }
})
// a card when Claude needs you: Allow or Stop, or an answer
function agAsk(m, q) {
  const li = document.createElement('li'); li.className = 'ag-card ' + q.kind
  const confirm = q.kind === 'confirm'
  li.innerHTML = `<div class="ag-ct"><span class="ag-ci">${confirm ? AG_IC.confirm : AG_IC.ask_user}</span><b>${confirm ? 'Allow this?' : 'Claude needs you'}</b></div><p></p>${confirm ? '' : '<textarea rows="1" placeholder="Reply, or leave empty once you have done it"></textarea>'}<div class="ag-cb">${confirm ? '<button class="btn primary" data-a="allow">Allow</button><button class="btn" data-a="deny">Stop here</button>' : '<button class="btn primary" data-a="reply">Done</button>'}</div>`
  li.querySelector('p').textContent = q.text
  li.addEventListener('click', e => {
    const b = e.target.closest('button[data-a]'); if (!b || li.classList.contains('gone')) return
    const a = b.dataset.a
    api.do('agentReply', m.id, q.qid, a === 'reply' ? { text: (li.querySelector('textarea') || {}).value || '' } : { allow: a === 'allow' })
    li.classList.add('gone'); li.dataset.answer = a
  })
  agAdd(m, li)
  const f = li.querySelector('textarea, .btn.primary'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 60)
}

// the box: in Do it for me, Enter starts a task (the send button still stops a running one)
$('#ai-form').addEventListener('submit', e => {
  if (agentMode !== 'do') return
  e.preventDefault(); e.stopImmediatePropagation()
  const c = convs.get(S.activeId)
  const q = aiQ.value.trim()
  if (c && c.busy && !q) { api.do('aiStop', c.busy); return }
  if (!q) return
  if (!aiSt.ready) { refreshAI(); return }
  aiQ.value = ''; aiQ.style.height = ''; panel.classList.remove('typing')
  agentRun(q)
}, true)
// a conversation drawn again (tab switch) shows its agent runs as they are
const _msgEl = msgEl
msgEl = function (m) { return m.role === 'agent' ? m.el : _msgEl(m) }
