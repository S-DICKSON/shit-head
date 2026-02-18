# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** v2.0 Phase 23 - Frontend Testing

## Current Position

Phase: 23 of 23 (Frontend Testing) — COMPLETE
Plan: 4 of 4 complete in phase 23
Status: Phase 23 complete — all 4 plans executed, verified (10/10 must-haves), 122 tests pass
Last activity: 2026-02-18 — Completed phase 23 execution (test infra, component tests, composable tests)

Progress: [█████████░] 23/23 phases in v2.0 complete (Phase 19 awaiting human verification checkpoint)

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
- Client copy of server pure functions in packages/client/src/game/ to avoid cross-package server dependency (21-01)
- playableHandIndices.size > 0 guard pattern: zero size = no highlights = default border-gray-300 (not my turn) (21-01)
- isGroupPlayable uses group.indices (index-based) not rank strings to avoid JKR vs joker kind mismatch (21-01)
- Joker explicit early return in client canPlayOnPile: makes always-playable self-documenting, not implicit via getRankValue=999 (21-01)
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
- Mock @vueuse/core for useDebounceFn must also export useWebSocket stub — Docker/Bun single-thread shares mocks across files; missing export causes full suite failure (23-04)
- useDebounceFn mocked as identity (fn) => fn — makes swap sends synchronous for test assertions without fake timers (23-04)
- ConnectionStatus overlay test: find('.fixed').exists() — Vue Transition renders no DOM when v-if false (23-02)
- NotificationToast element selector: find('[class*="rounded-lg"]') — partial class match for Tailwind multi-class bindings (23-02)
- Landing room code input test: set inputEl.value then trigger('input') — handleRoomCodeInput reads event.target.value not v-model (23-03)
- Lobby RoomCode child stub: stubs: { RoomCode: true } — display-only child not under test in Lobby tests (23-03)
- createTestRouter: no unused params to satisfy @typescript-eslint/no-unused-vars (23-03)
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
- No cookies in server: /api/token returns JSON access_token only — cookie config (SameSite=None; Partitioned; Secure) documented for future reference (19-06)
- instanceId-based auto-join is canonical Discord Activity room pattern: same voice channel = same instanceId = same room (19-06)

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
Stopped at: Completed Phase 23 — Frontend Testing (4 plans, 122 client tests, verified)
Resume file: None
Next: Phase 19 human verification or `/gsd:audit-milestone`
