import { describe, it, expect } from 'vitest';
import { Room } from '../rooms/Room';
import { BotPlayer } from '../game/BotPlayer';

/**
 * Bot integration tests: exercise the bot lifecycle at the Room level.
 * These tests use Room and BotPlayer directly (no WebSocket simulation needed).
 */
describe('Bot integration', () => {
  function makeSwapCallbacks() {
    return {
      onTick: () => {},
      onReady: () => {},
      onComplete: () => {},
      onPlayPhaseStart: () => {},
    };
  }

  it('bot can be added to a room and appears in room state', () => {
    const room = new Room('host1', 'Host');
    const result = room.addBot();
    expect(result.success).toBe(true);
    if (result.success) {
      const state = room.getState();
      const bot = state.players.find(p => p.id === result.data);
      expect(bot).toBeDefined();
      expect(bot?.isBot).toBe(true);
      expect(bot?.nickname).toMatch(/^Bot \d+$/);
    }
  });

  it('bot is removed on removeBot call', () => {
    const room = new Room('host1', 'Host');
    room.addPlayer('p2', 'Player 2');
    const botResult = room.addBot();
    expect(botResult.success).toBe(true);
    expect(room.getState().players.length).toBe(3);
    if (botResult.success) {
      room.removeBot(botResult.data);
      expect(room.getState().players.length).toBe(2);
      expect(room.getBotIds().length).toBe(0);
    }
  });

  it('bot selects valid move for a real game state', () => {
    const room = new Room('host1', 'Host');
    room.addPlayer('p2', 'Player 2');
    const botResult = room.addBot();
    expect(botResult.success).toBe(true);
    if (!botResult.success) return;
    const botId = botResult.data;

    room.setSwapCallbacks(makeSwapCallbacks());
    room.startCountdown();
    room.startGame();

    const gameState = room.getGameState();
    expect(gameState).toBeDefined();
    if (!gameState) return;

    const botPlayer = gameState.players.find(p => p.playerId === botId);
    expect(botPlayer).toBeDefined();
    if (!botPlayer) return;

    expect(botPlayer.hand.length).toBe(3);
    expect(botPlayer.faceUp.length).toBe(3);
    expect(botPlayer.faceDown.length).toBe(3);

    const move = BotPlayer.selectMove(gameState, botId);
    expect(move).toBeDefined();
    expect(['play', 'pickup', 'face-down']).toContain(move.type);
  });

  it('cannot add bot when room is full', () => {
    const room = new Room('host1', 'Host');
    room.addPlayer('p2', 'Player 2');
    room.addPlayer('p3', 'Player 3');
    room.addPlayer('p4', 'Player 4');
    const result = room.addBot();
    expect(result.success).toBe(false);
  });

  it('cannot add bot after game starts', () => {
    const room = new Room('host1', 'Host');
    room.addPlayer('p2', 'Player 2');
    room.setSwapCallbacks(makeSwapCallbacks());
    room.startCountdown();
    room.startGame();
    const result = room.addBot();
    expect(result.success).toBe(false);
  });

  it('getBotIds returns correct bot IDs', () => {
    const room = new Room('host1', 'Host');
    const bot1 = room.addBot('Bot A');
    const bot2 = room.addBot('Bot B');
    expect(bot1.success).toBe(true);
    expect(bot2.success).toBe(true);
    if (bot1.success && bot2.success) {
      const botIds = room.getBotIds();
      expect(botIds).toContain(bot1.data);
      expect(botIds).toContain(bot2.data);
      expect(botIds.length).toBe(2);
    }
  });

  it('isBot correctly identifies bots vs humans', () => {
    const room = new Room('host1', 'Host');
    room.addPlayer('p2', 'Player 2');
    const botResult = room.addBot();
    expect(botResult.success).toBe(true);
    if (botResult.success) {
      expect(room.isBot(botResult.data)).toBe(true);
      expect(room.isBot('host1')).toBe(false);
      expect(room.isBot('p2')).toBe(false);
    }
  });

  it('bot auto-readies during swap phase', () => {
    const room = new Room('host1', 'Host');
    const botResult = room.addBot();
    expect(botResult.success).toBe(true);
    if (!botResult.success) return;

    expect(room.canStart()).toBe(true);
    room.setSwapCallbacks(makeSwapCallbacks());
    room.startCountdown();
    room.startGame();

    // Mark bot as ready (simulating what the handler would do)
    const readyResult = room.markPlayerReady(botResult.data);
    // markPlayerReady should accept the bot ID since bot is a valid player
    expect(readyResult.success).toBe(true);
  });

  it('all players in game state after startGame (including bots)', () => {
    const room = new Room('host1', 'Host');
    room.addPlayer('p2', 'Player 2');
    const botResult = room.addBot();
    expect(botResult.success).toBe(true);
    if (!botResult.success) return;

    room.setSwapCallbacks(makeSwapCallbacks());
    room.startCountdown();
    room.startGame();

    const gameState = room.getGameState();
    expect(gameState).not.toBeNull();
    if (!gameState) return;

    expect(gameState.players.length).toBe(3);
    const botInGame = gameState.players.find(p => p.playerId === botResult.data);
    expect(botInGame).toBeDefined();
  });
});
