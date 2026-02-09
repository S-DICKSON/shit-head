---
phase: 15
plan: 01
subsystem: client-mobile-ux
tags: [mobile, ux, double-tap, timer, transparency, vue, composables]

requires:
  - "09-01: PlayingPhase layout and component structure"
  - "09-02: PlayerCards component for hand and table cards"
  - "09-03: TurnTimer component"
  - "09-04: DiscardPile component"

provides:
  - "useDoubleTap composable for double-tap detection"
  - "Double-tap pickup confirmation to prevent accidental pile pickups"
  - "Compact fixed-position timer in bottom-right corner"
  - "Semi-transparent 8-card rendering on discard pile"

affects:
  - "Future mobile playtesting: These three features address top mobile UX pain points"

tech-stack:
  added:
    - composables: ["useDoubleTap"]
  patterns:
    - "Reusable composable for double-tap gesture detection with timeout"
    - "Fixed-position overlay with iOS safe area support"
    - "Conditional opacity and border styling for special card rules"

key-files:
  created:
    - packages/client/src/composables/useDoubleTap.ts
  modified:
    - packages/client/src/components/PlayerCards.vue
    - packages/client/src/components/TurnTimer.vue
    - packages/client/src/components/PlayingPhase.vue
    - packages/client/src/components/DiscardPile.vue

decisions:
  - id: d15-01-01
    title: "300ms double-tap threshold for pickup confirmation"
    rationale: "300ms is standard mobile double-tap threshold (iOS Safari uses 300ms). Provides good balance between preventing accidental taps while not feeling sluggish."
    alternatives: ["200ms (too fast), 500ms (too slow)"]

  - id: d15-01-02
    title: "Fixed bottom-right position for timer with safe area support"
    rationale: "Bottom-right keeps timer visible without blocking gameplay. iOS safe area support prevents timer from being hidden by home indicator. Z-index 40 ensures it stays on top."
    alternatives: ["Top-right (blocks opponent info), Bottom-left (conflicts with some future mobile controls)"]

  - id: d15-01-03
    title: "50% opacity with dashed purple border for 8-cards"
    rationale: "50% opacity makes underlying card clearly visible while maintaining 8-card presence. Purple color distinguishes 8s from standard red/black suits. Dashed border reinforces 'special rule' nature."
    alternatives: ["Full transparency (loses 8-card context), 30% opacity (too faint), solid border (looks like regular card)"]

metrics:
  duration: 281
  completed: 2026-02-09
---

# Phase 15 Plan 01: Mobile UX Safety & Visibility Improvements Summary

**One-liner:** Double-tap pickup confirmation, compact fixed bottom-right timer, and semi-transparent 8-card rendering for mobile gameplay.

## What Was Built

Implemented three high-impact mobile UX improvements based on playtesting feedback:

1. **Double-tap pickup confirmation**: Created reusable `useDoubleTap` composable (300ms threshold) with visual feedback. Pickup button now requires two taps within 300ms, showing "Tap Again to Pick Up" with yellow ring pulse on first tap. Instruction text "Double-tap to pick up pile" displayed during player's turn.

2. **Compact fixed timer**: Repositioned TurnTimer from flow layout to fixed bottom-right overlay. Reduced size to 48px (mobile) / 64px (desktop) circle. Added iOS safe area support with `env()` padding. Removed "s" suffix from display (just shows number).

3. **Semi-transparent 8-cards**: When an 8 is on top of the discard pile, it renders at 50% opacity with dashed purple border and "8 is invisible" label. Makes underlying effective card visible through transparency.

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create useDoubleTap composable and wire into PlayerCards | a338ef4 | useDoubleTap.ts, PlayerCards.vue |
| 2 | Reposition TurnTimer to compact fixed bottom-right | e2f2a10 | TurnTimer.vue, PlayingPhase.vue |
| 3 | Add semi-transparent 8-card rendering | 7a15ef0 | DiscardPile.vue |

## Technical Implementation

**useDoubleTap Composable:**
- Tracks `lastTapTime` and `isWaitingForSecondTap` as reactive refs
- `handleTap()` compares current time against last tap with configurable threshold
- Auto-resets after threshold expires using setTimeout
- Returns `{ handleTap, isWaitingForSecondTap, reset }` interface

**PlayerCards Double-Tap Integration:**
- Switched from `defineEmits` return value to `const emit = defineEmits<{...}>()` pattern for script setup usage
- Changed pickup button from direct `@click="$emit('pickup-pile')"` to `@click="handlePickupTap"`
- Conditional button text: `pickupConfirming ? 'Tap Again to Pick Up' : 'Pick Up Pile'`
- Visual feedback: `ring-4 ring-yellow-400 animate-pulse` when confirming
- Instruction text shown only when `isMyTurn` is true

**TurnTimer Fixed Position:**
- Changed from `w-20 h-20` inline-block to `w-12 h-12 sm:w-16 sm:h-16` with custom `.timer-fixed` class
- Reduced SVG viewBox from 80x80 to 64x64, radius from 36 to 28, stroke-width from 6 to 4
- Updated circle coordinates to `cx="32" cy="32"` and transform to `rotate(-90 32 32)`
- Added scoped CSS with `position: fixed; bottom: 1rem; right: 1rem; z-index: 40;`
- iOS safe area support: `@supports (padding: env(safe-area-inset-bottom))` with `max()` fallback

**DiscardPile Transparency:**
- Added `isTransparentEight(card: Card, index: number)` helper checking if card is top 8
- Added `topCardIsEight` computed property for label visibility
- Conditional classes: `isTransparentEight(card, i) ? 'opacity-50 border-dashed border-2 border-purple-400' : 'border border-gray-300'`
- Label: `<div v-if="topCardIsEight" class="text-xs text-purple-300 mt-0.5 text-center">8 is invisible</div>`

## Verification

- `make type-check`: Passed (all tasks)
- `make lint`: Passed (all tasks)
- `make build`: Passed (final verification)

All verification criteria met with zero errors.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Status:** Ready

**What's Next:**
- Phase 15 has additional plans for mobile UX improvements (TBD based on further playtesting)
- This plan addresses the top three mobile pain points from initial playtesting
- All changes are additive and non-breaking

**Outstanding:**
- No blockers or concerns
- Mobile playtesting should validate these improvements reduce accidental pickups and improve visibility

## Self-Check: PASSED
