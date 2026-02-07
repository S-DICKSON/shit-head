# Phase 1: Project Setup & Foundation - Research

**Researched:** 2026-02-07
**Domain:** Full-stack TypeScript monorepo infrastructure with Bun, Vue 3, Docker, and OpenTofu
**Confidence:** HIGH

## Summary

This phase establishes a production-ready, 12-factor app compliant infrastructure for a multiplayer card game. The stack centers on Bun workspaces for monorepo management, Vue 3 with Vite for the frontend, Bun's native WebSocket server for real-time communication, and Docker containers for both development and production environments. Infrastructure as code is managed through OpenTofu (open-source Terraform), with Render providing hosting on the free tier.

The research confirms all user-selected technologies are production-ready with strong ecosystem support. Bun's monorepo and WebSocket capabilities are mature. Vue 3.5 is stable with 3.6 entering beta. Docker multi-container setups with hot reload are well-established patterns. OpenTofu is fully compatible with Terraform providers including Render's official provider. GitHub Actions provides robust CI/CD with multiple deployment options for Render.

Key findings indicate that multi-stage Dockerfiles solve monorepo build complexity, Makefile orchestration remains relevant for developer interfaces despite modern tools, and testing framework choice should favor Vitest over Bun's test runner for frontend projects due to maturity and ecosystem integration.

**Primary recommendation:** Use Vite + Vitest running on Bun for frontend testing, leverage multi-stage Dockerfiles for production builds, and place infrastructure files in a top-level `/infra` directory with service-specific Dockerfiles co-located with packages.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (MUST be honored)

**Tech stack:**
- Frontend: Vue (latest stable)
- Server runtime: Bun with native WebSocket support
- Language: TypeScript everywhere (client, server, shared)
- Styling: Tailwind CSS
- Testing: Claude's discretion — pick what gives best DX for game logic + Vue components

**Project structure:**
- Monorepo with Bun workspaces: `packages/client`, `packages/server`, `packages/shared`
- Each package has its own `package.json` with isolated dependencies
- Shared package starts minimal (scaffold only) — each subsequent phase adds types/constants as needed
- Research agent should investigate how monorepos organize infra and Docker files to determine optimal structure

**Dev environment:**
- Docker containers per service — each service runs in its own container
- `make start` — builds and runs production-like containers (no hot reload)
- `make dev` — Docker with volume-mounted source for hot reload during development
- Standard Makefile targets: `make start`, `make dev`, `make test`, `make build`, `make clean`
- Docker Compose for orchestrating multi-container setup

**CI/CD pipeline:**
- GitHub Actions for all CI/CD
- On pull requests: lint + type check + test (quality gates)
- On merge to main: deploy to Render via Render GitHub Action
- Easy rollback capability (12-factor app principle)

**Hosting & infrastructure:**
- Render for hosting (free tier) — both client and server
- 12-factor app principles throughout — portable architecture, not locked to Render
- OpenTofu (open-source Terraform) for infrastructure as code from day one
- Render has an official Terraform provider (compatible with OpenTofu)
- Research agent should investigate OpenTofu state management options and monorepo IaC patterns
- Two environments: dev (local Docker), prod (Render) — add staging later when needed
- Reusable configs so infrastructure can be ported to different providers if needed

### Claude's Discretion

