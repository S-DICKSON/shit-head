# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Friends can play a complete, rule-accurate game of Shithead together online with zero friction
**Current focus:** v2.0 Phase 22 complete — Mobile Card Categories

## Current Position

Phase: 22 of 23 (Mobile Card Categories) — COMPLETE
Plan: 1 of 1 complete in phase 22
Status: Phase 22 complete — category tabs + carousel + two-step play confirmation for mobile hand navigation
Last activity: 2026-02-19 — Completed 22-01-PLAN.md (useCardCategories composable + PlayerCards.vue category UI)

Progress: [██████████] 22/23 phases complete (96% overall — Phase 23 remaining)

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 51
- Average duration: 2.3 minutes
- Total execution time: 2.05 hours
- Quick tasks completed: 21

**v2.0 Velocity:**
- Total plans completed: 14
- Average duration: 2.6 minutes
- Total execution time: 0.58 hours

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
- muteState at module level (not inside composable) — singleton pattern ensures all component instances share one reactive ref (20-01)
- mockOscillator.start assertion for post-unmute beep test: module-level audioContext persists across Vitest tests; checking createOscillator on fresh mock fails because old cached context is reused (20-01)
- roundTime stored as mutable instance variable (not readonly) to allow setRoundTime() changes — TURN_DURATION removed entirely (20-02)
- setRoundTime lobbies-only enforcement: returns INVALID_ACTION if status !== waiting (20-02)
- turnTimerTickSchema max raised from 45 to 60: prevents Zod validation failure when server sends timeRemaining: 60 (20-02)
- set-round-time broadcasts room-updated to all players after success (same pattern as rename-player) (20-02)
- roomState?.roundTime ?? 45 fallback in TurnTimer binding and return-to-lobby reset: defensive for edge cases (20-03)
- MuteButton before TurnTimer in PlayingPhase template: both fixed-position overlays, order has no visual impact (20-03)
- isPowerCard includes 7 and Joker beyond server isSpecialCard (2,8,10) — UI categorization purpose (22-01)
- Tab buttons as sole category switching mechanism — avoids useSwipe touch conflict with carousel scroll (22-01)
- groupedCards excluded from PlayerCards destructuring — component uses activeGroups (display layer only) (22-01)
- isGroupPlayable removed from carousel — new carousel uses isPowerGroup for gold styling, not playability ring (22-01)
- confirmTimer as module-level let (not ref) — no reactivity needed, pure timeout management (22-01)
- @testing-library/vue v8 accepts identical global: { plugins, stubs } options shape as @vue/test-utils — drop-in for render call (quick-025)
- Async IIFE in main.ts: esbuild target es2020+edge89 hard-errors on TLA; only fix is removing TLA from source with void (async()=>{})() (quick-027b)
- Vite build target ['es2020', 'chrome89', 'safari15'] not 'esnext': named browser targets provide Edge 89+ compatible output without TLA (quick-027b)
- CSS dvh fallback: declare 100vh before 100dvh in inline style; cascade ensures dvh wins in Edge 108+, vh used in older Edge (quick-027b)
- useSwapPhase tryPerformSwaps: cycle face-up indices (i % faceUpArr.length) not Math.min pairing — N hand cards can target same face-up slot (quick-027b)
- fireEvent.input(el, { target: { value: 'X' } }) for :value + @input handlers (not v-model) in Landing.vue room code input (quick-025)
- waitFor() in Lobby tests replaces flushPromises() — handles async router readiness after render() (quick-025)
- Docker image rebuild required after package.json changes — bun install runs at image build time, not container start (quick-025)
- useSwapPhase Set-based reactivity: always assign new Set (new Set([...old, idx])) never mutate in place — Vue doesn't track Set.add/delete (quick-027)
- Swap rank-aware multi-select: same rank tap accumulates, different rank tap replaces; cycling pairing handArr[i % faceUpArr.length] for N-to-1 swaps (quick-027)

### Pending Todos

1 pending — `/gsd:check-todos` to review
- Add debug gamestate dev tooling (tooling)

### Roadmap Evolution

- Phase 23 added: Frontend Testing — Vue component and integration tests for the client package

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 021 | Bug: mobile touch controls causing zoom on double-tap pile pickup | 2026-02-19 | 1f75ba5 | [021-bug-mobile-touch-controls-causing-zoom-o](./quick/021-bug-mobile-touch-controls-causing-zoom-o/) |
| 022 | Fix mobile screen overflow — timer causes scroll on iPhone 15 Pro | 2026-02-19 | 1edf5b8 | [022-fix-mobile-screen-overflow-timer-scroll](./quick/022-fix-mobile-screen-overflow-timer-scroll/) |
| 023 | Fix Discord avatar showing in web mode (Guest XXX showing Discord default avatar) | 2026-02-20 | af839c3 | [023-fix-discord-avatar-showing-in-web-mode](./quick/023-fix-discord-avatar-showing-in-web-mode/) |
| 024 | Update deployment — Infisical Discord secrets (Makefile deploy target, Dockerfile build arg, deploy.yml) | 2026-02-20 | 2cccf8c | [024-update-deployment-infisical-discord-secr](./quick/024-update-deployment-infisical-discord-secr/) |
| 025 | Migrate client tests from @vue/test-utils to @testing-library/vue — 5 test files, resolve Bun WeakMap failures | 2026-02-20 | b70ed33 | [025-migrate-client-tests-from-vue-test-utils](./quick/025-migrate-client-tests-from-vue-test-utils/) |
| 026 | Add privacy policy and terms of service static pages for Discord app verification | 2026-02-20 | 5ec4245 | [026-add-privacy-policy-and-terms-of-service-](./quick/026-add-privacy-policy-and-terms-of-service-/) |
| 027a | Card swap selection improvement — rank-aware multi-select with Set-based reactive refs | 2026-02-21 | 85e502a | [027-card-swap-selection-improvement-switch-t](./quick/027-card-swap-selection-improvement-switch-t/) |
| 027b | Fix game not working on Microsoft Edge — async IIFE in main.ts, es2020 build target, vh/dvh CSS fallbacks | 2026-02-21 | 9d13f51 | [027-game-doesn-t-work-on-microsoft-edge-plea](./quick/027-game-doesn-t-work-on-microsoft-edge-plea/) |

### Blockers/Concerns

User setup required before Discord Activity testing:
- Discord Developer Portal credentials needed (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, VITE_DISCORD_CLIENT_ID)
- See .planning/phases/18-discord-authentication/18-01-USER-SETUP.md

Server package (Room.ts, RoomManager.ts) now implements all new RoomState fields — server TypeScript errors resolved.
WebSocket handlers now wire all Discord room lifecycle: join-or-create, host migration, spectator messaging, auto-return.
Web client UI fully updated: safe area, shithead marker, Discord avatars, spectator indicators, auto-return flow (plans 03-05 complete).

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed quick task 027b — Edge browser compatibility fix (9d13f51)
Resume file: None
Next: Phase 23 (Frontend Testing)
