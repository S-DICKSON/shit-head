# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** Phase 2 - WebSocket Infrastructure & Room Management

## Current Position

Phase: 2 of 12 (WebSocket Infrastructure & Room Management) — IN PROGRESS
Plan: 1 of 3 in phase (shared protocol definition complete)
Status: In progress
Last activity: 2026-02-07 — Completed 02-01-PLAN.md

Progress: [███░░░░░░░] ~10% (1 phase complete + 1 plan of phase 2)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 2.9 minutes
- Total execution time: 0.25 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | 706s | 177s |
| 02 | 1 | 178s | 178s |

**Recent Trend:**
- Last 5 plans: 01-02 (207s), 01-03 (214s), 01-04 (132s), 02-01 (178s)
- Trend: Consistent - maintaining ~3 min average per plan

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

### Pending Todos

None yet.

### Blockers/Concerns

**User action required:** Render account setup and credentials (see 01-USER-SETUP.md)
- Deploy workflow will fail until GitHub secrets are configured
- OpenTofu requires API key to provision infrastructure
- Not a blocker for development, only for deployment

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed 02-01-PLAN.md (shared protocol definition)
Resume file: None

---
*State initialized: 2026-02-07*
*Last updated: 2026-02-07 after completing 02-01*
