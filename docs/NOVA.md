# Lumen Nova: the design language (1.23)

Everything in Lumen gets redesigned in this one language, so every surface feels like the same product.

## Materials
- Liquid glass: translucent layers with `backdrop-filter: blur(28px) saturate(1.8)`, a specular top highlight
  (`inset 0 1px 0 rgba(255,255,255,.55)` light, `.14` dark), and a refractive edge: a 1px gradient border from the
  accent to transparent to `--accent3` (mask trick). Depth comes from 2-3 stacked soft shadows tinted with the accent.
- Real liquid glass, and more of it: glass bends what is behind it, not just blurs it. Use an SVG
  displacement filter on the backdrop (`backdrop-filter: url(#lumen-lens) blur(..) saturate(..)`) so edges
  refract like a thick lens, add a chromatic fringe at the rim, a moving specular glint that follows the pointer,
  and an inner caustic glow. Every floating surface uses it: toolbar capsules, menus, right-click menus, popovers,
  the command bar, dialogs, toasts, cards on the pages, the update card, Surge and Koi panels. Fall back to plain
  blur where the filter is not supported or Motion is off.
- Backgrounds: light is porcelain `#f5f6fb` with a slow accent nebula; dark is deep ink `#0a0c15` with the same nebula
  plus a faint star dust. Never flat grey.

## Color
- Everything derives from the user's `--accent`:
  `--accent2: oklch(from var(--accent) calc(l - .02) c calc(h + 40))`,
  `--accent3: oklch(from var(--accent) calc(l + .04) c calc(h + 95))`,
  `--nova: linear-gradient(135deg, var(--accent), var(--accent2) 55%, var(--accent3))`.
- Never hard-code the blue. Text stays high-contrast.

## Shape and type
- Radii: small controls 12px, chrome pieces 16px, cards and panels 24px, pills fully round.
- Headings: `ui-rounded, "SF Pro Rounded", system-ui`, weight 800, letter-spacing -0.03em; big and confident.
  Body: system font, 13-15px, comfortable line height.
- Generous spacing; nothing cramped.

## Signature details
- Energy reference (owner's favourite): the section hero banner. Big glass banner, glowing gradient icon tile,
  huge bold title, drifting saturated colour blobs, a large faint outline icon, a light sweep on open. Every
  surface should have this much energy: bold, saturated accent glow, big confident type, real depth.
- Halo: active, selected and focused things get a soft accent glow ring (`0 0 0 4px` accent at 18% plus a 24px blur
  glow), never a hard outline.
- Light sweep: primary buttons and new content get one diagonal light sweep when they appear.
- Gradient text for the most important title on each surface.

## Motion
- Spring physics everywhere through Lumen's Jelly/spring helpers: toned down, lively, no rubber-banding on scroll.
- Staggered entrances (40-60ms apart), hover lifts of 1-2px, presses squish to ~0.96.
- Everything still and instant under `prefers-reduced-motion` and when Motion is Off.

## Rules
- No emojis anywhere, ever. Plain words only.
- Light and dark, every accent color, tabs on top and tabs in the sidebar, 1280px and 900px wide: nothing overlaps,
  clips or spills.

## Scope: literally everything
Every surface Lumen draws, plus the things it used to leave to the system: the app icon and all 8 icon choices, Surge's
and Koi's menu-bar icons, right-click menus on web pages and tabs (drawn by Lumen in Nova instead of the plain system
menu), and Lumen's pop-up questions such as Quit Lumen (Nova dialogs instead of system alerts). Notifications and the
macOS menu bar stay native: the system draws those.
