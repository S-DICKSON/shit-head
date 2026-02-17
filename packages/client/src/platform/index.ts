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
export type { ConnectionAdapter } from './interfaces/ConnectionAdapter';
export type { RoomAdapter } from './interfaces/RoomAdapter';

// Web adapter implementations
export { WebAuthAdapter } from './adapters/web/WebAuthAdapter';
export { WebConnectionAdapter } from './adapters/web/WebConnectionAdapter';
export { WebRoomAdapter } from './adapters/web/WebRoomAdapter';

// Discord adapters are loaded via dynamic import() in main.ts only when platform === 'discord'
// Do NOT import them statically here — that would eagerly resolve @discord/embedded-app-sdk
// even in web mode and break standalone deployment.
