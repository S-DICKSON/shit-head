import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { Room } from '../Room';

describe('Room disconnect/reconnect lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to create room with players and start game
  function createRoomWithGame(playerCount: number = 3): {
    room: Room;
    playerIds: string[];
    callbacks: {
      onDisconnected: ReturnType<typeof vi.fn>;
      onReconnected: ReturnType<typeof vi.fn>;
      onRemoved: ReturnType<typeof vi.fn>;
      onPlayPhaseStart: ReturnType<typeof vi.fn>;
      onPlayerEliminated: ReturnType<typeof vi.fn>;
      onGameOver: ReturnType<typeof vi.fn>;
    };
  } {
    const room = new Room('player-1', 'Alice');
    const playerIds = ['player-1'];

    // Add additional players
    for (let i = 2; i <= playerCount; i++) {
      room.addPlayer(`player-${i}`, `Player${i}`);
      playerIds.push(`player-${i}`);
    }

    // Set up callbacks
    const callbacks = {
      onDisconnected: vi.fn(),
      onReconnected: vi.fn(),
      onRemoved: vi.fn(),
      onPlayPhaseStart: vi.fn(),
      onPlayerEliminated: vi.fn(),
      onGameOver: vi.fn(),
    };

    room.setDisconnectCallbacks({
      onDisconnected: callbacks.onDisconnected,
      onReconnected: callbacks.onReconnected,
      onRemoved: callbacks.onRemoved,
    });

    room.setSwapCallbacks({
      onTick: vi.fn(),
      onReady: vi.fn(),
      onComplete: vi.fn(),
      onPlayPhaseStart: callbacks.onPlayPhaseStart,
    });

    room.setGameCallbacks({
      onPlayerEliminated: callbacks.onPlayerEliminated,
      onGameOver: callbacks.onGameOver,
    });

    room.setTurnTimerCallbacks({
      onTick: vi.fn(),
      onTimeout: vi.fn(),
    });

    return { room, playerIds, callbacks };
  }

  describe('Lobby disconnect (immediate removal)', () => {
    test('removes player immediately when disconnected in lobby (no game)', () => {
      const room = new Room('player-1', 'Alice');
      room.addPlayer('player-2', 'Bob');

      const onRemoved = vi.fn();
      room.setDisconnectCallbacks({
        onDisconnected: vi.fn(),
        onReconnected: vi.fn(),
        onRemoved,
      });

      // Disconnect player-2 (non-host) while in lobby
      room.handlePlayerDisconnect('player-2');

      // Should immediately remove player
      expect(onRemoved).toHaveBeenCalledWith('player-2', 'Bob', 'timeout');

      // Player should be removed from room
      const state = room.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0].id).toBe('player-1');
    });

    test('removes player immediately when disconnected after game finished', () => {
      const { room, callbacks } = createRoomWithGame(2);

      // Start game and manually set to finished phase
      room.startGame();
      const gameState = room.getGameState();
      if (gameState) {
        gameState.phase = 'finished';
      }

      // Disconnect player
      room.handlePlayerDisconnect('player-2');

      // Should immediately remove player
      expect(callbacks.onRemoved).toHaveBeenCalledWith('player-2', 'Player2', 'timeout');
    });
  });

  describe('In-game disconnect (grace period)', () => {
    test('starts grace period when player disconnects during active game', () => {
      const { room, callbacks } = createRoomWithGame(3);

      // Start game to get to playing phase
      room.startGame();
      vi.advanceTimersByTime(2500); // Advance through swap phase transition

      // Disconnect player-2
      room.handlePlayerDisconnect('player-2');

      // onPlayerDisconnected should fire
      expect(callbacks.onDisconnected).toHaveBeenCalledWith('player-2', 'Player2');

      // isPlayerDisconnected should return true
      expect(room.isPlayerDisconnected('player-2')).toBe(true);

      // Player should NOT be removed yet
      expect(callbacks.onRemoved).not.toHaveBeenCalled();
      const state = room.getState();
      expect(state.players).toHaveLength(3);
    });

    test('reconnect within grace period clears timer and fires callback', () => {
      const { room, callbacks } = createRoomWithGame(3);

      room.startGame();
      vi.advanceTimersByTime(2500);

      // Disconnect player-2
      room.handlePlayerDisconnect('player-2');
      expect(room.isPlayerDisconnected('player-2')).toBe(true);

      // Reconnect before grace period expires
      vi.advanceTimersByTime(30000); // 30 seconds into 90-second grace period
      room.handlePlayerReconnect('player-2');

      // onPlayerReconnected should fire
      expect(callbacks.onReconnected).toHaveBeenCalledWith('player-2', 'Player2');

      // isPlayerDisconnected should return false
      expect(room.isPlayerDisconnected('player-2')).toBe(false);

      // Advance past grace period expiry - should NOT fire onRemoved
      vi.advanceTimersByTime(65000); // Total 95 seconds, past 90-second grace period
      expect(callbacks.onRemoved).not.toHaveBeenCalled();
    });

    test('grace period expires and removes non-host player', () => {
      const { room, callbacks } = createRoomWithGame(3);

      room.startGame();
      vi.advanceTimersByTime(2500);

      // Disconnect player-2 (non-host)
      room.handlePlayerDisconnect('player-2');

      // Advance timers by 90 seconds (grace period)
      vi.advanceTimersByTime(90000);

      // onPlayerRemoved should fire with timeout reason
      expect(callbacks.onRemoved).toHaveBeenCalledWith('player-2', 'Player2', 'timeout');
    });

    test('grace period expires and removes host with host-left reason', () => {
      const { room, callbacks } = createRoomWithGame(3);

      room.startGame();
      vi.advanceTimersByTime(2500);

      // Disconnect player-1 (host)
      room.handlePlayerDisconnect('player-1');

      // Advance timers by 90 seconds
      vi.advanceTimersByTime(90000);

      // onPlayerRemoved should fire with host-left reason
      expect(callbacks.onRemoved).toHaveBeenCalledWith('player-1', 'Alice', 'host-left');
    });
  });

  describe('Turn advancement when disconnected player removed', () => {
    test('advances turn when removed player was current player', () => {
      const { room } = createRoomWithGame(3);

      room.startGame();
      // Advance past swap phase (30s swap timer will expire) and transition (2.5s)
      vi.advanceTimersByTime(30000 + 2500);

      // Get initial game state
      const gameState = room.getGameState();
      expect(gameState).not.toBeNull();

      if (gameState) {
        expect(gameState.phase).toBe('playing');

        // Manually set player-2 as current player (index 1)
        gameState.currentPlayerIndex = 1;

        // Disconnect player-2
        room.handlePlayerDisconnect('player-2');

        // Advance past grace period
        vi.advanceTimersByTime(90000);

        // Current player index should have advanced
        const newGameState = room.getGameState();
        expect(newGameState?.currentPlayerIndex).not.toBe(1);
        // Should be 2 (next player after index 1)
        expect(newGameState?.currentPlayerIndex).toBe(2);
      }
    });
  });

  describe('Game end when too few players remain', () => {
    test('ends game when fewer than 2 active players remain after removal', () => {
      const { room, callbacks } = createRoomWithGame(2);

      room.startGame();
      vi.advanceTimersByTime(2500);

      // Disconnect player-2 (non-host)
      room.handlePlayerDisconnect('player-2');

      // Advance past grace period
      vi.advanceTimersByTime(90000);

      // Game should end (only 1 player left)
      expect(callbacks.onGameOver).toHaveBeenCalled();

      const gameState = room.getGameState();
      expect(gameState?.phase).toBe('finished');
    });
  });

  describe('Turn timer interaction', () => {
    test('pauses turn timer when current player disconnects', () => {
      const { room } = createRoomWithGame(3);

      room.startGame();
      // Advance past swap phase (30s swap timer will expire) and transition (2.5s)
      vi.advanceTimersByTime(30000 + 2500);

      const gameState = room.getGameState();
      if (gameState) {
        expect(gameState.phase).toBe('playing');

        const currentPlayerIndex = gameState.currentPlayerIndex;
        const currentPlayerId = gameState.players[currentPlayerIndex].playerId;

        // Advance past turn timer delay to ensure timer is running
        vi.advanceTimersByTime(2000);

        // Spy on clearTurnTimer AFTER timer has started
        const clearSpy = vi.spyOn(room, 'clearTurnTimer');

        // Disconnect the current player
        room.handlePlayerDisconnect(currentPlayerId);

        // clearTurnTimer should have been called
        expect(clearSpy).toHaveBeenCalled();
      }
    });

    test('resumes turn timer when current player reconnects', () => {
      const { room } = createRoomWithGame(3);

      room.startGame();
      // Advance past swap phase (30s swap timer will expire) and transition (2.5s)
      vi.advanceTimersByTime(30000 + 2500);

      const gameState = room.getGameState();
      if (gameState) {
        expect(gameState.phase).toBe('playing');

        const currentPlayerIndex = gameState.currentPlayerIndex;
        const currentPlayerId = gameState.players[currentPlayerIndex].playerId;

        // Disconnect the current player
        room.handlePlayerDisconnect(currentPlayerId);

        // Spy on startTurnTimer AFTER disconnect
        const startSpy = vi.spyOn(room, 'startTurnTimer');

        // Reconnect
        room.handlePlayerReconnect(currentPlayerId);

        // startTurnTimer should have been called with current player index
        expect(startSpy).toHaveBeenCalledWith(currentPlayerIndex);
      }
    });
  });

  describe('Edge cases', () => {
    test('handles disconnect of non-existent player gracefully', () => {
      const { room } = createRoomWithGame(2);
      room.startGame();

      // Should not throw
      expect(() => {
        room.handlePlayerDisconnect('non-existent-player');
      }).not.toThrow();
    });

    test('handles reconnect of player who was not disconnected', () => {
      const { room } = createRoomWithGame(2);
      room.startGame();

      // Should not throw or cause issues
      expect(() => {
        room.handlePlayerReconnect('player-1');
      }).not.toThrow();
    });

    test('race condition: reconnect just before timeout fires', () => {
      const { room, callbacks } = createRoomWithGame(3);

      room.startGame();
      vi.advanceTimersByTime(2500);

      // Disconnect player-2
      room.handlePlayerDisconnect('player-2');

      // Advance almost to grace period end
      vi.advanceTimersByTime(89999);

      // Reconnect just before timeout
      room.handlePlayerReconnect('player-2');

      // Advance past the timeout point
      vi.advanceTimersByTime(2);

      // onRemoved should NOT have been called
      expect(callbacks.onRemoved).not.toHaveBeenCalled();

      // Player should not be disconnected
      expect(room.isPlayerDisconnected('player-2')).toBe(false);
    });
  });
});
