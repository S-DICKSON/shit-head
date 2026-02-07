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
