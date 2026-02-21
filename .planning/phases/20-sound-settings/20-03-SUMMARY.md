---
phase: 20-sound-settings
plan: "03"
subsystem: client-ui
tags: [round-time, lobby, turn-timer, mute-button, websocket]
requires: ["20-01", "20-02"]
provides:
  - Round time selector UI for host in Lobby.vue and DiscordLobby.vue
  - Read-only round time display for non-host players in lobby
  - Dynamic TurnTimer total-time from roomState.roundTime
  - MuteButton rendered in PlayingPhase
  - useGameSocket return-to-lobby resets turnTimeRemaining to configured roundTime
affects: ["21", "22"]
tech-stack:
  added: []
  patterns:
    - "roomState?.roundTime ?? 45 fallback pattern for optional server fields"
    - "set-round-time send pattern matching set-round-time server handler"
key-files:
  created: []
  modified:
    - packages/client/src/components/Lobby.vue
    - packages/client/src/components/DiscordLobby.vue
    - packages/client/src/components/PlayingPhase.vue
    - packages/client/src/composables/useGameSocket.ts
key-decisions:
  - "roomState?.roundTime ?? 45 used in both TurnTimer binding and return-to-lobby reset for safe fallback"
  - "MuteButton placement: before TurnTimer in template (both use fixed overlay positioning)"
duration: "1m 39s"
completed: "2026-02-19"
---

# Phase 20 Plan 03: Sound Settings Client Wiring Summary

**One-liner:** Round time selector (30/45/60s) wired into both lobby variants, TurnTimer reads roomState.roundTime dynamically, MuteButton added to PlayingPhase.

## Performance

- Duration: 1m 39s
- Tasks completed: 2/2
- Deviations: 0

## Accomplishments

1. **Round time selector in Lobby.vue** — Host sees 30s/45s/60s toggle buttons with green highlight for selected value. Non-host sees current round time as read-only text beneath "Waiting for host to start..." message. `setRoundTime()` sends `set-round-time` WebSocket message.

2. **Round time selector in DiscordLobby.vue** — Identical host/non-host UI as Lobby.vue, applied to the Discord Activity variant. Same `setRoundTime()` pattern.

3. **Dynamic TurnTimer in PlayingPhase.vue** — Replaced hardcoded `:total-time="45"` with `:total-time="roomState?.roundTime ?? 45"`. MuteButton imported and rendered as a fixed overlay (deferred from Plan 20-01 to avoid file conflict).

4. **useGameSocket return-to-lobby update** — `turnTimeRemaining.value = message.room.roundTime ?? 45` replaces hardcoded 45, ensuring the timer resets to the room's configured round time after each game.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add round time selector to both lobby components | 73b34f2 | Lobby.vue, DiscordLobby.vue |
| 2 | Wire round time to TurnTimer, add MuteButton to PlayingPhase, update useGameSocket | fcc3a53 | PlayingPhase.vue, useGameSocket.ts |

## Files Modified

- `packages/client/src/components/Lobby.vue` — Added `setRoundTime()`, round time selector for host (30/45/60 buttons), read-only display for non-host
- `packages/client/src/components/DiscordLobby.vue` — Same additions as Lobby.vue for Discord Activity variant
- `packages/client/src/components/PlayingPhase.vue` — Import+render MuteButton, `:total-time="roomState?.roundTime ?? 45"`
- `packages/client/src/composables/useGameSocket.ts` — return-to-lobby case uses `message.room.roundTime ?? 45`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `?? 45` fallback in both TurnTimer binding and useGameSocket reset | Defensive — roundTime is always set in practice (server default is 45), but ?? 45 is safe for any edge case or old clients |
| MuteButton before TurnTimer in template | Both are fixed-position overlays; order in DOM has no visual impact; MuteButton first is logical (top-left area vs bottom-right for timer) |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Type check, 126 client tests, 340 server tests, and lint all passed cleanly.

## Next Phase Readiness

Phase 20 (Sound & Settings) is now complete:
- Plan 20-01: MuteButton component + useSoundEffects toggle (complete)
- Plan 20-02: RoundTime shared type + server Room + WebSocket handler (complete)
- Plan 20-03: Client lobby selectors + dynamic TurnTimer + MuteButton in PlayingPhase (complete)

Phase 22 (Mobile Card Categories) is unblocked and can proceed.

## Self-Check: PASSED
