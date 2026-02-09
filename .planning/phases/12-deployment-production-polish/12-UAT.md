---
status: complete
phase: 12-deployment-production-polish
source: 12-01-SUMMARY.md, 12-02-SUMMARY.md, 12-03-SUMMARY.md
started: 2026-02-09T12:00:00Z
updated: 2026-02-09T12:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Health endpoint returns metrics
expected: Run `make dev` and visit `http://localhost:3000/health`. JSON response shows `activeRooms`, `activePlayers`, `activeConnections` fields.
result: pass

### 2. Non-health/non-WebSocket paths return 404
expected: Visit any random path like `http://localhost:3000/foo` in your browser. Should get a 404 response (not a static file or HTML page).
result: pass

### 3. WebSocket connection still works in local dev
expected: Open `http://localhost:5173` in your browser. Create a room. The room should be created successfully, confirming WebSocket connectivity through the Vite proxy still works.
result: pass

### 4. Health metrics update with active room
expected: After creating a room (from test 3), visit `http://localhost:3000/health` again. `activeRooms` should be 1 and `activePlayers` should be 1 (or more if you joined with another tab).
result: pass

### 5. Fly.io configuration exists
expected: Check that `fly.toml` exists in the project root. It should contain `internal_port = 8080` and `auto_stop_machines = false`.
result: pass

### 6. Deploy workflow exists
expected: Check `.github/workflows/deploy.yml` exists. It should have three jobs: `build-push-server`, `deploy-client`, `deploy-server`.
result: pass

### 7. Rollback workflow exists
expected: Check `.github/workflows/rollback.yml` exists with a `workflow_dispatch` trigger that accepts a `target_sha` input.
result: pass

### 8. OpenTofu config uses Fly.io + Cloudflare providers
expected: Check `infra/opentofu/main.tf`. It should reference `fly-apps/fly` and `cloudflare/cloudflare` providers (not Render).
result: pass

### 9. Server Dockerfile targets port 8080
expected: Check `packages/server/Dockerfile`. The production stage should have `EXPOSE 8080` and `ENV PORT=8080`.
result: pass

### 10. Client WebSocket URL supports VITE_SERVER_URL
expected: Check `packages/client/src/composables/useGameSocket.ts`. It should check for `import.meta.env.VITE_SERVER_URL` and use it to construct the WebSocket URL when present.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
