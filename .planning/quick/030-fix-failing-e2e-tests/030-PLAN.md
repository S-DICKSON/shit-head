---
phase: quick-030
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/e2e/tests/home.spec.ts
  - packages/e2e/tests/lobby.spec.ts
  - packages/e2e/tests/game.spec.ts
autonomous: true

must_haves:
  truths:
    - "All 7 viewport projects pass home.spec.ts (6 tests each = 42 total)"
    - "All 7 viewport projects pass lobby.spec.ts (6 tests each = 42 total)"
    - "game.spec.ts has no redundant tests; consolidated tests still verify the same behaviors"
    - "All E2E tests pass with make e2e (0 failures)"
  artifacts:
    - path: "packages/e2e/tests/home.spec.ts"
      provides: "WS-mocked home screen tests"
      contains: "routeWebSocket"
    - path: "packages/e2e/tests/lobby.spec.ts"
      provides: "WS-mocked lobby screen tests"
      contains: "routeWebSocket"
    - path: "packages/e2e/tests/game.spec.ts"
      provides: "Consolidated game screen tests with no redundancy"
  key_links:
    - from: "home.spec.ts"
      to: "LandingPage.waitForConnected()"
      via: "routeWebSocket mock makes WS connect succeed without real server"
      pattern: "routeWebSocket.*game-ws"
    - from: "lobby.spec.ts"
      to: "LobbyPage"
      via: "routeWebSocket mock handles create-room with status:waiting response"
      pattern: "status.*waiting"
---

<objective>
Fix all 63 failing E2E tests by converting home.spec.ts and lobby.spec.ts to use WebSocket mocking (same pattern as game.spec.ts/swap-phase.spec.ts), and consolidate redundant tests in game.spec.ts.

Purpose: Make the entire E2E suite self-contained and passing without depending on Docker WS proxy (known issue).
Output: All E2E tests green with `make e2e`.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/e2e/tests/home.spec.ts
@packages/e2e/tests/lobby.spec.ts
@packages/e2e/tests/game.spec.ts
@packages/e2e/tests/swap-phase.spec.ts
@packages/e2e/tests/pages/LandingPage.ts
@packages/e2e/tests/pages/LobbyPage.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add WS mocking to home.spec.ts and lobby.spec.ts</name>
  <files>packages/e2e/tests/home.spec.ts, packages/e2e/tests/lobby.spec.ts</files>
  <action>
**home.spec.ts:**

Add a minimal WS mock helper at the top of the file (before the test.describe). This mock only needs to:
1. Intercept `**/game-ws**` via `page.routeWebSocket`
2. Handle `ping` -> respond with `pong`
3. No need to handle `create-room` — home tests never create a room

The mock makes `waitForConnected()` succeed because the WS connects (isConnected becomes true in the Vue store), which enables the Create button when a nickname is filled.

Only 3 of the 6 tests need the mock — the ones that call `waitForConnected()`:
- "create room button becomes enabled after WS connects" (line 27)
- "create room button disabled without nickname" (line 36)
- "join room button disabled without room code" (line 45)

For these 3 tests, add `await setupHomeMock(page);` as the first line (before `const landing = new LandingPage(page)`).

The other 3 tests (heading render, no scroll, maxlength) do NOT need the mock — leave them unchanged.

The mock function:
```typescript
async function setupHomeMock(page: Page) {
  await page.routeWebSocket('**/game-ws**', ws => {
    ws.onMessage(rawMsg => {
      if (rawMsg === 'ping') { ws.send('pong'); }
    });
  });
}
```

Add `type Page` to the import from `@playwright/test`.

**lobby.spec.ts:**

Add a WS mock helper that handles both ping/pong AND `create-room` -> `room-created`. The key difference from game.spec.ts/swap-phase.spec.ts mocks: use `status: 'waiting'` (not 'playing') and only 1 player (the host). This is a lobby test — the game hasn't started.

The mock function:
```typescript
async function setupLobbyMock(page: Page) {
  await page.routeWebSocket('**/game-ws**', ws => {
    ws.onMessage(rawMsg => {
      if (rawMsg === 'ping') { ws.send('pong'); return; }
      let msg: { type: string };
      try { msg = JSON.parse(rawMsg as string); } catch { return; }

      if (msg.type === 'create-room') {
        ws.send(JSON.stringify({
          type: 'room-created',
          playerId: 'test-player-1',
          room: {
            code: 'TEST00',
            status: 'waiting',
            players: [
              { id: 'test-player-1', nickname: '', isHost: true, isConnected: true },
            ],
            hostId: 'test-player-1',
            minPlayers: 2,
            maxPlayers: 4,
            roundTime: 45,
          },
        }));
      }
    });
  });
}
```

