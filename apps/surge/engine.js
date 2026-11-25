/* ===================== Surge glow engine v2 =====================
   Everything moves:
   • FLOW   — two counter-rotating conic gradients with crisp, saturated
              colour bands travel around the perimeter at different speeds
   • RIPPLE — the edge thickness breathes in a travelling wave
   • IGNITE / BLOOM / REST / FADE envelope, spring capsule
   Shared by the overlay, the settings preview and the website.
================================================================== */
(function (root) {
  const PALETTES = {
    aurora: ['#00FF85', '#00E5A0', '#39FF14', '#00C97A', '#00FF85'],   // plug-in = green
    ember:  ['#FF3B1F', '#FF9500', '#FF2D7A', '#FFD60A', '#FF3B1F'],
    ice:    ['#7DF9FF', '#3E7BFF', '#B388FF', '#D6FBFF', '#7DF9FF'],
    unplug: ['#FF7A00', '#FFB800', '#FF4D1F', '#FFD37A', '#FF7A00'],
    low:    ['#FF1744', '#FF4D6D', '#C70039', '#FF8A80', '#FF1744'],
    full:   ['#FFD60A', '#FFF176', '#FFB300', '#FFE97A', '#FFD60A'],
    info:   ['#7DF9FF', '#3E7BFF', '#B388FF', '#D6FBFF', '#7DF9FF'],
    warn:   ['#FFB300', '#FF7A00', '#FFD60A', '#FF9500', '#FFB300'],
    hud:    ['#8E8E9C', '#B0B0BC', '#8E8E9C', '#B0B0BC', '#8E8E9C'],
  };
  // charge tint: 0% → 100%
  const TINT = [
    [0,   ['#FF1744', '#FF3DF0', '#FF2D7A', '#FF6E40', '#FF1744']],
    [35,  ['#FF6D00', '#FFB300', '#FF3D7A', '#FF8F00', '#FF6D00']],
    [65,  ['#7CFF4D', '#C6FF00', '#39FF14', '#00E676', '#7CFF4D']],
    [100, ['#00FF85', '#00E5A0', '#39FF14', '#00C97A', '#00FF85']],
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const spring = (t, s = 5.5, d = 0.5) => 1 - Math.exp(-s * t) * Math.cos(d * 12 * t);

  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return [0, 1, 2].map(i => Math.round(lerp(A[i], B[i], t))); }
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function brighten(c, k) { return c.map(v => Math.round(clamp(v + (255 - v) * k, 0, 255))); }

  function paletteFor(kind, level, S) {
    if (PALETTES[kind] && kind !== 'aurora' && kind !== 'ember' && kind !== 'ice') return PALETTES[kind];
    if (S.theme === 'ember' || S.theme === 'ice') return PALETTES[S.theme];
    if (S.theme === 'solid') {
      const c = S.color || '#00D4FF'; const r = hex2rgb(c);
      const hi = '#' + brighten(r, 0.45).map(v => v.toString(16).padStart(2, '0')).join('');
      const lo = '#' + r.map(v => Math.round(v * 0.75)).map(v => v.toString(16).padStart(2, '0')).join('');
      return [c, hi, c, lo, c];
    }
    if (!S.batteryColor) return PALETTES.aurora;
    // battery tint
    const L = clamp(level, 0, 100);
    for (let i = 1; i < TINT.length; i++) {
      if (L <= TINT[i][0]) {
        const t = (L - TINT[i - 1][0]) / (TINT[i][0] - TINT[i - 1][0]);
        return TINT[i - 1][1].map((c, k) => '#' + mix(c, TINT[i][1][k], t).map(v => v.toString(16).padStart(2, '0')).join(''));
      }
    }
    return TINT[TINT.length - 1][1];
  }

  function create(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    const S = Object.assign({ theme: 'aurora', color: '#00FF85', batteryColor: false, intensity: 0.9, thickness: 150, duration: 3.6, showCapsule: true, speed: 1 }, opts.settings);
    let W = 0, H = 0, dpr = 1, anim = null, raf = 0, scrub = null, stopped = false, loopT = 0;
    const loop = opts.loop ?? false, gap = opts.gap ?? 1500, refW = opts.refWidth ?? 1440;
    const onDone = opts.onDone || (() => {});

    function size() {
      const r = canvas.getBoundingClientRect();
      const w = r.width || canvas.width, h = r.height || canvas.height;
      dpr = Math.min(root.devicePixelRatio || 1, opts.maxDpr ?? 1.5);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = w; H = h;
    }
    function perimeter(inset, r) {
      const x = inset, y = inset, w = W - inset * 2, h = H - inset * 2, p = new Path2D();
      p.moveTo(x + w / 2, y + h); p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r);
      p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r);
      p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r); p.closePath();
      return { p, L: 2 * (w + h) - 8 * r + 2 * Math.PI * r };
    }
    /** point on the rectangle edge; prog 0 = bottom centre, increases clockwise (right → up → left → down) */
    function edgePoint(prog) {
      const per = 2 * (W + H); let d = ((prog % 1 + 1) % 1) * per + W / 2;
      d %= per;
      if (d < W) return [d, H];              // bottom, left→right
      d -= W; if (d < H) return [W, H - d];  // right, up
      d -= H; if (d < W) return [W - d, 0];  // top, right→left
      d -= W; return [0, d];                 // left, down
    }
    function flowGradient(pal, angle, alpha, bands = 2) {
      const g = ctx.createConicGradient(angle, W / 2, H / 2);
      const n = (pal.length - 1) * bands;
      for (let i = 0; i <= n; i++) { const c = hex2rgb(pal[i % (pal.length - 1)]); g.addColorStop(i / n, rgba(c, alpha)); }
      return g;
    }

    function fire(kind = 'plug', level = 67, extra = {}) {
      kind = kind === 'preview' ? 'plug' : kind;
      const dur = kind === 'low' ? 2.8 : kind === 'unplug' ? Math.max(1.8, S.duration * 0.7) : kind === 'full' ? S.duration * 1.2 : kind === 'hud' ? 1.6 : (kind === 'info' || kind === 'warn') ? Math.max(2, S.duration * 0.8) : S.duration;
      let pal = paletteFor(kind, level, S);
      if (extra.hud?.color && kind !== 'hud') { /* keep event palette */ } else if (extra.hud?.color) { const c = extra.hud.color; pal = [c, c, c, c, c]; }
      anim = { t0: performance.now(), kind, level, pal, dur, hud: extra.hud || null }; stopped = false; clearTimeout(loopT);
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    }

    // low-res offscreen canvas for everything soft (blur is ~free at 1/6 scale, and upscaling blurs further)
    const lo = document.createElement('canvas'), lx = lo.getContext('2d');
    let lastT = 0;

    function draw(t) {
      size(); ctx.clearRect(0, 0, W, H);
      const { kind, pal, dur, level } = anim;
      const sc = W / refW, thick = clamp(S.thickness, 40, 400) * sc, inten = clamp(S.intensity, 0.1, 1), spd = S.speed || 1;

      // ---- envelope: ignite (sweep from port) → bloom → rest → fade. All eased, nothing snaps.
      const ig = kind === 'unplug' ? 0.6 : 0.9;
      const sweep = easeOutExpo(clamp(t / ig, 0, 1));
      const fadeLen = Math.min(1.1, dur * 0.3), fs = dur - fadeLen;
      const env = t < fs ? 1 : easeInOutCubic(clamp(1 - (t - fs) / fadeLen, 0, 1));
      const settle = 1 - 0.12 * clamp((t - ig) / 1.2, 0, 1);           // bloom slightly brighter, then rests
      const breathe = 1 - 0.06 * (0.5 - 0.5 * Math.cos(t * 1.9));        // slow, gentle
      const pulse = kind === 'low' ? 0.55 + 0.45 * (0.5 - 0.5 * Math.cos(t * 5.2)) : 1;
      const A = env * inten * settle * breathe * pulse;
      const c0 = hex2rgb(pal[0]), c3 = hex2rgb(pal[3]);
      const r = Math.min(W, H) * 0.045 + 6;

      if (kind === 'hud') { if (S.showCapsule !== false) capsule(t, dur, A, sc, pal, level, kind); return; }
      // ================= soft layers (offscreen, low-res) =================
      const K = 6; // downscale factor
      const lw = Math.max(64, Math.round(W / K)), lh = Math.max(40, Math.round(H / K));
      if (lo.width !== lw || lo.height !== lh) { lo.width = lw; lo.height = lh; }
      lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, lw, lh);
      const k = lw / W, tk = thick * k, rk = r * k;
      const loPath = (inset, rad) => { const x = inset, y = inset, w = lw - inset * 2, h = lh - inset * 2, p = new Path2D(); p.moveTo(x + w / 2, y + h); p.lineTo(x + rad, y + h); p.arcTo(x, y + h, x, y + h - rad, rad); p.lineTo(x, y + rad); p.arcTo(x, y, x + rad, y, rad); p.lineTo(x + w - rad, y); p.arcTo(x + w, y, x + w, y + rad, rad); p.lineTo(x + w, y + h - rad); p.arcTo(x + w, y + h, x + w - rad, y + h, rad); p.closePath(); return { p, L: 2 * (w + h) - 8 * rad + 2 * Math.PI * rad }; };
      const loGrad = (angle, alpha, bands) => { const g = lx.createConicGradient(angle, lw / 2, lh / 2); const n = (pal.length - 1) * bands; for (let i = 0; i <= n; i++) { const c = hex2rgb(pal[i % (pal.length - 1)]); g.addColorStop(i / n, rgba(c, alpha)); } return g; };
      lx.save(); lx.lineCap = 'round'; lx.lineJoin = 'round'; lx.globalCompositeOperation = 'screen';
      // 1. wide bleed — slow flow, gentle ripple
      { const pr = loPath(-tk * 0.55, Math.max(rk, 2)); lx.save();
        if (sweep < 1) { const seg = pr.L * sweep; lx.setLineDash([seg / 2, pr.L - seg, seg / 2, pr.L * 4]); lx.lineDashOffset = 0; }
        lx.lineWidth = tk * 1.7 * (1 + 0.06 * Math.sin(t * 1.7 * spd)); lx.filter = `blur(${Math.max(1, tk * 0.45)}px)`;
        lx.strokeStyle = loGrad(t * 0.8 * spd, 0.5 * A, 1); lx.stroke(pr.p); lx.restore(); }
      // 2. main band — counter-flow, this is the visible motion
      { const pr = loPath(-tk * 0.08, Math.max(rk, 2)); lx.save();
        if (sweep < 1) { const seg = pr.L * sweep; lx.setLineDash([seg / 2, pr.L - seg, seg / 2, pr.L * 4]); lx.lineDashOffset = 0; }
        lx.lineWidth = tk * 0.45 * (1 + 0.08 * Math.sin(t * 2.3 * spd + 1)); lx.filter = `blur(${Math.max(0.5, tk * 0.12)}px)`;
        lx.strokeStyle = loGrad(-t * 1.4 * spd + 2, 0.95 * A, 2); lx.stroke(pr.p); lx.restore(); }
      // 3. ignition seed: a bright bloom at the port that expands as the sweep leaves it
      if (t < ig * 1.6) { const g = lx.createRadialGradient(lw / 2, lh, 0, lw / 2, lh, tk * (1.2 + sweep * 2)); const sa = (1 - clamp((t - ig * 0.6) / ig, 0, 1)) * A;
        g.addColorStop(0, rgba(brighten(c3, 0.6), sa)); g.addColorStop(0.5, rgba(c3, sa * 0.35)); g.addColorStop(1, rgba(c3, 0)); lx.fillStyle = g; lx.fillRect(0, 0, lw, lh); }
      // 4. port wash — light leaking up from the charger
      { const g = lx.createRadialGradient(lw / 2, lh + tk * 0.6, 0, lw / 2, lh + tk * 0.6, Math.max(lw, lh) * 0.55);
        g.addColorStop(0, rgba(c3, 0.2 * A)); g.addColorStop(0.5, rgba(c0, 0.05 * A)); g.addColorStop(1, rgba(c0, 0)); lx.fillStyle = g; lx.fillRect(0, 0, lw, lh); }
      lx.restore();
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(lo, 0, 0, W, H); ctx.restore();

      // ================= crisp core (full res, no filters) =================
      { const pr = perimeter(1, r); ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'screen';
        if (sweep < 1) { const seg = pr.L * sweep; ctx.setLineDash([seg / 2, pr.L - seg, seg / 2, pr.L * 4]); ctx.lineDashOffset = 0; }
        const bright = pal.map(p => '#' + brighten(hex2rgb(p), 0.35).map(v => v.toString(16).padStart(2, '0')).join(''));
        const g = ctx.createConicGradient(-t * 1.4 * spd + 2, W / 2, H / 2); const n = (bright.length - 1) * 2;
        for (let i = 0; i <= n; i++) g.addColorStop(i / n, rgba(hex2rgb(bright[i % (bright.length - 1)]), A));
        ctx.lineWidth = Math.max(2, 7 * sc); ctx.globalAlpha = 0.35; ctx.strokeStyle = g; ctx.stroke(pr.p);   // soft halo
        ctx.lineWidth = Math.max(1.25, 2.5 * sc); ctx.globalAlpha = 1; ctx.stroke(pr.p);                     // hairline
        ctx.restore(); }

      // ================= v2.20: inner light, comets, shockwave =================
      { ctx.save(); ctx.globalCompositeOperation = 'screen';
        const il = thick * 0.95, strip = (x0, y0, x1, y1, rx, ry, rw, rh) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, rgba(c3, 0.17 * A)); g.addColorStop(0.45, rgba(c0, 0.05 * A)); g.addColorStop(1, rgba(c0, 0)); ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh); };
        strip(0, H, 0, H - il, 0, H - il, W, il); strip(0, 0, 0, il, 0, 0, W, il); strip(0, 0, il, 0, 0, 0, il, H); strip(W, 0, W - il, 0, W - il, 0, il, H);
        if (sweep > 0.55) { const hot = brighten(c3, 0.65), n = 3, sp = (kind === 'low' ? 0.34 : 0.17) * spd;
          for (let i = 0; i < n; i++) { const head = t * sp + i / n; ctx.fillStyle = rgba(hot, 1);
            for (let j = 0; j < 30; j++) { const q = edgePoint(head - j * 0.0016), f = 1 - j / 30; ctx.globalAlpha = Math.min(1, A * f * f * f * 0.55); ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(1, (8 - j * 0.22) * sc), 0, 6.2832); ctx.fill(); }
            const q = edgePoint(head), rr = 46 * sc, g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr); g.addColorStop(0, rgba(hot, 0.85 * A)); g.addColorStop(0.35, rgba(c3, 0.3 * A)); g.addColorStop(1, rgba(c3, 0)); ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(q[0] - rr, q[1] - rr, rr * 2, rr * 2); } }
        if ((kind === 'plug' || kind === 'full') && t < 1.5) { const p = easeOutExpo(clamp(t / 1.5, 0, 1)), a = Math.pow(1 - p, 1.6) * A; ctx.globalAlpha = 1; ctx.strokeStyle = rgba(brighten(c3, 0.5), 0.55 * a); ctx.lineWidth = Math.max(2, (34 * (1 - p) + 2) * sc); ctx.beginPath(); ctx.arc(W / 2, H, p * Math.max(W, H) * 0.95, 0, 6.2832); ctx.stroke(); }
        ctx.restore(); }

      if (S.showCapsule) capsule(t, dur, A, sc, pal, level, kind);
    }

    // ---- Lumen Nova capsules (tools/glow/capsule.js, put in by tools/import-apps.py) ----
    // The on-screen messages ("CAPS LOCK ON", "Copied", "Break time", the hourly chime, snap zones) and the battery capsule,
    // drawn as a pill of liquid glass in your Lumen accent: deep ink body, specular top light, a caustic glow at the
    // bottom, a refractive rim with a faint chromatic fringe, one light sweep as it lands, rounded heavy type.
    // 4.0: the battery capsule is a Nova island (a liquid charge orb that fills to your level, a big percent that counts
    // up, a ten-segment meter that lights to your level) and every message gets a glowing icon tile picked from its words
    // (Caps Lock, Copied, breaks, the chime, sound, focus...) with an On or Off chip where it fits. All of it lives only
    // as long as the capsule is on screen: nothing loops.
    // The full-screen edge glow around them is unchanged.
    function novaCols() {
      let a = '#5b8cff';
      try { const v = getComputedStyle(document.documentElement).getPropertyValue('--lumen-a').trim(); if (/^#[0-9a-f]{6}$/i.test(v)) a = v; } catch {}
      if (novaCols.k === a) return novaCols.v;
      const [r, g, b] = hex2rgb(a).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
      const s = dd ? dd / (1 - Math.abs(2 * l - 1)) : 0; let h = !dd ? 0 : mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60;
      const rot = deg => { const H = ((h + deg) % 360 + 360) % 360, C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((H / 60) % 2 - 1)), m = l - C / 2;
        const [R, G, B] = H < 60 ? [C, X, 0] : H < 120 ? [X, C, 0] : H < 180 ? [0, C, X] : H < 240 ? [0, X, C] : H < 300 ? [X, 0, C] : [C, 0, X]; return [R, G, B].map(v => Math.round((v + m) * 255)); };
      novaCols.k = a; novaCols.v = [hex2rgb(a), rot(40), rot(95)]; return novaCols.v;
    }
    // the meaning of a message's colour stays (amber for warnings, red for trouble, grey for "off"); happy and neutral ones take your accent
    function novaDot(hex) {
      const [A, A2, A3] = novaCols(); const c = hex ? hex2rgb(hex) : A;
      const warm = c[0] > 200 && c[1] > 120 && c[2] < 120, red = c[0] > 200 && c[1] < 110, grey = Math.abs(c[0] - c[1]) < 16 && Math.abs(c[1] - c[2]) < 24 && c[0] < 200;
      if (warm) return [[255, 196, 74], [255, 150, 60]]; if (red) return [[255, 92, 110], [255, 60, 90]]; if (grey) return [[200, 204, 220], [150, 156, 176]];
      return [brighten(A, .1), A3];
    }
    function glassPill(cw, ch, k, t, al, A, A3, glowCol) {
      const x = -cw / 2, y = -ch / 2, r = ch / 2;
      const pill = () => { ctx.beginPath(); ctx.roundRect(x, y, cw, ch, r); };
      // outer glow in the accent, then a soft drop shadow
      ctx.save(); pill(); ctx.shadowColor = rgba(glowCol, .55 * al); ctx.shadowBlur = 34 * k; ctx.shadowOffsetY = 0; ctx.fillStyle = 'rgba(10,12,21,.92)'; ctx.fill();
      ctx.shadowColor = 'rgba(0,0,10,.55)'; ctx.shadowBlur = 26 * k; ctx.shadowOffsetY = 12 * k; ctx.fill(); ctx.restore();
      // body: deep ink glass
      const body = ctx.createLinearGradient(0, y, 0, y + ch); body.addColorStop(0, 'rgba(34,39,64,.95)'); body.addColorStop(1, 'rgba(11,13,24,.96)');
      pill(); ctx.fillStyle = body; ctx.fill();
      ctx.save(); pill(); ctx.clip();
      // caustic: accent light pooled at the bottom, and a second tint at the top right
      let g = ctx.createRadialGradient(0, y + ch * 1.05, 0, 0, y + ch * 1.05, cw * .55); g.addColorStop(0, rgba(A, .42)); g.addColorStop(.5, rgba(A, .12)); g.addColorStop(1, rgba(A, 0)); ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
      g = ctx.createRadialGradient(x + cw * .9, y, 0, x + cw * .9, y, cw * .4); g.addColorStop(0, rgba(A3, .3)); g.addColorStop(1, rgba(A3, 0)); ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
      // specular top light
      g = ctx.createLinearGradient(0, y, 0, y + ch * .55); g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(.35, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch * .55);
      // one light sweep as it lands
      const sw = clamp((t - .12) / .9, 0, 1); if (sw > 0 && sw < 1) { const sx = x - cw * .4 + sw * cw * 1.8; g = ctx.createLinearGradient(sx - ch, 0, sx + ch, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${.22 * Math.sin(sw * Math.PI)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([1, 0, -.35, 1, 0, 0]))); ctx.fillRect(x - ch, y, cw + ch * 2, ch); }
      ctx.restore();
      // refractive rim with a faint chromatic fringe
      ctx.save(); ctx.lineWidth = 1 * k;
      ctx.translate(-.6 * k, 0); pill(); ctx.strokeStyle = 'rgba(255,90,150,.22)'; ctx.stroke();
      ctx.translate(1.2 * k, 0); pill(); ctx.strokeStyle = 'rgba(90,210,255,.22)'; ctx.stroke(); ctx.restore();
      const rim = ctx.createLinearGradient(x, y, x + cw, y + ch); rim.addColorStop(0, rgba(A, .95)); rim.addColorStop(.32, 'rgba(255,255,255,.22)'); rim.addColorStop(.55, 'rgba(255,255,255,.04)'); rim.addColorStop(.8, 'rgba(255,255,255,.12)'); rim.addColorStop(1, rgba(A3, .9));
      pill(); ctx.lineWidth = 1.4 * k; ctx.strokeStyle = rim; ctx.stroke();
    }
    const NOVA_FONT = (w, px) => `${w} ${px}px ui-rounded, "SF Pro Rounded", "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif`;

    // line icons on a 24 grid (SVG path data), drawn with Path2D; several strokes are split by |
    const GLYPH = {
      bolt: 'M13 2 4 14h7l-1 8 9-12h-7z', caps: 'M12 4.5 5 12h4v4.5h6V12h4z|M8.5 20h7', copy: 'M8.5 8.5h10v11.5h-10z|M15.5 8.5V5.5a1.5 1.5 0 0 0-1.5-1.5H6a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 6 15h2.5',
      cup: 'M4.5 9.5h11v4.5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z|M15.5 10.5H17a2.5 2.5 0 0 1 0 5h-1.5|M8 3.5v3M11.5 3.5v3', bell: 'M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z|M10 20.5a2 2 0 0 0 4 0',
      mute: 'M11 5 6.5 9H3.5v6h3L11 19z|M16 9.5l5 5M21 9.5l-5 5', sound: 'M11 5 6.5 9H3.5v6h3L11 19z|M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13', timer: 'M12 21a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z|M12 9.5v4l2.5 2M9.5 2.5h5',
      moon: 'M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z', wifi: 'M2.5 9a14 14 0 0 1 19 0|M5.5 12.5a9.5 9.5 0 0 1 13 0|M8.7 16a5 5 0 0 1 6.6 0|M12 19.5h.1', check: 'M5 12.5l4.5 4.5L19 7.5',
      spark: 'M12 3.5 14 9l5.5 2-5.5 2-2 5.5-2-5.5L4.5 11 10 9z', eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z|M12 14.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6z',
      grid: 'M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z',
    };
    const P2 = {}; const path2 = d => P2[d] || (P2[d] = new Path2D(d));
    function glyph(name, cx, cy, size, col, fill) {
      ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(size / 24, size / 24);
      ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.fillStyle = col;
      for (const d of (GLYPH[name] || GLYPH.spark).split('|')) { const p = path2(d); if (fill) ctx.fill(p); ctx.stroke(p); }
      ctx.restore();
    }
    function hudKind(text) {
      const s = String(text).toLowerCase();
      if (/caps/.test(s)) return 'caps'; if (/cop(y|ied)|clipboard|paste/.test(s)) return 'copy'; if (/break|stretch|rest|stand/.test(s)) return 'cup';
      if (/o.?clock|chime|hour/.test(s)) return 'bell'; if (/mute|silent/.test(s)) return 'mute'; if (/sound|volume|unmute/.test(s)) return 'sound';
      if (/focus|timer|pomodoro|\d+:\d+/.test(s)) return 'timer'; if (/dark|night|tint/.test(s)) return 'moon'; if (/online|offline|network|wi-?fi|connect/.test(s)) return 'wifi';
      if (/awake|caffeine/.test(s)) return 'cup'; if (/spotlight/.test(s)) return 'eye'; if (/snap|zone|window/.test(s)) return 'grid'; if (/saved|done|ready/.test(s)) return 'check';
      return 'spark';
    }
    // a glowing gradient icon tile (a small squircle of glass) with a white glyph
    function iconTile(cx, cy, sz, c0, c1, name, k, al, fill) {
      const r = sz * .32, x = cx - sz / 2, y = cy - sz / 2;
      ctx.save(); ctx.shadowColor = rgba(c0, .75 * al); ctx.shadowBlur = 18 * k; ctx.beginPath(); ctx.roundRect(x, y, sz, sz, r);
      let g = ctx.createLinearGradient(x, y, x + sz, y + sz); g.addColorStop(0, rgba(brighten(c0, .12))); g.addColorStop(1, rgba(c1)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, sz, sz, r); ctx.clip();
      g = ctx.createRadialGradient(cx - sz * .2, y, 0, cx - sz * .2, y, sz * .8); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.45, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, sz, sz);
      g = ctx.createLinearGradient(0, y + sz * .6, 0, y + sz); g.addColorStop(0, 'rgba(0,0,30,0)'); g.addColorStop(1, 'rgba(0,0,30,.22)'); ctx.fillStyle = g; ctx.fillRect(x, y, sz, sz);
      ctx.restore();
      ctx.beginPath(); ctx.roundRect(x + .5 * k, y + .5 * k, sz - k, sz - k, r - .5 * k); ctx.lineWidth = 1 * k; ctx.strokeStyle = 'rgba(255,255,255,.38)'; ctx.stroke();
      ctx.save(); ctx.shadowColor = 'rgba(0,0,40,.35)'; ctx.shadowBlur = 4 * k; ctx.shadowOffsetY = 1 * k; glyph(name, cx, cy, sz * .56, '#fff', fill); ctx.restore();
    }

    function capsule(t, dur, A, sc, pal, level, kind) {
      if (anim.hud) return drawHud(t, dur, A, sc, pal, anim.hud);
      const inT = clamp(t / 0.9, 0, 1), outT = clamp((t - (dur - 0.75)) / 0.75, 0, 1);
      const sIn = spring(inT), sOut = 1 - easeInOutCubic(outT);
      const scale = lerp(0.74, 1, Math.min(sIn, 1.035)) * lerp(1, 0.92, 1 - sOut), al = Math.min(inT * 1.6, 1) * sOut;
      if (al <= 0) return;
      const k = sc * (opts.capsuleScale ?? 1), [NA, , NA3] = novaCols();
      const c0 = hex2rgb(pal[0]), c1 = hex2rgb(pal[1]), lv = clamp(level, 0, 100);
      const label = kind === 'low' ? 'Low battery' : kind === 'unplug' ? 'Unplugged' : (kind === 'full' || level >= 100) ? 'Fully charged' : 'Charging';
      ctx.save(); ctx.font = NOVA_FONT(800, 34 * k); const pw = ctx.measureText('100%').width; ctx.font = NOVA_FONT(750, 13 * k); const lbw = ctx.measureText(label).width; ctx.restore();
      const ch = 96 * k, orbR = 32 * k, segW = 11 * k, segG = 4 * k, segs = 10, meterW = segs * segW + (segs - 1) * segG;
      const cw = ch + 8 * k + Math.max(pw + 12 * k + lbw, meterW) + 34 * k, cx = W / 2, cy = H - 132 * k + (1 - sIn) * 40 * k;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.globalAlpha = al;
      glassPill(cw, ch, k, t, al, NA, NA3, c0);
      // the charge orb: a glass sphere that fills with liquid up to your level, its surface waving as it lands
      const ox = -cw / 2 + ch / 2 + 2 * k, fillK = easeOutExpo(inT) * lv / 100, ir = orbR - 2.5 * k;
      ctx.save(); ctx.shadowColor = rgba(c0, .7); ctx.shadowBlur = 22 * k; ctx.beginPath(); ctx.arc(ox, 0, orbR, 0, Math.PI * 2); { const og = ctx.createRadialGradient(ox, -orbR * .2, 0, ox, 0, orbR); og.addColorStop(0, rgba(NA, .32)); og.addColorStop(.7, 'rgba(16,20,40,.92)'); og.addColorStop(1, 'rgba(8,10,22,.95)'); ctx.fillStyle = og; } ctx.fill(); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(ox, 0, ir, 0, Math.PI * 2); ctx.clip();
      const top = ir - fillK * ir * 2, amp = (1 - clamp((t - .4) / 1.6, 0, 1)) * 4.5 * k + 1.2 * k;
      for (let layer = 1; layer >= 0; layer--) {
        ctx.beginPath(); ctx.moveTo(ox - orbR, orbR);
        for (let i = 0; i <= 24; i++) { const x = ox - orbR + i / 24 * orbR * 2, y = top + Math.sin(i / 24 * Math.PI * 2 * 1.3 + t * (4 + layer * 1.7) + layer * 2) * amp * (layer ? .7 : 1) - layer * 2 * k; ctx.lineTo(x, y); }
        ctx.lineTo(ox + orbR, orbR); ctx.closePath();
        const lg = ctx.createLinearGradient(0, top - 4 * k, 0, orbR); lg.addColorStop(0, rgba(brighten(c1, .35), layer ? .5 : .95)); lg.addColorStop(1, rgba(c0, layer ? .4 : .95)); ctx.fillStyle = lg; ctx.fill();
      }
      let g = ctx.createRadialGradient(ox - orbR * .35, -orbR * .5, 0, ox - orbR * .35, -orbR * .5, orbR * 1.1); g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(.35, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(ox - orbR, -orbR, orbR * 2, orbR * 2);
      ctx.restore();
      ctx.beginPath(); ctx.arc(ox, 0, orbR - 1.2 * k, 0, Math.PI * 2); ctx.lineWidth = 2.2 * k; g = ctx.createLinearGradient(ox - orbR, -orbR, ox + orbR, orbR); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(.5, rgba(c0, .5)); g.addColorStop(1, rgba(NA3, .7)); ctx.strokeStyle = g; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(ox - orbR * .38, -orbR * .52, orbR * .3, orbR * .13, -.6, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
      ctx.save(); ctx.shadowColor = 'rgba(0,0,40,.6)'; ctx.shadowBlur = 6 * k; glyph('bolt', ox, 0, 26 * k, '#fff', true); ctx.restore();
      // the percent (it counts up as the capsule lands), the state, and a ten-segment meter that lights up to your level
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; const tx = ox + orbR + 20 * k;
      try { ctx.letterSpacing = `${-1 * k}px`; } catch {}
      ctx.font = NOVA_FONT(800, 34 * k); g = ctx.createLinearGradient(0, -34 * k, 0, 0); g.addColorStop(0, '#fff'); g.addColorStop(1, rgba(brighten(NA3, .5))); ctx.fillStyle = g;
      const shown = Math.round(lerp(0, level, easeOutExpo(inT))); ctx.fillText(`${shown}%`, tx, 2 * k);
      const lw = ctx.measureText(`${shown}%`).width;
      try { ctx.letterSpacing = '0px'; } catch {}
      ctx.font = NOVA_FONT(750, 13 * k); ctx.fillStyle = rgba(brighten(c1, 0.55), .95); ctx.fillText(label, tx + lw + 12 * k, -1 * k);
      const my = 14 * k, lit = lv / 10;
      for (let i = 0; i < segs; i++) {
        const x = tx + i * (segW + segG), on = clamp(lit - i, 0, 1) * clamp((inT * 1.6 - i * .06) * 2, 0, 1);
        ctx.beginPath(); ctx.roundRect(x, my, segW, 7 * k, 3.5 * k); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill();
        if (on > 0) { ctx.save(); ctx.globalAlpha = al * on; ctx.shadowColor = rgba(c0, .9); ctx.shadowBlur = 8 * k; ctx.beginPath(); ctx.roundRect(x, my, segW, 7 * k, 3.5 * k); g = ctx.createLinearGradient(x, my, x, my + 7 * k); g.addColorStop(0, rgba(brighten(c1, .5))); g.addColorStop(1, rgba(c0)); ctx.fillStyle = g; ctx.fill(); ctx.restore(); }
      }
      ctx.restore();
    }

    function drawHud(t, dur, A, sc, pal, hud) {
      // a glass island with a glowing icon tile picked from the message, the words, and an On or Off chip where it fits
      const inT = clamp(t / 0.6, 0, 1), outT = clamp((t - (dur - 0.5)) / 0.5, 0, 1);
      const sIn = spring(inT), al = Math.min(inT * 1.8, 1) * (1 - easeInOutCubic(outT));
      if (al <= 0) return;
      const k = sc * (opts.capsuleScale ?? 1), [NA, NA2, NA3] = novaCols(), [d0, d1] = novaDot(hud.color || pal[0]);
      const raw = String(hud.text || ''), m = /^(.*?)\s+(on|off)$/i.exec(raw), title = m ? m[1] : raw, chip = m ? m[2].toUpperCase() : '';
      const name = hudKind(raw), plain = name === 'caps' || !hud.color || /^#8e8e9c$/i.test(hud.color), tileC0 = plain ? NA : d0, tileC1 = plain ? NA3 : d1;
      ctx.save(); ctx.font = NOVA_FONT(800, 19 * k); try { ctx.letterSpacing = `${-.3 * k}px`; } catch {} ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const tw = ctx.measureText(title).width; ctx.font = NOVA_FONT(800, 11.5 * k); const cwid = chip ? ctx.measureText(chip).width + 24 * k : 0;
      const ch = 64 * k, tile = 42 * k, cw = 11 * k + tile + 16 * k + tw + (chip ? 14 * k + cwid : 0) + 24 * k;
      const s = lerp(0.74, 1, Math.min(sIn, 1.035));
      ctx.translate(W / 2, H - 112 * k + (1 - sIn) * 28 * k); ctx.scale(s, s); ctx.globalAlpha = al;
      glassPill(cw, ch, k, t, al, NA, NA3, tileC0);
      const tx0 = -cw / 2 + 11 * k + tile / 2, pop = 1 + .12 * Math.sin(clamp((t - .05) / .45, 0, 1) * Math.PI);
      ctx.save(); ctx.translate(tx0, 0); ctx.scale(pop, pop); iconTile(0, 0, tile, tileC0, tileC1, name, k, al, false); ctx.restore();
      ctx.font = NOVA_FONT(800, 19 * k); try { ctx.letterSpacing = `${-.3 * k}px`; } catch {}
      let g = ctx.createLinearGradient(0, -12 * k, 0, 12 * k); g.addColorStop(0, '#fff'); g.addColorStop(1, rgba(brighten(NA3, .65))); ctx.fillStyle = g;
      const x1 = tx0 + tile / 2 + 16 * k; ctx.fillText(title, x1, 1);
      if (chip) {
        const on = chip === 'ON', cx0 = x1 + tw + 14 * k, chh = 24 * k;
        ctx.beginPath(); ctx.roundRect(cx0, -chh / 2, cwid, chh, chh / 2);
        if (on) { ctx.save(); ctx.shadowColor = rgba(NA, .8); ctx.shadowBlur = 12 * k; g = ctx.createLinearGradient(cx0, 0, cx0 + cwid, 0); g.addColorStop(0, rgba(NA)); g.addColorStop(.6, rgba(NA2)); g.addColorStop(1, rgba(NA3)); ctx.fillStyle = g; ctx.fill(); ctx.restore(); }
        else { ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill(); ctx.lineWidth = 1 * k; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke(); }
        ctx.font = NOVA_FONT(800, 11.5 * k); try { ctx.letterSpacing = `${.8 * k}px`; } catch {} ctx.textAlign = 'center'; ctx.fillStyle = on ? '#fff' : 'rgba(230,234,250,.75)'; ctx.fillText(chip, cx0 + cwid / 2, 1);
      }
      ctx.restore();
    }
    function frame(now) {
      if (!anim) return;
      if (scrub != null) { draw(scrub * anim.dur); return; }
      const t = (now - anim.t0) / 1000;
      draw(t);
      if (t < anim.dur + 0.1) raf = requestAnimationFrame(frame);
      else { size(); ctx.clearRect(0, 0, W, H); const k = anim.kind, l = anim.level; anim = null; onDone(); if (loop && !stopped) loopT = setTimeout(() => !stopped && fire(k, l), gap); }
    }

    return {
      fire,
      set(k, v) { S[k] = v; }, assign(o) { Object.assign(S, o); },
      scrubTo(f) { if (!anim) { anim = { t0: 0, kind: 'plug', level: 67, pal: paletteFor('plug', 67, S), dur: S.duration }; } scrub = f; draw(f * anim.dur); },
      stop() { stopped = true; clearTimeout(loopT); cancelAnimationFrame(raf); anim = null; size(); ctx.clearRect(0, 0, W, H); },
      get settings() { return S; },
      palettes: PALETTES,
    };
  }

  root.SurgeEngine = { create, paletteFor, PALETTES };
})(typeof window !== 'undefined' ? window : globalThis);
