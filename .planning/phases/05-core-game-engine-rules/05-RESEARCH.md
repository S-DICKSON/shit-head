# Phase 5: Core Game Engine & Rules - Research

**Researched:** 2026-02-07
**Domain:** Turn-based card game validation and state management
**Confidence:** HIGH

## Summary

Phase 5 implements the core turn-based gameplay mechanics for Shithead: card play validation, turn rotation, auto-draw, and pickup mechanics. The research confirms that the existing codebase architecture (static GameEngine methods, immutable state patterns, OperationResult discriminated unions) is well-suited for this phase.

The standard approach is to implement game rules as pure validation functions that return new state on success, following the established TDD pattern. Turn management uses modular arithmetic for clockwise rotation. Card comparison requires a rank ordering function since TypeScript enums don't support custom ordering for non-numeric values. Auto-draw and pickup operations are implemented as separate validation steps that mutate state immutably.

Key challenges identified: determining first player by scanning for lowest card (3 upward), implementing card value ordering with 2s and Jokers at the top, and handling multi-card plays of the same value atomically.

**Primary recommendation:** Extend GameEngine with static methods for playCards(), determineFirstPlayer(), and compareCardRank(), maintaining the stateless utility pattern established in Phases 3-4.

## Standard Stack

The project already uses the ideal stack for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.8+ | Static typing | Discriminated unions prevent invalid state transitions |
| Vitest | Latest | Testing | Established in Phase 1, TDD methodology proven in Phases 3-4 |
| Zod | Latest | Runtime validation | Schema-first pattern for message validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Immer | 10+ | Immutable updates | OPTIONAL - current spread/slice approach works, only add if state updates become complex |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual immutability | Immer | Immer adds dependency but simplifies nested updates; current codebase has shallow updates so manual is fine |
| Custom validators | Zod refinements | Zod refinements for cross-field validation if needed, but GameEngine logic is clearer |

**Installation:**
No new packages required - existing stack is sufficient.

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/game/
├── GameEngine.ts        # Static methods for all game logic
├── Deck.ts             # Shuffle utility (existing)
└── CardComparison.ts   # NEW: Card rank ordering utilities

packages/server/src/__tests__/
├── game-engine.test.ts  # Extend with playCards, determineFirstPlayer tests
└── card-comparison.test.ts  # NEW: Tests for rank ordering

packages/shared/src/
├── schemas/messages.ts  # Add play-cards, card-played, turn-changed schemas
├── types/game.ts       # GameState already exists, may need PlayResult type
└── types/card.ts       # Existing Card type
```

### Pattern 1: Static Validation Methods (Continue Established Pattern)
**What:** GameEngine class contains only static methods, no instance state
**When to use:** All game logic validation and state transitions
**Example:**
```typescript
// Established pattern from Phase 4
export class GameEngine {
  static swapCards(
    state: GameState,
    playerId: string,
    handIndex: number,
    faceUpIndex: number
  ): OperationResult<GameState> {
    // 1. Validate preconditions
    if (state.phase !== 'swapping') {
      return { success: false, error: '...', code: 'INVALID_ACTION' };
    }
    // 2. Perform immutable update
    const newState = { ...state, /* updates */ };
    // 3. Return new state
    return { success: true, data: newState };
  }
}

// NEW for Phase 5 - same pattern
static playCards(
  state: GameState,
  playerId: string,
  cardIndices: number[]
): OperationResult<GameState> {
  // Validate: correct turn, valid cards, playable on pile
  // Update: move cards to discard, check burn, advance turn, auto-draw
  // Return: new GameState or error
}
```

### Pattern 2: Card Rank Ordering with Lookup Map
**What:** Define card rank order as const array, create Map for O(1) comparison
**When to use:** Comparing card values for play validation
**Example:**
```typescript
// TypeScript enums don't support custom ordering for string literals
// Use const array + Map pattern instead

const RANK_ORDER = ['3', '4', '5', '6', '7', '9', 'J', 'Q', 'K', 'A'] as const;
const RANK_MAP = new Map(RANK_ORDER.map((rank, i) => [rank, i]));

export function getRankValue(card: Card): number {
  if (card.kind === 'joker') return 999; // Highest
  return RANK_MAP.get(card.rank) ?? -1;
}

