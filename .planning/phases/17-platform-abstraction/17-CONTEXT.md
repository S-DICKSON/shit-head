# Phase 17: Platform Abstraction - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish dual-mode architecture (standalone web + Discord Activity) with clean adapter pattern. Platform detection at startup, adapter interfaces for Auth/Connection/Room, web implementations that preserve all v1.0 functionality. No `if (isDiscord)` checks in game code.

</domain>

<decisions>
## Implementation Decisions

### Mode awareness in UI
- Subtle differences between Discord and standalone — not identical, not heavily branded
- Discord mode shows simplified lobby: no room code entry (auto-join handles it), but still shows player list, start button for host, game settings
- Discord mode uses full Discord identity: username and avatar pulled automatically, no name entry flow needed
- Standalone mode unchanged: name entry, room codes, existing avatar/color system

### Detection failure handling
- Claude's discretion on fallback strategy (silent fallback to standalone vs error+retry)
- Claude's discretion on whether Discord reconnection differs from standalone (proxy may require different approach)

### Standalone feature preservation
- All standalone features equally critical — room codes, name entry, reconnection, game rules, card interactions — nothing can break
- Minor UX improvements acceptable if they emerge naturally from the refactor (e.g., cleaner loading state)
- Validation requires both: existing tests pass (`make test`, `make type-check`) AND user does manual smoke test playthrough

### Claude's Discretion
- Platform indicator (whether to show "Playing via Discord" anywhere — if so, keep unobtrusive)
- Detection failure fallback strategy
- Reconnection behavior differences between platforms
- Any minor UX improvements that naturally emerge from the refactor

</decisions>

<specifics>
## Specific Ideas

- Discord lobby should feel streamlined — players just appear as they join the voice channel, no friction
- Think of standalone as the "full control" mode (manual everything) and Discord as the "zero friction" mode (auto everything)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-platform-abstraction*
*Context gathered: 2026-02-16*
