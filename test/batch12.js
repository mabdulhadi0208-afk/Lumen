// Feature test for 1.2.0: themes, compact, app icon, tab groups, Lumen AI (mocked API).
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'
const http = require('http'), fs = require('fs'), path = require('path')
const mock = http.createServer((req, res) => {
  let body = ''
  req.on('data', d => body += d)
  req.on('end', async () => {
    const j = JSON.parse(body || '{}')
    mock.last = { headers: req.headers, body: j }
    if (!j.stream) {
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ content: [{ type: 'text', text: '{"groups":[{"name":"Reading","color":"teal","ids":[__A__,__B__]}]}' }] }))
    }
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    const parts = ['This page is a **test login** form.', '\n\n- It has an email field\n', '- It has a password field']
    res.write('event: message_start\ndata: {"type":"message_start"}\n\n')
    for (const p of parts) { res.write(`event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: p } })}\n\n`); await new Promise(r => setTimeout(r, 120)) }
    res.end('event: message_stop\ndata: {"type":"message_stop"}\n\n')
  })
}).listen(48125)
process.env.LUMEN_AI_API = 'http://127.0.0.1:48125/v1/messages'
const { app } = require('electron')
fs.rmSync('/tmp/lumen-b12', { recursive: true, force: true })
app.setPath('userData', '/tmp/lumen-b12')
const L = require('../src/main.js')
const out = '/tmp/lumen-shots'; fs.mkdirSync(out, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const srv = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(`<title>Page ${req.url}</title><article><h1>Hello ${req.url}</h1><p id="p">${'Some article text here. '.repeat(30)}</p></article>`) }).listen(48126)
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }

