---
phase: quick
plan: "015"
subsystem: client-ui
tags: [vue, ui, emergency-exit, ux]

requires: []
provides:
  - Leave game button in swap and playing phases
  - Confirmation modal for game exit
  - Escape hatch for stuck game states
affects: []

tech-stack:
  added: []
  patterns:
    - Event emission from child components to parent for modal display
    - Fixed positioning for persistent UI elements
    - Modal confirmation pattern for destructive actions

key-files:
  created: []
  modified:
    - packages/client/src/components/Game.vue
    - packages/client/src/components/PlayingPhase.vue
    - packages/client/src/components/SwapPhase.vue

decisions:
  - id: leave-button-placement
    decision: Top-left corner for leave button in active phases
    rationale: Consistent location, unobtrusive, out of way of gameplay elements
  - id: confirmation-required
    decision: Modal confirmation before leaving active game
    rationale: Prevents accidental exits during gameplay, especially on mobile
  - id: subtle-styling
    decision: Semi-transparent dark pill with backdrop blur
    rationale: Visible but unobtrusive, doesn't distract from gameplay

metrics:
  duration: 110s
  completed: 2026-02-15
---

# Quick Task 015: Leave Game Button Summary

**One-liner:** Emergency leave button in swap/playing phases with confirmation modal for stuck game states.

## What Was Built

Added a "Leave" button to the top-left corner during active gameplay phases (swap and playing) that allows players to exit when the game gets into an unrecoverable state.

**Key implementation details:**

1. **Leave button in active phases:**
   - Fixed position top-left corner (z-40)
   - Subtle styling: semi-transparent dark pill with backdrop blur
   - Present in both SwapPhase.vue and PlayingPhase.vue
   - Emits `leave` event to parent Game.vue component

2. **Confirmation modal:**
   - Full-screen overlay with backdrop (bg-black/60)
   - Centered modal with clear messaging
   - Two options: "Leave" (red, destructive) and "Stay" (neutral)
   - Prevents accidental exits during gameplay

3. **Leave flow:**
   - Click Leave button → `showLeaveConfirm` ref set to true
   - Modal appears over game
   - User clicks "Leave" → sends `leave-room` message, clears localStorage, navigates to home
   - User clicks "Stay" → modal dismisses, game continues

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add leave button and confirmation modal | a6df066 | Game.vue, PlayingPhase.vue, SwapPhase.vue |

## Testing

- ✅ Type-check passes
- ✅ Lint passes
- ✅ Leave button visible in playing phase
- ✅ Leave button visible in swap phase
- ✅ Confirmation modal blocks accidental exits

## Decisions Made

1. **Leave button placement:** Top-left corner for consistency and to avoid interfering with gameplay elements (turn timer bottom-right, player cards bottom)

2. **Confirmation required:** Modal confirmation prevents accidental taps, especially important on mobile devices where tap targets are smaller

3. **Subtle styling:** Semi-transparent background with backdrop blur makes button visible but unobtrusive during active gameplay

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Status:** Ready

**Delivered:**
- Emergency escape hatch for stuck game states
- User-friendly confirmation to prevent accidents
- Consistent leave flow across all active phases

**No blockers or concerns.**

## Self-Check: PASSED
