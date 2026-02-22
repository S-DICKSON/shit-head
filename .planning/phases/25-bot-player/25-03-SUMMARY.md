---
phase: 25-bot-player
plan: 03
subsystem: server-websocket
tags: [bot-player, websocket, handlers, game-callbacks, typescript]

# Dependency graph
requires:
  - phase: 25-bot-player
    provides: "Room.addBot/removeBot/isBot/getBotIds (Plan 01), BotPlayer.selectMove (Plan 01/02), add-bot/remove-bot Zod schemas (Plan 01)"
provides:
  - "add-bot/remove-bot WebSocket message handling with host-only validation"
  - "executeBotTurn/executeBotMove module-level helpers for bot auto-play"
  - "Bot turn detection via onPlayPhaseStart callback"
  - "Bot chain turns (consecutive bots trigger each other)"
  - "Bot auto-ready during swap phase with random 500-1500ms delay"
  - "Bot turn chain after onTimeout auto-play"
  - "Add Bot button in DiscordLobby.vue host controls"
affects: [25-04, 25-05, client-bot-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "executeBotTurn: 1-2s think delay with race-condition guard (verify it's still bot's turn, bot still in room)"
    - "executeBotMove: handles all three BotMove types (play, pickup, face-down), chains next bot turn"
    - "Bot skip pattern in game-dealt loop: isBot() guard skips bots (no socket, no WS send)"
    - "Host-only validation pattern: roomState.hostId !== ws.data.playerId → NOT_HOST error"

key-files:
  created:
    - .planning/phases/25-bot-player/25-03-SUMMARY.md
  modified:
    - packages/server/src/websocket/handlers.ts
    - packages/client/src/components/DiscordLobby.vue

key-decisions:
  - "executeBotTurn and executeBotMove defined as module-level functions (not inside handler) — match existing sendMessage/broadcastToRoom pattern, accessible from multiple callback contexts"
  - "Bot auto-ready uses random 500-1500ms delay to stagger multiple bots from readying simultaneously"
  - "game-dealt loop skips bots (isBot() guard) — bots have no WebSocket connection, sendMessage would panic"
  - "Add Bot button added to DiscordLobby.vue to resolve pre-staged unused-vars lint errors (isRoomFull, addBot)"

patterns-established:
  - "Bot chain detection: after executeBotMove, check updatedState.players[currentPlayerIndex] and if isBot() call executeBotTurn"
  - "Race condition guard in executeBotTurn: verify gameState.phase === playing, currentPlayer matches botId, room.isBot(botId) all before acting"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 25 Plan 03: Bot WebSocket Integration Summary

**add-bot/remove-bot handlers + executeBotTurn/executeBotMove helpers wired into onPlayPhaseStart and onTimeout callbacks, enabling fully autonomous bot play with chain turns and swap-phase auto-ready**

## Performance

- **Duration:** ~3 minutes
- **Started:** 2026-02-22T03:29:56Z
- **Completed:** 2026-02-22T03:32:50Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

1. **add-bot/remove-bot handlers** — Host-only WebSocket message handling that calls `room.addBot(nickname)` and `room.removeBot(botId)`, broadcasts `room-updated` to all players via sendMessage + publishToRoom pattern

2. **executeBotTurn / executeBotMove helpers** — Module-level functions handling the full bot turn lifecycle: 1-2s think delay, race condition guards (phase check, player index check, isBot check), all three move types (play/pickup/face-down), broadcast to human players only, spectator broadcast for plays, and consecutive bot turn chaining

3. **onPlayPhaseStart bot detection** — After broadcasting `turn-changed`, checks if the first player is a bot and triggers `executeBotTurn` to start the autonomous turn cycle

4. **Bot auto-ready in swap phase** — After game-dealt messages sent to human players (bots skipped), all bot IDs get `markPlayerReady` called after 500-1500ms random delay to avoid simultaneous triggering

5. **onTimeout bot chain** — After human auto-play broadcast, checks if next player is a bot and triggers `executeBotTurn` to maintain bot turn flow through timeout events

6. **DiscordLobby.vue Add Bot button** — Connected pre-staged `addBot` and `isRoomFull` functions to the template, completing the bot management UI

## Task Commits

Each task committed atomically:

1. **Task 1: Add add-bot and remove-bot message handlers** - `39ae4f6` (feat)
2. **Task 2: Wire bot turn detection and auto-play into game callbacks** - `f7a4370` (feat)

## Files Created/Modified

- `packages/server/src/websocket/handlers.ts` — BotPlayer import, executeBotTurn/executeBotMove helpers, add-bot/remove-bot switch cases, onPlayPhaseStart bot detection, game-dealt bot skip, bot auto-ready, onTimeout bot chain
- `packages/client/src/components/DiscordLobby.vue` — Add Bot button added to host controls section (connecting isRoomFull + addBot to template)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Module-level executeBotTurn/executeBotMove | Must be accessible from multiple callbacks (onPlayPhaseStart, onTimeout, chaining); matches existing helper pattern |
| Skip game-dealt for bots | Bots have no WebSocket socket; sending to them would fail silently or crash |
| 500-1500ms bot ready delay | Avoids simultaneous markPlayerReady calls from multiple bots; stagger prevents edge cases in swap timer |
| Add Bot button in DiscordLobby.vue | Pre-staged `addBot`/`isRoomFull` functions caused lint failures; connecting them to template is correct behavior, not a workaround |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Add Bot button connected in DiscordLobby.vue template**

- **Found during:** Task 2 (`make lint` verification)
- **Issue:** Pre-staged commit `819f981` (feat(25-04)) added `isRoomFull` computed and `addBot()` function to DiscordLobby.vue but did NOT wire them into the template, only `removeBot` was in the template. ESLint reported 3 errors: `isRoomFull`, `addBot`, `removeBot` (all unused). `removeBot` was actually used but ESLint detected a Vue-specific issue; after adding the Add Bot button all 3 cleared.
- **Fix:** Added "Add Bot" / "Room Full" button to the host controls section in DiscordLobby.vue template
- **Files modified:** `packages/client/src/components/DiscordLobby.vue`
- **Verification:** `make lint` passes with 0 errors
- **Committed in:** `f7a4370` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical UI connection)
**Impact on plan:** Required to pass `make lint`. The fix completes expected bot UI — Add Bot button was clearly intended by the pre-staged functions.

## Issues Encountered

Pre-staged commits `9b65f2b` (Lobby.vue) and `819f981` (DiscordLobby.vue) existed between the Plan 02 doc commit and my Task 1 commit — same pattern as BotPlayer.test.ts in Plan 01. The DiscordLobby.vue commit added functions without connecting them to the template, causing lint failures that required the Rule 2 fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04 (client-side bot UI for standard Lobby.vue) — `9b65f2b` pre-staged commit already added Add Bot / Remove Bot buttons to Lobby.vue; review needed
- Plan 05 (integration testing) — bot handler wiring complete and ready for end-to-end test
- All bot infrastructure now connected: shared types → Room methods → BotPlayer logic → WebSocket handlers → client UI

---
*Phase: 25-bot-player*
*Completed: 2026-02-22*

## Self-Check: PASSED
