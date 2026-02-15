# Phase 16: Networking Foundation - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate that WebSocket and API connections work through Discord's proxy (discordsays.com) before building any Discord features. Set up local development workflow for Discord Activity testing. Improve WebSocket connection resilience for both standalone and Discord modes.

</domain>

<decisions>
## Implementation Decisions

### Dev workflow
- Separate command for Discord Activity dev (e.g. `make dev-discord`) — not integrated into `make dev`
- Discord dev requires additional setup (cloudflared, Discord app config) that shouldn't be imposed on normal development
- Follow Discord's standard `/.proxy` path prefix for URL mapping — backend requests through `/.proxy/api/*`, WebSocket through `/.proxy/ws`
- Deployment/URL mapping documentation lives in project root (e.g. `DISCORD-SETUP.md`) for discoverability

### Validation depth
- Validation means: WebSocket connects, player joins room, sees lobby state, game starts — through the proxy path
- No need to play a full game through the proxy; proving the protocol works through connection + basic flow + game start is sufficient
- Manual testing with documented checklist AND automated tests in CI
- Automated tests: both mock proxy tests (URL mapping/config validation, fast) AND real cloudflared tunnel test
- If the real tunnel CI test proves too fragile, it gets deleted — try it first
- Capture connection errors for debugging (structured error info, not just failure)

### Connection resilience
- "Reconnecting..." overlay/toast shown to player when connection drops — not silent
- If reconnection fails after multiple attempts: show error with manual retry button
- Reconnection logic applies to BOTH standalone web and Discord proxy modes — one resilient connection layer
- On successful reconnect: reconnect to room only (not full game state restoration)
- Errors captured with structured info for future observability

### Claude's Discretion
- Whether to auto-start cloudflared in the Discord dev command or keep it manual
- Reconnection timing (backoff strategy, max attempts)
- Mock proxy test implementation approach
- Exact overlay/toast design for reconnection feedback

</decisions>

<specifics>
## Specific Ideas

- Real cloudflared tunnel test in CI is experimental — delete if flaky, keep if stable
- Connection resilience is a cross-cutting improvement that benefits the existing standalone mode too
- Player should always know what's happening with their connection (no silent failures)

</specifics>

<deferred>
## Deferred Ideas

- Observability stack (OpenTelemetry, Grafana, error logging/monitoring) — add as future phase for production monitoring
- Full game state restoration on reconnect — possible future enhancement after basic reconnection works

</deferred>

---

*Phase: 16-networking-foundation*
*Context gathered: 2026-02-15*
