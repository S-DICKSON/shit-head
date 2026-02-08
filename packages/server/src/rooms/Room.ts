// Room class - individual room state and logic
import { customAlphabet } from 'nanoid';
import type { RoomState, RoomStatus, LobbyPlayer, ErrorCode, GameState, PlayerGameView } from '@shit-head/shared';
import { GameEngine, type BlindPlayResult, type AutoPlayResult } from '../game/GameEngine';

// Custom alphabet excludes confusable characters: 0/O, 1/I/L, 5/S
const ALPHABET = '2346789ABCDEFGHJKMNPQRTUVWXYZ';
const generateRoomCode = customAlphabet(ALPHABET, 6);

type OperationResult<T = void> = T extends void
  ? { success: true } | { success: false; error: string; code: ErrorCode }
  : { success: true; data: T } | { success: false; error: string; code: ErrorCode };

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
  private turnTimer: ReturnType<typeof setInterval> | null = null;
  private turnTimerDelay: ReturnType<typeof setTimeout> | null = null;
  private turnTimeRemaining: number = 45;
  private readonly TURN_DURATION = 45;
  private readonly TURN_START_DELAY = 1500; // 1.5 seconds per Claude's discretion
  private onSwapTimerTick?: (timeRemaining: number) => void;
  private onPlayerReady?: (playerId: string, readyPlayers: string[]) => void;
  private onSwapPhaseComplete?: (reason: 'timer-expired' | 'all-ready') => void;
  private onPlayPhaseStart?: (currentPlayerIndex: number) => void;
  private onPlayerEliminated?: (playerId: string, nickname: string, currentPlayerIndex: number) => void;
  private onGameOver?: (shitheadId: string, shitheadNickname: string) => void;
  private onTurnTimerTick?: (timeRemaining: number, currentPlayerIndex: number) => void;
  private onTurnTimeout?: (playerId: string) => void;

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

  setGameCallbacks(callbacks: {
    onPlayerEliminated: (playerId: string, nickname: string, currentPlayerIndex: number) => void;
    onGameOver: (shitheadId: string, shitheadNickname: string) => void;
  }): void {
    this.onPlayerEliminated = callbacks.onPlayerEliminated;
    this.onGameOver = callbacks.onGameOver;
  }

  setTurnTimerCallbacks(callbacks: {
    onTick: (timeRemaining: number, currentPlayerIndex: number) => void;
    onTimeout: (playerId: string) => void;
  }): void {
    this.onTurnTimerTick = callbacks.onTick;
    this.onTurnTimeout = callbacks.onTimeout;
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
        // Start turn timer for first player
        this.startTurnTimer(this.gameState.currentPlayerIndex);
      }
    }, 2500);
  }

  getReadyPlayers(): string[] {
    return Array.from(this.readyPlayers);
  }

  startTurnTimer(playerIndex: number): void {
    this.clearTurnTimer();
    this.turnTimeRemaining = this.TURN_DURATION;

    this.turnTimerDelay = setTimeout(() => {
      // Fire initial tick with full time
      this.onTurnTimerTick?.(this.turnTimeRemaining, playerIndex);

      // Start interval
      this.turnTimer = setInterval(() => {
        this.turnTimeRemaining--;
        this.onTurnTimerTick?.(this.turnTimeRemaining, playerIndex);

        if (this.turnTimeRemaining <= 0) {
          this.handleTurnTimeout();
        }
      }, 1000);
    }, this.TURN_START_DELAY);
  }

  clearTurnTimer(): void {
    if (this.turnTimerDelay) {
      clearTimeout(this.turnTimerDelay);
      this.turnTimerDelay = null;
    }
    if (this.turnTimer) {
      clearInterval(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private handleTurnTimeout(): void {
    this.clearTurnTimer();

    if (!this.gameState || this.gameState.phase !== 'playing') {
      return;
    }

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!currentPlayer) {
      return;
    }

    this.onTurnTimeout?.(currentPlayer.playerId);
  }

  private checkPostPlayState(playerId: string): void {
    if (!this.gameState) return;

    const player = this.gameState.players.find(p => p.playerId === playerId);
    if (!player) return;

    // Check if player just got eliminated
    if (GameEngine.checkPlayerElimination(player)) {
      this.onPlayerEliminated?.(playerId, player.nickname, this.gameState.currentPlayerIndex);

      // Check if game is over
      const shitheadId = GameEngine.findShithead(this.gameState);
      if (shitheadId) {
        this.gameState.phase = 'finished';
        const shithead = this.gameState.players.find(p => p.playerId === shitheadId);
        if (shithead) {
          // Set dealer index for next hand
          const shitheadIndex = this.gameState.players.findIndex(p => p.playerId === shitheadId);
          this.dealerIndex = shitheadIndex;
          this.onGameOver?.(shitheadId, shithead.nickname);
        }
      }
    }
  }

  playCards(playerId: string, cardIndices: number[]): OperationResult {
    this.clearTurnTimer();
    if (!this.gameState) {
      return { success: false, error: 'No game in progress', code: 'INVALID_ACTION' };
    }
    const result = GameEngine.playCards(this.gameState, playerId, cardIndices);
    if (result.success && result.data) {
      this.gameState = result.data;
      this.checkPostPlayState(playerId);
      if (this.gameState.phase === 'playing') {
        this.startTurnTimer(this.gameState.currentPlayerIndex);
      }
      return { success: true };
    }
    if (!result.success) {
      // Forward error from GameEngine (code is string, cast to ErrorCode)
      return { success: false, error: result.error, code: result.code as ErrorCode };
    }
    return { success: false, error: 'Unknown error', code: 'INVALID_ACTION' };
  }

  pickupPile(playerId: string): OperationResult {
    this.clearTurnTimer();
    if (!this.gameState) {
      return { success: false, error: 'No game in progress', code: 'INVALID_ACTION' };
    }
    const result = GameEngine.pickupPile(this.gameState, playerId);
    if (result.success && result.data) {
      this.gameState = result.data;
      if (this.gameState.phase === 'playing') {
        this.startTurnTimer(this.gameState.currentPlayerIndex);
      }
      return { success: true };
    }
    if (!result.success) {
      // Forward error from GameEngine (code is string, cast to ErrorCode)
      return { success: false, error: result.error, code: result.code as ErrorCode };
    }
    return { success: false, error: 'Unknown error', code: 'INVALID_ACTION' };
  }

  playFromFaceUp(playerId: string, cardIndices: number[]): OperationResult {
    this.clearTurnTimer();
    if (!this.gameState) {
      return { success: false, error: 'No game in progress', code: 'INVALID_ACTION' };
    }

    const result = GameEngine.playFromFaceUp(this.gameState, playerId, cardIndices);

    if (result.success && result.data) {
      this.gameState = result.data;
      this.checkPostPlayState(playerId);
      if (this.gameState.phase === 'playing') {
        this.startTurnTimer(this.gameState.currentPlayerIndex);
      }
      return { success: true };
    }

    return result;
  }

  playFaceDownBlind(playerId: string, faceDownIndex: number): OperationResult<BlindPlayResult> {
    this.clearTurnTimer();
    if (!this.gameState) {
      return { success: false, error: 'No game in progress', code: 'INVALID_ACTION' };
    }

    const result = GameEngine.playFaceDownBlind(this.gameState, playerId, faceDownIndex);

    if (result.success && result.data) {
      this.gameState = result.data.state;
      this.checkPostPlayState(playerId);
      if (this.gameState.phase === 'playing') {
        this.startTurnTimer(this.gameState.currentPlayerIndex);
      }
      return { success: true, data: result.data };
    }

    return result;
  }

  autoPlayOnTimeout(playerId: string): OperationResult<AutoPlayResult> {
    if (!this.gameState) {
      return { success: false, error: 'No game in progress', code: 'INVALID_ACTION' };
    }

    const result = GameEngine.autoPlayOnTimeout(this.gameState, playerId);

    if (result.success && result.data) {
      this.gameState = result.data.state;
      this.checkPostPlayState(playerId);
      if (this.gameState.phase === 'playing') {
        this.startTurnTimer(this.gameState.currentPlayerIndex);
      }
      return { success: true, data: result.data };
    }

    return result;
  }
}
