---
phase: quick-014
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/server/src/game/GameEngine.ts
  - packages/server/src/__tests__/game-engine.test.ts
  - packages/server/src/rooms/Room.ts
autonomous: true

must_haves:
  truths:
    - "When a player plays their last hand card(s) in a 3+ player game, the turn advances to the next active (non-eliminated) player"
    - "When a player burns and is eliminated simultaneously, the turn advances to the next active player instead of staying on the eliminated player"
    - "When a player is eliminated and only one player has cards remaining, the game ends with that player as shithead"
    - "Eliminated players remain in the players array with zero cards for spectating"
  artifacts:
    - path: "packages/server/src/game/GameEngine.ts"
      provides: "Fixed playCards method with elimination-aware turn advancement"
      contains: "nextActivePlayerIndex"
    - path: "packages/server/src/__tests__/game-engine.test.ts"
      provides: "Tests for 3-player elimination scenarios in playCards"
  key_links:
    - from: "GameEngine.playCards"
      to: "GameEngine.nextActivePlayerIndex"
      via: "turn advancement after play"
      pattern: "nextActivePlayerIndex"
    - from: "GameEngine.playCards"
      to: "GameEngine.findShithead"
      via: "game-over detection after elimination"
      pattern: "findShithead"
---

<objective>
Fix game getting stuck when a player is eliminated in a 3+ player game by playing their last hand card(s).

The root cause is in `GameEngine.playCards()` which uses simple modular arithmetic `(currentPlayerIndex + 1) % players.length` for turn advancement instead of `nextActivePlayerIndex()`. This was written in Phase 5 before elimination logic was added in Phase 7. The methods `playFromFaceUp`, `playFaceDownBlind`, and `pickupPile` all correctly use `nextActivePlayerIndex`, but `playCards` was never updated.

Additionally, `playCards` does not check for player elimination or game-over after a play, unlike `playFromFaceUp` and `playFaceDownBlind` which both handle these correctly.

Purpose: Fix a game-breaking bug where 3+ player games freeze when a player empties their hand
Output: Fixed GameEngine.playCards with proper elimination handling, matching playFromFaceUp pattern
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/server/src/game/GameEngine.ts
@packages/server/src/__tests__/game-engine.test.ts
@packages/server/src/rooms/Room.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix GameEngine.playCards elimination-aware turn advancement and game-over detection</name>
  <files>packages/server/src/game/GameEngine.ts</files>
  <action>
Update `GameEngine.playCards()` to handle player elimination correctly, matching the pattern already used in `playFromFaceUp()` (lines 722-760). Specifically:

1. **Replace simple modular arithmetic with nextActivePlayerIndex** (line 381):
   Change `nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;`
   to `nextPlayerIndex = this.nextActivePlayerIndex(state, state.currentPlayerIndex);`
   (NOTE: this must use an intermediate state with updated players, same pattern as playFromFaceUp)

2. **Add elimination check after play**: After building `updatedPlayer`, check `this.checkPlayerElimination(updatedPlayer)`. This is needed because in endgame (draw pile empty), playing last hand cards eliminates the player.

3. **Handle burn + elimination**: If `burnResult.isBurn` AND player is eliminated, advance to next active player (not same player). Also check findShithead. Currently line 378 unconditionally sets `nextPlayerIndex = playerIndex` on burn.

4. **Handle non-burn + elimination**: If player is eliminated without burn, advance using nextActivePlayerIndex and check findShithead for game-over.

5. **Build intermediate state for nextActivePlayerIndex**: Create updatedPlayers array BEFORE determining nextPlayerIndex (move lines 391-393 up), so nextActivePlayerIndex sees the updated player card counts. This matches playFromFaceUp pattern (lines 737-746).

The final structure should mirror `playFromFaceUp` lines 722-760:
```
if (burnResult.isBurn) {
  finalDiscardPile = [];
  nextPlayerIndex = playerIndex; // same player
} else if (isEliminated) {
  nextPlayerIndex = this.nextActivePlayerIndex(intermediateState, playerIndex);
} else {
  nextPlayerIndex = this.nextActivePlayerIndex(intermediateState, playerIndex);
}

// Handle burn + elimination edge case
if (burnResult.isBurn && isEliminated) {
  // Player burned but has no more cards - advance to next
  nextPlayerIndex = this.nextActivePlayerIndex(intermediateState, playerIndex);
}
```

