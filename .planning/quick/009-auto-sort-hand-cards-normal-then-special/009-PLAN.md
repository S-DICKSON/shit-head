---
phase: quick-009
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/server/src/game/CardComparison.ts
  - packages/server/src/game/GameEngine.ts
  - packages/server/src/__tests__/card-comparison.test.ts
autonomous: true

must_haves:
  truths:
    - "Hand cards are always sorted: normal cards ascending (3,4,5,6,9,J,Q,K,A,Joker) then special cards grouped (2,7,8,10)"
    - "Sorting is applied after initial deal, after picking up pile, and after drawing cards"
    - "All existing tests still pass"
  artifacts:
    - path: "packages/server/src/game/CardComparison.ts"
      provides: "sortHand function with custom sort order"
      exports: ["sortHand"]
    - path: "packages/server/src/game/GameEngine.ts"
      provides: "sortHand calls at all hand-mutation points"
    - path: "packages/server/src/__tests__/card-comparison.test.ts"
      provides: "Tests for sortHand function"
  key_links:
    - from: "packages/server/src/game/GameEngine.ts"
      to: "packages/server/src/game/CardComparison.ts"
      via: "import sortHand"
      pattern: "sortHand"
---

<objective>
Add automatic hand sorting so cards are displayed in a logical order: normal cards in ascending order (3,4,5,6,9,J,Q,K,A,Joker), followed by special/magic cards grouped together (2,7,8,10).

Purpose: Makes it easier for players to see what they have and quickly identify playable cards vs special cards.
Output: A `sortHand` function in CardComparison.ts, integrated into all hand-mutation points in GameEngine.ts, with tests.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/server/src/game/CardComparison.ts
@packages/server/src/game/CardRules.ts
@packages/server/src/game/GameEngine.ts
@packages/shared/src/types/card.ts
@packages/shared/src/types/game.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create sortHand function in CardComparison.ts</name>
  <files>packages/server/src/game/CardComparison.ts, packages/server/src/__tests__/card-comparison.test.ts</files>
  <action>
Add a `sortHand` function to `packages/server/src/game/CardComparison.ts` that sorts a Card[] array in place (or returns a new sorted array) using the following custom sort order:

**Sort key logic:**
- Normal cards come first, in ascending order: 3=0, 4=1, 5=2, 6=3, 9=4, J=5, Q=6, K=7, A=8
- Jokers come after normal cards: Joker=9
- Special cards come last, grouped: 2=10, 7=11, 8=12, 10=13

Create a `HAND_SORT_ORDER` map (separate from the existing `RANK_ORDER`/`RANK_MAP` used for gameplay comparison) that maps each rank to its hand-display sort position:
```
'3' -> 0, '4' -> 1, '5' -> 2, '6' -> 3, '9' -> 4,
'J' -> 5, 'Q' -> 6, 'K' -> 7, 'A' -> 8,
// Jokers handled separately -> 9
'2' -> 10, '7' -> 11, '8' -> 12, '10' -> 13
```

The function signature: `export function sortHand(hand: Card[]): Card[]`
- Returns a NEW sorted array (do not mutate input, consistent with immutable patterns in GameEngine)
- For cards with the same sort key (same rank), use suit as secondary sort for stability: hearts < diamonds < clubs < spades (arbitrary but deterministic)
- For jokers with the same sort key, sort by id (1 before 2)

Add tests to `packages/server/src/__tests__/card-comparison.test.ts`:
1. Test that normal cards sort in correct ascending order (3,4,5,6,9,J,Q,K,A)
2. Test that special cards (2,7,8,10) appear after all normal cards
3. Test that jokers appear between normal and special cards
4. Test mixed hand: e.g. [10-hearts, 3-spades, 2-clubs, 7-diamonds, K-hearts, joker-1] -> [3-spades, K-hearts, joker-1, 2-clubs, 7-diamonds, 10-hearts]
5. Test empty hand returns empty array
6. Test hand with only special cards sorts correctly (2,7,8,10)
  </action>
  <verify>Run `make test-server` and confirm all new and existing tests pass.</verify>
  <done>sortHand function exists, is exported, and all tests pass including new sort-specific tests.</done>
</task>

<task type="auto">
  <name>Task 2: Integrate sortHand into all hand-mutation points in GameEngine</name>
  <files>packages/server/src/game/GameEngine.ts</files>
  <action>
Import `sortHand` from `./CardComparison` in GameEngine.ts (it already imports `RANK_ORDER` from there).

Apply `sortHand` at every point where a player's hand is created or modified. Specifically:

1. **createGame (line ~63)** - After dealing hand cards to each player:
   Change `playerStates[i].hand = shuffled.slice(cardIndex, cardIndex + 3)` to `playerStates[i].hand = sortHand(shuffled.slice(cardIndex, cardIndex + 3))`

2. **swapCards (line ~214-220)** - After swap completes:
   After the swap logic, sort the updated hand: change `hand: updatedHand` to `hand: sortHand(updatedHand)` in the updatedPlayer object (around line 224).

3. **playCards (line ~363-368)** - After auto-draw from draw pile:
   After the while loop that draws cards, sort the hand before using it. Change `hand: updatedHand` to `hand: sortHand(updatedHand)` in the updatedPlayer object (around line 386).

4. **pickupPile (line ~461)** - After picking up discard pile:
   Change `const updatedHand = [...player.hand, ...state.discardPile]` to `const updatedHand = sortHand([...player.hand, ...state.discardPile])` (line 461).

5. **playFaceDownBlind PATH B (line ~914)** - When blind play fails and player picks up pile + card:
   Change `updatedHand = [...state.discardPile, flippedCard]` to `updatedHand = sortHand([...state.discardPile, flippedCard])` (line 914).

Do NOT sort in `getPlayerView` - sorting happens at mutation time, not view time. This keeps the state consistent.

Do NOT sort face-up or face-down cards - only hand cards get sorted.
  </action>
  <verify>Run `make test-server` to confirm all existing tests still pass. Run `make lint` to confirm no lint errors. Run `make type-check` to confirm no type errors.</verify>
  <done>All five hand-mutation points call sortHand. All existing tests pass. `make lint` and `make type-check` pass.</done>
</task>

</tasks>

<verification>
1. `make test-server` - all tests pass (existing + new sortHand tests)
2. `make lint` - no lint errors
3. `make type-check` - no type errors
4. Manual spot-check: In a test, create a game with `GameEngine.createGame(...)` and verify that each player's `hand` array is sorted with normal cards before special cards
</verification>

<success_criteria>
- sortHand function correctly orders: 3,4,5,6,9,J,Q,K,A,Joker,2,7,8,10
- All hand-mutation points in GameEngine call sortHand
- All existing tests pass without modification (sorting is backward-compatible)
- New tests cover sort order edge cases
- `make test-server`, `make lint`, `make type-check` all pass
</success_criteria>

<output>
After completion, create `.planning/quick/009-auto-sort-hand-cards-normal-then-special/009-SUMMARY.md`
</output>
