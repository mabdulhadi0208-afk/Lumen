// YouTube videos keep playing: the ad blocker's filter lists refresh (they expire every 8 hours), a stuck video gets
// fresh lists and one reload, and if it is still stuck Lumen offers to pause the blocker on YouTube.
const fs = require('fs'); const { app, session, net } = require('electron')
fs.rmSync('/tmp/lumen-yt', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-yt')
fs.mkdirSync('/tmp/lumen-yt', { recursive: true }); fs.writeFileSync('/tmp/lumen-yt/settings.json', JSON.stringify({ introSeen: true, whatsNewSeen: '9', parcelsAuto: false }))
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const L = require('../src/main.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync('/tmp/lumen-ytfix.log', m + '\n') } catch {} }; const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))
let CACHE = '/tmp/lumen-yt/adblock-engine-full.bin'   // cookie-banner hiding is on by default, so the full lists
app.whenReady().then(async () => {
  // a stand-in for youtube.com: a watch page whose player never gets any video
  const ses = session.fromPartition('persist:lumen'); let loads = 0, mode = 'stuck'
  ses.protocol.handle('https', req => {
    const u = new URL(req.url)
    if (u.hostname === 'www.youtube.com') { if (u.pathname === '/watch') loads++; return new Response(`<!doctype html><title>YouTube</title><div id="movie_player">${mode === 'error' ? '<div class="ytp-error" style="display:block;width:200px;height:50px">An error occurred</div>' : ''}<video width="640" height="360"></video></div>`, { headers: { 'content-type': 'text/html' } }) }
    return net.fetch(req, { bypassCustomProtocolHandlers: true })
  })
  if (L.D.settings.get('hideCookieBanners') === false) CACHE = '/tmp/lumen-yt/adblock-engine.bin'
  for (let i = 0; i < 60 && !fs.existsSync(CACHE); i++) await wait(1000)
  ok(fs.existsSync(CACHE), 'ad-block lists downloaded and saved')
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)

  // lists older than 8 hours get refreshed, and the new ones are used
  const old = (Date.now() - 9 * 3600e3) / 1000; fs.utimesSync(CACHE, old, old)
  ok(L.__adblockAge() > 8 * 3600e3, 'lists look 9 hours old')
  const t0 = Date.now(); const r = await L.__refreshAdblock()
  LOG('    refresh took ' + (Date.now() - t0) + ' ms')
  ok(r === true && L.__adblockAge() < 60e3 && !fs.existsSync(CACHE + '.new'), 'stale lists are replaced with fresh ones')
  ok(L.D.settings.get('adblockUpdatedAt') > t0 - 1000, 'and Lumen remembers when')
  ok(await L.__refreshAdblock() === false, 'fresh lists are not fetched again for nothing')
  const t = w.createTab('https://example.com/', { active: true }); await wait(2500)
  ok(await t.view.webContents.executeJavaScript(`fetch('https://googleads.g.doubleclick.net/pagead/id').then(() => 'loaded', () => 'blocked')`) === 'blocked', 'the fresh lists block ads')

  // a stuck video: fresh lists and one reload
  const y = w.createTab('https://www.youtube.com/watch?v=lumen', { active: true }); await wait(1500)
  const loads0 = loads
  for (let i = 0; i < 40 && loads === loads0; i++) await wait(1000)
  ok(loads === loads0 + 1, 'a video that never starts is reloaded once (after ' + loads + ' loads)')
  await wait(400)
  ok(/stuck, so Lumen got fresh ad-block lists/.test(await ex(`document.getElementById('toast').textContent`)), 'with a note saying why')
  // still stuck: offer to pause the blocker there (the error overlay is caught in seconds)
  mode = 'error'; y.view.webContents.reload(); await wait(9000)
  const offer = await ex(`(() => { const b = document.querySelector('.toast-btn'); return b ? b.textContent + ' | ' + b.parentElement.textContent : '' })()`)
  LOG('    ' + offer)
  ok(/Pause ad blocker here/.test(offer) && /still stuck/i.test(offer), 'still stuck: Lumen offers to pause the ad blocker on YouTube')
  fs.writeFileSync(`${SHOTS}/yt-offer.png`, (await w.ui.webContents.capturePage()).toPNG())
  await ex(`document.querySelector('.toast-btn').click()`); await wait(1500)
  ok((L.D.settings.get('adblockAllow') || []).includes('youtube.com'), 'one click pauses it for youtube.com only')

  // Settings shows how fresh the lists are, and Update now works
  const s = w.createTab('lumen://settings/privacy', { active: true }); await wait(2200)
  const sq = x => s.view.webContents.executeJavaScript(x)
  ok(/Updated (just now|1 minute ago|\d+ minutes ago)/.test(await sq(`document.getElementById('abl-when').textContent`)), 'Settings: Filter lists, Updated just now')
  await sq(`document.getElementById('abl-go').click()`); await wait(300)
  ok(await sq(`document.getElementById('abl-go').classList.contains('busy')`), 'Update now spins while it works')
  for (let i = 0; i < 60 && await sq(`document.getElementById('abl-go').classList.contains('busy')`); i++) await wait(1000)
  ok(await sq(`document.getElementById('abl-go').textContent`) === 'Up to date', 'and says Up to date')
  fs.writeFileSync(`${SHOTS}/yt-settings.png`, (await s.view.webContents.capturePage()).toPNG())
  ok(!errs.length, 'no crashes ' + errs.join(' | ').slice(0, 400))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
