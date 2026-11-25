/* Lumen's opening film, the 4.0 trailer. Cut like a movie trailer and shot through real liquid glass: every frame,
   card and button is a lens that bends the nebula behind it (an SVG displacement map on the backdrop, strongest at the
   rim, with a chromatic fringe), with a glint that follows your pointer and a caustic glow inside.
   The cut: the iris opens on beat-cut title cards, a count that slams into the version number, a chromatic warp
   tunnel, ignition (the real app icon in an orb with god rays, an anamorphic streak and lens ghosts) on
   "This is Lumen 4.0", a fast tour of live demos inside a Nova browser that looks like the real one, the reveal of
   the new home screen, a closing montage, and a finale where the letterbox opens and asks one question. After an
   update the short cut plays: warp, ignition, What is new, the home screen and "You are on Lumen 4.0".
   Everything is lit in your accent color. Synthesized, friendly score; every cut lands on a beat of it. No emoji.
   Skip or Escape jump to the finale at any point; with Motion off or reduced motion there is no film at all.
   Every release rewrites WHATS_NEW below, and after an update Lumen plays the short what's-new cut once.
   Intro.arrive() is the first frame after an update restarts Lumen: it picks up exactly where the update card's
   restart screen left off, so there is never a grey window in between. */
;(function () {
  // ---- edit this list every release: it is the "New in Lumen" act of the film (only this version's changes)
  const WHATS_NEW = {
    version: '4.0',
    items: [
      { icon: 'clock', text: 'A rebuilt home screen: a new clock, search, shortcuts and widgets' },
      { icon: 'gear', text: 'Every Settings and library page redesigned, with a hero on every section' },
      { icon: 'play', text: 'A trailer for an intro: the most cinematic film Lumen has ever had' },
      { icon: 'download', text: 'A new update card, and a restart that goes straight back to your tabs' },
      { icon: 'bolt', text: 'Surge 4.0 and Koi 4.0, rebuilt to match' },
      { icon: 'sparkle', text: 'Smoother and lighter: less work for your Mac when Lumen sits still' },
      { icon: 'layers', text: 'Lumen draws its own menus for tabs and pages' },
      { icon: 'crash', text: 'A tab that crashes gets a friendly screen to bring it right back' },
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
  @media (max-width:1000px){#intro .home .wgs{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;bottom:3%}#intro .home .wg{height:50px}#intro .home .wg .bars{display:none}#intro .home .scs{gap:12px}#intro .home .sc i{width:36px;height:36px;border-radius:12px}#intro .home .srch{height:40px;width:70%}}
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
  const noFilter = kf => kf.map(f => { if (!('filter' in f)) return f; const g = { ...f }; delete g.filter; return g })
  const anim = (el, kf, o) => el.animate(el.offsetWidth * el.offsetHeight > BIG ? noFilter(kf) : kf, { fill: 'forwards', easing: 'cubic-bezier(.3,1.22,.5,1)', ...o, ...(still ? { duration: 1, delay: 0 } : {}) })
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
  // Off in the film: the film moves under every piece of glass, so a displacement lens would be recomputed every
  // frame (and on macOS it can fall back to the CPU). Plain frosted glass from CSS is used instead.
  const LENS_IN_FILM = false
  function lens(el, o = {}) {
    if (!LENS_IN_FILM || still || !el || !defs || el.dataset.lens) return
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
  let bokeh = [], stars = [], caus = [], nebula = null, dofShown = -1, lastNow = 0
  function size() {
    const scale = Math.min(1, devicePixelRatio || 1) * .7   // the sky is soft light: 70% resolution looks the same and costs half
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
    // per-frame decays are scaled to real time, so a slow frame never leaves a flash or shake hanging
    const fk = Math.min(6, Math.max(.25, (now - (lastNow || now - 16.7)) / 16.7)); lastNow = now
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
    const v = still ? 0 : (.0025 + sky.speed * .004 + sky.warp * .045) * Math.min(fk, 3)
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
      w.r += (Math.max(W, H) * 1.1 - w.r) * (1 - Math.pow(1 - .045, fk)); w.a *= Math.pow(.955, fk)
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
    if (sky.flash > .01) { cx.globalCompositeOperation = 'source-over'; cx.fillStyle = `rgba(240,243,255,${sky.flash})`; cx.fillRect(0, 0, W, H); sky.flash *= Math.pow(.9, fk) }
    // depth of field: the sky goes soft behind the shot in focus
    const d = Math.round(sky.dof * 4) / 4
    if (d !== dofShown) { dofShown = d }   // no live blur filter on the full-screen canvas: it costs every frame
    // the glint on every piece of glass follows the pointer, and drifts on its own when the pointer is still
    if (!still && (frameN++ & 1) === 0) { root.style.setProperty('--gx', (50 + camera.px * 80 + Math.sin(t * .37) * 26).toFixed(1) + '%'); root.style.setProperty('--gy', (26 + camera.py * 50 + Math.cos(t * .29) * 14).toFixed(1) + '%') }
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
    const m = root.querySelector('.meter i'); if (m) m.style.width = Math.min(100, (now - t0) / total * 100) + '%'
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
    { opacity: 1, transform: 'scale(.985)', filter: `blur(0) ${SPLIT(2, .4)}`, offset: .55 },
    { opacity: 1, transform: 'scale(1)', filter: `blur(0) ${SPLIT(0, 0)}` }], { duration: ms, easing: 'cubic-bezier(.16,1,.3,1)' })
  const cutOut = (el, ms = 170) => anim(el, [{ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.92)', filter: 'blur(8px)' }], { duration: ms, easing: 'cubic-bezier(.5,0,.8,.4)' })
  // a hard cut between two title cards: the old one is simply gone on the beat, the way a trailer cuts
  const hardCut = el => { el.getAnimations().forEach(x => x.cancel()); el.style.opacity = '0' }
  const pop = (a, shake = 0) => { if (still || skip) return; sky.flash = Math.max(sky.flash, a); sky.shake = Math.max(sky.shake, shake); if (a >= .1) flare(Math.min(1, a * 3)) }
  const IC = n => ICONS[n] || ''

  // the cold open, cut like a trailer: three title cards on the beat, then a count that slams into the version number
  async function coldOpen() {
    const cards = ['<em>Rebuilt.</em>', 'Redesigned.', '<em>Reimagined.</em>']
    const s = scene(`<div class="title trailer"><div class="pre">A Lumen picture</div>${cards.map(c => `<div class="tc">${c}</div>`).join('')}<div class="count"><span class="cn">1.0</span><i class="cg" aria-hidden="true"></i></div><i class="cring"></i><div class="slate">Lumen ${FILM_V}   The trailer</div></div>`)
    const pre = s.querySelector('.pre'), tcs = s.querySelectorAll('.tc'), cnt = s.querySelector('.count'), cn = s.querySelector('.cn'), cg = s.querySelector('.cg'), ring = s.querySelector('.cring')
    anim(pre, [{ opacity: 0, letterSpacing: '1em' }, { opacity: 1, letterSpacing: '.5em' }], { duration: 1100, easing: 'cubic-bezier(.16,1,.3,1)' })
    anim(s.querySelector('.slate'), [{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 200 })
    sky.speed = .2; tween(sky, 'neb', .3, 2400); crane(18, -1, 2600)
    await sleep(420)
    anim(pre, [{ opacity: 1 }, { opacity: 0 }], { duration: 260 })
    for (let i = 0; i < tcs.length && !skip; i++) {
      if (i) hardCut(tcs[i - 1])
      slamIn(tcs[i]); SFX.hit(i); pop(.12, 3)
      await sleep(BEAT)
    }
    cutOut(tcs[tcs.length - 1])
    // the count: one number per half beat, each a little brighter, and a ring of light goes out with every one
    const steps = ['1.0', '2.0', '3.0']
    anim(cnt, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
    for (let i = 0; i < steps.length && !skip; i++) {
      cn.textContent = steps[i]
      anim(cn, [{ opacity: 0, transform: 'scale(1.3) translateY(12px)', filter: 'blur(10px)' }, { opacity: .45 + i * .15, transform: 'none', filter: 'blur(0)' }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' })
      anim(ring, [{ opacity: .6, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(1.5)' }], { duration: 620, easing: 'cubic-bezier(.2,.8,.3,1)' })
      SFX.count(i)
      await sleep(BEAT * .64)
    }
    if (!skip) {
      // the version slams in: flash, shake, shockwave, and a glint runs across it
      cn.textContent = cg.textContent = FILM_V; cnt.classList.add('fin4')
      anim(cn, [{ opacity: 0, transform: 'scale(2.6)', filter: 'blur(26px)' }, { opacity: 1, transform: 'scale(.97)', filter: 'blur(0)', offset: .5 }, { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }], { duration: 720, easing: 'cubic-bezier(.16,1,.3,1)' })
      anim(ring, [{ opacity: 1, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(3.2)' }], { duration: 1100, easing: 'cubic-bezier(.2,.8,.3,1)' })
      boom(); SFX.count(3)
      setTimeout(() => { if (!skip && !still) cg.animate([{ opacity: 1, backgroundPosition: '120% 0' }, { opacity: 1, backgroundPosition: '-20% 0', offset: .9 }, { opacity: 0, backgroundPosition: '-20% 0' }], { duration: 900, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }) }, 300)
      push(.02, 900)
      await sleep(980)
    }
    // straight through the number and into the warp
    anim(s, [{ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(2.4)', filter: 'blur(18px)' }], { duration: 380, easing: 'cubic-bezier(.55,0,.75,.3)' })
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
    const s = scene(`<div style="text-align:center;position:relative"><div class="kicker chrome">${short ? 'Fresh from an update' : 'This is'}</div><div class="logo">${L}<b class="v4">${FILM_V}</b><i class="glint" aria-hidden="true">Lumen<i class="gv">${FILM_V}</i></i><div class="mirror" aria-hidden="true">${L}<b class="v4">${FILM_V}</b></div><i class="drop"></i></div><div class="rule"></div><div class="tag"></div></div>`)
    const logo = s.querySelector('.logo'), drop = logo.querySelector('.drop'), D = Math.round(logo.offsetHeight * 1.3)
    drop.style.width = drop.style.height = D + 'px'; lensAll(s)
    tween(sky, 'orbR', 18, 1400); tween(sky, 'oy', -Math.min(H * .26, 220), 1800, k => 1 - Math.pow(1 - k, 4))
    push(.035, short ? 3000 : 4000)   // a slow dolly in on the title
    crane(60, 2.2, short ? 2600 : 3200)   // while the camera cranes down and levels out
    anim(s.querySelector('.kicker'), [{ opacity: 0, letterSpacing: '1.1em' }, { opacity: 1, letterSpacing: '.46em' }], { duration: 1600, delay: 250, easing: 'cubic-bezier(.16,1,.3,1)' })
    logo.querySelectorAll(':scope > span').forEach((l, i) => anim(l, [
      { opacity: 0, transform: `translate3d(${(i - 2) * 90}px, ${(i % 2 ? -1 : 1) * 40}px, 600px) rotateY(${(i - 2) * 25}deg) scale(1.6)`, filter: `blur(18px) ${SPLIT(16, .85)}` },
      { opacity: 1, filter: `blur(2px) ${SPLIT(5, .5)}`, offset: .55 },
      { opacity: 1, transform: 'none', filter: `blur(0) ${SPLIT(0, 0)}` }], { duration: 1300, delay: 60 + i * 70, easing: 'cubic-bezier(.16,1,.3,1)' }))
    anim(logo.querySelector('.mirror'), [{ opacity: 0 }, { opacity: .14 }], { duration: 1600, delay: 900 })
    anim(logo, [{ letterSpacing: '.18em' }, { letterSpacing: '-.05em' }], { duration: 2000, easing: 'cubic-bezier(.16,1,.3,1)' })
    // the number lands on the next beat, hard
    const v4 = logo.querySelector(':scope > .v4')
    anim(v4, [{ opacity: 0, transform: 'scale(2.8) translateY(-6%)', filter: `blur(22px) ${SPLIT(20)}` }, { opacity: 1, transform: 'scale(.96)', filter: `blur(0) ${SPLIT(3, .5)}`, offset: .5 }, { opacity: 1, transform: 'none', filter: `blur(0) ${SPLIT(0, 0)}` }], { duration: 760, delay: 1000, easing: 'cubic-bezier(.16,1,.3,1)' })
    setTimeout(() => { if (skip || still) return; SFX.hit(3); pop(.3, 7); sky.shock.push({ r: 10, a: .8 }); flare(.8) }, 1050)
    anim(logo.querySelector('.mirror .v4'), [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 1300 })
    anim(s.querySelector('.rule'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1500, delay: 1200, easing: 'cubic-bezier(.16,1,.3,1)' })
    // a glass lens sweeps across the finished title, bending each letter as it passes, then the glint follows
    const lw = logo.offsetWidth
    roll(drop, { x0: -D * .2, x1: lw + D * .2, y: logo.offsetHeight / 2, ms: 1500, bob: 6, delay: 1500 })
    setTimeout(() => { if (skip || still) return; SFX.glass(3) }, 1550)
    setTimeout(() => { if (skip || still) return; logo.querySelector('.glint').animate([{ opacity: 1, backgroundPosition: '120% 0' }, { opacity: 1, backgroundPosition: '-20% 0', offset: .92 }, { opacity: 0, backgroundPosition: '-20% 0' }], { duration: 1300, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }); SFX.shimmer() }, 2500)
    words(s.querySelector('.tag'), short ? 'Rebuilt from the first pixel. Lit in your color.' : 'The biggest Lumen ever. Rebuilt in glass.', 1500, 80)
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
  const CHROME = (tabs, ub = '', host = 'lumen.app') => `<div class="tb"><div class="lt cap"><i></i><i></i><i></i></div>${tabs.map((t, i) => `<div class="t${i === 0 ? ' on' : ''}"><b style="background:${TABC[i % 4]}"></b>${t}</div>`).join('')}</div><span class="plus">${IC('plus')}</span>` +
    `<div class="r2"><div class="nav cap">${IC('back')}${IC('forward')}${IC('reload')}<i class="ap"></i></div><div class="ub cap"><span class="sq">${IC('search')}</span><span class="host">${host}</span>${ub}<span class="st">${IC('star')}</span></div><div class="rt cap">${IC('gear')}${IC('split')}${IC('more')}</div></div>`
  const MW = (inner, tabs = ['GitHub', 'Lisbon trip', 'Recipes'], ub = '', host) => `<div class="mw">${CHROME(tabs, ub, host)}${inner}</div>`
  const LINES = (n, img) => '<div class="h"></div>' + Array.from({ length: n }, (_, i) => (img && i === 2 ? '<div class="img"></div>' : '') + `<div class="ln" style="width:${[92, 80, 96, 70, 88, 60, 84][i % 7]}%"></div>`).join('')
  const done = a => { try { a.cancel() } catch {} }
  const TOUR = [
    { title: 'Tabs, right where you expect them.', text: 'Tabs sit on top. <kbd>Cmd T</kbd> opens a new one, and dragged tabs spring into place.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div>`, ['GitHub'], '', 'github.com'), play: async s => {
      const tb = s.querySelector('.tb')
      for (const [i, t] of ['Lisbon trip', 'Recipes', 'New Tab'].entries()) { await sleep(300); const el = document.createElement('div'); el.className = 't'; el.innerHTML = `<b style="background:${TABC[(i + 1) % 4]}"></b>${t}`; tb.appendChild(el); anim(el, [{ opacity: 0, transform: 'translateY(-10px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 650 }); if (!skip) SFX.pop(1 + i * .12) }
      await sleep(340); let ts = tb.querySelectorAll('.t'); ts.forEach(t => t.classList.remove('on')); ts[1].classList.add('on'); anim(ts[1], [{ transform: 'scale(.92)' }, { transform: 'none' }], { duration: 560 }); if (!skip) SFX.key()
      // drag Lisbon trip past Recipes: it lifts, glides over, and Recipes springs out of the way
      await sleep(380); if (skip) return
      const step = ts[2].offsetLeft - ts[1].offsetLeft
      const a1 = anim(ts[1], [{ transform: 'none' }, { transform: 'translateY(-3px) scale(1.06) rotate(-2deg)', offset: .25 }, { transform: `translate(${step}px,-3px) scale(1.06) rotate(1deg)`, offset: .8 }, { transform: `translate(${step}px,0)` }], { duration: 880, easing: 'cubic-bezier(.4,0,.2,1)' })
      const a2 = anim(ts[2], [{ transform: 'none' }, { transform: 'none', offset: .45 }, { transform: `translateX(${-step}px)` }], { duration: 880 })
      if (!skip) SFX.whoosh()
      await sleep(900); done(a1); done(a2); tb.insertBefore(ts[2], ts[1]); if (!skip) SFX.pop(1.2)
    } },
    { title: 'One bar does everything.', text: '<kbd>Cmd K</kbd> searches the web, your tabs and history, and runs any action.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div><div class="cmdp lgl"><div class="in"><span class="sq">${IC('search')}</span><span class="q"></span><span class="caret"></span><kbd>Cmd K</kbd></div><div class="r sel"><i></i>Search for <b class="qq" style="margin-left:4px"></b><em>Search</em></div><div class="r"><i></i>Lisbon trip<em>Switch to tab</em></div><div class="r"><i></i>Flights to Lisbon, last week<em>History</em></div><div class="r"><i></i>Focus mode<em>Shift Cmd F</em></div></div>`), play: async s => {
      const q = 'flights to lisbon', qe = s.querySelector('.q'), qq = s.querySelector('.qq'), rs = s.querySelectorAll('.cmdp .r')
      anim(s.querySelector('.cmdp'), [{ opacity: 0, transform: 'translateY(-10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 650 })
      for (let i = 1; i <= q.length && !skip; i++) { qe.textContent = qq.textContent = q.slice(0, i); SFX.key(); await sleep(44) }
      rs.forEach((r, i) => anim(r, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: i * 55 }))
      if (!skip) SFX.shimmer()
      for (const j of [1, 2, 1]) { await sleep(320); if (skip) return; rs.forEach((r, k) => r.classList.toggle('sel', k === j)); SFX.tick(j) }
      await sleep(260); anim(s.querySelector('.cmdp'), [{ transform: 'scale(1)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }], { duration: 420 }); if (!skip) SFX.key()
    } },
    { title: 'Ads and trackers, gone.', text: 'Blocked before they load, on every site. Pages get faster, and nobody follows you.', build: () => MW(`<div class="pg">${LINES(6)}<div class="ad" style="left:58%;top:18px;width:150px;height:70px">AD</div><div class="ad" style="left:6%;top:118px;width:200px;height:46px">AD</div><div class="ad" style="left:52%;top:146px;width:120px;height:90px">AD</div><span class="cnt">0 blocked</span></div>`, undefined, `<span class="sh">${IC('shield')}<i>0</i></span>`, 'news.example'), play: async s => {
      const ads = s.querySelectorAll('.ad'), c = s.querySelector('.cnt'), sh = s.querySelector('.sh i'); let n = 0
      for (const a of ads) {
        await sleep(400); anim(a, [{ transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }, { transform: 'scale(1.12)', opacity: 1, offset: .3 }, { transform: 'scale(0) rotate(12deg)', opacity: 0, filter: 'blur(6px)' }], { duration: 560 }); if (!skip) SFX.pop(.8 + n * .02)
        n += 8; c.textContent = n + ' blocked'; sh.textContent = n; anim(c, [{ transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 460 }); anim(s.querySelector('.sh'), [{ transform: 'scale(1.18)' }, { transform: 'none' }], { duration: 460 })
      }
      await sleep(260); anim(s.querySelector('.pg'), [{ transform: 'translateY(6px)', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 650 })
    } },
    { title: 'Ask Lumen AI about any page.', text: 'A summary, the key points, or what anything you select means, in the side panel.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div><div class="side lgl"><div class="ah"><i></i>Lumen AI</div><p class="ai"></p><div class="kp"><span>Train is cheapest</span><span>Flight is fastest</span><span>Book 2 weeks ahead</span></div></div>`, undefined, '', 'lisbon.travel'), play: async s => {
      anim(s.querySelector('.side'), [{ transform: 'translateX(112%)' }, { transform: 'none' }], { duration: 800 }); if (!skip) SFX.whoosh()
      await sleep(520); const p = s.querySelector('.ai'), txt = 'This page compares three ways to get to Lisbon. The train is cheapest and the flight is fastest.'
      for (const w of txt.split(' ')) { if (skip) break; p.textContent += w + ' '; await sleep(36) }
      s.querySelectorAll('.kp span').forEach((k, i) => { anim(k, [{ opacity: 0, transform: 'translateY(8px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: i * 100 }); setTimeout(() => !skip && SFX.pop(1.1 + i * .1), i * 100) })
      await sleep(420)
    } },
    { title: 'Translate the whole page.', text: 'Any language into yours in a moment. Arabic and Hebrew even flip direction.', build: () => MW(`<div class="pg"><div class="tr" dir="rtl" style="text-align:right">مرحبا بكم في لشبونة. المدينة جميلة في الربيع، والقطارات سريعة ومريحة.</div><br>${LINES(4)}<i class="scan"></i></div><div class="pill lgl">${IC('translate')}<span>Translate from Arabic</span></div>`, undefined, '', 'visit.lisboa'), play: async s => {
      const pill = s.querySelector('.pill'), tr = s.querySelector('.tr')
      anim(pill, [{ opacity: 0, transform: 'translateY(-8px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 650 }); if (!skip) SFX.pop(1.2)
      await sleep(600); anim(pill, [{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 380 }); if (!skip) SFX.key()
      anim(s.querySelector('.scan'), [{ opacity: 1, transform: 'translateY(-46px)' }, { opacity: 1, transform: 'translateY(220px)', offset: .9 }, { opacity: 0, transform: 'translateY(240px)' }], { duration: 1000, easing: 'cubic-bezier(.4,0,.3,1)' })
      await sleep(340); if (skip) return
      tr.dir = 'ltr'; tr.style.textAlign = 'left'; tr.textContent = 'Welcome to Lisbon. The city is beautiful in spring, and the trains are fast and comfortable.'
      anim(tr, [{ transform: 'translateX(30px)', filter: 'blur(6px)', opacity: .3 }, { transform: 'none', filter: 'blur(0)', opacity: 1 }], { duration: 650 }); if (!skip) SFX.shimmer()
      await sleep(420); pill.querySelector('span').textContent = 'Translated to English'; anim(pill, [{ transform: 'scale(1.08)' }, { transform: 'none' }], { duration: 460 })
    } },
    { title: 'Dark mode for every website.', text: 'One switch turns light sites dark, and leaves dark sites alone.', build: () => MW(`<div class="pg">${LINES(6, 1)}</div><div class="reveal">${CHROME(['GitHub', 'Lisbon trip', 'Recipes'], `<span class="sh">${IC('moon')}Dark</span>`, 'github.com')}<div class="pg">${LINES(6, 1)}</div></div>`, undefined, `<span class="sh">${IC('moon')}Dark</span>`, 'github.com'), play: async s => {
      await sleep(560); const sh = s.querySelector('.ub .sh'); anim(sh, [{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 380 }); if (!skip) SFX.key()
      // the dark theme pours out of the switch in a widening circle
      anim(s.querySelector('.reveal'), [{ clipPath: 'circle(0% at 86% 14%)' }, { clipPath: 'circle(140% at 86% 14%)' }], { duration: 1150, easing: 'cubic-bezier(.5,0,.2,1)' }); if (!skip) SFX.whoosh()
      await sleep(1150)
    } },
    { title: 'Two pages, side by side.', text: '<kbd>Shift Cmd \\</kbd> opens split view. Reader mode and picture in picture are a shortcut away.', build: () => MW(`<div class="split"><div class="pp">${LINES(5, 1)}</div><i class="dv"></i><div class="pp">${LINES(5)}</div></div>`), play: async s => {
      const ps = s.querySelectorAll('.pp'); anim(ps[0], [{ transform: 'translateX(50%)' }, { transform: 'none' }], { duration: 820 }); anim(ps[1], [{ transform: 'translateX(-50%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 820 }); if (!skip) SFX.whoosh()
      anim(s.querySelector('.dv'), [{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 450 })
      await sleep(950); if (skip) return
      anim(ps[0], [{ flexGrow: 1 }, { flexGrow: 1.7, offset: .55 }, { flexGrow: 1.3 }], { duration: 1150, easing: 'cubic-bezier(.4,0,.2,1)' }); if (!skip) SFX.tick(4)
      await sleep(900)
    } },
    { title: 'Surge, built in.', text: 'Your Mac glows when it charges, keys and clicks get sounds and ripples, and much more.', build: () => `<div class="desk"><div class="menubar"><span>${appLogo('surge', 'mb')}Surge</span><span class="pc">41%</span><span>9:41</span></div><div class="edge"></div><div class="chg chrome"><i></i><span class="cp">Charging  41%</span></div><div class="keys">${'LUMEN'.split('').map(k => `<b>${k}</b>`).join('')}</div></div>`, play: async s => {
      const d = s.querySelector('.desk'); await sleep(260); d.classList.add('lit'); if (!skip) SFX.shimmer()
      const o = { v: 41 }; const cp = s.querySelector('.cp'), pc = s.querySelector('.pc'); tween(o, 'v', 72, 1600); const iv = setInterval(() => { const n = Math.round(o.v) + '%'; cp.textContent = 'Charging  ' + n; pc.textContent = n; if (o.v >= 72 || skip) clearInterval(iv) }, 60)
      for (const k of s.querySelectorAll('.keys b')) { await sleep(150); k.classList.add('dn'); if (!skip) SFX.key(); setTimeout(() => k.classList.remove('dn'), 120) }
      for (const [x, y] of [[30, 45], [70, 38], [52, 70]]) { const r = document.createElement('i'); r.className = 'rip'; r.style.left = x + '%'; r.style.top = y + '%'; d.appendChild(r); anim(r, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(4)', opacity: 0 }], { duration: 760, easing: 'cubic-bezier(.2,.8,.3,1)' }); if (!skip) SFX.pop(1.1); await sleep(230) }
    } },
    { title: 'Koi, one key away.', text: '<kbd>Option Space</kbd> blooms your apps around the cursor. Type a letter to open one.', build: () => `<div class="desk"><div class="menubar"><span>${appLogo('koi', 'mb')}Koi</span><span>9:41</span></div><div class="fan"><i class="hub"></i></div><div class="cur"></div></div>`, play: async s => {
      const fan = s.querySelector('.fan'), cur = s.querySelector('.cur'), apps = [['#ff5f57', 'M'], ['#febc2e', 'N'], ['#28c840', 'F'], ['var(--a)', 'S'], ['#8a63f2', 'C'], ['#e9609c', 'P'], ['#20c997', 'T']]
      anim(cur, [{ transform: 'translate(-180px,-60px)' }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.3,1.1,.5,1)' }); await sleep(520)
      anim(fan.querySelector('.hub'), [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'none' }], { duration: 850 })
      const pos = []
      apps.forEach(([c, l], i) => {
        const el = document.createElement('i'); el.style.background = `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 65%, #000))`; el.textContent = l; fan.appendChild(el)
        const a = (-160 + i * (140 / (apps.length - 1))) * Math.PI / 180, R = 120; pos.push([Math.cos(a) * R, Math.sin(a) * R])
        anim(el, [{ opacity: 0, transform: 'translate(0,0) scale(.3) rotate(-30deg)' }, { opacity: 1, transform: `translate(${pos[i][0]}px, ${pos[i][1]}px) scale(1)` }], { duration: 850, delay: 90 + i * 45, easing: 'cubic-bezier(.3,1.4,.5,1)' })
        setTimeout(() => !skip && SFX.pop(.9 + i * .07), 90 + i * 45)
      })
      await sleep(1050); if (skip) return
      anim(cur, [{ transform: 'none' }, { transform: `translate(${pos[3][0] + 8}px,${pos[3][1] + 8}px)` }], { duration: 560, easing: 'cubic-bezier(.4,0,.2,1)' })
      await sleep(580); const pick = fan.querySelectorAll(':scope > i:not(.hub)')[3]; anim(pick, [{ scale: 1 }, { scale: 1.3 }, { scale: 1.18 }], { duration: 480, composite: 'add' }); anim(pick, [{ boxShadow: '0 0 0 0 transparent' }, { boxShadow: '0 0 0 4px rgba(255,255,255,.7), 0 0 30px var(--a)' }], { duration: 480 }); if (!skip) SFX.ding()
    } },
    { title: 'Every parcel, until it arrives.', text: 'Track any delivery. Orders you place are saved, one click from the order page.', build: () => MW(`<div class="pg" style="background:#f4f5fa"><div class="plist">${LINES(6)}</div><div class="pcard lgl"><div class="k">${IC('box')}</div><div style="flex:1"><b>New headphones</b><span class="st">Order placed  ·  UPS</span><div class="steps"><s class="on"></s><s></s><s></s><s></s><u></u></div></div></div></div>`, ['Parcels', 'Lisbon trip'], '', 'lumen://parcels'), play: async s => {
      const st = s.querySelector('.st'), steps = s.querySelectorAll('.steps s'), k = s.querySelector('.pcard .k'), u = s.querySelector('.steps u')
      anim(s.querySelector('.pcard'), [{ opacity: 0, transform: 'translateY(16px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 750 })
      for (const [i, t] of ['On the way', 'Out for delivery', 'Delivered'].entries()) { await sleep(520); steps[i + 1].classList.add('on'); u.style.left = ((i + 1) / 3 * 100) + '%'; st.textContent = t + '  ·  UPS'; if (!skip) SFX.tick(i * 2) }
      k.style.background = 'linear-gradient(135deg,#34c759,#30b04f)'; anim(s.querySelector('.pcard'), [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 560 }); if (!skip) SFX.ding()
    } },
  ]
  // where each shot sits: the camera orbits a little between them, so every shot arrives from a new angle
  const POSE = i => ({ x: (i % 2 ? -1 : 1) * 46, ry: (i % 2 ? 1 : -1) * 30, rx: [8, 4, 10, 5][i % 4] })
  const REST = 'translate(0,-6vh)'
  const ART = ['tabs', 'search', 'shield', 'sparkle', 'translate', 'moon', 'split', 'bolt', 'layers', 'box']
  // the tour is cut into chapters, each opened by a title card on the beat
  const CHAPTERS = { 2: ['Protect', 'Private <em>by default.</em>'], 3: ['Understand', 'Every page, <em>explained.</em>'], 5: ['Your way', 'Made <em>yours.</em>'], 7: ['Built in', 'Two apps. <em>Zero installs.</em>'] }
  async function chapter([kick, line], n, cap) {
    root.classList.add('tight')
    if (cap) anim(cap, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 })
    const s = scene(`<div class="title trailer"><div class="tc sm"><small>${String(n).padStart(2, '0')}  ${kick}</small>${line}</div></div>`), tc = s.querySelector('.tc')
    slamIn(tc, { from: 1.35 }); SFX.hit(n); pop(.14, 3); leak(.4, n % 2 ? 1 : -1, 1200)
    await sleep(BEAT * 1.5)
    cutOut(tc, 200); await sleep(200); s.remove()
    root.classList.remove('tight')
    if (cap) anim(cap, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
  }
  async function tour() {
    tween(sky, 'bokeh', .45, 1600); tween(sky, 'neb', .7, 1600); focus(2.5, 1200); tween(sky, 'caus', 1, 2000)
    const cap = document.createElement('div'); cap.className = 'tourcap'
    cap.innerHTML = `<span class="n"><span class="num"></span><span class="dots">${TOUR.map(() => '<i></i>').join('')}</span></span><h2></h2><p></p>`; root.appendChild(cap)
    const dots = cap.querySelectorAll('.dots i')
    let prev = null
    for (let i = 0; i < TOUR.length && !skip; i++) {
      if (CHAPTERS[i] && !skip) {
        // the shot on screen swings away while the chapter card slams in
        if (prev) { const o = prev, op = POSE(i - 1), orig = o.querySelector('.rig'); orig.getAnimations().forEach(done); anim(orig, [{ opacity: 1, transform: 'translate3d(0,-6vh,0)' }, { opacity: 0, transform: `translate3d(${-op.x}vw,-4vh,-380px) rotateY(${-op.ry}deg)` }], { duration: 520, easing: 'cubic-bezier(.55,0,.4,1)' }); setTimeout(() => o.remove(), still ? 0 : 560); prev = null; focus(0, 300) }
        await chapter(CHAPTERS[i], Object.keys(CHAPTERS).indexOf(String(i)) + 1, cap)
        focus(2.5, 600)
      }
      const f = TOUR[i], p = POSE(i), s = scene(`<i class="halo"></i><div class="art ${i % 2 ? 'l' : 'r'}">${ICONS[ART[i]] || ''}</div><div class="rig"><div class="glass glassf">${f.build()}<i class="glare"></i></div></div>`, 'flat')
      const rig = s.querySelector('.rig'), frame = s.querySelector('.glassf')
      lensAll(s)
      anim(s.querySelector('.halo'), [{ opacity: 0, transform: 'scale(.7)' }, { opacity: .55, transform: 'none' }], { duration: 1200, easing: 'cubic-bezier(.16,1,.3,1)' })
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
      cap.querySelector('.num').textContent = String(i + 1).padStart(2, '0') + '  /  ' + String(TOUR.length).padStart(2, '0')
      dots.forEach((d, j) => { d.className = j === i ? 'on' : j < i ? 'past' : '' })
      words(cap.querySelector('h2'), f.title, 100, 40)
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
    const t = scene(`<div class="title trailer"><div class="tc sm"><small>${short ? 'New in ' + FILM_V : 'Introducing'}</small>The new <em>home screen.</em></div></div>`)
    slamIn(t.querySelector('.tc'), { from: 1.3 }); SFX.hit(2); pop(.18, 4); leak(.5, 1, 1600)
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
  // the closing montage: three words, three beats
  async function montage() {
    if (skip) return
    const ws = ['Lighter.', 'Faster.', '<em>Yours.</em>']
    const s = scene(`<div class="title trailer">${ws.map(w => `<div class="tc">${w}</div>`).join('')}</div>`), tcs = s.querySelectorAll('.tc')
    for (let i = 0; i < tcs.length && !skip; i++) {
      if (i) hardCut(tcs[i - 1])
      slamIn(tcs[i], { from: 1.4 }); SFX.hit(i + 1); pop(.12 + i * .06, 3 + i * 2)
      await sleep(i === tcs.length - 1 ? BEAT * 1.5 : BEAT)
    }
    await leave(s, 360)
  }
  async function whatsNew(version) {
    const items = WHATS_NEW.items
    tween(sky, 'bokeh', .6, 1500); focus(2, 1100); leak(.6, -1, 1800)
    const s = scene(`<div class="new"><span class="eyebrow chrome">New in Lumen ${version || WHATS_NEW.version}</span><h1>The biggest update yet.</h1><div class="grid">${items.map((it, i) => `<div class="it glass sweep" style="--sd:${1.3 + i * .08}s"><div class="hd"><div class="k">${ICONS[it.icon] || ''}</div><span class="no2">${String(i + 1).padStart(2, '0')}</span></div><span>${it.text}</span></div>`).join('')}</div></div>`, 'flat')
    lensAll(s)
    anim(s.querySelector('.eyebrow'), [{ opacity: 0, transform: 'translateY(-10px)', letterSpacing: '.6em' }, { opacity: 1, transform: 'none', letterSpacing: '.24em' }], { duration: 1100 })
    slamIn(s.querySelector('h1'), { from: 1.25, ms: 900, k: 12 }); setTimeout(() => { if (!skip) { SFX.hit(1); pop(.1, 2) } }, 60)
    s.querySelectorAll('.it').forEach((el, i) => {
      const fromX = (i % 4 - 1.5) * 50
      anim(el, [{ opacity: 0, transform: `translate(${fromX}px,40px) scale(.9)`, filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 1000, delay: 480 + i * 75 })
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
    const s = scene(`<div class="fin" style="margin-top:4vh"><div class="logo">${short ? `You are on Lumen ${FILM_V}.` : `Welcome to Lumen ${FILM_V}.`}<i class="drop"></i></div>
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
    holdT = setTimeout(hold, still ? 300 : 4500)
    return new Promise(r => {
      const fin = v => { removeEventListener('keydown', k); clearTimeout(holdT); wake(); clearTimeout(holdT); r(v) }
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
    el.innerHTML = `<i class="fl"></i><div class="am"><div class="ao"><img alt=""></div><span class="ak">Updated</span><b>Lumen ${esc(ver)}</b><small>Welcome back. Your tabs are right here.</small></div>`
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
    root.innerHTML = `<svg class="defs" aria-hidden="true"><defs></defs></svg><div class="cam"><div class="nebw"><div class="neb"></div></div><canvas></canvas><div class="flare"></div><div class="stage"></div></div><div class="leak"></div><div class="ca"></div><div class="grain"></div><div class="vig"></div><div class="bar t"></div><div class="bar b"></div>
      <div class="credit"><i></i>${wn ? 'Lumen <b>' + esc(String(wn).replace(/\.0$/, '')) + '</b>' : 'A Lumen picture'}</div><button class="skip chrome">Skip intro<kbd>esc</kbd></button><button class="skip mute chrome">Sound on</button><div class="meter"><i></i></div>`
    document.body.appendChild(root)
    // the restart's last frame hands over to the film
    if (arriveEl) setTimeout(() => leaveArrive(true), still ? 0 : 700)
    defs = root.querySelector('svg.defs defs'); lensCache = {}; lensN = 0
    cv = root.querySelector('canvas'); cx = cv.getContext('2d', { alpha: false })
    size(); addEventListener('resize', size)
    root.querySelector('.grain').style.background = `url(${grainURL()})`
    grainAnim = still ? null : root.querySelector('.grain').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-3%,2%)' }, { transform: 'translate(2%,-3%)' }, { transform: 'translate(0,0)' }], { duration: 600, iterations: Infinity, easing: 'steps(4)' })
    // the iris opens on the first frame
    if (!still) root.querySelector('.cam').animate([{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(6% at 50% 50%)', offset: .35 }, { clipPath: 'circle(80% at 50% 50%)' }], { duration: 1700, easing: 'cubic-bezier(.6,0,.2,1)' })
    stars = Array.from({ length: Math.round(Math.min(900, W * H / 1600)) }, () => newStar())
    bokeh = Array.from({ length: 16 }, () => ({ x: Math.random(), y: .1 + Math.random() * .9, r: 30 + Math.random() * 90, h: [0, 30, 60, 95][Math.floor(Math.random() * 4)], a: .4 + Math.random() * .6, sx: .1 + Math.random() * .25, sy: .08 + Math.random() * .2, p: Math.random() * 6, v: .01 + Math.random() * .03 }))
    caus = Array.from({ length: 110 }, (_, i) => ({ u: Math.random() * 2 - 1, w: Math.random() * 2 - 1, s: Math.random(), p: Math.random(), v: .12 + Math.random() * .2, up: i % 4 === 0 }))
    nebula = paintNebula(); sprite = paintSprite()
    Object.assign(sky, { oy: 0, speed: .4, warp: 0, gather: 0, orb: 0, orbR: 0, ring: 0, shock: [], flash: 0, shake: 0, rays: 0, bokeh: 0, neb: 0, dof: 0, ghosts: 0, caus: 0 }); Object.assign(camera, { x: 0, y: 0, px: 0, py: 0, push: 0, roll: 0, lift: 0 }); dofShown = -1
    const onMove = e => { camera.px = e.clientX / innerWidth - .5; camera.py = e.clientY / innerHeight - .5; if (held) wake() }
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
      const ACTS = { cold: coldOpen, warp: () => warp(1500), ignite, tour, home: homeReveal, montage, whatsNew: () => whatsNew(FILM_V) }
      await sleep(200); for (const a of only) if (ACTS[a]) await ACTS[a]()
      removeEventListener('keydown', onKey); if (skip) clearStage(); skip = false
      answer = await finale({ short: true })
    } else if (still) {
      // Motion off or reduced motion: no film, just the last frame, still and instant
      removeEventListener('keydown', onKey); sky.neb = .9; root.classList.add('lit')
      answer = wn ? (askParcels ? await finale({ short: true, ask: true }) : await finale({ short: true })) : await finale()
    } else if (wn) {
      // after an update: warp, "Fresh from an update, Lumen 4.0", what is new, the new home screen, and you are on it
      await sleep(300); await warp(1800); await ignite({ short: true }); await whatsNew(String(wn).replace(/\.0$/, '')); await homeReveal({ short: true })
      removeEventListener('keydown', onKey)
      if (!skip || askParcels) { if (skip) clearStage(); skip = false; answer = await finale({ short: true, ask: askParcels }) }
    } else {
      // a first launch is the whole trailer; what is new is only for people who update
      await sleep(400); await coldOpen(); await warp(1500); await ignite(); await tour(); await homeReveal(); await montage()
      removeEventListener('keydown', onKey)
      // the last scene asks one question, even when the film itself was skipped
      if (skip) clearStage()
      skip = false
      answer = await finale()
    }

    // out: the frame dissolves into the browser
    SFX.fadeOut(.9)
    root.classList.remove('on')
    await new Promise(r => { root.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.05)' }], { duration: still ? 1 : 800, easing: 'ease-in', fill: 'forwards' }).onfinish = r })
    cancelAnimationFrame(raf); clearTimeout(holdT); removeEventListener('resize', size); removeEventListener('pointermove', onMove); try { grainAnim && grainAnim.cancel() } catch {} grainAnim = null; root.remove(); defs = null
    onDone && onDone({ parcels: answer })
  }
  window.Intro = { play, WHATS_NEW, arrive, leaveArrive }
})()
