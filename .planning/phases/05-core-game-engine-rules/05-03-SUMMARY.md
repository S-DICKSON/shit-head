---
phase: 05-core-game-engine-rules
plan: 03
subsystem: game-engine
tags: [game-logic, validation, turn-system, card-play]

# Dependency graph
requires:
  - phase: 05-02
    provides: CardComparison module with getRankValue and canPlayOn for card validation
provides:
  - GameEngine.playCards() - validates and executes card plays with auto-draw and turn advancement
  - GameEngine.pickupPile() - handles pile pickup when player cannot or chooses not to play
  - Complete turn-based gameplay validation (phase, player turn, card indices, rank consistency, playability)
affects: [05-04, 06-special-cards-burn-mechanics, game-phase-controller, websocket-handlers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Turn-based validation pattern (phase check → player check → turn check → action-specific validation)"
    - "Auto-draw maintenance: always draw back to 3 cards after playing (until draw pile empty)"
    - "Immutable state updates with spread operators and filter/map for collections"

key-files:
  created: []
  modified:
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/__tests__/game-engine.test.ts

key-decisions:
  - "playCards validates all cards have same rank for multi-card plays (no mixed-rank plays allowed)"
  - "Auto-draw happens atomically after play within same state mutation (not separate operation)"
  - "Turn advances via modular arithmetic for wrap-around (last player → first player)"
  - "Card removal uses descending-sorted indices to avoid index shifting during splice"
  - "Empty discard pile accepts any card (no validation required)"

patterns-established:
  - "OperationResult<GameState> return type for all gameplay mutations"
  - "Validation order: phase → player existence → turn ownership → action-specific checks"
  - "Turn advancement: (currentPlayerIndex + 1) % players.length for all gameplay actions"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 5 Plan 3: Core Gameplay Actions Summary

**GameEngine.playCards() and GameEngine.pickupPile() with full turn-based validation, auto-draw, and immutable state updates**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T22:47:22Z
- **Completed:** 2026-02-07T22:50:42Z
- **Tasks:** 1 (TDD: 2 commits)
- **Files modified:** 2

## Accomplishments
- playCards validates phase, turn, indices, same-rank constraint, and card playability
- Auto-draw maintains hand size of 3 cards after each play (draws from pile until hand=3 or pile empty)
- pickupPile transfers entire discard pile to player hand and advances turn
- 29 comprehensive test cases covering validation, multi-card plays, auto-draw edge cases, turn advancement

## Task Commits

Each TDD phase was committed atomically:

1. **RED phase: Add failing tests** - `bea4ab9` (test)
   - 21 test cases for playCards
   - 8 test cases for pickupPile
   - Helper function createTestState() for consistent test setup

2. **GREEN phase: Implement methods** - `ecc25bd` (feat)
   - playCards with full validation and auto-draw
   - pickupPile with validation and turn advancement
   - All 73 tests passing (44 existing + 29 new)

_Note: No REFACTOR phase needed - validation duplication minimal and clear as-is_

## Files Created/Modified
- `packages/server/src/game/GameEngine.ts` - Added playCards (90 lines) and pickupPile (60 lines) static methods with full validation
- `packages/server/src/__tests__/game-engine.test.ts` - Added 29 test cases with helper function for gameplay state setup

## Decisions Made

**Card validation approach:**
- Multi-card plays require all cards to have identical rank (validated via kind check and rank comparison)
- Empty discard pile accepts any card (skip canPlayOn validation when pile is empty)
- Card indices validated for bounds, duplicates, and non-empty array before attempting card access

**Auto-draw behavior:**
- Always triggered after successful play if hand < 3 cards
- Draws from top of draw pile (array shift) until hand reaches 3 or pile empties
- Part of same state mutation (not separate operation) for atomic update

**Turn advancement:**
- Both playCards and pickupPile advance turn to next player after success
- Uses modular arithmetic for wrap-around: (currentPlayerIndex + 1) % players.length
- Consistent with existing GameEngine pattern from createGame()

**Card removal technique:**
- Sort indices descending before removal to avoid index shifting during splice
- Alternative filter approach considered but splice chosen for clarity with multiple cards

## Deviations from Plan

None - plan executed exactly as written.

All validation cases from spec implemented. Auto-draw logic matches specification. Tests cover all edge cases specified in behavior section.

## Issues Encountered

**Test expectation correction:**
During GREEN phase, initial test run revealed 2 failing tests expecting hand size to decrease after play. Tests were corrected to expect hand size of 3 (accounting for auto-draw). This was not a code issue but test expectation misalignment - auto-draw is correct behavior per spec.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phase:**
- Core gameplay actions (play and pickup) fully implemented and tested
- Turn-based validation pattern established for future special card handlers
- Auto-draw maintains hand size correctly for standard gameplay flow

**Blockers/concerns:**
None. Phase 6 (special cards) can now extend playCards logic with burn mechanics and special card effects.

**Integration notes for Phase 6:**
- canPlayOn will need enhancement for special cards (2, 8, 10)
- playCards may need extension for burn detection (4-of-a-kind check)
- Current validation foundation supports special card override patterns

---
*Phase: 05-core-game-engine-rules*
*Completed: 2026-02-07*

## Self-Check: PASSED

All files and commits verified:
- packages/server/src/game/GameEngine.ts: EXISTS
- packages/server/src/__tests__/game-engine.test.ts: EXISTS
- Commit bea4ab9: EXISTS
- Commit ecc25bd: EXISTS
