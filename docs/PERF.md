# Lumen perf budget

Lumen should feel instant: nothing on screen may cost frames it does not need. Every surface keeps its look
(glass, gradients, hero banners, jelly motion); when a technique is expensive, draw the same thing a cheaper way.
These are hard limits. A change that breaks one needs a reason written next to it.

## Budget

| Rule | Limit |
| --- | --- |
| Stacked backdrop-filters | At most 2 glass layers on top of each other at any point of the screen (a menu over a toolbar is 2). Never a backdrop-filter on something that scrolls or moves over changing content. Scrolling glass is drawn flat (tint, sheen, rim, shadow), as `pages/perf.css` does for Settings. |
| Blur radius | At most 24px on any layer larger than a quarter of the window, at most 14px on Home. No `filter: blur()` on anything that animates; use a soft radial-gradient instead (it already looks blurred). |
| SVG lens (`--lens`, glass.js) | Only on small glass that does not redraw on its own: the Home search pill, the Settings sidebar, dialogs, menus, the cursor drop. Never on big, scrolling or ticking glass (cards, widgets, the Home hero, clock digits). |
| Infinite animations | None, anywhere, while idle. A loop is allowed only while the thing it shows is happening (a download running, a page loading, the AI thinking, music playing) and must stop with it. Attention loops (an update waiting) play a few times, then rest. |
| What may animate | Only `transform` and `opacity`. Never `box-shadow`, `filter`, `background-position`, `width`, `height`, `top`/`left`. For a pulsing glow, fade a pseudo-element that carries the shadow. |
| Text carets | Steady (`caret-animation: manual`, set by `ui/perf.css` and `pages/perf.css`). A blinking caret inside glass redraws that glass twice a second. |
| Canvas | Device pixel ratio capped at 2 (`Math.min(devicePixelRatio, 2)`); a canvas draws only while something moves and stops its loop when it settles or is hidden. |
| requestAnimationFrame | Every loop ends when its motion settles (springs: `ui/spring.js`, `ui/jelly.js`) or when its window or panel is hidden. |
| Polling (main process) | No timer runs unless something needs it right now (Reload Every starts its clock only while a tab uses it). Nothing faster than 1 s unless something on screen needs it; 2 s minimum for checks of outside state (helper programs, the clipboard), cached and shared so two callers never launch two helpers. |
| Windows and views | No transparent or always-on-top window stays mapped while idle; hidden views are detached from the window (Nova menus, dialogs and toasts come off when they close). `backgroundThrottling: false` only on views that are on screen whenever they exist (the chrome). No command-line switch that turns off throttling or forces the fast GPU. |
| Main process | No synchronous file writes, `JSON.stringify` of big data or PNG encoding on a hot path (opening tabs, switching tabs, navigation). Longest event-loop stall during normal use: under 50 ms. |
| New Tab | First frame of the Home page within 100 ms of Cmd T (the preloaded New Tab in `src/main.js` does this). |
| Settings and Home scroll | 60 fps. Mouse wheels and trackpads both glide on the Jelly scroll spring (`Jelly.smoothScroll`: critically damped, no rubber-banding; a stiffer spring for trackpads so it keeps up with the fingers). One `scrollTop` write per frame, the rAF loop stops when it settles, no layout reads in the wheel handler unless over a nested scroller. A wheel listener that only passes events through is worse than either (it blocks the compositor for nothing), so a page either glides or has no wheel listener. Measure with `ONLY=scroll test/perfpages.js`, `PAD=1` for a trackpad. |
| Idle CPU | Under 1% for every process (main, chrome, each tab, Surge, Koi) with nothing happening. |

Measure with `test/perfpages.js` (CPU seconds per workload, frame gaps, main-process stalls), `test/perfidle.js`
(idle CPU per webContents and the main process's timer wake-ups), `test/perfbudget.js` (backdrop layers, infinite
animations, live timers) and `test/perftrace.js` (a Chromium trace of a scroll: what repaints). They are not part of
the release suite.

## Culprits found in files owned by the visual work (4.1 speed pass)

Fixed for now by overrides in `pages/perf.css` and `ui/perf.css`. Please fold these into the real stylesheets and
then drop the override.

