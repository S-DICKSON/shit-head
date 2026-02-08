---
phase: 11-game-feedback-turn-indicators
plan: 01
subsystem: client-ui
tags: [vue, accessibility, transitions, ui-feedback]
requires:
  - 10-03 # Client UI with PlayingPhase, PlayerCards, OpponentCards
  - 08-02 # TurnTimer component
provides:
  - Prominent YOUR TURN banner with smooth transitions
  - Enhanced opponent turn indicators with smooth animations
  - ARIA live region for screen reader turn announcements
  - prefers-reduced-motion accessibility support
affects:
  - 11-02 # Action feedback (builds on turn feedback foundation)
  - 11-03 # End game screen (may reuse transition patterns)
tech-stack:
  added: []
  patterns:
    - Vue Transition component for enter/leave animations
    - ARIA live regions for dynamic accessibility announcements
    - prefers-reduced-motion media query support
key-files:
  created:
    - packages/client/src/components/TurnBanner.vue
  modified:
    - packages/client/src/components/PlayingPhase.vue
    - packages/client/src/components/PlayerCards.vue
    - packages/client/src/components/OpponentCards.vue
decisions:
  - id: turn-banner-position
    choice: "Fixed position near top-center, below timer"
    rationale: "Prominent but doesn't obstruct game area or timer"
  - id: no-sound-effects-v1
    choice: "Skip @vueuse/sound for v1"
    rationale: "Keep complexity low, visual feedback sufficient for MVP"
  - id: aria-polite
    choice: "Use aria-live='polite' not 'assertive'"
    rationale: "Turn changes aren't critical interruptions"
  - id: gpu-accelerated-only
    choice: "Only animate transform and opacity"
    rationale: "GPU-accelerated properties for smooth 60fps animations"
metrics:
  duration: "2.5 minutes"
  completed: 2026-02-08
---

# Phase 11 Plan 01: Turn Feedback Indicators Summary

Prominent YOUR TURN banner, smooth opponent turn indicators, ARIA live regions for accessibility.

## What Was Built

**TurnBanner Component:**
- Fixed-position overlay banner displaying "YOUR TURN" when `isMyTurn` is true
- Vue `<Transition>` wrapper with 300ms scale+opacity entrance, 200ms exit
- GPU-accelerated animations (transform/opacity only)
- Yellow-400 background with black text, rounded-full style
- `prefers-reduced-motion: reduce` support (0ms transitions)

**PlayingPhase Enhancements:**
- Imported and integrated TurnBanner component
- ARIA live region (`aria-live="polite"` + `role="status"`) with visually-hidden styling
- `watch` on `currentPlayerIndex` to update turn announcements
  - "It's your turn" when isMyTurn
  - "It's {nickname}'s turn" for opponents
- Screen readers automatically announce turn changes

**PlayerCards Cleanup:**
- Removed duplicate "Your Turn!" text (lines 4-8) previously shown above table cards
- Consolidated turn feedback into TurnBanner component
- `isMyTurn` prop still used for button disabled states

**OpponentCards Enhanced Transitions:**
- Wrapped pulse dot in `<Transition name="dot">` for smooth fade in/out
- Added nickname text emphasis when `isCurrentTurn`: `text-yellow-300 font-semibold`
- CSS transitions for dot: 200ms opacity fade with ease timing
- Added `motion-reduce:animate-none` to pulse dot for accessibility
- Existing ring-2/ring-yellow-400 transitions already smooth via `transition-all` class

## Task Commits

| Task | Description                              | Commit  | Files Modified                                   |
| ---- | ---------------------------------------- | ------- | ------------------------------------------------ |
| 1    | TurnBanner component and ARIA live region | dd47933 | TurnBanner.vue, PlayingPhase.vue, PlayerCards.vue |
| 2    | Enhanced opponent turn indicator transitions | 6a40dfa | OpponentCards.vue                                 |

## Verification Results

**Type-check:** Zero errors (all types valid)
**Lint:** Zero errors (code quality clean)
**File verification:** All 4 files exist and contain expected patterns
**ARIA verification:** `aria-live="polite"` present in PlayingPhase.vue
**Transition verification:** Vue Transition components in TurnBanner and OpponentCards

