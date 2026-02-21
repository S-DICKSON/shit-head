---
phase: quick
plan: 025
subsystem: testing
tags: [vitest, testing-library, vue, jsdom, bun]

# Dependency graph
requires:
  - phase: 23-frontend-testing
    provides: "Vitest infrastructure, initial @vue/test-utils test suite for 5 client components"
provides:
  - "All 5 client component tests migrated from @vue/test-utils to @testing-library/vue"
  - "Pre-existing Bun WeakMap failures in App.test.ts resolved"
  - "@vue/test-utils removed from client devDependencies"
  - "@testing-library/vue + @testing-library/jest-dom added as testing foundation"
affects:
  - "All future client test files should use @testing-library/vue render/screen pattern"

# Tech tracking
tech-stack:
  added:
    - "@testing-library/vue@8.1.0"
    - "@testing-library/jest-dom@6.9.1"
    - "@testing-library/dom@10.4.1"
  patterns:
    - "render(Component, { global: { plugins: [router] } }) replaces mount() — same options shape"
    - "screen.getByRole/getByText/queryByText for accessible DOM queries"
    - "fireEvent.click/update/input for simulating user interactions"
    - "waitFor() for async assertions (router navigation, reactive updates)"
    - "fireEvent.input(el, { target: { value: 'X' } }) for @input handler vs v-model"
    - "@testing-library/jest-dom/vitest imported in setup.ts for toBeInTheDocument() etc."

key-files:
  created: []
  modified:
    - "packages/client/package.json"
    - "packages/client/src/test/setup.ts"
    - "packages/client/src/components/__tests__/App.test.ts"
    - "packages/client/src/components/__tests__/Landing.test.ts"
    - "packages/client/src/components/__tests__/Lobby.test.ts"
    - "packages/client/src/components/__tests__/ConnectionStatus.test.ts"
    - "packages/client/src/components/__tests__/NotificationToast.test.ts"

key-decisions:
  - "@testing-library/vue 8.1.0 accepts identical global: { plugins, stubs } options shape as @vue/test-utils — minimal migration friction"
  - "fireEvent.input(el, { target: { value: 'X' } }) used for :value + @input handlers (not v-model) in Landing.vue room code input"
  - "waitFor() in Lobby tests handles async router readiness after render() — replaces flushPromises()"
  - "process.emit override in setup.ts harmless (not needed but kept for documentation)"
  - "dangerouslyIgnoreUnhandledErrors: true already in vitest.config.ts — WebSocket noise exits with code 0"
  - "Docker image rebuild required after changing package.json — bun install runs at image build time, not at container start"

patterns-established:
  - "render()+screen pattern: standard for all future client component tests"
  - "screen.getByRole('button', { name: /text/ }) for button queries — accessible and resilient"
  - "document.querySelector('#id') as HTMLInputElement for form input access (still valid in @testing-library)"
  - "container.firstElementChild?.classList for class assertions when screen queries insufficient"

# Metrics
duration: 5min
completed: 2026-02-20
---

# Quick Task 025: Migrate Client Tests from @vue/test-utils Summary

**Migrated 5 client component tests from mount/wrapper to render/screen pattern using @testing-library/vue, eliminating @vue/test-utils and resolving 2 pre-existing Bun WeakMap failures in App.test.ts**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-20T18:46:03Z
- **Completed:** 2026-02-20T18:51:43Z
- **Tasks:** 2/2
- **Files modified:** 7 (package.json, setup.ts, 5 test files)

## Accomplishments

- All 5 component test files migrated from `@vue/test-utils` mount/wrapper to `@testing-library/vue` render/screen pattern
- Pre-existing App.test.ts Bun WeakMap failures resolved (those 2 tests now pass cleanly)
- `@vue/test-utils` removed from package.json devDependencies; `@testing-library/vue`, `@testing-library/jest-dom`, `@testing-library/dom` added
- All 126 client tests pass with `make test-client` (exit code 0)
- `make lint` passes clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @testing-library/vue, add jest-dom setup, remove @vue/test-utils** - `9b02d68` (chore)
2. **Task 2: Migrate all 5 test files from mount() to render()/screen pattern** - `b70ed33` (test)

**Plan metadata:** (included in docs commit below)

## Files Created/Modified

- `packages/client/package.json` - Removed @vue/test-utils; added @testing-library/vue, @testing-library/jest-dom, @testing-library/dom
- `packages/client/src/test/setup.ts` - Added `import '@testing-library/jest-dom/vitest'` for extended matchers
- `packages/client/src/components/__tests__/App.test.ts` - Migrated to render()/container; WeakMap workaround removed
- `packages/client/src/components/__tests__/Landing.test.ts` - Migrated to render()/screen; fireEvent.input for room code @input handler
- `packages/client/src/components/__tests__/Lobby.test.ts` - Migrated to render()/screen/waitFor; flushPromises replaced with waitFor()
- `packages/client/src/components/__tests__/ConnectionStatus.test.ts` - Migrated to render()/screen; toBeInTheDocument() assertions
- `packages/client/src/components/__tests__/NotificationToast.test.ts` - Migrated to render()/screen; fireEvent.click for dismiss

## Decisions Made

- `@testing-library/vue` v8 accepts the exact same `global: { plugins, stubs }` option shape as `@vue/test-utils` — migration was drop-in for the component render call, only assertions changed
- For Landing.vue room code input: uses `:value` binding (not v-model) with `@input="handleRoomCodeInput"`. Used `fireEvent.input(el, { target: { value: 'X' } })` to trigger the handler correctly
- Docker image rebuild required after package.json changes — `docker compose build client` needed because `bun install` runs at image build time (anonymous volume pattern)
- `dangerouslyIgnoreUnhandledErrors: true` already in vitest.config.ts handles WebSocket noise; exit code 0 confirmed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Docker image rebuild required for new packages**
- **Found during:** Task 1 (Install dependencies)
- **Issue:** `bun add` ran in a `--rm` container doesn't persist to the anonymous `/app/node_modules` volume. The next `make test-client` run gets a fresh container from the image which doesn't have the new packages installed — causing import resolution failure for `@testing-library/jest-dom/vitest`
- **Fix:** Ran `docker compose build client` to rebuild the image with the new packages baked in
- **Files modified:** (image rebuild, no code files changed)
- **Verification:** `make test-client` resolved all imports and ran successfully after rebuild
- **Committed in:** 9b02d68 (Task 1 commit — package.json was staged correctly)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Blocking issue required Docker image rebuild — standard requirement for this project's Docker setup. No scope creep.

## Issues Encountered

- Docker anonymous volumes mean `bun add` inside a `--rm` container doesn't persist between runs. Image rebuild is the correct fix for this project pattern (same as the documented Docker setup in MEMORY.md)
- The `fireEvent.input` warning "may lead to unexpected results" is informational from @testing-library/vue — it works correctly for the `:value` + `@input` pattern used in Landing.vue; the warning is noise in this specific case

## Next Phase Readiness

- Client test infrastructure fully on `@testing-library/vue` — future component tests should follow the render/screen pattern
- All 126 tests pass cleanly; WebSocket noise suppressed by existing `dangerouslyIgnoreUnhandledErrors: true`
- Phase 23 Frontend Testing phase can proceed using the new pattern as the canonical approach

---
*Phase: quick-025*
*Completed: 2026-02-20*

## Self-Check: PASSED
