---
status: diagnosed
trigger: "Lobby to swap phase navigation failure - countdown reaches 0, flashes, but never navigates to /game"
created: 2026-02-07T00:00:00Z
updated: 2026-02-07T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Server never sends "game-started" message; Lobby.vue waits for it forever
test: Traced full message flow from start-game handler through setTimeout to client
expecting: N/A - root cause confirmed
next_action: Return diagnosis

## Symptoms

expected: After 3-second countdown reaches 0, players navigate from /lobby to /game which renders SwapPhase.vue
actual: Countdown reaches 0 and flashes, but app never navigates to swap phase screen
errors: None reported
reproduction: Start a game in the lobby, observe countdown
started: Unknown

## Eliminated

- hypothesis: Server fails to send messages after countdown
  evidence: Server does send game-dealt messages to all players after 3s setTimeout (handlers.ts lines 252-272). The setTimeout fires correctly.
  timestamp: 2026-02-07

- hypothesis: Game.vue route guard redirects because gameView is null
  evidence: gameView IS set by game-dealt handler in useGameSocket.ts (lines 91-106), so Game.vue guard would pass IF navigation happened. But navigation never happens.
  timestamp: 2026-02-07

- hypothesis: Race condition between game-dealt and navigation
  evidence: Not a race condition - game-dealt and game-started would both be in the same setTimeout callback (sequential), so gameView would be set before any navigation. The real issue is game-started is never sent at all.
  timestamp: 2026-02-07

- hypothesis: Countdown logic is broken
  evidence: Client countdown works correctly (Lobby.vue lines 57-67 decrements from 3). Server setTimeout(3000) fires correctly and calls room.startGame() and sends game-dealt. The countdown display reaches 0 and then the overlay stays because countdown.value is never set to null (only set to null on game-started, line 70).
  timestamp: 2026-02-07

## Evidence

- timestamp: 2026-02-07
  checked: Server start-game handler (handlers.ts lines 178-276)
  found: After 3s setTimeout, server calls room.startGame() and sends per-player "game-dealt" messages. Server NEVER sends a "game-started" message anywhere in this flow.
  implication: The "game-started" message type was removed from the server send flow in Phase 3 when game-dealt replaced it.

- timestamp: 2026-02-07
  checked: Client Lobby.vue (lines 69-72)
  found: Lobby.vue listens for msg.type === 'game-started' to call router.push('/game'). This message never arrives from the server.
  implication: Navigation to /game never triggers. Countdown overlay stays stuck (countdown.value never reset to null).

- timestamp: 2026-02-07
  checked: Client useGameSocket.ts (lines 91-106)
  found: useGameSocket handles "game-dealt" and sets gameView state, but does NOT trigger any navigation. No code path navigates to /game on game-dealt.
  implication: gameView is set correctly but the user stays on /lobby forever.

- timestamp: 2026-02-07
  checked: .planning/STATE.md line 128 and Phase 3 summary (03-03-SUMMARY.md lines 90-91)
  found: Documents explicitly state "game-started replaced by game-dealt" in Phase 3. Phase 4 plan (04-05-PLAN.md line 119) notes "game-started message triggers AFTER game-dealt" but the Phase 3 implementation removed game-started entirely.
  implication: Phase 4 wired Lobby.vue to navigate on game-started, but assumed game-started still existed. Phase 3 removed it. The two phases are inconsistent.

- timestamp: 2026-02-07
  checked: Shared schema (messages.ts lines 130-132)
  found: gameStartedSchema still exists in the shared types (z.literal('game-started')) but no server code ever constructs/sends this message.
  implication: The type exists as a dead schema. The client can type-check against it but will never receive it.

- timestamp: 2026-02-07
  checked: Room.setSwapCallbacks (Room.ts line 148-158) vs handlers.ts call (lines 217-248)
  found: Room.setSwapCallbacks expects 4 properties: onTick, onReady, onComplete, onPlayPhaseStart. handlers.ts only passes 3 (missing onPlayPhaseStart). TypeScript may not error if onPlayPhaseStart is optional in the callback type, but the play phase transition callback will never fire.
  implication: Secondary issue - onPlayPhaseStart callback is never wired, so when swap phase transitions to playing phase (Room.ts line 259), no notification goes to clients.

## Resolution

root_cause: |
  The server NEVER sends a "game-started" message. In Phase 3, "game-started" was intentionally replaced
  by "game-dealt" (per-player card views replaced the generic game-started signal). However, in Phase 4,
  Lobby.vue was wired to navigate to /game on receiving "game-started" -- a message that no longer exists.

  The disconnect: Phase 3 removed the server-side send of game-started. Phase 4 added a client-side
  listener for game-started. The client waits forever for a message the server will never send.

  File: packages/server/src/websocket/handlers.ts (lines 213-274) -- sends game-dealt but not game-started
  File: packages/client/src/components/Lobby.vue (lines 69-72) -- waits for game-started to navigate

fix: |
  Two options (pick one):

  Option A (recommended): Change Lobby.vue to navigate on "game-dealt" instead of "game-started".
  In useGameSocket.ts, the game-dealt handler already sets gameView. Either:
  - Move navigation trigger to useGameSocket (after setting gameView on game-dealt), OR
  - Change Lobby.vue's onMessage handler to listen for "game-dealt" instead of "game-started"

  Option B: Re-add a "game-started" send to the server after game-dealt messages are sent.
  Add to handlers.ts setTimeout callback (after the game-dealt loop):
    sendMessage(ws, { type: 'game-started' });
    publishToRoom(ws, roomCode, { type: 'game-started' });

  Option A is cleaner because game-dealt IS the signal that the game started. No need for a
  separate redundant message.

  Secondary fix: Wire onPlayPhaseStart callback in handlers.ts setSwapCallbacks call.

verification:
files_changed: []
