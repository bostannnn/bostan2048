# Technical Design Document (TDD) - v2.1 (ESM)

Canonical spec: `SOURCE_OF_TRUTH.md`. This TDD is a synchronized technical summary.

## 1. Architecture Overview
Arcade City uses a **Hub & Spoke** model implemented with modern JavaScript **ES Modules**.

### 1.1 The Console (App Shell)
`app.js` acts as the operating system. It handles:
*   **Routing:** Switching between `city`, `2048`, `match3`, and `shop` views.
*   **Lifecycle:** Orchestrating `mount`, `start`, `pause`, and `resume` calls on active game modules.
*   **Global State:** Managing `EconomyManager` (coins/inventory) via `core.js`.
*   **Leaderboards:** Opens the leaderboard sheet on `game:over` events and pipes data through `LeaderboardManager` (local-first, Firebase-enabled).

### 1.2 The Cartridges (Game Modules)
Each game is a standalone module in `src/games/`.
*   **Interface:** All games must inherit from `src/core/GameInterface.js`.
*   **Isolation:** Games manage their own DOM injection and internal logic (e.g., `GameManager`, `Grid`).
*   **Communication:** Games talk to the Shell via standard JS events or provided callbacks.
*   **Match-3:** Lives in `src/games/match3/` with PixiJS v8 rendering and per-level targets.
*   **City:** Lives in `src/games/city/` with PixiJS v8 isometric rendering and placement UI.

## 2. Component API Reference

### GameInterface
Every game module must implement:
*   `mount(container)`: One-time setup of HTML/Canvas.
*   `start()`: Activation of game logic/loops.
*   `pause()`: Hibernation (save battery).
*   `resume()`: Re-activation from pause.
*   `destroy()`: Total cleanup.

### EconomyManager
Accessible via `window.EconomyManager`:
*   `awardFromScore(gameId, score)`: Converts game points to coins.
*   `purchaseItem(item)`: Handles transactions.
*   `getInventory()`: Returns owned items.

### LeaderboardManager
Located at `src/core/LeaderboardManager.js`, used by `app.js`:
*   `submitScore(name, score, stats)`: Saves locally and to Firebase (when enabled) with `score`, `turns`, `undos`.
*   `fetchScores(limit)`: Returns `{ local, remote }` score arrays (remote only when Firebase is configured).
*   `isHighScore(score)`: Determines if an entry should prompt the save form.
*   Storage keys: `photo2048HighScores:level-<n>` per 2048 level.

## 2.5 Runtime Contracts
Globals (`window.*`):
*   `window.AppBus`, `window.EconomyManager`
*   `window.FirebaseManager`, `window.firebaseConfig`
*   `window.openLeaderboard`
*   `window.PIXI`
*   `window.effectManager`
*   `window.CustomImages`, `window.customImageAvailability`

Storage keys (localStorage):
*   `arcadeCityCoins`, `arcadeCityRunProgress`, `arcadeCityInventory`
*   `arcadeCityTheme`
*   `arcadeCityLayout`, `arcadeCityLayout:seed`
*   `arcadeCityPlayerName`
*   `photo2048HighScores:level-<n>`
*   `photo2048:level-<n>:bestScore`, `photo2048:level-<n>:gameState`, `photo2048:level-<n>:undoState`
*   `match3HighScores:level-<n>`
*   `match3:level-<n>:bestScore`, `match3:level-<n>:gameState`

Events:
*   `game:over` (CustomEvent with `{ score, stats: { turns, undos }, level?, gameId?, mode?, summary? }`)
*   `economy:changed`, `economy:inventory`, `economy:run` (AppBus)

## 3. Rendering
*   **UI:** Native HTML/CSS overlays (fast, accessible).
*   **City:** PixiJS v8 (Canvas) for isometric performance; implemented in `src/games/city/CityScene.js` with asset URLs resolved against the active base path.
*   **Minigames:** 2048 board uses PixiJS v8 with HTML overlay UI. Match-3 uses PixiJS v8 with asset-based gem sprites and shared HTML overlays. Pixi renders with auto-density at device pixel ratio to keep tiles crisp. Tile portraits load per level from `public/assets/levels/level-<n>/`.
*   **Liquid Glass:** `ui/theme.css` carries aurora gradients plus `--motion-*` and `--ui-space-*` tokens; `ui/components.css` provides glass cards/pills, overlay helpers (`.overlay-centered`, `.overlay-title`, `.overlay-subtitle`, `.overlay-actions`, `.overlay-form`), leaderboard components (`.leaderboard-list`, `.leader-card`, `.leaderboard-entry`, `.leaderboard-status`, `.leaderboard-hero`, `.leaderboard-input`), level select components (`.level-list`, `.level-card`, `.level-status`), and focus-visible handling. 2048 uses `src/games/2048/style.css` for responsive board sizing and glass overlay animations.
*   **Typography:** Font stacks include emoji-capable fallbacks for icon buttons.
*   **Assets:** Match-3 uses Kenney Puzzle Pack gem sprites and placeholder previews/backgrounds.

