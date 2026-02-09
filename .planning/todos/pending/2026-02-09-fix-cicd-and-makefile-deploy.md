---
created: 2026-02-09T19:30
title: Fix CI/CD pipeline and clean up Makefile deploy targets
area: tooling
files:
  - .github/workflows/deploy.yml
  - .github/workflows/rollback.yml
  - Makefile:59-68
---

## Problem

The CI/CD deploy workflow (`deploy.yml`) doesn't work end-to-end for the server deploy. Fly.io can't pull private GHCR images, so the `build-push-server` job was removed and `flyctl deploy` (build from source) is used instead. However, this only works when run manually via `make deploy-server` — the GitHub Actions workflow likely fails because Fly builds from source using its own remote builders, which need the full repo context pushed to Fly's API.

Additionally:
- The Makefile `FLYCTL` macro uses a multi-line shell command to decrypt the Fly token via SOPS, then runs flyctl in a Docker container. This works but is fragile (quoting issues with special chars in tokens, error handling is minimal).
- The rollback workflow builds from source at a target SHA, which is slow and untested.
- SOPS install steps are duplicated across 4 jobs in deploy.yml and rollback.yml — should be extracted into a reusable action or composite step.
- The `build-push-server` job was removed but GHCR packages still exist from previous runs.

## Solution

TBD — options to investigate:
1. Configure Fly to access private GHCR via deploy token or registry auth
2. Keep build-from-source approach but verify it works in GitHub Actions
3. Extract SOPS decrypt into a reusable composite action to reduce duplication
4. Clean up Makefile deploy targets (better error handling, documentation)
5. Consider if rollback needs a different strategy without pre-built images
