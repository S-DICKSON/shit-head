---
phase: quick-027
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/composables/useSwapPhase.ts
  - packages/client/src/components/SwapPhase.vue
  - packages/client/src/composables/__tests__/useSwapPhase.test.ts
autonomous: true

must_haves:
  truths:
    - "Tapping a hand card of a different rank than current selection switches selection to just that card"
    - "Tapping a hand card of the same rank as current selection adds it to selection (multi-select)"
    - "Tapping an already-selected card deselects it; if it was the last selected, selection clears"
    - "Same-rank accumulation and different-rank switch behavior applies to face-up cards too"
    - "Completing a swap (selecting from both zones) still sends one swap-cards message per selected card"
    - "All selected cards in one zone swap with the single selected card in the other zone sequentially"
  artifacts:
    - path: "packages/client/src/composables/useSwapPhase.ts"
      provides: "Multi-select swap logic with rank-aware selection"
    - path: "packages/client/src/components/SwapPhase.vue"
      provides: "Updated template using Set-based selection state"
    - path: "packages/client/src/composables/__tests__/useSwapPhase.test.ts"
      provides: "Tests for new rank-aware selection behavior"
  key_links:
    - from: "packages/client/src/composables/useSwapPhase.ts"
      to: "packages/client/src/components/SwapPhase.vue"
      via: "selectedHandIndices/selectedFaceUpIndices reactive Sets"
      pattern: "selectedHandIndices|selectedFaceUpIndices"
---

<objective>
Improve card swap selection UX: within the same card zone (hand or face-up), tapping a card of a different rank switches selection to that card. Tapping a card of the same rank accumulates the selection. When a swap completes (both zones have selections), send sequential swap-cards messages for each selected card in the multi-select zone paired with the single card in the other zone.

Purpose: Reduces tap friction during swap phase — no need to deselect before switching, and same-rank cards can be batch-selected for efficient swapping.
Output: Updated useSwapPhase composable with rank-aware multi-select, updated SwapPhase.vue template, updated tests.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/composables/useSwapPhase.ts
@packages/client/src/components/SwapPhase.vue
@packages/client/src/composables/__tests__/useSwapPhase.test.ts
@packages/shared/src/types/card.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Refactor useSwapPhase to rank-aware multi-select</name>
  <files>
    packages/client/src/composables/useSwapPhase.ts
  </files>
  <action>
Change selection state from single index (`ref<number | null>`) to index sets (`ref<Set<number>>`):

- `selectedHandIndex` -> `selectedHandIndices` (ref of Set<number>)
- `selectedFaceUpIndex` -> `selectedFaceUpIndices` (ref of Set<number>)

Helper function `getRank(card: Card): string` — returns `card.rank` for standard cards, `'JKR'` for jokers. Import the Card type from shared.

**selectHandCard(index: number) logic:**
1. If swapPhaseComplete, return early.
2. Get the tapped card: `gameView.value?.hand[index]`. If no card, return.
3. If the tapped index is already in selectedHandIndices:
   - Remove it from the set (deselect). Trigger reactivity by creating new Set.
   - Return.
4. Get rank of tapped card.
5. Check if any card is already selected in selectedHandIndices. If yes, get rank of first selected card:
   - If ranks MATCH: add tapped index to the set (accumulate). Trigger reactivity.
   - If ranks DIFFER: clear set, add only tapped index (switch). Trigger reactivity.
6. If no cards selected yet: add tapped index. Trigger reactivity.
7. After updating selection, check if selectedFaceUpIndices is non-empty:
   - If yes: perform swaps. For each handIndex in selectedHandIndices, call `sendSwap(handIndex, firstFaceUpIndex)` where firstFaceUpIndex is the single face-up index (take the first from the set — face-up side should only have 1 when triggering). Then clear both sets.
   - IMPORTANT: Since face-up zone also supports multi-select, use the smaller set as the "single" side. If hand has 2 selected and face-up has 1, send 2 swaps pairing each hand card with that face-up card. If both have multiple, pair them 1-to-1 by iteration order (zip), any extras remain selected.

Actually, simplify: when a swap triggers (both zones non-empty), pair them 1-to-1 in iteration order. Send one swap-cards message per pair. Clear all selections after.

**selectFaceUpCard(index: number)** — mirror logic of selectHandCard but for face-up zone, checking `gameView.value?.faceUp[index]`.

**Reactivity pattern:** Since Vue's reactivity doesn't deeply track Set mutations, always assign a new Set: `selectedHandIndices.value = new Set([...selectedHandIndices.value, index])` for additions, and `const next = new Set(selectedHandIndices.value); next.delete(index); selectedHandIndices.value = next;` for removals.

Keep backward-compatible exports: export `selectedHandIndices` and `selectedFaceUpIndices` (not the old singular names).
  </action>
  <verify>
Run `make type-check` to confirm no TypeScript errors.
  </verify>
  <done>
useSwapPhase uses Set-based multi-select with rank-aware accumulation/switching. Different rank replaces selection, same rank accumulates, re-tap deselects. Both zones non-empty triggers paired swaps.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update SwapPhase.vue template for Set-based selection</name>
  <files>
    packages/client/src/components/SwapPhase.vue
  </files>
  <action>
