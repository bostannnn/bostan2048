# Arcade City (ESM Version)

## 🤖 Agent Protocol (MANDATORY)
**For all AI Agents and Developers:**
1.  **Documentation First:** If you modify functionality, architecture, or features, you **MUST** update `README.md` (this file), `TDD.md`, and `roadmap.md` in the same session.
2.  **No Stale Docs:** Ensure the documentation accurately reflects the code state at the end of your turn.
3.  **Modular Strictness:** Maintain the ES Module architecture. Do not introduce global scripts unless absolutely necessary for legacy compatibility.

---

A modern, modular Progressive Web App (PWA) combining a City Builder meta-game with classic arcade puzzles.

## 🚀 Development

This project uses **ES Modules**, which requires a local web server to run.

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

## 🎨 Design System (Apple HIG)

The UI uses a **Liquid Glass** aesthetic inspired by iOS with soft aurora backdrops.
*   **Tokens:** Defined in `ui/theme.css` (system colors, aurora gradients, motion durations).
*   **Components:** `ui/components.css` contains `glass-panel`, `glass-pill`, `ui-button`, focus-visible states.
*   **Motion:** `--motion-*` tokens drive subtle float/drift animations; respects `prefers-reduced-motion`.
*   **Dark Mode:** Supported via automatic system preference and a manual toggle (top-left).

## 🏗 Modular Architecture

The project follows a **"Console & Cartridge"** plugin system using ES Modules (`import`/`export`).

### Folder Structure
*   `src/core/`: Contains `GameInterface.js`, `ThemeManager.js`, `FirebaseManager.js`, `LeaderboardManager.js`.
*   `src/games/`: Modular game folders (e.g., `2048`).
*   `app.js`: The central router and lifecycle manager.
*   `ui/`: Global design tokens and shared components.
*   `src/games/2048/`: Photo 2048 with PixiJS v8 board rendering, HTML overlay UI, undo, quotes, coins, and leaderboard hooks.

### Adding a New Game
1.  Create `src/games/mygame/index.js`.
2.  Extend `GameInterface` and implement `mount()`, `start()`, and `pause()`.
3.  Register your game in `app.js`:
    ```javascript
    import { MyGame } from './src/games/mygame/index.js';
    const games = { 'mygame': new MyGame() };
    ```

## 🏆 Leaderboards
*   Local scores live in `photo2048HighScores` (names cached in `arcadeCityPlayerName`).
*   Each entry saves `score`, `turns`, and `undos`.
*   2048 dispatches `game:over` with `{ score }`; `app.js` opens the glass sheet to capture/save.
*   The Scores button in the 2048 header opens the sheet; it shows “Live Firebase board” when cloud sync is active.

## ⚠️ Current Scope
*   Only the 2048 cartridge is exposed in the UI; the bottom nav is hidden and coins display is suppressed until economy/city/shop are ready.
*   Settings are accessible via the header cog.
*   Mobile swipes are handled with pointer events on a full-height `.game-stage` surface (`touch-action: none`) so the dead space below the board still registers moves while header buttons remain tappable.
*   The 2048 board now renders via PixiJS v8 while header/overlays remain HTML.

## ☁️ Firebase Integration (Leaderboards)
To enable online leaderboards:
1.  Create a project at [console.firebase.google.com](https://console.firebase.google.com/).
2.  Set `window.firebaseConfig = { ... }` before `app.js` runs (or call `window.FirebaseManager.configure(config);` after load).
3.  `FirebaseManager` pulls Firebase from the CDN, then `LeaderboardManager` will read/write to Firestore.
4.  If Firebase is unavailable, the UI automatically falls back to local scores.
5.  Firestore index: the query `where gameId == "2048"` + `orderBy score desc` needs a composite index. If you see “requires an index” in the console, follow the provided link or create one with fields `gameId` (ASC) and `score` (DESC) on the `leaderboards` collection.

## 📜 Technical Docs
See [TDD.md](./TDD.md) for architectural details and [roadmap.md](./roadmap.md) for project status.
