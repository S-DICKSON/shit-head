---
phase: 17-platform-abstraction
plan: 01
subsystem: platform
tags: [vue, typescript, adapter-pattern, dependency-injection, websocket, localstorage]

# Dependency graph
requires:
  - phase: 16-networking-foundation
    provides: useGameSocket composable with WebSocket connection management
provides:
  - Platform detection (web vs Discord Activity)
  - Adapter interfaces (Auth, Connection, Room)
  - Vue injection keys for type-safe provide/inject
  - Web adapter implementations wrapping existing v1.0 functionality
affects: [18-discord-sdk-integration, 19-activity-config, 20-dual-mode-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns: [adapter-pattern, dependency-injection, platform-abstraction]

key-files:
  created:
    - packages/client/src/platform/detection.ts
    - packages/client/src/platform/keys.ts
    - packages/client/src/platform/interfaces/AuthAdapter.ts
    - packages/client/src/platform/interfaces/ConnectionAdapter.ts
    - packages/client/src/platform/interfaces/RoomAdapter.ts
    - packages/client/src/platform/adapters/web/WebAuthAdapter.ts
    - packages/client/src/platform/adapters/web/WebConnectionAdapter.ts
    - packages/client/src/platform/adapters/web/WebRoomAdapter.ts
    - packages/client/src/platform/index.ts
  modified: []

key-decisions:
  - "Synchronous platform detection using iframe check + query params (async SDK validation deferred to Phase 18)"
  - "Adapter interfaces use Vue Ref types for reactive status, not custom observables"
  - "Web adapters delegate to existing useGameSocket singleton, not reimplemented logic"
  - "Barrel export provides clean import path: import { detectPlatform } from '@/platform'"

patterns-established:
  - "Adapter pattern: Platform-agnostic interfaces with platform-specific implementations"
  - "Dependency injection: InjectionKey symbols for type-safe provide/inject in Vue"
  - "Thin wrappers: Adapters delegate to existing code, zero logic duplication"

# Metrics
duration: 2.4min
completed: 2026-02-16
---

# Phase 17 Plan 01: Platform Abstraction Summary

**Platform detection with adapter interfaces and web implementations wrapping localStorage and useGameSocket**

## Performance

- **Duration:** 2.4 min (143 seconds)
- **Started:** 2026-02-16T23:47:31Z
- **Completed:** 2026-02-16T23:49:54Z
- **Tasks:** 2
- **Files modified:** 9 (all new)

## Accomplishments
- Platform detection: `detectPlatform()` returns 'web' or 'discord' based on iframe context and query params
- Three adapter interfaces define platform-agnostic contracts (Auth, Connection, Room)
- Four injection keys for type-safe Vue provide/inject pattern
- Three web adapters wrap existing v1.0 localStorage and useGameSocket functionality
- Barrel export provides clean import path for all platform abstractions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create platform detection, interfaces, and injection keys** - `6628b46` (feat)
2. **Task 2: Create web adapter implementations and barrel export** - `bc128f7` (feat)

## Files Created/Modified

**Platform detection:**
- `packages/client/src/platform/detection.ts` - Synchronous platform detection (iframe + query params)

**Adapter interfaces:**
- `packages/client/src/platform/interfaces/AuthAdapter.ts` - Auth contract (getCurrentUser, authenticate, isAuthenticated, signOut)
- `packages/client/src/platform/interfaces/ConnectionAdapter.ts` - Connection contract (status, send, onMessage, close, open)
- `packages/client/src/platform/interfaces/RoomAdapter.ts` - Room operations contract (createRoom, joinRoom, leaveRoom)

**Injection keys:**
- `packages/client/src/platform/keys.ts` - Type-safe InjectionKey symbols for Vue provide/inject

**Web adapters:**
- `packages/client/src/platform/adapters/web/WebAuthAdapter.ts` - localStorage player identity wrapper
- `packages/client/src/platform/adapters/web/WebConnectionAdapter.ts` - useGameSocket connection delegate
- `packages/client/src/platform/adapters/web/WebRoomAdapter.ts` - useGameSocket room operations delegate

**Barrel export:**
- `packages/client/src/platform/index.ts` - Clean import path for all platform abstractions

## Decisions Made

1. **Synchronous platform detection:** Used iframe check + Discord query params (frame_id, instance_id). Both conditions must be true for 'discord' platform. Async SDK validation deferred to Phase 18.

2. **Ref types in ConnectionAdapter:** Used Vue `Ref<string>` for reactive status instead of custom observables. Maintains consistency with existing useGameSocket return type.

3. **Web adapters as thin wrappers:** All web adapters delegate to existing code (localStorage, useGameSocket). Zero logic duplication. This ensures v1.0 behavior unchanged while providing abstraction layer for Discord platform.

4. **Barrel export pattern:** Single `@/platform` import path for all platform abstractions (detection, keys, interfaces, adapters). Clean API for future wiring.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Platform abstraction foundation complete. Ready for Phase 18 (Discord SDK Integration):
- Web adapters validated with existing useGameSocket functionality
- Adapter interfaces ready for Discord implementations
- Platform detection ready to distinguish web vs Discord contexts
- Injection keys ready for Vue provide/inject wiring in main.ts

No blockers or concerns.

## Self-Check: PASSED

All claimed files and commits verified:
- 9 created files: all exist
- 2 task commits: 6628b46, bc128f7

---
*Phase: 17-platform-abstraction*
*Completed: 2026-02-16*
