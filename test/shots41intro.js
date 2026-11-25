// Lumen 4.1 intro screenshots: frames of the first-launch film and of the what's-new cut after an update, plus a
// frame-time readout for each (rAF gaps, so a long frame shows up as a hitch).
// Run: xvfb-run -a npx electron test/shots41intro.js --no-sandbox   (PNGs: /tmp/lumen-shots/41r-<TAG>-*.png, TAG=after by default)
const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-shots41i', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-shots41i')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
const OUT = '/tmp/lumen-shots'; fs.mkdirSync(OUT, { recursive: true }); const TAG = process.env.TAG || 'after'
const errors = []
app.on('web-contents-created', (e, wc) => wc.on('console-message', (a, b, c) => {
  const lvl = typeof a === 'object' && a && a.level !== undefined ? a.level : b, msg = typeof a === 'object' && a && a.message !== undefined ? a.message : c
  if ((lvl === 'error' || lvl === 3) && !/favicon|ERR_|net::|Failed to load resource/i.test(msg)) errors.push(String(msg).slice(0, 200))
}))
app.whenReady().then(async () => {
  let w = null; for (let i = 0; i < 60 && !(w = L.windows[0]); i++) await wait(100)
  const ui = w.ui.webContents, ex = s => ui.executeJavaScript(s)
  w.win.setContentSize(1280, 800)
  // frame-time recorder: every gap between animation frames while the film plays
  const rec = `window.__ft = []; (() => { let last = performance.now(); const f = t => { __ft.push(t - last); last = t; if (document.getElementById('intro')) requestAnimationFrame(f) }; requestAnimationFrame(f) })(); 1`
  const stats = async name => { const ft = (await ex(`window.__ft || []`)).slice(5); if (!ft.length) return; const s = [...ft].sort((a, b) => a - b); console.log(`frames ${name}: n=${ft.length} median ${s[s.length >> 1].toFixed(1)}ms p95 ${s[Math.floor(s.length * .95)].toFixed(1)}ms max ${s[s.length - 1].toFixed(1)}ms, over 50ms: ${ft.filter(x => x > 50).length}`) }
  const film = async (name, times) => {
    let t0 = Date.now()
    for (const [i, t] of times.entries()) {
      const dt = t - (Date.now() - t0); if (dt > 0) await wait(dt)
      const img = await ui.capturePage(); fs.writeFileSync(`${OUT}/41r-${TAG}-${name}-${String(i).padStart(2, '0')}.png`, img.toPNG()); console.log('shot', name, i, t)
    }
  }
  // first launch: the whole film
  for (let i = 0; i < 80 && !(await ex(`!!document.getElementById('intro')`).catch(() => false)); i++) await wait(100)
  await ex(rec)
  await film('intro', [900, 2200, 3400, 4400, 5600, 7200, 8600, 10200, 12500, 15000, 18000, 21000, 24000, 27000, 30000, 33000, 36000, 39000, 42000, 46000, 50000])
  await stats('first launch')
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  // after an update: the short cut with What is new
  await ex(`Intro.play({ whatsNew: '4.1.0' }); 1`); await ex(rec)
  await film('wn', [800, 2000, 3200, 4500, 6000, 7200, 8200, 9200, 10500, 12000, 14000, 16000, 18000, 20000])
  await stats('after an update')
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'NO ERRORS')
  app.exit(0)
})
