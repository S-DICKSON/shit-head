---
status: complete
phase: 15-mobile-ux-improvements
source: [15-01-SUMMARY.md, 15-02-SUMMARY.md]
started: 2026-02-09T22:00:00Z
updated: 2026-02-09T22:06:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Double-Tap Pickup Confirmation
expected: During your turn, tap "Pick Up Pile" once — it should NOT pick up immediately. Button text changes to "Tap Again to Pick Up" with yellow ring pulse. Tap again to confirm. Waiting too long resets it. Instruction text visible during your turn.
result: pass

### 2. Compact Fixed Timer Position
expected: The turn timer is a small circle (48px on mobile, 64px on desktop) fixed in the bottom-right corner of the screen. It stays in place as you scroll. It shows just a number (no "s" suffix). It does not overlap or block card interactions.
result: pass

### 3. Semi-Transparent 8-Card on Discard Pile
expected: When an 8 is played on the discard pile, it appears at 50% opacity with a dashed purple border. An "8 is invisible" label appears below. You can see the card underneath through the transparency.
result: pass

### 4. Turn Sound Notification
expected: When it becomes your turn, a short beep sound plays (a brief tone). This helps you notice your turn on mobile when not looking at the screen.
result: pass

### 5. Mobile Card Grouping (> 5 cards)
expected: On a mobile-width screen, when you have more than 5 cards in hand, the view switches from individual card buttons to a grouped view showing cards by rank (e.g., "7" with +/- quantity selectors). You can select how many of each rank to play.
result: pass

### 6. Sticky Play/Pickup Buttons
expected: On mobile with many cards, when scrolling through your hand, the Play and Pick Up buttons remain sticky at the bottom of the screen (not scrolled out of view). They have a semi-transparent backdrop.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
