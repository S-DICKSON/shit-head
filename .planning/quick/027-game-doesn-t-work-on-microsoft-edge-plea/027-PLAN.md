---
phase: quick-027
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/vite.config.ts
  - packages/client/src/App.vue
  - packages/client/src/components/PlayingPhase.vue
  - packages/client/src/components/Game.vue
autonomous: true

must_haves:
  truths:
    - "Game loads and runs correctly on Microsoft Edge (Chromium-based, v89+)"
    - "Game continues to work on Chrome and Safari"
    - "Build completes without errors"
    - "All existing tests pass"
  artifacts:
    - path: "packages/client/vite.config.ts"
      provides: "Browser-compatible build target"
      contains: "es2020"
    - path: "packages/client/src/App.vue"
      provides: "Viewport height fallback"
      contains: "100vh"
  key_links:
    - from: "packages/client/vite.config.ts"
      to: "production bundle"
      via: "Vite build target"
      pattern: "target.*es2020"
---

<objective>
Fix the game not working on Microsoft Edge by addressing two compatibility issues found during codebase investigation.

**Root cause analysis (already performed):**

1. **CRITICAL - Top-level await in production bundle (build target: 'esnext')**
   - `vite.config.ts` has `target: 'esnext'` which emits top-level `await` directly in the main bundle
   - `main.ts` uses `await import(...)` at the module top level for Discord SDK lazy loading
   - Top-level await in ES modules requires Edge 89+ and was buggy in early Chromium Edge
   - Older Edge versions (79-88) crash immediately on TLA -- the entire app fails to load
   - **Fix:** Change build target to `['es2020', 'edge89']` so Vite wraps TLA in an async IIFE

2. **MODERATE - `100dvh` viewport units without fallback**
   - `dvh` (dynamic viewport height) is only supported in Edge 108+ (Dec 2022)
   - Used in App.vue (`min-height: 100dvh`), PlayingPhase.vue, and Game.vue
   - Older Edge ignores `dvh`, causing elements to have zero/auto height
   - **Fix:** Add `vh` fallback before `dvh` declarations

**Not an issue (verified safe):**
- No `structuredClone`, `Object.groupBy`, `.at()`, `.findLast()`, `.toSorted()` usage
- No `:has()` CSS selector, no container queries
- No `dialog` element usage
- `backdrop-blur-sm` is fine (Edge 76+ supports backdrop-filter with -webkit prefix, Tailwind handles this)
- `??` (nullish coalescing) and `?.` (optional chaining) are fine in Edge 80+
- `Set` usage is standard (no advanced iteration methods)
- `flex gap` is supported in Edge 84+

Purpose: Make the game playable on Microsoft Edge, expanding browser compatibility
Output: Updated vite config and Vue components with proper browser targets and CSS fallbacks
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@packages/client/vite.config.ts
@packages/client/src/main.ts
@packages/client/src/App.vue
@packages/client/src/components/PlayingPhase.vue
@packages/client/src/components/Game.vue
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Vite build target for Edge compatibility</name>
  <files>packages/client/vite.config.ts</files>
  <action>
Change the `build.target` in vite.config.ts from `'esnext'` to `['es2020', 'edge89']`.

This tells Vite/esbuild to downlevel top-level await into a compatible wrapper (async IIFE or similar pattern) that works in Edge 89+ without requiring native TLA support.

The `es2020` baseline provides:
- Optional chaining (`?.`)
- Nullish coalescing (`??`)
- Dynamic `import()`
- `Promise.allSettled`
- `BigInt`
- `globalThis`

