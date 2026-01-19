# Arcade City Roadmap

## Phase 1: Foundation (COMPLETED) ✅
- [x] **Project Scaffolding:** Vite setup.
- [x] **UI System:** CSS Design tokens (Apple HIG style).
- [x] **Architecture:** Refactor to ES Modules (ESM) with `GameInterface`.
- [x] **Dev Workflow:** Local server integration via Vite.

## Phase 2: Game Modules (IN PROGRESS) 🏗️
- [x] **2048 Module:** Ported to ESM structure.
- [x] **2048 Pixi Renderer:** Board rendering now uses PixiJS v8 with HTML overlays.
- [ ] **Match-3 Module:** Create placeholder cartridge.
- [ ] **Picross Module:** Create placeholder cartridge.

## Phase 3: Meta-Game (IN PROGRESS) 🏗️
- [x] **City Engine:** PixiJS v8 basic isometric grid.
- [ ] **Interaction:** Move `CityScene.js` into a modular `src/games/city/` cartridge.
- [ ] **Building:** Implement building placement logic using inventory.

## Phase 4: Economy & Polish (PENDING) ⏳
- [x] **Economy:** Basic coin tracking.
- [x] **UI Polish:** Liquid Glass aesthetics, SF Symbols, Dark Mode.
- [x] **Leaderboard UI:** Glass sheet with local saves + name capture; documented reusable styles for mini buttons and cards.
- [x] **Input Polish:** Expanded 2048 swipe hitbox to full-height `.game-stage` using pointer events to remove dead zones on mobile.
- [ ] **Shop:** Connect JSON catalog to inventory persistence.
- [ ] **Cloud:** Enable Firebase leaderboards (client wiring ready; add `window.firebaseConfig` to activate).
- [ ] **PWA:** Service Worker caching for ESM assets.
- [ ] **Navigation gating:** City/shop views hidden until features are live; coins UI hidden pending economy UX.
- [ ] **Audio System:** Install Howler.js and implement `AudioManager` (global mute/sfx toggle).
- [ ] **Animation:** Install GSAP for Match-3 gem physics and UI transitions.