- Testing framework choice (Vitest vs Bun test runner vs other)
- Exact Docker container configuration (base images, multi-stage builds)
- Which services get their own containers beyond client/server
- OpenTofu state storage approach
- Exact monorepo folder structure for infra/Docker files (research agent investigates)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun | 1.x (latest) | Runtime, package manager, bundler | Native TypeScript support, fast installs, built-in workspace support, native WebSocket API |
| Vue | 3.5+ (stable) | Frontend framework | Composition API, TypeScript support, Vite integration, performance optimized |
| Vite | 5.x+ | Frontend build tool | Fast HMR, native ES modules, TypeScript support, optimized for Vue 3 |
| TypeScript | 5.x+ | Type system | Industry standard for type-safe JavaScript, excellent tooling |
| Tailwind CSS | 4.x | Utility-first CSS | Rapid UI development, tree-shaking, Vue 3 integration guides |
| Docker | 24.x+ | Containerization | Industry standard, docker-compose for orchestration |
| Docker Compose | 2.x+ | Multi-container orchestration | Standard for local dev environments |
| OpenTofu | 1.x+ | Infrastructure as code | Open-source Terraform fork, MPL 2.0 licensed, provider compatible |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 2.x+ | Test runner | Frontend testing — better Vue component testing than Bun test |
| vue-tsc | Latest | TypeScript type checking | Command-line type checking for Vue files |
| ESLint | 9.x+ | Linting | Code quality, catch errors before runtime |
| Prettier | 3.x+ | Code formatting | Consistent formatting across team |
| @vue/tsconfig | Latest | TypeScript config | Pre-configured TypeScript settings for Vue |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Bun test runner | Bun test faster but lacks Vue component testing maturity, browser mode, IDE integration |
| Vite | Bun bundler | Bun bundler less mature for Vue projects, Vite has better ecosystem |
| OpenTofu | Terraform | Terraform has BSL license (not open-source), OpenTofu is MPL 2.0 with same functionality |

**Installation:**

```bash
# Root package.json
bun install

# Workspaces are automatically installed via root

# Dev dependencies (root level)
bun add -d vite vitest @vitejs/plugin-vue vue-tsc typescript eslint prettier tailwindcss autoprefixer postcss
```

## Architecture Patterns

### Recommended Monorepo Structure

```
shit-head/
├── packages/
│   ├── client/              # Vue 3 frontend
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── Dockerfile       # Client-specific Dockerfile
│   ├── server/              # Bun WebSocket server
│   │   ├── src/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile       # Server-specific Dockerfile
│   └── shared/              # Shared types and constants
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── infra/                   # Infrastructure as code
│   ├── opentofu/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── render.yaml      # Render Blueprint
│   └── state/               # OpenTofu state config
├── .github/
│   └── workflows/
│       ├── ci.yml           # Lint, type-check, test on PR
│       └── deploy.yml       # Deploy to Render on merge
├── docker-compose.yml       # Dev environment orchestration
├── docker-compose.prod.yml  # Production-like local testing
├── Makefile                 # Developer interface
├── package.json             # Root workspace config
├── bun.lockb                # Bun lockfile
├── bunfig.toml              # Bun configuration
└── tsconfig.json            # Root TypeScript config
```

**Rationale:**
- **Service-specific Dockerfiles** co-located with packages for clarity and ease of maintenance
- **Top-level `/infra` directory** separates infrastructure concerns from application code
- **Docker Compose files** at root for multi-container orchestration visibility
- **Makefile** at root provides single entry point for all operations

### Pattern 1: Bun Workspaces Configuration

**What:** Centralized dependency management with automatic package linking.

**When to use:** Always for monorepo setup — enables shared dependencies and local package references.

**Example:**

```json
// Root package.json
{
  "name": "shit-head",
  "version": "1.0.0",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "make dev",
    "build": "make build",
    "test": "make test"
  },
  "devDependencies": {
    "typescript": "catalog:*",
    "vite": "catalog:*",
    "vitest": "catalog:*"
  }
}
```

```json
// packages/client/package.json
{
  "name": "@shit-head/client",
  "type": "module",
  "dependencies": {
    "vue": "^3.5.0",
    "@shit-head/shared": "workspace:*"
  }
}
```

```json
// packages/server/package.json
{
  "name": "@shit-head/server",
  "type": "module",
  "dependencies": {
    "@shit-head/shared": "workspace:*"
  }
}
```

