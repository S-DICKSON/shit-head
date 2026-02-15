---
phase: quick-009
plan: 01
subsystem: game-logic
tags: [card-sorting, game-engine, hand-display, ux]

# Dependency graph
requires:
  - phase: 01-05
    provides: GameEngine with card manipulation methods
provides:
  - sortHand function with custom display order (normal ascending, then specials)
  - Automatic hand sorting at all mutation points
affects: [client-hand-display, player-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hand sorting at mutation time (not view time) for consistent state"
    - "Sort order separate from gameplay comparison order"

key-files:
  created: []
  modified:
    - packages/server/src/game/CardComparison.ts
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/__tests__/card-comparison.test.ts
    - packages/server/src/__tests__/game-engine.test.ts

key-decisions:
  - "Sort at mutation time (createGame, swapCards, playCards, pickupPile, playFaceDownBlind) not at view time"
  - "HAND_SORT_ORDER separate from RANK_ORDER (gameplay vs display logic)"
  - "7 grouped with special cards (2,7,8,10) despite not being isSpecialCard per game rules"

patterns-established:
  - "sortHand returns new array (immutable) consistent with GameEngine patterns"
  - "Secondary sort by suit (hearts < diamonds < clubs < spades) for deterministic ordering"

# Metrics
duration: 5min
completed: 2026-02-15
---

# Quick Task 009: Auto-Sort Hand Cards Summary

**Hand cards automatically sorted with normal cards ascending (3→A), jokers, then special cards (2,7,8,10) at all mutation points**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-15T13:42:19Z
- **Completed:** 2026-02-15T13:47:31Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created sortHand function with custom display order separate from gameplay ranking
- Integrated sorting at 5 hand-mutation points (createGame, swapCards, playCards, pickupPile, playFaceDownBlind)
- All 319 existing tests pass with updated position-agnostic assertions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sortHand function in CardComparison.ts** - `ffed7e2` (feat)
2. **Task 2: Integrate sortHand into all hand-mutation points in GameEngine** - `2330749` (feat)

## Files Created/Modified
- `packages/server/src/game/CardComparison.ts` - Added sortHand function with HAND_SORT_ORDER map (normal: 3-A=0-8, joker=9, specials: 2,7,8,10=10-13)
- `packages/server/src/game/GameEngine.ts` - Imported sortHand, applied at 5 mutation points
- `packages/server/src/__tests__/card-comparison.test.ts` - Added 9 tests covering sort order, empty hands, edge cases
- `packages/server/src/__tests__/game-engine.test.ts` - Fixed 4 tests to check card presence (not positions) after sorting

## Decisions Made

**Sort order rationale:**
- Normal cards (3,4,5,6,9,J,Q,K,A) ascending for intuitive hand reading
- Jokers between normal and special (transition point in hierarchy)
- Special cards grouped (2,7,8,10) for easy identification of "magic" cards
- 7 grouped with specials despite not matching isSpecialCard (user preference for grouping by special play rules)

**Integration approach:**
- Sort at mutation time (not view time) keeps state consistent and reduces client-side complexity
- Immutable pattern (returns new array) matches GameEngine conventions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test assumptions about card positions after sorting**
- **Found during:** Task 2 (Running test suite after GameEngine integration)
- **Issue:** 4 tests in game-engine.test.ts asserted specific card positions after swapCards/pickupPile, but sorting changes positions
- **Fix:** Updated tests to check card presence (`hand.some(c => cardEquals(...))`) instead of positional assertions
- **Files modified:** packages/server/src/__tests__/game-engine.test.ts
- **Verification:** All 319 tests pass including updated assertions
- **Committed in:** 2330749 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Test fixes necessary for correctness - assertions were invalidated by sorting behavior. No scope creep.

## Issues Encountered
None - straightforward implementation, test failures were expected and resolved by updating assertions.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Hand sorting complete and stable
- Client will receive pre-sorted hands from server (no client-side sorting needed)
- Ready for UI implementation to display sorted hands

## Self-Check: PASSED

All expected files and commits verified:
- `packages/server/src/game/CardComparison.ts` modified ✓
- `packages/server/src/game/GameEngine.ts` modified ✓
- `packages/server/src/__tests__/card-comparison.test.ts` modified ✓
- `packages/server/src/__tests__/game-engine.test.ts` modified ✓
- Commit `ffed7e2` exists ✓
- Commit `2330749` exists ✓

---
*Quick Task: 009*
*Completed: 2026-02-15*
