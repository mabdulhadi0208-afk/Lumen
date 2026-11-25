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
  - Glow-up 2.0 (tools/glow): real liquid glass (lumen-glass.js: an SVG lens per glass surface, a pointer glint),
    hero banners, the Dock clock and date, Nova capsules on screen, Nova dialogs instead of system alerts, Nova
    menu-bar icons (drawn by tools/glow/draw-trays.py) and a refined charge chip
  - every Surge and Koi window is redesigned in Lumen Nova (docs/NOVA.md) by one layer per tool (tools/glow/*.css,
    copied in as lumen-glow.css and linked last): ink and porcelain with an accent nebula, liquid glass with a
    refractive edge, halo rings, rounded heavy headings, calm springs, and no rubber-banding on scroll
  - Lumen 4.0 (tools/glow/*40*, lumen-menu*, lumen-update.js, draw-appicons.py): a Nova right-click menu for Surge's
    menu-bar icon, Lumen's real update (ring and bar that follow the download) in Surge's and Koi's menus and Surge's
    Updates page, a new charge capsule and message capsules with icon tiles, drawn line icons in Koi's menu (no text
    symbols that could turn into emoji), Nova app icons for Lumen Settings, and a second speed round: no animation
    loops forever in any Surge or Koi window, and the timers that ran all day only run while they are needed
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
for f in ('settings.html', 'popover.html', 'notes.html'):
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

# Speed: Surge runs inside Lumen's main process, so anything it does nonstop is felt in the browser too.
# Fewer helper processes (the app list, the volume and the battery were each read by launching a program every 1 to 2 s),
# and the menu-bar chip only moves while charging.
edit(os.path.join(S, 'main.js'), [
    ("function runningApps() {", "let raCache = null, raAt = 0, raP = null\n// the Dock asks for this from several places: one real read every 3 s is plenty\nfunction runningApps() { const n = Date.now(); if (raCache && n - raAt < 3000) return Promise.resolve(raCache); if (raP) return raP; raP = runningAppsNow().then(r => { raCache = r; raAt = Date.now(); raP = null; return r; }, e => { raP = null; throw e; }); return raP; }\nfunction runningAppsNow() {"),
    ("frontApp: async () => { try { return (await runningApps())", "frontApp: async () => { try { return (await runningAppsNow())"),
    ("    flowT = setInterval(() => { try {", "    const step = () => { try {"),
    ("chipFlow(null); } }, b.charging ? 140 : 260);", "chipFlow(null); } }; step(); if (b.charging) flowT = setInterval(step, 420);   // still on battery, gently flowing while charging"),
])
edit(os.path.join(S, 'modules', '01-glow.js'), [("tick(); timer = setInterval(tick, 1200);", "tick(); timer = setInterval(tick, 5000);   // plugging in and out still shows at once (power events)")])
edit(os.path.join(S, 'modules', '09-clipboard.js'), [("}, 700);", "}, 1200);")])
edit(os.path.join(S, 'modules', '14-network.js'), [("timer = setInterval(check, 5000);", "timer = setInterval(check, 20000);")])
edit(os.path.join(S, 'modules', '19-dock.js'), [("poll = setInterval(() => module.exports._tick(ctx), 2000);", "poll = setInterval(() => module.exports._tick(ctx), 5000);")])
edit(os.path.join(S, 'dock.html'), [("setInterval(refreshApps,1500);", "setInterval(refreshApps,4000);")])

# Lumen Nova: one stylesheet per tool, linked after each window's own styles. Each window is tagged
# (<html data-lg="...">) so the sheet can style it on its own. Looks only: no ids, classes or scripts change.
GLOW = os.path.join(LUMEN, 'tools', 'glow')
def glow(path, tag):
    s = open(path, encoding='utf-8').read()
    if '<html' not in s or '</head>' not in s: raise SystemExit(f'{path}: no <html> or </head> to add the glow layer to')
    s = s.replace('<html', f'<html data-lg="{tag}"', 1)
    i = s.index('</head>'); s = s[:i] + '<link rel="stylesheet" href="lumen-glow.css"><script defer src="lumen-glass.js"></script>' + s[i:]
    open(path, 'w', encoding='utf-8').write(s)
for f, tag in (('settings.html', 'settings'), ('popover.html', 'popover'), ('notes.html', 'notes'), ('clip.html', 'clip'), ('launchpad.html', 'launchpad'), ('dock.html', 'dock')):
    glow(os.path.join(S, f), tag)

# ---- Glow-up 2.0: real liquid glass, hero banners, the Dock clock, Nova capsules, Nova dialogs, Nova tray icons
def sheet(dst, *names):
    with open(dst, 'w', encoding='utf-8') as out:
        for n in names: out.write(open(os.path.join(GLOW, n), encoding='utf-8').read() + '\n')
sheet(os.path.join(S, 'lumen-glow.css'), 'surge.css', 'surge2.css', 'hero.css', 'update40.css', 'surge40.css')   # 4.0 layers last
for f in ('lumen-glass.js', 'lumen-dialog.js', 'lumen-dialog-preload.js', 'lumen-dialog.html', 'lumen-dialog-page.js'):
    shutil.copy2(os.path.join(GLOW, f), os.path.join(S, f))
# the Dock clock: rolling glass digits, a ring of light for the hour, a bar for the month; the CPU graph in your accent
edit(os.path.join(S, 'dock.html'), [
    ("c.innerHTML=t.replace(':','<i>:</i>');", "if(window.lumenRoll) lumenRoll(c,t); else c.innerHTML=t.replace(':','<i>:</i>');"),
    ("$('#dmon').textContent=n.toLocaleDateString([], {month:'long'});", "$('#dmon').textContent=n.toLocaleDateString([], {month:'long'}); { const dim=new Date(n.getFullYear(),n.getMonth()+1,0).getDate(), w=$('#wdate'); w&&w.style.setProperty('--mp',(n.getDate()/dim).toFixed(3)); }"),
    ("hs[2].style.transform=`rotate(${(s/3600)*30}deg)`;", "hs[2].style.transform=`rotate(${(s/3600)*30}deg)`; hs[0].parentNode.style.setProperty('--hp',((n.getMinutes()*60+n.getSeconds())/3600).toFixed(4));"),
    ("x.strokeStyle='#5b8cff'; x.lineWidth=3;", "const LA=(getComputedStyle(document.documentElement).getPropertyValue('--lumen-a').trim()||'#5b8cff'), LH=/^#[0-9a-f]{6}$/i.test(LA)?LA:'#5b8cff'; x.strokeStyle=LH; x.lineWidth=3;"),
    ("g.addColorStop(0,'rgba(91, 140, 255,.35)'); g.addColorStop(1,'rgba(91, 140, 255,0)');", "g.addColorStop(0,LH+'66'); g.addColorStop(1,LH+'00');"),
])
# the on-screen capsules ("CAPS LOCK ON", "Copied", "Break time", the hourly chime...) become Nova glass pills
e = os.path.join(S, 'engine.js'); es = open(e, encoding='utf-8').read()
a, b = es.index('    function capsule('), es.index('    function frame(now) {')
open(e, 'w', encoding='utf-8').write(es[:a] + open(os.path.join(GLOW, 'capsule.js'), encoding='utf-8').read() + es[b:])
# Surge's questions: a Nova dialog of its own instead of a system alert. "Move Surge to Applications" is meaningless
# inside Lumen (Surge lives inside Lumen), so that one is not asked at all.
d19 = os.path.join(S, 'modules', '19-dock.js'); ds = open(d19, encoding='utf-8').read()
if ds.count('dialog.showMessageBox(') != 2: raise SystemExit('19-dock.js: expected two dialogs')
open(d19, 'w', encoding='utf-8').write(ds.replace('dialog.showMessageBox(', "require('../lumen-dialog.js')("))
edit(os.path.join(S, 'main.js'), [
    ("if (process.platform === 'darwin' && app.isPackaged) {", "if (false && process.platform === 'darwin' && app.isPackaged) {   // inside Lumen there is no Surge app to move to Applications"),
    # the menu-bar icon: Surge's Nova template icon (crisp at 1x and 2x)
    ("  if (!b || b.level == null) {\n", "  if (!b || b.level == null) {\n    try { const t = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray', 'surgeTemplate.png')); if (!t.isEmpty()) { t.setTemplateImage(true); return t; } } catch {}\n"),
])
for f in os.listdir(os.path.join(GLOW, 'tray')):
    if not f.startswith('trayFrame'): shutil.copy2(os.path.join(GLOW, 'tray', f), os.path.join(S, 'assets', 'tray', f))
# the menu-bar charge chip, refined in Nova: ink glass body, a specular top, a rim of light, bolder digits
edit(os.path.join(S, 'traychip.js'), [
    ("let c0 = 16, c1 = 20, c2 = 29, al = .94;", "let c0 = 11, c1 = 13, c2 = 25, al = .95;"),
    ("if (y < H / 2) { c0 += (255 - c0) * .07; c1 += (255 - c1) * .07; c2 += (255 - c2) * .07; }",
     "{ const sp = y < H * .45 ? .16 * Math.pow(1 - y / (H * .45), 1.5) : 0, dk = y > H * .6 ? .22 * (y - H * .6) / (H * .4) : 0; c0 += (255 - c0) * sp; c1 += (255 - c1) * sp; c2 += (255 - c2) * sp; c0 *= 1 - dk; c1 *= 1 - dk; c2 *= 1 - dk; }"),
    ("if (sd > -1) { c0 += (255 - c0) * .22; c1 += (255 - c1) * .22; c2 += (255 - c2) * .22; al += (1 - al) * .22; }",
     "if (sd > -1.2) { const k2 = .42 * (1 + sd / 1.2) * (y < H / 2 ? 1 : .55), rc = x < W * .45 ? [Math.min(255, col[0] + 90), Math.min(255, col[1] + 90), Math.min(255, col[2] + 90)] : [255, 255, 255]; c0 += (rc[0] - c0) * k2; c1 += (rc[1] - c1) * k2; c2 += (rc[2] - c2) * k2; al += (1 - al) * k2; }"),
    ("if (d < .82) a++; if (d < 1.45) sh++;", "if (d < .92) a++; if (d < 1.6) sh++;"),
])
# no rubber-banding on scroll (a Lumen rule): Surge's stretchy list ends stay off unless a window asks for them
edit(os.path.join(S, 'fluid.js'), [("{ let el = null, off = 0, v = 0, rb = 0, lastW = 0; const RB = C.rubber || '.pane.on,.list,.grid,.sp .list';",
                                    "if (C.rubber) { let el = null, off = 0, v = 0, rb = 0, lastW = 0; const RB = C.rubber;")])
# the sparks fall back to Lumen's blue, not Surge's green
edit(os.path.join(S, 'fx.js'), [("|| '#00FF85'", "|| '#5b8cff'")])

# ---- Lumen 4.0 for Surge
# The update card: Surge updates with Lumen, so its menu and its Updates page show Lumen's real update (version from and
# to, a ring and a bar that follow the download, percent, speed and time left, one clear button). tools/glow/lumen-update.js
shutil.copy2(os.path.join(GLOW, 'lumen-update.js'), os.path.join(S, 'lumen-update.js'))
for f in ('popover.html', 'settings.html'):
    edit(os.path.join(S, f), [('<script defer src="lumen-glass.js"></script>', '<script defer src="lumen-glass.js"></script><script defer src="lumen-update.js"></script>')])
edit(os.path.join(S, 'popover.html'), [
    ("if(['ready','available','downloading','unpacking'].includes(u.status)){ box.style.display='flex'; $('#updT').textContent=",
     "if(['ready','available','downloading','verifying','unpacking','installing','error'].includes(u.status)&&(u.status!=='error'||u.latest)){ box.style.display='flex'; if(window.lumenUpd) lumenUpd(box,u,{text:$('#updT'),btn:$('#updBtn'),poll:state}); else { $('#updT').textContent="),
    ("$('#updBtn').disabled=(u.status==='downloading'||u.status==='unpacking'); } else box.style.display='none'; }",
     "$('#updBtn').disabled=(u.status==='downloading'||u.status==='unpacking'); } } else box.style.display='none'; }"),
    ("$('#updBtn').onclick=async()=>{ const u=await api?.action('updater','state'); if(u?.status==='ready'){ api?.action('updater','install'); toast('Restarting…'); } else { api?.action('updater','download'); toast('Downloading…'); } };",
     "$('#updBtn').onclick=async()=>{ const u=await api?.action('updater','state'); if(u?.status==='ready'){ api?.action('updater','install'); toast('Restarting Lumen'); } else if(u?.status==='error'){ api?.action('updater','check'); toast('Checking again'); } else { api?.action('updater','download'); toast('Downloading Lumen '+String(u?.latest||'').replace(/^v/,'')); } setTimeout(state,400); };"),
    # Speed: the menu stays loaded while it is closed; it only asks for news while it is open
    ("sndCheck(); setInterval(sndCheck,1000);", "sndCheck(); setInterval(()=>{ if(!document.hidden) sndCheck(); },1000);"),
    ("  setInterval(()=>{ batt(); state(); },2000); })();", "  setInterval(()=>{ if(document.hidden) return; batt(); state(); },2000); })();"),
])
# The right-click menu on Surge's menu-bar icon: a Nova menu of Surge's own (tools/glow/lumen-menu*.js) instead of the
# system menu, from the same items. The native menu is only built if the Nova one cannot open, and the items are no
# longer rebuilt into a system menu every time the menu-bar title changes (the CPU module did that every 2 s).
for f in ('lumen-menu.js', 'lumen-menu-preload.js', 'lumen-menu.html', 'lumen-menu-page.js'):
    shutil.copy2(os.path.join(GLOW, f), os.path.join(S, f))
edit(os.path.join(S, 'main.js'), [
    ("  trayMenu = Menu.buildFromTemplate([\n", "  trayMenu = ([   // the template; drawn by the Nova menu on right-click\n"),
    ("tray.on('right-click', () => trayMenu && tray.popUpContextMenu(trayMenu));",
     "tray.on('right-click', () => { if (!trayMenu) return; try { require('./lumen-menu.js').popup(trayMenu, tray.getBounds(), { battery, on: running.size, muted: !!settings.muted, total: Object.keys(MODULES).length }); } catch (e) { log('nova menu ' + (e && e.message)); tray.popUpContextMenu(Menu.buildFromTemplate(trayMenu)); } });"),
])
# Speed, round two (4.0):
#  - Cursor Spotlight read the cursor 60 times a second even while it was off; now only while it is on
edit(os.path.join(S, 'modules', '05-spotlight.js'), [
    ("_toggle(ctx) { on = !on;", "_toggle(ctx) { on = !on; clearInterval(timer); timer = on ? setInterval(() => { if (!on) return; const p = ctx.screen.getCursorScreenPoint(); ctx.overlaySend('cursor', p); }, 16) : null;"),
    ("    timer = setInterval(() => { if (!on) return; const p = ctx.screen.getCursorScreenPoint(); ctx.overlaySend('cursor', p); }, 16);\n", ""),
])
#  - the Dock's auto-hide watched the cursor 40 times a second all day, even with auto-hide off. Now: once a second
#    with auto-hide off, about 8 times a second while the cursor is far from the Dock's edge, and full speed only near it
edit(os.path.join(S, 'modules', '19-dock.js'), [
    ("    if (!win || win.isDestroyed()) return; const s = ctx.mod('dock'); if (!s.autohide) return;\n    const p = screen.getCursorScreenPoint();",
     "    if (!win || win.isDestroyed()) return 0; const s = ctx.mod('dock'); if (!s.autohide) return 0;\n    const p = screen.getCursorScreenPoint(); module.exports._near = revealed || Math.abs(p.y - module.exports._geom(ctx).edgeY) < 260;"),
    ("    edgePoll = setInterval(() => module.exports._edgeTick(ctx), 25);",
     "    const edgeLoop = () => { if (!win || win.isDestroyed()) { edgePoll = null; return; } try { module.exports._edgeTick(ctx); } catch {} edgePoll = setTimeout(edgeLoop, !ctx.mod('dock').autohide ? 1000 : module.exports._near ? 25 : 120); }; clearTimeout(edgePoll); edgePoll = setTimeout(edgeLoop, 25);"),
    ("stop(ctx) { clearInterval(poll); clearInterval(edgePoll);", "stop(ctx) { clearInterval(poll); clearTimeout(edgePoll); edgePoll = null;"),
])
#  - the Dock's tooltip followed its icon 25 times a second forever; now only while the pointer is on the Dock
#  - the app list was read every 4 s on top of the Dock's own 5 s update (which reads it too); now once per update
edit(os.path.join(S, 'dock.html'), [
    ("setInterval(()=>{ if(tipTarget && tipTarget[0].isConnected && !dragging) showTip(tipTarget[0],tipTarget[1]); },40);",
     "let tipIv=0; const tipOn=()=>{ if(!tipIv) tipIv=setInterval(()=>{ if(tipTarget && tipTarget[0].isConnected && !dragging) showTip(tipTarget[0],tipTarget[1]); else if(!tipTarget){ clearInterval(tipIv); tipIv=0; } },40); }; addEventListener('mousemove',tipOn,{passive:true});"),
    ("setInterval(refreshApps,4000);", "/* the 5 s Dock update refreshes them too */ setInterval(()=>{ if(!document.hidden) refreshApps(); },15000);"),
])
#  - the battery was read (a helper program launch on a Mac) every 5 s, even on a Mac with no battery. Now the pace
#    follows what can change: every 8 s while charging or close to the low-battery alert, every 20 s on battery,
#    every 30 s when full on power or with no battery. Plugging in and out still shows at once (power events).
edit(os.path.join(S, 'modules', '01-glow.js'), [("tick(); timer = setInterval(tick, 5000);   // plugging in and out still shows at once (power events)",
    "const pace = () => { const b = ctx.battery; if (!b) return 30000; if (b.charging) return b.level >= 100 || b.charged ? 30000 : 8000; return b.level <= (s().lowAlert || 0) + 8 ? 8000 : 20000; };\n"
    "    const loop = () => { if (!timer) return; tick(); timer = setTimeout(loop, pace()); };\n"
    "    tick(); timer = setTimeout(loop, 5000);   // then at the pace above; plugging in and out still shows at once (power events)")])
