---
status: complete
phase: 18-discord-authentication
source: 18-01-SUMMARY.md, 18-02-SUMMARY.md, 18-03-SUMMARY.md
started: 2026-02-17T23:30:00Z
updated: 2026-02-17T23:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Web Mode Regression
expected: Standalone web app loads normally in browser. Lobby, nickname entry, room creation all work. No console errors related to platform or Discord detection.
result: issue
reported: "Vite pre-transform error: Failed to resolve import @discord/embedded-app-sdk from DiscordAuthAdapter.ts. The barrel export eagerly imports Discord adapters even in web mode, causing failures when SDK is not installed in Docker container."
severity: blocker

### 2. Token Exchange Endpoint Exists
expected: With the server running, a POST to /api/token without a code returns a 400 error (not 404). This confirms the endpoint was registered.
result: issue
reported: "Server crashes with SyntaxError: Unexpected end of JSON input when POST has no body. Endpoint tries req.json() without try/catch around the parse, causing unhandled error instead of 400 response."
severity: major

### 3. Environment Documentation
expected: .env.example files exist in both packages/server/ and packages/client/ with Discord credential placeholders (DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, VITE_DISCORD_CLIENT_ID).
result: pass

### 4. Production Build With Discord SDK
expected: Running `make build` completes successfully. The Vite build includes @discord/embedded-app-sdk without errors. Output should mention ~143+ modules transformed.
result: issue
reported: "Same Vite pre-transform error as Test 1 — Failed to resolve import @discord/embedded-app-sdk. Docker container doesn't have the SDK installed."
severity: blocker

### 5. Discord Adapter Wiring (No Throw)
expected: In packages/client/src/main.ts, the Discord platform branch should instantiate adapters instead of throwing an error. No "not implemented" throw should remain.
result: pass

## Summary

total: 5
passed: 2
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Standalone web app loads normally without Discord SDK errors"
  status: failed
  reason: "User reported: Vite pre-transform error: Failed to resolve import @discord/embedded-app-sdk from DiscordAuthAdapter.ts. The barrel export eagerly imports Discord adapters even in web mode, causing failures when SDK is not installed in Docker container."
  severity: blocker
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "POST /api/token without code returns 400 error, not crash"
  status: failed
  reason: "User reported: Server crashes with SyntaxError: Unexpected end of JSON input when POST has no body. Endpoint tries req.json() without try/catch around the parse."
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Production build completes successfully with Discord SDK"
  status: failed
  reason: "User reported: Same Vite pre-transform error as Test 1 — Failed to resolve import @discord/embedded-app-sdk. Docker container doesn't have the SDK installed."
  severity: blocker
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
