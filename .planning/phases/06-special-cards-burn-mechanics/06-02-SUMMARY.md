---
phase: 06-special-cards-burn-mechanics
plan: 02
subsystem: game-engine
tags: [special-cards, burn-mechanics, game-rules, tdd, vitest]

# Dependency graph
requires:
  - phase: 06-01
    provides: "CardRules.ts with canPlayOnPile and detectBurn functions"
  - phase: 05-03
    provides: "GameEngine.playCards() with basic card validation and turn management"
provides:
  - "GameEngine.playCards() integrated with special card validation (2, 7, 8, 10)"
  - "Burn detection and pile clearing (10-burn and four-of-a-kind)"
  - "Turn management after burns (same player goes again)"
  - "Comprehensive test coverage for special cards and burns in gameplay"
affects: [07-face-up-face-down, 08-winning-conditions, gameplay]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Burn detection after cards added to pile before turn advancement"
    - "Conditional turn advancement based on burn detection"
    - "TDD cycle with RED-GREEN-REFACTOR for game mechanics"

key-files:
  created: []
  modified:
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/__tests__/game-engine.test.ts

key-decisions:
  - "Use canPlayOnPile instead of canPlayOn for card validation to support special card rules"
  - "Detect burns after ALL cards are added to pile (handles multi-card plays correctly)"
  - "Same player goes again on burn by keeping currentPlayerIndex unchanged"

patterns-established:
  - "Burn detection: check pile after cards added, clear if burn detected, adjust turn accordingly"
  - "Special card precedence: empty pile → special cards (2/8/10) → effective top → 7-constraint → normal ordering"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 06 Plan 02: Special Cards & Burn Mechanics Integration Summary

**GameEngine.playCards() now validates using canPlayOnPile (special cards 2/8/10 always playable), detects burns after card placement (10 or four-of-a-kind), clears pile and gives same player another turn on burn**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T10:21:42Z
- **Completed:** 2026-02-08T10:25:39Z
- **Tasks:** 1 (TDD task with 3 commits)
- **Files modified:** 2

## Accomplishments
- Replaced simple canPlayOn with canPlayOnPile for full special card validation
- 10-burn and four-of-a-kind both trigger pile clear and same-player turn continuation
- 8s treated as invisible for four-of-a-kind detection (except when counting 8s themselves)
- 20+ new test cases covering special card plays and burn scenarios
- All existing tests still pass (no regressions)

## Task Commits

Each TDD phase was committed atomically:

1. **Task 1 (RED): Add failing tests for special cards and burns** - `e94765b` (test)
   - 20+ test cases for special card plays (2, 7, 8, 10)
   - Burn scenarios (10-burn, four-of-a-kind, with 8s invisible)
   - Turn management after burns
2. **Task 1 (GREEN): Implement special card and burn integration** - `0843b3d` (feat)
   - Updated playCards to use canPlayOnPile
   - Added burn detection after cards added to pile
   - Conditional turn advancement (burn vs no burn)
3. **Task 1 (REFACTOR): Update docstring for burn mechanics** - `0e331ce` (refactor)
   - Enhanced JSDoc to document burn behavior
   - Clarified turn advancement logic

**No separate plan metadata commit** (autonomous mode, planning docs tracked separately)

## Files Created/Modified
- `packages/server/src/game/GameEngine.ts` - Updated playCards() with canPlayOnPile validation and burn detection
- `packages/server/src/__tests__/game-engine.test.ts` - Added 20+ tests for special cards and burns, fixed legacy test

## Decisions Made

**Integration approach:**
- Use canPlayOnPile for validation (replaces canPlayOn) to automatically handle all special card rules from 06-01
- Detect burns AFTER cards are added to pile (handles multi-card plays correctly - all cards added before checking four-of-a-kind)
- Keep currentPlayerIndex unchanged on burn (same player goes again), advance normally otherwise

**Test organization:**
- Added nested describe blocks: "special card plays", "burn scenarios", "turn management after burn", "multi-card plays with burn"
- Helper function `c(rank, suit?)` for concise card creation in tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated legacy test 'rejects play of lower value card'**
- **Found during:** Task 1 GREEN phase (running tests after implementation)
- **Issue:** Test expected playing 5 on pile with only 8s to fail. With Phase 6 rules, 8s are invisible, so pile with only 8s has effective top of null, meaning any card can be played. Test was written for Phase 5 simple rules.
- **Fix:** Changed test to use pile with 9 on top instead of 8, so playing 5 correctly fails (5 < 9)
- **Files modified:** packages/server/src/__tests__/game-engine.test.ts
- **Verification:** All 94 game-engine tests pass
- **Committed in:** 0843b3d (GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (1 bug - legacy test update)
**Impact on plan:** Test update necessary to align with Phase 6 special card mechanics. No scope creep.

## Issues Encountered
None - implementation proceeded smoothly following TDD cycle.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Special card validation and burn mechanics fully integrated into GameEngine
- Ready for Phase 7 (face-up and face-down card progression)
- Burn mechanics work correctly with multi-card plays (tested with two Kings on pile with two Kings)
- Turn management correctly handles same-player continuation after burns

**Important for Phase 7:**
- After burn, player must play on empty pile (any card valid)
- Player cannot win on a 10 (they get another turn even if hand/face-up/face-down would be empty)
- Burn detection works with 8s invisible for non-8 ranks

---
*Phase: 06-special-cards-burn-mechanics*
*Completed: 2026-02-08*


## Self-Check: PASSED

All files and commits verified to exist.
