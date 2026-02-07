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

// Player WebSocket registry for per-player messaging
const playerSockets = new Map<string, ServerWebSocket<WebSocketData>>();

// Helper to send message to a specific client
function sendMessage(ws: ServerWebSocket<WebSocketData>, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

// Helper to publish message to room topic
function publishToRoom(ws: ServerWebSocket<WebSocketData>, topic: string, message: ServerMessage): void {
  ws.publish(topic, JSON.stringify(message));
}

export function handleOpen(ws: ServerWebSocket<WebSocketData>): void {
  playerSockets.set(ws.data.playerId, ws);
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

      // Check if leaving player is the host (room will be destroyed)
      const room = manager.getRoomByPlayerId(ws.data.playerId);
      const isHost = room?.getState().hostId === ws.data.playerId;

      // If host is leaving, notify others before destroying room
      if (isHost) {
        publishToRoom(ws, roomCode, {
          type: 'error',
          message: 'Host left — room closed',
          code: 'ROOM_NOT_FOUND',
        });
      }

      const result = manager.leaveRoom(ws.data.playerId);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }

      // Notify remaining players (non-host leave — room still exists)
      if (!isHost) {
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

          // Send player-specific game-dealt messages to each player
          const playerIds = room.getPlayerIds();
          for (const playerId of playerIds) {
            const view = room.getPlayerView(playerId);
            const playerWs = playerSockets.get(playerId);

            if (view && playerWs) {
              sendMessage(playerWs, {
                type: 'game-dealt',
                phase: view.phase,
                hand: view.hand,
                faceUp: view.faceUp,
                faceDownCount: view.faceDownCount,
                opponents: view.opponents,
                drawPileCount: view.drawPileCount,
                discardPile: view.discardPile,
                currentPlayerIndex: view.currentPlayerIndex,
                dealerIndex: view.dealerIndex,
              });
            }
          }
        }
      }, 3000);
      break;
    }
  }
}

export function handleClose(ws: ServerWebSocket<WebSocketData>, manager: RoomManager): void {
  playerSockets.delete(ws.data.playerId);

  const roomCode = ws.data.roomCode;

  if (roomCode) {
    // Check if disconnecting player is the host
    const room = manager.getRoomByPlayerId(ws.data.playerId);
    const isHost = room?.getState().hostId === ws.data.playerId;

    // If host is disconnecting, notify others before destroying room
    if (isHost) {
      ws.publish(roomCode, JSON.stringify({
        type: 'error',
        message: 'Host disconnected — room closed',
        code: 'ROOM_NOT_FOUND',
      }));
    }

    manager.leaveRoom(ws.data.playerId);
    ws.unsubscribe(roomCode);

    // Non-host disconnect — room still exists, notify remaining players
    if (!isHost && room) {
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
