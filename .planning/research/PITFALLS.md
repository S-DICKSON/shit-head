# Domain Pitfalls: Online Multiplayer Card Games

**Domain:** Browser-based multiplayer card game (Shithead)
**Researched:** 2026-02-07
**Confidence:** MEDIUM (based on domain knowledge, not verified with current sources)

## Critical Pitfalls

Mistakes that cause rewrites, security vulnerabilities, or fundamentally broken gameplay.

### Pitfall 1: Client-Authoritative Game State
**What goes wrong:** Client tells server what moves are valid, server trusts client input without validation.
**Why it happens:** Easier to prototype — client already has game logic for UI, so "just send the move" seems simpler than duplicating validation server-side.
**Consequences:**
- Trivial cheating via browser DevTools or modified clients
- Invalid game states that crash server or other clients
- Players can see hidden information (face-down cards, opponent hands)
- Cannot trust any game outcome for rankings/stats

**Prevention:**
- **Server is source of truth:** Server maintains canonical game state, validates ALL moves
- **Client is view layer:** Client only renders state from server, optimistically updates for UX
- **Never send hidden information:** Server only sends cards visible to that specific player
- **Validate moves server-side:** Check card legality, turn order, game phase before accepting any action

**Detection:**
- Can you open DevTools and change game state variables?
- Does server accept any move JSON you send without validation?
- Can you see variables for opponent hands or face-down cards in network inspector?

**Phase mapping:** Address in Phase 1 (Core Architecture). This is foundational — retrofitting is painful.

---

### Pitfall 2: Inconsistent Burn Logic with Invisible Cards
**What goes wrong:** Burn detection fails when 8s (invisible cards) are interspersed in 4-of-a-kind sequences.
**Why it happens:** Burn logic checks for "4 consecutive cards of same rank" but invisible 8s break the sequence (2,2,2,8,8,2 should burn but naive check sees 2,2,2 then 8,8,2).
**Consequences:**
- Game-breaking rule violations
- Players lose trust when correct plays don't work
- Edge cases surface in production, not testing

**Shithead-specific complexity:**
- 8s are "invisible" — they affect what next player must beat BUT don't break burn counting
- Example: `[2,2,2,8,8,2]` = burn (6 cards total, 4 are 2s)
- Example: `[2,2,2,8,8,3]` = NOT burn (only 3 of rank 2)
- 8s also affect "what must be beaten": If pile ends with 8, next player must beat the last non-8 card

**Prevention:**
- **Filter invisibles for burn counting:** `pile.filter(c => c.rank !== 8).slice(-4)` to check last 4 visible cards
- **Separate "pile top for beating" logic:** Function that skips 8s to find "what must be beaten"
- **Comprehensive test cases:** Test all combinations: 4-of-kind with 0, 1, 2, 3 interspersed 8s
- **Extract to pure function:** `shouldBurn(pile): boolean` that can be unit tested extensively

**Detection:**
- Play 2,2,2,8,2 in local testing — does it burn?
- Add automated test: "4-of-a-kind with invisible cards in sequence"

**Phase mapping:** Address in Phase 2 (Game Rules Engine). Core logic must handle this before UI work.

---

### Pitfall 3: Race Conditions in Turn Timing
**What goes wrong:** Auto-pickup triggers while player is selecting cards, or multiple players' actions arrive simultaneously.
**Why it happens:** Asynchronous timing — server timer fires, client action arrives, both try to mutate game state.
**Consequences:**
- Player's valid move rejected because timer expired server-side
- Cards picked up after player already selected a valid play
- Player gets penalized for lag, not actual slowness

**Specific scenarios:**
1. **Player clicks "Play" at 00:01 remaining, server timer fires at 00:00** → Race: Does move arrive before auto-pickup?
2. **Reconnecting player's queued action arrives during another player's turn** → Stale turn sequence number
3. **Two players disconnect simultaneously in 2-player game** → Who gets auto-pickup first?

