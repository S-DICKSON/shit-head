---
phase: 19-discord-room-management
plan: "04"
subsystem: ui
tags: [vue, discord, websocket, spectator, composable, routing]

# Dependency graph
requires:
  - phase: 19-01
    provides: join-or-create schema in ClientMessage union, spectator-state/spectator-count schemas in ServerMessage
  - phase: 18-discord-authentication
    provides: DiscordAuthAdapter with getSdk(), getDiscordUser(), authenticate(), getCurrentUser()

provides:
  - DiscordLobby.vue component with auto-join, Discord avatars, spectator view
  - useGameSocket spectator state (isSpectator, spectatorCount, spectatorGameView)
  - DiscordRoomAdapter.joinOrCreate() method
  - RoomAdapter interface optional joinOrCreate method
  - router /discord-lobby route
  - main.ts Discord platform initial navigation to /discord-lobby

affects:
  - 19-05-discord-game-view
  - 19-06-discord-activity-events

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discord auto-join: authenticate -> getCurrentUser -> getSdk().instanceId -> send join-or-create"
    - "Silent retry with exponential backoff (1s, 2s, 4s) before spinning indefinitely (no error screen)"
    - "Spectator state: isSpectator flag + spectatorGameView from spectator-state server message"
    - "Optional interface method: joinOrCreate? in RoomAdapter, only DiscordRoomAdapter implements it"

key-files:
  created:
    - packages/client/src/components/DiscordLobby.vue
  modified:
    - packages/client/src/composables/useGameSocket.ts
    - packages/client/src/platform/adapters/discord/DiscordRoomAdapter.ts
    - packages/client/src/platform/interfaces/RoomAdapter.ts
    - packages/client/src/router.ts
    - packages/client/src/main.ts

key-decisions:
  - "No error screen on auth failure — spinner persists indefinitely after retries (locked decision from 19-CONTEXT.md)"
  - "joinOrCreate optional in RoomAdapter interface — WebRoomAdapter unchanged"
  - "DiscordLobby.vue committed via parallel Plan 05 but owned by Plan 04 (wave 3 parallel execution)"

patterns-established:
  - "Discord component lifecycle: inject AuthAdapterKey -> authenticate() -> getCurrentUser() -> getSdk().instanceId"
  - "useGameSocket spectator handlers: spectator-state sets isSpectator=true + spectatorGameView; return-to-lobby clears all"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 19 Plan 04: Discord Auto-Join Client Flow Summary

**DiscordLobby.vue with instanceId auto-join, useGameSocket spectator state (isSpectator/spectatorCount/spectatorGameView), and Discord routing via /discord-lobby**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-18T20:18:10Z
- **Completed:** 2026-02-18T20:23:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- useGameSocket now handles spectator-state and spectator-count messages, exposing isSpectator, spectatorCount, and spectatorGameView reactive state
- DiscordRoomAdapter.joinOrCreate() sends join-or-create message with instanceId for Discord Activity room auto-join
- DiscordLobby.vue provides full Discord UX: authenticate on mount with silent retry, auto-join via instanceId, Discord avatars, shithead marker, spectator banner, start game for host
- Router /discord-lobby route added; main.ts navigates Discord platform to discord-lobby on startup

## Task Commits

Each task was committed atomically:

1. **Task 1: Add spectator state handling and DiscordRoomAdapter.joinOrCreate** - `d75376f` (feat)
2. **Task 2: Create DiscordLobby component and configure Discord routing** - `5ed908a` (feat)

**Plan metadata:** See final commit below

_Note: DiscordLobby.vue was created by this plan but committed as part of parallel Plan 19-05 execution (wave 3 parallel) — the file content is identical to what this plan specified._

## Files Created/Modified

- `packages/client/src/components/DiscordLobby.vue` - Discord auto-join lobby: authenticate, join-or-create, Discord avatars, spectator view, start game
- `packages/client/src/composables/useGameSocket.ts` - Added isSpectator, spectatorCount, spectatorGameView; handles spectator-state/spectator-count messages; return-to-lobby clears spectator state
- `packages/client/src/platform/adapters/discord/DiscordRoomAdapter.ts` - Added joinOrCreate() method sending join-or-create message with instanceId
- `packages/client/src/platform/interfaces/RoomAdapter.ts` - Added optional joinOrCreate? method to interface
- `packages/client/src/router.ts` - Added /discord-lobby route
- `packages/client/src/main.ts` - Added router.push('/discord-lobby') for Discord platform after mount

## Decisions Made

- Auth error screen removed per locked decision: "no error screen" in 19-CONTEXT.md — spinner persists indefinitely after all retries exhausted, which is better UX than hard error for Discord embedded context
- joinOrCreate made optional (`?`) in RoomAdapter interface so WebRoomAdapter requires no changes
- PlatformKey import removed from DiscordLobby.vue (unused, auto-fixed by eslint --fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint errors and warnings in DiscordLobby.vue**

- **Found during:** Task 2 (create DiscordLobby component)
- **Issue:** PlatformKey imported but unused (error); 15 vue/max-attributes-per-line and vue/singleline-html-element-content-newline warnings (all auto-fixable)
- **Fix:** Ran `eslint . --fix` to auto-fix all issues; removed unused PlatformKey and platform/gameView imports; reformatted template attributes
- **Files modified:** packages/client/src/components/DiscordLobby.vue
- **Verification:** `make lint` passes cleanly after fix
- **Committed in:** `5ed908a` (Task 2 commit, via parallel Plan 05 commit `11088aa`)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Lint fix required for project rules ("all phases that write code must pass `make lint`"). No scope creep.

## Issues Encountered

- DiscordLobby.vue was committed to git by parallel Plan 19-05 (`11088aa`) before this plan's Task 2 commit could include it — this is expected behavior in wave 3 parallel execution. The file content matches this plan's specification exactly.

## User Setup Required

None - no external service configuration required for this plan. Discord credentials are configured per 18-01-USER-SETUP.md.

## Next Phase Readiness

- DiscordLobby.vue is complete and functional for Discord Activity use
- useGameSocket spectator state ready for Game.vue integration (Plan 19-05 already uses it)
- Discord routing configured: discord platform auto-navigates to /discord-lobby
- Plan 19-06 (Discord Activity events) can build on DiscordRoomAdapter and DiscordAuthAdapter patterns established here

## Self-Check: PASSED

---
*Phase: 19-discord-room-management*
*Completed: 2026-02-18*
