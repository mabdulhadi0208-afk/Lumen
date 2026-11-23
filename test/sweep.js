const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-sw', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-sw')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errs = []; w.ui.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 3) errs.push('UI: ' + e.message) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1200)
  L.D.addHistory('https://example.com/a', 'Example'); L.D.addBookmark('https://example.com', 'Example')
  try { L.D.savePassword && L.D.savePassword({ origin: 'https://example.com', username: 'me', password: '123456' }) } catch (e) { console.log('pw seed', e.message) }
  const t = w.active(), wc = t.view.webContents
  let cur = ''
  wc.on('console-message', e => { if (e.level === 'error' || e.level === 3) errs.push(cur + ': ' + e.message) })
  const pages = ['newtab', 'settings/general', 'settings/appearance', 'settings/ai', 'settings/privacy', 'settings/search', 'settings/sync', 'settings/about', 'history', 'bookmarks', 'downloads', 'passwords', 'extensions', 'settings/translate', 'settings/permissions']
  for (const p of pages) {
    cur = p; wc.loadURL('lumen://' + p); await wait(1300)
    const info = await wc.executeJavaScript(`JSON.stringify({ t: document.title, len: document.body.innerText.length, h2: (document.querySelector('h2') || {}).textContent || '' })`).catch(e => '{"err":"' + e.message + '"}')
    console.log(p.padEnd(22), info)
    // click through every switch and segmented control on settings pages, then put them back
    if (p.startsWith('settings/')) {
      const n = await wc.executeJavaScript(`(() => { let n = 0; document.querySelectorAll('.switch input').forEach(i => { i.click(); i.click(); n++ }); return n })()`).catch(() => -1)
      await wait(300); console.log('   toggled', n, 'switches twice')
    }
  }
  wc.loadURL('lumen://passwords'); await wait(1200)
  fs.writeFileSync('/tmp/lumen-shots/sweep-passwords.png', (await wc.capturePage()).toPNG())
  // UI surfaces
  for (const [name, open, close] of [['menu', 'openMainMenu()', 'closePopover(true)'], ['site', 'openSiteInfo()', 'closePopover(true)'], ['shortcuts', 'openShortcuts()', 'closePopover(true)'], ['cmd', "openCmd('newtab')", 'closeCmd(true)'], ['ai', 'openAI()', 'closeAI()'], ['grid', 'openTabGrid()', 'closeTabGrid()'], ['translate menu', 'openTranslateMenu()', 'closePopover(true)'], ['qr', 'openQR()', 'closePopover(true)']]) {
    cur = name
    try { await ex(open); await wait(700); await ex(close); await wait(400) } catch (e) { errs.push('UI ' + name + ': ' + e.message) }
  }
  ok = w.overlay === false; console.log('overlay released after all surfaces:', ok)
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'NO ERRORS'); app.exit(0)
})
