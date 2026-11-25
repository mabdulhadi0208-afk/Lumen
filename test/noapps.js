// Lumen 4.0: Surge and Koi are their own apps again. Lumen must not start or host them (no extra windows, no extra
// utility processes, nothing loaded from apps/), someone who had them gets ONE "Surge and Koi are now their own apps"
// card (never over the intro, never again), a fresh user never sees it, the old login item is retired, and the
// "Get Surge and Koi" card in Settings links to the right downloads.
// Run: xvfb-run -a npx electron test/noapps.js --no-sandbox   (log: /tmp/lumen-noapps.log)
const fs = require('fs'), path = require('path')
const { app, BaseWindow, BrowserWindow, nativeTheme, shell } = require('electron')
const DIR = '/tmp/lumen-noapps'
fs.rmSync(DIR, { recursive: true, force: true }); app.setPath('userData', DIR)
const VERSION = require('../package.json').version
// a 3.x profile: Surge and Koi data folders inside Lumen, and the settings only they ever wrote
fs.mkdirSync(path.join(DIR, 'apps', 'surge'), { recursive: true }); fs.mkdirSync(path.join(DIR, 'apps', 'koi'), { recursive: true })
fs.writeFileSync(path.join(DIR, 'apps', 'surge', 'settings.json'), '{"welcomed":true}')
fs.writeFileSync(path.join(DIR, 'settings.json'), JSON.stringify({ introSeen: true, whatsNewSeen: VERSION, autoUpdate: false, apps: { surge: true, koi: true }, backgroundApps: true, toolbarApps: true, openAtLogin: true, backgroundToldOnce: true, axVersion: '3.9.0', axGranted: true }))
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const LOGF = '/tmp/lumen-noapps.log'; fs.writeFileSync(LOGF, '')
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); fs.appendFileSync(LOGF, m + '\n') }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))
// the links open in the system browser: record them instead
const opened = []; shell.openExternal = url => { opened.push(url); return Promise.resolve() }
// every Nova dialog Lumen shows
const shown = []; const realDialog = L.__nova.novaDialog
L.__nova.novaDialog = (host, opts) => { shown.push(opts); return realDialog(host, opts) }
const SURGE = 'https://github.com/mabdulhadi0208-afk/surge/releases/latest', KOI = 'https://github.com/mabdulhadi0208-afk/mabdulhadi0208-afk-koi/releases/latest'
const cards = () => shown.filter(o => o.kind === 'apps')

let painter = null
async function shot(w, name) {
  try {
    const parts = []
    for (const v of w.win.contentView.children) {
      if (v.getVisible && !v.getVisible()) continue
      const b = v.getBounds(); if (b.width < 2) continue
      const img = await Promise.race([v.webContents.capturePage(), wait(1500).then(() => null)]); if (!img || img.isEmpty()) continue
      parts.push({ src: img.toDataURL(), ...b })
    }
    const [W, H] = w.win.getContentSize()
    if (!painter) { painter = new BrowserWindow({ show: false, width: 200, height: 200 }); await painter.loadURL('data:text/html,<body></body>') }
    const url = await painter.webContents.executeJavaScript(`(async () => {
      const c = document.createElement('canvas'); c.width = ${W}; c.height = ${H}; const x = c.getContext('2d')
      x.fillStyle = ${JSON.stringify(nativeTheme.shouldUseDarkColors ? '#1b1c20' : '#e6e9f0')}; x.fillRect(0, 0, ${W}, ${H})
      for (const p of ${JSON.stringify(parts)}) { const im = new Image(); im.src = p.src; await im.decode(); x.drawImage(im, p.x, p.y, p.width, p.height) }
      return c.toDataURL('image/png') })()`)
    fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(url.split(',')[1], 'base64'))
    LOG('    shot ' + SHOTS + '/' + name + '.png')
  } catch (e) { LOG('    shot failed ' + name + ': ' + e.message) }
}
const nv = w => L.__nova.state(w)
const untilDialog = async w => { for (let i = 0; i < 60 && !nv(w).dialogOpen; i++) await wait(100); await wait(400) }
const click = (w, i) => nv(w).dialogView.webContents.executeJavaScript(`document.querySelector('.btn[data-i="${i}"]').click()`)

