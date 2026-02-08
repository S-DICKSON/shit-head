---
phase: 07-endgame-win-conditions
plan: 02
subsystem: game-engine
tags: [tdd, vitest, game-logic, endgame, elimination, turn-rotation]

# Dependency graph
requires:
  - phase: 06-special-cards-burn-mechanics
    provides: canPlayOnPile and detectBurn for card validation
  - phase: 05-core-game-engine-rules
    provides: GameEngine static method pattern and playCards implementation
provides:
  - Endgame utility methods: determinePlaySource, checkPlayerElimination, nextActivePlayerIndex, findShithead
  - Face-up card play with elimination and game-end detection
  - PlaySource type for card progression routing
affects: [07-03-face-down-blind-play, 08-round-completion-state, game-handlers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Play source determination via server-authoritative routing (hand → face-up → face-down)
    - Eliminated players remain in array with zero cards (no removal)
    - Turn rotation with skip logic and bounded loop (prevents infinite loops)
    - Game end detection via "last player with cards" (loser, not winner)

key-files:
  created: []
  modified:
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/__tests__/game-engine.test.ts

key-decisions:
  - "Eliminated players stay in array with zero cards (maintains indices)"
  - "determinePlaySource returns null for eliminated players"
  - "nextActivePlayerIndex has loop limit equal to playerCount (prevents infinite loops)"
  - "findShithead returns playerId of last player WITH cards (loser)"
  - "playFromFaceUp does NOT auto-draw (draw pile empty by definition)"

patterns-established:
  - "Static utility methods for endgame state inspection (stateless, composable)"
  - "Elimination checking uses total card count across all three arrays"
  - "Turn advancement via nextActivePlayerIndex replaces simple modular arithmetic in endgame"
  - "Game end detection happens after elimination, sets phase to 'finished'"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Phase 7 Plan 2: Endgame Utilities & Face-Up Play Summary

**Five endgame utilities (determinePlaySource, checkPlayerElimination, nextActivePlayerIndex, findShithead, playFromFaceUp) with elimination detection and game-end logic**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-08T21:44:33Z
- **Completed:** 2026-02-08T21:47:53Z
- **Tasks:** 1 (TDD: RED → GREEN, no REFACTOR needed)
- **Files modified:** 2

## Accomplishments
- Server-authoritative play source routing prevents client cheating
- Eliminated players tracked via zero total cards, maintaining array stability
- Turn rotation safely skips eliminated players with bounded loop
- Game end detection identifies last player with cards (shithead/loser)
- Face-up card play validates source, handles multi-card plays, checks elimination

## Task Commits

TDD task with 2 commits (RED → GREEN):

1. **Feature: Endgame utilities and playFromFaceUp** - `8d7b561` (test - RED phase)
2. **Feature: Endgame utilities and playFromFaceUp** - `9fdc432` (feat - GREEN phase)

All 32 new tests passing (126 total).

## Files Created/Modified
- `packages/server/src/game/GameEngine.ts` - Added 5 static methods: determinePlaySource (routes to correct card source), checkPlayerElimination (detects zero-card players), nextActivePlayerIndex (skips eliminated with loop limit), findShithead (finds last player with cards), playFromFaceUp (face-up play with elimination/game-end)
- `packages/server/src/__tests__/game-engine.test.ts` - Added 32 test cases across 5 describe blocks (6 for determinePlaySource, 4 for checkPlayerElimination, 5 for nextActivePlayerIndex, 4 for findShithead, 13 for playFromFaceUp). Imported PlayerGameState type.

## Decisions Made
- **Eliminated players stay in array:** Keeps indices stable, simplifies state updates. Alternative (remove from array) would break turn indices and require re-indexing.
- **Play source determined server-side:** Client cannot choose source, server determines via determinePlaySource(). Prevents cheating (e.g., skipping hand to play face-up).
- **Loop limit in nextActivePlayerIndex:** Bounded to playerCount attempts to prevent infinite loop if all players somehow eliminated simultaneously.
- **findShithead returns last with cards:** Shithead game defines loser as last player holding cards, not first to empty (other players already eliminated are not the loser).
- **No auto-draw in playFromFaceUp:** Draw pile is empty by definition when playing face-up (endgame progression). Hand remains empty after face-up play.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TDD cycle proceeded smoothly. All tests passed on first implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 7 Plan 3 (face-down blind play):
- determinePlaySource routes to 'face-down' when appropriate
- checkPlayerElimination and nextActivePlayerIndex ready for blind play scenarios
- findShithead ready to detect game end after blind plays
- Pattern established for multi-source play validation (playFromFaceUp → playFaceDownBlind)

No blockers. Endgame foundation complete.

---
*Phase: 07-endgame-win-conditions*
*Completed: 2026-02-08*

## Self-Check: PASSED

All files and commits verified:
- packages/server/src/game/GameEngine.ts: FOUND
- packages/server/src/__tests__/game-engine.test.ts: FOUND
- Commit 8d7b561: FOUND
- Commit 9fdc432: FOUND