**Prevention:**
- **Action sequence numbers:** Each action includes expected `turnSequenceNumber`, reject if stale
- **Server-side locking:** Acquire lock before processing action, ensure only one state mutation at a time
- **Grace period:** Give 200-500ms grace period after timer hits zero before auto-pickup
- **Timestamp validation:** Compare client action timestamp with server timer, allow if sent before expiry
- **Idempotent actions:** Same action arriving twice produces same result, no double-pickup

**Detection:**
- Load test with 100ms network delay — do valid moves get rejected?
- Add artificial delay to action processing, then spam actions — do any duplicate?

**Phase mapping:** Address in Phase 3 (Turn System & Timing). Cannot defer — ruins gameplay.

---

### Pitfall 4: WebSocket Reconnection State Loss
**What goes wrong:** Player disconnects, reconnects, but server lost their session or can't rejoin game.
**Why it happens:** WebSocket libraries often don't persist "who is this connection" across reconnects, or game state garbage-collected during disconnect.
**Consequences:**
- Temporary network blip forces player out of game
- Mobile players (switching WiFi/cellular) can't rejoin
- Game abandoned because one player couldn't reconnect

**Specific scenarios:**
1. **Browser tab backgrounded on mobile** → WebSocket closed, needs reconnect with existing session
2. **Player switches networks mid-game** → New IP, new socket, needs to map back to game player slot
3. **Server restarts** → All sockets dropped, need to restore from persisted state

**Prevention:**
- **Session tokens separate from WebSocket:** Use JWT or session ID that survives socket reconnect
- **Reconnect handshake:** Client sends `{type: "reconnect", sessionToken, gameId}` on new socket
- **Game state persistence:** Write game state to Redis/DB periodically, can restore after server restart
- **Player slot reservation:** Keep player slot "reserved" for 2-5 minutes after disconnect
- **Reconnect UI:** Show "Reconnecting..." not "Connection lost, refresh page"

**Detection:**
- Close DevTools WebSocket tab during game — can you rejoin?
- Kill server mid-game, restart, can players reconnect to same game?

**Phase mapping:** Address in Phase 4 (Connection Management). Must work before multiplayer testing.

---

### Pitfall 5: Leaking Hidden Information via Network Traffic
**What goes wrong:** Client receives data about hidden cards (face-down cards, opponent hands) even if UI doesn't show them.
**Why it happens:** Server sends complete game state to all clients for simplicity, relies on UI not rendering hidden info.
**Consequences:**
- Players inspect network traffic to see opponent cards
- Face-down cards revealed before played
- Ruins competitive integrity, impossible to fix without breaking protocol

**Shithead-specific:**
- Face-down cards: Players have 3 face-down cards they can't see until played
- Opponent hands: Can't see what cards opponents hold
- Draw pile: Shouldn't see what's coming next (less critical but still immersion-breaking)

**Prevention:**
- **Server sends player-specific views:** Each player gets different JSON based on what they can see
- **Redact hidden cards:** Send `{cardId: "xyz", rank: null, suit: null, faceDown: true}` for unrevealed cards
- **Reveal only on play:** When face-down card played, then send `{cardId: "xyz", rank: 3, suit: "hearts"}`
- **Never send draw pile order:** Shuffle server-side, only send drawn card when actually drawn

**Detection:**
- Open Network tab, inspect WebSocket messages — do you see opponent hand ranks?
- Can you see face-down card values before they're played?

**Phase mapping:** Address in Phase 1 (Core Architecture). Protocol design — very hard to fix later.

---

### Pitfall 6: Endgame State Transition Bugs
**What goes wrong:** Player moves from hand → face-up → face-down phases incorrectly, or game doesn't end when last player finished.
**Why it happens:** Complex state machine with multiple exit conditions, easy to miss edge cases.
**Consequences:**
- Player "wins" but game doesn't end
- Player forced to play from wrong card set
- UI shows empty hand but game still expects hand plays

**Shithead-specific state machine:**
```
1. Hand phase: Play from hand cards (can always pick up if can't play)
2. Face-up phase: Hand empty → must play face-up cards (can't pick up, must play valid or pickup pile)
3. Face-down phase: Face-up empty → blind play face-down (revealed on play, pickup pile if invalid)
4. Finished: All cards gone → player removed from turn order
5. Game over: Only one player left → they are Shithead
```

