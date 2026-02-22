---
phase: 25-bot-player
plan: 01
subsystem: server-rooms
tags: [bot-player, room-management, shared-types, typescript, vitest]
requires:
  - packages/shared/src/types/room.ts (LobbyPlayer type)
  - packages/shared/src/schemas/messages.ts (clientMessageSchema)
  - packages/server/src/rooms/Room.ts (Room class)
provides:
  - LobbyPlayer.isBot field in shared types
  - add-bot and remove-bot Zod message schemas
  - AddBotMessage and RemoveBotMessage TypeScript types
  - Room.addBot() / removeBot() / isBot() / getBotIds() methods
  - Room.getState() with isBot on bot players
  - BotPlayer.selectMove() — deterministic move selection
affects:
  - 25-02 (BotPlayer integration into Room game loop)
  - 25-03 (WebSocket handler for add-bot/remove-bot messages)
tech-stack:
  added:
    - nanoid (named export) for bot ID generation
  patterns:
    - botPlayerIds Set as the source of truth for bot identity (separate from player objects)
    - Bot exclusion from markPlayAgain connected-player count
    - Deterministic bot strategy: lowest valid rank group, pickup, random face-down
key-files:
  created:
    - packages/server/src/rooms/__tests__/Room.bot.test.ts
    - packages/server/src/game/BotPlayer.ts
    - packages/server/src/game/__tests__/BotPlayer.test.ts (type-fixed)
    - .planning/phases/25-bot-player/25-01-SUMMARY.md
  modified:
    - packages/shared/src/types/room.ts
    - packages/shared/src/schemas/messages.ts
    - packages/shared/src/types/messages.ts
    - packages/server/src/rooms/Room.ts
key-decisions:
  - botPlayerIds Set tracks bot identity (not stored on player objects)
  - isBot field uses `|| undefined` in getState() so non-bots omit the field
  - Bots excluded from markPlayAgain connected-player count (they never click play-again)
  - BotPlayer.ts implemented now (not deferred) to fix pre-committed BotPlayer.test.ts
  - Bot cleanup in resetToLobby + autoReturnToLobby resets botNameCounter to 0
duration: 5 minutes
completed: 2026-02-22
---

# Phase 25 Plan 01: Bot Player Infrastructure Summary

**One-liner:** LobbyPlayer isBot field + add-bot/remove-bot Zod schemas + Room.addBot/removeBot/isBot/getBotIds + BotPlayer.selectMove with full test coverage.

## Performance

| Metric | Value |
|--------|-------|
| Start | 2026-02-22T03:19:48Z |
| End | 2026-02-22T03:24:39Z |
| Duration | ~5 minutes |
| Tasks | 2/2 |
| Files modified | 4 |
| Files created | 4 |
| Tests added | 35 (14 Room.bot + 21 BotPlayer) |
| Total tests passing | 375 |

## Accomplishments

1. **Shared types updated** — `LobbyPlayer` gains `isBot?: boolean`, lobbyPlayerSchema gains `isBot: z.boolean().optional()`

2. **New message schemas** — `addBotSchema` (type: add-bot, optional nickname) and `removeBotSchema` (type: remove-bot, botId) added to `clientMessageSchema` discriminated union with corresponding `AddBotMessage` / `RemoveBotMessage` TypeScript types

3. **Room bot management** — `addBot()`, `removeBot()`, `isBot()`, `getBotIds()` methods added; `getState()` includes `isBot: true` for bot players only; bots cleaned up on `resetToLobby()` and `autoReturnToLobby()`

4. **BotPlayer.selectMove** — Full deterministic move selection: play lowest valid rank group from hand, pickup when no valid cards, face-up phase with same logic, random face-down index for blind play

5. **Test coverage** — 14 Room.bot tests + 21 BotPlayer.selectMove tests (all cases: first turn, normal play, pickup, face-up, face-down, 7-constraint, special cards, empty pile, rank grouping)

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add isBot to shared types and message schemas | 9a935e6 | room.ts, messages.ts, messages.ts |
| 2 | Add bot management methods to Room and BotPlayer | fd47ef1 | Room.ts, BotPlayer.ts, *.test.ts |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `botPlayerIds` Set (not field on player object) | Single source of truth for bot identity; keeps player map structure unchanged; easy O(1) lookup |
| `isBot: this.botPlayerIds.has(p.id) \|\| undefined` | Omits field entirely for non-bots (keeps payloads clean, reduces bandwidth) |
| Exclude bots from `markPlayAgain` count | Bots never call markPlayAgain; without exclusion, resetToLobby would never trigger when bots are present |
| Implement BotPlayer.ts now | Pre-committed BotPlayer.test.ts (from research phase) caused test suite failure; fixing blocker required full implementation |
| `nanoid(8)` for bot IDs | Unique 8-char suffix on `bot_` prefix; reuses already-installed nanoid package |
| `botNameCounter` resets on return-to-lobby | Fresh lobby should restart Bot 1, Bot 2 naming sequence |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `makeCard` TypeScript conditional type in BotPlayer.test.ts**

- **Found during:** Task 2 type-check
- **Issue:** `Card extends { kind: 'standard'; rank: infer R } ? R : never` resolves to `never` because `Card` is a discriminated union containing joker (no `rank` field) — TypeScript distributes the conditional and intersection is `never`
- **Fix:** Changed to `rank: Rank, suit: Suit` using proper shared type imports
- **Files modified:** `packages/server/src/game/__tests__/BotPlayer.test.ts`
- **Commit:** fd47ef1

**2. [Rule 2 - Missing Critical] Fixed `markPlayAgain` to exclude bots from connected-player count**

- **Found during:** Task 2 test execution
- **Issue:** With bots in `players` map, `markPlayAgain` counted bots as "connected players" who must respond before `resetToLobby` triggers. Since bots never call `markPlayAgain`, the lobby would never reset when bots are present.
- **Fix:** Added `&& !this.botPlayerIds.has(pid)` filter in both `markPlayAgain` and `handlePlayerDisconnect` finished-phase checks
- **Files modified:** `packages/server/src/rooms/Room.ts`
- **Commit:** fd47ef1

**3. [Rule 3 - Blocking] Implemented BotPlayer.ts to unblock pre-committed test file**

- **Found during:** Task 2 test run
- **Issue:** `packages/server/src/game/__tests__/BotPlayer.test.ts` was committed in the research phase (commit `8a194d5`) and imported `../BotPlayer` which didn't exist, causing `Cannot find module` error and failing the entire test suite
- **Fix:** Created `packages/server/src/game/BotPlayer.ts` with full `selectMove` implementation passing all 21 pre-written tests
- **Files modified:** `packages/server/src/game/BotPlayer.ts` (created)
- **Commit:** fd47ef1

## Issues

None.

## Next Phase Readiness

- Plan 02 (BotPlayer game loop integration) can proceed — `BotPlayer.selectMove` is implemented and tested
- Plan 03 (WebSocket add-bot/remove-bot handlers) can proceed — schemas and Room methods are ready
- `Room.addBot()` returns the bot's ID for tracking; `Room.getBotIds()` provides the list for turn scheduling

## Self-Check: PASSED
