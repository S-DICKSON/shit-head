---
phase: quick
plan: 005
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/server/src/rooms/Room.ts
  - packages/server/src/websocket/handlers.ts
  - packages/server/src/rooms/__tests__/Room.disconnect.test.ts
autonomous: true

must_haves:
  truths:
    - "Guest refreshing page in lobby reconnects to the same lobby within 15 seconds"
    - "Guest who is disconnected for more than 15 seconds in lobby is removed as before"
    - "Host disconnecting in lobby still triggers room destruction after grace period"
    - "In-game disconnect behavior (90s grace period) is unchanged"
    - "Existing reconnect handler restores lobby player without code changes"
  artifacts:
    - path: "packages/server/src/rooms/Room.ts"
      provides: "Lobby disconnect grace period (15s) in handlePlayerDisconnect"
      contains: "LOBBY_DISCONNECT_GRACE_PERIOD"
    - path: "packages/server/src/websocket/handlers.ts"
      provides: "handleClose delegates lobby disconnects to Room.handlePlayerDisconnect with callbacks"
    - path: "packages/server/src/rooms/__tests__/Room.disconnect.test.ts"
      provides: "Tests for lobby grace period, lobby reconnect within grace period"
  key_links:
    - from: "packages/server/src/websocket/handlers.ts"
      to: "Room.handlePlayerDisconnect"
      via: "handleClose delegates lobby disconnect"
      pattern: "room\\.handlePlayerDisconnect"
    - from: "packages/server/src/rooms/Room.ts"
      to: "disconnectedPlayers Map"
      via: "lobby grace period timer stored in same map"
      pattern: "LOBBY_DISCONNECT_GRACE_PERIOD"
---

<objective>
Fix bug where a guest refreshing the page while in the lobby gets redirected to the home page instead of reconnecting to the lobby.

Purpose: Currently, lobby disconnects trigger immediate player removal on the server. When a guest refreshes, the WebSocket closes, the server removes them instantly, and when the client reconnects it gets PLAYER_NOT_FOUND. Adding a 15-second grace period for lobby disconnects allows the reconnect handler (which already works) to restore the player.

Output: Modified Room.ts and handlers.ts with lobby disconnect grace period, updated tests.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/server/src/rooms/Room.ts
@packages/server/src/websocket/handlers.ts
@packages/server/src/rooms/__tests__/Room.disconnect.test.ts
@packages/client/src/composables/useGameSocket.ts
@packages/client/src/router.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add lobby disconnect grace period to Room.ts</name>
  <files>packages/server/src/rooms/Room.ts</files>
  <action>
Modify `Room.handlePlayerDisconnect` to use a 15-second grace period for lobby disconnects instead of immediate removal.

1. Add a new constant: `private readonly LOBBY_DISCONNECT_GRACE_PERIOD = 15000;` (15 seconds, alongside the existing `DISCONNECT_GRACE_PERIOD = 90000`).

2. In `handlePlayerDisconnect`, change the lobby/finished branch (the `if (!this.gameState || this.gameState.phase === 'finished')` block) from:
   ```
   // immediate removal
   this.removePlayer(playerId);
   this.onPlayerRemoved?.(playerId, player.nickname, isHost ? 'host-left' : 'timeout');
   return;
   ```
   To:
   ```
   // Lobby/finished: use shorter grace period for reconnection on refresh
   const gracePeriodTimer = setTimeout(() => {
     this.removePlayerAfterTimeout(playerId);
   }, this.LOBBY_DISCONNECT_GRACE_PERIOD);

   this.disconnectedPlayers.set(playerId, {
     disconnectTime: Date.now(),
     gracePeriodTimer,
   });

   this.onPlayerDisconnected?.(playerId, player.nickname);
   return;
   ```

3. In `getDisconnectGraceRemaining`, update to handle both grace period durations. The method currently hardcodes `DISCONNECT_GRACE_PERIOD`. Change it to check whether the game is active to determine which duration to use:
   ```
   const gracePeriod = (this.gameState && this.gameState.phase !== 'finished')
     ? this.DISCONNECT_GRACE_PERIOD
     : this.LOBBY_DISCONNECT_GRACE_PERIOD;
   return Math.max(0, gracePeriod - (Date.now() - disconnectData.disconnectTime));
   ```

The existing `handlePlayerReconnect` method already works for this scenario - it clears the grace period timer and removes from `disconnectedPlayers`. No changes needed there.

The existing `removePlayerAfterTimeout` method also works - it handles both host (fires `onPlayerRemoved` with 'host-left') and non-host (removes player, fires 'timeout'). It also handles game-end checks. No changes needed there.
  </action>
  <verify>Run `make type-check-server` and `make type-check-shared` to confirm no type errors.</verify>
  <done>Room.handlePlayerDisconnect uses a 15-second grace period for lobby disconnects instead of immediate removal. The disconnectedPlayers map and reconnect handler remain unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Update handleClose to delegate lobby disconnects to Room</name>
  <files>packages/server/src/websocket/handlers.ts</files>
  <action>
