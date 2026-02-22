---
phase: 25-bot-player
plan: 04
subsystem: client-lobby
tags: [bot-player, lobby-ui, vue, discord-lobby, tailwind]
requires:
  - packages/shared/src/types/room.ts (LobbyPlayer.isBot field from plan 01)
  - packages/shared/src/schemas/messages.ts (add-bot/remove-bot schemas from plan 01)
  - packages/client/src/components/Lobby.vue
  - packages/client/src/components/DiscordLobby.vue
provides:
  - Bot UI controls in web lobby (Lobby.vue)
  - Bot UI controls in Discord lobby (DiscordLobby.vue)
  - Add Bot button for host when room has space
  - Bot indicator (robot emoji) for bot players
  - Remove button for host to remove bot players
affects:
  - 25-05 (integration testing / E2E)
tech-stack:
  added: []
  patterns:
    - isRoomFull computed from roomState.players.length >= maxPlayers
    - Bot icon in circular container instead of Discord avatar (Discord lobby)
    - Remove button colocated with bot player row, visible to host only
key-files:
  created: []
  modified:
    - packages/client/src/components/Lobby.vue
    - packages/client/src/components/DiscordLobby.vue
key-decisions:
  - Bot icon uses robot emoji (U+1F916) consistent between both lobby variants
  - Discord lobby shows robot emoji in same-size circle as Discord avatars (visual parity)
  - Add Bot button hidden when isRoomFull (>=4 players) not just disabled
  - Remove button placed inline with player row, not in a separate controls section
duration: ~2 minutes
completed: 2026-02-22
---

# Phase 25 Plan 04: Bot Player Lobby UI Summary

**One-liner:** Add Bot button + robot indicator + Remove button wired to add-bot/remove-bot WebSocket messages in both Lobby.vue and DiscordLobby.vue.

## Performance

| Metric | Value |
|--------|-------|
| Start | 2026-02-22T03:30:41Z |
| End | 2026-02-22T03:32:26Z |
| Duration | ~2 minutes |
| Tasks | 2/2 |
| Files modified | 2 |
| Files created | 0 |

## Accomplishments

1. **Lobby.vue bot controls** — `addBot()` / `removeBot(botId)` functions send `add-bot` and `remove-bot` WebSocket messages; `isRoomFull` computed hides the Add Bot button at max capacity; robot emoji indicator shown per bot player; inline Remove button visible to host only

2. **DiscordLobby.vue bot controls** — Same functional additions as Lobby.vue adapted for Discord layout; bot icon rendered as robot emoji in a gray circle (same 32px dimensions as Discord avatar) replacing the img element for bot players; Add Bot button and Remove button in host controls

3. **Consistent UX** — Both lobbies show: Add Bot (host, room not full), robot indicator (all players), Remove button (host next to bots). Non-host players see bots listed but have no add/remove controls.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add bot controls to Lobby.vue | 9b65f2b | packages/client/src/components/Lobby.vue |
| 2 | Add bot controls to DiscordLobby.vue | 819f981 | packages/client/src/components/DiscordLobby.vue |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Robot emoji (&#129302;) for bot indicator | Universally understood, no image assets required, inline with existing emoji usage pattern in lobbies |
| Discord lobby wraps emoji in same-size circle as avatar | Visual alignment — bots sit in the same position as human Discord avatars, maintaining grid alignment |
| Add Bot hidden (v-if) not disabled when full | Cleaner UX — no ghost button confusing host when room is already at capacity |
| Remove button inline in player row | Consistent with action-near-subject pattern; keeps host controls section focused on global actions |

## Deviations from Plan

None — plan executed exactly as written.

## Issues

None.

## Next Phase Readiness

- Plan 25-05 can proceed — both lobbies now have full bot UI wired to WebSocket messages
- `add-bot` and `remove-bot` handlers exist on server (plan 03)
- `BotPlayer.selectMove` and game loop integration exist (plans 01-02)
- Full bot flow: host adds bot via UI → server adds bot → server deals bot into game → bot takes turns automatically

## Self-Check: PASSED
