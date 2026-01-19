# Arcade City - Source of Truth

This document is the canonical spec for the project. If any other document or UI
behavior conflicts with this file, this file wins. Other docs should summarize
and link here.

## Current Product Scope (Playable Today)
- PWA shell with the 2048 cartridge fully playable.
- City view is functional and uses PixiJS, but lives in a legacy folder.
- Games menu and shop view exist in the UI, but only 2048 is meant for users.
- Bottom navigation and coins chip are currently hidden to gate unfinished flows.
- Settings live in the settings overlay (theme toggle, PWA refresh, dev tools).
- Leaderboards work locally and sync to Firebase using the configured project.

## Architecture (ES Modules)
- `app.js` is the shell: routing, lifecycle (`mount`, `start`, `pause`, `resume`),
  and global overlays (leaderboard, settings).
- `src/core/GameInterface.js` defines the required lifecycle hooks.
- 2048 lives at `src/games/2048/` with PixiJS v8 board rendering and HTML UI.
- City rendering is currently in `city/src/CityScene.js` (legacy), with plans to
  move into `src/games/city/` when modularized.

## UI / Design System
- Visual style: Liquid Glass inspired by Apple HIG.
- Tokens: `ui/theme.css` is the source of truth for colors, fonts, spacing, and motion.
- Shared components: `ui/components.css` is the source of truth for reusable UI
  building blocks (glass panels, pills, buttons, lists, inputs, overlays).
- Games must not create new buttons or custom UI components. If a new component
  is needed, add it to `ui/components.css` (and tokens to `ui/theme.css`), then
  reference it from game UI.
- Prefer CSS variables and shared components for colors and spacing; avoid inline
  styles except for small, one-off layout tweaks in overlays.

## Technical Stack
- Rendering: PixiJS v8 for canvas scenes (2048 board, City), HTML/CSS for UI.
- Animation: PixiJS-driven tweens for board motion, CSS animations/transitions for
  UI; GSAP is reserved for complex sequences (e.g., Match-3) when introduced.
- Audio: Howler.js is the planned audio system (not yet integrated).

## Input & Interaction
- 2048 uses pointer events on `.game-stage` with `touch-action: none` so swipes
  register across the full play area.
- Header buttons remain tappable while swipes target the game stage.

## Leaderboards
- Local scores saved under `photo2048HighScores` with player name cached as
  `arcadeCityPlayerName`.
- 2048 dispatches `game:over` with `{ score, stats: { turns, undos } }`.
- `LeaderboardManager` supports local-first storage and optional Firebase sync.

## Economy (Local Only For Now)
- `core.js` provides `EconomyManager` and `AppBus`.
- 2048 awards coins based on score; Match-3/Picross stubs exist for later.
- Coins UI is currently hidden; economy events still fire for future reuse.

## PWA (Manifest + Service Worker)
- The manifest is defined in `vite.config.js` (VitePWA `manifest` option).
- `index.html` must not hardcode a manifest link; VitePWA injects it.
- Dev builds enable VitePWA so the manifest is available in dev.
- Build outputs include `manifest.webmanifest`, `registerSW.js`, and `sw.js`.

## Firebase (Optional)
- Firebase is configured in `index.html` via `window.firebaseConfig` and loads
  from the CDN; leaderboards sync to Firestore when online.
- If Firebase is offline, the UI falls back to local scores.
- Firestore requires a composite index: `gameId (ASC)` + `score (DESC)`.

## Agent Workflow
- If new behavior or implementation contradicts this document, the agent must
  ask the user whether to update `SOURCE_OF_TRUTH.md` before proceeding.

## Known Legacy Files
- `manifest.json` is legacy and not used when VitePWA is the manifest source.
