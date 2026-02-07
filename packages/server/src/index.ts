import { APP_VERSION } from '@shit-head/shared';
import { handleMessage, handleClose, handleOpen, roomManager } from './websocket/handlers';
import type { WebSocketData } from './websocket/handlers';
import { nanoid } from 'nanoid';

const server = Bun.serve<WebSocketData>({
  port: Number(process.env.PORT) || 3000,

  fetch(req, server) {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          version: APP_VERSION,
          uptime: process.uptime(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // WebSocket upgrade endpoint
    if (url.pathname === '/game-ws') {
      // TODO: Production - validate Origin header against ALLOWED_ORIGIN env var
      const origin = req.headers.get('Origin');
      console.log(`WebSocket upgrade request from origin: ${origin}`);

      const upgraded = server.upgrade(req, {
        data: {
          playerId: nanoid(),
          roomCode: null,
        },
      });

      if (upgraded) {
        return undefined; // Connection upgraded
      }

      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    // Default 404
    return new Response('Not Found', { status: 404 });
  },

  websocket: {
    open(ws) {
      console.log(`Player ${ws.data.playerId} connected`);
      handleOpen(ws);
    },

    message(ws, message) {
      const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);
      handleMessage(ws, msgStr, roomManager);
    },

    close(ws) {
      handleClose(ws, roomManager);
      console.log(`Player ${ws.data.playerId} disconnected`);
    },
  },
});

console.log(`Server listening on port ${server.port}`);