| Where | What it costs | Cheap equivalent |
| --- | --- | --- |
| `pages/home.css:230` `.hm-search` (with the autofocused `#q`) | The blinking caret redrew the glass pill with its SVG lens twice a second: about a third of a core in the GPU process for as long as a New Tab was open. | Steady caret (`caret-animation: manual`). Done in `pages/perf.css`. |
| `pages/app.css:394` `.card` (also `:222 .seg.big`, `:250 .note.errnote`, `:431`, `:518`, `:558`, `:576`, `:656`, `:690`, `:706`, `:712`, `pages/pages4.css:52`, `:181`, `:538`, `:559`) | `backdrop-filter: var(--lens) blur(22px) saturate(1.9)` on every card that scrolls: every frame of a scroll re-blurs every visible card through a per-pixel displacement map. Settings scrolled at 3 to 7 fps here. | Flat glass in `.main`: same tint plus 3.5% accent (stands in for the saturate), sheen, rim and shadow, no backdrop-filter. The backdrop is the fixed nebula, which is soft gradients, so blurred or not it looks the same. Done in `pages/perf.css`. |
| `pages/app.css:362` `.hero` and `:371` `.hero-orb` | A lensed backdrop-filter banner with three `filter: blur(34px)` orbs animating inside it (`orba`, `orbb`, 14 to 17 s, twice): 28 s of full re-filtering on every Settings page open. | Orbs as `radial-gradient(closest-side, color, transparent)` with no filter, moving by `transform` only; the hero as flat glass (done in `pages/perf.css`). |
| `pages/home.css:121` `.hm-orb` | `filter: blur(40px)` on animated orbs inside the lensed Home hero. | Same as above: pre-softened radial gradients, `transform` only. |
| `pages/home.css:109` `.hm-hero` / `.hm-glass` | Big lensed glass that also redraws every second with the clock. | No lens on the hero (done); keep blur 14px. |
| `pages/home.css:193-198` `.cg-sh`, `.cg-body`, `.cg-hi` (clock digits) | Each digit cell has its own backdrop-filter (lens, blur, saturate 2.2, brightness, contrast), a mask, a blurred shadow and `mix-blend-mode`; the seconds digits redraw every second. | Fill the digits with a gradient (no backdrop-filter, no lens; lens off done in `pages/perf.css`), or tick the seconds only when the seconds style is picked. |
| `pages/app.css:98-110` `body::after` star dust (dark) | `twinkle 7s infinite` under the sticky glass sidebar: the sidebar re-filtered every frame for as long as any dark Settings page was open. | Still stars at the middle of the twinkle (done in `pages/perf.css`). |
| `pages/app.css:396-397` `.card` `transition: box-shadow .35s` on hover | Repaints the whole card (and its 70px shadow) every frame of the hover. | Put the lifted shadow on `::before` and transition its `opacity`. |
| `pages/app.css:266` `nv-float 4.5s infinite`, `:268` `.empty::after nv-spin 40s infinite` | Empty states (no history, no downloads) loop forever. | Play 2 times and rest. |
| `pages/app.css:528` `pcpulse`, `:539` `stepglow` | `box-shadow` and `filter` keyframes. | Fade a pseudo-element with the glow. |
| `ui/ui.css:358-362`, `:1396-1405` `.update` pill (`nova-pulse`, `upflow`, `upbob`, `nova-sweep`) | `box-shadow` and `background-position` animated forever while an update waits (can be days): the toolbar repaints every frame. | Play a few times then rest (done in `ui/perf.css`); for the pulse, fade a `::before` that carries the halo. |
| `ui/ui.css:1324` `picglow`, `:1261` `hungpulse` | `box-shadow` keyframes, infinite. | Opacity on a pseudo-element. |
| `ui/ui.css:327`, `:1365` `eqb`/`eqb2` (playing bars) | Animate `height` (layout every frame while music plays). | `transform: scaleY()` with `transform-origin: bottom`. |
| `ui/ui.css:1195` `pindot` | Animates `width`, `margin-left` and `filter`. | `transform: scaleX()` and opacity. |
| `ui/ui.css:651` `.tg-scrim` | `backdrop-filter: blur(30px)` over the whole window (tab grid), above more glass. | 20px at most, or a pre-tinted scrim while the cards animate in. |
| `ui/menu.html:58-67`, `ui/dialog.html:60-80` | Infinite `drift` and orb animations with `filter: blur(30px)` and `mix-blend-mode: plus-lighter` under the menu's glass while it is open. | Two passes, then rest (dialog.html already caps the orbs); orbs as radial gradients without filter. |
| `ui/update.html:31` `.bg .au` | `filter: blur(34px)` on a full-window aurora behind the update card. | A pre-softened radial-gradient aurora, `transform` only. |
| `pages/app.css:394-397` `.card:hover` and the glint in `pages/glass.js` | While Settings scrolled, cards passing under the still pointer started their hover (box-shadow transition) and glint one after another: two cards repainted on every frame. | Nothing under the pointer reacts while a page scrolls (`.is-scrolling`, `pages/perf.css` and `pages/glass.js`). |
| `pages/app.css:394` `.card` shadows (`--shadow`, `--gsh`) | Two big outer shadows (up to 70px blur) and four inset ones per card were re-rasterised with every newly exposed strip of the page. | Each card is its own layer (`will-change: transform`, `pages/perf.css`), so it is drawn once and a scroll only moves it. |
| `pages/home.css:209-215` `.amb-dots` (70 s), `.amb-spark`, `.amb-lines` (Home banner ambience, infinite) | Keeps the Home hero redrawing every frame while Home is on screen: about a whole core in software rendering (test/newtabspeed.js idle), and the GPU never idles on a Mac. Left as designed for now (home40 expects it); it pauses off screen. | Play two passes after the page opens, then rest (the Settings hero dots do this, `pages/perf.css`). |
| `pages/pages41.css:375-376` `.hero-dots` `hd-a`/`hd-c` infinite | Same: Settings at idle used a full core in software rendering. | Two passes, then rest (done in `pages/perf.css`). |

