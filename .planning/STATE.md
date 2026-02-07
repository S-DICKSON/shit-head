# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** Phase 2 - WebSocket Infrastructure & Room Management

## Current Position

Phase: 2 of 12 (WebSocket Infrastructure & Room Management) — IN PROGRESS
Plan: 4 of 5 in phase (shared protocol, room engine, client infrastructure, server handlers complete)
Status: In progress
Last activity: 2026-02-07 — Completed 02-04-PLAN.md (server WebSocket handlers)

Progress: [███░░░░░░░] ~15% (1 phase complete + 4 plans of phase 2)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 2.7 minutes
- Total execution time: 0.35 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | 706s | 177s |
| 02 | 4 | 705s | 176s |

**Recent Trend:**
- Last 5 plans: 02-01 (178s), 02-02 (190s), 02-03 (143s), 02-04 (194s)
- Trend: Stable - maintaining ~2.8 min average, Phase 2 at 176s/plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Room codes over matchmaking — Friend-focused game, keep it simple
- No accounts — Zero friction to start playing
- Web app over native — Cross-platform from day one, accessible via link
- 30-second swap timer — Keeps pre-game phase moving, consistent for all players
- Timed turns (30-60s) — Prevents stalling in online play

**From 01-01:**
- Use Bun as runtime and package manager (native TypeScript, fast, built-in WebSocket)
- Monorepo structure with workspace protocol for internal dependencies
- No build step for shared package (Bun resolves TypeScript natively)
- Server runs on configurable PORT (default 3000)

**From 01-02:**
- Tailwind CSS v4 with Vite plugin (no PostCSS, simpler config)
- Vitest for all testing (consistency across client and server)
- Vite proxy for /api and /ws to server on localhost:3000
- Host 0.0.0.0 for Docker compatibility

**From 01-03:**
- Multi-stage Dockerfiles with separate dev and production targets
- oven/bun:1 as base image for both services
- nginx:alpine for client production (static file serving)
- Makefile as primary developer interface
- Anonymous volumes for node_modules in Docker Compose
- Build context is project root (access to all packages)

**From 01-04:**
- GitHub Actions for CI/CD (oven-sh/setup-bun, JorgeLNJunior/render-deploy)
- CI runs type-check, lint, test, build on every PR
- Deploy triggers automatically on merge to main
- OpenTofu for infrastructure-as-code (render-oss/render provider)
- Both client and server as render_web_service with Docker runtime
- Secrets via GitHub Actions secrets (never committed)

**From 02-01:**
- Schemas as single source of truth - types inferred via z.infer
- Discriminated unions with 'type' field for message protocol
- Room code length fixed at 6 characters
- Nickname length constrained to 1-20 characters with trim
- Max 4 players, min 2 players per room

**From 02-02:**
- Custom nanoid alphabet excludes confusable characters (0/O, 1/I/L, 5/S) for user-friendly room codes
- Host leaving destroys entire room (no host transfer) - keeps lobby management simple
- OperationResult discriminated union for error handling with typed error codes
- Player-to-room index Map for O(1) lookup performance
- TDD methodology: RED (failing tests) → GREEN (implementation) → REFACTOR (optional)

**From 02-03:**
- Singleton pattern for WebSocket composable to ensure all components share one connection
- WebSocket URL determined dynamically from window.location (works in dev and production)
- Auto-reconnect with 5 retries and 1s delay between attempts
- Heartbeat every 30s with 5s pong timeout to detect stale connections
- Room code input auto-uppercase and sanitized to alphanumeric only
- Hash history for router (GitHub Pages compatibility)

**From 02-04:**
- Singleton RoomManager pattern - single instance shared across all WebSocket connections
- Conditional OperationResult type - void results don't require data property
- Heartbeat ping/pong handled before JSON parsing for efficiency
- Origin validation deferred to production with TODO comment
- Pub/sub pattern: ws.publish for room broadcasts (excludes sender), ws.send for direct messages
- Game start countdown: 3-second setTimeout before status change to 'playing'

### Pending Todos

None yet.

### Blockers/Concerns

**User action required:** Render account setup and credentials (see 01-USER-SETUP.md)
- Deploy workflow will fail until GitHub secrets are configured
- OpenTofu requires API key to provision infrastructure
- Not a blocker for development, only for deployment

## Session Continuity

Last session: 2026-02-07
Stopped at: 02-05 checkpoint blocked — WebSocket connection cycling bug
Resume file: .planning/phases/02-websocket-infrastructure-room-management/.continue-here.md

---
*State initialized: 2026-02-07*
*Last updated: 2026-02-07 after completing 02-04*
