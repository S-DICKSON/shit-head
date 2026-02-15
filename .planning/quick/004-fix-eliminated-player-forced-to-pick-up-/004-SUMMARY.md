---
type: quick
number: 004
subsystem: game-logic
tags: [bugfix, game-engine, turn-advancement, eliminated-players]
requires: [phase-07]
provides:
  - Correct turn advancement after pile pickup that skips eliminated players
affects: []
tech-stack:
  added: []
  patterns:
    - Consistent use of nextActivePlayerIndex for all turn advancement
key-files:
  created: []
  modified:
    - packages/server/src/game/GameEngine.ts
decisions: []
duration: 54s
completed: 2026-02-15
---

# Quick Task 004: Fix Eliminated Player Forced to Pick Up Summary

**One-liner:** pickupPile now uses nextActivePlayerIndex to skip eliminated players during turn advancement

## What Was Delivered

Fixed a bug where eliminated players (with zero cards) were being assigned the next turn after a pile pickup in 3+ player games. The fix ensures that `pickupPile` uses the same `nextActivePlayerIndex` method as all other turn advancement code paths, properly skipping eliminated players.

**Single line change:**
- Line 470: Replaced `(state.currentPlayerIndex + 1) % state.players.length` with `this.nextActivePlayerIndex(state, state.currentPlayerIndex)`

## Task Commits

| Task | Commit | Files Modified | Summary |
|------|--------|----------------|---------|
| Fix pickupPile turn advancement | f2e662e | GameEngine.ts | Replace modular arithmetic with nextActivePlayerIndex |

## Technical Implementation

### Root Cause
The `pickupPile` method was using simple modular arithmetic for turn advancement:
```typescript
const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
```

This did NOT skip eliminated players. When a player picked up the pile, the next turn could incorrectly advance to a player with zero cards (eliminated).

### Fix Applied
Changed turn advancement to use the existing `nextActivePlayerIndex` helper:
```typescript
const nextPlayerIndex = this.nextActivePlayerIndex(state, state.currentPlayerIndex);
```

This makes `pickupPile` consistent with:
- `playFromFaceUp` (lines 730, 733)
- `playFaceDownBlind` (lines 870, 879, 921)

### Edge Cases Handled by nextActivePlayerIndex
- All players eliminated except current (returns current as fallback)
- Loop limit prevents infinite loops
- Wrap-around handling for player array

## Verification Results

**Test Results:**
- ✅ All 301 server tests pass (9 test files)
- ✅ No regressions in existing GameEngine.pickupPile tests
- ✅ Type checking passes (server, shared, client)
- ✅ Linter passes (all three packages)

**Behavioral Validation:**
When a non-eliminated player picks up the pile, turn now correctly advances to the next non-eliminated player. If Player 2 picks up the pile and Player 3 is eliminated (zero cards), turn correctly advances to Player 4 (or wraps around to Player 1), not to Player 3.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Recommendations:**
- This fix completes the turn advancement consistency across all game action paths
- All eliminated player scenarios now properly handled

## Lessons Learned

### What Worked Well
- TDD approach: Existing tests caught the issue immediately after fix was applied
- Consistent patterns: `nextActivePlayerIndex` already existed and was battle-tested in other code paths
- Single-line fix: Root cause was isolated and well-understood

### What Could Be Improved
- During Phase 7 implementation, this turn advancement conversion was missed in `pickupPile`
- Could benefit from a checklist review when introducing new turn advancement helpers to ensure all paths are updated

### Technical Insights
- Turn advancement logic should always use helper methods, never raw modular arithmetic
- Eliminated player handling is critical for endgame correctness in 3+ player scenarios
- Consistency checks across similar code paths are valuable during code review

## Self-Check: PASSED

All files modified exist:
- ✅ packages/server/src/game/GameEngine.ts

All commits exist:
- ✅ f2e662e
