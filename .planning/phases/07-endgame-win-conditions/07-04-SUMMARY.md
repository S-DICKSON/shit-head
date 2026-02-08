---
phase: 07-endgame-win-conditions
plan: 04
subsystem: websocket-integration
tags: [websocket, room, handlers, endgame, elimination, game-over]

# Dependency graph
requires:
  - phase: 07-01
    provides: Endgame message schemas (face-down-result, player-eliminated, game-over)
  - phase: 07-02
    provides: Endgame utility methods (determinePlaySource, checkPlayerElimination, nextActivePlayerIndex, findShithead)
  - phase: 07-03
    provides: playFaceDownBlind method and BlindPlayResult type
provides:
  - Room methods for endgame play (playFromFaceUp, playFaceDownBlind)
  - Game callback pattern for elimination and game-over events
  - WebSocket handlers for blind plays and endgame broadcasting
  - Automatic elimination detection and game-over detection after any play
affects: [08-round-completion, client-endgame-ui, phase-11-gameplay-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Callback pattern for endgame events (onPlayerEliminated, onGameOver)
    - Post-play state checking for automatic elimination detection
    - Dealer rotation via shithead index (shithead becomes next dealer)
    - Per-player view broadcasting for face-down results

key-files:
  created: []
  modified:
    - packages/server/src/rooms/Room.ts
    - packages/server/src/websocket/handlers.ts

key-decisions:
  - "checkPostPlayState fires callbacks after ANY successful play (hand, face-up, face-down)"
  - "DealerIndex set to shithead index on game end (loser deals next hand)"
  - "Game callbacks set during start-game countdown (alongside swap callbacks)"
  - "face-down-result includes per-player views for all players (hand, faceDownCount, opponents)"
  - "playCards updated to call checkPostPlayState for endgame support during hand play"

patterns-established:
  - "Centralized post-play checking via checkPostPlayState helper"
  - "Room methods delegate to GameEngine and update state immutably"
  - "WebSocket handlers broadcast per-player views after state changes"
  - "Callbacks fire from Room to handlers for game events"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Phase 7 Plan 4: WebSocket Endgame Integration Summary

**Room endgame methods and WebSocket handlers for blind plays, elimination, and game-over broadcasting**

## Performance

- **Duration:** 3 min (173 seconds)
- **Started:** 2026-02-08T11:13:16Z
- **Completed:** 2026-02-08T11:16:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Room class has playFromFaceUp and playFaceDownBlind methods that delegate to GameEngine
- checkPostPlayState helper detects elimination and game end after any successful play
- setGameCallbacks enables Room to fire elimination and game-over events to handlers
- play-face-down WebSocket handler processes blind plays and broadcasts face-down-result
- Game callbacks set during start-game countdown for real-time elimination and game-over notifications
- DealerIndex updated to shithead index when game ends (loser deals next hand)
- playCards updated to check post-play state for endgame scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: Add endgame methods to Room class** - `6ace24a` (feat)
2. **Task 2: Add play-face-down handler and endgame broadcasting** - `10113c8` (feat)

**Plan metadata:** (next commit)

## Files Created/Modified
- `packages/server/src/rooms/Room.ts` - Added playFromFaceUp, playFaceDownBlind, setGameCallbacks methods. Added checkPostPlayState helper to fire elimination/game-over callbacks. Updated playCards to call checkPostPlayState. Added onPlayerEliminated and onGameOver callback properties. Imported BlindPlayResult type from GameEngine.
- `packages/server/src/websocket/handlers.ts` - Added play-face-down case handler that calls room.playFaceDownBlind and broadcasts face-down-result with per-player views. Added setGameCallbacks call in start-game handler with elimination and game-over broadcasting. Callbacks set after setSwapCallbacks, before room.startGame().

## Decisions Made

**1. checkPostPlayState centralizes endgame logic**
- Helper method checks elimination and game end after ANY successful play
- Rationale: Single point of truth for endgame state transitions, prevents duplication across playCards, playFromFaceUp, playFaceDownBlind

**2. DealerIndex updated on game end**
- Shithead (loser) becomes dealer for next hand
- Rationale: Standard Shithead rule - loser deals next round

**3. Game callbacks set during start-game countdown**
- setGameCallbacks called alongside setSwapCallbacks before room.startGame()
- Rationale: Ensures callbacks are ready before any gameplay begins (consistent with swap callback pattern)

**4. face-down-result includes per-player views**
- Each player receives their own hand, faceDownCount, and opponent views
- Rationale: Server-authoritative per-player state, client doesn't need to compute state updates

**5. playCards updated for endgame support**
- Existing playCards method calls checkPostPlayState after successful play
- Rationale: Hand plays during endgame (after failed blind pickup) also need elimination checking

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript compilation warnings:**
- Pre-existing Zod v4 compatibility issues in test files (Card, Rank, Suit imports)
- These are known issues from recent Zod upgrade, not introduced by this plan
- All 279 tests pass successfully (no functional regressions)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 8 (Round Completion & Multi-Round State):**
- Endgame mechanics fully integrated into WebSocket layer
- Clients can now receive face-down-result, player-eliminated, and game-over messages
- DealerIndex tracking ready for next-hand dealing
- Game phase set to 'finished' when game ends

**Ready for client UI implementation:**
- face-down-result message includes revealed card and playable flag
- player-eliminated message includes eliminated player and current turn
- game-over message includes shithead identity for display

**No blockers.** Endgame mechanics complete from GameEngine through WebSocket layer.

## Self-Check: PASSED

All files and commits verified:
- packages/server/src/rooms/Room.ts: FOUND
- packages/server/src/websocket/handlers.ts: FOUND
- Commit 6ace24a: FOUND
- Commit 10113c8: FOUND

---
*Phase: 07-endgame-win-conditions*
*Completed: 2026-02-08*
