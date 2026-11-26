// 4.4.4: the what's-new film plays after every update that has one, patch releases included (4.4.1 to 4.4.3 skipped it).
// Run: xvfb-run -a npx electron test/intro444.js --no-sandbox   (log: /tmp/lumen-intro444.log)
const { app } = require('electron'), fs = require('fs'), path = require('path')
fs.rmSync('/tmp/lumen-intro444', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-intro444')
const LOG = '/tmp/lumen-intro444.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
const wait = ms => new Promise(r => setTimeout(r, ms))
const L = require('../src/main.js')
app.whenReady().then(async () => {
  await wait(3500); const ex = s => L.windows[0].ui.webContents.executeJavaScript(s)
  const film = await ex(`Intro.WHATS_NEW.version`), pkg = require(path.join(__dirname, '..', 'package.json')).version
  const want = (v, seen) => ex(`Intro.wantsWhatsNew(${JSON.stringify(v)}, ${JSON.stringify(seen)})`)
  ok(await want(pkg, ''), `this release (${pkg}) plays its film (${film}) after the update`)
  ok(!(await want(pkg, pkg)), 'but only once')
  // the shapes a film version can take
  const cases = [['4.4.3', '4.4.3', true], ['4.4.0', '4.4', true], ['4.4.2', '4.4', true], ['4.4.3', '4.4.2', false], ['4.5.0', '4.4', false], ['4.4.0', '4.4.0', true], ['4.4.10', '4.4.1', false]]
  const got = await ex(`(() => { const f = Intro.WHATS_NEW.version, out = []; for (const [v, fv, want] of ${JSON.stringify(cases)}) { Intro.WHATS_NEW.version = fv; out.push(v + ' vs film ' + fv + ': ' + (Intro.wantsWhatsNew(v, '') === want ? 'ok' : 'WRONG')) } Intro.WHATS_NEW.version = f; return out })()`)
  ok(got.every(x => /ok$/.test(x)), 'film versions match the right releases: ' + got.join(' | '))
  console.log(fails ? `INTRO444 ${fails} FAILED` : 'INTRO444 ALL PASS'); app.exit(fails ? 1 : 0)
})
