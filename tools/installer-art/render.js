// Lumen 4.1 installer and release art, rendered with headless Chromium from the same icon source as the app icon.
//   xvfb-run -a -s '-screen 0 2560x1600x24' npx electron tools/installer-art/render.js --no-sandbox
// Writes:
//   build/dmg/background.png, build/dmg/background@2x.png   the Mac DMG window (660 x 420, and 1320 x 840 for Retina)
//   build/nsis/installerSidebar.bmp, uninstallerSidebar.bmp  164 x 314, 24-bit BMP (NSIS wants BMP)
//   build/nsis/installerHeader.bmp                           150 x 57
//   build/nsis/installerIcon.ico, uninstallerIcon.ico        16 to 256 px
//   build/doc/document.icns, build/doc/document.ico          the document icon for files Lumen can open
//   docs/release/4.0-hero.png                                the release page hero (needs SHOT, a 1280 x 820 Lumen screenshot)
// and previews into /tmp/lumen-shots/41-sweep-{dmg,nsis,release,doc}*.png.
// No emoji anywhere; the DMG says only "Drag Lumen to Applications".
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')
const { svg: iconSvg } = require('../icons/icon.js')

const ROOT = path.join(__dirname, '..', '..')
const SHOTS = '/tmp/lumen-shots'
const SHOT = process.env.SHOT || path.join(SHOTS, '41b-home-clock-dark.png')
app.disableHardwareAcceleration()

const b64 = s => Buffer.from(s).toString('base64')
const ICON = size => 'data:image/svg+xml;base64,' + b64(iconSvg('default', size))
// the shared look: deep saturated nebula (indigo, violet, pink, a cyan and amber glint), a fine grain and a few motes
const GRAIN = (() => {
  // a static noise tile, painted once
  let seed = 41; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  let rects = ''
  for (let i = 0; i < 900; i++) rects += `<rect x="${(rnd() * 120).toFixed(1)}" y="${(rnd() * 120).toFixed(1)}" width="1" height="1" fill="${rnd() < 0.5 ? '#fff' : '#000'}" fill-opacity="${(0.05 + rnd() * 0.1).toFixed(2)}"/>`
  return 'data:image/svg+xml;base64,' + b64(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">${rects}</svg>`)
})()
const MOTES = (n, w, h, s = 1) => {
  let seed = 7 + n; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: n }, () => `<i style="left:${(rnd() * w).toFixed(0)}px;top:${(rnd() * h).toFixed(0)}px;width:${((1 + rnd() * 2.2) * s).toFixed(1)}px;height:${((1 + rnd() * 2.2) * s).toFixed(1)}px;opacity:${(0.25 + rnd() * 0.6).toFixed(2)}"></i>`).join('')
}
const BASE_CSS = `*{box-sizing:border-box;margin:0}html,body{width:100%;height:100%;overflow:hidden;background:transparent}
  body{font-family:'Inter Display','Inter','SF Pro Display','Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .neb{position:absolute;inset:0;overflow:hidden;
    background:radial-gradient(60% 70% at 8% 0%,rgba(77,99,255,.85),transparent 70%),radial-gradient(55% 70% at 100% 100%,rgba(236,61,151,.85),transparent 70%),
      radial-gradient(40% 50% at 85% 10%,rgba(34,196,232,.5),transparent 70%),radial-gradient(35% 45% at 20% 100%,rgba(255,166,46,.35),transparent 70%),
      linear-gradient(135deg,#140b46,#3a1590 45%,#7a1f8f 75%,#a8245f)}
  .grain{position:absolute;inset:0;background:url(${GRAIN});mix-blend-mode:overlay;opacity:.8}
  .motes i{position:absolute;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.8)}
  .pool{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.35),transparent)}`

