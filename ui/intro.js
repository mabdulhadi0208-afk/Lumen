/* Lumen's opening film, the 4.1 cut: speed and Lumen AI. Three cards on the beat, a beat of black, then the time
   Lumen takes to open counts down from 4 s and slams into 1; ignition on "Lumen 4.1"; a tour of live demos (open in a
   second, results as you type, Ask Lumen with sources, Cmd K that acts, the selection bubble); and the
   numbers, four figures at different depths that the camera flies through. A key light beam crosses the biggest
   beats; every soft glow is a gradient, never a live blur. After an update: warp, ignition, What is new, the numbers.
   Built on the 4.0 trailer engine below.
   The 4.0 notes: Cut like a movie trailer and shot through real liquid glass: every frame,
   card and button is a lens that bends the nebula behind it (an SVG displacement map on the backdrop, strongest at the
   rim, with a chromatic fringe), with a glint that follows your pointer and a caustic glow inside.
   The cut: the iris opens on beat-cut title cards, a count that slams into the version number, a chromatic warp
   tunnel, ignition (the real app icon in an orb with god rays, an anamorphic streak and lens ghosts) on
   "This is Lumen 4.0", a fast tour of live demos inside a Nova browser that looks like the real one, the reveal of
   the new home screen, a closing montage, and a finale where the letterbox opens and asks one question. After an
   update the short cut plays: warp, ignition, What is new, the home screen and "You are on Lumen 4.0".
   Every title has a giant outline echo of itself that bleeds off the frame, What is new is a one-sheet (the number
   at monument size beside a bento of glass cards with glowing icon tiles and watermark glyphs) and the finale is the
   closing card of a trailer. Big but cheap: transform and opacity only, plain blur, nothing loops.
   Everything is lit in your accent color. Synthesized, friendly score; every cut lands on a beat of it. No emoji.
   Skip or Escape jump to the finale at any point; with Motion off or reduced motion there is no film at all.
   Every release rewrites WHATS_NEW below, and after an update Lumen plays the short what's-new cut once.
   Intro.arrive() is the first frame after an update restarts Lumen: it picks up exactly where the update card's
   restart screen left off, so there is never a grey window in between. */
