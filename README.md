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
    Open the URL shown in your terminal with `/bostan2048/` appended (e.g., `http://localhost:5173/bostan2048/`).
    The dev server redirects `/` to `/bostan2048/` so the base path matches GitHub Pages.

4.  **Run tests:**
    ```bash
    npm test
    ```

## Deployment (GitHub Pages)
*   Pages publishes from the `gh-pages` branch (set in GitHub Settings → Pages).
*   **Prod:** run the `Deploy Prod` workflow to publish to `https://bostannnn.github.io/bostan2048/`.
*   **Dev:** pushing to `dev` auto-deploys to `https://bostannnn.github.io/bostan2048/dev/` and uses a DEV-badged PWA icon.

## Design System (Apple HIG)

The UI uses a Liquid Glass aesthetic inspired by iOS with soft aurora backdrops.
*   **Tokens:** Defined in `ui/theme.css` (system colors, aurora gradients, motion durations).
*   **Typography:** Font stacks include emoji-capable fallbacks for icon buttons.
*   **Spacing:** `--ui-space-*` tokens in `ui/theme.css` provide standardized margins/gaps.
*   **Overlays:** `ui/components.css` includes `.overlay-centered` and helper classes for centered overlay headers/actions.
*   **Leaderboards:** List, card, entry, status, hero score, and input styles live in `ui/components.css`.
*   **Levels:** Level select cards (`.level-list`, `.level-card`, `.level-status`) live in `ui/components.css`.
*   **Components:** `ui/components.css` is the reusable UI source of truth (buttons, panels, lists, inputs).
*   **Motion:** `--motion-*` tokens drive subtle float/drift animations; GSAP handles Match-3 board motion; respects `prefers-reduced-motion`.
*   **Dark Mode:** Supported via automatic system preference and a manual toggle in the settings overlay.

## Modular Architecture

The project follows a "Console & Cartridge" plugin system using ES Modules (`import`/`export`).

### Folder Structure
*   `src/core/`: `GameInterface.js`, `ThemeManager.js`, `FirebaseManager.js`, `LeaderboardManager.js`.
*   `src/games/`: Modular game folders (currently `2048`, `match3`).
*   `city/src/CityScene.js`: Legacy City renderer (to be modularized later).
*   `app.js`: The central router and lifecycle manager.
*   `ui/`: Global design tokens and shared components.
*   `src/games/2048/`: Photo 2048 with PixiJS v8 board rendering, HTML overlay UI, undo, coins, and leaderboard hooks.
*   `src/games/match3/`: Match-3 with PixiJS v8 board rendering, HTML overlay UI, and per-level targets.

### Adding a New Game
1.  Create `src/games/mygame/index.js`.
2.  Extend `GameInterface` and implement `mount()`, `start()`, and `pause()`.
3.  Register your game in `app.js`:
    ```javascript
    import { MyGame } from './src/games/mygame/index.js';
    const games = { 'mygame': new MyGame() };
    ```

## Leaderboards
*   Local scores live per level in `photo2048HighScores:level-<n>` (names cached in `arcadeCityPlayerName`).
*   Each entry saves `score`, `turns`, and `undos`.
*   2048 dispatches `game:over` with `{ score, stats }`; `app.js` opens the glass sheet to capture/save.
*   The Scores button in the 2048 header opens the sheet.
*   The leaderboard sheet shows the top 10 and scrolls within the list area (scrollbar hidden).
*   The leaderboard overlay centers titles/actions and highlights the pending score as a hero value.
*   Migration guide for legacy Firebase scores: `FIREBASE_LEADERBOARD_MIGRATION.md`.
*   Match-3 leaderboards use `match3HighScores:level-<n>` with `turns` (undos remain 0).

## Current Scope
*   2048 and Match-3 are playable cartridges; the bottom nav exposes 2048, Match-3, City, and Shop while the coins chip remains hidden.
*   Settings are accessible via the settings overlay (theme toggle, PWA refresh, dev tools).
*   Mobile swipes are handled with pointer events on a full-height `.game-stage` surface (`touch-action: none`), keeping the bottom padding inside the stage so the space below the board still registers moves while header buttons remain tappable.
*   The 2048 view locks app scrolling and suppresses accidental tap highlights/text selection; text input remains selectable in overlays.
*   2048 background effects pause when the view is inactive.
*   2048 ships with three levels, per-level save state, and a level select overlay (Level 4 marked coming soon).
*   The header uses a Levels button (replacing New Game) to open the selector; restarting prompts a glass confirm overlay (Yes = gold button, No = secondary, no close icon).
*   Level tile portraits load from `public/assets/levels/level-<n>/`, and the selector shows a preview image per level.
*   Add/rename levels by editing the `LEVELS` list in `src/games/2048/index.js` and supplying the matching asset folder + preview image.
*   The 2048 board renders via PixiJS v8 while header/overlays remain HTML.
*   2048 swipe input includes a pointer-up fallback for more reliable swipes.
*   Match-3 ships with 10 levels (targets + move limits) and uses the shared level selector overlay.
*   Match-3 uses Kenney Puzzle Pack gem sprites and placeholder previews/backgrounds.
*   Match-3 supports drag-to-swap with direction-based fallback, idle hint pulses (~7s idle), invalid swap flash/shake + haptic, auto-shuffles on dead boards, richer clear/cascade visuals, and ignores stale saved runs.
*   Match-3 scoring includes combo multipliers + streak bonuses, and the game-over sheet shows an end-of-level summary.

## Firebase Integration (Leaderboards)
Firebase is configured in `index.html` via `window.firebaseConfig` and loads from the CDN.
1.  Replace the config values with your Firebase project keys if needed.
2.  `FirebaseManager` pulls Firebase from the CDN, then `LeaderboardManager` will read/write to Firestore.
3.  If Firebase is unavailable, the UI automatically falls back to local scores.
4.  Firestore index: the query `where gameId == "2048-level-<n>"` + `orderBy score desc` needs a composite index. If you see "requires an index" in the console, follow the provided link or create one with fields `gameId` (ASC) and `score` (DESC) on the `leaderboards` collection.

## Technical Docs
See `SOURCE_OF_TRUTH.md` for the canonical spec, with `TDD.md` and `roadmap.md` kept in sync as summaries.
