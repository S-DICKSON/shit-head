---
phase: 19-discord-room-management
plan: "02"
subsystem: api
tags: [room-management, websocket, spectator, host-migration, discord, avatar]

# Dependency graph
requires:
  - phase: 19-01
    provides: "Shared type contracts: RoomState with spectatorCount/shitheadPlayerId, LobbyPlayer with avatarHash, OpponentView with avatarHash/isShithead, spectatorStateSchema"
provides:
  - "Host migration on disconnect/leave — next player becomes host, room survives"
  - "Spectator support — addSpectator/getSpectatorView/removeSpectator on Room"
  - "Auto-return to lobby 5s after game-over — spectators promoted to players"
  - "shitheadPlayerId tracked on Room and included in RoomState"
  - "Room constructor accepts optional custom code and avatarHash"
  - "getAugmentedPlayerView — propagates avatarHash and isShithead to OpponentView"
  - "createRoomWithCode — Discord instanceId as room code"
  - "joinRoomOrSpectate — routes to player or spectator join based on room status"
  - "RoomManager.removeSpectator — cleans up spectator and player index"
affects:
  - "19-03 (server handler layer — must wire onHostMigrated, setSpectatorCallbacks, use getAugmentedPlayerView)"
  - "19-04 (Discord Activity client — uses joinRoomOrSpectate and createRoomWithCode flows)"
  - "19-05 (client-side spectator UI — getSpectatorView data shape)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Host migration: migrateHost() private method centralizes host transfer logic for both timeout and intentional leave"
    - "Auto-return: autoReturnToLobby() fires 5s after game-over, separate from manual play-again resetToLobby()"
    - "Spectators: stored in separate Map<string, SpectatorData> from players, promoted to players on lobby return"
    - "Callback pattern: setHostMigrationCallback() and setSpectatorCallbacks() follow existing setter pattern"
    - "Augmented view: getAugmentedPlayerView() wraps getPlayerView() adding room-level data (avatarHash, shitheadPlayerId)"

key-files:
  created: []
  modified:
    - "packages/server/src/rooms/Room.ts"
    - "packages/server/src/rooms/RoomManager.ts"

key-decisions:
  - "Host migration uses dedicated onHostMigrated callback (not reusing onPlayerRemoved) for cleaner handler semantics"
  - "autoReturnToLobby() replaces play-again button flow for the auto-5s-return path; resetToLobby() kept for manual play-again"
  - "Spectator limit: maxPlayers + 4 (up to 8 total in room)"
  - "removePlayer() returns false when host migrates (room continues) — leaveRoom() in RoomManager only destroys on true"
  - "createRoom() updated with optional avatarHash — backward compatible, undefined treated as null"

patterns-established:
  - "avatarHash always stored as string | null in player/spectator data, never undefined at the stored level"
  - "Auto-return timer started inside checkPostPlayState after onGameOver fires — handler layer fires before auto-return"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 19 Plan 02: Discord Room Management (Server) Summary

**Host migration, spectator support, auto-return to lobby, shithead tracking, Discord room creation, and avatarHash propagation through opponent views**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T20:09:16Z
- **Completed:** 2026-02-18T20:12:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Host migration fully implemented: when host disconnects or intentionally leaves, the next connected player becomes host and the room survives
- Spectator system: mid-game arrivals join as spectators with a public-only view (no hand data), and are promoted to full players on auto-return to lobby
- Auto-return to lobby fires automatically 5 seconds after game-over (replaces manual play-again button for the Discord Activity flow)
- shitheadPlayerId tracked on Room and surfaced in RoomState, plus isShithead flag in getAugmentedPlayerView opponent entries
- createRoomWithCode() enables Discord instanceId as room code for automatic join-or-create flows
- joinRoomOrSpectate() routes new arrivals to addPlayer (lobby) or addSpectator (game in progress) based on room status

## Task Commits

Each task was committed atomically:

1. **Task 1: Add host migration, spectators, auto-return, and shithead tracking to Room.ts** - `431e8ca` (feat)
2. **Task 2: Add createRoomWithCode and joinRoomOrSpectate to RoomManager.ts** - `9535e27` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified
- `packages/server/src/rooms/Room.ts` - Host migration, spectator map, auto-return timer, shithead tracking, avatarHash in player data, getAugmentedPlayerView, custom code constructor
- `packages/server/src/rooms/RoomManager.ts` - createRoomWithCode, joinRoomOrSpectate, removeSpectator, avatarHash forwarding in createRoom/joinRoom

## Decisions Made
- Host migration uses dedicated `onHostMigrated` callback rather than reusing `onPlayerRemoved` — cleaner semantics for the handler layer (Plan 03 will wire this separately)
- `autoReturnToLobby()` is a separate code path from `resetToLobby()` — the former promotes spectators and passes empty removedPlayerIds, the latter keeps the play-again-only-players flow unchanged
- Spectator capacity: `maxPlayers + 4` (up to 8 people in a room when 4 spectators watching a full game)
- `removePlayer()` now returns `false` when host successfully migrates — `leaveRoom()` in RoomManager only destroys the room when `true` is returned (empty room case)
- `createRoom()` and `joinRoom()` in RoomManager updated with optional `avatarHash` param — backward compatible since existing callers omit it

## Deviations from Plan

None - plan executed exactly as written.

The plan's `migrateHost()` guidance suggested using `onPlayerRemoved?.(oldHostId, '', 'timeout')` initially, then recommended a dedicated callback for cleaner semantics. The dedicated callback approach was implemented directly as the plan indicated this was preferred.

## Issues Encountered
None — both files compiled cleanly on first type-check pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Room.ts and RoomManager.ts have all new APIs ready for Plan 03 (handler layer wiring)
- Plan 03 must wire: `setHostMigrationCallback`, `setSpectatorCallbacks`, use `getAugmentedPlayerView` instead of `getPlayerView`, handle new `joinRoomOrSpectate` WebSocket message type
- TypeScript errors noted in STATE.md (client references to RoomState fields) will be resolved when Plan 05 updates the client

---
*Phase: 19-discord-room-management*
*Completed: 2026-02-18*

## Self-Check: PASSED
