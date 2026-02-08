.PHONY: help dev start build test test-server test-client clean lint type-check type-check-server type-check-shared

.DEFAULT_GOAL := help

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment with hot reload
	docker compose up --build

start: ## Start production-like environment
	docker compose -f docker-compose.prod.yml up --build

build: ## Build production images
	docker compose -f docker-compose.prod.yml build

test: ## Run all tests
	docker compose run --rm client bunx vitest run
	docker compose run --rm server bunx vitest run

test-server: ## Run server tests only
	docker compose run --rm server bunx vitest run

test-client: ## Run client tests only
	docker compose run --rm client bunx vitest run

lint: ## Run linter
	docker compose run --rm client bunx eslint .

type-check: ## Run TypeScript type checking (all packages)
	docker compose run --rm server bunx tsc --noEmit -p packages/shared/tsconfig.json
	docker compose run --rm server bunx tsc --noEmit -p packages/server/tsconfig.json
	docker compose run --rm client bunx vue-tsc --noEmit

type-check-shared: ## Run shared package type checking
	docker compose run --rm server bunx tsc --noEmit -p packages/shared/tsconfig.json

type-check-server: ## Run server type checking
	docker compose run --rm server bunx tsc --noEmit -p packages/server/tsconfig.json

clean: ## Clean up containers, volumes, and images
	docker compose down -v --rmi local
	docker compose -f docker-compose.prod.yml down -v --rmi local
