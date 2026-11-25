# Lumen

Lumen is an Electron (Chromium) browser for Mac and Windows: just the browser. Since 4.0, Surge and Koi are separate Mac apps again, from their own repos (`mabdulhadi0208-afk/surge`, `mabdulhadi0208-afk/mabdulhadi0208-afk-koi`); Lumen only links to their downloads (Settings, Get Surge and Koi).

- Repo: `mabdulhadi0208-afk/lumen`, branch `main`
- Website: https://getlumen.info (GitHub Pages from the `gh-pages` branch, domain on GoDaddy). Keep the claude.ai copy in step too: https://claude.ai/artifact/7PLHZoZDB7J1WvQDCHh2ZA (artifact slug `33b51480-35c9-428a-ac2c-53ab06bcd50d`)
- Mac download: https://github.com/mabdulhadi0208-afk/lumen/releases/latest/download/Lumen-mac-arm64.dmg

## Rules (never break these)

1. NO EMOJIS anywhere in the app or the website, ever. Emojis in chat replies to the owner are fine.
2. Talk to the owner in Gen Z slang with emojis.
3. Jelly spring physics on every motion (`ui/spring.js`, `ui/jelly.js`): toned down, lively, no rubber-banding on scroll.
4. Before every release: test it, check for misplaced UI and bugs, and make sure the app does not crash or freeze when it auto-updates.
5. After every update, give the owner the website link and the Mac download link.
6. If the owner only asks a question, answer it. Do not build anything.
7. Tabs are on top by default. Cmd T opens a new tab. Cmd K opens the command bar.
8. Never commit signing keys, `.p12` files or secrets.
9. Always run commands in the background.
10. LITERALLY EVERYTHING gets a MASSIVE glow-up: every part of Lumen (every screen, page, popover, menu, right-click menu, dialog, button, animation, window and icon, Surge and Koi included), the website, and every release. Design language: docs/NOVA.md. Not a small polish: a big, obvious level-up every time.
11. Every Lumen update:
    - Update the website.
    - Rewrite `WHATS_NEW` in `ui/intro.js` with only that version's changes; remove everything from older versions.
    - Make the intro more cinematic than the last version.
12. Whenever the work touches anything with an auto-update feature, make the update experience look way, way better. In Lumen that means the update card (`ui/update.html`) and the restart flow, and the update bits in Surge and Koi.

## How to release

1. Bump `version` in `package.json` and push to `main`. Only a `package.json` change on `main` starts a release.
2. GitHub Actions (`.github/workflows/release.yml`) builds the app, runs the release gate and publishes it.
3. The release notes come from the bullet list in the release commit's message, so write that list for users.

## Testing

- Run a test with `xvfb-run -a npx electron test/NAME.js --no-sandbox`. Each test prints PASS and FAIL lines; newer tests also write them to `/tmp/lumen-NAME.log`.
- Before every release, run the full suite on a git worktree of the exact release commit, with `node_modules` symlinked in.
- The suite: `adallow addbtn batch12 dark dark2 polish qol3 sweep trcard trcard2 v17 v20 readlater wave13 wave14 wave15 wave16 gsignin updatecard wave19 ytfix passkeys2 novamenus inpage home40 noapps sweep41 motion40 ai41 layout42 logos43`.
  - `sweep` should print NO ERRORS.
  - `selftest.js` was already broken before these rules and is unrelated.

## Code map

- `src/main.js`: the main process.
  - `ipcMain.handle('ui', ...)` serves the browser chrome.
  - `ipcMain.handle('lumen', ...)` serves the internal `lumen://` pages.
  - `PUBLIC_SETTINGS` is the allowlist of settings the pages may change.
- `src/preload-ui.js`: the allowlist of channels the browser chrome may receive. Add new channels here.
- `separateAppsCheck()` in `src/main.js`: the one-time "Surge and Koi are now their own apps" card for people upgrading from 3.x (flag `separateAppsShown`). Lumen never starts, hosts or installs Surge or Koi.
- `src/updater.js` and `ui/update.html`: the updater and its update card.
- `src/nova.js`, `ui/menu.html`, `ui/dialog.html`: the right-click menus and dialogs Lumen draws itself. Use `Nova.popupMenu(w, template)` instead of `Menu.buildFromTemplate(...).popup()` and `novaDialog(w, opts)` instead of `dialog.showMessageBox`; both fall back to the native ones if the Nova view fails.
- `ui/`: the browser chrome (`ui.js`, `ui.css`, `intro.js`, `icons.js`).
- `pages/`: the internal `lumen://` pages (Settings, New Tab and so on).