#  - the Settings battery line only updates while Settings is on screen
edit(os.path.join(S, 'settings.html'), [("batt(); setInterval(batt, 3000);", "batt(); setInterval(()=>{ if(!document.hidden) batt(); }, 3000);")])
# the glow overlay (charge capsule, Caps Lock and the other messages) gets the Nova layer too: it draws on a canvas,
# but it reads your accent and the rounded display face from the page
glow(os.path.join(S, 'glow.html'), 'overlay')
# Quick Notes: the title gets its own element, so it can carry the gradient next to the new icon tile
edit(os.path.join(S, 'notes.html'), [('<header><i></i>Quick Notes<', '<header><i></i><span class="lg-nt">Quick Notes</span><')])

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
# Lumen's glow layer for Koi's popover, Hotkeys window, tour and app fan
sheet(os.path.join(K, 'renderer', 'lumen-glow.css'), 'koi.css', 'koi2.css', 'hero.css', 'update40.css', 'koi40.css')
shutil.copy2(os.path.join(GLOW, 'lumen-glass.js'), os.path.join(K, 'renderer', 'lumen-glass.js'))
for f, tag in (('popover.html', 'kpop'), ('settings.html', 'ksettings'), ('app.html', 'kapp'), ('update.html', 'kupdate')):
    glow(os.path.join(K, 'renderer', f), tag)