function dmgHTML(s) {
  const W = 660, H = 420
  return `<style>${BASE_CSS}
    .root{position:absolute;left:0;top:0;width:${W}px;height:${H}px;zoom:${s}}
    .ring{position:absolute;right:-150px;top:-210px;width:420px;height:420px;opacity:.12}
    .ped{position:absolute;top:112px;width:196px;height:206px;border-radius:44px;
      background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.1) 52%,rgba(255,255,255,.82) 74%,rgba(246,242,255,.95));
      box-shadow:inset 0 1px 0 #fff,inset 0 0 0 1px rgba(255,255,255,.7),0 0 0 8px rgba(255,255,255,.08),0 26px 60px -16px rgba(20,0,60,.7),0 10px 50px -10px rgba(236,61,151,.45)}
    .ped::before{content:'';position:absolute;inset:-1.5px;border-radius:46px;padding:1.5px;background:linear-gradient(130deg,#7ff0ff,rgba(255,255,255,.4) 40%,#ff7cc5);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor}
    .p1{left:82px}.p2{left:382px}
    .arrow{position:absolute;left:290px;top:186px;width:80px;height:56px;overflow:visible;filter:drop-shadow(0 0 8px rgba(255,180,230,.8))}
    .cap{position:absolute;left:0;right:0;bottom:44px;text-align:center;color:#fff;font:800 21px/1 'Inter Display','Inter',sans-serif;letter-spacing:-.02em;text-shadow:0 2px 18px rgba(30,0,60,.5)}
    .cap b{display:inline-block;padding:9px 18px;border-radius:999px;background:rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 0 0 1px rgba(255,255,255,.18)}</style>
    <div class="root"><div class="neb"></div>
      <div class="pool" style="left:120px;top:-120px;width:420px;height:220px"></div>
      <img class="ring" src="data:image/svg+xml;base64,${b64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="1.2"><circle cx="50" cy="50" r="22"/><ellipse cx="50" cy="50" rx="46" ry="14" transform="rotate(-21 50 50)"/></svg>')}">
      <div class="grain"></div><div class="motes">${MOTES(38, W, H)}</div>
      <div class="ped p1"></div><div class="ped p2"></div>
      <svg class="arrow" viewBox="0 0 80 56"><defs><linearGradient id="ag" x1="0" x2="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".6" stop-color="#ffd1ec"/><stop offset="1" stop-color="#fff"/></linearGradient><filter id="gl" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <g fill="none" stroke="url(#ag)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 28h58"/><path d="M48 12l16 16-16 16"/></g></svg>
      <div class="cap"><b>Drag Lumen to Applications</b></div>
    </div>`
}
function sidebarHTML(un) {
  return `<style>${BASE_CSS}
    .neb{background:radial-gradient(90% 50% at 0% 0%,rgba(77,99,255,.9),transparent 70%),radial-gradient(90% 50% at 100% 100%,${un ? 'rgba(255,166,46,.75)' : 'rgba(236,61,151,.9)'},transparent 70%),radial-gradient(70% 30% at 100% 30%,rgba(34,196,232,.45),transparent 70%),linear-gradient(170deg,#140b46,#3a1590 45%,${un ? '#8a3a1f' : '#7a1f8f'} 80%,${un ? '#a8562a' : '#a8245f'})}
    .ic{position:absolute;left:24px;top:34px;width:116px;height:116px;filter:drop-shadow(0 14px 22px rgba(20,0,60,.6))}
    .t{position:absolute;left:0;right:0;top:170px;text-align:center;color:#fff;font:850 30px/1 'Inter Display',sans-serif;letter-spacing:-.04em;text-shadow:0 2px 14px rgba(30,0,60,.5)}
    .s{position:absolute;left:0;right:0;top:208px;text-align:center;color:rgba(255,255,255,.78);font:700 10px/1 'Inter',sans-serif;letter-spacing:.2em;text-transform:uppercase}
    .ring{position:absolute;left:-70px;bottom:-90px;width:260px;height:260px;opacity:.12}</style>
    <div class="neb"></div><div class="pool" style="left:-10px;top:-60px;width:190px;height:140px"></div>
    <img class="ring" src="data:image/svg+xml;base64,${b64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="1.4"><circle cx="50" cy="50" r="22"/><ellipse cx="50" cy="50" rx="46" ry="14" transform="rotate(-21 50 50)"/></svg>')}">
    <div class="grain"></div><div class="motes">${MOTES(16, 164, 314)}</div>
    <img class="ic" src="${ICON(256)}"><div class="t">Lumen</div><div class="s">${un ? 'Uninstall' : 'Version 4'}</div>`
}
function headerHTML() {
  return `<style>${BASE_CSS}
    .ic{position:absolute;right:8px;top:6px;width:45px;height:45px;filter:drop-shadow(0 4px 8px rgba(20,0,60,.6))}
    .t{position:absolute;left:12px;top:19px;color:#fff;font:850 19px/1 'Inter Display',sans-serif;letter-spacing:-.03em}</style>
    <div class="neb"></div><div class="grain"></div><div class="motes">${MOTES(8, 150, 57)}</div><img class="ic" src="${ICON(128)}"><div class="t">Lumen</div>`
}
function heroHTML(shot) {
  return `<style>${BASE_CSS}
    .shot{position:absolute;right:-110px;top:58px;width:1040px;border-radius:22px;transform:perspective(1800px) rotateY(-14deg) rotateX(4deg);transform-origin:100% 50%;
      box-shadow:0 0 0 1.5px rgba(255,255,255,.35),0 0 0 10px rgba(255,255,255,.06),0 50px 120px -20px rgba(10,0,40,.8),0 0 120px rgba(236,61,151,.35)}
    .ic{position:absolute;left:90px;top:126px;width:150px;height:150px;filter:drop-shadow(0 24px 34px rgba(20,0,60,.6))}
    .t{position:absolute;left:84px;top:300px;color:#fff;font:900 116px/.9 'Inter Display',sans-serif;letter-spacing:-.06em;text-shadow:0 6px 40px rgba(30,0,60,.4)}
    .t span{background:linear-gradient(100deg,#fff 20%,#ffd1ec 55%,#9ff1ff);-webkit-background-clip:text;color:transparent}
    .s{position:absolute;left:92px;top:430px;width:470px;color:rgba(255,255,255,.86);font:650 27px/1.3 'Inter',sans-serif;letter-spacing:-.01em}
    .k{position:absolute;left:92px;top:96px;color:rgba(255,255,255,.8);font:800 15px/1 'Inter',sans-serif;letter-spacing:.24em;text-transform:uppercase}</style>
    <div class="neb"></div><div class="pool" style="left:-100px;top:-200px;width:900px;height:500px"></div>
    <div class="grain"></div><div class="motes">${MOTES(60, 1600, 640, 1.4)}</div>
    ${shot ? `<img class="shot" src="${shot}">` : ''}
    <img class="ic" src="${ICON(512)}"><div class="t">Lumen <span>4</span></div>
    <div class="s">A browser that feels alive. Liquid glass, jelly motion, and zero clutter.</div>`
}
function docSvg(size) {
  // a glossy page with a folded corner, a colour band and the Lumen planet on it
  const ic = iconSvg('default', Math.max(64, size)).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
    <defs><linearGradient id="dp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eeeaff"/></linearGradient>
      <linearGradient id="db" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4d63ff"/><stop offset=".5" stop-color="#8a3ff0"/><stop offset="1" stop-color="#ec3d97"/></linearGradient>
      <linearGradient id="df" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d7cff8"/></linearGradient>
      <filter id="ds" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#1a0b4a" flood-opacity=".35"/></filter></defs>
    <g filter="url(#ds)"><path d="M220 80h420l200 200v604a60 60 0 0 1-60 60H220a60 60 0 0 1-60-60V140a60 60 0 0 1 60-60z" fill="url(#dp)"/></g>
    <path d="M640 80v140a60 60 0 0 0 60 60h140z" fill="url(#df)"/>
    <path d="M160 760h680v124a60 60 0 0 1-60 60H220a60 60 0 0 1-60-60z" fill="url(#db)"/>
    <path d="M160 760h680v40H160z" fill="#fff" fill-opacity=".25"/>
    <g transform="translate(262 250) scale(.49)">${ic}</g>
  </svg>`
}

// ---------- encoders: 24-bit BMP (NSIS), ICO with PNG frames, ICNS with PNG frames
function bmp24(img) {
  const { width: w, height: h } = img.getSize(), bgra = img.toBitmap()
  const row = Math.ceil(w * 3 / 4) * 4, size = 54 + row * h, b = Buffer.alloc(size)
  b.write('BM', 0); b.writeUInt32LE(size, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14)
  b.writeInt32LE(w, 18); b.writeInt32LE(h, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(row * h, 34)
  b.writeInt32LE(2835, 38); b.writeInt32LE(2835, 42)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((h - 1 - y) * w + x) * 4, d = 54 + y * row + x * 3
    b[d] = bgra[s]; b[d + 1] = bgra[s + 1]; b[d + 2] = bgra[s + 2]
  }
  return b
}
function ico(frames) { // frames: [[size, pngBuffer]]
  const head = Buffer.alloc(6 + 16 * frames.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(frames.length, 4)
  let off = head.length
  frames.forEach(([s, png], i) => {
    const e = 6 + i * 16; head[e] = s >= 256 ? 0 : s; head[e + 1] = s >= 256 ? 0 : s; head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6)
    head.writeUInt32LE(png.length, e + 8); head.writeUInt32LE(off, e + 12); off += png.length
  })
  return Buffer.concat([head, ...frames.map(f => f[1])])
}
function icns(frames) { // frames: [[type, pngBuffer]]
  const parts = frames.map(([t, png]) => { const h = Buffer.alloc(8); h.write(t, 0, 'ascii'); h.writeUInt32BE(png.length + 8, 4); return Buffer.concat([h, png]) })
  const total = 8 + parts.reduce((a, p) => a + p.length, 0), h = Buffer.alloc(8); h.write('icns', 0, 'ascii'); h.writeUInt32BE(total, 4)
  return Buffer.concat([h, ...parts])
}

app.whenReady().then(async () => {
  const out = (rel, buf) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); console.log('wrote', rel, buf.length) }
  const prev = (name, img) => { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, name), img.toPNG()) }
  async function page(html, w, h) {
    const win = new BrowserWindow({ show: false, width: w, height: h, useContentSize: true, frame: false, transparent: true, webPreferences: { offscreen: true } })
    win.webContents.setFrameRate(1)
    const tmp = path.join(require('os').tmpdir(), 'lumen-art-' + process.pid + '.html')
    fs.writeFileSync(tmp, '<!doctype html><meta charset="utf-8">' + html)
    await win.loadFile(tmp)
    await win.webContents.executeJavaScript('Promise.all([...document.images].map(i => i.decode().catch(() => {}))).then(() => document.fonts.ready).then(() => new Promise(r => setTimeout(r, 300)))')
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: w, height: h })
    win.destroy()
    // a window wider than the screen gets clamped, and stretching the capture back squashes everything: refuse instead
    const got = img.getSize(); if (got.width !== w && Math.abs(got.width / got.height - w / h) > .01) throw new Error(`captured ${got.width}x${got.height} for ${w}x${h}: run under a screen at least ${w}px wide (xvfb-run -s '-screen 0 2560x1600x24')`)
    return got.width === w ? img : img.resize({ width: w, height: h, quality: 'best' })
  }
  const rasterWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await rasterWin.loadURL('data:text/html,<body></body>')
  const raster = async (s, size) => Buffer.from((await rasterWin.webContents.executeJavaScript(`new Promise((ok, no) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = ${size}; c.getContext('2d').drawImage(img, 0, 0, ${size}, ${size}); ok(c.toDataURL('image/png')) }; img.onerror = () => no(new Error('svg')); img.src = 'data:image/svg+xml;base64,${b64(s)}' })`)).split(',')[1], 'base64')

  // Mac DMG background, 1x and 2x
  for (const s of [1, 2]) {
    const img = await page(dmgHTML(s), 660 * s, 420 * s)
    out(`build/dmg/background${s === 2 ? '@2x' : ''}.png`, img.toPNG())
    if (s === 1) prev('41-sweep-dmg-background.png', img)
  }
  // Windows NSIS
  const side = await page(sidebarHTML(false), 164, 314); out('build/nsis/installerSidebar.bmp', bmp24(side)); prev('41-sweep-nsis-sidebar.png', side)
  const uside = await page(sidebarHTML(true), 164, 314); out('build/nsis/uninstallerSidebar.bmp', bmp24(uside)); prev('41-sweep-nsis-uninstall-sidebar.png', uside)
  const head = await page(headerHTML(), 150, 57); out('build/nsis/installerHeader.bmp', bmp24(head)); prev('41-sweep-nsis-header.png', head)
  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const appFrames = []; for (const s of sizes) appFrames.push([s, await raster(iconSvg('default', s), s)])
  out('build/nsis/installerIcon.ico', ico(appFrames))
  // the uninstaller: the same icon with a small round badge that says "out"
  const unSvg = s => iconSvg('default', s).replace(/<\/svg>\s*$/, `<g><circle cx="790" cy="790" r="170" fill="#fff"/><circle cx="790" cy="790" r="146" fill="#ec3d97"/><path d="M720 790h140" stroke="#fff" stroke-width="44" stroke-linecap="round"/></g></svg>`)
  const unFrames = []; for (const s of sizes) unFrames.push([s, await raster(unSvg(s), s)])
  out('build/nsis/uninstallerIcon.ico', ico(unFrames))
  // document icon
  const icTypes = [['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024]]
  const docPng = {}; for (const [, s] of icTypes) docPng[s] = await raster(docSvg(s), s)
  out('build/doc/document.icns', icns(icTypes.map(([t, s]) => [t, docPng[s]])))
  const docIco = []; for (const s of sizes) docIco.push([s, docPng[s] || await raster(docSvg(s), s)])
  out('build/doc/document.ico', ico(docIco))
  fs.writeFileSync(path.join(SHOTS, '41-sweep-doc-icon.png'), docPng[512])
  fs.writeFileSync(path.join(SHOTS, '41-sweep-nsis-uninstaller-icon.png'), unFrames[unFrames.length - 1][1])
  // release hero
  const shot = fs.existsSync(SHOT) ? require('url').pathToFileURL(SHOT).href : ''
  const hero = await page(heroHTML(shot), 1600, 640)
  out('docs/release/4.0-hero.png', hero.toPNG()); prev('41-sweep-release-hero.png', hero)
  app.quit()
}).catch(e => { console.error(e); app.exit(1) })
