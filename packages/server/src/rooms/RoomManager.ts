// RoomManager class - central room lifecycle management
import { Room } from './Room';
import type { RoomState, ErrorCode } from '@shit-head/shared';

type OperationResult<T = void> = T extends void
  ? { success: true } | { success: false; error: string; code: ErrorCode }
  : { success: true; data: T } | { success: false; error: string; code: ErrorCode };

export class RoomManager {
  private rooms: Map<string, Room>; // code -> Room
  private playerRoomIndex: Map<string, string>; // playerId -> roomCode

  constructor() {
    this.rooms = new Map();
    this.playerRoomIndex = new Map();
  }

  createRoom(hostId: string, nickname: string): OperationResult<RoomState> {
    const room = new Room(hostId, nickname);
    this.rooms.set(room.code, room);
    this.playerRoomIndex.set(hostId, room.code);

    return {
      success: true,
      data: room.getState(),
    };
  }

  joinRoom(code: string, playerId: string, nickname: string): OperationResult<RoomState> {
    const room = this.rooms.get(code);

    if (!room) {
      return {
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND',
      };
    }

    const result = room.addPlayer(playerId, nickname);

    if (!result.success) {
      return result as OperationResult<RoomState>;
    }

    this.playerRoomIndex.set(playerId, code);

    return {
      success: true,
      data: room.getState(),
    };
  }

  leaveRoom(playerId: string): OperationResult {
    const roomCode = this.playerRoomIndex.get(playerId);

    if (!roomCode) {
      return {
        success: false,
        error: 'Player not in any room',
        code: 'ROOM_NOT_FOUND',
      };
    }

    const room = this.rooms.get(roomCode);

    if (!room) {
      return {
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND',
      };
    }

    const shouldDestroy = room.removePlayer(playerId);
    this.playerRoomIndex.delete(playerId);

    // If host left, destroy the room and remove all players from index
    if (shouldDestroy) {
      const state = room.getState();
      state.players.forEach(player => {
        this.playerRoomIndex.delete(player.id);
      });
      this.rooms.delete(roomCode);
    }

    return { success: true };
  }

  startGame(playerId: string): OperationResult {
    const roomCode = this.playerRoomIndex.get(playerId);

    if (!roomCode) {
      return {
        success: false,
        error: 'Player not in any room',
        code: 'ROOM_NOT_FOUND',
      };
    }

    const room = this.rooms.get(roomCode);

    if (!room) {
      return {
        success: false,
        error: 'Room not found',
        code: 'ROOM_NOT_FOUND',
      };
    }

    const state = room.getState();

    // Check if player is the host
    if (state.hostId !== playerId) {
      return {
        success: false,
        error: 'Only the host can start the game',
        code: 'NOT_HOST',
      };
    }

    // Check if room has enough players
    if (!room.canStart()) {
      return {
        success: false,
        error: 'Not enough players to start the game',
        code: 'NOT_ENOUGH_PLAYERS',
      };
    }

    room.startCountdown();

    return { success: true };
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getRoomByPlayerId(playerId: string): Room | undefined {
    const roomCode = this.playerRoomIndex.get(playerId);
    if (!roomCode) {
      return undefined;
    }
    return this.rooms.get(roomCode);
  }
}
