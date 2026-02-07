// Room class - individual room state and logic
import { customAlphabet } from 'nanoid';
import type { RoomState, RoomStatus, LobbyPlayer, ErrorCode, GameState, PlayerGameView } from '@shit-head/shared';
import { GameEngine } from '../game/GameEngine';

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
  private gameState: GameState | null = null;
  private dealerIndex: number = 0;
  private readyPlayers: Set<string> = new Set();
  private swapTimer: ReturnType<typeof setInterval> | null = null;
  private swapTimeRemaining: number = 30;
  private onSwapTimerTick?: (timeRemaining: number) => void;
  private onPlayerReady?: (playerId: string, readyPlayers: string[]) => void;
  private onSwapPhaseComplete?: (reason: 'timer-expired' | 'all-ready') => void;
  private onPlayPhaseStart?: (currentPlayerIndex: number) => void;

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
    this.dealCards();
    this.startSwapTimer();
  }

  dealCards(): void {
    this.readyPlayers.clear();
    const players = Array.from(this.players.values()).map(p => ({
      id: p.id,
      nickname: p.nickname,
    }));
    this.gameState = GameEngine.createGame(players, this.dealerIndex);
  }

  getPlayerView(playerId: string): PlayerGameView | null {
    if (!this.gameState) return null;
    return GameEngine.getPlayerView(this.gameState, playerId);
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  getPlayerIds(): string[] {
    return Array.from(this.players.keys());
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

  setSwapCallbacks(callbacks: {
    onTick: (timeRemaining: number) => void;
    onReady: (playerId: string, readyPlayers: string[]) => void;
    onComplete: (reason: 'timer-expired' | 'all-ready') => void;
    onPlayPhaseStart: (currentPlayerIndex: number) => void;
  }): void {
    this.onSwapTimerTick = callbacks.onTick;
    this.onPlayerReady = callbacks.onReady;
    this.onSwapPhaseComplete = callbacks.onComplete;
    this.onPlayPhaseStart = callbacks.onPlayPhaseStart;
  }

  swapCards(playerId: string, handIndex: number, faceUpIndex: number): OperationResult {
    // Validate game exists
    if (!this.gameState) {
      return {
        success: false,
        error: 'No game in progress',
        code: 'INVALID_ACTION',
      };
    }

    const result = GameEngine.swapCards(this.gameState, playerId, handIndex, faceUpIndex);

    if (result.success && result.data) {
      this.gameState = result.data;

      // If player was ready, un-ready them after swap
      if (this.readyPlayers.has(playerId)) {
        this.readyPlayers.delete(playerId);
      }

      return { success: true };
    }

    return result;
  }

  markPlayerReady(playerId: string): OperationResult {
    // Validate player exists
    if (!this.players.has(playerId)) {
      return {
        success: false,
        error: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
      };
    }

    // Validate game is in swapping phase
    if (!this.gameState || this.gameState.phase !== 'swapping') {
      return {
        success: false,
        error: 'Can only ready up during swapping phase',
        code: 'INVALID_ACTION',
      };
    }

    // Add to ready set
    this.readyPlayers.add(playerId);

    // Notify via callback
    this.onPlayerReady?.(playerId, Array.from(this.readyPlayers));

    // Check if all players ready
    if (this.readyPlayers.size === this.players.size) {
      this.endSwapPhase('all-ready');
    }

    return { success: true };
  }

  startSwapTimer(): void {
    this.swapTimeRemaining = 30;
    this.readyPlayers.clear();

    this.swapTimer = setInterval(() => {
      this.swapTimeRemaining--;
      this.onSwapTimerTick?.(this.swapTimeRemaining);

      if (this.swapTimeRemaining <= 0) {
        this.endSwapPhase('timer-expired');
      }
    }, 1000);
  }

  endSwapPhase(reason: 'timer-expired' | 'all-ready'): void {
    // Clear timer
    if (this.swapTimer) {
      clearInterval(this.swapTimer);
      this.swapTimer = null;
    }

    // Set to transitioning phase
    if (this.gameState) {
      this.gameState.phase = 'transitioning';
    }

    // Notify via callback
    this.onSwapPhaseComplete?.(reason);

    // After 2.5s, transition to playing
    setTimeout(() => {
      if (this.gameState) {
        // Determine first player before setting phase to playing
        const firstPlayer = GameEngine.determineFirstPlayer(this.gameState);
        this.gameState = {
          ...this.gameState,
          phase: 'playing',
          currentPlayerIndex: firstPlayer,
        };
        // Notify that playing phase has started with first player
        this.onPlayPhaseStart?.(this.gameState.currentPlayerIndex);
      }
    }, 2500);
  }

  getReadyPlayers(): string[] {
    return Array.from(this.readyPlayers);
  }

  playCards(playerId: string, cardIndices: number[]): OperationResult {
    if (!this.gameState) {
      return { success: false, error: 'No game in progress', code: 'INVALID_ACTION' };
    }
    const result = GameEngine.playCards(this.gameState, playerId, cardIndices);
    if (result.success && result.data) {
      this.gameState = result.data;
      return { success: true };
    }
    if (!result.success) {
      // Forward error from GameEngine (code is string, cast to ErrorCode)
      return { success: false, error: result.error, code: result.code as ErrorCode };
    }
    return { success: false, error: 'Unknown error', code: 'INVALID_ACTION' };
  }

  pickupPile(playerId: string): OperationResult {
    if (!this.gameState) {
      return { success: false, error: 'No game in progress', code: 'INVALID_ACTION' };
    }
    const result = GameEngine.pickupPile(this.gameState, playerId);
    if (result.success && result.data) {
      this.gameState = result.data;
      return { success: true };
    }
    if (!result.success) {
      // Forward error from GameEngine (code is string, cast to ErrorCode)
      return { success: false, error: result.error, code: result.code as ErrorCode };
    }
    return { success: false, error: 'Unknown error', code: 'INVALID_ACTION' };
  }
}
