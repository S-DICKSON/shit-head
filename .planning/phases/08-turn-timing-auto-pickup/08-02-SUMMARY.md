---
phase: 08-turn-timing-auto-pickup
plan: 02
subsystem: server
tags: [websocket, turn-timer, auto-play, callbacks, bun]

# Dependency graph
requires:
  - phase: 08-01
    provides: Turn timer message protocol and auto-play logic in GameEngine
provides:
  - Turn timer callback registration in WebSocket handlers
  - Timer tick broadcasting to all players every second
  - Auto-play execution and state broadcasting on timeout
  - Per-player view updates after auto-play actions
affects: [09-connection-management-reconnection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Callback registration pattern for Room-to-handler broadcasting (timer ticks, timeouts)
    - Conditional broadcast pattern based on auto-play result type (blind vs non-blind)

key-files:
  created: []
  modified:
    - packages/server/src/websocket/handlers.ts

key-decisions:
  - "Register turn timer callbacks immediately after game callbacks and before room.startGame()"
  - "Broadcast empty cards array for hand/face-up auto-play (server picks card, client doesn't need to know which)"
  - "Return early from onTimeout if autoPlayOnTimeout fails (don't broadcast partial state)"

patterns-established:
  - "Timer callbacks registered in start-game handler setup phase"
  - "Auto-play broadcasts use same message types as manual plays (face-down-result, card-played)"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 08 Plan 02: Turn Timer & Auto-Play Integration Summary

**Turn timer lifecycle integrated with 1.5s delay, per-second broadcasts, and auto-play execution on timeout with per-player state updates**

## Performance

- **Duration:** 3min 44s
- **Started:** 2026-02-08T15:38:29Z
- **Completed:** 2026-02-08T15:42:13Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Turn timer callbacks wired to broadcast ticks and handle timeouts
- Auto-play execution integrated with GameEngine.autoPlayOnTimeout
- Conditional broadcasting based on play source (blind vs non-blind)
- All players receive synchronized per-player views after auto-play

## Task Commits

Each task was committed atomically:

1. **Task 1: Add turn timer lifecycle to Room.ts** - Already completed in commit `a02a88e` (feat - Phase 08-03)
2. **Task 2: Wire turn timer callbacks and auto-play broadcasting in handlers.ts** - `67f6616` (feat)

**Note:** Task 1 was already implemented in a previous session (Phase 08-03 commit a02a88e). This plan execution only required Task 2 changes to handlers.ts.

## Files Created/Modified
- `packages/server/src/websocket/handlers.ts` - Wired turn timer callbacks with tick broadcasting and auto-play timeout handling

## Decisions Made

**1. Room.ts changes already complete**
- Task 1 (Room.ts turn timer lifecycle) was already implemented in commit a02a88e during Phase 08-03
- This plan execution focused on Task 2 (handlers.ts callback wiring)
- Rationale: Previous session had already completed the Room integration

**2. Empty cards array for non-blind auto-play**
- Hand/face-up auto-play broadcasts card-played with `cards: []` (empty array)
- Server makes card selection, clients don't need to know which specific card was played
- Rationale: Auto-play is non-interactive, UI just shows "Player timed out" without card animation

**3. Early return on auto-play failure**
- If `room.autoPlayOnTimeout` returns `success: false`, return immediately without broadcasting
- Prevents broadcasting partial or invalid state to clients
- Rationale: Error handling at Room level, handlers trust Room's result

## Deviations from Plan

None - plan executed exactly as written (with Task 1 already complete from previous session).

## Issues Encountered

**Room.ts already implemented**
- **Found:** Task 1 completion check revealed Room.ts changes already committed in a02a88e
- **Resolution:** Proceeded directly to Task 2, noted in commit message and summary
- **Impact:** Faster execution (4min vs expected 8-10min for both tasks)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 08-03 (client-side turn timer UI):**
- Server broadcasts turn-timer-tick messages every second
- Auto-play executes and broadcasts on timeout
- All state updates include per-player views for client rendering

**Blockers/Concerns:**
- None - turn timer fully operational on server side

## Self-Check: PASSED

All files and commits verified.

---
*Phase: 08-turn-timing-auto-pickup*
*Completed: 2026-02-08*
