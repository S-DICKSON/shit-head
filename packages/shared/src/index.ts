// Shared types and constants — each phase adds what it needs

export type AppConfig = {
  version: string;
  environment: 'development' | 'production';
};

export const APP_VERSION = '0.0.1';

// Phase 2: WebSocket message protocol and room management
export * from './schemas/messages';
export * from './types/messages';
export * from './types/room';

// Phase 3: Deck, dealing, and game state types
export * from './types/card';
export * from './types/game';

// Card rules — rank comparison, play validation, burn detection, hand sorting
export * from './game/cardRules';