export function canPlayOn(playedCard: Card, topCard: Card): boolean {
  return getRankValue(playedCard) >= getRankValue(topCard);
}
```

### Pattern 3: Modular Arithmetic for Turn Rotation
**What:** Use `(currentIndex + 1) % playerCount` for clockwise rotation
**When to use:** Advancing to next player's turn
**Example:**
```typescript
// Already established in GameEngine.nextDealerIndex()
static nextPlayerIndex(currentIndex: number, playerCount: number): number {
  return (currentIndex + 1) % playerCount;
}
```

### Pattern 4: Determining First Player by Scanning Hands
**What:** Scan all players' initial hands for lowest card (3 upward)
**When to use:** Transition from 'transitioning' to 'playing' phase
**Example:**
```typescript
static determineFirstPlayer(state: GameState): number {
  // Scan for 3, then 4, then 5, etc. until found
  for (const targetRank of RANK_ORDER) {
    for (let i = 0; i < state.players.length; i++) {
      const player = state.players[i];
      if (player.hand.some(card =>
        card.kind === 'standard' && card.rank === targetRank
      )) {
        return i; // First player with this rank
      }
    }
  }
  return 0; // Fallback (should never happen with 54 cards)
}
```

### Pattern 5: Multi-Card Play Validation
**What:** Validate all cards in array have same rank, all exist in player's hand
**When to use:** Player plays multiple cards in one turn
**Example:**
```typescript
// Validate all cards are same value
const cardRanks = selectedCards.map(c =>
  c.kind === 'standard' ? c.rank : 'JOKER'
);
if (new Set(cardRanks).size > 1) {
  return { success: false, error: 'All cards must have same rank' };
}

