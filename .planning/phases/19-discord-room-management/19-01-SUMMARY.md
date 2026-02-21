---
phase: 19-discord-room-management
plan: 01
subsystem: api
tags: [zod, typescript, shared-types, websocket, discord, spectator]

# Dependency graph
requires:
  - phase: 02-websocket-protocol
    provides: base message schemas (clientMessageSchema, serverMessageSchema, roomStateSchema)
  - phase: 03-deck-dealing
    provides: card types and opponentViewSchema
provides:
  - joinOrCreateSchema: Discord instanceId-based room join-or-create client message
  - spectatorStateSchema: public game view server message for spectators
  - spectatorCountSchema: live spectator count server message
  - Extended RoomState with spectatorCount and shitheadPlayerId
  - Extended LobbyPlayer with optional avatarHash
  - Extended OpponentView with optional isShithead and avatarHash
  - roomCode/instanceId validation relaxed to 1-100 chars in reconnectSchema and roomStateSchema
affects:
  - 19-02-server-room-management
  - 19-03-discord-adapter
  - 19-04-spectator-ui
  - 19-05-shithead-tracking
  - 19-06-avatar-display

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive optional fields: all new type fields are optional or nullable, preserving backward compat"
    - "Schema-type parity: ZodType<T> annotation forces schema to exactly match the TypeScript type"

key-files:
  created: []
  modified:
    - packages/shared/src/types/room.ts
    - packages/shared/src/types/game.ts
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts

key-decisions:
  - "roomStateSchema code field widened from length(6) to min(1).max(100) to support Discord instanceIds alongside 6-char web codes"
  - "reconnectSchema roomCode widened from length(6) to min(1).max(100) for same reason"
  - "spectatorStateSchema omits hand data — spectators get public game view only (no private player information)"
  - "lobbyPlayerSchema avatarHash is optional so existing create/join flows don't break"

patterns-established:
  - "Discord feature fields: nullable optional (string | null) — null for web players, hash string for Discord users"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 19 Plan 01: Shared Types for Discord Room Management Summary

**Zod schemas and TypeScript types for Discord join-or-create flow, spectator messaging, and avatar/shithead tracking across RoomState, LobbyPlayer, and OpponentView**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T20:04:07Z
- **Completed:** 2026-02-18T20:06:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `joinOrCreateSchema` (client→server) enabling Discord Activity instanceId-based room join-or-create
- Added `spectatorStateSchema` and `spectatorCountSchema` (server→client) for spectator game view support
- Extended `RoomState` with `spectatorCount` (number) and `shitheadPlayerId` (string | null)
- Extended `LobbyPlayer` with optional `avatarHash` for Discord avatar display in lobby
- Extended `OpponentView` with optional `isShithead` flag and `avatarHash` for gameplay display
- Widened room code validation in `roomStateSchema` and `reconnectSchema` to accept Discord instanceIds (1-100 chars)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend shared types for room lifecycle and Discord features** - `4151ee8` (feat)
2. **Task 2: Add join-or-create and spectator-state message schemas** - `c92100f` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `packages/shared/src/types/room.ts` - Added `avatarHash` to LobbyPlayer, `spectatorCount` and `shitheadPlayerId` to RoomState
- `packages/shared/src/types/game.ts` - Added `isShithead` and `avatarHash` to OpponentView
- `packages/shared/src/schemas/messages.ts` - Added joinOrCreateSchema, spectatorStateSchema, spectatorCountSchema; updated roomStateSchema, lobbyPlayerSchema, opponentViewSchema, reconnectSchema; added all to discriminated unions
- `packages/shared/src/types/messages.ts` - Added JoinOrCreateMessage, SpectatorStateMessage, SpectatorCountMessage type exports; added imports for new schemas

## Decisions Made
- `roomStateSchema` code widened from `length(6)` to `min(1).max(100)` — Discord instanceIds are longer than 6 chars; both web and Discord rooms flow through the same RoomState
- `reconnectSchema` roomCode widened similarly — reconnect must work for Discord Activity sessions too
- `spectatorStateSchema` includes only public game data (discard pile, opponents, draw pile count, current player) — no hand data, maintaining privacy
- All new fields on LobbyPlayer and OpponentView are optional/nullable — backward compatible with existing server/client code until Plans 02-05 fill in the values

## Deviations from Plan

None - plan executed exactly as written. Tasks 1 and 2 were committed separately as planned, though the schema update was required simultaneously with the type update (TypeScript's `ZodType<RoomState>` annotation enforces exact parity).

## Issues Encountered
- Task 1's `make type-check-shared` run after updating only types (before schema update) correctly failed with TypeScript errors — the `ZodType<RoomState>` annotation on `roomStateSchema` enforces strict parity. This was expected behavior: the schema had to be updated (Task 2) before type-check could pass. Both tasks were committed separately after all changes were verified.

## Next Phase Readiness
- All type contracts for Phase 19 are established in the shared package
- Plans 02-05 can proceed in parallel: server-side room management (02), Discord adapter (03), spectator UI (04), shithead tracking (05) all have the type definitions they need
- Server and client code will initially have TypeScript errors for the new required fields (`spectatorCount`, `shitheadPlayerId`) — resolved by Plans 02-05

---
*Phase: 19-discord-room-management*
*Completed: 2026-02-18*

## Self-Check: PASSED
