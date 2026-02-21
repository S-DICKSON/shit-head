/**
 * Platform abstraction barrel export.
 *
 * Provides clean import path for platform detection, interfaces, keys, and adapters.
 *
 * Usage:
 * ```typescript
 * import { detectPlatform, WebAuthAdapter, AuthAdapterKey } from '@/platform';
 * ```
 */

// Platform detection
export { detectPlatform, type Platform } from './detection';

// Injection keys
export { PlatformKey, AuthAdapterKey, ConnectionAdapterKey, RoomAdapterKey } from './keys';

// Adapter interfaces
export type { AuthAdapter } from './interfaces/AuthAdapter';

// Adapter implementations
export { WebAuthAdapter } from './adapters/web/WebAuthAdapter';
export { ConnectionAdapter } from './adapters/ConnectionAdapter';
export { RoomAdapter } from './adapters/RoomAdapter';

// Discord auth adapter is loaded via dynamic import() in main.ts only when platform === 'discord'
// Do NOT import it statically here — that would eagerly resolve @discord/embedded-app-sdk
// even in web mode and break standalone deployment.
