// 4.4.5: Opt Cmd A (Alt Ctrl A) flips the AI panel between Ask and Do it for me. With the panel closed it opens it
// straight into Do it for me; the switch, placeholder and welcome follow, a keycap toast says where you are, the
// menu, command bar and shortcut sheet all list it, and a running task is never touched by a switch.
// Run: xvfb-run -a npx electron test/aimode445.js --no-sandbox   (log: /tmp/lumen-aimode445.log)
const fs = require('fs'), http = require('http'); const { app, Menu } = require('electron')
fs.rmSync('/tmp/lumen-aimode445', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-aimode445')
const LOG = '/tmp/lumen-aimode445.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const site = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end('<!doctype html><title>Plain</title><h1>Hello</h1><p>Some text.</p>') }).listen(0, '127.0.0.1')
const mock = http.createServer((req, res) => {
  if (req.method === 'GET') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"data":[]}'); return }
  let b = ''; req.on('data', d => b += d); req.on('end', async () => {
    await wait(1500)   // a slow task, so it is still running when the mode flips
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', content: [{ type: 'text', text: 'Done.' }], stop_reason: 'end_turn', usage: {} }))
  })
}).listen(0, '127.0.0.1')
process.env.LUMEN_AI_API = 'http://127.0.0.1:9/v1/messages'
const L = require('../src/main.js'); const AI = require('../src/ai.js')
const errors = []

