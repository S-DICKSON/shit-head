// Game state types for Shithead gameplay
import type { Card } from './card';

export type GamePhase = 'dealing' | 'swapping' | 'transitioning' | 'playing' | 'finished';

/**
 * Per-player card state (server-side authoritative view).
 * Server knows all cards for all players.
 */
export type PlayerGameState = {
  playerId: string;
  nickname: string;
  faceDown: Card[];  // 3 cards, hidden from everyone including the player
  faceUp: Card[];    // 3 cards, visible to all players
  hand: Card[];      // 3 cards initially, visible only to this player
};

/**
 * Complete game state (server-side only).
 * The authoritative source of truth for the game.
 */
export type GameState = {
  phase: GamePhase;
  players: PlayerGameState[];
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  dealerIndex: number;
};

/**
 * What a player sees of an opponent.
 * Opponent's hand and face-down cards are hidden (only counts shown).
 */
export type OpponentView = {
  playerId: string;
  nickname: string;
  faceDownCount: number;  // Count only, not the actual cards
  faceUp: Card[];         // Visible to all
  handCount: number;      // Count only, not the actual cards
};

/**
 * Player-specific view of the game state.
 * This is what gets sent to each individual player.
 * - Player sees their own hand and face-up cards
 * - Player sees opponents' face-up cards and counts only
 * - Player sees face-down count (can't see own face-down cards)
 */
export type PlayerGameView = {
  phase: GamePhase;
  hand: Card[];              // This player's hand cards
  faceUp: Card[];            // This player's face-up cards
  faceDownCount: number;     // This player's face-down count (hidden from player too)
  opponents: OpponentView[];
  drawPileCount: number;     // Only count, not the actual cards
  discardPile: Card[];       // Top card(s) visible to all
  currentPlayerIndex: number;
  dealerIndex: number;
};
