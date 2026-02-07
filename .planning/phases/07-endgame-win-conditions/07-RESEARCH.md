# Phase 7: Endgame & Win Conditions - Research

**Researched:** 2026-02-07
**Domain:** Card progression mechanics, player elimination, and win detection
**Confidence:** HIGH

## Summary

Phase 7 implements the endgame card progression system where players move through three phases: hand cards → face-up cards → face-down cards (blind). The research confirms that the existing codebase architecture (static GameEngine methods, immutable state patterns, PlayerGameState structure) naturally supports this progression with minimal new concepts.

The standard approach is to determine play source (hand, face-up, or face-down) based on current player state, validate plays accordingly, and track eliminated players without removing them from the game state. The key insight from official Shithead rules is that face-down cards are played blindly - if unplayable, the player picks up the entire pile INCLUDING the flipped card and returns to the hand phase.

Player elimination follows a "drop out but stay in game" pattern where eliminated players remain in the PlayerGameState array with all card arrays empty, maintaining turn order indices. The game ends when only one player has cards remaining - that player is the shithead (loser) and becomes dealer for the next hand.

Critical challenges identified: determining valid play source for current player state, handling blind card flip failure (pickup + return to hand phase), detecting game end condition (single player remaining with cards), and maintaining turn rotation with eliminated players.

**Primary recommendation:** Extend GameEngine with static methods for determinePlaySource(), playFromFaceUp(), playFaceDownBlind(), checkPlayerElimination(), and findShithead(), maintaining the stateless utility pattern. Track eliminated players with a boolean flag or by checking total card count = 0, not by removing from arrays.

## Standard Stack

The project already uses the ideal stack for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.8+ | Static typing | Discriminated unions for play sources, type-safe elimination tracking |
| Vitest | Latest | Testing | Established TDD pattern from Phases 3-5 |
| Bun | Latest | Runtime | WebSocket pub/sub for broadcasting eliminations |

### Supporting
No new dependencies required - existing patterns handle all endgame mechanics.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Boolean isEliminated flag | Remove from players array | Removing players breaks turn indices; keeping empty PlayerGameState maintains array stability |
| Separate eliminated array | Track in-game vs eliminated | Single source of truth is simpler; check totalCards === 0 instead |

**Installation:**
No new packages required - existing stack is sufficient.

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/game/
├── GameEngine.ts        # Add: determinePlaySource, playFromFaceUp, playFaceDownBlind, checkElimination
└── CardComparison.ts    # Already exists from Phase 5

packages/server/src/__tests__/
├── game-engine.test.ts  # Add: endgame progression tests
└── endgame.test.ts      # NEW: Comprehensive elimination and win detection tests

packages/shared/src/
├── schemas/messages.ts  # Add: player-eliminated, game-over, shithead-declared schemas
└── types/game.ts       # GameState.phase already has 'finished'
```

### Pattern 1: Play Source Determination
**What:** Determine valid play source (hand, face-up, face-down) based on player's current state
**When to use:** Before every card play action
**Example:**
```typescript
// Source: Official Shithead rules (pagat.com)
type PlaySource = 'hand' | 'face-up' | 'face-down';

static determinePlaySource(player: PlayerGameState, drawPileEmpty: boolean): PlaySource {
  // If hand has cards, always play from hand
  if (player.hand.length > 0) {
    return 'hand';
  }

  // If hand empty but draw pile has cards, must draw first (not endgame yet)
  if (!drawPileEmpty) {
    return 'hand'; // Player will auto-draw before playing
  }

  // Hand empty AND draw pile empty - endgame progression
  if (player.faceUp.length > 0) {
    return 'face-up';
  }

  // Face-up exhausted - play face-down blindly
  if (player.faceDown.length > 0) {
    return 'face-down';
  }

  // All cards exhausted - player is eliminated
  throw new Error('Player has no cards to play');
}
```

### Pattern 2: Playing Face-Up Cards
**What:** Similar to hand play but select from faceUp array
**When to use:** When determinePlaySource() returns 'face-up'
**Example:**
```typescript
static playFromFaceUp(
  state: GameState,
  playerId: string,
  cardIndices: number[]
): OperationResult<GameState> {
  const playerIndex = state.players.findIndex(p => p.playerId === playerId);
  const player = state.players[playerIndex];

  // Validate all indices against faceUp array
  for (const idx of cardIndices) {
    if (idx < 0 || idx >= player.faceUp.length) {
      return { success: false, error: 'Invalid face-up index', code: 'INVALID_ACTION' };
    }
  }

  const playedCards = cardIndices.map(idx => player.faceUp[idx]);

  // Same validation as hand play: same rank, playable on pile, etc.
  // Then remove from faceUp instead of hand
  const updatedFaceUp = player.faceUp.filter((_, idx) => !cardIndices.includes(idx));

  // Continue with normal play logic (add to discard, check burn, etc.)
  // NO auto-draw in endgame (draw pile is empty by definition)
}
```

### Pattern 3: Blind Face-Down Card Play
**What:** Player selects face-down card index, server flips it, validates if playable
**When to use:** When determinePlaySource() returns 'face-down'
**Example:**
```typescript
// Source: https://www.pagat.com/beating/shithead.html
// "flip one card onto the pile when your turn comes. If the flipped card is playable,
//  it is played. If your flipped card is not playable... you take the whole pile into
//  your hand including the flipped card"

