// Lumen's bits inside web pages (password autofill, passkey autofill, swipe bead, video speed badge, translate bubble)
// and Reader mode: over light and dark sites, light and dark Lumen. Takes screenshots of each one into
// /tmp/lumen-shots/40-inpage-<INPAGE_PHASE or after>-*.png and checks they work, stay private and sit still at idle.
process.env.LUMEN_NATIVE_MENUS = '1'
const fs = require('fs'), http = require('http'), path = require('path')
const { app, dialog, nativeTheme } = require('electron')
fs.rmSync('/tmp/lumen-inpage', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-inpage')
dialog.showMessageBox = async () => ({ response: 0 })
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const PHASE = process.env.INPAGE_PHASE || 'after'
const L = require('../src/main.js')
const Tr = require('../src/translate.js')
const wait = ms => new Promise(r => setTimeout(r, ms))
const LOGF = '/tmp/lumen-inpage.log'; try { fs.unlinkSync(LOGF) } catch {}
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync(LOGF, m + '\n') } catch {} }
const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))

const SITE = {
  light: 'body{margin:0;font:17px/1.6 Georgia,serif;color:#1b1d24;background:#fff}header{padding:18px 40px;background:linear-gradient(90deg,#ffe9d6,#e3f0ff);font:700 20px system-ui}main{padding:30px 40px}input{font:16px system-ui;padding:10px 12px;width:320px;border:1px solid #c8ccd6;border-radius:8px;background:#fff;color:#111}',
  dark: 'body{margin:0;font:17px/1.6 Georgia,serif;color:#d8dbe6;background:#0e1015}header{padding:18px 40px;background:linear-gradient(90deg,#1d1330,#0d2233);font:700 20px system-ui;color:#fff}main{padding:30px 40px}input{font:16px system-ui;padding:10px 12px;width:320px;border:1px solid #333847;border-radius:8px;background:#171a22;color:#eee}',
}
const page = (k, title, body) => `<!doctype html><title>${title}</title><meta name=color-scheme content="${k}"><style>${SITE[k]}</style><header>${k === 'dark' ? 'Nightfall Journal' : 'Morning Gazette'}</header><main>${body}</main>`
const LOGIN = k => page(k, 'Sign in', '<h2>Sign in</h2><form><p><input name=email placeholder=Email></p><p><input type=password name=password placeholder=Password></p><button>Sign in</button></form><p>Some words below the form so the glass has something to bend over. The quick brown fox jumps over the lazy dog, again and again, in every colour.</p>')
const PK = k => page(k, 'Passkey', '<h2>Welcome back</h2><p><input id=u autocomplete="username webauthn" placeholder="Email or username"></p><p>Use a passkey to sign in without a password. The quick brown fox jumps over the lazy dog.</p>')
const PARA = i => `<p>Paragraph ${i}. Glass has always been a material of light, bending what lies behind it, catching the sun at its edges and throwing small rainbows across a table. Makers learned to read its moods, the way it slumps and gathers, the way a rim holds a thread of colour that the middle never shows, and so on for a while longer.</p>`
const PIC = (h1, h2) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1},80%,62%)"/><stop offset="1" stop-color="hsl(${h2},75%,45%)"/></linearGradient></defs><rect width="1200" height="600" fill="url(#g)"/><circle cx="860" cy="220" r="150" fill="rgba(255,255,255,.35)"/><circle cx="300" cy="420" r="90" fill="rgba(255,255,255,.2)"/></svg>`
const SIGNUP = k => page(k, 'Create account', '<h2>Create your account</h2><form><p><input name=email placeholder=Email></p><p><input type=password name=pw autocomplete=new-password placeholder="New password"></p><p><input type=password name=pw2 autocomplete=new-password placeholder="Repeat password"></p><button>Create account</button></form>')
const ARTICLE = k => page(k, 'The quiet art of glass', '<article><h1>The quiet art of glass</h1><img src="/pic1.svg" style="width:720px;height:360px;display:block">' + ['Where it begins', 'The furnace', 'Reading the rim', 'Colour and light', 'What lasts'].map((h, j) => `<h2>${h}</h2>` + Array.from({ length: 5 }, (_, i) => PARA(j * 5 + i + 1)).join('') + (j === 1 ? '<figure><img src="/pic2.svg" style="width:600px"><figcaption>Glass in the furnace</figcaption></figure>' : '') + (j === 2 ? '<blockquote>The rim is where glass tells the truth about light.</blockquote>' : '')).join('') + '</article><aside>Related: nothing</aside>')
const VIDEO = k => page(k, 'Video', '<video id=v muted autoplay style="width:720px;height:405px;display:block;background:#333;border-radius:12px"></video><p>A short clip about glass.</p><canvas id=c width=320 height=180 hidden></canvas><script>const c=document.getElementById("c"),x=c.getContext("2d");let h=0;const g=x.createLinearGradient(0,0,320,180);g.addColorStop(0,"hsl(20,80%,60%)");g.addColorStop(1,"hsl(200,80%,50%)");x.fillStyle=g;x.fillRect(0,0,320,180);setInterval(()=>{x.fillRect(0,0,1,1)},200);document.getElementById("v").srcObject=c.captureStream(5)</script>')
const SPY = '<script>window.__seen=[];new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>__seen.push(n.nodeName+":"+(n.textContent||"").slice(0,40))))).observe(document.documentElement,{childList:true,subtree:true})</script>'
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/translate_a/')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(['Le verre a toujours ete une matiere de lumiere, qui plie ce qui se trouve derriere lui et attrape le soleil sur ses bords.'])); return }
  if (/^\/pic[12]\.svg/.test(req.url)) { res.writeHead(200, { 'content-type': 'image/svg+xml' }); res.end(req.url.includes('1') ? PIC(25, 300) : PIC(190, 260)); return }
  const m = req.url.match(/^\/(login|pk|article|video|signup)-(light|dark)/)
  if (!m) { res.writeHead(404); res.end(); return }
  const fn = { login: LOGIN, pk: PK, article: ARTICLE, video: VIDEO, signup: SIGNUP }[m[1]]
  res.writeHead(200, { 'content-type': 'text/html' }); res.end(fn(m[2]) + SPY)
}).listen(0, '127.0.0.1')