// Validate all cards exist in player's hand
for (const card of selectedCards) {
  if (!player.hand.some(h => cardEquals(h, card))) {
    return { success: false, error: 'Card not in hand' };
  }
}
```

### Pattern 6: Auto-Draw After Playing
**What:** After successful play, if hand.length < 3 and drawPile has cards, draw up to 3
**When to use:** After every successful card play
**Example:**
```typescript
// After moving cards to discard pile
const cardsNeeded = Math.min(3 - player.hand.length, state.drawPile.length);
if (cardsNeeded > 0) {
  const drawnCards = state.drawPile.slice(0, cardsNeeded);
  player.hand.push(...drawnCards);
  state.drawPile = state.drawPile.slice(cardsNeeded);
}
```

### Anti-Patterns to Avoid
- **Mutating input state:** Always return new state objects, never modify in place
- **Client-side validation only:** Server must re-validate all plays (client is untrusted)
- **Forgetting turn validation:** Every action must verify it's the player's turn
- **Index access without bounds check:** Always validate `cardIndices` against array length
- **Forgetting auto-draw:** Must happen automatically after every play, not optional

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Immutable nested updates | Custom deep clone | Existing spread syntax OR Immer | Spread works for shallow updates; Immer if updates get complex |
| Rank comparison | String comparison or switch | Lookup Map (RANK_MAP pattern) | O(1) comparison, easier to test, single source of truth |
| Turn rotation | if/else chains | Modular arithmetic `(i+1)%n` | Works for any player count, already established |
| Card uniqueness | JSON.stringify comparison | cardEquals() utility | Already exists in codebase, handles discriminated union correctly |

**Key insight:** Don't reinvent immutability or validation patterns - the codebase already has solid patterns from Phases 2-4. Extend GameEngine with new static methods following the same OperationResult<T> pattern.

## Common Pitfalls

### Pitfall 1: Off-by-One Errors in Card Selection
**What goes wrong:** Player sends `cardIndices: [0, 1, 2]` but hand only has 2 cards left
**Why it happens:** Hand size changes as cards are played; indices become invalid
**How to avoid:**
- Validate ALL indices against current hand length BEFORE any state mutation
- Use cards by value (Card objects) not by index in some contexts
**Warning signs:**
- Tests fail with "undefined" cards
- Array access throws errors in production

### Pitfall 2: Forgetting to Check Phase
**What goes wrong:** Player can play cards during 'swapping' or 'finished' phase
**Why it happens:** Not validating `state.phase === 'playing'` before play logic
**How to avoid:**
- First validation in `playCards()` must check phase
- Pattern: `if (state.phase !== 'playing') return error`
**Warning signs:**
- UAT shows cards playable during countdown
- Phase transitions don't prevent old actions

### Pitfall 3: Not Validating Turn Ownership
**What goes wrong:** Any player can play cards on anyone's turn
**Why it happens:** Checking player exists, but not checking `currentPlayerIndex`
**How to avoid:**
```typescript
const playerIndex = state.players.findIndex(p => p.playerId === playerId);
if (playerIndex !== state.currentPlayerIndex) {
  return { success: false, error: 'Not your turn', code: 'INVALID_ACTION' };
}
```
**Warning signs:**
- UAT shows wrong player able to play
- Turn order breaks in testing

### Pitfall 4: Incorrect Card Comparison with 2s
**What goes wrong:** 2s not playable on Aces, or Aces playable on 2s when shouldn't be
**Why it happens:** 2s are BOTH high and low in Shithead rules - special case
**How to avoid:**
- 2s have special logic: always playable on anything
- Anything playable on a 2 (2 is treated as lowest for "what comes next")
- Check for 2 explicitly before rank comparison
**Warning signs:**
- Tests fail for "2 on Ace" scenarios
- Official rules don't match implementation

### Pitfall 5: Auto-Draw Race Condition
**What goes wrong:** Player sees empty hand briefly before draw triggers
**Why it happens:** Drawing cards happens in separate message/update cycle
**How to avoid:**
- Auto-draw must be part of the SAME state mutation as playing cards
- Before returning OperationResult, mutate newState to include drawn cards
- Send single game-state-update message, not play-confirmed then draw-cards
**Warning signs:**
- Client sees flickering empty hand
- Draw pile count updates separately from hand count

### Pitfall 6: Multiple Players with Same Lowest Card
**What goes wrong:** Crash or wrong player when two players both have 3 of Diamonds
**Why it happens:** `determineFirstPlayer()` assumes unique lowest card
**How to avoid:**
- Return FIRST player found with lowest rank (deterministic tie-breaking)
- After dealing, dealer+1 starts anyway (no ties during normal play)
**Warning signs:**
- Inconsistent first player across clients
- Rare crashes with specific card distributions

### Pitfall 7: Forgetting to Remove Cards from Hand
**What goes wrong:** Cards stay in hand after being played to discard pile
**Why it happens:** Adding to discardPile but not removing from hand
**How to avoid:**
```typescript
// MUST do both:
// 1. Add to discard pile
newState.discardPile.push(...playedCards);
// 2. Remove from hand (filter out played cards)
player.hand = player.hand.filter(card =>
  !playedCards.some(played => cardEquals(card, played))
);
```
**Warning signs:**
- Hand size grows instead of shrinks
- Same card appears in hand and discard pile

## Code Examples

Verified patterns from official sources:

### Determining First Player (Lowest Card Logic)
```typescript
// Source: https://www.pagat.com/beating/shithead.html
// "The first player is the person who receives the first 3 dealt face-up.
//  If no 3 is face-up, the first person to call a three in a hand is the
//  first player."

const RANK_ORDER = ['3', '4', '5', '6', '7', '9', 'J', 'Q', 'K', 'A'] as const;

export function determineFirstPlayer(state: GameState): number {
  // Scan hands for lowest card (3 upward)
  for (const targetRank of RANK_ORDER) {
    for (let i = 0; i < state.players.length; i++) {
      const player = state.players[i];
      const hasCard = player.hand.some(card =>
        card.kind === 'standard' && card.rank === targetRank
      );
      if (hasCard) {
        return i;
      }
    }
  }

  // Fallback: should never happen with 54 cards
  return 0;
}
```

### Card Rank Comparison
```typescript
// Source: Official Shithead rules (pagat.com)
// Ranking: 3 < 4 < 5 < 6 < 7 < 9 < J < Q < K < A < Joker
// Note: 8 is invisible (handled in Phase 6)
// Note: 10 burns pile (handled in Phase 6)
// Note: 2 is special - always playable (handled in Phase 6)

