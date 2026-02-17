import type { Ref } from 'vue';
import type { ClientMessage, ServerMessage } from '@shit-head/shared';
import type { ConnectionAdapter } from '../../interfaces/ConnectionAdapter';
import { useGameSocket } from '../../../composables/useGameSocket';

/**
 * Discord-specific connection adapter wrapping useGameSocket.
 *
 * Currently identical to WebConnectionAdapter because Discord's proxy routing
 * is handled at the URL resolution level — the WebSocket URL for *.discordsays.com
 * domains is automatically routed through Discord's proxy (configured in Phase 16).
 * No Discord-specific connection logic is required at this layer.
 *
 * Delegates all connection operations to the existing WebSocket singleton.
 * This is a thin wrapper for platform abstraction — all logic remains in useGameSocket.
 */
export class DiscordConnectionAdapter implements ConnectionAdapter {
  private socket: ReturnType<typeof useGameSocket>;

  constructor() {
    this.socket = useGameSocket();
  }

  /**
   * Reactive connection status from @vueuse/core useWebSocket.
   *
   * Values: 'OPEN', 'CONNECTING', 'CLOSED', 'CLOSING'
   */
  get status(): Ref<string> {
    return this.socket.status;
  }

  /**
   * Send a typed message to the server.
   *
   * Delegates to useGameSocket.send()
   *
   * @param message - Typed client message
   */
  send(message: ClientMessage): void {
    this.socket.send(message);
  }

  /**
   * Register a handler for incoming server messages.
   *
   * Delegates to useGameSocket.onMessage()
   *
   * @param handler - Callback invoked for each message
   * @returns Unsubscribe function to remove the handler
   */
  onMessage(handler: (msg: ServerMessage) => void): () => void {
    return this.socket.onMessage(handler);
  }

  /**
   * Close the WebSocket connection.
   *
   * Delegates to useGameSocket.close()
   */
  close(): void {
    this.socket.close();
  }

  /**
   * Open or reconnect the WebSocket connection.
   *
   * Delegates to useGameSocket.open()
   */
  open(): void {
    this.socket.open();
  }
}
