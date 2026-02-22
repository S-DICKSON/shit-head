// Room class - individual room state and logic
import { customAlphabet, nanoid } from 'nanoid';
import type { RoomState, RoomStatus, LobbyPlayer, ErrorCode, GameState, PlayerGameView, Card, OpponentView, RoundTime } from '@shit-head/shared';
import { GameEngine, type BlindPlayResult, type AutoPlayResult } from '../game/GameEngine';

// Custom alphabet excludes confusable characters: 0/O, 1/I/L, 5/S
const ALPHABET = '2346789ABCDEFGHJKMNPQRTUVWXYZ';
const generateRoomCode = customAlphabet(ALPHABET, 6);

const BOT_NAMES = ['Darling Bot', 'Bica Bot', 'Knox Bot', 'Joe Bot'];

type OperationResult<T = void> = T extends void
  ? { success: true } | { success: false; error: string; code: ErrorCode }
  : { success: true; data: T } | { success: false; error: string; code: ErrorCode };

export class Room {
  public readonly code: string;
  private hostId: string;
  private players: Map<string, { id: string; nickname: string; isHost: boolean; avatarHash?: string | null; discordUserId?: string | null }>;
  private spectators: Map<string, { id: string; nickname: string; avatarHash?: string | null; discordUserId?: string | null }>;
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
  private roundTime: RoundTime = 45;
  private readonly TURN_START_DELAY = 1500; // 1.5 seconds per Claude's discretion
  private disconnectedPlayers: Map<string, {
    disconnectTime: number;
    gracePeriodTimer: ReturnType<typeof setTimeout> | null;
  }> = new Map();
  private readonly DISCONNECT_GRACE_PERIOD = 90000; // 90 seconds
  private readonly LOBBY_DISCONNECT_GRACE_PERIOD = 15000; // 15 seconds
  private shitheadPlayerId: string | null = null;
  private botPlayerIds: Set<string> = new Set();
  private botNameIndex: number = 0;
  private autoReturnTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly AUTO_RETURN_DELAY = 5000; // 5 seconds to see game-over screen
  private onSwapTimerTick?: (timeRemaining: number) => void;
  private onPlayerReady?: (playerId: string, readyPlayers: string[]) => void;
  private onSwapPhaseComplete?: (reason: 'timer-expired' | 'all-ready') => void;
  private onPlayPhaseStart?: (currentPlayerIndex: number, firstTurn: boolean) => void;
  private onPlayerEliminated?: (playerId: string, nickname: string, currentPlayerIndex: number) => void;
  private onGameOver?: (shitheadId: string, shitheadNickname: string) => void;
  private onTurnTimerTick?: (timeRemaining: number, currentPlayerIndex: number) => void;
  private onTurnTimeout?: (playerId: string) => void;
  private onPlayerDisconnected?: (playerId: string, nickname: string) => void;
  private onPlayerReconnected?: (playerId: string, nickname: string) => void;
  private onPlayerRemoved?: (playerId: string, nickname: string, reason: 'timeout' | 'host-left') => void;
  private onHostMigrated?: (oldHostId: string, newHostId: string) => void;
  private onSpectatorJoined?: (spectatorId: string, nickname: string) => void;
  private playAgainPlayers: Set<string> = new Set();
  private playAgainTimeout: ReturnType<typeof setTimeout> | null = null;
  private onReturnToLobby?: (removedPlayerIds: string[]) => void;

  constructor(hostId: string, hostNickname: string, code?: string, avatarHash?: string | null, discordUserId?: string | null) {
    this.code = code || generateRoomCode();
    this.hostId = hostId;
    this.status = 'waiting';
    this.players = new Map();
    this.spectators = new Map();

    // Add host as first player
    this.players.set(hostId, {
      id: hostId,
      nickname: hostNickname,
      isHost: true,
      avatarHash: avatarHash ?? null,
      discordUserId: discordUserId ?? null,
    });
  }

  addPlayer(id: string, nickname: string, avatarHash?: string | null, discordUserId?: string | null): OperationResult {
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

    // Check if player already in room (prevent duplicate join during reconnect race)
    if (this.players.has(id)) {
      return {
        success: false,
        error: 'Player already in room',
        code: 'ALREADY_IN_ROOM',
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
      avatarHash: avatarHash ?? null,
      discordUserId: discordUserId ?? null,
    });

    return { success: true };
  }

