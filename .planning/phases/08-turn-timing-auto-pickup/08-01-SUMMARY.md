---
phase: 08-turn-timing-auto-pickup
plan: 01
subsystem: game-engine
tags: [turn-timer, auto-play, tdd, websocket-protocol]
requires: [05-core-game-engine-rules, 07-face-down-blind-play]
provides: [turn-timer-tick-message, auto-play-on-timeout]
affects: [08-02-room-timer-integration, 08-03-client-timer-display]
tech-stack:
  added: []
  patterns: [tdd-red-green-refactor, random-card-selection]
decisions:
  - id: auto-play-single-card
    choice: Auto-play picks ONE random valid card, not multiple
    rationale: Keep auto-play simple and non-strategic (user decision from CONTEXT.md)
  - id: auto-play-result-type
    choice: Export AutoPlayResult with wasBlindPlay flag and optional blind card fields
    rationale: Room.ts needs to distinguish blind plays for proper WebSocket event broadcasting
key-files:
  created:
    - packages/server/src/game/__tests__/GameEngine.autoPlay.test.ts
  modified:
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts
    - packages/server/src/game/GameEngine.ts
metrics:
  duration: 4m 1s
  completed: 2026-02-08
---

# Phase 08 Plan 01: Turn Timer Schema & Auto-Play Logic Summary

**One-liner:** Turn timer message protocol and TDD-implemented autoPlayOnTimeout method with random valid card selection across all play phases

## What Was Built

### Turn Timer Message Protocol
- Added `turnTimerTickSchema` to server message union in shared package
- Schema validates `timeRemaining` (0-45 seconds) and `currentPlayerIndex`
- Exported `TurnTimerTickMessage` type for type-safe WebSocket handling

### Auto-Play Logic (TDD Implementation)
- Implemented `GameEngine.autoPlayOnTimeout(state, playerId)` static method
- Follows RED-GREEN-REFACTOR TDD cycle with 8 comprehensive test cases
- Handles all three play sources:
  - **Hand:** Random valid card selection, falls back to pile pickup
  - **Face-up:** Random valid face-up card selection, falls back to pile pickup
  - **Face-down:** Random blind play using existing playFaceDownBlind logic
- Exported `AutoPlayResult` type with `wasBlindPlay` flag for Room integration
- Respects burn mechanics (10 or four-of-a-kind = same player goes again)

## TDD Test Coverage

All 8 test cases pass:

1. Returns error if phase is not 'playing'
2. Returns error if player not found
3. Plays a valid card from hand when valid cards exist
4. Picks up pile when no valid hand cards exist
5. Plays a valid face-up card when in face-up phase
6. Picks up pile when no valid face-up cards exist
7. Plays random face-down card blindly
8. After auto-play burn (10), same player goes again

## Task Commits

| Task | Type | Commit | Description |
|------|------|--------|-------------|
| 1 | feat | ab7a8d7 | Add turn-timer-tick message schema and type |
| 2 (RED) | test | bff3e90 | Add failing tests for GameEngine.autoPlayOnTimeout |
| 2 (GREEN) | feat | 80a76d8 | Implement GameEngine.autoPlayOnTimeout |

## Verification Results

```bash
make test-server  # ✓ All 287 tests pass (8 new auto-play tests)
make type-check   # ✓ Zero TypeScript errors
make lint         # ✓ Zero lint errors
```

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 1 - Bug] Removed unused imports**
- **Found during:** Task 2 lint verification
- **Issue:** Test file imported `Card` and `PlayerGameState` types but never used them
- **Fix:** Removed unused type imports from test file
- **Files modified:** `GameEngine.autoPlay.test.ts`
- **Commit:** Amended to 80a76d8

No other deviations - plan executed exactly as written.

## Integration Points

### Consumed By (Plan 08-02: Room Timer Integration)
```typescript
// Room.ts will call this on turn timeout
const result = GameEngine.autoPlayOnTimeout(this.gameState, playerId);

if (result.success && result.data) {
  const { state, wasBlindPlay, blindCard, blindPlayable } = result.data;

  if (wasBlindPlay) {
    // Broadcast face-down-result message
    this.broadcast({ type: 'face-down-result', card: blindCard!, playable: blindPlayable! });
  } else {
    // Broadcast card-played or pile-pickup message
  }
}
```

### Consumed By (Plan 08-03: Client Timer Display)
```typescript
// Client will receive turn-timer-tick messages
socket.on('message', (msg: ServerMessage) => {
  if (msg.type === 'turn-timer-tick') {
    updateTimerDisplay(msg.timeRemaining);
    highlightCurrentPlayer(msg.currentPlayerIndex);
  }
});
```

## Next Phase Readiness

**Phase 08-02 (Room Timer Integration) is READY:**
- ✅ Turn timer tick message schema defined
- ✅ Auto-play logic fully tested and working
- ✅ AutoPlayResult type exported for Room.ts
- ✅ All three play sources (hand, face-up, face-down) handled

**Blockers:** None

**Concerns:** None - auto-play logic is deterministic and well-tested

## Known Issues

None. All tests pass, zero lint errors, zero type errors.

## Lessons Learned

### What Went Well
- TDD approach caught edge cases early (burn logic, play source validation)
- Reusing existing methods (playCards, playFromFaceUp, playFaceDownBlind) kept implementation DRY
- Random card selection using `Math.random()` is sufficient for game logic (no crypto needed)

### What Could Be Better
- Initial test file had unused imports (caught by linter)
- Could add more granular tests for four-of-a-kind burn detection in auto-play context

### Code Quality Notes
- All existing tests continue to pass (no regressions)
- Auto-play logic follows same patterns as existing GameEngine methods
- Type safety maintained throughout (AutoPlayResult, OperationResult)

## Self-Check: PASSED

All created files exist:
- ✓ packages/server/src/game/__tests__/GameEngine.autoPlay.test.ts

All commits exist:
- ✓ ab7a8d7
- ✓ bff3e90
- ✓ 80a76d8