static playFaceDownBlind(
  state: GameState,
  playerId: string,
  faceDownIndex: number
): OperationResult<GameState> {
  const playerIndex = state.players.findIndex(p => p.playerId === playerId);
  const player = state.players[playerIndex];

  // Validate index
  if (faceDownIndex < 0 || faceDownIndex >= player.faceDown.length) {
    return { success: false, error: 'Invalid face-down index', code: 'INVALID_ACTION' };
  }

  const flippedCard = player.faceDown[faceDownIndex];

  // Check if card is playable (same logic as regular play)
  const topCard = state.discardPile[state.discardPile.length - 1];
  const isPlayable = !topCard || canPlayOn(flippedCard, topCard);

  if (isPlayable) {
    // Success: remove from faceDown, add to discard
    const updatedFaceDown = player.faceDown.filter((_, idx) => idx !== faceDownIndex);
    const updatedDiscardPile = [...state.discardPile, flippedCard];

    // Check for burn, advance turn, etc.
    return { success: true, data: newState };
  } else {
    // Failure: pickup entire pile INCLUDING flipped card
    const updatedFaceDown = player.faceDown.filter((_, idx) => idx !== faceDownIndex);
    const pickedUpCards = [...state.discardPile, flippedCard];
    const newHand = pickedUpCards; // All cards go to hand

    // Player returns to hand phase, turn advances
    const nextPlayerIndex = (playerIndex + 1) % state.players.length;

    const newState: GameState = {
      ...state,
      discardPile: [],
      currentPlayerIndex: nextPlayerIndex,
      players: state.players.map((p, i) =>
        i === playerIndex
          ? { ...p, faceDown: updatedFaceDown, hand: newHand }
          : p
      ),
    };

    return { success: true, data: newState };
  }
}
```

### Pattern 4: Player Elimination Detection
**What:** After successful play, check if player has zero cards remaining
**When to use:** After every successful card play in endgame
**Example:**
```typescript
static checkPlayerElimination(player: PlayerGameState): boolean {
  const totalCards =
    player.hand.length +
    player.faceUp.length +
    player.faceDown.length;

  return totalCards === 0;
}

// In playCards/playFromFaceUp/playFaceDownBlind:
const updatedPlayer = { ...player, /* card arrays updated */ };

if (checkPlayerElimination(updatedPlayer)) {
  // Player eliminated - broadcast to all clients
  // Turn advances to next player
  // Check if game is over
}
```

### Pattern 5: Turn Rotation with Eliminated Players
**What:** Skip eliminated players when advancing turn
**When to use:** After every turn, when calculating next player
**Example:**
```typescript
// Source: https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/turn-order.md (implied)
static nextPlayerIndex(state: GameState, currentIndex: number): number {
  const playerCount = state.players.length;
  let nextIndex = (currentIndex + 1) % playerCount;

  // Skip eliminated players (loop until we find active player)
  let attempts = 0;
  while (attempts < playerCount) {
    const player = state.players[nextIndex];
    const isEliminated = checkPlayerElimination(player);

    if (!isEliminated) {
      return nextIndex; // Found active player
    }

    // This player eliminated, try next
    nextIndex = (nextIndex + 1) % playerCount;
    attempts++;
  }

  // All players eliminated except current - shouldn't happen, but return current as fallback
  return currentIndex;
}
```

### Pattern 6: Game End Detection
**What:** Count how many players still have cards; if only 1 remains, game ends
**When to use:** After each player elimination
**Example:**
```typescript
static findShithead(state: GameState): string | null {
  const playersWithCards = state.players.filter(p =>
    p.hand.length + p.faceUp.length + p.faceDown.length > 0
  );

  if (playersWithCards.length === 1) {
    return playersWithCards[0].playerId; // This player is the shithead (loser)
  }

  return null; // Game not over yet
}

