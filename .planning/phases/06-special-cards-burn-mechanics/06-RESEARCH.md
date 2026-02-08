# Phase 6: Special Cards & Burn Mechanics - Research

**Researched:** 2026-02-07
**Domain:** Card game rules engine, special card mechanics, burn detection
**Confidence:** HIGH

## Summary

Phase 6 implements special card mechanics (2, 7, 8, 10) and burn detection for the Shithead card game. This is a pure validation/rules engine phase that extends the existing GameEngine with stateless utility methods following the established pattern.

The core technical challenge is the 8's "invisibility" rule which creates complex scenarios: when counting for four-of-a-kind burns, 8s are invisible for non-8 cards (e.g., 2,2,2,8,8,2 = burn because four 2s), but four 8s still burn. This requires looking through the discard pile with conditional filtering logic.

Special cards override normal play rules with clear precedence: 2 resets and plays on anything, 7 imposes a ceiling constraint on the next player, 8 makes the pile look through to the card beneath, and 10 immediately burns the pile. These rules are well-established in the Shithead/Palace/Karma game family.

**Primary recommendation:** Implement special card validation and burn detection as pure, stateless functions on GameEngine following the TDD pattern established in Phases 3-4. Use test.each() for comprehensive coverage of edge cases. Keep functions single-purpose and composable.

## Standard Stack

### Core (Already In Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | Latest | Testing framework | Project standard, already configured for both client and server |
| TypeScript | 5.x | Type safety | Bun native support, project-wide standard |
| Zod | 4.x | Schema validation | Project's schema-first pattern for messages |

### Supporting (No New Dependencies Needed)
The phase requires no additional dependencies. All functionality can be implemented with TypeScript's standard library (Array methods for pile traversal, conditional logic for rule evaluation).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled validation | Rules engine library (json-rules-engine, node-rules) | Overkill for straightforward card rules; adds dependency complexity; harder to debug game-specific logic |
| Stateful game manager | Immutable functional approach | Current project uses immutable state pattern successfully; consistency is valuable |
| Custom burn detector | Generic pattern matching library | Card game burns are domain-specific, generic solution adds complexity |

**Installation:** None required (use existing project stack)

## Architecture Patterns

### Recommended Function Structure
```
packages/server/src/game/
├── GameEngine.ts          # Core class with static methods
├── CardRules.ts           # NEW: Special card and burn validation utilities
└── __tests__/
    ├── game-engine.test.ts
    └── card-rules.test.ts # NEW: Comprehensive rule tests
```

### Pattern 1: Pure Validation Functions
**What:** Static methods that take game state and return validation results or new state
**When to use:** All rule validation logic (existing pattern in project)
**Example:**
```typescript
// Source: Existing project pattern from GameEngine.ts
static swapCards(
  state: GameState,
  playerId: string,
  handIndex: number,
  faceUpIndex: number
): OperationResult<GameState> {
  // Validate phase
  if (state.phase !== 'swapping') {
    return {
      success: false,
      error: 'Can only swap cards during swapping phase',
      code: 'INVALID_ACTION',
    };
  }
  // ... perform swap immutably
  return { success: true, data: newState };
}
```

### Pattern 2: Discard Pile Analysis
**What:** Functions that analyze the discard pile to determine game state (burns, valid plays)
**When to use:** Burn detection, determining what cards can be played
**Example:**
```typescript
// Analyze pile for burns
static detectBurn(discardPile: Card[]): { isBurn: boolean; reason?: string } {
  if (discardPile.length === 0) return { isBurn: false };

  const topCard = discardPile[discardPile.length - 1];

  // 10 always burns
  if (topCard.kind === 'standard' && topCard.rank === '10') {
    return { isBurn: true, reason: 'ten' };
  }

  // Four-of-a-kind (with 8s invisibility logic)
  // ... implementation
}
```

