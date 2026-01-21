# Arcade City Roadmap

Canonical spec: `SOURCE_OF_TRUTH.md`. This roadmap tracks delivery status against that spec.

## Phase 1: Foundation (Completed)
- [x] Project scaffolding (Vite).
- [x] UI system (design tokens + shared components).
- [x] Spacing scale tokens in `ui/theme.css`.
- [x] Overlay-centered helper classes in `ui/components.css`.
- [x] Leaderboard components standardized in `ui/components.css`.
- [x] New Game confirmation overlay (standard glass UI, no close icon).
- [x] UI components centralized in `ui/theme.css` and `ui/components.css`.
- [x] ESM architecture with `GameInterface`.
- [x] Dev workflow via Vite (serve at `/bostan2048/` to mirror GitHub Pages).
- [x] PWA manifest + service worker wiring via VitePWA.

## Phase 2: Game Modules (In Progress)
- [x] 2048 module (ESM).
- [x] 2048 Pixi renderer with HTML overlays.
- [x] 2048 level system (3 levels, unlock after 2048, per-level save state).
- [x] Level select overlay (Level 4 coming soon banner, preview images).
- [x] Per-level leaderboards (local keys + Firebase gameId per level).
- [x] Match-3 cartridge (10 levels, targets + move limits).
- [ ] Picross placeholder cartridge.

## Phase 3: Meta-Game (In Progress)
- [x] City engine (PixiJS v8 isometric grid).
- [x] Move CityScene into `src/games/city/` cartridge.
- [x] Resolve City asset URLs against the active base path.
- [x] Switch City asset set to PNG sprites.
- [x] Cull City ground tiles outside the viewport.
- [ ] Building placement logic tied to inventory rules.

## Phase 4: Economy & Polish (Pending)
- [x] Basic coin tracking (local-only).
- [x] UI polish (Liquid Glass styling, dark mode).
- [x] Leaderboard UI (local saves + name capture, top-10 scroll list with hidden scrollbar, centered header/actions, hint removed).
- [x] Input polish (full-height swipe surface on `.game-stage`, with bottom padding inside the swipe area; scroll/selection suppression in the 2048 view).
- [x] Pause 2048 background effects when the view is inactive.
- [ ] Shop wiring (catalog + inventory persistence).
- [x] Cloud leaderboards (Firebase configured + local fallback).
- [ ] Firestore composite index for leaderboards (if not created yet).
- [ ] PWA caching strategy for ESM assets.
- [x] Emoji-labeled score chips with the coins UI placed left of the settings icon in the 2048 header.
- [ ] Audio system (Howler.js integration).
- [x] Animation tooling (GSAP for Match-3 and advanced UI transitions).
- [x] Confirm before starting a new 2048 game.
- [x] GitHub Pages workflows (manual prod deploy + dev subpath).
- [x] Match-3 input polish (drag-to-swap + invalid move feedback).
- [x] Match-3 polish: idle hints (~7s), invalid swap flash, auto-shuffle on dead boards, combo/streak scoring, end-of-level summary, richer clear/cascade visuals with drop-in spawns, reduced-motion compliance, stale-save validation.

## Progress Report (2026-01-19)
- Level system finalized: per-level assets, preview card layout, and per-level leaderboards.
- Firebase migration tooling added (copy legacy `2048` scores to `2048-level-1`).
- UI/input polish: emoji font fallback, leaderboard placeholder contrast, debounced button taps, score-addition cleanup.
- Test harness added: `npm test` for 2048/leaderboard logic.
- Match-3 module added with 10 levels and shared leaderboards.
- Bottom nav now routes 2048, Match-3, City, and Shop (coins still hidden).
- Pending: run `npm install` to update `package-lock.json` once registry access is available.

## Progress Report (2026-01-20)
- Match-3 now uses GSAP for swaps/drops, with invalid swap feedback and drag-to-swap input.
- Match-3 invalid swaps now trigger a short haptic pulse when supported.
- 2048 background effects pause when the view is inactive.
- 2048 swipe input now has a pointer-up fallback to reduce missed swipes.
- Shared layout spacing tokens applied across games for consistent vertical rhythm.
- GitHub Pages setup: dev subpath deployment + manual prod deploy workflows.
- Dev PWA icon badge (DEV) for the dev build.
