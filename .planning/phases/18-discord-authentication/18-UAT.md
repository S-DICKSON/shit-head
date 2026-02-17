---
status: diagnosed
phase: 18-discord-authentication
source: 18-01-SUMMARY.md, 18-02-SUMMARY.md, 18-03-SUMMARY.md
started: 2026-02-17T23:30:00Z
updated: 2026-02-17T23:40:00Z
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
  root_cause: "Barrel export in platform/index.ts unconditionally re-exports Discord adapter classes (lines 29-31), and main.ts statically imports them (lines 14-16). ES module imports are resolved at parse time, so Vite pre-transforms @discord/embedded-app-sdk even in web mode. Additionally, Dockerfile copies bun.lockb* but repo has bun.lock (text format), so lockfile is silently omitted."
  artifacts:
    - path: "packages/client/src/platform/index.ts"
      issue: "Lines 29-31 eagerly re-export Discord adapter classes, causing static import chain to @discord/embedded-app-sdk"
    - path: "packages/client/src/main.ts"
      issue: "Lines 14-16 statically import Discord adapters from barrel — Vite resolves SDK even though discord branch is never taken in web mode"
    - path: "packages/client/Dockerfile"
      issue: "Line 9 copies bun.lockb* but repo uses bun.lock (text format), so lockfile omitted from Docker build"
  missing:
    - "Lazy-load Discord adapters via dynamic import() inside the platform === 'discord' branch"
    - "Remove Discord adapter re-exports from platform/index.ts barrel"
    - "Update Dockerfile to copy bun.lock* instead of bun.lockb*"
  debug_session: ""

- truth: "POST /api/token without code returns 400 error, not crash"
  status: failed
  reason: "User reported: Server crashes with SyntaxError: Unexpected end of JSON input when POST has no body. Endpoint tries req.json() without try/catch around the parse."
  severity: major
  test: 2
  root_cause: "req.json() at line 62 throws SyntaxError when body is empty/malformed. The outer try/catch at line 109 catches it but returns 500 Internal Server Error instead of 400 Bad Request — masking a client error as a server error."
  artifacts:
    - path: "packages/server/src/index.ts"
      issue: "Line 62: req.json() has no dedicated parse-error guard; SyntaxError falls to catch that always returns 500"
  missing:
    - "Wrap req.json() in its own try/catch and return 400 Bad Request with descriptive message for JSON parse failures"
  debug_session: ""

- truth: "Production build completes successfully with Discord SDK"
  status: failed
  reason: "User reported: Same Vite pre-transform error as Test 1 — Failed to resolve import @discord/embedded-app-sdk. Docker container doesn't have the SDK installed."
  severity: blocker
  test: 4
  root_cause: "Same root cause as Test 1 — eager barrel export + Dockerfile lockfile mismatch. Tests 1 and 4 share the same fix."
  artifacts:
    - path: "packages/client/src/platform/index.ts"
      issue: "Eager Discord adapter re-exports"
    - path: "packages/client/Dockerfile"
      issue: "bun.lockb* glob misses bun.lock text lockfile"
  missing:
    - "Same fix as Test 1 — lazy-load Discord adapters, fix Dockerfile lockfile copy"
  debug_session: ""
