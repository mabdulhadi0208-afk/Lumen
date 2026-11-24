#!/usr/bin/env python3
"""Bring Surge and Koi into Lumen (apps/surge, apps/koi), adapted to live inside Lumen.

Run from the Lumen folder:  python3 tools/import-apps.py ../surge ../koi
Their code stays as it was. Only these things change on the way in:
  - colors: Surge's neon green and Koi's blue become Lumen's blue, purple and pink (the charge glow keeps its green)
  - Surge's Cmd Shift hotkeys go back to Ctrl Opt, so they never take Lumen's shortcuts
  - the permission repair, watchdog and shutdown signal are pointed at Lumen
  - their own updaters are replaced by stand-ins that hand off to Lumen's updater
  - their window colors follow your Lumen accent color (--lumen-a and --lumen-b, set by Lumen)
  - Surge's menu can open under Lumen's toolbar button as well as under its menu bar icon
"""
import os, re, shutil, sys

LUMEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SURGE_SRC, KOI_SRC = sys.argv[1], sys.argv[2]

def copy_tree(src, dst, skip):
    if os.path.exists(dst): shutil.rmtree(dst)
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        dirs[:] = [d for d in dirs if os.path.normpath(os.path.join(rel, d)) not in skip and d not in ('.git', 'node_modules', 'dist')]
        for f in files:
            r = os.path.normpath(os.path.join(rel, f))
            if r in skip: continue
            os.makedirs(os.path.join(dst, rel), exist_ok=True)
            shutil.copy2(os.path.join(root, f), os.path.join(dst, r))

def edit(path, pairs, must=True):
    s = open(path, encoding='utf-8').read()
    for old, new in pairs:
        if old not in s:
            if must: raise SystemExit(f'{path}: could not find {old[:70]!r}')
            continue
        s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)

def recolor(path, table):
    s = open(path, encoding='utf-8').read()
    for pat, rep in table: s = re.sub(pat, rep, s, flags=re.I)
    open(path, 'w', encoding='utf-8').write(s)

# Lumen's blue and purple become live CSS variables, so the tools follow the accent color picked in Lumen.
# Only in stylesheets: colors inside scripts (canvas drawing and the like) stay as they are.
def varify_css(css):
    css = re.sub(r'rgba\(\s*91,\s*140,\s*255\s*,\s*([\d.]+)\s*\)', r'rgb(from var(--lumen-a,#5b8cff) r g b / \1)', css)
    css = re.sub(r'rgba\(\s*138,\s*99,\s*242\s*,\s*([\d.]+)\s*\)', r'rgb(from var(--lumen-b,#8a63f2) r g b / \1)', css)
    css = re.sub(r'(?<![\w-])#5b8cff\b(?!\))', 'var(--lumen-a,#5b8cff)', css, flags=re.I)
    css = re.sub(r'(?<![\w-])#8a63f2\b(?!\))', 'var(--lumen-b,#8a63f2)', css, flags=re.I)
    return css
def varify(path):
    s = open(path, encoding='utf-8').read()
    if path.endswith('.css'): s = varify_css(s)
    else: s = re.sub(r'(<style[^>]*>)(.*?)(</style>)', lambda m: m.group(1) + varify_css(m.group(2)) + m.group(3), s, flags=re.S | re.I)
    open(path, 'w', encoding='utf-8').write(s)

# ------------------------------------------------------------------ Surge
S = os.path.join(LUMEN, 'apps', 'surge')
copy_tree(SURGE_SRC, S, {'.github', 'docs', 'site', 'build-dmg.sh', 'package-lock.json', 'update.html', 'scripts', 'build'})
SURGE_COLORS = [(r'#00FF85', '#5b8cff'), (r'#39FF14', '#8a63f2'), (r'0,\s*255,\s*133', '91, 140, 255'), (r'57,\s*255,\s*20', '138, 99, 242')]
for f in os.listdir(S):
    if f.endswith(('.html', '.css')) and f not in ('glow.html',): recolor(os.path.join(S, f), SURGE_COLORS)
# theme presets are settings, not decoration: Aurora really is a green glow, so restore them exactly
def keep_block(name, start, end):
    src = open(os.path.join(SURGE_SRC, name), encoding='utf-8').read(); dst_p = os.path.join(S, name); dst = open(dst_p, encoding='utf-8').read()
    a, b = src.index(start), src.index(end, src.index(start)); a2, b2 = dst.index(start), dst.index(end, dst.index(start))
    open(dst_p, 'w', encoding='utf-8').write(dst[:a2] + src[a:b] + dst[b2:])
keep_block('settings.html', 'const THEMES=[', '];')
for f in os.listdir(S):
    if f.endswith(('.html', '.css')) and f != 'glow.html': varify(os.path.join(S, f))