**Source:** [Bun Workspaces Documentation](https://bun.com/docs/pm/workspaces)

### Pattern 2: Multi-Stage Dockerfiles for Monorepo

**What:** Single Dockerfile that handles different packages via build args, with separate stages for development and production.

**When to use:** For both client and server — reduces duplication while maintaining flexibility.

**Example:**

```dockerfile
# packages/server/Dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies (production only)
FROM base AS deps
COPY package.json bun.lockb ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile --production

# Development stage with all dependencies
FROM base AS dev
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
CMD ["bun", "--watch", "packages/server/src/index.ts"]

# Build stage
FROM base AS build
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
# Add any build steps here if needed

# Production stage
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/server ./packages/server
COPY --from=build /app/packages/shared ./packages/shared
CMD ["bun", "packages/server/src/index.ts"]
```

**Source:** [How to Build Multi-Stage Dockerfiles for Monorepos](https://oneuptime.com/blog/post/2026-01-30-docker-multi-stage-monorepos/view)

### Pattern 3: Docker Compose with Volume Mounting for Hot Reload

**What:** Development compose file with volume mounts for source code, enabling hot reload without rebuilds.

**When to use:** Local development only — never in production.

**Example:**

```yaml
# docker-compose.yml (development)
version: '3.8'

services:
  client:
    build:
      context: .
      dockerfile: packages/client/Dockerfile
      target: dev
    ports:
      - "5173:5173"
    volumes:
      - ./packages/client:/app/packages/client
      - ./packages/shared:/app/packages/shared
      - /app/node_modules
    environment:
      - NODE_ENV=development

  server:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
      target: dev
    ports:
      - "3000:3000"
    volumes:
      - ./packages/server:/app/packages/server
      - ./packages/shared:/app/packages/shared
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

**Source:** [Docker Compose Monorepo Best Practices](https://www.digitalocean.com/community/tutorials/how-to-containerize-monorepo-apps)

### Pattern 4: Makefile as Developer Interface

**What:** Standardized commands that wrap Docker Compose operations with clear semantics.

**When to use:** Always — provides consistent interface regardless of underlying tooling.

**Example:**

```makefile
.PHONY: help dev start build test clean

help:
	@echo "Available targets:"
	@echo "  make dev    - Start development environment with hot reload"
	@echo "  make start  - Start production-like environment"
	@echo "  make build  - Build production images"
	@echo "  make test   - Run all tests"
	@echo "  make clean  - Clean up containers and volumes"

dev:
	docker-compose up --build

start:
	docker-compose -f docker-compose.prod.yml up --build

build:
	docker-compose -f docker-compose.prod.yml build

test:
	docker-compose run --rm client bun test
	docker-compose run --rm server bun test

clean:
	docker-compose down -v
	docker-compose -f docker-compose.prod.yml down -v
```

**Source:** [Makefile for Monorepos](https://github.com/enspirit/makefile-for-monorepos)

### Pattern 5: Render Blueprint for IaC

**What:** YAML-based infrastructure definition that Render uses for declarative deployments.

**When to use:** Always for Render deployments — version-controlled infrastructure.

**Example:**

```yaml
# infra/opentofu/render.yaml
services:
  - type: web
    name: shit-head-client
    env: static
    buildCommand: cd packages/client && bun run build
    staticPublishPath: packages/client/dist
    envVars:
      - key: NODE_ENV
        value: production

  - type: web
    name: shit-head-server
    env: docker
    dockerfilePath: ./packages/server/Dockerfile
    dockerContext: .
    envVars:
      - key: NODE_ENV
        value: production
```

**Source:** [Render Infrastructure as Code](https://render.com/docs/infrastructure-as-code)

### Pattern 6: GitHub Actions CI/CD Pipeline

**What:** Separate workflows for quality gates (PR) and deployment (merge to main).

**When to use:** Always — separates concerns and enables fast feedback.

**Example:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run type-check
      - run: bun run test
```

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: JorgeLNJunior/render-deploy@v1.5.0
        with:
          service_id: ${{ secrets.RENDER_CLIENT_SERVICE_ID }}
          api_key: ${{ secrets.RENDER_API_KEY }}
          wait_deploy: true
      - uses: JorgeLNJunior/render-deploy@v1.5.0
        with:
          service_id: ${{ secrets.RENDER_SERVER_SERVICE_ID }}
          api_key: ${{ secrets.RENDER_API_KEY }}
          wait_deploy: true
```

**Source:** [Deploy to Render GitHub Action](https://github.com/marketplace/actions/deploy-to-render)

### Anti-Patterns to Avoid

- **Single Dockerfile for all services:** Creates tight coupling and complicates builds. Use per-service Dockerfiles.
- **No volume mounts in development:** Forces container rebuilds on every change. Always mount source in dev.
- **Mixing dev and prod configs:** Leads to environment parity issues. Separate docker-compose files for dev vs prod-like.
- **Global tool dependencies:** Installing tools globally breaks reproducibility. Use workspace dev dependencies.
- **Skipping type checking in CI:** Vite doesn't type-check by default. Always run vue-tsc in CI.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Package management | Custom scripts | Bun workspaces | Handles deduplication, hoisting, linking automatically |
| Module bundling | Custom webpack config | Vite | Optimized for Vue 3, fast HMR, minimal config |
| Test running | Jest + custom transforms | Vitest | Same Vite config, native ES modules, faster |
| TypeScript config | Manual tsconfig setup | @vue/tsconfig | Pre-configured for Vue 3 best practices |
| CSS processing | Manual PostCSS setup | Tailwind + Vite integration | Automatic purging, HMR, optimized builds |
| Infrastructure provisioning | Manual Render setup | OpenTofu + Render provider | Version controlled, reproducible, auditable |
| Deployment orchestration | Custom scripts | GitHub Actions + Render action | Integrated, reliable, community-supported |
| Hot reload in Docker | Custom file watchers | Docker volume mounts + native tools | Bun has --watch, Vite has HMR |

**Key insight:** Modern tooling has solved these problems with optimizations you won't replicate. Custom solutions create maintenance burden and miss ecosystem benefits (plugins, IDE integration, community support).

## Common Pitfalls

### Pitfall 1: Bun Workspace Dependency Installation Confusion

**What goes wrong:** Running `bun add <package>` from workspace root installs dependencies in root `package.json` instead of target workspace.

**Why it happens:** Bun's default behavior differs from npm/yarn — it installs where you run the command.

**How to avoid:** Always use `--cwd` flag: `bun add <package> --cwd packages/client`

**Warning signs:** Dependencies appearing in root `package.json` that should be in workspace packages.

### Pitfall 2: Vite Not Type-Checking in Development

**What goes wrong:** Type errors don't show during development, then fail in CI.

**Why it happens:** Vite doesn't type-check by default — it only transpiles TypeScript.

**How to avoid:** Run `vue-tsc --noEmit --watch` in parallel during development, include `vue-tsc` in CI pipeline.

**Warning signs:** "It works locally but fails in CI" for type errors.

### Pitfall 3: Docker Development/Production Parity Breaks

**What goes wrong:** App works in dev containers but fails in production due to different configurations.

**Why it happens:** Using different base images, environment variables, or web servers across environments.

**How to avoid:**
- Use same base image (oven/bun:1) in dev and prod stages
- Test production builds locally with `docker-compose.prod.yml`
- Match production web server in local setup
- Use multi-stage builds with shared base

**Warning signs:** "Works on my machine" but fails in Render deployment.

### Pitfall 4: OpenTofu State Management Ignored

**What goes wrong:** Multiple team members overwrite each other's infrastructure changes, or state is lost.

**Why it happens:** Default local state storage doesn't support collaboration.

**How to avoid:**
- Use remote state backend (S3, Terraform Cloud free tier, Render doesn't provide state storage)
- Enable state locking to prevent concurrent modifications
- Add `.terraform/` to `.gitignore`, never commit state files

**Warning signs:** "My infrastructure changes disappeared" or conflicting deployments.

### Pitfall 5: Shared Package Import Paths Break in Production

**What goes wrong:** `import { Card } from '@shit-head/shared'` works locally but fails in Docker/production.

**Why it happens:** TypeScript path mapping doesn't translate to runtime without bundler configuration.

**How to avoid:**
- Use `workspace:*` protocol in package.json dependencies
- Ensure shared package is copied to Docker image in correct location
- Verify Bun resolves workspace packages in production builds

**Warning signs:** Module not found errors only in Docker or production.

### Pitfall 6: Render Free Tier Auto-Sleep Not Handled

**What goes wrong:** First request after inactivity takes 30+ seconds, poor user experience.

**Why it happens:** Render free tier spins down services after 15 minutes of inactivity.

**How to avoid:**
- Document in README that first load is slow (free tier limitation)
- Implement loading states on client
- Consider ping service or upgrade to paid tier for production
- Accept as tradeoff for free hosting during development

**Warning signs:** Users report "app is slow" but it's fast after initial load.

### Pitfall 7: Not Using Catalog for Shared Dependencies

**What goes wrong:** Different workspaces use different versions of the same dependency, causing conflicts.

**Why it happens:** Each workspace specifies versions independently.

**How to avoid:**
```json
// Root package.json
{
  "workspaces": {
    "packages": ["packages/*"],
    "dependencies": {
      "typescript": "catalog:*",
      "vite": "catalog:*"
    }
  }
}

// Workspace package.json
{
  "dependencies": {
    "typescript": "catalog:"
  }
}
```

**Warning signs:** Dependency version mismatches between packages.

## Code Examples

Verified patterns from official sources:

### Bun WebSocket Server

```typescript
// packages/server/src/index.ts
// Source: https://bun.com/docs/api/websockets

type WebSocketData = {
  userId: string;
  username: string;
};

const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const success = server.upgrade(req, {
        data: {
          userId: crypto.randomUUID(),
          username: "Guest",
        },
      });

      return success
        ? undefined
        : new Response("WebSocket upgrade failed", { status: 500 });
    }

    return new Response("Not found", { status: 404 });
  },
  websocket: {
    data: {} as WebSocketData,

    open(ws) {
      console.log(`Client connected: ${ws.data.username}`);
      ws.subscribe("game-room");
      server.publish("game-room", `${ws.data.username} joined`);
    },

    message(ws, message) {
      // Broadcast to all subscribers except sender
      ws.publish("game-room", message);
    },

    close(ws) {
      console.log(`Client disconnected: ${ws.data.username}`);
      ws.unsubscribe("game-room");
      server.publish("game-room", `${ws.data.username} left`);
    },
  },
});

