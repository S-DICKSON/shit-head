---
phase: 20-sound-settings
plan: 02
subsystem: api
tags: [websocket, zod, typescript, room-state, round-time]

# Dependency graph
requires:
  - phase: 20-01
    provides: Sound settings phase established; this plan extends the same phase
provides:
  - RoundTime type (30 | 45 | 60) exported from shared package
  - RoomState.roundTime field with default 45
  - setRoundTimeSchema Zod schema for client-to-server validation
  - Room.setRoundTime() method with lobby-only enforcement
  - set-round-time WebSocket handler with host-only access control
  - turnTimerTickSchema updated to allow max 60
affects: [20-03, 20-04, client lobby UI that reads roundTime from RoomState]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Host-only lobby configuration: validate hostId === playerId before mutating room settings"
    - "Configurable timer pattern: replace const TURN_DURATION with mutable private roundTime: RoundTime"

key-files:
  created: []
  modified:
    - packages/shared/src/types/room.ts
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts
    - packages/server/src/rooms/Room.ts
    - packages/server/src/websocket/handlers.ts
    - packages/server/src/__tests__/rooms.test.ts

key-decisions:
  - "roundTime stored as mutable instance variable (not readonly) to allow setRoundTime() changes"
  - "setRoundTime lobbies-only enforcement: returns INVALID_ACTION if status !== waiting"
  - "turnTimerTickSchema max raised from 45 to 60 to prevent Zod validation failure at 60s"
  - "set-round-time broadcasts room-updated to all players after success (same pattern as start-game)"

patterns-established:
  - "Configurable round time: RoundTime type union (30 | 45 | 60) used in both client schema and server class"

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 20 Plan 02: Sound Settings — Round Time Backend Summary

**Server-authoritative round time (30/45/60s) added to RoomState with host-only WebSocket handler and Zod-validated schemas**

## Performance

- **Duration:** 2 min 21s
- **Started:** 2026-02-19T21:41:01Z
- **Completed:** 2026-02-19T21:43:22Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- RoundTime type (30 | 45 | 60) and roundTime field added to RoomState in shared package
- setRoundTimeSchema added to clientMessageSchema discriminated union with Zod validation
- Room.setRoundTime() method added with lobby-only enforcement and INVALID_ACTION on game start
- Server turn timer now uses this.roundTime instead of hardcoded TURN_DURATION constant
- set-round-time WebSocket handler validates host-only and broadcasts room-updated on success
- turnTimerTickSchema max raised from 45 to 60 to prevent Zod validation failure at 60s rounds
- Fixed 3 pre-existing test assertion failures in rooms.test.ts (missing discordUserId field)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend shared types and schemas for round time** - `26fe47d` (feat)
2. **Task 2: Add setRoundTime to Room class and WebSocket handler** - `2e7df0f` (feat)

**Plan metadata:** (docs: complete plan — pending)

## Files Created/Modified
- `packages/shared/src/types/room.ts` - Added RoundTime type and roundTime field to RoomState
- `packages/shared/src/schemas/messages.ts` - Added roundTimeSchema, setRoundTimeSchema, updated roomStateSchema and turnTimerTickSchema
- `packages/shared/src/types/messages.ts` - Added SetRoundTimeMessage type and setRoundTimeSchema import
- `packages/server/src/rooms/Room.ts` - Added RoundTime import, replaced TURN_DURATION with mutable roundTime, added setRoundTime(), updated getState() and startTurnTimer()
- `packages/server/src/websocket/handlers.ts` - Added set-round-time case with host-only validation and room-updated broadcast
- `packages/server/src/__tests__/rooms.test.ts` - Fixed 3 pre-existing assertions to include discordUserId and roundTime fields

## Decisions Made
- `roundTime` stored as mutable instance variable (not readonly) to allow `setRoundTime()` to update it — `TURN_DURATION` was removed entirely
- `setRoundTime()` returns `INVALID_ACTION` when `status !== 'waiting'`: prevents changing round time mid-game
- `turnTimerTickSchema` max raised from 45 to 60: without this, Zod would reject valid server messages when round time is 60s (timeRemaining: 60 exceeds max 45)
- `set-round-time` handler follows the same broadcast pattern as `rename-player`: send to requester + `publishToRoom` to others

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed 3 pre-existing test assertion failures in rooms.test.ts**
- **Found during:** Task 2 verification (`make test-server`)
- **Issue:** Tests "sets creator as host", "adds player to room", and "getState returns correct RoomState shape" were failing because test assertions did not include `discordUserId: null` on player objects (pre-existing from when Discord support was added). The `getState` test also lacked `roundTime: 45` (new from this plan).
- **Fix:** Updated three `toEqual` assertions in rooms.test.ts to include `discordUserId: null` on player shapes and `roundTime: 45` in the RoomState shape
- **Files modified:** `packages/server/src/__tests__/rooms.test.ts`
- **Verification:** `make test-server` — 340/340 tests pass
- **Committed in:** `2e7df0f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix — tests were already failing before this plan and the new `roundTime` field would have caused an additional failure. No scope creep.

## Issues Encountered
None beyond the pre-existing test failures noted above.

## Next Phase Readiness
- Backend is fully wired: RoomState carries `roundTime`, server timer uses it, host can configure via WebSocket
- Client lobby UI (20-03 or similar) can now read `roomState.roundTime` and send `set-round-time` messages
- No blockers for client-side round time selector implementation

---
*Phase: 20-sound-settings*
*Completed: 2026-02-19*

## Self-Check: PASSED
