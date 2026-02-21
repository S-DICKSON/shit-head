---
phase: quick-029
plan: 01
subsystem: ui
tags: [vue, mobile, tailwind, cards, composables]

# Dependency graph
requires:
  - phase: 22-mobile-card-categories
    provides: PlayerCards grouped mobile UI that is now being removed
provides:
  - Simplified PlayerCards with horizontal scroll on mobile (no tabs/carousel)
  - Cleaned PlayingPhase with no grouped play handler
  - Dead composable code removed (useCardCategories, useCardGrouping)
affects: [phase-23-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mobile horizontal scroll: flex-nowrap + overflow-x-auto + snap-x + snap-start flex-shrink-0"
    - "Desktop wrap: sm:flex-wrap + sm:overflow-visible + sm:justify-center"

key-files:
  created: []
  modified:
    - packages/client/src/components/PlayerCards.vue
    - packages/client/src/components/PlayingPhase.vue

key-decisions:
  - "Horizontal swipe replaces category tabs + carousel for mobile hand navigation"
  - "overflow-hidden on card area div instead of overflow-y-auto max-h-[35vh] — parent PlayingPhase already constrains with max-h-[45vh]"
  - "forcedCardIndices removed from PlayingPhase destructuring — still used internally in usePlayingPhase composable"

patterns-established:
  - "Mobile scroll pattern: flex-nowrap overflow-x-auto snap-x snap-mandatory + snap-start flex-shrink-0 per card"

# Metrics
duration: 2min
completed: 2026-02-21
---

# Quick Task 029: Simplify Mobile Card UI Summary

**Replaced over-engineered category tabs + carousel + two-step confirm with simple horizontal swipe on mobile, deleting 680+ lines of unused code**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-21T14:48:33Z
- **Completed:** 2026-02-21T14:50:41Z
- **Tasks:** 2
- **Files modified:** 2 modified, 3 deleted

## Accomplishments
- PlayerCards.vue rewritten: TransitionGroup always renders, cards horizontally scrollable on mobile via `flex-nowrap + overflow-x-auto + snap-x`, wrapping on desktop via `sm:flex-wrap`
- Removed all grouped mobile UI: category tab bar (Normal/Power), horizontal carousel with +/- quantity selectors, two-step play confirmation (playConfirming), mobile detection (windowWidth, isMobile, resize listeners)
- Deleted useCardCategories.ts, useCardGrouping.ts, useCardGrouping.test.ts — 493 lines of dead code removed
- PlayingPhase.vue cleaned: removed handleGroupedPlay, @play-grouped-cards binding, unused send/forcedCardIndices destructuring
- All 117 client tests pass, type-check and lint clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Simplify PlayerCards.vue — remove grouped mode, add horizontal scroll** - `4d39d28` (feat)
2. **Task 2: Clean up PlayingPhase.vue and delete unused composables** - `f4bbf6a` (chore)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `packages/client/src/components/PlayerCards.vue` - Rewritten: single card display mode, horizontal scroll on mobile, snap scrolling, no grouped UI
- `packages/client/src/components/PlayingPhase.vue` - Cleaned: removed grouped play handler, unused imports
- `packages/client/src/composables/useCardCategories.ts` - DELETED
- `packages/client/src/composables/useCardGrouping.ts` - DELETED
- `packages/client/src/composables/useCardGrouping.test.ts` - DELETED

## Decisions Made
- Horizontal swipe (flex-nowrap + overflow-x-auto + snap) replaces category tabs + carousel for mobile hand navigation — simpler and more intuitive
- `overflow-hidden` on card area div (was `overflow-y-auto max-h-[35vh]`) — no vertical scroll wanted; parent PlayingPhase constrains with `max-h-[45vh]`
- `forcedCardIndices` removed from PlayingPhase destructuring since it was only passed to PlayerCards as a prop (prop removed since it wasn't used in template); it remains used internally in `usePlayingPhase` composable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `send` and `forcedCardIndices` from PlayingPhase destructuring**
- **Found during:** Task 2 (PlayingPhase cleanup)
- **Issue:** After removing `handleGroupedPlay`, `send` became unused. `forcedCardIndices` was being passed as a prop to PlayerCards but PlayerCards no longer accepts it.
- **Fix:** Removed `send` from `useGameSocket()` destructuring, removed `forcedCardIndices` from `usePlayingPhase()` destructuring and from the PlayerCards prop binding
- **Files modified:** packages/client/src/components/PlayingPhase.vue
- **Verification:** `make type-check` and `make lint` pass — no unused variable errors
- **Committed in:** f4bbf6a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug/unused variable cleanup)
**Impact on plan:** Required cleanup to avoid type-check/lint failures. No scope creep.

## Issues Encountered
None — changes were straightforward deletion and simplification.

## Next Phase Readiness
- Mobile card display is now simpler and consistent with desktop
- Phase 23 (Frontend Testing) can proceed without grouped UI complexity
- No blockers

---
*Phase: quick-029*
*Completed: 2026-02-21*

## Self-Check: PASSED
