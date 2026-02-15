---
phase: quick
plan: "013"
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared/src/schemas/messages.ts
  - packages/shared/src/types/messages.ts
  - packages/server/src/rooms/Room.ts
  - packages/server/src/websocket/handlers.ts
  - packages/client/src/composables/useGameSocket.ts
  - packages/client/src/components/Game.vue
  - packages/client/src/components/Lobby.vue
autonomous: true

must_haves:
  truths:
    - "Players see Play Again and Leave buttons when game ends (finished phase)"
    - "Clicking Play Again sends play-again message to server"
    - "Server resets room to waiting phase with only play-again players when all connected respond or timeout elapses"
    - "All play-again players receive return-to-lobby message and navigate back to Lobby"
    - "Players who click Leave are removed from room and go to landing"
    - "Host can start a new game from lobby as normal"
  artifacts:
    - path: "packages/shared/src/schemas/messages.ts"
      provides: "play-again client schema, return-to-lobby server schema"
      contains: "playAgainSchema"
    - path: "packages/server/src/rooms/Room.ts"
      provides: "playAgain tracking and resetToLobby logic"
      contains: "playAgainPlayers"
    - path: "packages/client/src/components/Game.vue"
      provides: "Play Again and Leave buttons in finished phase"
      contains: "Play Again"
  key_links:
    - from: "packages/client/src/components/Game.vue"
      to: "packages/client/src/composables/useGameSocket.ts"
      via: "send({ type: 'play-again' })"
      pattern: "play-again"
    - from: "packages/server/src/websocket/handlers.ts"
      to: "packages/server/src/rooms/Room.ts"
      via: "room.markPlayAgain(playerId)"
      pattern: "markPlayAgain"
    - from: "packages/client/src/composables/useGameSocket.ts"
      to: "packages/client/src/router.ts"
      via: "return-to-lobby handler resets gameView and roomState updates"
      pattern: "return-to-lobby"
---

<objective>
Implement "Play Again" flow: after game-over, players can click "Play Again" to return to the lobby with the same room, or "Leave" to exit. Server collects play-again responses, resets room to waiting phase with remaining players, and notifies clients to navigate back to lobby.

Purpose: Enable rematches without needing to create a new room and re-share codes.
Output: Working play-again flow across shared schemas, server logic, and client UI.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/shared/src/schemas/messages.ts
@packages/shared/src/types/messages.ts
@packages/shared/src/types/room.ts
@packages/server/src/rooms/Room.ts
@packages/server/src/rooms/RoomManager.ts
@packages/server/src/websocket/handlers.ts
@packages/client/src/composables/useGameSocket.ts
@packages/client/src/components/Game.vue
@packages/client/src/components/Lobby.vue
@packages/client/src/router.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add play-again protocol and server logic</name>
  <files>
    packages/shared/src/schemas/messages.ts
    packages/shared/src/types/messages.ts
    packages/server/src/rooms/Room.ts
    packages/server/src/websocket/handlers.ts
  </files>
  <action>
**Shared schemas (packages/shared/src/schemas/messages.ts):**

1. Add `playAgainSchema` client message:
```ts
export const playAgainSchema = z.object({
  type: z.literal('play-again'),
});
```

2. Add `returnToLobbySchema` server message:
```ts
export const returnToLobbySchema = z.object({
  type: z.literal('return-to-lobby'),
  room: roomStateSchema,
});
```

3. Add `playAgainSchema` to `clientMessageSchema` discriminated union.
4. Add `returnToLobbySchema` to `serverMessageSchema` discriminated union.

**Shared types (packages/shared/src/types/messages.ts):**

1. Add import for `playAgainSchema` and `returnToLobbySchema`.
2. Add `PlayAgainMessage` type (z.infer of playAgainSchema).
3. Add `ReturnToLobbyMessage` type (z.infer of returnToLobbySchema).

**Server Room.ts (packages/server/src/rooms/Room.ts):**

1. Add private field `playAgainPlayers: Set<string> = new Set()` to Room class.
2. Add private field `playAgainTimeout: ReturnType<typeof setTimeout> | null = null`.
3. Add a callback field `onReturnToLobby?: () => void`.
4. Add method to `setPlayAgainCallbacks`:
```ts
setPlayAgainCallbacks(callbacks: { onReturnToLobby: () => void }): void
```
5. Add method `markPlayAgain(playerId: string): OperationResult`:
   - Validate game is in 'finished' phase, return INVALID_ACTION error if not.
   - Validate player exists in room, return PLAYER_NOT_FOUND if not.
   - Add playerId to `playAgainPlayers` set.
   - Check if all CONNECTED players (players in this.players minus disconnectedPlayers) have responded. If yes, call `resetToLobby()`.
   - If this is the first play-again, start a 30-second timeout. When timeout fires, call `resetToLobby()` with whoever opted in.
   - Return success.

