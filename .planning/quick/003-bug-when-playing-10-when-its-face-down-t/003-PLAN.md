---
phase: quick-fix
plan: 003
type: tdd
wave: 1
depends_on: []
files_modified:
  - packages/server/src/game/GameEngine.ts
  - packages/server/src/__tests__/game-engine.test.ts
autonomous: true

must_haves:
  truths:
    - "Playing a 10 from face-down burns the pile (clears discard to empty)"
    - "After face-down 10 burn, same player goes again (currentPlayerIndex unchanged)"
    - "Four-of-a-kind burn also works from face-down plays"
    - "Non-burn face-down plays still advance turn normally (no regression)"
    - "Face-down 10 that eliminates player on burn still handles game-over correctly"
  artifacts:
    - path: "packages/server/src/game/GameEngine.ts"
      provides: "Fixed playFaceDownBlind with burn detection"
      contains: "detectBurn"
    - path: "packages/server/src/__tests__/game-engine.test.ts"
      provides: "Tests for face-down burn scenarios"
      contains: "burn"
  key_links:
    - from: "GameEngine.playFaceDownBlind"
      to: "detectBurn"
      via: "function call after adding card to discard pile"
      pattern: "detectBurn\\(updatedDiscardPile\\)"
---

<objective>
Fix bug where playing a 10 from face-down cards does not trigger the burn mechanic.

Purpose: The `playFaceDownBlind` method in GameEngine.ts is missing burn detection in its "playable card" path (PATH A). Both `playCards` and `playFromFaceUp` call `detectBurn()` after adding cards to the discard pile, but `playFaceDownBlind` skips this entirely. When a face-down 10 is flipped and is playable, it should burn the pile (clear discard) and let the same player go again.

Output: Fixed GameEngine with burn detection in face-down plays, plus regression tests.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/server/src/game/GameEngine.ts
@packages/server/src/game/CardRules.ts
@packages/server/src/__tests__/game-engine.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add failing tests for face-down burn scenarios</name>
  <files>packages/server/src/__tests__/game-engine.test.ts</files>
  <action>
Inside the existing `playFaceDownBlind` describe block, add a new `describe('burn detection', ...)` section with these test cases:

1. **"blind 10 on pile -> burns pile (discard cleared to empty), same player goes again"**
   - State: faceDown: [c('10')], discardPile: [c('5')], otherPlayerCards: true
   - Assert: playable is true, discardPile is empty [], currentPlayerIndex stays 0 (same player)

2. **"blind 10 on empty pile -> burns pile, same player goes again"**
   - State: faceDown: [c('10')], discardPile: [], otherPlayerCards: true
   - Assert: playable is true, discardPile is empty [], currentPlayerIndex stays 0

3. **"four-of-a-kind from face-down -> burns pile"**
   - State: faceDown: [c('6', 'spades')], discardPile: [c('6', 'hearts'), c('6', 'diamonds'), c('6', 'clubs')], otherPlayerCards: true
   - Assert: playable is true, discardPile is empty [], currentPlayerIndex stays 0

4. **"blind 10 is last face-down card, burn + eliminated -> game continues if 2+ players remain"**
   - State: faceDown: [c('10')], discardPile: [c('5')], otherPlayerCards: true, playerCount: 3
   - Assert: playable is true, discardPile empty, player 0 eliminated (total cards = 0), phase still 'playing'

5. **"blind 10 is last face-down card, burn + eliminated -> game finished if only 1 player has cards"**
   - State: faceDown: [c('10')], discardPile: [c('5')], otherPlayerCards: true, playerCount: 2
   - Assert: playable is true, discardPile empty, phase is 'finished'

6. **"non-burn playable card still advances turn normally (regression check)"**
   - State: faceDown: [c('K')], discardPile: [c('5')], otherPlayerCards: true
   - Assert: playable is true, discardPile has 2 cards, currentPlayerIndex is 1 (advanced)

Use the existing `createEndgameState` helper and `c()` card helper already defined in the `playFaceDownBlind` describe block.

