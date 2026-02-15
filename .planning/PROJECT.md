# Shithead Online

## What This Is

An online multiplayer Shithead card game — a browser-based web app where 2-4 players create or join rooms via share codes and play the full game with proper rules, special cards, burn mechanics, and endgame progression. Works on mobile and desktop. No accounts needed; players pick a nickname and jump in. Deployed to Oracle Cloud with auto-HTTPS.

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

### Active

(None yet — define in next milestone with `/gsd:new-milestone`)

### Out of Scope

- User accounts / authentication — just nicknames, no persistence
- Public matchmaking — room codes only, play with friends
- Chat system — focus on gameplay
- Spectator mode — players only
- Native mobile apps — browser-based only
- Leaderboards / stats tracking — no accounts to track against

## Context

Shipped v1.0 MVP with 14,378 LOC TypeScript/Vue across 309 files.
Tech stack: Bun monorepo, Vue 3 + Vite + Tailwind CSS v4 client, Bun WebSocket server, Docker, Oracle Cloud VPS.
Live playtesting with friends drove 20 quick-task bug fixes and UX improvements.
Known issues: 2 pre-existing vue-test-utils failures (Bun WeakMap), ngrok WS blocked on iOS mobile.

## Constraints

- **Platform**: Web app (browser-based) — must work on mobile and desktop browsers
- **Multiplayer**: Real-time multiplayer via WebSockets
- **No backend auth**: No user accounts, no persistent data beyond active game sessions
- **Card deck**: Standard 52-card deck + 2 Jokers (54 cards total)
- **Players**: 2-4 per room

## Verification Requirements

All phases that write code **must** pass linting before completion:
- Run `make lint` and ensure zero errors before considering a phase done

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
| Oracle Cloud Always Free | 4 OCPU, 24GB RAM for zero cost hosting | Good |
| Caddy for reverse proxy | Auto-HTTPS with zero config | Good |
| Infisical for secrets | Secure credential management across CI/CD and local dev | Good |
| TDD methodology | High test coverage, reliable game engine | Good |
| Docker Compose dev env | Consistent dev environment, Makefile interface | Good |

---
*Last updated: 2026-02-15 after v1.0 milestone*
