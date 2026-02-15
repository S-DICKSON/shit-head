---
phase: quick
plan: 016
type: execute
wave: 1
depends_on: []
files_modified:
  - fly.toml
  - README.MD
autonomous: true

must_haves:
  truths:
    - "fly.toml no longer exists in the repository"
    - "README has a clear Getting Started / Development section"
    - "README links to infra/ directory for infrastructure docs"
    - "README documents key Makefile commands (dev, test, lint, type-check, tunnel)"
  artifacts:
    - path: "README.MD"
      provides: "Updated project README with development guide"
      contains: "make dev"
  key_links: []
---

<objective>
Remove the stale fly.toml (Fly.io is no longer used -- the project deployed to Oracle Cloud via unified Docker image since Phase 12) and rewrite the README to serve as a useful developer onboarding guide: how to get started, key commands, project structure, and a pointer to infrastructure docs.

Purpose: Clean up a stale deployment artifact and make the README useful for anyone cloning the repo.
Output: Deleted fly.toml, rewritten README.MD
</objective>

<execution_context>
@/Users/stephendickson/.claude/get-shit-done/workflows/execute-plan.md
@/Users/stephendickson/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@Makefile
@package.json
@docker-compose.yml
@README.MD
@fly.toml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove fly.toml and update README</name>
  <files>fly.toml, README.MD</files>
  <action>
1. Delete `fly.toml` from the repository root. This file configured Fly.io deployment which is no longer used (project migrated to Oracle Cloud unified Docker deployment in Phase 12).

2. Rewrite `README.MD` with the following structure. Keep the existing game rules content but restructure and add development sections:

**Structure:**

```
# Shithead Online

Brief 2-3 sentence description: Multiplayer browser-based Shithead card game. Play with 2-4 friends online -- no accounts needed. Built with Vue 3, Bun, and WebSockets.

Screenshot (keep existing img.png reference)

## Getting Started

### Prerequisites
- Docker and Docker Compose (all dev tooling runs in containers)
- Git

### Development
1. Clone the repo
2. Run `make dev` to start the development environment with hot reload
3. Open http://localhost:5173 in your browser

That's it. No local Bun/Node installation required.

## Project Structure

Bun monorepo with three packages:

| Package | Description |
|---------|-------------|
| `packages/client` | Vue 3 + Vite + Tailwind CSS v4 frontend |
| `packages/server` | Bun WebSocket game server |
| `packages/shared` | Shared types, schemas (Zod), and game logic |

## Useful Commands

All commands run via Docker Compose through the Makefile:

| Command | Description |
|---------|-------------|
| `make dev` | Start development environment with hot reload |
| `make test` | Run all tests (client + server) |
| `make test-server` | Run server tests only |
| `make test-client` | Run client tests only |
| `make lint` | Run ESLint on all packages |
| `make lint-fix` | Auto-fix linting issues |
| `make type-check` | Run TypeScript type checking (all packages) |
| `make tunnel` | Start cloudflared tunnel for mobile testing |
| `make clean` | Clean up containers, volumes, and images |

Run `make help` to see all available targets.

## Infrastructure

Infrastructure-as-code lives in the `infra/` directory. See `infra/Makefile` for provisioning commands (OpenTofu + Infisical for secrets management).

CI/CD is handled by GitHub Actions (`.github/workflows/`):
- `ci.yml` -- type-check, lint, and test on every PR
- `deploy.yml` -- build and deploy on merge to main
- `rollback.yml` -- rollback to a previous deployment

## Game Rules

(Keep ALL existing game rules content from the current README: "What is it?", Deal, Card Abilities, Card Values, Gameplay, Burn, The Endgame sections -- preserve them exactly as-is but under this "Game Rules" heading)
```

Important notes:
- Keep the existing `img.png` screenshot reference
- Preserve ALL existing game rules text verbatim (everything from "What is it?" through "The Endgame")
- Use `--` (em dash) not unicode em dashes
- Do NOT add a "Vision" section (the old one is redundant with the new intro)
- Do NOT add badges, shields, or other decorative elements
  </action>
  <verify>
- `test ! -f fly.toml` (fly.toml deleted)
- `grep -q "make dev" README.MD` (development commands documented)
- `grep -q "infra/" README.MD` (infrastructure link present)
- `grep -q "make test" README.MD` (testing commands documented)
- `grep -q "Card Abilities" README.MD` (game rules preserved)
  </verify>
  <done>
- fly.toml is deleted from the repository
- README.MD contains: project intro, getting started guide, project structure, useful commands table, infrastructure link, and all original game rules
  </done>
</task>

</tasks>

<verification>
- `test ! -f fly.toml` -- stale Fly.io config removed
- `grep -c "make" README.MD` returns 8+ (all Makefile commands documented)
- `grep -q "infra/" README.MD` -- infrastructure directory referenced
- Game rules content preserved (Card Abilities, Card Values, Gameplay, Burn, The Endgame all present)
</verification>

<success_criteria>
- fly.toml no longer exists in the repo
- README serves as a useful developer onboarding guide with clear getting-started instructions
- All key Makefile commands are documented
- Infrastructure docs are linked
- Original game rules are preserved
</success_criteria>

<output>
After completion, create `.planning/quick/016-cleanup-fly-toml-and-update-readme/016-SUMMARY.md`
</output>
