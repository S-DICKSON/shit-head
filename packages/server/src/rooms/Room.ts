// Room class - individual room state and logic
import { customAlphabet } from 'nanoid';
import type { RoomState, RoomStatus, LobbyPlayer, ErrorCode } from '@shit-head/shared';

// Custom alphabet excludes confusable characters: 0/O, 1/I/L, 5/S
const ALPHABET = '2346789ABCDEFGHJKMNPQRTUVWXYZ';
const generateRoomCode = customAlphabet(ALPHABET, 6);

type OperationResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; code: ErrorCode };

export class Room {
  public readonly code: string;
  private hostId: string;
  private players: Map<string, { id: string; nickname: string; isHost: boolean }>;
  private status: RoomStatus;
  private readonly maxPlayers = 4;
  private readonly minPlayers = 2;

  constructor(hostId: string, hostNickname: string) {
    this.code = generateRoomCode();
    this.hostId = hostId;
    this.status = 'waiting';
    this.players = new Map();

    // Add host as first player
    this.players.set(hostId, {
      id: hostId,
      nickname: hostNickname,
      isHost: true,
    });
  }

  addPlayer(id: string, nickname: string): OperationResult {
    // Validate nickname
    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length === 0 || trimmedNickname.length > 20) {
      return {
        success: false,
        error: 'Nickname must be between 1 and 20 characters',
        code: 'INVALID_NICKNAME',
      };
    }

    // Check if game already started
    if (this.status !== 'waiting') {
      return {
        success: false,
        error: 'Game has already started',
        code: 'GAME_ALREADY_STARTED',
      };
    }

    // Check if room is full
    if (this.players.size >= this.maxPlayers) {
      return {
        success: false,
        error: 'Room is full',
        code: 'ROOM_FULL',
      };
    }

    // Add player
    this.players.set(id, {
      id,
      nickname: trimmedNickname,
      isHost: false,
    });

    return { success: true };
  }

  removePlayer(id: string): boolean {
    this.players.delete(id);

    // If host left, room should be destroyed
    if (id === this.hostId) {
      return true;
    }

    return false;
  }

  canStart(): boolean {
    return this.players.size >= this.minPlayers && this.status === 'waiting';
  }

  startCountdown(): void {
    this.status = 'countdown';
  }

  startGame(): void {
    this.status = 'playing';
  }

  getState(): RoomState {
    const players: LobbyPlayer[] = Array.from(this.players.values()).map(p => ({
      id: p.id,
      nickname: p.nickname,
      isHost: p.isHost,
    }));

    return {
      code: this.code,
      players,
      status: this.status,
      hostId: this.hostId,
      maxPlayers: this.maxPlayers,
      minPlayers: this.minPlayers,
    };
  }
}