;(function () {
  // ---- edit this list every release: it is the "New in Lumen" act of the film (only this version's changes)
  const WHATS_NEW = {
    version: '4.4.6',
    items: [
      { icon: 'box', text: 'Shop support in Parcels: orders from Shopify stores are saved from the thank-you and order status pages, under the store\'s own name' },
      { icon: 'sparkle', text: 'The tracking number and the right carrier come straight from the Track your order link, for every carrier Lumen knows' },
      { icon: 'play', text: 'Shop orders wear a small Shop tag in Parcels, and you can search them by store name' },
    ],
  }

  const FILM_V = WHATS_NEW.version
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
  #intro.lit .neb{opacity:1;animation:neb 18s ease-in-out 4 alternate}
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
  /* title cards squeeze the letterbox in a little, like a trailer's own frame */
  #intro.on.tight .bar{transition-duration:.45s}#intro.on.tight .bar.t{transform:translateY(5vh)} #intro.on.tight .bar.b{transform:translateY(-5vh)}
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
  #intro .title .slate{position:absolute;bottom:calc(var(--bar) + 60px);font:700 10px/1 var(--font);letter-spacing:.4em;text-transform:uppercase;color:rgba(220,226,255,.34);opacity:0;font-variant-numeric:tabular-nums}
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
  /* the mock browser is Lumen as it really looks: Nova glass capsules on a porcelain nebula, the page on a white card */
  #intro .mw{position:relative;width:min(720px,72vw);height:min(396px,44vh);border-radius:20px;overflow:hidden;color:#1c1d21;font:13px -apple-system,system-ui,sans-serif;
    background:radial-gradient(55% 70% at 6% 0%,color-mix(in srgb,var(--a) 30%,transparent),transparent 70%),radial-gradient(50% 70% at 100% 6%,color-mix(in srgb,var(--a3) 26%,transparent),transparent 70%),radial-gradient(60% 60% at 70% 112%,color-mix(in srgb,var(--a2) 22%,transparent),transparent 70%),radial-gradient(circle,rgba(40,44,90,.1) .8px,transparent 1.3px) 0 0/14px 14px,#f5f6fb;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 0 0 1px rgba(255,255,255,.1);transition:background .9s}
  #intro .mw .cap{border-radius:11px;background:linear-gradient(180deg,rgba(255,255,255,.86),rgba(255,255,255,.6));
    box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(255,255,255,.75),0 0 0 1.5px color-mix(in srgb,var(--a) 14%,transparent),0 6px 16px -6px color-mix(in srgb,var(--a) 42%,transparent)}
  #intro .mw .cap svg{width:13px;height:13px;flex:none;color:#4a4d5e}
  #intro .mw .tb{position:absolute;left:8px;right:42px;top:7px;height:26px;display:flex;align-items:center;gap:5px}
  #intro .mw .lt{display:flex;align-items:center;gap:5px;height:24px;padding:0 8px;margin-right:3px;flex:none}
  #intro .mw .lt i{width:9px;height:9px;border-radius:50%;background:#ff5f57;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.12)}#intro .mw .lt i:nth-child(2){background:#febc2e}#intro .mw .lt i:nth-child(3){background:#28c840}
  #intro .mw .t{position:relative;height:24px;border-radius:10px;padding:0 10px;display:flex;align-items:center;gap:7px;color:#5d6070;width:116px;white-space:nowrap;overflow:hidden;font-size:11.5px;font-weight:600;flex:none;transition:background .3s,box-shadow .3s,color .3s}
  #intro .mw .t b{width:12px;height:12px;border-radius:4px;flex:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.4)}
  #intro .mw .t.on{background:linear-gradient(180deg,#fff,rgba(255,255,255,.84));color:#111;font-weight:750;box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(255,255,255,.9),0 0 0 3px color-mix(in srgb,var(--a) 16%,transparent),0 6px 16px color-mix(in srgb,var(--a) 30%,transparent)}
  #intro .mw .t.on::after{content:'';position:absolute;left:34%;right:34%;bottom:1px;height:2.5px;border-radius:2px;background:var(--nova);box-shadow:0 0 6px color-mix(in srgb,var(--a) 70%,transparent)}
  #intro .mw .plus{position:absolute;right:9px;top:8px;width:24px;height:24px;border-radius:8px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 4px 12px color-mix(in srgb,var(--a) 55%,transparent)}
  #intro .mw .plus svg{width:13px;height:13px}
  #intro .mw .r2{position:absolute;left:8px;right:8px;top:40px;height:28px;display:flex;gap:6px}
  #intro .mw .nav,#intro .mw .rt{display:flex;align-items:center;gap:11px;padding:0 10px;flex:none}
  #intro .mw .nav .ap{width:15px;height:15px;border-radius:5px;background:var(--nova);box-shadow:0 2px 6px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .mw .ub{flex:1;min-width:0;height:28px;border-radius:11px;display:flex;align-items:center;padding:0 10px 0 4px;color:#6a6d7c;font-size:11.5px;gap:8px}
  #intro .mw .ub .sq{width:20px;height:20px;border-radius:7px;display:grid;place-items:center;flex:none;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 3px 10px color-mix(in srgb,var(--a) 45%,transparent)}
  #intro .mw .ub .sq svg{width:11px;height:11px;color:#fff}
  #intro .mw .ub .host{color:#1c1d24;font-weight:700}
  #intro .mw .ub .sh{margin-left:auto;display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 9px;border-radius:999px;background:color-mix(in srgb,var(--a) 13%,#fff);color:color-mix(in srgb,var(--a) 75%,#000);font:800 10.5px system-ui;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 24%,transparent)}
  #intro .mw .ub .sh svg{width:11px;height:11px;color:inherit}
    #intro .mw .pg{position:absolute;left:8px;right:8px;top:76px;bottom:8px;border-radius:14px;background:#fff;padding:20px 24px;overflow:hidden;transition:background 1s,color 1s;
    box-shadow:0 0 0 1px rgba(20,24,60,.05),0 12px 30px -14px color-mix(in srgb,var(--a) 40%,transparent)}
  #intro .mw .ln{height:8px;border-radius:5px;background:#eceef5;margin:9px 0;transition:background 1s}
  #intro .mw .h{height:15px;width:55%;border-radius:6px;background:linear-gradient(90deg,color-mix(in srgb,var(--a) 34%,#e3e6f0),color-mix(in srgb,var(--a3) 24%,#e8eaf2));margin-bottom:14px;transition:background 1s}
  #intro .mw .img{height:60px;border-radius:12px;margin:12px 0;background:linear-gradient(120deg,color-mix(in srgb,var(--a) 45%,#fff),color-mix(in srgb,var(--a2) 35%,#fff) 55%,color-mix(in srgb,var(--a3) 40%,#fff));box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}
  #intro .mw .ad{position:absolute;border-radius:12px;background:linear-gradient(135deg,#ff8787,#ffc078);color:#fff;font:800 11px/1 system-ui;display:grid;place-items:center;letter-spacing:.12em;box-shadow:0 8px 20px rgba(255,120,100,.3)}
  #intro .mw .cnt{position:absolute;right:16px;top:12px;padding:6px 12px;border-radius:999px;background:var(--nova);color:#fff;font:800 12px system-ui;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 6px 18px color-mix(in srgb,var(--a) 45%,transparent);font-variant-numeric:tabular-nums}
  /* glass inside the demos: it refracts the page underneath */
  #intro .mw .lgl{background:radial-gradient(60% 60% at var(--gx) var(--gy),rgba(255,255,255,.5),transparent 70%),linear-gradient(160deg,rgba(255,255,255,.66),rgba(255,255,255,.4));backdrop-filter:blur(18px) saturate(1.8);
    box-shadow:inset 0 1px 0 #fff,inset 0 -1px 0 rgba(255,255,255,.5),inset 2px 0 0 rgba(255,90,150,.12),inset -2px 0 0 rgba(90,200,255,.14),inset 0 0 24px color-mix(in srgb,var(--a) 12%,transparent),0 30px 70px rgba(20,24,60,.22),0 0 0 1px rgba(255,255,255,.6),0 0 0 5px color-mix(in srgb,var(--a) 12%,transparent)}
  #intro .mw .cmdp{position:absolute;left:50%;top:58px;width:72%;margin-left:-36%;border-radius:24px;overflow:hidden;padding-bottom:6px}
  #intro .mw .cmdp .in{height:50px;display:flex;align-items:center;gap:10px;padding:0 16px;font-size:16px;font-weight:650}
  #intro .mw .cmdp .in .sq{width:26px;height:26px;border-radius:9px;display:grid;place-items:center;background:var(--nova);box-shadow:0 4px 12px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .mw .cmdp .in svg{width:14px;height:14px;color:#fff}
  #intro .mw .cmdp .in kbd{margin-left:auto;font-size:10.5px;color:#555a70;background:rgba(255,255,255,.7);box-shadow:inset 0 0 0 1px rgba(20,24,60,.1)}
  #intro .mw .cmdp .caret{width:2px;height:20px;background:var(--a);animation:blink 1s steps(2) 6}
  @keyframes blink{50%{opacity:0}}
  #intro .mw .cmdp .r{height:34px;display:flex;align-items:center;gap:10px;margin:0 6px;padding:0 12px;border-radius:12px;color:#444;opacity:0;transition:background .3s,color .3s,box-shadow .3s}
  #intro .mw .cmdp .r i{width:18px;height:18px;border-radius:6px;flex:none;background:color-mix(in srgb,var(--a) 18%,#fff);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 22%,transparent)}
  #intro .mw .cmdp .r.sel{background:color-mix(in srgb,var(--a) 16%,rgba(255,255,255,.4));color:#111;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 22%,transparent),0 0 0 3px color-mix(in srgb,var(--a) 10%,transparent)}
  #intro .mw .cmdp .r.sel i{background:var(--nova)}
  #intro .mw .cmdp .r em{margin-left:auto;font-style:normal;color:#8a8d9a;font-size:11px}
  #intro .mw .side{position:absolute;top:76px;right:8px;bottom:8px;width:40%;border-radius:18px;padding:0;overflow:hidden;transform:translateX(112%)}
  #intro .mw .side .ah{position:relative;display:flex;align-items:center;gap:9px;font:800 14px ${HEAD};letter-spacing:-.02em;color:#14151c;padding:14px 14px 12px;margin-bottom:8px;overflow:hidden;
    background:radial-gradient(60% 120% at 0% 0%,color-mix(in srgb,var(--a) 34%,transparent),transparent 70%),radial-gradient(60% 120% at 100% 0%,color-mix(in srgb,var(--a3) 28%,transparent),transparent 70%)}
  #intro .mw .side .ah i{width:24px;height:24px;border-radius:8px;background:var(--nova);box-shadow:0 0 14px color-mix(in srgb,var(--a) 60%,transparent),inset 0 1px 0 rgba(255,255,255,.5)}
  #intro .mw .side p{margin:0 14px 10px;line-height:1.5;color:#2b2d36;font-size:12px;min-height:54px}
  #intro .mw .side .kp{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px}
  #intro .mw .side .kp span{padding:5px 10px;border-radius:999px;font:700 11px system-ui;color:color-mix(in srgb,var(--a) 75%,#000);background:color-mix(in srgb,var(--a) 14%,rgba(255,255,255,.7));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 22%,transparent);opacity:0}
  #intro .mw .tr{font-size:15px;line-height:1.7;color:#222;position:relative}
  #intro .mw .scan{position:absolute;left:0;right:0;top:0;height:46px;pointer-events:none;opacity:0;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--a) 22%,transparent) 70%,color-mix(in srgb,var(--a) 70%,#fff) 96%,transparent);filter:blur(.4px)}
  #intro .mw .pill{position:absolute;right:20px;bottom:20px;padding:8px 14px;border-radius:999px;display:flex;align-items:center;gap:8px;font:700 12px system-ui;color:#222;opacity:0}
  #intro .mw .pill svg{width:15px;height:15px;color:var(--a)}
  /* dark mode: the same browser in deep ink, with the nebula and star dust */
  #intro .mw .reveal{position:absolute;inset:0;pointer-events:none;clip-path:circle(0% at 92% 7%);
    background:radial-gradient(55% 70% at 6% 0%,color-mix(in srgb,var(--a) 34%,transparent),transparent 70%),radial-gradient(50% 70% at 100% 6%,color-mix(in srgb,var(--a3) 26%,transparent),transparent 70%),radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 70% 60%,#fff,transparent),radial-gradient(1px 1px at 44% 80%,#fff,transparent),#0a0c15}
  #intro .mw .reveal .cap{background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.05));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 0 1px rgba(255,255,255,.07),0 6px 16px -6px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .mw .reveal .cap svg{color:#c4c8dc}
  #intro .mw .reveal .pg{background:#121420;box-shadow:0 0 0 1px rgba(255,255,255,.06),0 12px 30px -14px color-mix(in srgb,var(--a) 60%,transparent)}#intro .mw .reveal .ln{background:#242838}#intro .mw .reveal .h{background:linear-gradient(90deg,color-mix(in srgb,var(--a) 50%,#2a2e3c),color-mix(in srgb,var(--a3) 34%,#2a2e3c))}
  #intro .mw .reveal .ub{color:#aab}#intro .mw .reveal .ub .host{color:#fff}#intro .mw .reveal .t.on{background:rgba(255,255,255,.16);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 0 0 3px color-mix(in srgb,var(--a) 22%,transparent)}#intro .mw .reveal .t{color:#aab}
  #intro .mw .reveal .ub .sh{background:color-mix(in srgb,var(--a) 30%,#14161f);color:#fff}
  #intro .mw .reveal .img{background:linear-gradient(120deg,color-mix(in srgb,var(--a) 50%,#111),color-mix(in srgb,var(--a3) 44%,#111))}
  #intro .mw .split{position:absolute;inset:76px 8px 8px;display:flex;gap:8px}
  #intro .mw .split .pp{flex:1;border-radius:14px;background:#fff;padding:18px;min-width:0;box-shadow:0 0 0 1px rgba(20,24,60,.05),0 12px 30px -14px color-mix(in srgb,var(--a) 40%,transparent)}
  #intro .mw .split .dv{flex:none;width:6px;margin:auto -7px;height:44px;border-radius:3px;background:var(--nova);box-shadow:0 0 12px color-mix(in srgb,var(--a) 60%,transparent);z-index:1}
  #intro .mw .pcard{position:absolute;left:50%;top:50%;width:64%;margin:-56px 0 0 -32%;padding:18px;border-radius:24px;display:flex;gap:14px;align-items:center}
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

  /* the trailer: title cards that slam in on the beat, and the count up to the version */
  #intro .trailer .tc{position:absolute;font:800 clamp(64px,10.5vw,160px)/1 ${HEAD};letter-spacing:-.055em;color:#f4f5ff;white-space:nowrap;opacity:0;padding-bottom:.08em;
    text-shadow:0 0 60px color-mix(in srgb,var(--a) 55%,transparent)}
  #intro .trailer .tc em{font-style:normal;background:linear-gradient(100deg,#fff 5%,var(--hi) 45%,var(--hi3) 90%);-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .trailer .tc small{display:block;text-align:center;font:800 clamp(11px,1vw,13px)/1 var(--font);letter-spacing:.5em;text-transform:uppercase;color:color-mix(in srgb,var(--hi) 85%,transparent);margin-bottom:.9em;text-shadow:none}
  #intro .count{position:absolute;font:800 clamp(150px,24vw,360px)/1 ${HEAD};letter-spacing:-.06em;white-space:nowrap;font-variant-numeric:tabular-nums;opacity:0;filter:drop-shadow(0 0 40px color-mix(in srgb,var(--a) 55%,transparent))}
  #intro .count .cn{display:inline-block;padding:0 .06em .06em;background:linear-gradient(180deg,#fff 18%,var(--hi) 62%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .count.fin4 .cn{background:linear-gradient(100deg,#fff 8%,var(--hi) 42%,var(--hi3) 78%,#fff);-webkit-background-clip:text;background-clip:text}
  #intro .count .cg{position:absolute;left:0;top:0;padding:0 .06em .06em;font-style:normal;color:transparent;background:linear-gradient(100deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);background-size:300% 100%;background-position:120% 0;-webkit-background-clip:text;background-clip:text;opacity:0}
  #intro .trailer .tc.sm{font-size:clamp(44px,6.6vw,100px);text-align:center}
  #intro .logo .mirror .v4{opacity:1}
  #intro .logo .glint .gv{font-style:normal;margin-left:.2em}
  #intro .home .hg,#intro .home .cu{background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.64));box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(255,255,255,.8),0 6px 16px -6px color-mix(in srgb,var(--a) 45%,transparent)}
  #intro .mw .ub .st{margin-left:auto}#intro .mw .ub .sh+.st{margin-left:6px}
  #intro .cring{position:absolute;left:50%;top:50%;width:40vmin;height:40vmin;margin:-20vmin 0 0 -20vmin;border-radius:50%;pointer-events:none;opacity:0;border:2px solid color-mix(in srgb,var(--hi) 80%,transparent);box-shadow:0 0 30px color-mix(in srgb,var(--a) 60%,transparent),inset 0 0 30px color-mix(in srgb,var(--a3) 40%,transparent)}
  #intro .logo .v4{display:inline-block;margin-left:.2em;font-style:normal;opacity:0;padding-bottom:.06em;background:linear-gradient(100deg,var(--hi) 0%,#fff 40%,var(--hi3) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
    filter:drop-shadow(0 0 26px color-mix(in srgb,var(--a) 75%,transparent))}

  /* the new home screen, revealed like the hero shot of a trailer */
  #intro .home{position:relative;width:min(920px,80vw);height:min(470px,52vh);border-radius:22px;overflow:hidden;color:#1c1d24;font:13px -apple-system,system-ui,sans-serif;
    background:radial-gradient(40% 55% at 14% 18%,color-mix(in srgb,var(--a) 38%,transparent),transparent 70%),radial-gradient(40% 55% at 88% 24%,color-mix(in srgb,var(--a3) 32%,transparent),transparent 70%),radial-gradient(50% 60% at 58% 104%,color-mix(in srgb,var(--a2) 30%,transparent),transparent 70%),radial-gradient(circle,rgba(40,44,90,.1) .8px,transparent 1.3px) 0 0/16px 16px,#f5f6fb;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
  #intro .home .hc{position:absolute;inset:0 0 21% 0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:2%}
  #intro .home .hg{position:absolute;left:16px;top:14px;display:flex;align-items:center;gap:8px;height:30px;padding:0 12px 0 5px;border-radius:999px;font:700 12px system-ui;color:#3a3d4c}
  #intro .home .hg i{width:20px;height:20px;border-radius:50%;background:var(--nova);box-shadow:0 2px 8px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .home .hg em{font-style:normal;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800}
  #intro .home .cu{position:absolute;right:16px;top:14px;display:flex;align-items:center;gap:8px;height:30px;padding:0 12px 0 5px;border-radius:999px;font:800 12px system-ui;color:#1c1d24}
  #intro .home .cu i{width:20px;height:20px;border-radius:50%;background:var(--nova)}
  #intro .home .clk{position:relative;font:800 clamp(56px,7.4vw,104px)/1 ${HEAD};letter-spacing:-.05em;font-variant-numeric:tabular-nums;white-space:nowrap;padding-bottom:.04em;
    background:linear-gradient(180deg,color-mix(in srgb,var(--a) 70%,#1c1d30) 10%,color-mix(in srgb,var(--a3) 60%,#2a1d40));-webkit-background-clip:text;background-clip:text;color:transparent;
    filter:drop-shadow(0 2px 0 #fff) drop-shadow(0 10px 24px color-mix(in srgb,var(--a) 40%,transparent))}
  #intro .home .clk .sec{font-size:.34em;letter-spacing:-.02em;margin-left:.12em;vertical-align:.12em;background:var(--nova);-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .home .trk{position:relative;width:min(300px,30%);height:5px;border-radius:5px;margin-top:8px;background:color-mix(in srgb,var(--a) 14%,#fff);box-shadow:inset 0 0 0 1px rgba(255,255,255,.8)}
  #intro .home .trk i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:5px;background:var(--nova)}
  #intro .home .trk b{position:absolute;top:50%;left:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,color-mix(in srgb,var(--a3) 70%,#fff));box-shadow:0 0 0 2px #fff,0 0 12px var(--a3)}
  #intro .home .srch{position:relative;width:60%;height:46px;margin-top:3.2%;border-radius:999px;display:flex;align-items:center;gap:12px;padding:0 8px 0 18px;box-sizing:border-box;color:#8a8d9c;font-size:14px;
    background:linear-gradient(180deg,#fff,rgba(255,255,255,.86));box-shadow:inset 0 1px 0 #fff,0 0 0 1.5px color-mix(in srgb,var(--a) 40%,#fff),0 0 0 6px color-mix(in srgb,var(--a) 12%,transparent),0 16px 40px -12px color-mix(in srgb,var(--a) 55%,transparent)}
  #intro .home .srch svg{width:17px;height:17px;color:var(--a);flex:none}
  #intro .home .srch .q{color:#1c1d24;font-weight:600}
  #intro .home .srch .eg{margin-left:auto;height:32px;padding:0 12px;border-radius:999px;display:flex;align-items:center;gap:6px;font:800 11.5px system-ui;color:#3a3d4c;background:color-mix(in srgb,var(--a) 8%,#f3f4fa);box-shadow:inset 0 0 0 1px rgba(20,24,60,.06)}
  #intro .home .scs{display:flex;gap:18px;margin-top:2.6%}
  #intro .home .sc{display:flex;flex-direction:column;align-items:center;gap:6px;font:700 10.5px system-ui;color:#4a4d5e;opacity:0}
  #intro .home .sc i{width:40px;height:40px;border-radius:15px;display:grid;place-items:center;color:#fff;font:800 17px ${HEAD};font-style:normal;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 -6px 12px rgba(0,0,0,.1),0 8px 18px -6px rgba(20,24,60,.35),0 0 0 3px rgba(255,255,255,.7)}
  #intro .home .wgs{position:absolute;left:4%;right:4%;bottom:5%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  #intro .home .wg{position:relative;height:66px;border-radius:18px;display:flex;align-items:center;gap:11px;padding:0 13px;box-sizing:border-box;opacity:0;overflow:hidden;
    background:linear-gradient(180deg,rgba(255,255,255,.88),rgba(255,255,255,.62));box-shadow:inset 0 1px 0 #fff,0 0 0 1px rgba(255,255,255,.8),0 0 0 1.5px color-mix(in srgb,var(--a) 12%,transparent),0 12px 28px -12px color-mix(in srgb,var(--a) 55%,transparent)}
  #intro .home .wg .k{width:36px;height:36px;border-radius:12px;flex:none;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 14px -4px color-mix(in srgb,var(--a) 60%,transparent)}
  #intro .home .wg .k svg{width:17px;height:17px}
  #intro .home .wg b{display:block;font:800 15px/1.1 ${HEAD};letter-spacing:-.02em;color:#14151c;font-variant-numeric:tabular-nums;white-space:nowrap}
  #intro .home .wg span{display:block;font:600 10.5px/1.3 system-ui;color:#6d7080;margin-top:3px;white-space:nowrap}
  #intro .home .wg .bars{position:absolute;right:12px;bottom:12px;display:flex;align-items:flex-end;gap:3px;height:26px}
  #intro .home .wg .bars s{width:5px;border-radius:2px;background:var(--nova);opacity:.75;text-decoration:none}
  @media (max-width:1000px){#intro .home .wgs{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;bottom:4%}#intro .home .wg{height:54px}#intro .home .wg:nth-child(n+3){display:none}#intro .home .hc{bottom:16%}#intro .home .wg .bars{display:none}#intro .home .scs{gap:12px}#intro .home .sc i{width:36px;height:36px;border-radius:12px}#intro .home .srch{height:40px;width:70%}}
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
  #intro .tourcap p{margin:0 auto;max-width:720px;color:#b8bfe2;font-size:15px;line-height:1.5}
  #intro kbd{font:700 12px var(--font);padding:2px 8px;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(0,0,0,.2),0 0 0 1px color-mix(in srgb,var(--a) 34%,transparent)}

  /* what is new: eight glass tiles */
  #intro .new{width:min(1120px,90vw);text-align:center;transform-style:preserve-3d}
  #intro .new .eyebrow{display:inline-block;font:800 12px/1 var(--font);letter-spacing:.24em;text-transform:uppercase;color:#fff;padding:10px 18px;border-radius:999px}
  #intro .new h1{font:800 clamp(32px,4.4vw,64px)/1.04 ${HEAD};letter-spacing:-.04em;margin:14px 0 clamp(16px,3vh,28px);padding-bottom:.06em;background:linear-gradient(100deg,#fff 25%,var(--hi) 60%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .new h1.shine{animation:nsweep 1.6s cubic-bezier(.3,.7,.2,1)}
  @keyframes nsweep{0%{background-image:linear-gradient(100deg,#fff 25%,var(--hi) 60%,var(--hi3)),linear-gradient(100deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);background-size:100% 100%,250% 100%;background-position:0 0,120% 0}100%{background-image:linear-gradient(100deg,#fff 25%,var(--hi) 60%,var(--hi3)),linear-gradient(100deg,transparent 40%,rgba(255,255,255,.95) 50%,transparent 60%);background-size:100% 100%,250% 100%;background-position:0 0,-20% 0}}
  #intro .new .grid{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:14px;text-align:left;max-width:calc(var(--n,4) * 280px);margin-inline:auto}
  #intro .new .it{padding:16px 16px 18px;opacity:0;display:flex;flex-direction:column;gap:12px;border-radius:24px}
  #intro .new .it .hd{display:flex;align-items:center;justify-content:space-between}
  #intro .new .it .no2{font:800 11px/1 var(--font);letter-spacing:.2em;color:color-mix(in srgb,var(--hi) 80%,transparent);font-variant-numeric:tabular-nums}
  #intro .new .it .k,#intro .ask .k{flex:none;width:40px;height:40px;border-radius:13px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 -6px 12px rgba(0,0,0,.12),0 10px 26px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .new .it .k svg{width:19px;height:19px}
  #intro .new .it span{color:#e4e7fa;font:650 14px/1.45 var(--font);letter-spacing:-.005em}
  @media (max-width:760px){#intro .new .grid{grid-template-columns:repeat(min(2,var(--n,4)),minmax(0,1fr));gap:10px}#intro .new .it{padding:12px;gap:8px}#intro .new .it span{font-size:12.5px}}
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
  #intro .meter i{display:block;height:100%;width:100%;transform:scaleX(0);transform-origin:0 50%;background:var(--nova);box-shadow:0 0 10px var(--a);border-radius:3px}
  #intro .credit{position:absolute;left:28px;top:calc(var(--bar) + 24px);z-index:9;font:700 10.5px var(--font);letter-spacing:.32em;text-transform:uppercase;color:rgba(220,226,255,.42)}
  #intro .credit b{color:var(--hi);font-weight:800}
  #intro .credit i{display:inline-block;width:6px;height:6px;margin-right:10px;border-radius:50%;background:#ff4d6d;box-shadow:0 0 8px #ff4d6d;vertical-align:1px;animation:rec 1.4s steps(2) 40}
  @keyframes rec{50%{opacity:.25}}
  #intro.still .glass,#intro.still .lgl,#intro.still .drop{backdrop-filter:blur(24px) saturate(1.8) !important}
  #intro.still .credit i{animation:none}
  /* once the last frame has settled and waits for an answer, the film holds still: no loops at idle */
  #intro.held .neb,#intro.held .credit i,#intro.held .caret{animation-play-state:paused}

  /* the first frame after an update restarts Lumen: the same ink, icon and number the restart screen ended on */
  #arrive{--a:#5b8cff;--a2:oklch(from var(--a) calc(l - .02) c calc(h + 40));--a3:oklch(from var(--a) calc(l + .04) c calc(h + 95));--hi:color-mix(in oklab,var(--a) 42%,#fff);--hi3:color-mix(in oklab,var(--a3) 46%,#fff);
    position:fixed;inset:0;z-index:1001;display:grid;place-items:center;overflow:hidden;color:#eef0fb;font-family:var(--font,-apple-system,system-ui,sans-serif);-webkit-app-region:drag;user-select:none;
    background:radial-gradient(40% 50% at 30% 30%,color-mix(in srgb,var(--a) 30%,transparent),transparent 70%),radial-gradient(40% 50% at 72% 70%,color-mix(in srgb,var(--a3) 24%,transparent),transparent 70%),
      radial-gradient(1px 1px at 12% 22%,#fff,transparent),radial-gradient(1px 1px at 33% 68%,#fff,transparent),radial-gradient(1.4px 1.4px at 58% 18%,#fff,transparent),radial-gradient(1px 1px at 76% 54%,#fff,transparent),radial-gradient(1px 1px at 90% 30%,#fff,transparent),radial-gradient(1.2px 1.2px at 47% 88%,#fff,transparent),#05060d}
  #arrive .am{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
  #arrive .ao{position:relative;width:min(150px,22vmin);height:min(150px,22vmin);border-radius:50%;display:grid;place-items:center;
    background:radial-gradient(circle at 34% 26%,rgba(255,255,255,.45),rgba(255,255,255,.06) 22%,transparent 38%),radial-gradient(circle at 60% 80%,color-mix(in srgb,var(--a3) 34%,transparent),transparent 52%);
    box-shadow:inset 0 2px 1px rgba(255,255,255,.5),inset 0 -10px 24px color-mix(in srgb,var(--a) 50%,transparent),inset 3px 0 0 rgba(255,90,150,.22),inset -3px 0 0 rgba(90,200,255,.22),0 0 0 1px rgba(255,255,255,.14),0 0 80px color-mix(in srgb,var(--a) 55%,transparent)}
  #arrive .ao::before{content:'';position:absolute;inset:-14px;border-radius:50%;border:2px solid color-mix(in srgb,var(--hi) 70%,transparent);opacity:.5}
  #arrive .ao img{width:62%;height:62%;border-radius:24%}
  #arrive .ak{font:800 11px/1 var(--font,system-ui);letter-spacing:.42em;text-transform:uppercase;color:var(--hi);margin-top:12px}
  #arrive b{font:800 clamp(40px,7.4vmin,92px)/1 ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.045em;padding-bottom:.06em;background:linear-gradient(100deg,#fff 20%,var(--hi) 60%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent}
  #arrive small{font-size:14px;color:rgba(220,226,255,.7)}
  #arrive .fl{position:absolute;left:50%;top:50%;width:90vmin;height:90vmin;margin:-45vmin 0 0 -45vmin;border-radius:50%;pointer-events:none;opacity:0;background:radial-gradient(closest-side,#fff,color-mix(in srgb,var(--hi) 60%,transparent) 30%,color-mix(in srgb,var(--a) 25%,transparent) 60%,transparent)}
  /* ---- the 4.0 flagship cut: monument type. Every title card has a giant outline echo of itself bleeding off the
     frame, the type is poster size, What is new is a one-sheet (the number at monument size beside a bento of glass
     cards, each with the Settings hero DNA: a glowing icon tile, a light wash and a giant watermark glyph), and the
     finale is the closing card of a trailer. Transform and opacity only; nothing loops. */
  #intro .echo{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:0;font:800 46vh/1 ${HEAD};letter-spacing:-.065em;white-space:nowrap;color:transparent;
    -webkit-text-stroke:2px color-mix(in srgb,var(--hi) 85%,transparent);z-index:-1}
  #intro .echo.fill{color:color-mix(in srgb,var(--hi) 16%,transparent);-webkit-text-stroke:1.5px color-mix(in srgb,var(--hi) 70%,transparent)}
  #intro .echo.tw{font-size:34vh;top:-8vh}
  #intro .echo.mega{font-size:64vh}
  #intro .trailer .tc{font-size:clamp(78px,14vw,224px);letter-spacing:-.062em}
  #intro .trailer .tc.sm{font-size:clamp(52px,8vw,128px)}
  #intro .trailer .tc small{font-size:clamp(12px,1.1vw,15px)}
  #intro .count{font-size:clamp(190px,33vw,480px)}
  #intro .logo{font-size:clamp(92px,15vw,228px)}
  #intro .kicker{font-size:12.5px}
  #intro .tag{font-size:clamp(17px,1.7vw,24px);color:#d3d8f5}
  #intro .tourcap h2{font-size:clamp(30px,4.2vw,60px);letter-spacing:-.04em}
  #intro .tourcap .n{font-size:12px}

  /* what is new: a one-sheet */
  #intro .nw4{width:min(1200px,92vw);display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(24px,3.4vw,56px);align-items:center;text-align:left}
  #intro .nw4 .lh{position:relative}
  #intro .nw4 .bigv{font:800 clamp(130px,17vw,270px)/.8 ${HEAD};letter-spacing:-.075em;margin:22px 0 10px -.04em;padding:0 .04em .08em 0;white-space:nowrap;opacity:0;
    background:linear-gradient(180deg,#fff 18%,var(--hi) 58%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 50px color-mix(in srgb,var(--a) 55%,transparent))}
  #intro .nw4 h1{font-size:clamp(30px,3.4vw,52px);margin:0 0 10px;text-align:left}
  #intro .nw4 .lede{color:#c2c8ea;font-size:15.5px;line-height:1.5;margin:0;max-width:380px;opacity:0}
  #intro .nw4 .bento{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #intro .nw4 .it{flex-direction:row;align-items:center;gap:13px;padding:12px 30px 12px 13px;min-height:62px;border-radius:22px;overflow:hidden;box-sizing:border-box}
  #intro .nw4 .it::after{content:'';position:absolute;left:-10%;top:-60%;width:70%;height:120%;border-radius:50%;pointer-events:none;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 28%,transparent),transparent)}
  #intro .nw4 .it .k{width:40px;height:40px;position:relative;z-index:1;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -6px 12px rgba(0,0,0,.12),0 0 0 3px color-mix(in srgb,var(--a) 18%,transparent),0 10px 26px color-mix(in srgb,var(--a) 60%,transparent)}
  #intro .nw4 .it span{font-size:13.5px;line-height:1.38;flex:1;min-width:0;position:relative;z-index:1}
  #intro .nw4 .it .no2{position:absolute;right:13px;top:11px;z-index:1}
  #intro .nw4 .it .wmk{position:absolute;right:-18px;bottom:-26px;width:92px;height:92px;color:var(--hi);opacity:.13;transform:rotate(-14deg);pointer-events:none}
  #intro .nw4 .it .wmk svg{width:100%;height:100%;stroke-width:1.1}
  #intro .nw4 .it:not(.hero){background:radial-gradient(60% 90% at var(--gx) var(--gy),rgba(255,255,255,.12),transparent 62%),linear-gradient(150deg,rgba(255,255,255,.08),rgba(255,255,255,.02)),rgba(6,6,22,.55)}
  #intro .nw4 .it.hero{grid-column:span 2;padding:18px 60px 18px 18px;min-height:104px;gap:18px;
    background:radial-gradient(60% 120% at 0% 0%,color-mix(in srgb,var(--a) 46%,transparent),transparent 70%),radial-gradient(60% 120% at 100% 100%,color-mix(in srgb,var(--a3) 38%,transparent),transparent 70%),linear-gradient(150deg,rgba(255,255,255,.12),rgba(255,255,255,.03)),rgba(10,12,28,.25)}
  #intro .nw4 .it.hero .k{width:62px;height:62px;border-radius:20px}
  #intro .nw4 .it.hero .k svg{width:28px;height:28px}
  #intro .nw4 .it.hero span{font:800 clamp(18px,1.75vw,25px)/1.18 ${HEAD};letter-spacing:-.025em;color:#fff}
  #intro .nw4 .it.hero .wmk{width:190px;height:190px;right:-34px;bottom:-70px;opacity:.18}
  #intro .nw4 .it.last{grid-column:span 2}
  @media (max-width:1000px){#intro .nw4 .it span{font-size:12.5px}#intro .nw4 .it{padding:10px 26px 10px 11px;gap:10px}#intro .nw4 .it .k{width:34px;height:34px}}
  @media (max-width:760px){#intro .nw4{grid-template-columns:1fr}#intro .nw4 .bigv,#intro .nw4 .lede{display:none}}

  /* the finale: the closing card of a trailer */
  #intro .fin4 .fk{position:relative;z-index:1;font:800 13px/1 var(--font);letter-spacing:.5em;text-transform:uppercase;color:#fff;padding:10px 16px 10px calc(16px + .5em);border-radius:999px;margin-bottom:14px;
    background:linear-gradient(100deg,color-mix(in srgb,var(--a5) 55%,transparent),color-mix(in srgb,var(--a) 60%,transparent),color-mix(in srgb,var(--a3) 55%,transparent));box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 8px 30px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .fin4 .ask{background:radial-gradient(60% 120% at 0% 0%,color-mix(in srgb,#ff8a3d 26%,transparent),transparent 70%),linear-gradient(150deg,rgba(255,255,255,.1),rgba(255,255,255,.02)),rgba(6,6,20,.62)}
  #intro .fin4 .ask span{color:#dfe3fb}
  #intro .fin4 .logo{font-size:clamp(76px,11vw,168px);letter-spacing:-.055em;line-height:1}
  #intro .fin4 .ask{width:min(880px,92vw);align-items:center;gap:18px;padding:18px 18px 18px 20px;box-sizing:border-box;overflow:hidden}
  #intro .fin4 .ask .tx{flex:1;min-width:0;position:relative;z-index:1}
  #intro .fin4 .ask .k{position:relative;z-index:1;width:58px;height:58px;border-radius:19px}
  #intro .fin4 .ask .k svg{width:27px;height:27px}
  #intro .fin4 .ask .btns{margin:0;flex:none;flex-direction:column;gap:8px;position:relative;z-index:1}
  #intro .fin4 .ask .btns button{height:46px}
  #intro .fin4 .ask .wmk{position:absolute;right:200px;bottom:-60px;width:180px;height:180px;color:#ffb27a;opacity:.12;transform:rotate(-14deg);pointer-events:none}
  #intro .fin4 .ask .wmk svg{width:100%;height:100%;stroke-width:1}
  #intro .fin4 > .btns .go{height:60px;padding:0 44px;font-size:18px}
  @media (max-width:760px){#intro .fin4 .ask{flex-wrap:wrap}#intro .fin4 .ask .btns{flex-direction:row;width:100%;justify-content:flex-end}}

  /* the first frame after an update: the restart screen's last frame, the number at monument size */
  #arrive .am{gap:8px;margin-bottom:5vh}
  #arrive .ao{width:min(118px,15vmin);height:min(118px,15vmin)}
  #arrive .an{font:800 clamp(110px,34vh,360px)/.84 ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,system-ui,sans-serif;letter-spacing:-.07em;white-space:nowrap;padding:0 .04em .06em;
    background:linear-gradient(180deg,#fff 22%,var(--hi) 62%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 40px color-mix(in srgb,var(--a) 60%,transparent))}
  #arrive b{font-size:clamp(20px,3.4vmin,34px);letter-spacing:-.03em}
  #arrive .ar{position:absolute;left:50%;bottom:7vh;width:min(640px,76vw);margin-left:max(-320px,-38vw);height:3px;border-radius:3px;background:var(--nv,linear-gradient(90deg,var(--a),var(--a3)));box-shadow:0 0 14px var(--a)}
  #arrive .cart{position:absolute;right:-14vmin;bottom:-18vmin;width:78vmin;height:78vmin;pointer-events:none;color:color-mix(in srgb,var(--a) 60%,#fff);opacity:.07;transform:rotate(-14deg)}
  #arrive .cart svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:.6;stroke-linecap:round;stroke-linejoin:round}
  #arrive::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 50%,transparent 45%,rgba(0,0,0,.75))}

  /* the tour on a wide window: the shot sits right of centre beside a poster-size caption */
  #intro .tourcap .bn{display:none}
  @media (min-width:1100px){
    #intro .scene.tshot .rig{margin-left:30vw}
    #intro .scene.tshot .halo{margin-left:calc(max(-450px,-45vw) + 15vw)}
    #intro .scene.tshot .echo.tw{place-items:end start;padding-left:3vw;top:auto;bottom:-10vh;height:60vh}
    #intro .tourcap{left:5vw;right:auto;width:min(420px,31vw);top:50%;bottom:auto;transform:translateY(-50%);text-align:left}
    #intro .tourcap h2{font-size:clamp(40px,4.1vw,64px);line-height:1.02;margin-bottom:14px}
    #intro .tourcap p{font-size:16px;margin:0}
    #intro .tourcap .n{font-size:12px}
    #intro .tourcap .dots{margin-left:10px}
    #intro .tourcap .bn{display:block;font:800 clamp(64px,6.4vw,104px)/.9 ${HEAD};letter-spacing:-.05em;color:transparent;-webkit-text-stroke:1.5px color-mix(in srgb,var(--hi) 85%,transparent);margin:0 0 10px -.04em}
  }

  /* ---- deep color: the accent and its pink stay the signature, pushed deep and saturated, with a cyan counterpoint
     (--a5) and a warm gold (--a4) so the frame is never one pale wash */
  #intro,#arrive{--a4:oklch(from var(--a) .8 .17 calc(h + 175));--a5:oklch(from var(--a) .78 .16 calc(h - 62));--hi4:color-mix(in oklab,var(--a4) 55%,#fff);--hi5:color-mix(in oklab,var(--a5) 50%,#fff);
    --deep:linear-gradient(100deg,var(--hi5) 0%,#fff 30%,var(--hi) 52%,var(--hi3) 78%,var(--hi4) 100%)}
  #intro{background:#030309}
  #intro .neb{background:radial-gradient(40% 36% at 26% 32%,color-mix(in srgb,var(--a) 48%,transparent),transparent 70%),radial-gradient(38% 34% at 76% 66%,color-mix(in srgb,var(--a3) 46%,transparent),transparent 70%),radial-gradient(30% 30% at 82% 18%,color-mix(in srgb,var(--a5) 30%,transparent),transparent 70%),radial-gradient(26% 26% at 14% 82%,color-mix(in srgb,var(--a4) 22%,transparent),transparent 70%)}
  #intro .trailer .tc em,#intro .count.fin4 .cn,#intro .logo span,#intro .logo .v4,#intro .nw4 .bigv,#intro .fin4 .logo,#intro .new h1{background:var(--deep);-webkit-background-clip:text;background-clip:text;color:transparent}
  #intro .trailer .tc{text-shadow:0 0 60px color-mix(in srgb,var(--a) 70%,transparent),0 0 120px color-mix(in srgb,var(--a3) 40%,transparent)}
  #intro .vig{background:radial-gradient(125% 95% at 50% 50%,transparent 46%,rgba(0,0,0,.88))}
  /* a cinematographer's HUD: crop marks, a running timecode, the reel slate and a tick ruler along the letterbox */
  #intro .hud{position:absolute;inset:calc(var(--bar) + 62px) 22px calc(var(--bar) + 14px);z-index:7;pointer-events:none;font:700 9.5px/1 ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:.24em;color:rgba(220,226,255,.42);text-transform:uppercase;opacity:0;transition:opacity 1.2s .6s}
  #intro.on .hud{opacity:1}#intro.on.wide .hud{opacity:0;transition-delay:0s}
  #intro .hud .cm{position:absolute;width:22px;height:22px;border:0 solid color-mix(in srgb,var(--hi) 60%,transparent)}
  #intro .hud .tl{left:0;top:0;border-width:1.5px 0 0 1.5px}#intro .hud .tr{right:0;top:0;border-width:1.5px 1.5px 0 0}#intro .hud .bl{left:0;bottom:0;border-width:0 0 1.5px 1.5px}#intro .hud .br{right:0;bottom:0;border-width:0 1.5px 1.5px 0}
  #intro .hud .tcd{position:absolute;left:34px;bottom:4px;font-variant-numeric:tabular-nums;color:rgba(230,234,255,.6)}
  #intro .hud .tcd b{color:#ff4d6d;font-weight:800;margin-right:10px}
  #intro .hud .rl{position:absolute;right:34px;bottom:4px}
  #intro .hud .rl em{font-style:normal;color:var(--hi5)}
  #intro .hud .tk{position:absolute;left:30%;right:30%;top:2px;height:7px;opacity:.5;background:repeating-linear-gradient(90deg,rgba(230,234,255,.6) 0 1px,transparent 1px 12px),linear-gradient(90deg,transparent,rgba(0,0,0,0));-webkit-mask:linear-gradient(90deg,transparent,#000 20%,#000 80%,transparent)}
  #intro .hud .sw{position:absolute;right:34px;top:2px;display:flex;gap:4px}
  #intro .hud .sw i{width:16px;height:7px;border-radius:2px}
  #intro .hud .sw i:nth-child(1){background:var(--a5)}#intro .hud .sw i:nth-child(2){background:var(--a)}#intro .hud .sw i:nth-child(3){background:var(--a2)}#intro .hud .sw i:nth-child(4){background:var(--a3)}#intro .hud .sw i:nth-child(5){background:var(--a4)}
  #arrive .an{background:var(--deep);-webkit-background-clip:text;background-clip:text}
  #arrive{background:radial-gradient(40% 50% at 30% 30%,color-mix(in srgb,var(--a) 55%,transparent),transparent 70%),radial-gradient(40% 50% at 72% 70%,color-mix(in srgb,var(--a3) 48%,transparent),transparent 70%),radial-gradient(30% 34% at 78% 14%,color-mix(in srgb,var(--a5) 34%,transparent),transparent 70%),radial-gradient(1px 1px at 12% 22%,#fff,transparent),radial-gradient(1px 1px at 33% 68%,#fff,transparent),radial-gradient(1.4px 1.4px at 58% 18%,#fff,transparent),radial-gradient(1px 1px at 76% 54%,#fff,transparent),#05060d}
  /* color slabs: three saturated bands cut across the frame on the biggest beats (transform only) */
  #intro .slabs{position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden}
  #intro .slabs i{position:absolute;top:-20%;bottom:-20%;width:34%;left:0;transform:translateX(-160%) skewX(-16deg);opacity:.9}
  #intro .slabs i:nth-child(1){background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--a5) 85%,transparent) 30%,color-mix(in srgb,var(--a5) 85%,transparent) 70%,transparent)}
  #intro .slabs i:nth-child(2){background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--a) 90%,transparent) 30%,color-mix(in srgb,var(--a2) 90%,transparent) 70%,transparent)}
  #intro .slabs i:nth-child(3){background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--a3) 90%,transparent) 30%,color-mix(in srgb,var(--a4) 85%,transparent) 70%,transparent)}

  /* ---- liquid glass, drawn: no backdrop blur over the moving film (that was the lag). Thick slabs are built from a
     tinted body, a bright specular rim, a top bevel, a chromatic edge (pink left, cyan right), an inner caustic, a
     refraction sheen that sweeps once (a transform on a pseudo-element) and three colored shadows. */
  #intro:not(.still) .glass,#intro:not(.still) .glassf,#intro:not(.still) .lgl,#intro:not(.still) .chrome,#intro:not(.still) .drop,#intro .desk .menubar,#intro .desk .chg{backdrop-filter:none}
  #intro .glass{background:radial-gradient(55% 45% at var(--gx) var(--gy),rgba(255,255,255,.2),transparent 62%),linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.05) 34%,transparent 60%),
      radial-gradient(90% 70% at 50% 120%,color-mix(in srgb,var(--a) 42%,transparent),transparent 70%),radial-gradient(60% 60% at 0% 0%,color-mix(in srgb,var(--a5) 18%,transparent),transparent 70%),radial-gradient(60% 60% at 100% 100%,color-mix(in srgb,var(--a3) 24%,transparent),transparent 70%),rgba(12,12,34,.62);
    box-shadow:inset 0 1.5px 0 rgba(255,255,255,.7),inset 0 -1.5px 0 rgba(255,255,255,.16),inset 3px 0 0 color-mix(in srgb,var(--a3) 40%,transparent),inset -3px 0 0 color-mix(in srgb,var(--a5) 40%,transparent),inset 0 0 40px color-mix(in srgb,var(--a) 22%,transparent),
      0 30px 70px -20px color-mix(in srgb,var(--a) 70%,transparent),0 50px 110px -34px color-mix(in srgb,var(--a3) 55%,transparent),0 20px 60px -30px color-mix(in srgb,var(--a5) 50%,transparent),0 60px 120px rgba(0,0,0,.55)}
  #intro .glass::before{padding:1.5px;background:linear-gradient(135deg,#fff,color-mix(in srgb,var(--a5) 70%,#fff) 14%,rgba(255,255,255,.08) 34%,transparent 48%,transparent 58%,color-mix(in srgb,var(--a3) 60%,transparent) 80%,var(--a4))}
  #intro .glassf{background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,.06) 20%,rgba(255,255,255,.02) 80%,rgba(255,255,255,.12)),radial-gradient(120% 80% at 50% 120%,color-mix(in srgb,var(--a) 46%,transparent),transparent 70%),rgba(12,12,34,.5)}
  #intro .chrome{background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.05) 50%,rgba(255,255,255,.08)),rgba(16,16,40,.66);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 2px 0 0 color-mix(in srgb,var(--a3) 34%,transparent),inset -2px 0 0 color-mix(in srgb,var(--a5) 34%,transparent),0 0 0 1px rgba(255,255,255,.1),0 10px 28px -6px color-mix(in srgb,var(--a) 55%,transparent)}
  #intro .mw .lgl{background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(250,250,255,.92));}
  #intro .desk .menubar{background:rgba(255,255,255,.1)}
  #intro .desk .chg{background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,.06)),rgba(14,16,30,.7)}
  /* the refraction sheen: a band of light crosses each slab once when it lands */
  #intro .glass.sweep::after{background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.08) 40%,rgba(255,255,255,.42) 50%,color-mix(in srgb,var(--a5) 30%,transparent) 54%,transparent 66%)}
  /* the number in glass letterforms: a deep gradient fill, a bright rim and colored depth */
  #intro .count .cn,#intro .logo .v4,#intro .nw4 .bigv{-webkit-text-stroke:1.5px rgba(255,255,255,.55)}
  #intro .nw4 .bigv{filter:drop-shadow(0 2px 0 rgba(255,255,255,.3)) drop-shadow(0 16px 36px color-mix(in srgb,var(--a) 70%,transparent)) drop-shadow(0 26px 60px color-mix(in srgb,var(--a5) 40%,transparent))}
  #intro .nw4 .lh .eyebrow{background:linear-gradient(100deg,color-mix(in srgb,var(--a5) 60%,transparent),color-mix(in srgb,var(--a) 70%,transparent),color-mix(in srgb,var(--a3) 60%,transparent))}
  /* glass tiles: a deeper slab, a top bevel and a lit icon tile */
  #intro .nw4 .it:not(.hero){background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.03) 40%,transparent 70%),radial-gradient(80% 90% at 100% 100%,color-mix(in srgb,var(--a3) 26%,transparent),transparent 70%),rgba(10,10,30,.66)}
  #intro .nw4 .it .k,#intro .fin4 .ask .k{box-shadow:inset 0 1.5px 0 rgba(255,255,255,.75),inset 0 -8px 14px rgba(0,0,0,.18),inset 0 8px 12px -6px rgba(255,255,255,.35),0 0 0 3px color-mix(in srgb,var(--a) 22%,transparent),0 12px 28px color-mix(in srgb,var(--a) 65%,transparent)}
  #intro .fin4 .ask{background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.03) 40%,transparent 70%),radial-gradient(60% 120% at 0% 0%,color-mix(in srgb,#ff8a3d 26%,transparent),transparent 70%),rgba(8,8,26,.72)}

  #intro .nebc{position:absolute;inset:0;opacity:0;pointer-events:none;display:grid;place-items:center;overflow:hidden}
  #intro .nebc .nebi{width:150vmax;height:150vmax;flex:none;opacity:1}

  /* ---- 4.1: the speed and AI cut. Light is cheap here: soft glows are radial gradients (never a live blur), beams
     and wipes move with transform, and the big type moments stack on real depth (translateZ in the stage's
     perspective) so the camera can fly through them. */
  #intro .halo{filter:none;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 42%,transparent),color-mix(in srgb,var(--a3) 20%,transparent) 50%,transparent 78%)}
  #intro .leak{filter:none}
  #intro .flare{filter:none}
  #intro .logo .mirror{filter:none;opacity:.1}
  #intro .glassf::after{filter:none;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 40%,transparent),transparent 80%)}
  /* a key light: one wide diagonal beam that crosses the frame on the biggest beats */
  #intro .beam{position:absolute;left:50%;top:-30%;width:46vw;height:160%;margin-left:-23vw;z-index:5;pointer-events:none;opacity:0;transform:translateX(-120vw) rotate(18deg);
    background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--hi) 16%,transparent) 30%,rgba(255,255,255,.22) 50%,color-mix(in srgb,var(--hi3) 16%,transparent) 70%,transparent)}
  /* a light curtain: a bright edge with ink behind it slides off the type, uncovering it */
  #intro .wipe{position:absolute;inset:-10% -60% -10% -10%;z-index:3;pointer-events:none;transform:translateX(0);
    background:linear-gradient(90deg,#030309 0,#030309 70%,color-mix(in srgb,var(--hi) 90%,#fff) 70.4%,color-mix(in srgb,var(--a) 40%,transparent) 71.5%,transparent 76%)}

  /* the cold open: the time it takes Lumen to open, counted down to one second */
  #intro .speedo{position:absolute;display:flex;flex-direction:column;align-items:center;opacity:0}
  #intro .speedo .sl{font:800 clamp(12px,1.1vw,15px)/1 var(--font);letter-spacing:.5em;text-transform:uppercase;color:color-mix(in srgb,var(--hi) 85%,transparent);margin:0 0 .6em .5em}
  #intro .speedo .sn{position:relative;display:flex;align-items:flex-start;font:800 clamp(190px,30vw,440px)/.86 ${HEAD};letter-spacing:-.065em;font-variant-numeric:tabular-nums;white-space:nowrap}
  #intro .speedo .cn{display:inline-block;padding:0 .04em .07em;background:linear-gradient(180deg,#fff 18%,var(--hi) 62%,var(--hi3));-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.5)}
  #intro .speedo.fin .cn{background:var(--deep);-webkit-background-clip:text;background-clip:text}
  #intro .speedo .su{font:800 .26em/1 ${HEAD};font-style:normal;letter-spacing:-.02em;margin:.2em 0 0 .08em;color:var(--hi)}
  #intro .speedo .glow{position:absolute;left:50%;top:50%;width:150%;height:130%;margin:-65% 0 0 -75%;border-radius:50%;z-index:-1;pointer-events:none;opacity:.7;
    background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 42%,transparent),color-mix(in srgb,var(--a3) 18%,transparent) 55%,transparent)}
  #intro .speedo .sb{position:relative;width:min(560px,56vw);height:6px;border-radius:6px;margin-top:2.2vh;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.12)}
  #intro .speedo .sb i{position:absolute;inset:0;border-radius:6px;transform-origin:0 50%;background:var(--nova);box-shadow:0 0 16px var(--a)}
  #intro .speedo .sb b{position:absolute;top:-24px;font:800 10.5px/1 var(--font);letter-spacing:.3em;text-transform:uppercase;color:rgba(220,226,255,.5);white-space:nowrap}
  #intro .speedo .sb b.o{right:0}#intro .speedo .sb b.n{left:0;color:var(--hi);opacity:0}
  #intro .speedo .sc{margin-top:2.4vh;font:700 clamp(15px,1.5vw,21px)/1.3 var(--font);color:#d3d8f5;opacity:0;text-align:center}
  #intro .speedo .sc em{font-style:normal;font-weight:800;color:#fff}

  /* the tour, 4.1: speed and Lumen AI, live */
  #intro .mw.many .t{width:94px}
  #intro .mw .t.yt b{background:#ff3b30 !important}
  #intro .mw .ptr{position:absolute;left:0;top:0;width:15px;height:21px;z-index:9;pointer-events:none;opacity:0;background:#16171f;clip-path:polygon(0 0,0 100%,30% 72%,55% 100%,70% 92%,47% 66%,85% 66%);
    filter:drop-shadow(0 0 0 #fff)}
  #intro .mw .ptr::after{content:'';position:absolute;inset:2px 3px 4px 2px;background:#fff;clip-path:inherit;opacity:0}
  #intro .mw .tap{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;pointer-events:none;opacity:0;border:2px solid var(--a);box-shadow:0 0 14px color-mix(in srgb,var(--a) 70%,transparent);z-index:8}
  /* open in a second: a stopwatch and a race between 4.0 and 4.1 */
  #intro .mw .race{position:absolute;left:50%;top:52%;width:62%;margin:-86px 0 0 -31%;padding:16px 20px 16px;border-radius:24px;box-sizing:border-box;z-index:2}
  #intro .mw .race .hd{display:flex;align-items:center;gap:10px;font:800 10px/1 system-ui;letter-spacing:.22em;text-transform:uppercase;color:#6d7080}
  #intro .mw .race .hd i{width:22px;height:22px;border-radius:8px;display:grid;place-items:center;color:#fff;background:var(--nova);box-shadow:0 4px 12px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .mw .race .hd i svg{width:12px;height:12px}
  #intro .mw .race .wt{display:flex;align-items:baseline;gap:4px;margin:8px 0 10px;font:800 46px/1 ${HEAD};letter-spacing:-.045em;color:#14151c;font-variant-numeric:tabular-nums}
  #intro .mw .race .wt small{font:800 18px/1 ${HEAD};color:#8a8d9c;letter-spacing:-.02em}
  #intro .mw .race .ok{margin-left:auto;align-self:center;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 11px;border-radius:999px;font:800 11.5px system-ui;color:#0f9f74;background:rgba(18,184,134,.13);box-shadow:inset 0 0 0 1px rgba(18,184,134,.28);opacity:0}
  #intro .mw .race .ok svg{width:12px;height:12px}
  #intro .mw .race .rr{display:grid;grid-template-columns:62px 1fr 44px;align-items:center;gap:10px;margin-top:8px;font:750 11px system-ui;color:#4a4d5e}
  #intro .mw .race .rr em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums;color:#8a8d9c}
  #intro .mw .race .rr s{position:relative;height:9px;border-radius:6px;background:#eceef5;overflow:hidden;text-decoration:none}
  #intro .mw .race .rr s i{position:absolute;inset:0;border-radius:6px;transform-origin:0 50%;transform:scaleX(0);background:#c9ccd8}
  #intro .mw .race .rr.nw{color:#14151c}#intro .mw .race .rr.nw em{color:color-mix(in srgb,var(--a) 80%,#000);font-weight:800}
  #intro .mw .race .rr.nw s i{background:var(--nova);box-shadow:0 0 10px color-mix(in srgb,var(--a) 60%,transparent)}
  #intro .mw .race .chip4{display:inline-flex;align-items:center;gap:6px;margin-top:12px;height:24px;padding:0 10px;border-radius:999px;font:750 10.5px system-ui;color:#3a3d4c;background:color-mix(in srgb,var(--a) 9%,#fff);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 20%,transparent);opacity:0}
  #intro .mw .race .chip4 svg{width:11px;height:11px;color:var(--a)}
  /* results as you type */
  #intro .mw .cmdp .ms{margin-left:auto;height:22px;padding:0 9px;border-radius:999px;display:inline-flex;align-items:center;font:800 10.5px system-ui;color:#0f9f74;background:rgba(18,184,134,.12);box-shadow:inset 0 0 0 1px rgba(18,184,134,.26);font-variant-numeric:tabular-nums;opacity:0}
  #intro .mw .cmdp .qt{white-space:pre}
  #intro .mw .cmdp .r b{font-weight:750;color:#14151c}
  #intro .mw .cmdp .r .ic4{width:18px;height:18px;border-radius:6px;flex:none;display:grid;place-items:center;color:#fff;font:800 9.5px system-ui;font-style:normal}
  /* Ask Lumen: a chat per tab, with sources */
  #intro .mw .side.ask4{width:44%;display:flex;flex-direction:column}
  #intro .mw .side.ask4 .ah .mdl{margin-left:auto;height:20px;padding:0 8px;border-radius:999px;display:inline-flex;align-items:center;font:800 10px system-ui;letter-spacing:.02em;color:color-mix(in srgb,var(--a) 75%,#000);background:color-mix(in srgb,var(--a) 13%,#fff);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 24%,transparent)}
  #intro .mw .side .qb{align-self:flex-end;max-width:80%;margin:0 12px 10px;padding:8px 12px;border-radius:15px 15px 4px 15px;color:#fff;font:650 11.5px/1.4 system-ui;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 6px 16px -4px color-mix(in srgb,var(--a) 55%,transparent);opacity:0}
  #intro .mw .side.ask4 p{margin:0 14px 8px;min-height:0}
  #intro .mw .side .ct{display:inline-grid;place-items:center;min-width:15px;height:15px;padding:0 3px;margin:0 1px;border-radius:5px;vertical-align:1px;font:800 9.5px/1 system-ui;color:#fff;background:var(--nova);box-shadow:0 2px 6px color-mix(in srgb,var(--a) 45%,transparent);box-sizing:border-box}
  #intro .mw .side .acts{display:flex;gap:6px;margin:auto 12px 12px;opacity:0}
  #intro .mw .side .acts span{height:24px;padding:0 10px;border-radius:999px;display:inline-flex;align-items:center;font:750 10.5px system-ui;color:#3a3d4c;background:rgba(255,255,255,.8);box-shadow:inset 0 0 0 1px rgba(20,24,60,.09)}
  #intro .mw .side .acts span.stp{color:#fff;background:#1c1d24}
  #intro .mw .scr{position:relative}
  #intro .mw .psg{position:relative;max-width:50%;margin:12px 0;padding:8px 10px;border-radius:10px;font:600 12.5px/1.5 system-ui;color:#2b2d36}
  #intro .mw .psg mark{position:absolute;inset:0;border-radius:10px;background:color-mix(in srgb,var(--a) 16%,#fff);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--a) 55%,transparent),0 0 0 5px color-mix(in srgb,var(--a) 12%,transparent),0 10px 24px -8px color-mix(in srgb,var(--a) 50%,transparent);opacity:0}
  #intro .mw .psg span{position:relative}
  /* Cmd K, with a plan */
  #intro .mw .cmdp .plan{margin:2px 8px 6px;padding:12px 14px;border-radius:16px;opacity:0;
    background:radial-gradient(80% 140% at 0% 0%,color-mix(in srgb,var(--a) 16%,transparent),transparent 70%),rgba(255,255,255,.72);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--a) 20%,transparent)}
  #intro .mw .cmdp .plan .ph{display:flex;align-items:center;gap:8px;font:800 10px/1 system-ui;letter-spacing:.18em;text-transform:uppercase;color:color-mix(in srgb,var(--a) 75%,#000)}
  #intro .mw .cmdp .plan .ph i{width:18px;height:18px;border-radius:6px;background:var(--nova);box-shadow:0 0 10px color-mix(in srgb,var(--a) 50%,transparent)}
  #intro .mw .cmdp .plan b{display:block;margin:8px 0 8px;font:800 15px/1.2 ${HEAD};letter-spacing:-.02em;color:#14151c}
  #intro .mw .cmdp .plan .chs{display:flex;gap:6px;flex-wrap:wrap}
  #intro .mw .cmdp .plan .chs span{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px 0 6px;border-radius:999px;font:700 10.5px system-ui;color:#3a3d4c;background:#fff;box-shadow:inset 0 0 0 1px rgba(20,24,60,.08)}
  #intro .mw .cmdp .plan .chs span i{width:11px;height:11px;border-radius:4px;background:#ff3b30}
  #intro .mw .cmdp .plan .pb{display:flex;gap:8px;margin-top:11px}
  #intro .mw .cmdp .plan .pb span{height:28px;padding:0 14px;border-radius:999px;display:inline-flex;align-items:center;font:800 11.5px system-ui;color:#3a3d4c;background:rgba(255,255,255,.9);box-shadow:inset 0 0 0 1px rgba(20,24,60,.09)}
  #intro .mw .cmdp .plan .pb span.dn{color:#fff;background:var(--nova);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 6px 16px -4px color-mix(in srgb,var(--a) 60%,transparent)}
  /* select text for a bubble */
  #intro .mw .tx4{font:600 13.5px/1.75 system-ui;color:#2b2d36;margin-top:6px}
  #intro .mw .tx4 .sel{position:relative;white-space:nowrap}
  #intro .mw .tx4 .sel::before{content:'';position:absolute;left:-2px;right:-2px;top:1px;bottom:1px;border-radius:4px;background:color-mix(in srgb,var(--a) 26%,#fff);transform-origin:0 50%;transform:scaleX(var(--s,0));transition:transform .5s cubic-bezier(.3,1.1,.5,1)}
  #intro .mw .tx4 .sel span{position:relative}
  #intro .mw .bub{position:absolute;left:0;top:0;display:flex;gap:3px;padding:4px;border-radius:14px;opacity:0;z-index:3;white-space:nowrap;transform-origin:50% 100%}
  #intro .mw .bub span{height:26px;padding:0 9px;border-radius:10px;display:inline-flex;align-items:center;gap:5px;font:750 10.5px system-ui;color:#2b2d36;transition:background .25s,color .25s}
  #intro .mw .bub span:first-child{padding-left:6px}
  #intro .mw .bub span:first-child i{width:16px;height:16px;border-radius:5px;background:var(--nova)}
  #intro .mw .bub span.on{color:#fff;background:var(--nova);box-shadow:0 4px 12px -2px color-mix(in srgb,var(--a) 60%,transparent)}
  #intro .mw .ans{position:absolute;left:24px;right:24px;bottom:16px;padding:12px 14px;border-radius:18px;opacity:0;z-index:2}
  #intro .mw .ans .ah2{display:flex;align-items:center;gap:8px;font:800 10px/1 system-ui;letter-spacing:.18em;text-transform:uppercase;color:color-mix(in srgb,var(--a) 75%,#000);margin-bottom:6px}
  #intro .mw .ans .ah2 i{width:16px;height:16px;border-radius:5px;background:var(--nova)}
  #intro .mw .ans p{margin:0;font:600 12px/1.5 system-ui;color:#2b2d36;min-height:36px}

  /* the numbers: four figures that land at different depths, then the camera flies through them */
  #intro .wall{position:relative;width:min(1180px,92vw);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(12px,2vw,30px);transform-style:preserve-3d}
  #intro .wall .fig{position:relative;text-align:left;opacity:0;transform-style:preserve-3d;padding:0 0 0 2px}
  #intro .wall .fig .n{display:block;font:800 clamp(72px,9.6vw,150px)/.9 ${HEAD};letter-spacing:-.06em;white-space:nowrap;padding:0 .04em .08em 0;
    background:var(--deep);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.45)}
  #intro .wall .fig .n small{font-size:.42em;letter-spacing:-.02em;margin-left:.06em}
  #intro .wall .fig .r{display:block;width:100%;height:2px;margin:8px 0 12px;border-radius:2px;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,var(--hi),var(--hi3),transparent)}
  #intro .wall .fig .lb{display:block;font:700 clamp(13px,1.25vw,17px)/1.35 var(--font);color:#d3d8f5;opacity:0}
  #intro .wall .fig .lb b{display:block;color:#fff;font-weight:800;font-size:1.06em}
  #intro .wall .fig .gw{position:absolute;left:-30%;top:-40%;width:160%;height:150%;border-radius:50%;z-index:-1;pointer-events:none;opacity:.55;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 34%,transparent),transparent)}
  #intro .wall .fig:nth-child(even) .gw{background:radial-gradient(closest-side,color-mix(in srgb,var(--a3) 34%,transparent),transparent)}
  #intro .wkick{position:absolute;top:calc(var(--bar) + 7vh);left:0;right:0;text-align:center;font:800 clamp(12px,1.1vw,15px)/1 var(--font);letter-spacing:.5em;text-transform:uppercase;color:color-mix(in srgb,var(--hi) 85%,transparent);opacity:0}
  @media (max-width:900px){#intro .wall{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:5vh}}
  /* the tour caption draws a hairline under its title */
  #intro .tourcap .hr{display:block;width:100%;max-width:320px;height:2px;margin:0 0 14px;border-radius:2px;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,var(--hi5),var(--hi),var(--hi3),transparent)}
  @media (max-width:1099px){#intro .tourcap .hr{margin:0 auto 10px}}
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
      // a trailer cut: a bright stacked chord, a soft round thump under it and a quick breath of air
      hit(i = 0) {
        if (!ac) return
        const t = ac.currentTime, root = [60, 62, 65, 67][i % 4]
        ;[0, 7, 12, 16].forEach((n, j) => bell(NOTE(root + n + 12), t + j * .012, { vol: .05, dur: 1.3, wet: .4 }))
        const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + .22)
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + .35)
        o.connect(g); out(g, .05); o.start(t); o.stop(t + .4)
        air(t, .35, { from: 5200, to: 1800, vol: .03, q: 1 })
      },
      // the count: each number one step higher
      count(i) { if (!ac) return; const t = ac.currentTime; bell(NOTE([67, 71, 74, 79][i % 4]), t, { vol: .07, dur: .9, wet: .35 }); pluck(NOTE([55, 59, 62, 67][i % 4]), t, .06) },
      fadeOut(sec = 1.2) {
        if (!ac) return
        const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + sec)
        setTimeout(() => { try { padNodes.forEach(o => o.stop()); ac.close() } catch {} ac = null; padNodes = [] }, sec * 1000 + 200)
      },
      toggleMute() { if (!ac) return muted; muted = !muted; master.gain.setTargetAtTime(muted ? 0 : .8, ac.currentTime, .1); return muted },
    }
  })()

  let skip = false, still = false, root, cv, cx, raf, W = 0, H = 0, t0 = 0, total = 1, HUE = 228, defs = null, lensN = 0, lensCache = {}, sprite = null, frameN = 0
  // waits on the clock, not on frames, so the cuts stay on the beat even when a slow machine drops frames;
  // Skip and Escape end every wait at once
  const sleep = ms => new Promise(r => { const s = performance.now(); if (skip || ms <= 0) return r(); const id = setInterval(() => { if (skip || performance.now() - s >= ms - 2) { clearInterval(id); r() } }, Math.max(8, Math.min(40, ms / 4))) })
  // every motion goes through here: a lively, toned-down spring curve, or instant when Motion is Off or reduced motion is on
  // Big pieces (title cards, frames, whole scenes) move with transform and opacity only: an animated blur or
  // drop-shadow filter on something that large is repainted every frame and drops frames on a MacBook Air.
  const BIG = 90000
  // 4.0: every motion in the film is transform and opacity only, so it all runs on the compositor. Filter and
  // letter-spacing keyframes (which repaint or re-lay-out text every frame) are dropped here, whatever asked for them.
  const noFilter = kf => kf.map(f => { if (!('filter' in f) && !('letterSpacing' in f)) return f; const g = { ...f }; delete g.filter; delete g.letterSpacing; return g })
  const anim = (el, kf, o) => el.animate(noFilter(kf), { fill: 'forwards', easing: 'cubic-bezier(.3,1.22,.5,1)', ...o, ...(still ? { duration: 1, delay: 0 } : {}) })
  const tween = (obj, key, to, ms, ease = k => 1 - Math.pow(1 - k, 3)) => new Promise(r => { const from = obj[key], s = performance.now(); const f = () => { const k = still ? 1 : Math.min(1, (performance.now() - s) / ms); obj[key] = from + (to - from) * ease(k); if (k < 1 && !skip) requestAnimationFrame(f); else { obj[key] = to; r() } }; f() })
  const inout = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
  const words = (el, text, delay = 0, step = 60, blur = true) => {
    el.innerHTML = ''
    text.split(' ').forEach((w, i) => {
      const s = document.createElement('span'); s.className = 'w'; s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(' '))
      anim(s, [{ opacity: 0, transform: 'translateY(16px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 1000, delay: delay + i * step })
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
  // Off in the film: the film moves under every piece of glass, so a displacement lens would be recomputed every
  // frame (and on macOS it can fall back to the CPU). Plain frosted glass from CSS is used instead.
  const LENS_IN_FILM = false
  function lens(el, o = {}) {
    if (still || !el || !defs || el.dataset.lens) return
    if (!LENS_IN_FILM) { el.dataset.lens = 'faux'; return }   // 4.0: no live blur over moving content; the glass is drawn (see .glass)
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
  let bokeh = [], stars = [], caus = [], nebula = null, dofShown = -1, lastNow = 0, bokehSprites = {}, raySprite = null, nebEl = null, nebOp = -1
  function size() {
    const scale = Math.min(1, devicePixelRatio || 1) * (innerWidth * innerHeight > 1200000 ? .6 : .75)   // the sky is soft light: below screen resolution it looks the same and costs a fraction
    const r = cv.getBoundingClientRect(); W = Math.round(r.width) || innerWidth + 80; H = Math.round(r.height) || innerHeight + 80
    cv.width = Math.round(W * scale); cv.height = Math.round(H * scale)
    cx.setTransform(scale, 0, 0, scale, 0, 0)
  }
  const starBuckets = Array.from({ length: 12 }, () => [])
  const newStar = (far = true) => ({ x: (Math.random() - .5) * 2, y: (Math.random() - .5) * 2, z: far ? Math.random() * .9 + .1 : 1, pz: 0, c: Math.random() < .3 ? (Math.random() < .4 ? 2 : 1) : 0 })
  // a nebula painted once: soft clouds along a few curling arms, in the accent and its two neighbours on the color wheel
  function paintNebula() {
    const c = document.createElement('canvas'); c.width = c.height = 640
    const g = c.getContext('2d'); g.globalCompositeOperation = 'lighter'
    for (const [h, a0] of [[HUE, 0], [HUE + 40, 1.3], [HUE + 95, 2.6], [HUE - 62, 3.9], [HUE + 175, 5.2]]) {
      for (let i = 0; i < 170; i++) {
        const k = i / 170, ang = a0 + k * 3.4, rad = 40 + k * 240 + Math.sin(k * 9) * 30
        const x = 320 + Math.cos(ang) * rad + (Math.random() - .5) * 70, y = 320 + Math.sin(ang) * rad * .62 + (Math.random() - .5) * 60
        const r = 18 + Math.random() * 70 * (1 - k * .5), gr = g.createRadialGradient(x, y, 0, x, y, r)
        // deep, saturated light: low lightness so five arms added together stay rich instead of washing out to white
        const al = (.028 + Math.random() * .042) * (1 - k * .6) * (h === HUE + 175 ? .55 : 1)
        gr.addColorStop(0, `hsla(${h + (Math.random() - .5) * 24},100%,${44 + Math.random() * 12}%,${al})`); gr.addColorStop(1, `hsla(${h},100%,40%,0)`)
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
    // per-frame decays are scaled to real time, so a slow frame never leaves a flash or shake hanging
    const fk = Math.min(6, Math.max(.25, (now - (lastNow || now - 16.7)) / 16.7)); lastNow = now
    // the camera floats: a slow handheld drift plus a little parallax from the pointer
    if (!still) { camera.x += ((camera.px * 26 + Math.sin(t * .13) * 14 + Math.sin(t * .31) * 4) - camera.x) * .035; camera.y += ((camera.py * 16 + Math.cos(t * .11) * 9) - camera.y) * .035 }
    const cxm = W / 2 - camera.x * .35, cym = H / 2 - camera.y * .35, F = Math.max(W, H) * .55, oyc = H / 2 + sky.oy - camera.y * .5, oxc = W / 2 - camera.x * .5
    // the canvas is clear glass over the nebula layer; in the warp it keeps a fading trail of the last frames
    if (sky.warp > .05) { cx.globalCompositeOperation = 'destination-out'; cx.fillStyle = `rgba(0,0,0,${.55 - sky.warp * .35})`; cx.fillRect(0, 0, W, H) }
    else cx.clearRect(0, 0, W, H)
    cx.globalCompositeOperation = 'lighter'
    { const o = Math.round(sky.neb * (1 - sky.warp * .7) * 50) / 50; if (nebEl && o !== nebOp) { nebOp = o; nebEl.style.opacity = o } }
    // the warp tunnel: rings of accent light rushing past the lens, split into three colors at the rim
    if (sky.warp > .12) {
      const M = Math.max(W, H)
      for (let i = 0; i < 9; i++) {
        const f = (t * 1.5 + i / 9) % 1, r = f * f * M * .95
        ;[[-3, HUE - 62], [0, HUE], [3, HUE + 95]].forEach(([o, h]) => {
          cx.strokeStyle = `hsla(${h},100%,74%,${sky.warp * .16 * (1 - f) * (o ? .6 : 1)})`; cx.lineWidth = 1 + f * 5
          cx.beginPath(); cx.ellipse(cxm + o * f * 4, cym, r, r * .64, 0, 0, 6.283); cx.stroke()
        })
      }
    }
    const v = still ? 0 : (.0025 + sky.speed * .004 + sky.warp * .045) * Math.min(fk, 3)
    cx.lineCap = 'round'
    const SB = starBuckets
    for (const p of SB) p.length = 0
    for (const s of stars) {
      s.pz = s.z; s.z -= v
      if (sky.gather > 0) { s.x *= 1 - sky.gather * .06; s.y *= 1 - sky.gather * .06 }
      if (s.z <= .02) { Object.assign(s, newStar(false)); s.pz = s.z; continue }
      const x = cxm + s.x / s.z * F, y = cym + s.y / s.z * F
      if (x < -50 || x > W + 50 || y < -50 || y > H + 50) { Object.assign(s, newStar(false)); s.pz = s.z; continue }
      const px = cxm + s.x / s.pz * F, py = cym + s.y / s.pz * F
      const lv = Math.min(3, Math.floor(Math.min(1, (1 - s.z) * 1.4) * 4))
      SB[s.c * 4 + lv].push(px, py, x + (x === px ? .4 : 0), y)
    }
    for (let k = 0; k < 12; k++) {
      const a = SB[k]; if (!a.length) continue
      const c = Math.floor(k / 4), lv = k % 4
      cx.strokeStyle = c ? `hsla(${c === 2 ? HUE - 62 : HUE + 80},96%,76%,${(lv + 1) / 4})` : `hsla(${HUE},60%,92%,${(lv + 1) / 4})`
      cx.lineWidth = .6 + lv * .6
      cx.beginPath(); for (let i = 0; i < a.length; i += 4) { cx.moveTo(a[i], a[i + 1]); cx.lineTo(a[i + 2], a[i + 3]) } cx.stroke()
    }
    if (sky.rays > .01 && sky.orb > .01) {
      const L = Math.max(W, H) * 1.1
      if (!raySprite) {
        const R = 512, c = document.createElement('canvas'); c.width = c.height = R * 2; const g2 = c.getContext('2d'); g2.translate(R, R); g2.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 18; i++) {
          const a = i / 18 * 6.283, w = .04 + (i % 3) * .025, g = g2.createLinearGradient(0, 0, Math.cos(a) * R, Math.sin(a) * R)
          g.addColorStop(0, `hsla(${HUE + [0, 40, -62, 95][i % 4]},100%,72%,.15)`); g.addColorStop(1, `hsla(${HUE},100%,70%,0)`)
          g2.fillStyle = g; g2.beginPath(); g2.moveTo(0, 0); g2.arc(0, 0, R, a - w, a + w); g2.closePath(); g2.fill()
        }
        raySprite = c
      }
      cx.save(); cx.translate(oxc, oyc); cx.rotate(t * .05); cx.globalAlpha = Math.min(1, sky.rays * sky.orb); cx.drawImage(raySprite, -L, -L, L * 2, L * 2); cx.restore()
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
        // the glass tile around the icon: a rim that is bright at the top, a soft bevel and a sheen across the top half
        const gs = IS * 1.08, gx0 = oxc - gs / 2, gy0 = oyc - gs / 2, gr = gs * .24
        cx.save(); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = sky.orb
        const rim = cx.createLinearGradient(0, gy0, 0, gy0 + gs); rim.addColorStop(0, 'rgba(255,255,255,.95)'); rim.addColorStop(.45, 'rgba(255,255,255,.18)'); rim.addColorStop(1, `hsla(${HUE - 62},100%,75%,.7)`)
        cx.strokeStyle = rim; cx.lineWidth = Math.max(1.5, IS * .025); cx.beginPath(); cx.roundRect(gx0, gy0, gs, gs, gr); cx.stroke()
        const sh = cx.createLinearGradient(0, gy0, 0, gy0 + gs * .5); sh.addColorStop(0, 'rgba(255,255,255,.34)'); sh.addColorStop(1, 'rgba(255,255,255,0)')
        cx.fillStyle = sh; cx.beginPath(); cx.roundRect(gx0 + 2, gy0 + 2, gs - 4, gs * .5, [gr, gr, gr * .3, gr * .3]); cx.fill(); cx.restore()
      }
    }
    // caustics: the glass frame focuses light into a shimmering pool on the floor below it, and sparks drift up out of it
    if (sky.caus > .01 && sprite) {
      const fw = Math.min(720, innerWidth * .72) + 28, fh = Math.min(396, innerHeight * .44) + 28
      const px0 = W / 2 + (innerWidth >= 1100 ? innerWidth * .15 : 0) - camera.x * .55, py0 = 40 + innerHeight * .44 + fh / 2 + 34 - camera.y * .55
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
      w.r += (Math.max(W, H) * 1.1 - w.r) * (1 - Math.pow(1 - .045, fk)); w.a *= Math.pow(.955, fk)
      cx.strokeStyle = `hsla(${HUE},90%,85%,${w.a})`; cx.lineWidth = 2 + w.a * 10
      cx.beginPath(); cx.arc(cxm, cym, w.r, 0, 6.283); cx.stroke()
    }
    sky.shock = sky.shock.filter(w => w.a > .01)
    if (sky.bokeh > .01) {
      for (const b of bokeh) {
        const x = (b.x + Math.sin(t * b.sx + b.p) * .04) * W - camera.x * 1.4, y = (b.y + Math.cos(t * b.sy + b.p) * .03) * H - (t * b.v % 1.4) * H * .08 - camera.y * 1.4
        let sp = bokehSprites[b.h]
        if (!sp) {
          sp = bokehSprites[b.h] = document.createElement('canvas'); sp.width = sp.height = 160; const g2 = sp.getContext('2d'), g = g2.createRadialGradient(80, 80, 0, 80, 80, 80)
          g.addColorStop(0, `hsla(${HUE + b.h},90%,78%,.15)`); g.addColorStop(.72, `hsla(${HUE + b.h},90%,72%,.1)`); g.addColorStop(.86, `hsla(${HUE + b.h},95%,84%,.2)`); g.addColorStop(1, `hsla(${HUE + b.h},90%,70%,0)`)
          g2.fillStyle = g; g2.fillRect(0, 0, 160, 160)
        }
        cx.globalAlpha = b.a * sky.bokeh; cx.drawImage(sp, x - b.r, y - b.r, b.r * 2, b.r * 2); cx.globalAlpha = 1
      }
    }
    if (sky.flash > .01) { cx.globalCompositeOperation = 'source-over'; cx.fillStyle = `rgba(240,243,255,${sky.flash})`; cx.fillRect(0, 0, W, H); sky.flash *= Math.pow(.9, fk) }
    // depth of field: the sky goes soft behind the shot in focus
    const d = Math.round(sky.dof * 4) / 4
    if (d !== dofShown) { dofShown = d }   // no live blur filter on the full-screen canvas: it costs every frame
    // the glint on every piece of glass follows the pointer, and drifts on its own when the pointer is still
    frameN++
    if (false) { root.style.setProperty('--gx', (50 + camera.px * 80 + Math.sin(t * .37) * 26).toFixed(1) + '%'); root.style.setProperty('--gy', (26 + camera.py * 50 + Math.cos(t * .29) * 14).toFixed(1) + '%') }
    // the rig: stage and nebula drift at their own depth, plus a push-in, a crane, a roll and any camera shake
    const camEl = root.querySelector('.cam'), stage = root.querySelector('.stage'), nebw = root.querySelector('.nebw')
    let sx = 0, sy = 0
    if (sky.shake > .2) { sx = (Math.random() - .5) * sky.shake; sy = (Math.random() - .5) * sky.shake; sky.shake *= Math.pow(.9, fk) }
    camEl.style.transform = sx || sy ? `translate3d(${sx}px,${sy}px,0)` : ''
    // whole pixels for the stage so text stays crisp; the push-in scales the sky behind it, not the words
    const roll = Math.abs(camera.roll) > .01 ? ` rotate(${camera.roll.toFixed(3)}deg)` : ''
    stage.style.transform = `translate3d(${Math.round(-camera.x * .55)}px,${Math.round(-camera.y * .55 + camera.lift)}px,0)${roll}`
    const z = (camera.push ? `scale(${(1 + camera.push * 2.2).toFixed(4)})` : '') + (roll ? ` rotate(${(camera.roll * 1.4).toFixed(3)}deg) translateY(${(camera.lift * .6).toFixed(1)}px)` : camera.lift ? ` translateY(${(camera.lift * .6).toFixed(1)}px)` : '')
    if (cv.style.transform !== z) cv.style.transform = z
    nebw.style.transform = `translate3d(${(-camera.x * .2).toFixed(1)}px,${(-camera.y * .2 + camera.lift * .3).toFixed(1)}px,0) scale(${(1 + camera.push * 1.5).toFixed(4)})`
    const m = root.querySelector('.meter i'); if (m) m.style.transform = `scaleX(${Math.min(1, (now - t0) / total).toFixed(3)})`
    if (frameN % 6 === 0) { const tc = root.querySelector('.hud .tcd span'), e = Math.max(0, now - t0) / 1000; if (tc) tc.textContent = [0, Math.floor(e / 60), Math.floor(e % 60), Math.floor(e * 24 % 24)].map(n => String(n).padStart(2, '0')).join(':') }
    if (!held) raf = requestAnimationFrame(draw)   // a held frame stays on screen without redrawing
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
  // three saturated bands of color cut across the frame, one after another
  function slabs(ms = 620) {
    if (still || skip || !root) return
    root.querySelectorAll('.slabs i').forEach((el, i) => el.animate([{ transform: 'translateX(-160%) skewX(-16deg)' }, { transform: 'translateX(420%) skewX(-16deg)' }], { duration: ms, delay: i * 70, easing: 'cubic-bezier(.6,0,.3,1)' }))
  }
  // the key light: a wide soft beam crosses the frame once (transform and opacity only)
  function beam(ms = 1000) {
    if (still || skip || !root) return
    root.querySelector('.beam').animate([{ opacity: 0, transform: 'translateX(-90vw) rotate(18deg)' }, { opacity: 1, offset: .35 }, { opacity: 1, offset: .65 }, { opacity: 0, transform: 'translateX(90vw) rotate(18deg)' }], { duration: ms, easing: 'cubic-bezier(.45,0,.3,1)' })
  }
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
  // the score has a pulse, and every cut of the trailer lands on it
  const BEAT = 520
  const SPLIT = (k, a = .8) => `drop-shadow(${-k}px 0 0 rgba(255,60,120,${a})) drop-shadow(${k}px 0 0 rgba(60,170,255,${a}))`
  // a title card slams in: from big, soft and split into colours, to sharp and still
  const slamIn = (el, { from = 1.5, ms = 560, k = 16 } = {}) => anim(el, [
    { opacity: 0, transform: `scale(${from})`, filter: `blur(16px) ${SPLIT(k)}` },
    { opacity: 1, transform: 'scale(1.045,.94)', filter: `blur(0) ${SPLIT(2, .4)}`, offset: .42 },
    { opacity: 1, transform: 'scale(.985,1.025)', offset: .66 },
    { opacity: 1, transform: 'scale(1.005,.995)', offset: .84 },
    { opacity: 1, transform: 'scale(1)', filter: `blur(0) ${SPLIT(0, 0)}` }], { duration: ms * 1.25, easing: 'cubic-bezier(.2,.9,.3,1)' })
  const cutOut = (el, ms = 170) => anim(el, [{ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.92)', filter: 'blur(8px)' }], { duration: ms, easing: 'cubic-bezier(.5,0,.8,.4)' })
  // a hard cut between two title cards: the old one is simply gone on the beat, the way a trailer cuts
  const hardCut = el => { el.getAnimations().forEach(x => x.cancel()); el.style.opacity = '0' }
  const pop = (a, shake = 0) => { if (still || skip) return; sky.flash = Math.max(sky.flash, a); sky.shake = Math.max(sky.shake, shake); if (a >= .1) flare(Math.min(1, a * 3)) }
  const IC = n => ICONS[n] || ''
  // a giant outline echo of a title: it lands with the card and keeps growing past the frame as it fades
  const echo = (el, text, { from = .82, to = 1.22, a = .5, ms = BEAT * 1.8 } = {}) => {
    if (!el || still) return
    el.textContent = text
    anim(el, [{ opacity: 0, transform: `scale(${from})` }, { opacity: a, transform: 'scale(1)', offset: .22 }, { opacity: 0, transform: `scale(${to})` }], { duration: ms, easing: 'cubic-bezier(.16,1,.3,1)' })
  }

  // the cold open, cut like a trailer: three title cards on the beat, a beat of black, then the time Lumen takes to
  // open counts down from 4 seconds and slams into 1
  async function coldOpen() {
    const cards = ['<em>Faster.</em>', 'Smarter.', '<em>Smoother.</em>']
    const s = scene(`<div class="title trailer"><div class="echo"></div><div class="pre">A Lumen picture</div>${cards.map(c => `<div class="tc">${c}</div>`).join('')}<div class="speedo"><i class="glow"></i><div class="sl">Time to open Lumen</div><div class="sn"><span class="cn">4.0</span><i class="su">s</i></div><div class="sb"><i></i><b class="o">Lumen 4.0</b><b class="n">Lumen ${FILM_V}</b></div><div class="sc">About <em>four times quicker</em> to open.</div></div><i class="cring"></i><div class="slate">Lumen ${FILM_V}   The trailer</div></div>`)
    const ech = s.querySelector('.echo'), pre = s.querySelector('.pre'), tcs = s.querySelectorAll('.tc'), sp = s.querySelector('.speedo'), cn = s.querySelector('.cn'), ring = s.querySelector('.cring'), bar = s.querySelector('.sb i')
    anim(pre, [{ opacity: 0, transform: 'scale(1.2)' }, { opacity: 1, transform: 'none' }], { duration: 1100, easing: 'cubic-bezier(.16,1,.3,1)' })
    anim(s.querySelector('.slate'), [{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 200 })
    sky.speed = .2; tween(sky, 'neb', .3, 2400); crane(18, -1, 2600)
    await sleep(420)
    anim(pre, [{ opacity: 1 }, { opacity: 0 }], { duration: 260 })
    for (let i = 0; i < tcs.length && !skip; i++) {
      if (i) hardCut(tcs[i - 1])
      slamIn(tcs[i]); echo(ech, tcs[i].textContent); SFX.hit(i); pop(.12, 3); if (i === 2) beam(900)
      await sleep(BEAT)
    }
    hardCut(tcs[tcs.length - 1])
    // a beat of black: only a thin line of light, then the count
    flare(.7); await sleep(BEAT * .8)
    anim(sp, [{ opacity: 0, transform: 'translateZ(-300px)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)' })
    const steps = ['4.0', '3.0', '2.0']
    for (let i = 0; i < steps.length && !skip; i++) {
      cn.textContent = steps[i]; echo(ech, steps[i] + 's', { a: .25, ms: BEAT * 1.2 })
      anim(cn, [{ opacity: 0, transform: 'scale(1.25) translateY(12px)' }, { opacity: .5 + i * .15, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' })
      anim(bar, [{ transform: `scaleX(${1 - i * .25 + .04})` }, { transform: `scaleX(${1 - i * .25})` }], { duration: 300 })
      anim(ring, [{ opacity: .6, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.5)' }], { duration: 620, easing: 'cubic-bezier(.2,.8,.3,1)' })
      SFX.count(i)
      await sleep(BEAT * .64)
    }
    if (!skip) {
      // one second slams in: flash, shake, shockwave, color slabs, and the bar snaps short on a spring
      cn.textContent = '1.0'; sp.classList.add('fin')
      ech.classList.add('fill', 'mega'); echo(ech, '1s', { from: .6, to: 1.5, a: .55, ms: 1500 })
      anim(cn, [{ opacity: 0, transform: 'scale(2.6)' }, { opacity: 1, transform: 'scale(1.06,.92)', offset: .45 }, { transform: 'scale(.97,1.04)', offset: .66 }, { transform: 'scale(1.01,.99)', offset: .84 }, { opacity: 1, transform: 'none' }], { duration: 900, easing: 'cubic-bezier(.2,.9,.3,1)' })
      anim(bar, [{ transform: 'scaleX(.5)' }, { transform: 'scaleX(.2)', offset: .5 }, { transform: 'scaleX(.27)', offset: .75 }, { transform: 'scaleX(.25)' }], { duration: 800, easing: 'cubic-bezier(.2,.9,.3,1)' })
      anim(s.querySelector('.sb .o'), [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }); anim(s.querySelector('.sb .n'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 200 })
      anim(s.querySelector('.sc'), [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 260 })
      anim(ring, [{ opacity: 1, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(3.2)' }], { duration: 1100, easing: 'cubic-bezier(.2,.8,.3,1)' })
      boom(); slabs(); beam(1100); SFX.count(3)
      push(.02, 1200)
      await sleep(1500)
    }
    // straight through the number and into the warp
    anim(s, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.4)' }], { duration: 380, easing: 'cubic-bezier(.55,0,.75,.3)' })
    push(0, 380)
    await sleep(380); s.remove()
  }
  async function warp(ms = 2200) {
    sky.oy = 0
    if (!skip) SFX.riser(ms / 1000 + .3)
    tween(sky, 'neb', .2, 900)
    tween(sky, 'warp', 1, ms, k => k * k)
    push(.02, ms)
    await sleep(ms + 100)
    sky.gather = 1
    tween(sky, 'warp', 0, 500); push(0, 500)
    tween(sky, 'orb', 1, 700); tween(sky, 'orbR', 30, 800)
    await sleep(650)
  }
  // ignition: the app icon lights up, and "This is Lumen 4.0" lands letter by letter, the number last and hardest
  async function ignite({ short = false } = {}) {
    boom()
    root.classList.add('lit')
    tween(sky, 'ring', 1, 1500); tween(sky, 'rays', 1, 1800); tween(sky, 'ghosts', 1, 1600); tween(sky, 'neb', .85, 2400)
    sky.gather = 0
    stars.forEach(s => { s.x = (Math.random() - .5) * 2; s.y = (Math.random() - .5) * 2; s.z = Math.random() * .9 + .1 })
    sky.speed = .25
    const L = 'Lumen'.split('').map(c => `<span>${c}</span>`).join('')
    beam(1400)
    const s = scene(`<div class="echo fill mega ig"></div><div style="text-align:center;position:relative;margin-top:7vh"><div class="kicker chrome">${short ? 'Fresh from an update' : 'This is'}</div><div class="logo">${L}<b class="v4">${FILM_V}</b><i class="glint" aria-hidden="true">Lumen<i class="gv">${FILM_V}</i></i><div class="mirror" aria-hidden="true">${L}<b class="v4">${FILM_V}</b></div><i class="drop"></i></div><div class="rule"></div><div class="tag"></div></div>`)
    const logo = s.querySelector('.logo'), drop = logo.querySelector('.drop'), D = Math.round(logo.offsetHeight * 1.3)
    drop.style.width = drop.style.height = D + 'px'; lensAll(s)
    tween(sky, 'orbR', 24, 1400); tween(sky, 'oy', -Math.min(H * .3, 250), 1800, k => 1 - Math.pow(1 - k, 4))
    const ig = s.querySelector('.ig'); if (!still) { ig.textContent = FILM_V; anim(ig, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: .55, transform: 'scale(1.02)', offset: .45 }, { opacity: .4, transform: 'scale(1)' }], { duration: 2600, delay: 900, easing: 'cubic-bezier(.16,1,.3,1)' }) }
    push(.035, short ? 3000 : 4000)   // a slow dolly in on the title
    crane(60, 2.2, short ? 2600 : 3200)   // while the camera cranes down and levels out
    anim(s.querySelector('.kicker'), [{ opacity: 0, letterSpacing: '1.1em', filter: `blur(6px) ${SPLIT(6, .6)}` }, { opacity: 1, letterSpacing: '.46em', filter: `blur(0) ${SPLIT(0, 0)}` }], { duration: 1600, delay: 250, easing: 'cubic-bezier(.16,1,.3,1)' })
    logo.querySelectorAll(':scope > span').forEach((l, i) => anim(l, [
      { opacity: 0, transform: `translate3d(${(i - 2) * 90}px, ${(i % 2 ? -1 : 1) * 40}px, 600px) rotateY(${(i - 2) * 25}deg) scale(1.6)`, filter: `blur(18px) ${SPLIT(16, .85)}` },
      { opacity: 1, filter: `blur(2px) ${SPLIT(5, .5)}`, offset: .55 },
      { opacity: 1, transform: 'none', filter: `blur(0) ${SPLIT(0, 0)}` }], { duration: 1300, delay: 60 + i * 70, easing: 'cubic-bezier(.16,1,.3,1)' }))
    anim(logo.querySelector('.mirror'), [{ opacity: 0 }, { opacity: .14 }], { duration: 1600, delay: 900 })
    anim(logo, [{ letterSpacing: '.18em' }, { letterSpacing: '-.05em' }], { duration: 2000, easing: 'cubic-bezier(.16,1,.3,1)' })
    // the number lands on the next beat, hard
    const v4 = logo.querySelector(':scope > .v4')
    anim(v4, [{ opacity: 0, transform: 'scale(2.8) translateY(-6%)', filter: `blur(22px) ${SPLIT(20)}` }, { opacity: 1, transform: 'scale(.96)', filter: `blur(0) ${SPLIT(3, .5)}`, offset: .5 }, { opacity: 1, transform: 'none', filter: `blur(0) ${SPLIT(0, 0)}` }], { duration: 760, delay: 1000, easing: 'cubic-bezier(.16,1,.3,1)' })
    setTimeout(() => { if (skip || still) return; SFX.hit(3); pop(.3, 7); sky.shock.push({ r: 10, a: .8 }); flare(.8); slabs(700) }, 1050)
    // 4.1.1: the number leaves two afterimages that blast outward and burn off, like a light hit on film
    setTimeout(() => {
      if (skip || still || !v4.offsetParent) return
      const host = v4.offsetParent
      ;[[1.9, 900, .55], [2.8, 1300, .3]].forEach(([to, ms, o], i) => {
        const gh = v4.cloneNode(true)
        gh.style.cssText = `position:absolute;left:${v4.offsetLeft}px;top:${v4.offsetTop}px;margin:0;pointer-events:none;mix-blend-mode:screen;transform-origin:50% 55%`
        host.appendChild(gh)
        gh.animate([{ opacity: o, transform: 'scale(1)', filter: `blur(0) ${SPLIT(4, .6)}` }, { opacity: 0, transform: `scale(${to})`, filter: `blur(${10 + i * 8}px) ${SPLIT(14, .9)}` }], { duration: ms, delay: i * 90, easing: 'cubic-bezier(.16,1,.3,1)' }).finished.then(() => gh.remove(), () => gh.remove())
      })
    }, 1080)
    anim(logo.querySelector('.mirror .v4'), [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 1300 })
    anim(s.querySelector('.rule'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1500, delay: 1200, easing: 'cubic-bezier(.16,1,.3,1)' })
    // 4.1.5: as the number lands, an anamorphic streak of light cuts across the frame through it and burns off
    setTimeout(() => {
      if (skip || still || !v4.offsetParent) return
      const host = v4.offsetParent, y = v4.offsetTop + v4.offsetHeight * .52, x = v4.offsetLeft + v4.offsetWidth / 2
      const st = document.createElement('i')
      st.style.cssText = `position:absolute;left:${x - 600}px;top:${y - 2}px;width:1200px;height:4px;border-radius:4px;pointer-events:none;mix-blend-mode:screen;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--hi) 70%,transparent) 22%,#fff 50%,color-mix(in srgb,var(--hi3) 70%,transparent) 78%,transparent);box-shadow:0 0 24px 4px color-mix(in srgb,var(--hi) 50%,transparent)`
      host.appendChild(st)
      st.animate([{ opacity: 0, transform: 'scaleX(.05) scaleY(.6)' }, { opacity: 1, transform: 'scaleX(1) scaleY(1.4)', offset: .3 }, { opacity: 0, transform: 'scaleX(1.25) scaleY(.4)' }], { duration: 1100, easing: 'cubic-bezier(.16,1,.3,1)' }).finished.then(() => st.remove(), () => st.remove())
    }, 1040)
    // 4.2: speed. As the number lands, streaks of light shoot out from it in every direction, like the jump to warp
    setTimeout(() => {
      if (skip || still || !v4.offsetParent) return
      const host = v4.offsetParent, cx = v4.offsetLeft + v4.offsetWidth / 2, cy = v4.offsetTop + v4.offsetHeight * .5
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + (i % 2) * .18, len = 90 + (i % 3) * 50
        const st = document.createElement('i')
        st.style.cssText = `position:absolute;left:${cx}px;top:${cy - 1}px;width:${len}px;height:2px;border-radius:2px;pointer-events:none;mix-blend-mode:screen;transform-origin:0 50%;background:linear-gradient(90deg,transparent,${i % 3 ? 'var(--hi)' : '#fff'});transform:rotate(${a}rad)`
        host.appendChild(st)
        st.animate([{ opacity: 0, transform: `rotate(${a}rad) translateX(10px) scaleX(.2)` }, { opacity: .9, transform: `rotate(${a}rad) translateX(${40 + len * .2}px) scaleX(1)`, offset: .35 }, { opacity: 0, transform: `rotate(${a}rad) translateX(${160 + len}px) scaleX(.5)` }], { duration: 900 + (i % 4) * 80, easing: 'cubic-bezier(.16,1,.3,1)' }).finished.then(() => st.remove(), () => st.remove())
      }
    }, 1060)
    // 4.3: Claude in Lumen. A cursor of light flies in from the corner of the frame, taps the number, and the tap
    // sends a ring of light through it (the number gives under the tap on a spring)
    setTimeout(() => {
      if (skip || still || !v4.offsetParent) return
      const host = v4.offsetParent, tx = v4.offsetLeft + v4.offsetWidth * .78, ty = v4.offsetTop + v4.offsetHeight * .62
      const cur = document.createElement('i')
      cur.style.cssText = `position:absolute;left:${tx - 10}px;top:${ty - 10}px;width:50px;height:50px;pointer-events:none;z-index:5;will-change:transform,opacity;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-8 -8 40 40'%3E%3Cdefs%3E%3Cfilter id='g' x='-60%25' y='-60%25' width='220%25' height='220%25'%3E%3CfeGaussianBlur stdDeviation='3.2'/%3E%3C/filter%3E%3C/defs%3E%3Cpath d='M5 3l14 7.2-6.2 1.6L10 18z' fill='%23cfe0ff' filter='url(%23g)'/%3E%3Cpath d='M5 3l14 7.2-6.2 1.6L10 18z' fill='white'/%3E%3C/svg%3E") center/contain no-repeat`
      host.appendChild(cur)
      cur.animate([{ opacity: 0, transform: 'translate(240px,180px) rotate(-14deg) scale(1.3)' }, { opacity: 1, offset: .2 }, { transform: 'translate(0,0) rotate(0) scale(1)', offset: .62 }, { transform: 'scale(.78)', offset: .7 }, { opacity: 1, transform: 'scale(1)', offset: .8 }, { opacity: 0, transform: 'translate(8px,6px) scale(1)' }], { duration: 1500, easing: 'cubic-bezier(.34,1.25,.5,1)' }).finished.then(() => cur.remove(), () => cur.remove())
      setTimeout(() => {
        if (skip || !v4.offsetParent) return
        SFX.hit && SFX.hit(1)
        v4.animate([{ transform: 'none' }, { transform: 'scale(.97) translateY(2px)', offset: .3 }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,1.6,.5,1)', composite: 'add' })
        ;[0, 1, 2].forEach(k => {
          const r = document.createElement('i')
          r.style.cssText = `position:absolute;left:${tx - 30}px;top:${ty - 30}px;width:60px;height:60px;border-radius:50%;pointer-events:none;mix-blend-mode:screen;border:${2 - k * .5}px solid color-mix(in srgb,var(--hi) 70%,#fff);box-shadow:0 0 20px color-mix(in srgb,var(--hi) 60%,transparent)`
          host.appendChild(r)
          r.animate([{ opacity: .95, transform: 'scale(.2)' }, { opacity: 0, transform: `scale(${4 + k * 2.4})` }], { duration: 1000 + k * 260, delay: k * 110, easing: 'cubic-bezier(.16,1,.3,1)' }).finished.then(() => r.remove(), () => r.remove())
        })
      }, 1500 * .66)
    }, 1500)
    // 4.4: the frame lights up. As the number lands, a bead of light races once around the whole edge of the screen,
    // leaving a soft trail, the same edge of light a tab gets while Claude works (transform and opacity only)
    setTimeout(() => {
      if (skip || still) return
      const W = innerWidth, H = innerHeight, P = 2 * (W + H), at = d => d < W ? [d, 0] : d < W + H ? [W, d - W] : d < 2 * W + H ? [W - (d - W - H), H] : [0, H - (d - 2 * W - H)]
      const frame = document.createElement('i')
      frame.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--hi) 55%,transparent),inset 0 0 40px color-mix(in srgb,var(--hi) 25%,transparent);opacity:0'
      root.appendChild(frame)
      frame.animate([{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: .8, offset: .7 }, { opacity: 0 }], { duration: 1500, easing: 'ease-out' }).finished.then(() => frame.remove(), () => frame.remove())
      for (let k = 0; k < 5; k++) {
        const b = document.createElement('i'), sz = 16 - k * 2.5
        b.style.cssText = `position:fixed;left:${-sz / 2}px;top:${-sz / 2}px;width:${sz}px;height:${sz}px;border-radius:50%;pointer-events:none;z-index:7;mix-blend-mode:screen;background:radial-gradient(circle,#fff,color-mix(in srgb,var(--hi) 80%,transparent) 45%,transparent 70%);opacity:${1 - k * .17}`
        root.appendChild(b)
        const frames = []; for (let j = 0; j <= 24; j++) { const [x, y] = at(Math.min(P - 1, j / 24 * P)); frames.push({ transform: `translate(${x}px,${y}px)` }) }
        b.animate(frames, { duration: 1300, delay: k * 34, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'both' }).finished.then(() => b.remove(), () => b.remove())
      }
    }, 1120)
    // 4.4.1: ideas rise. As the title settles, three small glass pills float up past it on staggered springs and
    // dissolve into the light, like the starter tasks waiting in Do it for me (transform and opacity only)
    setTimeout(() => {
      if (skip || still || !logo.offsetParent) return
      const host = logo.offsetParent, cx = logo.offsetLeft + logo.offsetWidth / 2, cy = logo.offsetTop + logo.offsetHeight
      ;[[-150, 64, 0], [0, 88, 140], [150, 70, 280]].forEach(([dx, w, d]) => {
        const p = document.createElement('i')
        p.style.cssText = `position:absolute;left:${cx + dx - w / 2}px;top:${cy + 30}px;width:${w}px;height:20px;border-radius:999px;pointer-events:none;mix-blend-mode:screen;background:linear-gradient(135deg,color-mix(in srgb,var(--hi) 55%,transparent),color-mix(in srgb,var(--hi3) 40%,transparent));box-shadow:inset 0 1px 0 rgba(255,255,255,.6),0 0 18px color-mix(in srgb,var(--hi) 45%,transparent)`
        host.appendChild(p)
        p.animate([{ opacity: 0, transform: 'translateY(30px) scale(.8)' }, { opacity: .9, transform: 'translateY(-10px) scale(1.04)', offset: .35 }, { opacity: .6, transform: 'translateY(-70px) scale(1)', offset: .7 }, { opacity: 0, transform: 'translateY(-130px) scale(.9)' }], { duration: 1500, delay: d, easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'both' }).finished.then(() => p.remove(), () => p.remove())
      })
    }, 1500)
    // 4.4.2: run it back. A ring of light draws itself around the version number like a Run again arrow, its arrowhead
    // riding the tip, then lets go (an SVG stroke drawing on; stroke-dashoffset and opacity only)
    setTimeout(() => {
      if (skip || still || !v4.offsetParent) return
      const host = v4.offsetParent, r = Math.max(v4.offsetWidth, v4.offsetHeight) * .72, cx = v4.offsetLeft + v4.offsetWidth / 2, cy = v4.offsetTop + v4.offsetHeight / 2
      const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg')
      svg.setAttribute('viewBox', `${-r - 12} ${-r - 12} ${2 * r + 24} ${2 * r + 24}`)
      svg.style.cssText = `position:absolute;left:${cx - r - 12}px;top:${cy - r - 12}px;width:${2 * r + 24}px;height:${2 * r + 24}px;pointer-events:none;overflow:visible;mix-blend-mode:screen`
      const L = 2 * Math.PI * r * .86
      const arc = (w, o) => `<circle r="${r}" fill="none" stroke="color-mix(in srgb,var(--hi) 85%,#fff)" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${L} ${2 * Math.PI * r}" stroke-dashoffset="${L}" transform="rotate(-80)"/>`
      svg.innerHTML = arc(9, .22) + arc(2.5, 1)   // a wide faint stroke under a thin bright one: a glow with no filter
      host.appendChild(svg)
      svg.querySelectorAll('circle').forEach(c => c.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 900, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' }))
      svg.animate([{ opacity: 0, transform: 'rotate(-20deg) scale(.92)' }, { opacity: 1, transform: 'none', offset: .25 }, { opacity: 1, offset: .7 }, { opacity: 0, transform: 'rotate(8deg) scale(1.06)' }], { duration: 1500, easing: 'ease-out' }).finished.then(() => svg.remove(), () => svg.remove())
    }, 1900)
    // 4.4.3: the key turns. A thin bar of light slides through the version number at an angle, like light catching a key,
    // leaving it a touch brighter (a clone of the number masked to a moving stripe; transform and opacity only)
    setTimeout(() => {
      if (skip || still || !v4.offsetParent) return
      const host = v4.offsetParent, gl = v4.cloneNode(true)
      gl.style.cssText = `position:absolute;left:${v4.offsetLeft}px;top:${v4.offsetTop}px;margin:0;pointer-events:none;mix-blend-mode:screen;color:#fff;-webkit-text-fill-color:#fff;-webkit-mask:linear-gradient(105deg,transparent 40%,#000 48%,#000 52%,transparent 60%) 0 0/300% 100% no-repeat`
      host.appendChild(gl)
      gl.animate([{ WebkitMaskPosition: '100% 0', opacity: 0 }, { opacity: .95, offset: .2 }, { opacity: .95, offset: .8 }, { WebkitMaskPosition: '0% 0', opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.45,.05,.35,1)' }).finished.then(() => gl.remove(), () => gl.remove())
    }, 2300)
    // 4.4.4: stars come out. Four small four-pointed stars twinkle at the corners of the title, one after another, and
    // fade (transform and opacity only)
    setTimeout(() => {
      if (skip || still || !logo.offsetParent) return
      const host = logo.offsetParent, L0 = logo.offsetLeft, T0 = logo.offsetTop, W0 = logo.offsetWidth, H0 = logo.offsetHeight
      ;[[-.04, .1, 0], [1.03, .05, 160], [1.0, .95, 320], [-.02, .9, 480]].forEach(([fx, fy, d]) => {
        const st = document.createElement('i'), sz = 22
        st.style.cssText = `position:absolute;left:${L0 + W0 * fx - sz / 2}px;top:${T0 + H0 * fy - sz / 2}px;width:${sz}px;height:${sz}px;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(circle,#fff 0 8%,transparent 9%),conic-gradient(from 45deg,transparent 0 10%,color-mix(in srgb,var(--hi) 80%,#fff) 12.5%,transparent 15% 35%,color-mix(in srgb,var(--hi) 80%,#fff) 37.5%,transparent 40% 60%,color-mix(in srgb,var(--hi) 80%,#fff) 62.5%,transparent 65% 85%,color-mix(in srgb,var(--hi) 80%,#fff) 87.5%,transparent 90%);-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%)`
        host.appendChild(st)
        st.animate([{ opacity: 0, transform: 'scale(.2) rotate(-30deg)' }, { opacity: 1, transform: 'scale(1.15) rotate(0)', offset: .4 }, { opacity: 0, transform: 'scale(.6) rotate(25deg)' }], { duration: 1000, delay: d, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'both' }).finished.then(() => st.remove(), () => st.remove())
      })
    }, 2700)
    // 4.4.5: the shortcut. Two glass keycaps, Option and Command, drop in beside the title on springs and press down
    // together with a soft click of light, like the new Ask / Do it for me shortcut (transform and opacity only)
    setTimeout(() => {
      if (skip || still || !logo.offsetParent) return
      const host = logo.offsetParent, x0 = logo.offsetLeft + logo.offsetWidth + 18, y0 = logo.offsetTop + logo.offsetHeight * .35
      ;['\u2325', '\u2318'].forEach((k, n) => {
        const key = document.createElement('i')
        key.textContent = k
        key.style.cssText = `position:absolute;left:${x0 + n * 52}px;top:${y0}px;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;pointer-events:none;font:600 22px/1 -apple-system,system-ui,sans-serif;font-style:normal;color:#fff;background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,.06));box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -3px 0 rgba(0,0,0,.25),0 0 22px color-mix(in srgb,var(--hi) 45%,transparent)`
        host.appendChild(key)
        key.animate([{ opacity: 0, transform: 'translateY(-40px) scale(.8)' }, { opacity: 1, transform: 'translateY(4px) scale(1.04)', offset: .35 }, { opacity: 1, transform: 'none', offset: .5 }, { opacity: 1, transform: 'translateY(5px) scale(.94,.9)', offset: .62 }, { opacity: 1, transform: 'none', offset: .75 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 1700, delay: n * 90, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'both' }).finished.then(() => key.remove(), () => key.remove())
      })
    }, 3000)
    // 4.4.6: the parcel. A small glass parcel drops in under the title on a spring, lands with a squash, and a
    // ribbon of light ties itself across it before it lifts away (transform and opacity only)
    setTimeout(() => {
      if (skip || still || !logo.offsetParent) return
      const host = logo.offsetParent, x = logo.offsetLeft + logo.offsetWidth / 2 - 22, y = logo.offsetTop + logo.offsetHeight + 14
      const box = document.createElement('i')
      box.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:44px;height:38px;border-radius:9px;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.24),rgba(255,255,255,.07));box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -3px 0 rgba(0,0,0,.22),0 0 26px color-mix(in srgb,var(--hi) 45%,transparent)`
      const rib = document.createElement('i')
      rib.style.cssText = 'position:absolute;left:19px;top:0;width:6px;height:100%;border-radius:3px;background:linear-gradient(180deg,#fff,color-mix(in srgb,var(--hi3) 70%,#fff));transform-origin:top;box-shadow:0 0 10px color-mix(in srgb,var(--hi3) 60%,transparent)'
      box.appendChild(rib); host.appendChild(box)
      rib.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1.06)', offset: .7 }, { transform: 'none' }], { duration: 600, delay: 650, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'both' })
      box.animate([{ opacity: 0, transform: 'translateY(-46px) scale(.8)' }, { opacity: 1, transform: 'translateY(3px) scale(1.06,.9)', offset: .3 }, { opacity: 1, transform: 'none', offset: .45 }, { opacity: 1, transform: 'none', offset: .8 }, { opacity: 0, transform: 'translateY(-14px) scale(.9)' }], { duration: 2000, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'both' }).finished.then(() => box.remove(), () => box.remove())
    }, 3300)
    // 4.1.6: a ripple of light rolls out from under the title as it settles, like a stone dropped in still water
    setTimeout(() => {
      if (skip || still || !logo.offsetParent) return
      const host = logo.offsetParent, cx = logo.offsetLeft + logo.offsetWidth / 2, cy = logo.offsetTop + logo.offsetHeight * .92
      ;[0, 1].forEach(i => {
        const r = document.createElement('i')
        r.style.cssText = `position:absolute;left:${cx - 60}px;top:${cy - 9}px;width:120px;height:18px;border-radius:50%;pointer-events:none;mix-blend-mode:screen;border:1.5px solid color-mix(in srgb,var(--hi) 75%,#fff);box-shadow:0 0 18px color-mix(in srgb,var(--hi) 55%,transparent)`
        host.appendChild(r)
        r.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: .85, transform: 'scale(1.6)', offset: .25 }, { opacity: 0, transform: `scale(${5.5 + i * 1.5})` }], { duration: 1500 + i * 250, delay: i * 180, easing: 'cubic-bezier(.16,1,.3,1)' }).finished.then(() => r.remove(), () => r.remove())
      })
    }, 1700)
    // 4.1.4: two sparks of light race out from the middle of the rule as it draws, and flare where it ends
    setTimeout(() => {
      const rule = s.querySelector('.rule'); if (skip || still || !rule || !rule.offsetParent) return
      const host = rule.offsetParent, cx = rule.offsetLeft + rule.offsetWidth / 2, cy = rule.offsetTop + rule.offsetHeight / 2, half = rule.offsetWidth / 2
      ;[-1, 1].forEach(dir => {
        const sp = document.createElement('i')
        sp.style.cssText = `position:absolute;left:${cx - 4}px;top:${cy - 4}px;width:8px;height:8px;border-radius:50%;pointer-events:none;background:#fff;mix-blend-mode:screen;box-shadow:0 0 10px 3px var(--hi),0 0 26px 8px color-mix(in srgb,var(--hi) 55%,transparent)`
        host.appendChild(sp)
        sp.animate([{ transform: 'translateX(0) scale(.4)', opacity: 0 }, { transform: `translateX(${dir * half * .5}px) scale(1.1,.8)`, opacity: 1, offset: .35 }, { transform: `translateX(${dir * half}px) scale(1)`, opacity: 1, offset: .78 }, { transform: `translateX(${dir * half}px) scale(3.2)`, opacity: 0 }], { duration: 1250, easing: 'cubic-bezier(.16,1,.3,1)' }).finished.then(() => sp.remove(), () => sp.remove())
      })
    }, 1250)
    // a glass lens sweeps across the finished title, bending each letter as it passes, then the glint follows
    const lw = logo.offsetWidth
    roll(drop, { x0: -D * .2, x1: lw + D * .2, y: logo.offsetHeight / 2, ms: 1500, bob: 6, delay: 1500 })
    setTimeout(() => { if (skip || still) return; SFX.glass(3) }, 1550)
    setTimeout(() => { if (skip || still) return; logo.querySelector('.glint').animate([{ opacity: 1, backgroundPosition: '120% 0' }, { opacity: 1, backgroundPosition: '-20% 0', offset: .92 }, { opacity: 0, backgroundPosition: '-20% 0' }], { duration: 1300, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }); SFX.shimmer() }, 2500)
    words(s.querySelector('.tag'), short ? 'Quicker to open. Clever on every page.' : 'Faster everywhere. Smarter on every page.', 1500, 80)
    await sleep(short ? 2700 : 3500)
    // push through the title: it rushes past the lens while the stars surge
    tween(sky, 'orb', 0, 900); tween(sky, 'ring', 0, 700); tween(sky, 'rays', 0, 900); tween(sky, 'ghosts', 0, 700)
    tween(sky, 'speed', 1.6, 300).then(() => tween(sky, 'speed', .25, 900))
    anim(s, [{ opacity: 1, filter: 'blur(0)', transform: 'translateZ(0)' }, { opacity: 0, filter: 'blur(12px)', transform: 'translateZ(520px)' }], { duration: 650, easing: 'cubic-bezier(.55,0,.75,.3)' })
    push(0, 650)
    if (!skip) SFX.whoosh()
    await sleep(650); s.remove()
  }

  // ------------------------------------------------------------ the tour: every feature shown doing its thing, in Lumen as it really looks
  const TABC = ['#24292f', 'var(--a)', '#ff8a3d', '#2fb67c']
  // the real Nova chrome: window controls, tab capsules and the gradient new-tab button on top, then the toolbar
  // capsule, the address capsule with its gradient search tile, and the tools capsule
  const CHROME = (tabs, ub = '', host = 'lumen.app') => `<div class="tb"><div class="lt cap"><i></i><i></i><i></i></div>${tabs.map((t, i) => { const [n, c, k] = Array.isArray(t) ? t : [t, TABC[i % 4], '']; return `<div class="t${i === 0 ? ' on' : ''}${k ? ' ' + k : ''}"><b style="background:${c}"></b>${n}</div>` }).join('')}</div><span class="plus">${IC('plus')}</span>` +
    `<div class="r2"><div class="nav cap">${IC('back')}${IC('forward')}${IC('reload')}<i class="ap"></i></div><div class="ub cap"><span class="sq">${IC('search')}</span><span class="host">${host}</span>${ub}<span class="st">${IC('star')}</span></div><div class="rt cap">${IC('gear')}${IC('split')}${IC('more')}</div></div>`
  const MW = (inner, tabs = ['GitHub', 'Lisbon trip', 'Recipes'], ub = '', host) => `<div class="mw">${CHROME(tabs, ub, host)}${inner}</div>`
  const LINES = (n, img) => '<div class="h"></div>' + Array.from({ length: n }, (_, i) => (img && i === 2 ? '<div class="img"></div>' : '') + `<div class="ln" style="width:${[92, 80, 96, 70, 88, 60, 84][i % 7]}%"></div>`).join('')
  const done = a => { try { a.cancel() } catch {} }
  const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>'
  // a pointer that glides to an element inside the shot and taps it
  async function tapAt(s, el, ms = 520) {
    const mw = s.querySelector('.mw'), p = s.querySelector('.ptr'), t = s.querySelector('.tap'); if (!mw || !p || !el || skip) return
    const a = mw.getBoundingClientRect(), b = el.getBoundingClientRect(), k = a.width / mw.offsetWidth || 1
    const x = (b.left - a.left + b.width * .55) / k, y = (b.top - a.top + b.height * .6) / k
    anim(p, [{ opacity: 0, transform: `translate(${x + 60}px,${y + 70}px)` }, { opacity: 1, transform: `translate(${x}px,${y}px)` }], { duration: ms, easing: 'cubic-bezier(.3,1.1,.4,1)' })
    await sleep(ms)
    anim(p, [{ opacity: 1, transform: `translate(${x}px,${y}px) scale(1)` }, { opacity: 1, transform: `translate(${x}px,${y}px) scale(.82)` }, { opacity: 1, transform: `translate(${x}px,${y}px) scale(1)` }], { duration: 260 })
    anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(.92)', offset: .35 }, { transform: 'scale(1.04)', offset: .7 }, { transform: 'scale(1)' }], { duration: 420 })
    t.style.left = x + 'px'; t.style.top = y + 'px'
    anim(t, [{ opacity: .9, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(1.8)' }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)' }); if (!skip) SFX.key()
    await sleep(240)
  }
  const POINTER = '<i class="ptr"></i><i class="tap"></i>'
  const TYPE = async (el, text, ms = 46, each) => { for (let i = 1; i <= text.length && !skip; i++) { el.textContent = text.slice(0, i); if (!skip) SFX.key(); if (each) each(i); await sleep(ms) } el.textContent = text }
  const TOUR = [
    { title: 'Open in a second.', text: 'Lumen is ready in about 1 s instead of 4. The ad blocker loads off the main thread, so the first launch never freezes.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div><div class="race lgl"><div class="hd"><i>${IC('bolt')}</i>Time to open</div><div class="wt"><span class="sv">0.00</span><small>s</small><span class="ok">${CHECK}Ready</span></div><div class="rr"><span>Lumen 4.0</span><s><i></i></s><em class="e0">0.0 s</em></div><div class="rr nw"><span>Lumen ${FILM_V}</span><s><i></i></s><em class="e1">0.0 s</em></div><span class="chip4">${IC('shield')}Ad blocker loaded in the background</span></div>`, undefined, '', 'lumen://home'), play: async s => {
      const lines = s.querySelectorAll('.pg > *'), sv = s.querySelector('.sv'), b0 = s.querySelector('.rr s i'), b1 = s.querySelector('.rr.nw s i'), e0 = s.querySelector('.e0'), e1 = s.querySelector('.e1')
      lines.forEach(l => { l.style.opacity = '0' })
      anim(s.querySelector('.race'), [{ opacity: 0, transform: 'translateY(18px) scale(.92)' }, { opacity: 1, transform: 'translate(-1px,-2px) scale(1.03,.97)', offset: .55 }, { opacity: 1, transform: 'none' }], { duration: 760, easing: 'cubic-bezier(.2,.9,.3,1)' })
      await sleep(380)
      // the race: 4.0 crawls along while 4.1 is done at 0.98 s
      anim(b0, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(.27)' }], { duration: 1150, easing: 'linear' })
      anim(b1, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1050, easing: 'cubic-bezier(.3,0,.3,1)' })
      lines.forEach((l, i) => anim(l, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 120 + i * 110 }))
      const t0 = performance.now()
      while (!skip) { const k = Math.min(1, (performance.now() - t0) / 1050); sv.textContent = (k * .98).toFixed(2); e1.textContent = (k * .98).toFixed(1) + ' s'; e0.textContent = (k * 1.1).toFixed(1) + ' s'; if (k >= 1) break; await sleep(45) }
      sv.textContent = '0.98'; e1.textContent = '1.0 s'; e0.textContent = '4.1 s'
      anim(s.querySelector('.ok'), [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'scale(1.1)', offset: .6 }, { opacity: 1, transform: 'none' }], { duration: 600 }); if (!skip) SFX.ding()
      anim(s.querySelector('.wt'), [{ transform: 'scale(1)' }, { transform: 'scale(1.05,.95)', offset: .4 }, { transform: 'scale(1)' }], { duration: 520 })
      await sleep(300)
      anim(s.querySelector('.chip4'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600 }); if (!skip) SFX.pop(1.2)
      await sleep(500)
    } },
    { title: 'Results as you type.', text: 'Cmd K and the address bar search your history, bookmarks and tabs in about 10 ms a key. Every click and key answers within 20 ms.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div><div class="cmdp lgl"><div class="in"><span class="sq">${IC('search')}</span><span class="qt"></span><i class="caret"></i><span class="ms">0 ms</span></div>${[0, 1, 2].map(() => '<div class="r"><i class="ic4"></i><b></b><em></em></div>').join('')}</div>`, undefined, '', 'github.com'), play: async s => {
      const cmd = s.querySelector('.cmdp'), qt = s.querySelector('.qt'), ms = s.querySelector('.ms'), rows = s.querySelectorAll('.cmdp .r')
      anim(cmd, [{ opacity: 0, transform: 'translateY(-10px) scale(.94)' }, { opacity: 1, transform: 'translateY(2px) scale(1.015,.985)', offset: .6 }, { opacity: 1, transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.9,.3,1)' }); if (!skip) SFX.whoosh()
      await sleep(420)
      const R = {
        1: [['L', '#ff8a3d', 'Lisbon trip', 'Open tab'], ['in', '#0a66c2', 'LinkedIn', 'History'], ['L', 'var(--a)', 'Lumen release notes', 'Bookmark']],
        2: [['L', '#ff8a3d', 'Lisbon trip', 'Open tab'], ['in', '#0a66c2', 'LinkedIn', 'History'], ['L', '#2fb67c', 'lisbon.travel', 'Bookmark']],
        3: [['L', '#ff8a3d', 'Lisbon trip', 'Open tab'], ['L', '#2fb67c', 'lisbon.travel', 'Bookmark'], ['L', '#8a63f2', 'Lisbon trains, timetable', 'History']],
      }
      const MS = [7, 9, 6, 8, 7, 9]
      await TYPE(qt, 'lisbon', 150, i => {
        const set = R[Math.min(3, i)]; ms.textContent = MS[i - 1] + ' ms'
        if (i === 1) anim(ms, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 360 })
        else anim(ms, [{ opacity: 1, transform: 'scale(1.15)' }, { opacity: 1, transform: 'none' }], { duration: 260 })
        rows.forEach((r, j) => {
          const [l, c, n, k] = set[j], ic = r.querySelector('.ic4'); ic.textContent = l; ic.style.background = c; r.querySelector('b').textContent = n; r.querySelector('em').textContent = k
          r.classList.toggle('sel', j === 0)
          if (i === 1) anim(r, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: j * 30 })
        })
      })
      await sleep(500)
    } },
    { title: 'Ask Lumen, with sources.', text: 'A chat for every tab. Answers stream in with Markdown and cite the page: click a number and Lumen jumps to the quote.', build: () => MW(`<div class="pg"><div class="scr">${LINES(3)}<p class="psg"><mark></mark><span>The night train from Madrid is the cheapest way in, from 39 euros.</span></p>${LINES(4)}</div></div><div class="side ask4 lgl"><div class="ah"><i></i>Ask Lumen<span class="mdl">Smart</span></div><div class="qb">Cheapest way to get there?</div><p class="ai"></p><div class="acts"><span class="stp">Stop</span><span>Copy</span><span>Regenerate</span></div></div>${POINTER}`, undefined, '', 'lisbon.travel'), play: async s => {
      anim(s.querySelector('.side'), [{ transform: 'translateX(112%)' }, { transform: 'translateX(-2%) scale(1.01,.99)', offset: .7 }, { transform: 'none' }], { duration: 820, easing: 'cubic-bezier(.2,.9,.3,1)' }); if (!skip) SFX.whoosh()
      await sleep(560)
      anim(s.querySelector('.qb'), [{ opacity: 0, transform: 'translateY(8px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 520 }); if (!skip) SFX.pop(1.1)
      await sleep(360)
      const acts = s.querySelector('.acts'); anim(acts, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
      const p = s.querySelector('.ai'), txt = 'Take the night train from Madrid. It is the cheapest way in, from 39 euros [1], and arrives at 7:20 [2].'
      for (const w of txt.split(' ')) { if (skip) break; const m = /^\[(\d)\]([.,]?)$/.exec(w); p.insertAdjacentHTML('beforeend', m ? `<span class="ct">${m[1]}</span>${m[2]} ` : esc(w) + ' '); await sleep(42) }
      const stp = acts.querySelector('.stp'); if (stp) { stp.classList.remove('stp'); stp.textContent = 'Copy answer'; acts.lastElementChild.remove() }
      await sleep(260)
      await tapAt(s, p.querySelector('.ct'))
      anim(s.querySelector('.scr'), [{ transform: 'none' }, { transform: 'translateY(-34px)' }], { duration: 700, easing: 'cubic-bezier(.3,1.1,.4,1)' })
      anim(s.querySelector('.psg mark'), [{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1.02)', offset: .6 }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 200 }); setTimeout(() => !skip && SFX.shimmer(), 200)
      await sleep(900)
    } },
    { title: 'Tell Cmd K what to do.', text: 'Ask a question for an answer right in Cmd K, or give it a job like close all YouTube tabs. You see the plan first.', build: () => `<div class="mw many">${CHROME([['Lo-fi beats', '#ff3b30', 'yt'], ['Mail', 'var(--a)'], ['Guitar lesson', '#ff3b30', 'yt'], ['Docs', '#2fb67c'], ['Trailer', '#ff3b30', 'yt']], '', 'youtube.com')}<div class="pg">${LINES(6, 1)}</div><div class="cmdp lgl"><div class="in"><span class="sq">${IC('sparkle')}</span><span class="qt"></span><i class="caret"></i></div><div class="plan"><div class="ph"><i></i>Lumen AI  ·  Plan</div><b>Close 3 YouTube tabs</b><div class="chs"><span><i></i>Lo-fi beats</span><span><i></i>Guitar lesson</span><span><i></i>Trailer</span></div><div class="pb"><span class="dn">Do it</span><span>Cancel</span></div></div></div><span class="pill lgl">${IC('check')}3 tabs closed</span>${POINTER}</div>`, play: async s => {
      const cmd = s.querySelector('.cmdp')
      anim(cmd, [{ opacity: 0, transform: 'translateY(-10px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.9,.3,1)' })
      await sleep(380)
      await TYPE(s.querySelector('.qt'), 'close all YouTube tabs', 38)
      anim(s.querySelector('.plan'), [{ opacity: 0, transform: 'translateY(10px) scale(.95)' }, { opacity: 1, transform: 'translateY(-2px) scale(1.02,.98)', offset: .6 }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,.9,.3,1)' }); if (!skip) SFX.glass(1)
      s.querySelectorAll('.plan .chs span').forEach((c, i) => anim(c, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 250 + i * 70 }))
      await sleep(900)
      await tapAt(s, s.querySelector('.plan .dn'))
      anim(cmd, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px) scale(.95)' }], { duration: 320, easing: 'cubic-bezier(.5,0,.7,.4)' })
      // the YouTube tabs squash away on a spring, and the rest slide over (FLIP: transform only)
      const all = [...s.querySelectorAll('.tb .t')], yt = all.filter(t => t.classList.contains('yt')), rest = all.filter(t => !yt.includes(t))
      yt.forEach((t, i) => { anim(t, [{ opacity: 1, transform: 'none' }, { opacity: 1, transform: 'scale(1.06,.9)', offset: .3 }, { opacity: 0, transform: 'scale(.3,.6)' }], { duration: 380, delay: i * 60, easing: 'cubic-bezier(.5,0,.7,.4)' }); setTimeout(() => !skip && SFX.pop(1 + i * .1), i * 60) })
      await sleep(520)
      const mw = s.querySelector('.mw'), first = rest.map(t => t.getBoundingClientRect().left), k = mw.getBoundingClientRect().width / mw.offsetWidth || 1
      yt.forEach(t => { t.style.display = 'none' })
      rest.forEach((t, i) => { const dx = (first[i] - t.getBoundingClientRect().left) / k; if (dx) anim(t, [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(-3px)', offset: .65 }, { transform: 'none' }], { duration: 640, easing: 'cubic-bezier(.3,1.2,.5,1)' }) })
      anim(s.querySelector('.pill'), [{ opacity: 0, transform: 'translateY(12px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 200 }); if (!skip) SFX.ding()
      await sleep(900)
    } },
    { title: 'Select. Understand.', text: 'Select text for a bubble: Explain, Define, Summarize, Translate, Rewrite or Ask. In text boxes, Lumen helps you write.', build: () => MW(`<div class="pg"><div class="h"></div><div class="tx4">Lisbon sits on seven hills above the river Tagus. Walk the old town and you will see <span class="sel"><span>azulejo tiles on every facade</span></span>, painted in blue and white, a craft Portugal has kept for five hundred years.</div><div class="bub lgl"><span><i></i>Ask</span><span class="ex">Explain</span><span>Define</span><span>Summarize</span><span>Translate</span><span>Rewrite</span></div><div class="ans lgl"><div class="ah2"><i></i>Explain</div><p></p></div></div>${POINTER}`, undefined, '', 'visitlisbon.example'), play: async s => {
      const sel = s.querySelector('.sel'), bub = s.querySelector('.bub'), pg = s.querySelector('.pg')
      await sleep(260)
      sel.style.setProperty('--s', '1'); if (!skip) SFX.tick(2)
      await sleep(520)
      // the bubble pops above the selection
      const bw = bub.offsetWidth, x = Math.max(8, Math.min(pg.clientWidth - bw - 8, sel.offsetLeft + sel.offsetWidth / 2 - bw / 2)), y = Math.max(4, sel.offsetTop - bub.offsetHeight - 8)
      bub.style.left = x + 'px'; bub.style.top = y + 'px'
      anim(bub, [{ opacity: 0, transform: 'translateY(8px) scale(.6)' }, { opacity: 1, transform: 'translateY(-2px) scale(1.06,.95)', offset: .55 }, { opacity: 1, transform: 'scale(.98,1.02)', offset: .78 }, { opacity: 1, transform: 'none' }], { duration: 640, easing: 'cubic-bezier(.2,.9,.3,1)' }); if (!skip) SFX.pop(1.2)
      await sleep(650)
      const ex = bub.querySelector('.ex'); await tapAt(s, ex); ex.classList.add('on')
      const ans = s.querySelector('.ans'), p = ans.querySelector('p')
      anim(ans, [{ opacity: 0, transform: 'translateY(16px) scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.2,.9,.3,1)' })
      await sleep(260)
      for (const w of 'Azulejos are painted, glazed ceramic tiles. Portugal took the craft from Moorish Spain around 1500 and uses them to keep facades cool and bright.'.split(' ')) { if (skip) break; p.textContent += w + ' '; await sleep(34) }
      await sleep(300)
    } },
  ]
  // where each shot sits: the camera orbits a little between them, so every shot arrives from a new angle
  const POSE = i => ({ x: (i % 2 ? -1 : 1) * 46, ry: (i % 2 ? 1 : -1) * 30, rx: [8, 4, 10, 5][i % 4] })
  const REST = 'translate(0,-6vh)'
  const ART = ['bolt', 'search', 'sparkle', 'tabs', 'translate']
  const WORD = ['1 s', '10 ms', 'Ask', 'Do it', 'Explain']
  // the tour is cut into chapters, each opened by a title card on the beat
  const CHAPTERS = { 0: ['Speed', 'Instant, <em>everywhere.</em>'], 2: ['Lumen AI', 'Ask <em>anything.</em>'] }
  async function chapter([kick, line], n, cap) {
    root.classList.add('tight')
    if (cap) anim(cap, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 })
    const s = scene(`<div class="title trailer"><div class="echo"></div><div class="tc sm"><small>${String(n).padStart(2, '0')}  ${kick}</small>${line}</div></div>`), tc = s.querySelector('.tc')
    slamIn(tc, { from: 1.35 }); slabs(560); echo(s.querySelector('.echo'), kick, { ms: BEAT * 2.2, a: .45 }); SFX.hit(n); pop(.14, 3); leak(.4, n % 2 ? 1 : -1, 1200)
    await sleep(BEAT * 1.5)
    cutOut(tc, 200); await sleep(200); s.remove()
    root.classList.remove('tight')
    if (cap) anim(cap, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
  }
  async function tour() {
    tween(sky, 'bokeh', .45, 1600); tween(sky, 'neb', .7, 1600); focus(2.5, 1200); tween(sky, 'caus', 1, 2000)
    const cap = document.createElement('div'); cap.className = 'tourcap'
    cap.innerHTML = `<b class="bn"></b><span class="n"><span class="num"></span><span class="dots">${TOUR.map(() => '<i></i>').join('')}</span></span><h2></h2><i class="hr"></i><p></p>`; root.appendChild(cap)
    const dots = cap.querySelectorAll('.dots i')
    let prev = null
    for (let i = 0; i < TOUR.length && !skip; i++) {
      if (CHAPTERS[i] && !skip) {
        // the shot on screen swings away while the chapter card slams in
        if (prev) { const o = prev, op = POSE(i - 1), orig = o.querySelector('.rig'); orig.getAnimations().forEach(done); anim(orig, [{ opacity: 1, transform: 'translate3d(0,-6vh,0)' }, { opacity: 0, transform: `translate3d(${-op.x}vw,-4vh,-380px) rotateY(${-op.ry}deg)` }], { duration: 520, easing: 'cubic-bezier(.55,0,.4,1)' }); setTimeout(() => o.remove(), still ? 0 : 560); prev = null; focus(0, 300); await sleep(340) }
        await chapter(CHAPTERS[i], Object.keys(CHAPTERS).indexOf(String(i)) + 1, cap)
        focus(2.5, 600)
      }
      const f = TOUR[i], p = POSE(i), s = scene(`<div class="echo tw">${WORD[i] || ''}</div><i class="halo"></i><div class="art ${i % 2 ? 'l' : 'r'}">${ICONS[ART[i]] || ''}</div><div class="rig"><div class="glass glassf">${f.build()}<i class="glare"></i></div></div>`, 'flat tshot')
      const rig = s.querySelector('.rig'), frame = s.querySelector('.glassf')
      lensAll(s)
      anim(s.querySelector('.halo'), [{ opacity: 0, transform: 'scale(.7)' }, { opacity: .55, transform: 'none' }], { duration: 1200, easing: 'cubic-bezier(.16,1,.3,1)' })
      anim(s.querySelector('.echo'), [{ opacity: 0, transform: `translateX(${i % 2 ? -8 : 8}vw) scale(1.12)` }, { opacity: .5, transform: 'none' }], { duration: 1600, easing: 'cubic-bezier(.16,1,.3,1)' })
      anim(s.querySelector('.art'), [{ opacity: 0, transform: `rotate(${i % 2 ? 24 : -24}deg) scale(1.25)` }, { opacity: .1, transform: `rotate(${i % 2 ? 12 : -12}deg) scale(1)` }], { duration: 2000, easing: 'cubic-bezier(.16,1,.3,1)' })
      // the outgoing shot swings away out of focus while this one swings in from the other side and racks sharp
      if (prev) {
        const o = prev, op = POSE(i - 1), orig = o.querySelector('.rig')
        orig.getAnimations().forEach(done)
        anim(orig, [{ opacity: 1, filter: 'blur(0)', transform: `translate3d(0,-6vh,0) rotateY(0deg) rotateX(0deg)` }, { opacity: 0, filter: 'blur(12px)', transform: `translate3d(${-op.x}vw,-4vh,-380px) rotateY(${-op.ry}deg) rotateX(${op.rx}deg)` }], { duration: 820, easing: 'cubic-bezier(.55,0,.4,1)' })
        setTimeout(() => o.remove(), still ? 0 : 860)
        focus(0, 400).then(() => !skip && focus(2.5, 800))
        leak(.45, i % 2 ? -1 : 1, 1400)
        if (!skip) SFX.glass(i)
      } else if (!skip) SFX.whoosh()
      const enter = anim(rig, [{ opacity: 0, filter: 'blur(14px)', transform: `translate3d(${p.x}vw,-2vh,-420px) rotateY(${p.ry}deg) rotateX(${p.rx}deg)` },
        { opacity: 1, filter: 'blur(1px)', offset: .7 },
        { opacity: 1, filter: 'blur(0)', transform: `translate3d(0,-6vh,0) rotateY(0deg) rotateX(0deg)` }], { duration: prev ? 1000 : 1100, delay: prev ? 100 : 0, easing: 'cubic-bezier(.2,1.02,.3,1)' })
      // once it lands the frame is flat glass again, so the lens can bend the sky behind it, and a light passes over it
      enter.finished.then(() => { if (!rig.isConnected) return; rig.style.transform = REST; done(enter); frame.classList.add('pass') }).catch(() => {})
      cap.querySelector('.num').textContent = String(i + 1).padStart(2, '0') + '  /  ' + String(TOUR.length).padStart(2, '0'); cap.querySelector('.bn').textContent = String(i + 1).padStart(2, '0'); anim(cap.querySelector('.bn'), [{ opacity: 0, transform: 'translateX(-30px) scale(1.2)' }, { opacity: 1, transform: 'scale(.96,1.04)', offset: .6 }, { opacity: 1, transform: 'none' }], { duration: 800, easing: 'cubic-bezier(.2,.9,.3,1)' })
      dots.forEach((d, j) => { d.className = j === i ? 'on' : j < i ? 'past' : '' })
      words(cap.querySelector('h2'), f.title, 100, 40)
      anim(cap.querySelector('.hr'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, delay: 220, easing: 'cubic-bezier(.16,1,.3,1)' })
      cap.querySelector('p').innerHTML = f.text; anim(cap.querySelector('p'), [{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 800, delay: 280 })
      await sleep(620)
      await f.play(s)
      await sleep(BEAT * 1.6)
      prev = s
    }
    tween(sky, 'caus', 0, 700)
    if (prev) { focus(0, 450); await leave(prev, skip ? 1 : 520) }
    anim(cap, [{ opacity: 1 }, { opacity: 0 }], { duration: skip ? 1 : 360 }); setTimeout(() => cap.remove(), skip ? 0 : 380)
  }

  // ------------------------------------------------------------ the hero shot: the new home screen
  const HOME = () => `<div class="home"><div class="hg"><i></i><em>Good evening</em>Tuesday</div><div class="cu"><i></i>Customize</div>
    <div class="hc"><div class="clk"><span class="hm">9:41</span><span class="sec">00</span></div><div class="trk"><i></i><b></b></div>
      <div class="srch">${IC('search')}<span class="q">Search or type an address</span><span class="eg">Cmd K</span></div>
      <div class="scs">${[['G', '#24292f', 'GitHub'], ['Y', '#ff3b30', 'YouTube'], ['M', 'var(--a)', 'Mail'], ['L', '#ff8a3d', 'Lisbon'], ['F', '#2fb67c', 'Figma'], ['N', '#8a63f2', 'News']].map(([l, c, n]) => `<div class="sc"><i style="background:linear-gradient(135deg,${c},color-mix(in srgb,${c} 62%,#000))">${l}</i>${n}</div>`).join('')}</div></div>
    <div class="wgs"><div class="wg"><i class="k">${IC('box')}</i><div><b>Arrives today</b><span>New headphones</span></div></div><div class="wg"><i class="k">${IC('book')}</i><div><b>3 to read</b><span>Read later</span></div></div>
      <div class="wg"><i class="k">${IC('shield')}</i><div><b class="tk">0</b><span>Trackers blocked</span></div><div class="bars">${[38, 62, 46, 80, 58, 100].map(h => `<s style="height:${h}%"></s>`).join('')}</div></div><div class="wg"><i class="k">${IC('sparkle')}</i><div><b>Lumen AI</b><span>Ask about any page</span></div></div></div></div>`
  async function homeReveal({ short = false } = {}) {
    if (skip) return
    // a title card on the beat, then the hero shot rises into frame and builds itself piece by piece
    const t = scene(`<div class="title trailer"><div class="echo fill"></div><div class="tc sm"><small>${short ? 'New in ' + FILM_V : 'Introducing'}</small>The new <em>Home banner.</em></div></div>`)
    slamIn(t.querySelector('.tc'), { from: 1.3 }); slabs(); echo(t.querySelector('.echo'), 'Home', { ms: BEAT * 2.6, a: .5 }); SFX.hit(2); pop(.18, 4); leak(.5, 1, 1600)
    await sleep(BEAT * 2)
    cutOut(t.querySelector('.tc'), 220); await sleep(220); t.remove()
    if (skip) return
    tween(sky, 'bokeh', .5, 1200); focus(2.5, 900); tween(sky, 'neb', .8, 1200)
    const s = scene(`<i class="halo"></i><div class="rig"><div class="glass glassf">${HOME()}<i class="glare"></i></div></div>`, 'flat')
    const rig = s.querySelector('.rig'), frame = s.querySelector('.glassf'), h = s.querySelector('.home')
    lensAll(s)
    anim(s.querySelector('.halo'), [{ opacity: 0, transform: 'scale(.6)' }, { opacity: .7, transform: 'none' }], { duration: 1400, easing: 'cubic-bezier(.16,1,.3,1)' })
    const enter = anim(rig, [{ opacity: 0, filter: 'blur(16px)', transform: 'translate3d(0,14vh,-520px) rotateX(24deg) scale(.86)' }, { opacity: 1, filter: 'blur(0)', offset: .6 }, { opacity: 1, filter: 'blur(0)', transform: 'translate3d(0,-3vh,0) rotateX(0deg) scale(1)' }], { duration: 1150, easing: 'cubic-bezier(.2,1.02,.3,1)' })
    enter.finished.then(() => { if (!rig.isConnected) return; rig.style.transform = 'translate(0,-3vh)'; done(enter); frame.classList.add('pass') }).catch(() => {})
    SFX.whoosh(); crane(30, -1.2, 2400); push(.03, 4200)
    const up = (el, d, from = 'translateY(14px) scale(.94)') => anim(el, [{ opacity: 0, transform: from, filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 700, delay: d })
    for (const el of h.querySelectorAll('.hg,.cu,.clk,.trk,.srch')) el.style.opacity = '0'
    await sleep(420)
    ;[...h.querySelectorAll('.hg,.cu')].forEach((el, i) => up(el, i * 60))
    up(h.querySelector('.clk'), 80, 'scale(1.18)'); setTimeout(() => !skip && SFX.shimmer(), 80)
    up(h.querySelector('.trk'), 200, 'scaleX(.4)')
    up(h.querySelector('.srch'), 300)
    h.querySelectorAll('.sc').forEach((el, i) => { up(el, 460 + i * 55, 'translateY(18px) scale(.6)'); setTimeout(() => !skip && SFX.pop(1 + i * .08), 460 + i * 55) })
    h.querySelectorAll('.wg').forEach((el, i) => { up(el, 820 + i * 70, 'translateY(26px) scale(.9)'); setTimeout(() => !skip && SFX.tick(i * 2), 820 + i * 70) })
    // the clock ticks, the trackers count up and a search is typed
    const sec = h.querySelector('.sec'), trk = h.querySelector('.trk i'), knob = h.querySelector('.trk b'), tk = h.querySelector('.tk'), o = { n: 0 }
    const clock = { s: 0 }; tween(clock, 's', 4, 3600, k => k)
    tween(o, 'n', 1284, 1800)
    const iv = setInterval(() => {
      const sv = Math.floor(clock.s), pct = (41 * 60 + clock.s) / 3600 * 100 % 100
      sec.textContent = String(sv).padStart(2, '0'); trk.style.width = (68 + clock.s * 1.5) + '%'; knob.style.left = (68 + clock.s * 1.5) + '%'
      tk.textContent = Math.round(o.n).toLocaleString('en-US'); if (skip || clock.s >= 4) clearInterval(iv)
      void pct
    }, 80)
    await sleep(1500); if (skip) { clearInterval(iv); return }
    const q = h.querySelector('.q'), text = 'lisbon trains'; q.textContent = ''
    for (let i = 1; i <= text.length && !skip; i++) { q.textContent = text.slice(0, i); SFX.key(); await sleep(46) }
    await sleep(short ? 900 : 1300)
    clearInterval(iv)
    push(0, 600); tween(sky, 'bokeh', .2, 700)
    await leave(s, 600)
  }
  // the numbers: four figures land on the beat, each from deeper in the frame, then the camera flies through them
  async function montage({ short = false } = {}) {
    if (skip) return
    const F = [['1', 's', 'to open', 'It used to take 4'], ['3', 'x', 'faster', 'tab switching'], ['10', 'ms', 'results', 'as you type'], ['20', 'ms', 'or less', 'for every click and key']]
    const s = scene(`<div class="wkick">Lumen ${FILM_V}  in numbers</div><div class="wall">${F.map(([n, u, b, l]) => `<div class="fig"><i class="gw"></i><span class="n">${n}<small>${u}</small></span><i class="r"></i><span class="lb"><b>${b}</b>${l}</span></div>`).join('')}</div>`, 'flat')
    const figs = s.querySelectorAll('.fig'), step = short ? BEAT * .7 : BEAT
    anim(s.querySelector('.wkick'), [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 800 })
    tween(sky, 'bokeh', .4, 1200); push(.03, step * 6)
    for (let i = 0; i < figs.length && !skip; i++) {
      const f = figs[i], z = -900 + i * 120
      anim(f, [{ opacity: 0, transform: `translate3d(0,40px,${z}px) rotateX(18deg)` }, { opacity: 1, transform: 'translate3d(0,-4px,30px) scale(1.04,.96)', offset: .55 }, { opacity: 1, transform: 'scale(.99,1.01)', offset: .78 }, { opacity: 1, transform: 'none' }], { duration: 900, easing: 'cubic-bezier(.2,.9,.3,1)' })
      anim(f.querySelector('.r'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 800, delay: 250, easing: 'cubic-bezier(.16,1,.3,1)' })
      anim(f.querySelector('.lb'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 320 })
      SFX.hit(i); pop(.1 + i * .04, 2 + i); if (i === figs.length - 1) { slabs(); beam(1000) }
      await sleep(step)
    }
    await sleep(short ? BEAT : BEAT * 2)
    // the dolly: the wall rushes past the lens, the outer figures first
    figs.forEach((f, i) => anim(f, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate3d(${(i - 1.5) * 18}vw,0,700px)` }], { duration: 620, delay: Math.abs(i - 1.5) < 1 ? 80 : 0, easing: 'cubic-bezier(.55,0,.75,.3)' }))
    anim(s.querySelector('.wkick'), [{ opacity: 1 }, { opacity: 0 }], { duration: 300 })
    tween(sky, 'speed', 1.4, 300).then(() => tween(sky, 'speed', .25, 900)); push(0, 600); if (!skip) SFX.whoosh()
    await sleep(700); s.remove(); tween(sky, 'bokeh', 0, 600)
  }
  async function whatsNew(version) {
    const items = WHATS_NEW.items
    tween(sky, 'bokeh', .6, 1500); focus(2, 1100); leak(.6, -1, 1800)
    const V = esc(version || WHATS_NEW.version)
    const s = scene(`<div class="new nw4"><div class="lh"><span class="eyebrow chrome">New in Lumen ${V}</span><div class="bigv">${V}</div><h1>Faster, smarter, smoother.</h1><p class="lede">${items.length} things to try first, all of them already waiting in your browser.</p></div>
      <div class="bento">${items.map((it, i) => `<div class="it glass sweep${i === 0 ? ' hero' : ''}${i === items.length - 1 && items.length % 2 === 0 ? ' last' : ''}" style="--sd:${1.3 + i * .08}s"><div class="k">${ICONS[it.icon] || ''}</div><span>${esc(it.text)}</span><b class="no2">${String(i + 1).padStart(2, '0')}</b><i class="wmk">${ICONS[it.icon] || ''}</i></div>`).join('')}</div></div>`, 'flat')
    lensAll(s)
    anim(s.querySelector('.eyebrow'), [{ opacity: 0, transform: 'translateY(-10px)', letterSpacing: '.6em' }, { opacity: 1, transform: 'none', letterSpacing: '.24em' }], { duration: 1100 })
    anim(s.querySelector('.bigv'), [{ opacity: 0, transform: 'translateX(-40px) scale(1.5)' }, { opacity: 1, transform: 'scale(.98)', offset: .5 }, { opacity: 1, transform: 'none' }], { duration: 1100, delay: 120, easing: 'cubic-bezier(.16,1,.3,1)' })
    setTimeout(() => { if (!skip) { SFX.count(3); pop(.16, 4) } }, 260)
    slamIn(s.querySelector('h1'), { from: 1.2, ms: 900, k: 10 }); setTimeout(() => { if (!skip) { SFX.hit(1); pop(.1, 2) } }, 60)
    anim(s.querySelector('.lede'), [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 700 })
    s.querySelectorAll('.it').forEach((el, i) => {
      const fromX = 60 + (i % 2) * 30
      anim(el, [{ opacity: 0, transform: `translate(${fromX}px,30px) scale(.86)` }, { opacity: 1, transform: 'translate(-4px,-3px) scale(1.035,.965)', offset: .5 }, { transform: 'scale(.985,1.02)', offset: .72 }, { transform: 'scale(1.004,.997)', offset: .88 }, { opacity: 1, transform: 'none' }], { duration: 1150, delay: 480 + i * 75, easing: 'cubic-bezier(.2,.9,.3,1)' })
      setTimeout(() => !skip && SFX.pop(1 + i * .06), 480 + i * 75)
    })
    const hold = 1300 + items.length * 75 + 3300
    push(.03, hold + 600)
    setTimeout(() => { if (!skip && !still) { s.querySelector('h1').classList.add('shine'); SFX.shimmer() } }, 1400)
    await sleep(hold)
    tween(sky, 'bokeh', 0, 800); push(0, 700)
    await leave(s, 700)
  }
  // when the last frame has settled, the film holds still while it waits for an answer: no loops at idle
  let held = false, holdT = 0, grainAnim = null
  function hold() {
    if (!root) return
    held = true; root.classList.add('held'); try { grainAnim && grainAnim.pause() } catch {}
  }
  function wake() {
    if (still || !root) return
    clearTimeout(holdT); holdT = setTimeout(hold, 2500)
    if (!held) return
    held = false; root.classList.remove('held'); try { grainAnim && grainAnim.play() } catch {}
    cancelAnimationFrame(raf); raf = requestAnimationFrame(draw)
  }
  async function finale({ short = false, ask = !short } = {}) {
    if (!skip) SFX.chord()
    // the letterbox opens up to the full frame, the camera cranes up, the orb rises above the title and the sky racks back into focus
    root.classList.add('wide'); focus(0, 1200); push(0, 600); crane(50, -1, 2000)
    sky.orbR = 0; sky.oy = -Math.min(H * .3, 250); tween(sky, 'orb', .8, 1200); tween(sky, 'orbR', 14, 1200); tween(sky, 'ring', 1, 1600); tween(sky, 'rays', .7, 2000); tween(sky, 'bokeh', .5, 2000); tween(sky, 'ghosts', .7, 2000); tween(sky, 'neb', .9, 2000)
    flare(.6); leak(.5, 1, 2200)
    const BTN = !ask ? '<button class="go">Continue</button>' : '<button class="go">Yes, save my orders</button><button class="no chrome">Not now</button>'
    const s = scene(`<div class="echo fill mega fe"></div><div class="fin fin4" style="margin-top:7vh"><div class="fk">${short ? 'You are on' : 'Welcome to'}</div><div class="logo">Lumen ${FILM_V}<i class="drop"></i></div>
      ${!ask ? `<div class="btns">${BTN}</div>` : `<div class="ask glass sweep" style="--sd:1.6s"><i class="wmk">${ICONS.box || ''}</i><div class="k">${ICONS.box || ''}</div><div class="tx"><b>Keep track of your orders?</b><span>When you place an order on any shop, Lumen saves it to Parcels. One click takes you straight back to the order, and it stays there until it is delivered. Change it any time in Settings.</span></div><div class="btns">${BTN}</div></div>`}</div>`, 'flat')
    const fe = s.querySelector('.fe'); if (!still) { fe.textContent = FILM_V; anim(fe, [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: .38, transform: 'none' }], { duration: 2200, easing: 'cubic-bezier(.16,1,.3,1)' }) }
    anim(s.querySelector('.fk'), [{ opacity: 0, letterSpacing: '1.1em' }, { opacity: 1, letterSpacing: '.5em' }], { duration: 1400, easing: 'cubic-bezier(.16,1,.3,1)' })
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
    holdT = setTimeout(hold, still ? 300 : 4500)
    return new Promise(r => {
      const fin = v => { removeEventListener('keydown', k); clearTimeout(holdT); r(v) }   // the held frame fades out as it is: no need to wake the sky just to leave
      s.querySelector('.go').onclick = () => fin(true)
      const no = s.querySelector('.no'); if (no) no.onclick = () => fin(false)
      root.querySelector('.skip').onclick = () => fin(undefined)
      const k = e => { if (e.key === 'Enter') fin(true); else if (e.key === 'Escape') fin(undefined) }
      addEventListener('keydown', k)
    })
  }
  // anything still on stage after a skip leaves quickly before the finale comes in
  function clearStage() { for (const s of root.querySelectorAll('.stage .scene, .tourcap')) { s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }); setTimeout(() => s.remove(), 260) } sky.caus = 0; camera.roll = 0; camera.lift = 0; camera.push = 0; sky.warp = 0; sky.dof = 0 }

  // ------------------------------------------------------------ the first frame after an update restarts Lumen
  // src/updater.js ends the restart on a full-screen ink frame with the app icon in a glass orb and the new number.
  // The relaunched window opens on that same frame (main.js paints the window in the same ink and passes ?arrive=),
  // light blooms out of the orb, and it hands over to the what's-new film, or opens onto the browser.
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  let arriveEl = null, arriveT = 0
  function ensureCSS() { if (!document.getElementById('intro-css')) { const st = document.createElement('style'); st.id = 'intro-css'; st.textContent = css; document.head.appendChild(st) } }
  function arrive() {
    let q; try { q = new URLSearchParams(location.search) } catch { return }
    const ver = String(q.get('arrive') || '').replace(/^v/, '').replace(/\.0$/, '')
    if (!ver || arriveEl || !document.body) return
    ensureCSS()
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
    const icon = /^[a-z0-9-]+$/i.test(q.get('aicon') || '') ? q.get('aicon') : 'default', acc = /^#[0-9a-f]{6}$/i.test(q.get('aacc') || '') ? q.get('aacc') : null
    const el = arriveEl = document.createElement('div'); el.id = 'arrive'; if (acc) el.style.setProperty('--a', acc)
    el.innerHTML = `<div class="cart" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M12 7v9m-4-4 4 4 4-4"/><path d="M4.5 12a7.5 7.5 0 0 1 4-6.6" opacity=".5"/></svg></div><i class="fl"></i><div class="am"><div class="ao"><img alt=""></div><span class="ak">Updated</span><div class="an">${esc(ver)}</div><b>Lumen ${esc(ver)}</b><small>Welcome back. Your tabs are right here.</small></div><i class="ar"></i>`
    const img = el.querySelector('img'); img.onerror = () => { if (!/default\.png$/.test(img.src)) img.src = '../build/icons/default.png' }; img.src = `../build/icons/${icon}.png`
    document.body.appendChild(el)
    if (!calm) {
      el.querySelector('.am').animate([{ opacity: 0, transform: 'scale(.35)' }, { opacity: 1, transform: 'scale(1.02)', offset: .6 }, { opacity: 1, transform: 'none' }], { duration: 1000, easing: 'cubic-bezier(.16,1,.3,1)' })
      el.querySelector('.fl').animate([{ opacity: 1, transform: 'scale(.05)' }, { opacity: .9, transform: 'scale(1)', offset: .35 }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 1100, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' })
    }
    arriveT = setTimeout(() => leaveArrive(), 2200)   // nothing took over: open onto the browser
  }
  function leaveArrive(fast) {
    const el = arriveEl; if (!el) return
    arriveEl = null; clearTimeout(arriveT)
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || (document.body && document.body.dataset.motion === 'off')
    if (calm) { el.remove(); return }
    el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.08)' }], { duration: fast ? 600 : 750, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards' }).onfinish = () => el.remove()
    setTimeout(() => el.remove(), 1400)
  }
  arrive()

  // ------------------------------------------------------------ play
  // play({ onDone }) is the full film for a first launch. play({ whatsNew: '4.0.0', onDone }) is the short cut after an update.
  // play({ only: ['home'] }) plays just those acts and then the finale (for tests and screenshots)
  async function play({ onDone, whatsNew: wn, askParcels = false, only = null } = {}) {
    loadLogo()
    if (document.getElementById('intro')) return
    skip = false; held = false
    still = matchMedia('(prefers-reduced-motion: reduce)').matches || (document.body && document.body.dataset.motion === 'off')
    ensureCSS()
    const acc = accent(); HUE = acc.h
    root = document.createElement('div'); root.id = 'intro'; root.style.setProperty('--a', acc.hex); if (still) root.classList.add('still')
    root.innerHTML = `<svg class="defs" aria-hidden="true"><defs></defs></svg><div class="cam"><div class="nebw"><div class="neb"></div><div class="nebc"></div></div><canvas></canvas><div class="flare"></div><div class="stage"></div></div><div class="leak"></div><div class="beam"></div><div class="ca"></div><div class="grain"></div><div class="vig"></div><div class="slabs"><i></i><i></i><i></i></div><div class="bar t"></div><div class="bar b"></div>
      <div class="hud" aria-hidden="true"><i class="cm tl"></i><i class="cm tr"></i><i class="cm bl"></i><i class="cm br"></i><i class="tk"></i><span class="sw"><i></i><i></i><i></i><i></i><i></i></span><span class="tcd"><b>REC</b><span>00:00:00:00</span></span><span class="rl">Lumen <em>${esc(FILM_V)}</em>  Reel 01  2.39 : 1</span></div>
      <div class="credit"><i></i>${wn ? 'Lumen <b>' + esc(String(wn).replace(/\.0$/, '')) + '</b>' : 'A Lumen picture'}</div><button class="skip chrome">Skip intro<kbd>esc</kbd></button><button class="skip mute chrome">Sound on</button><div class="meter"><i></i></div>`
    document.body.appendChild(root)
    // the restart's last frame hands over to the film
    if (arriveEl) setTimeout(() => leaveArrive(true), still ? 0 : 700)
    defs = root.querySelector('svg.defs defs'); lensCache = {}; lensN = 0
    cv = root.querySelector('canvas'); cx = cv.getContext('2d')
    size(); addEventListener('resize', size)
    root.querySelector('.grain').style.background = `url(${grainURL()})`
    // the grain holds still: a full-screen blended layer that moved every 150ms cost a recomposite each step
    grainAnim = null
    // the iris opens on the first frame
    if (!still) root.querySelector('.cam').animate([{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(6% at 50% 50%)', offset: .35 }, { clipPath: 'circle(80% at 50% 50%)' }], { duration: 1700, easing: 'cubic-bezier(.6,0,.2,1)' })
    stars = Array.from({ length: Math.round(Math.min(900, W * H / 1600)) }, () => newStar())
    bokeh = Array.from({ length: 16 }, () => ({ x: Math.random(), y: .1 + Math.random() * .9, r: 30 + Math.random() * 90, h: [0, 40, 95, -62, 175][Math.floor(Math.random() * 5)], a: .4 + Math.random() * .6, sx: .1 + Math.random() * .25, sy: .08 + Math.random() * .2, p: Math.random() * 6, v: .01 + Math.random() * .03 }))
    caus = Array.from({ length: 110 }, (_, i) => ({ u: Math.random() * 2 - 1, w: Math.random() * 2 - 1, s: Math.random(), p: Math.random(), v: .12 + Math.random() * .2, up: i % 4 === 0 }))
    nebula = paintNebula(); sprite = paintSprite(); bokehSprites = {}; raySprite = null
    { const nc = root.querySelector('.nebc'); nebula.className = 'nebi'; nc.appendChild(nebula); nebEl = nc
      if (!still) nebula.animate([{ transform: 'rotate(-17deg) scale(1,1)' }, { transform: 'rotate(4deg) scale(1.04,1)', offset: .5 }, { transform: 'rotate(25deg) scale(1,1)' }], { duration: 70000, easing: 'linear', fill: 'forwards' }) }
    Object.assign(sky, { oy: 0, speed: .4, warp: 0, gather: 0, orb: 0, orbR: 0, ring: 0, shock: [], flash: 0, shake: 0, rays: 0, bokeh: 0, neb: 0, dof: 0, ghosts: 0, caus: 0 }); Object.assign(camera, { x: 0, y: 0, px: 0, py: 0, push: 0, roll: 0, lift: 0 }); dofShown = -1
    let glintQ = 0
    const onMove = e => {
      camera.px = e.clientX / innerWidth - .5; camera.py = e.clientY / innerHeight - .5; if (held) wake()
      if (!still && !glintQ) glintQ = requestAnimationFrame(() => { glintQ = 0; if (!root) return; root.style.setProperty('--gx', (50 + camera.px * 80).toFixed(0) + '%'); root.style.setProperty('--gy', (26 + camera.py * 50).toFixed(0) + '%') })
    }
    addEventListener('pointermove', onMove)
    t0 = performance.now(); total = wn ? 21000 : 56000
    if (!held) raf = requestAnimationFrame(draw)   // a held frame stays on screen without redrawing
    lensAll(root)
    root.querySelector('.skip').onclick = () => { skip = true }
    root.querySelector('.mute').onclick = () => { root.querySelector('.mute').textContent = SFX.toggleMute() ? 'Sound off' : 'Sound on' }
    SFX.init(); SFX.drone()
    const onKey = e => { if (e.key === 'Escape') skip = true }
    addEventListener('keydown', onKey)
    requestAnimationFrame(() => root.classList.add('on'))

    let answer
    if (only && !still) {
      const ACTS = { cold: coldOpen, warp: () => warp(1500), ignite, tour, home: homeReveal, montage, numbers: montage, whatsNew: () => whatsNew(FILM_V) }
      await sleep(200); for (const a of only) if (ACTS[a]) await ACTS[a]()
      removeEventListener('keydown', onKey); if (skip) clearStage(); skip = false
      answer = await finale({ short: true })
    } else if (still) {
      // Motion off or reduced motion: no film, just the last frame, still and instant
      removeEventListener('keydown', onKey); sky.neb = .9; root.classList.add('lit')
      answer = wn ? (askParcels ? await finale({ short: true, ask: true }) : await finale({ short: true })) : await finale()
    } else if (wn) {
      // after an update: warp, "Fresh from an update, Lumen 4.1", what is new, the numbers, and you are on it
      await sleep(300); await warp(1800); await ignite({ short: true }); await whatsNew(String(wn).replace(/\.0$/, '')); await montage({ short: true })
      removeEventListener('keydown', onKey)
      if (!skip || askParcels) { if (skip) clearStage(); skip = false; answer = await finale({ short: true, ask: askParcels }) }
    } else {
      // a first launch is the whole trailer; what is new is only for people who update
      await sleep(400); await coldOpen(); await warp(1500); await ignite(); await tour(); await montage()
      removeEventListener('keydown', onKey)
      // the last scene asks one question, even when the film itself was skipped
      if (skip) clearStage()
      skip = false
      answer = await finale()
    }

    // out: the frame dissolves into the browser
    SFX.fadeOut(.9)
    root.classList.remove('on')
    await new Promise(r => { root.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.05)' }], { duration: still ? 1 : 560, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards' }).onfinish = r })
    cancelAnimationFrame(raf); clearTimeout(holdT); removeEventListener('resize', size); removeEventListener('pointermove', onMove); try { grainAnim && grainAnim.cancel() } catch {} grainAnim = null; root.remove(); defs = null
    onDone && onDone({ parcels: answer })
  }
  // 4.4.4: does this version have a what's-new film you have not seen? The film is written for one version: '4.4' covers
  // 4.4.0 (and any 4.4.x without its own film), '4.4.3' covers exactly 4.4.3. Before, only the first kind matched, so every
  // patch release (4.4.1 to 4.4.3) skipped its film after the update.
  function wantsWhatsNew(version, seen) {
    const v = String(version || ''), f = String(WHATS_NEW.version || ''), norm = x => x.replace(/(\.0)+$/, '')
    if (!v || !f || seen === v) return false
    return norm(v) === norm(f) || v.startsWith(f + '.')
  }
  window.Intro = { play, WHATS_NEW, arrive, leaveArrive, wantsWhatsNew }
})()
