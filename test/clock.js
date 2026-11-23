const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-clk', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-clk')
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1500)
  const wc = w.active().view.webContents
  const info = () => wc.executeJavaScript(`JSON.stringify([...document.querySelectorAll('#clock .jl')].map(s => { const r = s.getBoundingClientRect(); return [s.textContent, Math.round(r.left), Math.round(r.width), s.style.transform.slice(0, 40), s.style.backgroundPosition] }))`)
  console.log('BEFORE', await info())
  const r = JSON.parse(await wc.executeJavaScript(`JSON.stringify(document.querySelector('#clock').getBoundingClientRect())`))
  const shot = async n => fs.writeFileSync('/tmp/lumen-shots/clock-' + n + '.png', (await wc.capturePage({ x: Math.round(r.x - 60), y: Math.round(r.y - 30), width: Math.round(r.width + 120), height: Math.round(r.height + 60) })).toPNG())
  await shot('before')
  for (let x = r.x + 5; x < r.x + r.width; x += 12) { wc.sendInputEvent({ type: 'mouseMove', x: Math.round(x), y: Math.round(r.y + r.height / 2) }); await wait(30) }
  await wait(120); await shot('during'); console.log('DURING', await info())
  await wait(1500); await shot('after'); console.log('AFTER', await info())
  app.exit(0)
})
