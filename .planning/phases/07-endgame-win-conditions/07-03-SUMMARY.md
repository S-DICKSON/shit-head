---
phase: 07-endgame-win-conditions
plan: 03
subsystem: game-engine
tags: [tdd, vitest, game-logic, endgame, blind-play, face-down-cards]

# Dependency graph
requires:
  - phase: 07-02
    provides: determinePlaySource, checkPlayerElimination, nextActivePlayerIndex, findShithead utilities
  - phase: 06-special-cards-burn-mechanics
    provides: canPlayOnPile for special card validation (2s, 8s, 10s, 7s)
  - phase: 05-core-game-engine-rules
    provides: GameEngine static method pattern and OperationResult type
provides:
  - playFaceDownBlind method for blind face-down card play
  - BlindPlayResult type for WebSocket handlers (state, card, playable flag)
  - Two-path blind play logic (playable → discard, unplayable → pickup pile)
affects: [07-04-websocket-handlers, 08-round-completion-state, client-ui-endgame]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Blind card reveal pattern with dual-path outcomes (playable/unplayable)
    - Extended OperationResult pattern with BlindPlayResult type
    - Pickup-on-fail mechanic (player returns to hand phase with pile)
    - Single-card blind play only (no multi-card from face-down)

key-files:
  created: []
  modified:
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/__tests__/game-engine.test.ts

key-decisions:
  - "BlindPlayResult type exported for WebSocket handler use (state, card, playable)"
  - "Unplayable blind card: entire pile + flipped card → hand, discard cleared"
  - "After pickup, player returns to hand phase (determinePlaySource → 'hand')"
  - "Single card only from face-down (no multi-card blind play)"
  - "Empty pile edge case: any blind card playable (canPlayOnPile behavior)"

patterns-established:
  - "Blind play validates source via determinePlaySource (must be 'face-down')"
  - "Two-outcome mechanic: Path A (playable) vs Path B (unplayable pickup)"
  - "Extended result type pattern for methods needing extra metadata"
  - "Pickup path uses spread operator to combine pile + flipped card"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Phase 7 Plan 3: Blind Face-Down Card Play Summary

**Two-path blind card reveal mechanic with playable-to-discard and unplayable-to-hand outcomes, exported BlindPlayResult type for WebSocket integration**

## Performance

- **Duration:** 3 min (206 seconds)
- **Started:** 2026-02-08T11:05:07Z
- **Completed:** 2026-02-08T11:08:33Z
- **Tasks:** 1 (TDD: RED → GREEN, no REFACTOR needed)
- **Files modified:** 2

## Accomplishments
- Blind face-down play validates source, flips card, checks playability via canPlayOnPile
- Playable path: card → discard pile, check elimination, detect game end
- Unplayable path: entire pile + card → hand, discard cleared, player returns to hand phase
- BlindPlayResult type exported for WebSocket handler metadata (card revealed, playable flag)
- All 24 comprehensive test scenarios pass (validation, playable, unplayable, edge cases)

## Task Commits

TDD task with 2 commits (RED → GREEN):

1. **Feature: GameEngine.playFaceDownBlind()** - `81bebda` (test - RED phase)
2. **Feature: GameEngine.playFaceDownBlind()** - `15f8b61` (feat - GREEN phase)

All 24 new tests passing (150 total).

## Files Created/Modified
- `packages/server/src/game/GameEngine.ts` - Added BlindPlayResult type and playFaceDownBlind static method. Validates phase/turn/source/index, extracts flipped card, determines playability via canPlayOnPile. Path A (playable): card to discard, check elimination, advance turn. Path B (unplayable): pile + card to hand, clear discard, advance turn. Uses nextActivePlayerIndex and findShithead for endgame handling.
- `packages/server/src/__tests__/game-engine.test.ts` - Added 24 test cases in playFaceDownBlind describe block. Created createEndgameState helper for face-down scenarios. Tests cover validation (7), playable path (7), unplayable path (7), edge cases (3). Imported GameState, Rank, Suit types.

## Decisions Made
- **BlindPlayResult type structure:** Exported type with three fields (state, card, playable) allows WebSocket handler to broadcast face-down-result message with revealed card and outcome.
- **Pickup path mechanics:** Entire discard pile PLUS flipped card go into hand using spread operator `[...discardPile, flippedCard]`. Discard pile cleared to empty array. Player not eliminated when picking up (they have hand cards).
- **After pickup, source is 'hand':** Failed blind play adds cards to hand, so determinePlaySource returns 'hand' on next turn. Verified with test case #20.
- **Single-card only:** No multi-card blind play (face-down cards are hidden, can't select multiple same-rank). This is a game rule constraint, not implementation choice.
- **Empty pile edge case:** When discardPile is empty, ANY card is playable via canPlayOnPile behavior. Verified with test case #10.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TDD cycle proceeded smoothly. All tests passed on first implementation. No refactoring needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 7 Plan 4 (WebSocket handlers for endgame):
- playFaceDownBlind returns BlindPlayResult with card and playable flag
- Handlers can broadcast face-down-result message with revealed card
- Handlers can differentiate success paths (playable vs unplayable) for different messages
- Player views can show updated hand after pickup (card-played vs pile-pickup)

No blockers. Blind play core logic complete, ready for integration.

---
*Phase: 07-endgame-win-conditions*
*Completed: 2026-02-08*

## Self-Check: PASSED

All files and commits verified:
- packages/server/src/game/GameEngine.ts: FOUND
- packages/server/src/__tests__/game-engine.test.ts: FOUND
- Commit 81bebda: FOUND
- Commit 15f8b61: FOUND