## Main-process work that was on hot paths (fixed in this pass)

- New Tab: a preloaded, already drawn New Tab per window (`warmSpare` in `src/main.js`), reloaded in the background
  when what it shows changes. It stays attached just outside the window, at the page area's size, so on macOS it keeps
  its drawn frame; Cmd T (handled in the main process, before the key goes anywhere) only moves it into place and sends
  one state update to the chrome; everything else waits until after that frame. Measure with `test/newtabspeed.js`.
- Tab switch and Cmd K: the page snapshot (hover preview, the glass under the command bar) is encoded as JPEG instead
  of PNG (several times quicker on the main process, a fraction of the size over IPC).
- History: the sorted history and Most visited are worked out once per change instead of on every New Tab
  (`src/data.js`); history can hold 20,000 pages.
- Saving: the debounced writes of every store (history, session, settings...) go to disk off the main thread
  (`src/store.js`); `flush()` stays synchronous for quitting.
- Reload Every: its once-a-second clock only runs while a tab uses it (it woke Lumen every second, all day).

## 4.1 lag pass: main process, IPC, startup (no animation touched)

Probe: `test/perf41.js` (startup, event-loop delay per scenario, IPC to the chrome, keystroke latency over 20,000
history pages, tab switch, 30 tabs open and closed, idle CPU), with ceilings that fail on a regression. Numbers below
are 4.0 and then 4.1 on the same machine, same probe.