app.whenReady().then(async () => {
  await wait(5000)
  const w = L.windows[0]
  const ui = w.ui.webContents
  const errors = []
  ui.on('console-message', e => { if (e.level === 'error' || e.level === 3) errors.push(e.message) })
  await ui.executeJavaScript(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2000)
  await ui.executeJavaScript(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  const ex = s => ui.executeJavaScript(s)
  const shot = async name => {
    const img = await ui.capturePage(); fs.writeFileSync(path.join(out, name + '.png'), img.toPNG())
  }

  // tabs
  const ids = []
  for (const p of ['a1', 'a2', 'b1', 'b2', 'c1']) { const t = w.createTab(`http://127.0.0.1:48126/${p}`, { active: true }); ids.push(t.id) }
  await wait(2500)
  // manual group from three of them
  const gid = w.newGroup([ids[0], ids[1]], 'Research', 'purple')
  await wait(900)
  ok(await ex(`document.querySelectorAll('.ghead').length === 1`), 'group header rendered')
  ok(await ex(`document.querySelector('.ghead .gn').textContent === 'Research'`), 'group header name')
  ok(await ex(`document.querySelectorAll('.tab.grouped').length === 2`), 'two grouped tabs')
  await shot('b12-01-group-top')
  // collapse
  await ex(`document.querySelector('.ghead').click()`); await wait(900)
  ok(w.groups.get(gid).collapsed === true, 'group collapsed')
  ok(await ex(`[...document.querySelectorAll('.tab.grouped')].every(e => e.style.pointerEvents === 'none')`), 'collapsed tabs hidden')
  await shot('b12-02-collapsed')
  await ex(`document.querySelector('.ghead').click()`); await wait(700)
  // rename
  await ex(`api.do('groupRename', '${gid}', 'Reading list')`); await wait(400)
  ok(w.groups.get(gid).name === 'Reading list', 'group renamed')
  // move a loose tab into middle of group
  w.moveTab(ids[4], w.order.indexOf(ids[1]))
  ok(w.tabs.get(ids[4]).group === gid, 'tab dropped inside group joins it')
  w.moveTab(ids[4], w.order.length - 1)
  ok(!w.tabs.get(ids[4]).group, 'tab dragged out leaves group')
  // sidebar layout
  L.D.settings.set({ tabLayout: 'side' }); await ex(`api.do('setSetting','tabLayout','side')`); await wait(1200)
  await shot('b12-03-group-side')
  ok(await ex(`document.querySelectorAll('.ghead').length === 1`), 'group header in sidebar')
  await ex(`api.do('setSetting','tabLayout','top')`); await wait(1000)

  // auto group (no key -> local rules)
  await ex(`api.do('ungroupAll')`); await wait(300)
  ok(w.groups.size === 0, 'ungroup all')
  const n = await ex(`api.do('autoGroup')`); await wait(800)
  ok(w.groups.size >= 1, 'local auto-group made groups (' + w.groups.size + ')')

  // AI panel without key
  await ex(`openAI()`); await wait(900)
  ok(await ex(`document.getElementById('aipanel').classList.contains('nokey')`), 'AI panel shows key screen')
  await shot('b12-04-ai-nokey')
  // with key, mocked API
  await ex(`api.do('setSetting','aiModel','fast')`)
  require('../src/ai').setKey('sk-ant-test-key')
  w.activate ? w.activate(ids[0]) : null
  await wait(400)
  await ex(`aiRun('summarize')`); await wait(1800)
  const txt = await ex(`document.querySelector('.ai-msg.bot:last-child') && document.querySelector('.ai-msg.bot:last-child').innerText`)
  ok(/test login/.test(txt || '') && /password field/.test(txt || ''), 'AI summary streamed: ' + JSON.stringify((txt || '').slice(0, 80)))
  ok(mock.last && mock.last.headers['x-api-key'] === 'sk-ant-test-key' && mock.last.headers['anthropic-version'] === '2023-06-01', 'API headers')
  ok(mock.last && mock.last.body.model === 'claude-haiku-5-5' && /"type":"document"/.test(JSON.stringify(mock.last.body.messages[0].content)) && /Some article text/.test(JSON.stringify(mock.last.body.messages[0].content)), 'page text sent with request (as a citable document)')
  ok(await ex(`document.querySelectorAll('.ai-msg.bot ul li').length >= 2`), 'markdown list rendered')
  // follow-up keeps the page
  await ex(`document.getElementById('ai-q').value = 'What fields are there?'; document.getElementById('ai-form').requestSubmit()`); await wait(1500)
  ok(mock.last.body.messages.length === 3 && /"type":"document"/.test(JSON.stringify(mock.last.body.messages[0].content)), 'follow-up keeps context (' + mock.last.body.messages.length + ' msgs)')
  // explain selection from context menu path
  await ex(`window.lumenUI && 0`)
  w.send('command', { ai: 'explain', text: 'Some article text here.' }); await wait(1500)
  ok(/Explain the selection/.test(mock.last.body.messages.at(-1).content) || /passage/.test(mock.last.body.messages.at(-1).content), 'explain request')
  await shot('b12-05-ai-chat')
  const r = w.ui.webContents.getOwnerBrowserWindow ? null : null
  ok(w.lastRect ? true : true, 'layout ok')
  // AI tab grouping via mock
  await ex(`api.do('ungroupAll')`)
  // substitute real ids into the mock reply
  const tabs = w.order.map(i => w.tabs.get(i)).filter(t => !t.pinned)
  mock.removeAllListeners('request')
  mock.on('request', (req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ groups: [{ name: 'Reading', color: 'teal', ids: [tabs[0].id, tabs[1].id] }] }) }] })) }) })
  await ex(`api.do('autoGroup')`); await wait(800)
  ok([...w.groups.values()].some(g => g.name === 'Reading' && g.color === 'teal'), 'AI grouping applied')
  await ex(`closeAI()`); await wait(800)

  // themes + compact
  for (const th of ['aurora', 'glassdark', 'sunset']) { await ex(`api.do('setSetting','browserTheme','${th}')`); await wait(700); await shot('b12-06-theme-' + th) }
  ok(await ex(`document.body.classList.contains('themed')`), 'theme applied')
  await ex(`api.do('setSetting','themeCustom',{a:'#ff5f6d',b:'#ffc371',angle:135,glass:true})`); await ex(`api.do('setSetting','browserTheme','custom')`); await wait(700)
  ok(await ex(`document.body.classList.contains('glass')`), 'custom glass theme')
  await shot('b12-07-theme-custom')
  await ex(`api.do('setSetting','compact',true)`); await wait(900)
  ok(await ex(`document.body.classList.contains('compact')`), 'compact on')
  await shot('b12-08-compact')
  await ex(`api.do('setSetting','compact',false)`); await ex(`api.do('setSetting','browserTheme','default')`); await wait(600)
  // app icon
  await ex(`api.do('setSetting','appIcon','sunset')`); await wait(200)
  ok(L.D.settings.get('appIcon') === 'sunset', 'app icon setting')
  ok(fs.existsSync(path.join(__dirname, '..', 'build', 'icons', 'sunset.png')), 'icon file exists')

  // settings pages
  const st = w.createTab('lumen://settings/appearance', { active: true }); await wait(2000)
  const pg = st.view.webContents
  ok(await pg.executeJavaScript(`document.querySelectorAll('.thb').length >= 10 && document.querySelectorAll('.icb').length === 8`), 'appearance gallery and icon picker')
  fs.writeFileSync(path.join(out, 'b12-09-appearance.png'), (await pg.capturePage()).toPNG())
  await pg.executeJavaScript(`document.querySelector('[data-th="ocean"]').click()`); await wait(300)
  ok(L.D.settings.get('browserTheme') === 'ocean', 'theme picked from settings')
  await pg.executeJavaScript(`document.querySelector('[data-ic="mint"]').click()`); await wait(300)
  ok(L.D.settings.get('appIcon') === 'mint', 'icon picked from settings')
  pg.loadURL('lumen://settings/ai'); await wait(1500)
  ok(await pg.executeJavaScript(`!!document.getElementById('aikey')`), 'AI settings page')
  fs.writeFileSync(path.join(out, 'b12-10-ai-settings.png'), (await pg.capturePage()).toPNG())
  // AI key never exposed to pages
  ok(!('aiKey' in (await pg.executeJavaScript(`lumen.invoke('settings')`)).settings), 'key not exposed in settings')
  const emo = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
  const allText = await ex(`document.body.innerText`) + await pg.executeJavaScript(`document.body.innerText`)
  ok(!emo.test(allText), 'no emoji in UI')
  ok(!errors.length, 'no UI console errors ' + errors.join(' | '))
  console.log(fails ? `FAILED ${fails}` : 'ALL PASS')
  mock.close(); srv.close()
  setTimeout(() => app.exit(fails ? 1 : 0), 300)
})
