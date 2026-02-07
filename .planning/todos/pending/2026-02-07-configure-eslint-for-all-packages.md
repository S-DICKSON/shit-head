---
created: 2026-02-07T18:30
title: Configure ESLint for all packages
area: tooling
files:
  - packages/client/
  - packages/server/
  - packages/shared/
  - Makefile:18
---

## Problem

`make lint` fails because ESLint 10 requires `eslint.config.js` (flat config format) but no config file exists. ESLint v9+ dropped support for `.eslintrc.*` files. Currently no linting is running for any package (client, server, or shared).

Error: `ESLint couldn't find an eslint.config.(js|mjs|cjs) file.`

The CI pipeline (`01-04`) also runs `lint` so this will fail on PRs too.

## Solution

Create `eslint.config.js` (flat config format) for the monorepo. Options:
- Single root config covering all packages
- Per-package configs

Should include TypeScript support (`@typescript-eslint`), Vue plugin for client package. Keep rules minimal — formatting via Prettier or similar is out of scope.
