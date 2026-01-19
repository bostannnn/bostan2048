# Technical Design Document (TDD) - v2.1 (ESM)

Canonical spec: `SOURCE_OF_TRUTH.md`. This TDD is a synchronized technical summary.

## 1. Architecture Overview
Arcade City uses a **Hub & Spoke** model implemented with modern JavaScript **ES Modules**.

### 1.1 The Console (App Shell)
`app.js` acts as the operating system. It handles:
*   **Routing:** Switching between `city`, `2048`, `games`, and `shop` views.
*   **Lifecycle:** Orchestrating `mount`, `start`, `pause`, and `resume` calls on active game modules.
*   **Global State:** Managing `EconomyManager` (coins/inventory) via `core.js`.
*   **Leaderboards:** Opens the leaderboard sheet on `game:over` events and pipes data through `LeaderboardManager` (local-first, Firebase-enabled).

### 1.2 The Cartridges (Game Modules)
Each game is a standalone module in `src/games/`.
*   **Interface:** All games must inherit from `src/core/GameInterface.js`.
*   **Isolation:** Games manage their own DOM injection and internal logic (e.g., `GameManager`, `Grid`).
*   **Communication:** Games talk to the Shell via standard JS events or provided callbacks.

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
*   Storage keys: defaults to `photo2048HighScores` for the 2048 cartridge.

## 3. Rendering
*   **UI:** Native HTML/CSS overlays (fast, accessible).
*   **City:** PixiJS v8 (Canvas) for isometric performance; currently implemented in `city/src/CityScene.js` (legacy).
*   **Minigames:** 2048 board uses PixiJS v8 with HTML overlay UI; Match-3 planned for PixiJS.
*   **Liquid Glass:** `ui/theme.css` carries aurora gradients + `--motion-*` tokens; `ui/components.css` provides glass cards/pills and focus-visible handling. 2048 uses `src/games/2048/style.css` for responsive board sizing and glass overlay animations.

## 3.5 UI Component Guidelines
- Prefer the shared button variants: ui-button (primary), ui-button secondary (glass), ui-button gold (gold CTA), and ui-button mini secondary (44px circular icon chips).
- Do not introduce bespoke UI components inside game styles; add new components to `ui/components.css` and tokens to `ui/theme.css`.
- Reuse the 2048 score chip markup (.score-container with .score-label and .score-value) to maintain sizing and alignment across themes.
- For leaderboards, use the .leader-card structure with .lb-rank, .lb-player (name + date), .lb-score, and .lb-stat-stack for stats (undos/turns). Add stats by extending the stack instead of altering the layout.

### 3.6 Animation & Audio
* **Complex Motion:** GSAP is planned for Match-3 sequencing (swap/drop cascades) and complex UI transitions, but not yet integrated.
* **Audio:** Howler.js is planned for audio sprites and background loops, but not yet integrated.
* **Haptics:** `navigator.vibrate()` is not wired yet; future work may route haptics through `GameInterface`.

## 4. Firebase / Leaderboards
*   Config: `window.firebaseConfig` is defined in `index.html` and loaded before `app.js`; replace with your project keys as needed.
*   Transport: `FirebaseManager` loads Firebase from the CDN to avoid bundling dependencies.
*   Fallback: If Firebase is absent/offline, leaderboard reads/writes remain local only.
*   Stored fields: `name`, `score`, `turns`, `undos`, `timestamp`.
*   Index: Firestore requires a composite index on `leaderboards` for `gameId (ASC)` + `score (DESC)` to satisfy the cloud query; the console will link to create it if missing.

## 5. UI State (Current)
*   Active surface: 2048 only. Bottom navigation is hidden; coins UI is suppressed until the economy/city/shop flows are production-ready.
*   Settings are accessed via the settings overlay; theme toggle lives inside that overlay.
*   Input: Pointer-based swipe handling on a full-height `.game-stage` wrapper with `touch-action: none` keeps the entire play area (including the space beneath the board) interactive without blocking header buttons.
