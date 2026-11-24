    // ---- Lumen Nova capsules (tools/glow/capsule.js, put in by tools/import-apps.py) ----
    // The on-screen messages ("CAPS LOCK ON", "Copied", "Break time", the hourly chime, snap zones) and the battery capsule,
    // drawn as a pill of liquid glass in your Lumen accent: deep ink body, specular top light, a caustic glow at the
    // bottom, a refractive rim with a faint chromatic fringe, one light sweep as it lands, rounded heavy type.
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

    function capsule(t, dur, A, sc, pal, level, kind) {
      if (anim.hud) return drawHud(t, dur, A, sc, pal, anim.hud);
      const inT = clamp(t / 0.9, 0, 1), outT = clamp((t - (dur - 0.75)) / 0.75, 0, 1);
      const sIn = spring(inT), sOut = 1 - easeInOutCubic(outT);
      const scale = lerp(0.7, 1, Math.min(sIn, 1.04)) * lerp(1, 0.9, 1 - sOut), al = Math.min(inT * 1.6, 1) * sOut;
      if (al <= 0) return;
      const k = sc * (opts.capsuleScale ?? 1), [NA, , NA3] = novaCols();
      const c0 = hex2rgb(pal[0]), c1 = hex2rgb(pal[1]);
      const label = kind === 'low' ? 'Low battery' : kind === 'unplug' ? 'Unplugged' : (kind === 'full' || level >= 100) ? 'Fully charged' : 'Charging';
      ctx.save(); ctx.font = NOVA_FONT(800, 24 * k); const pw = ctx.measureText(`${Math.round(level)}%`).width; ctx.font = NOVA_FONT(650, 13 * k); const lw = ctx.measureText(label).width; ctx.restore();
      const ch = 76 * k, cw = Math.max(250 * k, 92 * k + Math.max(pw, lw) + 34 * k), cx = W / 2, cy = H - 128 * k + (1 - sIn) * 36 * k;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.globalAlpha = al;
      glassPill(cw, ch, k, t, al, NA, NA3, c0);
      // the charge ring: a glass well with the level in the state colour (green charging, red low, gold full)
      const rx = -cw / 2 + ch / 2 + 2 * k, rr = 22 * k;
      let g = ctx.createRadialGradient(rx, -4 * k, 0, rx, 0, rr + 6 * k); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(rx, 0, rr + 5 * k, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = 'round'; ctx.lineWidth = 5 * k; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(rx, 0, rr, 0, Math.PI * 2); ctx.stroke();
      g = ctx.createLinearGradient(rx - rr, rr, rx + rr, -rr); g.addColorStop(0, rgba(c0)); g.addColorStop(1, rgba(brighten(c1, 0.35)));
      ctx.save(); ctx.shadowColor = rgba(c0, .8); ctx.shadowBlur = 12 * k; ctx.strokeStyle = g;
      ctx.beginPath(); ctx.arc(rx, 0, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOutExpo(inT) * clamp(level, 0, 100) / 100); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.moveTo(rx + 2.4 * k, -10 * k); ctx.lineTo(rx - 6.6 * k, 2 * k); ctx.lineTo(rx - 1 * k, 2 * k); ctx.lineTo(rx - 2.4 * k, 10 * k); ctx.lineTo(rx + 6.6 * k, -2 * k); ctx.lineTo(rx + 1 * k, -2 * k); ctx.closePath(); ctx.fill();
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; const tx = rx + rr + 18 * k;
      try { ctx.letterSpacing = `${-.6 * k}px`; } catch {}
      ctx.font = NOVA_FONT(800, 24 * k); g = ctx.createLinearGradient(0, -24 * k, 0, 0); g.addColorStop(0, '#fff'); g.addColorStop(1, rgba(brighten(NA3, .55))); ctx.fillStyle = g;
      ctx.fillText(`${Math.round(level)}%`, tx, -10 * k);
      try { ctx.letterSpacing = '0px'; } catch {}
      ctx.font = NOVA_FONT(650, 13 * k); ctx.fillStyle = rgba(brighten(c1, 0.55), .92);
      ctx.fillText(label, tx, 14 * k);
      ctx.restore();
    }

    function drawHud(t, dur, A, sc, pal, hud) {
      // a glass pill with the message: springs in, one light sweep, fades out
      const inT = clamp(t / 0.6, 0, 1), outT = clamp((t - (dur - 0.5)) / 0.5, 0, 1);
      const sIn = spring(inT), al = Math.min(inT * 1.8, 1) * (1 - easeInOutCubic(outT));
      if (al <= 0) return;
      const k = sc * (opts.capsuleScale ?? 1), [NA, , NA3] = novaCols(), [d0, d1] = novaDot(hud.color || pal[0]);
      ctx.save(); ctx.font = NOVA_FONT(800, 17 * k); try { ctx.letterSpacing = `${-.25 * k}px`; } catch {} ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const tw = ctx.measureText(hud.text).width, ch = 52 * k, cw = tw + 82 * k;
      const s = lerp(0.72, 1, Math.min(sIn, 1.04));
      ctx.translate(W / 2, H - 110 * k + (1 - sIn) * 26 * k); ctx.scale(s, s); ctx.globalAlpha = al;
      glassPill(cw, ch, k, t, al, NA, NA3, d0);
      // the orb: a small glass bead in the message's colour, with a halo ring
      const ox = -cw / 2 + 28 * k, orr = 7 * k;
      ctx.beginPath(); ctx.arc(ox, 0, orr + 5 * k, 0, Math.PI * 2); ctx.fillStyle = rgba(d0, .16); ctx.fill();
      ctx.save(); ctx.shadowColor = rgba(d0, .9); ctx.shadowBlur = 14 * k; let g = ctx.createLinearGradient(ox - orr, -orr, ox + orr, orr); g.addColorStop(0, rgba(brighten(d0, .25))); g.addColorStop(1, rgba(d1));
      ctx.beginPath(); ctx.arc(ox, 0, orr, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.ellipse(ox - 1.6 * k, -2.6 * k, 3 * k, 1.8 * k, -.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill();
      g = ctx.createLinearGradient(0, -10 * k, 0, 10 * k); g.addColorStop(0, '#fff'); g.addColorStop(1, rgba(brighten(NA3, .7))); ctx.fillStyle = g;
      ctx.fillText(hud.text, ox + orr + 15 * k, 1);
      ctx.restore();
    }

