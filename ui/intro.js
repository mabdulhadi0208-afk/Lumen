/* Lumen's opening film. Cold open, warp, ignition, the logo forged from light, a 3D feature carousel,
   then one question before you start. Letterboxed, film grain, anamorphic flares,
   synthesized score. No emoji. Skippable at any point with Skip or Escape.
   Every release updates WHATS_NEW below, and after an update Lumen plays the short what's-new cut once. */
;(function () {
  // ---- edit this list every release: it is the "New in Lumen" act of the film
  const WHATS_NEW = {
    version: '1.20',
    items: [
      { icon: 'key', title: 'Hold-to-open Koi works', text: 'Set Koi to just Cmd Opt, or any two modifier keys, and holding them opens the fan.' },
      { icon: 'shield', title: 'One clear permission', text: 'If Lumen needs Accessibility, Koi says so, opens the right page and turns green once it is on.' },
      { icon: 'bolt', title: 'Never freezes Lumen', text: 'Koi listens for keys in its own process, and brings itself back if it ever stops.' },
      { icon: 'sparkle', title: 'Updates in your color', text: 'The update card takes your accent color, with an aurora, a shine and a burst when it is ready.' },
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
  #intro .mw{position:relative;width:min(700px,74vw);height:min(400px,46vh);border-radius:18px;overflow:hidden;color:#1c1d21;font:13px -apple-system,system-ui,sans-serif;
    background:#eef0f6;box-shadow:0 50px 120px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.1),0 0 90px rgba(111,139,255,.18);transform-style:preserve-3d}
  #intro .mw .tb{height:40px;display:flex;align-items:center;gap:5px;padding:0 12px}
  #intro .mw .lt{display:flex;gap:6px;margin-right:12px}#intro .mw .lt i{width:11px;height:11px;border-radius:50%;background:#ff5f57}#intro .mw .lt i:nth-child(2){background:#febc2e}#intro .mw .lt i:nth-child(3){background:#28c840}
  #intro .mw .t{height:28px;border-radius:8px;padding:0 10px;display:flex;align-items:center;gap:7px;color:#666;width:132px;white-space:nowrap;overflow:hidden;font-size:12px}
  #intro .mw .t b{width:12px;height:12px;border-radius:4px;flex:none}
  #intro .mw .t.on{background:#fff;color:#111;font-weight:600;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  #intro .mw .ub{margin:0 12px 8px;height:30px;border-radius:9px;background:#fff;display:flex;align-items:center;padding:0 12px;color:#888;box-shadow:0 2px 8px rgba(0,0,0,.05);font-size:12px;gap:8px}
  #intro .mw .pg{position:absolute;left:8px;right:8px;top:86px;bottom:8px;border-radius:11px;background:#fff;padding:22px 26px;overflow:hidden;transition:background 1.2s,color 1.2s}
  #intro .mw .ln{height:9px;border-radius:5px;background:#e9ecf3;margin:9px 0;transition:background 1.2s}
  #intro .mw .h{height:16px;width:55%;border-radius:6px;background:#d9def0;margin-bottom:14px;transition:background 1.2s}
  #intro .mw .ad{position:absolute;border-radius:10px;background:linear-gradient(135deg,#ff8787,#ffc078);color:#fff;font:700 11px/1 system-ui;display:grid;place-items:center;letter-spacing:.08em}
  #intro .mw .cnt{position:absolute;right:16px;top:12px;padding:5px 10px;border-radius:999px;background:linear-gradient(135deg,#5b8cff,#8a63f2);color:#fff;font:700 12px system-ui;box-shadow:0 6px 18px rgba(91,140,255,.45)}
  #intro .mw .cmdp{position:absolute;left:50%;top:70px;width:76%;margin-left:-38%;border-radius:14px;background:#fff;box-shadow:0 30px 70px rgba(0,0,0,.25),0 0 0 1px rgba(0,0,0,.05);overflow:hidden}
  #intro .mw .cmdp .in{height:48px;display:flex;align-items:center;gap:10px;padding:0 16px;font-size:16px}
  #intro .mw .cmdp .caret{width:2px;height:20px;background:#5b8cff;animation:blink 1s steps(2) infinite}
  @keyframes blink{50%{opacity:0}}
  #intro .mw .cmdp .r{height:36px;display:flex;align-items:center;gap:10px;padding:0 16px;color:#444;opacity:0}
  #intro .mw .cmdp .r.sel{background:rgba(91,140,255,.12);color:#111}
  #intro .mw .cmdp .r em{margin-left:auto;font-style:normal;color:#999;font-size:11px}
  #intro .mw .side{position:absolute;top:86px;right:8px;bottom:8px;width:38%;border-radius:11px;background:#f6f4ff;padding:16px;transform:translateX(110%);box-shadow:-10px 0 30px rgba(0,0,0,.06)}
  #intro .mw .side .ah{display:flex;align-items:center;gap:8px;font-weight:700;color:#6b4ff0;margin-bottom:12px}
  #intro .mw .side .ah i{width:18px;height:18px;border-radius:6px;background:linear-gradient(135deg,#5b8cff,#e9609c)}
  #intro .mw .side p{margin:0 0 8px;line-height:1.5;color:#333;font-size:12px}
  #intro .mw .tr{font-size:15px;line-height:1.7;color:#222;transition:opacity .3s}
  #intro .mw .split{position:absolute;inset:86px 8px 8px;display:flex;gap:8px}
  #intro .mw .split .pp{flex:1;border-radius:11px;background:#fff;padding:18px}
  #intro .mw .pcard{position:absolute;left:50%;top:50%;width:62%;margin:-58px 0 0 -31%;padding:18px;border-radius:16px;background:#fff;box-shadow:0 20px 50px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.04);display:flex;gap:14px;align-items:center}
  #intro .mw .pcard .k{width:44px;height:44px;border-radius:14px;flex:none;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#ff9f43,#ff6b6b);transition:background .6s}
  #intro .mw .pcard .k svg{width:22px;height:22px}
  #intro .mw .pcard b{display:block;font-size:15px;margin-bottom:3px}
  #intro .mw .pcard span{color:#888;font-size:12px}
  #intro .mw .steps{display:flex;gap:4px;margin-top:10px}
  #intro .mw .steps s{flex:1;height:4px;border-radius:2px;background:#e9ecf3;text-decoration:none;transition:background .4s}
  #intro .mw .steps s.on{background:#5b8cff}
  #intro .mw.dark{background:#1d1f26;color:#eee}
  #intro .mw.dark .pg{background:#121318;color:#eee}#intro .mw.dark .ln{background:#2a2d36}#intro .mw.dark .h{background:#3a3f52}
  #intro .mw.dark .ub{background:#2a2c33;color:#aaa}#intro .mw.dark .t.on{background:#2f3139;color:#fff}
  #intro .desk{position:relative;width:min(700px,74vw);height:min(400px,46vh);border-radius:18px;overflow:hidden;background:radial-gradient(120% 90% at 30% 20%,#2a2f5a,#12142a 60%,#0b0c18);box-shadow:0 50px 120px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.1)}
  #intro .desk .menubar{height:24px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:0 12px;font:600 11px -apple-system,system-ui,sans-serif;color:rgba(255,255,255,.75)}
  #intro .desk .menubar span{display:inline-flex;align-items:center;gap:6px} #intro .applogo.mb{width:15px;height:15px}
  #intro .desk .edge{position:absolute;inset:0;border-radius:18px;box-shadow:inset 0 0 0 0 rgba(0,255,133,0);transition:box-shadow 1.1s cubic-bezier(.2,.9,.3,1)}
  #intro .desk.lit .edge{box-shadow:inset 0 0 40px 10px rgba(0,255,133,.55),inset 0 0 120px 20px rgba(0,212,255,.25)}
  #intro .desk .chg{position:absolute;left:50%;top:58px;transform:translateX(-50%) scale(.6);opacity:0;padding:9px 16px;border-radius:999px;background:rgba(20,22,36,.85);color:#fff;font:700 13px system-ui;display:flex;gap:10px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.4);transition:all .7s cubic-bezier(.3,1.5,.5,1)}
  #intro .desk.lit .chg{transform:translateX(-50%) scale(1);opacity:1}
  #intro .desk .chg i{width:44px;height:14px;border-radius:5px;border:2px solid rgba(255,255,255,.6);position:relative}
  #intro .desk .chg i::after{content:'';position:absolute;left:1px;top:1px;bottom:1px;width:0;border-radius:2px;background:#00FF85;transition:width 1.6s ease}
  #intro .desk.lit .chg i::after{width:68%}
  #intro .desk .rip{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #5b8cff;opacity:0}
  #intro .desk .keys{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);display:flex;gap:6px}
  #intro .desk .keys b{width:34px;height:34px;border-radius:8px;background:rgba(255,255,255,.1);box-shadow:inset 0 -3px 0 rgba(0,0,0,.35);display:grid;place-items:center;color:#fff;font:700 13px system-ui;transition:transform .12s,background .12s}
  #intro .desk .keys b.dn{transform:translateY(2px);background:rgba(91,140,255,.55)}
  #intro .desk .fan{position:absolute;left:50%;top:58%}
  #intro .desk .fan i{position:absolute;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:14px;box-shadow:0 10px 24px rgba(0,0,0,.4);opacity:0;display:grid;place-items:center;color:#fff;font:800 18px system-ui}
  #intro .desk .cur{position:absolute;left:50%;top:58%;width:14px;height:20px;margin:-2px 0 0 -2px;background:#fff;clip-path:polygon(0 0,0 100%,30% 72%,55% 100%,70% 92%,47% 66%,85% 66%);filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
  #intro .tourcap{position:absolute;left:0;right:0;bottom:calc(10.5vh + 30px);text-align:center;z-index:7}
  #intro .tourcap .n{display:inline-block;font:700 11px/1 var(--font);letter-spacing:.22em;color:#9fb3ff;margin-bottom:10px}
  #intro .tourcap h2{font:750 clamp(24px,3vw,38px)/1.1 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.03em;margin:0 0 8px}
  #intro .tourcap p{margin:0 auto;max-width:600px;color:#b3bade;font-size:15px;line-height:1.5}
  #intro .tourcap kbd{font:600 12px var(--font);padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 -1px 0 rgba(255,255,255,.15)}
  #intro .cap{position:absolute;left:0;right:0;bottom:calc(10.5vh + 34px);text-align:center;z-index:7}
  #intro .cap h2{font:700 clamp(24px,3vw,40px)/1.1 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.03em;margin:0 0 10px;min-height:1.1em}
  #intro .cap p{margin:0 auto;max-width:560px;color:#a9b0d6;font-size:15px;line-height:1.5;min-height:1.5em}
  #intro .cap .w{display:inline-block;opacity:0}
  #intro .new{width:min(980px,86vw);text-align:center}
  #intro .new .eyebrow{display:inline-block;font:700 12px/1 var(--font);letter-spacing:.24em;text-transform:uppercase;color:#9fb3ff;padding:8px 14px;border-radius:999px;background:rgba(142,164,255,.12);box-shadow:inset 0 0 0 1px rgba(142,164,255,.3)}
  #intro .new h1{font:800 clamp(40px,5.4vw,76px)/1.02 "SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.04em;margin:18px 0 34px;background:linear-gradient(100deg,#fff 30%,#b2c1ff 60%,#d3b2ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .new h1.sweep{animation:nsweep 1.6s cubic-bezier(.3,.7,.2,1)}
  @keyframes nsweep{0%{background-image:linear-gradient(100deg,#fff 30%,#b2c1ff 60%,#d3b2ff),linear-gradient(100deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);background-size:100% 100%,250% 100%;background-position:0 0,120% 0}100%{background-image:linear-gradient(100deg,#fff 30%,#b2c1ff 60%,#d3b2ff),linear-gradient(100deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);background-size:100% 100%,250% 100%;background-position:0 0,-20% 0}}
  #intro .new .it{position:relative;overflow:hidden}
  #intro .new .it::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.14) 50%,transparent 65%);transform:translateX(-120%);animation:itshine 1.4s 1.6s cubic-bezier(.3,.7,.2,1) forwards}
  @keyframes itshine{to{transform:translateX(120%)}}
  #intro .new .grid{display:grid;grid-template-columns:repeat(var(--cols,3),minmax(0,1fr));gap:16px;text-align:left}
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
  // ------------------------------------------------------------ sound: friendly, bright and crisp, all synthesized (no files)
  // A warm major pad, bell chimes, bubbly pops and soft air. Nothing low, buzzy or ominous.
  const SFX = (() => {
    let ac, master, verb, comp, muted = false, padNodes = []
    const NOTE = n => 440 * Math.pow(2, (n - 69) / 12)        // MIDI note to Hz
    function init() {
      if (ac) return
      try { ac = new (window.AudioContext || window.webkitAudioContext)() } catch { return }
      comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(ac.destination)
      master = ac.createGain(); master.gain.value = 0; master.connect(comp)
      master.gain.linearRampToValueAtTime(.8, ac.currentTime + 1.2)
      // a short, bright room: sparkle without a cave
      verb = ac.createConvolver()
      const len = ac.sampleRate * 1.8, ir = ac.createBuffer(2, len, ac.sampleRate)
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) }
      verb.buffer = ir
      const vg = ac.createGain(); vg.gain.value = .32; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300
      verb.connect(hp); hp.connect(vg); vg.connect(master)
    }
    const out = (node, wet = .3) => { const d = ac.createGain(); d.gain.value = 1; node.connect(d); d.connect(master); if (wet) { const w = ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(verb) } }
    // a bell: sine plus a quiet octave and a fifth above, fast attack, gentle ring
    function bell(freq, t, { vol = .12, dur = 1.4, wet = .35 } = {}) {
      for (const [m, v] of [[1, 1], [2, .28], [3, .08]]) {
        const o = ac.createOscillator(), g = ac.createGain()
        o.type = 'sine'; o.frequency.value = freq * m
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * v, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur / m)
        o.connect(g); out(g, wet); o.start(t); o.stop(t + dur + .05)
      }
    }
    // a soft pluck, like a marimba
    function pluck(freq, t, vol = .1) {
      const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter()
      o.type = 'triangle'; o.frequency.value = freq; lp.type = 'lowpass'; lp.frequency.setValueAtTime(freq * 6, t); lp.frequency.exponentialRampToValueAtTime(freq * 1.5, t + .25)
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .45)
      o.connect(lp); lp.connect(g); out(g, .25); o.start(t); o.stop(t + .5)
    }
    function air(t, dur, { from = 1200, to = 4200, vol = .05, q = .8 } = {}) {
      const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      const n = ac.createBufferSource(); n.buffer = b
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur * .6)
      const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .4); g.gain.exponentialRampToValueAtTime(.0001, t + dur)
      n.connect(bp); bp.connect(g); out(g, .2); n.start(t)
    }
    const C = [60, 64, 67, 71, 74]          // C major 9: warm and open
    const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91]
    const api = {
      init,
      // a warm bed under the film: soft sines, slowly breathing, never low or buzzy
      drone() {
        if (!ac) return
        const t = ac.currentTime, g = ac.createGain(), lp = ac.createBiquadFilter()
        lp.type = 'lowpass'; lp.frequency.value = 1400
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + 3)
        for (const [n, det] of [[48, 0], [55, 4], [60, -3], [64, 5], [71, -4]]) {
          const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = NOTE(n); o.detune.value = det
          const og = ac.createGain(); og.gain.value = n < 50 ? .6 : 1
          const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .1 + Math.random() * .15; lg.gain.value = .35; lfo.connect(lg); lg.connect(og.gain); lfo.start()
          o.connect(og); og.connect(lp); o.start(); padNodes.push(o, lfo)
        }
        lp.connect(g); out(g, .4)
      },
      // building up: a gentle rising arpeggio with a breath of air
      riser(sec = 2.3) {
        if (!ac) return
        const t = ac.currentTime
        PENTA.forEach((n, i) => pluck(NOTE(n - 12), t + i * (sec / PENTA.length), .05 + i * .006))
        air(t, sec, { from: 600, to: 5200, vol: .035 })
      },
      // the reveal: a bright bloom of bells, no boom
      impact() {
        if (!ac) return
        const t = ac.currentTime
        C.forEach((n, i) => bell(NOTE(n + 12), t + i * .035, { vol: .09, dur: 2.6, wet: .45 }))
        bell(NOTE(48), t, { vol: .1, dur: 2, wet: .2 })
        air(t, .7, { from: 6000, to: 2500, vol: .03 })
      },
      whoosh() { if (ac) air(ac.currentTime, .55, { from: 900, to: 3800, vol: .04, q: 1.1 }) },
      pop(pitch = 1) {
        if (!ac) return
        const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain()
        o.type = 'sine'; o.frequency.setValueAtTime(520 * pitch, t); o.frequency.exponentialRampToValueAtTime(980 * pitch, t + .07)
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .16)
        o.connect(g); out(g, .15); o.start(t); o.stop(t + .2)
      },
      // a crisp little keyboard click
      key() {
        if (!ac) return
        const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), hp = ac.createBiquadFilter()
        o.type = 'square'; o.frequency.value = 2400 + Math.random() * 600; hp.type = 'highpass'; hp.frequency.value = 2000
        g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .022)
        o.connect(hp); hp.connect(g); out(g, 0); o.start(t); o.stop(t + .03)
      },
      tick(i) { if (ac) pluck(NOTE(PENTA[i % PENTA.length]), ac.currentTime, .035) },
      shimmer() { if (!ac) return; const t = ac.currentTime; [84, 88, 91, 96].forEach((n, i) => bell(NOTE(n), t + i * .06, { vol: .035, dur: 1.2, wet: .5 })) },
      // the ending: a happy resolved chord
      chord() {
        if (!ac) return
        const t = ac.currentTime
        ;[60, 64, 67, 72, 76].forEach((n, i) => { bell(NOTE(n), t + i * .07, { vol: .08, dur: 3, wet: .45 }); pluck(NOTE(n + 12), t + i * .07 + .02, .04) })
      },
      // a gentle "ding" for good news (delivered, saved)
      ding() { if (ac) { const t = ac.currentTime; bell(NOTE(84), t, { vol: .07, dur: 1 }); bell(NOTE(91), t + .09, { vol: .06, dur: 1.2 }) } },
      fadeOut(sec = 1.2) {
        if (!ac) return
        const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + sec)
        setTimeout(() => { try { padNodes.forEach(o => o.stop()); ac.close() } catch {} ac = null; padNodes = [] }, sec * 1000 + 200)
      },
      toggleMute() { if (!ac) return muted; muted = !muted; master.gain.setTargetAtTime(muted ? 0 : .8, ac.currentTime, .1); return muted },
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
  const sky = { oy: 0, speed: .4, warp: 0, gather: 0, orb: 0, orbR: 0, ring: 0, shock: [], flash: 0, shake: 0, hue: 228, rays: 0, bokeh: 0 }
  let bokeh = []   // out-of-focus lights drifting in front of the camera
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
    // bokeh: soft discs of light, like dust lit up right in front of the lens
    if (sky.bokeh > .01) {
      const t = performance.now() / 1000
      for (const b of bokeh) {
        const x = (b.x + Math.sin(t * b.sx + b.p) * .04) * W, y = (b.y + Math.cos(t * b.sy + b.p) * .03) * H - (t * b.v % 1.4) * H * .08
        const g = cx.createRadialGradient(x, y, 0, x, y, b.r)
        g.addColorStop(0, `hsla(${b.h},90%,78%,${.16 * b.a * sky.bokeh})`); g.addColorStop(.72, `hsla(${b.h},90%,72%,${.11 * b.a * sky.bokeh})`); g.addColorStop(.86, `hsla(${b.h},95%,82%,${.2 * b.a * sky.bokeh})`); g.addColorStop(1, `hsla(${b.h},90%,70%,0)`)
        cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, b.r, 0, 6.283); cx.fill()
      }
    }
    // god rays: slow beams of light fanning out from the orb
    if (sky.rays > .01 && sky.orb > .01) {
      const t = performance.now() / 1000, L = Math.max(W, H) * 1.1
      cx.save(); cx.translate(cxm, oyc)
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * 6.283 + t * .05 + Math.sin(t * .3 + i) * .04, w = .05 + (i % 3) * .025
        const g = cx.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L)
        g.addColorStop(0, `hsla(${sky.hue + (i % 4) * 14},100%,80%,${.13 * sky.rays * sky.orb})`); g.addColorStop(1, 'hsla(230,100%,70%,0)')
        cx.fillStyle = g; cx.beginPath(); cx.moveTo(0, 0); cx.arc(0, 0, L, a - w, a + w); cx.closePath(); cx.fill()
      }
      cx.restore()
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
  function boom() { sky.flash = .35; sky.shake = 7; sky.shock.push({ r: 10, a: .9 }); setTimeout(() => sky.shock.push({ r: 10, a: .5 }), 140); flare(1); if (!skip) SFX.impact() }
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
    tween(sky, 'ring', 1, 1500); tween(sky, 'rays', 1, 1800)
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
    tween(sky, 'orb', 0, 900); tween(sky, 'ring', 0, 700); tween(sky, 'rays', 0, 900)
    await leave(s)
  }
  // ------------------------------------------------------------ the tour: every feature shown doing its thing
  const MW = (inner, tabs = ['GitHub', 'Lisbon trip', 'Recipes']) => `<div class="mw"><div class="tb"><div class="lt"><i></i><i></i><i></i></div>${tabs.map((t, i) => `<div class="t${i === 0 ? ' on' : ''}"><b style="background:${['#24292f', '#5b8cff', '#ff8a3d', '#2fb67c'][i % 4]}"></b>${t}</div>`).join('')}</div><div class="ub">${ICONS.search || ''}<span>lumen.app</span></div>${inner}</div>`
  const LINES = n => '<div class="h"></div>' + Array.from({ length: n }, (_, i) => `<div class="ln" style="width:${[92, 80, 96, 70, 88, 60, 84][i % 7]}%"></div>`).join('')
  const TOUR = [
    { title: 'Tabs, right where you expect them.', text: 'Press <kbd>Cmd T</kbd> for a new tab. Drag tabs to reorder, and they spring into place.', build: () => MW(`<div class="pg">${LINES(7)}</div>`, ['GitHub']), play: async s => {
      const tb = s.querySelector('.tb')
      for (const [i, t] of ['Lisbon trip', 'Recipes', 'New Tab'].entries()) { await sleep(420); const el = document.createElement('div'); el.className = 't'; el.innerHTML = `<b style="background:${['#5b8cff', '#ff8a3d', '#2fb67c'][i]}"></b>${t}`; tb.appendChild(el); anim(el, [{ opacity: 0, transform: 'translateY(-10px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 700 }); if (!skip) SFX.pop(1 + i * .12) }
      await sleep(500); const ts = tb.querySelectorAll('.t'); ts.forEach(t => t.classList.remove('on')); ts[2].classList.add('on'); anim(ts[2], [{ transform: 'scale(.92)' }, { transform: 'none' }], { duration: 600 }); if (!skip) SFX.key()
    } },
    { title: 'One bar does everything.', text: '<kbd>Cmd K</kbd> searches the web, finds open tabs and history, converts units and runs any action.', build: () => MW(`<div class="pg">${LINES(7)}</div><div class="cmdp"><div class="in"><span class="q"></span><span class="caret"></span></div><div class="r sel">Search for <b class="qq" style="margin-left:4px"></b><em>Search</em></div><div class="r">Lisbon trip<em>Switch to tab</em></div><div class="r">Flights to Lisbon, last week<em>History</em></div><div class="r">Focus mode<em>Shift Cmd F</em></div></div>`), play: async s => {
      const q = 'flights to lisbon', qe = s.querySelector('.q'), qq = s.querySelector('.qq')
      for (let i = 1; i <= q.length && !skip; i++) { qe.textContent = qq.textContent = q.slice(0, i); SFX.key(); await sleep(55) }
      s.querySelectorAll('.cmdp .r').forEach((r, i) => anim(r, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 550, delay: i * 80 }))
      if (!skip) SFX.shimmer()
    } },
    { title: 'Ads and trackers, gone.', text: 'Blocked before they load, on every site. Pages get faster and nobody follows you around.', build: () => MW(`<div class="pg">${LINES(7)}<div class="ad" style="left:58%;top:18px;width:150px;height:70px">AD</div><div class="ad" style="left:6%;top:120px;width:200px;height:46px">AD</div><div class="ad" style="left:52%;top:150px;width:120px;height:90px">AD</div><span class="cnt">0 blocked</span></div>`), play: async s => {
      const ads = s.querySelectorAll('.ad'), c = s.querySelector('.cnt'); let n = 0
      for (const a of ads) { await sleep(520); anim(a, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.12)', opacity: 1, offset: .3 }, { transform: 'scale(0) rotate(12deg)', opacity: 0 }], { duration: 600 }); if (!skip) SFX.pop(.8 + n * .15); n += 8; c.textContent = n + ' blocked'; anim(c, [{ transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 500 }) }
    } },
    { title: 'Ask Lumen AI about any page.', text: 'Open the side panel for a summary, key points or an explanation of what you selected.', build: () => MW(`<div class="pg">${LINES(7)}</div><div class="side"><div class="ah"><i></i>Lumen AI</div><p class="ai"></p></div>`), play: async s => {
      anim(s.querySelector('.side'), [{ transform: 'translateX(110%)' }, { transform: 'none' }], { duration: 800 }); if (!skip) SFX.whoosh()
      await sleep(600); const p = s.querySelector('.ai'), txt = 'This page compares three ways to get to Lisbon. The train is cheapest, the flight is fastest, and booking two weeks ahead saves the most.'
      for (const w of txt.split(' ')) { if (skip) break; p.textContent += w + ' '; await sleep(45) }
    } },
    { title: 'Translate the whole page.', text: 'Any language into yours in a moment. Arabic and Hebrew even flip from right-to-left.', build: () => MW(`<div class="pg"><div class="tr" dir="rtl" style="text-align:right">مرحبا بكم في لشبونة. المدينة جميلة في الربيع، والقطارات سريعة ومريحة.</div><br>${LINES(4)}</div>`), play: async s => {
      await sleep(900); const tr = s.querySelector('.tr'); tr.style.opacity = 0; await sleep(300)
      tr.dir = 'ltr'; tr.style.textAlign = 'left'; tr.textContent = 'Welcome to Lisbon. The city is beautiful in spring, and the trains are fast and comfortable.'; tr.style.opacity = 1
      anim(tr, [{ transform: 'translateX(30px)', filter: 'blur(6px)' }, { transform: 'none', filter: 'blur(0)' }], { duration: 700 }); if (!skip) SFX.shimmer()
    } },
    { title: 'Dark mode for every website.', text: 'One switch turns light sites dark, and sites that are already dark are left alone.', build: () => MW(`<div class="pg">${LINES(7)}</div>`), play: async s => {
      await sleep(900); s.querySelector('.mw').classList.add('dark'); if (!skip) SFX.whoosh()
    } },
    { title: 'Two pages, side by side.', text: '<kbd>Shift Cmd \\</kbd> opens split view. Reader mode, picture in picture and screenshots are one shortcut away too.', build: () => MW(`<div class="split"><div class="pp">${LINES(5)}</div><div class="pp">${LINES(5)}</div></div>`), play: async s => {
      const ps = s.querySelectorAll('.pp'); anim(ps[0], [{ transform: 'translateX(50%)' }, { transform: 'none' }], { duration: 900 }); anim(ps[1], [{ transform: 'translateX(-50%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900 }); if (!skip) SFX.whoosh()
    } },
    { title: 'Surge, built in.', text: 'Your Mac lights up when it charges. Keys and clicks get sounds, clicks get ripples, and there is a new Dock, a focus timer and more.', build: () => `<div class="desk"><div class="menubar"><span>${appLogo('surge', 'mb')}Surge</span><span>67%</span><span>9:41</span></div><div class="edge"></div><div class="chg"><i></i>Charging  67%</div><div class="keys">${'LUMEN'.split('').map(k => `<b>${k}</b>`).join('')}</div></div>`, play: async s => {
      const d = s.querySelector('.desk'); await sleep(300); d.classList.add('lit'); if (!skip) SFX.shimmer()
      const keys = s.querySelectorAll('.keys b')
      for (const k of keys) { await sleep(170); k.classList.add('dn'); if (!skip) SFX.key(); setTimeout(() => k.classList.remove('dn'), 130) }
      for (const [x, y] of [[30, 45], [70, 38], [52, 70]]) { const r = document.createElement('i'); r.className = 'rip'; r.style.left = x + '%'; r.style.top = y + '%'; d.appendChild(r); anim(r, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(4)', opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.2,.8,.3,1)' }); if (!skip) SFX.pop(1.1); await sleep(260) }
    } },
    { title: 'Koi, one key away.', text: 'Press <kbd>Option Space</kbd> and your apps bloom around the cursor in a springy fan. Type a letter or click to open one.', build: () => `<div class="desk"><div class="menubar"><span>${appLogo('koi', 'mb')}Koi</span><span>9:41</span></div><div class="fan"></div><div class="cur"></div></div>`, play: async s => {
      const fan = s.querySelector('.fan'), apps = [['#ff5f57', 'M'], ['#febc2e', 'N'], ['#28c840', 'F'], ['#5b8cff', 'S'], ['#8a63f2', 'C'], ['#e9609c', 'P'], ['#20c997', 'T']]
      apps.forEach(([c, l], i) => {
        const el = document.createElement('i'); el.style.background = `linear-gradient(135deg, ${c}, ${c}aa)`; el.textContent = l; fan.appendChild(el)
        const a = (-160 + i * (140 / (apps.length - 1))) * Math.PI / 180, R = 120
        anim(el, [{ opacity: 0, transform: 'translate(0,0) scale(.3)' }, { opacity: 1, transform: `translate(${Math.cos(a) * R}px, ${Math.sin(a) * R}px) scale(1)` }], { duration: 900, delay: 200 + i * 60, easing: 'cubic-bezier(.3,1.5,.5,1)' })
        setTimeout(() => !skip && SFX.pop(.9 + i * .07), 200 + i * 60)
      })
      await sleep(1500); const pick = fan.children[3]; anim(pick, [{ scale: 1 }, { scale: 1.35 }, { scale: 1.2 }], { duration: 500, composite: 'add' }); if (!skip) SFX.ding()
    } },
    { title: 'Every parcel, until it arrives.', text: 'Track any delivery, and the orders you place are saved. One click takes you straight back to your order.', build: () => MW(`<div class="pg" style="background:#f4f5fa"><div class="pcard"><div class="k">${ICONS.box || ''}</div><div style="flex:1"><b>New headphones</b><span class="st">Order placed  ·  UPS</span><div class="steps"><s class="on"></s><s></s><s></s><s></s></div></div></div></div>`), play: async s => {
      const st = s.querySelector('.st'), steps = s.querySelectorAll('.steps s'), k = s.querySelector('.pcard .k')
      for (const [i, t] of ['On the way', 'Out for delivery', 'Delivered'].entries()) { await sleep(620); steps[i + 1].classList.add('on'); st.textContent = t + '  ·  UPS'; if (!skip) SFX.tick(i * 2) }
      k.style.background = 'linear-gradient(135deg,#34c759,#30b04f)'; anim(s.querySelector('.pcard'), [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 600 }); if (!skip) SFX.ding()
    } },
  ]
  async function tour() {
    tween(sky, 'bokeh', .45, 1800)
    const cap = document.createElement('div'); cap.className = 'tourcap'; cap.innerHTML = '<span class="n"></span><h2></h2><p></p>'; root.appendChild(cap)
    for (let i = 0; i < TOUR.length && !skip; i++) {
      const f = TOUR[i], s = scene(f.build())
      const mw = s.querySelector('.mw, .desk')
      mw.animate([{ opacity: 0, transform: 'perspective(1400px) translateY(40px) rotateX(14deg) scale(.92)', filter: 'blur(10px)' }, { opacity: 1, transform: 'perspective(1400px) translateY(-6vh) rotateX(4deg) scale(1)', filter: 'blur(0)' }], { duration: 1000, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' })
      cap.querySelector('.n').textContent = String(i + 1).padStart(2, '0') + '  /  ' + String(TOUR.length).padStart(2, '0')
      words(cap.querySelector('h2'), f.title, 60, 45)
      cap.querySelector('p').innerHTML = f.text; anim(cap.querySelector('p'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 250 })
      if (!skip) SFX.whoosh()
      await sleep(650)
      await f.play(s)
      await sleep(1500)
      await leave(s, 550)
    }
    cap.remove()
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
    tween(sky, 'bokeh', 1, 1600)
    const s = scene(`<div class="new"><span class="eyebrow">New in Lumen ${version || WHATS_NEW.version}</span><h1>Fresh this version.</h1><div class="grid" style="--cols:${items.length === 4 ? 2 : 3}">${items.map(it => `<div class="it"><div class="k">${ICONS[it.icon] || ''}</div><b>${it.title}</b><span>${it.text}</span></div>`).join('')}</div></div>`)
    anim(s.querySelector('.eyebrow'), [{ opacity: 0, transform: 'translateY(-10px)', letterSpacing: '.6em' }, { opacity: 1, transform: 'none', letterSpacing: '.24em' }], { duration: 1200 })
    anim(s.querySelector('h1'), [{ opacity: 0, filter: 'blur(16px)', transform: 'scale(1.1)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 1300, delay: 150, easing: 'cubic-bezier(.16,1,.3,1)' })
    s.querySelectorAll('.it').forEach((el, i) => {
      anim(el, [{ opacity: 0, transform: 'translateY(40px) rotateX(30deg) scale(.9)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1100, delay: 650 + i * 160 })
      setTimeout(() => !skip && SFX.pop(1 + i * .1), 650 + i * 160)
    })
    const hold = 1400 + items.length * 160 + 3000
    anim(s.querySelector('.new'), [{ transform: 'perspective(1200px) translateZ(0)' }, { transform: 'perspective(1200px) translateZ(46px)' }], { duration: hold + 800, easing: 'cubic-bezier(.3,0,.4,1)', fill: 'forwards' })
    setTimeout(() => { if (!skip) { s.querySelector('h1').classList.add('sweep'); SFX.shimmer && SFX.shimmer() } }, 1500)
    await sleep(hold)
    tween(sky, 'bokeh', 0, 900)
    await leave(s, 800)
  }
  async function finale({ short = false, ask = !short } = {}) {
    if (!skip) SFX.chord()
    // the orb rises above the title so it never sits on top of the words
    sky.orbR = 0; sky.oy = -Math.min(H * .3, 250); tween(sky, 'orb', .8, 1200); tween(sky, 'orbR', 14, 1200); tween(sky, 'ring', 1, 1600); tween(sky, 'rays', .7, 2000); tween(sky, 'bokeh', .5, 2000)
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
    bokeh = Array.from({ length: 16 }, () => ({ x: Math.random(), y: .1 + Math.random() * .9, r: 30 + Math.random() * 90, h: [222, 252, 285, 320][Math.floor(Math.random() * 4)], a: .4 + Math.random() * .6, sx: .1 + Math.random() * .25, sy: .08 + Math.random() * .2, p: Math.random() * 6, v: .01 + Math.random() * .03 }))
    t0 = performance.now(); total = wn ? 12500 : 61000
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
      await sleep(600); await coldOpen(); await warp(); await ignite(); await tour()   // a first launch shows what Lumen can do; what is new is only for people who update
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
