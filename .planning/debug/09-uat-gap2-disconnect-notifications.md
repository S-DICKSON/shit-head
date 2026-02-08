---
status: diagnosed
trigger: "Players do not see UI notifications when another player disconnects, reconnects, or is removed during a game"
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:00:00Z
---

## Current Focus

hypothesis: Disconnect/reconnect/removal message handlers exist in useGameSocket.ts but are no-ops — they do not update any reactive state or expose any data that the UI could render. There is also no toast/notification component anywhere in the client.
test: Search entire client codebase for toast/notification components, and inspect all three message handlers
expecting: No notification component exists; handlers have empty or stub logic
next_action: Write findings (investigation complete)

## Symptoms

expected: When a player disconnects, reconnects, or is removed, other players should see a visual notification/toast in the UI
actual: Server sends the messages correctly (confirmed via network inspector), but nothing renders on the client
errors: None (silent failure — messages are received and parsed without error, but produce no visible effect)
reproduction: Have 2+ players in a game, disconnect one player, observe other player's screen — no notification appears
started: Always broken — this UI was never implemented

## Eliminated

- hypothesis: Messages are not being received by the client
  evidence: Network inspector confirms messages arrive; useGameSocket.ts switch statement has cases for all three types; no parse errors in console
  timestamp: 2026-02-08

- hypothesis: Messages are received but handlers throw errors silently
  evidence: The handlers contain no code that could throw — they are literally empty (just comments) for player-disconnected and player-reconnected; player-removed only sets error.value for host-left case
  timestamp: 2026-02-08

## Evidence

- timestamp: 2026-02-08
  checked: useGameSocket.ts lines 227-245 — message handlers for player-disconnected, player-reconnected, player-removed
  found: |
    - `player-disconnected` (line 227-230): Handler is a NO-OP. Contains only a comment: "// Another player disconnected — UI can show a banner/indicator" and "// Store for potential UI use (Phase 10/11 will consume this)". No state is updated. No reactive ref is set.
    - `player-reconnected` (line 231-233): Handler is a NO-OP. Contains only a comment: "// Another player reconnected — UI can update indicator". No state is updated.
    - `player-removed` (line 234-245): Partially implemented. For `reason === 'host-left'`, it clears localStorage, nulls roomState/gameView, and sets `error.value = 'Host left — room closed'`. For `reason === 'timeout'` (another player removed), it is a NO-OP with only a comment.
  implication: The message handlers were intentionally stubbed as placeholders during Phase 09-03, with comments indicating UI work was deferred to Phase 10/11

- timestamp: 2026-02-08
  checked: Entire client codebase for any toast/notification/alert/banner component
  found: No toast or notification component exists anywhere in the client. Searched all files in packages/client/src/ for "toast", "notification", "notify", "alert", "banner" — only hit was the comment in useGameSocket.ts itself.
  implication: There is no notification system at all in the client — not just missing for disconnect events, but entirely absent

- timestamp: 2026-02-08
  checked: Game.vue component for any notification rendering area
  found: Game.vue (61 lines) is minimal — it renders SwapPhase, a playing placeholder, finished placeholder, and a loading fallback. No notification area, no error display, no toast container. It does not even destructure the `error` ref from useGameSocket.
  implication: Even the host-left error (which IS set in the handler) would not be visible in Game.vue since it doesn't render errors

- timestamp: 2026-02-08
  checked: Lobby.vue for disconnect notification handling
  found: Lobby.vue registers an onMessage handler but only listens for 'error' (ROOM_NOT_FOUND) and 'game-starting'/'game-dealt'. No handling of player-disconnected, player-reconnected, or player-removed. No notification UI area.
  implication: Even in the lobby view, disconnect events are completely unhandled at the UI level

- timestamp: 2026-02-08
  checked: App.vue for any global notification layer
  found: App.vue is 6 lines — just a `<div class="min-h-screen bg-green-900"><RouterView /></div>`. No global notification container.
  implication: There is no app-level place where notifications could be rendered

- timestamp: 2026-02-08
  checked: useGameSocket.ts exported state — what reactive refs are returned
  found: Returns playerId, roomState, error, gameView, swapTimeRemaining, readyPlayers, swapPhaseComplete, swapPhaseReason, turnTimeRemaining, turnTimerPlayerIndex. No ref for disconnected players, notifications, or connection status of other players.
  implication: Even if a component wanted to show disconnect status, there is no reactive state to consume

## Resolution

root_cause: |
  **This is entirely unimplemented UI, not broken logic.** Three distinct gaps:

  1. **No reactive state for disconnect events:** The useGameSocket.ts handlers for `player-disconnected` and `player-reconnected` are intentional no-ops (empty case blocks with comments like "Phase 10/11 will consume this"). They do not populate any reactive ref that a component could render.

  2. **No notification/toast component:** The client has zero notification infrastructure. No toast component, no notification composable, no global notification container in App.vue. There is nowhere for transient messages to be displayed.

  3. **No notification rendering in Game.vue or Lobby.vue:** Neither view has any area for displaying transient player status messages. Game.vue doesn't even use the `error` ref. The partial `player-removed` handler that sets `error.value = 'Host left — room closed'` would only be visible on Landing.vue (the only view that renders `errorMessage`), and only after navigation — not as an in-game notification.

  The Phase 09-03 implementation explicitly deferred UI rendering to a future phase (comments reference "Phase 10/11"). This is a known implementation gap, not a regression.

fix: |
  To resolve, the following needs to be built:

  1. **Add reactive state in useGameSocket.ts:**
     - Add a `notifications` ref (array of `{id, type, message, timestamp}`)
     - In `player-disconnected` handler: push a notification like "{nickname} disconnected"
     - In `player-reconnected` handler: push a notification like "{nickname} reconnected"
     - In `player-removed` handler (timeout): push "{nickname} was removed (timed out)"
     - In `player-removed` handler (host-left): push "Host left - room closing" then navigate

  2. **Create a Toast/Notification component:**
     - A `NotificationToast.vue` component that renders a stack of notifications
     - Auto-dismiss after ~5 seconds
     - Different styling for disconnect (warning/yellow), reconnect (success/green), removed (error/red)

  3. **Mount notification component globally:**
     - Add `<NotificationToast />` to App.vue so it renders above all routes
     - Or add it individually to Game.vue and Lobby.vue

verification:
files_changed: []
