---
phase: quick
plan: 025
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/package.json
  - packages/client/src/test/setup.ts
  - packages/client/src/components/__tests__/App.test.ts
  - packages/client/src/components/__tests__/Landing.test.ts
  - packages/client/src/components/__tests__/Lobby.test.ts
  - packages/client/src/components/__tests__/ConnectionStatus.test.ts
  - packages/client/src/components/__tests__/NotificationToast.test.ts
autonomous: true

must_haves:
  truths:
    - "All 5 test files use @testing-library/vue render() instead of @vue/test-utils mount()"
    - "All client tests pass via make test-client"
    - "Linting passes via make lint"
    - "@vue/test-utils is removed from package.json"
    - "The pre-existing Bun WeakMap failures in App.test.ts are resolved"
  artifacts:
    - path: "packages/client/src/components/__tests__/App.test.ts"
      provides: "App component tests using @testing-library/vue"
      contains: "@testing-library/vue"
    - path: "packages/client/src/components/__tests__/Landing.test.ts"
      provides: "Landing component tests using @testing-library/vue"
      contains: "@testing-library/vue"
    - path: "packages/client/src/components/__tests__/Lobby.test.ts"
      provides: "Lobby component tests using @testing-library/vue"
      contains: "@testing-library/vue"
    - path: "packages/client/src/components/__tests__/ConnectionStatus.test.ts"
      provides: "ConnectionStatus tests using @testing-library/vue"
      contains: "@testing-library/vue"
    - path: "packages/client/src/components/__tests__/NotificationToast.test.ts"
      provides: "NotificationToast tests using @testing-library/vue"
      contains: "@testing-library/vue"
  key_links:
    - from: "packages/client/package.json"
      to: "all test files"
      via: "@testing-library/vue and @testing-library/jest-dom dependencies"
    - from: "packages/client/src/test/setup.ts"
      to: "vitest.config.ts"
      via: "setupFiles reference for jest-dom matchers"
---

<objective>
Migrate all 5 client test files from @vue/test-utils (mount/wrapper pattern) to @testing-library/vue (render/screen pattern). Remove @vue/test-utils dependency entirely.

Purpose: @testing-library/vue encourages accessible, behavior-driven tests and may fix the pre-existing Bun WeakMap incompatibility with @vue/test-utils. Tests become more resilient to implementation changes.

Output: All test files migrated, passing, and linting clean.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/package.json
@packages/client/vitest.config.ts
@packages/client/src/test/setup.ts
@packages/client/src/components/__tests__/App.test.ts
@packages/client/src/components/__tests__/Landing.test.ts
@packages/client/src/components/__tests__/Lobby.test.ts
@packages/client/src/components/__tests__/ConnectionStatus.test.ts
@packages/client/src/components/__tests__/NotificationToast.test.ts
@packages/client/src/components/ConnectionStatus.vue
@packages/client/src/components/NotificationToast.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install @testing-library/vue, add jest-dom setup, remove @vue/test-utils</name>
  <files>
    packages/client/package.json
    packages/client/src/test/setup.ts
  </files>
  <action>
  1. Run inside Docker (all commands use docker compose run --rm client):
     - `docker compose run --rm client bun add -d @testing-library/vue @testing-library/jest-dom @testing-library/dom`
     - `docker compose run --rm client bun remove @vue/test-utils`

  2. Update `packages/client/src/test/setup.ts` to import jest-dom matchers:
     ```ts
     import '@testing-library/jest-dom/vitest'
     ```
     This extends vitest's expect() with toBeInTheDocument(), toBeDisabled(), toHaveTextContent() etc.

  3. Verify package.json no longer has @vue/test-utils and has @testing-library/vue + @testing-library/jest-dom in devDependencies.
  </action>
  <verify>
  - `grep -q "@testing-library/vue" packages/client/package.json` succeeds
  - `grep -q "@testing-library/jest-dom" packages/client/package.json` succeeds
  - `grep -q "@vue/test-utils" packages/client/package.json` fails (removed)
  </verify>
  <done>@testing-library/vue and @testing-library/jest-dom installed, @vue/test-utils removed, setup.ts imports jest-dom matchers.</done>
</task>