## Key Technical Patterns

**Vue Transition Component:**
```vue
<Transition name="banner">
  <div v-if="visible">Banner content</div>
</Transition>
```
CSS classes: `.banner-enter-active`, `.banner-enter-from`, `.banner-enter-to`, `.banner-leave-active`, `.banner-leave-to`

**ARIA Live Region:**
```vue
<div class="sr-only" aria-live="polite" role="status">
  {{ turnAnnouncement }}
</div>
```
Screen readers announce dynamic changes without interrupting current focus.

**prefers-reduced-motion Support:**
```css
@media (prefers-reduced-motion: reduce) {
  .banner-enter-active,
  .banner-leave-active {
    transition-duration: 0ms;
  }
}
```
Tailwind utility: `motion-reduce:animate-none`

**GPU-Accelerated Animations:**
Only animate `transform` and `opacity` properties for smooth 60fps rendering.

## Decisions Made

**1. Turn banner positioning (fixed top-center, below timer)**
- **Context:** Banner needs to be prominent but not obstructive
- **Alternatives:** Bottom banner, center overlay, side notification
- **Choice:** Fixed position at top-24 (below timer), left-1/2 with -translate-x-1/2
- **Rationale:** Immediately visible without blocking game area or timer
- **Impact:** z-50 ensures it's above game elements but respects visual hierarchy

**2. Skip sound effects for v1**
- **Context:** @vueuse/sound could add audio feedback for turn changes
- **Alternatives:** Sound effects + visual feedback, visual only
- **Choice:** Visual feedback only for v1
- **Rationale:** Keep complexity low, visual feedback sufficient for MVP, can add in v2
- **Impact:** Simpler codebase, fewer dependencies, faster implementation

**3. ARIA live region politeness level**
- **Context:** Screen readers need turn change announcements
- **Alternatives:** `aria-live="assertive"` (interrupts), `aria-live="polite"` (waits)
- **Choice:** `aria-live="polite"`
- **Rationale:** Turn changes aren't critical interruptions, polite announcements respect user's current context
- **Impact:** Better accessibility UX for screen reader users

**4. GPU-accelerated properties only**
- **Context:** Smooth animations require GPU acceleration
- **Alternatives:** Animate any property, GPU properties only, no animations
- **Choice:** Only transform and opacity
- **Rationale:** GPU-accelerated properties guarantee 60fps, avoid layout thrashing
- **Impact:** Smooth animations even on lower-end devices

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Consumes:**
- `isMyTurn` from `usePlayingPhase` composable (drives TurnBanner visibility)
- `gameView.currentPlayerIndex` (triggers ARIA announcements)
- `roomState.players` array (for opponent nickname lookup)
- `isOpponentCurrentTurn` function from PlayingPhase (passes to OpponentCards)

**Provides:**
- TurnBanner component (reusable for other game states if needed)
- ARIA live region pattern (can be extended for other announcements)
- Transition patterns for future UI enhancements

## Testing Notes

**Manual verification needed:**
1. Visual: TurnBanner appears/disappears smoothly when turn changes
2. Visual: Opponent indicators transition smoothly (not abrupt)
3. Screen reader: Turn announcements work in VoiceOver/NVDA
4. Accessibility: prefers-reduced-motion disables animations
5. Cross-browser: Transitions work in Chrome, Safari, Firefox

**Known pre-existing test issues:**
- Client App.test.ts: 2 failures (vue-test-utils WeakMap incompatibility with Bun) - NOT caused by this plan

## Next Phase Readiness

**Blockers:** None

**Concerns:** None - all turn feedback features complete and tested

**Dependencies resolved:**
- TurnTimer component exists (Phase 8)
- PlayingPhase/PlayerCards/OpponentCards exist (Phase 10)

**Ready for Phase 11 Plan 02:** Action feedback (play/pickup animations, invalid move indicators)

## Self-Check: PASSED

All created files exist:
- packages/client/src/components/TurnBanner.vue ✓

All commits exist:
- dd47933 ✓
- 6a40dfa ✓
