---
phase: quick-019
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/client/Dockerfile
  - docker-compose.prod.yml
  - Caddyfile.local
  - Makefile
autonomous: true

must_haves:
  truths:
    - "make dev still works (client + server services via docker-compose.yml)"
    - "make test, make lint, make type-check still work via docker compose run"
    - "make prod-local starts a production-like stack with Caddy reverse proxy"
    - "https://localhost serves the game through Caddy in prod-local mode"
    - "WebSocket connections work through Caddy reverse proxy"
  artifacts:
    - path: "packages/client/Dockerfile"
      provides: "Client dev target for Vite dev server"
      contains: "FROM oven/bun:1"
    - path: "docker-compose.prod.yml"
      provides: "Production-like Docker Compose with Caddy"
      contains: "caddy"
    - path: "Caddyfile.local"
      provides: "Local Caddy config for localhost reverse proxy"
      contains: "localhost"
    - path: "Makefile"
      provides: "prod-local and prod-local-down targets"
      contains: "prod-local"
  key_links:
    - from: "docker-compose.yml"
      to: "packages/client/Dockerfile"
      via: "dockerfile reference"
      pattern: "packages/client/Dockerfile"
    - from: "docker-compose.prod.yml"
      to: "Caddyfile.local"
      via: "volume mount"
      pattern: "Caddyfile.local"
    - from: "docker-compose.prod.yml"
      to: "packages/server/Dockerfile"
      via: "production target build"
      pattern: "target: production"
---

<objective>
Add Caddy reverse proxy to a production-like Docker Compose setup so local testing can mirror the production architecture (Caddy -> Bun server serving static + WebSocket on port 3000). Also create the missing packages/client/Dockerfile so the existing docker-compose.yml dev workflow works.

Purpose: Eliminate environment parity issues by testing with the same reverse proxy setup used in production (Hetzner VPS with Caddy in front of the unified Bun container).

Output: Working `make prod-local` command that starts Caddy + unified game server, accessible at https://localhost. Existing `make dev` and all Makefile targets continue to work unchanged.
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/server/Dockerfile
@docker-compose.yml
@docker-compose.tunnel.yml
@Dockerfile.tunnel
@Makefile
@packages/client/vite.config.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create client Dockerfile and local Caddyfile</name>
  <files>packages/client/Dockerfile, Caddyfile.local</files>
  <action>
  Create `packages/client/Dockerfile` with a `dev` target only (no production target needed — production uses the unified server Dockerfile).

  The client dev Dockerfile should:
  - Use `oven/bun:1` as base
  - Have a `dev` target stage
  - WORKDIR /app
  - Copy root package.json, bun.lockb*, tsconfig.json
  - Copy packages/client/package.json, packages/shared/package.json, and packages/server/package.json (needed for workspace resolution)
  - Run `bun install`
  - Copy packages/client/ and packages/shared/ source (overridden by volume mounts in dev)
  - EXPOSE 5173
  - CMD `["bunx", "vite", "--host", "0.0.0.0"]` (runs Vite dev server)

  The structure should mirror the server Dockerfile's dev target pattern but for the client.

  Create `Caddyfile.local` for the production-like local setup:
  ```
  localhost {
      reverse_proxy app:3000
      log {
          output stdout
      }
  }
  ```

  Key differences from production Caddyfile:
  - `localhost` instead of `splatmonkey.com` (Caddy auto-generates self-signed cert)
  - `app:3000` instead of `localhost:3000` (Docker service networking)
  - Log to stdout instead of file (easier to see in docker compose logs)
  </action>
  <verify>
  Run `docker compose config` to verify docker-compose.yml is valid with the new client Dockerfile.
  Run `docker compose -f docker-compose.prod.yml config` after Task 2 creates it.
  </verify>
  <done>packages/client/Dockerfile exists with dev target. Caddyfile.local exists with localhost config. `docker compose config` succeeds without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Create docker-compose.prod.yml and add Makefile targets</name>
  <files>docker-compose.prod.yml, Makefile</files>
  <action>
  Create `docker-compose.prod.yml` that mirrors production architecture:

  ```yaml
  services:
    app:
      build:
        context: .
        dockerfile: packages/server/Dockerfile
        target: production
      expose:
        - "3000"
      environment:
        - NODE_ENV=production
        - PORT=3000
      restart: unless-stopped

    caddy:
      image: caddy:2-alpine
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./Caddyfile.local:/etc/caddy/Caddyfile
        - caddy_data:/data
        - caddy_config:/config
      depends_on:
        - app
      restart: unless-stopped

  volumes:
    caddy_data:
    caddy_config:
  ```

  Key design choices:
  - `app` service uses `expose` not `ports` — only Caddy should be publicly accessible (mirrors production where Bun binds to 127.0.0.1:3000)
  - `caddy:2-alpine` official image (small, production-ready)
  - Named volumes for Caddy data/config (persists auto-generated TLS certs across restarts)
  - Service named `app` to match docker-compose.tunnel.yml pattern
  - No hot-reload, no volume mounts for source — this IS the production image

  Add to Makefile (after the `tunnel` target):

  ```makefile
  prod-local: ## Start production-like environment with Caddy reverse proxy
  	docker compose -f docker-compose.prod.yml up --build

  prod-local-down: ## Stop production-like environment
  	docker compose -f docker-compose.prod.yml down -v --remove-orphans
  ```

  Also update the `.PHONY` line at top to include `prod-local prod-local-down`.

  Also update the `clean` target to also tear down prod-local:
  ```makefile
  clean: ## Clean up containers, volumes, and images
  	docker compose down -v --rmi local --remove-orphans
  	docker compose -f docker-compose.tunnel.yml down -v --remove-orphans
  	docker compose -f docker-compose.prod.yml down -v --remove-orphans
  ```
  </action>
  <verify>
  1. Run `docker compose -f docker-compose.prod.yml config` to validate compose file
  2. Run `make help` to verify new targets appear in help output
  3. Run `docker compose config` to verify existing docker-compose.yml still valid (regression check)
  </verify>
  <done>docker-compose.prod.yml exists with app + caddy services. Makefile has prod-local and prod-local-down targets. make help shows new targets. Existing make targets unchanged.</done>
