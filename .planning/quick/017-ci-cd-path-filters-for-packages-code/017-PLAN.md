---
phase: quick-017
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/ci.yml
  - .github/workflows/deploy.yml
autonomous: true

must_haves:
  truths:
    - "CI workflow does NOT run on docs-only or planning-only changes"
    - "CI workflow DOES run when any file under packages/ changes"
    - "CI workflow DOES run when workflow files themselves change"
    - "Deploy workflow does NOT run on docs-only or planning-only changes"
    - "Deploy workflow DOES run when packages/ code changes on push to main"
    - "Deploy workflow can still be triggered manually via workflow_dispatch regardless of paths"
    - "Rollback workflow is unchanged (already manual-only)"
  artifacts:
    - path: ".github/workflows/ci.yml"
      provides: "CI with path filters"
      contains: "paths:"
    - path: ".github/workflows/deploy.yml"
      provides: "Deploy with path filters"
      contains: "paths:"
  key_links:
    - from: ".github/workflows/ci.yml"
      to: "packages/"
      via: "paths filter"
      pattern: "packages/\\*\\*"
    - from: ".github/workflows/deploy.yml"
      to: "packages/"
      via: "paths filter"
      pattern: "packages/\\*\\*"
---

<objective>
Add path filters to the CI and Deploy GitHub Actions workflows so they only trigger when source code in packages/ actually changes. Currently both workflows run on every PR and every push to main, including docs-only, planning-only, and README changes. This wastes CI minutes and slows down non-code PRs.

Purpose: Reduce unnecessary CI/CD runs and speed up non-code changes.
Output: Updated ci.yml and deploy.yml with path filters.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.github/workflows/ci.yml
@.github/workflows/deploy.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add path filters to CI and Deploy workflows</name>
  <files>.github/workflows/ci.yml, .github/workflows/deploy.yml</files>
  <action>
Update `.github/workflows/ci.yml`:

Add `paths` filter to the `pull_request` trigger so CI only runs when relevant files change:

```yaml
on:
  pull_request:
    branches:
      - main
    paths:
      - 'packages/**'
      - 'bun.lock'
      - 'package.json'
      - '.github/workflows/ci.yml'
```

This ensures CI runs when:
- Any source code in packages/ changes (server, client, shared)
- Lock file or root package.json changes (dependency updates)
- The CI workflow itself changes (so you can test workflow changes)

CI will NOT run for changes to:
- .planning/** (planning docs)
- README.md, docs/
- Makefile (local dev only, not CI-relevant since CI runs bun directly)
- infra/, .github/workflows/deploy.yml, .github/workflows/rollback.yml

Update `.github/workflows/deploy.yml`:

Add `paths` filter to the `push` trigger. Keep `workflow_dispatch` as-is (it has no paths concept and always works manually):

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'packages/**'
      - 'bun.lock'
      - 'package.json'
      - 'Dockerfile'
      - '.github/workflows/deploy.yml'
```

The deploy workflow includes Dockerfile because Dockerfile changes affect the built image. It also includes its own workflow file so deploy pipeline changes get tested on merge.

Do NOT modify `.github/workflows/rollback.yml` — it is already manual-only via workflow_dispatch.
  </action>
  <verify>
Verify YAML is valid:
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"`
- Confirm `paths:` key exists under `pull_request:` in ci.yml
- Confirm `paths:` key exists under `push:` in deploy.yml
- Confirm `workflow_dispatch:` still present in deploy.yml (no paths restriction on manual trigger)
- Confirm rollback.yml is unmodified
  </verify>
  <done>
CI workflow only triggers on PRs that touch packages/**, bun.lock, package.json, or its own workflow file.
Deploy workflow only triggers on pushes to main that touch packages/**, bun.lock, package.json, Dockerfile, or its own workflow file.
Manual dispatch still works for deploy without path restrictions.
Rollback workflow unchanged.
  </done>
</task>

</tasks>

<verification>
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` exits 0
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"` exits 0
- ci.yml contains `paths:` under `pull_request:`
- deploy.yml contains `paths:` under `push:` but NOT under `workflow_dispatch:`
- rollback.yml is byte-identical to its previous version
</verification>

<success_criteria>
- Both CI and deploy workflows have path filters restricting triggers to code-relevant changes
- Manual deploy dispatch remains unrestricted
- Rollback workflow is untouched
- All workflow YAML files are syntactically valid
</success_criteria>

<output>
After completion, create `.planning/quick/017-ci-cd-path-filters-for-packages-code/017-SUMMARY.md`
</output>
