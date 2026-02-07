// WebSocket message handlers - route client messages to RoomManager
import { RoomManager } from '../rooms/RoomManager';
import { clientMessageSchema } from '@shit-head/shared';
import type { ServerMessage } from '@shit-head/shared';
import type { ServerWebSocket } from 'bun';

export type WebSocketData = {
  playerId: string;
  roomCode: string | null;
};

// Singleton RoomManager instance
export const roomManager = new RoomManager();

// Helper to send message to a specific client
function sendMessage(ws: ServerWebSocket<WebSocketData>, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

// Helper to publish message to room topic
function publishToRoom(ws: ServerWebSocket<WebSocketData>, topic: string, message: ServerMessage): void {
  ws.publish(topic, JSON.stringify(message));
}

export function handleMessage(
  ws: ServerWebSocket<WebSocketData>,
  messageStr: string,
  manager: RoomManager
): void {
  // Handle heartbeat ping before JSON parsing
  if (messageStr === 'ping') {
    ws.send('pong');
    return;
  }

  // Parse JSON
  let parsedMessage: unknown;
  try {
    parsedMessage = JSON.parse(messageStr);
  } catch (error) {
    sendMessage(ws, {
      type: 'error',
      message: 'Invalid JSON',
      code: 'INVALID_MESSAGE',
    });
    return;
  }

  // Validate message with Zod
  const validation = clientMessageSchema.safeParse(parsedMessage);

  if (!validation.success) {
    sendMessage(ws, {
      type: 'error',
      message: 'Invalid message format',
      code: 'INVALID_MESSAGE',
    });
    return;
  }

  const message = validation.data;

  // Route by message type
  switch (message.type) {
    case 'create-room': {
      const result = manager.createRoom(ws.data.playerId, message.nickname);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }

      const roomCode = result.data.code;
      ws.data.roomCode = roomCode;
      ws.subscribe(roomCode);

      sendMessage(ws, {
        type: 'room-created',
        room: result.data,
        playerId: ws.data.playerId,
      });
      break;
    }

    case 'join-room': {
      const result = manager.joinRoom(message.code, ws.data.playerId, message.nickname);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }

      ws.data.roomCode = message.code;
      ws.subscribe(message.code);

      // Send to joiner
      sendMessage(ws, {
        type: 'room-joined',
        room: result.data,
        playerId: ws.data.playerId,
      });

      // Notify other players in the room
      publishToRoom(ws, message.code, {
        type: 'room-updated',
        room: result.data,
      });
      break;
    }

    case 'leave-room': {
      const roomCode = ws.data.roomCode;

      if (!roomCode) {
        sendMessage(ws, {
          type: 'error',
          message: 'Not in a room',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      // Get updated room state before leaving
      const room = manager.getRoomByPlayerId(ws.data.playerId);
      const result = manager.leaveRoom(ws.data.playerId);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }

      // Notify remaining players before unsubscribing
      if (room) {
        const updatedRoom = manager.getRoom(roomCode);
        if (updatedRoom) {
          publishToRoom(ws, roomCode, {
            type: 'room-updated',
            room: updatedRoom.getState(),
          });
        }
      }

      ws.unsubscribe(roomCode);
      ws.data.roomCode = null;
      break;
    }

    case 'start-game': {
      const result = manager.startGame(ws.data.playerId);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }

      const roomCode = ws.data.roomCode;
      if (!roomCode) {
        sendMessage(ws, {
          type: 'error',
          message: 'Not in a room',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      // Send game-starting to host (since publish doesn't include sender)
      sendMessage(ws, {
        type: 'game-starting',
        countdown: 3,
      });

      // Notify other players in the room
      publishToRoom(ws, roomCode, {
        type: 'game-starting',
        countdown: 3,
      });

      // After 3-second countdown, start the game
      setTimeout(() => {
        const room = manager.getRoom(roomCode);
        if (room) {
          room.startGame();

          // Send to host
          sendMessage(ws, {
            type: 'game-started',
          });

          // Send to all other players
          publishToRoom(ws, roomCode, {
            type: 'game-started',
          });
        }
      }, 3000);
      break;
    }
  }
}

export function handleClose(ws: ServerWebSocket<WebSocketData>, manager: RoomManager): void {
  const roomCode = ws.data.roomCode;

  if (roomCode) {
    // Get room state before leaving
    const room = manager.getRoomByPlayerId(ws.data.playerId);

    manager.leaveRoom(ws.data.playerId);
    ws.unsubscribe(roomCode);

    // If room still exists, notify remaining players
    if (room) {
      const updatedRoom = manager.getRoom(roomCode);
      if (updatedRoom) {
        ws.publish(roomCode, JSON.stringify({
          type: 'room-updated',
          room: updatedRoom.getState(),
        }));
      }
    }
  }
}
