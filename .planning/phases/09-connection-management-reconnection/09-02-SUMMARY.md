---
phase: 09
plan: 02
subsystem: connection-management
tags: [websocket, disconnect, reconnection, grace-period, turn-timer]
dependencies:
  requires: ["08-02", "09-01"]
  provides: ["disconnect-lifecycle", "grace-period-timer", "auto-elimination"]
  affects: ["09-03", "09-04"]
tech-stack:
  added: []
  patterns: ["grace-period-timer", "callback-pattern", "race-condition-protection"]
key-files:
  created:
    - packages/server/src/rooms/__tests__/Room.disconnect.test.ts
  modified:
    - packages/server/src/rooms/Room.ts
decisions:
  - id: grace-period-duration
    choice: 90 seconds
    rationale: Sufficient time for temporary network issues or quick page refresh
  - id: lobby-disconnect-immediate
    choice: Remove immediately in lobby/finished states
    rationale: No active game in progress, no need to wait for reconnection
  - id: mark-as-eliminated
    choice: Clear cards from gameState when player removed after disconnect
    rationale: Enables turn advancement via nextActivePlayerIndex which checks elimination status
  - id: turn-timer-pause-resume
    choice: Pause turn timer on current player disconnect, resume on reconnect
    rationale: Fair gameplay - disconnected player shouldn't lose their turn to timeout
metrics:
  duration: 400s
  completed: 2026-02-08
---

# Phase 09 Plan 02: Disconnect/Reconnect Lifecycle Summary

**One-liner:** Server-side disconnect/reconnect lifecycle with 90-second grace period, turn timer pause/resume, and automatic elimination.

## What Was Built

Implemented complete disconnect/reconnect lifecycle in Room.ts with comprehensive TDD coverage.

**Core functionality:**
- **Grace period management:** 90-second timer for in-game disconnects, immediate removal for lobby disconnects
- **Reconnection handling:** Clear grace timer, resume turn timer if needed, prevent double-triggering
- **Turn advancement:** When disconnected player is current player and times out, advance to next active player
- **Game end detection:** End game when fewer than 2 connected players remain
- **Turn timer integration:** Pause when current player disconnects, resume when they reconnect
- **Callback pattern:** onDisconnected, onReconnected, onPlayerRemoved (with 'timeout' or 'host-left' reason)

**Test coverage:** 13 comprehensive test cases using vi.useFakeTimers() to control grace period:
- Lobby disconnect → immediate removal (2 tests)
- In-game disconnect → grace period start
- Reconnect within grace period → timer cleared
- Grace period expiry → player removed (host vs non-host)
- Turn advancement when current player removed
- Game end when fewer than 2 active players
- Turn timer pause/resume on current player disconnect/reconnect (2 tests)
- Edge cases: non-existent player, not disconnected, race condition (3 tests)

## Technical Approach

**TDD Red-Green-Refactor:**
1. **RED:** Created failing tests for all disconnect scenarios (commit 04acef4)
2. **GREEN:** Implemented lifecycle methods to pass all tests (commit c7d481f)
3. **No REFACTOR:** Implementation was clean on first pass

**Key implementation details:**
- `disconnectedPlayers` Map tracks grace period timers and disconnect timestamps
- `handlePlayerDisconnect` differentiates lobby vs in-game disconnects
- `removePlayerAfterTimeout` clears player's cards (marks as eliminated) to enable turn advancement
- Race condition protection: check `disconnectedPlayers.has()` before timeout fires
- Turn timer interaction: check if disconnected player is current player before pausing/resuming

## Task Commits

| Task | Type | Commit | Description |
|------|------|--------|-------------|
| 1 | test | 04acef4 | Add failing tests for disconnect/reconnect lifecycle (RED) |
| 2 | feat | c7d481f | Implement disconnect/reconnect lifecycle in Room (GREEN) |

## Files Changed

**Created:**
- `packages/server/src/rooms/__tests__/Room.disconnect.test.ts` (344 lines)
  - 13 test cases covering all disconnect scenarios
  - Uses vi.useFakeTimers() for grace period testing
  - Advances 30000+2500ms to reach playing phase for turn timer tests

**Modified:**
- `packages/server/src/rooms/Room.ts`
  - Added `disconnectedPlayers` Map with grace period timer tracking
  - Added `DISCONNECT_GRACE_PERIOD = 90000` constant
  - Added disconnect callbacks: `onPlayerDisconnected`, `onPlayerReconnected`, `onPlayerRemoved`
  - New methods: `setDisconnectCallbacks`, `handlePlayerDisconnect`, `handlePlayerReconnect`, `removePlayerAfterTimeout`, `isPlayerDisconnected`, `getDisconnectGraceRemaining`
  - ~160 lines of implementation

## Decisions Made

**Grace period: 90 seconds**
- Long enough for quick reconnection (network blip, page refresh)
- Short enough to not stall games indefinitely
- Standard duration for online card games

**Lobby disconnects: immediate removal**
- No active game state to preserve
- Simplifies room management
- No user expectations of reconnection in lobby

**Mark as eliminated on removal**
- Clear hand, faceUp, faceDown arrays when player removed
- Enables `GameEngine.nextActivePlayerIndex` to skip over removed player
- Consistent with game's elimination detection logic

**Turn timer pause/resume**
- Pauses when current player disconnects (fair - don't penalize network issues)
- Resumes when current player reconnects (seamless experience)
- No pause if non-current player disconnects (doesn't affect turn)

## Integration Points

**Integrates with:**
- Phase 08-02 turn timer: `clearTurnTimer()`, `startTurnTimer()`
- Phase 09-01 schemas: will use in WebSocket handlers (09-03)
- GameEngine: `nextActivePlayerIndex()` for turn advancement

**Provides for:**
- Phase 09-03: WebSocket handler implementation
- Phase 09-04: Client-side reconnection UI

## Verification Results

✅ All tests pass (300/300)
✅ Type-check passes (zero errors)
✅ Lint passes (zero errors)

**Test breakdown:**
- 13 new disconnect tests (all passing)
- 287 existing tests (all still passing)

## Next Phase Readiness

**Ready for Phase 09-03 (WebSocket handler integration):**
- Room.ts has all disconnect lifecycle methods
- Callbacks registered via `setDisconnectCallbacks`
- Tests verify all scenarios work correctly

**No blockers identified.**

## Self-Check: PASSED

✅ All created files exist:
- packages/server/src/rooms/__tests__/Room.disconnect.test.ts

✅ All commits exist:
- 04acef4 (test - RED phase)
- c7d481f (feat - GREEN phase)

## Deviations from Plan

None - plan executed exactly as written.

## Notes for Future Context

**Why mark as eliminated instead of removing from array?**
- GameState.players array indices must remain stable (used as currentPlayerIndex)
- Removing from array would shift indices, breaking turn advancement
- Clearing cards matches existing elimination detection pattern

**Why 90 seconds?**
- Balance between user patience and game flow
- Allows time for: network reconnection (~10s), page reload (~15s), frustrated typing/debugging (~60s)
- Not so long that other players lose interest

**Race condition handling:**
- `removePlayerAfterTimeout` checks `disconnectedPlayers.has()` before proceeding
- If player reconnected just before timeout fires, the timeout is a no-op
- Timer already cleared by `handlePlayerReconnect`, so this is defensive
