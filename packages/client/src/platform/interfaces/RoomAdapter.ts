/**
 * Platform-agnostic room operations interface.
 *
 * Thin wrapper around WebSocket room messages.
 *
 * Implementations:
 * - Web: direct WebSocket send() calls
 * - Discord: WebSocket send() with Discord context
 */
export interface RoomAdapter {
  /**
   * Create a new game room.
   *
   * @param nickname - Player's display name
   */
  createRoom(nickname: string): void;

  /**
   * Join an existing room by code.
   *
   * @param code - 4-character room code
   * @param nickname - Player's display name
   */
  joinRoom(code: string, nickname: string): void;

  /**
   * Leave the current room.
   */
  leaveRoom(): void;

  /**
   * Join or create a room using an instance ID (Discord only).
   * Creates the room if it doesn't exist, joins if it does.
   *
   * @param instanceId - Discord Activity instance ID
   * @param nickname - Player's display name
   * @param avatarHash - Optional Discord avatar hash
   */
  joinOrCreate?(instanceId: string, nickname: string, avatarHash?: string | null): void;
}
