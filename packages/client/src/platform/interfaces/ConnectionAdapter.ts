import type { Ref } from 'vue';
import type { ClientMessage, ServerMessage } from '@shit-head/shared';

/**
 * Platform-agnostic connection interface.
 *
 * Implementations:
 * - Web: WebSocket connection via useGameSocket
 * - Discord: WebSocket connection through Discord's proxy
 */
export interface ConnectionAdapter {
  /**
   * Reactive connection status.
   *
   * Values: 'OPEN', 'CONNECTING', 'CLOSED', etc.
   */
  readonly status: Ref<string>;

  /**
   * Send a typed message to the server.
   *
   * @param message - Typed client message
   */
  send(message: ClientMessage): void;

  /**
   * Register a handler for incoming server messages.
   *
   * @param handler - Callback invoked for each message
   * @returns Unsubscribe function to remove the handler
   */
  onMessage(handler: (msg: ServerMessage) => void): () => void;

  /**
   * Close the connection.
   */
  close(): void;

  /**
   * Open or reconnect the connection.
   */
  open(): void;
}
