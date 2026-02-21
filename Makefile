.PHONY: help install dev test test-server test-client clean lint lint-fix type-check type-check-server type-check-shared tunnel dev-discord dev-discord-down prod-local prod-local-down e2e e2e-ui e2e-report

.DEFAULT_GOAL := help

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies locally (for IDE support)
	docker run --rm -v $(CURDIR):/app -w /app oven/bun:1 bun install

dev: install ## Start development environment with hot reload
	docker compose up --build

test: ## Run all tests
	docker compose run --rm client bunx vitest run
	docker compose run --rm server bunx vitest run

test-server: ## Run server tests only
	docker compose run --rm server bunx vitest run

test-client: ## Run client tests only
	docker compose run --rm client bunx vitest run

lint: ## Run linter on all packages
	docker compose run --rm server sh -c "cd /app/packages/shared && bunx eslint ."
	docker compose run --rm server sh -c "cd /app/packages/server && bunx eslint ."
	docker compose run --rm client bunx eslint .

lint-fix: ## Auto-fix linting issues
	docker compose run --rm server sh -c "cd /app/packages/shared && bunx eslint . --fix"
	docker compose run --rm server sh -c "cd /app/packages/server && bunx eslint . --fix"
	docker compose run --rm client bunx eslint . --fix

type-check: ## Run TypeScript type checking (all packages)
	docker compose run --rm server bunx tsc --build packages/shared/tsconfig.json
	docker compose run --rm server bunx tsc --noEmit -p packages/server/tsconfig.json
	docker compose run --rm client bunx vue-tsc --noEmit

type-check-shared: ## Run shared package type checking
	docker compose run --rm server bunx tsc --noEmit -p packages/shared/tsconfig.json

type-check-server: ## Run server type checking
	docker compose run --rm server bunx tsc --build packages/shared/tsconfig.json
	docker compose run --rm server bunx tsc --noEmit -p packages/server/tsconfig.json

clean: ## Clean up containers, volumes, and images
	docker compose down -v --rmi local --remove-orphans
	docker compose -f docker-compose.tunnel.yml down -v --remove-orphans
	docker compose -f docker-compose.discord.yml down -v --remove-orphans
	docker compose -f docker-compose.prod.yml down -v --remove-orphans

tunnel: ## Start cloudflared tunnel for mobile testing (one command)
	docker compose -f docker-compose.tunnel.yml up --build

dev-discord: install ## Start Discord Activity dev environment (with cloudflared tunnel)
	@if [ ! -f packages/server/.env ]; then echo "ERROR: packages/server/.env missing — cp packages/server/.env.example packages/server/.env"; exit 1; fi
	@if [ ! -f packages/client/.env ]; then echo "ERROR: packages/client/.env missing — cp packages/client/.env.example packages/client/.env"; exit 1; fi
	set -a && . packages/client/.env && set +a && docker compose -f docker-compose.discord.yml up --build

dev-discord-down: ## Stop Discord Activity dev environment
	docker compose -f docker-compose.discord.yml down -v --remove-orphans

prod-local: ## Start production-like environment with Caddy reverse proxy
	docker compose -f docker-compose.prod.yml up --build

prod-local-down: ## Stop production-like environment
	docker compose -f docker-compose.prod.yml down -v --remove-orphans

e2e: ## Run Playwright E2E tests (local, no Docker)
	cd packages/e2e && bunx playwright test

e2e-ui: ## Run Playwright E2E tests with UI mode
	cd packages/e2e && bunx playwright test --ui

e2e-report: ## Open last Playwright test report
	cd packages/e2e && bunx playwright show-report
