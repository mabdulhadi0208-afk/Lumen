// Lumen 4.6: the installer art in the Maison look (paper, ink, hairlines, Instrument Serif and Geist, the crescent
// icon). Renders build/dmg/background.png (+ @2x) for the Mac disk image and build/nsis/*.bmp for the Windows
// installer. Run: xvfb-run -a npx electron build/make-installer-art.js --no-sandbox   (needs ImageMagick for the BMPs)
const { app, BrowserWindow } = require('electron')
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process')
const ROOT = path.join(__dirname, '..')
const font = f => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'ui', 'fonts', f)).toString('base64')
const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'build', 'icon.png')).toString('base64')
const HEAD = `<style>
@font-face{font-family:G;src:url(${font('geist.woff2')}) format("woff2");font-weight:100 900}
@font-face{font-family:S;src:url(${font('instrument-serif.woff2')}) format("woff2")}
@font-face{font-family:S;font-style:italic;src:url(${font('instrument-serif-italic.woff2')}) format("woff2")}
*{box-sizing:border-box;margin:0}html,body{width:100%;height:100%;overflow:hidden;-webkit-font-smoothing:antialiased}
body{font-family:G,sans-serif;color:#15130f;background:#f6f3ed}
.k{font:500 calc(10px*var(--s))/1 G;letter-spacing:.24em;text-transform:uppercase;color:#8f887b}
.serif{font-family:S,Georgia,serif;font-weight:400}
</style>`
const PAGES = {
  // the disk image window is 660 x 420; Finder puts Lumen at (180, 190) and Applications at (480, 190)
  dmg: s => `${HEAD}<body style="--s:${s}">
<div style="position:absolute;inset:calc(14px*${s});border-radius:calc(10px*${s});box-shadow:inset 0 0 0 ${s}px rgba(21,19,15,.1)"></div>
<div class="k" style="position:absolute;left:0;right:0;top:calc(34px*${s});text-align:center">A calmer browser</div>
<div class="serif" style="position:absolute;left:0;right:0;top:calc(48px*${s});text-align:center;font-size:calc(44px*${s});line-height:1;letter-spacing:-.01em">Lumen</div>
${[180, 480].map(x => `<div style="position:absolute;left:calc(${x - 84}px*${s});top:calc(${190 - 84}px*${s});width:calc(168px*${s});height:calc(168px*${s});border-radius:50%;box-shadow:inset 0 0 0 ${s}px rgba(21,19,15,.14);background:#fcfbf8"></div>`).join('')}
<svg style="position:absolute;left:calc(286px*${s});top:calc(176px*${s});width:calc(88px*${s});height:calc(28px*${s})" viewBox="0 0 88 28" fill="none" stroke="#15130f" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 14h82M74 5l10 9-10 9"/></svg>
<div style="position:absolute;left:0;right:0;top:calc(318px*${s});text-align:center;font:400 calc(22px*${s})/1 S,Georgia,serif"><i>Drag</i> Lumen <i>to</i> Applications</div>
<div class="k" style="position:absolute;left:0;right:0;bottom:calc(36px*${s});text-align:center;font-size:calc(9px*${s})">getlumen.info</div>
</body>`,
  sidebar: () => `${HEAD}<body style="--s:1;background:#15130f;color:#f4efe5">
<img src="${icon}" style="position:absolute;left:24px;top:34px;width:64px;height:64px">
<div class="k" style="position:absolute;left:24px;top:124px;color:rgba(244,239,229,.55)">Welcome to</div>
<div class="serif" style="position:absolute;left:22px;top:140px;font-size:54px;line-height:1;letter-spacing:-.01em">Lumen</div>
<div style="position:absolute;left:24px;top:206px;width:40px;height:1px;background:rgba(244,239,229,.35)"></div>
<div class="serif" style="position:absolute;left:24px;top:220px;width:120px;font-size:17px;line-height:1.2;font-style:italic;color:rgba(244,239,229,.72)">A calm, fast and private browser.</div>
<div class="k" style="position:absolute;left:24px;bottom:22px;font-size:8px;color:rgba(244,239,229,.45)">getlumen.info</div>
</body>`,
  header: () => `${HEAD}<body style="--s:1">
<div class="serif" style="position:absolute;left:12px;top:13px;font-size:30px;line-height:1">Lumen</div>
<div class="k" style="position:absolute;left:13px;top:42px;font-size:6.5px;letter-spacing:.14em">A calmer browser</div>
<img src="${icon}" style="position:absolute;right:10px;top:8px;width:41px;height:41px">
<div style="position:absolute;left:0;right:0;bottom:0;height:1px;background:rgba(21,19,15,.12)"></div>
</body>`,
}
let seq = 0
async function render(html, w, h, out, tmp) {
  const win = new BrowserWindow({ show: false, width: w, height: h, useContentSize: true, frame: false, webPreferences: { offscreen: true, zoomFactor: 1 } })
  const f = path.join(tmp, 'page' + (++seq) + '.html'); fs.writeFileSync(f, '<!doctype html><meta charset="utf-8">' + html); await win.loadFile(f)
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.decode())))')
  await new Promise(r => setTimeout(r, 400))
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: w, height: h })
  fs.writeFileSync(out, img.resize({ width: w, height: h }).toPNG()); win.destroy(); console.log('wrote ' + path.relative(ROOT, out))
}
app.on('window-all-closed', () => {})
app.whenReady().then(async () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumen-art-'))
  await render(PAGES.dmg(1), 660, 420, path.join(ROOT, 'build/dmg/background.png'), tmp)
  await render(PAGES.dmg(2), 1320, 840, path.join(ROOT, 'build/dmg/background@2x.png'), tmp)
  await render(PAGES.sidebar(), 164, 314, path.join(tmp, 'sidebar.png'), tmp)
  await render(PAGES.header(), 150, 57, path.join(tmp, 'header.png'), tmp)
  for (const [src, dst] of [['sidebar.png', 'installerSidebar.bmp'], ['sidebar.png', 'uninstallerSidebar.bmp'], ['header.png', 'installerHeader.bmp']])
    execFileSync('convert', [path.join(tmp, src), '-alpha', 'off', '-type', 'TrueColor', 'BMP3:' + path.join(ROOT, 'build/nsis', dst)])
  console.log('wrote build/nsis/*.bmp'); app.exit(0)
})
