---
status: diagnosed
phase: 14-ngrok-local-dev-sharing
source: 14-01-SUMMARY.md
started: 2026-02-08T23:00:00Z
updated: 2026-02-08T23:08:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Dev server starts with WebSocket proxy
expected: Run `make dev`. Vite client starts on localhost:5173, server on localhost:3000. Opening localhost:5173 in browser loads the game landing page.
result: issue
reported: "fail the make dev starts the page loads but the websocket is stuck at pending"
severity: major

### 2. WebSocket connects through Vite proxy
expected: On localhost:5173, create a room. The WebSocket connection goes through Vite's /game-ws proxy to the server. Room is created and you get a room code.
result: issue
reported: "Fail cannot make a lobby 'Connecting to server...' is displayed"
severity: major

### 3. Makefile tunnel target exists
expected: Run `make tunnel` (with `make dev` already running in another terminal). Ngrok starts and shows a public https:// URL pointing to localhost:5173.
result: issue
reported: "make tunnel starts but when visiting the url there is an error Blocked request. This host is not allowed. To allow this host, add it to server.allowedHosts in vite.config.js."
severity: major

### 4. Game loads via ngrok URL
expected: Open the ngrok https URL in a browser (desktop or mobile). The game landing page loads. You can create/join a room and the WebSocket connection works through the tunnel.
result: issue
reported: "fail on the ngrok link see this error Blocked request. This host is not allowed. To allow this host, add it to server.allowedHosts in vite.config.js."
severity: major

## Summary

total: 4
passed: 0
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Dev server starts and WebSocket connects on localhost:5173"
  status: failed
  reason: "User reported: fail the make dev starts the page loads but the websocket is stuck at pending"
  severity: major
  test: 1
  root_cause: "Vite WebSocket proxy missing changeOrigin: true flag — Host header mismatch causes WebSocket handshake to hang"
  artifacts:
    - path: "packages/client/vite.config.ts"
      issue: "Proxy config for /game-ws missing changeOrigin: true"
  missing:
    - "Add changeOrigin: true to /game-ws proxy config"
  debug_session: ".planning/debug/14-websocket-pending.md"
- truth: "WebSocket connects through Vite proxy, room can be created"
  status: failed
  reason: "User reported: Fail cannot make a lobby 'Connecting to server...' is displayed"
  severity: major
  test: 2
  root_cause: "Same root cause as test 1 — WebSocket proxy missing changeOrigin: true"
  artifacts:
    - path: "packages/client/vite.config.ts"
      issue: "Proxy config for /game-ws missing changeOrigin: true"
  missing:
    - "Add changeOrigin: true to /game-ws proxy config"
  debug_session: ".planning/debug/14-websocket-pending.md"
- truth: "Ngrok tunnel URL loads the game landing page"
  status: failed
  reason: "User reported: make tunnel starts but when visiting the url there is an error Blocked request. This host is not allowed."
  severity: major
  test: 3
  root_cause: "Vite enforces hostname validation by default — missing server.allowedHosts configuration blocks ngrok hostnames"
  artifacts:
    - path: "packages/client/vite.config.ts"
      issue: "Missing server.allowedHosts: true in server config"
  missing:
    - "Add allowedHosts: true to server config"
  debug_session: ".planning/debug/14-ngrok-blocked-host.md"
- truth: "Game loads via ngrok URL with working WebSocket"
  status: failed
  reason: "User reported: fail on the ngrok link see this error Blocked request. This host is not allowed."
  severity: major
  test: 4
  root_cause: "Same root cause as test 3 — missing server.allowedHosts configuration"
  artifacts:
    - path: "packages/client/vite.config.ts"
      issue: "Missing server.allowedHosts: true in server config"
  missing:
    - "Add allowedHosts: true to server config"
  debug_session: ".planning/debug/14-ngrok-blocked-host.md"
