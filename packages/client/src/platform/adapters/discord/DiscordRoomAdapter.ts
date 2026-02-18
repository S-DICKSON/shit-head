import type { RoomAdapter } from '../../interfaces/RoomAdapter';
import { useGameSocket } from '../../../composables/useGameSocket';

/**
 * Discord-specific room adapter wrapping useGameSocket.
 *
 * Thin wrapper that maps room operations to typed WebSocket messages.
 * Delegates to the same WebSocket singleton as WebRoomAdapter.
 *
 * All room logic is handled by the server — this adapter just sends
 * the correct message types.
 *
 * Future Phase 19 enhancement: Add Discord instance-based auto-join logic here.
 * When the Activity launches, participants in the Discord voice channel could
 * be auto-joined to the same game room using ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE
 * events from the Discord SDK.
 */
export class DiscordRoomAdapter implements RoomAdapter {
  private socket: ReturnType<typeof useGameSocket>;

  constructor() {
    this.socket = useGameSocket();
  }

  /**
   * Create a new game room.
   *
   * Sends 'create-room' message to server.
   *
   * @param nickname - Player's display name (auto-populated from Discord identity in Phase 19)
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
   * @param nickname - Player's display name (auto-populated from Discord identity in Phase 19)
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

  /**
   * Join or create a room using Discord instanceId.
   * Server creates room if it doesn't exist, joins if it does.
   * If game in progress, server adds as spectator.
   *
   * @param instanceId - Discord Activity instance ID (room key)
   * @param nickname - Player's Discord display name
   * @param avatarHash - Player's Discord avatar hash
   */
  joinOrCreate(instanceId: string, nickname: string, avatarHash?: string | null): void {
    this.socket.send({
      type: 'join-or-create',
      instanceId,
      nickname,
      avatarHash: avatarHash ?? null,
    });
  }
}