edit(os.path.join(S, 'settings.html'), [("g.theme==='solid' ? g.color : '#5b8cff'", "g.theme==='solid' ? g.color : 'var(--lumen-a,#5b8cff)'")])
for f in os.listdir(os.path.join(S, 'modules')):
    p = os.path.join(S, 'modules', f)
    s = open(p, encoding='utf-8').read()
    s = s.replace("'CommandOrControl+Shift+", "'Control+Alt+").replace('⌘⇧', '⌃⌥')
    open(p, 'w', encoding='utf-8').write(s)
edit(os.path.join(S, 'main.js'), [
    ("globalShortcut.register('CommandOrControl+Shift+N', toggleNotes)", "globalShortcut.register('Control+Alt+N', toggleNotes)"),
    ("for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { markCleanExit(); app.quit(); });", "// inside Lumen, Lumen handles shutdown signals"),
    ("function startWatchdog() {", "function startWatchdog() { return; /* inside Lumen: Lumen looks after itself */"),
    ("function togglePopover() {", "let lumenAnchor = null;   // Lumen's toolbar button, when the menu is opened from there\nipcMain.on('lumen:popover', (_e, b) => { lumenAnchor = { ...b, t: Date.now() }; togglePopover(); });\nfunction togglePopover() {"),
    ("const b = tray.getBounds(); const d = screen.getDisplayNearestPoint", "const b = lumenAnchor && Date.now() - lumenAnchor.t < 1500 ? lumenAnchor : tray.getBounds(); lumenAnchor = null; const d = screen.getDisplayNearestPoint"),
    ("tccutil reset Accessibility app.surge.glow; tccutil reset ListenEvent app.surge.glow; sleep 1; pkill -x Surge;", "tccutil reset Accessibility app.lumen.browser; tccutil reset ListenEvent app.lumen.browser; sleep 1; pkill -x Lumen;"),
])
for f in ('settings.html', 'popover.html'):
    p = os.path.join(S, f); s = open(p, encoding='utf-8').read(); open(p, 'w', encoding='utf-8').write(s.replace('⌘⇧', '⌃⌥'))
open(os.path.join(S, 'modules', '00-updater.js'), 'w', encoding='utf-8').write("""// Inside Lumen, Surge updates together with Lumen. This stand-in keeps Surge's settings working and hands off to Lumen.
const H = () => globalThis.__lumenApps || {}
module.exports = {
  id: 'updater', name: 'Updates', icon: 'refresh', group: 'System', defaultEnabled: true,
  desc: 'Surge is part of Lumen now, so it updates every time Lumen does.',
  defaults: {}, schema: [{ t: 'actions', label: 'Update', opts: [['check', 'Check now'], ['install', 'Install update']] }],
  actions: {
    check: () => H().check && H().check(), install: () => H().install && H().install(), download: () => H().check && H().check(),
    later: () => {}, skip: () => {}, cancel: () => {}, state: () => (H().state ? H().state() : { status: 'idle' }),
  },
  start() {}, stop() {}, onSettings() {}, _check: () => H().check && H().check(), _migrating: () => false,
}
""")

# ------------------------------------------------------------------ Koi
K = os.path.join(LUMEN, 'apps', 'koi')
copy_tree(KOI_SRC, K, {'.github', 'build', 'README.md', 'CLAUDE.md', 'package-lock.json', '.gitignore'})
KOI_COLORS = [(r'#0a84ff', '#5b8cff'), (r'#7c5cff', '#8a63f2'), (r'10,\s*132,\s*255', '91, 140, 255'), (r'124,\s*92,\s*255', '138, 99, 242')]
for f in os.listdir(os.path.join(K, 'renderer')):
    recolor(os.path.join(K, 'renderer', f), KOI_COLORS)
    if f.endswith(('.html', '.css')): varify(os.path.join(K, 'renderer', f))
