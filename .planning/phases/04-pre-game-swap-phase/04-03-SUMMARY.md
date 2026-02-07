---
phase: 04-pre-game-swap-phase
plan: 03
subsystem: game-logic
tags: [websocket, room-management, timer, game-state, swap-phase]

# Dependency graph
requires:
  - phase: 04-pre-game-swap-phase
    plan: 02
    provides: GameEngine.swapCards() method for server-authoritative validation
  - phase: 04-pre-game-swap-phase
    plan: 01
    provides: Swap-phase message schemas and types
  - phase: 03-deck-dealing-system
    provides: Room.startGame() and GameEngine integration pattern
provides:
  - Room.swapCards() and Room.markPlayerReady() methods
  - 30-second swap timer with broadcast callbacks
  - Ready state tracking and all-ready detection
  - WebSocket handlers for swap-cards and ready-up messages
  - Per-player swap-cards-updated broadcasts
affects: [04-04, client-swap-ui, swap-phase]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Callback-based broadcasting from Room to WebSocket handlers"
    - "Per-player message broadcasting for authoritative state updates"
    - "Timer management with setInterval and clearInterval"
    - "Auto-un-ready on player action (swap after ready-up)"

key-files:
  created: []
  modified:
    - packages/server/src/rooms/Room.ts
    - packages/server/src/websocket/handlers.ts
    - packages/server/src/__tests__/rooms.test.ts

key-decisions:
  - "Callback pattern for Room-to-handler communication (onTick, onReady, onComplete)"
  - "Swap after ready-up auto-un-readies player (prevents confusion)"
  - "Validate game exists in Room.swapCards() before delegating to GameEngine"
  - "Set callbacks before startGame() to ensure timer broadcasts work immediately"

patterns-established:
  - "Room broadcasts events via callbacks, handlers send to WebSocket clients"
  - "Per-player views sent to all players after any swap (authoritative server state)"
  - "Phase transitions through intermediate 'transitioning' state with delay"

# Metrics
duration: 3.3min
completed: 2026-02-07
---

# Phase 04 Plan 03: Room Swap Integration Summary

**Room class manages 30-second swap timer with callback-based broadcasting, WebSocket handlers route swap-cards and ready-up messages with per-player authoritative updates**

## Performance

- **Duration:** 3.3 min (197s)
- **Started:** 2026-02-07T22:11:34Z
- **Completed:** 2026-02-07T22:14:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Room class tracks ready state and broadcasts timer ticks, ready updates, and phase completion via callbacks
- WebSocket handlers route swap-cards and ready-up messages with full validation
- Per-player swap-cards-updated messages sent to all players after each swap for UI consistency
- All-ready detection skips timer and transitions phase immediately
- Swap after ready-up auto-un-readies player to prevent confusion

## Task Commits

Each task was committed atomically:

1. **Task 1: Add swap, ready, and timer methods to Room class** - `1b2e3b4` (feat)
2. **Task 2: Add swap-cards and ready-up WebSocket handlers** - `56e1b24` (feat)

## Files Created/Modified
- `packages/server/src/rooms/Room.ts` - Added swapCards(), markPlayerReady(), startSwapTimer(), endSwapPhase(), setSwapCallbacks(), getReadyPlayers() methods; callback properties for broadcasting
- `packages/server/src/websocket/handlers.ts` - Added swap-cards and ready-up handlers; set callbacks in start-game handler
- `packages/server/src/__tests__/rooms.test.ts` - Added 6 tests for swap and ready behavior

## Decisions Made

**Callback pattern for broadcasting:** Room uses callbacks (onTick, onReady, onComplete) to notify handlers instead of handlers polling Room state. This inverts control flow cleanly and enables Room to remain agnostic of WebSocket implementation.

**Auto-un-ready on swap:** If a player swaps cards after marking ready, they are removed from the ready set. This prevents confusion where a player thinks they're ready but has unsaved swaps.

**Validate game state before delegation:** Room.swapCards() validates gameState exists before calling GameEngine.swapCards() to provide clearer error messages (INVALID_ACTION) instead of null pointer errors.

**Set callbacks before startGame():** Callbacks are registered in start-game handler before calling room.startGame() to ensure timer broadcasts work immediately when timer starts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added null check before GameEngine.swapCards() call**
- **Found during:** Task 1 (Room.swapCards() implementation)
- **Issue:** Room.swapCards() called GameEngine.swapCards() with `this.gameState!` (non-null assertion) but gameState could be null if no game started, causing null pointer exception in tests
- **Fix:** Added explicit null check and return INVALID_ACTION error before delegating to GameEngine
- **Files modified:** packages/server/src/rooms/Room.ts
- **Verification:** Test "swapCards() returns error when no game in progress" passes
- **Committed in:** 1b2e3b4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix necessary for correctness. No scope creep.

## Issues Encountered

None - plan executed smoothly after auto-fixing the null check bug.

## Next Phase Readiness

Ready for Plan 04 (client swap UI):
- Server-side swap phase fully functional with timer, ready state, and broadcasting
- WebSocket handlers route swap-cards and ready-up with full validation
- Per-player views broadcast after each swap for UI consistency
- Phase transitions work: swapping → transitioning (2.5s) → playing

No blockers or concerns.

---
*Phase: 04-pre-game-swap-phase*
*Completed: 2026-02-07*

## Self-Check: PASSED
