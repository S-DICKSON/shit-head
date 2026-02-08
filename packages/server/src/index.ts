import { APP_VERSION } from '@shit-head/shared';
import { handleMessage, handleClose, handleOpen, roomManager } from './websocket/handlers';
import type { WebSocketData } from './websocket/handlers';
import { nanoid } from 'nanoid';
import { join } from 'path';

// Static file serving for tunnel/production mode
const STATIC_DIR = join(import.meta.dir, '../../client/dist');
const serveStatic = await Bun.file(join(STATIC_DIR, 'index.html')).exists();
if (serveStatic) {
  console.log(`Serving static files from ${STATIC_DIR}`);
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getMimeType(path: string): string {
  const ext = path.slice(path.lastIndexOf('.'));
  return MIME_TYPES[ext] || 'application/octet-stream';
}

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

    // Serve static files when client build exists (tunnel/production mode)
    if (serveStatic) {
      const filePath = join(STATIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
      const file = Bun.file(filePath);
      // Synchronous exists check via size (avoids async in fetch handler)
      if (file.size > 0) {
        return new Response(file, {
          headers: { 'Content-Type': getMimeType(filePath) },
        });
      }
      // SPA fallback: serve index.html for client-side routes
      return new Response(Bun.file(join(STATIC_DIR, 'index.html')), {
        headers: { 'Content-Type': 'text/html' },
      });
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
