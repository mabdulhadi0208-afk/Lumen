/* First-run cinematic intro and tutorial. Letterboxed, film grain, light sweeps, springy reveals. No emoji. */
;(function () {
  const css = `
  #intro{position:fixed;inset:0;z-index:1000;background:#05060d;color:#eef0fb;overflow:hidden;font-family:var(--font);-webkit-app-region:no-drag;user-select:none}
  #intro canvas{position:absolute;inset:0;width:100%;height:100%}
  #intro .neb{position:absolute;inset:-12%;background:radial-gradient(45% 40% at 30% 35%,rgba(79,103,255,.18),transparent 70%),radial-gradient(40% 38% at 72% 62%,rgba(166,120,255,.16),transparent 70%),radial-gradient(30% 30% at 50% 50%,rgba(80,200,255,.10),transparent 70%);animation:none}
  @keyframes neb{to{transform:translate3d(3%,-2%,0) scale(1.06)}}
  #intro .sweep{position:absolute;top:0;bottom:0;width:40%;left:-40%;background:linear-gradient(100deg,transparent,rgba(200,210,255,.05),transparent);animation:sweep 5s linear infinite;will-change:transform;z-index:2;pointer-events:none}
  @keyframes sweep{to{transform:translate3d(350%,0,0)}}
  #intro .grain{position:absolute;inset:-50%;z-index:4;pointer-events:none;opacity:.08;animation:none;inset:0}
  @keyframes grain{25%{transform:translate3d(-3%,2%,0)}50%{transform:translate3d(2%,-3%,0)}75%{transform:translate3d(-1%,3%,0)}}
  #intro .bar{position:absolute;left:0;right:0;height:9vh;background:#000;z-index:5;transition:transform 1.4s cubic-bezier(.3,1.2,.5,1)}
  #intro .bar.t{top:0;transform:translateY(-100%)} #intro .bar.b{bottom:0;transform:translateY(100%)}
  #intro.on .bar{transform:none}
  #intro .vig{position:absolute;inset:0;z-index:4;pointer-events:none;background:radial-gradient(120% 90% at 50% 50%,transparent 45%,rgba(0,0,0,.75))}
  #intro .stage{position:absolute;inset:0;display:grid;place-items:center;z-index:3}
  #intro .scene{position:absolute;inset:0;display:grid;place-items:center;opacity:0;pointer-events:none}
  #intro .scene.show{pointer-events:auto}
  #intro .cap{position:absolute;left:0;right:0;bottom:15vh;text-align:center;z-index:6}
  #intro .cap h2{font:700 clamp(28px,4.2vw,54px)/1.05 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.03em;margin:0 0 12px}
  #intro .cap p{margin:0 auto;max-width:560px;color:#a9b0d6;font-size:16px;line-height:1.5}
  #intro .w{display:inline-block;opacity:0;transform:translateY(18px)}
  #intro .skip{position:absolute;right:28px;top:calc(9vh + 18px);z-index:7;background:rgba(255,255,255,.08);border:0;color:#cfd4f3;font:500 12.5px var(--font);padding:8px 14px;border-radius:999px;cursor:default}
  #intro .skip:hover{background:rgba(255,255,255,.16)}
  #intro .dots{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(9vh + 22px);display:flex;gap:6px;z-index:7}
  #intro .dots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.2);transition:width .5s cubic-bezier(.3,1.4,.5,1),background .4s}
  #intro .dots i.on{width:22px;background:#8ea4ff}
  #intro .logo{font:800 clamp(64px,11vw,150px)/1 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.05em;background:linear-gradient(100deg,#fff 20%,#9fb3ff 55%,#c2a6ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .tag{color:#9aa2c7;font-size:19px;margin-top:10px;text-align:center}
  .mock{width:min(760px,78vw);border-radius:16px;background:#e9ecf3;box-shadow:0 50px 140px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08);overflow:hidden;color:#1c1d21;font:13px -apple-system,system-ui,sans-serif}
  .mock .tb{height:42px;display:flex;align-items:center;gap:6px;padding:0 12px}
  .mock .lt{display:flex;gap:6px;margin-right:14px}.mock .lt i{width:11px;height:11px;border-radius:50%;background:#ff5f57}.mock .lt i:nth-child(2){background:#febc2e}.mock .lt i:nth-child(3){background:#28c840}
  .mock .mt{height:30px;border-radius:8px;padding:0 12px;display:flex;align-items:center;gap:8px;color:#555;width:150px;white-space:nowrap;overflow:hidden}
  .mock .mt.on{background:#fff;color:#111;font-weight:500;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  .mock .mt b{width:13px;height:13px;border-radius:4px;flex:none}
  .mock .ub{margin:0 12px 10px;height:34px;border-radius:10px;background:#fff;display:flex;align-items:center;padding:0 12px;color:#888;box-shadow:0 2px 10px rgba(0,0,0,.06)}
  .mock .pg{height:300px;margin:0 8px 8px;border-radius:10px;background:#fff;padding:26px;position:relative;overflow:hidden}
  .mock .ln{height:10px;border-radius:5px;background:#eceef3;margin:10px 0}
  .cmd{width:min(620px,74vw);border-radius:18px;background:#fff;color:#1c1d21;box-shadow:0 50px 140px rgba(0,0,0,.6),0 0 80px rgba(111,139,255,.25);overflow:hidden;font:15px -apple-system,system-ui,sans-serif}
  .cmd .in{height:62px;display:flex;align-items:center;padding:0 22px;font-size:21px;gap:12px}
  .cmd .in .caret{width:2px;height:24px;background:#5b8cff;animation:blink 1s steps(2) infinite}
  @keyframes blink{50%{opacity:0}}
  .cmd .r{height:44px;display:flex;align-items:center;padding:0 22px;gap:12px;color:#444;opacity:0;transform:translateY(8px)}
  .cmd .r.sel{background:rgba(91,140,255,.12);color:#111}
  .cmd .r em{font-style:normal;color:#999;font-size:13px;margin-left:auto}
  .shield{position:relative;width:340px;height:340px;display:grid;place-items:center}
  .shield .num{font:800 110px/1 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.04em;font-variant-numeric:tabular-nums;background:linear-gradient(180deg,#fff,#8ea4ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  .shield .sub{color:#9aa2c7;text-align:center;margin-top:6px}
  .shield .ad{position:absolute;width:64px;height:40px;border-radius:8px;background:linear-gradient(135deg,#ff6b6b,#ffb86b);opacity:.9}
  .split{display:flex;gap:14px}
  .split .pane{width:min(330px,36vw);height:360px;border-radius:14px;background:#fff;box-shadow:0 40px 120px rgba(0,0,0,.55);padding:24px}
  .cards{display:flex;gap:18px}
  .card3{width:230px;height:150px;border-radius:18px;padding:20px;background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.03));box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 30px 80px rgba(0,0,0,.5);}
  .card3 h4{margin:12px 0 6px;font-size:17px}.card3 p{margin:0;color:#a9b0d6;font-size:13px}
  .card3 .k{width:36px;height:36px;border-radius:11px;background:rgba(142,164,255,.18);display:grid;place-items:center;color:#9fb3ff}
  #intro .go{margin-top:34px;height:52px;padding:0 28px;border-radius:16px;border:0;background:#fff;color:#0b0e1c;font:600 16px var(--font);box-shadow:0 0 60px rgba(142,164,255,.55);cursor:default}
  `
  let skip = false, root, cv, cx, particles = [], orb = { r: 0, glow: 0, ring: 0, x: 0, y: 0 }, flash = 0, raf

  // ------------------------------------------------------------ sound: all synthesized with Web Audio, no files
  const SFX = (() => {
    let ac, master, verb, muted = false
    function init() {
      if (ac) return
      try { ac = new (window.AudioContext || window.webkitAudioContext)() } catch { return }
      master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination)
      master.gain.linearRampToValueAtTime(0.9, ac.currentTime + 1.5)
      verb = ac.createConvolver()
      const len = ac.sampleRate * 3.2, ir = ac.createBuffer(2, len, ac.sampleRate)
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) }
      verb.buffer = ir
      const vg = ac.createGain(); vg.gain.value = 0.45; verb.connect(vg); vg.connect(master)
    }
    const out = (node, wet = 0.4) => { const d = ac.createGain(); d.gain.value = 1 - wet * .5; node.connect(d); d.connect(master); if (wet) { const w = ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(verb) } }
    function noise(sec) { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const n = ac.createBufferSource(); n.buffer = b; return n }
    function tone(freq, t0, dur, { type = 'sine', vol = .2, wet = .5, attack = .01, glide } = {}) {
      const o = ac.createOscillator(), g = ac.createGain()
      o.type = type; o.frequency.setValueAtTime(freq, t0); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur)
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      o.connect(g); out(g, wet); o.start(t0); o.stop(t0 + dur + .05)
    }
    let droneNodes = []
    const api = {
      init,
      drone() {
        if (!ac) return
        const t = ac.currentTime, lp = ac.createBiquadFilter(), g = ac.createGain()
        lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 6
        const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .08; lg.gain.value = 260; lfo.connect(lg); lg.connect(lp.frequency); lfo.start()
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + 4)
        for (const [f, det] of [[55, 0], [55, 7], [82.4, -5], [110, 3]]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(); droneNodes.push(o) }
        lp.connect(g); out(g, .6); droneNodes.push(lfo); api._drone = g
      },
      riser(sec = 2.3) {
        if (!ac) return
        const t = ac.currentTime, n = noise(sec), bp = ac.createBiquadFilter(), g = ac.createGain()
        bp.type = 'bandpass'; bp.Q.value = 4; bp.frequency.setValueAtTime(180, t); bp.frequency.exponentialRampToValueAtTime(4200, t + sec)
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.5, t + sec * .95); g.gain.linearRampToValueAtTime(0, t + sec)
        n.connect(bp); bp.connect(g); out(g, .3); n.start(t)
        tone(110, t, sec, { type: 'triangle', vol: .08, wet: .3, attack: sec * .9, glide: 440 })
      },
      impact() {
        if (!ac) return
        const t = ac.currentTime
        tone(70, t, 2.4, { vol: .55, wet: .5, glide: 34 })
        const n = noise(1.2), lp = ac.createBiquadFilter(), g = ac.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 1.1)
        g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2); n.connect(lp); lp.connect(g); out(g, .7); n.start(t)
        ;[523.25, 783.99, 1046.5, 1567.98].forEach((f, i) => tone(f, t + .02 + i * .03, 3.2, { vol: .07, wet: .85, attack: .02 }))
      },
      whoosh() {
        if (!ac) return
        const t = ac.currentTime, n = noise(.9), bp = ac.createBiquadFilter(), g = ac.createGain()
        bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2600, t + .35); bp.frequency.exponentialRampToValueAtTime(500, t + .85)
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.32, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + .9)
        n.connect(bp); bp.connect(g); out(g, .5); n.start(t)
      },
      pop(pitch = 1) { if (ac) tone(520 * pitch, ac.currentTime, .22, { vol: .12, wet: .35, glide: 780 * pitch }) },
      key() {
        if (!ac) return
        const t = ac.currentTime, n = noise(.04), hp = ac.createBiquadFilter(), g = ac.createGain()
        hp.type = 'highpass'; hp.frequency.value = 2400 + Math.random() * 1500; g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.0001, t + .04)
        n.connect(hp); hp.connect(g); out(g, .1); n.start(t)
      },
      tick(i) { if (ac) tone(1200 + (i % 5) * 60, ac.currentTime, .05, { vol: .05, wet: .2 }) },
      shimmer() { if (!ac) return; const t = ac.currentTime; [1318.5, 1760, 2093, 2637].forEach((f, i) => tone(f, t + i * .07, 1.6, { vol: .05, wet: .9 })) },
      chord() {
        if (!ac) return
        const t = ac.currentTime
        ;[261.63, 329.63, 392, 493.88, 587.33].forEach((f, i) => { tone(f, t + i * .09, 4.5, { type: 'triangle', vol: .09, wet: .8, attack: .04 }); tone(f * 2, t + i * .09 + .02, 3, { vol: .03, wet: .9 }) })
        tone(65.4, t, 4.5, { vol: .25, wet: .5, attack: .05 })
      },
      fadeOut(sec = 1.2) {
        if (!ac) return
        const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + sec)
        setTimeout(() => { try { droneNodes.forEach(o => o.stop()); ac.close() } catch {} ac = null; droneNodes = [] }, sec * 1000 + 200)
      },
      toggleMute() { if (!ac) return muted; muted = !muted; master.gain.setTargetAtTime(muted ? 0 : .9, ac.currentTime, .1); return muted },
    }
    return api
  })()
  const sleep = ms => new Promise(r => { const t0 = performance.now(); const tick = () => { if (skip || performance.now() - t0 >= ms) r(); else requestAnimationFrame(tick) }; tick() })
  const anim = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'cubic-bezier(.3,1.25,.5,1)', ...o })
  const words = (el, text, delay = 0, step = 70) => {
    el.innerHTML = ''
    text.split(' ').forEach((w, i) => {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(' '))
      anim(s, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: delay + i * step })
    })
  }

  let W = 0, H = 0
  function size() {
    const scale = Math.min(1.25, devicePixelRatio || 1)   // retina at full res was the main source of lag
    W = innerWidth; H = innerHeight
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale)
    cx.setTransform(scale, 0, 0, scale, 0, 0)
  }
  function draw() {
    cx.clearRect(0, 0, W, H)
    // particles: move once, then draw in a few batched paths (by color and brightness band)
    for (const p of particles) { p.x += (p.tx - p.x) * p.k; p.y += (p.ty - p.y) * p.k; p.a += (p.ta - p.a) * .05 }
    for (const col of ['#dfe6ff', '#c2a6ff']) {
      cx.fillStyle = col
      for (const [lo, hi, alpha] of [[0, .4, .25], [.4, .7, .55], [.7, 2, .9]]) {
        cx.globalAlpha = alpha; cx.beginPath()
        for (const p of particles) if (p.c === col && p.a >= lo && p.a < hi) cx.rect(p.x, p.y, p.r * 1.6, p.r * 1.6)
        cx.fill()
      }
    }
    cx.globalAlpha = 1
    if (orb.glow > 0.01) {
      const ox = W / 2 + orb.x, oy = H / 2 + orb.y, R = orb.r * 4
      const g = cx.createRadialGradient(ox, oy, 0, ox, oy, R)
      g.addColorStop(0, `rgba(220,228,255,${.9 * orb.glow})`); g.addColorStop(.25, `rgba(142,164,255,${.45 * orb.glow})`); g.addColorStop(1, 'rgba(120,140,255,0)')
      cx.fillStyle = g; cx.fillRect(ox - R, oy - R, R * 2, R * 2)
      cx.fillStyle = `rgba(255,255,255,${orb.glow})`; cx.beginPath(); cx.arc(ox, oy, orb.r, 0, 6.283); cx.fill()
      if (orb.ring > 0.01) {
        cx.save(); cx.translate(ox, oy); cx.rotate(-0.42)
        cx.strokeStyle = `rgba(255,255,255,${.85 * orb.ring})`; cx.lineWidth = 3
        cx.beginPath(); cx.ellipse(0, 0, orb.r * 2.6, orb.r * .95, 0, Math.PI * (1 - orb.ring), Math.PI * (1 + orb.ring)); cx.stroke()
        cx.restore()
      }
    }
    if (flash > 0.01) { cx.fillStyle = `rgba(230,236,255,${flash})`; cx.fillRect(0, 0, W, H); flash *= .9 }
    raf = requestAnimationFrame(draw)
  }
  function grainURL() {
    const c = document.createElement('canvas'); c.width = c.height = 160
    const g = c.getContext('2d'), d = g.createImageData(160, 160)
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 }
    g.putImageData(d, 0, 0); return c.toDataURL()
  }
  const tween = (obj, key, to, ms) => new Promise(r => { const from = obj[key], t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / ms); const e = 1 - Math.pow(1 - k, 3); obj[key] = from + (to - from) * e; if (k < 1 && !skip) requestAnimationFrame(f); else { obj[key] = to; r() } }; f() })

  function scene(html) {
    const s = document.createElement('div'); s.className = 'scene'; s.innerHTML = html
    root.querySelector('.stage').appendChild(s)
    return s
  }
  async function enter(s) {
    s.classList.add('show'); if (!skip) SFX.whoosh()
    anim(s, [{ opacity: 0, transform: 'scale(1.08) translateY(20px)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1100 })
    // slow push-in, like a camera dolly
    s.firstElementChild && s.firstElementChild.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }], { duration: 6000, easing: 'linear', fill: 'forwards' })
  }
  async function leave(s) {
    const a = anim(s, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 650, easing: 'cubic-bezier(.4,0,.6,1)' })
    await sleep(600); s.remove()
  }
  function caption(title, text) {
    const c = root.querySelector('.cap')
    words(c.querySelector('h2'), title, 150); words(c.querySelector('p'), text, 450, 40)
  }
  function setDot(i) { root.querySelectorAll('.dots i').forEach((d, j) => d.classList.toggle('on', j === i)) }

  async function play({ onDone } = {}) {
    if (document.getElementById('intro')) return
    skip = false
    if (!document.getElementById('intro-css')) { const st = document.createElement('style'); st.id = 'intro-css'; st.textContent = css; document.head.appendChild(st) }
    root = document.createElement('div'); root.id = 'intro'
    root.innerHTML = `<div class="neb"></div><canvas></canvas><div class="sweep"></div><div class="grain"></div><div class="vig"></div><div class="bar t"></div><div class="bar b"></div><div class="stage"></div>
      <div class="cap"><h2></h2><p></p></div><button class="skip">Skip intro</button><button class="skip mute" style="right:128px">Sound on</button><div class="dots">${'<i></i>'.repeat(7)}</div>`
    document.body.appendChild(root)
    cv = root.querySelector('canvas'); cx = cv.getContext('2d', { alpha: true })
    size(); addEventListener('resize', size)
    root.querySelector('.grain').style.background = `url(${grainURL()})`
    const w = innerWidth, h = innerHeight
    particles = Array.from({ length: 260 }, () => {
      const a = Math.random() * 6.283, d = Math.max(w, h) * (0.6 + Math.random() * 0.6)
      return { x: w / 2 + Math.cos(a) * d, y: h / 2 + Math.sin(a) * d, tx: w / 2 + Math.cos(a) * d, ty: h / 2 + Math.sin(a) * d, r: Math.random() * 1.6 + .3, a: 0, ta: Math.random() * .8 + .2, k: .02 + Math.random() * .03, c: Math.random() < .3 ? '#c2a6ff' : '#dfe6ff' }
    })
    raf = requestAnimationFrame(draw)
    const finish = () => { skip = true }
    root.querySelector('.skip').onclick = finish
    root.querySelector('.mute').onclick = () => { root.querySelector('.mute').textContent = SFX.toggleMute() ? 'Sound off' : 'Sound on' }
    SFX.init(); SFX.drone()
    const onKey = e => { if (e.key === 'Escape') finish() }
    addEventListener('keydown', onKey)
    requestAnimationFrame(() => root.classList.add('on'))

    // ---- 0. ignition
    setDot(0)
    await sleep(500)
    particles.forEach(p => { const a = Math.random() * 6.283, d = Math.random() * 60; p.tx = w / 2 + Math.cos(a) * d; p.ty = h / 2 + Math.sin(a) * d })
    tween(orb, 'glow', 1, 2200); tween(orb, 'r', 26, 2400)
    SFX.riser(2.3)
    await sleep(2300)
    flash = .55; tween(orb, 'ring', 1, 1400); SFX.impact()
    particles.forEach(p => { const a = Math.random() * 6.283, d = 120 + Math.random() * Math.max(w, h) * .7; p.tx = w / 2 + Math.cos(a) * d; p.ty = h / 2 + Math.sin(a) * d; p.k = .01 + Math.random() * .02; p.ta = Math.random() * .5 })
    tween(orb, 'y', -h * 0.16, 1600)
    let s = scene(`<div style="text-align:center;margin-top:12vh"><div class="logo">Lumen</div><div class="tag"></div></div>`)
    s.classList.add('show'); s.style.opacity = 1
    const logo = s.querySelector('.logo')
    anim(logo, [{ opacity: 0, transform: 'scale(1.35, 1.25)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1800, easing: 'cubic-bezier(.2,1,.3,1)' })
    words(s.querySelector('.tag'), "Chrome's engine. A lighter feel.", 900)
    setTimeout(() => !skip && SFX.shimmer(), 900)
    await sleep(3600)
    tween(orb, 'glow', 0, 900); tween(orb, 'ring', 0, 700)
    await leave(s)

    // ---- 1. tabs on top
    setDot(1)
    s = scene(`<div class="mock"><div class="tb"><div class="lt"><i></i><i></i><i></i></div></div><div class="ub">Search or enter address</div><div class="pg"><div class="ln" style="width:60%"></div><div class="ln" style="width:42%"></div><div class="ln" style="width:75%;margin-top:30px"></div><div class="ln" style="width:66%"></div></div></div>`)
    caption('Your tabs, up top.', 'Drag them around and they spring into place. Prefer a sidebar? Option Cmd S moves them.')
    enter(s)
    const tb = s.querySelector('.tb'); const cols = ['#24292f', '#4285f4', '#ff8000', '#7c5cff']
    ;['GitHub', 'Flights', 'Markets', 'Release notes'].forEach((t, i) => setTimeout(() => {
      const m = document.createElement('div'); m.className = 'mt' + (i === 0 ? ' on' : ''); m.innerHTML = `<b style="background:${cols[i]}"></b>${t}`; tb.appendChild(m)
      anim(m, [{ opacity: 0, transform: 'translateY(-14px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 800 }); if (!skip) SFX.pop(1 + i * .12)
    }, 500 + i * 260))
    setTimeout(() => { const ms = tb.querySelectorAll('.mt'); if (ms[2]) { ms.forEach(m => m.classList.remove('on')); ms[2].classList.add('on'); anim(ms[2], [{ transform: 'scale(.95)' }, { transform: 'scale(1)' }], { duration: 500 }) } }, 2800)
    await sleep(4600); await leave(s)

    // ---- 2. command bar
    setDot(2)
    s = scene(`<div class="cmd"><div class="in"><span class="q"></span><span class="caret"></span></div><div class="r sel">Search for <b class="qq" style="margin-left:4px"></b><em>Search</em></div><div class="r">Switch to Flights<em>Open tab</em></div><div class="r">google.com/travel/flights<em>History</em></div><div class="r">Split View<em>Action</em></div></div>`)
    caption('One bar for everything.', 'Cmd T to search, jump to an open tab, find something you saw last week, or run any action.')
    enter(s)
    const q = 'flights to lisbon'; const qEl = s.querySelector('.q')
    for (let i = 1; i <= q.length && !skip; i++) { qEl.textContent = q.slice(0, i); s.querySelector('.qq').textContent = q.slice(0, i); SFX.key(); await sleep(65) }
    if (!skip) SFX.shimmer()
    s.querySelectorAll('.r').forEach((r, i) => anim(r, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: i * 90 }))
    await sleep(2600); await leave(s)

    // ---- 3. shield
    setDot(3)
    s = scene(`<div class="shield"><div><div class="num">0</div><div class="sub">ads and trackers blocked</div></div></div>`)
    caption('Ads and trackers, gone.', 'Blocked before they load, on every site. Faster pages, less data, nobody following you around.')
    enter(s)
    const sh = s.querySelector('.shield'), num = s.querySelector('.num')
    for (let i = 0; i < 14; i++) setTimeout(() => {
      const a = document.createElement('div'); a.className = 'ad'
      const ang = Math.random() * 6.283, d = 150 + Math.random() * 60
      a.style.left = 170 + Math.cos(ang) * d - 32 + 'px'; a.style.top = 170 + Math.sin(ang) * d - 20 + 'px'
      sh.appendChild(a)
      if (!skip) SFX.pop(.6 + Math.random() * .5)
      anim(a, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: .9, transform: 'scale(1)', offset: .35 }, { opacity: 0, transform: 'scale(0) rotate(40deg)' }], { duration: 1100 })
    }, 200 + i * 180)
    const t0 = performance.now()
    let ti = 0
    while (!skip && performance.now() - t0 < 2600) { const n = Math.round(124 * Math.min(1, (performance.now() - t0) / 2400)); if (n !== +num.textContent && ti++ % 3 === 0) SFX.tick(ti); num.textContent = n; await sleep(30) }
    num.textContent = '124'
    await sleep(1600); await leave(s)

    // ---- 4. passwords + sync + extensions
    setDot(4)
    s = scene(`<div class="cards">
      <div class="card3"><div class="k">${ICONS.key}</div><h4>Passwords</h4><p>Saved, filled in, locked with Touch ID.</p></div>
      <div class="card3"><div class="k">${ICONS.reload}</div><h4>Encrypted sync</h4><p>Through your own iCloud, Dropbox or Drive.</p></div>
      <div class="card3"><div class="k">${ICONS.puzzle}</div><h4>Chrome extensions</h4><p>Straight from the Chrome Web Store.</p></div></div>`)
    caption('Everything Chrome has.', 'Bring your bookmarks, passwords and extensions over from Chrome in one click, from Settings.')
    enter(s)
    s.querySelectorAll('.card3').forEach((c, i) => setTimeout(() => !skip && SFX.pop(.9 + i * .2), 250 + i * 180))
    s.querySelectorAll('.card3').forEach((c, i) => anim(c, [{ opacity: 0, transform: 'translateY(40px) rotateX(25deg) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 1100, delay: 250 + i * 180 }))
    await sleep(4400); await leave(s)

    // ---- 5. split view
    setDot(5)
    s = scene(`<div class="split"><div class="pane"><div class="ln" style="width:70%;background:#eef1ff;height:14px"></div><div class="ln"></div><div class="ln" style="width:80%"></div></div><div class="pane"><div class="ln" style="width:55%;background:#fff1e5;height:14px"></div><div class="ln"></div><div class="ln" style="width:65%"></div></div></div>`)
    caption('Two tabs, side by side.', 'Shift Cmd Backslash for split view. Shift Cmd E for reader mode. Shift Cmd P to pop a video out.')
    enter(s)
    const ps = s.querySelectorAll('.pane')
    anim(ps[0], [{ transform: 'translateX(172px)' }, { transform: 'none' }], { duration: 1300, delay: 300 })
    anim(ps[1], [{ transform: 'translateX(-172px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1300, delay: 300 })
    await sleep(4200); await leave(s)

    // ---- 6. finale
    setDot(6)
    root.querySelector('.cap h2').textContent = ''; root.querySelector('.cap p').textContent = ''
    if (!skip) SFX.chord()
    orb.y = 0; orb.r = 0; tween(orb, 'glow', 1, 900); tween(orb, 'r', 22, 1100); tween(orb, 'ring', 1, 1500)
    particles.forEach(p => { p.ta = Math.random() * .7 + .1 })
    s = scene(`<div style="text-align:center;margin-top:26vh"><div class="logo" style="font-size:clamp(40px,6vw,76px)">You are all set.</div><button class="go">Start browsing</button></div>`)
    s.classList.add('show'); s.style.opacity = 1
    anim(s.querySelector('.logo'), [{ opacity: 0, transform: 'translateY(20px) scale(1.06)' }, { opacity: 1, transform: 'none' }], { duration: 1200 })
    const go = s.querySelector('.go')
    anim(go, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 900, delay: 500 })
    if (!skip) await new Promise(r => { go.onclick = r; root.querySelector('.skip').onclick = r; const k = e => { if (e.key === 'Enter' || e.key === 'Escape') { removeEventListener('keydown', k); r() } }; addEventListener('keydown', k) })

    // out: fade to the browser
    SFX.fadeOut(skip ? .4 : 1.2)
    removeEventListener('keydown', onKey)
    root.classList.remove('on')
    await new Promise(r => { root.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.04)' }], { duration: 800, easing: 'ease-in', fill: 'forwards' }).onfinish = r })
    cancelAnimationFrame(raf); removeEventListener('resize', size); root.remove()
    onDone && onDone()
  }
  window.Intro = { play }
})()
