---
phase: quick-006
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared/src/schemas/messages.ts
  - packages/shared/src/types/messages.ts
  - packages/server/src/websocket/handlers.ts
  - packages/server/src/rooms/Room.ts
  - packages/client/src/router.ts
  - packages/client/src/components/Landing.vue
  - packages/client/src/components/Lobby.vue
  - packages/client/src/composables/useGameSocket.ts
autonomous: true

must_haves:
  truths:
    - "Player can rename themselves in the lobby by clicking their name"
    - "Clicking a share link (/#/room/CODE) shows landing page with room code pre-filled and a 'Join Room' prompt"
    - "After entering nickname on share-link landing, player joins the room and lands in lobby"
    - "Renamed nickname is visible to all players in the lobby immediately"
  artifacts:
    - path: "packages/shared/src/schemas/messages.ts"
      provides: "rename-player client message schema"
      contains: "renamePlayerSchema"
    - path: "packages/server/src/websocket/handlers.ts"
      provides: "rename-player message handler"
      contains: "rename-player"
    - path: "packages/client/src/components/Lobby.vue"
      provides: "Inline rename UI for current player"
    - path: "packages/client/src/router.ts"
      provides: "Redirect from /room/:code to landing with query param when not in room"
  key_links:
    - from: "packages/client/src/components/Lobby.vue"
      to: "useGameSocket send"
      via: "send({ type: 'rename-player', nickname })"
      pattern: "rename-player"
    - from: "packages/client/src/router.ts"
      to: "packages/client/src/components/Landing.vue"
      via: "redirect with joinCode query param"
      pattern: "joinCode"
---

<objective>
Add lobby rename functionality and make share links work for joining rooms.

