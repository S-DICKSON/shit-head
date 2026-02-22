---
phase: quick-032
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/server/src/rooms/Room.ts
  - packages/server/src/rooms/__tests__/Room.bot.test.ts
autonomous: true

must_haves:
  truths:
    - "Bots get playful names (Jess Bot, Bica Bot, Knox Bot, Joe Bot) instead of Bot 1, Bot 2"
    - "Bot names cycle through the pool without repeating until pool is exhausted"
    - "After game finishes, bots remain in the lobby instead of being removed"
    - "Bot name counter resets properly when all bots are manually removed"
  artifacts:
    - path: "packages/server/src/rooms/Room.ts"
      provides: "Playful bot name pool and lobby-persistent bots"
      contains: "BOT_NAMES"
    - path: "packages/server/src/rooms/__tests__/Room.bot.test.ts"
      provides: "Updated tests for new bot naming and lobby persistence"
  key_links:
    - from: "packages/server/src/rooms/Room.ts"
      to: "BOT_NAMES array"
      via: "addBot method"
      pattern: "BOT_NAMES"
---

<objective>
Give bots playful names and make them persist in the lobby after game ends.

Purpose: Bots currently get boring "Bot 1", "Bot 2" names and are removed when returning to lobby. Playful names make the experience more fun, and keeping bots in the lobby means the host doesn't have to re-add them for the next game.

