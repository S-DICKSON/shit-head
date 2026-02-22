# Shithead Online

## What This Is

An online multiplayer Shithead card game — a browser-based web app where 2-4 players create or join rooms via share codes and play the full game with proper rules, special cards, burn mechanics, and endgame progression. Works on mobile and desktop. No accounts needed; players pick a nickname and jump in. Deployed to Hetzner with auto-HTTPS. Also available as a Discord Activity for seamless play in voice channels.

## Core Value

Friends can play a complete, rule-accurate game of Shithead together online with zero friction — create a room, share a code, play.

## Requirements

### Validated

- Room system with shareable codes/links for 2-4 players — v1.0
- Nickname entry (no accounts) — v1.0
- Full card deck: 52 cards + 2 Jokers — v1.0
- Dealing: 3 face-down, 3 face-up, 3 in hand, remainder as draw pile — v1.0
- Pre-game 30-second simultaneous card swap phase (hand <-> face-up) — v1.0
- Turn-based clockwise gameplay with timed turns (30-60s) — v1.0
- Auto-pickup pile on turn timeout — v1.0
- Card value ordering: 3 < 4 < 5 < 6 < 7 < 9 < J < Q < K < A < Joker — v1.0
- Special card: 2 resets pile, playable on anything — v1.0
- Special card: 7 follows normal ordering, next player must play <= 7 — v1.0
- Special card: 8 is invisible (next player plays on card beneath), stackable — v1.0
- Special card: 10 burns pile, player goes again, cannot win on a 10 — v1.0
- Burn mechanic: 4-of-a-kind burns pile (8s are invisible for counting) — v1.0
- Play multiple same-value cards in one turn — v1.0
- Draw back up to 3 cards until draw pile is empty — v1.0
- Pick up entire discard pile when unable to play — v1.0
- First player auto-detected: lowest card starting from 3 upward — v1.0
- Endgame progression: hand -> face-up cards -> face-down cards (blind flip) — v1.0
- Last player with cards is the shithead (loser) and deals next hand — v1.0
- Disconnect handling: brief wait, then remove player — v1.0
- Dealer rotation clockwise after each hand — v1.0
- After burn, player can play any card — v1.0
- Clean/modern responsive UI (mobile + desktop) — v1.0
- Real-time WebSocket multiplayer with server-authoritative state — v1.0
- Turn timer countdown visible to all players — v1.0
- Card hand display with selection state and mobile grouping — v1.0
- Card playability highlights showing which cards are valid to play — v2.0
- Mobile horizontal scroll with snap for large card hands — v2.0
- Sound mute toggle with localStorage persistence — v2.0
- Host-configurable round time (30/45/60s) — v2.0
- Discord Activity integration (OAuth2, proxy networking, instance ID auto-join) — v2.0
- Standalone web and Discord Activity coexist from single codebase — v2.0
- Discord safe area CSS for mobile notch/home indicator — v2.0
- Host migration when host leaves room — v2.0
- Spectator mode for late joiners — v2.0
- Privacy policy and terms of service pages — v2.0

### Active

(None — planning next milestone)

### Out of Scope

- User accounts / authentication — just nicknames for web, Discord identity for Activity
- Public matchmaking — room codes only, play with friends
- Chat system — focus on gameplay
- Native mobile apps — browser-based only
- Leaderboards / stats tracking — no accounts to track against
- OAuth2 token refresh — 7-day expiry acceptable for now
- Thermal state management for Discord — no reports of issues

## Context

Shipped v2.0 with 16,517 LOC TypeScript/Vue across 208 files modified.
Tech stack: Bun monorepo, Vue 3 + Vite + Tailwind CSS v4 client, Bun WebSocket server, Docker, Hetzner VPS.
Discord Activity live and working (OAuth2, proxy networking, instance ID auto-join).
462 tests total (122 client with @testing-library/vue, 340 server with Vitest).
Live playtesting drove 30 quick-task bug fixes across both milestones.
Known tech debt: orphaned adapter injection keys, missing tests for some newer composables/components.

## Constraints

- **Platform**: Web app (browser-based) — must work on mobile and desktop browsers
- **Multiplayer**: Real-time multiplayer via WebSockets
- **No backend auth**: No user accounts for web; Discord OAuth2 for Activity mode only
- **Card deck**: Standard 52-card deck + 2 Jokers (54 cards total)
- **Players**: 2-4 per room
- **Docker-first Makefile**: All Makefile targets must run through Docker. Only git, docker, and make are required locally. Never add targets that require local bun/bunx/node/npm.

## Verification Requirements

All phases that write code **must** pass linting before completion:
- Run `make lint` and ensure zero errors before considering a phase done

All phases that modify frontend layout/UI **must** include visual screenshot verification:
- Run `make screenshots` to capture 2p/3p/4p game states at all 7 viewports
- Review screenshots with the user before considering the phase done
- Screenshots are local-only (gitignored, skipped in CI) — they are for UAT, not automated testing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Room codes over matchmaking | Friend-focused game, keep it simple | Good |
| No accounts | Zero friction to start playing | Good |
| Web app over native | Cross-platform from day one, accessible via link | Good |
| 30-second swap timer | Keeps pre-game phase moving, consistent for all players | Good |
| Timed turns (30-60s) | Prevents stalling in online play | Good |
| Bun as runtime | Native TypeScript, fast WebSocket, single tool for monorepo | Good |
| Server-authoritative state | Prevents cheating, single source of truth | Good |
| Hetzner VPS | Cost-effective hosting with good performance | Good |
| Caddy for reverse proxy | Auto-HTTPS with zero config | Good |
| Infisical for secrets | Secure credential management across CI/CD and local dev | Good |
| TDD methodology | High test coverage, reliable game engine | Good |
| Docker Compose dev env | Consistent dev environment, Makefile interface | Good |
| Dual-mode (web + Discord) | Adapter pattern keeps standalone web working alongside Discord Activity | Good |
| Risk-first Discord validation | Validate proxy networking before building features | Good |
| Client copy of server card rules | Avoids cross-package dependency, keeps client bundle clean | Good |
| Dynamic import for Discord SDK | Never static import in barrel; lazy-load in discord branch only | Good |
| instanceId-based auto-join | Canonical Discord Activity room pattern (same voice channel = same room) | Good |
| Simplified mobile card UI | Horizontal scroll with snap replaced category tabs after playtesting (quick-029) | Good |
| @testing-library/vue migration | Resolved Bun WeakMap failures from vue-test-utils | Good |

---
*Last updated: 2026-02-21 after v2.0 milestone*
