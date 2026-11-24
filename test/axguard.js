// After an update, a stale Accessibility entry gets cleared and asked for again (instead of remove-and-re-add by hand).
const { app, systemPreferences } = require('electron')
const fs = require('fs')
app.setPath('userData', '/tmp/lumen-axguard-profile'); fs.rmSync('/tmp/lumen-axguard-profile', { recursive: true, force: true })
const LOG = '/tmp/lumen-axguard.log'; fs.writeFileSync(LOG, '')
let pass = 0, fail = 0
const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; c ? pass++ : fail++; console.log(l); fs.appendFileSync(LOG, l + '\n') }
app.whenReady().then(async () => {
  const AX = require('../src/axguard')
  const mem = {}; const settings = { get: k => mem[k], set: o => Object.assign(mem, o) }
  let isTrusted = true, prompts = 0, resets = [], notes = 0
  systemPreferences.isTrustedAccessibilityClient = p => { if (p) prompts++; return isTrusted }
  const run = () => AX.check({ settings, force: true, reset: id => resets.push(id), notify: () => notes++ })
  const v = app.getVersion()
  ok(run() === 'ok' && mem.axGranted === true && mem.axVersion === v, 'remembers that Accessibility is on')
  mem.axVersion = '0.0.1'; isTrusted = false
  ok(run() === 'repaired', 'after an update with the switch gone stale, Lumen repairs it')
  ok(resets[0] === 'app.lumen.browser', 'clears its own stale entry')
  ok(prompts === 1 && notes === 1, 'asks macOS again and tells the user what to do')
  ok(mem.axVersion === v, 'only once per version')
  ok(run() === 'waiting' && resets.length === 1 && prompts === 1, 'does not nag again on the next launch of the same version')
  isTrusted = true; await new Promise(r => setTimeout(r, 4500))
  ok(mem.axGranted === true, 'notices when the switch is turned back on')
  // someone who had it on before this check existed (no axGranted yet), after an update
  for (const k of Object.keys(mem)) delete mem[k]; mem.introSeen = true; isTrusted = false; resets = []
  ok(run() === 'repaired' && resets.length === 1, 'also repairs for people updating from a version without this check')
  // a brand new install that never turned it on: no reset
  for (const k of Object.keys(mem)) delete mem[k]; resets = []
  ok(run() === 'waiting' && resets.length === 0, 'a new install is not touched')
  mem.axGranted = false; mem.axVersion = '0.0.1'
  ok(run() === 'waiting' && resets.length === 0, 'nothing happens when it was never granted')
  ok(AX.check({ settings }) === 'skipped', 'does nothing outside a packaged Mac app')
  const line = fail ? `${pass} pass, ${fail} fail` : 'ALL PASS'; console.log(line); fs.appendFileSync(LOG, line + '\n')
  app.exit(fail ? 1 : 0)
})
