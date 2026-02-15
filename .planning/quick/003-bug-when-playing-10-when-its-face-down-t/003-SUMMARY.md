---
task: quick-fix-003
type: bug-fix
subsystem: game-engine
tags: [game-rules, burn-mechanic, face-down-cards, tdd]
completed: 2026-02-15
duration: 231s

requires:
  - Phase 6: Special card rules (10 burn, four-of-a-kind burn)
  - Phase 7: Face-down blind play implementation

provides:
  - Correct burn detection for face-down card plays
  - Consistent burn behavior across all play sources (hand, face-up, face-down)

affects:
  - Future face-down play scenarios in gameplay
  - Endgame scenarios with 10s and four-of-a-kind burns

tech-stack:
  added: []
  patterns:
    - TDD methodology (RED-GREEN pattern for bug fix)
    - Consistent burn detection across play methods

key-files:
  created: []
  modified:
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/__tests__/game-engine.test.ts

decisions: []
---

# Quick Fix 003: Fix burn mechanic for face-down 10 plays

**One-liner:** Face-down 10 plays now correctly burn the pile and give same player another turn

## Context

When a player plays a 10 from their face-down cards (blind play), the burn mechanic was not being triggered. The `playFaceDownBlind` method in GameEngine.ts was missing the `detectBurn()` call that exists in both `playCards` and `playFromFaceUp` methods. This caused face-down 10s to simply be added to the discard pile without clearing it, and the turn would advance normally instead of giving the player another turn.

## What Was Built

Fixed the `playFaceDownBlind` method in GameEngine.ts to include burn detection:

1. **Added burn detection**: After adding the flipped card to the discard pile, call `detectBurn(updatedDiscardPile)` to check for 10 or four-of-a-kind
2. **Burn handling**: When burn is detected:
   - Clear the discard pile to empty array
   - Keep currentPlayerIndex the same (player goes again)
   - Still check for game end if player was eliminated by the burn
3. **Non-burn paths unchanged**: Elimination and normal turn advancement work as before when there's no burn

Added 6 comprehensive test cases:
- Blind 10 on non-empty pile → burns and same player goes again
- Blind 10 on empty pile → burns and same player goes again
- Four-of-a-kind from face-down → burns and same player goes again
- Blind 10 with elimination in 3-player game → burns, player eliminated, game continues
- Blind 10 with elimination in 2-player game → burns, player eliminated, game ends
- Non-burn playable card → regression check, turn advances normally

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add failing tests for face-down burn scenarios | a202a7b | game-engine.test.ts |
| 2 | Add burn detection to playFaceDownBlind PATH A | c689a60 | GameEngine.ts |

## Technical Decisions

**Burn priority over elimination:**
- When a burn occurs, the turn stays with the current player even if they're eliminated
- This matches the behavior in `playCards` where burns always set `nextPlayerIndex = playerIndex`
- Game end is still checked after burn if player was eliminated, but the turn index reflects "this player gets another turn"

**Consistent burn pattern:**
All three play methods now follow the same pattern:
```typescript
const burnResult = detectBurn(updatedDiscardPile);
if (burnResult.isBurn) {
  finalDiscardPile = [];
  nextPlayerIndex = playerIndex; // Same player goes again
}
```

## Testing

- **Test method**: `make test-server`
- **Tests added**: 6 new tests in playFaceDownBlind > burn detection describe block
- **All tests pass**: 307 tests total
- **Lint**: `make lint` passes with no errors
- **Type-check**: `make type-check` passes with no type errors

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Next Steps

None - bug fix complete. The burn mechanic now works consistently across all three play sources (hand, face-up, face-down).

## Self-Check: PASSED

All modified files exist:
- packages/server/src/game/GameEngine.ts ✓
- packages/server/src/__tests__/game-engine.test.ts ✓

All commits exist:
- a202a7b ✓
- c689a60 ✓
