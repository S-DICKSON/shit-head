---
phase: quick-027
plan: 01
subsystem: ui
tags: [vue, composable, swap-phase, multi-select, reactive-set]

# Dependency graph
requires:
  - phase: quick-022
    provides: useSwapPhase composable and SwapPhase.vue initial implementation
provides:
  - Rank-aware multi-select swap selection using Set<number> reactive refs
  - tryPerformSwaps paired swap messages (N hand cards x 1 face-up = N messages)
  - 7 new test cases covering accumulation, switching, deselection, multi-swap
affects: [swap-phase, card-selection, game-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Set-based reactive state with always-assign-new-Set pattern for Vue reactivity"
    - "Rank-aware multi-select: same rank accumulates, different rank switches, re-tap deselects"
    - "Cycling smaller selection set for swap pairing (handArr[i % faceUpArr.length])"

key-files:
  created: []
  modified:
    - packages/client/src/composables/useSwapPhase.ts
    - packages/client/src/components/SwapPhase.vue
    - packages/client/src/composables/__tests__/useSwapPhase.test.ts

key-decisions:
  - "Set-based selection: selectedHandIndices/selectedFaceUpIndices (ref<Set<number>>) replacing null refs"
  - "Swap pairing drives from hand side with cycling: handArr[i % faceUpArr.length]"
  - "Vue reactivity with Sets: always assign new Set instance (new Set([...existing, idx])) never mutate in place"
  - "getRank helper returns card.rank for standard cards, 'JKR' for jokers — consistent with display label"

patterns-established:
  - "Rank-aware card selection: same rank tap accumulates, different rank tap replaces selection entirely"
  - "Reactive Set pattern: never call .add()/.delete() on existing Set, always create new Set and assign to .value"

# Metrics
duration: 4min
completed: 2026-02-21
---

# Quick Task 027: Card Swap Selection Improvement Summary

**Rank-aware multi-select swap using Set<number> reactive refs — same-rank taps accumulate, different-rank taps switch, 2 hand cards + 1 face-up sends 2 sequential swap-cards messages**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-21T13:23:15Z
- **Completed:** 2026-02-21T13:26:44Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Replaced single-index selection (`ref<number | null>`) with Set-based multi-select (`ref<Set<number>>`) for both hand and face-up zones
- Rank-aware tap behavior: same rank accumulates selection, different rank switches (replaces) selection, re-tap deselects from set
- Multi-swap pairing: 2 selected hand cards + 1 face-up card sends 2 `swap-cards` messages (one per hand card, each paired with face-up)
- SwapPhase.vue updated to use `.has(i)` for Set-based highlight bindings
- 22 useSwapPhase tests all green (7 new tests added, existing tests updated for Set API)

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor useSwapPhase to rank-aware Set-based multi-select** - `1d73f5a` (feat)
2. **Task 2: Update SwapPhase.vue template for Set-based selection** - `88af1ad` (feat)
3. **Task 3: Update tests for rank-aware multi-select behavior** - `85e502a` (test)

## Files Created/Modified
- `packages/client/src/composables/useSwapPhase.ts` - Refactored: Set-based selection, getRank helper, tryPerformSwaps with cycling pairing
- `packages/client/src/components/SwapPhase.vue` - Updated: destructure Set refs, use `.has(i)` in class bindings
- `packages/client/src/composables/__tests__/useSwapPhase.test.ts` - Updated + expanded: Set API assertions, 7 new rank-aware tests

## Decisions Made

- **Set-based reactivity pattern:** Vue's reactivity doesn't track Set mutations deeply, so always assign `new Set([...old, index])` for additions and `const next = new Set(old); next.delete(i); ref.value = next;` for removals.
- **Swap pairing drives from hand side with cycling:** `handArr[i % faceUpArr.length]` — allows 2 hand + 1 face-up to generate 2 messages both targeting the same face-up slot.
- **getRank returns 'JKR' for jokers:** Consistent with the display label in the template, ensuring joker-joker accumulation works correctly.
- **Rank check uses first selected index:** When accumulating, compare the tapped card's rank against the rank of `[...selectedHandIndices][0]` (first in iteration order).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tryPerformSwaps initially used Math.min pairing (sent 1 swap instead of 2)**
- **Found during:** Task 3 (test run)
- **Issue:** Initial implementation paired 1-to-1 with `Math.min(hand, faceUp)` — for 2 hand + 1 face-up it only sent 1 swap message, not 2
- **Fix:** Changed to cycling strategy: iterate `handArr.length` times, index face-up as `faceUpArr[i % faceUpArr.length]`
- **Files modified:** `packages/client/src/composables/useSwapPhase.ts`
- **Verification:** Test "multi-select hand + single face-up triggers multiple swaps" now passes (send called 2 times)
- **Committed in:** `85e502a` (part of task 3 commit — fix applied and verified before commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in pairing logic)
**Impact on plan:** Essential for correct multi-swap behavior. No scope creep.

## Issues Encountered
- Docker port 3000 already allocated by running `shit-head-app-1` container — `make type-check`, `make test-client`, `make lint` all failed due to server dependency starting conflict. Resolved by running Docker client container directly with `docker compose run --rm client bunx ...` and `--no-deps` flag for lint.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Swap phase UX improved: players can batch-select same-rank cards with single taps
- Ready for Phase 23 (Frontend Testing) continuation
- No blockers introduced

---
*Phase: quick-027*
*Completed: 2026-02-21*

## Self-Check: PASSED