app.whenReady().then(() => main().catch(e => { LOG('FAIL test crashed: ' + (e && e.stack || e)); app.exit(1) }))
async function main() {
  await wait(1200); const w = L.windows[0]
  // the card waits while the intro plays
  w.introOn = true
  await wait(7000)
  ok(cards().length === 0, 'no card while the intro is on screen')
  w.introOn = false
  await untilDialog(w)

  // ---- nothing of Surge and Koi runs
  const mods = Object.keys(require.cache).filter(f => /[\\/]apps[\\/]|[\\/]src[\\/](apps|axguard)\.js$|uiohook/.test(f))
  ok(!mods.length, 'no Surge, Koi, axguard or uiohook code is loaded' + (mods.length ? ': ' + mods.slice(0, 3).join(', ') : ''))
  ok(!fs.existsSync(path.join(__dirname, '..', 'src', 'apps.js')) && !fs.existsSync(path.join(__dirname, '..', 'apps')), 'apps/ and src/apps.js are gone')
  const pkg = require('../package.json')
  ok(!pkg.dependencies['uiohook-napi'] && !pkg.build.files.some(f => /^apps/.test(f)), 'no uiohook dependency and nothing from apps/ in the build')
  ok(BaseWindow.getAllWindows().filter(b => !b.isDestroyed() && !(painter && b === painter)).length === L.windows.length, 'only Lumen\'s own windows: ' + BaseWindow.getAllWindows().length + ' for ' + L.windows.length)
  const urls = require('electron').webContents.getAllWebContents().map(c => c.getURL())
  ok(!urls.some(u => /[\\/]apps[\\/](surge|koi)|surge|koi/i.test(u.replace(/^lumen:\/\/settings\/apps$/, ''))), 'no Surge or Koi pages anywhere')
  const util = app.getAppMetrics().filter(p => p.type === 'Utility')
  LOG('    utility processes: ' + util.map(p => p.serviceName || p.name).join(', '))
  ok(util.every(p => /network|storage|audio|video|data_decoder|unzip|cdm|print/i.test((p.serviceName || '') + ' ' + (p.name || ''))), 'no extra utility processes, only Chromium\'s own')
  ok(!L.__isBackground && !L.__goBackground && !L.__appOpen && !L.__quitLumen, 'no background mode left in the main process')

  // ---- the card, once
  ok(cards().length === 1, 'someone with old Surge and Koi data gets the card')
  const c = cards()[0] || {}
  ok(/Surge and Koi are now their own apps/.test(c.message || '') && c.buttons.join('|') === 'Get Surge and Koi|Not now' && c.cancelId === 1, 'it says so and offers both downloads and Not now: ' + JSON.stringify(c.buttons))
  ok(![c.message, c.detail, c.title, ...(c.buttons || [])].join(' ').match(/\p{Extended_Pictographic}/u), 'no emojis in the card')
  ok(L.D.settings.get('separateAppsShown') === true && JSON.parse(fs.readFileSync(path.join(DIR, 'settings.json'), 'utf8')).separateAppsShown === true, 'the flag is stored on disk before it shows')
  ok(L.D.settings.get('openAtLogin') === undefined, 'the old login item (only for Surge and Koi) is retired')
  nativeTheme.themeSource = 'light'; await wait(2500)
  await shot(w, '42-separate-card-light')
  await click(w, 0); await wait(800)
  ok(opened.includes(SURGE) && opened.includes(KOI), 'Get Surge and Koi opens both downloads: ' + opened.join(' '))
  // dark: the same card again, only for the picture
  nativeTheme.themeSource = 'dark'; await wait(800)
  let p = L.__novaDialog(w, c); await untilDialog(w); await wait(2500); await shot(w, '42-separate-card-dark'); await click(w, 1); await p; await wait(400)
  nativeTheme.themeSource = 'light'; await wait(400)
  const before = cards().length
  L.__separateApps.check(); await wait(6000)
  ok(cards().length === before, 'never shown a second time')

  // ---- a fresh user never sees it
  fs.rmSync(path.join(DIR, 'apps'), { recursive: true, force: true })
  L.D.settings.set({ separateAppsShown: undefined, apps: undefined, backgroundApps: undefined, toolbarApps: undefined, openAtLogin: undefined, backgroundToldOnce: undefined, axVersion: undefined, axGranted: undefined })
  ok(!L.__separateApps.had(), 'a fresh profile has no Surge or Koi data')
  L.__separateApps.check(); await wait(6000)
  ok(cards().length === before && L.D.settings.get('separateAppsShown') === false, 'a fresh user never gets the card, and it is decided once')

  // ---- the Settings card
  opened.length = 0
  const t = w.createTab('lumen://settings/apps', { active: true }); await wait(2600)
  const pg = s => t.view.webContents.executeJavaScript(s)
  const links = await pg(`[...document.querySelectorAll('[data-get]')].map(a => [a.dataset.get, a.getAttribute('href'), a.textContent.trim()])`)
  LOG('    settings links ' + JSON.stringify(links))
  ok(JSON.stringify(links) === JSON.stringify([['surge', SURGE, 'Get Surge'], ['koi', KOI, 'Get Koi']]), 'Settings has Get Surge and Get Koi with the right links')
  ok(await pg(`!!document.querySelector('.hero') && /Get Surge and Koi/.test(document.querySelector('.hero h2').textContent) && document.querySelectorAll('.getapp .appicon svg').length === 2`), 'in the hero-banner style, with both logos')
  ok(await pg(`!document.querySelector('[data-set=toolbarApps], [data-set=backgroundApps], [data-set=openAtLogin], [data-appsw]')`), 'the old switches are gone')
  ok(!/\p{Extended_Pictographic}/u.test(await pg(`document.body.innerText`)), 'no emojis on the page')
  const tabsBefore = L.windows[0].tabs.size
  await pg(`document.querySelector('[data-get=koi]').click()`); await wait(600)
  ok(opened.length === 1 && opened[0] === KOI, 'Get Koi opens the Koi download: ' + opened.join(' '))
  await pg(`document.querySelector('[data-get=surge]').click()`); await wait(600)
  ok(opened[1] === SURGE, 'Get Surge opens the Surge download')
  ok(L.windows[0].tabs.size === tabsBefore && L.windows.length === 1, 'no extra tabs or windows from the links')
  await wait(1200); fs.writeFileSync(`${SHOTS}/42-separate-settings-light.png`, (await t.view.webContents.capturePage()).toPNG())
  nativeTheme.themeSource = 'dark'; await wait(1500)
  fs.writeFileSync(`${SHOTS}/42-separate-settings-dark.png`, (await t.view.webContents.capturePage()).toPNG())
  nativeTheme.themeSource = 'system'
  const ui = await w.ui.webContents.executeJavaScript(`!document.getElementById('btn-surge') && !document.getElementById('btn-koi')`)
  ok(ui, 'no Surge or Koi buttons in the toolbar')
  ok(!(await L.windows[0].ui.webContents.executeJavaScript(`api.do('appsRunning')`)), 'the apps IPC is gone')

  ok(!errs.length, 'no crashes' + (errs.length ? ': ' + errs[0].slice(0, 300) : ''))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
}