### Pattern 3: Table-Driven Testing with test.each()
**What:** Vitest's test.each() for testing multiple scenarios with same logic
**When to use:** Special card rules, burn detection, validation edge cases
**Example:**
```typescript
// Source: Vitest documentation pattern
describe('Special card validation', () => {
  test.each([
    { rank: '2', onTop: 'K', expected: true, reason: '2 resets pile' },
    { rank: '7', onTop: '9', expected: false, reason: '9 > 7' },
    { rank: '7', onTop: '5', expected: true, reason: '5 <= 7' },
    { rank: '8', onTop: '3', expected: true, reason: '8 is invisible' },
  ])('playing $rank on $onTop: $reason', ({ rank, onTop, expected }) => {
    const result = canPlayCard(
      { kind: 'standard', suit: 'hearts', rank },
      [{ kind: 'standard', suit: 'spades', rank: onTop }]
    );
    expect(result).toBe(expected);
  });
});
```

### Pattern 4: Immutable State Updates
**What:** Never mutate input state, always return new objects with spread operator
**When to use:** All state-modifying operations (existing project pattern)
**Example:**
```typescript
// Source: Existing project pattern from GameEngine.swapCards
const updatedPlayers = state.players.map((p, i) =>
  i === playerIndex ? updatedPlayer : p
);

const newState: GameState = {
  ...state,
  players: updatedPlayers,
};
```

### Anti-Patterns to Avoid
- **In-place mutation:** Never mutate GameState or arrays directly — breaks immutability contract
- **Complex nested ternaries:** Special card logic can get complex; use early returns or helper functions
- **Hardcoded pile lengths:** Always check actual array lengths, not assumed values
- **String comparison for suits/ranks:** Use discriminated union type guards (card.kind === 'standard')

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Looking at top N cards | Manual slice/reverse logic | `pile.slice(-n)` or `pile.at(-1)` | Modern array methods handle edge cases (empty arrays) |
| Counting card ranks | Manual loop accumulator | `pile.filter(c => matches(c)).length` | Declarative, harder to get wrong |
| Finding card beneath 8s | Recursive traversal | Reverse iteration with break | Simpler, more readable, no stack overflow risk |
| Validation result types | Plain booleans | OperationResult pattern | Project standard, provides error context |

**Key insight:** Card game rules involve array traversal and filtering. Modern JavaScript/TypeScript array methods (filter, map, slice, at, findLast) handle edge cases better than manual loops. The project already uses these patterns successfully.

## Common Pitfalls

### Pitfall 1: 8's Invisibility Edge Cases
**What goes wrong:** Incorrectly counting 8s when detecting four-of-a-kind burns
**Why it happens:** The rule is asymmetric — 8s are invisible when counting other ranks, but four 8s still burn
**How to avoid:**
- When checking for four-of-a-kind of rank X (where X ≠ 8), filter out 8s first, then count
- When checking for four 8s, count only 8s
- Test edge cases: [8,8,8,8], [2,8,2,8,2,8,2], [8,2,8,2]
**Warning signs:** Burn tests failing for mixed 8s and other cards

### Pitfall 2: Empty Pile After Burn
**What goes wrong:** After a burn, trying to check "card beneath" when pile is empty
**Why it happens:** Burns remove cards, but validation logic assumes cards exist
**How to avoid:** Always check pile.length > 0 before accessing pile elements; after burn, empty pile means "play any card"
**Warning signs:** Array access errors, undefined card references

### Pitfall 3: Special Card Precedence Confusion
**What goes wrong:** Applying rules in wrong order or allowing contradictory plays
**Why it happens:** Multiple special cards interact (playing 8 on 7, playing 2 after 7, etc.)
**How to avoid:**
- Clear precedence hierarchy: 2 and 10 always work, 8 is invisible (check card beneath), 7 constrains next player
- Test all special-on-special combinations: 2 on 7, 8 on 7, 7 on 8, etc.
**Warning signs:** Rule conflicts in edge cases, unclear validation logic

### Pitfall 4: Stateful Validation Logic
**What goes wrong:** Carrying state between validation calls, caching results
**Why it happens:** Trying to optimize by avoiding pile traversal
**How to avoid:** Follow project pattern — static methods, no instance state, always calculate from input state
**Warning signs:** Tests passing in isolation but failing when run together

