// 4.6 features: export and import settings (with Undo, and only the public settings), the search field in the keyboard
// shortcut sheet, the new Cmd K commands (Pin, Mute, Reload all tabs, Export or Import Settings), the update card's
// steps and Return key, calm wallpapers, no window capture behind menus, dialogs and toasts, and the site panel on a
// data: page.
// Run: xvfb-run -a npx electron test/qol46.js --no-sandbox   (log: /tmp/lumen-qol46.log)
const fs = require('fs'), path = require('path'); const { app, BrowserWindow, ipcMain } = require('electron')
fs.rmSync('/tmp/lumen-qol46', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-qol46')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const LOG = '/tmp/lumen-qol46.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
app.on('window-all-closed', () => {})
const acts = []; ipcMain.on('fake-update-act', (e, n) => acts.push(n))
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  w.win.setContentSize(1280, 800); await wait(400)

  // ---- export and import settings
  const dir = fs.mkdtempSync('/tmp/lumen-qol46-files-'), file = path.join(dir, 'Lumen Settings.json')
  await ex(`lumenUI.do('setSetting', 'compact', true)`); await ex(`lumenUI.do('setSetting', 'accent', '#2d4a6b')`); await wait(300)
  const e1 = L.__exportSettings(file); const j = JSON.parse(fs.readFileSync(file, 'utf8'))
  ok(e1.ok && e1.count > 20 && j.kind === 'lumen-settings' && j.settings.compact === true && j.settings.accent === '#2d4a6b', `export writes a Lumen settings file (${e1.count} settings)`)
  ok(!('introSeen' in j.settings) && !Object.keys(j.settings).some(k => /^(ai|api|sync)Key$|^vault|^passwords?$|^passkeys?$|^history$|^sync(Pass|Secret|Token)/i.test(k)), 'the file holds no passwords, keys, history or sync data: ' + Object.keys(j.settings).join(','))
  await ex(`lumenUI.do('setSetting', 'compact', false)`); await ex(`lumenUI.do('setSetting', 'accent', '#1f6b52')`); await wait(300)
  // a file with a key Lumen does not allow, and one with the wrong type, are skipped
  j.settings.aiKey = 'sk-ant-should-not-land'; j.settings.motion = 42; fs.writeFileSync(file, JSON.stringify(j))
  const i1 = L.__importSettings(file)
  ok(i1.ok && i1.count >= 2 && L.D.settings.get('compact') === true && L.D.settings.get('accent') === '#2d4a6b', `import puts them back (${i1.count} changed)`)
  ok(L.D.settings.get('aiKey') !== 'sk-ant-should-not-land' && L.D.settings.get('motion') !== 42, 'keys outside the public settings and values of the wrong type are ignored')
  await wait(400)
  ok(/2d4a6b/i.test(await ex(`getComputedStyle(document.documentElement).getPropertyValue('--accent')`)), 'the imported accent reaches the open window at once')
  const u1 = L.__undoImportSettings()
  ok(u1.ok && L.D.settings.get('compact') === false && L.D.settings.get('accent') === '#1f6b52', `Undo puts back what the import changed (${u1.count})`)
  ok(!L.__undoImportSettings().ok, 'and there is nothing left to undo after that')
  fs.writeFileSync(file, '{"kind":"something-else"}'); ok(!L.__importSettings(file).ok, 'a file that is not a Lumen settings file is refused')
  fs.writeFileSync(file, 'not json'); ok(!L.__importSettings(file).ok, 'so is a file that is not JSON')
  const t = w.createTab('lumen://settings/general', { active: true }); await wait(3000)
  ok(await t.view.webContents.executeJavaScript(`!!document.querySelector('#setfile #sexp') && !!document.querySelector('#setfile #simp') && /Take your settings with you/.test(document.getElementById('setfile').textContent)`), 'Settings, General has Export and Import')
  ok(await t.view.webContents.executeJavaScript(`(() => { const g = document.querySelector('.gl'), b = g.querySelector('b'); const c = getComputedStyle(b).color, bg = getComputedStyle(g).backgroundColor; return c !== bg && !/255, 255, 255/.test(c) })()`), 'the stat tiles at the top of Settings have ink type on paper (they were white on paper)')

  // ---- the keyboard shortcut sheet can be searched
  await ex(`openShortcuts()`); await wait(900)
  ok(await ex(`document.activeElement && document.activeElement.id === 'scq'`), 'the shortcut sheet opens with its search field focused')
  await ex(`(() => { const q = document.getElementById('scq'); q.value = 'split'; q.dispatchEvent(new Event('input')) })()`); await wait(200)
  const shown = await ex(`[...document.querySelectorAll('.sc-row:not(.sc-hide)')].map(r => r.textContent)`)
  ok(shown.length >= 1 && shown.every(x => /split/i.test(x)), 'typing "split" leaves only the split rows: ' + shown.join(' | '))
  await ex(`(() => { const q = document.getElementById('scq'); q.value = 'qqqzzz'; q.dispatchEvent(new Event('input')) })()`); await wait(200)
  ok(await ex(`document.querySelector('.popover').classList.contains('sc-empty') && getComputedStyle(document.querySelector('.sc-none')).display !== 'none'`), 'no match shows a friendly empty state')
  await ex(`document.getElementById('scq').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))`); await wait(200)
  ok(await ex(`document.getElementById('scq').value === '' && document.querySelectorAll('.sc-row.sc-hide').length === 0`), 'Esc clears the search first')
  await ex(`closePopover(true)`); await wait(500)

  // ---- new Cmd K commands
  const titles = await ex(`COMMANDS.map(c => c.t)`)
  ok(['Pin or Unpin Tab', 'Mute or Unmute Tab', 'Reload All Tabs', 'Export or Import Settings'].every(x => titles.includes(x)), 'Cmd K has Pin, Mute, Reload All Tabs and Export or Import Settings')
  const p = w.createTab('data:text/html,<title>Pin me</title>pin', { active: true }); await wait(1200)
  await ex(`COMMANDS.find(c => c.t === 'Pin or Unpin Tab').run()`); await wait(500)
  ok(w.tabs.get(p.id).pinned === true, 'Pin or Unpin Tab pins the tab you are on')
  await ex(`COMMANDS.find(c => c.t === 'Pin or Unpin Tab').run()`); await wait(500)
  ok(w.tabs.get(p.id).pinned === false, 'and unpins it again')
  await ex(`COMMANDS.find(c => c.t === 'Mute or Unmute Tab').run()`); await wait(300)
  ok(w.tabs.get(p.id).muted === true, 'Mute or Unmute Tab mutes it')
  const n = await ex(`lumenUI.do('reloadAll')`)
  ok(n >= 2, `Reload All Tabs reloads the awake tabs (${n})`)
  // the site panel on a data: page (its origin is "null") no longer throws
  const si = await ex(`lumenUI.do('siteInfo')`)
  ok(si && si.host === '', 'the site panel works on a data: page')

  // ---- no window capture behind menus, dialogs and toasts (4.6: they are solid, the window shows through); the tab
  // hover preview's own thumbnail (snapTab) is a different feature and is not counted
  let caps = 0
  for (const wc of [p.view.webContents, w.ui.webContents]) { const o = wc.capturePage.bind(wc); wc.capturePage = (...a) => { const st = new Error().stack; if (!/snapTab/.test(st)) { caps++; console.log('capture from ' + st.split('\n').slice(2, 4).join(' / ')) } return o(...a) } }
  await w.contextMenu(p, { x: 200, y: 120, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '', isEditable: false, editFlags: {}, formControlType: 'none', inputFieldType: '' }); await wait(1200)
  p.view.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' }); try { w._nova.menu.view.webContents.executeJavaScript(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`) } catch {} await wait(600)
  const d = L.__novaDialog(w, { buttons: ['OK', 'Cancel'], defaultId: 0, cancelId: 1, message: 'A question' }); await wait(1200)
  try { w._nova.dialog.view.webContents.executeJavaScript(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`) } catch {}
  await Promise.race([d, wait(2000)])
  await ex(`toast('Saved', { label: 'Undo', run: () => {} })`); await wait(1200)
  ok(caps === 0, `opening a menu, a dialog and a toast copies nothing from the window (${caps} captures)`)

  // ---- calm wallpapers: every one is a quiet tone
  const nt = w.createTab('lumen://newtab', { active: true }); await wait(3000)
  const sats = await nt.view.webContents.executeJavaScript(`(() => { const out = {}; for (const k of ['aurora', 'nebula', 'sunset', 'ocean', 'dusk', 'ember', 'forest', 'plain', 'auto']) { const i = document.createElement('i'); i.className = 'wpsw wp-' + k; document.body.appendChild(i); const cs = getComputedStyle(i); const c = flatColor(cs.backgroundImage + ' ' + cs.backgroundColor, 'rgb(0,0,0)'); i.remove(); const [r, g, b] = c.match(/\\d+/g).map(Number); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); out[k] = mx - mn } return out })()`)
  ok(Object.values(sats).every(v => v <= 26), 'every wallpaper is a calm tone (largest channel spread ' + JSON.stringify(sats) + ')')
  const names = await nt.view.webContents.executeJavaScript(`[...document.querySelectorAll('[data-wp]')].map(b => b.title || b.textContent).join(',')`)
  ok(!/Nebula|Aurora|Glow|Ember/.test(names), 'the wallpaper names are the calm ones: ' + names.slice(0, 120))

  // ---- the update card: steps, the percent, and Return
  const card = async st => { const win = new BrowserWindow({ width: 600, height: 350, show: false, webPreferences: { preload: path.join(__dirname, 'fixtures/fake-update-preload.js'), contextIsolation: true, sandbox: false } }); await win.loadFile(path.join(__dirname, '../ui/update.html'), { search: 's=' + st }); await wait(1300); return win }
  let c = await card('ready')
  ok(await c.webContents.executeJavaScript(`document.querySelectorAll('#stp li.done').length === 3 && document.querySelector('#stp li.now').dataset.s === 'go'`), 'ready: Download, Verify and Install are ticked off and Restart is next')
  const clear = `(() => { const h = document.querySelector('#m2 .hint'), b = document.getElementById('later'); if (!h) return false; const r = h.getBoundingClientRect(), m = document.getElementById('m2').getBoundingClientRect(), l = b.getBoundingClientRect(); return Math.min(r.right, m.right) <= l.left + 0.5 })()`
  ok(await c.webContents.executeJavaScript(`/Return/.test(document.getElementById('m2').textContent)`) && await c.webContents.executeJavaScript(clear), 'ready: the footer says Return, clear of the When I quit button')
  acts.length = 0; c.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' }); c.webContents.sendInputEvent({ type: 'char', keyCode: '\r' }); await wait(300)
  ok(acts.includes('install'), 'Return on a ready update restarts into it: ' + acts.join(','))
  c.destroy(); c = await card('available')
  ok(await c.webContents.executeJavaScript(`/Return/.test(document.getElementById('m2').textContent) && /Esc/.test(document.getElementById('m2').textContent)`) && await c.webContents.executeJavaScript(clear), 'available: the footer says Return and Esc, clear of the buttons')
  c.destroy(); c = await card('downloading')
  ok(await c.webContents.executeJavaScript(`document.getElementById('ppct').textContent === '42%' && document.querySelector('#stp li.now').dataset.s === 'get'`), 'downloading: the percent counts under the number and Download is the current step')
  acts.length = 0; c.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' }); await wait(300)
  ok(!acts.includes('cancel'), 'Return never cancels a running download')
  c.destroy()

  const l = fails ? 'FAILED ' + fails : 'ALL PASS'; console.log(l); fs.appendFileSync(LOG, l + '\n'); app.exit(fails ? 1 : 0)
})
