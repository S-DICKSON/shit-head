---
phase: quick-014
plan: 01
subsystem: game-logic
tags: [typescript, game-engine, elimination, turn-advancement]

# Dependency graph
requires:
  - phase: 05-gameplay-basic
    provides: playCards method with basic turn advancement
  - phase: 07-endgame
    provides: nextActivePlayerIndex and elimination logic
provides:
  - Fixed playCards to skip eliminated players when advancing turn
  - Game-over detection in playCards when elimination leaves one player
  - Comprehensive test coverage for 3+ player elimination scenarios
affects: [all gameplay features, multiplayer endgame]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Use nextActivePlayerIndex consistently across all play methods for elimination-aware turn advancement
    - Build intermediate state before turn advancement to ensure accurate active player detection

key-files:
  created: []
  modified:
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/__tests__/game-engine.test.ts

key-decisions:
  - "On burn + elimination: turn stays on burning player (for consistency), game-over is detected separately"
  - "Use intermediate state pattern (matching playFromFaceUp) for accurate nextActivePlayerIndex calculation"

patterns-established:
  - "All play methods must use nextActivePlayerIndex (not modular arithmetic) for turn advancement"
  - "All play methods must check elimination and game-over after play"

# Metrics
duration: 3.9min
completed: 2026-02-15
---

# Quick Task 014: Fix Game Stuck When Player Eliminated Summary

**Fixed playCards to use nextActivePlayerIndex and detect game-over, preventing 3+ player games from freezing when player empties their hand**

## Performance

- **Duration:** 3.9 minutes
- **Started:** 2026-02-15T14:22:00Z
- **Completed:** 2026-02-15T14:25:52Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed critical bug where playCards used simple modular arithmetic instead of nextActivePlayerIndex
- Added elimination detection and game-over logic to playCards (matching playFromFaceUp pattern)
- Comprehensive test coverage for 3+ player elimination scenarios (5 new tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix GameEngine.playCards elimination-aware turn advancement and game-over detection** - `b8b4ea2` (fix)
2. **Task 2: Add 3+ player elimination tests for playCards** - `fb0c59d` (test)

## Files Created/Modified
- `packages/server/src/game/GameEngine.ts` - Fixed playCards with nextActivePlayerIndex, elimination check, and game-over detection
- `packages/server/src/__tests__/game-engine.test.ts` - Added 5 comprehensive tests for 3+ player elimination scenarios

## Decisions Made

**Use intermediate state before turn advancement:**
Following the pattern established in playFromFaceUp, build updatedPlayers array BEFORE calling nextActivePlayerIndex so it sees the updated card counts when determining next active player.

**Burn + elimination keeps turn on burning player:**
When a player burns with their last card, currentPlayerIndex stays on that player (even though eliminated) per existing burn mechanics. Game-over is detected separately via findShithead check. This maintains consistency with playFaceDownBlind behavior and existing autoPlay tests.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Initial misunderstanding of burn + elimination behavior:**
Initially implemented burn + elimination to advance turn immediately to next active player. However, existing test in GameEngine.autoPlay.test.ts expected turn to stay on burning player (even if eliminated). Investigation revealed this is correct behavior - burn always keeps turn on same player, then game-over is detected separately. Fixed by following playFaceDownBlind pattern exactly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Bug fix complete. The playCards method now correctly handles:
- Turn advancement past eliminated players in 3+ player games
- Burn + elimination edge case (turn stays, game-over detected)
- Game-over detection when elimination leaves one player with cards
- Multiple consecutive eliminated players

All existing tests continue to pass. No blockers for continued development.

## Self-Check: PASSED

All files and commits verified successfully.

---
*Phase: quick-014*
*Completed: 2026-02-15*