# ---- Lumen 4.0 for Koi
# The menu's icons were text symbols (a music note, a power sign, a play triangle that macOS can draw as a coloured
# emoji...). They become Nova line icons, so no symbol can ever turn into an emoji.
KI = {
    '♪': '<path d="M11 5 6.5 9H3.5v6h3L11 19z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    '⏻': '<path d="M12 3.5v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>',
    '⇩': '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    '⌥': '<rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M6.5 10h.1M10 10h.1M13.5 10h.1M17.5 10h.1M7.5 14h9"/>',
    '▶': '<path class="fill" d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z"/>',
    '↻': '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.2h-4.2"/>',
    '✕': '<path d="M7 7l10 10M17 7 7 17"/>',
}
kp = os.path.join(K, 'renderer', 'popover.html'); ks = open(kp, encoding='utf-8').read()
for g, d in KI.items():
    old = f'<div class="ic">{g}</div>'
    if old not in ks: raise SystemExit('koi popover.html: no icon ' + g)
    ks = ks.replace(old, f'<div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg></div>')
# Speed: the menu's spring engine ran 60 times a second for as long as Koi ran, even with the menu closed (the window
# stays loaded, hidden). Now it runs only while something is moving, and stops a moment after everything settles.
for old, new in [
    ("class Sp{constructor(x,k=240,c=15,cb){this.x=x;this.v=0;this.t=x;this.k=k;this.c=c;this.cb=cb;SP.add(this)}",
     "class Sp{constructor(x,k=240,c=15,cb){this.x=x;this.v=0;this._t=x;this.k=k;this.c=c;this.cb=cb;SP.add(this)}\n get t(){return this._t} set t(v){this._t=v;wake()}"),
    ("let last=performance.now();\n(function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;SP.forEach(s=>s.step(dt));requestAnimationFrame(loop)})(last);",
     "let last=performance.now(),rafOn=0,still=0;\nfunction wake(){still=0;if(!rafOn){rafOn=1;last=performance.now();requestAnimationFrame(loop)}}\nfunction loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;let mv=0;SP.forEach(s=>{s.step(dt);if(!mv&&(Math.abs(s.v)>.002||Math.abs(s._t-s.x)>.002))mv=1});still=mv?0:still+1;if(still>24){rafOn=0;return}requestAnimationFrame(loop)}\nwake();addEventListener('pointermove',wake,{passive:true});addEventListener('pointerdown',wake,{passive:true});setTimeout(()=>{if(!items.length)for(const a of document.getAnimations()){try{if(a.effect&&a.effect.getTiming().iterations!==1)a.finish()}catch(e){}}},1500);"),
    # the update block: Lumen's real update with a bar that follows the download (lumen-update.js)
    (" $('#ft').textContent=u.lastCheck?", " if(window.lumenUpd&&ub.classList.contains('show'))lumenUpd(ub,u,{text:ub.querySelector('div'),btn:$('#upgo'),poll:async()=>{if(!api)return;Object.assign(S,await api.get());render()}});\n $('#ft').textContent=u.lastCheck?"),
    ("else if(st==='available'||st==='downloading'||st==='unpacking'){", "else if(st==='available'||st==='downloading'||st==='verifying'||st==='unpacking'||st==='installing'){"),
    ("$('#upgo').onclick=()=>{const st=(S.upd||{}).status;api&&api.action(st==='ready'?'install':'download')};", "$('#upgo').onclick=()=>{const st=(S.upd||{}).status;if(['downloading','verifying','unpacking','installing'].includes(st))return;api&&api.action(st==='ready'?'install':'download');setTimeout(async()=>{if(api){Object.assign(S,await api.get());render()}},400)};"),
    ('<script defer src="lumen-glass.js"></script>', '<script defer src="lumen-glass.js"></script><script defer src="lumen-update.js"></script>'),
    # once the menu has closed, its slow background drift comes to rest at once instead of playing on, unseen
    ("function hide(){ps.t=.9;py.t=-8;po.t=0;po.k=420;po.c=30}", "function hide(){ps.t=.9;py.t=-8;po.t=0;po.k=420;po.c=30;clearTimeout(hide.r);hide.r=setTimeout(()=>{for(const a of document.getAnimations()){try{if(a.effect&&a.effect.getTiming().iterations!==1)a.finish()}catch(e){}}},400)}"),
]:
    if old not in ks: raise SystemExit('koi popover.html: could not find ' + old[:60])
    ks = ks.replace(old, new)
