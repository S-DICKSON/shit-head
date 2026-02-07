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

  test('destroys room when host leaves', () => {
    const room = new Room('host-1', 'Alice');
    room.addPlayer('player-2', 'Bob');

    const shouldDestroy = room.removePlayer('host-1');
    expect(shouldDestroy).toBe(true);
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
      }],
      status: 'waiting',
      hostId: 'host-1',
      maxPlayers: 4,
      minPlayers: 2,
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

  test('leaveRoom destroys room when host leaves', () => {
    const createResult = manager.createRoom('host-1', 'Alice');
    expect(createResult.success).toBe(true);
    if (!createResult.success) return;

    const code = createResult.data.code;
    manager.joinRoom(code, 'player-2', 'Bob');

    manager.leaveRoom('host-1');

    const room = manager.getRoom(code);
    expect(room).toBeUndefined();
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
