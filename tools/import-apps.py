#!/usr/bin/env python3
"""Bring Surge and Koi into Lumen (apps/surge, apps/koi), adapted to live inside Lumen.

Run from the Lumen folder:  python3 tools/import-apps.py ../surge ../koi
Their code stays as it was. Only these things change on the way in:
  - colors: Surge's neon green and Koi's blue become Lumen's blue, purple and pink (the charge glow keeps its green)
  - Surge's Cmd Shift hotkeys go back to Ctrl Opt, so they never take Lumen's shortcuts
  - the permission repair, watchdog and shutdown signal are pointed at Lumen
  - their own updaters are replaced by stand-ins that hand off to Lumen's updater
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
for f in os.listdir(os.path.join(S, 'modules')):
    p = os.path.join(S, 'modules', f)
    s = open(p, encoding='utf-8').read()
    s = s.replace("'CommandOrControl+Shift+", "'Control+Alt+").replace('⌘⇧', '⌃⌥')
    open(p, 'w', encoding='utf-8').write(s)
edit(os.path.join(S, 'main.js'), [
    ("globalShortcut.register('CommandOrControl+Shift+N', toggleNotes)", "globalShortcut.register('Control+Alt+N', toggleNotes)"),
    ("for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { markCleanExit(); app.quit(); });", "// inside Lumen, Lumen handles shutdown signals"),
    ("function startWatchdog() {", "function startWatchdog() { return; /* inside Lumen: Lumen looks after itself */"),
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
for f in os.listdir(os.path.join(K, 'renderer')): recolor(os.path.join(K, 'renderer', f), KOI_COLORS)
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
