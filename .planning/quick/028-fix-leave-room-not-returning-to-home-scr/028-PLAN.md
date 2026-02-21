---
phase: quick-028
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/src/composables/useGameSocket.ts
autonomous: true
---

<objective>
Fix "Leave Room" not navigating back to the home screen.

**Root cause:** When the user clicks "Leave Room" in Lobby.vue, `leaveRoom()` sends the WebSocket message and calls `router.push('/')`. However, the `send()` function in useGameSocket.ts only clears `localStorage` for `leave-room` — it does NOT clear `roomState.value`. The router guard in `router.ts` (lines 51-59) checks `roomState.value` on navigation to `landing` and, finding it still populated, redirects the user back to `/room/{code}`. The navigation to `/` is effectively blocked by the guard.

**Fix:** In the `send()` function inside useGameSocket.ts, when handling `leave-room`, also clear `roomState.value = null`, `gameView.value = null`, and `playerId.value = null` (plus clear `localStorage` for `shithead-player-id`). This ensures the router guard sees no active room state and allows navigation to `/` to proceed.

Purpose: Users must be able to leave a room and return to the landing page.
Output: Working leave-room flow that navigates to home screen.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/src/composables/useGameSocket.ts
@packages/client/src/router.ts
@packages/client/src/components/Lobby.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Clear all client state on leave-room in useGameSocket send()</name>
  <files>packages/client/src/composables/useGameSocket.ts</files>
  <action>
In the `send()` function (around line 433), find the `leave-room` handling block (lines 436-438). Expand it to also clear all relevant reactive state BEFORE sending the WebSocket message (so the router guard sees clean state when `router.push('/')` fires in Lobby.vue):

```typescript
if (msg.type === 'leave-room') {
  localStorage.removeItem('shithead-room-code');
  localStorage.removeItem('shithead-player-id');
  roomState.value = null;
  gameView.value = null;
  playerId.value = null;
  // Also reset spectator/notification state
  isSpectator.value = false;
  spectatorGameView.value = null;
  spectatorCount.value = 0;
}
```

This clears state synchronously before `wsSend()` and before the `router.push('/')` in Lobby.vue executes its navigation. The router guard at `router.ts:51-59` will then see `roomState.value === null` and allow the navigation to `/` to proceed.

Do NOT change Lobby.vue or router.ts — the fix belongs entirely in the composable's send() function where all leave-room cleanup is centralized.
  </action>
  <verify>
1. Run `make type-check` — must pass with no errors.
2. Run `make lint` — must pass.
3. Run `make test-client` — must pass (existing tests should not break).
4. Manual verification: Start dev server (`make dev`), create a room, click "Leave Room" — user should be redirected to the landing page at `/`.
  </verify>
  <done>
Clicking "Leave Room" in the lobby navigates the user back to the landing page. The router guard no longer blocks the navigation because roomState is cleared before the route change occurs.
  </done>
</task>

</tasks>

<verification>
- `make type-check` passes
- `make lint` passes
- `make test-client` passes
- Leave Room button in lobby navigates to landing page
</verification>

<success_criteria>
- User clicks "Leave Room" and is taken to the home screen (route `/`)
- All client state (roomState, gameView, playerId, localStorage) is cleared on leave
- No regressions in existing tests
</success_criteria>

<output>
After completion, create `.planning/quick/028-fix-leave-room-not-returning-to-home-scr/028-SUMMARY.md`
</output>