  addSpectator(id: string, nickname: string, avatarHash?: string | null, discordUserId?: string | null): OperationResult {
    if (this.spectators.has(id) || this.players.has(id)) {
      return { success: false, error: 'Already in room', code: 'ALREADY_IN_ROOM' };
    }
    // Allow up to 4 additional spectators beyond max players
    if (this.players.size + this.spectators.size >= this.maxPlayers + 4) {
      return { success: false, error: 'Room is full', code: 'ROOM_FULL' };
    }
    this.spectators.set(id, { id, nickname: nickname.trim(), avatarHash, discordUserId: discordUserId ?? null });
    this.onSpectatorJoined?.(id, nickname);
    return { success: true };
  }

  removeSpectator(id: string): void {
    this.spectators.delete(id);
  }

  getSpectatorCount(): number {
    return this.spectators.size;
  }

  getSpectatorIds(): string[] {
    return Array.from(this.spectators.keys());
  }

  isSpectator(playerId: string): boolean {
    return this.spectators.has(playerId);
  }

  addBot(botNickname?: string): OperationResult<string> {
    if (this.status !== 'waiting') {
      return { success: false, error: 'Cannot add bot after game starts', code: 'INVALID_ACTION' };
    }
    if (this.players.size >= this.maxPlayers) {
      return { success: false, error: 'Room is full', code: 'ROOM_FULL' };
    }
    const botId = 'bot_' + nanoid(8);
    const nickname = botNickname || BOT_NAMES[this.botNameIndex++ % BOT_NAMES.length];
    this.players.set(botId, {
      id: botId,
      nickname,
      isHost: false,
      avatarHash: null,
      discordUserId: null,
    });
    this.botPlayerIds.add(botId);
    return { success: true, data: botId };
  }

  removeBot(botId: string): OperationResult {
    if (!this.botPlayerIds.has(botId)) {
      return { success: false, error: 'Bot not found', code: 'PLAYER_NOT_FOUND' };
    }
    this.players.delete(botId);
    this.botPlayerIds.delete(botId);
    return { success: true };
  }

  isBot(playerId: string): boolean {
    return this.botPlayerIds.has(playerId);
  }

  getBotIds(): string[] {
    return Array.from(this.botPlayerIds);
  }

  getShitheadPlayerId(): string | null {
    return this.shitheadPlayerId;
  }

  getSpectatorView(): { discardPile: Card[]; opponents: OpponentView[]; drawPileCount: number; currentPlayerIndex: number } | null {
    if (!this.gameState) return null;
    // Build opponent views for ALL players (spectator sees everyone the same way)
    const opponents: OpponentView[] = this.gameState.players.map(p => ({
      playerId: p.playerId,
      nickname: p.nickname,
      faceDownCount: p.faceDown.length,
      faceUp: p.faceUp,
      handCount: p.hand.length,
      isShithead: p.playerId === this.shitheadPlayerId,
      avatarHash: this.players.get(p.playerId)?.avatarHash ?? null,
      discordUserId: this.players.get(p.playerId)?.discordUserId ?? null,
    }));
    return {
      discardPile: this.gameState.discardPile,
      opponents,
      drawPileCount: this.gameState.drawPile.length,
      currentPlayerIndex: this.gameState.currentPlayerIndex,
    };
  }

  removePlayer(id: string): boolean {
    const isHost = id === this.hostId;
    this.players.delete(id);

    if (isHost) {
      const remaining = Array.from(this.players.keys());
      if (remaining.length > 0) {
        // Migrate host instead of destroying
        this.hostId = remaining[0];
        for (const [pid, player] of this.players) {
          player.isHost = pid === this.hostId;
        }
        return false; // Room continues
      }
      return true; // Empty room, destroy
    }

    return false;
  }

  renamePlayer(playerId: string, newNickname: string): OperationResult {
    // Validate nickname
    const trimmedNickname = newNickname.trim();
    if (trimmedNickname.length === 0 || trimmedNickname.length > 20) {
      return {
        success: false,
        error: 'Nickname must be between 1 and 20 characters',
        code: 'INVALID_NICKNAME',
      };
    }

    // Only allow rename in lobby
    if (this.status !== 'waiting') {
      return {
        success: false,
        error: 'Can only rename in the lobby',
        code: 'INVALID_ACTION',
      };
    }

    // Check player exists
    const player = this.players.get(playerId);
    if (!player) {
      return {
        success: false,
        error: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
      };
    }

    // Update nickname
    player.nickname = trimmedNickname;

    return { success: true };
  }