// After player elimination:
const shitheadId = findShithead(newState);
if (shitheadId) {
  newState.phase = 'finished';
  // Broadcast game-over message
  // Next dealer is the shithead
}
```

### Pattern 7: Next Dealer Rotation
**What:** Shithead becomes next dealer
**When to use:** After game ends, before dealing next hand
**Example:**
```typescript
// When game finishes:
const shitheadId = findShithead(state);
const shitheadIndex = state.players.findIndex(p => p.playerId === shitheadId);

// In Room.dealCards() or startNewRound():
this.dealerIndex = shitheadIndex; // Loser deals next hand
this.gameState = GameEngine.createGame(players, this.dealerIndex);
```

### Anti-Patterns to Avoid
- **Removing eliminated players from players array:** Breaks turn indices, makes player views inconsistent
- **Allowing face-down play when hand/face-up available:** Must follow strict progression (hand → face-up → face-down)
- **Forgetting to include flipped card in pickup:** Unplayable blind card MUST be added to hand along with pile
- **Not skipping eliminated players in turn rotation:** Game will hang waiting for eliminated player's turn
- **Checking for winner instead of loser:** Shithead is last player WITH cards (loser), not first player without cards (winner)
- **Allowing play from wrong source:** Client can't choose - server determines source based on player state

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tracking eliminated players | Separate eliminated array | Check totalCards === 0 | Single source of truth, no sync issues |
| Turn rotation with skips | while loop with counter | Pattern 5 (nextPlayerIndex) | Handles edge cases, prevents infinite loops |
| Play source selection | Client sends source type | Server determines from state | Server is authoritative, client can't cheat |
| Game end detection | Count winners | Count losers (1 player with cards) | Shithead rules define loser, not winner |

**Key insight:** Don't modify the PlayerGameState array structure. Keep eliminated players in the array with empty card arrays. This maintains turn order indices and simplifies client state updates (same player count, same indices).

## Common Pitfalls

### Pitfall 1: Allowing Manual Play Source Selection
**What goes wrong:** Client sends "I want to play from face-up" when hand has cards
**Why it happens:** Trusting client to determine play source
**How to avoid:**
- Server ALWAYS determines play source via determinePlaySource()
- Client can suggest indices, but server validates source is correct
- Pattern: `const source = determinePlaySource(player, drawPileEmpty);`
**Warning signs:**
- UAT shows players skipping hand to play face-up
- Rules violations in endgame progression

### Pitfall 2: Forgetting Blind Card in Pickup
**What goes wrong:** Unplayable face-down card disappears instead of going to hand
**Why it happens:** Adding discard pile to hand but not the flipped card
**How to avoid:**
```typescript
// MUST include flipped card:
const pickedUpCards = [...state.discardPile, flippedCard];
const newHand = pickedUpCards;
```
**Warning signs:**
- Card count doesn't match before/after blind play
- Face-down cards vanish from game

### Pitfall 3: Not Skipping Eliminated Players
**What goes wrong:** Turn advances to eliminated player, game hangs
**Why it happens:** Using simple `(currentIndex + 1) % playerCount` without checking elimination
**How to avoid:**
- Use Pattern 5 (nextPlayerIndex with skip logic)
- Always check totalCards before assigning turn
- Limit attempts to prevent infinite loop if all players eliminated
**Warning signs:**
- UI shows eliminated player's turn
- Turn never advances past eliminated player

### Pitfall 4: Removing Eliminated Players from Array
**What goes wrong:** Turn indices break, player views show wrong opponents
**Why it happens:** Thinking eliminated players should be deleted
**How to avoid:**
- Keep players in array with zero cards
- Filter eliminated players ONLY for active player count
- Turn indices remain valid throughout game
**Warning signs:**
- currentPlayerIndex out of bounds
- Opponent views inconsistent after eliminations

### Pitfall 5: Checking for Winner Instead of Loser
**What goes wrong:** Game ends when first player empties cards (declares them winner)
**Why it happens:** Misunderstanding Shithead rules
**How to avoid:**
- Game continues until ONLY ONE player has cards
- That player is the LOSER (shithead), not the winner
- Others already eliminated are NOT the loser
- Pattern: `playersWithCards.length === 1` not `=== 0`
**Warning signs:**
- Game ends too early
- Wrong player marked as shithead

### Pitfall 6: Auto-Draw During Endgame
**What goes wrong:** Player plays face-up card, then draws from empty pile
**Why it happens:** Auto-draw logic from Phase 5 not checking if draw pile empty
**How to avoid:**
- Auto-draw ONLY when `drawPile.length > 0`
- Endgame progression starts when hand empty AND draw pile empty
- Pattern: `if (cardsNeeded > 0 && state.drawPile.length > 0)`
**Warning signs:**
- Crash accessing empty draw pile
- Player stuck in hand phase when should be face-up

### Pitfall 7: Face-Down Play Without Validation
**What goes wrong:** Player can see face-down card value before playing
**Why it happens:** Sending face-down cards to client, or validating client's claim about card value
**How to avoid:**
- PlayerGameView shows faceDownCount, NOT faceDown array
- Client sends index only: `{ faceDownIndex: 0 }`
- Server reveals card, validates, broadcasts result
- Player NEVER sees face-down card before it's played
**Warning signs:**
- Client state includes face-down card values
- UAT shows players making informed face-down choices

### Pitfall 8: Race Condition on Simultaneous Elimination
**What goes wrong:** Multiple players eliminated on same turn, game end detection fails
**Why it happens:** Not checking game end after EVERY elimination
**How to avoid:**
- After ANY successful play that results in elimination, check for game end
- Only one player can be eliminated per turn (current player)
- But after burn, player goes again - could eliminate in single game loop
- Pattern: Check `findShithead()` after updating state, before returning
**Warning signs:**
- Game doesn't end when it should
- Multiple players with zero cards

## Code Examples

Verified patterns from official sources:

### Determine Play Source
```typescript
// Source: https://www.pagat.com/beating/shithead.html
// "If you begin your turn with no cards in your hand (because you played them all
//  last time and the draw pile was empty), you must now play one of your face-up cards."