**Edge cases:**
- Player has empty hand but forgets they have face-up cards (should transition)
- Player plays last face-up and it burns → go straight to face-down (skip "pickup" check)
- Last two players: One finishes → game immediately ends (don't wait for loser's turn)
- Player picks up pile while in face-down phase → transitions back to hand phase

**Prevention:**
- **Explicit state transitions:** `transitionPlayerPhase(player): Phase` function with all logic
- **Check after every action:** After play/pickup, call `checkPlayerPhaseTransition(player)`
- **Test all edge cases:** Unit tests for each transition and combination
- **State assertions:** `assertValidGameState()` after each mutation, crash if invalid

**Detection:**
- Play until hand empty — does player auto-transition to face-up?
- Play last face-up and burn — does player skip to face-down?
- Have all but one player finish — does game end immediately?

**Phase mapping:** Address in Phase 2 (Game Rules Engine). Core state machine logic.

---

## Moderate Pitfalls

Mistakes that cause poor UX, technical debt, or hard-to-debug issues.

### Pitfall 7: Animation Blocking Game State Updates
**What goes wrong:** Card animations take 500ms, but next game state arrives after 200ms, causing animation conflicts or janky UI.
**Why it happens:** Animations tied to DOM, game state updates tied to WebSocket — timing mismatch.
**Consequences:**
- Cards jump to wrong positions mid-animation
- Animations queue up, creating lag perception
- Fast players frustrated by slow UI

**Prevention:**
- **Animation queue:** Queue state updates during animation, apply after animation completes
- **Optimistic animations:** Start animation immediately on user action, rollback if server rejects
- **Interruptible animations:** Use CSS transitions that can be interrupted by new state
- **Skip animations option:** Let players disable animations for faster gameplay

**Detection:**
- Spam valid plays quickly — do animations glitch?
- Add artificial 200ms server delay — does UI update correctly?

**Phase mapping:** Address in Phase 5 (UI/UX). Performance optimization phase.

---

### Pitfall 8: Mobile Touch Target Sizing for Card Selection
**What goes wrong:** Cards too small to tap accurately, especially when overlapped in hand.
**Why it happens:** Desktop-first design with 40px card spacing, doesn't work on mobile touchscreens.
**Consequences:**
- Players tap wrong card, waste turn
- Frustrating multi-select experience
- Mobile users abandon game

**Card game-specific:**
- Hand of 10+ cards needs to fit on 375px mobile screen
- Cards overlap → touch targets overlap → ambiguous taps
- Need to select multiple cards (3 of a kind) accurately

**Prevention:**
- **44px minimum touch target:** Even if cards smaller, expand tap hitbox
- **Fan-out on touch:** Tap hand area → cards fan out for selection
- **Highlight selected cards:** Clear visual feedback before commit
- **Undo last select:** Allow unselecting card before "Play" button

**Detection:**
- Test on real iPhone/Android device (not just browser devtools)
- Can you accurately select specific card from 10-card hand?

**Phase mapping:** Address in Phase 5 (UI/UX). Must test on real devices.

---

### Pitfall 9: Insufficient Game State Logging for Bug Reports
**What goes wrong:** Player reports "game broke", but no logs to reproduce issue.
**Why it happens:** Console logs only on client, not sent to server, lost on page refresh.
**Consequences:**
- Cannot debug intermittent issues
- Players repeat "it just broke" without actionable info
- Bugs linger because non-reproducible

**Prevention:**
- **Server-side game event log:** Log every action with timestamp, playerId, gameState snapshot
- **Client-side error reporting:** Catch exceptions, send to server with game context
- **Replay system:** Store action sequence, can replay game from start to reproduce
- **Session recording:** Store last 50 actions in circular buffer, send on error

**Detection:**
- Can you reconstruct exact game state from 10 actions ago?
- If player reports bug, do you have their action history?

**Phase mapping:** Address in Phase 2 (Game Rules Engine). Build logging from start.