# Modifier-only shortcuts (hold Cmd Opt and the fan opens) listen to the keyboard through a key hook. Inside Lumen that
# hook runs in its own small process: it can never freeze Lumen, it starts the moment Accessibility is turned on for
# Lumen (no restart), and Koi's Hotkeys window says plainly when Lumen still needs that permission, with a button.
km = os.path.join(K, 'main.js'); ks = open(km, encoding='utf-8').read()
a = ks.index('let uio=null;'); b = ks.index("setInterval(()=>{if(!hookOk&&hookLoaded&&chords.length)startHook(false)},3000);")
b = b + len("setInterval(()=>{if(!hookOk&&hookLoaded&&chords.length)startHook(false)},3000);")
ks = ks[:a] + """// inside Lumen: the key hook lives in its own process (koi-keys.js), so it cannot freeze Lumen and picks up a
// fresh Accessibility permission right away
let hookProc=null,hookStarting=false,hookErr='',koiOff=false;
const trusted=prompt=>{if(process.platform!=='darwin')return true;try{return require('electron').systemPreferences.isTrustedAccessibilityClient(!!prompt)}catch(e){return false}};
try{require.resolve('uiohook-napi');hookLoaded=true}catch(e){console.error('key hook unavailable',e&&e.message)}
const M={56:'Alt',3640:'Alt',29:'Control',3613:'Control',42:'Shift',54:'Shift',3675:'Command',3676:'Command'};
const held=new Set();let dirty=false,fired=false;
const cur=()=>{const n=new Set([...held].map(x=>x.split(':')[0]));return ['Command','Control','Alt','Shift'].filter(x=>n.has(x)).join('+')};
function onKey(type,keycode){const m=M[keycode];
  if(type==='down'){if(!m){dirty=true;return}
    held.add(m+':'+keycode);
    if(!dirty&&!fired&&!recording){const acc=cur();if(acc.includes('+')){const c=chords.find(c=>c.acc===acc);if(c){fired=true;c.fn()}}}}
  else{if(!m)return;held.delete(m+':'+keycode);if(held.size===0){dirty=false;fired=false}}}
function stopHook(){const p=hookProc;hookProc=null;hookOk=false;hookStarting=false;try{p&&p.kill()}catch(e){}}
function startHook(prompt){
  if(hookOk||hookStarting||!hookLoaded||koiOff)return hookOk;
  if(!trusted(prompt)){hookErr='permission';return false}
  hookStarting=true;hookErr='';
  let p;try{p=require('electron').utilityProcess.fork(path.join(__dirname,'koi-keys.js'),[],{serviceName:'Koi Keys',stdio:'ignore'})}catch(e){hookStarting=false;hookErr='start';return false}
  hookProc=p;
  const t=setTimeout(()=>{if(hookProc===p&&!hookOk){hookErr='start';stopHook()}},8000);   // a hook that hangs is replaced on the next try
  p.on('message',m=>{if(hookProc!==p||!m)return;
    if(m.ev)onKey(m.ev,m.k);
    else if(m.started){clearTimeout(t);hookOk=true;hookStarting=false;try{reg()}catch(e){}}
    else if(m.error){clearTimeout(t);hookErr='start';stopHook()}});
  p.on('exit',()=>{clearTimeout(t);if(hookProc===p){hookProc=null;hookOk=false;hookStarting=false}});
  return false;
}
setInterval(()=>{if(!hookOk&&hookLoaded&&chords.length)startHook(false)},2000);""" + ks[b:]
for old, new in [
    ("app.on('will-quit',()=>globalShortcut.unregisterAll());", "app.on('will-quit',()=>{koiOff=true;globalShortcut.unregisterAll();stopHook()});"),
    ("ipcMain.handle('koi:s:get',()=>({status:regStatus,main:S.shortcut,hk:S.hotkeys,", "ipcMain.handle('koi:s:get',()=>({status:regStatus,perm:{needed:modOnly(S.shortcut)||S.hotkeys.some(h=>modOnly(h.acc)),trusted:trusted(false),hook:hookOk,err:hookErr},main:S.shortcut,hk:S.hotkeys,"),
    ("ipcMain.handle('koi:s:pause',", "ipcMain.on('koi:s:openAccess',()=>{trusted(true);require('electron').shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')});\nipcMain.handle('koi:s:pause',"),
]:
    if old not in ks: raise SystemExit('koi main.js: could not find ' + old[:60])
    ks = ks.replace(old, new)