  canStart(): boolean {
    return this.players.size >= this.minPlayers && this.status === 'waiting';
  }

  setRoundTime(time: RoundTime): OperationResult {
    if (this.status !== 'waiting') {
      return {
        success: false,
        error: 'Cannot change round time after game starts',
        code: 'INVALID_ACTION',
      };
    }
    this.roundTime = time;
    return { success: true };
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

  getAugmentedPlayerView(playerId: string): PlayerGameView | null {
    const view = this.getPlayerView(playerId);
    if (!view) return null;
    return {
      ...view,
      opponents: view.opponents.map(o => ({
        ...o,
        isShithead: o.playerId === this.shitheadPlayerId,
        avatarHash: this.players.get(o.playerId)?.avatarHash ?? null,
        discordUserId: this.players.get(o.playerId)?.discordUserId ?? null,
      })),
    };
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
      avatarHash: p.avatarHash ?? null,
      discordUserId: p.discordUserId ?? null,
      isBot: this.botPlayerIds.has(p.id) || undefined,
    }));

    return {
      code: this.code,
      players,
      status: this.status,
      hostId: this.hostId,
      maxPlayers: this.maxPlayers,
      minPlayers: this.minPlayers,
      spectatorCount: this.spectators.size,
      shitheadPlayerId: this.shitheadPlayerId,
      roundTime: this.roundTime,
    };
  }

  setSwapCallbacks(callbacks: {
    onTick: (timeRemaining: number) => void;
    onReady: (playerId: string, readyPlayers: string[]) => void;
    onComplete: (reason: 'timer-expired' | 'all-ready') => void;
    onPlayPhaseStart: (currentPlayerIndex: number, firstTurn: boolean) => void;
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

  setDisconnectCallbacks(callbacks: {
    onDisconnected: (playerId: string, nickname: string) => void;
    onReconnected: (playerId: string, nickname: string) => void;
    onRemoved: (playerId: string, nickname: string, reason: 'timeout' | 'host-left') => void;
  }): void {
    this.onPlayerDisconnected = callbacks.onDisconnected;
    this.onPlayerReconnected = callbacks.onReconnected;
    this.onPlayerRemoved = callbacks.onRemoved;
  }

  setPlayAgainCallbacks(callbacks: {
    onReturnToLobby: (removedPlayerIds: string[]) => void;
  }): void {
    this.onReturnToLobby = callbacks.onReturnToLobby;
  }

  setSpectatorCallbacks(callbacks: {
    onSpectatorJoined: (spectatorId: string, nickname: string) => void;
  }): void {
    this.onSpectatorJoined = callbacks.onSpectatorJoined;
  }

  setHostMigrationCallback(callback: (oldHostId: string, newHostId: string) => void): void {
    this.onHostMigrated = callback;
  }

  hasDisconnectCallbacks(): boolean {
    return this.onPlayerRemoved !== undefined;
  }

  markPlayAgain(playerId: string): OperationResult {
    // Validate game is in 'finished' phase
    if (!this.gameState || this.gameState.phase !== 'finished') {
      return {
        success: false,
        error: 'Can only play again from finished phase',
        code: 'INVALID_ACTION',
      };
    }

    // Validate player exists in room
    if (!this.players.has(playerId)) {
      return {
        success: false,
        error: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
      };
    }

    // Add to play-again set
    this.playAgainPlayers.add(playerId);

    // Start timeout if this is the first play-again
    if (this.playAgainPlayers.size === 1) {
      this.playAgainTimeout = setTimeout(() => {
        this.resetToLobby();
      }, 30000); // 30 seconds
    }

    // Count connected human players (not disconnected, not bots)
    // Bots never call markPlayAgain — they are always removed on resetToLobby
    const connectedPlayers = Array.from(this.players.keys()).filter(
      pid => !this.isPlayerDisconnected(pid) && !this.botPlayerIds.has(pid)
    );

    // If all connected human players have responded, reset immediately
    if (this.playAgainPlayers.size === connectedPlayers.length) {
      this.resetToLobby();
    }

    return { success: true };
  }

  resetToLobby(): void {
    // Clear timeout
    if (this.playAgainTimeout) {
      clearTimeout(this.playAgainTimeout);
      this.playAgainTimeout = null;
    }

    // Cancel any pending auto-return timer
    if (this.autoReturnTimer) {
      clearTimeout(this.autoReturnTimer);
      this.autoReturnTimer = null;
    }

    // Identify players to remove (those who didn't click play-again, excluding bots)
    const removedPlayerIds: string[] = [];
    for (const [playerId] of this.players) {
      if (!this.playAgainPlayers.has(playerId) && !this.botPlayerIds.has(playerId)) {
        removedPlayerIds.push(playerId);
      }
    }

    // Remove players who didn't play-again
    for (const playerId of removedPlayerIds) {
      this.players.delete(playerId);
    }

    // Check if host was removed
    if (removedPlayerIds.includes(this.hostId)) {
      // Pick new host from remaining players
      const remainingPlayerIds = Array.from(this.playAgainPlayers);
      if (remainingPlayerIds.length > 0) {
        this.hostId = remainingPlayerIds[0];
        // Update host flag
        for (const [pid, player] of this.players) {
          player.isHost = pid === this.hostId;
        }
      }
    }

    // Clear game state
    this.gameState = null;
    this.status = 'waiting';
    this.readyPlayers.clear();
    this.playAgainPlayers.clear();

    // Clear timers
    if (this.swapTimer) {
      clearInterval(this.swapTimer);
      this.swapTimer = null;
    }
    this.clearTurnTimer();

    // Notify callback with removed player IDs
    this.onReturnToLobby?.(removedPlayerIds);
  }

  private autoReturnToLobby(): void {
    if (this.autoReturnTimer) {
      clearTimeout(this.autoReturnTimer);
      this.autoReturnTimer = null;
    }

    // Cancel any play-again timeout since we're auto-returning
    if (this.playAgainTimeout) {
      clearTimeout(this.playAgainTimeout);
      this.playAgainTimeout = null;
    }

    // Promote spectators to players (up to maxPlayers limit, bots remain)
    for (const [spectatorId, spectator] of this.spectators) {
      if (this.players.size >= this.maxPlayers) break;
      this.players.set(spectatorId, {
        id: spectator.id,
        nickname: spectator.nickname,
        isHost: false,
        avatarHash: spectator.avatarHash,
        discordUserId: spectator.discordUserId,
      });
    }
    this.spectators.clear();

    // Clear game state
    this.gameState = null;
    this.status = 'waiting';
    this.readyPlayers.clear();
    this.playAgainPlayers.clear();

    // Clear timers
    if (this.swapTimer) {
      clearInterval(this.swapTimer);
      this.swapTimer = null;
    }
    this.clearTurnTimer();

    // Notify all players (empty removedPlayerIds since nobody removed)
    this.onReturnToLobby?.([]);
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
          firstTurn: true,
        };
        // Notify that playing phase has started with first player
        this.onPlayPhaseStart?.(this.gameState.currentPlayerIndex, this.gameState.firstTurn);
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
    this.turnTimeRemaining = this.roundTime;

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
          // Track the shithead
          this.shitheadPlayerId = shitheadId;
          this.onGameOver?.(shitheadId, shithead.nickname);
          // After onGameOver callback fires, start auto-return timer
          this.autoReturnTimer = setTimeout(() => {
            this.autoReturnToLobby();
          }, this.AUTO_RETURN_DELAY);
        }
      }
    }
  }

  playCards(playerId: string, cardIndices: number[]): OperationResult {
    this.clearTurnTimer();
    if (!this.gameState) {
      return { success: false, error: 'No game in progress', code: 'INVALID_ACTION' };
    }

    // Determine play source and route to correct engine method
    const player = this.gameState.players.find(p => p.playerId === playerId);
    if (!player) {
      return { success: false, error: 'Player not found', code: 'PLAYER_NOT_FOUND' };
    }

    const playSource = GameEngine.determinePlaySource(player, this.gameState.drawPile.length === 0);
    const result = playSource === 'face-up'
      ? GameEngine.playFromFaceUp(this.gameState, playerId, cardIndices)
      : GameEngine.playCards(this.gameState, playerId, cardIndices);
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

  handlePlayerDisconnect(playerId: string): void {
    // Check if spectator disconnected
    if (this.spectators.has(playerId)) {
      this.spectators.delete(playerId);
      return;
    }

    const player = this.players.get(playerId);
    if (!player) return;

    // If no active game (lobby or finished), use shorter grace period for reconnection on refresh
    if (!this.gameState || this.gameState.phase === 'finished') {
      const gracePeriodTimer = setTimeout(() => {
        this.removePlayerAfterTimeout(playerId);
      }, this.LOBBY_DISCONNECT_GRACE_PERIOD);

      this.disconnectedPlayers.set(playerId, {
        disconnectTime: Date.now(),
        gracePeriodTimer,
      });

      this.onPlayerDisconnected?.(playerId, player.nickname);

      // If in finished phase and player disconnects before clicking play-again,
      // they implicitly are not playing again. Check if all remaining connected human players responded.
      if (this.gameState && this.gameState.phase === 'finished' && this.playAgainPlayers.size > 0) {
        const connectedPlayers = Array.from(this.players.keys()).filter(
          pid => !this.isPlayerDisconnected(pid) && !this.botPlayerIds.has(pid)
        );
        if (this.playAgainPlayers.size === connectedPlayers.length) {
          this.resetToLobby();
        }
      }

      return;
    }

    // Active game - start grace period
    const gracePeriodTimer = setTimeout(() => {
      this.removePlayerAfterTimeout(playerId);
    }, this.DISCONNECT_GRACE_PERIOD);

    this.disconnectedPlayers.set(playerId, {
      disconnectTime: Date.now(),
      gracePeriodTimer,
    });

    this.onPlayerDisconnected?.(playerId, player.nickname);

    // Turn timer interaction: pause if it's the disconnected player's turn
    if (
      this.gameState.phase === 'playing' &&
      this.gameState.players[this.gameState.currentPlayerIndex]?.playerId === playerId
    ) {
      this.clearTurnTimer();
    }
  }

  handlePlayerReconnect(playerId: string): void {
    const disconnectData = this.disconnectedPlayers.get(playerId);
    if (!disconnectData) return; // Player wasn't disconnected

    // Clear grace period timer
    if (disconnectData.gracePeriodTimer) {
      clearTimeout(disconnectData.gracePeriodTimer);
    }

    // Remove from disconnected players map
    this.disconnectedPlayers.delete(playerId);

    const player = this.players.get(playerId);
    if (player) {
      this.onPlayerReconnected?.(playerId, player.nickname);

      // Turn timer interaction: resume if it's the reconnected player's turn
      if (
        this.gameState?.phase === 'playing' &&
        this.gameState.players[this.gameState.currentPlayerIndex]?.playerId === playerId
      ) {
        this.startTurnTimer(this.gameState.currentPlayerIndex);
      }
    }
  }

  private migrateHost(oldHostId: string, newHostId: string): void {
    this.players.delete(oldHostId);
    this.hostId = newHostId;
    for (const [pid, player] of this.players) {
      player.isHost = pid === newHostId;
    }
    this.disconnectedPlayers.delete(oldHostId);

    // If game in progress, handle game state updates (same as non-host removal)
    if (this.gameState) {
      const gamePlayer = this.gameState.players.find(p => p.playerId === oldHostId);
      if (gamePlayer) {
        gamePlayer.hand = [];
        gamePlayer.faceUp = [];
        gamePlayer.faceDown = [];
      }

      if (this.gameState.phase === 'playing') {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (currentPlayer?.playerId === oldHostId) {
          this.gameState.currentPlayerIndex = GameEngine.nextActivePlayerIndex(
            this.gameState,
            this.gameState.currentPlayerIndex
          );
          this.clearTurnTimer();
          this.startTurnTimer(this.gameState.currentPlayerIndex);
          this.onPlayPhaseStart?.(this.gameState.currentPlayerIndex, this.gameState.firstTurn);
        }
      }

      // Game-end check
      const connectedPlayerCount = this.players.size;
      if (connectedPlayerCount < 2) {
        this.gameState.phase = 'finished';
        this.clearTurnTimer();

        const remainingPlayerIds = Array.from(this.players.keys());
        if (remainingPlayerIds.length === 1) {
          const remainingPlayerId = remainingPlayerIds[0];
          const remainingGamePlayer = this.gameState.players.find(p => p.playerId === remainingPlayerId);
          if (remainingGamePlayer) {
            this.shitheadPlayerId = remainingGamePlayer.playerId;
            this.onGameOver?.(remainingGamePlayer.playerId, remainingGamePlayer.nickname);
            this.autoReturnTimer = setTimeout(() => {
              this.autoReturnToLobby();
            }, this.AUTO_RETURN_DELAY);
          }
        } else if (remainingPlayerIds.length === 0 && this.gameState.players.length > 0) {
          const fallbackPlayer = this.gameState.players[0];
          this.shitheadPlayerId = fallbackPlayer.playerId;
          this.onGameOver?.(fallbackPlayer.playerId, fallbackPlayer.nickname);
          this.autoReturnTimer = setTimeout(() => {
            this.autoReturnToLobby();
          }, this.AUTO_RETURN_DELAY);
        }
      }
    }

    // Notify host migration via dedicated callback
    this.onHostMigrated?.(oldHostId, newHostId);
  }

  private removePlayerAfterTimeout(playerId: string): void {
    // Race condition safety: player may have reconnected just before timeout fires
    if (!this.disconnectedPlayers.has(playerId)) return;

    this.disconnectedPlayers.delete(playerId);

    const player = this.players.get(playerId);
    if (!player) return;

    const isHost = playerId === this.hostId;

    // If host, check if other players remain for migration
    if (isHost) {
      const remainingPlayers = Array.from(this.players.keys())
        .filter(pid => pid !== playerId && !this.disconnectedPlayers.has(pid));

      if (remainingPlayers.length > 0) {
        // Migrate host instead of destroying the room
        this.migrateHost(playerId, remainingPlayers[0]);
        return;
      }

      // No remaining connected players — destroy room
      this.onPlayerRemoved?.(playerId, player.nickname, 'host-left');
      return;
    }

    // Non-host: remove player
    this.removePlayer(playerId);
    this.onPlayerRemoved?.(playerId, player.nickname, 'timeout');

    // If game in progress, mark player as eliminated in game state
    if (this.gameState) {
      const gamePlayer = this.gameState.players.find(p => p.playerId === playerId);
      if (gamePlayer) {
        // Clear all cards to mark as eliminated
        gamePlayer.hand = [];
        gamePlayer.faceUp = [];
        gamePlayer.faceDown = [];
      }

      // Turn advancement - ONLY during playing phase
      if (this.gameState.phase === 'playing') {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];

        if (currentPlayer?.playerId === playerId) {
          // Advance to next active player
          this.gameState.currentPlayerIndex = GameEngine.nextActivePlayerIndex(
            this.gameState,
            this.gameState.currentPlayerIndex
          );

          // Clear and restart turn timer
          this.clearTurnTimer();
          this.startTurnTimer(this.gameState.currentPlayerIndex);

          // Notify play phase start for new current player
          this.onPlayPhaseStart?.(this.gameState.currentPlayerIndex, this.gameState.firstTurn);
        }
      }

      // Game-end check - applies to ALL active phases (swapping, transitioning, playing)
      // Count players still in the room (not disconnected and removed)
      const connectedPlayerCount = this.players.size;

      if (connectedPlayerCount < 2) {
        this.gameState.phase = 'finished';
        this.clearTurnTimer();

        // Find remaining player
        const remainingPlayerIds = Array.from(this.players.keys());
        if (remainingPlayerIds.length === 1) {
          const remainingPlayerId = remainingPlayerIds[0];
          const remainingGamePlayer = this.gameState.players.find(p => p.playerId === remainingPlayerId);
          if (remainingGamePlayer) {
            this.shitheadPlayerId = remainingGamePlayer.playerId;
            this.onGameOver?.(remainingGamePlayer.playerId, remainingGamePlayer.nickname);
            this.autoReturnTimer = setTimeout(() => {
              this.autoReturnToLobby();
            }, this.AUTO_RETURN_DELAY);
          }
        } else if (remainingPlayerIds.length === 0 && this.gameState.players.length > 0) {
          // Edge case: all players disconnected, use first from game state
          const fallbackPlayer = this.gameState.players[0];
          this.shitheadPlayerId = fallbackPlayer.playerId;
          this.onGameOver?.(fallbackPlayer.playerId, fallbackPlayer.nickname);
          this.autoReturnTimer = setTimeout(() => {
            this.autoReturnToLobby();
          }, this.AUTO_RETURN_DELAY);
        }
      }
    }
  }

  isPlayerDisconnected(playerId: string): boolean {
    return this.disconnectedPlayers.has(playerId);
  }

  getDisconnectGraceRemaining(playerId: string): number {
    const disconnectData = this.disconnectedPlayers.get(playerId);
    if (!disconnectData) return 0;

    const gracePeriod = (this.gameState && this.gameState.phase !== 'finished')
      ? this.DISCONNECT_GRACE_PERIOD
      : this.LOBBY_DISCONNECT_GRACE_PERIOD;
    return Math.max(0, gracePeriod - (Date.now() - disconnectData.disconnectTime));
  }
}
