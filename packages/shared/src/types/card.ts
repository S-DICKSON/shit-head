// Card types for Shithead deck (52 standard cards + 2 jokers)

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export type Card =
  | { kind: 'standard'; suit: Suit; rank: Rank }
  | { kind: 'joker'; id: 1 | 2 };

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

/**
 * Creates a complete unshuffled deck of 54 cards.
 * Returns 52 standard cards (4 suits x 13 ranks) + 2 jokers.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];

  // Add all standard cards
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ kind: 'standard', suit, rank });
    }
  }

  // Add two jokers
  deck.push({ kind: 'joker', id: 1 });
  deck.push({ kind: 'joker', id: 2 });

  return deck;
}

/**
 * Compares two cards for equality.
 * Standard cards match if both suit and rank are equal.
 * Jokers match if their id is equal.
 */
export function cardEquals(a: Card, b: Card): boolean {
  if (a.kind === 'joker' && b.kind === 'joker') {
    return a.id === b.id;
  }

  if (a.kind === 'standard' && b.kind === 'standard') {
    return a.suit === b.suit && a.rank === b.rank;
  }

  return false;
}
