// Real-website checks for the translator, dark mode and Lumen AI. Needs internet access.
// Run: xvfb-run -a npx electron test/realsites.js --no-sandbox   (LUMEN_AI_KEY=... to also test a real AI reply)
const fs = require('fs'); const { app } = require('electron')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
fs.rmSync('/tmp/lumen-real', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-real')
require('http').createServer((q, r) => { r.setHeader('content-type', 'text/html; charset=utf-8'); r.end(AR) }).listen(48190)
const AR = `<!doctype html><html lang="ar" dir="rtl"><head><title>مدينة القاهرة</title></head><body style="font:16px sans-serif;max-width:760px;margin:30px auto"><main><h1>القاهرة</h1>
<p>القاهرة هي عاصمة جمهورية مصر العربية وأكبر مدنها، وتقع على ضفاف نهر النيل في شمال البلاد.</p>
<p>تعد القاهرة من أكبر المدن في أفريقيا والشرق الأوسط من حيث عدد السكان، وهي مركز ثقافي وتاريخي مهم.</p>
<ul><li>المتحف المصري</li><li>برج القاهرة</li><li>خان الخليلي</li></ul>
<p>يزور المدينة ملايين السياح كل عام لمشاهدة الأهرامات القريبة والمساجد القديمة والأسواق التقليدية.</p></main></body></html>`
const L = require('../src/main.js'); const wait = ms => new Promise(r => setTimeout(r, ms))
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const LUM = c => { const m = String(c).match(/[\d.]+/g); if (!m) return 255; const [r, g, b, a] = m.map(Number); return a === 0 ? null : (r * 299 + g * 587 + b * 114) / 1000 }

app.whenReady().then(async () => {
  await wait(4000); const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s)
  const errors = []; w.ui.webContents.on('console-message', e => { if (e.level === 'error' || e.level === 3) errors.push(e.message) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2500)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  const shot = async name => {   // the browser chrome and the page are separate views, so save both plus their offset
    fs.writeFileSync(`${SHOTS}/real-${name}-ui.png`, (await w.ui.webContents.capturePage()).toPNG())
    const t = w.tabs.get(w.activeId); if (t && t.view) { fs.writeFileSync(`${SHOTS}/real-${name}-page.png`, (await t.view.webContents.capturePage()).toPNG()); fs.writeFileSync(`${SHOTS}/real-${name}.json`, JSON.stringify(t.view.getBounds())) }
  }
  const open = async (url, ms = 7000) => {
    const t = w.createTab(url, { active: true })
    const wc = t.view.webContents
    await new Promise(r => { const to = setTimeout(r, 25000); wc.once('did-finish-load', () => { clearTimeout(to); r() }) })
    await wait(ms)
    return { t, wc, pg: s => wc.executeJavaScript(s) }
  }
  const trDone = async () => { for (let i = 0; i < 60; i++) { await wait(500); const s = await ex(`(() => { const c = document.getElementById('trcard'); return c.classList.contains('done') || !c.classList.contains('show') })()`); if (s) return true } return false }

  // ------------------------------------------------ translator
  L.D.settings.set({ translateTo: 'en', offerTranslate: true })
  {
    const { t, pg } = await open('https://nodejs.org/fr', 4000)
    const before = await pg(`document.querySelector('h1') ? document.querySelector('h1').innerText : ''`)
    ok(await ex(`document.getElementById('trask').classList.contains('show')`), 'French page: translate offer popup shows')
    ok(/French/.test(await ex(`document.getElementById('ta-sub').textContent`)), 'French page: detected as French: ' + await ex(`document.getElementById('ta-sub').textContent`))
    await shot('fr-offer')
    await ex(`document.getElementById('ta-yes').click()`)
    ok(await trDone(), 'French page: translation finished')
    const after = await pg(`document.querySelector('h1') ? document.querySelector('h1').innerText : ''`)
    console.log('   h1:', JSON.stringify(before), '->', JSON.stringify(after))
    ok(after && after !== before, 'French page: heading changed')
    ok(await pg(`document.documentElement.lang`) === 'en', 'French page: lang now en')
    ok(await pg(`document.documentElement.scrollWidth <= innerWidth + 2`), 'French page: no sideways overflow after translating')
    await wait(1500); await shot('fr-done')
    await ex(`api.do('translate')`); await wait(1000)
    ok(await pg(`document.querySelector('h1') ? document.querySelector('h1').innerText : ''`) === before, 'French page: Show original restores text')
    w.closeTab(t.id); await wait(600)
  }
  {
    L.D.settings.set({ offerTranslate: false })
    const { t, pg } = await open('http://127.0.0.1:48190/ar', 2000)
    ok(await pg(`getComputedStyle(document.body).direction`) === 'rtl', 'Arabic page: starts right-to-left')
    await ex(`api.do('translate')`)
    ok(await trDone(), 'Arabic page: translation finished')
    ok(await pg(`getComputedStyle(document.body).direction`) === 'ltr', 'Arabic page: flipped to left-to-right')
    const latin = await pg(`(() => { const s = (document.querySelector('main') || document.body).innerText; const a = (s.match(/[A-Za-z]/g) || []).length, p = (s.match(/[\\u0600-\\u06FF]/g) || []).length; return a / (a + p + 1) })()`)
    ok(latin > 0.8, 'Arabic page: text is now mostly English ' + latin.toFixed(2))
    ok(await pg(`document.documentElement.scrollWidth <= innerWidth + 2`), 'Arabic page: no sideways overflow after flip')
    await wait(1500); await shot('fa-done')
    await ex(`api.do('translate')`); await wait(1000)
    ok(await pg(`getComputedStyle(document.body).direction`) === 'rtl', 'Arabic page: Show original goes back to right-to-left')
    w.closeTab(t.id); await wait(600)
  }
  {
    const { t, pg } = await open('https://nodejs.org/ja')
    await ex(`api.do('translate')`)
    ok(await trDone(), 'Japanese page: translation finished')
    const jp = await pg(`((document.querySelector('main') || document.body).innerText.match(/[\\u3040-\\u30FF\\u4E00-\\u9FFF]/g) || []).length`)
    ok(jp < 60, 'Japanese page: little Japanese left (' + jp + ' chars)')
    await wait(1500); await shot('ja-done')
    w.closeTab(t.id); await wait(600)
  }

  // ------------------------------------------------ dark mode
  await ex(`api.do('setSetting','forceDark',true)`)
  for (const url of ['https://nodejs.org/en', 'https://rubygems.org/', 'https://pkg.go.dev/net/http', 'https://www.nuget.org/', 'https://pub.dev/']) {
    const { t, pg } = await open(url, 6000)
    const host = new URL(url).host
    const r = await pg(`(() => {
      const bodyBg = getComputedStyle(document.body).backgroundColor, htmlBg = getComputedStyle(document.documentElement).backgroundColor
      // sample what is actually painted at a few points of the viewport
      const pts = [[0.5, 0.15], [0.5, 0.5], [0.2, 0.7], [0.8, 0.85], [0.5, 0.95]]
      const paint = pts.map(([x, y]) => { let e = document.elementFromPoint(innerWidth * x, innerHeight * y); while (e) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\\(.*, 0\\)$|transparent/.test(c)) return c; e = e.parentElement } return htmlBg })
      // text that is dark-on-dark would be unreadable
      const texts = [...document.querySelectorAll('p, a, h1, h2, h3, li, span')].filter(e => e.offsetParent && e.innerText && e.innerText.trim().length > 3).slice(0, 200).map(e => getComputedStyle(e).color)
      return { dr: !!document.querySelector('style.darkreader'), bodyBg, htmlBg, paint, texts }
    })()`)
    const lums = r.paint.map(LUM).filter(x => x != null)
    const darkPts = lums.filter(x => x < 90).length
    const dimText = r.texts.map(LUM).filter(x => x != null && x < 90).length
    console.log(`   ${host}: darkreader=${r.dr} painted=${lums.map(x => Math.round(x)).join(',')} dimText=${dimText}/${r.texts.length}`)
    ok(r.dr && darkPts >= 4, `Dark mode on ${host}: page painted dark`)
    ok(dimText <= Math.max(2, r.texts.length * 0.05), `Dark mode on ${host}: text stays readable (${dimText} dim)`)
    await shot('dark-' + host.replace(/\W/g, '_'))
    w.closeTab(t.id); await wait(600)
  }
  // a site switch made from the site menu sticks
  {
    const { t, pg } = await open('https://rubygems.org/', 5000)
    await ex(`api.do('siteDark', false)`); await wait(1000)
    ok(!(await pg(`!!document.querySelector('style.darkreader')`)), 'Dark mode off for one real site works live')
    await ex(`api.do('siteDark', true)`); await wait(1500)
    ok(await pg(`!!document.querySelector('style.darkreader')`), 'and back on')
    w.closeTab(t.id); await wait(600)
  }
  await ex(`api.do('setSetting','forceDark',false)`)

  // ------------------------------------------------ Lumen AI
  {
    const { t } = await open('https://pkg.go.dev/net/http', 3000)
    const info = await ex(`api.do('aiStatus')`)
    ok(info.title && /http/i.test(info.title), 'AI: sees the real page title: ' + info.title)
    require('../src/ai').setKey(process.env.LUMEN_AI_KEY || 'sk-ant-api03-not-a-real-key')
    await ex(`openAI()`); await wait(800)
    await ex(`aiRun('summarize')`)
    let res = ''
    for (let i = 0; i < 80; i++) { await wait(500); res = await ex(`(() => { const m = [...document.querySelectorAll('#aipanel .ai-msg.bot')].pop(); return m && !document.getElementById('aipanel').classList.contains('busy') ? (m.classList.contains('err') ? 'ERR ' : 'OK ') + m.innerText : '' })()`); if (res) break }
    console.log('   AI answer:', res.slice(0, 300).replace(/\n/g, ' '))
    if (process.env.LUMEN_AI_KEY) ok(/^OK /.test(res) && res.length > 80, 'AI: real summary came back from the Claude API')
    else ok(/^ERR (That API key was not accepted|Could not reach the AI service)/.test(res), 'AI: a bad key or no connection gives a clear message, no raw error code')
    await shot('ai')
    await ex(`closeAI()`); w.closeTab(t.id)
  }

  ok(!errors.length, 'no UI errors ' + errors.join(' | '))
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS'); app.exit(fails ? 1 : 0)
})