6. Add method `resetToLobby()`:
   - Clear the playAgainTimeout if set.
   - Remove players who did NOT click play-again from the room (call `this.players.delete(id)` for each). Do NOT trigger host-left destruction — if host didn't click play-again but other players did, pick a new host from playAgainPlayers (first player in the set becomes host, update `this.hostId` and their `isHost` flag). If the host DID click play-again, they stay host.
   - If no players clicked play-again (edge case: all timed out), do nothing (room will be cleaned up naturally).
   - If only 0-1 players remain after filtering, do nothing (not enough for a game, but still show lobby).
   - Clear `this.gameState = null` (back to lobby state).
   - Set `this.status = 'waiting'`.
   - Clear `this.readyPlayers`.
   - Clear `this.playAgainPlayers`.
   - Clear all timers (swap, turn).
   - Call `this.onReturnToLobby?.()`.

7. In `handlePlayerDisconnect`: if game is finished and player disconnects before clicking play-again, they are implicitly "not playing again". Check if all remaining connected players have responded and trigger `resetToLobby()` if so.

**Server handlers.ts (packages/server/src/websocket/handlers.ts):**

1. Add `'play-again'` case to the message switch:
   - Get room from roomCode. Validate room exists.
   - Call `room.markPlayAgain(ws.data.playerId)`.
   - Handle error result.
   - The actual return-to-lobby broadcast happens via the callback (set up below).

2. Set up play-again callbacks. These need to be set when the game reaches finished phase. The cleanest place: in the `onGameOver` callback (already exists in the start-game handler). After the game-over broadcast, set the play-again callback:
```ts
// Inside existing onGameOver callback in start-game handler:
room.setPlayAgainCallbacks({
  onReturnToLobby: () => {
    const roomState = room.getState();
    const playerIds = room.getPlayerIds();
    for (const pid of playerIds) {
      const pWs = playerSockets.get(pid);
      if (pWs) {
        sendMessage(pWs, {
          type: 'return-to-lobby',
          room: roomState,
        });
      }
    }
  },
});
```

