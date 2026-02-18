# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** v2.0 Phase 23 - Frontend Testing

## Current Position

Phase: 19 of 23 (Discord Room Management) / 23 of 23 (Frontend Testing) — parallel execution
Plan: 1 of 4 complete in phase 23; 5 of 6 complete in phase 19
Status: In progress — Phase 23 Plan 01 complete; Phase 19 Plan 06 remaining
Last activity: 2026-02-18 — Completed 23-01-PLAN.md (test foundation: mock factory, App.test.ts fix, platform detection tests)

Progress: [████████░░] 18/23 phases complete (78% overall — Phases 19 and 23 in progress)

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
- onHostMigrated dedicated callback (not reusing onPlayerRemoved): cleaner handler semantics for host migration (19-02)
- autoReturnToLobby() separate from resetToLobby(): former promotes spectators, latter keeps play-again-only-players flow (19-02)
- Spectator limit: maxPlayers + 4 — up to 8 in room (4 playing, 4 watching) (19-02)
- removePlayer() returns false on host migration (room continues), true only for empty room destroy (19-02)
- Singleton mock test pattern: reassign vi.fn() in beforeEach (not vi.clearAllMocks()) — clearMocks:true config resets spies on cached objects (23-02)
- ConnectionStatus overlay test: find('.fixed').exists() — Vue Transition renders no DOM when v-if false (23-02)
- NotificationToast element selector: find('[class*="rounded-lg"]') — partial class match for Tailwind multi-class bindings (23-02)
- App.test.ts: use real router plugin (not global.stubs) to avoid Bun WeakMap error; assert bg-green-900 not min-h-screen (Tailwind v4 converts to inline style in Docker) (23-01)
- dangerouslyIgnoreUnhandledErrors: true in vitest config — suppresses Bun/jsdom WebSocket connection noise from make test-client exit code (23-01)
- createMockSocket factory at src/test/mocks/useGameSocket.mock.ts — canonical shape reference; test files inline vi.mock factories (no top-level await in factory) (23-01)
- _newHostId prefix in setHostMigrationCallback: oldHostId used for removePlayerIndex, newHostId not needed (room.getState() reflects current host) (19-03)
- Spectator check in handleClose placed before playerSockets.delete: early return ensures clean path separation (19-03)
- Host migration wired in both start-game (in-game) and handleClose lobby paths via setHostMigrationCallback (19-03)
- Safe area applied only at App.vue root (single point of truth): inner components use flex-1/h-full naturally (19-05)
- Play-again button removed from Game.vue — server auto-returns after 5s via return-to-lobby message (19-05)
- Discord avatar conditional uses !== undefined (not truthiness) — null is valid for web players using default Discord avatar (19-05)
- getAvatarUrl uses BigInt(userId) % 5n for default avatar index to safely handle Discord snowflake IDs (19-05)
- DiscordLobby auth failure: spinner persists indefinitely (no error screen) — locked decision from 19-CONTEXT.md (19-04)
- joinOrCreate optional in RoomAdapter interface: WebRoomAdapter unchanged, Discord-only feature (19-04)

### Pending Todos

1 pending — `/gsd:check-todos` to review
- Add debug gamestate dev tooling (tooling)

### Roadmap Evolution

- Phase 23 added: Frontend Testing — Vue component and integration tests for the client package

### Blockers/Concerns

User setup required before Discord Activity testing:
- Discord Developer Portal credentials needed (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, VITE_DISCORD_CLIENT_ID)
- See .planning/phases/18-discord-authentication/18-01-USER-SETUP.md

Server package (Room.ts, RoomManager.ts) now implements all new RoomState fields — server TypeScript errors resolved.
WebSocket handlers now wire all Discord room lifecycle: join-or-create, host migration, spectator messaging, auto-return.
Web client UI fully updated: safe area, shithead marker, Discord avatars, spectator indicators, auto-return flow (plans 03-05 complete).

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 23-01-PLAN.md — test infrastructure foundation (mock factory, App.test.ts fix, platform detection/WebAuthAdapter tests)
Resume file: None
Next: Execute 19-06-PLAN.md (Phase 19 final plan) or 23-02-PLAN.md (component tests)
