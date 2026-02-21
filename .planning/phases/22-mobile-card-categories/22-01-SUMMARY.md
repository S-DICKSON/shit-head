---
phase: 22-mobile-card-categories
plan: 01
subsystem: ui
tags: [vue3, composables, mobile, tailwind, scroll-snap, carousel, touch]

# Dependency graph
requires:
  - phase: 15-mobile-grouped-hand
    provides: useCardGrouping composable and PlayerCards.vue grouped mobile view
  - phase: 21-card-playability-highlights
    provides: playableHandIndices/playableFaceUpIndices props on PlayerCards.vue
provides:
  - useCardCategories composable splitting grouped cards into power/normal categories
  - isPowerCard pure function classifying 2, 7, 8, 10, and Joker as power cards
  - CardCategory type ('power' | 'normal')
  - Category tab bar in PlayerCards.vue mobile grouped view (Normal/Power tabs)
  - Horizontal CSS scroll-snap carousel of card groups within each category
  - Gold/yellow visual distinction for power card groups
  - Empty category friendly message
  - Two-step Play confirmation in mobile grouped mode (preventing accidental mis-taps)
  - Selection clear on category switch via watch(activeCategory)
affects: [future mobile UI phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Category filter composable wraps grouping composable: useCardCategories(hand) -> useCardGrouping(hand) + category split"
    - "CSS scroll-snap carousel: snap-x snap-mandatory on container, snap-start flex-shrink-0 on items"
    - "Two-step confirmation pattern: playConfirming ref + confirmTimer auto-cancel after 3s"
    - "Power card classification by Set lookup: POWER_RANKS = new Set(['2','7','8','10'])"

key-files:
  created:
    - packages/client/src/composables/useCardCategories.ts
  modified:
    - packages/client/src/components/PlayerCards.vue

key-decisions:
  - "isPowerCard includes 7 and Joker beyond server isSpecialCard (2,8,10) — UI categorization purpose"
  - "Tab buttons as sole category switching mechanism — avoids useSwipe touch conflict with carousel scroll"
  - "groupedCards excluded from PlayerCards destructuring — component uses activeGroups (display layer only)"
  - "isGroupPlayable removed from carousel template — new carousel uses isPowerGroup for gold styling, not playability ring"
  - "clearGroupSelection + cancel confirmTimer in same watch(activeCategory) watcher — single point of cleanup"
  - "confirmTimer as module-level let (not ref) — no reactivity needed, pure timeout management"

patterns-established:
  - "Layer pattern: category composable wraps grouping composable, index tracking preserved in base layer"
  - "Touch target minimums: tab buttons min-h-[60px], +/- buttons w-[60px] h-[60px] (MOBUI-05)"
  - "Scrollbar hiding: .snap-x::-webkit-scrollbar + scrollbar-width: none in scoped CSS"

# Metrics
duration: 3min
completed: 2026-02-19
---

# Phase 22 Plan 01: Mobile Card Categories Summary

**useCardCategories composable splitting mobile hand into Normal/Power tabs with CSS scroll-snap carousel and gold power card styling**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-19T21:51:08Z
- **Completed:** 2026-02-19T21:54:07Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Created `useCardCategories.ts` composable with `isPowerCard` (ranks 2, 7, 8, 10, Joker), `CardCategory` type, power/normal group split, reactive `activeCategory`, and `activeGroups` computed
- Replaced mobile grouped view in `PlayerCards.vue` with category tab bar + horizontal scroll-snap carousel
- Gold/yellow borders on power card groups (`bg-yellow-900/30 border-yellow-500/60`), dark styling on normal groups
- Two-step Play confirmation: first tap shows "Confirm Play?", second tap fires; auto-cancels after 3s
- 60px touch targets on tab buttons (`min-h-[60px]`) and +/- quantity buttons (`w-[60px] h-[60px]`)
- Empty category shows "No [power/normal] cards in hand" message
- Desktop `TransitionGroup` card layout completely unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useCardCategories composable** - `3c83ebf` (feat)
2. **Task 2: Add category tabs and carousel to PlayerCards.vue mobile view** - `d33ebd9` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/client/src/composables/useCardCategories.ts` - Power/normal category split composable wrapping useCardGrouping; exports isPowerCard, CardCategory, useCardCategories
- `packages/client/src/components/PlayerCards.vue` - Mobile grouped view replaced with category tab bar, horizontal scroll-snap carousel, gold power card styling, two-step Play confirmation, 60px touch targets

## Decisions Made

- **isPowerCard includes 7 and Joker** beyond server `isSpecialCard` (2, 8, 10) — these are power cards for UI categorization even though server handles them differently (7-constraint, always-playable joker)
- **Tab buttons only for category switching** — `useSwipe` skipped to avoid touch event conflict with horizontal carousel scroll (research recommendation; plan agreed)
- **`groupedCards` excluded from PlayerCards destructuring** — component now uses `activeGroups` for display; `groupedCards` is internal to `useCardCategories`
- **`isGroupPlayable` removed from carousel template** — new carousel uses `isPowerGroup` for gold border styling; the playability ring from phase 21 was in the old vertical grouped view which is now replaced
- **`confirmTimer` as module-level `let`** — no Vue reactivity needed for the timeout handle; pure side-effect management

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `groupedCards` destructuring causing lint error**

- **Found during:** Task 2 (lint-fix run)
- **Issue:** Plan template showed `groupedCards` in destructuring from `useCardCategories`, but the new carousel template uses `activeGroups` — `groupedCards` was destructured but never used, causing `@typescript-eslint/no-unused-vars` lint error
- **Fix:** Removed `groupedCards` from `PlayerCards.vue` destructuring (composable still exposes it for external consumers)
- **Files modified:** `packages/client/src/components/PlayerCards.vue`
- **Verification:** `make lint` passes with zero errors
- **Committed in:** `d33ebd9` (Task 2 commit)

**2. [Rule 1 - Bug] Removed `isGroupPlayable` function causing lint error**

- **Found during:** Task 2 (lint-fix run)
- **Issue:** Plan for Task 2 instructed adding `isPowerGroup` helper alongside `isGroupPlayable` (from phase 21). However the new carousel template doesn't use `isGroupPlayable` (the gold border uses `isPowerGroup`; the old playability ring styling was in the old vertical view which was fully replaced). ESLint flagged `isGroupPlayable` as defined but never used.
- **Fix:** Removed `isGroupPlayable` from `PlayerCards.vue`. The function can be reintroduced if playability ring styling is desired in the carousel in a future phase.
- **Files modified:** `packages/client/src/components/PlayerCards.vue`
- **Verification:** `make lint` passes with zero errors
- **Committed in:** `d33ebd9` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - unused variable bug)
**Impact on plan:** Both fixes necessary for lint compliance. No behavior change. The playability ring (phase 21) is preserved on the desktop card buttons and face-up cards; only the mobile grouped view carousel is affected. Future phase can add playability ring to carousel items if desired.

## Issues Encountered

None - plan executed smoothly. lint-fix auto-corrected minor formatting; unused variable removals were straightforward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Category tabs and carousel are fully functional in mobile grouped view (hand > 5 cards, viewport < 640px)
- Desktop layout untouched; all existing tests pass
- `useCardCategories` and `isPowerCard` are exported for use in future phases (e.g., if playability ring needs to be added to carousel items)
- Phase 22 plan 01 is the only plan in phase 22

## Self-Check: PASSED

---
*Phase: 22-mobile-card-categories*
*Completed: 2026-02-19*