3. For players removed from the room during resetToLobby (those who didn't play-again), clean up their playerRoomIndex entry via `manager.removePlayerIndex(pid)`. To enable this, the `resetToLobby` method should return the list of removed player IDs, OR pass the cleanup into the callback. Best approach: have `resetToLobby` return `string[]` of removed IDs, and in the onReturnToLobby callback (or after markPlayAgain triggers it), iterate removed IDs and call `manager.removePlayerIndex(pid)`. Alternatively, add a second callback `onPlayerRemovedFromLobby` that fires for each removed player. Use whichever is cleaner — the key requirement is that removed players' index entries are cleaned up.
  </action>
  <verify>
Run `make type-check` — all shared, server, and client packages must pass (no type errors from new schema/type additions).
Run `make test` — all existing tests must still pass.
  </verify>
  <done>
- `play-again` client message schema exists and is in clientMessageSchema union
- `return-to-lobby` server message schema exists and is in serverMessageSchema union
- Room.ts has markPlayAgain and resetToLobby methods
- handlers.ts routes play-again messages and sets up return-to-lobby broadcast
- All existing tests pass, type-check passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Add client play-again UI and return-to-lobby handling</name>
  <files>
    packages/client/src/composables/useGameSocket.ts
    packages/client/src/components/Game.vue
    packages/client/src/components/Lobby.vue
  </files>
  <action>
**useGameSocket.ts (packages/client/src/composables/useGameSocket.ts):**

1. Add handling for `'return-to-lobby'` message in the switch statement:
```ts
case 'return-to-lobby':
  // Reset game state — we're back in lobby
  gameView.value = null;
  shitheadNickname.value = null;
  swapPhaseComplete.value = false;
  swapPhaseReason.value = null;
  readyPlayers.value = [];
  burnTriggered.value = false;
  turnTimeRemaining.value = 45;
  turnTimerPlayerIndex.value = -1;
  // Update room state with the reset room
  roomState.value = message.room;
  break;
```

Note: The `return-to-lobby` message type needs to be recognized. Since we added it to the serverMessageSchema discriminated union in Task 1, the `ServerMessage` type will include it. But the client casts `JSON.parse(rawData) as ServerMessage`, so TypeScript will know about the new type. The switch case will work. Import is not needed since ServerMessage is already imported and the union is extended.

**Game.vue (packages/client/src/components/Game.vue):**

1. Import `useRouter` (already imported) and add `send` from `useGameSocket`.
2. Add `playAgainClicked` ref to track if button was already clicked (prevent double-click).
3. Replace the finished phase `<div>` with an enhanced version that includes:
   - The existing game-over text and shithead nickname display
   - A "Play Again" button: green, prominent. On click: sets `playAgainClicked = true`, sends `{ type: 'play-again' }`. When clicked, button text changes to "Waiting for others..." and becomes disabled.
   - A "Leave" button: smaller, secondary style (red text or outline). On click: sends `{ type: 'leave-room' }`, clears localStorage room code, navigates to `/`.
   - Use `useGameSocket`'s `send` for both actions.

4. Add a message handler (via `onMessage`) to listen for `'return-to-lobby'`. When received, navigate to `/room/${msg.room.code}` using the router. This ensures the player lands on the Lobby view. Clean up the handler on unmount.

Example finished phase template:
```html
<div v-else-if="gameView.phase === 'finished'"
     class="min-h-screen flex items-center justify-center bg-green-900 text-white">
  <div class="text-center">
    <div class="text-4xl font-bold mb-4">Game Over</div>
    <div v-if="shitheadNickname" class="text-3xl font-bold text-yellow-400 mb-8">
      Loser! {{ shitheadNickname }} ...
    </div>
    <div class="flex flex-col gap-4 items-center">
      <button
        :disabled="playAgainClicked"
        class="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-60
               text-white font-bold text-lg rounded-lg transition-all shadow-md"
        @click="handlePlayAgain"
      >
        {{ playAgainClicked ? 'Waiting for others...' : 'Play Again' }}
      </button>
      <button
        class="px-6 py-2 text-red-300 hover:text-red-100 hover:underline text-sm"
        @click="handleLeave"
      >
        Leave Room
      </button>
    </div>
  </div>
</div>
```

**Lobby.vue (packages/client/src/components/Lobby.vue):**

1. The Lobby component already handles room state and rendering players. When `return-to-lobby` fires, the router navigates to `/room/:code` which mounts Lobby.vue. The `roomState` ref will already be populated (set by useGameSocket handler). The Lobby onMounted guard checks `if (!roomState.value || !playerId.value)` — since roomState IS set, it will proceed normally and show the lobby with the remaining players.

2. One potential issue: the `countdown` ref might still be set from the previous game. Reset it — add to `onMounted`: `countdown.value = null;`. This is a minor fix.

3. Verify the Lobby's `onMounted` logic won't redirect away. Since `roomState.value` will be set AND `playerId.value` will be set, it will skip all the "no state" branches and check `if (gameView.value)` — since gameView was cleared to null in useGameSocket, it will NOT redirect to /game. Good.
  </action>
  <verify>
Run `make type-check` — all packages pass.
Run `make lint` — no lint errors.
Run `make test` — all existing tests pass.
Manual verification: Start dev server with `make dev`, create a room with 2 players, play a game to completion, verify "Play Again" and "Leave" buttons appear, click "Play Again" on both players, verify both return to lobby with room intact.
  </verify>
  <done>
- Game.vue shows "Play Again" and "Leave" buttons when game phase is 'finished'
- Clicking "Play Again" sends play-again message and disables button with "Waiting for others..." text
- Clicking "Leave" sends leave-room, clears room storage, navigates to landing
- return-to-lobby message resets game state in useGameSocket and navigates to lobby
- Lobby renders correctly with remaining players after return-to-lobby
- Host can start a new game from lobby
- All tests, type-check, and lint pass
  </done>
</task>

</tasks>

<verification>
1. `make type-check` passes for all packages (shared, server, client)
2. `make test` passes — no regressions
3. `make lint` passes — no lint errors
4. Manual flow test:
   - Create room, join with 2 players
   - Play game to completion (game-over)
   - Both players see "Play Again" and "Leave" buttons
   - Player A clicks "Play Again" — button changes to "Waiting..."
   - Player B clicks "Play Again" — both players navigate to Lobby
   - Lobby shows both players, host can start new game
   - Alternative: Player B clicks "Leave" — Player B goes to landing, Player A eventually returns to lobby alone (after timeout)
   - If host leaves and non-host plays again, non-host becomes host in lobby
</verification>

<success_criteria>
- Play Again button visible on game-over screen
- Clicking Play Again returns players to lobby with same room
- Players who don't click Play Again (or click Leave) are removed from room
- Host transfer works if original host leaves
- New game can be started from lobby after returning
- `make test`, `make type-check`, and `make lint` all pass
</success_criteria>

<output>
After completion, create `.planning/quick/013-play-again-returns-to-lobby-after-game/013-SUMMARY.md`
</output>
