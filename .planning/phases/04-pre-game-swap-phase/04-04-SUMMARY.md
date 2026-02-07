---
phase: 04-pre-game-swap-phase
plan: 04
subsystem: client-ui
tags: [vue3, websocket, composables, swap-phase, debounce, vueuse]

# Dependency graph
requires:
  - phase: 04-pre-game-swap-phase
    plan: 01
    provides: Swap-phase message schemas and types
  - phase: 04-pre-game-swap-phase
    plan: 03
    provides: Server-side swap timer, ready state, and WebSocket handlers
  - phase: 02-multiplayer-lobby
    plan: 03
    provides: Singleton WebSocket composable pattern
provides:
  - useSwapPhase composable with tap-tap card selection and debounced swap submission
  - SwapPhase.vue component with timer, ready button, and real-time opponent views
  - Client-side swap phase UI with visual selection highlights
affects: [05-gameplay, game-phase-routing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Debounced user actions with useDebounceFn (150ms, 500ms maxWait)"
    - "Tap-tap selection pattern for card swapping"
    - "Transition overlay for phase changes"
    - "Per-player reactive state derived from WebSocket messages"

key-files:
  created:
    - packages/client/src/composables/useSwapPhase.ts
    - packages/client/src/components/SwapPhase.vue
  modified:
    - packages/client/src/composables/useGameSocket.ts

key-decisions:
  - "Debounce swap messages at 150ms with 500ms maxWait to batch rapid taps"
  - "Tap-tap pattern: select hand card, then face-up card (or vice versa) to trigger swap"
  - "Auto-deselect on second tap of same card for easy selection correction"
  - "No swaps allowed during transition phase (cards locked after swap-phase-complete)"
  - "Simple numeric timer display with no urgency effects (per user decision)"

patterns-established:
  - "Card selection state managed in composable, visual feedback in component"
  - "Transition overlay pattern for phase change announcements"
  - "Unicode suit symbols with conditional red/black text coloring"

# Metrics
duration: 2.4min
completed: 2026-02-07
---

# Phase 04 Plan 04: Client Swap Phase Summary

**Vue 3 swap UI with tap-tap card selection, debounced swap submission, countdown timer, ready button, and real-time opponent face-up card updates**

## Performance

- **Duration:** 2.4 min (142s)
- **Started:** 2026-02-07T22:19:00Z
- **Completed:** 2026-02-07T22:21:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- useSwapPhase composable implements tap-tap selection logic with 150ms debounce and 500ms maxWait
- SwapPhase.vue renders timer countdown, opponent views with ready indicators, and player's cards
- Visual selection highlights (blue ring) show which cards are selected for swap
- Ready button toggles state and displays checkmark indicator
- Transition overlay shows "Let's play!" message when phase completes
- Real-time updates: opponent face-up cards and ready states update as messages arrive

## Task Commits

Each task was committed atomically:

1. **Task 1: Update useGameSocket for swap-phase messages and create useSwapPhase composable** - `77ecb1f` (feat)
2. **Task 2: Create SwapPhase.vue component** - `4a6041c` (feat)

## Files Created/Modified
- `packages/client/src/composables/useGameSocket.ts` - Added reactive state for swap phase (gameView, swapTimeRemaining, readyPlayers, swapPhaseComplete, swapPhaseReason); added 5 message handlers (game-dealt, swap-cards-updated, swap-timer-tick, player-ready, swap-phase-complete)
- `packages/client/src/composables/useSwapPhase.ts` - Tap-tap card selection logic with debounced swap submission, ready toggle, timer display, transition state management
- `packages/client/src/components/SwapPhase.vue` - Swap phase UI with timer, opponent views with ready indicators, player's face-up/face-down/hand cards with selection highlights, ready button, and transition overlay

## Decisions Made

**Debounce configuration:** 150ms debounce with 500ms maxWait balances responsiveness with message batching. Rapid taps are batched but user never waits more than 500ms for swap to send.

**Tap-tap selection pattern:** More intuitive than drag-drop on mobile. Tapping same card again deselects it, allowing easy correction without needing a "cancel" button.

**No swaps during transition:** Once swap-phase-complete message arrives, card selection is disabled. Prevents race conditions where player tries to swap during the 2.5s transition to playing phase.

**Simple timer display:** Numeric countdown only (e.g., "27s") with no color changes or urgency effects. This was a locked user decision to keep UI clean and distraction-free.

**Unicode suit symbols:** Using \u2665 (♥), \u2666 (♦), \u2663 (♣), \u2660 (♠) for universal compatibility. Conditional text-red-600 for hearts/diamonds, text-black for clubs/spades.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward implementation following established patterns from Phase 2 (singleton WebSocket composable) and Phase 3 (card rendering).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 5 (Gameplay):
- Swap phase fully functional on client side
- WebSocket message handlers in place for all swap-phase events
- Component ready to integrate into router (game phase routing)
- Real-time updates working for opponent views and ready state

No blockers. Next phase can focus on gameplay turn logic.

---
*Phase: 04-pre-game-swap-phase*
*Completed: 2026-02-07*

## Self-Check: PASSED
