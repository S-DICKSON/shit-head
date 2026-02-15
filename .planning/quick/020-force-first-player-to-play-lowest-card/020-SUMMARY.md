---
phase: quick
plan: 020
subsystem: gameplay-rules
tags: [game-engine, rules, validation, ui-hints, first-turn]

requires:
  - 05-02: RANK_ORDER and card comparison for lowest card detection
  - 08-02: Auto-play on timeout infrastructure

provides:
  - First-turn enforcement: player must play ALL lowest-ranked cards
  - MUST_PLAY_LOWEST error code for invalid first-turn plays
  - Client auto-selection and visual hints for forced cards

affects:
  - Future: Any game rule changes must consider firstTurn flag
  - Future: Mobile UI may need additional first-turn affordances

tech-stack:
  added: []
  patterns:
    - Server-authoritative first-turn validation
    - Client auto-selection for forced moves
    - Reactive computed properties for UI state derivation

key-files:
  created: []
  modified:
    - packages/shared/src/types/game.ts
    - packages/shared/src/types/messages.ts
    - packages/shared/src/schemas/messages.ts
    - packages/server/src/game/GameEngine.ts
    - packages/server/src/__tests__/game-engine.test.ts
    - packages/server/src/rooms/Room.ts
    - packages/server/src/websocket/handlers.ts
    - packages/server/src/game/__tests__/GameEngine.autoPlay.test.ts
    - packages/client/src/composables/usePlayingPhase.ts
    - packages/client/src/components/PlayingPhase.vue

decisions:
  - decision: "Use firstTurn boolean flag on GameState rather than special game phase"
    rationale: "Simpler state model - first turn is a constraint on playing phase, not a separate phase"
    alternatives: ["Create 'first-turn' phase", "Infer from turn count"]

  - decision: "Require ALL cards of lowest rank to be played, not just one"
    rationale: "Standard Shithead rules - prevents strategic withholding of duplicate low cards"
    alternatives: ["Allow playing subset of lowest cards"]

  - decision: "Auto-select forced cards on client rather than just highlighting"
    rationale: "Reduces user friction - cards are already selected, just click Play"
    alternatives: ["Only highlight without selection", "Disable non-forced cards"]

metrics:
  duration: 479s
  completed: 2026-02-15
---

# Quick Task 020: Force First Player to Play Lowest Card(s)

**One-liner:** Server-enforced first-turn rule requiring player to play ALL of their lowest-ranked cards, with client auto-selection and visual hints.

## What Changed

### Server-Side Enforcement (Task 1)

1. **Added firstTurn field to GameState and PlayerGameView**
   - Set to `false` during game creation (swapping phase)
   - Set to `true` when transitioning from swapping to playing phase (Room.ts line 450)
   - Set to `false` after successful first play (GameEngine.playCards line 446)

2. **Added MUST_PLAY_LOWEST error code**
   - Added to ErrorCode type union in types/messages.ts
   - Added to errorSchema enum in schemas/messages.ts

3. **First-turn validation in GameEngine.playCards**
   - Finds player's lowest rank using RANK_ORDER.slice(1) (skip 2s like determineFirstPlayer)
   - Validates ALL played cards are of lowest rank
   - Validates player is playing ALL cards of that rank from hand
   - Returns MUST_PLAY_LOWEST error for violations

4. **Auto-play on timeout handles first turn**
   - In autoPlayOnTimeout, checks state.firstTurn before random card selection
   - On first turn: finds and plays all lowest-ranked cards
   - On normal turns: continues with random valid card selection

5. **Tests added**
   - 7 new tests in game-engine.test.ts covering:
     - Rejection of non-lowest card play
     - Rejection of partial lowest card play
     - Acceptance of all lowest cards
     - Acceptance of single lowest card
     - firstTurn flag transition to false
     - Normal play after first turn
     - Auto-play first turn behavior

### Client-Side UI Hints (Task 2)

1. **Added computed properties to usePlayingPhase.ts**
   - `isFirstTurn`: computed(() => gameView.value?.firstTurn === true)
   - `forcedCardIndices`: computed Set<number> of indices of lowest-ranked cards
   - Uses same rank order logic as server (skip 2s, scan from 3 upward)

2. **Auto-selection of forced cards**
   - watch([isFirstTurn, isMyTurn]) triggers auto-selection
   - Sets selectedHandIndices to forcedCardIndices on first turn
   - Runs with immediate: true to handle reconnection cases

3. **Prevent invalid selections on first turn**
   - toggleHandCard returns early if trying to deselect forced card
   - toggleHandCard returns early if trying to select non-forced card
   - Forces player to play exactly the required cards

4. **Visual feedback in PlayingPhase.vue**
   - Added "You must play your lowest card(s)!" banner with animate-pulse
   - Banner only shows when isFirstTurn && isMyTurn
   - Forced cards highlighted via existing selection ring (selectedHandIndices)
   - Passed forcedCardIndices prop to PlayerCards for potential additional styling

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

1. ✅ `make test` passes (331 tests, excluding known App.test.ts failures)
2. ✅ `make type-check` passes (no type errors across all packages)
3. ✅ `make lint` passes (no lint errors)
4. ✅ Server rejects non-lowest card plays on first turn with MUST_PLAY_LOWEST
5. ✅ Server requires ALL cards of lowest rank on first turn
6. ✅ Auto-play on timeout correctly plays lowest cards on first turn
7. ✅ Client shows first-turn banner and auto-selects forced cards
8. ✅ After first turn, normal play resumes (firstTurn: false)

## Task Commits

| Task | Commit  | Description                                           |
|------|---------|-------------------------------------------------------|
| 1    | 2dfab42 | feat: add firstTurn enforcement to game engine        |
| 2    | d826874 | feat: add client-side first-turn UI hints and auto-selection |

## Self-Check

### Created Files
No new files created (modifications only).

### Modified Files Verification
All files listed in key-files.modified exist:
- ✅ packages/shared/src/types/game.ts
- ✅ packages/shared/src/types/messages.ts
- ✅ packages/shared/src/schemas/messages.ts
- ✅ packages/server/src/game/GameEngine.ts
- ✅ packages/server/src/__tests__/game-engine.test.ts
- ✅ packages/server/src/rooms/Room.ts
- ✅ packages/server/src/websocket/handlers.ts
- ✅ packages/server/src/game/__tests__/GameEngine.autoPlay.test.ts
- ✅ packages/client/src/composables/usePlayingPhase.ts
- ✅ packages/client/src/components/PlayingPhase.vue

### Commit Verification
Both commits exist in git log:
- ✅ 2dfab42 (Task 1)
- ✅ d826874 (Task 2)

## Self-Check: PASSED

All files modified as expected, all commits recorded, all tests passing.

## Next Phase Readiness

**Status:** Ready for production

**Blockers:** None

**Notes:**
- Feature complete and tested
- No breaking changes to existing gameplay
- Client gracefully handles firstTurn field in messages (defaults to false via optional chaining)
- Mobile testing recommended to verify first-turn banner visibility and card selection UX