Modify the `handleClose` function to delegate lobby/finished disconnects to `room.handlePlayerDisconnect` (which now handles the grace period) instead of doing inline immediate removal.

1. Replace the entire `else` branch in `handleClose` (the lobby/finished path, lines 749-775) with:
   ```typescript
   } else {
     // Lobby or finished game: delegate to Room's grace period logic
     // Set up disconnect callbacks if not already set (lobby has no game-start to wire them)
     if (!room.hasDisconnectCallbacks()) {
       room.setDisconnectCallbacks({
         onDisconnected: (disconnectedPlayerId, nickname) => {
           // Lobby disconnect: notify other players
           const playerIds = room.getPlayerIds();
           for (const pid of playerIds) {
             if (pid === disconnectedPlayerId) continue;
             const pWs = playerSockets.get(pid);
             if (pWs) {
               sendMessage(pWs, {
                 type: 'player-disconnected',
                 playerId: disconnectedPlayerId,
                 nickname,
                 graceTimeRemaining: room.getDisconnectGraceRemaining(disconnectedPlayerId),
               });
             }
           }
         },
         onReconnected: (reconnectedPlayerId, nickname) => {
           const playerIds = room.getPlayerIds();
           for (const pid of playerIds) {
             if (pid === reconnectedPlayerId) continue;
             const pWs = playerSockets.get(pid);
             if (pWs) {
               sendMessage(pWs, {
                 type: 'player-reconnected',
                 playerId: reconnectedPlayerId,
                 nickname,
               });
             }
           }
         },
         onRemoved: (removedPlayerId, nickname, reason) => {
           if (reason === 'host-left') {
             const playerIds = room.getPlayerIds();
             for (const pid of playerIds) {
               if (pid === removedPlayerId) continue;
               const pWs = playerSockets.get(pid);
               if (pWs) {
                 sendMessage(pWs, {
                   type: 'player-removed',
                   playerId: removedPlayerId,
                   nickname,
                   reason: 'host-left',
                 });
               }
             }
             manager.destroyRoom(room.code);
           } else {
             const playerIds = room.getPlayerIds();
             for (const pid of playerIds) {
               if (pid === removedPlayerId) continue;
               const pWs = playerSockets.get(pid);
               if (pWs) {
                 sendMessage(pWs, {
                   type: 'player-removed',
                   playerId: removedPlayerId,
                   nickname,
                   reason: 'timeout',
                 });
               }
             }
             manager.removePlayerIndex(removedPlayerId);
             // Send room-updated to remaining players
             const updatedRoom = manager.getRoom(room.code);
             if (updatedRoom) {
               for (const pid of updatedRoom.getPlayerIds()) {
                 const pWs = playerSockets.get(pid);
                 if (pWs) {
                   sendMessage(pWs, {
                     type: 'room-updated',
                     room: updatedRoom.getState(),
                   });
                 }
               }
             }
           }
         },
       });
     }

     room.handlePlayerDisconnect(ws.data.playerId);
     ws.unsubscribe(roomCode);
   }
   ```

2. Add a `hasDisconnectCallbacks()` method to Room.ts that returns `true` if `onPlayerRemoved` is set:
   ```typescript
   hasDisconnectCallbacks(): boolean {
     return this.onPlayerRemoved !== undefined;
   }
   ```
   Add this as a public method near the other callback-related methods (around line 200).

