---
phase: 19-discord-room-management
plan: "03"
subsystem: api
tags: [websocket, discord, rooms, spectators, host-migration, auto-return]

# Dependency graph
requires:
  - phase: 19-01
    provides: shared schemas for join-or-create, spectator-state, spectator-count messages
  - phase: 19-02
    provides: Room.ts lifecycle methods (joinRoomOrSpectate, createRoomWithCode, getAugmentedPlayerView, setHostMigrationCallback, setSpectatorCallbacks, autoReturnToLobby)
provides:
  - join-or-create message handler routing Discord Activity clients to create/join/spectate
  - host migration broadcasts via setHostMigrationCallback in both lobby and in-game paths
  - spectator messaging (spectator-state on join, spectator-count on updates and disconnect)
  - spectator disconnect cleanup (removeSpectator + removePlayerIndex)
  - auto-return to lobby flow (setPlayAgainCallbacks set after game-over, auto-triggers via Room.ts timer)
  - all game state broadcasts use getAugmentedPlayerView (isShithead + avatarHash included)
  - spectator reconnect support (spectator-state instead of player game view)
affects: [19-04, 19-05, client-discord-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spectator-first disconnect check: handleClose checks isSpectator before player disconnect logic"
    - "Callback wiring at game start: setHostMigrationCallback and setSpectatorCallbacks set alongside other callbacks in start-game handler"
    - "Auto-return via setPlayAgainCallbacks post-game-over: Room.ts timer fires independently, handlers just need to register the callback"

key-files:
  created: []
  modified:
    - packages/server/src/websocket/handlers.ts
    - packages/server/src/__tests__/rooms.test.ts
    - packages/server/src/rooms/__tests__/Room.disconnect.test.ts

key-decisions:
  - "Prefix _newHostId in setHostMigrationCallback: oldHostId used for removePlayerIndex, newHostId not needed since room.getState() gives current host"
  - "Spectator check before playerSockets.delete in handleClose: early return prevents stale socket entries and incorrect spectator count broadcasts"
  - "Test updates for host migration: removePlayer returning false (migration) instead of true (destroy) required updating 5 test assertions across 2 test files"

patterns-established:
  - "Host migration callback pattern: setHostMigrationCallback wired in both in-game (start-game handler) and lobby (handleClose) paths"
  - "Spectator disconnect early return: check isSpectator before main player disconnect logic for clean code path separation"

# Metrics
duration: 5min
completed: 2026-02-18
---

# Phase 19 Plan 03: WebSocket Handlers for Discord Room Management Summary

**Discord Activity join-or-create, host migration broadcasting, spectator lifecycle messaging, and auto-return-to-lobby wired into WebSocket handlers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-18T20:16:37Z
- **Completed:** 2026-02-18T20:21:53Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added `join-or-create` handler: creates room with `instanceId` as code if new, joins lobby if waiting, becomes spectator if game in progress
- Replaced host-destroys-room leave-room logic with host migration: room persists with new host and broadcasts `room-updated`
- Spectators receive `spectator-state` on join/reconnect, active players receive `spectator-count` updates
- Spectator disconnect properly cleans up `playerRoomIndex` and broadcasts updated spectator count
- `game-over` callback now registers `setPlayAgainCallbacks` for auto-return (Room.ts fires the 5s timer independently)
- All game state broadcasts switched from `getPlayerView` to `getAugmentedPlayerView` (includes `isShithead` and `avatarHash`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add join-or-create handler, host migration, spectator messaging, auto-return, augmented views** - `be71232` (feat)

**Plan metadata:** (see below)

## Files Created/Modified
- `packages/server/src/websocket/handlers.ts` - Core handler changes: join-or-create, leave-room, start-game, handleClose, reconnect
- `packages/server/src/__tests__/rooms.test.ts` - Updated 4 test assertions to match host migration behavior (Plan 02 behavioral change)
- `packages/server/src/rooms/__tests__/Room.disconnect.test.ts` - Updated 2 tests: host disconnect now triggers migration, not host-left; added new test for host-left-with-no-remaining-players case

## Decisions Made
- `_newHostId` prefix in `setHostMigrationCallback`: old host ID used for `removePlayerIndex`, new host ID not needed since `room.getState()` reflects current host after migration
- Spectator check in `handleClose` placed before `playerSockets.delete`: early return ensures clean path separation and correct socket cleanup ordering
- Registered `setHostMigrationCallback` in both `start-game` (in-game path) and `handleClose` `if (!room.hasDisconnectCallbacks())` block (lobby path)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated tests broken by Plan 02 host migration behavior change**

- **Found during:** Task 1 (during `make test-server` verification)
- **Issue:** 7 test assertions across 2 test files expected the old behavior where host leaving destroys the room (returns `true` from `removePlayer`, sends `host-left` to others). Plan 02 changed `removePlayer` to do host migration instead (returns `false`, fires `onHostMigrated`). Tests also missing new `RoomState` fields (`avatarHash`, `spectatorCount`, `shitheadPlayerId`).
- **Fix:** Updated `rooms.test.ts`: renamed "destroys room when host leaves" to "migrates host when host leaves", updated `getState` shape test to include new fields, updated `leaveRoom` test. Updated `Room.disconnect.test.ts`: renamed "lobby host disconnect triggers host-left" to "triggers host migration", added new test for the no-remaining-players case that still uses `host-left`. 340 tests pass.
- **Files modified:** `packages/server/src/__tests__/rooms.test.ts`, `packages/server/src/rooms/__tests__/Room.disconnect.test.ts`
- **Verification:** `make test-server` passes (340/340 tests)
- **Committed in:** `be71232` (included in task commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix for test correctness reflecting Plan 02 behavioral changes. No scope creep.

## Issues Encountered
- Client lint (`DiscordLobby.vue`) has pre-existing errors from parallel Plan 04/05 execution. Server lint passes cleanly. This plan only touches server files.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server WebSocket handlers fully wired for Discord Activity room lifecycle
- Plans 04 and 05 (client-side Discord adapter and UI) can proceed — they consume the `join-or-create`, `spectator-state`, `spectator-count`, and `room-updated` messages that handlers now produce
- Host migration, spectator messaging, and auto-return all tested end-to-end at the handler level

---
*Phase: 19-discord-room-management*
*Completed: 2026-02-18*
