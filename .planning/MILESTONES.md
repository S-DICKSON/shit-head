# Project Milestones: Shithead Online

## v2.0 UI + Discord (Shipped: 2026-02-21)

**Delivered:** Discord Activity integration (OAuth2, proxy networking, instance ID auto-join), mobile UX improvements (playability highlights, horizontal scroll cards, swap timer fixes), sound mute toggle, host-configurable round time, frontend test suite, and 10 quick-task bug fixes from playtesting.

**Phases completed:** 16-23 (26 plans total)

**Key accomplishments:**

- Discord Activity integration: WebSocket proxy through discordsays.com, dual-mode platform abstraction with adapter pattern, OAuth2 authentication with server-side token exchange, instance ID auto-join for voice channels, host migration, spectator mode
- Sound & host settings: mute toggle with localStorage persistence, host-configurable round time (30/45/60s) in lobby
- Card playability highlights: green glow on playable cards, gray dim on unplayable, client-side card rules engine
- Mobile card UX: horizontal scroll with snap for large hands (simplified from category tabs after playtesting), swap phase timer fix, dvh viewport handling
- Frontend test suite: 122 Vue component and composable tests with @testing-library/vue
- 10 quick-task bug fixes and improvements shipped from playtesting feedback, plus 10 unlabeled fixes

**GitHub issues resolved:**

- #3: Add game to discord activity (Phases 16-19)
- #4: Sharing link in mobile and tabbing out closes lobby (quick-028)
- #5: Make sharing links on mobile easier (native share API)
- #6: Mobile rename feature bug (enlarged buttons)
- #7: Mobile screen not fit (quick-022)
- #8: Mobile touch controls causing zoom (quick-021)
- #10: App doesn't work on Microsoft Edge (quick-027b)
- #11: Card tips when 7 is active (7-or-lower hint)
- #12: Show shit emoji in prelobby stage too

**Quick tasks:** 021-029 (10 tasks including 027a/027b split)

**Stats:**

- 208 files created/modified
- 16,517 lines of TypeScript/Vue (net reduction from v1.0 due to simplification)
- 8 phases, 26 plans, 10 quick tasks, 10 unlabeled fixes
- 6 days from start (2026-02-15) to ship (2026-02-21)
- 198 total commits

**Git range:** `7d477af` → `4748206`

**What's next:** v3.0 — TBD

---

## v1.0 MVP (Shipped: 2026-02-15)

**Delivered:** A complete, production-deployed multiplayer Shithead card game with all core rules, special cards, endgame progression, real-time WebSocket multiplayer, responsive mobile/desktop UI, and automated CI/CD deployment to Oracle Cloud.

**Phases completed:** 1-15 (51 plans total)

**Key accomplishments:**

- Full-stack game engine with all Shithead rules: special cards (2, 7, 8, 10), burn mechanics, endgame face-up/face-down progression, and win detection
- Real-time WebSocket multiplayer with server-authoritative state, reconnection handling, 90-second grace period, and turn timing
- Responsive Vue 3 client UI with mobile card grouping, double-tap pickup safety, turn notifications, and accessibility (ARIA live regions)
- Production deployment to Oracle Cloud VPS with OpenTofu IaC, Caddy auto-HTTPS, Infisical secrets, and GitHub Actions CI/CD
- Developer tooling: ESLint 9, Makefile interface, Docker Compose dev environment, ngrok tunnel support
- 20 quick-task bug fixes and polish items shipped from live playtesting feedback

**Stats:**

- 309 files created/modified
- 14,378 lines of TypeScript/Vue
- 15 phases, 51 plans, 20 quick tasks
- 9 days from start (2026-02-07) to ship (2026-02-15)
- 364 total commits

**Git range:** `cdefad0` (init) → `c27fc89` (latest)

**What's next:** v1.1 — Social features, polish, and game improvements

---
