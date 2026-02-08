---
status: resolved
trigger: "Investigate why Vite blocks ngrok host with 'Blocked request. This host is not allowed' error"
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:05:00Z
---

## Current Focus

hypothesis: vite.config.ts missing server.allowedHosts configuration for ngrok
test: examining vite.config.ts and package.json for Vite version
expecting: no allowedHosts config present, need to add it for ngrok support
next_action: read vite.config.ts and check Vite version

## Symptoms

expected: ngrok URL should serve the app when accessed
actual: Vite blocks request with "Blocked request. This host is not allowed"
errors: "Blocked request. This host is not allowed. To allow this host, add it to server.allowedHosts in vite.config.js."
reproduction: run `make tunnel`, visit ngrok URL
started: Phase 14 implementation with ngrok tunnel support

## Eliminated

## Evidence

- timestamp: 2026-02-08T00:01:00Z
  checked: packages/client/vite.config.ts
  found: server config has host: '0.0.0.0', port: 5173, proxy config, but NO allowedHosts field
  implication: missing allowedHosts configuration causes Vite to reject non-localhost hostnames like ngrok

- timestamp: 2026-02-08T00:02:00Z
  checked: packages/client/package.json
  found: vite version "^5.0.0" is installed
  implication: Vite 5+ enforces host validation by default

- timestamp: 2026-02-08T00:03:00Z
  checked: Web search for Vite server.allowedHosts configuration
  found: Multiple reports of same issue with ngrok. Solutions include setting allowedHosts to specific domain OR setting to true to allow all hosts
  implication: This is a known Vite security feature that requires explicit configuration

- timestamp: 2026-02-08T00:04:00Z
  checked: Vite GitHub issue #19242
  found: There's a discussion about allowedHosts: true not working properly in Vite 6.0.9, but for Vite 5 it should work
  implication: Using allowedHosts: true should work for this project (on Vite 5)

## Resolution

root_cause: vite.config.ts missing server.allowedHosts configuration. Vite 5+ blocks requests from non-localhost hostnames (like ngrok URLs) by default as a security measure. The server config in vite.config.ts does not include allowedHosts, causing all ngrok requests to be blocked.

fix: Add `allowedHosts: true` to server configuration in vite.config.ts to allow all hostnames (appropriate for development with ngrok)

verification: Run make tunnel, visit ngrok URL, verify app loads without "Blocked request" error

files_changed: [packages/client/vite.config.ts]