---

### Pitfall 10: No Backpressure on Action Spam
**What goes wrong:** Malicious or buggy client sends 1000 actions/second, server processes all, DoS attack.
**Why it happens:** No rate limiting on WebSocket messages.
**Consequences:**
- Server CPU spikes, game lags for all players
- Malicious player can grief games
- Accidental double-submit crashes game

**Prevention:**
- **Rate limit actions:** Max 10 actions/second per player, drop excess
- **Cooldown after action:** 50ms cooldown before accepting next action from same player
- **Disconnect spammers:** If rate limit exceeded 3 times, disconnect client
- **Idempotent action IDs:** Client includes unique action ID, server dedupes

**Detection:**
- Write script to send 100 actions instantly — does server handle gracefully?
- Does server reject duplicate action IDs?

**Phase mapping:** Address in Phase 4 (Connection Management). Security concern.

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 11: Confusing Error Messages
**What goes wrong:** Player gets "Invalid move" without explanation of why.
**Why it happens:** Server validation returns generic error, UI doesn't translate.
**Consequences:** Players confused about rules, think game is broken.

**Prevention:**
- Server returns specific error codes: `CARD_TOO_LOW`, `NOT_YOUR_TURN`, `CARD_NOT_IN_HAND`
- UI shows helpful message: "That card is too low. You must play 7 or higher."

**Phase mapping:** Address in Phase 5 (UI/UX). Polish phase.

---

### Pitfall 12: No "Waiting for Other Players" Feedback
**What goes wrong:** After player submits move, UI freezes with no indication server received it.
**Why it happens:** Forgot to show loading state between action and server response.
**Consequences:** Players click multiple times, think game is broken.

**Prevention:**
- Show "Playing..." spinner immediately on action
- Disable action buttons until server responds
- Show "Waiting for [Player Name]..." during opponent turn

**Phase mapping:** Address in Phase 5 (UI/UX). Polish phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Phase 1: Core Architecture | Client-authoritative state, leaking hidden info | Design server-authoritative protocol from start |
| Phase 2: Game Rules Engine | Burn logic with invisibles, endgame transitions | Extensive unit tests for edge cases |
| Phase 3: Turn System | Race conditions, auto-pickup timing | Action sequence numbers, server locking |
| Phase 4: Connection Management | Reconnection state loss, action spam | Session tokens, rate limiting |
| Phase 5: UI/UX | Animation jank, mobile touch targets | Test on real devices, animation queue |
| Phase 6: Testing | Missing edge case coverage | Replay system for bug reproduction |

---

## Shithead-Specific Pitfall Summary

**Most critical for this game:**

1. **Invisible 8 logic (Pitfall 2):** The defining complexity of Shithead. Get this wrong and game is unplayable.
   - Test: Play 2,2,2,8,2 → must burn
   - Test: Pile is [7,8,8] → next player must beat 7, not 8

2. **Endgame transitions (Pitfall 6):** Three phases per player × 4 players = many state combinations.
   - Test: Empty hand mid-turn → transitions to face-up
   - Test: Last face-up burns → goes to face-down without pickup

3. **Face-down card secrecy (Pitfall 5):** Core to Shithead gameplay — players can't see their face-down cards.
   - Test: Network inspector shows `rank: null` for unrevealed face-down cards

**Recommended testing approach:**
- Write unit tests for rule engine FIRST before building UI
- Create "game scenario" fixtures for testing (e.g., "player has 1 card in hand, 3 face-up, 3 face-down")
- Build replay system early — invaluable for debugging reported issues

---

## Sources

**Confidence: MEDIUM**
- Based on common patterns in multiplayer game development
- Shithead-specific pitfalls based on game rules analysis
- Not verified against current 2026 sources due to WebSearch unavailability
- Recommendations follow industry best practices as of training knowledge (Jan 2025)

**Recommended validation:**
- Review WebSocket library docs (e.g., Socket.io, ws) for current reconnection patterns
- Check game engine architectural patterns for card games
- Survey multiplayer game post-mortems for real-world pitfall examples