app.whenReady().then(async () => {
  await wait(4000); process.env.LUMEN_AI_API = `http://127.0.0.1:${mock.address().port}/v1/messages`
  const w = L.windows[0], ui = w.ui.webContents, ex = s => ui.executeJavaScript(s)
  ui.on('console-message', (e, level, msg) => { if (level >= 3) errors.push(msg) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(800)
  w.win.setContentSize(1280, 820)
  AI.setKey('sk-ant-good-key-0123456789')
  w.createTab(`http://127.0.0.1:${site.address().port}/`, { active: true }); await wait(1600)
  const mode = () => ex(`({ open: aiOpen, mode: agentMode, agentClass: document.getElementById('aipanel').classList.contains('agentmode'),
    on: (document.querySelector('#aipanel .ag-mode button.on') || {}).dataset.m, ph: document.getElementById('ai-q').placeholder,
    hint: (document.querySelector('#aipanel .ag-hint.show') || {}).textContent || '', welcome: !!document.querySelector('#aipanel .ag-welcome') })`)

  // the menu has it, with its accelerator, and nothing else uses that accelerator
  const items = []; const walk = m => m && m.items.forEach(i => { items.push(i); walk(i.submenu) }); walk(Menu.getApplicationMenu())
  const mi = items.find(i => i.label === 'Switch Ask / Do it for Me')
  ok(!!mi && mi.accelerator === 'CmdOrCtrl+Alt+A', 'the menu has Switch Ask / Do it for Me on CmdOrCtrl+Alt+A')
  ok(items.filter(i => i.accelerator === 'CmdOrCtrl+Alt+A').length === 1, 'no other menu item uses CmdOrCtrl+Alt+A')

  // closed panel: the shortcut opens it straight into Do it for me
  ok(!(await mode()).open, 'the AI panel starts closed')
  w.send('command', 'aimode'); await wait(1000)
  let s = await mode()
  ok(s.open && s.mode === 'do' && s.agentClass && s.on === 'do', 'with the panel closed, the shortcut opens it in Do it for me')
  ok(/Tell Claude what to do/.test(s.ph) && s.welcome, 'the box and the welcome switch to Do it for me')
  ok(/Do it for me/.test(s.hint) && (await ex(`document.querySelectorAll('#aipanel .ag-hint kbd').length`)) === 3, 'a keycap toast says Do it for me: ' + s.hint)
  ok(await ex(`document.activeElement === document.getElementById('ai-q')`), 'the box has focus after the switch')
  ok(await ex(`/back to Ask/.test(document.querySelector('#aipanel .ag-welcome .a4-tips').textContent) && document.querySelectorAll('#aipanel .ag-welcome .ag-tipkey kbd').length === 3`), 'the Do it for me welcome shows the keys to go back to Ask')

  // open panel: it flips, both ways
  w.send('command', 'aimode'); await wait(700); s = await mode()
  ok(s.open && s.mode === 'ask' && !s.agentClass && s.on === 'ask' && !/Tell Claude/.test(s.ph), 'pressed again, it flips back to Ask')
  ok(/^Ask/.test(s.hint), 'the toast says Ask')
  ok(await ex(`!document.querySelector('#aipanel .ag-welcome')`), 'the Ask welcome replaces the Do it for me one')
  w.send('command', 'aimode'); await wait(900); s = await mode()
  ok(s.mode === 'do' && s.on === 'do', 'and to Do it for me again')
  const pill = await ex(`(() => { const b = document.querySelector('#aipanel .ag-mode button.on'), i = document.querySelector('#aipanel .ag-ind'); const a = b.getBoundingClientRect(), c = i.getBoundingClientRect(); return Math.abs(a.left - c.left) < 4 && Math.abs(a.width - c.width) < 4 })()`)
  ok(pill, 'the spring pill lands under the active side')
  const inPanel = await ex(`(() => { const h = document.querySelector('#aipanel .ag-hint').getBoundingClientRect(), p = document.getElementById('aipanel').getBoundingClientRect(); return h.left >= p.left - 1 && h.right <= p.right + 1 && h.top >= p.top })()`)
  ok(inPanel, 'the toast sits inside the panel, over the switch')
  await wait(1800)
  ok(!(await mode()).hint, 'the toast goes away on its own')
  ok(await ex(`[...document.querySelectorAll('#aipanel .ag-mode button')].every(b => /\\(Opt\\+Cmd\\+A\\)$/.test(b.dataset.tip || b.title))`), 'the switch buttons show a keycap tooltip with the shortcut')

  // a running task is not touched by flipping the mode
  await ex(`agentRun('Read this page.'); true`); await wait(300)
  w.send('command', 'aimode'); await wait(500)
  s = await mode()
  ok(s.mode === 'ask' && (await ex(`!!document.querySelector('#aipanel .ai-msg.agent') && !!convs.get(S.activeId).busy`)), 'flipping to Ask keeps the running task and its timeline')
  for (let i = 0; i < 30 && await ex(`!!convs.get(S.activeId).busy`); i++) await wait(200)
  ok(await ex(`!convs.get(S.activeId).busy && /Done|Could not finish|Stopped/.test(document.querySelector('#aipanel .ai-msg.agent .ag-state').textContent)`), 'the task still finishes')

  // closed again while in Ask: it always opens into Do it for me; asking for the current mode leaves it there
  await ex(`closeAI(); true`); await wait(500)
  w.send('command', 'aimode'); await wait(900); s = await mode()
  ok(s.open && s.mode === 'do', 'closed again, the shortcut opens into Do it for me')
  await ex(`agentSwitchMode('do'); true`); await wait(300)
  ok((await mode()).mode === 'do', 'asking for the mode it is already in leaves it there')

  // the command bar and the shortcut sheet list it
  ok(await ex(`COMMANDS.some(c => c.t === 'Do It for Me' && /A$/.test(c.s()))`), 'the command bar has Do It for Me with its keys')
  await ex(`COMMANDS.find(c => c.t === 'Do It for Me').run(); true`); await wait(500)
  ok((await mode()).mode === 'do', 'running it from the command bar lands in Do it for me')
  await ex(`closeAI(); openShortcuts(); true`); await wait(700)
  ok(await ex(`[...document.querySelectorAll('.sc-row')].some(r => /Ask \\/ Do it for me/.test(r.textContent) && r.querySelectorAll('kbd').length === 3)`), 'the shortcut sheet lists Ask / Do it for me with its keys')
  await ex(`closePopover(); true`); await wait(400)

  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''))
  console.log(fails ? `AIMODE445 ${fails} FAILED` : 'AIMODE445 ALL PASS'); fs.appendFileSync(LOG, fails ? `${fails} FAILED\n` : 'ALL PASS\n')
  mock.close(); site.close(); app.exit(fails ? 1 : 0)
})