<task type="auto">
  <name>Task 2: Migrate all 5 test files from mount() to render()/screen pattern</name>
  <files>
    packages/client/src/components/__tests__/App.test.ts
    packages/client/src/components/__tests__/Landing.test.ts
    packages/client/src/components/__tests__/Lobby.test.ts
    packages/client/src/components/__tests__/ConnectionStatus.test.ts
    packages/client/src/components/__tests__/NotificationToast.test.ts
  </files>
  <action>
  Migrate each test file using this translation guide. Keep ALL existing vi.mock() blocks, beforeEach hooks, and test logic identical -- only change the rendering and querying approach.

  **Core pattern changes:**
  - `import { mount, flushPromises } from '@vue/test-utils'` -> `import { render, screen, waitFor, fireEvent } from '@testing-library/vue'`
  - `mount(Component, { global: { plugins: [router] } })` -> `render(Component, { global: { plugins: [router] } })` (same options shape, @testing-library/vue accepts the same `global` config)
  - `wrapper.text()` -> `document.body.textContent` or use `screen.getByText()` / `screen.queryByText()`
  - `wrapper.find('#id')` -> `document.querySelector('#id')` or `screen.getByLabelText()` if it has a label
  - `wrapper.findAll('button').find(b => b.text().includes('X'))` -> `screen.getByRole('button', { name: /X/ })` or `screen.queryByRole('button', { name: /X/ })`
  - `wrapper.exists()` -> element is `not.toBeNull()` or use `toBeInTheDocument()`
  - `wrapper.classes()` -> `element.classList.contains()` or check `element.className`
  - `wrapper.html()` -> `document.body.innerHTML`
  - `wrapper.element.tagName` -> direct element check via `container` from render()
  - `button.element.disabled` -> `screen.getByRole('button', { name: /X/ })` then check `.disabled` or use `toBeDisabled()`
  - `await input.setValue('X')` -> `await fireEvent.update(inputEl, 'X')` (fireEvent.update is @testing-library/vue's equivalent that triggers v-model)
  - `await button.trigger('click')` -> `await fireEvent.click(buttonEl)`
  - `await roomCodeInput.trigger('input')` -> `await fireEvent.input(inputEl, { target: { value: 'X' } })`
  - `flushPromises()` -> `await waitFor(() => ...)` or use `import { flushPromises } from '@vue/test-utils'` -- actually use vitest's `vi.dynamicImportSettled()` or just `await new Promise(r => setTimeout(r, 0))`. Simpler: import `waitFor` from @testing-library/vue.
  - `nextTick` -> can still use Vue's `nextTick` where needed, or rely on `waitFor`
  - `wrapper.find('[class*="rounded-lg"]')` -> `container.querySelectorAll('.rounded-lg')` from the render() return, or better: use `screen.getByText()` since notification text is known
  - `wrapper.attributes('value')` -> `(element as HTMLInputElement).value`

  **File-by-file migration notes:**

  ### App.test.ts
  - `const { container } = render(App, { global: { plugins: [router] } })`
  - Remove the WeakMap workaround comment (no longer needed with @testing-library/vue)
  - Test 1 ("renders app shell"): `expect(container.firstElementChild?.classList.contains('bg-green-900')).toBe(true)` and `expect(container.firstElementChild?.tagName).toBe('DIV')`
  - Test 2 ("mounts without errors"): `expect(container.innerHTML).not.toBe('')`

  ### Landing.test.ts
  - The `mountLanding()` helper becomes `renderLanding()` returning `{ router }` (no wrapper needed)
  - Connection state tests: Use `screen.queryByText('Connecting to server')` and `screen.queryByText('Not connected')`
  - Button finding: `screen.getByRole('button', { name: /Create New Room/ })` etc.
  - Input by ID: `document.querySelector('#nickname') as HTMLInputElement` then `await fireEvent.update(nicknameInput, 'Alice')`
  - Room code input: `document.querySelector('#roomCode') as HTMLInputElement` then use `fireEvent.update()` for v-model binding or `fireEvent.input()` for the handleRoomCodeInput handler
  - IMPORTANT for room code tests: The component uses `:value` binding (not v-model) plus @input handler. Use `fireEvent.input(inputEl, { target: { value: 'ABC123' } })` to trigger the handler. After await nextTick(), check `inputEl.value` directly.
  - For "strips non-alphanumeric" test: after firing input event and nextTick, check the input element's value directly: `expect(inputEl.value).not.toContain('-')` etc.

  ### Lobby.test.ts
  - The `mountLobby()` helper becomes `renderLobby()`. The `stubs: { RoomCode: true }` option works the same way in @testing-library/vue's `global` config.
  - Use `await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())` to handle async router readiness.
  - Button queries: `screen.getByRole('button', { name: /Start Game/ })`, `screen.queryByRole('button', { name: /Start Game|Waiting for players/ })`
  - For the disabled state: `expect(screen.getByRole('button', { name: /Waiting for players/ })).toBeDisabled()`
  - The "does not show Start Game button for non-host" test: `expect(screen.queryByRole('button', { name: /Start Game|Waiting for players/ })).not.toBeInTheDocument()`
  - Leave room test: `await fireEvent.click(screen.getByRole('button', { name: /Leave Room/ }))` then `await waitFor(() => expect(router.currentRoute.value.path).toBe('/'))`
  - Host star: `expect(document.body.innerHTML).toContain('\u2605')` (the star character)

  ### ConnectionStatus.test.ts
  - Simple: `render(ConnectionStatus)` then use `screen.queryByText()` and `screen.getByRole('button')`
  - "does not render overlay when connected": `expect(screen.queryByText('Reconnecting...')).not.toBeInTheDocument()` and `expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument()`
  - "shows reconnecting spinner": `expect(screen.getByText('Reconnecting...')).toBeInTheDocument()`
  - "shows Connection Failed": `expect(screen.getByText('Connection Failed')).toBeInTheDocument()` and `expect(screen.getByText('Server unreachable')).toBeInTheDocument()`
  - "retry button": `screen.getByRole('button', { name: /Retry/ })` and `await fireEvent.click(button)`
  - "does not render overlay when connecting": same as connected test

  ### NotificationToast.test.ts
  - "renders nothing when no notifications": `const { container } = render(NotificationToast)` then `expect(container.textContent).toBe('')` or check `screen.queryByText()` returns null
  - "renders notification messages": `expect(screen.getByText('Player disconnected')).toBeInTheDocument()`
  - "renders multiple notifications": check both texts with getByText
  - "clicking calls dismissNotification": `await fireEvent.click(screen.getByText('Some notification'))`
  - "applies correct severity classes": `expect(screen.getByText('Error occurred').classList.contains('bg-red-600')).toBe(true)` and same for bg-green-600

  **General rules:**
  - Every test file: remove `import { mount } from '@vue/test-utils'` (and flushPromises if used)
  - Every test file: add `import { render, screen, fireEvent, waitFor } from '@testing-library/vue'` (only import what's used)
  - Keep `import { nextTick } from 'vue'` where still needed
  - Keep ALL vi.mock() blocks exactly as-is (they mock composables, not test-utils)
  - Keep ALL beforeEach hooks exactly as-is
  - Use `cleanup` from @testing-library/vue if needed (vitest auto-cleanup should handle it via globals: true)
  </action>
  <verify>
  Run `make test-client` -- all tests must pass.
  Run `make lint` -- no linting errors.
  Grep for `@vue/test-utils` in all test files -- should return no results.
  </verify>
  <done>All 5 test files migrated to @testing-library/vue. No imports of @vue/test-utils remain. All tests pass. Lint passes. The pre-existing Bun WeakMap failures are gone.</done>
</task>

</tasks>

<verification>
1. `make test-client` -- all tests pass (0 failures)
2. `make lint` -- clean
3. `grep -r "@vue/test-utils" packages/client/` -- no results
4. `grep -r "@testing-library/vue" packages/client/src/components/__tests__/` -- all 5 files match
</verification>

<success_criteria>
- All 5 test files use `render`/`screen` from @testing-library/vue instead of `mount`/wrapper from @vue/test-utils
- `@vue/test-utils` completely removed from package.json and not imported anywhere
- `@testing-library/vue` and `@testing-library/jest-dom` in devDependencies
- `make test-client` passes with 0 failures
- `make lint` passes
- Pre-existing Bun WeakMap App.test.ts failures resolved
</success_criteria>

<output>
After completion, create `.planning/quick/025-migrate-client-tests-from-vue-test-utils/025-SUMMARY.md`
</output>
