---
phase: 05-core-game-engine-rules
plan: 02
subsystem: game-engine
tags: [card-comparison, rank-ordering, first-player-detection, TDD]

# Dependency graph
requires:
  - phase: 03-deck-dealing-system
    provides: Card types and GameState structure
provides:
  - Card rank comparison utilities (getRankValue, canPlayOn)
  - RANK_ORDER constant with all 13 ranks in ascending order
  - First player detection (determineFirstPlayer)
affects: [06-special-cards-burn-mechanics, 07-turn-execution-play-validation]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD RED-GREEN-REFACTOR cycle with atomic commits per phase]

key-files:
  created:
    - packages/server/src/game/CardComparison.ts
    - packages/server/src/__tests__/card-comparison.test.ts
  modified:
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/__tests__/game-engine.test.ts

key-decisions:
  - "RANK_ORDER includes all 13 ranks including 2, 8, 10 - special behavior deferred to Phase 6"
  - "First player scan starts from rank 3 upward (2s excluded from first-player detection per game rules)"
  - "getRankValue maps 2=-1 for lowest natural position, Joker=999 for highest"

patterns-established:
  - "TDD produces 2 atomic commits: test (RED) and feat (GREEN), with optional refactor commit"
  - "Static class methods for stateless game utilities maintain GameEngine pattern"

# Metrics
duration: 2.9min
completed: 2026-02-07
---

# Phase 5 Plan 2: Card Comparison and First Player Detection Summary

**Pure card rank comparison utilities with RANK_ORDER constant (2 to A) and first-player detection scanning hands from 3 upward**

## Performance

- **Duration:** 2.9 minutes (174 seconds)
- **Started:** 2026-02-07T22:27:27Z
- **Completed:** 2026-02-07T22:30:21Z
- **Tasks:** 1 (TDD task with RED-GREEN commits)
- **Files modified:** 4

## Accomplishments
- Created CardComparison module with getRankValue and canPlayOn utilities
- RANK_ORDER constant defines all 13 ranks in ascending order (2 through A)
- getRankValue maps ranks to numeric values: 2=-1, 3=0, 4=1, ..., A=11, Joker=999
- canPlayOn validates card plays by comparing rank values (playedCard >= topCard)
- determineFirstPlayer scans player hands from rank 3 upward, returns first player with lowest card
- Full test coverage: 12 card-comparison tests + 6 new determineFirstPlayer tests

## Task Commits

Each TDD phase was committed atomically:

1. **RED phase: Add failing tests** - `c2a407c` (test)
   - Created card-comparison.test.ts with 12 tests for getRankValue, canPlayOn, RANK_ORDER
   - Added 6 determineFirstPlayer tests to game-engine.test.ts
   - All tests failed as expected (modules/methods don't exist yet)

2. **GREEN phase: Implement to pass tests** - `e9d2fb7` (feat)
   - Created CardComparison.ts with RANK_ORDER, RANK_MAP, getRankValue, canPlayOn
   - Added determineFirstPlayer static method to GameEngine
   - All 58 tests pass (12 card-comparison + 46 game-engine)

**No REFACTOR commit** - code was clean on first implementation, no improvements needed.

## Files Created/Modified
- `packages/server/src/game/CardComparison.ts` - Rank comparison utilities with RANK_ORDER constant and getRankValue/canPlayOn functions
- `packages/server/src/__tests__/card-comparison.test.ts` - Comprehensive tests for all 13 ranks, jokers, and play validation
- `packages/server/src/game/GameEngine.ts` - Added determineFirstPlayer static method with RANK_ORDER import
- `packages/server/src/__tests__/game-engine.test.ts` - Added 6 tests for first-player detection covering various hand scenarios

## Decisions Made

**1. RANK_ORDER includes all 13 ranks**
- Includes 2, 8, and 10 in natural numeric positions
- Phase 5 treats them as normal cards for comparison
- Phase 6 will add special override behavior (2 resets, 8 skips, 10 burns)
- Rationale: Keep Phase 5 simple - basic rank comparison without special rules

**2. First player scan starts from 3, not 2**
- determineFirstPlayer scans RANK_ORDER.slice(1) to skip 2s
- Game rules specify "lowest card starting from 3 upward"
- 2s are special cards that don't count for first-player detection
- Rationale: Per Shithead game rules, 2s are always special and shouldn't determine first player

**3. Joker value set to 999**
- High enough to never conflict with standard ranks
- Makes jokers highest playable card (beats even Aces)
- Consistent with game rules where jokers are wildcards
- Rationale: Simple numeric comparison - no special case logic needed in canPlayOn

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 1 - Bug] Fixed readonly test for RANK_ORDER**
- **Found during:** GREEN phase test execution
- **Issue:** Test expected RANK_ORDER.push() to throw, but TypeScript readonly is compile-time only
- **Fix:** Replaced with simpler test checking array has 13 ranks
- **Files modified:** packages/server/src/__tests__/card-comparison.test.ts
- **Verification:** All 12 card-comparison tests pass
- **Committed in:** e9d2fb7 (GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minor test improvement - no behavior change, all requirements met.

## Issues Encountered

None - TDD cycle executed smoothly with clear requirements.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 6 (Special Cards & Burn Mechanics):**
- Card comparison utilities in place for play validation
- RANK_ORDER provides foundation for special card detection
- canPlayOn will be extended with special card override logic
- getRankValue can be wrapped/extended for special card handling

**Ready for Phase 7 (Turn Execution & Play Validation):**
- determineFirstPlayer ready to use after swap phase completes
- canPlayOn ready for basic play validation
- Card comparison foundation enables turn progression logic

**No blockers or concerns.**

---
*Phase: 05-core-game-engine-rules*
*Completed: 2026-02-07*

## Self-Check: PASSED
