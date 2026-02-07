---
phase: 04-pre-game-swap-phase
plan: 01
subsystem: shared-schemas
tags: [zod, typescript, websocket, validation, message-protocol]

# Dependency graph
requires:
  - phase: 03-deck-dealing-system
    provides: Card schemas, game state types, and discriminated union pattern
provides:
  - Swap-phase message schemas for client-server communication
  - Ready-up and swap-cards client message types
  - Timer, ready status, and card update server message types
  - Transitioning game phase for post-swap state
affects: [04-02-swap-logic, 04-03-ui-implementation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extended discriminated union pattern to swap-phase messages"
    - "Schema-first message protocol with validation constraints"

key-files:
  created: []
  modified:
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts
    - packages/shared/src/types/game.ts

key-decisions:
  - "Swap timer fixed at 30 seconds max (validated in schema)"
  - "Ready-up message has no payload (simple flag)"
  - "Swap-cards-updated includes opponent views for immediate UI refresh"
  - "Added transitioning phase between swapping and playing phases"

patterns-established:
  - "Timer tick messages provide countdown updates for UI"
  - "Phase-complete messages include reason enum for client handling"

# Metrics
duration: 2.5min
completed: 2026-02-07
---

# Phase 4 Plan 01: Swap-Phase Schemas Summary

**Six swap-phase message schemas with runtime validation and inferred types for type-safe swap communication protocol**

## Performance

- **Duration:** 2.5 min
- **Started:** 2026-02-07T22:17:50Z
- **Completed:** 2026-02-07T22:20:20Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added six new message schemas (2 client-to-server, 4 server-to-client) for swap phase
- Extended GamePhase type to include 'transitioning' for post-swap transition state
- Added INVALID_ACTION and PLAYER_NOT_FOUND error codes for swap-phase error handling
- All new schemas integrated into discriminated unions with type inference

## Task Commits

Each task was committed atomically:

1. **Task 1: Add swap-phase schemas and update discriminated unions** - `f090409` (feat)

## Files Created/Modified
- `packages/shared/src/schemas/messages.ts` - Added swapCardsSchema, readyUpSchema, swapTimerTickSchema, playerReadySchema, swapPhaseCompleteSchema, swapCardsUpdatedSchema; updated error codes
- `packages/shared/src/types/messages.ts` - Added inferred types for all new message schemas; updated ErrorCode union
- `packages/shared/src/types/game.ts` - Updated GamePhase to include 'transitioning'

## Decisions Made

1. **Swap timer hard-coded to 30 seconds maximum** - Validated in schema with `.max(30)` constraint, consistent with project decision for 30-second swap timer
2. **Ready-up is a simple flag** - No payload needed, just the message type signals ready state
3. **Swap-cards-updated includes full opponent views** - Enables immediate UI refresh without separate fetch, consistent with game-dealt pattern
4. **Transitioning phase added** - Separate phase for post-swap state before game play begins, provides clear state boundary

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward schema additions following established patterns from Phase 3.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 4 Plan 02 (swap logic implementation):
- Message schemas provide contract for server-side swap handling
- Error codes defined for invalid swap actions
- Timer tick schema enables 30-second countdown
- Phase transitions defined for swap → transitioning → playing flow

No blockers. Server can now implement swap logic with full type safety.

---
*Phase: 04-pre-game-swap-phase*
*Completed: 2026-02-07*

## Self-Check: PASSED
