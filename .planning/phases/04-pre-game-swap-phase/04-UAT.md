---
status: diagnosed
phase: 04-pre-game-swap-phase
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md]
started: 2026-02-07T23:00:00Z
updated: 2026-02-07T23:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Lobby to swap phase navigation
expected: After creating a room with 2+ players and clicking "Start Game", a 3-second countdown plays, then all players are navigated to the game screen showing the swap phase UI.
result: issue
reported: "the 0 flashes but nothing happens after does not show the swap phase"
severity: major

### 2. Cards displayed after dealing
expected: On the swap phase screen, you see your 3 hand cards (with rank and suit), 3 face-up cards, and 3 face-down cards (backs only). Opponent sections show their face-up cards and card counts.
result: skipped
reason: Swap phase screen unreachable due to test 1 failure

### 3. Timer countdown visible
expected: A countdown timer is displayed showing seconds remaining (starts at 30 or near 30). It counts down each second as a simple number (e.g., "27s").
result: skipped
reason: Swap phase screen unreachable due to test 1 failure

### 4. Tap-tap card swap
expected: Tap one hand card (it gets a blue ring highlight), then tap one face-up card — the two cards swap positions. Hand card moves to face-up, face-up card moves to hand.
result: skipped
reason: Swap phase screen unreachable due to test 1 failure

### 5. Auto-deselect on re-tap
expected: Tap a card to select it (blue ring appears). Tap the same card again — the selection is removed (blue ring disappears) without performing a swap.
result: skipped
reason: Swap phase screen unreachable due to test 1 failure

### 6. Ready button
expected: A "Ready" button is visible. Clicking it marks you as ready (shows a checkmark or ready indicator). Other players can see your ready status.
result: skipped
reason: Swap phase screen unreachable due to test 1 failure

### 7. Swap after ready un-readies
expected: After marking ready, if you swap cards, your ready status is automatically removed (you become un-ready). You need to click Ready again.
result: skipped
reason: Swap phase screen unreachable due to test 1 failure

### 8. Opponent face-up cards update in real-time
expected: When another player swaps their cards, their face-up cards update on your screen in real-time without page refresh.
result: skipped
reason: Swap phase screen unreachable due to test 1 failure

### 9. Phase transition overlay
expected: When the timer expires (or all players ready up), a transition overlay shows "Let's play!" message, and card selection is disabled during the transition.
result: skipped
reason: Swap phase screen unreachable due to test 1 failure

## Summary

total: 9
passed: 0
issues: 1
pending: 0
skipped: 8

## Gaps

- truth: "After starting game, players navigate from lobby to swap phase screen"
  status: failed
  reason: "User reported: the 0 flashes but nothing happens after does not show the swap phase"
  severity: major
  test: 1
  root_cause: "Server never sends 'game-started' message (was replaced by 'game-dealt' in Phase 3), but Lobby.vue waits for 'game-started' to trigger router.push('/game'). Navigation never fires."
  artifacts:
    - path: "packages/client/src/components/Lobby.vue"
      issue: "Line 69 waits for 'game-started' message that server never sends"
    - path: "packages/server/src/websocket/handlers.ts"
      issue: "Sends 'game-dealt' after countdown but never sends 'game-started'"
    - path: "packages/shared/src/schemas/messages.ts"
      issue: "Dead gameStartedSchema that nothing sends"
  missing:
    - "Change Lobby.vue to navigate on 'game-dealt' instead of 'game-started'"
    - "Clean up dead gameStartedSchema from shared types"
  debug_session: ".planning/debug/lobby-navigation-failure.md"