Key differences from the old inline approach:
- Instead of `manager.leaveRoom()` being called immediately, the Room manages the grace period
- The `onRemoved` callback for lobby non-hosts now also sends `room-updated` (preserving old behavior) via `sendMessage` to each player individually (since the disconnected ws can't publish after unsubscribe)
- The `onRemoved` callback for host still destroys the room via `manager.destroyRoom`
- The `hasDisconnectCallbacks()` check prevents overwriting game-phase callbacks if a player disconnects during a game that happens to reach finished state
  </action>
  <verify>Run `make type-check-server` to confirm no type errors. Run `make type-check` for full check.</verify>
  <done>handleClose delegates all disconnects to Room.handlePlayerDisconnect, with disconnect callbacks wired for lobby scenarios. Lobby players get a 15-second grace period for reconnection.</done>
</task>

<task type="auto">
  <name>Task 3: Update disconnect tests for lobby grace period</name>
  <files>packages/server/src/rooms/__tests__/Room.disconnect.test.ts</files>
  <action>
Update the existing tests and add new tests for the lobby disconnect grace period behavior.

1. **Update existing test** "removes player immediately when disconnected in lobby (no game)" to test for grace period instead:
   - Rename to "starts grace period when player disconnects in lobby (no game)"
   - After `room.handlePlayerDisconnect('player-2')`:
     - `expect(onRemoved).not.toHaveBeenCalled()` (NOT immediately removed)
     - `expect(room.isPlayerDisconnected('player-2')).toBe(true)`
     - Player should still be in room: `expect(room.getState().players).toHaveLength(2)`
   - After `vi.advanceTimersByTime(15000)` (15s lobby grace period):
     - `expect(onRemoved).toHaveBeenCalledWith('player-2', 'Bob', 'timeout')`
     - `expect(room.getState().players).toHaveLength(1)`

2. **Update existing test** "removes player immediately when disconnected after game finished" similarly:
   - Rename to "starts grace period when disconnected after game finished"
   - Verify NOT immediately removed, then removed after 15s

3. **Add new test** "reconnects lobby player within grace period":
   ```typescript
   test('reconnects lobby player within grace period', () => {
     const room = new Room('player-1', 'Alice');
     room.addPlayer('player-2', 'Bob');

     const onDisconnected = vi.fn();
     const onReconnected = vi.fn();
     const onRemoved = vi.fn();
     room.setDisconnectCallbacks({
       onDisconnected,
       onReconnected,
       onRemoved,
     });

     // Disconnect player-2 in lobby
     room.handlePlayerDisconnect('player-2');
     expect(room.isPlayerDisconnected('player-2')).toBe(true);
     expect(onDisconnected).toHaveBeenCalledWith('player-2', 'Bob');

     // Reconnect within 15s grace period
     vi.advanceTimersByTime(5000); // 5 seconds in
     room.handlePlayerReconnect('player-2');

     expect(onReconnected).toHaveBeenCalledWith('player-2', 'Bob');
     expect(room.isPlayerDisconnected('player-2')).toBe(false);

     // Advance past grace period - should NOT remove
     vi.advanceTimersByTime(15000);
     expect(onRemoved).not.toHaveBeenCalled();

     // Player still in room
     expect(room.getState().players).toHaveLength(2);
   });
   ```

4. **Add new test** "lobby host disconnect triggers host-left after grace period":
   ```typescript
   test('lobby host disconnect triggers host-left after grace period', () => {
     const room = new Room('player-1', 'Alice');
     room.addPlayer('player-2', 'Bob');

     const onRemoved = vi.fn();
     room.setDisconnectCallbacks({
       onDisconnected: vi.fn(),
       onReconnected: vi.fn(),
       onRemoved,
     });

     room.handlePlayerDisconnect('player-1');
     expect(onRemoved).not.toHaveBeenCalled();

     vi.advanceTimersByTime(15000);
     expect(onRemoved).toHaveBeenCalledWith('player-1', 'Alice', 'host-left');
   });
   ```

5. **Add new test** "lobby grace period is shorter than in-game grace period":
   ```typescript
   test('lobby grace period (15s) is shorter than in-game grace period (90s)', () => {
     const room = new Room('player-1', 'Alice');
     room.addPlayer('player-2', 'Bob');

     const onRemoved = vi.fn();
     room.setDisconnectCallbacks({
       onDisconnected: vi.fn(),
       onReconnected: vi.fn(),
       onRemoved,
     });

     room.handlePlayerDisconnect('player-2');

     // Should NOT be removed at 14 seconds
     vi.advanceTimersByTime(14000);
     expect(onRemoved).not.toHaveBeenCalled();

     // Should be removed at 15 seconds
     vi.advanceTimersByTime(1000);
     expect(onRemoved).toHaveBeenCalledWith('player-2', 'Bob', 'timeout');
   });
   ```
  </action>
  <verify>Run `make test-server` to confirm all tests pass including the new lobby grace period tests. Then run `make lint` to verify no lint issues.</verify>
  <done>Tests updated: lobby disconnect uses 15-second grace period, lobby reconnect within grace period works, host lobby disconnect triggers host-left after grace period. All existing in-game disconnect tests still pass.</done>
</task>

</tasks>

<verification>
1. `make type-check` passes with no errors
2. `make test-server` passes with all disconnect tests green
3. `make lint` passes with no new warnings
4. Manual verification: Start dev server, create room, join with second browser tab, refresh the guest tab - guest should reconnect to lobby within seconds (not redirect to home page)
</verification>

<success_criteria>
- Lobby player who refreshes the page reconnects to the lobby (not redirected to home)
- Lobby player disconnected for >15 seconds is removed as before
- In-game 90-second grace period is completely unchanged
- All server tests pass
- Type checks and lint pass
</success_criteria>

<output>
After completion, create `.planning/quick/005-fix-guest-returning-to-home-page-on-lobb/005-SUMMARY.md`
</output>