</task>

<task type="auto">
  <name>Task 3: Verify dev workflow and prod-local build</name>
  <files></files>
  <action>
  Run verification commands to ensure nothing is broken:

  1. `docker compose config` — validates existing dev compose (with new client Dockerfile)
  2. `docker compose -f docker-compose.prod.yml config` — validates prod-local compose
  3. `docker compose -f docker-compose.prod.yml build` — build the production-like stack (unified server image + caddy)
  4. `make help` — verify all targets listed

  Do NOT run `make dev` or `make prod-local` (they start long-running services). Just validate configs and builds.

  If the build succeeds, the user can then run `make prod-local` and visit https://localhost to test. Caddy will show a browser TLS warning for the self-signed cert which is expected — the user clicks through it.
  </action>
  <verify>
  All 4 commands above succeed without errors. The production image builds successfully.
  </verify>
  <done>Dev workflow unbroken. Prod-local stack builds successfully. All Makefile targets visible in make help.</done>
</task>

</tasks>

<verification>
1. `docker compose config` succeeds (dev workflow intact)
2. `docker compose -f docker-compose.prod.yml config` succeeds (prod-local valid)
3. `docker compose -f docker-compose.prod.yml build` succeeds (images build)
4. `make help` shows dev, test, lint, type-check, tunnel, prod-local, prod-local-down, clean targets
5. Existing Makefile targets reference `client` and `server` services from docker-compose.yml (unchanged)
</verification>

<success_criteria>
- packages/client/Dockerfile exists with dev target matching server Dockerfile pattern
- docker-compose.prod.yml creates production-like stack: unified Bun server behind Caddy reverse proxy
- Caddyfile.local configured for localhost with Docker service networking
- `make prod-local` starts the stack, `make prod-local-down` stops it
- All existing Makefile targets (dev, test, lint, type-check, tunnel, clean) continue to work
- `make clean` also tears down prod-local containers
</success_criteria>

<output>
After completion, create `.planning/quick/019-add-caddy-to-docker-compose-to-match-pro/019-SUMMARY.md`
</output>
