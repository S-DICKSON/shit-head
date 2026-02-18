# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** v2.0 Phase 19 - Discord Room Management

## Current Position

Phase: 19 of 22 (Discord Room Management)
Plan: 1 of 6 in phase
Status: In progress
Last activity: 2026-02-18 — Completed 19-01-PLAN.md (shared types: join-or-create, spectator, avatarHash, shitheadPlayerId)

Progress: [████████░░] 18/22 phases complete (82% overall — Phase 19 in progress)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 51
- Average duration: 2.3 minutes
- Total execution time: 2.05 hours
- Quick tasks completed: 20

**v2.0 Velocity:**
- Total plans completed: 11
- Average duration: 2.8 minutes
- Total execution time: 0.51 hours

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
- roomStateSchema code widened to min(1).max(100): supports Discord instanceIds alongside 6-char web codes (19-01)
- reconnectSchema roomCode widened to min(1).max(100): reconnect works for Discord Activity sessions (19-01)
- spectatorStateSchema omits hand data: spectators get only public game view (19-01)
- avatarHash fields nullable optional: null for web players, hash string for Discord users — backward compatible (19-01)

### Pending Todos

1 pending — `/gsd:check-todos` to review
- Add debug gamestate dev tooling (tooling)

### Roadmap Evolution

- Phase 23 added: Frontend Testing — Vue component and integration tests for the client package

### Blockers/Concerns

User setup required before Discord Activity testing:
- Discord Developer Portal credentials needed (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, VITE_DISCORD_CLIENT_ID)
- See .planning/phases/18-discord-authentication/18-01-USER-SETUP.md

Server and client packages will have TypeScript errors for new required RoomState fields (spectatorCount, shitheadPlayerId) until Plans 02-05 are executed.

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 19-01-PLAN.md — Phase 19 shared type contracts established
Resume file: None
Next: Execute 19-02-PLAN.md (server room management)
