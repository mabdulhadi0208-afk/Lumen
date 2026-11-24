// 1.19: Surge and Koi next to Reload, logos and tool windows in the accent color, and a first-launch intro without
// the what's-new act (that one is only for people who update).
process.env.LUMEN_APPS_ANYWHERE = '1'
const fs = require('fs'); const { app, BrowserWindow } = require('electron')
fs.rmSync('/tmp/lumen-w19', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-w19')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js'); const Apps = require('../src/apps.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-wave19.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))
app.whenReady().then(async () => {
  await wait(1500); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  // the first-launch film: watch every scene it shows
  await ex(`window.__acts = []; new MutationObserver(() => { for (const c of ['.new', '.fin', '.desk', '.mw']) if (document.querySelector('#intro ' + c) && !__acts.includes(c)) __acts.push(c) }).observe(document.body, { subtree: true, childList: true }); 1`)
  await wait(14000)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(6000)
  const acts = await ex(`__acts`); LOG('    first launch scenes: ' + acts.join(' '))
  ok(acts.includes('.mw') && acts.includes('.fin'), 'first launch shows what Lumen can do and ends with the welcome')
  ok(!acts.includes('.new'), 'first launch has no What is new act')
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(2000)
  ok(await ex(`!document.getElementById('intro')`), 'intro closes')
  // after an update, the short cut still shows what is new
  await ex(`window.__acts = []; Intro.play({ whatsNew: '1.19.0' }); 1`); await wait(8000)
  ok((await ex(`__acts`)).includes('.new') && await ex(`/1\\.19/.test(document.querySelector('#intro .new .eyebrow').textContent)`), 'after an update: New in Lumen 1.19')
  await ex(`document.querySelector('#intro .skip').click()`); await wait(2500); await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1800)

  // toolbar buttons
  await ex(`renderAppButtons()`); await wait(600)
  const btn = id => ex(`(() => { const b = document.getElementById('btn-${id}'); const r = b.getBoundingClientRect(); const u = document.getElementById('urlbar').getBoundingClientRect(); return { shown: !b.hidden && r.width > 20, logo: !!b.querySelector('svg.applogo'), right: r.right, top: r.top, bottom: r.bottom, urlLeft: u.left, urlTop: u.top, urlBottom: u.bottom } })()`)
  let s = await btn('surge'), k = await btn('koi'); LOG('    ' + JSON.stringify({ s, k }))
  ok(s.shown && k.shown && s.logo && k.logo, 'Surge and Koi buttons with their logos next to Reload')
  ok(k.right <= s.urlLeft + 1 || k.bottom <= s.urlTop + 1, 'they do not run into the address bar (tabs on top)')
  const stop = () => ex(`getComputedStyle(document.querySelector('#btn-surge svg stop')).stopColor`)
  const c1 = await stop(); fs.writeFileSync(`${SHOTS}/w19-toolbar-blue.png`, (await w.ui.webContents.capturePage({ x: 0, y: 0, width: 520, height: 96 })).toPNG())
  // Surge's menu opens under the button
  await ex(`document.getElementById('btn-surge').click()`); await wait(2000)
  const pop = BrowserWindow.getAllWindows().find(b => /popover\.html/.test(b.webContents.getURL()) && /surge/.test(b.webContents.getURL()))
  ok(pop && pop.isVisible(), "Surge's own menu opens from the toolbar")
  if (pop) {
    const pb = pop.getBounds(), cb = w.win.getContentBounds(); LOG('    popover ' + JSON.stringify(pb) + ' window ' + JSON.stringify(cb))
    ok(Math.abs(pb.y - (cb.y + s.bottom + 4)) < 30 && pb.x > cb.x - 200 && pb.x < cb.x + 600, 'right under the button')
    ok(/91, 140, 255|5b8cff/i.test(await pop.webContents.executeJavaScript(`getComputedStyle(document.documentElement).getPropertyValue('--lumen-a')`)), 'in Lumen blue')
    fs.writeFileSync(`${SHOTS}/w19-surge-menu.png`, (await pop.webContents.capturePage()).toPNG())
  }
  // change the accent: the logos and Surge's windows follow
  L.windows[0].win.focus()
  await ex(`api.do('setSetting', 'accent', '#e5487d')`); await wait(1200)
  const c2 = await stop(); LOG('    logo stop: ' + c1 + ' -> ' + c2)
  ok(c1 !== c2 && /rgb|oklch|color/.test(c2), 'the logos change with the accent color')
  if (pop) ok(/e5487d/i.test(await pop.webContents.executeJavaScript(`getComputedStyle(document.documentElement).getPropertyValue('--lumen-a')`)), "Surge's menu takes the new color straight away")
  fs.writeFileSync(`${SHOTS}/w19-toolbar-pink.png`, (await w.ui.webContents.capturePage({ x: 0, y: 0, width: 520, height: 96 })).toPNG())
  ok(await L.__appOpen('surge', 'settings'), 'Surge settings'); await wait(2500)
  const sw = BrowserWindow.getAllWindows().find(b => /surge.*settings\.html/.test(b.webContents.getURL()))
  if (sw) { sw.show(); await wait(1200)
    ok(await sw.webContents.executeJavaScript(`(() => { const e = document.createElement('i'); e.style.color = 'var(--accent)'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c })()`) === 'rgb(229, 72, 125)', 'Surge settings use the new accent')
    fs.writeFileSync(`${SHOTS}/w19-surge-settings-pink.png`, (await sw.webContents.capturePage()).toPNG()) } else ok(false, 'Surge settings window')

  // Settings page: logos and the toolbar switch
  const t = w.createTab('lumen://settings/apps', { active: true }); await wait(2200)
  const sq = x => t.view.webContents.executeJavaScript(x)
  ok(await sq(`document.querySelectorAll('.appicon svg.applogo').length`) === 2, 'Settings shows the new logos')
  fs.writeFileSync(`${SHOTS}/w19-settings.png`, (await t.view.webContents.capturePage()).toPNG())
  await sq(`(() => { const s = document.querySelector('[data-set=toolbarApps]'); s.checked = false; s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await wait(1000)
  ok(await ex(`document.getElementById('btn-surge').hidden && document.getElementById('btn-koi').hidden`), 'Show in the toolbar off hides them')
  await sq(`(() => { const s = document.querySelector('[data-set=toolbarApps]'); s.checked = true; s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await wait(1000)
  await sq(`(() => { const s = document.querySelector('[data-appsw=koi]'); s.checked = false; s.dispatchEvent(new Event('change', { bubbles: true })) })()`); await wait(1200)
  ok(await ex(`!document.getElementById('btn-surge').hidden && document.getElementById('btn-koi').hidden`), 'turning Koi off removes only its button')

  // tabs on the side: still fits
  await ex(`api.do('setSetting', 'tabLayout', 'side')`); await wait(1500)
  const side = await ex(`(() => { const n = document.querySelector('.navbtns').getBoundingClientRect(), sb = document.getElementById('sidebar').getBoundingClientRect(), k = document.getElementById('btn-surge').getBoundingClientRect(); return { r: k.right, w: sb.width, sbr: sb.right, inBottom: !!document.querySelector('.bottomrow #btn-surge') } })()`); LOG('    side ' + JSON.stringify(side))
  ok(side.r <= side.sbr + 1 && side.inBottom, 'with tabs on the side they sit with Settings, inside the sidebar')
  fs.writeFileSync(`${SHOTS}/w19-side.png`, (await w.ui.webContents.capturePage()).toPNG())
  await ex(`api.do('setSetting', 'tabLayout', 'top')`); await wait(1200)
  ok(await ex(`!!document.querySelector('.navbtns #btn-surge')`), 'and back next to Reload with tabs on top')

  ok(!errs.length, 'no crashes ' + errs.join(' | ').slice(0, 400))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
