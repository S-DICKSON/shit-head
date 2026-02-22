---
phase: quick-032
plan: 01
subsystem: ui
tags: [bots, lobby, room-management, naming]

# Dependency graph
requires:
  - phase: quick-028
    provides: bot player infrastructure (addBot, removeBot, botPlayerIds tracking)
provides:
  - Playful bot names cycling through ['Jess Bot', 'Bica Bot', 'Knox Bot', 'Joe Bot']
  - Bots persist in lobby after game ends (no longer removed on resetToLobby/autoReturnToLobby)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BOT_NAMES pool with modular index cycling (botNameIndex++ % BOT_NAMES.length)"
    - "Bots skip removal loop in resetToLobby via botPlayerIds.has() guard"

key-files:
  created: []
  modified:
    - packages/server/src/rooms/Room.ts
    - packages/server/src/rooms/__tests__/Room.bot.test.ts
    - packages/server/src/__tests__/bot-integration.test.ts

key-decisions:
  - "Bot names cycle indefinitely through pool (wrap around), index never resets even after manual removal"
  - "Bots skip the play-again removal loop rather than being added to playAgainPlayers set"
  - "autoReturnToLobby now guards spectator promotion with maxPlayers check since bots occupy slots"

patterns-established:
  - "Bot names: BOT_NAMES array at module level, botNameIndex increments without reset"

# Metrics
duration: 2min
completed: 2026-02-22
---

# Quick Task 032: Playful Bot Names and Lobby Return Summary

**Bots now get names from a playful pool (Jess Bot, Bica Bot, Knox Bot, Joe Bot) and persist in the lobby after each game instead of being removed.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-22T13:02:03Z
- **Completed:** 2026-02-22T13:04:02Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `BOT_NAMES` constant array with four playful names cycling via modular arithmetic
- Removed bot cleanup blocks from `resetToLobby` and `autoReturnToLobby` - bots stay as lobby players
- Added `maxPlayers` guard in `autoReturnToLobby` spectator promotion loop to prevent overflow
- Updated all bot tests to assert new naming and lobby-persistence behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Add playful bot name pool and update addBot naming** - `cc639a7` (feat)
2. **Task 2: Update bot tests for new naming and lobby persistence** - `874498b` (test)

**Plan metadata:** `(pending)` (docs: complete plan)

## Files Created/Modified
- `packages/server/src/rooms/Room.ts` - BOT_NAMES pool, botNameIndex, lobby-persistent bot logic
- `packages/server/src/rooms/__tests__/Room.bot.test.ts` - Updated naming assertions and new cycling test
- `packages/server/src/__tests__/bot-integration.test.ts` - Updated nickname assertion for new format

## Decisions Made
- Bot name index never resets (not even after manual removeBot calls) - names just keep cycling, which is intentional since manual removal is rare and the wrap-around at index 4 is harmless
- Bots skip the "didn't vote to play-again" removal loop rather than auto-voting. This is cleaner since bots are never expected to vote.
- Added maxPlayers guard for spectator promotion in autoReturnToLobby since bots now occupy player slots when returning to lobby

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated bot-integration.test.ts nickname assertion**
- **Found during:** Task 2 (running make test-server)
- **Issue:** `bot-integration.test.ts` line 28 asserted `toMatch(/^Bot \d+$/)` which no longer matched the new playful name format
- **Fix:** Changed assertion to `expect(bot?.nickname).toBe('Jess Bot')`
- **Files modified:** `packages/server/src/__tests__/bot-integration.test.ts`
- **Verification:** All 385 tests pass
- **Committed in:** `874498b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix was necessary for test correctness. No scope creep.

## Issues Encountered
None - straightforward execution once bot-integration.test.ts was identified as needing update.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Bot naming and lobby persistence complete
- Bots are ready for future enhancements (e.g., difficulty settings, custom name input)

---
*Phase: quick-032*
*Completed: 2026-02-22*

## Self-Check: PASSED