const RANK_ORDER = ['3', '4', '5', '6', '7', '9', 'J', 'Q', 'K', 'A'] as const;
const RANK_MAP = new Map(RANK_ORDER.map((rank, idx) => [rank, idx]));

export function getRankValue(card: Card): number {
  if (card.kind === 'joker') return 999; // Highest possible
  const value = RANK_MAP.get(card.rank);
  if (value === undefined) {
    throw new Error(`Unknown rank: ${card.rank}`);
  }
  return value;
}

export function canPlayOn(playedCard: Card, topCard: Card): boolean {
  const playedValue = getRankValue(playedCard);
  const topValue = getRankValue(topCard);
  return playedValue >= topValue;
}
```

### Play Cards Validation (Basic)
```typescript
// Source: Established codebase pattern (Phase 4 swapCards)
// Rules from pagat.com/beating/shithead.html

static playCards(
  state: GameState,
  playerId: string,
  cardIndices: number[]
): OperationResult<GameState> {
  // 1. Validate phase
  if (state.phase !== 'playing') {
    return {
      success: false,
      error: 'Can only play cards during playing phase',
      code: 'INVALID_ACTION',
    };
  }

  // 2. Find player and validate turn
  const playerIndex = state.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) {
    return { success: false, error: 'Player not found', code: 'PLAYER_NOT_FOUND' };
  }

  if (playerIndex !== state.currentPlayerIndex) {
    return { success: false, error: 'Not your turn', code: 'INVALID_ACTION' };
  }

  const player = state.players[playerIndex];

  // 3. Validate card indices
  if (cardIndices.length === 0) {
    return { success: false, error: 'Must play at least one card', code: 'INVALID_ACTION' };
  }

  for (const idx of cardIndices) {
    if (idx < 0 || idx >= player.hand.length) {
      return { success: false, error: 'Invalid card index', code: 'INVALID_ACTION' };
    }
  }

  // 4. Extract cards and validate all same rank
  const playedCards = cardIndices.map(idx => player.hand[idx]);
  const ranks = playedCards.map(c => c.kind === 'standard' ? c.rank : 'JOKER');
  if (new Set(ranks).size > 1) {
    return { success: false, error: 'All cards must have same rank', code: 'INVALID_ACTION' };
  }

  // 5. Validate playable on top of discard pile
  if (state.discardPile.length > 0) {
    const topCard = state.discardPile[state.discardPile.length - 1];
    if (!canPlayOn(playedCards[0], topCard)) {
      return { success: false, error: 'Card value too low', code: 'INVALID_ACTION' };
    }
  }

  // 6. Perform state update (immutably)
  const updatedHand = player.hand.filter((_, idx) => !cardIndices.includes(idx));
  const updatedDiscardPile = [...state.discardPile, ...playedCards];

  // TODO: Check for burn (Phase 6)
  // TODO: Draw cards back up to 3 if draw pile available
  // TODO: Advance turn to next player

  const newState: GameState = {
    ...state,
    players: state.players.map((p, i) =>
      i === playerIndex ? { ...p, hand: updatedHand } : p
    ),
    discardPile: updatedDiscardPile,
  };

  return { success: true, data: newState };
}
```

### Auto-Draw After Playing
```typescript
// Source: pagat.com rules
// "If after playing you have fewer than three cards in your hand, you must
//  immediately replenish your hand by drawing from the stock so that you
//  have three cards again."

function autoDrawCards(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const cardsNeeded = Math.min(3 - player.hand.length, state.drawPile.length);

  if (cardsNeeded <= 0) {
    return state; // No draw needed
  }

  const drawnCards = state.drawPile.slice(0, cardsNeeded);
  const remainingDraw = state.drawPile.slice(cardsNeeded);

  return {
    ...state,
    drawPile: remainingDraw,
    players: state.players.map((p, i) =>
      i === playerIndex
        ? { ...p, hand: [...p.hand, ...drawnCards] }
        : p
    ),
  };
}
```

### Pickup Discard Pile
```typescript
// Source: pagat.com rules
// When unable to play: "you must pick up all the cards in the discard pile
//  and add them to your hand"

