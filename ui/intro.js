/* Lumen's opening film. Cold open, warp, ignition, the logo forged from light, a 3D feature carousel,
   what is new in this version, then one question before you start. Letterboxed, film grain, anamorphic flares,
   synthesized score. No emoji. Skippable at any point with Skip or Escape.
   Every release updates WHATS_NEW below, and after an update Lumen plays the short what's-new cut once. */
;(function () {
  // ---- edit this list every release: it is the "New in Lumen" act of the film
  const WHATS_NEW = {
    version: '1.15',
    items: [
      { icon: 'box', title: 'Parcels', text: 'Track any delivery, and orders you place are saved for you.' },
      { icon: 'star', title: 'Highlights', text: 'Mark text on any page. It is still there next time.' },
      { icon: 'sidebar', title: 'Focus mode', text: 'The page fills the screen. Tabs wait at the top edge.' },
      { icon: 'tabs', title: 'Tidy tabs', text: 'Idle tabs archive themselves, and come back in one click.' },
      { icon: 'book', title: 'Read later', text: 'Save pages for later with Shift Cmd D.' },
      { icon: 'bolt', title: 'Converter', text: 'Type 5 km in mi or 72f to c in the address bar.' },
    ],
  }
  const FEATURES = [
    { icon: 'tabs', title: 'Tabs on top', text: 'They spring into place when you drag them.', hue: 226 },
    { icon: 'search', title: 'One bar for everything', text: 'Cmd K finds tabs, history, actions and answers.', hue: 258 },
    { icon: 'shield', title: 'Ads and trackers gone', text: 'Blocked before they load, on every site.', hue: 200 },
    { icon: 'bolt', title: 'Lumen AI', text: 'Summaries and answers about the page you are on.', hue: 290 },
    { icon: 'globe', title: 'Translate anything', text: 'Whole pages, even right-to-left ones.', hue: 170 },
    { icon: 'moon', title: 'Dark mode everywhere', text: 'Every website, three styles, one switch.', hue: 240 },
    { icon: 'split', title: 'Split view', text: 'Two tabs side by side, Shift Cmd Backslash.', hue: 210 },
    { icon: 'key', title: 'Passwords and passkeys', text: 'Filled in for you, locked with Touch ID.', hue: 320 },
  ]
  const css = `
  #intro{position:fixed;inset:0;z-index:1000;background:#020309;color:#eef0fb;overflow:hidden;font-family:var(--font);-webkit-app-region:no-drag;user-select:none}
  #intro canvas{position:absolute;inset:0;width:100%;height:100%}
  #intro .cam{position:absolute;inset:-40px;will-change:transform}
  #intro .neb{position:absolute;inset:-15%;opacity:0;background:radial-gradient(40% 36% at 28% 34%,rgba(79,103,255,.22),transparent 70%),radial-gradient(38% 34% at 74% 64%,rgba(170,110,255,.2),transparent 70%),radial-gradient(26% 26% at 52% 48%,rgba(80,210,255,.12),transparent 70%);transition:opacity 3s}
  #intro.lit .neb{opacity:1;animation:neb 18s ease-in-out infinite alternate}
  @keyframes neb{to{transform:translate3d(3%,-2%,0) scale(1.08) rotate(2deg)}}
  #intro .flare{position:absolute;left:50%;top:50%;width:160vw;height:3px;margin-left:-80vw;border-radius:50%;opacity:0;pointer-events:none;z-index:3;
    background:linear-gradient(90deg,transparent,rgba(90,140,255,.0) 10%,rgba(120,170,255,.55) 38%,#fff 50%,rgba(120,170,255,.55) 62%,rgba(90,140,255,0) 90%,transparent);filter:blur(1px);box-shadow:0 0 40px 6px rgba(100,150,255,.35)}
  #intro .grain{position:absolute;inset:-6%;z-index:6;pointer-events:none;opacity:.07;mix-blend-mode:screen}
  #intro .vig{position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(125% 95% at 50% 50%,transparent 42%,rgba(0,0,0,.82))}
  #intro .bar{position:absolute;left:0;right:0;height:calc(10.5vh + 6px);background:#000;z-index:8;transition:transform 1.6s cubic-bezier(.3,1.15,.5,1)}
  #intro .bar.t{top:-6px;transform:translateY(-100%)} #intro .bar.b{bottom:-6px;transform:translateY(100%)}
  #intro.on .bar{transform:none}
  #intro .stage{position:absolute;inset:0;display:grid;place-items:center;z-index:4;perspective:1400px}
  #intro .scene{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
  #intro .scene.live{pointer-events:auto}
  #intro .cold{font:600 clamp(26px,3.6vw,46px)/1.1 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.02em;color:#e9ecff;text-align:center}
  #intro .cold span{display:inline-block;margin:0 .22em;opacity:0}
  #intro .logo{position:relative;font:800 clamp(72px,12vw,168px)/1 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.05em;white-space:nowrap}
  #intro .logo span{display:inline-block;background:linear-gradient(100deg,#fff 15%,#a9bbff 55%,#c9a8ff);-webkit-background-clip:text;background-clip:text;color:transparent;opacity:0}
  #intro .logo .glint{position:absolute;inset:0;font:inherit;letter-spacing:inherit;white-space:nowrap;color:transparent;pointer-events:none;background:linear-gradient(100deg,transparent 42%,rgba(255,255,255,.95) 50%,transparent 58%);background-size:300% 100%;background-position:120% 0;-webkit-background-clip:text;background-clip:text;opacity:0}
  #intro .tag{color:#a3abd3;font-size:clamp(15px,1.5vw,20px);margin-top:18px;text-align:center;letter-spacing:.02em}
  #intro .tag .w{display:inline-block;opacity:0}
  #intro .ring3d{position:relative;width:300px;height:200px;transform-style:preserve-3d}
  #intro .fcard{position:absolute;inset:0;border-radius:24px;padding:24px;transform-style:preserve-3d;backface-visibility:hidden;
    background:linear-gradient(150deg,hsla(var(--h),90%,70%,.22),hsla(var(--h),80%,40%,.06) 60%,rgba(255,255,255,.02));
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),inset 0 1px 0 rgba(255,255,255,.25),0 40px 90px rgba(0,0,0,.55);backdrop-filter:blur(14px);transition:filter .9s,opacity .9s}
  #intro .fcard .k{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,hsl(var(--h),85%,62%),hsl(calc(var(--h) + 40),80%,58%));box-shadow:0 10px 30px hsla(var(--h),90%,60%,.5)}
  #intro .fcard .k svg{width:22px;height:22px}
  #intro .fcard h4{margin:18px 0 8px;font:700 21px/1.15 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.01em}
  #intro .fcard p{margin:0;color:#b4bbe0;font-size:14px;line-height:1.45}
  #intro .cap{position:absolute;left:0;right:0;bottom:calc(10.5vh + 34px);text-align:center;z-index:7}
  #intro .cap h2{font:700 clamp(24px,3vw,40px)/1.1 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.03em;margin:0 0 10px;min-height:1.1em}
  #intro .cap p{margin:0 auto;max-width:560px;color:#a9b0d6;font-size:15px;line-height:1.5;min-height:1.5em}
  #intro .cap .w{display:inline-block;opacity:0}
  #intro .new{width:min(980px,86vw);text-align:center}
  #intro .new .eyebrow{display:inline-block;font:700 12px/1 var(--font);letter-spacing:.24em;text-transform:uppercase;color:#9fb3ff;padding:8px 14px;border-radius:999px;background:rgba(142,164,255,.12);box-shadow:inset 0 0 0 1px rgba(142,164,255,.3)}
  #intro .new h1{font:800 clamp(40px,5.4vw,76px)/1.02 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.04em;margin:18px 0 34px;background:linear-gradient(100deg,#fff 30%,#b2c1ff 60%,#d3b2ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .new .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;text-align:left}
  #intro .new .it{padding:18px;border-radius:20px;background:linear-gradient(150deg,rgba(255,255,255,.1),rgba(255,255,255,.02));box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 24px 60px rgba(0,0,0,.45);opacity:0}
  #intro .new .it .k{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#6f8bff,#a978ff);box-shadow:0 8px 22px rgba(111,139,255,.45)}
  #intro .new .it .k svg{width:18px;height:18px}
  #intro .new .it b{display:block;margin:12px 0 4px;font-size:16px}
  #intro .new .it span{color:#aeb6dc;font-size:13px;line-height:1.45}
  #intro .fin{text-align:center;width:min(980px,94vw);display:flex;flex-direction:column;align-items:center}
  #intro .fin .ask{width:min(560px,90vw)}
  #intro .fin .logo{font-size:clamp(44px,6.4vw,84px)}
  #intro .ask{margin:30px auto 0;padding:22px 24px;border-radius:24px;text-align:left;display:flex;gap:16px;align-items:flex-start;
    background:linear-gradient(150deg,rgba(255,255,255,.11),rgba(255,255,255,.03));box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 40px 90px rgba(0,0,0,.5);opacity:0}
  #intro .ask .k{flex:none;width:46px;height:46px;border-radius:15px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#ff9f43,#ff6b6b);box-shadow:0 10px 28px rgba(255,120,80,.45)}
  #intro .ask .k svg{width:22px;height:22px}
  #intro .ask b{display:block;font-size:17px;margin-bottom:5px}
  #intro .ask span{color:#aeb6dc;font-size:13.5px;line-height:1.5}
  #intro .btns{display:flex;gap:10px;justify-content:center;margin-top:22px;opacity:0}
  #intro .go{height:52px;padding:0 28px;border-radius:16px;border:0;background:#fff;color:#0b0e1c;font:650 16px var(--font);box-shadow:0 0 60px rgba(142,164,255,.6);cursor:default;transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
  #intro .go:hover{transform:scale(1.04)} #intro .go:active{transform:scale(.97)}
  #intro .no{height:52px;padding:0 22px;border-radius:16px;border:0;background:rgba(255,255,255,.1);color:#dfe3ff;font:550 15px var(--font);cursor:default}
  #intro .no:hover{background:rgba(255,255,255,.16)}
  #intro .skip{position:absolute;right:28px;top:calc(10.5vh + 18px);z-index:9;background:rgba(255,255,255,.08);border:0;color:#cfd4f3;font:500 12.5px var(--font);padding:8px 14px;border-radius:999px;cursor:default;backdrop-filter:blur(8px)}
  #intro .skip:hover{background:rgba(255,255,255,.16)}
  #intro .meter{position:absolute;left:50%;bottom:calc(10.5vh + 14px);width:160px;margin-left:-80px;height:2px;border-radius:2px;background:rgba(255,255,255,.12);z-index:9;overflow:hidden}
  #intro .meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#8ea4ff,#c9a8ff)}
  #intro .credit{position:absolute;left:28px;top:calc(10.5vh + 22px);z-index:9;font:600 10.5px var(--font);letter-spacing:.3em;text-transform:uppercase;color:rgba(220,226,255,.35)}
  `
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
  let skip = false, root, cv, cx, raf, W = 0, H = 0, t0 = 0, total = 1
  const sleep = ms => new Promise(r => { const s = performance.now(); const tick = () => { if (skip || performance.now() - s >= ms) r(); else requestAnimationFrame(tick) }; tick() })
  const anim = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'cubic-bezier(.3,1.25,.5,1)', ...o })
  const tween = (obj, key, to, ms, ease = k => 1 - Math.pow(1 - k, 3)) => new Promise(r => { const from = obj[key], s = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - s) / ms); obj[key] = from + (to - from) * ease(k); if (k < 1 && !skip) requestAnimationFrame(f); else { obj[key] = to; r() } }; f() })
  const words = (el, text, delay = 0, step = 60, blur = true) => {
    el.innerHTML = ''
    text.split(' ').forEach((w, i) => {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(' '))
      anim(s, [{ opacity: 0, transform: 'translateY(16px)', filter: blur ? 'blur(8px)' : 'none' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1000, delay: delay + i * step })
    })
  }

  // ------------------------------------------------------------ the sky: 3D stars, warp streaks, the orb, shockwaves
  const sky = { oy: 0, speed: .4, warp: 0, gather: 0, orb: 0, orbR: 0, ring: 0, shock: [], flash: 0, shake: 0, hue: 228 }
  let stars = []
  function size() {
    const scale = Math.min(1.25, devicePixelRatio || 1)
    const r = cv.getBoundingClientRect(); W = Math.round(r.width) || innerWidth + 80; H = Math.round(r.height) || innerHeight + 80
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale)
    cx.setTransform(scale, 0, 0, scale, 0, 0)
  }
  const newStar = (far = true) => ({ x: (Math.random() - .5) * 2, y: (Math.random() - .5) * 2, z: far ? Math.random() * .9 + .1 : 1, pz: 0, c: Math.random() < .25 ? 1 : 0 })
  function draw() {
    const cxm = W / 2, cym = H / 2, F = Math.max(W, H) * .55, oyc = cym + sky.oy
    cx.globalCompositeOperation = 'source-over'
    cx.fillStyle = sky.warp > .05 ? `rgba(2,3,9,${.55 - sky.warp * .35})` : '#020309'
    cx.fillRect(0, 0, W, H)
    cx.globalCompositeOperation = 'lighter'
    const v = .0025 + sky.speed * .004 + sky.warp * .045
    cx.lineCap = 'round'
    for (const s of stars) {
      s.pz = s.z; s.z -= v
      if (sky.gather > 0) { s.x *= 1 - sky.gather * .06; s.y *= 1 - sky.gather * .06 }
      if (s.z <= .02) { Object.assign(s, newStar(false)); s.pz = s.z; continue }
      const x = cxm + s.x / s.z * F, y = cym + s.y / s.z * F
      if (x < -50 || x > W + 50 || y < -50 || y > H + 50) { Object.assign(s, newStar(false)); s.pz = s.z; continue }
      const px = cxm + s.x / s.pz * F, py = cym + s.y / s.pz * F
      const b = Math.min(1, (1 - s.z) * 1.4)
      cx.strokeStyle = s.c ? `rgba(200,170,255,${b})` : `rgba(215,225,255,${b})`
      cx.lineWidth = Math.max(.6, (1 - s.z) * 2.6)
      cx.beginPath(); cx.moveTo(px, py); cx.lineTo(x + (x === px ? .4 : 0), y); cx.stroke()
    }
    // the orb of light
    if (sky.orb > .01) {
      const R = sky.orbR * 5
      const g = cx.createRadialGradient(cxm, oyc, 0, cxm, oyc, R)
      g.addColorStop(0, `rgba(235,240,255,${sky.orb})`); g.addColorStop(.18, `hsla(${sky.hue},100%,75%,${.55 * sky.orb})`); g.addColorStop(1, 'rgba(100,120,255,0)')
      cx.fillStyle = g; cx.fillRect(cxm - R, oyc - R, R * 2, R * 2)
      cx.fillStyle = `rgba(255,255,255,${sky.orb})`; cx.beginPath(); cx.arc(cxm, oyc, sky.orbR, 0, 6.283); cx.fill()
      if (sky.ring > .01) {
        cx.save(); cx.translate(cxm, oyc); cx.rotate(-.42)
        // a chromatic ring: red, green and blue drawn a hair apart, like a real lens
        ;[['255,90,120', -1.2], ['120,255,190', 0], ['110,150,255', 1.2]].forEach(([c, o]) => {
          cx.strokeStyle = `rgba(${c},${.55 * sky.ring})`; cx.lineWidth = 2.4
          cx.beginPath(); cx.ellipse(o, 0, sky.orbR * 2.8, sky.orbR, 0, Math.PI * (1 - sky.ring), Math.PI * (1 + sky.ring)); cx.stroke()
        })
        cx.restore()
      }
    }
    // shockwaves
    for (const w of sky.shock) {
      w.r += (Math.max(W, H) * 1.1 - w.r) * .045; w.a *= .955
      cx.strokeStyle = `rgba(180,200,255,${w.a})`; cx.lineWidth = 2 + w.a * 10
      cx.beginPath(); cx.arc(cxm, cym, w.r, 0, 6.283); cx.stroke()
    }
    sky.shock = sky.shock.filter(w => w.a > .01)
    if (sky.flash > .01) { cx.globalCompositeOperation = 'source-over'; cx.fillStyle = `rgba(235,240,255,${sky.flash})`; cx.fillRect(0, 0, W, H); sky.flash *= .9 }
    // camera shake
    const cam = root.querySelector('.cam')
    if (sky.shake > .2) { cam.style.transform = `translate3d(${(Math.random() - .5) * sky.shake}px,${(Math.random() - .5) * sky.shake}px,0)`; sky.shake *= .9 }
    else if (cam.style.transform) cam.style.transform = ''
    // progress meter
    const m = root.querySelector('.meter i'); if (m) m.style.width = Math.min(100, (performance.now() - t0) / total * 100) + '%'
    raf = requestAnimationFrame(draw)
  }
  function grainURL() {
    const c = document.createElement('canvas'); c.width = c.height = 180
    const g = c.getContext('2d'), d = g.createImageData(180, 180)
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 }
    g.putImageData(d, 0, 0); return c.toDataURL()
  }
  function flare(strength = 1) {
    const f = root.querySelector('.flare')
    f.animate([{ opacity: 0, transform: 'scaleX(.2)' }, { opacity: strength, transform: 'scaleX(1)', offset: .15 }, { opacity: 0, transform: 'scaleX(1.3)' }], { duration: 1800, easing: 'cubic-bezier(.2,.8,.3,1)' })
  }
  function boom() { sky.flash = .7; sky.shake = 26; sky.shock.push({ r: 10, a: .9 }); setTimeout(() => sky.shock.push({ r: 10, a: .5 }), 140); flare(1); if (!skip) SFX.impact() }
  function scene(html) { const s = document.createElement('div'); s.className = 'scene'; s.innerHTML = html; root.querySelector('.stage').appendChild(s); return s }
  async function leave(s, ms = 700) {
    anim(s, [{ opacity: 1, filter: 'blur(0)', transform: 'scale(1)' }, { opacity: 0, filter: 'blur(14px)', transform: 'scale(1.06)' }], { duration: ms, easing: 'cubic-bezier(.5,0,.7,.4)' })
    await sleep(ms); s.remove()
  }
  function caption(title, text) {
    const c = root.querySelector('.cap')
    words(c.querySelector('h2'), title, 80, 55); words(c.querySelector('p'), text, 300, 30)
  }
  const clearCaption = () => { const c = root.querySelector('.cap'); c.querySelector('h2').textContent = ''; c.querySelector('p').textContent = '' }

  // ------------------------------------------------------------ the acts
  async function coldOpen() {
    const s = scene(`<div class="cold">${['Every page.', 'Every tab.', 'Every day.'].map(t => `<span>${t}</span>`).join('')}</div>`)
    const spans = s.querySelectorAll('.cold span')
    for (let i = 0; i < spans.length && !skip; i++) {
      anim(spans[i], [{ opacity: 0, filter: 'blur(14px)', transform: 'translateY(10px) scale(1.08)', textShadow: '-6px 0 rgba(255,60,120,.7), 6px 0 rgba(60,160,255,.7)' }, { opacity: 1, filter: 'blur(0)', transform: 'none', textShadow: '0 0 transparent, 0 0 transparent' }], { duration: 1100, easing: 'cubic-bezier(.2,.9,.3,1)' })
      if (!skip) SFX.pop(.45 + i * .08)
      await sleep(700)
    }
    await sleep(700)
    await leave(s, 600)
  }
  async function warp() {
    sky.oy = 0
    if (!skip) SFX.riser(2.6)
    tween(sky, 'warp', 1, 2200, k => k * k)
    await sleep(2300)
    sky.gather = 1
    tween(sky, 'warp', 0, 500)
    tween(sky, 'orb', 1, 700); tween(sky, 'orbR', 30, 800)
    await sleep(650)
  }
  async function ignite({ short = false } = {}) {
    boom()
    root.classList.add('lit')
    tween(sky, 'ring', 1, 1500)
    sky.gather = 0
    stars.forEach(s => { s.x = (Math.random() - .5) * 2; s.y = (Math.random() - .5) * 2; s.z = Math.random() * .9 + .1 })
    sky.speed = .25
    const s = scene(`<div style="text-align:center"><div class="logo">${'Lumen'.split('').map(c => `<span>${c}</span>`).join('')}<i class="glint" aria-hidden="true">Lumen</i></div><div class="tag"></div></div>`)
    tween(sky, 'orbR', 18, 1400); tween(sky, 'oy', -Math.min(H * .26, 220), 1800, k => 1 - Math.pow(1 - k, 4))
    const letters = s.querySelectorAll('.logo span')
    letters.forEach((l, i) => anim(l, [
      { opacity: 0, transform: `translate3d(${(i - 2) * 90}px, ${(i % 2 ? -1 : 1) * 40}px, 600px) rotateY(${(i - 2) * 25}deg) scale(1.6)`, filter: 'blur(18px)' },
      { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1500, delay: 80 + i * 90, easing: 'cubic-bezier(.16,1,.3,1)' }))
    anim(s.querySelector('.logo'), [{ letterSpacing: '.18em' }, { letterSpacing: '-.05em' }], { duration: 2400, easing: 'cubic-bezier(.16,1,.3,1)' })
    setTimeout(() => { if (skip) return; s.querySelector('.glint').animate([{ opacity: 1, backgroundPosition: '120% 0' }, { opacity: 1, backgroundPosition: '-20% 0', offset: .92 }, { opacity: 0, backgroundPosition: '-20% 0' }], { duration: 1500, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }); SFX.shimmer() }, 1300)
    words(s.querySelector('.tag'), short ? 'Fresh from an update.' : "Chrome's engine. A lighter feel.", 1500, 90)
    await sleep(short ? 2600 : 3800)
    tween(sky, 'orb', 0, 900); tween(sky, 'ring', 0, 700)
    await leave(s)
  }
  async function carousel() {
    const n = FEATURES.length, R = Math.round(Math.max(380, Math.min(560, W * .36)))
    const s = scene(`<div class="ring3d">${FEATURES.map((f, i) => `<div class="fcard" style="--h:${f.hue};transform:rotateY(${i * 360 / n}deg) translateZ(${R}px)"><div class="k">${ICONS[f.icon] || ''}</div><h4>${f.title}</h4><p>${f.text}</p></div>`).join('')}</div>`)
    const ring = s.querySelector('.ring3d'), cards = s.querySelectorAll('.fcard')
    anim(s, [{ opacity: 0, transform: 'translateY(60px) rotateX(18deg) scale(.8)' }, { opacity: 1, transform: 'translateY(-4vh) rotateX(-6deg) scale(1)' }], { duration: 1600, easing: 'cubic-bezier(.16,1,.3,1)' })
    let ang = 0
    const focus = i => cards.forEach((c, j) => { const d = Math.min((j - i + n) % n, (i - j + n) % n); c.style.filter = d === 0 ? 'none' : `blur(${Math.min(6, d * 2.2)}px) brightness(${1 - d * .18})`; c.style.opacity = d > 2 ? .35 : 1 })
    for (let i = 0; i < n && !skip; i++) {
      focus(i)
      ring.animate([{ transform: `translateZ(-${R}px) rotateY(${ang}deg)` }, { transform: `translateZ(-${R}px) rotateY(${-i * 360 / n}deg)` }], { duration: 900, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'forwards' })
      ang = -i * 360 / n
      if (i === 0) caption('Everything you need.', 'Nothing in your way. Here is what Lumen does for you.')
      if (!skip) { SFX.whoosh(); setTimeout(() => !skip && SFX.pop(.9 + i * .05), 380) }
      await sleep(i === 0 ? 2100 : 1450)
    }
    clearCaption()
    await leave(s, 800)
  }
  async function whatsNew(version) {
    const items = WHATS_NEW.items
    const s = scene(`<div class="new"><span class="eyebrow">New in Lumen ${version || WHATS_NEW.version}</span><h1>Fresh this version.</h1><div class="grid">${items.map(it => `<div class="it"><div class="k">${ICONS[it.icon] || ''}</div><b>${it.title}</b><span>${it.text}</span></div>`).join('')}</div></div>`)
    anim(s.querySelector('.eyebrow'), [{ opacity: 0, transform: 'translateY(-10px)', letterSpacing: '.6em' }, { opacity: 1, transform: 'none', letterSpacing: '.24em' }], { duration: 1200 })
    anim(s.querySelector('h1'), [{ opacity: 0, filter: 'blur(16px)', transform: 'scale(1.1)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 1300, delay: 150, easing: 'cubic-bezier(.16,1,.3,1)' })
    s.querySelectorAll('.it').forEach((el, i) => {
      anim(el, [{ opacity: 0, transform: 'translateY(40px) rotateX(30deg) scale(.9)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1100, delay: 650 + i * 160 })
      setTimeout(() => !skip && SFX.pop(1 + i * .1), 650 + i * 160)
    })
    await sleep(1400 + items.length * 160 + 3000)
    await leave(s, 800)
  }
  async function finale({ short = false, ask = !short } = {}) {
    if (!skip) SFX.chord()
    // the orb rises above the title so it never sits on top of the words
    sky.orbR = 0; sky.oy = -Math.min(H * .3, 250); tween(sky, 'orb', .8, 1200); tween(sky, 'orbR', 14, 1200); tween(sky, 'ring', 1, 1600)
    flare(.6)
    const s = scene(`<div class="fin" style="margin-top:4vh"><div class="logo">${short ? 'You are up to date.' : 'Welcome to Lumen.'}</div>
      ${!ask ? '' : `<div class="ask"><div class="k">${ICONS.box || ''}</div><div><b>Keep track of your orders?</b><span>When you place an order on any shop, Lumen saves it to Parcels. One click takes you straight back to the order, and it stays there until it is delivered. Change it any time in Settings.</span></div></div>`}
      <div class="btns">${!ask ? '<button class="go">Continue</button>' : '<button class="no">Not now</button><button class="go">Yes, save my orders</button>'}</div></div>`)
    s.classList.add('live')
    // the question is the one thing you cannot skip: answer it, or decide later with Escape
    for (const el of root.querySelectorAll('.skip:not(.mute), .meter')) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).onfinish = () => { el.style.pointerEvents = 'none' }
    anim(s.querySelector('.logo'), [{ opacity: 0, filter: 'blur(14px)', transform: 'translateY(24px) scale(1.06)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 1300, easing: 'cubic-bezier(.16,1,.3,1)' })
    if (s.querySelector('.ask')) anim(s.querySelector('.ask'), [{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 1100, delay: 450 })
    anim(s.querySelector('.btns'), [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: short ? 500 : 800 })
    return new Promise(r => {
      const done = v => { removeEventListener('keydown', k); r(v) }
      s.querySelector('.go').onclick = () => done(true)
      const no = s.querySelector('.no'); if (no) no.onclick = () => done(false)
      root.querySelector('.skip').onclick = () => done(undefined)
      const k = e => { if (e.key === 'Enter') done(true); else if (e.key === 'Escape') done(undefined) }
      addEventListener('keydown', k)
    })
  }

  // ------------------------------------------------------------ play
  // play({ onDone }) is the full film for a first launch. play({ whatsNew: '1.15.0', onDone }) is the short cut after an update.
  async function play({ onDone, whatsNew: wn, askParcels = false } = {}) {
    if (document.getElementById('intro')) return
    skip = false
    if (!document.getElementById('intro-css')) { const st = document.createElement('style'); st.id = 'intro-css'; st.textContent = css; document.head.appendChild(st) }
    root = document.createElement('div'); root.id = 'intro'
    root.innerHTML = `<div class="cam"><div class="neb"></div><canvas></canvas><div class="flare"></div><div class="stage"></div></div><div class="grain"></div><div class="vig"></div><div class="bar t"></div><div class="bar b"></div>
      <div class="cap"><h2></h2><p></p></div><div class="credit">${wn ? 'Lumen ' + String(wn).replace(/\.0$/, '') : 'A Lumen picture'}</div><button class="skip">Skip intro</button><button class="skip mute" style="right:132px">Sound on</button><div class="meter"><i></i></div>`
    document.body.appendChild(root)
    cv = root.querySelector('canvas'); cx = cv.getContext('2d', { alpha: false })
    size(); addEventListener('resize', size)
    root.querySelector('.grain').style.background = `url(${grainURL()})`
    root.querySelector('.grain').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3%,2%)' }, { transform: 'translate(2%,-3%)' }, { transform: 'translate(0,0)' }], { duration: 600, iterations: Infinity, easing: 'steps(4)' })
    stars = Array.from({ length: Math.round(Math.min(900, W * H / 1600)) }, () => newStar())
    t0 = performance.now(); total = wn ? 12500 : 28500
    raf = requestAnimationFrame(draw)
    root.querySelector('.skip').onclick = () => { skip = true }
    root.querySelector('.mute').onclick = () => { root.querySelector('.mute').textContent = SFX.toggleMute() ? 'Sound off' : 'Sound on' }
    SFX.init(); SFX.drone()
    const onKey = e => { if (e.key === 'Escape') skip = true }
    addEventListener('keydown', onKey)
    requestAnimationFrame(() => root.classList.add('on'))

    let answer
    if (wn) {
      await sleep(400); await warp(); await ignite({ short: true }); await whatsNew(String(wn).replace(/\.0$/, ''))
      removeEventListener('keydown', onKey)
      if (!skip || askParcels) { skip = false; answer = await finale({ short: true, ask: askParcels }) }
    } else {
      await sleep(600); await coldOpen(); await warp(); await ignite(); await carousel(); await whatsNew()
      removeEventListener('keydown', onKey)
      clearCaption()
      // the last scene asks one question, even when the film itself was skipped
      skip = false
      answer = await finale()
    }

    // out: fade to the browser
    SFX.fadeOut(.9)
    root.classList.remove('on')
    await new Promise(r => { root.animate([{ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(1.05)', filter: 'blur(10px)' }], { duration: 800, easing: 'ease-in', fill: 'forwards' }).onfinish = r })
    cancelAnimationFrame(raf); removeEventListener('resize', size); root.remove()
    onDone && onDone({ parcels: answer })
  }
  window.Intro = { play, WHATS_NEW }
})()
