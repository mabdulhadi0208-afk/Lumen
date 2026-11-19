# Lumen

A fast, private desktop browser for Mac and Windows. Chromium engine, so every site works like it does in Chrome, with a calmer, springy interface on top.

## What is built in

- Vertical tabs with spring physics (tuned soft), drag to reorder, pinned tabs, tab sleeping
- Command bar (Cmd+T / Cmd+K / Cmd+L): search, open tabs, history, bookmarks, actions, inline autocomplete
- Ad and tracker blocking (Ghostery engine), Global Privacy Control, HTTPS upgrade option
- Chrome extensions and the Chrome Web Store
- Password manager: saves, autofills, suggests strong passwords, CSV import from Chrome, Touch ID to reveal
- Encrypted sync of bookmarks, passwords and settings through iCloud Drive, Dropbox, Google Drive or OneDrive
- Import bookmarks and extensions from Chrome, Brave, Edge or Arc
- Split view, reader mode, picture in picture, screenshots, find in page, zoom, private windows
- Site permissions (camera, mic, location, notifications) with per-site memory
- Downloads manager, history, bookmarks, session restore, reopen closed tab
- Self-updater from GitHub Releases (works without an Apple developer certificate)
- Default browser support, PDF viewer, spellcheck

## Run it

```
npm install
npm start
```

## Build the Mac app

```
npm install
npm run dist:mac
```

The DMG and ZIP land in `dist/`. Builds are ad-hoc signed. The first time, right-click Lumen in Applications and choose Open.
If macOS says the app is damaged, run `xattr -cr /Applications/Lumen.app` once.

## Releases and auto-update

Push a tag like `v1.0.1` and the GitHub workflow builds Mac (Apple Silicon and Intel) and Windows, then publishes a release.
Installed copies of Lumen check `mabdulhadi0208-afk/lumen` releases and update themselves. Bump `version` in package.json before tagging.

## Shortcuts

| | Mac |
|---|---|
| New tab / command bar | Cmd T, Cmd K |
| Address | Cmd L |
| Toggle sidebar | Shift Cmd S |
| Split view | Shift Cmd \ |
| Reader mode | Shift Cmd E |
| Picture in picture | Shift Cmd P |
| Reopen closed tab | Shift Cmd T |
| Find | Cmd F |
| Private window | Shift Cmd N |
