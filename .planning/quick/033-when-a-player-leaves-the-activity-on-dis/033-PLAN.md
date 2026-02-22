---
phase: quick-033
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared/src/schemas/messages.ts
  - packages/shared/src/types/messages.ts
  - packages/server/src/websocket/handlers.ts
  - packages/server/src/rooms/Room.ts
  - packages/client/src/components/DiscordLobby.vue
autonomous: true

must_haves:
  truths:
    - "When a Discord user leaves the activity, they are immediately removed from the lobby (no 15s grace period)"
    - "When a Discord user leaves the activity during a game, they are immediately removed (no 90s grace period)"
    - "Remaining players see the updated player list immediately"
  artifacts:
    - path: "packages/shared/src/schemas/messages.ts"
      provides: "discord-participant-left client message schema"
      contains: "discord-participant-left"
    - path: "packages/client/src/components/DiscordLobby.vue"
      provides: "ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE subscription"
      contains: "ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE"
  key_links:
    - from: "packages/client/src/components/DiscordLobby.vue"
      to: "packages/server/src/websocket/handlers.ts"
      via: "discord-participant-left WebSocket message"
      pattern: "discord-participant-left"
---

<objective>
Remove players from the game room immediately when they leave a Discord Activity, instead of relying on the WebSocket disconnect grace period (15s lobby / 90s in-game).

Purpose: When a player closes the Discord Activity, their iframe is destroyed and their WebSocket eventually closes. But the server's grace period keeps them in the room as a "disconnected" player. In Discord, leaving the activity is always intentional (no accidental page refresh), so the remaining clients should detect the departure via the Discord SDK's `ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE` event and tell the server to remove the player immediately.

Output: New `discord-participant-left` message type, server handler to force-remove departed players, and DiscordLobby subscription to SDK participant events.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/shared/src/schemas/messages.ts
@packages/shared/src/types/messages.ts
@packages/server/src/websocket/handlers.ts
@packages/server/src/rooms/Room.ts
@packages/client/src/components/DiscordLobby.vue
@packages/client/src/platform/adapters/discord/DiscordAuthAdapter.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add discord-participant-left message type and server handler</name>
  <files>
    packages/shared/src/schemas/messages.ts
    packages/shared/src/types/messages.ts
    packages/server/src/websocket/handlers.ts
    packages/server/src/rooms/Room.ts
  </files>
  <action>
1. In `packages/shared/src/schemas/messages.ts`:
   - Add a new schema `discordParticipantLeftSchema`:
     ```typescript
     export const discordParticipantLeftSchema = z.object({
       type: z.literal('discord-participant-left'),
       discordUserId: z.string().regex(/^\d{17,20}$/),
     });
     ```
   - Add `discordParticipantLeftSchema` to the `clientMessageSchema` discriminated union array.

2. In `packages/shared/src/types/messages.ts`:
   - Add `DiscordParticipantLeftMessage` type: `export type DiscordParticipantLeftMessage = z.infer<typeof discordParticipantLeftSchema>;`
   - Add the import for `discordParticipantLeftSchema` in the import block.

3. In `packages/server/src/rooms/Room.ts`:
   - Add a public method `findPlayerByDiscordUserId(discordUserId: string): string | null` that iterates `this.players` and returns the player ID whose `discordUserId` matches, or null if not found. Also check `this.spectators`.
   - Add a public method `forceRemovePlayer(playerId: string): { removed: boolean; roomDestroyed: boolean }` that:
     a. Clears any disconnect grace period timer for that player (`this.disconnectedPlayers` entry)
     b. If the room has an active game:
        - If it's the player's turn, advances to next player (same logic as `removePlayerAfterTimeout`)
        - Clears the player's cards in gameState (mark as eliminated)
        - Checks for game-end condition (< 2 players remaining)
        - Fires `onPlayerRemoved` callback with reason 'timeout'
     c. If room is in lobby (no game), calls `this.removePlayer(playerId)`
     d. Returns whether the room should be destroyed (host left with nobody else)
     IMPORTANT: When the host leaves, use `migrateHost` logic exactly as `removePlayerAfterTimeout` does: find remaining connected non-disconnected players and migrate to them, or destroy if none remain.

