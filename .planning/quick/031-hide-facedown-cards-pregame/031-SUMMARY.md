---
phase: quick-031
plan: 01
subsystem: ui
tags: [vue, swap-phase, pregame, layout, mobile]

# Dependency graph
requires: []
provides:
  - SwapPhase.vue without face-down card row, freeing vertical screen space during pregame
affects: [swap-phase, pregame, mobile-layout]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - packages/client/src/components/SwapPhase.vue

key-decisions:
  - "Face-down cards are non-interactive during swap phase so hiding them reduces clutter without losing function"

patterns-established: []

# Metrics
duration: 3min
completed: 2026-02-22
---

# Quick Task 031: Hide Face-Down Cards in Pregame Summary

**Removed non-interactive blue "?" face-down card row from SwapPhase.vue, freeing vertical space so interactive Face Up and Hand cards are more prominent during pregame**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-22T12:08:06Z
- **Completed:** 2026-02-22T12:11:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Deleted 13-line face-down card section (label + v-for loop) from SwapPhase.vue
- Swap phase now shows only "Face Up" and "Your Hand" sections
- Playing phase (PlayerCards.vue) unchanged — stacked face-down/face-up TABLE cards render correctly
- lint passed, 21 screenshot tests passed

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove face-down card display from SwapPhase** - `23eedb6` (feat)

## Files Created/Modified
- `packages/client/src/components/SwapPhase.vue` - Removed face-down cards section (lines 83-95 of original)

## Decisions Made
- No changes to PlayerCards.vue — face-down cards must remain visible during the playing phase where they are interactive
- Removed entire section including label ("Face Down") and v-for loop rendering `?` cards based on `gameView?.faceDownCount`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Swap phase UI is leaner on mobile; no blockers

---
*Phase: quick-031*
*Completed: 2026-02-22*

## Self-Check: PASSED
