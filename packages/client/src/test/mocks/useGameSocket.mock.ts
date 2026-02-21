/**
 * Shared mock factory for useGameSocket composable.
 *
 * This file is the canonical reference for the mock shape. Individual test files
 * use this as a guide to inline their vi.mock factories (since vi.mock factories
 * do not support top-level await).
 *
 * Usage in test files (inline pattern):
 *
 * ```typescript
 * vi.mock('../../composables/useGameSocket', () => {
 *   let _cache: any = null;
 *   return {
 *     useGameSocket: () => {
 *       if (!_cache) _cache = {
 *         status: ref('OPEN'),
 *         connectionState: ref('connected'),
 *         // ... all fields from createMockSocket
 *       };
 *       return _cache;
 *     },
 *   };
 * });
 * ```
 *
 * The resetMockSocket helper can be imported into beforeEach to reset state.
 */
import { ref } from 'vue';
import { vi } from 'vitest';

/**
 * Creates a mock object matching the exact return type of useGameSocket().
 * All reactive state uses ref() with correct initial values.
 * All methods use vi.fn().
 */
export function createMockSocket() {
  return {
    // Connection state
    status: ref('OPEN'),
    connectionState: ref<'connected' | 'connecting' | 'reconnecting' | 'failed'>('connected'),
    connectionError: ref<null>(null),
    // Reconnection state
    reconnecting: ref(false),
    reconnectTarget: ref<null>(null),
    // Identity
    playerId: ref<string | null>(null),
    // Room
    roomState: ref<null>(null),
    // Message state
    lastMessage: ref<null>(null),
    error: ref<null>(null),
    // Game view
    gameView: ref<null>(null),
    // Swap phase state
    swapTimeRemaining: ref(30),
    readyPlayers: ref<string[]>([]),
    swapPhaseComplete: ref(false),
    swapPhaseReason: ref<null>(null),
    // Turn timer state
    turnTimeRemaining: ref(45),
    turnTimerPlayerIndex: ref(-1),
    // Burn animation state
    burnTriggered: ref(false),
    // Game-over state
    shitheadNickname: ref<null>(null),
    // Notification state
    notifications: ref<never[]>([]),
    // Methods
    send: vi.fn(),
    onMessage: vi.fn(() => vi.fn()), // returns an unregister function
    close: vi.fn(),
    open: vi.fn(),
    retryConnection: vi.fn(),
    addNotification: vi.fn(),
    dismissNotification: vi.fn(),
  };
}

/**
 * Resets all reactive refs to their initial values and clears all mock call history.
 * Call this in beforeEach to prevent state leaking between tests.
 *
 * @param socket - The mock socket object returned by createMockSocket()
 */
export function resetMockSocket(socket: ReturnType<typeof createMockSocket>) {
  socket.status.value = 'OPEN';
  socket.connectionState.value = 'connected';
  socket.connectionError.value = null;
  socket.reconnecting.value = false;
  socket.reconnectTarget.value = null;
  socket.playerId.value = null;
  socket.roomState.value = null;
  socket.lastMessage.value = null;
  socket.error.value = null;
  socket.gameView.value = null;
  socket.swapTimeRemaining.value = 30;
  socket.readyPlayers.value = [];
  socket.swapPhaseComplete.value = false;
  socket.swapPhaseReason.value = null;
  socket.turnTimeRemaining.value = 45;
  socket.turnTimerPlayerIndex.value = -1;
  socket.burnTriggered.value = false;
  socket.shitheadNickname.value = null;
  socket.notifications.value = [];
  vi.clearAllMocks();
}

/**
 * Real implementation of resolveWebSocketUrl, copied from useGameSocket.ts.
 * Exported so test files that mock useGameSocket can still expose the real implementation
 * for proxy URL tests.
 */
export function resolveWebSocketUrl(
  hostname: string,
  protocol: string,
  host: string,
  serverUrl?: string,
): string {
  if (serverUrl) {
    return `${serverUrl}/game-ws`;
  }
  if (hostname.endsWith('.discordsays.com')) {
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${host}/.proxy/ws`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `ws://${hostname}:3000/game-ws`;
  }
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}/game-ws`;
}