Purpose: Players need to rename in the lobby, and share links (/#/room/CODE) should let new players join by prompting for a nickname first.
Output: Working rename in lobby + functional share link join flow.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Key files to understand the current flow:
@packages/shared/src/schemas/messages.ts — Zod schemas for all WS messages
@packages/shared/src/types/messages.ts — TypeScript types derived from schemas
@packages/server/src/websocket/handlers.ts — Server-side message routing
@packages/server/src/rooms/Room.ts — Room class with player management
@packages/client/src/router.ts — Vue Router with hash history, guards
@packages/client/src/components/Landing.vue — Landing page with nickname + create/join
@packages/client/src/components/Lobby.vue — Lobby with player list
@packages/client/src/composables/useGameSocket.ts — Singleton WS composable
@packages/client/src/components/RoomCode.vue — Room code display + share link copy
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add rename-player message to shared + server</name>
  <files>
    packages/shared/src/schemas/messages.ts
    packages/shared/src/types/messages.ts
    packages/server/src/rooms/Room.ts
    packages/server/src/websocket/handlers.ts
    packages/client/src/composables/useGameSocket.ts
  </files>
  <action>
1. In `packages/shared/src/schemas/messages.ts`:
   - Add `renamePlayerSchema`:
     ```
     export const renamePlayerSchema = z.object({
       type: z.literal('rename-player'),
       nickname: z.string().min(1).max(20).trim(),
     });
     ```
   - Add `renamePlayerSchema` to the `clientMessageSchema` discriminated union.
   - Add `playerRenamedSchema` for server response (optional — can reuse `room-updated` since it already broadcasts full room state). Decision: Reuse `room-updated` — no new server message schema needed.

2. In `packages/shared/src/types/messages.ts`:
   - Add import for `renamePlayerSchema` in the import type list.
   - Add `export type RenamePlayerMessage = z.infer<typeof renamePlayerSchema>;`

3. In `packages/server/src/rooms/Room.ts`:
   - Add a `renamePlayer(playerId: string, newNickname: string): OperationResult` method:
     - Validate `newNickname.trim()` is 1-20 chars (same as addPlayer validation).
     - Check player exists in `this.players`.
     - Only allow rename when `this.status === 'waiting'` (lobby only, not during game). Return error code `INVALID_ACTION` with message "Can only rename in the lobby" if game has started.
     - Update `this.players.get(playerId).nickname` to the trimmed nickname.
     - If game state exists and has this player, also update `this.gameState.players` nickname (safety, though should not happen since rename is lobby-only).
     - Return `{ success: true }`.

4. In `packages/server/src/websocket/handlers.ts`:
   - Add a `case 'rename-player':` block in the switch statement:
     - Get `roomCode` from `ws.data.roomCode`. If null, return ROOM_NOT_FOUND error.
     - Get room from manager. If null, return ROOM_NOT_FOUND error.
     - Call `room.renamePlayer(ws.data.playerId, message.nickname)`.
     - On failure, send error message back.
     - On success, broadcast `room-updated` with `room.getState()` to both the sender (via `sendMessage`) and other players (via `publishToRoom`).

5. In `packages/client/src/composables/useGameSocket.ts`:
   - No changes needed — the `send` function already accepts `ClientMessage` which will auto-include the new `rename-player` type after the schema update. The `room-updated` response is already handled in the switch statement.
  </action>
  <verify>
    Run `make type-check` to confirm shared types compile. Run `make test-server` to verify no regressions.
  </verify>
  <done>
    New `rename-player` client message type exists in shared schemas. Server Room has `renamePlayer` method. Server handler routes `rename-player` and broadcasts `room-updated`. All type-checks pass.
  </done>
</task>

<task type="auto">
  <name>Task 2: Share link redirect + lobby rename UI</name>
  <files>
    packages/client/src/router.ts
    packages/client/src/components/Landing.vue
    packages/client/src/components/Lobby.vue
  </files>
  <action>
1. In `packages/client/src/router.ts`:
   - In the `router.beforeEach` guard, add handling for when a user navigates to `lobby` route (`to.name === 'lobby'`) but has no `roomState`:
     - After the reconnect wait logic, add a check: if `to.name === 'lobby'` and `!roomState.value`, redirect to `{ name: 'landing', query: { joinCode: to.params.code as string } }`.
     - This sends users who click a share link to the landing page with the room code pre-filled.

2. In `packages/client/src/components/Landing.vue`:
   - Import `useRoute` from `vue-router`.
   - On component setup, read `route.query.joinCode` (from the share link redirect).
   - If `joinCode` exists and is a string of length 6, pre-fill `roomCode.value` with it uppercased.
   - No other changes needed — the existing "Join Room" button and flow handles the rest. The user just needs to type a nickname and click Join.

3. In `packages/client/src/components/Lobby.vue`:
   - Add rename functionality to the current player's row in the player list:
     - Add reactive state: `const isRenaming = ref(false)` and `const newNickname = ref('')`.
     - For the current player's row (where `player.id === playerId`), show:
       - Default state: the nickname text with a small pencil/edit button next to it.
       - Editing state (when `isRenaming` is true): an inline text input pre-filled with current nickname, a confirm button, and a cancel button.
     - On confirm (or Enter key):
       - Validate `newNickname.value.trim()` is 1-20 chars.
       - Send `{ type: 'rename-player', nickname: newNickname.value.trim() }` via `send()`.
       - Set `isRenaming.value = false`.
     - On cancel (or Escape key): set `isRenaming.value = false`.
     - Style the edit button subtly (small gray text or icon, hover effect) so it doesn't clutter the lobby.
     - Only show the edit button for the current player (not for other players).
   - Use a text button labeled "edit" or a pencil character (Unicode: ✎) next to "(You)" text.
  </action>
  <verify>
    Run `make type-check` and `make lint` to confirm everything compiles and passes linting. Then `make dev` and:
    1. Open http://localhost:5173/#/room/FAKECODE — should redirect to landing with room code pre-filled.
    2. Create a room, verify the lobby shows the edit button next to your name.
    3. Click edit, type a new name, confirm — verify all players see the updated name.
    4. Copy the share link from lobby, open in incognito — should land on landing page with room code pre-filled.
  </verify>
  <done>
    Share links redirect to landing page with room code pre-filled. Lobby shows edit button for current player. Rename sends message to server and all players see the update via room-updated broadcast.
  </done>
</task>

</tasks>

<verification>
- `make type-check` passes (shared, server, client all compile)
- `make lint` passes
- `make test` passes (no regressions)
- Share link flow: visiting /#/room/ABC123 without being in room redirects to landing with ABC123 pre-filled in room code field
- Rename flow: clicking edit next to own name in lobby opens inline input, submitting broadcasts update to all players
- Nickname is still required (1-20 chars) for both create and join — existing validation unchanged
</verification>

<success_criteria>
1. A player clicking a share link sees the landing page with room code pre-filled and can join after entering a nickname
2. A player in the lobby can rename themselves (lobby only, not during game)
3. All players in the lobby see the renamed player immediately
4. All existing tests pass, type-check passes, lint passes
</success_criteria>

<output>
After completion, create `.planning/quick/006-nickname-choice-rename-and-share-link/006-SUMMARY.md`
</output>
