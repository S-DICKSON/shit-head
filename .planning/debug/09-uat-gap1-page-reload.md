---
status: diagnosed
trigger: "Page reload (Cmd+R) returns player to landing page instead of reconnecting to room"
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:00:00Z
---

## Current Focus

hypothesis: Multiple cascading issues prevent reconnect from working on page reload
test: Code trace through full reload flow
expecting: Identify all failure points in the reconnect chain
next_action: Document findings for fix implementation

## Symptoms

expected: After Cmd+R, app detects stored playerId/roomCode in localStorage, reconnects WebSocket, sends reconnect message, navigates back to the room/game.
actual: Player lands on `/#/` (Landing page) after every reload.
errors: None visible (silent failure).
reproduction: Join a room -> press Cmd+R -> observe landing page instead of lobby.
started: Since implementation (Phase 09-03/09-04).

## Evidence

- timestamp: 2026-02-08T00:01:00Z
  checked: useGameSocket.ts auto-reconnect watcher (lines 82-87)
  found: |
    The watcher uses `storedPlayerId` and `storedRoomCode` which are captured as
    const values from localStorage at singleton creation time (lines 15-16).
    Since `createGameSocket()` is a singleton (line 6, lines 311-314), these
    values are read ONCE when the singleton is first created. On page reload,
    the module is re-executed so a new singleton is created -- so the values
    ARE re-read from localStorage. This part is correct.
  implication: The auto-reconnect watcher CAN fire if storedPlayerId and storedRoomCode exist.

- timestamp: 2026-02-08T00:02:00Z
  checked: useGameSocket.ts auto-reconnect watcher trigger condition (line 83)
  found: |
    The watcher fires on `status` change. With `immediate: true` on useWebSocket
    (line 63), the connection opens immediately. The watcher watches for
    `newStatus === 'OPEN'`. This should fire when the WebSocket connects.
    However, there is a timing subtlety: the watcher is set up AFTER
    `useWebSocket()` returns (line 82 is after line 49). If useWebSocket
    connects synchronously or before the watcher is registered, the watcher
    would miss the initial OPEN status. In practice, WebSocket connections are
    async so the watcher should catch it. This is likely working correctly.
  implication: The reconnect message is likely being sent to the server.

- timestamp: 2026-02-08T00:03:00Z
  checked: Server handleClose for lobby disconnects (handlers.ts lines 727-770)
  found: |
    **ROOT CAUSE 1 (LOBBY SCENARIO):** When a player is in the lobby (no game in
    progress), `handleClose` takes the "else" branch at line 743. This calls
    `manager.leaveRoom(ws.data.playerId)` at line 756, which REMOVES the player
    from the room entirely. The player is gone from the server's room state.

    When the client reconnects and sends `{ type: 'reconnect', roomCode: '...' }`,
    the server handler at line 665 checks `roomState.players.some(p => p.id === ws.data.playerId)`
    (line 679). Since the player was already removed by handleClose, this check
    FAILS, and the server responds with `{ type: 'error', code: 'PLAYER_NOT_FOUND' }`.

    For the HOST specifically, the room is destroyed entirely (lines 747-754 publish
    error + line 756 leaveRoom destroys the room), so the reconnect gets
    `{ type: 'error', code: 'ROOM_NOT_FOUND' }`.
  implication: |
    Server-side lobby disconnect removes the player before they can reconnect.
    The reconnect handler only works for in-game disconnects with grace periods.
    Lobby reconnect is fundamentally broken at the server level.