type PlaySource = 'hand' | 'face-up' | 'face-down';

export function determinePlaySource(
  player: PlayerGameState,
  drawPileEmpty: boolean
): PlaySource | null {
  // Hand has priority if not empty
  if (player.hand.length > 0) {
    return 'hand';
  }

  // If draw pile has cards, player must draw (not endgame yet)
  if (!drawPileEmpty) {
    return 'hand'; // Will auto-draw before playing
  }

  // Endgame progression: hand empty AND draw pile empty
  if (player.faceUp.length > 0) {
    return 'face-up';
  }

  if (player.faceDown.length > 0) {
    return 'face-down';
  }

  // Player eliminated (no cards)
  return null;
}
```

### Play Face-Down Blind
```typescript
// Source: https://www.pagat.com/beating/shithead.html
// "You flip one card onto the pile when your turn comes. If the flipped card is playable,
//  it is played and it is the next player's turn to equal or beat it. If your flipped card
//  is not playable (because it is lower than the previous play), you take the whole pile
//  into your hand including the flipped card."

static playFaceDownBlind(
  state: GameState,
  playerId: string,
  faceDownIndex: number
): OperationResult<GameState> {
  // Validate phase and turn
  if (state.phase !== 'playing') {
    return { success: false, error: 'Invalid phase', code: 'INVALID_ACTION' };
  }

  const playerIndex = state.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) {
    return { success: false, error: 'Player not found', code: 'PLAYER_NOT_FOUND' };
  }

  if (playerIndex !== state.currentPlayerIndex) {
    return { success: false, error: 'Not your turn', code: 'INVALID_ACTION' };
  }

  const player = state.players[playerIndex];

  // Validate play source is face-down
  const playSource = determinePlaySource(player, state.drawPile.length === 0);
  if (playSource !== 'face-down') {
    return { success: false, error: 'Must play from hand or face-up first', code: 'INVALID_ACTION' };
  }

  // Validate index
  if (faceDownIndex < 0 || faceDownIndex >= player.faceDown.length) {
    return { success: false, error: 'Invalid face-down index', code: 'INVALID_ACTION' };
  }

  const flippedCard = player.faceDown[faceDownIndex];

  // Check if playable on current pile
  const topCard = state.discardPile.length > 0
    ? state.discardPile[state.discardPile.length - 1]
    : null;

  // Note: This will need special card logic from Phase 6 (2s, 7s, 8s, 10s)
  const isPlayable = !topCard || canPlayOn(flippedCard, topCard);

  if (isPlayable) {
    // Card is playable - successful play
    const updatedFaceDown = player.faceDown.filter((_, idx) => idx !== faceDownIndex);
    const updatedDiscardPile = [...state.discardPile, flippedCard];

    const updatedPlayer: PlayerGameState = {
      ...player,
      faceDown: updatedFaceDown,
    };

    // Check if player eliminated
    const eliminated = checkPlayerElimination(updatedPlayer);

    let nextPlayerIndex: number;
    if (eliminated) {
      // Player eliminated, skip to next active player
      nextPlayerIndex = findNextActivePlayer(state, playerIndex);
    } else {
      // Normal turn advance (or same player if burn - Phase 6)
      nextPlayerIndex = (playerIndex + 1) % state.players.length;
    }

    const newState: GameState = {
      ...state,
      discardPile: updatedDiscardPile,
      currentPlayerIndex: nextPlayerIndex,
      players: state.players.map((p, i) => i === playerIndex ? updatedPlayer : p),
    };

    // Check for game end
    const shitheadId = findShithead(newState);
    if (shitheadId) {
      newState.phase = 'finished';
    }

    return { success: true, data: newState };
  } else {
    // Card is NOT playable - pickup pile + flipped card
    const updatedFaceDown = player.faceDown.filter((_, idx) => idx !== faceDownIndex);
    const pickedUpCards = [...state.discardPile, flippedCard];

    const updatedPlayer: PlayerGameState = {
      ...player,
      faceDown: updatedFaceDown,
      hand: pickedUpCards, // All cards go to hand
    };

    // Turn advances to next player
    const nextPlayerIndex = findNextActivePlayer(state, playerIndex);

    const newState: GameState = {
      ...state,
      discardPile: [],
      currentPlayerIndex: nextPlayerIndex,
      players: state.players.map((p, i) => i === playerIndex ? updatedPlayer : p),
    };

    return { success: true, data: newState };
  }
}
```

### Find Next Active Player (Skip Eliminated)
```typescript
// Skip eliminated players when advancing turn
function findNextActivePlayer(state: GameState, currentIndex: number): number {
  const playerCount = state.players.length;
  let nextIndex = (currentIndex + 1) % playerCount;
  let attempts = 0;

  while (attempts < playerCount) {
    const player = state.players[nextIndex];
    const totalCards = player.hand.length + player.faceUp.length + player.faceDown.length;

    if (totalCards > 0) {
      return nextIndex; // Found active player
    }

    nextIndex = (nextIndex + 1) % playerCount;
    attempts++;
  }

  // Fallback: all players eliminated (shouldn't happen)
  return currentIndex;
}
```

### Check Player Elimination
```typescript
// Source: https://www.pagat.com/beating/shithead.html
// "The game ends when you completely get rid of all of your hand and table cards."