console.log(`WebSocket server listening on ${server.hostname}:${server.port}`);
```

### Vue 3 + TypeScript Component with Tailwind

```vue
<!-- packages/client/src/components/Card.vue -->
<!-- Source: https://vuejs.org/guide/typescript/overview -->
<script setup lang="ts">
import type { Card } from '@shit-head/shared';

interface Props {
  card: Card;
  selectable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
});

const emit = defineEmits<{
  select: [card: Card];
}>();

function handleClick() {
  if (props.selectable) {
    emit('select', props.card);
  }
}
</script>

<template>
  <div
    class="rounded-lg border-2 p-4 transition-all"
    :class="{
      'cursor-pointer hover:border-blue-500': selectable,
      'border-gray-300': !selectable,
    }"
    @click="handleClick"
  >
    <span class="text-2xl">{{ card.rank }}{{ card.suit }}</span>
  </div>
</template>
```

### Vitest Configuration for Vue 3

```typescript
// packages/client/vitest.config.ts
// Source: https://vitest.dev/guide/
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### OpenTofu Configuration for Render

```hcl
# infra/opentofu/main.tf
# Source: https://registry.terraform.io/providers/render-oss/render/latest/docs

terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.0"
    }
  }
}

provider "render" {
  api_key = var.render_api_key
}

resource "render_web_service" "client" {
  name = "shit-head-client"
  plan = "free"

  env_vars = {
    NODE_ENV = "production"
  }

  service_details {
    env = "static"
    build_command = "cd packages/client && bun run build"
    publish_path = "packages/client/dist"
  }
}

resource "render_web_service" "server" {
  name = "shit-head-server"
  plan = "free"

  env_vars = {
    NODE_ENV = "production"
  }

  service_details {
    env = "docker"
    dockerfile_path = "./packages/server/Dockerfile"
    docker_context = "."
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm/yarn workspaces | Bun workspaces | 2023+ | 3-5x faster installs, native TypeScript, built-in bundler |
| Webpack | Vite | 2020+ | 10-100x faster dev server, minimal config, native ES modules |
| Jest | Vitest | 2021+ | Same Vite config, faster, better DX with Vue |
| Vue 2 Options API | Vue 3 Composition API | 2020+ | Better TypeScript support, more flexible, tree-shakeable |
| Terraform (BSL license) | OpenTofu (MPL 2.0) | 2023+ | Open-source license, community-driven, provider compatible |
| Manual infrastructure | Infrastructure as Code | 2015+ | Reproducible, version-controlled, auditable deployments |
| Monolithic apps | 12-factor microservices | 2011+ | Scalability, portability, cloud-native deployment |

**Deprecated/outdated:**
- **Vue CLI:** Replaced by create-vue (Vite-based). Vue CLI is in maintenance mode.
- **Vetur VS Code extension:** Replaced by Vue - Official (Volar). Vetur doesn't support Vue 3 properly.
- **webpack-dev-server for Vue:** Vite's dev server is now standard for Vue 3 projects.
- **Jest for Vue projects:** Vitest provides better integration and faster tests with same API.

## Testing Framework Decision (Claude's Discretion)

### Analysis: Bun Test vs Vitest

**Bun Test Advantages:**
- 10x faster test execution (0.08s vs 0.9s in benchmarks)
- Zero configuration — works out of the box with Bun
- Native TypeScript support
- Familiar Jest-compatible API

**Bun Test Disadvantages:**
- No test isolation — side effects leak between test suites
- Missing fake timers (critical for game timing logic)
- No browser mode for component testing
- Limited IDE integration
- Immature ecosystem for Vue components

**Vitest Advantages:**
- Excellent Vue 3 component testing support with @vue/test-utils
- Global state isolation by default (critical for game state testing)
- Browser mode for real DOM testing
- Mature IDE integrations (VS Code, WebStorm)
- Shares Vite config — zero duplication
- Benchmarking and type testing built-in
- Can run on Bun runtime for speed boost

**Vitest Disadvantages:**
- Slightly slower than Bun test (but still fast)
- Additional dependency

### Recommendation: Vitest

**Use Vitest running on Bun** for best of both worlds:
- Install: `bun add -d vitest @vitest/ui @vue/test-utils jsdom`
- Run: `bun --bun vitest` (uses Bun runtime with Vitest framework)
- Configure: Share vite.config.ts for both build and test

**Rationale:**
1. **Game logic requires test isolation** — card state, player turns, game rules must not leak between tests
2. **Component testing is critical** — Vue components need proper DOM environment and lifecycle testing
3. **Team familiarity** — Vitest's Jest-compatible API is widely known
4. **Ecosystem maturity** — Better documentation, more examples, community support for Vue 3
5. **Future-proof** — When we need advanced features (browser mode, type testing), they're available

**Sources:**
- [Bun Test vs Vitest Comparison](https://dev.to/kcsujeet/your-tests-are-slow-you-need-to-migrate-to-bun-9hh)
- [Vitest Official Comparisons](https://vitest.dev/guide/comparisons)

## OpenTofu State Management Recommendation (Claude's Discretion)

### Analysis: State Storage Options

**Local State:**
- Simple, zero setup
- Not suitable for teams (conflicts, no locking)
- Risk of state loss

**Remote State Options:**

1. **Terraform Cloud Free Tier:**
   - Free for up to 500 resources
   - Built-in state locking
   - Web UI for state inspection
   - Works with OpenTofu (compatible API)

2. **S3 + DynamoDB (AWS):**
   - Pay-as-you-go (pennies per month for small projects)
   - Requires AWS account
   - State locking via DynamoDB
   - Standard industry pattern

3. **GitLab/GitHub Packages:**
   - Free with git hosting
   - Limited features
   - Not purpose-built for state

### Recommendation: Start Local, Plan for Terraform Cloud

**Phase 1 approach:**
1. Use local state (`terraform.tfstate` in `/infra/opentofu/`)
2. Add `infra/opentofu/*.tfstate*` to `.gitignore`
3. Document in README that state is local (team coordination required)
4. Include instructions for migrating to Terraform Cloud when team grows

**Rationale:**
- Phase 1 is solo development — no collaboration conflicts
- Terraform Cloud migration is one command: `tofu init -migrate-state`
- Avoids AWS account requirement and billing complexity
- Free tier sufficient for entire project lifecycle
- Simple to set up later when actually needed

**Migration path documented for future:**
```bash
# When ready for remote state
tofu init -migrate-state
# Confirm migration and delete local state files
```

**Sources:**
- [OpenTofu State Management](https://opentofu.org/docs/language/state/)
- [Terraform Cloud with OpenTofu](https://www.env0.com/blog/opentofu-the-open-source-terraform-alternative)

## Monorepo File Organization Recommendation (Claude's Discretion)

### Analysis: Infrastructure File Placement

**Pattern 1: Co-located (service-specific files with packages)**
- ✅ Service Dockerfiles near code
- ❌ Infrastructure code scattered
- ❌ Hard to see full infrastructure picture

**Pattern 2: Centralized (all infra in /infra)**
- ❌ Service Dockerfiles far from code
- ✅ Infrastructure code organized
- ✅ Easy to audit full infrastructure

**Pattern 3: Hybrid (recommended)**
- ✅ Service Dockerfiles with packages
- ✅ Infrastructure code centralized
- ✅ Clear separation of concerns

### Recommendation: Hybrid Approach

```
shit-head/
├── packages/
│   ├── client/
│   │   └── Dockerfile          # Co-located with service
│   ├── server/
│   │   └── Dockerfile          # Co-located with service
│   └── shared/
├── infra/                       # Centralized infrastructure
│   ├── opentofu/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfstate
│   └── render.yaml              # Render Blueprint
├── docker-compose.yml           # Root level — orchestration visibility
├── docker-compose.prod.yml
└── Makefile                     # Root level — entry point
```

**Rationale:**
1. **Dockerfiles with packages** — Developers working on a service see its containerization immediately
2. **IaC centralized** — Platform concerns separated from application concerns
3. **Orchestration at root** — docker-compose files orchestrate multiple services, belong at root
4. **Makefile at root** — Single entry point for all operations

**This matches industry patterns:**
- Kubernetes manifests: centralized in `/k8s` or `/deploy`
- Terraform/OpenTofu: centralized in `/infra` or `/terraform`
- Docker Compose: root level for visibility
- Service configs: co-located with service code

**Sources:**
- [Infrastructure as Code Monorepo Strategy](https://julie.io/blog/infra-as-code-monorepo)
- [Monorepo Structure Best Practices](https://monorepo.tools/)

## 12-Factor App Principles Application

How this architecture implements 12-factor methodology:

1. **Codebase:** Single git repo, multiple deploys (local Docker, Render production)
2. **Dependencies:** Explicitly declared in package.json, isolated via Bun workspaces
3. **Config:** Environment variables (separate for dev/prod), never hardcoded
4. **Backing services:** Attached resources (future: database, cache) via env vars
5. **Build, release, run:** Strict separation via Docker stages and CI/CD
6. **Processes:** Stateless services, state in external stores (future: Redis for sessions)
7. **Port binding:** Services export via ports (3000 for server, 5173 for client)
8. **Concurrency:** Horizontal scaling via Render instances
9. **Disposability:** Fast startup (Bun), graceful shutdown (SIGTERM handling)
10. **Dev/prod parity:** Same Docker images, same Bun runtime, same dependencies
11. **Logs:** stdout/stderr, no file logs, collected by platform
12. **Admin processes:** One-off tasks via `bun run` scripts

**Sources:**
- [12-Factor App Official](https://12factor.net/)
- [12-Factor App with Docker](https://norbix.dev/posts/12-factor-app/)

## Open Questions

Things that couldn't be fully resolved:

1. **Render's specific WebSocket connection limits on free tier**
   - What we know: Render supports WebSockets natively, no fixed timeout
   - What's unclear: Connection limit per instance on free tier
   - Recommendation: Document in README, test during Phase 2 (WebSocket implementation), upgrade to paid if needed

2. **OpenTofu's compatibility with absolute latest Render Terraform provider**
   - What we know: OpenTofu is provider-compatible with Terraform, Render has official provider
   - What's unclear: Whether OpenTofu registry has synced latest Render provider version
   - Recommendation: Test during setup, use Terraform registry as fallback if needed

3. **Bun's production readiness for WebSocket-heavy workloads at scale**
   - What we know: Bun WebSocket is built on uWebSockets (battle-tested), 7x faster than Node+ws
   - What's unclear: Real-world production experience reports are limited (Bun 1.0 released Sept 2023)
   - Recommendation: Free tier limits scale before Bun limits — not a concern for this project phase

4. **Vitest browser mode necessity for card game components**
   - What we know: jsdom sufficient for most Vue component testing
   - What's unclear: Whether complex drag-and-drop card interactions need real browser
   - Recommendation: Start with jsdom (faster), add browser mode in Phase 3 if needed

## Sources

### Primary (HIGH confidence)

- [Bun Workspaces](https://bun.com/docs/pm/workspaces) - Workspace configuration and monorepo setup
- [Bun WebSocket API](https://bun.com/docs/api/websockets) - Native WebSocket server implementation
- [Vue 3 TypeScript Guide](https://vuejs.org/guide/typescript/overview) - Official Vue 3 TypeScript integration
- [Vite Guide](https://vite.dev/guide/) - Build tool configuration and features
- [Vitest Comparisons](https://vitest.dev/guide/comparisons) - Testing framework comparison
- [Render Infrastructure as Code](https://render.com/docs/infrastructure-as-code) - Blueprint configuration
- [Render WebSocket Support](https://render.com/docs/websocket) - WebSocket deployment details
- [Deploy to Render GitHub Action](https://github.com/marketplace/actions/deploy-to-render) - CI/CD integration
- [OpenTofu Documentation](https://opentofu.org/docs/) - IaC tool documentation

### Secondary (MEDIUM confidence)

- [Workspaces and Monorepos in Package Managers](https://nesbitt.io/2026/01/18/workspaces-and-monorepos-in-package-managers.html) - Bun workspace patterns
- [How to Build Multi-Stage Dockerfiles for Monorepos](https://oneuptime.com/blog/post/2026-01-30-docker-multi-stage-monorepos/view) - Docker build patterns
- [How to Containerize Your Monorepo Application](https://www.digitalocean.com/community/tutorials/how-to-containerize-monorepo-apps) - Monorepo containerization
- [Infrastructure as Code Monorepo Strategy](https://julie.io/blog/infra-as-code-monorepo) - IaC file organization
- [OpenTofu vs Terraform Comparison 2026](https://dasroot.net/posts/2026/01/infrastructure-as-code-terraform-opentofu-pulumi-comparison-2026/) - Feature comparison
- [12-Factor App Meets Kubernetes](https://norbix.dev/posts/12-factor-app/) - Modern 12-factor implementation
- [Vue 3 and Tailwind CSS Integration](https://dev.to/wadizaatour/vue-3-and-tailwind-css-integration-guide-2bl1) - Setup guide
- [Docker Development Production Parity](https://blog.box.com/dev-and-prod-parity) - Dev/prod parity strategies

### Tertiary (LOW confidence, marked for validation)

- [Bun Package Manager Reality Check 2026](https://vocal.media/01/bun-package-manager-reality-check-2026) - Production readiness concerns
- [Dealing with Monorepo's Hell with Bun](https://www.fgbyte.com/blog/02-bun-turborepo-hell) - Workspace gotchas
- Community forum discussions on Render WebSocket connection limits (not officially documented)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All technologies officially documented, stable releases, production-ready
- Architecture: HIGH - Industry-standard patterns, multiple production examples, official guides
- Pitfalls: MEDIUM-HIGH - Mix of official documentation and community experience reports
- Testing recommendation: HIGH - Based on official Vitest documentation and comparative analysis
- OpenTofu state: MEDIUM - Documented approach but simplified for solo development
- File organization: MEDIUM - Based on community patterns and industry conventions

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable technologies, slow-moving ecosystem)

**Critical for planner:**
- User has made ALL major technology decisions — do not propose alternatives
- Testing framework decision: Vitest (Claude's discretion resolved)
- State management: Local for Phase 1, document migration path
- File organization: Hybrid approach (Dockerfiles with packages, IaC centralized)
- Focus planning on IMPLEMENTATION, not technology selection
