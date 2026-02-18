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
  } catch {
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

    case 'join-or-create': {
      const result = manager.joinRoomOrSpectate(
        message.instanceId,
        ws.data.playerId,
        message.nickname,
        message.avatarHash ?? null,
      );

      // If room doesn't exist, create it with instanceId as code
      if (!result.success && result.code === 'ROOM_NOT_FOUND') {
        const createResult = manager.createRoomWithCode(
          message.instanceId,
          ws.data.playerId,
          message.nickname,
          message.avatarHash ?? null,
        );
        if (!createResult.success) {
          sendMessage(ws, { type: 'error', message: createResult.error, code: createResult.code });
          return;
        }
        ws.data.roomCode = message.instanceId;
        ws.subscribe(message.instanceId);
        sendMessage(ws, {
          type: 'room-created',
          room: createResult.data,
          playerId: ws.data.playerId,
        });
        break;
      }

      if (!result.success) {
        sendMessage(ws, { type: 'error', message: result.error, code: result.code });
        return;
      }

      ws.data.roomCode = message.instanceId;
      ws.subscribe(message.instanceId);

      if (result.data.isSpectator) {
        // Spectator: send spectator-state with public game view
        const room = manager.getRoom(message.instanceId);
        if (room) {
          const spectatorView = room.getSpectatorView();
          sendMessage(ws, {
            type: 'spectator-state',
            room: result.data.state,
            playerId: ws.data.playerId,
            discardPile: spectatorView?.discardPile ?? [],
            opponents: spectatorView?.opponents ?? [],
            drawPileCount: spectatorView?.drawPileCount ?? 0,
            currentPlayerIndex: spectatorView?.currentPlayerIndex ?? 0,
          });

          // Notify active players of spectator count update
          const playerIds = room.getPlayerIds();
          for (const pid of playerIds) {
            const pWs = playerSockets.get(pid);
            if (pWs) {
              sendMessage(pWs, {
                type: 'spectator-count',
                count: room.getSpectatorCount(),
              });
            }
          }
        }
      } else {
        // Normal join (lobby)
        sendMessage(ws, {
          type: 'room-joined',
          room: result.data.state,
          playerId: ws.data.playerId,
        });
        // Notify others
        publishToRoom(ws, message.instanceId, {
          type: 'room-updated',
          room: result.data.state,
        });
      }
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

      const result = manager.leaveRoom(ws.data.playerId);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }

      // Check if room still exists (host migration keeps it alive)
      const updatedRoom = manager.getRoom(roomCode);
      if (updatedRoom) {
        // Room still active — broadcast updated state to remaining players
        const playerIds = updatedRoom.getPlayerIds();
        for (const pid of playerIds) {
          const pWs = playerSockets.get(pid);
          if (pWs) {
            sendMessage(pWs, { type: 'room-updated', room: updatedRoom.getState() });
          }
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
          // Set up swap callbacks before starting game
          room.setSwapCallbacks({
            onTick: (timeRemaining) => {
              // Broadcast timer tick to all players in room
              const playerIds = room.getPlayerIds();
              for (const pid of playerIds) {
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, { type: 'swap-timer-tick', timeRemaining });
                }
              }
            },
            onReady: (playerId, readyPlayers) => {
              // Broadcast ready state to all players
              const playerIds = room.getPlayerIds();
              for (const pid of playerIds) {
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, { type: 'player-ready', playerId, readyPlayers });
                }
              }
            },
            onComplete: (reason) => {
              // Broadcast swap phase complete to all players
              const playerIds = room.getPlayerIds();
              for (const pid of playerIds) {
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, { type: 'swap-phase-complete', reason });
                }
              }
            },
            onPlayPhaseStart: (currentPlayerIndex) => {
              // Notify all players when playing phase begins with first player
              const playerIds = room.getPlayerIds();
              for (const pid of playerIds) {
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, { type: 'turn-changed', currentPlayerIndex });
                }
              }
            },
          });

          room.setGameCallbacks({
            onPlayerEliminated: (eliminatedPlayerId, nickname, currentPlayerIndex) => {
              const playerIds = room.getPlayerIds();
              for (const pid of playerIds) {
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, {
                    type: 'player-eliminated',
                    playerId: eliminatedPlayerId,
                    nickname,
                    currentPlayerIndex,
                  });
                }
              }
            },
            onGameOver: (shitheadId, shitheadNickname) => {
              const playerIds = room.getPlayerIds();
              const spectatorIds = room.getSpectatorIds();

              // Send game-over to players
              for (const pid of playerIds) {
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, { type: 'game-over', shitheadId, shitheadNickname });
                }
              }

              // Also notify spectators about game over
              for (const sid of spectatorIds) {
                const sWs = playerSockets.get(sid);
                if (sWs) {
                  sendMessage(sWs, { type: 'game-over', shitheadId, shitheadNickname });
                }
              }

              // Set up return-to-lobby callback (auto-return triggers after 5s in Room.ts)
              room.setPlayAgainCallbacks({
                onReturnToLobby: (removedPlayerIds) => {
                  const roomState = room.getState();
                  // Clean up removed players' indices (should be empty for auto-return)
                  for (const pid of removedPlayerIds) {
                    manager.removePlayerIndex(pid);
                  }
                  // Send return-to-lobby to ALL (players + newly promoted spectators)
                  const allPlayerIds = room.getPlayerIds();
                  for (const pid of allPlayerIds) {
                    const pWs = playerSockets.get(pid);
                    if (pWs) {
                      sendMessage(pWs, { type: 'return-to-lobby', room: roomState });
                    }
                  }
                },
              });
            },
          });

          room.setTurnTimerCallbacks({
            onTick: (timeRemaining, currentPlayerIndex) => {
              // Broadcast turn timer tick to ALL players
              const playerIds = room.getPlayerIds();
              for (const pid of playerIds) {
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, {
                    type: 'turn-timer-tick',
                    timeRemaining,
                    currentPlayerIndex,
                  });
                }
              }
            },
            onTimeout: (timedOutPlayerId) => {
              // Execute auto-play for the timed-out player
              const result = room.autoPlayOnTimeout(timedOutPlayerId);
              if (!result.success) return;

              const autoPlayData = result.data;
              const playerIds = room.getPlayerIds();

              if (autoPlayData.wasBlindPlay) {
                // Face-down auto-play: broadcast face-down-result to all players
                for (const pid of playerIds) {
                  const view = room.getAugmentedPlayerView(pid);
                  const pWs = playerSockets.get(pid);
                  if (view && pWs) {
                    sendMessage(pWs, {
                      type: 'face-down-result',
                      playerId: timedOutPlayerId,
                      card: autoPlayData.blindCard!,
                      playable: autoPlayData.blindPlayable!,
                      currentPlayerIndex: view.currentPlayerIndex,
                      discardPile: view.discardPile,
                      hand: view.hand,
                      faceDownCount: view.faceDownCount,
                      opponents: view.opponents,
                    });
                  }
                }
              } else {
                // Hand or face-up auto-play: broadcast card-played with updated state
                for (const pid of playerIds) {
                  const view = room.getAugmentedPlayerView(pid);
                  const pWs = playerSockets.get(pid);
                  if (view && pWs) {
                    sendMessage(pWs, {
                      type: 'card-played',
                      playerId: timedOutPlayerId,
                      cards: [],
                      currentPlayerIndex: view.currentPlayerIndex,
                      drawPileCount: view.drawPileCount,
                      discardPile: view.discardPile,
                      hand: view.hand,
                      faceUp: view.faceUp,
                      faceDownCount: view.faceDownCount,
                      opponents: view.opponents,
                      firstTurn: view.firstTurn,
                    });
                  }
                }
              }
            },
          });

          room.setDisconnectCallbacks({
            onDisconnected: (disconnectedPlayerId, nickname) => {
              const playerIds = room.getPlayerIds();
              const graceTime = room.getDisconnectGraceRemaining(disconnectedPlayerId);
              for (const pid of playerIds) {
                if (pid === disconnectedPlayerId) continue;
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, {
                    type: 'player-disconnected',
                    playerId: disconnectedPlayerId,
                    nickname,
                    graceTimeRemaining: graceTime,
                  });
                }
              }
            },
            onReconnected: (reconnectedPlayerId, nickname) => {
              const playerIds = room.getPlayerIds();
              for (const pid of playerIds) {
                if (pid === reconnectedPlayerId) continue;
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, {
                    type: 'player-reconnected',
                    playerId: reconnectedPlayerId,
                    nickname,
                  });
                }
              }
            },
            onRemoved: (removedPlayerId, nickname, reason) => {
              if (reason === 'host-left') {
                const playerIds = room.getPlayerIds();
                for (const pid of playerIds) {
                  if (pid === removedPlayerId) continue;
                  const pWs = playerSockets.get(pid);
                  if (pWs) {
                    sendMessage(pWs, {
                      type: 'player-removed',
                      playerId: removedPlayerId,
                      nickname,
                      reason: 'host-left',
                    });
                  }
                }
                manager.destroyRoom(room.code);
              } else {
                const playerIds = room.getPlayerIds();
                for (const pid of playerIds) {
                  if (pid === removedPlayerId) continue;
                  const pWs = playerSockets.get(pid);
                  if (pWs) {
                    sendMessage(pWs, {
                      type: 'player-removed',
                      playerId: removedPlayerId,
                      nickname,
                      reason: 'timeout',
                    });
                  }
                }
                manager.removePlayerIndex(removedPlayerId);
              }
            },
          });

          // Set host migration callback for in-game host migration
          room.setHostMigrationCallback((oldHostId, _newHostId) => {
            manager.removePlayerIndex(oldHostId);
            // Broadcast room-updated with new host to all remaining players
            const roomState = room.getState();
            const playerIds = room.getPlayerIds();
            for (const pid of playerIds) {
              const pWs = playerSockets.get(pid);
              if (pWs) {
                sendMessage(pWs, { type: 'room-updated', room: roomState });
              }
            }
          });

          // Set spectator callbacks for in-game spectator joins
          room.setSpectatorCallbacks({
            onSpectatorJoined: (_spectatorId, _nickname) => {
              // Broadcast spectator count to all active players
              const playerIds = room.getPlayerIds();
              for (const pid of playerIds) {
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, { type: 'spectator-count', count: room.getSpectatorCount() });
                }
              }
            },
          });

          room.startGame();

          // Send player-specific game-dealt messages to each player
          const playerIds = room.getPlayerIds();
          for (const playerId of playerIds) {
            const view = room.getAugmentedPlayerView(playerId);
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
                firstTurn: view.firstTurn,
              });
            }
          }
        }
      }, 3000);
      break;
    }

    case 'swap-cards': {
      const roomCode = ws.data.roomCode;

      if (!roomCode) {
        sendMessage(ws, {
          type: 'error',
          message: 'Not in a room',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      const room = manager.getRoom(roomCode);

      if (!room) {
        sendMessage(ws, {
          type: 'error',
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      const result = room.swapCards(ws.data.playerId, message.handIndex, message.faceUpIndex);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }

      // Send per-player swap-cards-updated to ALL players
      const playerIds = room.getPlayerIds();
      for (const playerId of playerIds) {
        const view = room.getAugmentedPlayerView(playerId);
        const playerWs = playerSockets.get(playerId);
        if (view && playerWs) {
          sendMessage(playerWs, {
            type: 'swap-cards-updated',
            hand: view.hand,
            faceUp: view.faceUp,
            opponents: view.opponents,
          });
        }
      }
      break;
    }

    case 'ready-up': {
      const roomCode = ws.data.roomCode;

      if (!roomCode) {
        sendMessage(ws, {
          type: 'error',
          message: 'Not in a room',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      const room = manager.getRoom(roomCode);

      if (!room) {
        sendMessage(ws, {
          type: 'error',
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      const result = room.markPlayerReady(ws.data.playerId);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }
      break;
    }

    case 'play-cards': {
      const roomCode = ws.data.roomCode;
      if (!roomCode) {
        sendMessage(ws, { type: 'error', message: 'Not in a room', code: 'ROOM_NOT_FOUND' });
        return;
      }
      const room = manager.getRoom(roomCode);
      if (!room) {
        sendMessage(ws, { type: 'error', message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      const result = room.playCards(ws.data.playerId, message.cardIndices);
      if (!result.success) {
        sendMessage(ws, { type: 'error', message: result.error, code: result.code });
        return;
      }

      // Get the game state for building response
      const gameState = room.getGameState();
      if (!gameState) return;

      // Get played cards from the end of discard pile
      const playedCards = gameState.discardPile.slice(-message.cardIndices.length);

      // Send per-player views to ALL players in the room
      const playerIds = room.getPlayerIds();
      for (const playerId of playerIds) {
        const view = room.getAugmentedPlayerView(playerId);
        const playerWs = playerSockets.get(playerId);
        if (view && playerWs) {
          sendMessage(playerWs, {
            type: 'card-played',
            playerId: ws.data.playerId,
            cards: playedCards,
            currentPlayerIndex: view.currentPlayerIndex,
            drawPileCount: view.drawPileCount,
            discardPile: view.discardPile,
            hand: view.hand,
            faceUp: view.faceUp,
            faceDownCount: view.faceDownCount,
            opponents: view.opponents,
            firstTurn: view.firstTurn,
          });
        }
      }
      break;
    }

    case 'pickup-pile': {
      const roomCode = ws.data.roomCode;
      if (!roomCode) {
        sendMessage(ws, { type: 'error', message: 'Not in a room', code: 'ROOM_NOT_FOUND' });
        return;
      }
      const room = manager.getRoom(roomCode);
      if (!room) {
        sendMessage(ws, { type: 'error', message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      const result = room.pickupPile(ws.data.playerId);
      if (!result.success) {
        sendMessage(ws, { type: 'error', message: result.error, code: result.code });
        return;
      }

      // Send per-player views to ALL players
      const playerIds = room.getPlayerIds();
      for (const playerId of playerIds) {
        const view = room.getAugmentedPlayerView(playerId);
        const playerWs = playerSockets.get(playerId);
        if (view && playerWs) {
          sendMessage(playerWs, {
            type: 'pile-pickup',
            playerId: ws.data.playerId,
            currentPlayerIndex: view.currentPlayerIndex,
            discardPile: view.discardPile,
            hand: view.hand,
            faceUp: view.faceUp,
            faceDownCount: view.faceDownCount,
            opponents: view.opponents,
          });
        }
      }
      break;
    }

    case 'play-face-down': {
      const roomCode = ws.data.roomCode;

      if (!roomCode) {
        sendMessage(ws, { type: 'error', message: 'Not in a room', code: 'ROOM_NOT_FOUND' });
        return;
      }

      const room = manager.getRoom(roomCode);

      if (!room) {
        sendMessage(ws, { type: 'error', message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      const result = room.playFaceDownBlind(ws.data.playerId, message.faceDownIndex);

      if (!result.success) {
        sendMessage(ws, { type: 'error', message: result.error, code: result.code });
        return;
      }

      // Broadcast face-down-result to ALL players with per-player views
      if (result.data) {
        const playerIds = room.getPlayerIds();
        for (const pid of playerIds) {
          const view = room.getAugmentedPlayerView(pid);
          const pWs = playerSockets.get(pid);
          if (view && pWs) {
            sendMessage(pWs, {
              type: 'face-down-result',
              playerId: ws.data.playerId,
              card: result.data.card,
              playable: result.data.playable,
              currentPlayerIndex: view.currentPlayerIndex,
              discardPile: view.discardPile,
              // Include per-player specific data
              hand: view.hand,
              faceDownCount: view.faceDownCount,
              opponents: view.opponents,
            });
          }
        }
      }
      break;
    }

    case 'reconnect': {
      const room = manager.getRoom(message.roomCode);

      if (!room) {
        sendMessage(ws, {
          type: 'error',
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      // Check if this player was in this room (as player or spectator)
      const roomState = room.getState();
      const playerInRoom = roomState.players.some(p => p.id === ws.data.playerId);
      const isSpectator = room.isSpectator(ws.data.playerId);

      if (!playerInRoom && !isSpectator) {
        sendMessage(ws, {
          type: 'error',
          message: 'You are not in this room',
          code: 'PLAYER_NOT_FOUND',
        });
        return;
      }

      // Update connection data
      ws.data.roomCode = message.roomCode;
      ws.subscribe(message.roomCode);
      playerSockets.set(ws.data.playerId, ws);

      // If spectator reconnecting, send spectator-state instead of player view
      if (isSpectator) {
        const spectatorView = room.getSpectatorView();
        if (spectatorView) {
          sendMessage(ws, {
            type: 'spectator-state',
            room: roomState,
            playerId: ws.data.playerId,
            discardPile: spectatorView.discardPile,
            opponents: spectatorView.opponents,
            drawPileCount: spectatorView.drawPileCount,
            currentPlayerIndex: spectatorView.currentPlayerIndex,
          });
        }
        return;
      }

      // Handle reconnection in room (clears grace period timer)
      room.handlePlayerReconnect(ws.data.playerId);

      // Send current room state to reconnected player
      sendMessage(ws, {
        type: 'room-joined',
        room: roomState,
        playerId: ws.data.playerId,
      });

      // If game in progress, send player-specific game view
      const gameView = room.getAugmentedPlayerView(ws.data.playerId);
      if (gameView) {
        sendMessage(ws, {
          type: 'game-dealt',
          phase: gameView.phase,
          hand: gameView.hand,
          faceUp: gameView.faceUp,
          faceDownCount: gameView.faceDownCount,
          opponents: gameView.opponents,
          drawPileCount: gameView.drawPileCount,
          discardPile: gameView.discardPile,
          currentPlayerIndex: gameView.currentPlayerIndex,
          dealerIndex: gameView.dealerIndex,
          firstTurn: gameView.firstTurn,
        });
      }

      break;
    }

    case 'rename-player': {
      const roomCode = ws.data.roomCode;

      if (!roomCode) {
        sendMessage(ws, {
          type: 'error',
          message: 'Not in a room',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      const room = manager.getRoom(roomCode);

      if (!room) {
        sendMessage(ws, {
          type: 'error',
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      const result = room.renamePlayer(ws.data.playerId, message.nickname);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }

      // Broadcast updated room state to all players
      const updatedRoom = room.getState();

      // Send to the renaming player
      sendMessage(ws, {
        type: 'room-updated',
        room: updatedRoom,
      });

      // Notify other players
      publishToRoom(ws, roomCode, {
        type: 'room-updated',
        room: updatedRoom,
      });

      break;
    }

    case 'play-again': {
      const roomCode = ws.data.roomCode;

      if (!roomCode) {
        sendMessage(ws, {
          type: 'error',
          message: 'Not in a room',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      const room = manager.getRoom(roomCode);

      if (!room) {
        sendMessage(ws, {
          type: 'error',
          message: 'Room not found',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      const result = room.markPlayAgain(ws.data.playerId);

      if (!result.success) {
        sendMessage(ws, {
          type: 'error',
          message: result.error,
          code: result.code,
        });
        return;
      }

      break;
    }
  }
}

export function handleClose(ws: ServerWebSocket<WebSocketData>, manager: RoomManager): void {
  const roomCode = ws.data.roomCode;

  // Check if disconnecting player is a spectator before removing from sockets
  if (roomCode) {
    const room = manager.getRoom(roomCode);
    if (room && room.isSpectator(ws.data.playerId)) {
      // Clean up spectator: remove from room and player index
      room.removeSpectator(ws.data.playerId);
      manager.removePlayerIndex(ws.data.playerId);

      // Broadcast updated spectator count to active players
      const playerIds = room.getPlayerIds();
      for (const pid of playerIds) {
        const pWs = playerSockets.get(pid);
        if (pWs) {
          sendMessage(pWs, { type: 'spectator-count', count: room.getSpectatorCount() });
        }
      }

      // Clean up socket tracking
      playerSockets.delete(ws.data.playerId);
      ws.unsubscribe(roomCode);
      return; // Early return — spectator cleanup is complete, skip player disconnect logic
    }
  }

  // Always remove from active sockets (the WebSocket connection is dead)
  playerSockets.delete(ws.data.playerId);

  if (!roomCode) return;

  const room = manager.getRoomByPlayerId(ws.data.playerId);
  if (!room) return;

  const gameState = room.getGameState();

  if (gameState && gameState.phase !== 'finished') {
    // In-game disconnect: delegate to Room's grace period logic
    room.handlePlayerDisconnect(ws.data.playerId);
    ws.unsubscribe(roomCode);
  } else {
    // Lobby or finished game: delegate to Room's grace period logic
    // Set up disconnect callbacks if not already set (lobby has no game-start to wire them)
    if (!room.hasDisconnectCallbacks()) {
      room.setDisconnectCallbacks({
        onDisconnected: (disconnectedPlayerId, nickname) => {
          // Lobby disconnect: notify other players
          const playerIds = room.getPlayerIds();
          for (const pid of playerIds) {
            if (pid === disconnectedPlayerId) continue;
            const pWs = playerSockets.get(pid);
            if (pWs) {
              sendMessage(pWs, {
                type: 'player-disconnected',
                playerId: disconnectedPlayerId,
                nickname,
                graceTimeRemaining: room.getDisconnectGraceRemaining(disconnectedPlayerId),
              });
            }
          }
        },
        onReconnected: (reconnectedPlayerId, nickname) => {
          const playerIds = room.getPlayerIds();
          for (const pid of playerIds) {
            if (pid === reconnectedPlayerId) continue;
            const pWs = playerSockets.get(pid);
            if (pWs) {
              sendMessage(pWs, {
                type: 'player-reconnected',
                playerId: reconnectedPlayerId,
                nickname,
              });
            }
          }
        },
        onRemoved: (removedPlayerId, nickname, reason) => {
          if (reason === 'host-left') {
            const playerIds = room.getPlayerIds();
            for (const pid of playerIds) {
              if (pid === removedPlayerId) continue;
              const pWs = playerSockets.get(pid);
              if (pWs) {
                sendMessage(pWs, {
                  type: 'player-removed',
                  playerId: removedPlayerId,
                  nickname,
                  reason: 'host-left',
                });
              }
            }
            manager.destroyRoom(room.code);
          } else {
            const playerIds = room.getPlayerIds();
            for (const pid of playerIds) {
              if (pid === removedPlayerId) continue;
              const pWs = playerSockets.get(pid);
              if (pWs) {
                sendMessage(pWs, {
                  type: 'player-removed',
                  playerId: removedPlayerId,
                  nickname,
                  reason: 'timeout',
                });
              }
            }
            manager.removePlayerIndex(removedPlayerId);
            // Send room-updated to remaining players
            const updatedRoom = manager.getRoom(room.code);
            if (updatedRoom) {
              for (const pid of updatedRoom.getPlayerIds()) {
                const pWs = playerSockets.get(pid);
                if (pWs) {
                  sendMessage(pWs, {
                    type: 'room-updated',
                    room: updatedRoom.getState(),
                  });
                }
              }
            }
          }
        },
      });

      // Set host migration callback for lobby host migration
      room.setHostMigrationCallback((oldHostId, _newHostId) => {
        manager.removePlayerIndex(oldHostId);
        // Broadcast room-updated with new host to all remaining players
        const roomState = room.getState();
        const playerIds = room.getPlayerIds();
        for (const pid of playerIds) {
          const pWs = playerSockets.get(pid);
          if (pWs) {
            sendMessage(pWs, { type: 'room-updated', room: roomState });
          }
        }
      });
    }

    room.handlePlayerDisconnect(ws.data.playerId);
    ws.unsubscribe(roomCode);
  }
}
