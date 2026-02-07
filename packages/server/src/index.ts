import { APP_VERSION } from '@shit-head/shared';

type WebSocketData = {
  userId: string;
};

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

    // WebSocket upgrade endpoint (scaffold)
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req, {
        data: {
          userId: 'anonymous', // Placeholder - auth comes in Phase 2
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
      console.log('Client connected');
    },

    message(ws, message) {
      // Echo back for now (basic scaffold)
      ws.send(message);
    },

    close(ws) {
      console.log('Client disconnected');
    },
  },
});

console.log(`Server listening on port ${server.port}`);