Output: Updated Room.ts with playful bot name pool and lobby-persistent bot behavior. Updated tests.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/server/src/rooms/Room.ts
@packages/server/src/rooms/__tests__/Room.bot.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add playful bot name pool and update addBot naming</name>
  <files>packages/server/src/rooms/Room.ts</files>
  <action>
  1. Add a constant array at module level (above the Room class):
     ```ts
     const BOT_NAMES = ['Jess Bot', 'Bica Bot', 'Knox Bot', 'Joe Bot'];
     ```

  2. Replace the `botNameCounter` property with a `botNameIndex` property (number, starts at 0).

  3. In the `addBot` method (line ~164), change the default nickname logic from:
     ```ts
     const nickname = botNickname || 'Bot ' + (++this.botNameCounter);
     ```
     to:
     ```ts
     const nickname = botNickname || BOT_NAMES[this.botNameIndex++ % BOT_NAMES.length];
     ```
     This cycles through the pool. If more than 4 bots are added across games, it wraps around.

  4. In `resetToLobby()` (lines ~499-504): Instead of removing all bots, KEEP them. Remove the block that deletes bots:
     ```ts
     // REMOVE these lines:
     for (const botId of this.botPlayerIds) {
       this.players.delete(botId);
     }
     this.botPlayerIds.clear();
     this.botNameCounter = 0;
     ```
     But bots should still NOT count toward the "play-again" check. The existing logic in `markPlayAgain` already filters bots out (line ~448-449), so bots will correctly be excluded from the play-again vote. However, bots that are in the `players` map but NOT in `playAgainPlayers` will be treated as "didn't click play-again" and removed by the existing removal loop (lines 474-483). To fix this: add bots to `playAgainPlayers` set automatically before the removal loop runs, OR modify the removal loop to skip bots. The cleaner approach: in the removal loop at line 475, skip bot players:
     ```ts
     for (const [playerId] of this.players) {
       if (!this.playAgainPlayers.has(playerId) && !this.botPlayerIds.has(playerId)) {
         removedPlayerIds.push(playerId);
       }
     }
     ```
     And remove the bot cleanup block entirely (the `for (const botId of this.botPlayerIds)` block and `this.botPlayerIds.clear()` and `this.botNameCounter = 0`).

  5. In `autoReturnToLobby()` (lines ~535-540): Same change - KEEP bots instead of removing them. Remove the block:
     ```ts
     for (const botId of this.botPlayerIds) {
       this.players.delete(botId);
     }
     this.botPlayerIds.clear();
     this.botNameCounter = 0;
     ```
     The spectator promotion code that follows should still work since bots occupy player slots. But we need to be careful: if keeping bots + promoting spectators would exceed maxPlayers, only promote spectators up to the limit. Add a check before the spectator promotion loop:
     ```ts
     for (const [spectatorId, spectator] of this.spectators) {
       if (this.players.size >= this.maxPlayers) break;
       this.players.set(spectatorId, { ... });
     }
     ```
     (The existing code doesn't have this check, so add it.)

  6. Update `botNameCounter` references: the property rename from `botNameCounter` to `botNameIndex` should be applied. Initialize to 0 in constructor area (line ~40). The `removeBot` method doesn't touch the counter so it's fine. When ALL bots are manually removed via `removeBot`, the index doesn't reset - this is intentional (names would continue cycling, which is fine since manual removal is rare).
  </action>
  <verify>Run `make type-check-server` and `make type-check-shared` to verify no type errors.</verify>
  <done>Bot names come from the playful pool. Bots persist through lobby return. Type checks pass.</done>
</task>

<task type="auto">
  <name>Task 2: Update bot tests for new naming and lobby persistence</name>
  <files>packages/server/src/rooms/__tests__/Room.bot.test.ts</files>
  <action>
  1. Update test "addBot auto-generates nickname when none provided" (line ~18):
     Change expected nickname from `'Bot 1'` to `'Jess Bot'` (first name in pool).

  2. Update test "addBot increments auto-generated nickname counter" (line ~29):
     Change expected nicknames from `'Bot 1'`/`'Bot 2'` to `'Jess Bot'`/`'Bica Bot'`.

  3. Update test "resetToLobby removes all bots" (line ~167):
     Rename to "resetToLobby keeps bots in lobby". Update assertions:
     - After resetToLobby, `getBotIds()` should still have length 2 (not 0)
     - Bot players should still be in state.players with isBot true
     - The test currently checks that adding a new bot after reset gives 'Bot 1' - update this: after reset, adding another bot should give the next name from the pool (since 2 bots were already named 'Jess Bot' and 'Bica Bot', next should be 'Knox Bot')
     - Verify room status is 'waiting' and bots are present

  4. Add a new test "bot names cycle through pool":
     ```ts
     test('bot names cycle through playful name pool', () => {
       const room = createRoomWithHost();
       const r1 = room.addBot();
       expect(r1.success).toBe(true);
       if (r1.success) {
         const state = room.getState();
         const bot = state.players.find(p => p.id === r1.data);
         expect(bot?.nickname).toBe('Jess Bot');
       }
       // Remove and add more to verify cycling
       if (r1.success) room.removeBot(r1.data);
       // Add 3 more bots (fills remaining 3 slots)
       const names: string[] = [];
       for (let i = 0; i < 3; i++) {
         const r = room.addBot();
         if (r.success) {
           const s = room.getState();
           const bot = s.players.find(p => p.id === r.data);
           if (bot) names.push(bot.nickname);
         }
       }
       expect(names).toEqual(['Bica Bot', 'Knox Bot', 'Joe Bot']);
     });
     ```
  </action>
  <verify>Run `make test-server` to verify all bot tests pass. Run `make lint` to verify code style.</verify>
  <done>All bot tests pass with new playful names and lobby persistence behavior. Lint passes.</done>
</task>

</tasks>

<verification>
1. `make type-check` passes (no type errors from rename)
2. `make test-server` passes (all bot tests green)
3. `make lint` passes
</verification>

<success_criteria>
- Bots are named "Jess Bot", "Bica Bot", "Knox Bot", "Joe Bot" (cycling) instead of "Bot 1", "Bot 2"
- After game ends and players return to lobby, bots remain as players in the room
- All existing tests updated and passing
- No lint errors
</success_criteria>

<output>
After completion, create `.planning/quick/032-playful-bot-names-and-lobby-return/032-SUMMARY.md`
</output>
