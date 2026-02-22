---
phase: 25-bot-player
verified: 2026-02-22T11:44:51Z
status: passed
score: 6/6 must-haves verified
gaps: []
---

# Phase 25: Bot Player Verification Report

**Phase Goal:** Add a bot player that can join a game room and play autonomously following valid game rules, enabling solo play and manual testing without needing other human players.
**Verified:** 2026-02-22T11:44:51Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Bot joins a room as a regular player (server-side, no browser needed) | VERIFIED | `Room.addBot()` creates a `bot_` prefixed ID, adds to `players` map, tracks in `botPlayerIds` Set. No WebSocket required. `Room.ts:156-173` |
| 2 | Bot follows game rules: plays valid cards, picks up when needed, handles all phases | VERIFIED | `BotPlayer.selectMove()` uses `canPlayOnPile`/`getRankValue` from shared rules. 21 unit tests cover hand play, face-up play, face-down play, pickup, 7-constraint, special cards. `BotPlayer.ts:32-56` |
| 3 | Simple strategy: play lowest valid card, basic heuristics | VERIFIED | Strategy: lowest valid rank group from hand; if no valid cards, pickup; face-down phase uses random index; first-turn skips 2s. All implemented in `BotPlayer.ts` helpers. |
| 4 | Host can add/remove bots from lobby | VERIFIED | `add-bot` and `remove-bot` WebSocket handlers in `handlers.ts:1107-1171` enforce host-only, broadcast `room-updated`. Lobby.vue has "+ Add Bot" button and per-bot "Remove" button wired to `send({ type: 'add-bot' })` / `send({ type: 'remove-bot', botId })`. |
| 5 | Bots work in standalone web mode (Lobby.vue) | VERIFIED | `Lobby.vue` has `addBot()` / `removeBot()` functions, "+ Add Bot" button (hidden when full), robot emoji indicator `&#129302;`, and "Remove" button per bot player. All fully wired. |
| 6 | Bots work in Discord Activity mode (DiscordLobby.vue) | VERIFIED | `DiscordLobby.vue` has `addBot()` / `removeBot()` functions, robot emoji indicator, "Remove" button per bot, and "Add Bot" / "+ Add Bot" buttons (see note below). All wired to the same `send()` calls. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/types/room.ts` | `LobbyPlayer.isBot` field | VERIFIED | `isBot?: boolean` on line 15; included in `lobbyPlayerSchema` in messages.ts |
| `packages/shared/src/schemas/messages.ts` | `addBotSchema`, `removeBotSchema`, included in `clientMessageSchema` | VERIFIED | Lines 133-141, 158-159 — both schemas defined and registered in the discriminated union |
| `packages/server/src/rooms/Room.ts` | `addBot`, `removeBot`, `isBot`, `getBotIds` methods | VERIFIED | 1122 lines; all 4 methods implemented at lines 156, 176, 185, 189; `botPlayerIds` Set and `botNameCounter` managed throughout |
| `packages/server/src/game/BotPlayer.ts` | `selectMove` logic with real game-rules integration | VERIFIED | 104 lines; uses `canPlayOnPile`/`getRankValue`/`RANK_ORDER` from `@shit-head/shared`; covers all 3 play sources |
| `packages/server/src/websocket/handlers.ts` | `add-bot`/`remove-bot` handlers, `executeBotTurn`, `executeBotMove` | VERIFIED | 1271 lines; `executeBotTurn` at line 48 (1-2s delay, race-condition guarded); `executeBotMove` at line 68 (handles play/pickup/face-down, chains bot turns, skips sending to bot sockets); `add-bot` at 1107, `remove-bot` at 1140 |
| `packages/client/src/components/Lobby.vue` | Add Bot button, bot indicator, Remove button | VERIFIED | 413 lines; "+ Add Bot" button (v-if="!isRoomFull"), robot emoji (&#129302;) with v-if="player.isBot", "Remove" button with `@click="removeBot(player.id)"` |
| `packages/client/src/components/DiscordLobby.vue` | Same controls for Discord | VERIFIED | 414 lines; identical controls for bot indicator, Remove button; two "Add Bot" buttons (see anti-patterns below) |
| `packages/server/src/__tests__/bot-integration.test.ts` | Integration tests | VERIFIED | 155 lines; 9 tests covering add/remove/selectMove/room-full/post-start/getBotIds/isBot/swap-ready/game-state |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Lobby.vue addBot()` | `handlers.ts add-bot case` | `send({ type: 'add-bot' })` | WIRED | `addBot()` calls `send({ type: 'add-bot' })` at line 53; handler at 1107 validates host, calls `room.addBot()`, broadcasts `room-updated` |
| `Lobby.vue removeBot(id)` | `handlers.ts remove-bot case` | `send({ type: 'remove-bot', botId })` | WIRED | `removeBot(id)` calls `send({ type: 'remove-bot', botId: id })` at line 57; handler at 1140 validates host, calls `room.removeBot()`, broadcasts `room-updated` |
| `handlers.ts start-game` | `executeBotTurn` | `onPlayPhaseStart` callback + post-play checks | WIRED | `onPlayPhaseStart` callback checks if first player is bot (line 441-447); all human play handlers (play-cards, pickup-pile, play-face-down) check next player for bot and call `executeBotTurn` |
| `handlers.ts start-game` | Bot auto-ready in swap phase | `setTimeout → room.markPlayerReady(botId)` | WIRED | Lines 631-638: after `room.startGame()`, iterates `room.getBotIds()` and schedules `markPlayerReady` with 500-1500ms delay |
| `executeBotMove` | Bot turn chaining | `room.getGameState()` → check next player | WIRED | Lines 156-162: after each bot move, checks if next `currentPlayerIndex` is also a bot and chains `executeBotTurn` |
| `BotPlayer.selectMove` | `canPlayOnPile` (shared rules) | Import from `@shit-head/shared` | WIRED | Line 4 imports `canPlayOnPile, getRankValue, RANK_ORDER`; used in `selectLowestValidGroup` at line 95 |
| `Room.getState()` | `isBot` in player list | `botPlayerIds.has(p.id) || undefined` | WIRED | Line 343: `isBot: this.botPlayerIds.has(p.id) || undefined` — set for bots, omitted for humans |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Bot joins room server-side, no browser | SATISFIED | `addBot()` creates player entry without WebSocket |
| Bot plays valid cards (game rule compliance) | SATISFIED | Uses same `canPlayOnPile` shared rule function as GameEngine |
| Bot picks up when no valid cards | SATISFIED | `selectLowestValidGroup` returns `{ type: 'pickup' }` when `validCards.length === 0` |
| Bot handles swap phase | SATISFIED | Auto-readies with 500-1500ms delay via `markPlayerReady` |
| Bot handles face-up card phase | SATISFIED | `selectMove` routes to `selectLowestValidGroup(player.faceUp, ...)` |
| Bot handles face-down card phase | SATISFIED | `selectMove` returns random `{ type: 'face-down', faceDownIndex }` |
| Host can add/remove bots (lobby UI) | SATISFIED | Both Lobby.vue and DiscordLobby.vue have working controls |
| Bots cleared on return to lobby | SATISFIED | `resetToLobby()` and `autoReturnToLobby()` both clear `botPlayerIds` |
| Bot supports solo play (1 human + bots) | SATISFIED | `canStart()` only requires `players.size >= minPlayers` (2); bots count as players |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DiscordLobby.vue` | 333-340, 360-368 | Duplicate "Add Bot" button (two distinct buttons in same host controls block) | Warning | Cosmetic only — both buttons call the same `addBot()` function correctly; results in two visible buttons in the Discord lobby UI when host has room space |

No blocker anti-patterns. No TODO/FIXME/placeholder patterns detected in any verified files. No empty handlers. No stubs.

### Human Verification Required

The following items cannot be verified programmatically but the underlying code is confirmed wired correctly:

#### 1. Solo play end-to-end (1 human + 1-3 bots)

**Test:** Create a room, add 1 bot, start the game. Observe bot auto-readies during swap phase, then plays cards autonomously with a 1-2s think delay.
**Expected:** Bot takes its turn within ~1-2 seconds of the human's turn ending. Game completes without deadlock.
**Why human:** Bot turn execution uses `setTimeout` and requires a live WebSocket connection to observe.

#### 2. Duplicate "Add Bot" button in DiscordLobby.vue

**Test:** Open the Discord Activity as host with room slots available.
**Expected:** Two "Add Bot" buttons appear (one gray `+ Add Bot` before the round time selector, one blue `Add Bot` after). Both should work identically.
**Why human:** UI cosmetic issue — requires visual inspection to confirm whether this is acceptable or should be deduplicated.

#### 3. Bot chaining (multiple consecutive bot turns)

**Test:** Add 2-3 bots to a game. Observe that when bot A plays and bot B is next, bot B automatically plays after a delay.
**Expected:** No deadlock; bots chain correctly; human eventually gets their turn.
**Why human:** Chaining logic uses recursion through `executeBotTurn` — requires live game state to validate the race-condition guard works.

## Gaps Summary

No gaps found. All 6 must-haves are verified at all three levels (exists, substantive, wired). The bot feature is fully implemented:

- **Shared types/schemas:** `LobbyPlayer.isBot`, `addBotSchema`, `removeBotSchema` all defined and registered.
- **Server core:** `Room.addBot/removeBot/isBot/getBotIds` implemented; `botPlayerIds` Set tracks bots throughout the game lifecycle including cleanup on `resetToLobby` and `autoReturnToLobby`.
- **Bot AI:** `BotPlayer.selectMove` uses shared game rules (`canPlayOnPile`, `getRankValue`, `RANK_ORDER`) for all play phases. 21 unit tests pass covering edge cases (7-constraint, special cards, first turn, all play sources).
- **Handler wiring:** `add-bot`/`remove-bot` message handlers are host-only validated. Bot auto-ready during swap phase and bot turn execution on all human action paths are wired. Bot turn chaining for consecutive bot turns is implemented.
- **Client UI:** Both `Lobby.vue` and `DiscordLobby.vue` show bot indicators, Add Bot buttons, and per-bot Remove buttons. `DiscordLobby.vue` has a duplicate Add Bot button (cosmetic warning only).
- **Tests:** 9 integration tests in `bot-integration.test.ts` + 21 unit tests in `BotPlayer.test.ts` + 14 Room.bot tests. All 384 server tests pass.

---

_Verified: 2026-02-22T11:44:51Z_
_Verifier: Claude (gsd-verifier)_
