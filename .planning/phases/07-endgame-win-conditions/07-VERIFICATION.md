---
phase: 07-endgame-win-conditions
verified: 2026-02-08T19:20:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 7: Endgame & Win Conditions Verification Report

**Phase Goal:** Players progress through hand, face-up, and face-down cards to win
**Verified:** 2026-02-08T19:20:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When hand is empty and draw pile is empty, player plays face-up cards | ✓ VERIFIED | GameEngine.determinePlaySource returns 'face-up' when hand empty AND drawPile empty AND faceUp has cards. playFromFaceUp method exists and validates source. Tests pass. |
| 2 | When face-up cards are gone, player plays face-down cards blindly | ✓ VERIFIED | GameEngine.determinePlaySource returns 'face-down' when hand empty AND faceUp empty AND faceDown has cards. playFaceDownBlind method exists, reveals card, checks playability. 24 tests pass. |
| 3 | If blind face-down card is unplayable, player picks up pile (returns to hand phase) | ✓ VERIFIED | playFaceDownBlind path B: when card not playable, adds discard pile + flipped card to player.hand, clears discard. Tests verify hand populated and discard cleared. |
| 4 | Player who empties all cards drops out of the game | ✓ VERIFIED | checkPlayerElimination returns true when all card arrays empty. nextActivePlayerIndex skips eliminated players. checkPostPlayState in Room fires onPlayerEliminated callback. player-eliminated message schema and handler exist. Tests pass. |
| 5 | Last player with cards is declared the shithead and deals next hand | ✓ VERIFIED | findShithead returns playerId when only 1 player has cards. checkPostPlayState fires onGameOver callback with shitheadId. dealerIndex set to shithead's index. game-over message schema and handler exist. Tests pass. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/types/game.ts` | PlaySource type exported | ✓ VERIFIED | Line 10: `export type PlaySource = 'hand' \| 'face-up' \| 'face-down'`. Exported via barrel export in index.ts. |
| `packages/shared/src/schemas/messages.ts` | Endgame message schemas | ✓ VERIFIED | playFaceDownSchema (line 90), faceDownResultSchema (line 198), playerEliminatedSchema (line 210), gameOverSchema (line 217). All in discriminated unions. |
| `packages/shared/src/types/messages.ts` | Endgame message types | ✓ VERIFIED | PlayFaceDownMessage (line 43), FaceDownResultMessage (line 61), PlayerEliminatedMessage (line 62), GameOverMessage (line 63). All z.infer from schemas. |
| `packages/server/src/game/GameEngine.ts` | Endgame utility methods | ✓ VERIFIED | determinePlaySource (line 491), checkPlayerElimination (line 521), nextActivePlayerIndex (line 538), findShithead (line 566), playFromFaceUp (line 591), playFaceDownBlind (line 767). All substantive (20-170 lines each). |
| `packages/server/src/rooms/Room.ts` | Room endgame methods | ✓ VERIFIED | playFromFaceUp (line 336), playFaceDownBlind (line 352), checkPostPlayState (line 278), setGameCallbacks (line 162). All delegate to GameEngine and fire callbacks. |
| `packages/server/src/websocket/handlers.ts` | play-face-down handler | ✓ VERIFIED | Line 488: case 'play-face-down' handler. Calls room.playFaceDownBlind, broadcasts face-down-result with per-player views. setGameCallbacks wired at line 260. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Client message | GameEngine | play-face-down → Room.playFaceDownBlind → GameEngine.playFaceDownBlind | ✓ WIRED | handlers.ts line 488 receives play-face-down, calls room.playFaceDownBlind (Room.ts:352), which calls GameEngine.playFaceDownBlind (GameEngine.ts:767). Result returned through chain. |
| GameEngine.playFaceDownBlind | Room.checkPostPlayState | playFaceDownBlind updates state → Room calls checkPostPlayState | ✓ WIRED | Room.playFaceDownBlind (line 352-366) updates gameState and calls checkPostPlayState (line 361). checkPostPlayState checks elimination and game-over. |
| Room callbacks | WebSocket broadcast | setGameCallbacks → onPlayerEliminated/onGameOver → sendMessage | ✓ WIRED | handlers.ts line 260 sets callbacks. onPlayerEliminated broadcasts player-eliminated (line 261-273). onGameOver broadcasts game-over (line 275-287). |
| determinePlaySource | Play validation | playFromFaceUp/playFaceDownBlind call determinePlaySource to validate source | ✓ WIRED | playFromFaceUp (line 627) and playFaceDownBlind (line 803) both call determinePlaySource and reject if source doesn't match. |
| Elimination detection | Game-over detection | checkPlayerElimination → findShithead → phase = 'finished' | ✓ WIRED | checkPostPlayState (Room.ts:285) checks elimination, then calls findShithead (line 289). If shitheadId exists, sets phase to 'finished' (line 291) and fires onGameOver (line 297). |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| END-01: When hand empty and draw pile empty, player plays face-up cards | ✓ SATISFIED | determinePlaySource logic (lines 491-513). playFromFaceUp method validates this source. Tests pass. |
| END-02: When face-up cards gone, player plays face-down cards blindly | ✓ SATISFIED | determinePlaySource returns 'face-down' when faceUp empty. playFaceDownBlind reveals and validates card. 24 tests including blind play scenarios. |
| END-03: If blind face-down card unplayable, player picks up pile (returns to hand phase) | ✓ SATISFIED | playFaceDownBlind path B (lines 891-929). Card + pile → hand. discardPile cleared. nextPlayerIndex advances. Tests verify state transitions. |
| END-04: Player who empties all cards drops out of game | ✓ SATISFIED | checkPlayerElimination (line 521). nextActivePlayerIndex skips eliminated (line 538). player-eliminated message broadcast (handlers.ts:261). Tests verify skipping. |
| END-05: Last player with cards is shithead and deals next hand | ✓ SATISFIED | findShithead (line 566) returns last player with cards. dealerIndex set to shithead index (Room.ts:295). game-over message includes shitheadId. Tests verify. |

