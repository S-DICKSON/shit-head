import { ref, watch, effectScope } from 'vue';
import { useWebSocket } from '@vueuse/core';
import type { ClientMessage, ServerMessage, RoomState, PlayerGameView } from '@shit-head/shared';

// Singleton state to share socket across all components
let socketInstance: ReturnType<typeof createGameSocket> | null = null;

type MessageHandler = (msg: ServerMessage) => void;

function createGameSocket() {
  // Detached scope so the WebSocket survives component unmounts
  const scope = effectScope(true);

  // Check for existing playerId from previous session
  const storedPlayerId = localStorage.getItem('shithead-player-id');
  const storedRoomCode = localStorage.getItem('shithead-room-code');

  // Determine WebSocket URL: use env var in development, derive from page URL in production
  const serverUrl = import.meta.env.VITE_WS_URL;
  let wsUrl = serverUrl
    ? serverUrl
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/game-ws`;

  // Include stored playerId for reconnection
  if (storedPlayerId) {
    const separator = wsUrl.includes('?') ? '&' : '?';
    wsUrl += `${separator}playerId=${encodeURIComponent(storedPlayerId)}`;
  }

  // Reactive state
  const playerId = ref<string | null>(storedPlayerId);
  const roomState = ref<RoomState | null>(null);
  const lastMessage = ref<ServerMessage | null>(null);
  const error = ref<string | null>(null);
  const messageHandlers: MessageHandler[] = [];

  // Swap phase state
  const gameView = ref<PlayerGameView | null>(null);
  const swapTimeRemaining = ref<number>(30);
  const readyPlayers = ref<string[]>([]);
  const swapPhaseComplete = ref<boolean>(false);
  const swapPhaseReason = ref<'timer-expired' | 'all-ready' | null>(null);

  // Turn timer state
  const turnTimeRemaining = ref<number>(45);
  const turnTimerPlayerIndex = ref<number>(-1);

  // Run WebSocket and watchers inside detached scope
  const { status, data, send: wsSend, close, open } = scope.run(() =>
    useWebSocket(wsUrl, {
      autoReconnect: {
        retries: 5,
        delay: 1000,
        onFailed() {
          error.value = 'Failed to connect to server after multiple attempts';
        },
      },
      heartbeat: {
        message: 'ping',
        interval: 30000,
        pongTimeout: 5000,
      },
      immediate: true,
    })
  )!;

  // Persist playerId to localStorage
  scope.run(() => watch(playerId, (newId) => {
    if (newId) {
      localStorage.setItem('shithead-player-id', newId);
    }
  }));

  // Persist roomCode to localStorage when room state changes
  scope.run(() => watch(roomState, (newRoom) => {
    if (newRoom) {
      localStorage.setItem('shithead-room-code', newRoom.code);
    }
  }));

  // Auto-reconnect to room when WebSocket reopens
  scope.run(() => watch(status, (newStatus) => {
    if (newStatus === 'OPEN' && storedPlayerId && storedRoomCode) {
      // Send reconnect message to rejoin room
      wsSend(JSON.stringify({ type: 'reconnect', roomCode: storedRoomCode }));
    }
  }));

  // Watch for incoming messages (also inside detached scope)
  scope.run(() => watch(data, (rawData) => {
    if (!rawData || rawData === 'pong') return;

    try {
      const message = JSON.parse(rawData) as ServerMessage;
      lastMessage.value = message;

      // Update internal state based on message type
      switch (message.type) {
        case 'room-created':
          playerId.value = message.playerId;
          roomState.value = message.room;
          break;
        case 'room-joined':
          playerId.value = message.playerId;
          roomState.value = message.room;
          break;
        case 'room-updated':
          if (roomState.value) {
            roomState.value = message.room;
          }
          break;
        case 'player-left':
          if (roomState.value) {
            roomState.value.players = roomState.value.players.filter(
              (p) => p.id !== message.playerId
            );
            if (message.newHostId && roomState.value.hostId !== message.newHostId) {
              roomState.value.hostId = message.newHostId;
              // Update isHost flag for players
              roomState.value.players = roomState.value.players.map((p) => ({
                ...p,
                isHost: p.id === message.newHostId,
              }));
            }
          }
          break;
        case 'game-dealt':
          gameView.value = {
            phase: message.phase,
            hand: message.hand,
            faceUp: message.faceUp,
            faceDownCount: message.faceDownCount,
            opponents: message.opponents,
            drawPileCount: message.drawPileCount,
            discardPile: message.discardPile,
            currentPlayerIndex: message.currentPlayerIndex,
            dealerIndex: message.dealerIndex,
          };
          swapPhaseComplete.value = false;
          swapPhaseReason.value = null;
          readyPlayers.value = [];
          break;
        case 'swap-cards-updated':
          if (gameView.value) {
            gameView.value = {
              ...gameView.value,
              hand: message.hand,
              faceUp: message.faceUp,
              opponents: message.opponents,
            };
          }
          break;
        case 'swap-timer-tick':
          swapTimeRemaining.value = message.timeRemaining;
          break;
        case 'player-ready':
          readyPlayers.value = message.readyPlayers;
          break;
        case 'swap-phase-complete':
          swapPhaseComplete.value = true;
          swapPhaseReason.value = message.reason;
          break;
        case 'turn-timer-tick':
          turnTimeRemaining.value = message.timeRemaining;
          turnTimerPlayerIndex.value = message.currentPlayerIndex;
          break;
        case 'card-played':
          if (gameView.value) {
            gameView.value = {
              ...gameView.value,
              currentPlayerIndex: message.currentPlayerIndex,
              drawPileCount: message.drawPileCount,
              discardPile: message.discardPile,
              ...(message.hand ? { hand: message.hand } : {}),
              ...(message.opponents ? { opponents: message.opponents } : {}),
            };
          }
          break;
        case 'pile-pickup':
          if (gameView.value) {
            gameView.value = {
              ...gameView.value,
              currentPlayerIndex: message.currentPlayerIndex,
              discardPile: message.discardPile,
              ...(message.hand ? { hand: message.hand } : {}),
              ...(message.opponents ? { opponents: message.opponents } : {}),
            };
          }
          break;
        case 'face-down-result':
          if (gameView.value) {
            gameView.value = {
              ...gameView.value,
              currentPlayerIndex: message.currentPlayerIndex,
              discardPile: message.discardPile,
              ...(message.hand ? { hand: message.hand } : {}),
              ...(message.faceDownCount !== undefined ? { faceDownCount: message.faceDownCount } : {}),
              ...(message.opponents ? { opponents: message.opponents } : {}),
            };
          }
          break;
        case 'turn-changed':
          if (gameView.value) {
            gameView.value = {
              ...gameView.value,
              phase: 'playing',
              currentPlayerIndex: message.currentPlayerIndex,
            };
          }
          break;
        case 'player-eliminated':
          if (gameView.value) {
            gameView.value = {
              ...gameView.value,
              currentPlayerIndex: message.currentPlayerIndex,
            };
          }
          break;
        case 'game-over':
          if (gameView.value) {
            gameView.value = {
              ...gameView.value,
              phase: 'finished',
            };
          }
          break;
        case 'player-disconnected':
          // Another player disconnected — UI can show a banner/indicator
          // Store for potential UI use (Phase 10/11 will consume this)
          break;
        case 'player-reconnected':
          // Another player reconnected — UI can update indicator
          break;
        case 'player-removed':
          if (message.reason === 'host-left') {
            // Host left — room is destroyed. Clear stored state and navigate away.
            localStorage.removeItem('shithead-room-code');
            roomState.value = null;
            gameView.value = null;
            error.value = 'Host left — room closed';
          } else {
            // Another player was removed (timeout). Update opponent views if needed.
            // The server will send updated state via other messages.
          }
          break;
        case 'error':
          error.value = message.message;
          break;
      }

      // Call all registered handlers
      messageHandlers.forEach((handler) => handler(message));
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
      error.value = 'Invalid message received from server';
    }

    // Reset so identical consecutive messages still trigger the watch
    data.value = null;
  }));

  // Send typed message
  const send = (msg: ClientMessage) => {
    error.value = null; // Clear previous errors
    // Clear room code when deliberately leaving
    if (msg.type === 'leave-room') {
      localStorage.removeItem('shithead-room-code');
    }
    wsSend(JSON.stringify(msg));
  };

  // Register message handler
  const onMessage = (callback: MessageHandler) => {
    messageHandlers.push(callback);
    // Return unregister function
    return () => {
      const index = messageHandlers.indexOf(callback);
      if (index > -1) {
        messageHandlers.splice(index, 1);
      }
    };
  };

  return {
    status,
    lastMessage,
    error,
    playerId,
    roomState,
    send,
    onMessage,
    close,
    open,
    // Swap phase state
    gameView,
    swapTimeRemaining,
    readyPlayers,
    swapPhaseComplete,
    swapPhaseReason,
    // Turn timer state
    turnTimeRemaining,
    turnTimerPlayerIndex,
  };
}

/**
 * Game-specific WebSocket composable with typed message protocol.
 * Uses singleton pattern to ensure all components share the same connection.
 */
export function useGameSocket() {
  if (!socketInstance) {
    socketInstance = createGameSocket();
  }
  return socketInstance;
}
