---
status: diagnosed
trigger: "In a 2-player game, when one player disconnects and the 90-second grace period expires, the disconnected player is removed but the game continues for the remaining host player. The game should end when fewer than 2 connected players remain after disconnect timeout."
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:10:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - Game-end logic only fires during 'playing' phase, not during 'swapping' or 'transitioning'
test: Examined Room.ts lines 592-614 and test expectations
expecting: When game is in swapping/transitioning phase during disconnect timeout, game-end check is skipped
next_action: Document root cause for handoff to plan-phase

## Symptoms

expected: When one player disconnects in 2-player game and 90s grace period expires, game should end (fewer than 2 connected players)
actual: Disconnected player is removed but game continues for remaining host player
errors: None
reproduction:
1. Start 2-player game
2. One player disconnects
3. Wait for 90-second grace period to expire
4. Player is removed but game continues
started: Discovered during UAT phase 09

## Eliminated

- hypothesis: removePlayerAfterTimeout doesn't mark player as eliminated
  evidence: Lines 565-572 show cards are cleared (hand, faceUp, faceDown = [])
  timestamp: 2026-02-08T00:05:00Z

- hypothesis: Game-end check is missing entirely
  evidence: Lines 592-614 show explicit game-end detection code checking connectedPlayerCount < 2
  timestamp: 2026-02-08T00:05:00Z

## Evidence

- timestamp: 2026-02-08T00:05:00Z
  checked: Room.ts removePlayerAfterTimeout method (lines 543-616)
  found: Game-end check exists at lines 592-614, checks if connectedPlayerCount < 2 and calls onGameOver
  implication: Game-end logic is implemented, so bug is conditional

- timestamp: 2026-02-08T00:06:00Z
  checked: Room.ts removePlayerAfterTimeout line 574 conditional
  found: Game-end check ONLY executes if `this.gameState.phase === 'playing'`
  implication: If disconnect timeout fires during 'swapping' or 'transitioning' phase, game-end check is skipped

- timestamp: 2026-02-08T00:07:00Z
  checked: Room.disconnect.test.ts line 227-246
  found: Test "ends game when fewer than 2 active players remain after removal" only tests 'playing' phase
  implication: Test passes because it advances past swap phase (vi.advanceTimersByTime(2500)) before disconnect

- timestamp: 2026-02-08T00:08:00Z
  checked: Room.ts startGame and endSwapPhase methods
  found: Game phases: waiting -> countdown -> playing (with sub-phases: swapping -> transitioning -> playing)
  implication: 90-second disconnect grace period can easily expire while game is still in swapping/transitioning

- timestamp: 2026-02-08T00:09:00Z
  checked: handlers.ts onRemoved callback (lines 385-417)
  found: onRemoved callback doesn't check game-end conditions, only broadcasts player-removed message
  implication: Handler layer trusts Room to handle game-end logic

## Resolution

root_cause: Game-end detection in removePlayerAfterTimeout (Room.ts line 574) only executes when gameState.phase === 'playing'. If a player disconnects during the swapping phase (30s) or transitioning phase (2.5s) and the 90s grace period expires before the game transitions to 'playing', the game-end check is skipped entirely. The game continues with <2 connected players because the conditional check at line 574 prevents execution of lines 592-614.

Specific failure path:
1. 2-player game starts (phase: 'swapping')
2. Player disconnects immediately
3. 90 seconds elapse (grace period expires)
4. removePlayerAfterTimeout executes
5. Line 574 check fails: gameState.phase is still 'swapping' (or 'transitioning')
6. Lines 592-614 never execute (game-end check skipped)
7. Game eventually transitions to 'playing' with only 1 connected player

fix:
verification:
files_changed: []
