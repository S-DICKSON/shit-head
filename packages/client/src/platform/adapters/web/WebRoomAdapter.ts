import type { RoomAdapter } from '../../interfaces/RoomAdapter';
import { useGameSocket } from '../../../composables/useGameSocket';

/**
 * Web-specific room adapter wrapping useGameSocket.
 *
 * Thin wrapper that maps room operations to typed WebSocket messages.
 * All room logic handled by the server.
 */
export class WebRoomAdapter implements RoomAdapter {
  private socket: ReturnType<typeof useGameSocket>;

  constructor() {
    this.socket = useGameSocket();
  }

  /**
   * Create a new game room.
   *
   * Sends 'create-room' message to server.
   *
   * @param nickname - Player's display name
   */
  createRoom(nickname: string): void {
    this.socket.send({ type: 'create-room', nickname });
  }

  /**
   * Join an existing room by code.
   *
   * Sends 'join-room' message to server.
   *
   * @param code - 4-character room code
   * @param nickname - Player's display name
   */
  joinRoom(code: string, nickname: string): void {
    this.socket.send({ type: 'join-room', code, nickname });
  }

  /**
   * Leave the current room.
   *
   * Sends 'leave-room' message to server.
   */
  leaveRoom(): void {
    this.socket.send({ type: 'leave-room' });
  }
}
