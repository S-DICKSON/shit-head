import { describe, expect, test, beforeEach } from 'vitest';
import { RoomManager } from '../rooms/RoomManager';
import { Room } from '../rooms/Room';

describe('Room', () => {
  test('creates room with 6-character code from valid alphabet', () => {
    const room = new Room('host-1', 'Alice');
    expect(room.code).toHaveLength(6);
    expect(room.code).toMatch(/^[2346789ABCDEFGHJKMNPQRTUVWXYZ]{6}$/);
  });

  test('sets creator as host', () => {
    const room = new Room('host-1', 'Alice');
    const state = room.getState();
    expect(state.hostId).toBe('host-1');
    expect(state.players).toHaveLength(1);
    expect(state.players[0]).toEqual({
      id: 'host-1',
      nickname: 'Alice',
      isHost: true,
      avatarHash: null,
      discordUserId: null,
    });
  });

  test('adds player to room', () => {
    const room = new Room('host-1', 'Alice');
    const result = room.addPlayer('player-2', 'Bob');
    expect(result.success).toBe(true);
    const state = room.getState();
    expect(state.players).toHaveLength(2);
    expect(state.players[1]).toEqual({
      id: 'player-2',
      nickname: 'Bob',
      isHost: false,
      avatarHash: null,
      discordUserId: null,
    });
  });

  test('rejects adding player when room is full (4 players)', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.addPlayer('player-3', 'Charlie');
    room.addPlayer('player-4', 'Dave');

    const result = room.addPlayer('player-5', 'Eve');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Room is full');
      expect(result.code).toBe('ROOM_FULL');
    }
  });

  test('rejects adding player when game already started', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.startCountdown();

    const result = room.addPlayer('player-3', 'Charlie');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Game has already started');
      expect(result.code).toBe('GAME_ALREADY_STARTED');
    }
  });

  test('rejects empty nickname', () => {
    const room = new Room('host-1', 'Alice');
    const result = room.addPlayer('player-2', '');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NICKNAME');
    }
  });

  test('rejects nickname longer than 20 characters', () => {
    const room = new Room('host-1', 'Alice');
    const result = room.addPlayer('player-2', 'ThisNicknameIsWayTooLongToBeValid');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_NICKNAME');
    }
  });

  test('removes player from room', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');

    const shouldDestroy = room.removePlayer('player-2');
    expect(shouldDestroy).toBe(false);
    const state = room.getState();
    expect(state.players).toHaveLength(1);
  });

  test('migrates host when host leaves (room continues)', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');

    // With host migration, removePlayer returns false (room continues) and player-2 becomes host
    const shouldDestroy = room.removePlayer('host-1');
    expect(shouldDestroy).toBe(false);
    const state = room.getState();
    expect(state.players).toHaveLength(1);
    expect(state.hostId).toBe('player-2');
    expect(state.players[0].isHost).toBe(true);
  });

  test('canStart returns false with fewer than 2 players', () => {
    const room = new Room('host-1', 'Alice');
    expect(room.canStart()).toBe(false);
  });

  test('canStart returns true with 2+ players and waiting status', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    expect(room.canStart()).toBe(true);
  });

  test('canStart returns false when game is starting or started', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.startCountdown();
    expect(room.canStart()).toBe(false);
  });

  test('getState returns correct RoomState shape', () => {
    const room = new Room('host-1', 'Alice');
    const state = room.getState();

    expect(state).toEqual({
      code: expect.any(String),
      players: [{
        id: 'host-1',
        nickname: 'Alice',
        isHost: true,
        avatarHash: null,
        discordUserId: null,
      }],
      status: 'waiting',
      hostId: 'host-1',
      maxPlayers: 4,
      minPlayers: 2,
      spectatorCount: 0,
      shitheadPlayerId: null,
      roundTime: 45,
    });
  });

  test('startCountdown changes status to countdown', () => {
    const room = new Room('host-1', 'Alice');
    room.startCountdown();
    expect(room.getState().status).toBe('countdown');
  });

  test('startGame changes status to playing', () => {
    const room = new Room('host-1', 'Alice');
    room.startGame();
    expect(room.getState().status).toBe('playing');
  });

  test('dealCards() creates game state with correct player count', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.addPlayer('player-3', 'Charlie');

    room.dealCards();

    const gameState = room.getGameState();
    expect(gameState).not.toBeNull();
    expect(gameState?.players).toHaveLength(3);
    expect(gameState?.players[0].playerId).toBe('host-1');
    expect(gameState?.players[1].playerId).toBe('player-2');
    expect(gameState?.players[2].playerId).toBe('player-3');
  });

  test('getPlayerView() returns view for valid player', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.dealCards();

    const view = room.getPlayerView('host-1');
    expect(view).not.toBeNull();
    expect(view?.hand).toHaveLength(3);
    expect(view?.faceUp).toHaveLength(3);
    expect(view?.faceDownCount).toBe(3);
    expect(view?.opponents).toHaveLength(1);
    expect(view?.opponents[0].playerId).toBe('player-2');
  });

  test('getPlayerView() returns null before dealing', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');

    const view = room.getPlayerView('host-1');
    expect(view).toBeNull();
  });

  test('startGame() triggers dealing', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');

    room.startGame();

    const gameState = room.getGameState();
    expect(gameState).not.toBeNull();
    expect(gameState?.players).toHaveLength(2);
  });

  test('getPlayerIds() returns all player ids', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.addPlayer('player-3', 'Charlie');

    const playerIds = room.getPlayerIds();
    expect(playerIds).toHaveLength(3);
    expect(playerIds).toContain('host-1');
    expect(playerIds).toContain('player-2');
    expect(playerIds).toContain('player-3');
  });

  test('swapCards() delegates to GameEngine and updates gameState', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.startGame();

    const gameStateBefore = room.getGameState();
    expect(gameStateBefore).not.toBeNull();

    const result = room.swapCards('host-1', 0, 0);
    expect(result.success).toBe(true);

    const gameStateAfter = room.getGameState();
    expect(gameStateAfter).not.toBeNull();
    expect(gameStateAfter).not.toBe(gameStateBefore); // New state object
  });

  test('swapCards() returns error when no game in progress', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');

    const result = room.swapCards('host-1', 0, 0);
    expect(result.success).toBe(false);
  });

  test('markPlayerReady() adds player to ready set', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.startGame();

    const result = room.markPlayerReady('host-1');
    expect(result.success).toBe(true);

    const readyPlayers = room.getReadyPlayers();
    expect(readyPlayers).toContain('host-1');
  });

  test('markPlayerReady() triggers onComplete when all players ready', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');

    let completeCalled = false;

    room.setSwapCallbacks({
      onTick: () => {},
      onReady: () => {},
      onComplete: (reason) => {
        completeCalled = true;
        expect(reason).toBe('all-ready');
      },
      onPlayPhaseStart: () => {},
    });

    room.startGame();

    room.markPlayerReady('host-1');
    room.markPlayerReady('player-2');

    expect(completeCalled).toBe(true);
  });

  test('swapping after ready-up removes player from ready set', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.startGame();

    room.markPlayerReady('host-1');
    expect(room.getReadyPlayers()).toContain('host-1');

    room.swapCards('host-1', 0, 0);
    expect(room.getReadyPlayers()).not.toContain('host-1');
  });

  test('getReadyPlayers() returns current ready player list', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');
    room.startGame();

    expect(room.getReadyPlayers()).toHaveLength(0);

    room.markPlayerReady('host-1');
    expect(room.getReadyPlayers()).toHaveLength(1);
    expect(room.getReadyPlayers()).toContain('host-1');

    room.markPlayerReady('player-2');
    expect(room.getReadyPlayers()).toHaveLength(2);
    expect(room.getReadyPlayers()).toContain('player-2');
  });
});

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  test('createRoom returns room with 6-character code', () => {
    const result = manager.createRoom('host-1', 'Alice');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toHaveLength(6);
      expect(result.data.code).toMatch(/^[2346789ABCDEFGHJKMNPQRTUVWXYZ]{6}$/);
    }
  });

  test('createRoom sets creator as host', () => {
    const result = manager.createRoom('host-1', 'Alice');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hostId).toBe('host-1');
      expect(result.data.players[0].isHost).toBe(true);
    }
  });

  test('multiple rooms have unique codes', () => {
    const result1 = manager.createRoom('host-1', 'Alice');
    const result2 = manager.createRoom('host-2', 'Bob');
    const result3 = manager.createRoom('host-3', 'Charlie');

    expect(result1.success && result2.success && result3.success).toBe(true);
    if (result1.success && result2.success && result3.success) {
      const codes = new Set([result1.data.code, result2.data.code, result3.data.code]);
      expect(codes.size).toBe(3);
    }
  });

  test('joinRoom adds player to existing room', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const joinResult = manager.joinRoom(createResult.data.code, 'player-2', 'Bob');
    expect(joinResult.success).toBe(true);
    if (joinResult.success) {
      expect(joinResult.data.players).toHaveLength(2);
    }
  });

  test('joinRoom returns error for non-existent room code', () => {
    const result = manager.joinRoom('INVALID', 'player-1', 'Alice');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('ROOM_NOT_FOUND');
    }
  });

  test('joinRoom returns error when room is full', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const code = createResult.data.code;
    manager.joinRoom(code, 'player-2', 'Bob');
    manager.joinRoom(code, 'player-3', 'Charlie');
    manager.joinRoom(code, 'player-4', 'Dave');

    const result = manager.joinRoom(code, 'player-5', 'Eve');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('ROOM_FULL');
    }
  });

  test('joinRoom returns error when game already started', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const code = createResult.data.code;
    manager.joinRoom(code, 'player-2', 'Bob');
    manager.startGame('host-1');

    const result = manager.joinRoom(code, 'player-3', 'Charlie');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('GAME_ALREADY_STARTED');
    }
  });

  test('leaveRoom removes player from room', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const code = createResult.data.code;
    manager.joinRoom(code, 'player-2', 'Bob');

    const leaveResult = manager.leaveRoom('player-2');
    expect(leaveResult.success).toBe(true);

    const room = manager.getRoom(code);
    expect(room).toBeDefined();
    expect(room?.getState().players).toHaveLength(1);
  });

  test('leaveRoom migrates host when host leaves (room continues)', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const code = createResult.data.code;
    manager.joinRoom(code, 'player-2', 'Bob');

    manager.leaveRoom('host-1');

    // With host migration, room persists and player-2 becomes host
    const room = manager.getRoom(code);
    expect(room).toBeDefined();
    expect(room?.getState().hostId).toBe('player-2');
    expect(room?.getState().players).toHaveLength(1);
  });

  test('startGame fails if caller is not host', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    manager.joinRoom(createResult.data.code, 'player-2', 'Bob');

    const result = manager.startGame('player-2');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_HOST');
    }
  });

  test('startGame fails if fewer than 2 players', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const result = manager.startGame('host-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('NOT_ENOUGH_PLAYERS');
    }
  });

  test('startGame succeeds with 2+ players and host calling', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    manager.joinRoom(createResult.data.code, 'player-2', 'Bob');

    const result = manager.startGame('host-1');
    expect(result.success).toBe(true);
  });

  test('getRoom returns room by code', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const room = manager.getRoom(createResult.data.code);
    expect(room).toBeDefined();
    expect(room?.getState().hostId).toBe('host-1');
  });

  test('getRoom returns undefined for non-existent code', () => {
    const room = manager.getRoom('INVALID');
    expect(room).toBeUndefined();
  });

  test('getRoomByPlayerId returns room containing player', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const room = manager.getRoomByPlayerId('host-1');
    expect(room).toBeDefined();
    expect(room?.getState().code).toBe(createResult.data.code);
  });

  test('getRoomByPlayerId returns undefined for player not in any room', () => {
    const room = manager.getRoomByPlayerId('unknown-player');
    expect(room).toBeUndefined();
  });
});
