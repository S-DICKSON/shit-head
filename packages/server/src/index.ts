import { APP_VERSION } from '@shit-head/shared';
import { handleMessage, handleClose, handleOpen, roomManager } from './websocket/handlers';
import type { WebSocketData } from './websocket/handlers';
import { nanoid } from 'nanoid';
import type { ServerWebSocket } from 'bun';
import { join } from 'path';
import { isOriginAllowed } from './utils/originValidation';

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


// Static file serving: check if client dist exists (tunnel/production single-origin mode)
const clientDistPath = join(import.meta.dir, '../../client/dist');
const indexHtml = Bun.file(join(clientDistPath, 'index.html'));
const serveStaticFiles = await indexHtml.exists();

// Connection tracking for graceful shutdown
const activeConnections = new Set<ServerWebSocket<WebSocketData>>();

const server = Bun.serve<WebSocketData>({
  port: Number(process.env.PORT) || 3000,

  async fetch(req, server) {
    const url = new URL(req.url);
    // Strip Discord Activity /.proxy prefix (Discord adds this for all proxied requests)
    let pathname = url.pathname;
    if (pathname.startsWith('/.proxy/')) {
      pathname = pathname.replace(/^\/.proxy/, '');
      if (pathname === '/ws') pathname = '/game-ws';
    }

    // Health check endpoint with metrics
    if (pathname === '/health') {
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

    // Discord OAuth2 token exchange endpoint
    // Exchanges authorization code for access token using server-side client secret
    if (pathname === '/api/token' && req.method === 'POST') {
      try {
        let body: { code?: string; code_verifier?: string };
        try {
          body = await req.json() as { code?: string; code_verifier?: string };
        } catch (e) {
          if (e instanceof SyntaxError) {
            return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          throw e;
        }

        if (!body.code) {
          return new Response(JSON.stringify({ error: 'Missing code' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const discordClientId = process.env.DISCORD_CLIENT_ID;
        const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;

        if (!discordClientId || !discordClientSecret) {
          console.error('Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET env vars');
          return new Response(JSON.stringify({ error: 'Server configuration error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Build token exchange params — use PKCE code_verifier if provided
        const tokenParams: Record<string, string> = {
          client_id: discordClientId,
          client_secret: discordClientSecret,
          grant_type: 'authorization_code',
          code: body.code,
          redirect_uri: 'https://127.0.0.1',
        };
        if (body.code_verifier) {
          tokenParams.code_verifier = body.code_verifier;
        }

        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(tokenParams),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error(`Discord token exchange failed: ${tokenResponse.status} ${errorText}`);
          return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
            status: tokenResponse.status,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { access_token } = await tokenResponse.json() as { access_token: string };

        return new Response(JSON.stringify({ access_token }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Token exchange error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // WebSocket upgrade endpoint with Origin validation
    // /game-ws = web client, /ws = Discord Activity (Discord strips /.proxy prefix)
    if (pathname === '/game-ws' || pathname === '/ws') {
      const origin = req.headers.get('Origin');

      // Validate origin in production (skip when serving static files — same-origin tunnel mode)
      if (NODE_ENV === 'production' && !serveStaticFiles) {
        if (!isOriginAllowed(origin, ALLOWED_ORIGINS)) {
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

    // Serve static files from client/dist if available (tunnel/production single-origin)
    if (serveStaticFiles) {
      const filePath = join(clientDistPath, url.pathname === '/' ? 'index.html' : url.pathname);
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file);
      }
      // SPA fallback: serve index.html for client-side routes
      return new Response(indexHtml);
    }

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
console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}, *.discordsays.com`);

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
