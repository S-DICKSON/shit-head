---
phase: quick
plan: 005
subsystem: websocket
tags: [disconnect, reconnect, lobby, grace-period]

# Dependency graph
requires:
  - phase: 09-02
    provides: In-game disconnect grace period and reconnection logic
provides:
  - Lobby disconnect grace period (15 seconds) enables page refresh reconnection
  - Unified disconnect handling for lobby and in-game scenarios
affects: [disconnect, reconnect, lobby-ux]

# Tech tracking
tech-stack:
  added: []
  patterns: [grace-period-pattern, disconnect-callback-wiring]

key-files:
  created: []
  modified:
    - packages/server/src/rooms/Room.ts
    - packages/server/src/websocket/handlers.ts
    - packages/server/src/rooms/__tests__/Room.disconnect.test.ts
    - packages/server/src/__tests__/websocket.test.ts

key-decisions:
  - "15-second grace period for lobby/finished disconnects (vs 90s for in-game)"
  - "Delegate all disconnects to Room.handlePlayerDisconnect with phase-appropriate grace period"
  - "Wire disconnect callbacks for lobby if not already set (game-start normally wires them)"

patterns-established:
  - "hasDisconnectCallbacks() check prevents overwriting game-phase callbacks"
  - "getDisconnectGraceRemaining() dynamically calculates based on game phase"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Quick Task 005: Fix Guest Returning to Home Page on Lobby Refresh

**Lobby page refresh now reconnects guests within 15 seconds instead of immediate removal and redirect to home**

## Performance

- **Duration:** 4 min (237 seconds)
- **Started:** 2026-02-15T13:17:51Z
- **Completed:** 2026-02-15T13:21:48Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added 15-second grace period for lobby disconnects (shorter than 90s in-game grace period)
- Unified disconnect handling - both lobby and in-game use Room.handlePlayerDisconnect
- Updated all tests to reflect new grace period behavior
- Existing reconnect handler now works for lobby without code changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add lobby disconnect grace period to Room.ts** - `7b0c055` (feat)
2. **Task 2: Update handleClose to delegate lobby disconnects to Room** - `d87730d` (feat)
3. **Task 3: Update disconnect tests for lobby grace period** - `7134ef1` (test)

## Files Created/Modified
- `packages/server/src/rooms/Room.ts` - Added LOBBY_DISCONNECT_GRACE_PERIOD constant (15s), modified handlePlayerDisconnect to use shorter grace period for lobby/finished, updated getDisconnectGraceRemaining to calculate based on game phase, added hasDisconnectCallbacks() method
- `packages/server/src/websocket/handlers.ts` - Modified handleClose to delegate all disconnects (lobby and in-game) to Room.handlePlayerDisconnect, wire disconnect callbacks for lobby disconnects if not already set
- `packages/server/src/rooms/__tests__/Room.disconnect.test.ts` - Updated lobby disconnect tests to expect grace period, added tests for lobby reconnection within grace period, lobby host disconnect with host-left reason, and verification that 15s lobby grace period is shorter than 90s in-game
- `packages/server/src/__tests__/websocket.test.ts` - Added fake timers setup, updated handleClose test to advance timers past grace period before checking room destruction

## Decisions Made

**1. 15-second grace period for lobby disconnects**
- Rationale: Long enough for page refresh/navigation but shorter than in-game 90s (lobby has less state to preserve)

**2. Delegate all disconnects to Room.handlePlayerDisconnect**
- Rationale: Single code path for disconnect logic reduces duplication and bugs, phase-appropriate grace period selected internally

**3. Wire disconnect callbacks for lobby if not already set**
- Rationale: Game-start normally wires disconnect callbacks, but lobby disconnects happen before game starts, so handleClose wires them on first lobby disconnect

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. Existing websocket test expected immediate room destruction**
- Problem: Test `removes player from room and unsubscribes` checked for immediate room destruction after host disconnect
- Resolution: Added fake timers to websocket test suite, updated test to advance timers by 15s before checking room destruction
- Impact: All tests now pass with new grace period behavior

## Next Phase Readiness
- Guests can now refresh page in lobby and automatically reconnect within 15 seconds
- Client reconnect handler (already working for in-game) now also handles lobby reconnects
- No client code changes needed - behavior change is server-only

## Self-Check: PASSED

---
*Phase: quick-005*
*Completed: 2026-02-15*
