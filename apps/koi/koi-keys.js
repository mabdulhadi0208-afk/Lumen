// Koi's key hook, in its own process inside Lumen: reports which keys go down and up (key codes only, never text).
const port = process.parentPort; const send = m => { try { port.postMessage(m) } catch {} }
try {
  const { uIOhook } = require('uiohook-napi')
  uIOhook.on('keydown', e => send({ ev: 'down', k: e.keycode }))
  uIOhook.on('keyup', e => send({ ev: 'up', k: e.keycode }))
  uIOhook.start()
  send({ started: true })
} catch (e) { send({ error: String((e && e.message) || e) }); setTimeout(() => process.exit(1), 200) }
