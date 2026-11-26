// 4.4.7: every page title in Settings and the library pages fits its banner. Before, a long one-word title like
// "Appearance" broke in the middle ("Appearanc / e") at some window widths. Now titles never break inside a word:
// the size eases down with the space, and a title of several words wraps between words.
// Run: xvfb-run -a npx electron test/heading447.js --no-sandbox   (log: /tmp/lumen-heading447.log)
const fs = require('fs'); const { app } = require('electron')
fs.rmSync('/tmp/lumen-heading447', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-heading447')
const LOG = '/tmp/lumen-heading447.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const L = require('../src/main.js')

app.whenReady().then(async () => {
  await wait(3500)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .no') && document.querySelector('#intro .no').click()`); await wait(800)
  const t = w.createTab('lumen://settings', { active: true }); await wait(2500)
  const px = s => t.view.webContents.executeJavaScript(s)
  const sections = await px(`[...document.querySelectorAll('.nav a[data-s], .nav a')].map(a => a.textContent.trim()).filter(Boolean)`)
  ok(sections.length >= 10, 'Settings lists its sections: ' + sections.length)
  // how the title sits: does any line break land inside a word, and does it stay inside the banner?
  const measure = `(() => {
    const h = document.querySelector('.main .hero h2'), hero = document.querySelector('.main .hero'); if (!h || !hero) return null
    const r = document.createRange(), node = [...h.childNodes].find(n => n.nodeType === 3) || h.firstChild
    const text = h.textContent, tops = []
    // every visible character with its place in the whole title; a new line that starts right after a letter, with
    // no space in between, is a break inside a word
    let at = 0
    const walk = n => { if (n.nodeType === 3) { for (let i = 0; i < n.length; i++) { r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getBoundingClientRect(); if (b.width && /\\S/.test(n.data[i])) tops.push([at + i, Math.round(b.top)]) } at += n.length } else n.childNodes.forEach(walk) }
    walk(h)
    let midWord = false
    for (let i = 1; i < tops.length; i++) if (tops[i][1] > tops[i - 1][1] + 4 && !/\\s/.test(text.slice(tops[i - 1][0] + 1, tops[i][0]))) midWord = true
    const hb = h.getBoundingClientRect(), rb = hero.getBoundingClientRect()
    return { text, midWord, inside: hb.right <= rb.right + 1 && hb.left >= rb.left - 1, scroll: h.scrollWidth <= h.clientWidth + 1, size: parseFloat(getComputedStyle(h).fontSize) }
  })()`
  for (const [W, H] of [[1264, 730], [1100, 760], [900, 700], [760, 640]]) {
    w.win.setContentSize(W, H); await wait(700)
    const bad = []
    for (const s of sections) {
      await px(`[...document.querySelectorAll('.nav a')].find(a => a.textContent.trim() === ${JSON.stringify(s)}).click()`); await wait(450)
      const m = await px(measure)
      if (!m) continue
      if (m.midWord || !m.inside || !m.scroll) bad.push(`${m.text} (${m.size}px${m.midWord ? ', broke inside a word' : ''}${m.inside ? '' : ', spills out'})`)
    }
    ok(!bad.length, `at ${W} wide every Settings title fits without breaking a word` + (bad.length ? ': ' + bad.join('; ') : ''))
  }
  // big screens keep the big title
  w.win.setContentSize(1440, 900); await wait(700)
  await px(`[...document.querySelectorAll('.nav a')].find(a => a.textContent.trim() === 'Appearance').click()`); await wait(500)
  const big = await px(measure)
  ok(big && big.size >= 40 && !big.midWord, 'on a wide window Appearance keeps its big title: ' + (big && big.size) + 'px')
  try { fs.mkdirSync('/tmp/lumen-shots', { recursive: true }); w.win.setContentSize(1264, 730); await wait(600); fs.writeFileSync('/tmp/lumen-shots/heading447.png', (await t.view.webContents.capturePage()).toPNG()) } catch {}
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); app.exit(fails ? 1 : 0)
})
