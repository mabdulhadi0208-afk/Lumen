// Screenshots of Home and Settings, light and dark, to compare the look before and after the speed pass. Not part of the suite.
// Run: xvfb-run -a npx electron test/perfshots.js --no-sandbox OUTDIR
const fs = require('fs'), path = require('path')
const { app, nativeTheme } = require('electron')
const OUT = process.argv.find(a => a.startsWith('/') && !a.includes('electron') && !a.endsWith('.js')) || '/tmp/lumen-perfshots'
fs.mkdirSync(OUT, { recursive: true })
fs.rmSync('/tmp/lumen-perfshots-data', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-perfshots-data')
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
app.whenReady().then(async () => {
  await wait(6000)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  w.win.setContentSize(1280, 820)
  for (const theme of ['light', 'dark']) {
    nativeTheme.themeSource = theme; await wait(800)
    for (const url of ['lumen://newtab', 'lumen://settings/general', 'lumen://settings/appearance']) {
      const t = w.createTab(url, { active: true }); await wait(6000)
      const img = await t.view.webContents.capturePage()
      fs.writeFileSync(path.join(OUT, `${theme}-${url.replace(/\W+/g, '_')}.png`), img.toPNG())
    }
  }
  app.exit(0)
})
