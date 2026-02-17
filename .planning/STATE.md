# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** v2.0 Phase 19 - Discord Room Management

## Current Position

Phase: 18 of 22 (Discord Authentication)
Plan: 4 of 4 in phase (gap closure plan)
Status: Phase complete — all UAT gaps closed
Last activity: 2026-02-17 — Completed 18-04-PLAN.md (UAT gap closure: dynamic import, Dockerfile lockfile, /api/token 400)

Progress: [████████░░] 18/22 phases complete (82% overall)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 51
- Average duration: 2.3 minutes
- Total execution time: 2.05 hours
- Quick tasks completed: 20

**v2.0 Velocity:**
- Total plans completed: 10
- Average duration: 2.9 minutes
- Total execution time: 0.48 hours

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting v2.0 work:
- Dual-mode architecture: Keep standalone web working alongside Discord Activity (adapter pattern prevents tech debt)
- Risk-first ordering: Validate Discord proxy in Phase 16 before building features (project history: ngrok, Docker DNS WS failures)
- Retry timing: 5 retries with exponential backoff (~31s total) — 10 retries was too long for UX
- Platform detection: Synchronous iframe + query params check (async SDK validation deferred to Phase 18)
- Adapter interfaces use Vue Ref types for reactive status (consistency with useGameSocket)
- Web adapters as thin wrappers: delegate to existing code, zero logic duplication
- Discord token exchange: application/x-www-form-urlencoded (not JSON) — Discord rejects JSON bodies
- Discord OAuth2 prompt: 'none' (not 'consent') for seamless UX — no consent dialog for identify scope
- Discord access_token memory-only — never persisted to localStorage
- Discord user name: global_name || username (display name preferred over username handle)
- Discord connection/room adapters identical to web counterparts — proxy routing handled at URL level (Phase 16)
- authenticate() not called at app startup — triggered by component lifecycle in Phase 19
- VITE_DISCORD_CLIENT_ID passed as constructor arg to DiscordAuthAdapter
- Discord SDK: dynamic import() via top-level await in main.ts — never static import in barrel (18-04)
- Dockerfile lockfile: bun.lock* glob (not bun.lockb*) — repo uses text format lockfile (18-04)
- /api/token: inner SyntaxError catch returns 400; outer catch still handles unexpected 500 errors (18-04)

### Pending Todos

1 pending — `/gsd:check-todos` to review
- Add debug gamestate dev tooling (tooling)

### Blockers/Concerns

User setup required before Discord Activity testing:
- Discord Developer Portal credentials needed (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, VITE_DISCORD_CLIENT_ID)
- See .planning/phases/18-discord-authentication/18-01-USER-SETUP.md

## Session Continuity

Last session: 2026-02-17
Stopped at: Completed 18-04-PLAN.md — Phase 18 UAT gaps fully closed
Resume file: None
Next: `/gsd:plan-phase 19`
