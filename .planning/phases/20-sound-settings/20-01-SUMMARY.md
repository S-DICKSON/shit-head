---
phase: 20-sound-settings
plan: "01"
subsystem: client-audio
tags: [vue, composables, sound, localstorage, mute, web-audio-api]
requires: []
provides:
  - muteState reactive ref (module-level singleton in useSoundEffects)
  - toggleMute function with localStorage persistence
  - MuteButton.vue component with fixed top-right speaker icon toggle
  - Mute tests covering no-audio-when-muted, persistence, toggle, unmute-resume
affects:
  - "20-03: PlayingPhase will add MuteButton (per plan note)"
  - Any future plan modifying useSoundEffects composable
tech-stack:
  added: []
  patterns:
    - Module-level singleton ref pattern (same as audioContext) for shared mute state across Vue component instances
    - mockOscillator.start assertion pattern for cached AudioContext in Vitest (handles module-level persistence)
key-files:
  created:
    - packages/client/src/components/MuteButton.vue
  modified:
    - packages/client/src/composables/useSoundEffects.ts
    - packages/client/src/components/SwapPhase.vue
    - packages/client/src/composables/useSoundEffects.test.ts
key-decisions:
  - muteState declared at module level (not inside composable) — ensures all component instances share one reactive ref
  - shithead-muted localStorage key for persistence
  - MuteButton positioned at right-12 (avoids spectator count at right-2 in PlayingPhase)
  - Test assertion for post-unmute beep uses mockOscillator.start not mockAudioContext.createOscillator — module-level audioContext singleton reuses old instance across tests
duration: "~3 minutes"
completed: "2026-02-19"
---

# Phase 20 Plan 01: Sound Settings — Mute Toggle Summary

**One-liner:** Module-level muteState ref with localStorage persistence, toggleMute early-return in playBeep, and MuteButton.vue fixed top-right speaker icon added to SwapPhase.

## Performance

- Duration: ~3 minutes
- Tasks: 2/2 completed
- Commits: 2 task commits

## Accomplishments

- Extended `useSoundEffects.ts` with module-level `muteState` ref initialized from `localStorage.getItem('shithead-muted')`
- Added `toggleMute()` that flips `muteState.value` and writes to `localStorage.setItem('shithead-muted', ...)`
- Added early return `if (muteState.value) return;` at top of `playBeep()` — no AudioContext or oscillator created when muted
- Exported `muteState` and `toggleMute` from composable return value (alongside existing `playTurnNotification`)
- Created `MuteButton.vue` — fixed position top-right (right-12), speaker icon (&#128266; / &#128263;), aria-label toggles with mute state
- Added `<MuteButton />` to `SwapPhase.vue` between Leave button and transition overlay
- Added 4 mute tests to `useSoundEffects.test.ts`: no beep when muted, localStorage persists, toggle restores, beep resumes after unmute
- All 126 client tests pass; type-check and lint clean

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add mute support to useSoundEffects and create MuteButton | 2601d1d | useSoundEffects.ts, MuteButton.vue |
| 2 | Add MuteButton to SwapPhase and mute tests | 9def84c | SwapPhase.vue, useSoundEffects.test.ts |

## Files Created

| File | Purpose |
|------|---------|
| packages/client/src/components/MuteButton.vue | Speaker toggle button, fixed top-right positioning |

## Files Modified

| File | Change |
|------|--------|
| packages/client/src/composables/useSoundEffects.ts | Added muteState ref, toggleMute(), early return in playBeep() |
| packages/client/src/components/SwapPhase.vue | Import and render MuteButton |
| packages/client/src/composables/useSoundEffects.test.ts | Added outer beforeEach reset + describe('mute') with 4 tests |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| muteState at module level (not inside function) | Matches audioContext singleton pattern — all component instances share one reactive ref; no state split across instances |
| `shithead-muted` localStorage key | Namespaced key avoids collisions; consistent with project naming |
| right-12 button position | Avoids spectator count badge at right-2 in PlayingPhase |
| mockOscillator.start for unmute-then-play assertion | Module-level audioContext persists across Vitest tests in same file — checking createOscillator on the fresh mock fails because old cached context is reused; mockOscillator is returned via closure so it always reflects current test's mock |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test assertion for "plays beep after unmuting"**

- **Found during:** Task 2 — test execution
- **Issue:** Plan specified `expect(mockAudioContext.createOscillator).toHaveBeenCalled()` but the module-level `audioContext` singleton persists across Vitest tests in the same file. When `playBeep` runs in the "plays beep after unmuting" test, it reuses the cached `audioContext` from an earlier test (not the fresh `mockAudioContext` of the current test). The new mock's `createOscillator` spy is never called.
- **Fix:** Changed assertion to `expect(mockOscillator.start).toHaveBeenCalled()` — `mockOscillator` is returned via `vi.fn(() => mockOscillator)` closure, so calling `createOscillator` on the old cached context returns the current test's `mockOscillator`. This correctly verifies audio was produced.
- **Files modified:** packages/client/src/composables/useSoundEffects.test.ts
- **Commit:** 9def84c

## Issues Encountered

None beyond the test assertion deviation documented above.

## Next Phase Readiness

- Plan 20-02 (round time settings): Complete — already committed before this plan ran
- Plan 20-03 (PlayingPhase mute button): MuteButton.vue ready to import; `useSoundEffects` exports correct interface
- All must-haves met: mute toggles audio, persists to localStorage, mute button visible in SwapPhase, playBeep returns early when muted

## Self-Check: PASSED
