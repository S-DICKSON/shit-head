---
phase: quick-028
plan: 01
subsystem: ui
tags: [vue, router, websocket, state-management, navigation]

# Dependency graph
requires:
  - phase: quick-027b
    provides: useGameSocket composable with WebSocket singleton state
provides:
  - Leave Room button in Lobby now correctly navigates to home screen
affects: [Lobby.vue, router navigation guard, useGameSocket state lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Synchronous state reset in send() before WebSocket message: clear refs then send, so router guards see clean state immediately"

key-files:
  created: []
  modified:
    - packages/client/src/composables/useGameSocket.ts

key-decisions:
  - "Clear roomState/gameView/playerId/spectator refs synchronously inside send() for leave-room, not in a server response handler — ensures router guard checks happen after state is cleared"
  - "Also remove shithead-player-id from localStorage on leave (prevents stale reconnect on next visit)"

patterns-established:
  - "Deliberate leave = full state wipe: all room refs null, both localStorage keys removed, spectator state reset"

# Metrics
duration: 1min
completed: 2026-02-21
---

# Quick Task 028: Fix Leave Room Not Returning to Home Screen — Summary

**Synchronous client state clear on leave-room in useGameSocket send() unblocks router guard navigation to /**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-21T14:28:20Z
- **Completed:** 2026-02-21T14:29:10Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Fixed Leave Room button in Lobby not navigating to the landing page
- Identified root cause: router guard (router.ts lines 51-59) redirected back to `/room/{code}` because `roomState.value` was still populated when `router.push('/')` fired
- Extended `leave-room` handling in `send()` to clear all reactive state synchronously before sending the WebSocket message
- All 133 existing client tests continue to pass

## Task Commits

1. **Task 1: Clear all client state on leave-room in useGameSocket send()** - `3cc8255` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/client/src/composables/useGameSocket.ts` — Extended `leave-room` branch in `send()`: clears `roomState`, `gameView`, `playerId`, `isSpectator`, `spectatorGameView`, `spectatorCount` refs and both localStorage keys

## Decisions Made

- **Synchronous clear before wsSend():** State must be null before `router.push('/')` fires in Lobby.vue. Placing the clear in `send()` (before `wsSend()`) guarantees that timing. A server-response handler would be async and too late.
- **Also clear `shithead-player-id`:** On deliberate leave, the player is abandoning the session entirely. Leaving the playerId in localStorage would cause an erroneous reconnect attempt on the next visit. The `playerId.value` watch would persist a new id when the player rejoins fresh, so clearing here is safe.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Leave Room flow is fully functional
- Phase 23 (Frontend Testing) can proceed without this navigation blocker

---
*Phase: quick-028*
*Completed: 2026-02-21*
