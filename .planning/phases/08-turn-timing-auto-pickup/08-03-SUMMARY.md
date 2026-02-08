---
phase: 08-turn-timing-auto-pickup
plan: 03
subsystem: ui
tags: [vue, websocket, svg, animation, client-state]

# Dependency graph
requires:
  - phase: 08-01
    provides: Turn timer message protocol and auto-play logic
  - phase: 02-03
    provides: WebSocket composable singleton pattern
  - phase: 04-04
    provides: Game.vue component structure
provides:
  - TurnTimer.vue component with circular SVG progress ring
  - Client-side turn timer state (turnTimeRemaining, turnTimerPlayerIndex)
  - Game view state updates from gameplay messages
  - Playing/finished phase rendering in Game.vue
affects: [08-04, gameplay-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SVG circular progress ring with stroke-dashoffset animation"
    - "Reactive turn timer state synced from server via WebSocket"
    - "Phase-based conditional rendering in Game.vue"

key-files:
  created:
    - packages/client/src/components/TurnTimer.vue
  modified:
    - packages/client/src/composables/useGameSocket.ts
    - packages/client/src/components/Game.vue

key-decisions:
  - "No color changes or urgency cues on timer (per locked project decision)"
  - "Progress ring depletes from full to empty (clockwise animation)"
  - "Game view state updated from all gameplay messages for reactive UI"

patterns-established:
  - "SVG progress ring pattern: stroke-dashoffset computed from time ratio"
  - "WebSocket message handlers update gameView ref for automatic component reactivity"
  - "Phase-specific component rendering in Game.vue (swap/playing/finished)"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 08 Plan 03: Turn Timer UI Summary

**Circular SVG progress ring with countdown text, integrated into Game.vue via reactive WebSocket state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T15:39:13Z
- **Completed:** 2026-02-08T15:41:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- TurnTimer.vue component with circular SVG progress ring showing countdown (e.g., "42s")
- Turn timer state (turnTimeRemaining, turnTimerPlayerIndex) added to useGameSocket composable
- Game view state reactively updated from gameplay messages (card-played, pile-pickup, face-down-result, turn-changed, player-eliminated, game-over)
- Game.vue renders TurnTimer during playing phase with finished and fallback phase handlers

## Task Commits

Each task was committed atomically:

1. **Task 1: Add turn timer state to useGameSocket composable** - `02062e5` (feat)
2. **Task 2: Create TurnTimer.vue component and integrate into Game.vue** - `a02a88e` (feat)

## Files Created/Modified
- `packages/client/src/components/TurnTimer.vue` - Circular SVG progress ring with countdown text, depletes smoothly via stroke-dashoffset animation
- `packages/client/src/composables/useGameSocket.ts` - Added turnTimeRemaining/turnTimerPlayerIndex refs, handlers for turn-timer-tick and gameplay messages
- `packages/client/src/components/Game.vue` - Imported TurnTimer, added playing/finished phase rendering with timer display

## Decisions Made
None - followed plan as specified. No color changes or urgency cues applied to timer per locked project decision.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 08-04:** Turn timer UI is complete and rendering. Ready to integrate with server-side turn timer (08-02) once that plan completes.

**Current state:**
- TurnTimer component displays time from turnTimeRemaining ref
- useGameSocket handles turn-timer-tick messages
- Game view state updates reactively from all gameplay messages
- UI ready for full turn timer flow (timer starts, ticks down, triggers auto-play on timeout)

**No blockers.**

---
*Phase: 08-turn-timing-auto-pickup*
*Completed: 2026-02-08*

## Self-Check: PASSED

All created files exist:
- packages/client/src/components/TurnTimer.vue ✓

All commits exist:
- 02062e5 ✓
- a02a88e ✓
