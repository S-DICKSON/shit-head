import { APP_VERSION } from '@shit-head/shared';
import { handleMessage, handleClose, handleOpen, roomManager } from './websocket/handlers';
import type { WebSocketData } from './websocket/handlers';
import { nanoid } from 'nanoid';
import type { ServerWebSocket } from 'bun';

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';

// Parse allowed origins from env (comma-separated)
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const ALLOWED_ORIGINS = rawOrigins
  ? rawOrigins.split(',').map(o => o.trim())
  : [];

// In development, allow localhost origins
if (NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:4173');
}

// Connection tracking for graceful shutdown
const activeConnections = new Set<ServerWebSocket<WebSocketData>>();

const server = Bun.serve<WebSocketData>({
  port: Number(process.env.PORT) || 3000,

  fetch(req, server) {
    const url = new URL(req.url);

    // Health check endpoint with metrics
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          version: APP_VERSION,
          uptime: process.uptime(),
          activeRooms: roomManager.getRoomCount(),
          activePlayers: roomManager.getPlayerCount(),
          activeConnections: activeConnections.size,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // WebSocket upgrade endpoint with Origin validation
    if (url.pathname === '/game-ws') {
      const origin = req.headers.get('Origin');

      // Validate origin in production
      if (NODE_ENV === 'production') {
        if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
          console.warn(`WebSocket upgrade rejected - invalid origin: ${origin}`);
          return new Response('Forbidden', { status: 403 });
        }
      }

      console.log(`WebSocket upgrade request from origin: ${origin}`);

      // Check for reconnection playerId in query params
      const reconnectPlayerId = url.searchParams.get('playerId');

      const upgraded = server.upgrade(req, {
        data: {
          playerId: reconnectPlayerId || nanoid(),
          roomCode: null,
        },
      });

      if (upgraded) {
        return undefined; // Connection upgraded
      }

      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    // No static file serving in split deployment - return 404
    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) {
      activeConnections.add(ws);
      console.log(`Player ${ws.data.playerId} connected`);
      handleOpen(ws);
    },

    message(ws, message) {
      const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
      handleMessage(ws, msgStr, roomManager);
    },

    close(ws) {
      activeConnections.delete(ws);
      handleClose(ws, roomManager);
      console.log(`Player ${ws.data.playerId} disconnected`);
    },
  },
});

console.log(`Server listening on port ${server.port}`);
console.log(`Environment: ${NODE_ENV}`);
console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');

  // Stop accepting new connections
  server.stop();

  // Close all active WebSocket connections
  for (const ws of activeConnections) {
    ws.close(1000, 'Server shutting down');
  }

  // Wait up to 55 seconds for connections to close
  const shutdownTimeout = 55000;
  const startTime = Date.now();

  while (activeConnections.size > 0 && Date.now() - startTime < shutdownTimeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (activeConnections.size > 0) {
    console.warn(`Shutdown timeout: ${activeConnections.size} connections still active`);
  } else {
    console.log('All connections closed gracefully');
  }

  process.exit(0);
});