open(kp, 'w', encoding='utf-8').write(ks)
shutil.copy2(os.path.join(GLOW, 'lumen-update.js'), os.path.join(K, 'renderer', 'lumen-update.js'))
# the fan's animation loop also ran nonstop in its hidden window; now it rests a moment after the fan closes
edit(os.path.join(K, 'renderer', 'app.html'), [
    (" requestAnimationFrame(frame);\n}\nfunction mv(d)", " if(MODE==='overlay'&&!S.open&&!S.film&&performance.now()-(S.closedAt||0)>1500){frame.idle=1;return}\n requestAnimationFrame(frame);\n}\nfunction mv(d)"),
    (" if(S.open)return;S.open=true;", " if(S.open)return;S.open=true;if(frame.idle){frame.idle=0;requestAnimationFrame(frame)}"),
    ("S.lastSel='';S.open=false;", "S.lastSel='';S.open=false;S.closedAt=performance.now();"),
    ("API.onHide&&API.onHide(()=>{S.open=false;", "API.onHide&&API.onHide(()=>{S.open=false;S.closedAt=performance.now();"),
    # the tour's play buttons: a drawn triangle, never a symbol that could become an emoji
    ('>▶ Tour<', '><svg class="lg-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z"/></svg> Tour<'),
    ('>▶ Play with sound<', '><svg class="lg-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z"/></svg> Play with sound<'),
])
# the Hotkeys window: shortcuts show as real keycaps (one key each), and each card gets a glowing icon tile
edit(os.path.join(K, 'renderer', 'settings.html'), [
    ("const pretty=a=>!a?'Not set':", "const caps=s=>/^Not set/.test(s)?s:s.split(' ').filter(Boolean).map(k=>'<kbd class=\"lg-kc\">'+k.replace(/[&<>]/g,'')+'</kbd>').join(' ');\nconst pretty=a=>!a?'Not set':"),
    ("$('main').textContent=pretty(st.main)+(st.status&&!st.status.main?'  (!)':'');", "$('main').innerHTML=caps(pretty(st.main))+(st.status&&!st.status.main?' <span class=\"lg-warn\">(!)</span>':'');"),
    ('<div class="card"><h2>Open Koi</h2>', '<div class="card lg-c1"><h2>Open Koi</h2>'),
    ('<div class="card"><h2>App hotkeys</h2>', '<div class="card lg-c2"><h2>App hotkeys</h2>'),
])
ks2 = open(os.path.join(K, 'renderer', 'settings.html'), encoding='utf-8').read()
if '${pretty(h.acc)}' not in ks2: raise SystemExit('koi settings.html: no app hotkey label')
open(os.path.join(K, 'renderer', 'settings.html'), 'w', encoding='utf-8').write(ks2.replace('${pretty(h.acc)}', '${caps(pretty(h.acc))}'))
# arrows that have an emoji form get the text-style selector (U+FE0E), so they always draw as plain arrows
for f in (os.path.join(K, 'main.js'), os.path.join(K, 'renderer', 'app.html'), os.path.join(K, 'renderer', 'settings.html')):
    s = open(f, encoding='utf-8').read()
    s = re.sub('([\u21a9\u2195\u25b6])(?!\ufe0e)', '\\1\ufe0e', s)
    open(f, 'w', encoding='utf-8').write(s)
# the tour window opens on Nova ink, not Koi's old near-black
edit(os.path.join(K, 'main.js'), [("backgroundColor:'#04050c'", "backgroundColor:'#0a0c15'"), ("backgroundColor:'#eef1fb'", "backgroundColor:'#f5f6fb'")])
# the menu-bar koi: crisper Nova frames (same 7 frames and names, template images at 1x and 2x)
for f in os.listdir(os.path.join(GLOW, 'tray')):
    if f.startswith('trayFrame'): shutil.copy2(os.path.join(GLOW, 'tray', f), os.path.join(K, 'assets', f))
# their app icons, for the Surge and Koi page in Lumen Settings: the Nova icons drawn by tools/glow/draw-appicons.py
for name in ('app-surge.png', 'app-koi.png'):
    shutil.copy2(os.path.join(GLOW, name), os.path.join(LUMEN, 'pages', name))
print('imported Surge and Koi into', os.path.join(LUMEN, 'apps'))
