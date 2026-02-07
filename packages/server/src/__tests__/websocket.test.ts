// WebSocket handler tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleMessage, handleClose } from '../websocket/handlers';
import { RoomManager } from '../rooms/RoomManager';
import type { WebSocketData } from '../websocket/handlers';
import type { ServerWebSocket } from 'bun';

// Mock WebSocket
function createMockWebSocket(playerId: string, roomCode: string | null = null): ServerWebSocket<WebSocketData> {
  return {
    data: { playerId, roomCode },
    send: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    publish: vi.fn(),
  } as unknown as ServerWebSocket<WebSocketData>;
}

describe('WebSocket Handlers', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('handleMessage', () => {
    it('responds to ping with pong', () => {
      const ws = createMockWebSocket('player1');
      handleMessage(ws, 'ping', roomManager);

      expect(ws.send).toHaveBeenCalledWith('pong');
    });

    it('sends error for invalid JSON', () => {
      const ws = createMockWebSocket('player1');
      handleMessage(ws, 'not valid json{', roomManager);

      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"INVALID_MESSAGE"')
      );
    });

    it('sends error for invalid message type', () => {
      const ws = createMockWebSocket('player1');
      handleMessage(ws, JSON.stringify({ type: 'invalid-type' }), roomManager);

      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"INVALID_MESSAGE"')
      );
    });

    it('handles create-room message', () => {
      const ws = createMockWebSocket('player1');
      const message = JSON.stringify({
        type: 'create-room',
        nickname: 'Alice',
      });

      handleMessage(ws, message, roomManager);

      // Should subscribe to room topic
      expect(ws.subscribe).toHaveBeenCalled();

      // Should send room-created message
      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"room-created"')
      );
      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"playerId":"player1"')
      );
    });

    it('handles join-room message', () => {
      const ws1 = createMockWebSocket('player1');
      const ws2 = createMockWebSocket('player2');

      // First player creates room
      const createMessage = JSON.stringify({
        type: 'create-room',
        nickname: 'Alice',
      });
      handleMessage(ws1, createMessage, roomManager);

      // Get room code from the response
      const sendCall = (ws1.send as any).mock.calls[0][0];
      const roomCode = JSON.parse(sendCall).room.code;

      // Second player joins
      const joinMessage = JSON.stringify({
        type: 'join-room',
        code: roomCode,
        nickname: 'Bob',
      });
      handleMessage(ws2, joinMessage, roomManager);

      // Should subscribe to room topic
      expect(ws2.subscribe).toHaveBeenCalledWith(roomCode);

      // Should send room-joined message
      expect(ws2.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"room-joined"')
      );

      // Should publish room-updated to other players
      expect(ws2.publish).toHaveBeenCalledWith(
        roomCode,
        expect.stringContaining('"type":"room-updated"')
      );
    });

    it('sends error when joining non-existent room', () => {
      const ws = createMockWebSocket('player1');
      const message = JSON.stringify({
        type: 'join-room',
        code: 'ABCDEF',
        nickname: 'Alice',
      });

      handleMessage(ws, message, roomManager);

      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"ROOM_NOT_FOUND"')
      );
    });

    it('handles leave-room message', () => {
      const ws = createMockWebSocket('player1');

      // Create room first
      const createMessage = JSON.stringify({
        type: 'create-room',
        nickname: 'Alice',
      });
      handleMessage(ws, createMessage, roomManager);

      // Get room code
      const sendCall = (ws.send as any).mock.calls[0][0];
      const roomCode = JSON.parse(sendCall).room.code;

      // Update ws.data.roomCode (simulating what handleMessage does)
      ws.data.roomCode = roomCode;

      // Leave room
      const leaveMessage = JSON.stringify({
        type: 'leave-room',
      });
      handleMessage(ws, leaveMessage, roomManager);

      // Should unsubscribe from room topic
      expect(ws.unsubscribe).toHaveBeenCalledWith(roomCode);
    });

    it('handles start-game message', () => {
      const ws1 = createMockWebSocket('player1');
      const ws2 = createMockWebSocket('player2');

      // Create room
      const createMessage = JSON.stringify({
        type: 'create-room',
        nickname: 'Alice',
      });
      handleMessage(ws1, createMessage, roomManager);

      const sendCall = (ws1.send as any).mock.calls[0][0];
      const roomCode = JSON.parse(sendCall).room.code;
      ws1.data.roomCode = roomCode;

      // Join room
      const joinMessage = JSON.stringify({
        type: 'join-room',
        code: roomCode,
        nickname: 'Bob',
      });
      handleMessage(ws2, joinMessage, roomManager);
      ws2.data.roomCode = roomCode;

      // Start game
      const startMessage = JSON.stringify({
        type: 'start-game',
      });
      handleMessage(ws1, startMessage, roomManager);

      // Should send game-starting to host
      expect(ws1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"game-starting"')
      );

      // Should publish game-starting to other players
      expect(ws1.publish).toHaveBeenCalledWith(
        roomCode,
        expect.stringContaining('"type":"game-starting"')
      );
    });

    it('sends error when non-host tries to start game', () => {
      const ws1 = createMockWebSocket('player1');
      const ws2 = createMockWebSocket('player2');

      // Create room
      const createMessage = JSON.stringify({
        type: 'create-room',
        nickname: 'Alice',
      });
      handleMessage(ws1, createMessage, roomManager);

      const sendCall = (ws1.send as any).mock.calls[0][0];
      const roomCode = JSON.parse(sendCall).room.code;

      // Join room
      const joinMessage = JSON.stringify({
        type: 'join-room',
        code: roomCode,
        nickname: 'Bob',
      });
      handleMessage(ws2, joinMessage, roomManager);
      ws2.data.roomCode = roomCode;

      // Non-host tries to start game
      const startMessage = JSON.stringify({
        type: 'start-game',
      });
      handleMessage(ws2, startMessage, roomManager);

      // Should send error
      expect(ws2.send).toHaveBeenCalledWith(
        expect.stringContaining('"code":"NOT_HOST"')
      );
    });
  });

  describe('handleClose', () => {
    it('removes player from room and unsubscribes', () => {
      const ws = createMockWebSocket('player1');

      // Create room
      const createMessage = JSON.stringify({
        type: 'create-room',
        nickname: 'Alice',
      });
      handleMessage(ws, createMessage, roomManager);

      const sendCall = (ws.send as any).mock.calls[0][0];
      const roomCode = JSON.parse(sendCall).room.code;
      ws.data.roomCode = roomCode;

      // Close connection
      handleClose(ws, roomManager);

      // Should unsubscribe from room
      expect(ws.unsubscribe).toHaveBeenCalledWith(roomCode);

      // Room should be destroyed (host left)
      expect(roomManager.getRoom(roomCode)).toBeUndefined();
    });

    it('handles close when player not in room', () => {
      const ws = createMockWebSocket('player1');

      // Should not throw error
      expect(() => handleClose(ws, roomManager)).not.toThrow();
    });
  });
});
