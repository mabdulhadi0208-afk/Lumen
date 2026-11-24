/* Lumen's opening film, reshot in Nova (1.23). A title sequence that racks focus word by word, a warp through an
   accent nebula, ignition (orb, god rays, anamorphic streak, lens ghosts, a chromatic logo), a guided tour of live
   demos in liquid glass with parallax camera moves and light leaks between shots, the What is new act after an
   update, and a finale where the letterbox opens up and asks one question. Everything is lit in your accent color.
   Synthesized, friendly score. No emoji. Skippable at any point with Skip or Escape.
   Every release rewrites WHATS_NEW below, and after an update Lumen plays the short what's-new cut once. */
;(function () {
  // ---- edit this list every release: it is the "New in Lumen" act of the film
  const WHATS_NEW = {
    version: '1.23',
    items: [
      { icon: 'sparkle', title: 'Lumen Nova', text: 'A brand new design for absolutely everything: liquid glass, bolder type and light that follows your color.' },
      { icon: 'tabs', title: 'A new browser', text: 'Tabs, the address bar, the command bar, menus and panels, all rebuilt in Nova.' },
      { icon: 'bolt', title: 'Surge and Koi in Nova', text: 'Every window, menu and the app fan, redesigned to match.' },
      { icon: 'play', title: 'A new film', text: 'This intro was reshot from the first frame to the last.' },
    ],
  }
  const HEAD = 'ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,system-ui,sans-serif'
  const css = `
  #intro{--a:#5b8cff;--a2:oklch(from var(--a) calc(l - .02) c calc(h + 40));--a3:oklch(from var(--a) calc(l + .04) c calc(h + 95));--nova:linear-gradient(135deg,var(--a),var(--a2) 55%,var(--a3));
    --hi:color-mix(in oklab,var(--a) 42%,#fff);--hi3:color-mix(in oklab,var(--a3) 46%,#fff);--bar:calc(10.5vh + 6px);
    position:fixed;inset:0;z-index:1000;background:#05060d;color:#eef0fb;overflow:hidden;font-family:var(--font);-webkit-app-region:no-drag;user-select:none}
  #intro canvas{position:absolute;inset:0;width:100%;height:100%}
  #intro .cam{position:absolute;inset:-40px;will-change:transform}
  #intro .nebw{position:absolute;inset:-15%;will-change:transform}
  #intro .neb{position:absolute;inset:0;opacity:0;transition:opacity 3s;
    background:radial-gradient(40% 36% at 28% 34%,color-mix(in srgb,var(--a) 26%,transparent),transparent 70%),radial-gradient(38% 34% at 74% 64%,color-mix(in srgb,var(--a2) 24%,transparent),transparent 70%),radial-gradient(26% 26% at 52% 48%,color-mix(in srgb,var(--a3) 14%,transparent),transparent 70%)}
  #intro.lit .neb{opacity:1;animation:neb 18s ease-in-out infinite alternate}
  @keyframes neb{to{transform:translate3d(3%,-2%,0) scale(1.08) rotate(2deg)}}
  #intro .flare{position:absolute;left:50%;top:50%;width:160vw;height:3px;margin-left:-80vw;border-radius:50%;opacity:0;pointer-events:none;z-index:3;
    background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--a) 0%,transparent) 10%,color-mix(in srgb,var(--hi) 60%,transparent) 38%,#fff 50%,color-mix(in srgb,var(--hi3) 60%,transparent) 62%,transparent 90%);filter:blur(1px);box-shadow:0 0 40px 6px color-mix(in srgb,var(--a) 40%,transparent)}
  #intro .leak{position:absolute;inset:-20%;z-index:5;pointer-events:none;opacity:0;mix-blend-mode:screen;filter:blur(30px);
    background:radial-gradient(30% 50% at 20% 40%,rgba(255,170,110,.55),transparent 70%),radial-gradient(34% 60% at 46% 60%,color-mix(in srgb,var(--a3) 55%,transparent),transparent 70%),radial-gradient(24% 40% at 70% 30%,color-mix(in srgb,var(--a) 50%,transparent),transparent 70%)}
  #intro .grain{position:absolute;inset:-6%;z-index:6;pointer-events:none;opacity:.065;mix-blend-mode:screen}
  #intro .vig{position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(125% 95% at 50% 50%,transparent 44%,rgba(0,0,0,.8))}
  #intro .bar{position:absolute;left:0;right:0;height:var(--bar);background:#000;z-index:8;transition:transform 1.6s cubic-bezier(.3,1.12,.5,1)}
  #intro .bar.t{top:-6px;transform:translateY(-100%)} #intro .bar.b{bottom:-6px;transform:translateY(100%)}
  #intro .bar::after{content:'';position:absolute;left:0;right:0;height:1px;opacity:.5;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--a) 70%,transparent),transparent)}
  #intro .bar.t::after{bottom:0} #intro .bar.b::after{top:0}
  #intro.on .bar{transform:none}
  #intro.on.wide .bar.t{transform:translateY(-100%)} #intro.on.wide .bar.b{transform:translateY(100%)}
  #intro .stage{position:absolute;inset:0;display:grid;place-items:center;z-index:4;perspective:1400px}
  #intro .scene{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;transform-style:preserve-3d}
  #intro .scene.live{pointer-events:auto}
  #intro .glass{position:relative;border-radius:24px;background:linear-gradient(150deg,rgba(255,255,255,.13),rgba(255,255,255,.035) 60%,rgba(255,255,255,.06)),rgba(10,12,26,.34);backdrop-filter:blur(28px) saturate(1.8);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 24px 60px -18px color-mix(in srgb,var(--a) 55%,transparent),0 40px 100px -30px color-mix(in srgb,var(--a3) 35%,transparent),0 50px 120px rgba(0,0,0,.5)}
  #intro .glass::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:linear-gradient(135deg,color-mix(in srgb,var(--a) 90%,#fff),transparent 42%,transparent 60%,var(--a3));
    -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
  #intro .sweep{position:relative;overflow:hidden}
  #intro .sweep::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.2) 50%,transparent 65%);transform:translateX(-120%);animation:isw 1.5s var(--sd,1s) cubic-bezier(.3,.7,.2,1) forwards}
  @keyframes isw{to{transform:translateX(120%)}}
  /* title sequence */
  #intro .title{position:relative;width:100%;height:100%;display:grid;place-items:center}
  #intro .title .ph{position:absolute;font:800 clamp(34px,5vw,72px)/1 ${HEAD};letter-spacing:-.03em;color:#f1f3ff;white-space:nowrap;opacity:0;text-shadow:0 0 40px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .title .ph em{font-style:normal;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent;filter:brightness(1.35) saturate(1.1)}
  #intro .title .fil{position:absolute;left:50%;top:calc(50% + clamp(34px,4.4vw,60px));width:min(520px,60vw);height:2px;margin-left:min(-260px,-30vw);border-radius:2px;transform:scaleX(0);
    background:linear-gradient(90deg,transparent,var(--hi) 30%,#fff 50%,var(--hi3) 70%,transparent);box-shadow:0 0 18px 2px color-mix(in srgb,var(--a) 60%,transparent)}
  #intro .title .pre{position:absolute;top:calc(50% - clamp(70px,8vw,110px));font:700 11px/1 var(--font);letter-spacing:.5em;text-transform:uppercase;color:color-mix(in srgb,var(--hi) 80%,transparent);opacity:0}
  /* ignition */
  #intro .kicker{display:inline-block;font:700 11.5px/1 var(--font);letter-spacing:.46em;text-transform:uppercase;color:var(--hi);margin-bottom:22px;opacity:0;padding-left:.46em}
  #intro .logo{position:relative;font:800 clamp(72px,12vw,168px)/1 ${HEAD};letter-spacing:-.05em;white-space:nowrap}
  #intro .logo span{display:inline-block;background:linear-gradient(100deg,#fff 12%,var(--hi) 55%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent;opacity:0;padding-bottom:.06em}
  #intro .logo .glint{position:absolute;inset:0;font:inherit;letter-spacing:inherit;white-space:nowrap;color:transparent;pointer-events:none;background:linear-gradient(100deg,transparent 42%,rgba(255,255,255,.95) 50%,transparent 58%);background-size:300% 100%;background-position:120% 0;-webkit-background-clip:text;background-clip:text;opacity:0}
  #intro .rule{width:min(420px,50vw);height:1px;margin:22px auto 0;background:linear-gradient(90deg,transparent,var(--hi),transparent);transform:scaleX(0)}
  #intro .tag{color:#b5bcdf;font-size:clamp(15px,1.5vw,20px);margin-top:16px;text-align:center;letter-spacing:.02em}
  #intro .tag .w,#intro .tourcap .w{display:inline-block;opacity:0}
  /* the tour: live demos in a liquid glass frame */
  #intro .rig{position:relative;transform-style:preserve-3d;will-change:transform,filter,opacity}
  #intro .glassf{padding:10px;border-radius:28px}
  #intro .glassf::after{content:'';position:absolute;left:8%;right:8%;bottom:-70px;height:60px;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 45%,transparent),transparent);filter:blur(14px);opacity:.75}
  #intro .mw{position:relative;width:min(700px,72vw);height:min(390px,44vh);border-radius:18px;overflow:hidden;color:#1c1d21;font:13px -apple-system,system-ui,sans-serif;
    background:linear-gradient(180deg,#f5f6fb,#eceef6);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 0 0 1px rgba(255,255,255,.08);transform-style:preserve-3d}
  #intro .mw .tb{height:40px;display:flex;align-items:center;gap:5px;padding:0 12px}
  #intro .mw .lt{display:flex;gap:6px;margin-right:12px}#intro .mw .lt i{width:11px;height:11px;border-radius:50%;background:#ff5f57}#intro .mw .lt i:nth-child(2){background:#febc2e}#intro .mw .lt i:nth-child(3){background:#28c840}
  #intro .mw .t{height:28px;border-radius:12px;padding:0 10px;display:flex;align-items:center;gap:7px;color:#666;width:132px;white-space:nowrap;overflow:hidden;font-size:12px}
  #intro .mw .t b{width:12px;height:12px;border-radius:4px;flex:none}
  #intro .mw .t.on{background:#fff;color:#111;font-weight:700;box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 18%,transparent),0 4px 16px color-mix(in srgb,var(--a) 28%,transparent)}
  #intro .mw .ub{margin:0 12px 8px;height:30px;border-radius:999px;background:#fff;display:flex;align-items:center;padding:0 14px;color:#888;box-shadow:0 2px 10px rgba(20,24,60,.06),inset 0 0 0 1px rgba(20,24,60,.05);font-size:12px;gap:8px}
  #intro .mw .pg{position:absolute;left:8px;right:8px;top:86px;bottom:8px;border-radius:16px;background:#fff;padding:22px 26px;overflow:hidden;transition:background 1.2s,color 1.2s}
  #intro .mw .ln{height:9px;border-radius:5px;background:#e9ecf3;margin:9px 0;transition:background 1.2s}
  #intro .mw .h{height:16px;width:55%;border-radius:6px;background:color-mix(in srgb,var(--a) 22%,#e3e6f0);margin-bottom:14px;transition:background 1.2s}
  #intro .mw .ad{position:absolute;border-radius:12px;background:linear-gradient(135deg,#ff8787,#ffc078);color:#fff;font:700 11px/1 system-ui;display:grid;place-items:center;letter-spacing:.08em}
  #intro .mw .cnt{position:absolute;right:16px;top:12px;padding:5px 11px;border-radius:999px;background:var(--nova);color:#fff;font:800 12px system-ui;box-shadow:0 6px 18px color-mix(in srgb,var(--a) 45%,transparent)}
  #intro .mw .cmdp{position:absolute;left:50%;top:66px;width:76%;margin-left:-38%;border-radius:24px;background:rgba(255,255,255,.86);backdrop-filter:blur(20px) saturate(1.8);box-shadow:0 30px 70px rgba(0,0,0,.22),0 0 0 4px color-mix(in srgb,var(--a) 14%,transparent),0 0 0 1px rgba(0,0,0,.05);overflow:hidden;padding-bottom:6px}
  #intro .mw .cmdp .in{height:50px;display:flex;align-items:center;gap:10px;padding:0 18px;font-size:16px;font-weight:600}
  #intro .mw .cmdp .caret{width:2px;height:20px;background:var(--a);animation:blink 1s steps(2) infinite}
  @keyframes blink{50%{opacity:0}}
  #intro .mw .cmdp .r{height:36px;display:flex;align-items:center;gap:10px;margin:0 6px;padding:0 12px;border-radius:12px;color:#444;opacity:0}
  #intro .mw .cmdp .r.sel{background:color-mix(in srgb,var(--a) 14%,transparent);color:#111}
  #intro .mw .cmdp .r em{margin-left:auto;font-style:normal;color:#999;font-size:11px}
  #intro .mw .side{position:absolute;top:86px;right:8px;bottom:8px;width:38%;border-radius:16px;background:color-mix(in srgb,var(--a) 7%,#fff);padding:16px;transform:translateX(110%);box-shadow:-10px 0 30px rgba(0,0,0,.06)}
  #intro .mw .side .ah{display:flex;align-items:center;gap:8px;font-weight:800;color:color-mix(in srgb,var(--a) 80%,#000);margin-bottom:12px}
  #intro .mw .side .ah i{width:18px;height:18px;border-radius:6px;background:var(--nova)}
  #intro .mw .side p{margin:0 0 8px;line-height:1.5;color:#333;font-size:12px}
  #intro .mw .tr{font-size:15px;line-height:1.7;color:#222;transition:opacity .3s}
  #intro .mw .split{position:absolute;inset:86px 8px 8px;display:flex;gap:8px}
  #intro .mw .split .pp{flex:1;border-radius:16px;background:#fff;padding:18px}
  #intro .mw .pcard{position:absolute;left:50%;top:50%;width:62%;margin:-58px 0 0 -31%;padding:18px;border-radius:24px;background:#fff;box-shadow:0 20px 50px color-mix(in srgb,var(--a) 18%,rgba(0,0,0,.1)),0 0 0 1px rgba(0,0,0,.04);display:flex;gap:14px;align-items:center}
  #intro .mw .pcard .k{width:44px;height:44px;border-radius:14px;flex:none;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#ff9f43,#ff6b6b);transition:background .6s}
  #intro .mw .pcard .k svg{width:22px;height:22px}
  #intro .mw .pcard b{display:block;font-size:15px;margin-bottom:3px}
  #intro .mw .pcard span{color:#888;font-size:12px}
  #intro .mw .steps{display:flex;gap:4px;margin-top:10px}
  #intro .mw .steps s{flex:1;height:4px;border-radius:2px;background:#e9ecf3;text-decoration:none;transition:background .4s}
  #intro .mw .steps s.on{background:var(--nova)}
  #intro .mw.dark{background:linear-gradient(180deg,#1d1f28,#15171f);color:#eee}
  #intro .mw.dark .pg{background:#0f1117;color:#eee}#intro .mw.dark .ln{background:#262a35}#intro .mw.dark .h{background:color-mix(in srgb,var(--a) 40%,#2a2e3c)}
  #intro .mw.dark .ub{background:#252832;color:#aaa}#intro .mw.dark .t.on{background:#2c2f39;color:#fff}
  #intro .desk{position:relative;width:min(700px,72vw);height:min(390px,44vh);border-radius:18px;overflow:hidden;background:radial-gradient(120% 90% at 30% 20%,color-mix(in srgb,var(--a) 40%,#1a1d3a),#12142a 60%,#0b0c18)}
  #intro .desk .menubar{height:24px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:0 12px;font:600 11px -apple-system,system-ui,sans-serif;color:rgba(255,255,255,.75)}
  #intro .desk .menubar span{display:inline-flex;align-items:center;gap:6px} #intro .applogo.mb{width:15px;height:15px}
  #intro .desk .edge{position:absolute;inset:0;border-radius:18px;box-shadow:inset 0 0 0 0 rgba(0,255,133,0);transition:box-shadow 1.1s cubic-bezier(.2,.9,.3,1)}
  #intro .desk.lit .edge{box-shadow:inset 0 0 40px 10px rgba(0,255,133,.55),inset 0 0 120px 20px rgba(0,212,255,.25)}
  #intro .desk .chg{position:absolute;left:50%;top:58px;transform:translateX(-50%) scale(.6);opacity:0;padding:9px 16px;border-radius:999px;background:rgba(20,22,36,.7);backdrop-filter:blur(16px);color:#fff;font:700 13px system-ui;display:flex;gap:10px;align-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 10px 30px rgba(0,0,0,.4);transition:all .7s cubic-bezier(.3,1.4,.5,1)}
  #intro .desk.lit .chg{transform:translateX(-50%) scale(1);opacity:1}
  #intro .desk .chg i{width:44px;height:14px;border-radius:5px;border:2px solid rgba(255,255,255,.6);position:relative}
  #intro .desk .chg i::after{content:'';position:absolute;left:1px;top:1px;bottom:1px;width:0;border-radius:2px;background:#00FF85;transition:width 1.6s ease}
  #intro .desk.lit .chg i::after{width:68%}
  #intro .desk .rip{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid var(--a);opacity:0}
  #intro .desk .keys{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);display:flex;gap:6px}
  #intro .desk .keys b{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.1);box-shadow:inset 0 -3px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12);display:grid;place-items:center;color:#fff;font:700 13px system-ui;transition:transform .12s,background .12s}
  #intro .desk .keys b.dn{transform:translateY(2px) scale(.96);background:color-mix(in srgb,var(--a) 60%,transparent)}
  #intro .desk .fan{position:absolute;left:50%;top:58%}
  #intro .desk .fan i{position:absolute;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:16px;box-shadow:0 10px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.3);opacity:0;display:grid;place-items:center;color:#fff;font:800 18px system-ui}
  #intro .desk .cur{position:absolute;left:50%;top:58%;width:14px;height:20px;margin:-2px 0 0 -2px;background:#fff;clip-path:polygon(0 0,0 100%,30% 72%,55% 100%,70% 92%,47% 66%,85% 66%);filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
  #intro .tourcap{position:absolute;left:0;right:0;bottom:calc(var(--bar) + 26px);text-align:center;z-index:7}
  #intro .tourcap .n{display:inline-flex;align-items:center;gap:10px;font:800 11px/1 var(--font);letter-spacing:.22em;color:var(--hi);margin-bottom:12px;white-space:pre}
  #intro .tourcap .dots{display:inline-flex;gap:4px;vertical-align:middle;margin-left:12px}
  #intro .tourcap .dots i{width:14px;height:3px;border-radius:2px;background:rgba(255,255,255,.16);transition:background .5s,width .6s cubic-bezier(.3,1.3,.5,1),box-shadow .5s}
  #intro .tourcap .dots i.on{width:26px;background:var(--nova);box-shadow:0 0 10px color-mix(in srgb,var(--a) 70%,transparent)}
  #intro .tourcap .dots i.past{background:color-mix(in srgb,var(--a) 50%,rgba(255,255,255,.2))}
  #intro .tourcap h2{font:800 clamp(24px,3vw,38px)/1.1 ${HEAD};letter-spacing:-.03em;margin:0 0 8px}
  #intro .tourcap p{margin:0 auto;max-width:620px;color:#b8bfe2;font-size:15px;line-height:1.5}
  #intro kbd{font:700 12px var(--font);padding:2px 8px;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 -1px 0 rgba(255,255,255,.15),0 0 0 1px color-mix(in srgb,var(--a) 30%,transparent)}
  /* what is new */
  #intro .new{width:min(980px,86vw);text-align:center;transform-style:preserve-3d}
  #intro .new .eyebrow{display:inline-block;font:800 12px/1 var(--font);letter-spacing:.24em;text-transform:uppercase;color:#fff;padding:9px 16px;border-radius:999px;background:color-mix(in srgb,var(--a) 22%,rgba(255,255,255,.06));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 55%,transparent),0 0 0 4px color-mix(in srgb,var(--a) 12%,transparent),0 0 24px color-mix(in srgb,var(--a) 40%,transparent)}
  #intro .new h1{font:800 clamp(40px,5.4vw,76px)/1.04 ${HEAD};letter-spacing:-.04em;margin:18px 0 34px;padding-bottom:.06em;background:linear-gradient(100deg,#fff 25%,var(--hi) 60%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .new h1.shine{animation:nsweep 1.6s cubic-bezier(.3,.7,.2,1)}
  @keyframes nsweep{0%{background-image:linear-gradient(100deg,#fff 25%,var(--hi) 60%,var(--hi3)),linear-gradient(100deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);background-size:100% 100%,250% 100%;background-position:0 0,120% 0}100%{background-image:linear-gradient(100deg,#fff 25%,var(--hi) 60%,var(--hi3)),linear-gradient(100deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);background-size:100% 100%,250% 100%;background-position:0 0,-20% 0}}
  #intro .new .grid{display:grid;grid-template-columns:repeat(var(--cols,3),minmax(0,1fr));gap:18px;text-align:left}
  #intro .new .it{padding:20px 20px 20px 20px;opacity:0;display:flex;gap:16px;align-items:flex-start}
  #intro .new .it .k,#intro .ask .k{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 26px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .new .it .k svg{width:20px;height:20px}
  #intro .new .it b{display:block;margin:2px 0 5px;font:800 17px/1.2 ${HEAD};letter-spacing:-.02em}
  #intro .new .it span{color:#ccd1ee;font-size:13.5px;line-height:1.5}
  /* finale */
  #intro .fin{text-align:center;width:min(980px,94vw);display:flex;flex-direction:column;align-items:center}
  #intro .fin .ask{width:min(560px,90vw)}
  #intro .fin .logo{font-size:clamp(44px,6.4vw,84px);background:linear-gradient(100deg,#fff 20%,var(--hi) 60%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.08em}
  #intro .ask{margin:30px auto 0;padding:22px 24px;text-align:left;display:flex;gap:16px;align-items:flex-start;opacity:0}
  #intro .ask .k{width:46px;height:46px;border-radius:15px;background:linear-gradient(135deg,#ff9f43,#ff6b6b);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 28px rgba(255,120,80,.45)}
  #intro .ask .k svg{width:22px;height:22px}
  #intro .ask b{display:block;font:800 18px/1.2 ${HEAD};letter-spacing:-.02em;margin-bottom:6px}
  #intro .ask span{color:#ccd1ee;font-size:13.5px;line-height:1.5}
  #intro .btns{display:flex;gap:10px;justify-content:center;margin-top:24px;opacity:0}
  #intro .go{position:relative;overflow:hidden;height:52px;padding:0 30px;border-radius:999px;border:0;background:var(--nova);color:#fff;font:800 16px ${HEAD};letter-spacing:-.01em;cursor:default;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 0 0 4px color-mix(in srgb,var(--a) 18%,transparent),0 12px 40px color-mix(in srgb,var(--a) 60%,transparent);transition:transform .45s cubic-bezier(.3,1.5,.5,1),filter .2s}
  #intro .go::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.5) 50%,transparent 70%);transform:translateX(-130%);animation:isw 1.3s 1.6s ease-out forwards}
  #intro .go:hover{transform:translateY(-2px);filter:brightness(1.08)} #intro .go:active{transform:scale(.96)}
  #intro .no{height:52px;padding:0 24px;border-radius:999px;border:0;background:rgba(255,255,255,.1);color:#e3e6ff;font:650 15px var(--font);cursor:default;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 1px rgba(255,255,255,.1);transition:background .2s,transform .45s cubic-bezier(.3,1.5,.5,1)}
  #intro .no:hover{background:rgba(255,255,255,.16);transform:translateY(-1px)} #intro .no:active{transform:scale(.96)}
  #intro .skip{position:absolute;right:28px;top:calc(var(--bar) + 16px);z-index:9;background:rgba(255,255,255,.08);border:0;color:#d6daf6;font:600 12.5px var(--font);padding:8px 15px;border-radius:999px;cursor:default;backdrop-filter:blur(16px) saturate(1.6);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 0 1px rgba(255,255,255,.08);transition:background .2s,transform .4s cubic-bezier(.3,1.5,.5,1)}
  #intro .skip:hover{background:rgba(255,255,255,.16);transform:translateY(-1px)}
  #intro .meter{position:absolute;left:50%;bottom:calc(var(--bar) + 12px);width:180px;margin-left:-90px;height:2px;border-radius:2px;background:rgba(255,255,255,.12);z-index:9;overflow:hidden}
  #intro .meter i{display:block;height:100%;width:0;background:var(--nova);box-shadow:0 0 8px var(--a)}
  #intro .credit{position:absolute;left:28px;top:calc(var(--bar) + 22px);z-index:9;font:700 10.5px var(--font);letter-spacing:.32em;text-transform:uppercase;color:rgba(220,226,255,.4)}
  #intro .credit b{color:var(--hi);font-weight:800}
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
    function bell(freq, t, { vol = .12, dur = 1.4, wet = .35 } = {}) {
      for (const [m, v] of [[1, 1], [2, .28], [3, .08]]) {
        const o = ac.createOscillator(), g = ac.createGain()
        o.type = 'sine'; o.frequency.value = freq * m
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * v, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur / m)
        o.connect(g); out(g, wet); o.start(t); o.stop(t + dur + .05)
      }
    }
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
    return {
      init,
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
      riser(sec = 2.3) {
        if (!ac) return
        const t = ac.currentTime
        PENTA.forEach((n, i) => pluck(NOTE(n - 12), t + i * (sec / PENTA.length), .05 + i * .006))
        air(t, sec, { from: 600, to: 5200, vol: .035 })
      },
      impact() {
        if (!ac) return
        const t = ac.currentTime
        C.forEach((n, i) => bell(NOTE(n + 12), t + i * .035, { vol: .09, dur: 2.6, wet: .45 }))
        bell(NOTE(48), t, { vol: .1, dur: 2, wet: .2 })
        air(t, .7, { from: 6000, to: 2500, vol: .03 })
      },
      whoosh() { if (ac) air(ac.currentTime, .55, { from: 900, to: 3800, vol: .04, q: 1.1 }) },
      // a soft glassy pass between two shots: a breath of air and one high, quiet bell
      glass(i = 0) { if (!ac) return; const t = ac.currentTime; air(t, .8, { from: 1400, to: 5200, vol: .03, q: 1.3 }); bell(NOTE(PENTA[(i * 2) % PENTA.length] + 12), t + .18, { vol: .025, dur: 1.4, wet: .6 }) },
      // a title card: three soft notes, one per word
      note(i) { if (ac) { const t = ac.currentTime; bell(NOTE([76, 79, 84][i % 3]), t, { vol: .05, dur: 1.8, wet: .55 }); pluck(NOTE([64, 67, 72][i % 3]), t, .04) } },
      pop(pitch = 1) {
        if (!ac) return
        const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain()
        o.type = 'sine'; o.frequency.setValueAtTime(520 * pitch, t); o.frequency.exponentialRampToValueAtTime(980 * pitch, t + .07)
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .16)
        o.connect(g); out(g, .15); o.start(t); o.stop(t + .2)
      },
      key() {
        if (!ac) return
        const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), hp = ac.createBiquadFilter()
        o.type = 'square'; o.frequency.value = 2400 + Math.random() * 600; hp.type = 'highpass'; hp.frequency.value = 2000
        g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .022)
        o.connect(hp); hp.connect(g); out(g, 0); o.start(t); o.stop(t + .03)
      },
      tick(i) { if (ac) pluck(NOTE(PENTA[i % PENTA.length]), ac.currentTime, .035) },
      shimmer() { if (!ac) return; const t = ac.currentTime; [84, 88, 91, 96].forEach((n, i) => bell(NOTE(n), t + i * .06, { vol: .035, dur: 1.2, wet: .5 })) },
      chord() {
        if (!ac) return
        const t = ac.currentTime
        ;[60, 64, 67, 72, 76].forEach((n, i) => { bell(NOTE(n), t + i * .07, { vol: .08, dur: 3, wet: .45 }); pluck(NOTE(n + 12), t + i * .07 + .02, .04) })
      },
      ding() { if (ac) { const t = ac.currentTime; bell(NOTE(84), t, { vol: .07, dur: 1 }); bell(NOTE(91), t + .09, { vol: .06, dur: 1.2 }) } },
      fadeOut(sec = 1.2) {
        if (!ac) return
        const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + sec)
        setTimeout(() => { try { padNodes.forEach(o => o.stop()); ac.close() } catch {} ac = null; padNodes = [] }, sec * 1000 + 200)
      },
      toggleMute() { if (!ac) return muted; muted = !muted; master.gain.setTargetAtTime(muted ? 0 : .8, ac.currentTime, .1); return muted },
    }
  })()

  let skip = false, still = false, root, cv, cx, raf, W = 0, H = 0, t0 = 0, total = 1, HUE = 228
  const sleep = ms => new Promise(r => { const s = performance.now(); const tick = () => { if (skip || performance.now() - s >= ms) r(); else requestAnimationFrame(tick) }; tick() })
  // every motion goes through here: a lively spring curve, or instant when Motion is Off or reduced motion is on
  const anim = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'cubic-bezier(.3,1.22,.5,1)', ...o, ...(still ? { duration: 1, delay: 0 } : {}) })
  const tween = (obj, key, to, ms, ease = k => 1 - Math.pow(1 - k, 3)) => new Promise(r => { const from = obj[key], s = performance.now(); const f = () => { const k = still ? 1 : Math.min(1, (performance.now() - s) / ms); obj[key] = from + (to - from) * ease(k); if (k < 1 && !skip) requestAnimationFrame(f); else { obj[key] = to; r() } }; f() })
  const words = (el, text, delay = 0, step = 60, blur = true) => {
    el.innerHTML = ''
    text.split(' ').forEach((w, i) => {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(' '))
      anim(s, [{ opacity: 0, transform: 'translateY(16px)', filter: blur ? 'blur(8px)' : 'none' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1000, delay: delay + i * step })
    })
  }
  // the user's accent, as a hue for the light drawn on the canvas
  function accent() {
    let a = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '').trim()
    if (!/^#[0-9a-f]{6}$/i.test(a)) a = '#5b8cff'
    const [r, g, b] = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
    let h = 228
    if (d > .04) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360 }
    return { hex: a, h }
  }

  // ------------------------------------------------------------ the sky: a nebula, 3D stars, warp streaks, the orb, ghosts, shockwaves
  const sky = { oy: 0, speed: .4, warp: 0, gather: 0, orb: 0, orbR: 0, ring: 0, shock: [], flash: 0, shake: 0, rays: 0, bokeh: 0, neb: 0, dof: 0, ghosts: 0 }
  const camera = { x: 0, y: 0, px: 0, py: 0, push: 0 }
  let bokeh = [], stars = [], nebula = null, dofShown = -1
  function size() {
    const scale = Math.min(1.25, devicePixelRatio || 1)
    const r = cv.getBoundingClientRect(); W = Math.round(r.width) || innerWidth + 80; H = Math.round(r.height) || innerHeight + 80
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale)
    cx.setTransform(scale, 0, 0, scale, 0, 0)
  }
  const newStar = (far = true) => ({ x: (Math.random() - .5) * 2, y: (Math.random() - .5) * 2, z: far ? Math.random() * .9 + .1 : 1, pz: 0, c: Math.random() < .3 ? 1 : 0 })
  // a nebula painted once: soft clouds along a few curling arms, in the accent and its two neighbours on the color wheel
  function paintNebula() {
    const c = document.createElement('canvas'); c.width = c.height = 640
    const g = c.getContext('2d'); g.globalCompositeOperation = 'lighter'
    const arms = [[HUE, 0], [HUE + 40, 2.1], [HUE + 95, 4.2]]
    for (const [h, a0] of arms) {
      for (let i = 0; i < 170; i++) {
        const k = i / 170, ang = a0 + k * 3.4, rad = 40 + k * 240 + Math.sin(k * 9) * 30
        const x = 320 + Math.cos(ang) * rad + (Math.random() - .5) * 70, y = 320 + Math.sin(ang) * rad * .62 + (Math.random() - .5) * 60
        const r = 18 + Math.random() * 70 * (1 - k * .5), gr = g.createRadialGradient(x, y, 0, x, y, r)
        const al = (.03 + Math.random() * .05) * (1 - k * .6)
        gr.addColorStop(0, `hsla(${h + (Math.random() - .5) * 24},85%,${62 + Math.random() * 16}%,${al})`); gr.addColorStop(1, `hsla(${h},85%,60%,0)`)
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill()
      }
    }
    // a bright core and a sprinkle of dust
    const core = g.createRadialGradient(320, 320, 0, 320, 320, 120); core.addColorStop(0, `hsla(${HUE + 20},90%,85%,.22)`); core.addColorStop(1, 'hsla(0,0%,100%,0)')
    g.fillStyle = core; g.fillRect(0, 0, 640, 640)
    for (let i = 0; i < 700; i++) { const x = Math.random() * 640, y = 320 + (Math.random() - .5) * 420 * Math.random(); g.fillStyle = `hsla(${HUE + Math.random() * 90},80%,90%,${Math.random() * .5})`; g.fillRect(x, y, Math.random() < .1 ? 1.6 : .9, Math.random() < .1 ? 1.6 : .9) }
    return c
  }
  function draw() {
    const now = performance.now(), t = now / 1000
    // the camera floats: a slow handheld drift plus a little parallax from the pointer
    if (!still) { camera.x += ((camera.px * 26 + Math.sin(t * .13) * 14 + Math.sin(t * .31) * 4) - camera.x) * .035; camera.y += ((camera.py * 16 + Math.cos(t * .11) * 9) - camera.y) * .035 }
    const cxm = W / 2 - camera.x * .35, cym = H / 2 - camera.y * .35, F = Math.max(W, H) * .55, oyc = H / 2 + sky.oy - camera.y * .5, oxc = W / 2 - camera.x * .5
    cx.globalCompositeOperation = 'source-over'
    cx.fillStyle = sky.warp > .05 ? `rgba(5,6,13,${.55 - sky.warp * .35})` : '#05060d'
    cx.fillRect(0, 0, W, H)
    cx.globalCompositeOperation = 'lighter'
    // the nebula, slowly turning behind everything
    if (sky.neb > .01 && nebula) {
      const S = Math.max(W, H) * 1.5
      cx.save(); cx.globalAlpha = sky.neb * (1 - sky.warp * .7); cx.translate(W / 2 - camera.x * .15, H / 2 - camera.y * .15); cx.rotate(t * .012 - .3); cx.scale(1 + Math.sin(t * .05) * .04, 1)
      cx.drawImage(nebula, -S / 2, -S / 2, S, S); cx.restore()
    }
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
      cx.strokeStyle = s.c ? `hsla(${HUE + 60},90%,84%,${b})` : `hsla(${HUE},60%,92%,${b})`
      cx.lineWidth = Math.max(.6, (1 - s.z) * 2.6)
      cx.beginPath(); cx.moveTo(px, py); cx.lineTo(x + (x === px ? .4 : 0), y); cx.stroke()
    }
    // god rays: slow beams of light fanning out from the orb
    if (sky.rays > .01 && sky.orb > .01) {
      const L = Math.max(W, H) * 1.1
      cx.save(); cx.translate(oxc, oyc)
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * 6.283 + t * .05 + Math.sin(t * .3 + i) * .04, w = .045 + (i % 3) * .025
        const g = cx.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L)
        g.addColorStop(0, `hsla(${HUE + (i % 4) * 22},100%,80%,${.13 * sky.rays * sky.orb})`); g.addColorStop(1, `hsla(${HUE},100%,70%,0)`)
        cx.fillStyle = g; cx.beginPath(); cx.moveTo(0, 0); cx.arc(0, 0, L, a - w, a + w); cx.closePath(); cx.fill()
      }
      cx.restore()
    }
    // the orb of light
    if (sky.orb > .01) {
      const R = sky.orbR * 5
      const g = cx.createRadialGradient(oxc, oyc, 0, oxc, oyc, R)
      g.addColorStop(0, `rgba(240,244,255,${sky.orb})`); g.addColorStop(.18, `hsla(${HUE},100%,75%,${.55 * sky.orb})`); g.addColorStop(1, `hsla(${HUE},100%,60%,0)`)
      cx.fillStyle = g; cx.fillRect(oxc - R, oyc - R, R * 2, R * 2)
      cx.fillStyle = `rgba(255,255,255,${sky.orb})`; cx.beginPath(); cx.arc(oxc, oyc, sky.orbR, 0, 6.283); cx.fill()
      // anamorphic streak: the long line a widescreen lens draws through a bright light
      const st = cx.createLinearGradient(0, 0, W, 0), sa = .55 * sky.orb * (.85 + Math.sin(now / 700) * .15)
      st.addColorStop(0, `hsla(${HUE},100%,65%,0)`); st.addColorStop(.5, `hsla(${HUE},100%,86%,${sa})`); st.addColorStop(1, `hsla(${HUE + 40},100%,65%,0)`)
      cx.fillStyle = st; cx.fillRect(0, oyc - 1.2, W, 2.4)
      cx.fillStyle = `hsla(${HUE},100%,75%,${sa * .25})`; cx.fillRect(W * .2, oyc - 5, W * .6, 10)
      // lens ghosts: soft discs and one hexagon mirrored through the middle of the frame, sliding against the camera
      if (sky.ghosts > .01) {
        const dx = W / 2 - oxc, dy = H / 2 - oyc
        ;[[.55, 18, 40, .09], [1.25, 34, 95, .06], [1.7, 9, 20, .14], [2.2, 54, 140, .05]].forEach(([k, r, hs, a], i) => {
          const gx = W / 2 + dx * k + camera.x * (k - 1) * .9, gy = H / 2 + dy * k
          const gg = cx.createRadialGradient(gx, gy, r * .2, gx, gy, r)
          gg.addColorStop(0, `hsla(${HUE + hs},90%,75%,0)`); gg.addColorStop(.8, `hsla(${HUE + hs},90%,72%,${a * sky.ghosts * sky.orb})`); gg.addColorStop(1, `hsla(${HUE + hs},90%,72%,0)`)
          cx.fillStyle = gg
          if (i === 1) { cx.beginPath(); for (let j = 0; j < 6; j++) { const aa = j / 6 * 6.283 + .3; cx.lineTo(gx + Math.cos(aa) * r, gy + Math.sin(aa) * r) } cx.closePath(); cx.fill() }
          else { cx.beginPath(); cx.arc(gx, gy, r, 0, 6.283); cx.fill() }
        })
      }
      if (sky.ring > .01) {
        cx.save(); cx.translate(oxc, oyc); cx.rotate(-.42)
        ;[['255,90,120', -1.2], ['120,255,190', 0], ['110,150,255', 1.2]].forEach(([c, o]) => {
          cx.strokeStyle = `rgba(${c},${.5 * sky.ring})`; cx.lineWidth = 2.4
          cx.beginPath(); cx.ellipse(o, 0, sky.orbR * 2.8, sky.orbR, 0, Math.PI * (1 - sky.ring), Math.PI * (1 + sky.ring)); cx.stroke()
        })
        cx.restore()
      }
    }
    // shockwaves
    for (const w of sky.shock) {
      w.r += (Math.max(W, H) * 1.1 - w.r) * .045; w.a *= .955
      cx.strokeStyle = `hsla(${HUE},90%,85%,${w.a})`; cx.lineWidth = 2 + w.a * 10
      cx.beginPath(); cx.arc(cxm, cym, w.r, 0, 6.283); cx.stroke()
    }
    sky.shock = sky.shock.filter(w => w.a > .01)
    // bokeh: soft discs of light right in front of the lens, the closest layer of the parallax
    if (sky.bokeh > .01) {
      for (const b of bokeh) {
        const x = (b.x + Math.sin(t * b.sx + b.p) * .04) * W - camera.x * 1.4, y = (b.y + Math.cos(t * b.sy + b.p) * .03) * H - (t * b.v % 1.4) * H * .08 - camera.y * 1.4
        const g = cx.createRadialGradient(x, y, 0, x, y, b.r)
        g.addColorStop(0, `hsla(${HUE + b.h},90%,78%,${.15 * b.a * sky.bokeh})`); g.addColorStop(.72, `hsla(${HUE + b.h},90%,72%,${.1 * b.a * sky.bokeh})`); g.addColorStop(.86, `hsla(${HUE + b.h},95%,84%,${.2 * b.a * sky.bokeh})`); g.addColorStop(1, `hsla(${HUE + b.h},90%,70%,0)`)
        cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, b.r, 0, 6.283); cx.fill()
      }
    }
    if (sky.flash > .01) { cx.globalCompositeOperation = 'source-over'; cx.fillStyle = `rgba(240,243,255,${sky.flash})`; cx.fillRect(0, 0, W, H); sky.flash *= .9 }
    // depth of field: the sky goes soft behind the shot in focus
    const d = Math.round(sky.dof * 4) / 4
    if (d !== dofShown) { dofShown = d; cv.style.filter = d > .1 ? `blur(${d}px)` : '' }
    // the rig: stage and nebula drift at their own depth, plus a push-in and any camera shake
    const camEl = root.querySelector('.cam'), stage = root.querySelector('.stage'), nebw = root.querySelector('.nebw')
    let sx = 0, sy = 0
    if (sky.shake > .2) { sx = (Math.random() - .5) * sky.shake; sy = (Math.random() - .5) * sky.shake; sky.shake *= .9 }
    camEl.style.transform = sx || sy ? `translate3d(${sx}px,${sy}px,0)` : ''
    // whole pixels for the stage so text stays crisp; the push-in scales the sky behind it, not the words
    stage.style.transform = `translate3d(${Math.round(-camera.x * .55)}px,${Math.round(-camera.y * .55)}px,0)`
    const z = camera.push ? `scale(${(1 + camera.push * 2.2).toFixed(4)})` : ''
    if (cv.style.transform !== z) cv.style.transform = z
    nebw.style.transform = `translate3d(${(-camera.x * .2).toFixed(1)}px,${(-camera.y * .2).toFixed(1)}px,0) scale(${(1 + camera.push * 1.5).toFixed(4)})`
    const m = root.querySelector('.meter i'); if (m) m.style.width = Math.min(100, (now - t0) / total * 100) + '%'
    raf = requestAnimationFrame(draw)
  }
  function grainURL() {
    const c = document.createElement('canvas'); c.width = c.height = 180
    const g = c.getContext('2d'), d = g.createImageData(180, 180)
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 }
    g.putImageData(d, 0, 0); return c.toDataURL()
  }
  function flare(strength = 1) {
    if (still) return
    root.querySelector('.flare').animate([{ opacity: 0, transform: 'scaleX(.2)' }, { opacity: strength, transform: 'scaleX(1)', offset: .15 }, { opacity: 0, transform: 'scaleX(1.3)' }], { duration: 1800, easing: 'cubic-bezier(.2,.8,.3,1)' })
  }
  // a light leak: warm film light blooming across the frame from one side
  function leak(strength = .7, dir = 1, ms = 1700) {
    if (still || skip) return
    root.querySelector('.leak').animate([{ opacity: 0, transform: `translateX(${-30 * dir}%) scale(1.1)` }, { opacity: strength, offset: .4 }, { opacity: 0, transform: `translateX(${30 * dir}%) scale(1)` }], { duration: ms, easing: 'cubic-bezier(.4,0,.3,1)' })
  }
  // rack focus: the sky softens behind the subject, or comes sharp while the subject goes soft
  const focus = (px, ms = 700) => tween(sky, 'dof', px, ms, k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
  const push = (to, ms) => tween(camera, 'push', to, ms, k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
  function boom() { if (!still) { sky.flash = .35; sky.shake = 6; sky.shock.push({ r: 10, a: .9 }); setTimeout(() => sky.shock.push({ r: 10, a: .5 }), 140) } flare(1); leak(.8, 1, 2200); if (!skip) SFX.impact() }
  function scene(html) { const s = document.createElement('div'); s.className = 'scene'; s.innerHTML = html; root.querySelector('.stage').appendChild(s); return s }
  async function leave(s, ms = 700) {
    anim(s, [{ opacity: 1, filter: 'blur(0)', transform: 'scale(1)' }, { opacity: 0, filter: 'blur(14px)', transform: 'scale(1.06)' }], { duration: ms, easing: 'cubic-bezier(.5,0,.7,.4)' })
    await sleep(ms); s.remove()
  }

  // ------------------------------------------------------------ the acts
  // the title sequence: three phrases, each racked into focus out of the deep and then pushed back out of it
  async function coldOpen() {
    const ph = ['Every <em>page.</em>', 'Every <em>tab.</em>', 'Every <em>day.</em>']
    const s = scene(`<div class="title"><div class="pre">Shot in a new light</div>${ph.map(t => `<div class="ph">${t}</div>`).join('')}<i class="fil"></i></div>`)
    const els = s.querySelectorAll('.ph')
    anim(s.querySelector('.pre'), [{ opacity: 0, letterSpacing: '1em' }, { opacity: 1, letterSpacing: '.5em' }], { duration: 1600, easing: 'cubic-bezier(.16,1,.3,1)' })
    anim(s.querySelector('.fil'), [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: 2600, easing: 'cubic-bezier(.16,1,.3,1)' })
    sky.speed = .15; tween(sky, 'neb', .35, 2600)
    for (let i = 0; i < els.length && !skip; i++) {
      anim(els[i], [{ opacity: 0, filter: 'blur(16px)', transform: 'translateZ(260px) scale(1.12)', textShadow: '-8px 0 rgba(255,60,120,.6), 8px 0 rgba(60,170,255,.6)' },
        { opacity: 1, filter: 'blur(0)', transform: 'none', textShadow: '0 0 transparent, 0 0 transparent' }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' })
      if (i > 0) anim(els[i - 1], [{ opacity: 1, filter: 'blur(0)', transform: 'none' }, { opacity: 0, filter: 'blur(10px)', transform: 'translateZ(-300px) scale(.86)' }], { duration: 700, easing: 'cubic-bezier(.5,0,.3,1)' })
      if (!skip) SFX.note(i)
      await sleep(i === els.length - 1 ? 1100 : 820)
    }
    // the filament collapses into the point of light the warp flies into
    anim(s.querySelector('.fil'), [{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(0)', opacity: .9 }], { duration: 500, easing: 'cubic-bezier(.6,0,.4,1)' })
    await leave(s, 500)
  }
  async function warp() {
    sky.oy = 0
    if (!skip) SFX.riser(2.6)
    tween(sky, 'neb', .2, 900)
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
    tween(sky, 'ring', 1, 1500); tween(sky, 'rays', 1, 1800); tween(sky, 'ghosts', 1, 1600); tween(sky, 'neb', .85, 2400)
    sky.gather = 0
    stars.forEach(s => { s.x = (Math.random() - .5) * 2; s.y = (Math.random() - .5) * 2; s.z = Math.random() * .9 + .1 })
    sky.speed = .25
    const s = scene(`<div style="text-align:center"><div class="kicker">${short ? 'Fresh from an update' : 'Introducing'}</div><div class="logo">${'Lumen'.split('').map(c => `<span>${c}</span>`).join('')}<i class="glint" aria-hidden="true">Lumen</i></div><div class="rule"></div><div class="tag"></div></div>`)
    tween(sky, 'orbR', 18, 1400); tween(sky, 'oy', -Math.min(H * .26, 220), 1800, k => 1 - Math.pow(1 - k, 4))
    push(.035, short ? 3000 : 4300)   // a slow dolly in on the title
    anim(s.querySelector('.kicker'), [{ opacity: 0, letterSpacing: '1.1em' }, { opacity: 1, letterSpacing: '.46em' }], { duration: 1800, delay: 300, easing: 'cubic-bezier(.16,1,.3,1)' })
    s.querySelectorAll('.logo span').forEach((l, i) => anim(l, [
      { opacity: 0, transform: `translate3d(${(i - 2) * 90}px, ${(i % 2 ? -1 : 1) * 40}px, 600px) rotateY(${(i - 2) * 25}deg) scale(1.6)`, filter: 'blur(18px) drop-shadow(-16px 0 0 rgba(255,70,130,.85)) drop-shadow(16px 0 0 rgba(70,200,255,.85))' },
      { opacity: 1, filter: 'blur(2px) drop-shadow(-5px 0 0 rgba(255,70,130,.5)) drop-shadow(5px 0 0 rgba(70,200,255,.5))', offset: .55 },
      { opacity: 1, transform: 'none', filter: 'blur(0) drop-shadow(0 0 0 rgba(255,70,130,0)) drop-shadow(0 0 0 rgba(70,200,255,0))' }], { duration: 1500, delay: 80 + i * 90, easing: 'cubic-bezier(.16,1,.3,1)' }))
    anim(s.querySelector('.logo'), [{ letterSpacing: '.18em' }, { letterSpacing: '-.05em' }], { duration: 2400, easing: 'cubic-bezier(.16,1,.3,1)' })
    anim(s.querySelector('.rule'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1600, delay: 1100, easing: 'cubic-bezier(.16,1,.3,1)' })
    setTimeout(() => { if (skip || still) return; s.querySelector('.glint').animate([{ opacity: 1, backgroundPosition: '120% 0' }, { opacity: 1, backgroundPosition: '-20% 0', offset: .92 }, { opacity: 0, backgroundPosition: '-20% 0' }], { duration: 1500, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }); SFX.shimmer() }, 1300)
    words(s.querySelector('.tag'), short ? 'Lit in your color.' : "Chrome's engine. A lighter feel.", 1500, 90)
    await sleep(short ? 2600 : 3800)
    // push through the title: it rushes past the lens while the stars surge
    tween(sky, 'orb', 0, 900); tween(sky, 'ring', 0, 700); tween(sky, 'rays', 0, 900); tween(sky, 'ghosts', 0, 700)
    tween(sky, 'speed', 1.6, 300).then(() => tween(sky, 'speed', .25, 900))
    anim(s, [{ opacity: 1, filter: 'blur(0)', transform: 'translateZ(0)' }, { opacity: 0, filter: 'blur(12px)', transform: 'translateZ(520px)' }], { duration: 700, easing: 'cubic-bezier(.55,0,.75,.3)' })
    push(0, 700)
    if (!skip) SFX.whoosh()
    await sleep(700); s.remove()
  }
  // ------------------------------------------------------------ the tour: every feature shown doing its thing
  const MW = (inner, tabs = ['GitHub', 'Lisbon trip', 'Recipes']) => `<div class="mw"><div class="tb"><div class="lt"><i></i><i></i><i></i></div>${tabs.map((t, i) => `<div class="t${i === 0 ? ' on' : ''}"><b style="background:${['#24292f', 'var(--a)', '#ff8a3d', '#2fb67c'][i % 4]}"></b>${t}</div>`).join('')}</div><div class="ub">${ICONS.search || ''}<span>lumen.app</span></div>${inner}</div>`
  const LINES = n => '<div class="h"></div>' + Array.from({ length: n }, (_, i) => `<div class="ln" style="width:${[92, 80, 96, 70, 88, 60, 84][i % 7]}%"></div>`).join('')
  const TOUR = [
    { title: 'Tabs, right where you expect them.', text: 'Press <kbd>Cmd T</kbd> for a new tab. Drag tabs to reorder, and they spring into place.', build: () => MW(`<div class="pg">${LINES(7)}</div>`, ['GitHub']), play: async s => {
      const tb = s.querySelector('.tb')
      for (const [i, t] of ['Lisbon trip', 'Recipes', 'New Tab'].entries()) { await sleep(420); const el = document.createElement('div'); el.className = 't'; el.innerHTML = `<b style="background:${['var(--a)', '#ff8a3d', '#2fb67c'][i]}"></b>${t}`; tb.appendChild(el); anim(el, [{ opacity: 0, transform: 'translateY(-10px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 700 }); if (!skip) SFX.pop(1 + i * .12) }
      await sleep(500); const ts = tb.querySelectorAll('.t'); ts.forEach(t => t.classList.remove('on')); ts[2].classList.add('on'); anim(ts[2], [{ transform: 'scale(.92)' }, { transform: 'none' }], { duration: 600 }); if (!skip) SFX.key()
    } },
    { title: 'One bar does everything.', text: '<kbd>Cmd K</kbd> searches the web, finds open tabs and history, converts units and runs any action.', build: () => MW(`<div class="pg">${LINES(7)}</div><div class="cmdp"><div class="in"><span class="q"></span><span class="caret"></span></div><div class="r sel">Search for <b class="qq" style="margin-left:4px"></b><em>Search</em></div><div class="r">Lisbon trip<em>Switch to tab</em></div><div class="r">Flights to Lisbon, last week<em>History</em></div><div class="r">Focus mode<em>Shift Cmd F</em></div></div>`), play: async s => {
      const q = 'flights to lisbon', qe = s.querySelector('.q'), qq = s.querySelector('.qq')
      for (let i = 1; i <= q.length && !skip; i++) { qe.textContent = qq.textContent = q.slice(0, i); SFX.key(); await sleep(55) }
      s.querySelectorAll('.cmdp .r').forEach((r, i) => anim(r, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 550, delay: i * 60 }))
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
      for (const k of s.querySelectorAll('.keys b')) { await sleep(170); k.classList.add('dn'); if (!skip) SFX.key(); setTimeout(() => k.classList.remove('dn'), 130) }
      for (const [x, y] of [[30, 45], [70, 38], [52, 70]]) { const r = document.createElement('i'); r.className = 'rip'; r.style.left = x + '%'; r.style.top = y + '%'; d.appendChild(r); anim(r, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(4)', opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.2,.8,.3,1)' }); if (!skip) SFX.pop(1.1); await sleep(260) }
    } },
    { title: 'Koi, one key away.', text: 'Press <kbd>Option Space</kbd> and your apps bloom around the cursor in a springy fan. Type a letter or click to open one.', build: () => `<div class="desk"><div class="menubar"><span>${appLogo('koi', 'mb')}Koi</span><span>9:41</span></div><div class="fan"></div><div class="cur"></div></div>`, play: async s => {
      const fan = s.querySelector('.fan'), apps = [['#ff5f57', 'M'], ['#febc2e', 'N'], ['#28c840', 'F'], ['var(--a)', 'S'], ['#8a63f2', 'C'], ['#e9609c', 'P'], ['#20c997', 'T']]
      apps.forEach(([c, l], i) => {
        const el = document.createElement('i'); el.style.background = `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 65%, transparent))`; el.textContent = l; fan.appendChild(el)
        const a = (-160 + i * (140 / (apps.length - 1))) * Math.PI / 180, R = 120
        anim(el, [{ opacity: 0, transform: 'translate(0,0) scale(.3)' }, { opacity: 1, transform: `translate(${Math.cos(a) * R}px, ${Math.sin(a) * R}px) scale(1)` }], { duration: 900, delay: 200 + i * 50, easing: 'cubic-bezier(.3,1.4,.5,1)' })
        setTimeout(() => !skip && SFX.pop(.9 + i * .07), 200 + i * 50)
      })
      await sleep(1500); const pick = fan.children[3]; anim(pick, [{ scale: 1 }, { scale: 1.3 }, { scale: 1.18 }], { duration: 500, composite: 'add' }); if (!skip) SFX.ding()
    } },
    { title: 'Every parcel, until it arrives.', text: 'Track any delivery, and the orders you place are saved. One click takes you straight back to your order.', build: () => MW(`<div class="pg" style="background:#f4f5fa"><div class="pcard"><div class="k">${ICONS.box || ''}</div><div style="flex:1"><b>New headphones</b><span class="st">Order placed  ·  UPS</span><div class="steps"><s class="on"></s><s></s><s></s><s></s></div></div></div></div>`), play: async s => {
      const st = s.querySelector('.st'), steps = s.querySelectorAll('.steps s'), k = s.querySelector('.pcard .k')
      for (const [i, t] of ['On the way', 'Out for delivery', 'Delivered'].entries()) { await sleep(620); steps[i + 1].classList.add('on'); st.textContent = t + '  ·  UPS'; if (!skip) SFX.tick(i * 2) }
      k.style.background = 'linear-gradient(135deg,#34c759,#30b04f)'; anim(s.querySelector('.pcard'), [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 600 }); if (!skip) SFX.ding()
    } },
  ]
  // where each shot sits: the camera orbits a little between them, so every shot arrives from a new angle
  const POSE = i => ({ x: (i % 2 ? -1 : 1) * 46, ry: (i % 2 ? 1 : -1) * 30, rx: [8, 4, 10, 5][i % 4] })
  async function tour() {
    tween(sky, 'bokeh', .45, 1800); tween(sky, 'neb', .7, 1800); focus(2.5, 1400)
    const cap = document.createElement('div'); cap.className = 'tourcap'
    cap.innerHTML = `<span class="n"><span class="num"></span><span class="dots">${TOUR.map(() => '<i></i>').join('')}</span></span><h2></h2><p></p>`; root.appendChild(cap)
    const dots = cap.querySelectorAll('.dots i')
    let prev = null
    for (let i = 0; i < TOUR.length && !skip; i++) {
      const f = TOUR[i], p = POSE(i), s = scene(`<div class="rig"><div class="glass glassf">${f.build()}</div></div>`)
      const rig = s.querySelector('.rig')
      // the outgoing shot swings away out of focus while this one swings in from the other side and racks sharp
      if (prev) {
        const o = prev, op = POSE(i - 1)
        anim(o.querySelector('.rig'), [{ opacity: 1, filter: 'blur(0)', transform: `translate3d(0,-6vh,0) rotateX(3deg)` }, { opacity: 0, filter: 'blur(12px)', transform: `translate3d(${-op.x}vw,-4vh,-380px) rotateY(${-op.ry}deg) rotateX(${op.rx}deg)` }], { duration: 950, easing: 'cubic-bezier(.55,0,.4,1)' })
        setTimeout(() => o.remove(), still ? 0 : 1000)
        focus(0, 450).then(() => !skip && focus(2.5, 900))
        leak(.45, i % 2 ? -1 : 1, 1500)
        if (!skip) SFX.glass(i)
      } else if (!skip) SFX.whoosh()
      anim(rig, [{ opacity: 0, filter: 'blur(14px)', transform: `translate3d(${p.x}vw,-2vh,-420px) rotateY(${p.ry}deg) rotateX(${p.rx}deg)` },
        { opacity: 1, filter: 'blur(1px)', offset: .7 },
        { opacity: 1, filter: 'blur(0)', transform: `translate3d(0,-6vh,0) rotateX(3deg)` }], { duration: prev ? 1150 : 1200, delay: prev ? 120 : 0, easing: 'cubic-bezier(.2,1.02,.3,1)' })
      cap.querySelector('.num').textContent = String(i + 1).padStart(2, '0') + '  /  ' + String(TOUR.length).padStart(2, '0')
      dots.forEach((d, j) => { d.className = j === i ? 'on' : j < i ? 'past' : '' })
      words(cap.querySelector('h2'), f.title, 120, 45)
      cap.querySelector('p').innerHTML = f.text; anim(cap.querySelector('p'), [{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 900, delay: 320 })
      await sleep(750)
      await f.play(s)
      await sleep(1500)
      prev = s
    }
    if (prev) { focus(0, 500); await leave(prev, skip ? 1 : 600) }
    anim(cap, [{ opacity: 1 }, { opacity: 0 }], { duration: skip ? 1 : 400 }); setTimeout(() => cap.remove(), skip ? 0 : 420)
  }
  async function whatsNew(version) {
    const items = WHATS_NEW.items
    tween(sky, 'bokeh', .6, 1600); focus(2, 1200); leak(.6, -1, 2000)
    const s = scene(`<div class="new"><span class="eyebrow">New in Lumen ${version || WHATS_NEW.version}</span><h1>Fresh this version.</h1><div class="grid" style="--cols:${items.length === 4 ? 2 : 3}">${items.map((it, i) => `<div class="it glass sweep" style="--sd:${1.5 + i * .12}s"><div class="k">${ICONS[it.icon] || ''}</div><div><b>${it.title}</b><span>${it.text}</span></div></div>`).join('')}</div></div>`)
    anim(s.querySelector('.eyebrow'), [{ opacity: 0, transform: 'translateY(-10px)', letterSpacing: '.6em' }, { opacity: 1, transform: 'none', letterSpacing: '.24em' }], { duration: 1200 })
    anim(s.querySelector('h1'), [{ opacity: 0, filter: 'blur(16px)', transform: 'scale(1.1)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 1300, delay: 150, easing: 'cubic-bezier(.16,1,.3,1)' })
    s.querySelectorAll('.it').forEach((el, i) => {
      const fromX = (i % 2 ? 1 : -1) * 60
      anim(el, [{ opacity: 0, transform: `translate3d(${fromX}px,40px,-160px) rotateY(${-fromX / 4}deg) rotateX(18deg)`, filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1200, delay: 600 + i * 120 })
      setTimeout(() => !skip && SFX.pop(1 + i * .1), 600 + i * 120)
    })
    const hold = 1400 + items.length * 120 + 3200
    push(.03, hold + 600)
    setTimeout(() => { if (!skip && !still) { s.querySelector('h1').classList.add('shine'); SFX.shimmer() } }, 1500)
    await sleep(hold)
    tween(sky, 'bokeh', 0, 900); push(0, 800)
    await leave(s, 800)
  }
  async function finale({ short = false, ask = !short } = {}) {
    if (!skip) SFX.chord()
    // the letterbox opens up to the full frame, the orb rises above the title and the sky racks back into focus
    root.classList.add('wide'); focus(0, 1200); push(0, 600)
    sky.orbR = 0; sky.oy = -Math.min(H * .3, 250); tween(sky, 'orb', .8, 1200); tween(sky, 'orbR', 14, 1200); tween(sky, 'ring', 1, 1600); tween(sky, 'rays', .7, 2000); tween(sky, 'bokeh', .5, 2000); tween(sky, 'ghosts', .7, 2000); tween(sky, 'neb', .9, 2000)
    flare(.6); leak(.5, 1, 2200)
    const s = scene(`<div class="fin" style="margin-top:4vh"><div class="logo">${short ? 'You are up to date.' : 'Welcome to Lumen.'}</div>
      ${!ask ? '' : `<div class="ask glass sweep" style="--sd:1.6s"><div class="k">${ICONS.box || ''}</div><div><b>Keep track of your orders?</b><span>When you place an order on any shop, Lumen saves it to Parcels. One click takes you straight back to the order, and it stays there until it is delivered. Change it any time in Settings.</span></div></div>`}
      <div class="btns">${!ask ? '<button class="go">Continue</button>' : '<button class="no">Not now</button><button class="go">Yes, save my orders</button>'}</div></div>`)
    s.classList.add('live')
    // the question is the one thing you cannot skip: answer it, or decide later with Escape
    for (const el of root.querySelectorAll('.skip:not(.mute), .meter')) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).onfinish = () => { el.style.pointerEvents = 'none' }
    anim(s.querySelector('.logo'), [{ opacity: 0, filter: 'blur(14px)', transform: 'translateY(24px) scale(1.06)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 1300, easing: 'cubic-bezier(.16,1,.3,1)' })
    if (s.querySelector('.ask')) anim(s.querySelector('.ask'), [{ opacity: 0, transform: 'translateY(30px) scale(.96)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1100, delay: 450 })
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
  // anything still on stage after a skip leaves quickly before the finale comes in
  function clearStage() { for (const s of root.querySelectorAll('.stage .scene, .tourcap')) { s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }); setTimeout(() => s.remove(), 260) } }

  // ------------------------------------------------------------ play
  // play({ onDone }) is the full film for a first launch. play({ whatsNew: '1.15.0', onDone }) is the short cut after an update.
  async function play({ onDone, whatsNew: wn, askParcels = false } = {}) {
    if (document.getElementById('intro')) return
    skip = false
    still = matchMedia('(prefers-reduced-motion: reduce)').matches || (document.body && document.body.dataset.motion === 'off')
    if (!document.getElementById('intro-css')) { const st = document.createElement('style'); st.id = 'intro-css'; st.textContent = css; document.head.appendChild(st) }
    const acc = accent(); HUE = acc.h
    root = document.createElement('div'); root.id = 'intro'; root.style.setProperty('--a', acc.hex)
    root.innerHTML = `<div class="cam"><div class="nebw"><div class="neb"></div></div><canvas></canvas><div class="flare"></div><div class="stage"></div></div><div class="leak"></div><div class="grain"></div><div class="vig"></div><div class="bar t"></div><div class="bar b"></div>
      <div class="credit">${wn ? 'Lumen <b>' + String(wn).replace(/\.0$/, '') + '</b>' : 'A Lumen picture'}</div><button class="skip">Skip intro</button><button class="skip mute" style="right:136px">Sound on</button><div class="meter"><i></i></div>`
    document.body.appendChild(root)
    cv = root.querySelector('canvas'); cx = cv.getContext('2d', { alpha: false })
    size(); addEventListener('resize', size)
    root.querySelector('.grain').style.background = `url(${grainURL()})`
    if (!still) root.querySelector('.grain').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3%,2%)' }, { transform: 'translate(2%,-3%)' }, { transform: 'translate(0,0)' }], { duration: 600, iterations: Infinity, easing: 'steps(4)' })
    stars = Array.from({ length: Math.round(Math.min(900, W * H / 1600)) }, () => newStar())
    bokeh = Array.from({ length: 16 }, () => ({ x: Math.random(), y: .1 + Math.random() * .9, r: 30 + Math.random() * 90, h: [0, 30, 60, 95][Math.floor(Math.random() * 4)], a: .4 + Math.random() * .6, sx: .1 + Math.random() * .25, sy: .08 + Math.random() * .2, p: Math.random() * 6, v: .01 + Math.random() * .03 }))
    nebula = paintNebula()
    Object.assign(sky, { oy: 0, speed: .4, warp: 0, gather: 0, orb: 0, orbR: 0, ring: 0, shock: [], flash: 0, shake: 0, rays: 0, bokeh: 0, neb: 0, dof: 0, ghosts: 0 }); Object.assign(camera, { x: 0, y: 0, px: 0, py: 0, push: 0 }); dofShown = -1
    const onMove = e => { camera.px = e.clientX / innerWidth - .5; camera.py = e.clientY / innerHeight - .5 }
    addEventListener('pointermove', onMove)
    t0 = performance.now(); total = wn ? 12500 : 62000
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
      if (!skip || askParcels) { if (skip) clearStage(); skip = false; answer = await finale({ short: true, ask: askParcels }) }
    } else {
      await sleep(500); await coldOpen(); await warp(); await ignite(); await tour()   // a first launch shows what Lumen can do; what is new is only for people who update
      removeEventListener('keydown', onKey)
      // the last scene asks one question, even when the film itself was skipped
      if (skip) clearStage()
      skip = false
      answer = await finale()
    }

    // out: the frame dissolves into the browser
    SFX.fadeOut(.9)
    root.classList.remove('on')
    await new Promise(r => { root.animate([{ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(1.05)', filter: 'blur(10px)' }], { duration: still ? 1 : 800, easing: 'ease-in', fill: 'forwards' }).onfinish = r })
    cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('pointermove', onMove); root.remove()
    onDone && onDone({ parcels: answer })
  }
  window.Intro = { play, WHATS_NEW }
})()
