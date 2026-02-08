---
phase: 06-special-cards-burn-mechanics
plan: 01
subsystem: game-rules
tags: [card-validation, burn-mechanics, game-logic, TDD, vitest]

# Dependency graph
requires:
  - phase: 05-core-game-engine-rules
    provides: getRankValue function for rank comparison, basic gameplay foundation
provides:
  - isSpecialCard function - identifies ranks 2, 8, 10
  - getEffectiveTopCard function - looks through 8s to find effective pile top
  - canPlayOnPile function - full special card validation with 7-constraint
  - detectBurn function - detects 10-burn and four-of-a-kind with 8s invisibility
affects: [06-02-special-card-integration, game-engine, gameplay-validation]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-functions-for-game-rules, 8s-invisibility-pattern, table-driven-tests]

key-files:
  created:
    - packages/server/src/game/CardRules.ts
    - packages/server/src/__tests__/card-rules.test.ts
  modified: []

key-decisions:
  - "isSpecialCard returns true only for 2, 8, 10 (7 is NOT a special card, it follows normal ordering)"
  - "getEffectiveTopCard returns null for empty pile or all-8s pile (any card playable)"
  - "canPlayOnPile implements precedence: empty pile → special cards → effective top null → 7-constraint → normal ordering"
  - "detectBurn treats 8s as invisible when counting four-of-a-kind for non-8 ranks, but 8s count themselves (four 8s burn)"

patterns-established:
  - "Pure stateless functions for game rules - no side effects, composable"
  - "8s invisibility pattern - 8s are transparent for pile validation and four-of-a-kind counting (except when counting 8s themselves)"
  - "Table-driven tests with test.each() for comprehensive scenario coverage"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 06 Plan 01: Special Card Validation and Burn Detection Summary

**Pure stateless functions for special cards (2 resets, 8 invisible, 10 burns), 7-constraint validation, and burn detection with 8s invisibility using TDD**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T10:15:20Z
- **Completed:** 2026-02-08T10:17:16Z
- **Tasks:** 1 (TDD task with RED-GREEN cycle)
- **Files modified:** 2 (created)

## Accomplishments
- Implemented four pure functions for special card rules validation
- 8s invisibility correctly handled in both pile validation and burn detection
- 7-constraint enforces cards <= 7 when 7 is effective top card
- Four-of-a-kind burn detection treats 8s as invisible (except when counting 8s)
- 59 comprehensive table-driven tests covering all edge cases

## Task Commits

Each TDD phase was committed atomically:

1. **RED: Add failing tests** - `d0767d8` (test)
2. **GREEN: Implement CardRules** - `421c418` (feat)

_No REFACTOR commit needed - implementation was clean and required no improvements_

## Files Created/Modified
- `packages/server/src/game/CardRules.ts` - Pure functions for special card validation: isSpecialCard, getEffectiveTopCard, canPlayOnPile, detectBurn
- `packages/server/src/__tests__/card-rules.test.ts` - 59 table-driven tests covering all special card scenarios and edge cases

## Decisions Made

**isSpecialCard scope:**
- Returns true only for ranks 2, 8, 10
- Rationale: 7 is NOT a special card (it follows normal ordering when played), it only creates a constraint for the next player

**getEffectiveTopCard null handling:**
- Returns null for empty pile or all-8s pile
- Rationale: Both scenarios mean "any card can be played" - consistent API

**canPlayOnPile precedence order:**
- Empty pile → special cards (2/8/10) → effective top null → 7-constraint → normal ordering
- Rationale: Early returns for simple cases, complex logic only when needed

**8s invisibility in detectBurn:**
- When counting non-8 ranks: skip 8s (invisible)
- When counting 8s: only 8s count (8s count themselves)
- Rationale: Matches Shithead game rules - four 2s with 8s scattered between them is still four 2s, but four 8s is its own burn

## Deviations from Plan

None - plan executed exactly as written using TDD RED-GREEN cycle.

## Issues Encountered

None - TDD workflow proceeded smoothly. Tests failed in RED phase (module not found), passed in GREEN phase (59/59).

Note: Pre-existing TypeScript errors exist in the server package related to shared type imports and schema mismatches. These are unrelated to this plan and documented in project state.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 06-02:** CardRules functions are complete and tested. Next plan can integrate these into GameEngine.playCards() to enforce special card rules and trigger burns during gameplay.

**Integration points:**
- Replace CardComparison.canPlayOn with CardRules.canPlayOnPile in playCards validation
- Add detectBurn check after each play to trigger pile burn
- Add burn handling to clear pile and award turn continuation

**No blockers.**

---
*Phase: 06-special-cards-burn-mechanics*
*Completed: 2026-02-08*

## Self-Check: PASSED

All files and commits verified:
- ✓ packages/server/src/game/CardRules.ts
- ✓ packages/server/src/__tests__/card-rules.test.ts
- ✓ d0767d8 (test commit)
- ✓ 421c418 (feat commit)
