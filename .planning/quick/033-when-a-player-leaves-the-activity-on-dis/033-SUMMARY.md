---
phase: quick-033
plan: 01
subsystem: discord-integration
tags: [discord, websocket, activity, participant-tracking, real-time]

dependency-graph:
  requires:
    - Discord Embedded App SDK integration (prior phases)
    - discord-participant tracking in room state (discordUserId fields)
  provides:
    - Immediate player removal when Discord Activity participant departs
    - discord-participant-left WebSocket message type
    - Room.findPlayerByDiscordUserId() lookup method
    - Room.forceDisconnectPlayer() bypassing grace period
  affects:
    - Any future Discord-specific disconnect behavior

tech-stack:
  added: []
  patterns:
    - Discord SDK ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE event subscription
    - Peer-reported disconnect (other clients notify server of departure)
    - Force-disconnect bypassing grace period for intentional activity closes

key-files:
  created: []
  modified:
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts
    - packages/server/src/rooms/Room.ts
    - packages/server/src/websocket/handlers.ts
    - packages/client/src/components/DiscordLobby.vue

decisions:
  - "Peer-reported disconnect: remaining clients detect departure via SDK and notify server, rather than server polling Discord"
  - "Subscription persists across route navigation: SDK instance survives lobby->game->lobby, so subscription set up once in DiscordLobby and never torn down"
  - "forceDisconnectPlayer reuses removePlayerAfterTimeout: sets disconnectedPlayers entry then calls internal method directly, avoiding code duplication"
  - "No unsubscribe on component unmount: intentional, since the handler must fire during gameplay (Game.vue route) too"

metrics:
  duration: "3m 21s"
  completed: "2026-02-22"
---

# Quick Task 033: Discord Activity Participant Departure Summary

**One-liner:** Immediate player removal via Discord SDK ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE event subscription, bypassing the 15s/90s grace period for Discord Activity closes.

## What Was Built

When a Discord user closes the Activity panel, their iframe is destroyed. Previously, the WebSocket grace period kept them in the room for up to 90 seconds in-game (or 15s in lobby). This was poor UX because leaving a Discord Activity is always intentional — there are no accidental page refreshes in an iframe.

This task adds a peer-reporting mechanism: remaining clients subscribe to the Discord SDK's participant update event, detect when a room player's Discord user ID disappears from the participant list, and immediately send a `discord-participant-left` message to the server. The server then force-removes the player (same logic as timeout removal, but with zero grace period).

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add discord-participant-left message type and server handler | 7564864 | schemas/messages.ts, types/messages.ts, Room.ts, handlers.ts |
| 2 | Subscribe to Discord SDK participant updates in DiscordLobby | c85124b | DiscordLobby.vue |

## Implementation Details

### Shared Package

- `discordParticipantLeftSchema`: new Zod schema with `type: 'discord-participant-left'` and `discordUserId` regex-validated to 17-20 digits
- `DiscordParticipantLeftMessage`: inferred TypeScript type
- Added to `clientMessageSchema` discriminated union

### Server (Room.ts)

- `findPlayerByDiscordUserId(discordUserId: string): string | null` — iterates both `players` and `spectators` maps
- `forceDisconnectPlayer(playerId: string): void` — clears any existing grace timer, inserts a `disconnectedPlayers` entry with null timer, then calls the private `removePlayerAfterTimeout` directly for immediate removal. Handles both lobby and in-game states through the existing `removePlayerAfterTimeout` logic (turn advancement, game-end check, host migration)

### Server (handlers.ts)

- `case 'discord-participant-left':` — finds player by Discord user ID, ignores self-reports, ensures disconnect callbacks are wired (same pattern as `handleClose` lobby path), calls `room.forceDisconnectPlayer()`, and cleans up the socket entry

### Client (DiscordLobby.vue)

- After authentication succeeds, subscribes to `ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE`
- Handler compares SDK participant IDs against room players with `discordUserId` set
- Skips self (own WS close handles self-removal)
- Sends `discord-participant-left` for any room player whose Discord user ID is absent from participants
- Subscription intentionally not torn down on unmount — works across lobby and gameplay routes

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Peer-reported departure (not server-side polling) | Discord SDK runs client-side; server has no direct access to participant list |
| Subscription persists across route navigation | SDK instance is a singleton; unsubscribing on unmount would break in-game detection |
| Reuse `removePlayerAfterTimeout` for force disconnect | Avoids duplicating the complex removal logic (turn advancement, game-end, host migration) |
| No unsubscribe on unmount | Intentional — gameplay is on `/game` route but departure must still be detected |

## Deviations from Plan

None — plan executed exactly as written. The "REVISED approach" in the plan's Task 1 action section was the clearest path and was implemented as described.

## Verification

- `make type-check`: PASS
- `make test`: PASS (516 tests: 131 client + 385 server)
- `make lint`: PASS

## Self-Check: PASSED
