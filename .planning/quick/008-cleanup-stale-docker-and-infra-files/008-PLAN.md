---
phase: quick-008
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/Dockerfile
  - docker-compose.prod.yml
  - Makefile
autonomous: true

must_haves:
  truths:
    - "packages/client/Dockerfile no longer exists"
    - "docker-compose.prod.yml no longer exists"
    - "Makefile has no references to docker-compose.prod.yml"
    - "Makefile no longer has start or build targets"
    - "Remaining Makefile targets (dev, test, clean, lint, etc.) still work correctly"
  artifacts: []
  key_links: []
---

<objective>
Remove stale Docker and docker-compose files from the old split deployment, and clean up Makefile targets that reference them.

Purpose: The project migrated from a split client/server Docker deployment to a unified server Dockerfile with systemd-based VPS deployment. The old files are unused dead code that creates confusion.
Output: Cleaner repo with no stale deployment artifacts.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Files to delete:
- packages/client/Dockerfile — old split deployment client image (nginx-based). Replaced by unified packages/server/Dockerfile which has its own client-build stage.
- docker-compose.prod.yml — old split deployment compose (separate nginx client + server containers). Production now deploys via CI/CD to VPS with systemd.

Files to update:
- Makefile — remove targets and references to docker-compose.prod.yml

Files to KEEP (actively used, do NOT touch):
- packages/server/Dockerfile — unified production image
- Dockerfile.tunnel — cloudflared tunnel testing
- docker-compose.yml — development
- docker-compose.tunnel.yml — tunnel testing
- infra/Dockerfile — infrastructure tooling
- infra/docker-compose.yml — infrastructure tooling
</context>

<tasks>

<task type="auto">
  <name>Task 1: Delete stale files and update Makefile</name>
  <files>packages/client/Dockerfile, docker-compose.prod.yml, Makefile</files>
  <action>
1. Delete `packages/client/Dockerfile` (old split deployment client image, completely unused)
2. Delete `docker-compose.prod.yml` (old split deployment compose file, completely unused)
3. Update `Makefile`:
   - Remove `start` target entirely (lines 11-12): `start: ## Start production-like environment` and `docker compose -f docker-compose.prod.yml up --build`
   - Remove `build` target entirely (lines 14-15): `build: ## Build production images` and `docker compose -f docker-compose.prod.yml build`
   - In `clean` target, remove line 51: `docker compose -f docker-compose.prod.yml down -v --rmi local --remove-orphans`
   - Update `.PHONY` line (line 1) to remove `start` and `build` from the list. Final .PHONY should be: `.PHONY: help dev test test-server test-client clean lint lint-fix type-check type-check-server type-check-shared tunnel`
   - Ensure no blank line gaps are left (e.g., no double blank lines where targets were removed)
  </action>
  <verify>
- `test ! -f packages/client/Dockerfile` — file deleted
- `test ! -f docker-compose.prod.yml` — file deleted
- `! grep -q 'docker-compose.prod.yml' Makefile` — no references remain
- `! grep -q '^start:' Makefile` — start target removed
- `! grep -q '^build:' Makefile` — build target removed
- `grep -q '^clean:' Makefile` — clean target still exists
- `grep -q '^dev:' Makefile` — dev target still exists
- `make help` — runs successfully, shows remaining targets without start or build
  </verify>
  <done>
Both stale files deleted. Makefile has no references to docker-compose.prod.yml, no start or build targets, and all remaining targets (dev, test, clean, lint, type-check, tunnel) are intact and functional.
  </done>
</task>

</tasks>

<verification>
- `test ! -f packages/client/Dockerfile && test ! -f docker-compose.prod.yml` — stale files gone
- `grep -c 'docker-compose.prod.yml' Makefile` returns 0 — no stale references
- `make help` — all remaining targets display correctly
- `grep '^\.PHONY' Makefile` — does NOT contain start or build
</verification>

<success_criteria>
- packages/client/Dockerfile deleted
- docker-compose.prod.yml deleted
- Makefile updated: no start target, no build target, no docker-compose.prod.yml references
- All remaining Makefile targets intact and correctly formatted
</success_criteria>

<output>
After completion, create `.planning/quick/008-cleanup-stale-docker-and-infra-files/008-SUMMARY.md`
</output>
