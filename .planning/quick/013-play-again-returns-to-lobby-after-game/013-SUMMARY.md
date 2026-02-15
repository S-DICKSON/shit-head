---
phase: quick
plan: "013"
subsystem: game-flow
tags: [websocket, vue, lobby, game-loop]

# Dependency graph
requires:
  - phase: 07
    provides: game-over message and finished phase
  - phase: 09
    provides: disconnect handling and grace periods
provides:
  - Play again flow after game-over
  - return-to-lobby message protocol
  - automatic host transfer when host doesn't play again
affects: [future-game-modes, tournament-mode]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Play again timeout pattern (30s grace period for player responses)
    - Implicit opt-out via disconnect in finished phase
    - Automatic host reassignment when host leaves during play-again

key-files:
  created: []
  modified:
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts
    - packages/server/src/rooms/Room.ts
    - packages/server/src/websocket/handlers.ts
    - packages/client/src/composables/useGameSocket.ts
    - packages/client/src/components/Game.vue
    - packages/client/src/components/Lobby.vue

key-decisions:
  - "30-second timeout after first play-again click for remaining players to respond"
  - "Players who disconnect during finished phase are implicitly not playing again"
  - "Non-play-again players removed from room, host transfers to first play-again player if needed"
  - "return-to-lobby message carries updated room state with remaining players"

patterns-established:
  - "Play again callback set after game-over message in onGameOver handler"
  - "resetToLobby returns list of removed player IDs for cleanup"
  - "Client navigates to /room/:code on return-to-lobby message"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Quick Task 013: Play Again Returns to Lobby After Game

**Players can rematch without recreating rooms: Play Again button returns willing players to lobby with same room code**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T14:15:56Z
- **Completed:** 2026-02-15T14:19:28Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Players see "Play Again" and "Leave" buttons when game ends (finished phase)
- 30-second collection window after first play-again with automatic reset when all connected players respond
- Players who don't click play-again are removed from room with automatic host transfer if needed
- Lobby state preserved with remaining players ready to start new game

## Task Commits

Each task was committed atomically:

1. **Task 1: Add play-again protocol and server logic** - `84ff81d` (feat)
2. **Task 2: Add client play-again UI and return-to-lobby handling** - `2ef6cb3` (feat)

## Files Created/Modified
- `packages/shared/src/schemas/messages.ts` - playAgainSchema and returnToLobbySchema
- `packages/shared/src/types/messages.ts` - PlayAgainMessage and ReturnToLobbyMessage types
- `packages/server/src/rooms/Room.ts` - markPlayAgain and resetToLobby methods, playAgainPlayers set, 30s timeout
- `packages/server/src/websocket/handlers.ts` - play-again message handler, onReturnToLobby callback
- `packages/client/src/composables/useGameSocket.ts` - return-to-lobby message handler resets game state
- `packages/client/src/components/Game.vue` - Play Again and Leave buttons, return-to-lobby navigation
- `packages/client/src/components/Lobby.vue` - Reset countdown on mount for return-to-lobby

## Decisions Made

**Play-again timeout pattern:**
- 30 seconds after first player clicks Play Again gives stragglers time to decide
- Immediate reset if all connected players respond (no unnecessary waiting)
- Disconnected players implicitly excluded (don't block reset)

**Host transfer logic:**
- If host doesn't play again, first play-again player becomes new host
- Prevents room destruction when host wants to leave but others want to continue
- Maintains lobby integrity with automatic leadership handoff

**Client state management:**
- return-to-lobby resets all game state refs (gameView, shitheadNickname, timers, etc.)
- Game.vue listens for return-to-lobby and navigates to /room/:code
- Lobby.vue resets countdown on mount to handle clean return from game

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Play again flow complete and ready for production
- Enables quick rematches without needing to share new room codes
- Host transfer ensures room survives when original host wants to leave
- Works with existing disconnect/reconnect infrastructure from Phase 9

## Self-Check: PASSED

All files created and commits verified.

---
*Phase: quick-013*
*Completed: 2026-02-15*
