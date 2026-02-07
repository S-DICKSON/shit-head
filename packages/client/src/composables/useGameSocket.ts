import { ref, watch, type Ref } from 'vue';
import { useWebSocket } from '@vueuse/core';
import type { ClientMessage, ServerMessage, RoomState } from '@shit-head/shared';

// Singleton state to share socket across all components
let socketInstance: ReturnType<typeof createGameSocket> | null = null;

type MessageHandler = (msg: ServerMessage) => void;

function createGameSocket() {
  // Determine WebSocket URL dynamically based on environment
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  // Reactive state
  const playerId = ref<string | null>(null);
  const roomState = ref<RoomState | null>(null);
  const lastMessage = ref<ServerMessage | null>(null);
  const error = ref<string | null>(null);
  const messageHandlers: MessageHandler[] = [];

  // Setup WebSocket with VueUse
  const { status, data, send: wsSend, close, open } = useWebSocket(wsUrl, {
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
  });

  // Watch for incoming messages
  watch(data, (rawData) => {
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
  });

  // Send typed message
  const send = (msg: ClientMessage) => {
    error.value = null; // Clear previous errors
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
