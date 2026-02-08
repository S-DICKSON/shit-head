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

  // Determine WebSocket URL:
  // - VITE_WS_URL override if set
  // - localhost: connect directly to server on port 3000 (bypasses Vite proxy)
  // - tunnel/production: use proxy path through current host
  const serverUrl = import.meta.env.VITE_WS_URL;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let wsUrl = serverUrl
    ? serverUrl
    : isLocalhost
      ? `ws://${window.location.hostname}:3000/game-ws`
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

  // Reconnection state tracking
  const reconnecting = ref<boolean>(false);
  const reconnectTarget = ref<{ roomCode: string } | null>(null);

  // Swap phase state
  const gameView = ref<PlayerGameView | null>(null);
  const swapTimeRemaining = ref<number>(30);
  const readyPlayers = ref<string[]>([]);
  const swapPhaseComplete = ref<boolean>(false);
  const swapPhaseReason = ref<'timer-expired' | 'all-ready' | null>(null);

  // Turn timer state
  const turnTimeRemaining = ref<number>(45);
  const turnTimerPlayerIndex = ref<number>(-1);

  // Notification state
  interface GameNotification {
    id: number;
    message: string;
    severity: 'info' | 'warning' | 'success' | 'error';
    timestamp: number;
  }

  let notificationId = 0;
  const notifications = ref<GameNotification[]>([]);

  const addNotification = (message: string, severity: GameNotification['severity']) => {
    notifications.value.push({
      id: ++notificationId,
      message,
      severity,
      timestamp: Date.now(),
    });
  };

  const dismissNotification = (id: number) => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  };

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
      // Track reconnection state
      reconnecting.value = true;
      reconnectTarget.value = { roomCode: storedRoomCode };
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
          // Clear reconnecting state on successful join/reconnect
          reconnecting.value = false;
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
              ...(message.faceUp ? { faceUp: message.faceUp } : {}),
              ...(message.faceDownCount !== undefined ? { faceDownCount: message.faceDownCount } : {}),
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
              ...(message.faceUp ? { faceUp: message.faceUp } : {}),
              ...(message.faceDownCount !== undefined ? { faceDownCount: message.faceDownCount } : {}),
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
          addNotification(`${message.nickname} disconnected`, 'warning');
          break;
        case 'player-reconnected':
          addNotification(`${message.nickname} reconnected`, 'success');
          break;
        case 'player-removed':
          if (message.reason === 'host-left') {
            // Show notification BEFORE clearing state so user sees it
            addNotification('Host left — room closing', 'error');
            // Short delay so user sees the notification before redirect
            setTimeout(() => {
              localStorage.removeItem('shithead-room-code');
              roomState.value = null;
              gameView.value = null;
            }, 1500);
          } else {
            addNotification(`${message.nickname} was removed (timed out)`, 'warning');
          }
          break;
        case 'error':
          error.value = message.message;
          // Clear localStorage on reconnect failure
          if (reconnecting.value && (message.code === 'PLAYER_NOT_FOUND' || message.code === 'ROOM_NOT_FOUND')) {
            localStorage.removeItem('shithead-player-id');
            localStorage.removeItem('shithead-room-code');
            reconnecting.value = false;
            reconnectTarget.value = null;
          }
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
    // Reconnection state
    reconnecting,
    reconnectTarget,
    // Notification state
    notifications,
    addNotification,
    dismissNotification,
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