async function shot(wc, name) {
  try {
    const img = await wc.capturePage()
    const f = `${SHOTS}/40-inpage-${PHASE}-${name}.png`
    fs.writeFileSync(f, img.toPNG()); LOG('    shot ' + f)
  } catch (e) { LOG('    shot failed ' + name + ': ' + e.message) }
}
const key = (wc, keyCode, modifiers = []) => { wc.sendInputEvent({ type: 'keyDown', keyCode, modifiers }); if (keyCode.length === 1) wc.sendInputEvent({ type: 'char', keyCode, modifiers }); wc.sendInputEvent({ type: 'keyUp', keyCode, modifiers }) }
const anims = wc => wc.executeJavaScript(`document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.constructor.name) + ':' + (a.effect && a.effect.getTiming().iterations)).join(',')`).catch(e => 'err ' + e.message)

app.whenReady().then(() => main().catch(e => { LOG('FAIL test crashed: ' + (e && e.stack || e)); app.exit(1) }))
async function main() {
  await wait(5000)
  const w = L.windows[0], ex = s => w.ui.webContents.executeJavaScript(s).catch(() => {})
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2000)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(1000)
  w.win.setContentSize(1280, 820); await wait(500)
  const base = `http://127.0.0.1:${server.address().port}`
  process.env.LUMEN_TR_API = base
  L.D.savePassword(base, 'alice@example.com', 'pw-one-123'); L.D.savePassword(base, 'bob@work.example', 'pw-two-456'); L.D.savePassword(base, 'carol.longname@company.example', 'pw-3')
  const pkBase = base.replace('127.0.0.1', 'localhost')
  const t = w.createTab(pkBase + '/pk-light', { active: true }); await wait(2500)
  const wc = t.view.webContents
  const js = s => wc.executeJavaScript(s).catch(e => ({ error: e.message }))
  const go = async (u, b = base) => { await wc.loadURL(b + u); await wait(1400) }
  // two passkeys for the passkey menu
  const reg = n => js(`navigator.credentials.create({ publicKey: { rp: { name: 'T' }, user: { id: new TextEncoder().encode('${n}'), name: '${n}@example.com', displayName: '${n}' }, challenge: new Uint8Array(32), pubKeyCredParams: [{ type: 'public-key', alg: -7 }] } }).then(c => c.id)`)
  await reg('ada'); await reg('lin')

  for (const theme of ['light', 'dark', 'cross']) {
    const site = theme === 'cross' ? 'dark' : theme, sfx = theme === 'cross' ? 'darksite-lightlumen' : theme
    nativeTheme.themeSource = theme === 'cross' ? 'light' : theme; await wait(600)
    // password autofill
    await go('/login-' + site)
    await js(`document.querySelector('input[type=password]').focus()`); await wait(900)
    await shot(wc, 'autofill-' + sfx)
    if (theme === 'light') {
      ok(await js(`document.activeElement === document.querySelector('input[type=password]')`), 'the dropdown does not steal focus from the field')
      key(wc, 'Down'); await wait(120); await shot(wc, 'autofill-chosen-' + sfx)
      key(wc, 'Down'); await wait(100); key(wc, 'Return'); await wait(500)
      ok(await js(`document.querySelector('input[type=password]').value === 'pw-two-456' && document.querySelector('input[name=email]').value === 'bob@work.example'`), 'autofill: arrows and Enter fill the second account')
      ok(await js(`!__seen.some(s => /alice|bob|carol|Lumen Passwords/i.test(s))`), 'the page never sees the saved account names')
    }
        // strong password on a sign-up form
    await go('/signup-' + site)
    await js(`document.querySelector('input[name=pw]').focus()`); await wait(900)
    key(wc, 'Down'); await wait(150)
    await shot(wc, 'strongpw-' + sfx)
    if (theme === 'light') {
      key(wc, 'Return'); await wait(400)
      ok(await js(`(() => { const a = document.querySelector('input[name=pw]').value, b = document.querySelector('input[name=pw2]').value; return a.length === 20 && a === b && /[A-Z]/.test(a) && /\\d/.test(a) })()`), 'sign-up forms get a strong password in both fields')
      ok(await js(`!__seen.some(s => /[a-zA-Z0-9]{6}-[a-zA-Z0-9]{6}-/.test(s))`), 'the page never saw the suggested password before it was picked')
    }
    // passkey autofill
    if (theme !== 'cross') {
      await go('/pk-' + site, pkBase)
      await js(`navigator.credentials.get({ mediation: 'conditional', publicKey: { challenge: new Uint8Array(32) } }).then(() => 0, () => 0); 1`); await wait(300)
      await js(`(() => { const el = document.getElementById('u'); el.focus(); el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); return 1 })()`); await wait(900)
      await shot(wc, 'passkey-' + sfx)
      if (theme === 'light') ok(await js(`document.documentElement.lastElementChild.tagName === 'DIV'`), 'the passkey menu shows')
      key(wc, 'Escape'); await wait(300)
    }
    // translate bubble
    await go('/article-' + site)
    await js(`(() => { const r = document.createRange(); r.selectNodeContents(document.querySelectorAll('p')[1]); getSelection().removeAllRanges(); getSelection().addRange(r) })()`)
    await Tr.bubble(wc, 'Glass has always been a material of light', 'fr', { accent: L.D.settings.get('accent'), dark: nativeTheme.shouldUseDarkColors, motion: 'jelly' }).catch(e => LOG('bubble failed ' + e.message))
    await wait(1400)
    await shot(wc, 'translate-' + sfx)
    if (theme === 'light') {
      ok(await js(`!!document.getElementById('__lumen_tr_bubble')`), 'the translate bubble shows')
      ok(await js(`!__seen.some(s => /lumiere/i.test(s))`), 'the page cannot read the translation')
      const a = await anims(wc); ok(!/infinity|Infinity/.test(a), 'nothing loops forever with the bubble open: ' + (a || 'none'))
    }
    key(wc, 'Escape'); await wait(300)
    // video speed badge
    await go('/video-' + site); await wait(800)
    await js(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '>', shiftKey: true, bubbles: true }))`); await wait(120)
    await js(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '>', shiftKey: true, bubbles: true }))`); await wait(500)
    await shot(wc, 'speed-' + sfx)
    if (theme === 'light') ok(await js(`!!document.getElementById('__lumen_speed') || document.documentElement.lastElementChild.tagName === 'DIV'`), 'video speed keys show the speed badge')
    // swipe bead
    await js(`(() => { dispatchEvent(new WheelEvent('wheel', { deltaX: -120 })); window.__sw = setInterval(() => dispatchEvent(new WheelEvent('wheel', { deltaX: -1 })), 40) })()`); await wait(200)
    await shot(wc, 'swipe-' + sfx)
    await js(`dispatchEvent(new WheelEvent('wheel', { deltaX: -120 }))`); await wait(450)
    await shot(wc, 'swipe-go-' + sfx)
    await js(`clearInterval(window.__sw)`); await wait(500)
    // reader
    if (theme !== 'cross') {
      await go('/article-' + site)
      if (L.__readerMode) L.__readerMode(wc)
      else { const acc = L.D.settings.get('accent') || '#5b8cff'; await js(fs.readFileSync(path.join(__dirname, '../src/reader.js'), 'utf8').replace('__LUMEN_ACCENT__', acc).replace('__LUMEN_MOTION__', 'jelly')) }
      await wait(1800)
      await shot(wc, 'reader-' + sfx)
      if (theme === 'light') {
        ok(await js(`document.documentElement.dataset.lumenReader === '1' && !!document.querySelector('.lr-hero h1.t')`), 'Reader Mode opens in its Nova layout')
        ok(await js(`!!document.querySelector('.lr-tools .sm') && !!document.querySelector('.lr-tools .lg') && !!document.querySelector('.lr-tools .ex')`), 'Reader keeps A-, A+ and Exit')
      }
      await js(`scrollTo(0, document.documentElement.scrollHeight * .35)`); await wait(900)
      await shot(wc, 'reader-scrolled-' + sfx)
      const hasAa = await js(`!!document.querySelector('.lr-tools .aa')`)
      if (hasAa === true) {
        await js(`document.querySelector('.lr-tools .aa').click()`); await wait(900)
        await shot(wc, 'reader-type-' + sfx)
        if (theme === 'light') {
          await js(`document.querySelector('.lr-panel [data-theme=sepia]').click()`); await wait(700)
          await shot(wc, 'reader-sepia')
          ok(await js(`document.documentElement.dataset.lrTheme === 'sepia'`), 'Reader sepia theme')
          await js(`document.querySelector('.lr-panel [data-width=wide]').click(); document.querySelector('.lr-panel [data-font=sans]').click()`); await wait(700)
          ok(await js(`getComputedStyle(document.querySelector('.lr')).maxWidth !== '700px'`), 'Reader width changes')
          await js(`document.querySelector('.lr-panel [data-theme=auto]').click(); document.querySelector('.lr-panel [data-width=medium]').click(); document.querySelector('.lr-panel [data-font=serif]').click()`); await wait(300)
        }
        key(wc, 'Escape'); await wait(500)
        await js(`document.querySelector('.lr-tools .toc') && document.querySelector('.lr-tools .toc').click()`); await wait(900)
        await shot(wc, 'reader-toc-' + sfx)
        if (theme === 'light') {
          ok(await js(`document.querySelectorAll('.lr-tocp a').length === 5`), 'Reader lists the 5 sections')
          ok(/left/.test(await js(`document.querySelector('.lr-left') ? document.querySelector('.lr-left').textContent : ''`)), 'Reader shows the time left')
        }
        key(wc, 'Escape'); await wait(400)
        if (theme === 'light') {
          const y0 = await js('scrollY'); key(wc, ']'); await wait(1200)
          ok((await js('scrollY')) > y0, 'the ] key goes to the next section')
          key(wc, 'f'); await wait(800)
          await shot(wc, 'reader-focus-light')
          ok(await js(`document.documentElement.classList.contains('lr-focus') && !!document.querySelector('.lr-cur')`), 'Focus dims all but the paragraph being read')
          key(wc, 'f'); await wait(300)
          await js(`document.querySelector('.lr-body figure img') && document.querySelector('.lr-body figure img').click()`); await wait(900)
          await shot(wc, 'reader-picture-light')
          ok(await js(`!!document.querySelector('.lr-lb')`), 'pictures open big')
          key(wc, 'Escape'); await wait(300)
          ok(await js(`!document.querySelector('.lr-lb')`), 'Esc closes the picture')
          await js(`scrollTo(0, document.documentElement.scrollHeight)`); await wait(900)
          await shot(wc, 'reader-end-light')
          await js(`scrollTo(0, 0)`); await wait(600)
          await shot(wc, 'reader-top-light')
          ok(await js(`!!document.querySelector('.lr-cover img')`), 'the lead picture becomes the cover')
          await js(`document.querySelectorAll('.lr-body p')[2].scrollIntoView({ block: 'center' })`); await wait(600)
          await js(`(() => { const p = document.querySelectorAll('.lr-body p')[2]; const r = document.createRange(); r.setStart(p.firstChild, 13); r.setEnd(p.firstChild, 70); getSelection().removeAllRanges(); getSelection().addRange(r); document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })()`); await wait(700)
          await shot(wc, 'reader-select-light')
          ok(await js(`!!document.querySelector('.lr-sel')`), 'selecting text offers Highlight, Copy and Read')
          await js(`document.querySelector('.lr-sel .hl').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))`); await wait(700)
          ok(await js(`document.querySelectorAll('mark.lr-hl').length === 1 && /Copy 1 highlight/.test(document.querySelector('.lr-end .hls').textContent)`), 'Highlight marks the text and the end card can copy it')
          await shot(wc, 'reader-highlight-light')
          await js(`scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .5)`); await wait(2200)
          await js(`location.reload()`); await wait(1800)
          L.__readerMode(wc); await wait(2000)
          ok(await js(`!!document.querySelector('.lr-resume')`), 'Reader offers to pick up where you left off')
          await shot(wc, 'reader-resume-light')
          await js(`document.querySelector('.lr-resume .go').click()`); await wait(1200)
          ok((await js(`scrollY / (document.documentElement.scrollHeight - innerHeight)`)) > 0.4, 'Continue goes back to the same place')
          await js(`scrollTo(0, 0)`); await wait(300)
          w.win.setContentSize(900, 820); await wait(900)
          await shot(wc, 'reader-900-light')
          w.win.setContentSize(1280, 820); await wait(600)
        }
      }
      if (theme === 'light') {
        await wait(10000)
        const a = await anims(wc); ok(!a, 'Reader sits still at idle: ' + (a || 'no running animations'))
        const m = app.getAppMetrics().find(p => p.pid === wc.getOSProcessId())
        await wait(3000)
        const m2 = app.getAppMetrics().find(p => p.pid === wc.getOSProcessId())
        LOG('    reader tab idle CPU ' + (m2 ? m2.cpu.percentCPUUsage.toFixed(2) : '?') + '%')
      }
    }
  }
  // a page that never uses any of this gets nothing
  nativeTheme.themeSource = 'light'
  await go('/article-light')
  ok(await js(`document.documentElement.lastElementChild.tagName === 'BODY' && !document.querySelector('[id^=__lumen]')`), 'a plain page gets no Lumen elements')
  ok(await js(`document.getAnimations().length === 0`), 'and no animations')
  ok(!errs.length, 'no errors' + (errs.length ? ': ' + errs[0].slice(0, 300) : ''))
  LOG(fails ? `${fails} FAILED` : 'ALL PASS'); server.close(); app.exit(fails ? 1 : 0)
}
