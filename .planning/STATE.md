# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** v2.0 Phase 18 - Discord Authentication

## Current Position

Phase: 18 of 22 (Discord Authentication)
Plan: 1 of N in phase
Status: In progress
Last activity: 2026-02-17 — Completed 18-01-PLAN.md (Discord token exchange endpoint + env docs)

Progress: [███████░░░] 17/22 phases complete (77% overall)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 51
- Average duration: 2.3 minutes
- Total execution time: 2.05 hours
- Quick tasks completed: 20

**v2.0 Velocity:**
- Total plans completed: 8
- Average duration: 2.7 minutes
- Total execution time: 0.37 hours

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting v2.0 work:
- Dual-mode architecture: Keep standalone web working alongside Discord Activity (adapter pattern prevents tech debt)
- Risk-first ordering: Validate Discord proxy in Phase 16 before building features (project history: ngrok, Docker DNS WS failures)
- Retry timing: 5 retries with exponential backoff (~31s total) — 10 retries was too long for UX
- retryConnection shows reconnecting spinner, not dismissed overlay
- Platform detection: Synchronous iframe + query params check (async SDK validation deferred to Phase 18)
- Adapter interfaces use Vue Ref types for reactive status (consistency with useGameSocket)
- Web adapters as thin wrappers: delegate to existing code, zero logic duplication
- Adapters provided but not consumed — validates wiring without v1.0 risk (incremental migration)
- Discord token exchange: application/x-www-form-urlencoded (not JSON) — Discord rejects JSON bodies
- Forward Discord's error status code directly rather than normalizing to 500

### Pending Todos

1 pending — `/gsd:check-todos` to review
- Add debug gamestate dev tooling (tooling)

### Blockers/Concerns

User setup required before Phase 18 plans can be tested end-to-end:
- Discord Developer Portal credentials needed (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, VITE_DISCORD_CLIENT_ID)
- Redirect URI https://127.0.0.1 must be added in Discord Developer Portal
- See .planning/phases/18-discord-authentication/18-01-USER-SETUP.md

## Session Continuity

Last session: 2026-02-17
Stopped at: Completed 18-01-PLAN.md - /api/token endpoint live, .env.example files created
Resume file: None
Next: Continue Phase 18 (plan 02 - DiscordAuthAdapter client implementation)
