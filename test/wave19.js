// 1.19: a first-launch intro without the what's-new act (that one is only for people who update).
// (The Surge and Koi toolbar checks were retired in 4.0: they are separate apps again, see test/noapps.js.)
const fs = require('fs'); const { app, BrowserWindow } = require('electron')
fs.rmSync('/tmp/lumen-w19', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-w19')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js')
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

  ok(await ex(`!document.getElementById('btn-surge') && !document.getElementById('btn-koi')`), 'no Surge or Koi buttons in the toolbar')

  ok(!errs.length, 'no crashes ' + errs.join(' | ').slice(0, 400))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
