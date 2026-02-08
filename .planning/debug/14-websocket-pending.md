---
status: diagnosed
trigger: "Investigate why WebSocket is stuck at 'pending' when running `make dev` on localhost:5173."
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - VITE_WS_URL is undefined, causing client to construct /game-ws URL, but Vite proxy requires full WebSocket URL
test: Analyzed Vite config proxy setup and client WebSocket URL construction
expecting: Proxy configuration needs rewrite or client needs to use direct server URL
next_action: Document root cause and affected files

## Symptoms

expected: WebSocket connects successfully, UI shows connected state, can create lobbies
actual: WebSocket stuck at "pending", UI shows "Connecting to server...", cannot create lobbies
errors: None reported (connection just hangs)
reproduction: Run `make dev`, open localhost:5173, observe WebSocket in Network tab
started: After Phase 14 changes (added Vite WebSocket proxy for /game-ws path, removed VITE_WS_URL)

## Eliminated

## Evidence

- timestamp: 2026-02-08T00:05:00Z
  checked: packages/client/vite.config.ts
  found: Vite proxy configured for '/game-ws' with target 'ws://localhost:3000' and ws:true
  implication: Vite expects client to connect to /game-ws path, then proxies to backend

- timestamp: 2026-02-08T00:06:00Z
  checked: packages/client/src/composables/useGameSocket.ts line 19-22
  found: `const serverUrl = import.meta.env.VITE_WS_URL;` then constructs wsUrl as `ws://localhost:5173/game-ws` when VITE_WS_URL is undefined
  implication: Client correctly tries to connect to /game-ws on localhost:5173 (the Vite dev server)

- timestamp: 2026-02-08T00:07:00Z
  checked: docker-compose.yml line 17
  found: VITE_WS_URL environment variable was removed, only VITE_SERVER_URL=http://server:3000 remains
  implication: VITE_WS_URL is undefined in local dev, so client uses fallback logic

- timestamp: 2026-02-08T00:08:00Z
  checked: packages/server/src/index.ts line 27
  found: Server listens for WebSocket upgrades on '/game-ws' path
  implication: Server path is correct

- timestamp: 2026-02-08T00:09:00Z
  checked: Vite proxy configuration documentation (mental model)
  found: Vite proxy with ws:true expects to proxy WebSocket connections, but the target needs to be the WebSocket endpoint URL
  implication: The proxy config in vite.config.ts has a critical flaw - it's trying to proxy '/game-ws' to 'ws://localhost:3000/game-ws', but the proxy itself is using the wrong approach

- timestamp: 2026-02-08T00:10:00Z
  checked: Makefile line 9 and docker-compose.yml
  found: `make dev` runs Docker Compose. Client container has VITE_SERVER_URL=http://server:3000. User accesses via localhost:5173 from host machine.
  implication: When accessing from host (localhost:5173), VITE_SERVER_URL is set to 'http://server:3000' in the Vite config at BUILD time (process.env.VITE_SERVER_URL), but 'server' hostname doesn't resolve from the browser (it's a Docker internal hostname)

- timestamp: 2026-02-08T00:11:00Z
  checked: vite.config.ts line 5 and proxy config lines 18-21
  found: `const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:3000'` is used for the proxy target. The proxy target becomes 'ws://server:3000' when run in Docker.
  implication: The Vite proxy target is 'ws://server:3000' which should work for Docker-to-Docker communication.

- timestamp: 2026-02-08T00:12:00Z
  checked: Vite proxy behavior with WebSocket paths
  found: When proxying '/game-ws' with target 'ws://server:3000', Vite should forward requests from ws://localhost:5173/game-ws to ws://server:3000/game-ws (preserving the path by default)
  implication: The proxy config SHOULD work. Need to identify actual issue.

- timestamp: 2026-02-08T00:13:00Z
  checked: vite.config.ts proxy configuration structure
  found: The proxy is configured as a simple object with target and ws:true. No rewrite rules, no changeOrigin flag.
  implication: ACTUAL ROOT CAUSE - Vite WebSocket proxy requires `changeOrigin: true` when proxying to a different host. Without it, the WebSocket handshake fails because the Host header doesn't match.

## Resolution

root_cause: Vite WebSocket proxy missing `changeOrigin: true` flag. When the client browser connects to ws://localhost:5173/game-ws, Vite's dev server attempts to proxy this to ws://server:3000/game-ws (the backend server in Docker). However, without the `changeOrigin` flag, the WebSocket upgrade request includes the original Host header (localhost:5173) which doesn't match the target server's expected host. This causes the WebSocket handshake to fail or hang. The `changeOrigin` flag tells Vite to rewrite the Host header to match the target.

fix: Add `changeOrigin: true` to the Vite proxy configuration for '/game-ws' in vite.config.ts. The correct configuration should be:
```typescript
'/game-ws': {
  target: serverUrl.replace('http', 'ws'),
  ws: true,
  changeOrigin: true,
}
```

verification: Run `make dev`, open browser to localhost:5173, verify WebSocket connects successfully in Network tab (status 101 Switching Protocols), verify "Connecting to server..." changes to connected state, verify can create lobby.

files_changed: ['packages/client/vite.config.ts']
