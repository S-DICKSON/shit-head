import type { Ref } from 'vue';
import type { ClientMessage, ServerMessage } from '@shit-head/shared';
import type { ConnectionAdapter as IConnectionAdapter } from '../interfaces/ConnectionAdapter';
import { useGameSocket } from '../../composables/useGameSocket';

/**
 * Shared connection adapter wrapping useGameSocket.
 *
 * Delegates all connection operations to the existing WebSocket singleton.
 * Platform-specific URL routing (e.g. Discord proxy) is handled at the
 * URL resolution level, so no per-platform connection logic is needed.
 */
export class ConnectionAdapter implements IConnectionAdapter {
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
