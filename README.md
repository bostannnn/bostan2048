# Arcade City (ESM Version)

## Agent Protocol (MANDATORY)
**For all AI Agents and Developers:**
1.  **Documentation First:** If you modify functionality, architecture, or features, you **MUST** update `README.md` (this file), `TDD.md`, and `roadmap.md` in the same session.
2.  **No Stale Docs:** Ensure the documentation accurately reflects the code state at the end of your turn.
3.  **Modular Strictness:** Maintain the ES Module architecture. Do not introduce global scripts unless absolutely necessary for legacy compatibility.

---

A modern, modular Progressive Web App (PWA) combining a City Builder meta-game with classic arcade puzzles.

## Canonical Spec
The single source of truth is `SOURCE_OF_TRUTH.md`. This README is a short, accurate summary that must stay in sync with it.

## Development

This project uses ES Modules, which requires a local web server to run.

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the dev server:**
    ```bash
    npm run dev -- --host
    ```

3.  **Open in Browser:**
    Open the URL shown in your terminal (e.g., `http://localhost:5173` or the Network IP).

## Design System (Apple HIG)

The UI uses a Liquid Glass aesthetic inspired by iOS with soft aurora backdrops.
*   **Tokens:** Defined in `ui/theme.css` (system colors, aurora gradients, motion durations).
*   **Components:** `ui/components.css` is the reusable UI source of truth (buttons, panels, lists, inputs).
*   **Motion:** `--motion-*` tokens drive subtle float/drift animations; respects `prefers-reduced-motion`.
*   **Dark Mode:** Supported via automatic system preference and a manual toggle in the settings overlay.

## Modular Architecture

The project follows a "Console & Cartridge" plugin system using ES Modules (`import`/`export`).

### Folder Structure
*   `src/core/`: `GameInterface.js`, `ThemeManager.js`, `FirebaseManager.js`, `LeaderboardManager.js`.
*   `src/games/`: Modular game folders (currently `2048`).
*   `city/src/CityScene.js`: Legacy City renderer (to be modularized later).
*   `app.js`: The central router and lifecycle manager.
*   `ui/`: Global design tokens and shared components.
*   `src/games/2048/`: Photo 2048 with PixiJS v8 board rendering, HTML overlay UI, undo, coins, and leaderboard hooks.

### Adding a New Game
1.  Create `src/games/mygame/index.js`.
2.  Extend `GameInterface` and implement `mount()`, `start()`, and `pause()`.
3.  Register your game in `app.js`:
    ```javascript
    import { MyGame } from './src/games/mygame/index.js';
    const games = { 'mygame': new MyGame() };
    ```

## Leaderboards
*   Local scores live in `photo2048HighScores` (names cached in `arcadeCityPlayerName`).
*   Each entry saves `score`, `turns`, and `undos`.
*   2048 dispatches `game:over` with `{ score, stats }`; `app.js` opens the glass sheet to capture/save.
*   The Scores button in the 2048 header opens the sheet; it shows "Live Firebase board" when cloud sync is active.

## Current Scope
*   2048 is the only intended playable cartridge; the bottom nav and coins chip are intentionally hidden.
*   Settings are accessible via the settings overlay (theme toggle, PWA refresh, dev tools).
*   Mobile swipes are handled with pointer events on a full-height `.game-stage` surface (`touch-action: none`), keeping the bottom padding inside the stage so the space below the board still registers moves while header buttons remain tappable.
*   The 2048 board renders via PixiJS v8 while header/overlays remain HTML.

## Firebase Integration (Leaderboards)
Firebase is configured in `index.html` via `window.firebaseConfig` and loads from the CDN.
1.  Replace the config values with your Firebase project keys if needed.
2.  `FirebaseManager` pulls Firebase from the CDN, then `LeaderboardManager` will read/write to Firestore.
3.  If Firebase is unavailable, the UI automatically falls back to local scores.
4.  Firestore index: the query `where gameId == "2048"` + `orderBy score desc` needs a composite index. If you see "requires an index" in the console, follow the provided link or create one with fields `gameId` (ASC) and `score` (DESC) on the `leaderboards` collection.

## Technical Docs
See `SOURCE_OF_TRUTH.md` for the canonical spec, with `TDD.md` and `roadmap.md` kept in sync as summaries.