- timestamp: 2026-02-08T00:04:00Z
  checked: Client-side navigation on reconnect (Landing.vue lines 41-46, Lobby.vue lines 41-45)
  found: |
    **ROOT CAUSE 2 (CLIENT ROUTING):** The router has no reconnect-aware navigation guard.
    On page reload, the browser navigates to `/#/` (the landing page). The Landing
    component mounts and calls `useGameSocket()`, which initializes the singleton
    and triggers the WebSocket connection.

    The Landing component has a watcher on `roomState` (line 41-46) that navigates
    to `/room/:code` when roomState is populated. The reconnect flow relies on
    this watcher: if the reconnect succeeds and the server sends `room-joined`,
    `roomState` would be set and Landing.vue's watcher would navigate to the lobby.

    However, even if reconnect worked, this creates a visible flash of the landing
    page before navigation occurs.

    The Lobby component has an `onMounted` guard (lines 41-45) that redirects to
    `/` if `!roomState.value || !playerId.value`. On page reload, the user lands
    on `/` not `/room/:code`, so this guard doesn't even come into play for the
    initial load. But if someone bookmarked the room URL and returned, they'd be
    redirected immediately because roomState is null at mount time (reconnect
    hasn't completed yet).
  implication: |
    No route guard intercepts the initial navigation to check localStorage and
    wait for reconnect completion. The Landing page shows immediately.

- timestamp: 2026-02-08T00:05:00Z
  checked: Landing.vue roomState watcher behavior during reconnect error
  found: |
    **ROOT CAUSE 3 (ERROR NOT HANDLED):** When the reconnect fails (server sends
    error PLAYER_NOT_FOUND or ROOM_NOT_FOUND), the error is stored in
    `error.value` (useGameSocket.ts line 247), but the Landing component only
    watches `socketError` for display purposes. It does NOT clear the stale
    localStorage values (shithead-player-id, shithead-room-code).

    This means on every subsequent page load, the client will keep trying to
    reconnect with stale credentials, getting errors each time. The localStorage
    values are only cleared on explicit `leave-room` (line 266-268) or
    `player-removed` with reason `host-left` (line 237).
  implication: Stale localStorage values persist after failed reconnects, causing repeated failures.

- timestamp: 2026-02-08T00:06:00Z
  checked: Whether reconnect watcher sends the message correctly
  found: |
    The auto-reconnect watcher at line 82-87 sends:
    `wsSend(JSON.stringify({ type: 'reconnect', roomCode: storedRoomCode }))`

    This uses the raw `wsSend` from useWebSocket, NOT the typed `send()` wrapper.
    The typed `send()` (line 263) accepts `ClientMessage` and stringifies it.
    Using `wsSend` directly is fine since it just sends the raw string, but it
    bypasses the error-clearing logic at line 264 (`error.value = null`).
    Minor issue but not a blocker.
  implication: Message format is correct. Minor: error state not cleared before reconnect attempt.

- timestamp: 2026-02-08T00:07:00Z
  checked: Game.vue onMounted guard (lines 12-16)
  found: |
    Game.vue has `if (!gameView.value) { router.push('/'); }` in onMounted.
    If the user was in a game and reloads, they land on `/#/` (not `/#/game`).
    Even if reconnect somehow worked and the server sent `game-dealt`, the
    Landing component doesn't watch for `gameView` changes -- it only watches
    `roomState`. So even a successful game reconnect would navigate to the lobby
    page, not the game page.

    Furthermore, in the message handler (useGameSocket.ts line 108), `room-updated`
    only sets roomState if `roomState.value` is already truthy:
    `if (roomState.value) { roomState.value = message.room; }`
    But the reconnect handler sends `room-joined` (not `room-updated`), which
    DOES set roomState unconditionally (line 104-105). So reconnect to lobby
    would work IF the server accepted the reconnect.

    For game reconnect, the server sends BOTH `room-joined` AND `game-dealt`
    (handlers.ts lines 699-720). The `room-joined` would trigger Landing.vue's
    watcher to navigate to the lobby. Then when `game-dealt` arrives, it would
    set `gameView`, but the user is now on the Lobby page, which doesn't watch
    for game-dealt to navigate to /game.

    Wait -- Lobby.vue DOES have an `onMessage` handler (line 68-71) that
    navigates to `/game` when `msg.type === 'game-dealt'`. So the chain would
    be: reconnect -> room-joined -> Landing navigates to /room/:code -> Lobby
    mounts -> game-dealt arrives -> Lobby navigates to /game. This chain could
    work IF the timing is right and game-dealt hasn't already been processed
    before Lobby mounts.

    But there's a race: both `room-joined` and `game-dealt` are sent back-to-back
    by the server. The `room-joined` handler sets roomState, which triggers
    Landing.vue's watcher to navigate. But `game-dealt` may arrive and be processed
    BEFORE Lobby.vue mounts and registers its onMessage handler. Since the message
    handler in useGameSocket processes messages synchronously, both messages would
    be processed in the current tick. The Lobby component wouldn't have mounted yet.
  implication: |
    Game reconnect has an additional race condition: game-dealt may be processed
    before Lobby.vue mounts its message handler, so the user gets stuck in the lobby.

## Eliminated

(No hypotheses eliminated -- all investigated paths revealed real issues.)

## Resolution

root_cause: |
  There are 3 cascading root causes preventing page-reload reconnect:

  **RC1 (Server - Lobby disconnect removes player immediately):**
  `handleClose` in handlers.ts (line 756) calls `manager.leaveRoom()` for lobby
  disconnects, permanently removing the player. When the client reconnects, the
  server's reconnect handler can't find the player in the room. The reconnect
  handler at line 665-723 was designed for in-game disconnects where a grace
  period keeps the player in the room. Lobby disconnects have no grace period.

  **RC2 (Client - No reconnect-aware router guard):**
  The router (router.ts) has no navigation guard that checks localStorage for
  stored session data and waits for reconnect to complete before rendering the
  landing page. On reload, the user always sees the landing page first. Even if
  reconnect succeeded, there would be a visible flash.

  **RC3 (Client - Stale localStorage not cleared on reconnect failure):**
  When reconnect fails with PLAYER_NOT_FOUND or ROOM_NOT_FOUND errors, the
  localStorage values (shithead-player-id, shithead-room-code) are never cleared.
  This causes repeated failed reconnect attempts on every page load.

  **Additional issue (Race condition for game reconnect):**
  If reconnect were to work for in-game scenarios, the server sends `room-joined`
  and `game-dealt` back-to-back. Landing.vue's roomState watcher would navigate
  to the lobby, but game-dealt may be processed before Lobby.vue mounts its
  message handler, causing the user to get stuck in the lobby instead of the game.

fix: |
  Not applied (diagnosis only mode).

verification: |
  Not applicable (diagnosis only).

files_changed: []

## Suggested Fix Direction

1. **Server (RC1):** Add a lobby-level grace period or reconnect mechanism.
   Either add a short grace period for lobby disconnects (similar to in-game),
   or make handleClose a no-op for a brief window and let the reconnect handler
   re-add the player. Simplest approach: treat lobby Cmd+R as a fresh join -- on
   reconnect error, the client could fall back to sending a `join-room` message
   with the stored room code if the player has a stored nickname.

2. **Client Router (RC2):** Add a global `beforeEach` navigation guard in router.ts
   that checks localStorage for stored session credentials. If found, show a
   "Reconnecting..." state and wait for the reconnect WebSocket exchange to
   complete before navigating. On success, navigate to the appropriate route
   (lobby or game). On failure, clear localStorage and proceed to landing.

3. **Client Error Handling (RC3):** In the useGameSocket message handler, when
   an error is received in response to a reconnect attempt (PLAYER_NOT_FOUND,
   ROOM_NOT_FOUND), clear the localStorage values so future loads don't keep
   retrying stale credentials.

4. **Game Reconnect Race (bonus):** Handle game-dealt at the router/app level
   rather than relying on Lobby.vue's onMessage handler. Or have the reconnect
   flow navigate directly to `/game` if the server indicates a game is in progress
   (e.g., check if gameView is set after processing both messages).
