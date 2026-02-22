import { describe, expect, test } from 'vitest';
import { Room } from '../Room';

describe('Bot management', () => {
  function createRoomWithHost(): Room {
    return new Room('host-1', 'Alice');
  }

  test('addBot adds a bot player with bot_ prefix ID', () => {
    const room = createRoomWithHost();
    const result = room.addBot();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatch(/^bot_/);
    }
  });

  test('addBot auto-generates nickname when none provided', () => {
    const room = createRoomWithHost();
    const result = room.addBot();
    expect(result.success).toBe(true);
    if (result.success) {
      const state = room.getState();
      const bot = state.players.find(p => p.id === result.data);
      expect(bot?.nickname).toBe('Darling Bot');
    }
  });

  test('addBot increments auto-generated nickname counter', () => {
    const room = createRoomWithHost();
    const r1 = room.addBot();
    const r2 = room.addBot();
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    if (r1.success && r2.success) {
      const state = room.getState();
      const bot1 = state.players.find(p => p.id === r1.data);
      const bot2 = state.players.find(p => p.id === r2.data);
      expect(bot1?.nickname).toBe('Darling Bot');
      expect(bot2?.nickname).toBe('Bica Bot');
    }
  });

  test('addBot uses provided nickname', () => {
    const room = createRoomWithHost();
    const result = room.addBot('MyBot');
    expect(result.success).toBe(true);
    if (result.success) {
      const state = room.getState();
      const bot = state.players.find(p => p.id === result.data);
      expect(bot?.nickname).toBe('MyBot');
    }
  });

  test('addBot fails when room is full', () => {
    const room = createRoomWithHost();
    room.addPlayer('player-2', 'Bob');
    room.addPlayer('player-3', 'Charlie');
    room.addPlayer('player-4', 'Dave');
    // Room now has 4 players (max)
    const result = room.addBot();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('ROOM_FULL');
    }
  });

  test('addBot fails when game already started', () => {
    const room = createRoomWithHost();
    room.addPlayer('player-2', 'Bob');
    room.setSwapCallbacks({
      onTick: () => {},
      onReady: () => {},
      onComplete: () => {},
      onPlayPhaseStart: () => {},
    });
    room.startGame();
    const result = room.addBot();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_ACTION');
    }
  });

  test('removeBot removes a bot player', () => {
    const room = createRoomWithHost();
    const addResult = room.addBot();
    expect(addResult.success).toBe(true);
    if (!addResult.success) return;

    const botId = addResult.data;
    expect(room.getState().players).toHaveLength(2);

    const removeResult = room.removeBot(botId);
    expect(removeResult.success).toBe(true);
    expect(room.getState().players).toHaveLength(1);
  });

  test('removeBot fails for non-bot player', () => {
    const room = createRoomWithHost();
    const result = room.removeBot('host-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('PLAYER_NOT_FOUND');
    }
  });

  test('removeBot fails for non-existent ID', () => {
    const room = createRoomWithHost();
    const result = room.removeBot('bot_doesnotexist');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('PLAYER_NOT_FOUND');
    }
  });

  test('isBot returns true for bot, false for human', () => {
    const room = createRoomWithHost();
    const addResult = room.addBot();
    expect(addResult.success).toBe(true);
    if (!addResult.success) return;

    expect(room.isBot(addResult.data)).toBe(true);
    expect(room.isBot('host-1')).toBe(false);
    expect(room.isBot('nonexistent')).toBe(false);
  });

  test('getBotIds returns all bot IDs', () => {
    const room = createRoomWithHost();
    const r1 = room.addBot();
    const r2 = room.addBot();
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    if (!r1.success || !r2.success) return;

    const botIds = room.getBotIds();
    expect(botIds).toHaveLength(2);
    expect(botIds).toContain(r1.data);
    expect(botIds).toContain(r2.data);
  });

  test('getState includes isBot for bot players', () => {
    const room = createRoomWithHost();
    const addResult = room.addBot('TestBot');
    expect(addResult.success).toBe(true);
    if (!addResult.success) return;

    const state = room.getState();
    const bot = state.players.find(p => p.id === addResult.data);
    const host = state.players.find(p => p.id === 'host-1');

    expect(bot?.isBot).toBe(true);
    // Human players should not have isBot set (undefined, not false)
    expect(host?.isBot).toBeUndefined();
  });

  test('getState does not include isBot for human players', () => {
    const room = createRoomWithHost();
    room.addPlayer('player-2', 'Bob');

    const state = room.getState();
    for (const player of state.players) {
      expect(player.isBot).toBeUndefined();
    }
  });

  test('resetToLobby keeps bots in lobby', () => {
    const room = createRoomWithHost();
    room.addPlayer('player-2', 'Bob');
    room.addBot('BotA');
    room.addBot('BotB');

    expect(room.getState().players).toHaveLength(4);
    expect(room.getBotIds()).toHaveLength(2);

    // Start game to allow resetToLobby to run (it checks finished phase)
    room.setSwapCallbacks({
      onTick: () => {},
      onReady: () => {},
      onComplete: () => {},
      onPlayPhaseStart: () => {},
    });
    room.setGameCallbacks({
      onPlayerEliminated: () => {},
      onGameOver: () => {},
    });
    room.setPlayAgainCallbacks({ onReturnToLobby: () => {} });
    room.startGame();

    // Manually set game to finished so markPlayAgain works
    const gameState = room.getGameState();
    if (gameState) gameState.phase = 'finished';

    // Mark human players as playing again to trigger resetToLobby
    room.markPlayAgain('host-1');
    room.markPlayAgain('player-2');

    // After resetToLobby, bots should still be present
    expect(room.getBotIds()).toHaveLength(2);
    const state = room.getState();
    // Room should be back in waiting with bots still in
    expect(state.status).toBe('waiting');
    const botPlayers = state.players.filter(p => p.isBot);
    expect(botPlayers).toHaveLength(2);

    // Adding another bot after reset gives the next name in the pool
    // (2 bots were already named via the pool, so next is index 2 = 'Knox Bot')
    const r = room.addBot();
    expect(r.success).toBe(false); // Room is now full (host + player-2 + BotA + BotB = 4)
  });

  test('bot names cycle through playful name pool', () => {
    const room = createRoomWithHost();
    const r1 = room.addBot();
    expect(r1.success).toBe(true);
    if (r1.success) {
      const state = room.getState();
      const bot = state.players.find(p => p.id === r1.data);
      expect(bot?.nickname).toBe('Darling Bot');
    }
    // Remove first bot and add 3 more to verify cycling
    if (r1.success) room.removeBot(r1.data);
    // Add 3 more bots (fills remaining 3 slots: host + 3 bots = 4)
    const names: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = room.addBot();
      if (r.success) {
        const s = room.getState();
        const bot = s.players.find(p => p.id === r.data);
        if (bot) names.push(bot.nickname);
      }
    }
    expect(names).toEqual(['Bica Bot', 'Knox Bot', 'Joe Bot']);
  });
});