Note: The player nickname is '' (empty) in the mock response because the actual nickname comes from the `createRoom(nickname)` call on the client side — the Vue store sets it locally. The server's room-created response is what triggers navigation. The lobby UI reads the player name from the store, not from the WS response players array. However, to be safe and match what a real server would do, use the nickname from the create-room message. To do this, parse the full message:

```typescript
const fullMsg = JSON.parse(rawMsg as string) as { type: string; nickname?: string };
```

Then set the player nickname to `fullMsg.nickname || 'Player1'` in the response.

Wait — check how create-room is sent by the client. Look at what `landing.createRoom('Player1')` does: it fills the nickname input and clicks Create. The client's WS send for create-room likely includes the nickname. Check the actual message format by looking at the client code. But based on the existing game.spec.ts mock pattern, the mock doesn't read the nickname from the message — it just sends back a hardcoded response. Follow the same pattern: hardcode the response. The lobby tests check for specific nicknames (e.g., 'LobbyTester', 'Player1') so the nickname in the `room-created` response player object should match. But actually the lobby UI reads the nickname from the local Vue store (set when the user types it), not from the server response. So we can safely hardcode any nickname in the response — the displayed name comes from the store.

Use this simpler approach: hardcode the response (same as game.spec.ts pattern). The nickname in the players array doesn't matter for display — the store handles that.

Add `await setupLobbyMock(page);` as the first line of every test (before `const landing = new LandingPage(page)`).

Add `type Page` to the import from `@playwright/test`.
  </action>
  <verify>Run `make e2e` and confirm home.spec.ts and lobby.spec.ts pass across all 7 viewports (84 tests total, 0 failures from these files).</verify>
  <done>All 63 previously-failing tests now pass. home.spec.ts (42 tests across 7 viewports) and lobby.spec.ts (42 tests across 7 viewports) all green.</done>
</task>

<task type="auto">
  <name>Task 2: Consolidate redundant game.spec.ts tests</name>
  <files>packages/e2e/tests/game.spec.ts</files>
  <action>
Merge 2 pairs of redundant tests in game.spec.ts:

1. **Merge "shows face-up and face-down card areas" into "shows discard pile card":**
   - "shows face-up and face-down card areas" (line 144) only checks `page.getByText('Discard').toBeVisible()` — this is identical to what "shows discard pile card" (line 169) already does (plus more: it also checks the discard count badge).
   - Delete the "shows face-up and face-down card areas" test entirely. The "shows discard pile card" test already covers the Discard label visibility.

2. **Merge "action buttons visible within viewport" into "Pick Up Pile button fully visible":**
   - "action buttons visible within viewport" (line 217) checks Pick Up Pile button visibility + y-axis bounds.
   - "Pick Up Pile button fully visible" (line 251) does the same but also checks x-axis bounds (left + right edges).
   - Delete the "action buttons visible within viewport" test entirely. "Pick Up Pile button fully visible" is strictly more thorough.

Keep "hand cards fully visible within viewport" — it tests something distinct (each individual card's bounds).

After consolidation, game.spec.ts should have 9 tests (down from 11):
1. renders game UI with opponent visible
2. shows player hand cards
3. shows draw pile with count
4. shows discard pile card
5. leave button is visible
6. no horizontal scroll
7. no vertical scroll
8. hand cards fully visible within viewport
9. Pick Up Pile button fully visible
  </action>
  <verify>Run `make e2e` and confirm game.spec.ts has 9 tests per viewport (63 total), all passing.</verify>
  <done>game.spec.ts reduced from 11 to 9 tests with no redundancy. All 9 tests pass across all 7 viewports.</done>
</task>

</tasks>

<verification>
Run `make e2e` — expect 0 failures across all spec files and all 7 viewport projects.

Expected test counts per viewport:
- home.spec.ts: 6 tests
- lobby.spec.ts: 6 tests
- game.spec.ts: 9 tests (down from 11)
- swap-phase.spec.ts: 8 tests

Total per viewport: 29 tests
Total across 7 viewports: 203 tests (down from 217 = 175 passing + 14 removed + 63 fixed - 49 net)

Wait, let me recalculate:
- Previously: (6+6+11+8) * 7 = 217 total, 63 failing (9 tests * 7 viewports)
- After fix: (6+6+9+8) * 7 = 203 total, 0 failing
</verification>

<success_criteria>
- `make e2e` exits with 0 failures
- home.spec.ts uses WS mocking (no real server dependency)
- lobby.spec.ts uses WS mocking (no real server dependency)
- game.spec.ts has 9 non-redundant tests (2 removed)
- All tests are self-contained and reproducible
</success_criteria>

<output>
After completion, create `.planning/quick/030-fix-failing-e2e-tests/030-SUMMARY.md`
</output>
