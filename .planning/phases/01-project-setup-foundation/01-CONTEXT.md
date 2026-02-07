# Phase 1: Project Setup & Foundation - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Development environment, build system, Docker containerization, CI/CD pipeline, and deployment scaffold for a multiplayer Shithead card game. No game logic — purely infrastructure that every subsequent phase builds on.

</domain>

<decisions>
## Implementation Decisions

### Tech stack
- **Frontend:** Vue (latest stable)
- **Server runtime:** Bun with native WebSocket support
- **Language:** TypeScript everywhere (client, server, shared)
- **Styling:** Tailwind CSS
- **Testing:** Claude's discretion — pick what gives best DX for game logic + Vue components

### Project structure
- **Monorepo** with Bun workspaces: `packages/client`, `packages/server`, `packages/shared`
- Each package has its own `package.json` with isolated dependencies
- **Shared package** starts minimal (scaffold only) — each subsequent phase adds types/constants as needed
- Research agent should investigate how monorepos organize infra and Docker files to determine optimal structure

### Dev environment
- **Docker containers per service** — each service runs in its own container
- **`make start`** — builds and runs production-like containers (no hot reload)
- **`make dev`** — Docker with volume-mounted source for hot reload during development
- **Standard Makefile targets:** `make start`, `make dev`, `make test`, `make build`, `make clean`
- Docker Compose for orchestrating multi-container setup

### CI/CD pipeline
- **GitHub Actions** for all CI/CD
- **On pull requests:** lint + type check + test (quality gates)
- **On merge to main:** deploy to Render via [Render GitHub Action](https://github.com/marketplace/actions/deploy-to-render)
- Easy rollback capability (12-factor app principle)

### Hosting & infrastructure
- **Render** for hosting (free tier) — both client and server
- **12-factor app principles** throughout — portable architecture, not locked to Render
- **OpenTofu** (open-source Terraform) for infrastructure as code from day one
- Render has an official Terraform provider (compatible with OpenTofu)
- Research agent should investigate OpenTofu state management options and monorepo IaC patterns
- **Two environments:** dev (local Docker), prod (Render) — add staging later when needed
- Reusable configs so infrastructure can be ported to different providers if needed

### Claude's Discretion
- Testing framework choice (Vitest vs Bun test runner vs other)
- Exact Docker container configuration (base images, multi-stage builds)
- Which services get their own containers beyond client/server
- OpenTofu state storage approach
- Exact monorepo folder structure for infra/Docker files (research agent investigates)

</decisions>

<specifics>
## Specific Ideas

- User wants the architecture to follow 12-factor app methodology explicitly — portable, environment-parity, easy rollbacks
- OpenTofu over Terraform — open-source preference
- Makefile as the primary developer interface for all operations
- Docker-first workflow: everything runs in containers, even local dev

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-project-setup-foundation*
*Context gathered: 2026-02-07*
