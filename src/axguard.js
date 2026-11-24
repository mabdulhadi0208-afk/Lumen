// Keeps the Accessibility permission (used by Surge and Koi) working across updates.
// macOS ties that permission to the app's code signature. While a release is signed without a stable identity,
// every update has a new signature, so the old entry in System Settings goes stale: its switch still looks on,
// but macOS ignores it, and the only fix used to be removing Lumen from the list and adding it again by hand.
// Right after an update, Lumen notices the stale entry, clears it itself and asks again, so turning one switch
// back on is all it takes. Once it is on, Surge and Koi pick it up on their own (they keep checking).
const { app, systemPreferences } = require('electron')
const { execFile } = require('child_process')

const BUNDLE_ID = 'app.lumen.browser'
const trusted = () => { try { return systemPreferences.isTrustedAccessibilityClient(false) } catch { return true } }

let timer = null
function watch(settings, log) {
  if (timer) return
  timer = setInterval(() => {
    if (!trusted()) return
    clearInterval(timer); timer = null
    settings.set({ axGranted: true, axVersion: app.getVersion() })
    log('accessibility: on again')
  }, 4000)
  if (timer.unref) timer.unref()
}

// opts: { settings, log, notify(), force } ; force lets tests run it off macOS
function check({ settings, log = () => {}, notify = () => {}, reset = null, force = false } = {}) {
  if (!force && (process.platform !== 'darwin' || !app.isPackaged)) return 'skipped'
  const v = app.getVersion(), last = settings.get('axVersion'), granted = settings.get('axGranted')
  if (trusted()) { if (!granted || last !== v) settings.set({ axGranted: true, axVersion: v }); return 'ok' }
  // People who had it on before this check existed have no axGranted yet: an existing install after an update counts too
  const updated = last ? last !== v : !!settings.get('introSeen')
  if (granted === false || !updated) { watch(settings, log); return 'waiting' }
  settings.set({ axVersion: v })
  log('accessibility: the permission went stale with the update to', v, '- clearing it and asking again')
  const done = () => {
    try { systemPreferences.isTrustedAccessibilityClient(true) } catch {}   // adds Lumen back to the list and shows macOS's own prompt
    notify()
    watch(settings, log)
  }
  if (reset) { reset(BUNDLE_ID); done(); return 'repaired' }
  execFile('tccutil', ['reset', 'Accessibility', BUNDLE_ID], () => execFile('tccutil', ['reset', 'ListenEvent', BUNDLE_ID], done))
  return 'repaired'
}

module.exports = { check, BUNDLE_ID }