And add game-over detection:
```
// Check for game end
const shitheadId = this.findShithead(newState);
if (shitheadId) {
  newState = { ...newState, phase: 'finished' };
}
```

IMPORTANT: The `checkPostPlayState` in Room.ts also handles elimination/game-over detection via callbacks, but it does NOT fix `currentPlayerIndex`. The GameEngine fix is critical because Room.ts reads `this.gameState.currentPlayerIndex` to start the turn timer for the next player. Without the GameEngine fix, the turn timer starts for an eliminated player.
  </action>
  <verify>Run `make test-server` — all existing tests pass. Specifically verify no regressions in playCards, playFromFaceUp, playFaceDownBlind, pickupPile, and autoPlay tests.</verify>
  <done>GameEngine.playCards uses nextActivePlayerIndex for turn advancement, checks elimination, handles burn+elimination, and detects game-over via findShithead</done>
</task>

<task type="auto">
  <name>Task 2: Add 3-player elimination tests for playCards</name>
  <files>packages/server/src/__tests__/game-engine.test.ts</files>
  <action>
Add a new describe block `'playCards - 3+ player elimination'` in the existing game-engine.test.ts file. Create tests that reproduce the exact bug scenario. Use the existing test patterns (helper functions like `cardRank`, manual game state construction with `players3`).

Tests to add:

1. **"advances turn past eliminated player in 3-player game"**: Set up a 3-player state where player 0 is current, draw pile is empty, player 0 has one card in hand that can be played, player 1 is already eliminated (all arrays empty), player 2 has cards. After player 0 plays their last card, verify `currentPlayerIndex` is 2 (skipped eliminated player 1).

2. **"handles burn + elimination in 3-player game"**: Set up a 3-player state where player 0 plays a 10 (burn) as their last card (draw pile empty, only card in hand). After play, verify the pile is empty (burn happened) AND `currentPlayerIndex` advances to next active player (not player 0 who is now eliminated).

3. **"detects game-over when elimination leaves one player with cards"**: Set up a 3-player state where player 0 is current with one hand card, player 1 is already eliminated, player 2 has cards. Player 0 plays their last card. Verify `phase` is `'finished'` and `findShithead` returns player 2's ID.

4. **"skips multiple eliminated players"**: Set up a 4-player state where player 0 is current with one card, players 1 and 2 are eliminated, player 3 has cards. After play, verify `currentPlayerIndex` is 3.

For each test, construct a GameState manually with `phase: 'playing'`, empty `drawPile`, appropriate `discardPile` for valid play, and precise player card arrays. Use standard cards (e.g., `{ kind: 'standard', suit: 'hearts', rank: '5' }`) and ensure the played card is valid on the discard pile (higher rank or special card).
  </action>
  <verify>Run `make test-server` — all new tests pass along with all existing tests. Verify new tests would have FAILED before the Task 1 fix by checking they test for nextActivePlayerIndex behavior (not simple modular arithmetic).</verify>
  <done>At least 4 new tests covering 3+ player elimination scenarios in playCards, all passing</done>
</task>

</tasks>

<verification>
1. `make test-server` — all tests pass (existing + new)
2. `make type-check` — no TypeScript errors
3. `make lint` — no lint errors
4. Manual review: GameEngine.playCards now uses same elimination pattern as playFromFaceUp
</verification>

<success_criteria>
- GameEngine.playCards uses nextActivePlayerIndex (not modular arithmetic) for turn advancement
- GameEngine.playCards checks player elimination after play (like playFromFaceUp does)
- GameEngine.playCards handles burn+elimination edge case (advances to next active player)
- GameEngine.playCards detects game-over via findShithead (like playFromFaceUp does)
- All existing server tests continue to pass
- New tests cover 3-player and 4-player elimination scenarios
- make test-server, make type-check, make lint all pass
</success_criteria>

<output>
After completion, create `.planning/quick/014-fix-game-stuck-when-player-eliminated-in/014-SUMMARY.md`
</output>
