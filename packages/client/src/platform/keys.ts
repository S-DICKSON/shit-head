import type { InjectionKey } from 'vue';
import type { Platform } from './detection';
import type { AuthAdapter } from './interfaces/AuthAdapter';
import type { ConnectionAdapter } from './interfaces/ConnectionAdapter';
import type { RoomAdapter } from './interfaces/RoomAdapter';

/**
 * Type-safe injection keys for platform abstraction.
 *
 * Usage:
 * - provide(PlatformKey, detectedPlatform)
 * - const platform = inject(PlatformKey)
 */

export const PlatformKey: InjectionKey<Platform> = Symbol('Platform');

export const AuthAdapterKey: InjectionKey<AuthAdapter> = Symbol('AuthAdapter');

export const ConnectionAdapterKey: InjectionKey<ConnectionAdapter> = Symbol('ConnectionAdapter');

export const RoomAdapterKey: InjectionKey<RoomAdapter> = Symbol('RoomAdapter');
