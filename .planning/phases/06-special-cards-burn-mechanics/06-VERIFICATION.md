---
phase: 06-special-cards-burn-mechanics
verified: 2026-02-08T10:29:32Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 6: Special Cards & Burn Mechanics Verification Report

**Phase Goal:** Special cards (2, 7, 8, 10) and burn detection work correctly
**Verified:** 2026-02-08T10:29:32Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Playing a 2 resets the pile and can be played on anything | ✓ VERIFIED | canPlayOnPile returns true for 2 on any pile (lines 64-67 CardRules.ts). Tests: 3 tests verify 2 on K, A, empty pile, 7 (lines 1033-1090, 1265-1290). |
| 2 | Playing a 7 forces next player to play 7 or lower | ✓ VERIFIED | canPlayOnPile enforces 7-constraint at lines 76-79 (getRankValue(played) <= getRankValue(7)). Tests verify 5 allowed on 7, 9/J/A rejected on 7 (lines 1181-1263). |
| 3 | Playing an 8 makes it invisible (next player plays on card beneath) | ✓ VERIFIED | getEffectiveTopCard skips 8s (lines 35-40). canPlayOnPile uses effective top (line 71). Tests verify 6 playable when pile is [5,8,8] (lines 1319-1345). |
| 4 | Playing a 10 burns the pile and player goes again | ✓ VERIFIED | detectBurn returns {isBurn:true, reason:'ten'} for 10 (lines 105-107). GameEngine sets nextPlayerIndex = playerIndex on burn (lines 366-369). Tests verify pile cleared and same player turn (lines 1115-1146, 1349-1380). |
| 5 | Four-of-a-kind on pile burns it (8s invisible for non-8 counting) | ✓ VERIFIED | detectBurn counts through 8s for non-8 ranks (lines 127-133), counts 8s only when top is 8 (lines 119-125). Tests verify 4 Kings, 4 2s with 8s mixed in (lines 1382-1452). |
| 6 | After burn, player can play any card on empty pile | ✓ VERIFIED | canPlayOnPile returns true for empty pile (line 61). Tests verify 3 playable after 10 burn (lines 1454-1490, 1620-1659). |
| 7 | Special cards (2, 8, 10) are always playable regardless of pile | ✓ VERIFIED | canPlayOnPile checks special cards before other rules (lines 64-68). Tests verify 2/8 on 7, 10 on A, 8 on K (lines 1063-1317). |
| 8 | Turn advances normally when no burn occurs | ✓ VERIFIED | GameEngine advances turn when !burnResult.isBurn (lines 371-372). Test verifies playing 6 on 5 advances turn (lines 1589-1618). |
| 9 | Multi-card plays check burn after all cards added | ✓ VERIFIED | GameEngine adds all cards to pile before detectBurn (lines 352, 362). Test verifies 2 Kings on pile with 2 Kings = burn (lines 1663-1694). |
| 10 | 8s count themselves for four-of-a-kind (four 8s burn) | ✓ VERIFIED | detectBurn has special case for counting 8s (lines 119-125). CardRules test verifies four 8s burn (line 108). |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/server/src/game/CardRules.ts | Pure functions: isSpecialCard, getEffectiveTopCard, canPlayOnPile, detectBurn | ✓ VERIFIED | 143 lines. Exports all 4 functions (lines 20, 34, 59, 99). Imports Card from shared, getRankValue from CardComparison. |
| packages/server/src/__tests__/card-rules.test.ts | Comprehensive tests for CardRules functions | ✓ VERIFIED | 125 lines. 59 tests pass covering all special card scenarios, 8s invisibility, burn detection. |
| packages/server/src/game/GameEngine.ts (updated) | playCards integrated with special cards and burns | ✓ VERIFIED | 481 lines. Imports canPlayOnPile, detectBurn (line 5). Uses canPlayOnPile for validation (line 334), detectBurn after cards added (line 362), conditional turn advancement (lines 366-373). |
| packages/server/src/__tests__/game-engine.test.ts (updated) | Tests for special card plays and burn scenarios | ✓ VERIFIED | 1697 lines total. Added 4 describe blocks (lines 1031-1696): special card plays (14 tests), burn scenarios (6 tests), turn management (4 tests), multi-card plays (1 test). All 94 tests pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| CardRules.ts | CardComparison.ts | import getRankValue | ✓ WIRED | Line 2 imports getRankValue, used at lines 78, 82 for rank comparison. |
| CardRules.ts | shared/card.ts | import Card type | ✓ WIRED | Line 1 imports Card type, used in all function signatures. |
| GameEngine.ts | CardRules.ts | import canPlayOnPile, detectBurn | ✓ WIRED | Line 5 imports both functions. canPlayOnPile used at line 334, detectBurn used at line 362. |
| card-rules.test.ts | CardRules.ts | import all 4 functions | ✓ WIRED | Line 3 imports all functions, tests verify behavior. 59 tests pass. |
| game-engine.test.ts | GameEngine.ts | test playCards with special cards | ✓ WIRED | Lines 1031-1696 test special card integration. 25 new tests verify special cards and burns in playCards. |