Run `make test-server` -- tests 1-5 should FAIL (proving the bug exists), test 6 should PASS.
  </action>
  <verify>Run `make test-server` and confirm the new burn detection tests fail with wrong discardPile length or wrong currentPlayerIndex, while the regression test passes.</verify>
  <done>6 new test cases exist in game-engine.test.ts under playFaceDownBlind > burn detection. Tests 1-5 fail, test 6 passes.</done>
</task>

<task type="auto">
  <name>Task 2: Add burn detection to playFaceDownBlind PATH A</name>
  <files>packages/server/src/game/GameEngine.ts</files>
  <action>
In the `playFaceDownBlind` method, modify PATH A (the `if (isPlayable)` block, around lines 842-895) to add burn detection after adding the card to the discard pile. The fix mirrors the pattern used in `playCards` (line 371) and `playFromFaceUp` (line 711).

Specifically, after line 845 (`updatedDiscardPile = [...state.discardPile, flippedCard]`), add burn detection:

```typescript
// Check for burn after card is added to pile
const burnResult = detectBurn(updatedDiscardPile);
```

Then restructure the turn advancement logic to handle burns. The priority order is:
1. **Burn**: Clear pile, same player goes again (even if eliminated -- but if eliminated after burn, check game end)
2. **Eliminated (no burn)**: Skip to next active player, check game end
3. **Normal**: Advance to next active player

Replace the existing turn advancement block (lines ~856-886) with:

```typescript
let finalDiscardPile = updatedDiscardPile;

// Update player state
const updatedPlayer: PlayerGameState = {
  ...player,
  faceDown: updatedFaceDown,
};

// Check if player eliminated after play
const isEliminated = this.checkPlayerElimination(updatedPlayer);

// Create intermediate state for turn advancement
const updatedPlayers = state.players.map((p, i) =>
  i === playerIndex ? updatedPlayer : p
);

const intermediateState: GameState = {
  ...state,
  players: updatedPlayers,
  discardPile: updatedDiscardPile,
};

if (burnResult.isBurn) {
  // Burn: clear pile, same player goes again
  finalDiscardPile = [];
  if (isEliminated) {
    // Burned but also eliminated - advance to next player, check game end
    nextPlayerIndex = this.nextActivePlayerIndex(intermediateState, playerIndex);
    const shitheadId = this.findShithead(intermediateState);
    if (shitheadId) {
      updatedPhase = 'finished';
    }
  } else {
    nextPlayerIndex = playerIndex; // Same player goes again
  }
} else if (isEliminated) {
  nextPlayerIndex = this.nextActivePlayerIndex(intermediateState, playerIndex);
  const shitheadId = this.findShithead(intermediateState);
  if (shitheadId) {
    updatedPhase = 'finished';
  }
} else {
  nextPlayerIndex = this.nextActivePlayerIndex(intermediateState, playerIndex);
}

const finalState: GameState = {
  ...intermediateState,
  discardPile: finalDiscardPile,
  currentPlayerIndex: nextPlayerIndex,
  phase: updatedPhase,
};
```

Note: `detectBurn` is already imported at the top of GameEngine.ts (line 5: `import { canPlayOnPile, detectBurn } from './CardRules'`).

Ensure no existing behavior is broken -- the non-burn path must still advance the turn and handle elimination identically to the current code.
  </action>
  <verify>Run `make test-server` -- ALL tests should pass including the new burn detection tests. Then run `make lint` to ensure no lint errors.</verify>
  <done>All game-engine tests pass including 6 new burn detection tests. `make test-server` and `make lint` both succeed. Playing a 10 (or completing a four-of-a-kind) from face-down now correctly burns the pile and gives the same player another turn.</done>
</task>

</tasks>

<verification>
- `make test-server` passes with all existing + new tests green
- `make lint` passes with no errors
- `make type-check` passes (no type errors introduced)
</verification>

<success_criteria>
- Face-down 10 play burns the pile (discard becomes empty)
- Face-down 10 play keeps same player's turn (currentPlayerIndex unchanged)
- Face-down four-of-a-kind completion burns the pile
- All existing face-down tests still pass (no regressions)
- `make test-server`, `make lint`, `make type-check` all pass
</success_criteria>

<output>
After completion, create `.planning/quick/003-bug-when-playing-10-when-its-face-down-t/003-SUMMARY.md`
</output>
