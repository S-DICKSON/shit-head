import { ref, watch, effectScope } from 'vue';
import { useWebSocket } from '@vueuse/core';
import type { ClientMessage, ServerMessage, RoomState, PlayerGameView, Card, OpponentView } from '@shit-head/shared';

// Singleton state to share socket across all components
let socketInstance: ReturnType<typeof createGameSocket> | null = null;

type MessageHandler = (msg: ServerMessage) => void;

/**
 * Resolve the WebSocket URL based on current context.
 * Exported for testing.
 */
export function resolveWebSocketUrl(
  hostname: string,
  protocol: string,
  host: string,
  serverUrl?: string,
): string {
  if (serverUrl) {
    return `${serverUrl}/game-ws`;
  }
  if (hostname.endsWith('.discordsays.com')) {
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${host}/.proxy/ws`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `ws://${hostname}:3000/game-ws`;
  }
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}/game-ws`;
}

function createGameSocket() {
  // Detached scope so the WebSocket survives component unmounts
  const scope = effectScope(true);

  // Check for existing playerId from previous session
  const storedPlayerId = localStorage.getItem('shithead-player-id');
  const storedRoomCode = localStorage.getItem('shithead-room-code');

  // Determine WebSocket URL:
  // 1. VITE_SERVER_URL (production split deployment — e.g., wss://shit-head-server.fly.dev)
  // 2. Discord Activity: route through Discord's proxy (*.discordsays.com)
  // 3. localhost: connect directly to server on port 3000 (bypasses Vite proxy)
  // 4. tunnel/non-localhost: use proxy path through current host (ngrok, etc.)
  const serverUrl = import.meta.env.VITE_SERVER_URL;

  let wsUrl = resolveWebSocketUrl(
    window.location.hostname,
    window.location.protocol,
    window.location.host,
    serverUrl || undefined,
  );

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

  // Connection state for UI feedback
  type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'failed';
  const connectionState = ref<ConnectionState>('connecting');

  interface ConnectionError {
    message: string;
    code: string;
    timestamp: number;
    retryCount: number;
  }
  const connectionError = ref<ConnectionError | null>(null);

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

  // Burn animation state
  const burnTriggered = ref<boolean>(false);

  // Game-over state
  const shitheadNickname = ref<string | null>(null);

  // Spectator state
  const isSpectator = ref<boolean>(false);
  const spectatorCount = ref<number>(0);
  const spectatorGameView = ref<{ discardPile: Card[]; opponents: OpponentView[]; drawPileCount: number; currentPlayerIndex: number } | null>(null);

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
        delay: (retryCount) => {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s (~31s total)
          const baseDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 16000);
          // Add +/- 10% jitter to prevent thundering herd
          const jitter = baseDelay * 0.1 * (Math.random() - 0.5);
          return Math.round(baseDelay + jitter);
        },
        onFailed() {
          connectionState.value = 'failed';
          connectionError.value = {
            message: 'Unable to connect to server after multiple attempts',
            code: 'CONNECTION_FAILED',
            timestamp: Date.now(),
            retryCount: 5,
          };
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
    if (newStatus === 'OPEN') {
      connectionState.value = 'connected';
      connectionError.value = null;
      if (storedPlayerId && storedRoomCode) {
        // Track reconnection state
        reconnecting.value = true;
        reconnectTarget.value = { roomCode: storedRoomCode };
        // Send reconnect message to rejoin room
        wsSend(JSON.stringify({ type: 'reconnect', roomCode: storedRoomCode }));
      }
    } else if (newStatus === 'CLOSED') {
      // Only set reconnecting if we were previously connected
      if (connectionState.value === 'connected') {
        connectionState.value = 'reconnecting';
      }
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
            // Detect burn: pile was non-empty but incoming pile is empty
            if (gameView.value.discardPile.length > 0 && message.discardPile.length === 0) {
              burnTriggered.value = true;
              setTimeout(() => { burnTriggered.value = false; }, 1500);
            }
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
          shitheadNickname.value = message.shitheadNickname;
          if (gameView.value) {
            gameView.value = {
              ...gameView.value,
              phase: 'finished',
            };
          }
          break;
        case 'spectator-state':
          playerId.value = message.playerId;
          roomState.value = message.room;
          isSpectator.value = true;
          spectatorGameView.value = {
            discardPile: message.discardPile,
            opponents: message.opponents,
            drawPileCount: message.drawPileCount,
            currentPlayerIndex: message.currentPlayerIndex,
          };
          break;
        case 'spectator-count':
          spectatorCount.value = message.count;
          break;
        case 'return-to-lobby':
          // Reset game state — we're back in lobby
          gameView.value = null;
          shitheadNickname.value = null;
          swapPhaseComplete.value = false;
          swapPhaseReason.value = null;
          readyPlayers.value = [];
          burnTriggered.value = false;
          turnTimeRemaining.value = 45;
          turnTimerPlayerIndex.value = -1;
          // Clear spectator state on return to lobby
          isSpectator.value = false;
          spectatorGameView.value = null;
          spectatorCount.value = 0;
          // Update room state with the reset room
          roomState.value = message.room;
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

  // Manual retry function
  const retryConnection = () => {
    connectionState.value = 'reconnecting';
    connectionError.value = null;
    close();
    // Small delay to ensure clean close before reopening
    setTimeout(() => open(), 100);
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
    // Burn animation state
    burnTriggered,
    // Reconnection state
    reconnecting,
    reconnectTarget,
    // Connection state
    connectionState,
    connectionError,
    retryConnection,
    // Notification state
    notifications,
    addNotification,
    dismissNotification,
    // Game-over state
    shitheadNickname,
    // Spectator state
    isSpectator,
    spectatorCount,
    spectatorGameView,
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
