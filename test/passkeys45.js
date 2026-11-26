// 4.4.3 passkeys: a passkey whose key the keychain will no longer open (macOS can refuse an updated Lumen the old key)
// is reported plainly instead of crashing the sign-in, and a working one still signs in.
// Run: xvfb-run -a npx electron test/passkeys45.js --no-sandbox   (log: /tmp/lumen-passkeys45.log)
const { app } = require('electron'), fs = require('fs'), crypto = require('crypto')
fs.rmSync('/tmp/lumen-pk45', { recursive: true, force: true }); app.setPath('userData', '/tmp/lumen-pk45')
const LOG = '/tmp/lumen-passkeys45.log'; fs.writeFileSync(LOG, '')
let fails = 0; const ok = (c, m) => { const l = (c ? 'PASS ' : 'FAIL ') + m; console.log(l); fs.appendFileSync(LOG, l + '\n'); if (!c) fails++ }
app.whenReady().then(async () => {
  const P = require('../src/passkeys.js')
  const O = 'https://example.com', b = n => crypto.randomBytes(n).toString('base64url')
  const ask = { create: async () => true, choose: async () => 0, none: async () => {}, locked: async (rp, user) => { ask.lockedWith = rp + ' ' + user } }
  const c1 = await P.create(O, { rp: { id: 'example.com' }, user: { id: b(8), name: 'amy@example.com' }, challenge: b(16), algs: [-7] }, ask)
  ok(c1 && c1.id && !c1.error, 'a passkey is created')
  const g1 = await P.get(O, { rpId: 'example.com', challenge: b(16) }, ask)
  ok(g1 && g1.signature && !g1.error, 'and signs in')
  // the keychain refuses: the stored key no longer decrypts
  const pk = P.store.get().find(p => !p.deleted); pk.privateKey = 'e:' + b(40); P.store.save()
  let g2, threw = null
  try { g2 = await P.get(O, { rpId: 'example.com', challenge: b(16) }, ask) } catch (e) { threw = e }
  ok(!threw && g2 && g2.error === 'NotAllowedError' && /unlock/.test(g2.message), 'a key the keychain will not open fails cleanly: ' + (threw ? threw.message : JSON.stringify(g2)))
  ok(ask.lockedWith === 'example.com amy@example.com', 'and Lumen tells you which passkey and what to do (' + ask.lockedWith + ')')
  console.log(fails ? `PASSKEYS45 ${fails} FAILED` : 'PASSKEYS45 ALL PASS'); app.exit(fails ? 1 : 0)
})