function checkPlayerElimination(player: PlayerGameState): boolean {
  const totalCards =
    player.hand.length +
    player.faceUp.length +
    player.faceDown.length;

  return totalCards === 0;
}
```

### Find Shithead (Game End)
```typescript
// Source: https://www.pagat.com/beating/shithead.html
// "The last player left holding cards is the loser (also known as the shithead)."

function findShithead(state: GameState): string | null {
  const playersWithCards = state.players.filter(player => {
    const totalCards = player.hand.length + player.faceUp.length + player.faceDown.length;
    return totalCards > 0;
  });

  if (playersWithCards.length === 1) {
    // Last player with cards is the shithead (loser)
    return playersWithCards[0].playerId;
  }

  return null; // Game continues
}
```

### Next Dealer (Shithead Deals)
```typescript
// Source: https://www.pagat.com/beating/shithead.html
// "The loser... has to make the tea, or perform some other duty decided by the group,
//  and normally deals the next hand."

// When starting new round after game finish:
const shitheadId = findShithead(state);
if (shitheadId) {
  const shitheadIndex = state.players.findIndex(p => p.playerId === shitheadId);

  // Shithead becomes next dealer
  room.dealerIndex = shitheadIndex;

  // Deal new game
  const players = room.getPlayers(); // Get current lobby
  room.gameState = GameEngine.createGame(players, room.dealerIndex);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Remove eliminated players | Keep in array with zero cards | Modern game frameworks | Maintains array indices, simplifies state updates |
| Track play source client-side | Server determines from state | Server-authoritative era | Prevents cheating, enforces rules strictly |
| Separate winner detection | Count remaining players | Shithead-specific | Correctly identifies loser not winner |
| Manual turn skip logic | Pattern-based nextActivePlayer | Established pattern | Handles edge cases, prevents infinite loops |

**Deprecated/outdated:**
- Splicing players array to remove eliminated players: Breaks indices, modern approach keeps players with zero cards
- Client-determined play sources: Security risk, server must be authoritative
- Showing face-down cards to player: PlayerGameView pattern hides them correctly

## Open Questions

Things that couldn't be fully resolved:

1. **Should eliminated players remain visible in UI or fade out?**
   - What we know: Eliminated players stay in game state (zero cards)
   - What's unclear: UX treatment - show greyed out, hide completely, or show "eliminated" badge?
   - Recommendation: Phase 10 (UI/UX) will address visual treatment; keep them visible in PlayerGameView

2. **Can a player win by playing their last face-down card, or must it beat the pile?**
   - What we know: Official rules say "you can only drop out at that point if it beats the previous play"
   - What's unclear: Does "drop out" mean elimination only happens on successful play?
   - Recommendation: HIGH confidence - player only eliminates if blind card is playable; if unplayable they pickup and continue (per official rules)

3. **Should we support multi-card plays from face-up and face-down?**
   - What we know: Players can play multiple same-rank cards from hand
   - What's unclear: Rules don't explicitly address multiple face-up or blind face-down plays
   - Recommendation: MEDIUM confidence - support multi-card from face-up (player can see them), single-card only from face-down (blind play)

4. **What happens if all players except one disconnect during endgame?**
   - What we know: Phase 9 handles disconnects and reconnection
   - What's unclear: Should game auto-end if only one player remains connected?
   - Recommendation: Defer to Phase 9; likely timeout-based elimination of disconnected players

## Sources

### Primary (HIGH confidence)
- [Shithead Official Rules - Pagat.com](https://www.pagat.com/beating/shithead.html) - Complete endgame progression rules
- Existing codebase patterns (GameEngine static methods, PlayerGameState structure) - Established architecture

### Secondary (MEDIUM confidence)
- [Player Elimination Mechanics - League of Gamemakers](https://www.leagueofgamemakers.com/game-elements-elimination/) - Standard vs accelerated elimination
- [Turn Order with Elimination - boardgame.io](https://github.com/boardgameio/boardgame.io/blob/main/docs/documentation/turn-order.md) - Implied patterns for skipping eliminated players
- [Victory Conditions in Board Games](https://www.gamedeveloper.com/game-platforms/victory-conditions-in-board-games-other-than-victory-points) - Last player standing mechanics
- [State Machine Patterns - Game Programming Patterns](https://gameprogrammingpatterns.com/state.html) - Phase transition management

### Tertiary (LOW confidence - general guidance only)
- [WebSocket Broadcasting](https://websockets.readthedocs.io/en/stable/topics/broadcast.html) - Pub/sub for elimination notifications
- [TypeScript Array Mutation](https://www.geeksforgeeks.org/typescript/typescript-array-filter-method/) - Filter vs splice for immutability
- [Vitest State Testing](https://vitest.dev/guide/browser/component-testing) - Testing state transitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, existing patterns sufficient
- Architecture: HIGH - Extends established GameEngine pattern, aligns with PlayerGameState design
- Endgame progression rules: HIGH - Official Shithead rules are authoritative and clear
- Elimination tracking: HIGH - Keep-players-in-array pattern is standard in modern frameworks
- Turn rotation logic: MEDIUM - Pattern is sound but needs testing with edge cases
- Multi-card from face-up/face-down: MEDIUM - Rules ambiguous, using conservative interpretation

**Research date:** 2026-02-07
**Valid until:** 30 days (stable domain - card game rules don't change)
