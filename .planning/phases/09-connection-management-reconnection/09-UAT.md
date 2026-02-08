---
status: diagnosed
phase: 09-connection-management-reconnection
source: 09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md, 09-05-SUMMARY.md, 09-06-SUMMARY.md
started: 2026-02-08T22:00:00Z
updated: 2026-02-08T22:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Page Reload During Game Restores State
expected: Start a game with 2+ players. During an active game (playing phase), reload the page (Cmd+R). After reload, you should be automatically returned to the game view with your cards and game state intact — not sent back to the landing page.
result: pass

### 2. Page Reload During Swap Phase Restores State
expected: Start a game with 2+ players. During the swap phase (before playing starts), reload the page. After reload, you should be returned to the correct phase — either the swap view or the game view, not stuck in the lobby.
result: pass

### 3. Disconnect Notification Toast (Other Players)
expected: With 2+ players in a game, disconnect one player (close their tab). The remaining players should see a yellow/warning toast notification near the top-right saying that player disconnected. The toast should auto-dismiss after about 5 seconds.
result: pass

### 4. Reconnect Within Grace Period
expected: After disconnecting a player (close tab), reopen the game URL within 90 seconds. The player should automatically reconnect with full state restored. Other players should see a green/success toast saying the player reconnected.
result: pass

### 5. Grace Period Timeout Removes Player
expected: Disconnect a non-host player and wait more than 90 seconds without reconnecting. The disconnected player should be removed. Other players should see a yellow/warning toast saying the player was removed (timed out). The game continues with remaining players.
result: issue
reported: "fail - when the player leaves the game still continues for the host player"
severity: major

### 6. Host Disconnect Notification and Room Close
expected: Have the host player disconnect and wait past the 90-second grace period. All remaining players should see a red/error toast saying "Host left — room closing" (or similar), and then be redirected to the landing page.
result: pass

### 7. Lobby Disconnect Immediate Removal
expected: With 2+ players in the lobby (before game starts), have a non-host player close their tab. The remaining players should see that player removed from the player list immediately — no 90-second wait.
result: pass

### 8. Failed Reconnect Clears Stale State
expected: Start a game, disconnect, then wait for the room to be destroyed (or have host leave). Reload the page. You should land on the landing page cleanly — not stuck in a reconnection loop or showing errors. You should be able to create/join a new room normally.
result: pass

## Summary

total: 8
passed: 7
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Game ends when fewer than 2 connected players remain after disconnect timeout"
  status: failed
  reason: "User reported: fail - when the player leaves the game still continues for the host player"
  severity: major
  test: 5
  root_cause: "Game-end detection in removePlayerAfterTimeout (Room.ts line 574) only executes when gameState.phase === 'playing'. If a player disconnects during swapping or transitioning phase, the game-end check is skipped entirely. The game continues with <2 connected players."
  artifacts:
    - path: "packages/server/src/rooms/Room.ts"
      issue: "Game-end check (lines 592-614) is nested inside if (gameState.phase === 'playing') at line 574 — should apply to all active game phases"
    - path: "packages/server/src/rooms/__tests__/Room.disconnect.test.ts"
      issue: "Test only validates playing phase scenario, no coverage for swapping/transitioning phase disconnect timeout"
  missing:
    - "Move game-end detection logic outside the phase === 'playing' conditional so it applies to swapping, transitioning, and playing phases"
    - "Add test for game-end when player disconnects during swap phase"
  debug_session: ".planning/debug/09-uat-v2-game-end-disconnect.md"
