---
phase: 07-endgame-win-conditions
plan: 05
subsystem: type-system
tags: [typescript, gap-closure, type-safety, testing]
requires: [07-04]
provides:
  - Zero TypeScript compilation errors across server package
  - Type-safe OperationResult with conditional data requirement
  - Makefile automation to prevent stale shared package artifacts
affects: [all-future-phases]
tech-stack:
  added: []
  patterns:
    - Conditional types for discriminated union return values
    - Type guard patterns in test assertions
    - Build-before-check in Makefile for composite projects
key-files:
  created: []
  modified:
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/rooms/Room.ts
    - packages/server/src/__tests__/game-engine.test.ts
    - packages/server/src/__tests__/rooms.test.ts
    - Makefile
key-decisions:
  - decision: Use conditional type pattern for OperationResult (void vs T)
    rationale: Eliminates 57 TS18048 errors by requiring data on success branch for non-void results
    impact: Type safety enforced at compile time, prevents runtime undefined access
  - decision: Add shared package build to type-check Makefile targets
    rationale: TypeScript composite projects require .d.ts artifacts for cross-package type checking
    impact: Prevents future stale dist issues that caused 82 errors in Phase 7 UAT
  - decision: Type guard helper (cardRank) for Card union in tests
    rationale: Safer than type assertions, fails fast on unexpected joker cards
    impact: Type-safe rank access while maintaining test readability
duration: 226s
completed: 2026-02-08
---

# Phase 07 Plan 05: TypeScript Type Error Elimination Summary

**One-liner:** Fixed all 65 TypeScript errors via OperationResult conditional typing, test type guards, and Makefile shared build automation

## Performance

- **Duration:** 3 minutes 46 seconds
- **Tasks completed:** 2/2
- **Commits:** 2 atomic commits
- **Test impact:** Zero test failures (all 279 tests pass)
- **Type safety:** 147 errors → 0 errors (100% elimination)

## Accomplishments

### Task 1: Fix OperationResult type definitions and error code alignment

- Added `ErrorCode` import to GameEngine.ts from `@shit-head/shared`
- Replaced OperationResult type with conditional pattern: `T extends void ? { success: true } | { error } : { success: true; data: T } | { error }`
- Applied same pattern to Room.ts for structural consistency
- **Impact:** Eliminated 60 of 65 type errors (TS18048, TS2339, TS2322, TS2719)
- Verification: `make type-check-server` reduced to 5 errors, all 279 tests pass

### Task 2: Fix test type narrowing and add Makefile build step

- Added `cardRank` helper function to game-engine.test.ts for safe rank extraction from Card union
- Wrapped `result1.data` access in type guard (line 574) to prevent undefined access
- Replaced three `.rank` property accesses with `cardRank()` calls (lines 1059, 1175, 1656)
- Added missing `onPlayPhaseStart` callback to rooms.test.ts setSwapCallbacks
- Updated Makefile `type-check` and `type-check-server` targets to build shared package first
- **Impact:** Eliminated final 5 type errors, prevents future stale dist artifacts
- Verification: `make type-check-server` passes with zero errors, all 279 tests pass

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c98cc72 | fix(07-05): align OperationResult types with ErrorCode and conditional data |
| 2 | a99aae1 | fix(07-05): fix test type narrowing and add Makefile shared build step |

## Files Created

None (gap closure plan - fixes only)

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| packages/server/src/game/GameEngine.ts | +3/-3 | Add ErrorCode import, conditional OperationResult type |
| packages/server/src/rooms/Room.ts | +3/-3 | Conditional OperationResult type pattern |
| packages/server/src/__tests__/game-engine.test.ts | +20/-15 | Add cardRank helper, type guards, remove non-null assertions |
| packages/server/src/__tests__/rooms.test.ts | +1/-0 | Add missing onPlayPhaseStart callback |
| Makefile | +2/-0 | Build shared before type-check-server and type-check |

## Decisions Made

### 1. Conditional OperationResult Type Pattern

**Context:** OperationResult<T> had optional data property, causing 57 "possibly undefined" errors

**Decision:** Use conditional type: `T extends void ? { success: true } : { success: true; data: T }`

**Rationale:**
- Methods returning OperationResult (void) don't need data property
- Methods returning OperationResult<T> REQUIRE data on success branch
- TypeScript enforces this at compile time, eliminating runtime undefined access

**Alternatives considered:**
- Non-null assertions everywhere (unsafe, defeats type checking)
- Always require data (breaks void returns)

**Impact:** 57 TS18048 errors eliminated, type safety enforced

### 2. Build Shared Package in Makefile

**Context:** TypeScript composite projects (composite: true) require built .d.ts artifacts for cross-package type checking

**Decision:** Add `bunx tsc --build packages/shared/tsconfig.json` before type-check-server and type-check targets

**Rationale:**
- Phase 7 UAT revealed 82 errors from stale dist folder (built Feb 7 17:31, source updated Feb 7 20:47)
- TypeScript uses dist/*.d.ts for type information across project boundaries
- Automate build step to prevent future staleness

**Alternatives considered:**
- Manual reminder to developers (error-prone)
- Pre-commit hook (adds latency to every commit)
- CI-only check (fails late)

**Impact:** Future-proof against stale artifacts, zero developer friction

### 3. Type Guard Helper for Card Union

**Context:** Card type is discriminated union (standard | joker), jokers have no .rank property

**Decision:** Add `cardRank(card: Card)` helper that throws on joker, returns rank otherwise

**Rationale:**
- Tests only use standard cards (jokers would be test bugs)
- Fail-fast error message better than type assertion silence
- More readable than inline type narrowing

**Alternatives considered:**
- Type assertion `(card as { rank: string }).rank` (loses safety)
- Inline type guards `if (card.kind === 'standard')` (verbose, repeated)

**Impact:** 3 TS2339 errors eliminated, safer test assertions

## Deviations from Plan

None - plan executed exactly as written. All type errors eliminated via:
1. OperationResult conditional type pattern
2. Test type narrowing (helper + guards)
3. Makefile shared build automation

## Issues Encountered

None. All verifications passed:
- `make type-check-server` exits with code 0 (zero errors)
- `make type-check` passes for shared and server packages
- `make test-server` passes all 279 tests
- No runtime behavior changes (type-level fixes only)

## Next Phase Readiness

**Phase 8 ready:** Zero type errors, all tests passing, type-safe codebase

**Blockers:** None

**Recommendations:**
- All future phases can proceed with confidence in type safety
- Makefile automation prevents recurrence of stale artifact issues
- Type guard patterns established for Card union access in tests

**Technical debt resolved:**
- 147 TypeScript errors eliminated (82 from stale artifacts, 65 from type misalignment)
- OperationResult pattern now consistent across GameEngine, Room, and RoomManager
- Composite project build dependencies automated in Makefile

## Self-Check: PASSED

Files created: None (gap closure plan)
Commits verified:
- c98cc72: fix(07-05): align OperationResult types with ErrorCode and conditional data
- a99aae1: fix(07-05): fix test type narrowing and add Makefile shared build step

All modified files exist:
- packages/server/src/game/GameEngine.ts
- packages/server/src/rooms/Room.ts
- packages/server/src/__tests__/game-engine.test.ts
- packages/server/src/__tests__/rooms.test.ts
- Makefile

Type-check verification: `make type-check-server` exits with zero errors
Test verification: All 279 tests pass
