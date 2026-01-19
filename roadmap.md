# Arcade City Roadmap

Canonical spec: `SOURCE_OF_TRUTH.md`. This roadmap tracks delivery status against that spec.

## Phase 1: Foundation (Completed)
- [x] Project scaffolding (Vite).
- [x] UI system (design tokens + shared components).
- [x] UI components centralized in `ui/theme.css` and `ui/components.css`.
- [x] ESM architecture with `GameInterface`.
- [x] Dev workflow via Vite.
- [x] PWA manifest + service worker wiring via VitePWA.

## Phase 2: Game Modules (In Progress)
- [x] 2048 module (ESM).
- [x] 2048 Pixi renderer with HTML overlays.
- [ ] Match-3 placeholder cartridge.
- [ ] Picross placeholder cartridge.

## Phase 3: Meta-Game (In Progress)
- [x] City engine (PixiJS v8 isometric grid, legacy implementation).
- [ ] Move CityScene into `src/games/city/` cartridge.
- [ ] Building placement logic tied to inventory rules.

## Phase 4: Economy & Polish (Pending)
- [x] Basic coin tracking (local-only).
- [x] UI polish (Liquid Glass styling, dark mode).
- [x] Leaderboard UI (local saves + name capture).
- [x] Input polish (full-height swipe surface on `.game-stage`).
- [ ] Shop wiring (catalog + inventory persistence).
- [x] Cloud leaderboards (Firebase configured + local fallback).
- [ ] Firestore composite index for leaderboards (if not created yet).
- [ ] PWA caching strategy for ESM assets.
- [ ] Navigation gating: keep nav hidden and coins UI suppressed until features are ready.
- [ ] Audio system (Howler.js integration).
- [ ] Animation tooling (GSAP for Match-3 and advanced UI transitions).
