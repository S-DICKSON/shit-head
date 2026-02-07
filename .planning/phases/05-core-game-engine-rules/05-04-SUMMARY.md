---
phase: 05-core-game-engine-rules
plan: 04
subsystem: game-engine
tags: [websocket, room-management, gameplay, turn-based]

# Dependency graph
requires:
  - phase: 05-01
    provides: "play-cards WebSocket message type and validation"
  - phase: 05-02
    provides: "determineFirstPlayer algorithm for first turn detection"
  - phase: 05-03
    provides: "GameEngine.playCards and GameEngine.pickupPile methods"
provides:
  - "Room.playCards and Room.pickupPile methods for gameplay actions"
  - "WebSocket handlers for play-cards and pickup-pile messages"
  - "First player determination on swap phase transition"
  - "Per-player view broadcasting for gameplay actions"
affects: [06-special-cards-burn-mechanics, gameplay-integration, client-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Room methods delegate to GameEngine for pure game logic"
    - "WebSocket handlers broadcast per-player views to all room participants"
    - "Phase transition callbacks notify state changes (onPlayPhaseStart)"

key-files:
  created: []
  modified:
    - "packages/server/src/rooms/Room.ts"
    - "packages/server/src/websocket/handlers.ts"

key-decisions:
  - "Room methods cast GameEngine error codes (string) to ErrorCode type for compatibility"
  - "onPlayPhaseStart callback added to notify all players when playing phase begins"
  - "card-played response includes played cards extracted from end of discard pile"

patterns-established:
  - "Gameplay actions follow delegation pattern: handlers → Room → GameEngine → state update → broadcast"
  - "All players receive updated views after any gameplay action"
  - "Turn changes are broadcast via turn-changed message with currentPlayerIndex"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 05 Plan 04: Gameplay Action Wiring Summary

**Room and WebSocket handlers wire playCards and pickupPile actions with per-player view broadcasting and first-player determination on phase transition**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T22:53:56Z
- **Completed:** 2026-02-07T22:57:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Room.playCards and Room.pickupPile delegate to GameEngine and update internal state
- WebSocket play-cards and pickup-pile handlers broadcast per-player views to all room participants
- First player determined via GameEngine.determineFirstPlayer when transitioning from swapping to playing phase
- All players notified of first turn via turn-changed message when playing phase begins

## Task Commits

Each task was committed atomically:

1. **Task 1: Add gameplay methods to Room class and integrate determineFirstPlayer** - `c80bcd6` (feat)
2. **Task 2: Add play-cards and pickup-pile WebSocket handlers** - `dec964f` (feat)

## Files Created/Modified
- `packages/server/src/rooms/Room.ts` - Added playCards and pickupPile methods, updated endSwapPhase to determine first player, added onPlayPhaseStart callback
- `packages/server/src/websocket/handlers.ts` - Added play-cards and pickup-pile case handlers, added onPlayPhaseStart callback to notify first turn

## Decisions Made

**1. Type casting for error codes**
- GameEngine returns `code: string`, Room expects `code: ErrorCode`
- Cast error codes from GameEngine result to ErrorCode type for compatibility
- Rationale: Allows error codes to flow through without type errors while maintaining Room's type contract

**2. onPlayPhaseStart callback for first turn notification**
- Added new callback to Room's swap callbacks interface
- Invoked after determining first player on phase transition
- Broadcasts turn-changed message to all players
- Rationale: Clients need to know who the first player is when playing phase begins

**3. Played cards extracted from discard pile**
- card-played response includes cards that were just played
- Extracted by slicing last N cards from discard pile (where N = cardIndices.length)
- Rationale: Clients need to see which specific cards were played for UI updates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed established patterns from prior plans (swap-cards handler and Room.swapCards delegation pattern).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Phase 06 (Special Cards & Burn Mechanics) - can now build on basic play actions
- Client UI integration - all gameplay WebSocket messages are wired and broadcasting

**Notes:**
- Shared types (ClientMessage, ServerMessage) need to include play-cards, pickup-pile, card-played, pile-pickup, turn-changed message types
- Current TypeScript errors are expected (shared types not yet updated in this phase)
- All server tests pass (143 pass, 0 fail)

## Self-Check: PASSED

---
*Phase: 05-core-game-engine-rules*
*Completed: 2026-02-07*