### Pitfall 5: Off-by-One in Pile Traversal
**What goes wrong:** Looking at wrong card when finding "card beneath 8s"
**Why it happens:** Pile is in play order (oldest first), but checking from top (newest first)
**How to avoid:**
- Use pile.at(-1) for top card, pile.at(-2) for second from top
- When iterating backwards, start from pile.length - 1
- Test with single-card piles, empty piles
**Warning signs:** Validation checks wrong card, index out of bounds errors

## Code Examples

Verified patterns from research:

### Immutable State Pattern (Project Standard)
```typescript
// Source: packages/server/src/game/GameEngine.ts (lines 170-199)
// Swap operation returns new state without mutating original
const updatedHand = [...player.hand];
const updatedFaceUp = [...player.faceUp];

[updatedHand[handIndex], updatedFaceUp[faceUpIndex]] = [
  updatedFaceUp[faceUpIndex],
  updatedHand[handIndex],
];

const updatedPlayer: PlayerGameState = {
  ...player,
  hand: updatedHand,
  faceUp: updatedFaceUp,
};

const updatedPlayers = state.players.map((p, i) =>
  i === playerIndex ? updatedPlayer : p
);

const newState: GameState = {
  ...state,
  players: updatedPlayers,
};
```

### Discriminated Union Pattern (Project Standard)
```typescript
// Source: packages/shared/src/types/card.ts (lines 7-9)
export type Card =
  | { kind: 'standard'; suit: Suit; rank: Rank }
  | { kind: 'joker'; id: 1 | 2 };

// Type-safe card checking
function isStandardCard(card: Card): card is { kind: 'standard'; suit: Suit; rank: Rank } {
  return card.kind === 'standard';
}
```

### OperationResult Pattern (Project Standard)
```typescript
// Source: packages/server/src/game/GameEngine.ts (lines 5-7)
type OperationResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; code: string };

// Usage
static swapCards(...): OperationResult<GameState> {
  if (state.phase !== 'swapping') {
    return {
      success: false,
      error: 'Can only swap cards during swapping phase',
      code: 'INVALID_ACTION',
    };
  }
  // ... validation and swap logic
  return { success: true, data: newState };
}
```

### Table-Driven Tests (Recommended for Special Cards)
```typescript
// Source: Vitest best practices - https://oliviac.dev/blog/introduction-to-table-driven-tests-in-vitest/
describe('Special card validation', () => {
  test.each([
    { card: '2', pile: ['K'], valid: true, reason: '2 resets' },
    { card: '7', pile: ['9'], valid: false, reason: '9 > 7 after 7' },
    { card: '7', pile: ['5'], valid: true, reason: '5 <= 7 after 7' },
    { card: 'A', pile: ['7'], valid: false, reason: 'A > 7 after 7' },
    { card: '8', pile: ['K'], valid: true, reason: '8 invisible' },
  ])('$card on $pile[0]: $reason', ({ card, pile, valid }) => {
    const result = canPlay(makeCard(card), pile.map(makeCard));
    expect(result).toBe(valid);
  });
});
```