### Requirements Coverage

| Requirement | Status | Supporting Truths | Evidence |
|-------------|--------|-------------------|----------|
| SPEC-01: 2 resets pile and can be played on anything | ✓ SATISFIED | Truth 1, 7 | canPlayOnPile returns true for rank 2 before other checks. 4 tests verify. |
| SPEC-02: 7 follows normal ordering, next player must play <= 7 | ✓ SATISFIED | Truth 2 | 7-constraint implemented at lines 76-79. 6 tests verify constraint enforced. |
| SPEC-03: 8 is invisible (next player plays on card beneath) | ✓ SATISFIED | Truth 3, 7 | getEffectiveTopCard skips 8s. 5 tests verify 8 invisibility. |
| SPEC-04: 10 burns pile, player goes again | ✓ SATISFIED | Truth 4, 6 | detectBurn detects 10, GameEngine keeps turn. 4 tests verify. |
| BURN-01: 4-of-a-kind burns pile, player goes again | ✓ SATISFIED | Truth 5, 9 | detectBurn counts consecutive same rank (skipping 8s). 4 tests verify. |
| BURN-02: 8s invisible when counting burns for non-8 cards | ✓ SATISFIED | Truth 5, 10 | detectBurn skips 8s when counting non-8 ranks (lines 127-133). 2 tests verify. |
| BURN-03: 10 burns pile immediately | ✓ SATISFIED | Truth 4 | detectBurn checks for 10 before four-of-a-kind. 3 tests verify. |

**All 7 requirements satisfied.**

### Anti-Patterns Found

None. Clean implementation:
- All functions are pure with no side effects
- No TODO/FIXME/placeholder comments in CardRules.ts or GameEngine.ts
- No console.log-only implementations
- Proper error handling with typed OperationResult
- Comprehensive test coverage (59 CardRules tests, 25 GameEngine special card tests)

### Human Verification Required

None. All observable truths can be verified programmatically through unit tests. No visual UI, real-time behavior, or external service integration in this phase.

### Success Criteria Checklist

From ROADMAP.md Phase 6 success criteria:

- [x] **1. Playing a 2 resets the pile and can be played on anything** — canPlayOnPile returns true for 2 regardless of pile state
- [x] **2. Playing a 7 forces next player to play 7 or lower** — 7-constraint enforced at line 76-79, verified by tests
- [x] **3. Playing an 8 makes it invisible (next player plays on card beneath)** — getEffectiveTopCard skips 8s, 5 tests verify
- [x] **4. Playing a 10 burns the pile and player goes again** — detectBurn + turn management verified
- [x] **5. Four-of-a-kind on pile burns it (8s invisible for non-8 counting)** — detectBurn correctly counts through 8s
- [x] **6. After burn, player can play any card on empty pile** — canPlayOnPile returns true for empty pile, tests verify

---

## Detailed Verification