### Anti-Patterns Found

None detected.

**Checks performed:**
- No TODO/FIXME/placeholder comments in endgame files
- No stub return patterns (empty returns, console.log only)
- All methods substantive (20-170 lines with real logic)
- All handlers wired to Room methods which delegate to GameEngine
- All message schemas in discriminated unions
- All types properly inferred from schemas

### Human Verification Required

#### 1. End-to-End Blind Play Flow

**Test:** Start a game with 2 players. Play through to endgame. When player has only face-down cards, send play-face-down message with index 0.

**Expected:**
- Server broadcasts face-down-result with revealed card and playable flag
- If playable: card appears on discard pile, turn advances
- If not playable: player's hand count increases (picked up pile), discard pile clears

**Why human:** Requires running server and client, observing real-time WebSocket messages and state updates.

#### 2. Player Elimination Broadcast

**Test:** Play through endgame until a player empties all cards (hand, faceUp, faceDown all empty).

**Expected:**
- Server broadcasts player-eliminated message to all players
- Eliminated player's turn is skipped (currentPlayerIndex advances to next active player)
- Game continues with remaining players

**Why human:** Requires multi-player scenario with coordinated play to trigger elimination.

#### 3. Game Over Declaration

**Test:** Continue playing until only one player has cards remaining.

**Expected:**
- Server broadcasts game-over message with shitheadId and shitheadNickname
- Game phase changes to 'finished'
- Next hand (if started) has shithead as dealer

**Why human:** Requires completing a full game through to winner declaration. Dealer rotation needs to be observed in subsequent game.

### Gaps Summary

No gaps found. All 5 observable truths verified. All required artifacts exist, are substantive, and are wired. All 5 requirements satisfied. All key links verified through code inspection and test execution. 279 server tests pass including 24 playFaceDownBlind tests, 4 checkPlayerElimination tests, 5 findShithead tests.

Human verification recommended for end-to-end flow (blind plays, elimination broadcasts, game-over flow) but automated verification confirms all server logic is complete and correct.

---

_Verified: 2026-02-08T19:20:00Z_
_Verifier: Claude (gsd-verifier)_
