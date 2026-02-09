---
phase: 15-mobile-ux-improvements
plan: 02
subsystem: ui
tags: [vue, composables, mobile, web-audio-api, responsive-design]

# Dependency graph
requires:
  - phase: 15-01
    provides: Double-tap confirmation, compact timer, 8-card transparency
provides:
  - Turn sound notification using Web Audio API
  - Mobile card grouping by rank with quantity selectors
  - Sticky action buttons for constant accessibility
  - Responsive layout switching based on screen width
affects: [future mobile UX improvements, sound effects system]

# Tech tracking
tech-stack:
  added: [Web Audio API (programmatic beep generation)]
  patterns: [Mobile detection with resize listener, grouped view threshold pattern, sticky button pattern]

key-files:
  created:
    - packages/client/src/composables/useSoundEffects.ts
    - packages/client/src/composables/useCardGrouping.ts
  modified:
    - packages/client/src/components/TurnBanner.vue
    - packages/client/src/components/PlayerCards.vue
    - packages/client/src/components/PlayingPhase.vue

key-decisions:
  - "Web Audio API for programmatic beep generation (no external audio files needed)"
  - "Mobile threshold: grouped view activates when > 5 cards in hand"
  - "Screen width breakpoint: 640px matches Tailwind sm: breakpoint"
  - "Sticky buttons with backdrop blur for accessibility during scroll"
  - "880Hz sine wave beep at 0.15 volume for turn notifications"

patterns-established:
  - "Module-level AudioContext singleton for sound effects"
  - "Conditional rendering based on screen width + card count threshold"
  - "Grouped card selection via +/- controls maps to original card indices"
  - "play-grouped-cards event pattern for mobile card selection"

# Metrics
duration: 4min
completed: 2026-02-09
---

# Phase 15 Plan 02: Mobile UX Improvements - Turn Alerts & Card Grouping Summary

**Turn sound notifications via Web Audio API beep generator, mobile card grouping by rank with +/- quantity selectors, and sticky action buttons for scrollable hands**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-09T23:09:55Z
- **Completed:** 2026-02-09T23:13:40Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Turn notifications play 150ms beep when banner appears (ensures players notice their turn on mobile)
- Mobile card grouping prevents tiny unmanageable cards on small screens (> 5 cards triggers grouped view)
- Sticky play/pickup buttons remain accessible when scrolling through large hands
- Responsive design maintains desktop/laptop experience unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sound effects composable and integrate with TurnBanner** - `c575019` (feat)
2. **Task 2: Create card grouping composable and update PlayerCards with mobile layout** - `3a30423` (feat)

## Files Created/Modified
- `packages/client/src/composables/useSoundEffects.ts` - Web Audio API beep generator for turn notifications (880Hz sine wave, 150ms, 0.15 volume)
- `packages/client/src/composables/useCardGrouping.ts` - Card grouping by rank with selection count tracking and index mapping
- `packages/client/src/components/TurnBanner.vue` - Integrated sound notification on banner visibility
- `packages/client/src/components/PlayerCards.vue` - Conditional mobile grouped view with +/- selectors, sticky action buttons
- `packages/client/src/components/PlayingPhase.vue` - Handles play-grouped-cards event, scrollable player area (max-h-[45vh])

## Decisions Made
- **Web Audio API over audio files:** Programmatic beep generation eliminates need for asset files and ensures consistent cross-browser behavior. AudioContext created lazily on first notification to satisfy mobile user gesture requirement.
- **Mobile threshold at > 5 cards:** Below this threshold, individual card buttons remain manageable. Above it, grouped view provides better UX with quantity selectors.
- **640px breakpoint:** Matches Tailwind's `sm:` breakpoint for consistency with existing responsive design patterns.
- **Sticky buttons with backdrop blur:** Ensures play/pickup actions always visible during scroll, with 95% opacity green background and blur for legibility over content.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all implementations completed successfully on first attempt. Type-check, lint, and build all passed.

## Next Phase Readiness

Mobile UX improvements complete. Phase 15 delivered:
- 15-01: Double-tap pickup, compact timer, 8-card transparency
- 15-02: Turn sound, card grouping, sticky buttons

All mobile playtesting feedback addressed. Game is now fully playable on mobile devices with:
- Accidental action prevention (double-tap confirmation)
- Turn awareness (sound + banner)
- Card management at scale (grouping + sticky controls)
- Visual clarity (transparent 8s, compact timer)

No blockers for future phases. Mobile UX foundation is solid.

## Self-Check: PASSED

All created files exist:
- packages/client/src/composables/useSoundEffects.ts
- packages/client/src/composables/useCardGrouping.ts

All commits exist:
- c575019
- 3a30423

---
*Phase: 15-mobile-ux-improvements*
*Completed: 2026-02-09*