| Fix | Where | 4.0 | 4.1 |
| --- | --- | --- | --- |
| Filter lists are parsed and serialized on a worker thread; the main process only deserializes the cached engine | `src/adblock-worker.js`, `buildAdblockEngine` in `src/main.js` | startup event-loop stall 1.6 to 2.7 s (first launch, every 8-hour list refresh, YouTube "stuck" refresh) | 0.17 to 0.28 s |
| The window shows when the chrome's document is ready, not when every favicon in it has loaded; bookmarks bar favicons load lazily | `BrowserWin` constructor, `lazyFav` in `ui/ui.js` | chrome first paint 4.2 s (with 300 bookmarks), 5.7 s on a used profile | 1.0 s |
| Command bar and Home search: local results (history, bookmarks, tabs) come back at once; the search engine's suggestions follow separately and are cached a minute; history is searched through precomputed lower-case keys and a query that extends the last one only searches its matches | `suggest` / `webSuggest` in `src/main.js`, `listHistory` in `src/data.js`, `refresh` in `ui/ui.js`, `bindSearch` in `pages/home.js` | `suggest()` 300 to 400 ms (waited for the network); keystroke to results p95 0.3 to 1.2 s | `suggest()` local 1 to 3 ms; p95 180 to 340 ms |
| Tab thumbnails are captured on switch but shrunk and JPEG-encoded later, when idle (or at once when asked for) | `snapTab` / `thumbOf` in `src/main.js` | tab switch on screen p95 190 to 270 ms, stall 85 to 107 ms | p95 50 to 70 ms, stall 15 to 25 ms |
| A visit moves its page to the front of the sorted history instead of re-sorting 20,000 pages; history is written at most every 3 s while browsing | `addHistory` / `flushHistory` in `src/data.js` | browsing stall 77 to 222 ms | 21 to 38 ms |
| Identical state updates are not sent; `hover-url` only when it changes; blocked requests of background tabs push nothing | `pushState`, `hoverURL`, `request-blocked` in `src/main.js` | 12.1 to 12.4 messages/s while browsing | 7.2/s |
| The bookmarks bar refetches only when the bookmarks change (`bmRev` in the state) and rebuilds only when its items or width change; toolbar icons and Now Playing are rewritten only when they change; the active tab is scrolled into view only when it or the strip changes | `ui/ui.js` | an IPC call, a full bar rebuild and a forced layout loop 250 ms after every state update | none |
| Tab preload: the settings it needs arrive by an async message (was `sendSync` on every page and every iframe); the password manager watches the whole document only on sites with saved passwords and otherwise binds a field when it gets focus | `src/preload-tab.js`, `lumen:qol` in `src/main.js` | 2 synchronous IPC round trips and a subtree MutationObserver per page | 1 (dark mode's no-flash check, top frame only); no observer |
| Reading time is counted for background tabs when they come forward; download file checks are cached; Reader Mode's source is read once; the window of a webContents is looked up in a map | `src/main.js` | | |

Memory after opening and closing 30 tabs returns to baseline in both (no leaked webContents or listeners). Idle CPU on
a plain page stays under 1.5% per process.

Left alone on purpose (animations, not to be touched in this pass): the Home banner ambience (`.amb-dots`,
`.amb-spark`, `.amb-lines`) and the Settings hero dots (`hd-a`, `hd-c`) loop forever and keep the GPU process at about a
whole core in software rendering while New Tab or Settings is on screen (`test/perfidle.js`). Also not changed: the
packaged updater spawns `curl` every 10 s to look for a release (`src/updater.js`, auto-update work has its own rules).

## The 20 ms bar (4.1)

Every interaction answers within 20 ms of the input. `test/perf20.js` measures each one through the real input
pipeline. It waits for a quiet machine (load average under 3), then records two times: ready (the response is in the
DOM of the renderer that draws it: everything Lumen's code does) and frame (the first animation frame that paints it).
The bar is asserted on ready. Frame adds the compositor, which on a software-rendered Linux test machine is slow on its
own (a 4 px box moving in the chrome: frame gaps p50 17 ms, p95 50 ms), so it is reported, not asserted.

- Command bar and address bar: the chrome keeps its own copy of history (sent once when idle after startup, then
  changes as they happen, `hist`) and bookmarks (`bmAll`, refetched when `bmRev` changes), and searches it in the
  input handler: the local results are drawn in the same task as the key. The main process adds only what it alone
  knows (calculator, units, parcels, other windows' tabs) and the search engine's suggestions follow.
- Tab click, tab close: the strip answers locally in the same frame (`localActivate`, `localClose` in `ui/ui.js`); the
  state from the main process settles it.
- The tab in front loading, navigating or changing its title pushes the state on the next turn of the event loop
  instead of after 50 ms (`pushStateSoon(fast)`): Back and Forward show at once.
- Main menu and site info popovers: their data is fetched ahead (after the state settles and when the pointer reaches
  the button) and drawn from that; a fresher answer replaces the contents quietly.
- Settings sidebar: the pressed section is marked at once; its page follows.

Still over 20 ms, and why (nothing here may change an animation):
- Settings and Home scrolling with a mouse wheel: `Jelly.smoothScroll` glides wheel steps on animation frames, so the
  first move waits for a frame, and Home's frames are slow while its banner ambience loops (see above).
- Settings section switch: the press is marked at once, but on some presses the page's main thread is still busy with
  its entrance and banner animations when the input arrives.
- Cmd T, the New Tab page's first frame: on Linux and Windows the preloaded New Tab is drawn when it is taken (on macOS
  it keeps its drawn frame off screen).
