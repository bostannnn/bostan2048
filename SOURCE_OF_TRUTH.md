# Arcade City - Source of Truth

Doc version: 1.3

This document is the canonical spec for the project. If any other document or UI
behavior conflicts with this file, this file wins. Other docs should summarize
and link here.

## Current Product Scope (Playable Today)
- PWA shell with the 2048 cartridge fully playable.
- Match-3 cartridge is playable with 10 levels, target scores, move limits, idle hints, invalid swap feedback, auto-shuffles on dead boards, combo/streak scoring, and an end-of-level summary.
- 2048 includes 3 levels with per-level save state; the next level unlocks after reaching 2048, and a Level 4 "coming soon" card is shown.
- The 2048 header uses a Levels button (replacing New Game) that opens the level select overlay, and game-over uses Try Again + Levels actions.
- Level tile portraits load from `public/assets/levels/level-<n>/` and the level select overlay shows a preview image per level (currently `2048.jpg`).
- City view is functional and uses PixiJS, implemented in `src/games/city/`.
- Navigation includes direct access to 2048, Match-3, City, and Shop.
- Bottom navigation is visible; the coins chip is visible in the 2048 header.
- Settings live in the settings overlay (theme toggle, PWA refresh, dev tools).
- Leaderboards work locally and sync to Firebase using the configured project.

## Architecture (ES Modules)
- `app.js` is the shell: routing, lifecycle (`mount`, `start`, `pause`, `resume`),
  and global overlays (leaderboard, settings).
- `src/core/GameInterface.js` defines the required lifecycle hooks.
- 2048 lives at `src/games/2048/` with PixiJS v8 board rendering and HTML UI; the `LEVELS` list in `src/games/2048/index.js` defines level metadata and asset folders.
- Match-3 lives at `src/games/match3/` with PixiJS v8 board rendering and HTML UI; the `LEVELS` list in `src/games/match3/index.js` defines level metadata.
- City rendering lives in `src/games/city/CityScene.js` with a `CityGame`
  cartridge entry in `src/games/city/index.js`.

## Runtime Contracts
- Globals (`window.*`):
  - `window.AppBus`, `window.EconomyManager`
  - `window.FirebaseManager`, `window.firebaseConfig`
  - `window.openLeaderboard`
  - `window.PIXI`
  - `window.effectManager`
  - `window.CustomImages`, `window.customImageAvailability`
- Storage keys (localStorage):
  - `arcadeCityCoins`, `arcadeCityRunProgress`, `arcadeCityInventory`
  - `arcadeCityTheme`
  - `arcadeCityLayout`, `arcadeCityLayout:seed`
  - `arcadeCityPlayerName`
  - `photo2048HighScores:level-<n>`
  - `photo2048:level-<n>:bestScore`, `photo2048:level-<n>:gameState`, `photo2048:level-<n>:undoState`
  - `match3HighScores:level-<n>`
  - `match3:level-<n>:bestScore`, `match3:level-<n>:gameState`
- Events:
  - `game:over` (CustomEvent with `{ score, stats: { turns, undos }, level?, gameId?, mode?, summary?: { movesUsed, movesRemaining, maxComboMultiplier, maxStreak, shuffles } }`)
  - `economy:changed`, `economy:inventory`, `economy:run` (AppBus)

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
- Game-specific CSS should focus on layout, sizing, and positioning; reusable
  visuals belong in shared components.

## Technical Stack
- Rendering: PixiJS v8 for canvas scenes (2048 board, City), HTML/CSS for UI.
- Animation: GSAP drives Match-3 board motion (swaps, drops, spawns), PixiJS
  handles rendering, and CSS animations/transitions cover UI polish.
- Haptics: Match-3 uses `navigator.vibrate()` for invalid swap feedback when available.
- Audio: Howler.js is the planned audio system (not yet integrated).
- Tooling: Firebase Admin SDK is used for one-off leaderboard migration scripts.
- Art: Kenney Puzzle Pack assets provide match-3 gem sprites and placeholders.

## Input & Interaction
- 2048 uses pointer events on `.game-stage` with `touch-action: none` so swipes
  register across the full play area.
- Header buttons remain tappable while swipes target the game stage.
- Match-3 uses pointer input on the board with drag-to-swap, idle hint pulses, and clear invalid-swap feedback; dead boards auto-shuffle.

## Leaderboards
- Local scores saved per level under `photo2048HighScores:level-<n>` with player name cached as
  `arcadeCityPlayerName`.
- 2048 dispatches `game:over` with `{ score, stats: { turns, undos } }`.
- `LeaderboardManager` supports local-first storage and optional Firebase sync.
- Firebase entries include a `level` field; leaderboards are scoped by `gameId` (`2048-level-<n>`).
- Match-3 leaderboards use `match3-level-<n>` and record `turns` with `undos` set to 0.

## Economy (Local Only For Now)
- `core.js` provides `EconomyManager` and `AppBus`.
- 2048 and Match-3 award coins based on score; Picross stubs exist for later.
- Coins UI is visible in the 2048 header; economy events still fire for future reuse.

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
- Changes that add or alter UI components must update `ui/components.css` and
  `ui/theme.css` before adjusting game UI.
- No new globals: any new `window.*` must be documented here and in `TDD.md`.
- No new storage keys or events unless added here with names and payloads.
- No new dependencies without updating the Technical Stack section.
- No direct DOM injection outside `GameInterface.mount()`; all UI entry points
  must be registered in `app.js`.
- Any breaking change must increment the Doc version in this file.
- Do not edit build outputs (`dist/`) or third-party dependencies (`node_modules/`).
- When changing runtime behavior, update `README.md`, `TDD.md`, and `roadmap.md`
  in the same session.

## UI Audit Checklist
- Tokens only (use `ui/theme.css` variables).
- Components only (use `ui/components.css` building blocks).
- No inline styles (except explicitly approved one-offs).
- No new classes without user approval.

## Known Legacy Files
- `manifest.json` is legacy and not used when VitePWA is the manifest source.
