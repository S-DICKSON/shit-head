import type { Card } from '@shit-head/shared';

/**
 * Shuffles a deck of cards using Fisher-Yates algorithm.
 * Does not mutate the input array.
 * @param cards - Array of cards to shuffle
 * @returns A new shuffled array
 */
export function shuffleDeck(cards: Card[]): Card[] {
  // Copy array to avoid mutation
  const shuffled = [...cards];

  // Fisher-Yates shuffle: iterate from end, swap with random index in [0, i]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}