4. In `packages/server/src/websocket/handlers.ts`:
   - Add a `case 'discord-participant-left':` handler in the `handleMessage` switch:
     a. Get the room from `ws.data.roomCode`
     b. If no room, return silently (no error needed)
     c. Call `room.findPlayerByDiscordUserId(message.discordUserId)` to find the target player ID
     d. If not found, return silently
     e. If the found player ID equals `ws.data.playerId`, return silently (can't remove yourself this way -- your own WS close handles it)
     f. Call `room.forceRemovePlayer(targetPlayerId)`
     g. Call `manager.removePlayerIndex(targetPlayerId)` to clean up the player-room index
     h. If `roomDestroyed`, call `manager.destroyRoom(roomCode)`
     i. If not destroyed, remove the departed player's socket from `playerSockets` map
     j. Broadcast `room-updated` with `room.getState()` to remaining players via `broadcastToRoom`

     NOTE: The `forceRemovePlayer` method fires callbacks (onPlayerRemoved, onHostMigrated, etc.) which already handle broadcasting disconnect/removal notifications. After `forceRemovePlayer`, just broadcast `room-updated` so remaining clients refresh the player list. But be careful not to double-broadcast: check if `forceRemovePlayer` already handled it via callbacks. The safest approach is to NOT broadcast room-updated from the handler itself if in-game (callbacks handle it), but DO broadcast for lobby state since lobby disconnect callbacks don't always send room-updated.

     Actually, simplest correct approach for the handler:
     - Set up disconnect callbacks on the room if not already set (same pattern as `handleClose` for lobby)
     - Then call the existing `room.handlePlayerDisconnect(targetPlayerId)` followed immediately by the room's internal `removePlayerAfterTimeout(targetPlayerId)` -- but that method is private.

     REVISED approach -- cleanest: In `Room.ts`, add `forceDisconnectPlayer(playerId: string): void` that:
     a. If player has an existing disconnect grace timer, clear it
     b. Call `removePlayerAfterTimeout(playerId)` directly (immediate removal, no grace)

     Then in `handlers.ts`:
     - Ensure disconnect callbacks are set on the room (same check as `handleClose` lobby path)
     - Call `room.forceDisconnectPlayer(targetPlayerId)`
     - After the force disconnect, if room still exists, broadcast `room-updated`
     - Clean up: `playerSockets.delete(targetPlayerId)`, `manager.removePlayerIndex(targetPlayerId)` (note: removePlayerAfterTimeout callback may already handle some of this via onPlayerRemoved -> manager.removePlayerIndex, so check the callback flow)

     Looking at the callback flow in handleClose:
     - onRemoved for non-host calls `manager.removePlayerIndex(removedPlayerId)` and broadcasts `room-updated`
     - onRemoved for host-left calls `manager.destroyRoom(room.code)`
     - onHostMigrated calls `manager.removePlayerIndex(oldHostId)` and broadcasts `room-updated`

     So the callbacks already handle cleanup. The handler just needs to:
     1. Ensure callbacks are wired (if not already from a game start or prior disconnect)
     2. Call `room.forceDisconnectPlayer(targetPlayerId)`
     3. Clean up `playerSockets.delete(targetPlayerId)` (the departed player's WS may still be in the map if their WS hasn't closed yet)
  </action>
  <verify>
    Run `make type-check` to verify all types compile.
    Run `make test` to verify existing tests still pass.
  </verify>
  <done>
    New `discord-participant-left` message type exists in shared schemas. Server handler finds player by Discord user ID and force-removes them immediately (bypassing grace period). Room.forceDisconnectPlayer method exists and works for both lobby and in-game states.
  </done>
</task>

<task type="auto">
  <name>Task 2: Subscribe to Discord SDK participant updates in DiscordLobby</name>
  <files>
    packages/client/src/components/DiscordLobby.vue
  </files>
  <action>
1. In `DiscordLobby.vue`, after authentication completes and the room is joined (after `isAuthenticating.value = false`), subscribe to the Discord SDK's `ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE` event.

2. Import `Events` from `@discord/embedded-app-sdk` (dynamic import is NOT needed here since DiscordLobby.vue is only rendered in Discord mode, and DiscordAuthAdapter already imported the SDK).

3. In the `onMounted` async function, after successful auth and join:
   ```typescript
   // Subscribe to participant changes
   const sdk = discordAuth.getSdk();

   const handleParticipantUpdate = (event: { participants: Array<{ id: string }> }) => {
     if (!roomState.value) return;

     // Build set of current Discord participant IDs
     const participantIds = new Set(event.participants.map(p => p.id));

     // Check each room player with a discordUserId
     for (const player of roomState.value.players) {
       if (player.discordUserId && !participantIds.has(player.discordUserId)) {
         // This player's Discord user is no longer in the activity
         // Don't remove yourself (your own WS close handles it)
         if (player.id === playerId.value) continue;

         send({
           type: 'discord-participant-left',
           discordUserId: player.discordUserId,
         });
       }
     }
   };

   sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', handleParticipantUpdate);
   ```

4. Store the unsubscribe function and call it in `onUnmounted`:
   ```typescript
   // In the cleanup
   sdk.unsubscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', handleParticipantUpdate);
   ```

5. To make the unsubscribe work cleanly across the async gap, store `sdk` and `handleParticipantUpdate` in component-level variables (refs or plain lets declared before onMounted) so onUnmounted can access them.

6. Also subscribe in the Game.vue component context -- actually, DiscordLobby is only the lobby. When in-game, the component is Game.vue. The participant update listener needs to work during gameplay too.

   REVISED: Instead of putting the listener only in DiscordLobby.vue, put it in the `onMounted` of DiscordLobby.vue but DON'T unsubscribe on unmount (the SDK subscription persists across route changes since the SDK instance persists). The subscription will fire regardless of which Vue component is active. The `send()` function from `useGameSocket()` is a singleton and always available.

   Actually, the cleanest approach: Add the subscription right after auth succeeds, keep it alive for the lifetime of the app. Since DiscordLobby is mounted once and the user navigates to /game and back, but the SDK persists, the subscription should be set up once and never torn down.

   Implementation:
   - After auth, subscribe to `ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE`
   - In the handler, check `roomState.value` (from useGameSocket singleton) for player list
   - Do NOT unsubscribe in onUnmounted (let it persist through game navigation)
   - This means the handler will fire during gameplay too, which is exactly what we want
  </action>
  <verify>
    Run `make type-check` to verify types compile.
    Run `make lint` to verify no lint errors.
  </verify>
  <done>
    DiscordLobby.vue subscribes to `ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE` after authentication. When a Discord user leaves the activity, the handler compares current participants with room players and sends `discord-participant-left` for any departed player. The subscription persists across route navigation so it works during both lobby and gameplay.
  </done>
</task>

</tasks>

<verification>
1. `make type-check` passes -- all new types compile correctly
2. `make test` passes -- existing tests unbroken
3. `make lint` passes -- no lint violations
</verification>

<success_criteria>
- New `discord-participant-left` client message schema in shared package
- Server handler finds player by discordUserId and force-removes them (no grace period)
- DiscordLobby subscribes to Discord SDK participant updates and sends removal messages
- All existing tests pass, types compile, lint clean
</success_criteria>

<output>
After completion, create `.planning/quick/033-when-a-player-leaves-the-activity-on-dis/033-SUMMARY.md`
</output>
