---
phase: quick
plan: 020
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared/src/types/game.ts
  - packages/shared/src/schemas/messages.ts
  - packages/server/src/game/GameEngine.ts
  - packages/server/src/__tests__/game-engine.test.ts
  - packages/shared/src/types/messages.ts
  - packages/client/src/composables/usePlayingPhase.ts
  - packages/client/src/components/PlayingPhase.vue
autonomous: true

must_haves:
  truths:
    - "First player MUST play their lowest-ranked card(s) on the opening turn"
    - "If first player has multiple cards of the same lowest rank, they MUST play ALL of them"
    - "Server rejects any other card play on the first turn with MUST_PLAY_LOWEST error"
    - "After first turn completes, normal play rules resume"
    - "Auto-play on timeout plays lowest card(s) instead of random on first turn"
    - "Client shows which cards must be played on the first turn"
  artifacts:
    - path: "packages/shared/src/types/game.ts"
      provides: "firstTurn field on GameState and PlayerGameView"
      contains: "firstTurn"
    - path: "packages/server/src/game/GameEngine.ts"
      provides: "First-turn validation in playCards and autoPlayOnTimeout"
      contains: "firstTurn"
    - path: "packages/server/src/__tests__/game-engine.test.ts"
      provides: "Tests for first-turn enforcement"
      contains: "firstTurn"
  key_links:
    - from: "packages/server/src/game/GameEngine.ts"
      to: "packages/shared/src/types/game.ts"
      via: "GameState.firstTurn field"
      pattern: "firstTurn"
    - from: "packages/client/src/composables/usePlayingPhase.ts"
      to: "PlayerGameView"
      via: "gameView.firstTurn detection"
      pattern: "firstTurn"
---

<objective>
Force the first player to play their lowest-ranked card(s) on the opening turn. If they hold multiple cards of the same lowest rank (e.g., two 3s), they must play all of them.

Purpose: Enforces the standard Shithead opening rule where the player with the lowest card opens with it.
Output: Server-side validation, auto-play support, client hints for the forced opening play.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/shared/src/types/game.ts
@packages/shared/src/types/messages.ts
@packages/shared/src/schemas/messages.ts
@packages/server/src/game/GameEngine.ts
@packages/server/src/game/CardComparison.ts
@packages/server/src/game/CardRules.ts
@packages/server/src/__tests__/game-engine.test.ts
@packages/client/src/composables/usePlayingPhase.ts
@packages/client/src/components/PlayingPhase.vue
@packages/server/src/rooms/Room.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add firstTurn to shared types, schemas, and server GameEngine</name>
  <files>
    packages/shared/src/types/game.ts
    packages/shared/src/types/messages.ts
    packages/shared/src/schemas/messages.ts
    packages/server/src/game/GameEngine.ts
    packages/server/src/__tests__/game-engine.test.ts
  </files>
  <action>
**1. Add `firstTurn` to `GameState` in `packages/shared/src/types/game.ts`:**
- Add `firstTurn: boolean;` field to the `GameState` type (after `dealerIndex`)

**2. Add `firstTurn` to `PlayerGameView` in `packages/shared/src/types/game.ts`:**
- Add `firstTurn: boolean;` field to `PlayerGameView` type (after `dealerIndex`)

**3. Add `MUST_PLAY_LOWEST` error code in `packages/shared/src/types/messages.ts`:**
- Add `'MUST_PLAY_LOWEST'` to the `ErrorCode` union type

**4. Add `MUST_PLAY_LOWEST` to error schema in `packages/shared/src/schemas/messages.ts`:**
- Add `'MUST_PLAY_LOWEST'` to the `errorSchema` code enum array

**5. Add `firstTurn` to `gameDealtSchema` in `packages/shared/src/schemas/messages.ts`:**
- Add `firstTurn: z.boolean()` to `gameDealtSchema`
- Also add `firstTurn: z.boolean()` to `cardPlayedSchema` (so client updates after first turn clears)

**6. Modify `GameEngine.createGame()` in `packages/server/src/game/GameEngine.ts`:**
- Set `firstTurn: false` in the returned GameState (game starts in swapping phase, not playing)

**7. Modify the swap-to-playing transition in `packages/server/src/rooms/Room.ts`:**
- In the setTimeout callback after swap phase completes (around line 443-455), where `phase: 'playing'` is set and `currentPlayerIndex: firstPlayer` is assigned, also set `firstTurn: true`

**8. Modify `GameEngine.getPlayerView()` in `packages/server/src/game/GameEngine.ts`:**
- Include `firstTurn: state.firstTurn` in the returned `PlayerGameView` object (after `dealerIndex`)