### Burn Detection Pattern (Recommended Implementation)
```typescript
// Detect four-of-a-kind burn with 8s invisibility
function countTopRank(pile: Card[], targetRank: Rank): number {
  if (pile.length === 0) return 0;

  let count = 0;

  // Iterate backwards from top of pile
  for (let i = pile.length - 1; i >= 0; i--) {
    const card = pile[i];

    if (card.kind !== 'standard') continue;

    // For non-8 ranks, 8s are invisible (skip them)
    if (targetRank !== '8' && card.rank === '8') continue;

    // For 8 ranks, only count 8s
    if (targetRank === '8' && card.rank !== '8') break;

    // Check if matches target
    if (card.rank === targetRank) {
      count++;
    } else {
      // Hit a different rank, stop counting
      break;
    }
  }

  return count;
}

function detectFourOfAKind(pile: Card[]): boolean {
  if (pile.length === 0) return false;

  const topCard = pile[pile.length - 1];
  if (topCard.kind !== 'standard') return false;

  const count = countTopRank(pile, topCard.rank);
  return count >= 4;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based game engines | Static utility methods | ~2020+ | Easier testing, no hidden state, better for server-client sync |
| Mutable state updates | Immutable with spread/map | React/Redux era (~2015+) | Predictable updates, easier debugging, time-travel possible |
| Manual array loops | Declarative array methods | ES6+ (2015+) | More readable, fewer off-by-one errors |
| Boolean returns | Result types (Success/Failure) | TypeScript adoption | Better error context, type-safe error codes |

**Deprecated/outdated:**
- Class instances with mutable state: Hard to serialize, sync issues in multiplayer
- Callback-based validation: Promise/async not needed for pure validation
- Global game state singletons: Testing nightmare, multiplayer conflicts

## Open Questions

1. **Should Jokers have special behavior beyond being highest rank?**
   - What we know: README.md says "Joker" is highest in value ordering (line 35)
   - What's unclear: No special rules mentioned (like burns, resets, etc.)
   - Recommendation: Treat as normal high card unless user specifies otherwise

2. **Can you win by burning with four-of-a-kind, or must you play a card after?**
   - What we know: README.md says "A player cannot win on a 10 as if they burn the pile they need to place a card down after" (line 32)
   - What's unclear: Does this apply to four-of-a-kind burns too?
   - Recommendation: Assume four-of-a-kind burns DO allow winning (only 10s explicitly forbidden); clarify with user if needed

3. **Playing multiple cards: How do 8s interact?**
   - What we know: Players can play multiple cards of same value (README.md line 40)
   - What's unclear: If you play [8, 8], are both invisible? If you play [2, 8, 2], does that work?
   - Recommendation: Multiple cards must all be same rank (no mixing). Test this edge case.

4. **What happens when 8 is played on empty pile?**
   - What we know: README.md says "If there's nothing underneath the 8 then the next player needs to play a card equal or higher than 3" (line 29)
   - What's unclear: Is this a hard rule or just guidance?
   - Recommendation: Empty pile after 8 means next player plays any card (3 is lowest playable anyway)

## Domain-Specific Insights

### Shithead Rule Variants
Research shows Shithead (also called Palace, Karma, Shed) has many regional variants. Key findings from authoritative sources:

**8's Invisibility (Transparent Rule):**
- Source: [Shithead Rules – Official Game Rules](https://officialgamerules.org/game-rules/shithead/)
- "An 8 is an invisible card, so its value does not count, and the next player considers the value of the card beneath the 8"
- This is the most common variant and matches the project's README.md

**Burn Mechanics:**
- Source: [Shithead - Card Game Rules (Pagat.com)](https://www.pagat.com/beating/shithead.html)
- Four-of-a-kind: "If someone completes a set of four cards of the same rank on top of the discard pile, the whole pile is removed from play, and the same player who completed the four of a kind takes another turn"
- 10 burns: "A 10 burns the pack, which means all cards on the pile are removed and put to one side"

**8s Invisibility for Burns:**
- Source: [Ezracard Shithead Rules](https://ezracard.com/shithead-rules/)
- When counting for four-of-a-kind, 8s don't interrupt the count of other ranks
- Example: 2, 2, 8, 2, 2 = four 2s = burn (the 8 is invisible)
- Four 8s still burn normally

**Special Card Precedence:**
- 2 always playable: Resets pile to rank 2, any card can follow
- 7 constraint: Next player must play 7 or lower (7 itself follows normal ordering)
- 8 invisibility: Doesn't affect what current player can play, affects next player's view
- 10 immediate burn: Removes pile before next player's turn

### Card Value Ordering
Project requirement (README.md line 35):
```
3 < 4 < 5 < 6 < 7 < 9 < J < Q < K < A < Joker
```
Note: 2, 8, and 10 are special cards not in the ordering (they don't follow "equal or higher" rule).

## Testing Strategy

### Test Categories for Phase 6

1. **Special Card Validation (Table-Driven)**
   - 2 on any card (should succeed)
   - 7 on any card (should succeed, but sets constraint for next player)
   - Non-7 on 7 (must be <= 7)
   - 8 on any card (should succeed, invisible to next player)
   - 10 on any card (should succeed and trigger burn)
   - Edge: Multiple special cards in sequence

2. **Burn Detection (Table-Driven)**
   - Four 2s, 3s, 4s, ..., Ks, As (all should burn)
   - Four 8s (should burn)
   - Four-of-a-kind with 8s mixed in: [2,8,2,8,2,2] (should burn)
   - Almost four: [K,K,K] (should not burn)
   - 10 played (immediate burn)
   - Empty pile (no burn)
   - Edge: [8,8,8,2,8] - three 8s visible, then different rank (no burn)

3. **8's Invisibility Logic**
   - Single 8: look at card beneath
   - Multiple 8s: [8,8,K] - look through 8s to K
   - All 8s to bottom: [8,8,8] with no cards beneath - any card valid
   - Mixed: [K,8,Q] - next player sees K (8 invisible, Q also invisible? No, 8 only refers to itself)

4. **Card Beneath Logic**
   - Empty pile: any card valid
   - One card: check against that card
   - Top is special: [2,K,7] - top is 7, next player constrained
   - Multiple 8s: [5,8,8] - look through to 5

5. **Integration with Existing Rules**
   - Normal card ordering still applies: [5,7,9] - 9 beats 7 (valid)
   - Joker as highest: [K,Joker] valid, [Joker,K] invalid
   - Can't play lower: [K,5] invalid (unless 5 is after 7 constraint and fails)

### Coverage Goals
- **Special card rules:** 100% (all four special ranks tested in multiple scenarios)
- **Burn detection:** Edge cases covered (four exact, mixed 8s, 10s)
- **Pile traversal:** Empty, single, multiple cards tested
- **Type safety:** Discriminated union guards prevent undefined behavior

## Sources

### Primary (HIGH confidence)
- Project codebase: /Users/stephendickson/Personal/shit-head/packages/server/src/game/GameEngine.ts
- Project codebase: /Users/stephendickson/Personal/shit-head/packages/shared/src/types/card.ts
- Project codebase: /Users/stephendickson/Personal/shit-head/packages/shared/src/types/game.ts
- Project README: /Users/stephendickson/Personal/shit-head/README.md (official game rules)
- [Shithead Rules – Official Game Rules](https://officialgamerules.org/game-rules/shithead/) - authoritative rule source
- [Shithead - Card Game Rules (Pagat.com)](https://www.pagat.com/beating/shithead.html) - comprehensive rule variants
- [Vitest Guide](https://vitest.dev/) - testing framework documentation

### Secondary (MEDIUM confidence)
- [Vitest table-driven tests guide](https://oliviac.dev/blog/introduction-to-table-driven-tests-in-vitest/) - testing pattern
- [TCG Engines GitHub](https://github.com/TheCardGoat/tcg-engines) - modern TypeScript card game engine patterns
- [Functional Immutable Game State](https://dev.to/binarykoan/functional-immutable-game-state-2fal) - immutable state patterns
- [Ezracard Shithead Rules](https://ezracard.com/shithead-rules/) - 8s invisibility for burns clarification
- [Forever Functional: Poker and TypeScript](https://blog.openreplay.com/forever-functional-poker-and-typescript/) - card game TypeScript patterns

### Tertiary (LOW confidence)
- [Medium: Building TypeScript card game backend](https://medium.com/@garry.passarella/building-a-typescript-based-gaming-back-end-with-loopback-aks-and-terraform-b533c9485e80) - general architecture
- [Magic: The Gathering Comprehensive Rules](https://blogs.magicjudges.org/rules/comprehensive-rules/) - rule precedence concepts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - project already uses all necessary tools, no new dependencies needed
- Architecture: HIGH - existing GameEngine pattern directly applicable, clear precedent from Phases 3-4
- Special card rules: HIGH - README.md explicit, cross-verified with authoritative Shithead rule sources
- Burn mechanics: HIGH - well-documented in game rules, multiple source agreement
- 8's invisibility: HIGH - clear rule explanation in multiple sources, edge cases identified
- Testing patterns: HIGH - existing test suite demonstrates table-driven approach, Vitest documentation clear
- Pitfalls: MEDIUM - based on common card game implementation errors and project patterns

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable domain, rules don't change)
