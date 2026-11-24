/* Lumen's opening film, Glow-up 2.0 (1.23). Shot through real liquid glass: every frame, card and button is a lens
   that bends the nebula behind it (an SVG displacement map on the backdrop, strongest at the rim, with a chromatic
   fringe), with a glint that follows your pointer and a caustic glow inside.
   The cut: the iris opens on a title sequence a glass droplet rolls across, a chromatic warp tunnel, ignition (orb,
   god rays, anamorphic streak, lens ghosts) with a glass lens sweeping over the logo and a crane-and-roll camera,
   a guided tour of eleven live demos in glass frames that throw caustics on the floor, the What is new act after an
   update, and a finale where the letterbox opens and asks one question. Everything is lit in your accent color.
   Synthesized, friendly score. No emoji. Skippable at any point with Skip or Escape, instant with Motion off.
   Every release rewrites WHATS_NEW below, and after an update Lumen plays the short what's-new cut once. */
;(function () {
  // ---- edit this list every release: it is the "New in Lumen" act of the film (only this version's changes)
  const WHATS_NEW = {
    version: '1.23',
    items: [
      { icon: 'sparkle', text: 'Lumen Nova: a brand new look for absolutely everything, made of real liquid glass' },
      { icon: 'tabs', text: 'A new browser: tabs, the address bar, menus and the command bar rebuilt' },
      { icon: 'clock', text: 'A new New Tab clock with styles to pick from' },
      { icon: 'layers', text: 'Lumen draws its own right-click menus and pop-ups now' },
      { icon: 'bolt', text: 'Surge and Koi redesigned to match' },
      { icon: 'moon', text: 'Lumen keeps running in the background for Surge and Koi: Cmd Q closes the windows, Cmd Option Q quits everything' },
      { icon: 'star', text: 'A new app icon in every color' },
      { icon: 'play', text: 'A new film, reshot from the first frame to the last' },
    ],
  }
  const HEAD = 'ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,system-ui,sans-serif'
  const css = `
  #intro{--a:#5b8cff;--a2:oklch(from var(--a) calc(l - .02) c calc(h + 40));--a3:oklch(from var(--a) calc(l + .04) c calc(h + 95));--nova:linear-gradient(135deg,var(--a),var(--a2) 55%,var(--a3));
    --hi:color-mix(in oklab,var(--a) 42%,#fff);--hi3:color-mix(in oklab,var(--a3) 46%,#fff);--bar:calc(10.5vh + 6px);--gx:30%;--gy:18%;
    position:fixed;inset:0;z-index:1000;background:#04050b;color:#eef0fb;overflow:hidden;font-family:var(--font);-webkit-app-region:no-drag;user-select:none}
  #intro svg.defs{position:absolute;width:0;height:0;pointer-events:none}
  #intro canvas{position:absolute;inset:0;width:100%;height:100%}
  #intro .cam{position:absolute;inset:-40px;will-change:transform}
  #intro .nebw{position:absolute;inset:-15%;will-change:transform}
  #intro .neb{position:absolute;inset:0;opacity:0;transition:opacity 3s;
    background:radial-gradient(40% 36% at 28% 34%,color-mix(in srgb,var(--a) 28%,transparent),transparent 70%),radial-gradient(38% 34% at 74% 64%,color-mix(in srgb,var(--a2) 26%,transparent),transparent 70%),radial-gradient(26% 26% at 52% 48%,color-mix(in srgb,var(--a3) 16%,transparent),transparent 70%)}
  #intro.lit .neb{opacity:1;animation:neb 18s ease-in-out infinite alternate}
  @keyframes neb{to{transform:translate3d(3%,-2%,0) scale(1.08) rotate(2deg)}}
  #intro .flare{position:absolute;left:50%;top:50%;width:160vw;height:3px;margin-left:-80vw;border-radius:50%;opacity:0;pointer-events:none;z-index:3;
    background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--hi) 60%,transparent) 38%,#fff 50%,color-mix(in srgb,var(--hi3) 60%,transparent) 62%,transparent 90%);filter:blur(1px);box-shadow:0 0 40px 6px color-mix(in srgb,var(--a) 40%,transparent)}
  #intro .leak{position:absolute;inset:-20%;z-index:5;pointer-events:none;opacity:0;mix-blend-mode:screen;filter:blur(30px);
    background:radial-gradient(30% 50% at 20% 40%,rgba(255,170,110,.55),transparent 70%),radial-gradient(34% 60% at 46% 60%,color-mix(in srgb,var(--a3) 55%,transparent),transparent 70%),radial-gradient(24% 40% at 70% 30%,color-mix(in srgb,var(--a) 50%,transparent),transparent 70%)}
  #intro .grain{position:absolute;inset:-6%;z-index:6;pointer-events:none;opacity:.06;mix-blend-mode:screen}
  #intro .vig{position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(125% 95% at 50% 50%,transparent 42%,rgba(0,0,0,.82))}
  /* chromatic aberration at the edges of the frame, like a real anamorphic lens */
  #intro .ca{position:absolute;inset:0;z-index:5;pointer-events:none;mix-blend-mode:screen;opacity:.55;
    background:radial-gradient(140% 110% at 50% 50%,transparent 62%,color-mix(in srgb,var(--a3) 16%,transparent) 80%,transparent),radial-gradient(150% 120% at 52% 50%,transparent 64%,rgba(255,80,140,.10) 84%,transparent)}
  #intro .bar{position:absolute;left:0;right:0;height:var(--bar);background:#000;z-index:8;transition:transform 1.6s cubic-bezier(.3,1.12,.5,1)}
  #intro .bar.t{top:-6px;transform:translateY(-100%)} #intro .bar.b{bottom:-6px;transform:translateY(100%)}
  #intro .bar::after{content:'';position:absolute;left:0;right:0;height:1px;opacity:.6;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--a) 70%,transparent) 30%,#fff 50%,color-mix(in srgb,var(--a3) 70%,transparent) 70%,transparent)}
  #intro .bar.t::after{bottom:0} #intro .bar.b::after{top:0}
  #intro.on .bar{transform:none}
  #intro.on.wide .bar.t{transform:translateY(-100%)} #intro.on.wide .bar.b{transform:translateY(100%)}
  #intro .stage{position:absolute;inset:0;display:grid;place-items:center;z-index:4;perspective:1400px}
  #intro .scene{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;transform-style:preserve-3d}
  #intro .scene.live{pointer-events:auto}

  /* real liquid glass: the backdrop is bent by an SVG lens (set from script), with a pointer glint, an inner caustic
     glow, a chromatic rim and a refractive gradient edge. Without the lens it is frosted glass. */
  #intro .glass{position:relative;border-radius:24px;
    background:radial-gradient(55% 45% at var(--gx) var(--gy),rgba(255,255,255,.17),transparent 62%),radial-gradient(90% 60% at 50% 118%,color-mix(in srgb,var(--a) 30%,transparent),transparent 70%),linear-gradient(150deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 55%,rgba(255,255,255,.05)),rgba(10,12,28,.2);
    backdrop-filter:blur(26px) saturate(1.8);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(255,255,255,.07),inset 2px 0 0 rgba(255,90,150,.16),inset -2px 0 0 rgba(90,200,255,.16),inset 0 0 34px color-mix(in srgb,var(--a) 16%,transparent),
      0 24px 60px -18px color-mix(in srgb,var(--a) 55%,transparent),0 40px 100px -30px color-mix(in srgb,var(--a3) 35%,transparent),0 50px 120px rgba(0,0,0,.5)}
  #intro .glass::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:linear-gradient(135deg,color-mix(in srgb,var(--a) 90%,#fff),rgba(255,255,255,.08) 30%,transparent 46%,transparent 58%,rgba(255,255,255,.1) 72%,var(--a3));
    -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
  #intro .sweep{overflow:hidden}
  #intro .sweep::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.22) 50%,transparent 65%);transform:translateX(-120%);animation:isw 1.5s var(--sd,1s) cubic-bezier(.3,.7,.2,1) forwards}
  @keyframes isw{to{transform:translateX(120%)}}
  /* a liquid glass droplet: a ball lens that magnifies what it rolls over */
  #intro .drop{position:absolute;left:0;top:0;border-radius:50%;pointer-events:none;z-index:2;opacity:0;
    background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.5),rgba(255,255,255,.08) 18%,transparent 34%),radial-gradient(circle at 66% 80%,color-mix(in srgb,var(--a3) 34%,transparent),transparent 46%),radial-gradient(circle at 50% 50%,transparent 62%,color-mix(in srgb,var(--a) 22%,transparent) 92%,rgba(255,255,255,.3));
    backdrop-filter:blur(2px) saturate(1.6) brightness(1.1);
    box-shadow:inset 0 2px 1px rgba(255,255,255,.55),inset 0 -6px 14px color-mix(in srgb,var(--a) 40%,transparent),inset 3px 0 0 rgba(255,90,150,.22),inset -3px 0 0 rgba(90,200,255,.22),0 20px 50px -10px color-mix(in srgb,var(--a) 55%,transparent),0 0 0 1px rgba(255,255,255,.14)}

  /* title sequence */
  #intro .title{position:relative;width:100%;height:100%;display:grid;place-items:center}
  #intro .title .ph{position:absolute;font:800 clamp(36px,5.4vw,78px)/1 ${HEAD};letter-spacing:-.035em;color:#f1f3ff;white-space:nowrap;opacity:0;text-shadow:0 0 40px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .title .ph em{font-style:normal;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent;filter:brightness(1.35) saturate(1.1)}
  #intro .title .fil{position:absolute;left:50%;top:calc(50% + clamp(36px,4.6vw,64px));width:min(560px,62vw);height:2px;margin-left:min(-280px,-31vw);border-radius:2px;transform:scaleX(0);
    background:linear-gradient(90deg,transparent,var(--hi) 30%,#fff 50%,var(--hi3) 70%,transparent);box-shadow:0 0 18px 2px color-mix(in srgb,var(--a) 60%,transparent)}
  #intro .title .pre{position:absolute;top:calc(50% - clamp(74px,8.4vw,116px));font:700 11px/1 var(--font);letter-spacing:.5em;text-transform:uppercase;color:color-mix(in srgb,var(--hi) 80%,transparent);opacity:0}
  #intro .title .slate{position:absolute;bottom:calc(var(--bar) + 30px);font:700 10px/1 var(--font);letter-spacing:.4em;text-transform:uppercase;color:rgba(220,226,255,.34);opacity:0;font-variant-numeric:tabular-nums}
  /* ignition */
  #intro .kicker{display:inline-block;font:700 11.5px/1 var(--font);letter-spacing:.46em;text-transform:uppercase;color:var(--hi);margin-bottom:22px;opacity:0;padding:9px 14px 9px calc(14px + .46em);border-radius:999px}
  #intro .logo{position:relative;font:800 clamp(76px,12.6vw,176px)/1 ${HEAD};letter-spacing:-.05em;white-space:nowrap}
  #intro .logo span{display:inline-block;background:linear-gradient(100deg,#fff 12%,var(--hi) 55%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent;opacity:0;padding-bottom:.06em}
  #intro .logo .glint{position:absolute;inset:0;font:inherit;letter-spacing:inherit;white-space:nowrap;color:transparent;pointer-events:none;background:linear-gradient(100deg,transparent 42%,rgba(255,255,255,.95) 50%,transparent 58%);background-size:300% 100%;background-position:120% 0;-webkit-background-clip:text;background-clip:text;opacity:0}
  #intro .logo .mirror{position:absolute;left:0;right:0;top:100%;margin-top:-.08em;transform:scaleY(-1);opacity:.14;pointer-events:none;-webkit-mask:linear-gradient(to top,#000,transparent 55%);mask:linear-gradient(to top,#000,transparent 55%);filter:blur(2px)}
  #intro .logo .mirror span{opacity:1}
  #intro .rule{width:min(440px,52vw);height:1px;margin:26px auto 0;background:linear-gradient(90deg,transparent,var(--hi),#fff,var(--hi3),transparent);transform:scaleX(0)}
  #intro .tag{color:#b9c0e3;font-size:clamp(15px,1.5vw,20px);margin-top:16px;text-align:center;letter-spacing:.02em}
  #intro .tag .w,#intro .tourcap .w{display:inline-block;opacity:0}

  /* the tour: live demos inside liquid glass frames */
  #intro .rig{position:relative;transform-style:preserve-3d;will-change:transform}
  #intro .glassf{padding:14px;border-radius:34px}
  #intro .glassf .glare{position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:3;overflow:hidden;mix-blend-mode:screen;
    background:radial-gradient(40% 34% at var(--gx) var(--gy),rgba(255,255,255,.16),transparent 70%),linear-gradient(160deg,rgba(255,255,255,.09),transparent 30%)}
  #intro .glassf .glare::after{content:'';position:absolute;top:-20%;bottom:-20%;width:34%;left:-40%;transform:skewX(-18deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.22) 45%,rgba(255,255,255,.4) 50%,rgba(255,255,255,.22) 55%,transparent);opacity:0}
  #intro .glassf.pass .glare::after{animation:pass 1.5s .35s cubic-bezier(.4,0,.2,1)}
  @keyframes pass{0%{left:-40%;opacity:1}100%{left:120%;opacity:1}}
  #intro .glassf::after{content:'';position:absolute;left:6%;right:6%;bottom:-74px;height:64px;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 50%,transparent),transparent);filter:blur(16px);opacity:.8}
  #intro .mw{position:relative;width:min(720px,72vw);height:min(396px,44vh);border-radius:20px;overflow:hidden;color:#1c1d21;font:13px -apple-system,system-ui,sans-serif;
    background:radial-gradient(60% 80% at 10% 0%,color-mix(in srgb,var(--a) 14%,transparent),transparent 70%),radial-gradient(50% 70% at 100% 10%,color-mix(in srgb,var(--a3) 12%,transparent),transparent 70%),#f3f4fa;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 0 0 1px rgba(255,255,255,.1);transition:background .9s}
  #intro .mw .tb{height:42px;display:flex;align-items:center;gap:6px;padding:0 12px;position:relative}
  #intro .mw .lt{display:flex;gap:6px;margin-right:12px}#intro .mw .lt i{width:11px;height:11px;border-radius:50%;background:#ff5f57}#intro .mw .lt i:nth-child(2){background:#febc2e}#intro .mw .lt i:nth-child(3){background:#28c840}
  #intro .mw .t{height:28px;border-radius:12px;padding:0 10px;display:flex;align-items:center;gap:7px;color:#5d6070;width:128px;white-space:nowrap;overflow:hidden;font-size:12px;flex:none;transition:background .3s}
  #intro .mw .t b{width:12px;height:12px;border-radius:4px;flex:none}
  #intro .mw .t.on{background:rgba(255,255,255,.92);color:#111;font-weight:700;box-shadow:inset 0 1px 0 #fff,0 0 0 3px color-mix(in srgb,var(--a) 18%,transparent),0 6px 18px color-mix(in srgb,var(--a) 30%,transparent)}
  #intro .mw .ub{margin:0 12px 8px;height:32px;border-radius:999px;background:rgba(255,255,255,.88);display:flex;align-items:center;padding:0 12px 0 14px;color:#888;box-shadow:0 2px 10px rgba(20,24,60,.06),inset 0 0 0 1px rgba(20,24,60,.05),inset 0 1px 0 #fff;font-size:12px;gap:8px}
  #intro .mw .ub svg{width:14px;height:14px;flex:none}
  #intro .mw .ub .sh{margin-left:auto;display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:999px;background:color-mix(in srgb,var(--a) 12%,#fff);color:color-mix(in srgb,var(--a) 75%,#000);font:800 11px system-ui;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 22%,transparent)}
  #intro .mw .pg{position:absolute;left:8px;right:8px;top:90px;bottom:8px;border-radius:16px;background:#fff;padding:22px 26px;overflow:hidden;transition:background 1s,color 1s;box-shadow:inset 0 0 0 1px rgba(20,24,60,.04)}
  #intro .mw .ln{height:9px;border-radius:5px;background:#e8ebf3;margin:9px 0;transition:background 1s}
  #intro .mw .h{height:16px;width:55%;border-radius:6px;background:color-mix(in srgb,var(--a) 24%,#e3e6f0);margin-bottom:14px;transition:background 1s}
  #intro .mw .img{height:64px;border-radius:12px;margin:12px 0;background:linear-gradient(120deg,color-mix(in srgb,var(--a) 40%,#fff),color-mix(in srgb,var(--a3) 40%,#fff))}
  #intro .mw .ad{position:absolute;border-radius:12px;background:linear-gradient(135deg,#ff8787,#ffc078);color:#fff;font:800 11px/1 system-ui;display:grid;place-items:center;letter-spacing:.12em;box-shadow:0 8px 20px rgba(255,120,100,.3)}
  #intro .mw .cnt{position:absolute;right:16px;top:12px;padding:6px 12px;border-radius:999px;background:var(--nova);color:#fff;font:800 12px system-ui;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 6px 18px color-mix(in srgb,var(--a) 45%,transparent);font-variant-numeric:tabular-nums}
  /* glass inside the demos: it refracts the page underneath */
  #intro .mw .lgl{background:radial-gradient(60% 60% at var(--gx) var(--gy),rgba(255,255,255,.5),transparent 70%),linear-gradient(160deg,rgba(255,255,255,.62),rgba(255,255,255,.36));backdrop-filter:blur(18px) saturate(1.8);
    box-shadow:inset 0 1px 0 #fff,inset 0 -1px 0 rgba(255,255,255,.5),inset 2px 0 0 rgba(255,90,150,.12),inset -2px 0 0 rgba(90,200,255,.14),inset 0 0 24px color-mix(in srgb,var(--a) 12%,transparent),0 30px 70px rgba(20,24,60,.22),0 0 0 1px rgba(255,255,255,.6),0 0 0 5px color-mix(in srgb,var(--a) 12%,transparent)}
  #intro .mw .cmdp{position:absolute;left:50%;top:62px;width:76%;margin-left:-38%;border-radius:24px;overflow:hidden;padding-bottom:6px}
  #intro .mw .cmdp .in{height:52px;display:flex;align-items:center;gap:10px;padding:0 18px;font-size:16px;font-weight:650}
  #intro .mw .cmdp .in svg{width:18px;height:18px;color:var(--a)}
  #intro .mw .cmdp .caret{width:2px;height:20px;background:var(--a);animation:blink 1s steps(2) infinite}
  @keyframes blink{50%{opacity:0}}
  #intro .mw .cmdp .r{height:36px;display:flex;align-items:center;gap:10px;margin:0 6px;padding:0 12px;border-radius:12px;color:#444;opacity:0;transition:background .3s,color .3s,box-shadow .3s}
  #intro .mw .cmdp .r.sel{background:color-mix(in srgb,var(--a) 16%,rgba(255,255,255,.4));color:#111;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 22%,transparent)}
  #intro .mw .cmdp .r em{margin-left:auto;font-style:normal;color:#8a8d9a;font-size:11px}
  #intro .mw .side{position:absolute;top:90px;right:8px;bottom:8px;width:40%;border-radius:18px;padding:16px;transform:translateX(112%)}
  #intro .mw .side .ah{display:flex;align-items:center;gap:8px;font-weight:800;color:color-mix(in srgb,var(--a) 80%,#000);margin-bottom:10px}
  #intro .mw .side .ah i{width:18px;height:18px;border-radius:6px;background:var(--nova);box-shadow:0 0 12px color-mix(in srgb,var(--a) 60%,transparent)}
  #intro .mw .side p{margin:0 0 10px;line-height:1.5;color:#2b2d36;font-size:12px;min-height:54px}
  #intro .mw .side .kp{display:flex;flex-wrap:wrap;gap:6px}
  #intro .mw .side .kp span{padding:5px 10px;border-radius:999px;font:700 11px system-ui;color:color-mix(in srgb,var(--a) 75%,#000);background:color-mix(in srgb,var(--a) 14%,rgba(255,255,255,.7));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 22%,transparent);opacity:0}
  #intro .mw .tr{font-size:15px;line-height:1.7;color:#222;position:relative}
  #intro .mw .scan{position:absolute;left:0;right:0;top:0;height:46px;pointer-events:none;opacity:0;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--a) 22%,transparent) 70%,color-mix(in srgb,var(--a) 70%,#fff) 96%,transparent);filter:blur(.4px)}
  #intro .mw .pill{position:absolute;right:20px;bottom:20px;padding:8px 14px;border-radius:999px;display:flex;align-items:center;gap:8px;font:700 12px system-ui;color:#222;opacity:0}
  #intro .mw .pill svg{width:15px;height:15px;color:var(--a)}
  #intro .mw .reveal{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,#1b1d27,#12141b);clip-path:circle(0% at 92% 7%)}
  #intro .mw .reveal .pg{background:#0e1016}#intro .mw .reveal .ln{background:#262a35}#intro .mw .reveal .h{background:color-mix(in srgb,var(--a) 42%,#2a2e3c)}
  #intro .mw .reveal .ub{background:#232631;color:#aab;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}#intro .mw .reveal .t.on{background:#2c2f3a;color:#fff}#intro .mw .reveal .t{color:#aab}
  #intro .mw .reveal .img{background:linear-gradient(120deg,color-mix(in srgb,var(--a) 45%,#111),color-mix(in srgb,var(--a3) 40%,#111))}
  #intro .mw .split{position:absolute;inset:90px 8px 8px;display:flex;gap:8px}
  #intro .mw .split .pp{flex:1;border-radius:16px;background:#fff;padding:18px;min-width:0}
  #intro .mw .split .dv{flex:none;width:6px;margin:auto -7px;height:44px;border-radius:3px;background:var(--nova);box-shadow:0 0 12px color-mix(in srgb,var(--a) 60%,transparent);z-index:1}
  #intro .mw .ntp{position:absolute;left:8px;right:8px;top:90px;bottom:8px;border-radius:16px;overflow:hidden;display:grid;place-items:center;
    background:radial-gradient(60% 80% at 30% 20%,color-mix(in srgb,var(--a) 40%,#fff),transparent 70%),radial-gradient(60% 70% at 80% 80%,color-mix(in srgb,var(--a3) 38%,#fff),transparent 70%),#eef0f8}
  #intro .mw .ntp .ck{position:absolute;display:grid;place-items:center;opacity:0}
  #intro .mw .ntp .ck.dig{font:800 76px/1 ${HEAD};letter-spacing:-.04em;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent;font-variant-numeric:tabular-nums}
  #intro .mw .ntp .ck.dig small{display:block;font:700 12px system-ui;letter-spacing:.3em;text-transform:uppercase;color:#555a70;-webkit-text-fill-color:#555a70;text-align:center;margin-top:8px}
  #intro .mw .ntp .ck.ana{width:156px;height:156px;border-radius:50%;background:repeating-conic-gradient(from -1deg,rgba(28,29,36,.5) 0 2deg,transparent 2deg 30deg),radial-gradient(circle,rgba(255,255,255,.75) 60%,rgba(255,255,255,.35));box-shadow:inset 0 1px 0 #fff,inset 0 -10px 24px color-mix(in srgb,var(--a) 22%,transparent),0 0 0 1px rgba(255,255,255,.7),0 0 0 6px color-mix(in srgb,var(--a) 14%,transparent),0 20px 40px color-mix(in srgb,var(--a) 30%,transparent)}
  #intro .mw .ntp .ck.ana::before{content:'';position:absolute;inset:14px;border-radius:50%;background:radial-gradient(circle,#fff 55%,rgba(255,255,255,.6))}
  #intro .mw .ntp .ck.ana i{position:absolute;left:50%;bottom:50%;width:4px;margin-left:-2px;border-radius:2px;transform-origin:50% 100%;background:#1c1d24}
  #intro .mw .ntp .ck.ana i.m{height:52px;transform:rotate(246deg)}#intro .mw .ntp .ck.ana i.hh{height:36px;width:6px;margin-left:-3px;transform:rotate(290deg)}#intro .mw .ntp .ck.ana i.s{height:60px;width:2px;margin-left:-1px;background:var(--a)}
  #intro .mw .ntp .ck.ana b{position:absolute;width:10px;height:10px;border-radius:50%;background:var(--nova)}
  #intro .mw .ntp .ck.ring{width:156px;height:156px;border-radius:50%;background:conic-gradient(var(--a),var(--a2),var(--a3) 72%,rgba(255,255,255,.4) 0);-webkit-mask:radial-gradient(closest-side,transparent 82%,#000 84%);mask:radial-gradient(closest-side,transparent 82%,#000 84%);filter:drop-shadow(0 0 14px color-mix(in srgb,var(--a) 60%,transparent))}
  #intro .mw .ntp .ckt{position:absolute;font:800 34px/1 ${HEAD};letter-spacing:-.03em;color:#1c1d24;opacity:0;font-variant-numeric:tabular-nums}
  #intro .mw .ntp .sty{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:4px;padding:4px;border-radius:999px}
  #intro .mw .ntp .sty span{padding:6px 12px;border-radius:999px;font:700 11px system-ui;color:#555a70;transition:background .35s,color .35s,box-shadow .35s}
  #intro .mw .ntp .sty span.on{background:var(--nova);color:#fff;box-shadow:0 4px 14px color-mix(in srgb,var(--a) 45%,transparent)}
  #intro .mw .pcard{position:absolute;left:50%;top:50%;width:64%;margin:-62px 0 0 -32%;padding:18px;border-radius:24px;display:flex;gap:14px;align-items:center}
  #intro .mw .pcard .k{width:46px;height:46px;border-radius:15px;flex:none;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#ff9f43,#ff6b6b);transition:background .6s;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 8px 20px rgba(255,120,80,.35)}
  #intro .mw .pcard .k svg{width:22px;height:22px}
  #intro .mw .pcard b{display:block;font-size:15px;margin-bottom:3px}
  #intro .mw .pcard span{color:#6d7080;font-size:12px}
  #intro .mw .steps{position:relative;display:flex;gap:4px;margin-top:10px}
  #intro .mw .steps s{flex:1;height:4px;border-radius:2px;background:#e3e6ef;text-decoration:none;transition:background .4s}
  #intro .mw .steps s.on{background:var(--nova)}
  #intro .mw .steps u{position:absolute;top:-4px;left:0;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px var(--a),0 0 12px var(--a);transition:left .55s cubic-bezier(.3,1.3,.5,1)}
  #intro .mw .plist{position:absolute;inset:0;padding:22px 26px}
  #intro .mw .plist .ln{opacity:.6}
  #intro .desk{position:relative;width:min(720px,72vw);height:min(396px,44vh);border-radius:20px;overflow:hidden;background:radial-gradient(120% 90% at 30% 20%,color-mix(in srgb,var(--a) 42%,#1a1d3a),#12142a 60%,#0b0c18)}
  #intro .desk::before{content:'';position:absolute;inset:0;background:radial-gradient(1px 1px at 12% 30%,#fff,transparent),radial-gradient(1px 1px at 40% 70%,#fff,transparent),radial-gradient(1.4px 1.4px at 66% 22%,#fff,transparent),radial-gradient(1px 1px at 84% 60%,#fff,transparent),radial-gradient(1px 1px at 22% 84%,#fff,transparent);opacity:.4}
  #intro .desk .menubar{position:relative;height:26px;background:rgba(255,255,255,.08);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:0 12px;font:600 11px -apple-system,system-ui,sans-serif;color:rgba(255,255,255,.8);box-shadow:inset 0 -1px 0 rgba(255,255,255,.06)}
  #intro .desk .menubar span{display:inline-flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums} #intro .applogo.mb{width:15px;height:15px}
  #intro .desk .edge{position:absolute;inset:0;border-radius:20px;box-shadow:inset 0 0 0 0 rgba(0,255,133,0);transition:box-shadow 1.1s cubic-bezier(.2,.9,.3,1)}
  #intro .desk.lit .edge{box-shadow:inset 0 0 40px 10px rgba(0,255,133,.55),inset 0 0 120px 20px rgba(0,212,255,.25)}
  #intro .desk .chg{position:absolute;left:50%;top:62px;transform:translateX(-50%) scale(.6);opacity:0;padding:10px 18px;border-radius:999px;color:#fff;font:700 13px system-ui;display:flex;gap:10px;align-items:center;transition:transform .7s cubic-bezier(.3,1.4,.5,1),opacity .5s;font-variant-numeric:tabular-nums;
    background:linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.04));backdrop-filter:blur(16px) saturate(1.8);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 2px 0 0 rgba(255,90,150,.18),inset -2px 0 0 rgba(90,200,255,.18),0 0 0 1px rgba(255,255,255,.1),0 10px 30px rgba(0,0,0,.4)}
  #intro .desk.lit .chg{transform:translateX(-50%) scale(1);opacity:1}
  #intro .desk .chg i{width:44px;height:14px;border-radius:5px;border:2px solid rgba(255,255,255,.6);position:relative}
  #intro .desk .chg i::after{content:'';position:absolute;left:1px;top:1px;bottom:1px;width:0;border-radius:2px;background:linear-gradient(90deg,#00d4ff,#00FF85);box-shadow:0 0 8px #00FF85;transition:width 1.8s ease}
  #intro .desk.lit .chg i::after{width:72%}
  #intro .desk .rip{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid var(--a);box-shadow:0 0 16px var(--a);opacity:0}
  #intro .desk .keys{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);display:flex;gap:6px}
  #intro .desk .keys b{width:36px;height:36px;border-radius:11px;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06));box-shadow:inset 0 -3px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.2),0 0 0 1px rgba(255,255,255,.06);display:grid;place-items:center;color:#fff;font:700 13px system-ui;transition:transform .12s,background .12s,box-shadow .2s}
  #intro .desk .keys b.dn{transform:translateY(2px) scale(.95);background:color-mix(in srgb,var(--a) 70%,transparent);box-shadow:inset 0 -1px 0 rgba(0,0,0,.35),0 0 18px var(--a)}
  #intro .desk .fan{position:absolute;left:50%;top:60%}
  #intro .desk .fan i{position:absolute;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:17px;box-shadow:0 10px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.35),inset 0 -8px 16px rgba(0,0,0,.12);opacity:0;display:grid;place-items:center;color:#fff;font:800 18px system-ui}
  #intro .desk .fan .hub{position:absolute;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 30%,transparent),transparent);opacity:0}
  #intro .desk .cur{position:absolute;left:50%;top:60%;width:14px;height:20px;margin:-2px 0 0 -2px;background:#fff;clip-path:polygon(0 0,0 100%,30% 72%,55% 100%,70% 92%,47% 66%,85% 66%);filter:drop-shadow(0 2px 4px rgba(0,0,0,.5));z-index:2}
  #intro .art{position:absolute;top:50%;width:52vh;height:52vh;margin-top:-30vh;color:var(--hi);opacity:0;pointer-events:none;transform:rotate(-12deg)}
  #intro .art svg{width:100%;height:100%;stroke-width:.9;filter:drop-shadow(0 0 24px color-mix(in srgb,var(--a) 60%,transparent))}
  #intro .art.r{right:-6vh}#intro .art.l{left:-6vh;transform:rotate(12deg)}
  #intro .halo{position:absolute;left:50%;top:44%;width:min(900px,90vw);height:62vh;margin:-31vh 0 0 max(-450px,-45vw);border-radius:50%;pointer-events:none;opacity:0;filter:blur(60px);
    background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 55%,transparent),color-mix(in srgb,var(--a3) 30%,transparent) 55%,transparent)}
  #intro .tourcap{position:absolute;left:0;right:0;bottom:calc(var(--bar) + 24px);text-align:center;z-index:7}
  #intro .tourcap .n{display:inline-flex;align-items:center;gap:10px;font:800 11px/1 var(--font);letter-spacing:.22em;color:var(--hi);margin-bottom:12px;white-space:pre;font-variant-numeric:tabular-nums}
  #intro .tourcap .dots{display:inline-flex;gap:4px;vertical-align:middle;margin-left:12px}
  #intro .tourcap .dots i{width:12px;height:3px;border-radius:2px;background:rgba(255,255,255,.16);transition:background .5s,width .6s cubic-bezier(.3,1.3,.5,1),box-shadow .5s}
  #intro .tourcap .dots i.on{width:28px;background:var(--nova);box-shadow:0 0 10px color-mix(in srgb,var(--a) 70%,transparent)}
  #intro .tourcap .dots i.past{background:color-mix(in srgb,var(--a) 50%,rgba(255,255,255,.2))}
  #intro .tourcap h2{font:800 clamp(26px,3.4vw,46px)/1.08 ${HEAD};letter-spacing:-.035em;margin:0 0 8px;text-shadow:0 0 30px color-mix(in srgb,var(--a) 40%,transparent)}
  #intro .tourcap p{margin:0 auto;max-width:640px;color:#b8bfe2;font-size:15px;line-height:1.5}
  #intro kbd{font:700 12px var(--font);padding:2px 8px;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(0,0,0,.2),0 0 0 1px color-mix(in srgb,var(--a) 34%,transparent)}

  /* what is new: eight glass tiles */
  #intro .new{width:min(1120px,90vw);text-align:center;transform-style:preserve-3d}
  #intro .new .eyebrow{display:inline-block;font:800 12px/1 var(--font);letter-spacing:.24em;text-transform:uppercase;color:#fff;padding:10px 18px;border-radius:999px}
  #intro .new h1{font:800 clamp(32px,4.4vw,64px)/1.04 ${HEAD};letter-spacing:-.04em;margin:14px 0 clamp(16px,3vh,28px);padding-bottom:.06em;background:linear-gradient(100deg,#fff 25%,var(--hi) 60%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .new h1.shine{animation:nsweep 1.6s cubic-bezier(.3,.7,.2,1)}
  @keyframes nsweep{0%{background-image:linear-gradient(100deg,#fff 25%,var(--hi) 60%,var(--hi3)),linear-gradient(100deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);background-size:100% 100%,250% 100%;background-position:0 0,120% 0}100%{background-image:linear-gradient(100deg,#fff 25%,var(--hi) 60%,var(--hi3)),linear-gradient(100deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);background-size:100% 100%,250% 100%;background-position:0 0,-20% 0}}
  #intro .new .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;text-align:left}
  #intro .new .it{padding:16px 16px 18px;opacity:0;display:flex;flex-direction:column;gap:12px;border-radius:24px}
  #intro .new .it .hd{display:flex;align-items:center;justify-content:space-between}
  #intro .new .it .no2{font:800 11px/1 var(--font);letter-spacing:.2em;color:color-mix(in srgb,var(--hi) 80%,transparent);font-variant-numeric:tabular-nums}
  #intro .new .it .k,#intro .ask .k{flex:none;width:40px;height:40px;border-radius:13px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -6px 12px rgba(0,0,0,.12),0 10px 26px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .new .it .k svg{width:19px;height:19px}
  #intro .new .it span{color:#e4e7fa;font:650 14px/1.45 var(--font);letter-spacing:-.005em}
  @media (max-width:760px){#intro .new .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#intro .new .it{padding:12px;gap:8px}#intro .new .it span{font-size:12.5px}}
  /* finale */
  #intro .fin{text-align:center;width:min(980px,94vw);display:flex;flex-direction:column;align-items:center}
  #intro .fin .ask{width:min(580px,90vw)}
  #intro .fin .logo{font-size:clamp(46px,6.6vw,88px);background:linear-gradient(100deg,#fff 20%,var(--hi) 60%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.08em}
  #intro .ask{margin:30px auto 0;padding:22px 24px;text-align:left;display:flex;gap:16px;align-items:flex-start;opacity:0;border-radius:28px}
  #intro .ask .k{width:46px;height:46px;border-radius:15px;background:linear-gradient(135deg,#ff9f43,#ff6b6b);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -6px 12px rgba(0,0,0,.12),0 10px 28px rgba(255,120,80,.45)}
  #intro .ask .k svg{width:22px;height:22px}
  #intro .ask b{display:block;font:800 19px/1.2 ${HEAD};letter-spacing:-.025em;margin-bottom:6px}
  #intro .ask span{color:#ccd1ee;font-size:13.5px;line-height:1.5}
  #intro .btns{display:flex;gap:12px;justify-content:center;margin-top:24px;opacity:0}
  #intro .go{position:relative;overflow:hidden;height:54px;padding:0 32px;border-radius:999px;border:0;background:var(--nova);color:#fff;font:800 16px ${HEAD};letter-spacing:-.01em;cursor:default;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -8px 16px rgba(0,0,0,.12),0 0 0 4px color-mix(in srgb,var(--a) 18%,transparent),0 0 30px color-mix(in srgb,var(--a) 45%,transparent),0 14px 40px color-mix(in srgb,var(--a) 60%,transparent);transition:transform .45s cubic-bezier(.3,1.5,.5,1),filter .2s}
  #intro .go::before{content:'';position:absolute;left:14%;right:14%;top:2px;height:40%;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.22),transparent);pointer-events:none}
  #intro .go::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.5) 50%,transparent 70%);transform:translateX(-130%);animation:isw 1.3s 1.6s ease-out forwards}
  #intro .go:hover{transform:translateY(-2px);filter:brightness(1.08)} #intro .go:active{transform:scale(.96)}
  #intro .no{position:relative;height:54px;padding:0 26px;border-radius:999px;border:0;color:#e3e6ff;font:650 15px var(--font);cursor:default;transition:transform .45s cubic-bezier(.3,1.5,.5,1),filter .2s}
  #intro .no:hover{transform:translateY(-1px);filter:brightness(1.15)} #intro .no:active{transform:scale(.96)}
  #intro .skip{position:absolute;right:28px;top:calc(var(--bar) + 16px);z-index:9;border:0;color:#e2e5fb;font:650 12.5px var(--font);height:34px;padding:0 8px 0 16px;border-radius:999px;cursor:default;display:inline-flex;align-items:center;gap:9px;transition:transform .4s cubic-bezier(.3,1.5,.5,1),filter .2s}
  #intro .skip.mute{padding:0 16px;right:150px}
  #intro .skip kbd{font-size:10.5px;padding:3px 7px;letter-spacing:.06em;text-transform:uppercase}
  #intro .skip:hover{transform:translateY(-1px);filter:brightness(1.2)} #intro .skip:active{transform:scale(.95)}
  #intro .chrome{background:radial-gradient(70% 90% at var(--gx) var(--gy),rgba(255,255,255,.14),transparent 70%),linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03));backdrop-filter:blur(16px) saturate(1.7);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.24),inset 2px 0 0 rgba(255,90,150,.12),inset -2px 0 0 rgba(90,200,255,.12),0 0 0 1px rgba(255,255,255,.08),0 8px 24px rgba(0,0,0,.3)}
  #intro .meter{position:absolute;left:50%;bottom:calc(var(--bar) + 10px);width:220px;margin-left:-110px;height:3px;border-radius:3px;background:rgba(255,255,255,.1);z-index:9;overflow:hidden;box-shadow:inset 0 0 0 .5px rgba(255,255,255,.08)}
  #intro .meter i{display:block;height:100%;width:0;background:var(--nova);box-shadow:0 0 10px var(--a);border-radius:3px}
  #intro .credit{position:absolute;left:28px;top:calc(var(--bar) + 24px);z-index:9;font:700 10.5px var(--font);letter-spacing:.32em;text-transform:uppercase;color:rgba(220,226,255,.42)}
  #intro .credit b{color:var(--hi);font-weight:800}
  #intro .credit i{display:inline-block;width:6px;height:6px;margin-right:10px;border-radius:50%;background:#ff4d6d;box-shadow:0 0 8px #ff4d6d;vertical-align:1px;animation:rec 1.4s steps(2) infinite}
  @keyframes rec{50%{opacity:.25}}
  #intro.still .glass,#intro.still .lgl,#intro.still .drop{backdrop-filter:blur(24px) saturate(1.8) !important}
  #intro.still .credit i{animation:none}
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

  let skip = false, still = false, root, cv, cx, raf, W = 0, H = 0, t0 = 0, total = 1, HUE = 228, defs = null, lensN = 0, lensCache = {}, sprite = null, frameN = 0
  const sleep = ms => new Promise(r => { const s = performance.now(); const tick = () => { if (skip || performance.now() - s >= ms) r(); else requestAnimationFrame(tick) }; tick() })
  // every motion goes through here: a lively, toned-down spring curve, or instant when Motion is Off or reduced motion is on
  const anim = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: 'cubic-bezier(.3,1.22,.5,1)', ...o, ...(still ? { duration: 1, delay: 0 } : {}) })
  const tween = (obj, key, to, ms, ease = k => 1 - Math.pow(1 - k, 3)) => new Promise(r => { const from = obj[key], s = performance.now(); const f = () => { const k = still ? 1 : Math.min(1, (performance.now() - s) / ms); obj[key] = from + (to - from) * ease(k); if (k < 1 && !skip) requestAnimationFrame(f); else { obj[key] = to; r() } }; f() })
  const inout = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
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

  // ------------------------------------------------------------ real liquid glass
  // A displacement map: flat in the middle and bending hardest at the rim of a rounded rectangle, or (ball) a round
  // lens that magnifies whatever it passes over. Red and green carry the x and y shift; 128 means no shift.
  function lensMap(w, h, r, edge, ball) {
    const k = Math.min(1, 220 / Math.max(w, h)), cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k))
    const c = document.createElement('canvas'); c.width = cw; c.height = ch
    const g = c.getContext('2d'), im = g.createImageData(cw, ch), R = Math.min(r * k, cw / 2, ch / 2), E = Math.max(1, edge * k), RB = Math.min(cw, ch) / 2
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const px = x + .5 - cw / 2, py = y + .5 - ch / 2, i = (y * cw + x) * 4
      let nx = 0, ny = 0, m = 0
      if (ball) {
        const l = Math.hypot(px, py), rr = l / RB
        if (rr < 1 && l > 0) { nx = px / l; ny = py / l; m = rr * .62 + Math.pow(Math.max(0, rr - .7) / .3, 2) * .38 }
      } else {
        const qx = Math.abs(px) - (cw / 2 - R), qy = Math.abs(py) - (ch / 2 - R)
        let d
        if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = qx / l * Math.sign(px); ny = qy / l * Math.sign(py); d = R - l }
        else if (qx > qy) { nx = Math.sign(px); d = R - qx } else { ny = Math.sign(py); d = R - qy }
        const t = Math.max(0, Math.min(1, 1 - d / E)); m = t * t
      }
      im.data[i] = 128 - nx * m * 127; im.data[i + 1] = 128 - ny * m * 127; im.data[i + 2] = 128; im.data[i + 3] = 255
    }
    g.putImageData(im, 0, 0); return c.toDataURL()
  }
  // put the lens on an element's backdrop: three displacement passes (red bends most, blue least) for the chromatic rim
  function lens(el, o = {}) {
    if (still || !el || !defs || el.dataset.lens) return
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight); if (w < 4 || h < 4) return
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2)
    const S = o.scale ?? Math.min(44, Math.max(14, Math.min(w, h) * .16)), edge = o.edge ?? Math.min(56, Math.max(10, Math.min(w, h) * .32))
    const key = [w, h, Math.round(r), Math.round(S), Math.round(edge), o.ball ? 1 : 0].join('x')
    let id = lensCache[key]
    if (!id) {
      id = lensCache[key] = 'ilens' + (++lensN)
      const pass = (f, n, mtx) => `<feDisplacementMap in="SourceGraphic" in2="m" scale="${(S * f).toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/><feColorMatrix type="matrix" values="${mtx}" result="${n}"/>`
      defs.insertAdjacentHTML('beforeend', `<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${lensMap(w, h, r, edge, o.ball)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/>` +
        pass(1, 'cr', '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0') + pass(.94, 'cg', '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0') + pass(.88, 'cb', '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0') +
        '<feBlend in="cr" in2="cg" mode="screen" result="rg"/><feBlend in="rg" in2="cb" mode="screen"/></filter>')
    }
    el.dataset.lens = id
    el.style.backdropFilter = `url(#${id}) blur(${o.blur ?? 10}px) saturate(${o.sat ?? 1.8})${o.bright ? ` brightness(${o.bright})` : ''}`
  }
  function lensAll(scope) {
    if (still || !scope) return
    for (const el of scope.querySelectorAll('.glassf')) lens(el, { scale: 40, edge: 34, blur: 3, sat: 1.7 })
    for (const el of scope.querySelectorAll('.glass')) lens(el, { blur: 12 })
    for (const el of scope.querySelectorAll('.lgl')) lens(el, { blur: 7, sat: 1.9, bright: 1.04 })
    for (const el of scope.querySelectorAll('.chrome')) lens(el, { scale: 14, edge: 14, blur: 8 })
    for (const el of scope.querySelectorAll('.drop')) lens(el, { ball: true, scale: el.offsetWidth * .55, blur: .4, sat: 1.5, bright: 1.08 })
  }

  // ------------------------------------------------------------ the sky: a nebula, 3D stars, warp tunnel, the orb, ghosts, shockwaves, caustics
  const LOGO = new Image()
  function loadLogo() { let id = 'default'; try { if (typeof settings !== 'undefined' && settings.appIcon) id = settings.appIcon } catch {} const src = `../build/icons/${id}.png`; if (!LOGO.src.endsWith(src.slice(2))) { LOGO.onerror = () => { if (!LOGO.src.endsWith('/default.png')) LOGO.src = '../build/icons/default.png' }; LOGO.src = src } }
  loadLogo()
  const sky = { oy: 0, speed: .4, warp: 0, gather: 0, orb: 0, orbR: 0, ring: 0, shock: [], flash: 0, shake: 0, rays: 0, bokeh: 0, neb: 0, dof: 0, ghosts: 0, caus: 0 }
  const camera = { x: 0, y: 0, px: 0, py: 0, push: 0, roll: 0, lift: 0 }
  let bokeh = [], stars = [], caus = [], nebula = null, dofShown = -1
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
    for (const [h, a0] of [[HUE, 0], [HUE + 40, 2.1], [HUE + 95, 4.2]]) {
      for (let i = 0; i < 170; i++) {
        const k = i / 170, ang = a0 + k * 3.4, rad = 40 + k * 240 + Math.sin(k * 9) * 30
        const x = 320 + Math.cos(ang) * rad + (Math.random() - .5) * 70, y = 320 + Math.sin(ang) * rad * .62 + (Math.random() - .5) * 60
        const r = 18 + Math.random() * 70 * (1 - k * .5), gr = g.createRadialGradient(x, y, 0, x, y, r)
        const al = (.03 + Math.random() * .05) * (1 - k * .6)
        gr.addColorStop(0, `hsla(${h + (Math.random() - .5) * 24},85%,${62 + Math.random() * 16}%,${al})`); gr.addColorStop(1, `hsla(${h},85%,60%,0)`)
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill()
      }
    }
    const core = g.createRadialGradient(320, 320, 0, 320, 320, 120); core.addColorStop(0, `hsla(${HUE + 20},90%,85%,.22)`); core.addColorStop(1, 'hsla(0,0%,100%,0)')
    g.fillStyle = core; g.fillRect(0, 0, 640, 640)
    for (let i = 0; i < 700; i++) { const x = Math.random() * 640, y = 320 + (Math.random() - .5) * 420 * Math.random(); g.fillStyle = `hsla(${HUE + Math.random() * 90},80%,90%,${Math.random() * .5})`; g.fillRect(x, y, Math.random() < .1 ? 1.6 : .9, Math.random() < .1 ? 1.6 : .9) }
    return c
  }
  // one soft dot of accent light, stamped for every caustic particle
  function paintSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 32
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16)
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, `hsla(${HUE + 20},100%,82%,.8)`); gr.addColorStop(1, `hsla(${HUE},100%,70%,0)`)
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c
  }
  function draw() {
    const now = performance.now(), t = now / 1000
    // the camera floats: a slow handheld drift plus a little parallax from the pointer
    if (!still) { camera.x += ((camera.px * 26 + Math.sin(t * .13) * 14 + Math.sin(t * .31) * 4) - camera.x) * .035; camera.y += ((camera.py * 16 + Math.cos(t * .11) * 9) - camera.y) * .035 }
    const cxm = W / 2 - camera.x * .35, cym = H / 2 - camera.y * .35, F = Math.max(W, H) * .55, oyc = H / 2 + sky.oy - camera.y * .5, oxc = W / 2 - camera.x * .5
    cx.globalCompositeOperation = 'source-over'
    cx.fillStyle = sky.warp > .05 ? `rgba(4,5,11,${.55 - sky.warp * .35})` : '#04050b'
    cx.fillRect(0, 0, W, H)
    cx.globalCompositeOperation = 'lighter'
    if (sky.neb > .01 && nebula) {
      const S = Math.max(W, H) * 1.5
      cx.save(); cx.globalAlpha = sky.neb * (1 - sky.warp * .7); cx.translate(W / 2 - camera.x * .15, H / 2 - camera.y * .15); cx.rotate(t * .012 - .3); cx.scale(1 + Math.sin(t * .05) * .04, 1)
      cx.drawImage(nebula, -S / 2, -S / 2, S, S); cx.restore()
    }
    // the warp tunnel: rings of accent light rushing past the lens, split into three colors at the rim
    if (sky.warp > .12) {
      const M = Math.max(W, H)
      for (let i = 0; i < 9; i++) {
        const f = (t * 1.5 + i / 9) % 1, r = f * f * M * .95
        ;[[-3, 330], [0, HUE], [3, HUE + 95]].forEach(([o, h]) => {
          cx.strokeStyle = `hsla(${h},100%,74%,${sky.warp * .16 * (1 - f) * (o ? .6 : 1)})`; cx.lineWidth = 1 + f * 5
          cx.beginPath(); cx.ellipse(cxm + o * f * 4, cym, r, r * .64, 0, 0, 6.283); cx.stroke()
        })
      }
    }
    const v = still ? 0 : .0025 + sky.speed * .004 + sky.warp * .045
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
    if (sky.rays > .01 && sky.orb > .01) {
      const L = Math.max(W, H) * 1.1
      cx.save(); cx.translate(oxc, oyc)
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * 6.283 + t * .05 + Math.sin(t * .3 + i) * .04, w = .04 + (i % 3) * .025
        const g = cx.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L)
        g.addColorStop(0, `hsla(${HUE + (i % 4) * 22},100%,80%,${.13 * sky.rays * sky.orb})`); g.addColorStop(1, `hsla(${HUE},100%,70%,0)`)
        cx.fillStyle = g; cx.beginPath(); cx.moveTo(0, 0); cx.arc(0, 0, L, a - w, a + w); cx.closePath(); cx.fill()
      }
      cx.restore()
    }
    if (sky.orb > .01) {
      const R = sky.orbR * 5
      const g = cx.createRadialGradient(oxc, oyc, 0, oxc, oyc, R)
      g.addColorStop(0, `rgba(240,244,255,${sky.orb})`); g.addColorStop(.18, `hsla(${HUE},100%,75%,${.55 * sky.orb})`); g.addColorStop(1, `hsla(${HUE},100%,60%,0)`)
      cx.fillStyle = g; cx.fillRect(oxc - R, oyc - R, R * 2, R * 2)
      // the star of the show is Lumen's own app icon (the one picked in Settings), lit from behind
      const IS = sky.orbR * 4.6, hasLogo = LOGO.complete && LOGO.naturalWidth > 0
      if (!hasLogo) { cx.fillStyle = `rgba(255,255,255,${sky.orb})`; cx.beginPath(); cx.arc(oxc, oyc, sky.orbR, 0, 6.283); cx.fill() }
      const st = cx.createLinearGradient(0, 0, W, 0), sa = .55 * sky.orb * (.85 + Math.sin(now / 700) * .15)
      st.addColorStop(0, `hsla(${HUE},100%,65%,0)`); st.addColorStop(.5, `hsla(${HUE},100%,86%,${sa})`); st.addColorStop(1, `hsla(${HUE + 40},100%,65%,0)`)
      cx.fillStyle = st; cx.fillRect(0, oyc - 1.2, W, 2.4)
      cx.fillStyle = `hsla(${HUE},100%,75%,${sa * .25})`; cx.fillRect(W * .2, oyc - 5, W * .6, 10)
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
        // a halo in the icon's own rounded-square shape, split into three colours at the rim, breathing slowly
        const k = 1.22 + Math.sin(now / 900) * .03, side = IS * k, rr = side * .23
        ;[['255,90,120', -1.4], ['120,255,190', 0], ['110,150,255', 1.4]].forEach(([c, o]) => {
          cx.strokeStyle = `rgba(${c},${.45 * sky.ring * sky.orb})`; cx.lineWidth = 2
          cx.beginPath(); cx.roundRect(oxc - side / 2 + o, oyc - side / 2, side, side, rr); cx.stroke()
        })
      }
      if (hasLogo) {
        // drawn last, with normal blending, so the icon keeps its real colours in front of the light
        cx.save(); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = sky.orb
        cx.shadowColor = `hsla(${HUE},100%,60%,.7)`; cx.shadowBlur = IS * .35; cx.shadowOffsetY = IS * .06
        cx.drawImage(LOGO, oxc - IS / 2, oyc - IS / 2, IS, IS); cx.restore()
      }
    }
    // caustics: the glass frame focuses light into a shimmering pool on the floor below it, and sparks drift up out of it
    if (sky.caus > .01 && sprite) {
      const fw = Math.min(720, innerWidth * .72) + 28, fh = Math.min(396, innerHeight * .44) + 28
      const px0 = W / 2 - camera.x * .55, py0 = 40 + innerHeight * .44 + fh / 2 + 34 - camera.y * .55
      for (const p of caus) {
        let x, y, a, s
        if (p.up) { const f = (t * p.v + p.p) % 1; x = px0 + p.u * fw * .46 + Math.sin(t * 2 + p.p * 9) * 6; y = py0 - f * fh * .5; a = (1 - f) * .5; s = 3 + p.s * 4 }
        else {
          x = px0 + p.u * fw * .48; y = py0 + p.w * 22
          const c = Math.pow(.5 + .5 * Math.sin(p.u * 11 + t * 1.6 + Math.sin(p.w * 5 - t * 1.1) * 2), 4) * Math.pow(.5 + .5 * Math.cos(p.u * 7 - t * 1.2 + p.w * 3), 2)
          a = c * (1 - Math.abs(p.u) * .7); s = 8 + p.s * 18
        }
        if (a < .02) continue
        cx.globalAlpha = a * sky.caus; cx.drawImage(sprite, x - s / 2, y - s / 2 * (p.up ? 1 : .5), s, p.up ? s : s * .5)
      }
      cx.globalAlpha = 1
    }
    for (const w of sky.shock) {
      w.r += (Math.max(W, H) * 1.1 - w.r) * .045; w.a *= .955
      cx.strokeStyle = `hsla(${HUE},90%,85%,${w.a})`; cx.lineWidth = 2 + w.a * 10
      cx.beginPath(); cx.arc(cxm, cym, w.r, 0, 6.283); cx.stroke()
    }
    sky.shock = sky.shock.filter(w => w.a > .01)
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
    // the glint on every piece of glass follows the pointer, and drifts on its own when the pointer is still
    if (!still && (frameN++ & 1) === 0) { root.style.setProperty('--gx', (50 + camera.px * 80 + Math.sin(t * .37) * 26).toFixed(1) + '%'); root.style.setProperty('--gy', (26 + camera.py * 50 + Math.cos(t * .29) * 14).toFixed(1) + '%') }
    // the rig: stage and nebula drift at their own depth, plus a push-in, a crane, a roll and any camera shake
    const camEl = root.querySelector('.cam'), stage = root.querySelector('.stage'), nebw = root.querySelector('.nebw')
    let sx = 0, sy = 0
    if (sky.shake > .2) { sx = (Math.random() - .5) * sky.shake; sy = (Math.random() - .5) * sky.shake; sky.shake *= .9 }
    camEl.style.transform = sx || sy ? `translate3d(${sx}px,${sy}px,0)` : ''
    // whole pixels for the stage so text stays crisp; the push-in scales the sky behind it, not the words
    const roll = Math.abs(camera.roll) > .01 ? ` rotate(${camera.roll.toFixed(3)}deg)` : ''
    stage.style.transform = `translate3d(${Math.round(-camera.x * .55)}px,${Math.round(-camera.y * .55 + camera.lift)}px,0)${roll}`
    const z = (camera.push ? `scale(${(1 + camera.push * 2.2).toFixed(4)})` : '') + (roll ? ` rotate(${(camera.roll * 1.4).toFixed(3)}deg) translateY(${(camera.lift * .6).toFixed(1)}px)` : camera.lift ? ` translateY(${(camera.lift * .6).toFixed(1)}px)` : '')
    if (cv.style.transform !== z) cv.style.transform = z
    nebw.style.transform = `translate3d(${(-camera.x * .2).toFixed(1)}px,${(-camera.y * .2 + camera.lift * .3).toFixed(1)}px,0) scale(${(1 + camera.push * 1.5).toFixed(4)})`
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
  function leak(strength = .7, dir = 1, ms = 1700) {
    if (still || skip) return
    root.querySelector('.leak').animate([{ opacity: 0, transform: `translateX(${-30 * dir}%) scale(1.1)` }, { opacity: strength, offset: .4 }, { opacity: 0, transform: `translateX(${30 * dir}%) scale(1)` }], { duration: ms, easing: 'cubic-bezier(.4,0,.3,1)' })
  }
  // rack focus: the sky softens behind the subject, or comes sharp while the subject goes soft
  const focus = (px, ms = 700) => tween(sky, 'dof', px, ms, inout)
  const push = (to, ms) => tween(camera, 'push', to, ms, inout)
  // a crane and roll: the camera settles from below with a slight Dutch angle
  const crane = (lift, roll, ms) => { camera.lift = still ? 0 : lift; camera.roll = still ? 0 : roll; tween(camera, 'lift', 0, ms, inout); return tween(camera, 'roll', 0, ms * 1.1, inout) }
  function boom() { if (!still) { sky.flash = .35; sky.shake = 6; sky.shock.push({ r: 10, a: .9 }); setTimeout(() => sky.shock.push({ r: 10, a: .5 }), 140) } flare(1); leak(.8, 1, 2200); if (!skip) SFX.impact() }
  function scene(html, cls = '') { const s = document.createElement('div'); s.className = 'scene ' + cls; s.innerHTML = html; root.querySelector('.stage').appendChild(s); return s }
  async function leave(s, ms = 700) {
    anim(s, [{ opacity: 1, filter: 'blur(0)', transform: 'scale(1)' }, { opacity: 0, filter: 'blur(14px)', transform: 'scale(1.06)' }], { duration: ms, easing: 'cubic-bezier(.5,0,.7,.4)' })
    await sleep(ms); s.remove()
  }
  // a glass droplet rolls across a line of type, magnifying it as it passes
  function roll(drop, { x0, x1, y, ms, bob = 10, delay = 0 }) {
    if (still || skip || !drop) return
    const D = drop.offsetWidth, frames = []
    for (let i = 0; i <= 12; i++) { const k = i / 12; frames.push({ transform: `translate(${(x0 + (x1 - x0) * k - D / 2).toFixed(1)}px,${(y - D / 2 + Math.sin(k * Math.PI * 2) * bob).toFixed(1)}px) scale(${(.9 + Math.sin(k * Math.PI) * .12).toFixed(3)})`, opacity: k < .08 ? k / .08 : k > .92 ? (1 - k) / .08 : 1 }) }
    drop.animate(frames, { duration: ms, delay, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' })
  }

  // ------------------------------------------------------------ the acts
  // the title sequence: the iris opens, three phrases rack into focus out of the deep, and a glass droplet rolls across them
  async function coldOpen() {
    const ph = ['Every <em>page.</em>', 'Every <em>tab.</em>', 'Every <em>day.</em>']
    const s = scene(`<div class="title"><div class="pre">Shot through real glass</div>${ph.map(t => `<div class="ph">${t}</div>`).join('')}<i class="fil"></i><div class="slate">Lumen ${WHATS_NEW.version}   Scene 1   Take 1</div><i class="drop"></i></div>`)
    const els = s.querySelectorAll('.ph'), drop = s.querySelector('.drop'), D = Math.round(Math.min(200, innerHeight * .24))
    drop.style.width = drop.style.height = D + 'px'; lensAll(s)
    roll(drop, { x0: innerWidth * .22, x1: innerWidth * .8, y: innerHeight / 2 - 4, ms: 3000, delay: 250 })
    anim(s.querySelector('.pre'), [{ opacity: 0, letterSpacing: '1em' }, { opacity: 1, letterSpacing: '.5em' }], { duration: 1600, easing: 'cubic-bezier(.16,1,.3,1)' })
    anim(s.querySelector('.slate'), [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, delay: 300 })
    anim(s.querySelector('.fil'), [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: 2600, easing: 'cubic-bezier(.16,1,.3,1)' })
    sky.speed = .15; tween(sky, 'neb', .35, 2600); crane(26, -1.4, 3200)
    for (let i = 0; i < els.length && !skip; i++) {
      anim(els[i], [{ opacity: 0, filter: 'blur(16px)', transform: 'translateZ(260px) scale(1.12)', textShadow: '-8px 0 rgba(255,60,120,.6), 8px 0 rgba(60,170,255,.6)' },
        { opacity: 1, filter: 'blur(0)', transform: 'none', textShadow: '0 0 transparent, 0 0 transparent' }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' })
      if (i > 0) anim(els[i - 1], [{ opacity: 1, filter: 'blur(0)', transform: 'none' }, { opacity: 0, filter: 'blur(10px)', transform: 'translateZ(-300px) scale(.86)' }], { duration: 700, easing: 'cubic-bezier(.5,0,.3,1)' })
      if (!skip) SFX.note(i)
      await sleep(i === els.length - 1 ? 1100 : 820)
    }
    anim(s.querySelector('.fil'), [{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(0)', opacity: .9 }], { duration: 500, easing: 'cubic-bezier(.6,0,.4,1)' })
    await leave(s, 500)
  }
  async function warp() {
    sky.oy = 0
    if (!skip) SFX.riser(2.6)
    tween(sky, 'neb', .2, 900)
    tween(sky, 'warp', 1, 2200, k => k * k)
    push(.02, 2200)
    await sleep(2300)
    sky.gather = 1
    tween(sky, 'warp', 0, 500); push(0, 500)
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
    const L = 'Lumen'.split('').map(c => `<span>${c}</span>`).join('')
    const s = scene(`<div style="text-align:center;position:relative"><div class="kicker chrome">${short ? 'Fresh from an update' : 'Introducing'}</div><div class="logo">${L}<i class="glint" aria-hidden="true">Lumen</i><div class="mirror" aria-hidden="true">${L}</div><i class="drop"></i></div><div class="rule"></div><div class="tag"></div></div>`)
    const logo = s.querySelector('.logo'), drop = logo.querySelector('.drop'), D = Math.round(logo.offsetHeight * 1.3)
    drop.style.width = drop.style.height = D + 'px'; lensAll(s)
    tween(sky, 'orbR', 18, 1400); tween(sky, 'oy', -Math.min(H * .26, 220), 1800, k => 1 - Math.pow(1 - k, 4))
    push(.035, short ? 3000 : 4300)   // a slow dolly in on the title
    crane(60, 2.2, short ? 2600 : 3400)   // while the camera cranes down and levels out
    anim(s.querySelector('.kicker'), [{ opacity: 0, letterSpacing: '1.1em' }, { opacity: 1, letterSpacing: '.46em' }], { duration: 1800, delay: 300, easing: 'cubic-bezier(.16,1,.3,1)' })
    logo.querySelectorAll(':scope > span').forEach((l, i) => anim(l, [
      { opacity: 0, transform: `translate3d(${(i - 2) * 90}px, ${(i % 2 ? -1 : 1) * 40}px, 600px) rotateY(${(i - 2) * 25}deg) scale(1.6)`, filter: 'blur(18px) drop-shadow(-16px 0 0 rgba(255,70,130,.85)) drop-shadow(16px 0 0 rgba(70,200,255,.85))' },
      { opacity: 1, filter: 'blur(2px) drop-shadow(-5px 0 0 rgba(255,70,130,.5)) drop-shadow(5px 0 0 rgba(70,200,255,.5))', offset: .55 },
      { opacity: 1, transform: 'none', filter: 'blur(0) drop-shadow(0 0 0 rgba(255,70,130,0)) drop-shadow(0 0 0 rgba(70,200,255,0))' }], { duration: 1500, delay: 80 + i * 90, easing: 'cubic-bezier(.16,1,.3,1)' }))
    anim(logo.querySelector('.mirror'), [{ opacity: 0 }, { opacity: .14 }], { duration: 1600, delay: 900 })
    anim(logo, [{ letterSpacing: '.18em' }, { letterSpacing: '-.05em' }], { duration: 2400, easing: 'cubic-bezier(.16,1,.3,1)' })
    anim(s.querySelector('.rule'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1600, delay: 1100, easing: 'cubic-bezier(.16,1,.3,1)' })
    // a glass lens sweeps across the finished logo, bending each letter as it passes, then the glint follows
    const lw = logo.offsetWidth
    roll(drop, { x0: -D * .2, x1: lw + D * .2, y: logo.offsetHeight / 2, ms: 1700, bob: 6, delay: 1250 })
    setTimeout(() => { if (skip || still) return; SFX.glass(3) }, 1300)
    setTimeout(() => { if (skip || still) return; logo.querySelector('.glint').animate([{ opacity: 1, backgroundPosition: '120% 0' }, { opacity: 1, backgroundPosition: '-20% 0', offset: .92 }, { opacity: 0, backgroundPosition: '-20% 0' }], { duration: 1500, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }); SFX.shimmer() }, 2600)
    words(s.querySelector('.tag'), short ? 'Lit in your color. Made of glass.' : "Chrome's engine. A lighter feel.", 1500, 90)
    await sleep(short ? 2700 : 3800)
    // push through the title: it rushes past the lens while the stars surge
    tween(sky, 'orb', 0, 900); tween(sky, 'ring', 0, 700); tween(sky, 'rays', 0, 900); tween(sky, 'ghosts', 0, 700)
    tween(sky, 'speed', 1.6, 300).then(() => tween(sky, 'speed', .25, 900))
    anim(s, [{ opacity: 1, filter: 'blur(0)', transform: 'translateZ(0)' }, { opacity: 0, filter: 'blur(12px)', transform: 'translateZ(520px)' }], { duration: 700, easing: 'cubic-bezier(.55,0,.75,.3)' })
    push(0, 700)
    if (!skip) SFX.whoosh()
    await sleep(700); s.remove()
  }

  // ------------------------------------------------------------ the tour: every feature shown doing its thing
  const TABC = ['#24292f', 'var(--a)', '#ff8a3d', '#2fb67c']
  const CHROME = (tabs, ub = '') => `<div class="tb"><div class="lt"><i></i><i></i><i></i></div>${tabs.map((t, i) => `<div class="t${i === 0 ? ' on' : ''}"><b style="background:${TABC[i % 4]}"></b>${t}</div>`).join('')}</div><div class="ub">${ICONS.lock || ''}<span>lumen.app</span>${ub}</div>`
  const MW = (inner, tabs = ['GitHub', 'Lisbon trip', 'Recipes'], ub = '') => `<div class="mw">${CHROME(tabs, ub)}${inner}</div>`
  const LINES = (n, img) => '<div class="h"></div>' + Array.from({ length: n }, (_, i) => (img && i === 2 ? '<div class="img"></div>' : '') + `<div class="ln" style="width:${[92, 80, 96, 70, 88, 60, 84][i % 7]}%"></div>`).join('')
  const done = a => { try { a.cancel() } catch {} }
  const TOUR = [
    { title: 'Tabs, right where you expect them.', text: 'Press <kbd>Cmd T</kbd> for a new tab. Drag tabs to reorder, and they spring into place.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div>`, ['GitHub']), play: async s => {
      const tb = s.querySelector('.tb')
      for (const [i, t] of ['Lisbon trip', 'Recipes', 'New Tab'].entries()) { await sleep(380); const el = document.createElement('div'); el.className = 't'; el.innerHTML = `<b style="background:${TABC[(i + 1) % 4]}"></b>${t}`; tb.appendChild(el); anim(el, [{ opacity: 0, transform: 'translateY(-10px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 700 }); if (!skip) SFX.pop(1 + i * .12) }
      await sleep(420); let ts = tb.querySelectorAll('.t'); ts.forEach(t => t.classList.remove('on')); ts[1].classList.add('on'); anim(ts[1], [{ transform: 'scale(.92)' }, { transform: 'none' }], { duration: 600 }); if (!skip) SFX.key()
      // drag Lisbon trip past Recipes: it lifts, glides over, and Recipes springs out of the way
      await sleep(500); if (skip) return
      const step = ts[2].offsetLeft - ts[1].offsetLeft
      const a1 = anim(ts[1], [{ transform: 'none', boxShadow: '0 0 0 0 transparent' }, { transform: 'translateY(-3px) scale(1.06) rotate(-2deg)', offset: .25 }, { transform: `translate(${step}px,-3px) scale(1.06) rotate(1deg)`, offset: .8 }, { transform: `translate(${step}px,0)` }], { duration: 1000, easing: 'cubic-bezier(.4,0,.2,1)' })
      const a2 = anim(ts[2], [{ transform: 'none' }, { transform: 'none', offset: .45 }, { transform: `translateX(${-step}px)` }], { duration: 1000 })
      if (!skip) SFX.whoosh()
      await sleep(1020); done(a1); done(a2); tb.insertBefore(ts[2], ts[1]); if (!skip) SFX.pop(1.2)
    } },
    { title: 'One bar does everything.', text: '<kbd>Cmd K</kbd> searches the web, finds open tabs and history, converts units and runs any action.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div><div class="cmdp lgl"><div class="in">${ICONS.search || ''}<span class="q"></span><span class="caret"></span></div><div class="r sel">Search for <b class="qq" style="margin-left:4px"></b><em>Search</em></div><div class="r">Lisbon trip<em>Switch to tab</em></div><div class="r">Flights to Lisbon, last week<em>History</em></div><div class="r">Focus mode<em>Shift Cmd F</em></div></div>`), play: async s => {
      const q = 'flights to lisbon', qe = s.querySelector('.q'), qq = s.querySelector('.qq'), rs = s.querySelectorAll('.cmdp .r')
      anim(s.querySelector('.cmdp'), [{ opacity: 0, transform: 'translateY(-10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 700 })
      for (let i = 1; i <= q.length && !skip; i++) { qe.textContent = qq.textContent = q.slice(0, i); SFX.key(); await sleep(52) }
      rs.forEach((r, i) => anim(r, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 550, delay: i * 60 }))
      if (!skip) SFX.shimmer()
      for (const j of [1, 2, 1]) { await sleep(380); if (skip) return; rs.forEach((r, k) => r.classList.toggle('sel', k === j)); SFX.tick(j) }
      await sleep(300); anim(s.querySelector('.cmdp'), [{ transform: 'scale(1)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }], { duration: 450 }); if (!skip) SFX.key()
    } },
    { title: 'Ads and trackers, gone.', text: 'Blocked before they load, on every site. Pages get faster and nobody follows you around.', build: () => MW(`<div class="pg">${LINES(6)}<div class="ad" style="left:58%;top:18px;width:150px;height:70px">AD</div><div class="ad" style="left:6%;top:120px;width:200px;height:46px">AD</div><div class="ad" style="left:52%;top:150px;width:120px;height:90px">AD</div><span class="cnt">0 blocked</span></div>`, undefined, `<span class="sh">${ICONS.shield || ''}<i>0</i></span>`), play: async s => {
      const ads = s.querySelectorAll('.ad'), c = s.querySelector('.cnt'), sh = s.querySelector('.sh i'); let n = 0
      for (const a of ads) {
        await sleep(480); anim(a, [{ transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }, { transform: 'scale(1.12)', opacity: 1, offset: .3 }, { transform: 'scale(0) rotate(12deg)', opacity: 0, filter: 'blur(6px)' }], { duration: 600 }); if (!skip) SFX.pop(.8 + n * .02)
        n += 8; c.textContent = n + ' blocked'; sh.textContent = n; anim(c, [{ transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 500 }); anim(s.querySelector('.sh'), [{ transform: 'scale(1.18)' }, { transform: 'none' }], { duration: 500 })
      }
      await sleep(300); anim(s.querySelector('.pg'), [{ transform: 'translateY(6px)', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 700 })
    } },
    { title: 'Ask Lumen AI about any page.', text: 'Open the side panel for a summary, key points or an explanation of what you selected.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div><div class="side lgl"><div class="ah"><i></i>Lumen AI</div><p class="ai"></p><div class="kp"><span>Train is cheapest</span><span>Flight is fastest</span><span>Book 2 weeks ahead</span></div></div>`), play: async s => {
      anim(s.querySelector('.side'), [{ transform: 'translateX(112%)' }, { transform: 'none' }], { duration: 850 }); if (!skip) SFX.whoosh()
      await sleep(600); const p = s.querySelector('.ai'), txt = 'This page compares three ways to get to Lisbon. The train is cheapest and the flight is fastest.'
      for (const w of txt.split(' ')) { if (skip) break; p.textContent += w + ' '; await sleep(42) }
      s.querySelectorAll('.kp span').forEach((k, i) => { anim(k, [{ opacity: 0, transform: 'translateY(8px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: i * 110 }); setTimeout(() => !skip && SFX.pop(1.1 + i * .1), i * 110) })
      await sleep(500)
    } },
    { title: 'Translate the whole page.', text: 'Any language into yours in a moment. Arabic and Hebrew even flip from right-to-left.', build: () => MW(`<div class="pg"><div class="tr" dir="rtl" style="text-align:right">مرحبا بكم في لشبونة. المدينة جميلة في الربيع، والقطارات سريعة ومريحة.</div><br>${LINES(4)}<i class="scan"></i></div><div class="pill lgl">${ICONS.translate || ''}<span>Translate from Arabic</span></div>`), play: async s => {
      const pill = s.querySelector('.pill'), tr = s.querySelector('.tr')
      anim(pill, [{ opacity: 0, transform: 'translateY(-8px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 700 }); if (!skip) SFX.pop(1.2)
      await sleep(700); anim(pill, [{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 400 }); if (!skip) SFX.key()
      anim(s.querySelector('.scan'), [{ opacity: 1, transform: 'translateY(-46px)' }, { opacity: 1, transform: 'translateY(220px)', offset: .9 }, { opacity: 0, transform: 'translateY(240px)' }], { duration: 1100, easing: 'cubic-bezier(.4,0,.3,1)' })
      await sleep(380); if (skip) return
      tr.dir = 'ltr'; tr.style.textAlign = 'left'; tr.textContent = 'Welcome to Lisbon. The city is beautiful in spring, and the trains are fast and comfortable.'
      anim(tr, [{ transform: 'translateX(30px)', filter: 'blur(6px)', opacity: .3 }, { transform: 'none', filter: 'blur(0)', opacity: 1 }], { duration: 700 }); if (!skip) SFX.shimmer()
      await sleep(500); pill.querySelector('span').textContent = 'Translated to English'; anim(pill, [{ transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 500 })
    } },
    { title: 'Dark mode for every website.', text: 'One switch turns light sites dark, and sites that are already dark are left alone.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div><div class="reveal">${CHROME(['GitHub', 'Lisbon trip', 'Recipes'], `<span class="sh">${ICONS.moon || ''}Dark</span>`)}<div class="pg">${LINES(6, 1)}</div></div>`, undefined, `<span class="sh">${ICONS.moon || ''}Dark</span>`), play: async s => {
      await sleep(700); const sh = s.querySelector('.ub .sh'); anim(sh, [{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 400 }); if (!skip) SFX.key()
      // the dark theme pours out of the switch in a widening circle
      anim(s.querySelector('.reveal'), [{ clipPath: 'circle(0% at 90% 16%)' }, { clipPath: 'circle(140% at 90% 16%)' }], { duration: 1300, easing: 'cubic-bezier(.5,0,.2,1)' }); if (!skip) SFX.whoosh()
      await sleep(1300)
    } },
    { title: 'Two pages, side by side.', text: '<kbd>Shift Cmd \\</kbd> opens split view. Reader mode, picture in picture and screenshots are one shortcut away too.', build: () => MW(`<div class="split"><div class="pp">${LINES(5, 1)}</div><i class="dv"></i><div class="pp">${LINES(5)}</div></div>`), play: async s => {
      const ps = s.querySelectorAll('.pp'); anim(ps[0], [{ transform: 'translateX(50%)' }, { transform: 'none' }], { duration: 900 }); anim(ps[1], [{ transform: 'translateX(-50%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900 }); if (!skip) SFX.whoosh()
      anim(s.querySelector('.dv'), [{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 500 })
      await sleep(1100); if (skip) return
      anim(ps[0], [{ flexGrow: 1 }, { flexGrow: 1.7, offset: .55 }, { flexGrow: 1.3 }], { duration: 1300, easing: 'cubic-bezier(.4,0,.2,1)' }); if (!skip) SFX.tick(4)
      await sleep(1000)
    } },
    { title: 'A New Tab clock in your style.', text: 'Pick a clock style for the New Tab page. Big digits, a classic face or a glowing ring, all in your color.', build: () => MW(`<div class="ntp"><div class="ck dig">9:41<small>Tuesday</small></div><div class="ck ana"><i class="hh"></i><i class="m"></i><i class="s"></i><b></b></div><div class="ck ring"></div><div class="ckt">9:41</div><div class="sty lgl"><span class="on">Digits</span><span>Classic</span><span>Ring</span></div></div>`, ['New Tab', 'Lisbon trip']), play: async s => {
      const cks = s.querySelectorAll('.ck'), sty = s.querySelectorAll('.sty span'), ckt = s.querySelector('.ckt')
      const show = el => anim(el, [{ opacity: 0, transform: 'scale(.8)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 850 })
      const hide = el => anim(el, [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(1.1)', filter: 'blur(10px)' }], { duration: 450, easing: 'cubic-bezier(.5,0,.7,.4)' })
      show(cks[0]); if (!skip) SFX.shimmer()
      anim(s.querySelector('.ck.ana .s'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 6000, iterations: Infinity, easing: 'linear' })
      for (let i = 1; i < 3; i++) {
        await sleep(1050); if (skip) return
        sty.forEach((x, j) => x.classList.toggle('on', j === i)); hide(cks[i - 1]); show(cks[i]); if (!skip) SFX.tick(i * 2)
        if (i === 2) show(ckt)
      }
      await sleep(400)
    } },
    { title: 'Surge, built in.', text: 'Your Mac lights up when it charges. Keys and clicks get sounds, clicks get ripples, and there is a new Dock, a focus timer and more.', build: () => `<div class="desk"><div class="menubar"><span>${appLogo('surge', 'mb')}Surge</span><span class="pc">41%</span><span>9:41</span></div><div class="edge"></div><div class="chg chrome"><i></i><span class="cp">Charging  41%</span></div><div class="keys">${'LUMEN'.split('').map(k => `<b>${k}</b>`).join('')}</div></div>`, play: async s => {
      const d = s.querySelector('.desk'); await sleep(300); d.classList.add('lit'); if (!skip) SFX.shimmer()
      const o = { v: 41 }; const cp = s.querySelector('.cp'), pc = s.querySelector('.pc'); tween(o, 'v', 72, 1800); const iv = setInterval(() => { const n = Math.round(o.v) + '%'; cp.textContent = 'Charging  ' + n; pc.textContent = n; if (o.v >= 72 || skip) clearInterval(iv) }, 60)
      for (const k of s.querySelectorAll('.keys b')) { await sleep(170); k.classList.add('dn'); if (!skip) SFX.key(); setTimeout(() => k.classList.remove('dn'), 130) }
      for (const [x, y] of [[30, 45], [70, 38], [52, 70]]) { const r = document.createElement('i'); r.className = 'rip'; r.style.left = x + '%'; r.style.top = y + '%'; d.appendChild(r); anim(r, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(4)', opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.2,.8,.3,1)' }); if (!skip) SFX.pop(1.1); await sleep(260) }
    } },
    { title: 'Koi, one key away.', text: 'Press <kbd>Option Space</kbd> and your apps bloom around the cursor in a springy fan. Type a letter or click to open one.', build: () => `<div class="desk"><div class="menubar"><span>${appLogo('koi', 'mb')}Koi</span><span>9:41</span></div><div class="fan"><i class="hub"></i></div><div class="cur"></div></div>`, play: async s => {
      const fan = s.querySelector('.fan'), cur = s.querySelector('.cur'), apps = [['#ff5f57', 'M'], ['#febc2e', 'N'], ['#28c840', 'F'], ['var(--a)', 'S'], ['#8a63f2', 'C'], ['#e9609c', 'P'], ['#20c997', 'T']]
      anim(cur, [{ transform: 'translate(-180px,-60px)' }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.3,1.1,.5,1)' }); await sleep(600)
      anim(fan.querySelector('.hub'), [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'none' }], { duration: 900 })
      const pos = []
      apps.forEach(([c, l], i) => {
        const el = document.createElement('i'); el.style.background = `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 65%, #000))`; el.textContent = l; fan.appendChild(el)
        const a = (-160 + i * (140 / (apps.length - 1))) * Math.PI / 180, R = 120; pos.push([Math.cos(a) * R, Math.sin(a) * R])
        anim(el, [{ opacity: 0, transform: 'translate(0,0) scale(.3) rotate(-30deg)' }, { opacity: 1, transform: `translate(${pos[i][0]}px, ${pos[i][1]}px) scale(1)` }], { duration: 900, delay: 100 + i * 50, easing: 'cubic-bezier(.3,1.4,.5,1)' })
        setTimeout(() => !skip && SFX.pop(.9 + i * .07), 100 + i * 50)
      })
      await sleep(1200); if (skip) return
      anim(cur, [{ transform: 'none' }, { transform: `translate(${pos[3][0] + 8}px,${pos[3][1] + 8}px)` }], { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)' })
      await sleep(620); const pick = fan.querySelectorAll(':scope > i:not(.hub)')[3]; anim(pick, [{ scale: 1 }, { scale: 1.3 }, { scale: 1.18 }], { duration: 500, composite: 'add' }); anim(pick, [{ boxShadow: '0 0 0 0 transparent' }, { boxShadow: '0 0 0 4px rgba(255,255,255,.7), 0 0 30px var(--a)' }], { duration: 500 }); if (!skip) SFX.ding()
    } },
    { title: 'Every parcel, until it arrives.', text: 'Track any delivery, and the orders you place are saved. One click takes you straight back to your order.', build: () => MW(`<div class="pg" style="background:#f4f5fa"><div class="plist">${LINES(6)}</div><div class="pcard lgl"><div class="k">${ICONS.box || ''}</div><div style="flex:1"><b>New headphones</b><span class="st">Order placed  ·  UPS</span><div class="steps"><s class="on"></s><s></s><s></s><s></s><u></u></div></div></div></div>`), play: async s => {
      const st = s.querySelector('.st'), steps = s.querySelectorAll('.steps s'), k = s.querySelector('.pcard .k'), u = s.querySelector('.steps u')
      anim(s.querySelector('.pcard'), [{ opacity: 0, transform: 'translateY(16px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 800 })
      for (const [i, t] of ['On the way', 'Out for delivery', 'Delivered'].entries()) { await sleep(600); steps[i + 1].classList.add('on'); u.style.left = ((i + 1) / 3 * 100) + '%'; st.textContent = t + '  ·  UPS'; if (!skip) SFX.tick(i * 2) }
      k.style.background = 'linear-gradient(135deg,#34c759,#30b04f)'; anim(s.querySelector('.pcard'), [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 600 }); if (!skip) SFX.ding()
    } },
  ]
  // where each shot sits: the camera orbits a little between them, so every shot arrives from a new angle
  const POSE = i => ({ x: (i % 2 ? -1 : 1) * 46, ry: (i % 2 ? 1 : -1) * 30, rx: [8, 4, 10, 5][i % 4] })
  const REST = 'translate(0,-6vh)'
  const ART = ['tabs', 'search', 'shield', 'sparkle', 'translate', 'moon', 'split', 'clock', 'bolt', 'layers', 'box']
  async function tour() {
    tween(sky, 'bokeh', .45, 1800); tween(sky, 'neb', .7, 1800); focus(2.5, 1400); tween(sky, 'caus', 1, 2200)
    const cap = document.createElement('div'); cap.className = 'tourcap'
    cap.innerHTML = `<span class="n"><span class="num"></span><span class="dots">${TOUR.map(() => '<i></i>').join('')}</span></span><h2></h2><p></p>`; root.appendChild(cap)
    const dots = cap.querySelectorAll('.dots i')
    let prev = null
    for (let i = 0; i < TOUR.length && !skip; i++) {
      const f = TOUR[i], p = POSE(i), s = scene(`<i class="halo"></i><div class="art ${i % 2 ? 'l' : 'r'}">${ICONS[ART[i]] || ''}</div><div class="rig"><div class="glass glassf">${f.build()}<i class="glare"></i></div></div>`, 'flat')
      const rig = s.querySelector('.rig'), frame = s.querySelector('.glassf')
      lensAll(s)
      anim(s.querySelector('.halo'), [{ opacity: 0, transform: 'scale(.7)' }, { opacity: .55, transform: 'none' }], { duration: 1400, easing: 'cubic-bezier(.16,1,.3,1)' })
      anim(s.querySelector('.art'), [{ opacity: 0, transform: `rotate(${i % 2 ? 24 : -24}deg) scale(1.25)` }, { opacity: .1, transform: `rotate(${i % 2 ? 12 : -12}deg) scale(1)` }], { duration: 2200, easing: 'cubic-bezier(.16,1,.3,1)' })
      // the outgoing shot swings away out of focus while this one swings in from the other side and racks sharp
      if (prev) {
        const o = prev, op = POSE(i - 1), orig = o.querySelector('.rig')
        orig.getAnimations().forEach(done)
        anim(orig, [{ opacity: 1, filter: 'blur(0)', transform: `translate3d(0,-6vh,0) rotateY(0deg) rotateX(0deg)` }, { opacity: 0, filter: 'blur(12px)', transform: `translate3d(${-op.x}vw,-4vh,-380px) rotateY(${-op.ry}deg) rotateX(${op.rx}deg)` }], { duration: 950, easing: 'cubic-bezier(.55,0,.4,1)' })
        setTimeout(() => o.remove(), still ? 0 : 1000)
        focus(0, 450).then(() => !skip && focus(2.5, 900))
        leak(.45, i % 2 ? -1 : 1, 1500)
        if (!skip) SFX.glass(i)
      } else if (!skip) SFX.whoosh()
      const enter = anim(rig, [{ opacity: 0, filter: 'blur(14px)', transform: `translate3d(${p.x}vw,-2vh,-420px) rotateY(${p.ry}deg) rotateX(${p.rx}deg)` },
        { opacity: 1, filter: 'blur(1px)', offset: .7 },
        { opacity: 1, filter: 'blur(0)', transform: `translate3d(0,-6vh,0) rotateY(0deg) rotateX(0deg)` }], { duration: prev ? 1150 : 1200, delay: prev ? 120 : 0, easing: 'cubic-bezier(.2,1.02,.3,1)' })
      // once it lands the frame is flat glass again, so the lens can bend the sky behind it, and a light passes over it
      enter.finished.then(() => { if (!rig.isConnected) return; rig.style.transform = REST; done(enter); frame.classList.add('pass') }).catch(() => {})
      cap.querySelector('.num').textContent = String(i + 1).padStart(2, '0') + '  /  ' + String(TOUR.length).padStart(2, '0')
      dots.forEach((d, j) => { d.className = j === i ? 'on' : j < i ? 'past' : '' })
      words(cap.querySelector('h2'), f.title, 120, 45)
      cap.querySelector('p').innerHTML = f.text; anim(cap.querySelector('p'), [{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 900, delay: 320 })
      await sleep(750)
      await f.play(s)
      await sleep(1400)
      prev = s
    }
    tween(sky, 'caus', 0, 800)
    if (prev) { focus(0, 500); await leave(prev, skip ? 1 : 600) }
    anim(cap, [{ opacity: 1 }, { opacity: 0 }], { duration: skip ? 1 : 400 }); setTimeout(() => cap.remove(), skip ? 0 : 420)
  }
  async function whatsNew(version) {
    const items = WHATS_NEW.items
    tween(sky, 'bokeh', .6, 1600); focus(2, 1200); leak(.6, -1, 2000)
    const s = scene(`<div class="new"><span class="eyebrow chrome">New in Lumen ${version || WHATS_NEW.version}</span><h1>Fresh this version.</h1><div class="grid">${items.map((it, i) => `<div class="it glass sweep" style="--sd:${1.5 + i * .08}s"><div class="hd"><div class="k">${ICONS[it.icon] || ''}</div><span class="no2">${String(i + 1).padStart(2, '0')}</span></div><span>${it.text}</span></div>`).join('')}</div></div>`, 'flat')
    lensAll(s)
    anim(s.querySelector('.eyebrow'), [{ opacity: 0, transform: 'translateY(-10px)', letterSpacing: '.6em' }, { opacity: 1, transform: 'none', letterSpacing: '.24em' }], { duration: 1200 })
    anim(s.querySelector('h1'), [{ opacity: 0, filter: 'blur(16px)', transform: 'scale(1.1)' }, { opacity: 1, filter: 'none', transform: 'none' }], { duration: 1300, delay: 150, easing: 'cubic-bezier(.16,1,.3,1)' })
    s.querySelectorAll('.it').forEach((el, i) => {
      const fromX = (i % 4 - 1.5) * 50
      anim(el, [{ opacity: 0, transform: `translate(${fromX}px,40px) scale(.9)`, filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 1100, delay: 550 + i * 80 })
      setTimeout(() => !skip && SFX.pop(1 + i * .06), 550 + i * 80)
    })
    const hold = 1400 + items.length * 80 + 3600
    push(.03, hold + 600)
    setTimeout(() => { if (!skip && !still) { s.querySelector('h1').classList.add('shine'); SFX.shimmer() } }, 1500)
    await sleep(hold)
    tween(sky, 'bokeh', 0, 900); push(0, 800)
    await leave(s, 800)
  }
  async function finale({ short = false, ask = !short } = {}) {
    if (!skip) SFX.chord()
    // the letterbox opens up to the full frame, the camera cranes up, the orb rises above the title and the sky racks back into focus
    root.classList.add('wide'); focus(0, 1200); push(0, 600); crane(50, -1, 2000)
    sky.orbR = 0; sky.oy = -Math.min(H * .3, 250); tween(sky, 'orb', .8, 1200); tween(sky, 'orbR', 14, 1200); tween(sky, 'ring', 1, 1600); tween(sky, 'rays', .7, 2000); tween(sky, 'bokeh', .5, 2000); tween(sky, 'ghosts', .7, 2000); tween(sky, 'neb', .9, 2000)
    flare(.6); leak(.5, 1, 2200)
    const s = scene(`<div class="fin" style="margin-top:4vh"><div class="logo">${short ? 'You are up to date.' : 'Welcome to Lumen.'}<i class="drop"></i></div>
      ${!ask ? '' : `<div class="ask glass sweep" style="--sd:1.6s"><div class="k">${ICONS.box || ''}</div><div><b>Keep track of your orders?</b><span>When you place an order on any shop, Lumen saves it to Parcels. One click takes you straight back to the order, and it stays there until it is delivered. Change it any time in Settings.</span></div></div>`}
      <div class="btns">${!ask ? '<button class="go">Continue</button>' : '<button class="no chrome">Not now</button><button class="go">Yes, save my orders</button>'}</div></div>`, 'flat')
    s.classList.add('live')
    const logo = s.querySelector('.logo'), drop = logo.querySelector('.drop'), D = Math.round(logo.offsetHeight * 1.25)
    drop.style.width = drop.style.height = D + 'px'
    lensAll(s)
    roll(drop, { x0: -D * .3, x1: logo.offsetWidth + D * .3, y: logo.offsetHeight / 2, ms: 1900, bob: 5, delay: 900 })
    // the question is the one thing you cannot skip: answer it, or decide later with Escape
    for (const el of root.querySelectorAll('.skip:not(.mute), .meter')) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).onfinish = () => { el.style.pointerEvents = 'none' }
    anim(logo, [{ opacity: 0, filter: 'blur(14px)', transform: 'translateY(24px) scale(1.06)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 1300, easing: 'cubic-bezier(.16,1,.3,1)' })
    if (s.querySelector('.ask')) anim(s.querySelector('.ask'), [{ opacity: 0, transform: 'translateY(30px) scale(.96)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 1100, delay: 450 })
    anim(s.querySelector('.btns'), [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: short ? 500 : 800 })
    return new Promise(r => {
      const fin = v => { removeEventListener('keydown', k); r(v) }
      s.querySelector('.go').onclick = () => fin(true)
      const no = s.querySelector('.no'); if (no) no.onclick = () => fin(false)
      root.querySelector('.skip').onclick = () => fin(undefined)
      const k = e => { if (e.key === 'Enter') fin(true); else if (e.key === 'Escape') fin(undefined) }
      addEventListener('keydown', k)
    })
  }
  // anything still on stage after a skip leaves quickly before the finale comes in
  function clearStage() { for (const s of root.querySelectorAll('.stage .scene, .tourcap')) { s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }); setTimeout(() => s.remove(), 260) } sky.caus = 0; camera.roll = 0; camera.lift = 0 }

  // ------------------------------------------------------------ play
  // play({ onDone }) is the full film for a first launch. play({ whatsNew: '1.15.0', onDone }) is the short cut after an update.
  async function play({ onDone, whatsNew: wn, askParcels = false } = {}) {
    loadLogo()
    if (document.getElementById('intro')) return
    skip = false
    still = matchMedia('(prefers-reduced-motion: reduce)').matches || (document.body && document.body.dataset.motion === 'off')
    if (!document.getElementById('intro-css')) { const st = document.createElement('style'); st.id = 'intro-css'; st.textContent = css; document.head.appendChild(st) }
    const acc = accent(); HUE = acc.h
    root = document.createElement('div'); root.id = 'intro'; root.style.setProperty('--a', acc.hex); if (still) root.classList.add('still')
    root.innerHTML = `<svg class="defs" aria-hidden="true"><defs></defs></svg><div class="cam"><div class="nebw"><div class="neb"></div></div><canvas></canvas><div class="flare"></div><div class="stage"></div></div><div class="leak"></div><div class="ca"></div><div class="grain"></div><div class="vig"></div><div class="bar t"></div><div class="bar b"></div>
      <div class="credit"><i></i>${wn ? 'Lumen <b>' + String(wn).replace(/\.0$/, '') + '</b>' : 'A Lumen picture'}</div><button class="skip chrome">Skip intro<kbd>esc</kbd></button><button class="skip mute chrome">Sound on</button><div class="meter"><i></i></div>`
    document.body.appendChild(root)
    defs = root.querySelector('svg.defs defs'); lensCache = {}; lensN = 0
    cv = root.querySelector('canvas'); cx = cv.getContext('2d', { alpha: false })
    size(); addEventListener('resize', size)
    root.querySelector('.grain').style.background = `url(${grainURL()})`
    if (!still) root.querySelector('.grain').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3%,2%)' }, { transform: 'translate(2%,-3%)' }, { transform: 'translate(0,0)' }], { duration: 600, iterations: Infinity, easing: 'steps(4)' })
    // the iris opens on the first frame
    if (!still) root.querySelector('.cam').animate([{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(6% at 50% 50%)', offset: .35 }, { clipPath: 'circle(80% at 50% 50%)' }], { duration: 1900, easing: 'cubic-bezier(.6,0,.2,1)' })
    stars = Array.from({ length: Math.round(Math.min(900, W * H / 1600)) }, () => newStar())
    bokeh = Array.from({ length: 16 }, () => ({ x: Math.random(), y: .1 + Math.random() * .9, r: 30 + Math.random() * 90, h: [0, 30, 60, 95][Math.floor(Math.random() * 4)], a: .4 + Math.random() * .6, sx: .1 + Math.random() * .25, sy: .08 + Math.random() * .2, p: Math.random() * 6, v: .01 + Math.random() * .03 }))
    caus = Array.from({ length: 110 }, (_, i) => ({ u: Math.random() * 2 - 1, w: Math.random() * 2 - 1, s: Math.random(), p: Math.random(), v: .12 + Math.random() * .2, up: i % 4 === 0 }))
    nebula = paintNebula(); sprite = paintSprite()
    Object.assign(sky, { oy: 0, speed: .4, warp: 0, gather: 0, orb: 0, orbR: 0, ring: 0, shock: [], flash: 0, shake: 0, rays: 0, bokeh: 0, neb: 0, dof: 0, ghosts: 0, caus: 0 }); Object.assign(camera, { x: 0, y: 0, px: 0, py: 0, push: 0, roll: 0, lift: 0 }); dofShown = -1
    const onMove = e => { camera.px = e.clientX / innerWidth - .5; camera.py = e.clientY / innerHeight - .5 }
    addEventListener('pointermove', onMove)
    t0 = performance.now(); total = wn ? 13000 : 62000
    raf = requestAnimationFrame(draw)
    lensAll(root)
    root.querySelector('.skip').onclick = () => { skip = true }
    root.querySelector('.mute').onclick = () => { root.querySelector('.mute').textContent = SFX.toggleMute() ? 'Sound off' : 'Sound on' }
    SFX.init(); SFX.drone()
    const onKey = e => { if (e.key === 'Escape') skip = true }
    addEventListener('keydown', onKey)
    requestAnimationFrame(() => root.classList.add('on'))

    let answer
    if (still) {
      // Motion off or reduced motion: no film, just the last frame, still and instant
      removeEventListener('keydown', onKey); sky.neb = .9; root.classList.add('lit')
      answer = wn ? (askParcels ? await finale({ short: true, ask: true }) : await finale({ short: true })) : await finale()
    } else if (wn) {
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
    cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('pointermove', onMove); root.remove(); defs = null
    onDone && onDone({ parcels: answer })
  }
  window.Intro = { play, WHATS_NEW }
})()