**9. Add first-turn validation to `GameEngine.playCards()` in `packages/server/src/game/GameEngine.ts`:**
- After the existing same-rank validation block (lines 326-339) and BEFORE the `canPlayOnPile` check, add first-turn logic:
  ```
  if (state.firstTurn) {
    // Find player's lowest rank in hand (skip 2s, same as determineFirstPlayer)
    const scanOrder = RANK_ORDER.slice(1); // Skip '2'
    let lowestRank: string | null = null;
    for (const rank of scanOrder) {
      if (player.hand.some(c => c.kind === 'standard' && c.rank === rank)) {
        lowestRank = rank;
        break;
      }
    }
    // Fallback: if only 2s (extremely rare), lowest is '2'
    if (!lowestRank) lowestRank = '2';

    // Validate ALL played cards are of the lowest rank
    const firstPlayedRank = cardsToPlay[0].kind === 'standard' ? cardsToPlay[0].rank : null;
    if (firstPlayedRank !== lowestRank) {
      return { success: false, error: 'Must play your lowest card(s) on the first turn', code: 'MUST_PLAY_LOWEST' as ErrorCode };
    }

    // Validate player is playing ALL cards of that rank from their hand
    const allLowestIndices = player.hand
      .map((c, i) => (c.kind === 'standard' && c.rank === lowestRank) ? i : -1)
      .filter(i => i !== -1);
    const sortedPlayedIndices = [...cardIndices].sort((a, b) => a - b);
    const sortedLowestIndices = [...allLowestIndices].sort((a, b) => a - b);
    if (sortedPlayedIndices.length !== sortedLowestIndices.length ||
        !sortedPlayedIndices.every((v, i) => v === sortedLowestIndices[i])) {
      return { success: false, error: 'Must play ALL of your lowest cards on the first turn', code: 'MUST_PLAY_LOWEST' as ErrorCode };
    }
  }
  ```
- IMPORTANT: Import `RANK_ORDER` is already imported at top of GameEngine.ts

**10. Set `firstTurn: false` after first play succeeds in `GameEngine.playCards()`:**
- In the section after "All validations passed - perform the play" (around line 351), before or after creating the newState, ensure `firstTurn: false` is set:
  ```
  let newState: GameState = {
    ...intermediateState,
    discardPile: finalDiscardPile,
    currentPlayerIndex: nextPlayerIndex,
    firstTurn: false,  // First turn complete
  };
  ```

**11. Modify `GameEngine.autoPlayOnTimeout()` to handle first turn:**
- In the `playSource === 'hand'` branch (around line 1009), BEFORE the existing random card selection logic, add:
  ```
  if (state.firstTurn) {
    // On first turn, must play all lowest-ranked cards
    const scanOrder = RANK_ORDER.slice(1);
    let lowestRank: string | null = null;
    for (const rank of scanOrder) {
      if (player.hand.some(c => c.kind === 'standard' && c.rank === rank)) {
        lowestRank = rank;
        break;
      }
    }
    if (!lowestRank) lowestRank = '2';
    const lowestIndices = player.hand
      .map((c, i) => (c.kind === 'standard' && c.rank === lowestRank) ? i : -1)
      .filter(i => i !== -1);
    const playResult = this.playCards(state, playerId, lowestIndices);
    if (!playResult.success) return playResult;
    return { success: true, data: { state: playResult.data, wasBlindPlay: false } };
  }
  ```

**12. Write tests in `packages/server/src/__tests__/game-engine.test.ts`:**
Add a new `describe('firstTurn enforcement')` block with these tests:
- "rejects play of non-lowest card on first turn" — Create a GameState with `firstTurn: true`, player hand has [3, 5, K], attempt to play index of 5 -> expect MUST_PLAY_LOWEST error
- "rejects partial play of lowest cards on first turn" — Player hand has [3hearts, 3diamonds, K], attempt to play only one 3 -> expect MUST_PLAY_LOWEST error
- "accepts play of all lowest cards on first turn" — Player hand has [3hearts, 3diamonds, K], play both 3s -> expect success, firstTurn becomes false
- "accepts play of single lowest card when only one exists" — Player hand has [3, 5, K], play the 3 -> expect success, firstTurn becomes false
- "sets firstTurn to false after successful first play" — Verify state.firstTurn is false after valid first-turn play
- "normal play rules apply after first turn" — With firstTurn: false, player can play any valid card
- "autoPlayOnTimeout plays lowest cards on first turn" — Create firstTurn state, call autoPlayOnTimeout, verify lowest cards are played

To create test GameStates, use helper functions that build a `GameState` manually with specific hand cards. Use the `Card` type directly: `{ kind: 'standard', suit: 'hearts', rank: '3' }`. Set `phase: 'playing'`, `firstTurn: true`, `discardPile: []`, `currentPlayerIndex: 0`.
  </action>
  <verify>
Run `make test-server` — all existing tests pass plus new firstTurn tests pass.
Run `make type-check` — no type errors (firstTurn added consistently to GameState, PlayerGameView, and schemas).
  </verify>
  <done>
Server enforces first-turn lowest-card rule: rejects wrong cards with MUST_PLAY_LOWEST, requires ALL cards of lowest rank, sets firstTurn false after play, auto-play picks lowest on timeout. All tests pass.
  </done>
</task>

<task type="auto">
  <name>Task 2: Client-side first-turn UI hints and auto-selection</name>
  <files>
    packages/client/src/composables/usePlayingPhase.ts
    packages/client/src/components/PlayingPhase.vue
  </files>
  <action>
