---
phase: quick
plan: 022
subsystem: ui
tags: [vue, mobile, ios, viewport, safe-area, tailwind]

# Dependency graph
requires:
  - phase: 19-discord-room-management
    provides: App.vue safe-area padding wrapper with CSS variables (--safe-top, --safe-bottom)
  - phase: 20-sound-settings
    provides: PlayingPhase.vue with TurnTimer and MuteButton fixed overlays
provides:
  - Game view fits within viewport on iPhone 15 Pro without scrolling
  - calc(100dvh - safe area) pattern for full-screen game containers
affects: [22-mobile-card-categories]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "100dvh minus safe area CSS variables for full-screen mobile game containers"
    - "dvh (dynamic viewport height) over vh for iOS Safari toolbar compatibility"

key-files:
  created: []
  modified:
    - packages/client/src/components/PlayingPhase.vue
    - packages/client/src/components/Game.vue

key-decisions:
  - "calc(100dvh - var(--safe-top) - var(--safe-bottom)) on game containers: self-contained approach avoids requiring explicit height on every ancestor"
  - "dvh instead of vh: tracks dynamic viewport correctly when iOS Safari toolbar collapses/expands"

patterns-established:
  - "Full-screen game containers: drop h-screen class, add inline style height: calc(100dvh - var(--safe-top) - var(--safe-bottom))"

# Metrics
duration: 1min
completed: 2026-02-19
---

# Quick Task 022: Fix Mobile Screen Overflow / Timer Scroll Summary

**PlayingPhase and Game spectator view now use `calc(100dvh - safe-area-insets)` to eliminate iOS scroll overflow during gameplay**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-19T21:53:35Z
- **Completed:** 2026-02-19T21:54:24Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Replaced `h-screen` (100vh) with `calc(100dvh - var(--safe-top) - var(--safe-bottom))` on PlayingPhase outer container
- Applied same fix to Game.vue spectator view container
- Game view no longer overflows or causes scroll on iPhone 15 Pro
- Fixed-position overlays (TurnTimer, MuteButton, Leave, Spectator count) unaffected — they use `position: fixed` independent of layout flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix viewport height calculations for game containers** - `1edf5b8` (fix)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `packages/client/src/components/PlayingPhase.vue` - Outer div: removed `h-screen`, added inline `height: calc(100dvh - var(--safe-top) - var(--safe-bottom))`
- `packages/client/src/components/Game.vue` - Spectator view div: same change

## Decisions Made
- `calc(100dvh - var(--safe-top) - var(--safe-bottom))` chosen over `h-full` because `h-full` requires explicit height on every ancestor (Game.vue wrapper div and RouterView have no height set) — the inline style calc is self-contained
- `100dvh` (dynamic viewport height) used instead of `100vh` to handle iOS Safari toolbar correctly when it collapses/expands during scroll

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Mobile overflow fix complete; game view fits within iPhone 15 Pro viewport without scrolling
- Phase 22 (Mobile Card Categories) can proceed — layout foundation is now stable for mobile

---
*Phase: quick-022*
*Completed: 2026-02-19*

## Self-Check: PASSED