### Level 1: Existence ✓

All required artifacts exist:
- CardRules.ts: 143 lines
- card-rules.test.ts: 125 lines
- GameEngine.ts: 481 lines (existing file, modified)
- game-engine.test.ts: 1697 lines (existing file, modified)

### Level 2: Substantive ✓

**CardRules.ts (143 lines):**
- isSpecialCard: 3 lines, checks rank in ['2', '8', '10']
- getEffectiveTopCard: 8 lines, iterates backwards skipping 8s
- canPlayOnPile: 25 lines, implements full precedence logic
- detectBurn: 44 lines, detects 10-burn and four-of-a-kind with 8s invisibility
- No stub patterns found
- All functions properly exported
- JSDoc comments on all exports

**card-rules.test.ts (125 lines):**
- 59 tests organized in 4 describe blocks
- Table-driven tests using test.each for comprehensive coverage
- Helper functions c() and joker() for concise card creation
- All tests pass

**GameEngine.ts (481 lines):**
- playCards updated from Phase 5 version
- Line 334: replaced canPlayOn with canPlayOnPile
- Lines 362-373: added burn detection and conditional turn advancement
- No stub patterns found
- Preserves all existing validation logic

**game-engine.test.ts (1697 lines):**
- 25+ new tests in 4 describe blocks (lines 1031-1696)
- Tests cover all special card scenarios, burn detection, turn management
- All 94 tests pass (including existing tests — no regressions)

### Level 3: Wired ✓

**CardRules.ts → CardComparison.ts:**
```typescript
import { getRankValue } from './CardComparison';
// Used at lines 78, 82 for rank value comparison
```

**GameEngine.ts → CardRules.ts:**
```typescript
import { canPlayOnPile, detectBurn } from './CardRules';
// canPlayOnPile used at line 334
// detectBurn used at line 362
```

**Tests import and exercise functions:**
- card-rules.test.ts imports all 4 CardRules functions, 59 tests pass
- game-engine.test.ts tests GameEngine.playCards with special cards, 25 new tests pass

### Test Evidence

**CardRules tests (59/59 pass):**
```
bun test packages/server/src/__tests__/card-rules.test.ts
59 pass
0 fail
59 expect() calls
```

**GameEngine tests (94/94 pass):**
```
bun test packages/server/src/__tests__/game-engine.test.ts
94 pass
0 fail
1650 expect() calls
```

### Code Quality

**Pure functions:**
- All CardRules functions are stateless, no side effects
- Deterministic behavior enables easy testing
- Composable design allows integration without modification

**Test coverage:**
- CardRules: 59 tests covering all edge cases
- GameEngine special cards: 25 tests covering integration scenarios
- 8s invisibility: 8 tests across both files
- Burn detection: 10 tests across both files

**Type safety:**
- All function signatures properly typed
- Return types explicit (boolean, Card | null, OperationResult<GameState>)
- Pre-existing shared package import errors unrelated to Phase 6 work

---

## Conclusion

**Phase 6 goal ACHIEVED.**

All 6 success criteria verified:
1. ✓ 2 resets pile and can be played on anything
2. ✓ 7 forces next player to play <= 7
3. ✓ 8 is invisible (next player plays on card beneath)
4. ✓ 10 burns pile and player goes again
5. ✓ Four-of-a-kind burns (8s invisible for non-8 counting)
6. ✓ After burn, any card playable on empty pile

All 7 requirements satisfied (SPEC-01, SPEC-02, SPEC-03, SPEC-04, BURN-01, BURN-02, BURN-03).

All must-haves from plan frontmatter verified:
- Plan 06-01: 12 truths verified (isSpecialCard, getEffectiveTopCard, canPlayOnPile, detectBurn behaviors)
- Plan 06-02: 10 truths verified (integration into GameEngine.playCards)

**No gaps found. No human verification required. Ready to proceed to Phase 7.**

---

_Verified: 2026-02-08T10:29:32Z_
_Verifier: Claude (gsd-verifier)_