But NOT top-level await (that's ES2022), which forces esbuild to wrap it.

Add a comment explaining WHY this target exists:

```ts
build: {
  outDir: 'dist',
  // es2020 + edge89: downlevel top-level await (from Discord SDK lazy imports in main.ts)
  // so the app loads on Edge 89+. 'esnext' emits raw TLA which breaks older Chromium Edge.
  target: ['es2020', 'edge89'],
},
```

IMPORTANT: Do NOT change any other config. The dev server, plugins, proxy config must remain unchanged.
  </action>
  <verify>Run `cd /Users/stephendickson/Personal/shit-head && make build` -- build must complete without errors. Then check the output bundle does NOT contain bare top-level `await` at module scope: `grep -c "^.*=await " packages/client/dist/assets/index-*.js` should show the awaits are wrapped or eliminated.</verify>
  <done>Build succeeds with new target. Production bundle no longer uses raw top-level await at module scope.</done>
</task>

<task type="auto">
  <name>Task 2: Add vh fallback for dvh viewport units</name>
  <files>packages/client/src/App.vue, packages/client/src/components/PlayingPhase.vue, packages/client/src/components/Game.vue</files>
  <action>
Add `vh` fallbacks before every `dvh` usage. Browsers that don't understand `dvh` will use the `vh` fallback; browsers that do understand `dvh` will use it (last declaration wins in CSS).

**App.vue** - Change the style attribute on the root div:
```
style="min-height: 100vh; min-height: 100dvh; padding-top: var(--safe-top); padding-bottom: var(--safe-bottom); padding-left: var(--safe-left); padding-right: var(--safe-right);"
```

**PlayingPhase.vue** - Change the style attribute on the root game div:
```
style="height: calc(100vh - var(--safe-top) - var(--safe-bottom)); height: calc(100dvh - var(--safe-top) - var(--safe-bottom));"
```

**Game.vue** - Change the style attribute on the spectator view div:
```
style="height: calc(100vh - var(--safe-top) - var(--safe-bottom)); height: calc(100dvh - var(--safe-top) - var(--safe-bottom));"
```

The pattern is: declare the `vh` version first, then the `dvh` version. CSS cascade means `dvh` wins in supporting browsers, `vh` is used in non-supporting browsers.

Do NOT change any other HTML, classes, or logic in these files.
  </action>
  <verify>Run `make type-check` to ensure no TypeScript issues. Run `make lint` to ensure no linting violations. Grep for `dvh` to confirm each instance has a `vh` fallback immediately before it: `grep -B1 "dvh" packages/client/src/App.vue packages/client/src/components/PlayingPhase.vue packages/client/src/components/Game.vue`</verify>
  <done>All three files have vh fallbacks before dvh declarations. Type-check and lint pass.</done>
</task>

<task type="auto">
  <name>Task 3: Verify full build and test suite</name>
  <files></files>
  <action>
Run the full verification suite to confirm nothing is broken:

1. `make build` -- full production build with new target
2. `make test` -- all server and client tests pass
3. `make type-check` -- TypeScript compilation clean
4. `make lint` -- no linting violations

If any step fails, diagnose and fix before proceeding.

After verification, inspect the production bundle to confirm the fix:
- Check `packages/client/dist/assets/index-*.js` to verify top-level awaits are wrapped
- The Discord dynamic imports should now be inside an async function wrapper, not at bare module scope
  </action>
  <verify>`make build && make test && make type-check && make lint` all pass with exit code 0.</verify>
  <done>Full CI verification passes. Production bundle is Edge-compatible.</done>
</task>

</tasks>

<verification>
1. `make build` completes successfully with new build target
2. `make test` -- all existing tests pass (no regressions)
3. `make type-check` -- clean TypeScript compilation
4. `make lint` -- no linting violations
5. Production bundle inspection confirms no raw top-level await at module scope
</verification>

<success_criteria>
- Vite build target changed from 'esnext' to ['es2020', 'edge89']
- All dvh usages have vh fallbacks
- Full test suite, type-check, and lint pass
- Production bundle does not contain bare top-level await
</success_criteria>

<output>
After completion, create `.planning/quick/027-game-doesn-t-work-on-microsoft-edge-plea/027-SUMMARY.md`
</output>
