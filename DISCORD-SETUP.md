# Discord Activity Setup Guide

This guide helps you configure and test Shithead as a Discord Activity during local development.

## Overview

Discord Activities run inside an iframe within Discord, with all network traffic routed through Discord's proxy at `discordsays.com`. This architecture requires special proxy path handling:

- **Activities run in iframe**: Your app loads inside Discord's embedded frame
- **All traffic through discordsays.com**: Discord proxies all requests/WebSockets
- **/.proxy prefix**: Discord adds `/.proxy` prefix to all paths before forwarding to your app
- **Prefix stripping**: Your app (Vite dev server in local dev, reverse proxy in production) strips this prefix before routing to backend

This allows the same backend API and WebSocket code to work both standalone (web browser) and within Discord Activities.

## URL Mapping Rules

When your Activity makes a request, Discord transforms the URLs as follows:

| Client Path | Discord Proxy Path | Backend Path | Purpose |
|-------------|-------------------|--------------|---------|
| /api/* | /.proxy/api/* | /api/* | REST API calls |
| /game-ws | /.proxy/ws | /game-ws | WebSocket connection |

**How it works:**

1. **Client code** makes requests to `/api/rooms` or WebSocket to `/game-ws`
2. **Discord proxy** intercepts and adds `/.proxy` prefix: `/.proxy/api/rooms`, `/.proxy/ws`
3. **Vite dev server** (local) or Caddy (production) strips `/.proxy` prefix
4. **Backend** receives original paths: `/api/rooms`, `/game-ws`

The Vite proxy configuration (in `packages/client/vite.config.ts`) handles this prefix stripping during development. In production, the Caddy reverse proxy does the same.

## Local Development Setup

### Prerequisites

- Docker (for running dev environment and cloudflared tunnel)
- Discord account and Developer Portal access
- No local cloudflared install needed (runs via Docker image)

### Setup Steps

#### Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Shithead Game Dev")
4. Click "Create"

#### Step 2: Enable Activities

1. In your application settings, navigate to "Activities"
2. Enable the "Embedded App SDK" toggle
3. Save changes

#### Step 3: Start Local Development Environment

Run the Discord development environment:

```bash
make dev-discord
```

This starts:
- Vite dev server on port 5173 (with hot module reload)
- Backend WebSocket server on port 3000
- cloudflared tunnel pointing to Vite dev server

#### Step 4: Get Tunnel URL

After `make dev-discord` starts, look for cloudflared tunnel output:

```
tunnel-1  | 2026-02-16T21:00:00Z INF +--------------------------------------------------------------------------------------------+
tunnel-1  | 2026-02-16T21:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
tunnel-1  | 2026-02-16T21:00:00Z INF |  https://randomly-generated-subdomain.trycloudflare.com                                     |
tunnel-1  | 2026-02-16T21:00:00Z INF +--------------------------------------------------------------------------------------------+
```

Copy the tunnel URL (e.g., `https://randomly-generated-subdomain.trycloudflare.com`).

#### Step 5: Configure URL Mappings in Discord

1. In Discord Developer Portal, go to your application
2. Navigate to "Activities" → "URL Mappings"
3. Add the following mappings:

**Root mapping:**
- Prefix: `/`
- Target: `https://your-tunnel-url.trycloudflare.com`

**Proxy mapping:**
- Prefix: `/.proxy`
- Target: `https://your-tunnel-url.trycloudflare.com/.proxy`

Click "Save Changes".

#### Step 6: Launch Activity from Discord

1. Open Discord desktop/web app
2. Join any voice channel or DM
3. Click the Activities button (rocket icon)
4. Click "Build an Activity" or find your app in the list
5. Select your application to launch

The Activity should load in the Discord iframe, with full API and WebSocket connectivity through the `/.proxy` paths.

## Manual Testing Checklist

After launching the Activity in Discord, verify the following:

- [ ] **Tunnel starts successfully**
  - `make dev-discord` shows cloudflared tunnel URL in terminal
  - No connection errors in cloudflared output

- [ ] **Activity launches in Discord**
  - Activity iframe loads inside Discord
  - No 404 or connection refused errors

- [ ] **WebSocket connects**
  - WebSocket connects through `/.proxy/ws` path
  - Check browser DevTools Network tab for WebSocket upgrade (status 101)
  - No "WebSocket connection failed" errors

- [ ] **Player can create room**
  - Enter nickname in UI
  - Click "Create Room"
  - Room code appears (4-character code)

- [ ] **Second player can join**
  - Open Activity in second Discord client (different account or browser)
  - Enter room code
  - Join room successfully

- [ ] **Both players see lobby**
  - Both clients show "Waiting for players..." lobby
  - Player list shows both players

- [ ] **Host can start game**
  - Host sees "Start Game" button
  - Click "Start Game"
  - Game state transitions to "playing"

- [ ] **Game starts successfully**
  - Cards are dealt to both players
  - Players can see their hands
  - Game UI renders correctly

- [ ] **Connection resilience**
  - Close Discord Activity and reopen
  - "Reconnecting..." overlay appears briefly
  - Player rejoins same room automatically
  - Game state persists (same cards, same turn)

## Production Deployment Checklist

When deploying to production:

- [ ] **Configure Production URL Mappings**
  - Update Discord Developer Portal URL mappings to point to production domain
  - Use HTTPS production URL (required for Discord Activities)
  - Keep same prefix structure: `/` and `/.proxy`

- [ ] **Configure ALLOWED_ORIGINS**
  - Ensure `ALLOWED_ORIGINS` environment variable includes production domain
  - Should include `discordsays.com` (automatic via hostname check in server)

- [ ] **Configure Reverse Proxy**
  - Caddy or nginx must forward `/.proxy/*` paths with prefix stripped
  - Example Caddy config: `handle_path /.proxy/* { reverse_proxy backend:3000 }`
  - Verify WebSocket upgrade support in proxy configuration

- [ ] **Test WebSocket Upgrade**
  - Deploy to production
  - Launch Activity from Discord
  - Check WebSocket connects through production proxy
  - Monitor server logs for WebSocket upgrade requests

- [ ] **Verify HTTPS**
  - Discord Activities require HTTPS
  - Ensure SSL certificate is valid and active
  - Test Activity loads without mixed content warnings

## Troubleshooting

### WebSocket upgrade rejected

**Error:** WebSocket connection fails with 403 or connection refused

**Solution:**
- Check `ALLOWED_ORIGINS` includes `discordsays.com`
- Server automatically allows origins matching its hostname
- Verify server logs show WebSocket upgrade attempts
- Confirm `/.proxy/ws` path is being routed correctly

### Connection refused through proxy

**Error:** Discord Activity can't reach backend

**Solution:**
- Verify tunnel URL matches Discord URL Mapping exactly
- Check cloudflared tunnel is running: `docker compose -f docker-compose.discord.yml ps`
- Restart tunnel if stale: `make dev-discord-down && make dev-discord`
- Copy the NEW tunnel URL (cloudflared generates new URL on each restart)

### HMR (Hot Module Reload) not working through tunnel

**Symptom:** Code changes don't auto-refresh in Discord Activity

**Explanation:**
- HMR uses `/__hmr` WebSocket path
- This path may not route through Discord's `/.proxy` prefix
- This is expected behavior for Discord Activity development

**Workaround:**
- Manually refresh the Activity after code changes
- Or develop in standalone browser first (run `make dev`), then test in Discord

### Activity loads but game won't start

**Check:**
- Browser DevTools Console for errors
- Network tab for failed API requests
- Ensure `/.proxy/api/*` paths are reaching backend
- Verify backend logs show API requests

### Players can't join each other's rooms

**Check:**
- Both players using same Discord application (same URL mappings)
- Room codes are case-sensitive and 4 characters
- WebSocket connection successful for both players (check DevTools Network tab)
- Server logs show both players' WebSocket connections

---

**Need more help?** Check the project README or consult [Discord Developer Docs](https://discord.com/developers/docs/activities/overview).