## 3.5 UI Component Guidelines
- Prefer the shared button variants: ui-button (primary), ui-button secondary (glass), ui-button gold (gold CTA), and ui-button mini secondary (44px circular icon chips).
- Do not introduce bespoke UI components inside game styles; add new components to `ui/components.css` and tokens to `ui/theme.css`.
- Reuse the 2048 score chip markup (.score-container with .score-label and .score-value) to maintain sizing and alignment across themes.
- For leaderboards, use the .leader-card structure with .lb-rank, .lb-player (name + date), .lb-score, and .lb-stat-stack for stats (undos/turns). Add stats by extending the stack instead of altering the layout.

### 3.6 Animation & Audio
* **Complex Motion:** GSAP drives Match-3 sequencing (swap, drop, spawn) and is available for complex UI transitions.
* **Audio:** Howler.js is planned for audio sprites and background loops, but not yet integrated.
* **Haptics:** Match-3 uses `navigator.vibrate()` for invalid swap feedback when available; future work may route haptics through `GameInterface`.

### 3.7 Tooling & Tests
* **Tests:** `npm test` runs a lightweight Node-based harness for 2048 and leaderboard logic.
* **Deployment:** GitHub Actions deploys GitHub Pages from `gh-pages` (manual prod, auto dev). Builds use `VITE_BASE` and `VITE_BUILD_TAG` to set the base path and DEV PWA icon.

### 3.8 Manual QA (Match-3)
* Swipe in all directions and release in gaps between tiles; swaps should still trigger reliably.
* Attempt invalid swaps; confirm flash/shake feedback + haptic pulse.
* Idle for a few seconds; confirm hint pulse appears on a valid move.
* Force a dead board (play until no moves); confirm auto-shuffle + board flash.
* Verify combo/streak scoring changes and the end-of-level summary on game over/win.

## 4. Firebase / Leaderboards
*   Config: `window.firebaseConfig` is defined in `index.html` and loaded before `app.js`; replace with your project keys as needed.
*   Transport: `FirebaseManager` loads Firebase from the CDN to avoid bundling dependencies.
*   Fallback: If Firebase is absent/offline, leaderboard reads/writes remain local only.
*   Scoping: leaderboards use `gameId` per level (`2048-level-<n>`), with local keys `photo2048HighScores:level-<n>`.
*   Stored fields: `name`, `score`, `turns`, `undos`, `level`, `timestamp`.
*   Index: Firestore requires a composite index on `leaderboards` for `gameId (ASC)` + `score (DESC)` to satisfy the cloud query; the console will link to create it if missing.
*   UI: The leaderboard sheet renders the top 10 entries in a scrollable list (scrollbar hidden) with centered titles/actions, a hero pending-score display, and no hint line.
*   Match-3 uses `match3-level-<n>` gameIds and records `turns` with `undos` set to 0.

## 5. UI State (Current)
*   Active surface: 2048, Match-3, and City. Bottom navigation is visible; emoji-labeled score chips and coins display are enabled in the 2048 header with coins placed left of the settings icon.
*   Settings are accessed via the settings overlay; theme toggle lives inside that overlay.
*   Input: Pointer-based swipe handling on a full-height `.game-stage` wrapper with `touch-action: none` keeps the entire play area (including the bottom padding beneath the board) interactive without blocking header buttons.
*   Input polish: while the 2048 view is active, app scrolling is locked and tap highlights/text selection are suppressed (inputs still allow selection).
*   Performance: 2048 background effects pause when the view is inactive.
*   Match-3 input supports drag-to-swap with direction-based fallback, idle hint pulses (~7s idle), invalid swap flash/shake + haptic feedback, auto-shuffles on dead boards, richer clear/cascade visuals with drop-in spawns, reduced-motion compliance, and stale save validation.
*   Match-3 scoring adds combo multipliers + streak bonuses, and the end-of-level sheet includes a summary of run stats.
*   2048 swipe input includes a pointer-up fallback to reduce missed swipes.
*   Levels: 2048 ships with three levels; Match-3 ships with ten levels. The next level unlocks after hitting the prior target.
*   Level select: both games use the shared level selector overlay and Levels header button.
*   Restart: the New Game action opens a confirm overlay (Yes = gold, No = secondary, no close icon) before resetting the run.

## 6. Level Configuration
*   The `LEVELS` list in `src/games/2048/index.js` is the source of truth for level id, display title, asset folder, and preview image.
*   Each level's tile portraits live under `public/assets/levels/level-<n>/` and must include `{2..32768}.jpg` plus a preview image (currently `2048.jpg`).
*   The `LEVELS` list in `src/games/match3/index.js` is the source of truth for board size, color count, target score, and moves.

## 7. Build & Hosting
*   Vite `base` is set via `VITE_BASE` (default `/bostan2048/`) for dev and production; dev root (`/`) redirects to the base path to mirror GitHub Pages asset paths.