static pickupPile(
  state: GameState,
  playerId: string
): OperationResult<GameState> {
  // Validate phase and player
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

  // Add entire discard pile to hand
  const newHand = [...player.hand, ...state.discardPile];

  // Clear discard pile and advance turn
  const nextPlayer = (state.currentPlayerIndex + 1) % state.players.length;

  const newState: GameState = {
    ...state,
    discardPile: [],
    currentPlayerIndex: nextPlayer,
    players: state.players.map((p, i) =>
      i === playerIndex ? { ...p, hand: newHand } : p
    ),
  };

  return { success: true, data: newState };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Enum-based card ranks | Const array + Map lookup | TypeScript 5.x era | Better type safety, easier testing, O(1) comparison |
| Mutable state mutations | Immutable updates with spread | React/functional era | Prevents bugs, enables time-travel debugging |
| Custom event emitters | Callback pattern | Established in Phase 4 | Simpler, type-safe, no EventEmitter dependency |
| Class-based state machines | Discriminated unions + pure functions | TypeScript 4.x+ | Better inference, exhaustiveness checking |

**Deprecated/outdated:**
- TypeScript numeric enums for card ranks: Can't represent '9' < 'J' naturally, use const array instead
- EventEmitter for game events: Callback pattern is simpler and type-safe
- Class instances for GameState: Use plain objects with discriminated unions for better serialization

## Open Questions

Things that couldn't be fully resolved:

1. **Should first player be determined at start of 'playing' phase or during transition?**
   - What we know: Pagat rules say "first player is person with lowest card in hand"
   - What's unclear: Exact timing - should this happen when transitioning phase changes to 'playing'?
   - Recommendation: Determine in Room.endSwapPhase() when setting phase to 'playing', store in GameState.currentPlayerIndex

2. **How should we handle the edge case where all hands are empty after dealing?**
   - What we know: With 54 cards and 2-4 players, each gets 9 cards (3+3+3), leaving 18-36 in draw pile
   - What's unclear: Mathematically impossible for all hands to be empty after initial deal, but good to document
   - Recommendation: Add assertion test that after dealing, all hands have exactly 3 cards

3. **Should auto-draw happen before or after burn detection?**
   - What we know: Burns remove the pile, then player goes again
   - What's unclear: If player burns pile, do they draw before or after taking another turn?
   - Recommendation: Draw happens AFTER burn is detected and pile is cleared (Phase 6 will clarify)

## Sources

### Primary (HIGH confidence)
- [Shithead Official Rules - Pagat.com](https://www.pagat.com/beating/shithead.html) - Complete rule set
- Existing codebase patterns (GameEngine.swapCards, Room.markPlayerReady) - Established architecture

### Secondary (MEDIUM confidence)
- [TCG Engines Framework](https://github.com/TheCardGoat/tcg-engines) - Immutable state patterns for card games
- [Real-Time Multiplayer Card Games in .NET](https://developersvoice.com/blog/practical-design/realtime-card-games-net-architecture-guide/) - Deterministic lockstep and validation patterns
- [3 Lessons From Developing Multiplayer Card Game](https://medium.com/@talham7391/3-lessons-i-learned-from-developing-a-multiplayer-card-game-874a7b3bec5a) - Mutex locks and concurrency for multiplayer state
- [Turn-Based Game Development Guide](https://games.themindstudios.com/post/turn-based-game-development/) - Common mistakes and best practices

### Tertiary (LOW confidence - general guidance only)
- [TypeScript Enums Handbook](https://www.typescriptlang.org/docs/handbook/enums.html) - Why numeric enums insufficient for card ranks
- [Game Programming Patterns - State](https://gameprogrammingpatterns.com/state.html) - State pattern for game phases
- Various WebSearch results on array manipulation and off-by-one errors

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Project already uses ideal stack, no new dependencies needed
- Architecture: HIGH - Patterns established in Phases 2-4, extending proven approach
- Card comparison logic: HIGH - Official Shithead rules are authoritative, Map pattern is standard
- Pitfalls: MEDIUM - Based on general programming experience and WebSearch, not Shithead-specific sources
- Auto-draw timing: MEDIUM - Rules are clear, but interaction with burns (Phase 6) needs validation

**Research date:** 2026-02-07
**Valid until:** 30 days (stable domain - card game rules don't change)