open(km, 'w', encoding='utf-8').write(ks)
open(os.path.join(K, 'koi-keys.js'), 'w', encoding='utf-8').write("""// Koi's key hook, in its own process inside Lumen: reports which keys go down and up (key codes only, never text).
const port = process.parentPort; const send = m => { try { port.postMessage(m) } catch {} }
try {
  const { uIOhook } = require('uiohook-napi')
  uIOhook.on('keydown', e => send({ ev: 'down', k: e.keycode }))
  uIOhook.on('keyup', e => send({ ev: 'up', k: e.keycode }))
  uIOhook.start()
  send({ started: true })
} catch (e) { send({ error: String((e && e.message) || e) }); setTimeout(() => process.exit(1), 200) }
""")
edit(os.path.join(K, 'preload.js'), [("    removeHotkey:i=>ipcRenderer.invoke('koi:s:remove',i)", "    removeHotkey:i=>ipcRenderer.invoke('koi:s:remove',i),\n    openAccess:()=>ipcRenderer.send('koi:s:openAccess')")])
# the Hotkeys window: a clear card when Lumen still needs Accessibility, that turns green by itself once it is on
edit(os.path.join(K, 'renderer', 'settings.html'), [
    ("needs Accessibility permission: System Settings → Privacy &amp; Security → Accessibility → Koi on)", "needs Accessibility permission for Lumen)"),
    ('<div class="card"><h2>Open Koi</h2>', '<div class="perm" id="perm"><div class="pi"><svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg></div><div class="pt"><b id="permT">One step left</b><span id="permS">Holding just modifier keys needs Accessibility permission for Lumen. Turn on Lumen in System Settings, Privacy and Security, Accessibility. If Lumen is already on there, turn it off and on again.</span></div><button class="btn pr" id="permB">Open Settings</button></div>\n<div class="card"><h2>Open Koi</h2>'),
    ('</style></head>', """.perm{display:none;align-items:center;gap:14px;padding:14px 16px;margin-bottom:16px;border-radius:16px;background:linear-gradient(135deg,rgb(from var(--lumen-a,#5b8cff) r g b / .14),rgb(from var(--lumen-b,#8a63f2) r g b / .12));border:1px solid rgb(from var(--lumen-a,#5b8cff) r g b / .35);box-shadow:0 10px 30px -12px rgb(from var(--lumen-a,#5b8cff) r g b / .5);animation:jin .8s cubic-bezier(.3,1.9,.5,1) both}
.perm.show{display:flex}.perm .pi{width:36px;height:36px;flex:none;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,var(--lumen-a,#5b8cff),var(--lumen-b,#8a63f2));box-shadow:0 6px 16px -6px var(--lumen-a,#5b8cff)}
.perm .pi svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.perm .pt{flex:1;display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:var(--mut);line-height:1.4}.perm .pt b{font-size:13.5px;color:var(--tx)}
.perm.ok{background:linear-gradient(135deg,rgba(48,209,88,.14),rgba(48,209,88,.06));border-color:rgba(48,209,88,.4);box-shadow:0 10px 30px -12px rgba(48,209,88,.5)}.perm.ok .pi{background:linear-gradient(135deg,#34c759,#20b26b);box-shadow:0 6px 16px -6px #34c759}.perm.ok .btn{display:none}
</style></head>"""),
    ("function render(){\n", """let wasOff=false;
function renderPerm(){const p=st.perm||{},el=$('perm');if(!el)return;const off=p.needed&&!p.hook;
 if(off){wasOff=true;el.className='perm show';$('permT').textContent=p.trusted?'Starting the key listener':'One step left';$('permS').textContent=p.trusted?'Lumen has Accessibility permission. Your shortcut will work in a moment.':'Holding just modifier keys needs Accessibility permission for Lumen. Turn on Lumen in System Settings, Privacy and Security, Accessibility. If Lumen is already on there, turn it off and on again.'}
 else if(wasOff&&p.needed){el.className='perm show ok';$('permT').textContent='All set';$('permS').textContent='Your shortcut works now. Hold the keys anywhere to open the fan.';setTimeout(()=>{if(el.classList.contains('ok'))el.className='perm'},4000);wasOff=false}
 else if(!p.needed)el.className='perm'}
addEventListener('DOMContentLoaded',()=>{$('permB').onclick=()=>api.s.openAccess();
 setInterval(async()=>{if(document.hidden||rec)return;const was=JSON.stringify(st.perm||{});st=await api.s.get();if(JSON.stringify(st.perm||{})!==was)render()},1500)});
function render(){
 renderPerm();
"""),
])
open(os.path.join(K, 'updater.js'), 'w', encoding='utf-8').write("""// Inside Lumen, Koi updates together with Lumen. This stand-in keeps Koi's menu working and hands off to Lumen.
const H = () => globalThis.__lumenApps || {}
const state = () => (H().state ? H().state() : { status: 'idle' })
const actions = {
  check: () => H().check && H().check(), download: () => H().check && H().check(), install: () => H().install && H().install(),
  later: () => {}, skip: () => {}, cancel: () => {}, state,
}
module.exports = { start() {}, actions, snapshot: state, _swapScript: () => '', _newer: () => false }
""")
# their app icons, for the Surge and Koi page in Lumen Settings
for src, name in ((os.path.join(SURGE_SRC, 'build', 'icon.png'), 'app-surge.png'), (os.path.join(KOI_SRC, 'build', 'icon.png'), 'app-koi.png')):
    if not os.path.exists(src): continue
    dst = os.path.join(LUMEN, 'pages', name)
    try:
        from PIL import Image
        Image.open(src).resize((256, 256), Image.LANCZOS).save(dst, optimize=True)
    except ImportError:
        shutil.copy2(src, dst)
print('imported Surge and Koi into', os.path.join(LUMEN, 'apps'))
