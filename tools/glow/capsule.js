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
