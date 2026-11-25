// 4.1 leftovers sweep: site permission prompts, the translate ask bubble and the translating card, the video speed badge,
// the swipe bead, the print error dialog and the Dock / jump list templates. Takes screenshots into
// /tmp/lumen-shots/41-sweep-<SWEEP_PHASE or after>-*.png, measures rAF frame deltas while each piece animates and checks
// the pieces still work. Results also go to /tmp/lumen-sweep41.log.
const fs = require('fs'), http = require('http')
const { app, nativeTheme } = require('electron')
fs.rmSync('/tmp/lumen-sweep41', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-sweep41')
const SHOTS = '/tmp/lumen-shots'; fs.mkdirSync(SHOTS, { recursive: true })
const PHASE = process.env.SWEEP_PHASE || 'after'
const LOGF = '/tmp/lumen-sweep41.log'; try { fs.unlinkSync(LOGF) } catch {}
let fails = 0; const LOG = m => { console.log(m); try { fs.appendFileSync(LOGF, m + '\n') } catch {} }
const ok = (c, m) => { LOG((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }
const errs = []; process.on('uncaughtException', e => errs.push(String(e && e.stack || e)))
const wait = ms => new Promise(r => setTimeout(r, ms))

const AR = n => Array.from({ length: n }, (_, i) => `<p>هذه فقرة رقم ${i} من النص العربي الطويل</p>`).join('')
const server = http.createServer((q, r) => {
  if (q.url.startsWith('/translate_a')) { let b = ''; q.on('data', d => b += d); q.on('end', () => { const qs = new URLSearchParams(b).getAll('q'); setTimeout(() => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify(qs.map(t => ['This is paragraph number ' + t.length + ' of the long text']))) }, 700) }); return }
  r.setHeader('content-type', 'text/html; charset=utf-8')
  if (q.url.startsWith('/ar')) return r.end(`<html><title>صفحة</title><body style="font:18px system-ui;padding:30px"><h1>مرحبا بكم في الموقع</h1>${AR(220)}</body></html>`)
  if (q.url.startsWith('/video')) return r.end(`<title>Video</title><body style="margin:0;padding:40px;background:#f4f1ea;font:16px system-ui"><video id=v muted autoplay style="width:760px;height:428px;display:block;background:#222;border-radius:14px"></video><canvas id=c width=320 height=180 hidden></canvas><script>const c=document.getElementById("c"),x=c.getContext("2d");const g=x.createLinearGradient(0,0,320,180);g.addColorStop(0,"hsl(20,80%,60%)");g.addColorStop(1,"hsl(200,80%,50%)");x.fillStyle=g;x.fillRect(0,0,320,180);setInterval(()=>{x.fillRect(0,0,1,1)},200);document.getElementById("v").srcObject=c.captureStream(5)</script>`)
  r.end(`<title>Maps</title><body style="margin:0;font:16px system-ui;background:linear-gradient(120deg,#e8f3ff,#fff1f7);height:100vh"><header style="padding:20px 40px;font:800 26px system-ui">Harbour Maps</header><main style="padding:0 40px">Find places near you.</main>`)
}).listen(0, '127.0.0.1')

const L = require('../src/main.js')
async function shot(wc, name) {
  try { const img = await wc.capturePage(); const f = `${SHOTS}/41-sweep-${PHASE}-${name}.png`; fs.writeFileSync(f, img.toPNG()); LOG('    shot ' + f) } catch (e) { LOG('    shot failed ' + name + ': ' + e.message) }
}
// collect rAF deltas in a webContents for ms milliseconds; returns { n, avg, max, dropped } (dropped: deltas over 25ms)
const FR_START = ms => `(() => { window.__fr = []; let last = performance.now(); const t0 = last; const f = t => { __fr.push(t - last); last = t; if (t - t0 < ${ms}) requestAnimationFrame(f) }; requestAnimationFrame(f); return 1 })()`
const FR_READ = `(() => { const d = (window.__fr || []).slice(1); const s = d.reduce((a, b) => a + b, 0); return { n: d.length, avg: d.length ? +(s / d.length).toFixed(2) : 0, max: d.length ? +Math.max(...d).toFixed(1) : 0, dropped: d.filter(x => x > 25).length } })()`
async function frames(wc, label, run, ms = 1000) {
  await wc.executeJavaScript(FR_START(ms)); await run(); await wait(ms + 150)
  const r = await wc.executeJavaScript(FR_READ)
  LOG(`FRAMES ${label}: ${r.n} frames, avg ${r.avg}ms, max ${r.max}ms, dropped ${r.dropped}`)
  return r
}
const anims = wc => wc.executeJavaScript(`document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).map(a => a.animationName || a.constructor.name).join(',')`).catch(() => '')

app.whenReady().then(() => main().catch(e => { LOG('FAIL test crashed: ' + (e && e.stack || e)); app.exit(1) }))
async function main() {
  await wait(4500)
  const w = L.windows[0], ui = w.ui.webContents, ex = s => ui.executeJavaScript(s).catch(e => ({ error: e.message }))
  const uiErr = []; ui.on('console-message', e => { if (e.level === 'error' || e.level === 3) uiErr.push(e.message) })
  await ex(`document.querySelector('#intro .skip') && document.querySelector('#intro .skip').click()`); await wait(2200)
  await ex(`document.querySelector('#intro .go') && document.querySelector('#intro .go').click()`); await wait(900)
  w.win.setContentSize(1280, 820); await wait(500)
  const base = `http://127.0.0.1:${server.address().port}`
  process.env.LUMEN_TR_API = base
  const winShot = async name => { await shot(ui, name) }
  await frames(ui, 'idle chrome baseline', async () => {}, 900)

  for (const theme of ['light', 'dark']) {
    nativeTheme.themeSource = theme; await wait(500)
    // ---- permission prompts: location, then notifications, camera and microphone
    const mb = theme === 'light' ? base : base.replace('127.0.0.1', 'localhost')
    const t = w.createTab(mb + '/maps', { active: true }); await wait(1800)
    const pg = s => t.view.webContents.executeJavaScript(s, true).catch(e => ({ error: e.message }))
    let fr
    fr = await frames(ui, 'permission prompt entrance ' + theme, () => { pg(`navigator.geolocation.getCurrentPosition(() => {}, () => {}); 1`) }, 900)
    ok(await ex(`document.querySelectorAll('#prompts .prompt[data-kind="permission"]').length === 1`), 'location prompt shows ' + theme)
    ok(await ex(`(document.querySelector('#prompts .prompt') || {}).dataset?.perm === 'location'`), 'prompt knows its kind')
    await winShot('perm-location-' + theme)
    if (theme === 'light') {
      ok(!(await anims(ui)), 'no infinite animation with a prompt open: ' + (await anims(ui) || 'none'))
      await ex(`document.querySelector('#prompts .prompt [data-a="allow"]').click()`); await wait(900)
      const perms = L.D.permissions.get()[base] || {}
      ok(perms.geolocation === 'allow', 'Allow + remember saves the choice ' + JSON.stringify(perms))
      pg(`Notification.requestPermission(); 1`); await wait(1200)
      ok(await ex(`document.querySelectorAll('#prompts .prompt').length === 1`), 'notifications prompt shows')
      await winShot('perm-notifications-' + theme)
      await ex(`document.querySelector('#prompts .prompt [data-a="block"]').click()`); await wait(900)
      ok((L.D.permissions.get()[base] || {}).notifications === 'deny', 'Block saves deny')
      await wait(900); ok(await ex(`document.querySelectorAll('#prompts .prompt').length === 0`), 'prompt goes away after answering')
    }
    // camera / microphone and others: drawn from a fake request through the same channel the handler uses
    for (const [text, nm] of [['use your camera and microphone', 'camera'], ['use your microphone', 'mic'], ['see your screen', 'screen'], ['use USB devices', 'usb']]) {
      w.send('prompt', { id: 9000 + nm.length, kind: 'permission', tabId: t.id, host: '127.0.0.1', text })
      await wait(700)
      if (theme === 'light' || nm === 'camera') await winShot(`perm-${nm}-${theme}`)
      await ex(`(() => { const p = document.querySelector('#prompts .prompt'); if (p) p.querySelector('[data-a="block"]').click(); return 1 })()`); await wait(700)
    }
    w.send('prompt', { id: 9100, kind: 'permission', tabId: t.id, host: 'meet.example.com', text: 'use your camera' })
    w.send('prompt', { id: 9101, kind: 'permission', tabId: t.id, host: 'meet.example.com', text: 'show notifications' })
    await wait(900); await winShot('perm-stacked-' + theme)
    await ex(`document.querySelectorAll('#prompts .prompt [data-a="block"]').forEach(b => b.click()); 1`); await wait(800)

    // ---- the "translate this page?" bubble and the translating card
    L.D.settings.set({ translateTo: 'en', offerTranslate: true })
    const ta = w.createTab(base + '/ar', { active: true }); await wait(2600)
    ok(await ex(`document.getElementById('trask').classList.contains('show')`), 'translate bubble shows ' + theme)
    LOG('    bubble at ' + JSON.stringify(await ex(`(() => { const a = document.getElementById('trask').getBoundingClientRect(), b = document.getElementById('content-shadow').getBoundingClientRect(); return [Math.round(a.top), Math.round(b.top), document.getElementById('trask').style.top, innerHeight] })()`)))
    await winShot('trask-' + theme)
    fr = await frames(ui, 'translating card entrance ' + theme, () => ex(`document.getElementById('ta-yes').click()`), 1100)
    ok(await ex(`document.getElementById('trcard').classList.contains('show')`), 'translating card shows')
    await winShot('trcard-progress-' + theme)
    if (theme === 'light') ok(!(await anims(ui)), 'no infinite animation while translating: ' + (await anims(ui) || 'none'))
    for (let i = 0; i < 40 && !(await ex(`document.getElementById('trcard').classList.contains('done')`)); i++) await wait(150)
    ok(await ex(`document.getElementById('trcard').classList.contains('done')`), 'translating card reaches done')
    await wait(500); await winShot('trcard-done-' + theme)
    await wait(3200)
    ok(!(await ex(`document.getElementById('trcard').classList.contains('show')`)), 'card closes on its own')
    // translate menu
    await ex(`document.getElementById('btn-translate').click()`); await wait(700)
    await winShot('trmenu-' + theme)
    ok(await ex(`document.querySelectorAll('.trm-langs button').length === 16`), 'translate menu lists 16 languages')
    await ex(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await wait(400)
    L.D.settings.set({ offerTranslate: false })

    // ---- video speed badge and the swipe bead (in the page)
    const tv = w.createTab(base + '/video', { active: true }); await wait(2200)
    const vwc = tv.view.webContents, vjs = s => vwc.executeJavaScript(s).catch(e => ({ error: e.message }))
    // a live MediaStream video keeps its rate at 1, so record two seconds of it into a real clip and play that
    await vjs(`new Promise(res => { const v = document.querySelector('video'), st = document.getElementById('c').captureStream(10), rec = new MediaRecorder(st, { mimeType: 'video/webm' }), ch = []; rec.ondataavailable = e => ch.push(e.data); rec.onstop = () => { v.srcObject = null; v.src = URL.createObjectURL(new Blob(ch, { type: 'video/webm' })); v.loop = true; v.oncanplay = () => { v.oncanplay = null; v.play().catch(() => {}); res(1) } }; rec.start(); setTimeout(() => rec.stop(), 1500) })`); await wait(500)
    if (theme === 'light') await frames(vwc, 'idle page baseline ' + theme, async () => {}, 900)
    fr = await frames(vwc, 'speed badge ' + theme, async () => {
      await vjs(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '>', shiftKey: true, bubbles: true }))`); await wait(160)
      await vjs(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '>', shiftKey: true, bubbles: true }))`)
    }, 900)
    ok(await vjs(`document.querySelector('video').playbackRate === 1.5`), 'speed keys change the speed')
    await shot(vwc, 'speed-' + theme)
    await vjs(`for (let i = 0; i < 4; i++) document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '>', shiftKey: true, bubbles: true })); 1`); await wait(700)
    await shot(vwc, 'speed-fast-' + theme)
    await wait(1800)
    ok(await vjs(`!document.getElementById('__lumen_speed')`), 'speed badge removes itself')
    fr = await frames(vwc, 'swipe bead ' + theme, async () => {
      await vjs(`(() => { let n = 0; const f = () => { dispatchEvent(new WheelEvent('wheel', { deltaX: -14 })); if (++n < 20) requestAnimationFrame(f) }; requestAnimationFrame(f); return 1 })()`)
    }, 700)
    await wait(500)
    // hold a gesture open (tiny deltas keep it alive) for the screenshots
    await vjs(`(() => { dispatchEvent(new WheelEvent('wheel', { deltaX: -120 })); window.__sw = setInterval(() => dispatchEvent(new WheelEvent('wheel', { deltaX: -1 })), 40); return 1 })()`); await wait(220)
    await shot(vwc, 'swipe-' + theme)
    await vjs(`dispatchEvent(new WheelEvent('wheel', { deltaX: -120 }))`); await wait(650)
    await shot(vwc, 'swipe-go-' + theme)
    await vjs(`clearInterval(window.__sw); 1`); await wait(700)
    await vjs(`(() => { dispatchEvent(new WheelEvent('wheel', { deltaX: 260 })); window.__sw = setInterval(() => dispatchEvent(new WheelEvent('wheel', { deltaX: 1 })), 40); return 1 })()`); await wait(650)
    await shot(vwc, 'swipe-forward-' + theme)
    await vjs(`clearInterval(window.__sw); 1`); await wait(700)
    await vjs(`history.length > 1 ? 0 : 0`)
    ok(errs.length === 0, 'no main process errors so far ' + errs.join('|'))
    for (const x of [t, ta, tv]) { try { w.closeTab(x.id) } catch {} }
    await wait(400)
  }
  nativeTheme.themeSource = 'light'; await wait(400)

  // ---- print: a failed print shows a Nova dialog (cancelling does not)
  if (L.__printFailed) {
    const shown = L.__printFailed(w, 'cancelled'); ok(shown === false, 'a cancelled print shows nothing')
    const p = L.__printFailed(w, 'Print job failed'); await wait(1400)
    const nv = w.nova || {}
    ok(!!p, 'a failed print shows a dialog')
    const dv = nv.dialogState && nv.dialogState.view
    if (dv) { await wait(300); await shot(ui, 'print-error-ui'); try { await shot(dv.webContents, 'print-error') } catch {} ; nv.dialogState.finish({ response: 0, checkboxChecked: false, values: {} }) }
    await wait(500)
  } else LOG('SKIP print helper not exported')

  // ---- Dock menu and Windows jump list templates
  if (L.__dockTemplate) {
    const tpl = L.__dockTemplate([{ title: 'Example', url: 'https://example.com/' }])
    const labels = tpl.map(i => i.label || i.type)
    ok(['New Window', 'New Private Window', 'New Tab', 'Read Later', 'Downloads'].every(l => labels.includes(l)), 'dock menu has the core entries: ' + labels.join(', '))
    ok(labels.includes('Example') && tpl.every(i => i.type === 'separator' || typeof i.click === 'function'), 'dock menu lists recent sites and every entry does something')
    const before = L.windows.length
    tpl.find(i => i.label === 'New Window').click(); await wait(1500)
    ok(L.windows.length === before + 1, 'dock New Window opens a window')
    const tasks = L.__jumpTasks('/path/Lumen.exe')
    ok(tasks.length === 3 && tasks.every(x => x.program === '/path/Lumen.exe' && /^--lumen-(new-window|private|new-tab)$/.test(x.arguments)), 'jump list tasks: ' + tasks.map(x => x.title + ' ' + x.arguments).join(', '))
    const n2 = L.windows.length
    ok(L.__handleArgs(['Lumen', '--lumen-private']) === true, 'the private window argument is handled'); await wait(1500)
    ok(L.windows.length === n2 + 1 && L.windows[L.windows.length - 1].incognito, 'jump list New Private Window opens a private window')
  } else LOG('SKIP dock helpers not exported')

  ok(!uiErr.length, 'no chrome errors ' + uiErr.join('|'))
  ok(errs.length === 0, 'no main process errors ' + errs.join('|'))
  LOG(fails ? 'FAILED ' + fails : 'ALL PASS')
  app.exit(fails ? 1 : 0)
}
