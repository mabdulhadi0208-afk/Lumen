// Headless smoke test: boots Lumen, opens tabs and internal pages, tests password capture, captures screenshots.
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'
const { app } = require('electron')
const path = require('path'), fs = require('fs'), http = require('http')
app.setPath('userData', '/tmp/lumen-test-profile')
const errors = []
const L = require('../src/main.js')
const out = '/tmp/lumen-shots'; fs.mkdirSync(out, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))

const srv = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html')
  if (req.url.startsWith('/done')) return res.end('<h1>Signed in</h1>')
  res.end(`<title>Test Login</title><form action="/done" method="get"><input name="user" id="u" type="email"><input id="p" type="password" name="pw"><button id="go">Sign in</button></form><video src=""></video><p>${'Lorem ipsum dolor sit amet, consectetur. '.repeat(40)}</p>`)
}).listen(48123)

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0]
  if (!w) { console.log('FAIL no window'); app.exit(1) }
  w.ui.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) errors.push('UI: ' + e.message) })
  const shot = async (name, wc) => { const img = await (wc || w.ui.webContents).capturePage(); fs.writeFileSync(path.join(out, name + '.png'), img.toPNG()) }
  const winShot = async name => {
    // composite: UI view + active tab view
    const ui = await w.ui.webContents.capturePage()
    const t = w.active()
    const tab = t && t.view ? await t.view.webContents.capturePage() : null
    fs.writeFileSync(path.join(out, name + '-ui.png'), ui.toPNG())
    if (tab) fs.writeFileSync(path.join(out, name + '-tab.png'), tab.toPNG())
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify({ rect: w.rect, split: w.splitId ? true : false }))
  }
  const logTabErrors = t => t.view && t.view.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 3) errors.push('TAB ' + t.url + ': ' + e.message) })
  for (const t of w.tabs.values()) logTabErrors(t)

  await winShot('01-start')
  console.log('state', JSON.stringify(w.serialize()).slice(0, 300))

  // open a few tabs
  const urls = ['lumen://settings', 'lumen://history', 'lumen://passwords', 'http://localhost:48123/login', 'lumen://extensions']
  for (const u of urls) { const t = w.createTab(u); logTabErrors(t); await wait(900) }
  await wait(1500)
  console.log('tabs', w.order.length, w.serialize().tabs.map(t => t.title).join(' | '))
  await winShot('02-tabs')

  // password capture
  const login = [...w.tabs.values()].find(t => t.url.includes('48123'))
  w.activate(login.id); await wait(800)
  let prompted = null
  const origSend = w.send.bind(w)
  w.send = (ch, d) => { if (ch === 'prompt') prompted = d; origSend(ch, d) }
  await login.view.webContents.executeJavaScript(`(()=>{const u=document.getElementById('u'),p=document.getElementById('p');const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};set(u,'me@test.com');set(p,'hunter2!');document.getElementById('go').click()})()`)
  await wait(1500)
  console.log('password prompt:', prompted && prompted.text)
  await winShot('03-pwprompt')
  // answer "Save" and check autofill on reload
  await w.ui.webContents.executeJavaScript(`document.querySelector('.prompt [data-a="save"]').click()`)
  await wait(500)
  login.view.webContents.loadURL('http://localhost:48123/login'); await wait(1500)
  console.log('autofill:', await login.view.webContents.executeJavaScript(`document.getElementById('u').value+' / '+(document.getElementById('p').value?'filled':'empty')`))

  // settings pages
  for (const s of ['general', 'appearance', 'privacy', 'sync', 'import', 'about']) {
    const t = w.createTab('lumen://settings/' + s); logTabErrors(t); await wait(900)
    await shot('04-settings-' + s, t.view.webContents)
  }
  const nt = w.createTab('lumen://newtab'); logTabErrors(nt); await wait(1200); await shot('05-newtab', nt.view.webContents)

  // command bar
  w.send('command', 'newtab'); await wait(900)
  await w.ui.webContents.executeJavaScript(`document.getElementById('cmd-input').value='set';document.getElementById('cmd-input').dispatchEvent(new Event('input'))`)
  await wait(700)
  await shot('06-cmdbar')
  await w.ui.webContents.executeJavaScript(`document.getElementById('cmd-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`)
  await wait(500)

  // split view, find, collapse sidebar
  const other = w.order[w.order.length - 2]
  w.splitId = other; w.layout(); w.pushState(); await wait(800); await winShot('07-split')
  w.splitId = null; w.layout()
  w.send('command', 'find'); await wait(600); await shot('08-find'); w.send('command', 'find')
  await w.ui.webContents.executeJavaScript(`document.getElementById('find-close').click()`)
  w.send('command', 'sidebar'); await wait(900); await shot('09-collapsed'); w.send('command', 'sidebar'); await wait(700)

  // reader mode + sleeping + closing + reopen
  w.activate(login.id); await wait(300)
  login.view.webContents.loadURL('http://localhost:48123/article?x'); await wait(800)
  await login.view.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, '../src/reader.js'), 'utf8')); await wait(600)
  console.log('reader active:', await login.view.webContents.executeJavaScript('document.documentElement.dataset.lumenReader||"no"'))
  const victim = w.tabs.get(w.order[1]); w.sleep(victim); console.log('slept:', victim.asleep)
  w.activate(victim.id); await wait(800); console.log('woke:', !victim.asleep && !!victim.view)
  const n = w.order.length; w.closeTab(w.activeId); await wait(300)
  w.send('command', 'x')
  console.log('closed ok:', w.order.length === n - 1)
  // drag reorder through the UI path
  await w.ui.webContents.executeJavaScript(`window.lumenUI.do('move', ${w.order[w.order.length - 1]}, 0)`)
  await wait(500)
  await winShot('10-final')
  console.log('passwords saved:', L.D.listPasswords().length)
  console.log('history entries:', L.D.listHistory('', 99).length)
  console.log('ERRORS', errors.length ? '\n' + [...new Set(errors)].join('\n') : 'none')
  srv.close()
  setTimeout(() => app.exit(0), 500)
})
