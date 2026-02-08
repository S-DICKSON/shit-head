---
status: diagnosed
trigger: "Host disconnects during swap card phase and reconnects to lobby view instead of swap phase"
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Reconnect sends room-joined + game-dealt back-to-back; Landing.vue navigates to Lobby on room-joined, but Lobby.vue is not yet mounted when game-dealt fires, so game-dealt handler in Lobby never triggers navigation to /game
test: Traced full message flow through server reconnect handler -> client singleton -> component message handlers
expecting: N/A - root cause confirmed
next_action: Return diagnosis

## Symptoms

expected: Reconnecting host should be restored to swap phase with game state
actual: Host returns to lobby view instead of swap phase; guest remains in swap phase correctly
errors: None reported
reproduction: Host disconnects during swap card phase, then reconnects
started: After phase 09-04 implementation

## Eliminated

- hypothesis: Server does not send game phase on reconnect
  evidence: Server reconnect handler (handlers.ts:665-723) correctly sends both room-joined and game-dealt with full game view including phase
  timestamp: 2026-02-08T00:01:00Z

- hypothesis: Server does not include game phase in game-dealt message
  evidence: handlers.ts:706-720 sends gameView.phase, hand, faceUp, etc. via getPlayerView()
  timestamp: 2026-02-08T00:01:00Z

- hypothesis: Client does not process game-dealt message correctly
  evidence: useGameSocket.ts:127-141 correctly sets gameView.value with phase, hand, etc. when game-dealt is received
  timestamp: 2026-02-08T00:02:00Z

## Evidence

- timestamp: 2026-02-08T00:01:00Z
  checked: Server reconnect handler (handlers.ts:665-723)
  found: On reconnect, server sends room-joined THEN game-dealt back-to-back (lines 699-720). Both messages are sent synchronously via sendMessage() with no delay between them.
  implication: Client receives both messages in rapid succession

- timestamp: 2026-02-08T00:01:30Z
  checked: useGameSocket.ts singleton message processing (lines 82-87, 90-260)
  found: The auto-reconnect watcher (line 82-87) sends reconnect message when status becomes OPEN. The message handler (line 90-260) processes room-joined by setting roomState.value, then immediately processes game-dealt by setting gameView.value. Both messages are processed in the singleton scope, NOT in component-level handlers.
  implication: The singleton correctly updates state, but component-level onMessage handlers may not be registered yet

- timestamp: 2026-02-08T00:02:00Z
  checked: Landing.vue roomState watcher (lines 41-46)
  found: Landing.vue has `watch(roomState, (state) => { if (state && state.code) { router.push('/room/${state.code}'); } })`. When room-joined arrives and sets roomState.value, this triggers navigation to `/room/:code` (Lobby).
  implication: Navigation to Lobby is triggered by the room-joined message

- timestamp: 2026-02-08T00:02:30Z
  checked: Lobby.vue game-dealt handler (lines 49-72)
  found: Lobby.vue registers an onMessage handler that watches for game-dealt: `if (msg.type === 'game-dealt') { countdown.value = null; router.push('/game'); }`. This handler is registered in the component setup, which runs when Lobby.vue mounts.
  implication: Lobby.vue's handler can only fire AFTER the component has mounted and registered its handler

- timestamp: 2026-02-08T00:03:00Z
  checked: Timing of message processing vs component lifecycle
  found: The singleton processes room-joined -> sets roomState -> Landing.vue watcher fires -> router.push('/room/:code') -> Vue begins unmounting Landing and mounting Lobby -> Meanwhile, singleton has ALREADY processed game-dealt (setting gameView) -> Lobby.vue has NOT yet mounted -> Lobby's onMessage handler is NOT yet registered -> game-dealt message is never seen by Lobby.vue
  implication: This is a message ordering / component lifecycle race condition. The game-dealt message is processed before Lobby.vue can register its handler for it.

- timestamp: 2026-02-08T00:03:30Z
  checked: Lobby.vue onMounted guard (lines 41-46)
  found: Lobby.vue onMounted only checks `if (!roomState.value || !playerId.value) { router.push('/'); }`. It does NOT check if gameView already exists (indicating an in-progress game that should navigate to /game).
  implication: Even after mounting, Lobby.vue has no fallback logic to detect an already-active game and navigate forward

- timestamp: 2026-02-08T00:04:00Z
  checked: Game.vue guard (lines 12-16)
  found: Game.vue onMounted checks `if (!gameView.value) { router.push('/'); }`. The gameView IS populated by the singleton from game-dealt, but no one navigates to /game.
  implication: The data is there, but the navigation to /game never happens

- timestamp: 2026-02-08T00:04:30Z
  checked: Why guest player is not affected
  found: The guest player never disconnects, so they received game-dealt during normal game start flow (while already in Lobby.vue with its onMessage handler registered). The race condition only affects reconnecting players because both messages arrive at once during reconnect.
  implication: Confirms this is specifically a reconnect-time ordering issue

## Resolution

root_cause: |
  **Message ordering race condition during reconnect.** The server sends `room-joined` and `game-dealt` back-to-back on reconnect (handlers.ts:699-720). The client singleton (useGameSocket.ts) processes both immediately. When `room-joined` sets `roomState`, Landing.vue's watcher navigates to `/room/:code` (Lobby). But by the time Lobby.vue mounts and registers its `onMessage` handler, the `game-dealt` message has already been processed by the singleton. Lobby.vue's handler for `game-dealt -> router.push('/game')` never fires because it wasn't registered when the message arrived.

  Additionally, Lobby.vue's `onMounted` guard (line 42-46) only checks for missing roomState to redirect to landing -- it does NOT check if gameView already exists to redirect forward to /game. This means there is no fallback path to detect an in-progress game.

  Two gaps:
  1. Lobby.vue onMounted does not check for existing gameView (would fix the race)
  2. Landing.vue roomState watcher navigates to Lobby without considering game state (could skip Lobby entirely)

fix:
verification:
files_changed: []
