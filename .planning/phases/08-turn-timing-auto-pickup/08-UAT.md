---
status: diagnosed
phase: 08-turn-timing-auto-pickup
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md]
started: 2026-02-08T16:00:00Z
updated: 2026-02-08T16:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Turn timer visible during gameplay
expected: During the playing phase, a circular timer is visible showing the countdown in seconds (e.g., "42s"). The timer depletes from full to empty as time runs out.
result: pass

### 2. Turn timer ticks down each second
expected: The timer counts down every second, updating the displayed number and the circular progress ring smoothly.
result: pass

### 3. Auto-play on timeout (hand phase)
expected: When a player's turn timer reaches zero, the server automatically plays a valid card from their hand (or picks up the pile if no valid cards). Other players see the result as a normal card-played or pile-pickup message.
result: issue
reported: "doesn't show any of the cards just the countdown after the switch phase"
severity: major
diagnosis: NOT A BUG — card rendering UI is scoped for Phase 10, not Phase 8. Server auto-play works correctly, but no card UI exists to verify visually.

### 4. Auto-play on timeout (face-up phase)
expected: When a player with no hand cards times out, the server auto-plays a valid face-up card (or picks up pile if none valid). Game continues normally.
result: issue
reported: "no cards rendering"
severity: major
diagnosis: Same as Test 3 — no card rendering UI exists yet (Phase 10 scope).

### 5. Auto-play on timeout (face-down phase)
expected: When a player with no hand or face-up cards times out, the server plays a random face-down card blindly. If the card is unplayable, the player picks up the pile.
result: issue
reported: "cannot verify autopick as no card rendering"
severity: major
diagnosis: Same as Test 3 — cannot verify visually without card UI (Phase 10 scope).

### 6. Timer resets on turn change
expected: When the turn changes to the next player, the timer resets to the full duration and begins counting down again for the new player.
result: skipped

### 7. Burn on auto-play gives same player another turn
expected: If an auto-played card triggers a burn (10 or four-of-a-kind), the same player gets another turn instead of advancing to the next player.
result: skipped

## Summary

total: 7
passed: 2
issues: 3
pending: 0
skipped: 2

## Gaps

- truth: "Cards are visible during playing phase so players can interact with the game"
  status: not_a_bug
  reason: "User reported: doesn't show any of the cards just the countdown after the switch phase"
  severity: major
  test: 3
  root_cause: "Card rendering UI is planned for Phase 10 (Client UI & Card Interactions). Phase 8 only delivers turn timer + auto-play server logic. Game.vue playing phase has placeholder text and TurnTimer only. Data pipeline works — useGameSocket populates all card data, but no UI component consumes it yet."
  artifacts:
    - path: "packages/client/src/components/Game.vue"
      issue: "Playing phase block (lines 27-38) only renders TurnTimer + placeholder"
  missing:
    - "Card rendering components for playing phase (Phase 10 scope)"
  debug_session: ".planning/debug/08-card-rendering.md"