Update the script setup destructuring:
- Change `selectedHandIndex` to `selectedHandIndices`
- Change `selectedFaceUpIndex` to `selectedFaceUpIndices`

Update face-up card button `:class` binding (line 70):
- Old: `selectedFaceUpIndex === i ? 'ring-2 ...' : 'border-gray-300 ...'`
- New: `selectedFaceUpIndices.has(i) ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'`

Update hand card button `:class` binding (line 103):
- Old: `selectedHandIndex === i ? 'ring-2 ...' : 'border-gray-300 ...'`
- New: `selectedHandIndices.has(i) ? 'ring-2 ring-blue-500 scale-105 border-blue-500' : 'border-gray-300 hover:border-gray-400'`

No other template changes needed — click handlers remain `selectHandCard(i)` and `selectFaceUpCard(i)`.
  </action>
  <verify>
Run `make type-check` and `make lint` to confirm no errors.
  </verify>
  <done>
SwapPhase.vue uses `.has()` on Set refs for highlight state. Multiple same-rank cards show blue ring simultaneously.
  </done>
</task>

<task type="auto">
  <name>Task 3: Update tests for rank-aware multi-select behavior</name>
  <files>
    packages/client/src/composables/__tests__/useSwapPhase.test.ts
  </files>
  <action>
Update existing tests and add new ones for the changed behavior:

**Update existing tests:**
- Tests referencing `selectedHandIndex` change to `selectedHandIndices` (Set).
- `expect(selectedHandIndices.value).toBe(1)` becomes `expect(selectedHandIndices.value.has(1)).toBe(true)` and `expect(selectedHandIndices.value.size).toBe(1)`.
- `expect(selectedHandIndex.value).toBeNull()` becomes `expect(selectedHandIndices.value.size).toBe(0)`.
- Same pattern for `selectedFaceUpIndex` -> `selectedFaceUpIndices`.

**Add new tests in 'card selection' describe block:**

1. "selectHandCard switches selection when different rank tapped":
   - Set gameView hand to `[{rank:'3',suit:'hearts'}, {rank:'7',suit:'diamonds'}, {rank:'K',suit:'spades'}]` (already in beforeEach).
   - selectHandCard(0) (rank '3'), then selectHandCard(1) (rank '7').
   - Expect selectedHandIndices has only index 1, size 1.

2. "selectHandCard accumulates when same rank tapped":
   - Set gameView hand to `[{kind:'standard',rank:'7',suit:'hearts'}, {kind:'standard',rank:'7',suit:'diamonds'}, {kind:'standard',rank:'K',suit:'spades'}]`.
   - selectHandCard(0) (rank '7'), then selectHandCard(1) (rank '7').
   - Expect selectedHandIndices has both 0 and 1, size 2.

3. "selectHandCard switches from accumulated to different rank":
   - Same hand as test 2.
   - selectHandCard(0), selectHandCard(1), then selectHandCard(2) (rank 'K').
   - Expect selectedHandIndices has only index 2, size 1.

4. "deselecting one card from accumulated set keeps others":
   - Same hand as test 2.
   - selectHandCard(0), selectHandCard(1), then selectHandCard(0) again (deselect).
   - Expect selectedHandIndices has only index 1, size 1.

5. "multi-select hand + single face-up triggers multiple swaps":
   - Hand: two 7s at indices 0,1. Face-up: normal cards.
   - selectHandCard(0), selectHandCard(1) (accumulates), then selectFaceUpCard(0).
   - Expect send called twice: once with handIndex:0,faceUpIndex:0 and once with handIndex:1,faceUpIndex:0.
   - Both selections cleared after.

6. "selectFaceUpCard same-rank accumulation works":
   - Set faceUp to have two cards of same rank.
   - selectFaceUpCard(0), selectFaceUpCard(1) (same rank).
   - Expect selectedFaceUpIndices has both, size 2.

7. "joker cards accumulate with other jokers":
   - Hand: `[{kind:'joker',id:1}, {kind:'joker',id:2}, {kind:'standard',rank:'K',suit:'spades'}]`.
   - selectHandCard(0), selectHandCard(1).
   - Expect selectedHandIndices size 2.

Run `make test-client` to verify all tests pass.
  </action>
  <verify>
Run `make test-client` — all useSwapPhase tests pass.
Run `make lint` — no lint errors.
  </verify>
  <done>
All existing tests updated for Set-based API. New tests verify: same-rank accumulation, different-rank switching, deselection from accumulated set, multi-swap triggering, joker accumulation. All pass.
  </done>
</task>

</tasks>

<verification>
Run the full verification suite:
- `make type-check` passes (no TS errors across all packages)
- `make test-client` passes (all useSwapPhase tests green)
- `make lint` passes (no lint violations)
</verification>

<success_criteria>
1. Tapping a hand card of different rank from current selection switches to just that card
2. Tapping a hand card of same rank accumulates (both highlighted with blue ring)
3. Re-tapping a selected card deselects it from the set
4. Same logic applies to face-up card zone
5. Multi-selected cards in one zone pair 1-to-1 with the other zone's selection for swap messages
6. All tests pass, type-check clean, lint clean
</success_criteria>

<output>
After completion, create `.planning/quick/027-card-swap-selection-improvement-switch-t/027-SUMMARY.md`
</output>