**1. Add first-turn computed and forced card logic in `usePlayingPhase.ts`:**

Add a computed `isFirstTurn`:
```typescript
const isFirstTurn = computed<boolean>(() => {
  return gameView.value?.firstTurn === true;
});
```

Add a computed `forcedCardIndices` that returns the indices of cards the player MUST play on first turn:
```typescript
const forcedCardIndices = computed<Set<number>>(() => {
  if (!isFirstTurn.value || !isMyTurn.value || !gameView.value) return new Set();
  const hand = gameView.value.hand;
  // Find lowest rank (skip 2s, same logic as server)
  const rankOrder = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
  let lowestRank: string | null = null;
  for (const rank of rankOrder) {
    if (hand.some(c => c.kind === 'standard' && c.rank === rank)) {
      lowestRank = rank;
      break;
    }
  }
  if (!lowestRank) return new Set();
  const indices = new Set<number>();
  hand.forEach((c, i) => {
    if (c.kind === 'standard' && c.rank === lowestRank) indices.add(i);
  });
  return indices;
});
```

**2. Auto-select forced cards when it's first turn:**
Add a `watch` that auto-selects the forced cards when `isFirstTurn` and `isMyTurn` are both true:
```typescript
watch([isFirstTurn, isMyTurn], ([firstTurn, myTurn]) => {
  if (firstTurn && myTurn && forcedCardIndices.value.size > 0) {
    selectedHandIndices.value = new Set(forcedCardIndices.value);
  }
}, { immediate: true });
```

**3. Override `toggleHandCard` to prevent deselection of forced cards on first turn:**
In the `toggleHandCard` function, at the top, add a guard:
```typescript
if (isFirstTurn.value && forcedCardIndices.value.has(index)) {
  // Cannot deselect forced cards on first turn — they must all be played
  // But still allow clicking to trigger the "already selected" feedback
  return;
}
```
Also, prevent selecting non-forced cards on first turn:
```typescript
if (isFirstTurn.value && !forcedCardIndices.value.has(index)) {
  return; // Can only play forced cards on first turn
}
```

**4. Return new values from `usePlayingPhase`:**
Add `isFirstTurn` and `forcedCardIndices` to the return object.

**5. Update `PlayingPhase.vue` to show first-turn message:**
- Destructure `isFirstTurn` and `forcedCardIndices` from `usePlayingPhase()`
- Add a notification banner below the TurnBanner (when `isFirstTurn && isMyTurn`):
  ```html
  <p v-if="isFirstTurn && isMyTurn" class="text-yellow-300 text-sm text-center mb-1 animate-pulse">
    You must play your lowest card(s)!
  </p>
  ```
  Place this right after the `<TurnBanner>` component inside the center game area div.

- Pass `forcedCardIndices` down to `PlayerCards` component as a prop `:forced-indices="forcedCardIndices"` so forced cards get a visual highlight (yellow ring or similar). Check `PlayerCards.vue` for existing highlight patterns. If `PlayerCards.vue` already handles `selectedHandIndices` with a highlight ring, forced cards will naturally highlight since they're auto-selected. If you want an additional visual cue, add a subtle pulsing border to forced-index cards.

**6. Handle the MUST_PLAY_LOWEST error on client:**
In `useGameSocket.ts` (or wherever error messages are handled), the existing error handler should already display the error message via toast. The server returns `error: 'Must play your lowest card(s) on the first turn'` which will appear in the error toast. No additional client error handling needed.
  </action>
  <verify>
Run `make type-check` — no type errors across all packages.
Run `make lint` — no lint errors.
Run `make test` — all tests pass (excluding known App.test.ts failures).
Manually verify: Start a game, first player should see their lowest card(s) auto-selected with "You must play your lowest card(s)!" message.
  </verify>
  <done>
Client auto-selects forced cards on first turn, prevents deselection/wrong selection, shows "You must play your lowest card(s)!" banner, and cards appear highlighted via the existing selection ring.
  </done>
</task>

</tasks>

<verification>
1. `make test` passes (all server tests including new firstTurn tests, excluding known App.test.ts failures)
2. `make type-check` passes (firstTurn consistently added to GameState, PlayerGameView, schemas)
3. `make lint` passes
4. Server rejects non-lowest card plays on first turn with MUST_PLAY_LOWEST
5. Server requires ALL cards of lowest rank on first turn
6. Auto-play on timeout correctly plays lowest cards on first turn
7. Client shows first-turn banner and auto-selects forced cards
8. After first turn, normal play resumes (firstTurn: false)
</verification>

<success_criteria>
- First player cannot play anything except ALL of their lowest-ranked cards on opening turn
- MUST_PLAY_LOWEST error returned for invalid first-turn plays
- Auto-play on timeout plays the correct lowest cards
- Client visually indicates which cards must be played
- firstTurn flag properly transitions from true to false after first play
- All existing tests still pass
</success_criteria>

<output>
After completion, create `.planning/quick/020-force-first-player-to-play-lowest-card/020-SUMMARY.md`
</output>
