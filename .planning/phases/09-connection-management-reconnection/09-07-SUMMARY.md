---
phase: 09-connection-management-reconnection
plan: 07
subsystem: game-logic
tags: [disconnect, game-state, reconnection, phase-management]

# Dependency graph
requires:
  - phase: 09-02
    provides: Disconnect timeout and grace period logic with removePlayerAfterTimeout method
provides:
  - Game-end detection that works during all active phases (swapping, transitioning, playing)
  - Fix for UAT Test 5 scenario where swap phase disconnect left game stuck
affects: [game-end, phase-transitions, disconnect-handling]

# Tech tracking
tech-stack:
  added: []
  patterns: [Phase-independent game state checks for critical conditions]

key-files:
  created: []
  modified:
    - packages/server/src/rooms/Room.ts
    - packages/server/src/rooms/__tests__/Room.disconnect.test.ts

key-decisions:
  - "Game-end check must be phase-independent to handle early-phase disconnects"
  - "Turn advancement remains phase-specific (playing phase only)"

patterns-established:
  - "Critical game state checks (like game-end) should be phase-independent when they apply to all active phases"

# Metrics
duration: 1.8min
completed: 2026-02-08
---

# Phase 09 Plan 07: Gap Closure - Game-End Detection Summary

**Game-end detection now works during all active game phases (swapping, transitioning, playing), fixing bug where games continued with <2 players during pre-play phases**

## Performance

- **Duration:** 1.8 min (106 seconds)
- **Started:** 2026-02-08T22:10:23Z
- **Completed:** 2026-02-08T22:12:09Z
- **Tasks:** 3 (2 with commits, 1 verification-only)
- **Files modified:** 2

## Accomplishments
- Fixed game-end detection to work during swap and transition phases, not just playing phase
- Added test coverage for swap phase disconnect timeout scenario
- Resolved UAT Test 5 gap where players disconnecting during swap phase left game stuck

## Task Commits

Each task was committed atomically:

1. **Task 1: Move game-end detection outside phase-specific conditional** - `64f548e` (fix)
2. **Task 2: Add test for swap phase disconnect timeout game-end** - `62f7116` (test)
3. **Task 3: Run full test suite and linter** - no commit (verification only)

**Plan metadata:** (to be committed with STATE.md update)

## Files Created/Modified
- `packages/server/src/rooms/Room.ts` - Moved game-end check outside phase === 'playing' conditional, added phase-independent comment
- `packages/server/src/rooms/__tests__/Room.disconnect.test.ts` - Added test for swap phase disconnect timeout scenario

## Root Cause

The game-end check in `removePlayerAfterTimeout` (lines 592-614) was nested inside the `if (this.gameState.phase === 'playing')` conditional at line 574. This meant the check only ran during the playing phase.

**Why it mattered:** When a player disconnected during the swap phase (first 30 seconds after game start) or transition phase (2.5 seconds between swap and playing), and the disconnect timeout fired (90 seconds), the game-end check never executed. The remaining player was left in a game with only 1 connected player.

## Fix Approach

**1. Moved game-end check outside phase conditional (lines 592-614 → 595-614)**
   - Game-end logic now executes for any active game state (swapping, transitioning, or playing)
   - Turn advancement logic (lines 574-590) remains INSIDE the phase === 'playing' check - turn advancement only applies during active gameplay
   - Added clear comment explaining phase-independent nature of game-end check

**2. Added test coverage for swap phase scenario**
   - New test: "ends game during swap phase when fewer than 2 players remain after removal"
   - Validates game ends when disconnect timeout fires during swap phase
   - Complements existing test that validated playing phase scenario

## Verification Results

- All 301 server tests pass (14 disconnect tests, up from 13)
- TypeScript type-check passes with no errors
- ESLint passes with no linting errors
- New test validates swap phase disconnect timeout game-end
- Existing test validates playing phase disconnect timeout still works

## Decisions Made

None - followed plan as specified. Plan correctly identified root cause and fix approach.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward implementation with clear root cause and fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- UAT Test 5 gap now closed - games properly end when players disconnect during any active phase
- All disconnect/reconnection scenarios now handled correctly
- Ready for any future phase work involving game state management
- Game-end detection is now robust across all phases

## Self-Check: PASSED

All files and commits verified:
- Modified files exist: Room.ts, Room.disconnect.test.ts
- Commits exist: 64f548e, 62f7116

---
*Phase: 09-connection-management-reconnection*
*Completed: 2026-02-08*
