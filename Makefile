.PHONY: help dev start build test test-server test-client clean lint lint-fix type-check type-check-server type-check-shared tunnel \
	deploy-server deploy-client deploy fly-secrets-set infra-init infra-plan infra-apply infra-destroy infra-edit-secrets infra-shell

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
	docker compose -f docker-compose.prod.yml down -v --rmi local --remove-orphans
	docker compose -f docker-compose.tunnel.yml down -v --remove-orphans
	docker compose -f docker-compose.infra.yml down -v --rmi local --remove-orphans

tunnel: ## Start cloudflared tunnel for mobile testing (one command)
	docker compose -f docker-compose.tunnel.yml up --build

# --- Deployment ---

SOPS_DECRYPT = cd infra && SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt sops -d --extract

FLYCTL = @FLY_TOKEN=$$($(SOPS_DECRYPT) '["fly_api_token"]' secrets.sops.yaml) && \
	docker run --rm -v "$(CURDIR):/app" -w /app -e "FLY_API_TOKEN=$$FLY_TOKEN" flyio/flyctl:latest

deploy-server: ## Deploy server to Fly.io
	$(FLYCTL) deploy

deploy-client: ## Deploy client to Cloudflare Pages
	@export VITE_SERVER_URL=$$($(SOPS_DECRYPT) '["vite_server_url"]' secrets.sops.yaml) && \
		cd packages/client && bunx vite build && cd ../.. && \
		export CLOUDFLARE_API_TOKEN=$$($(SOPS_DECRYPT) '["cloudflare_api_token"]' secrets.sops.yaml) && \
		export CLOUDFLARE_ACCOUNT_ID=$$($(SOPS_DECRYPT) '["cloudflare_account_id"]' secrets.sops.yaml) && \
		bunx wrangler pages deploy packages/client/dist --project-name=shit-head

deploy: ## Deploy both server and client
	$(MAKE) deploy-server
	$(MAKE) deploy-client

fly-secrets-set: ## Set Fly.io secrets (usage: make fly-secrets-set SECRETS="KEY=val KEY2=val2")
	$(FLYCTL) secrets set $(SECRETS)

# --- Infrastructure (OpenTofu + SOPS) ---

INFRA_RUN = docker compose -f docker-compose.infra.yml run --rm infra

infra-init: ## Init OpenTofu providers
	$(INFRA_RUN) init

infra-plan: ## Preview infrastructure changes
	$(INFRA_RUN) plan

infra-apply: ## Apply infrastructure changes
	$(INFRA_RUN) apply -auto-approve

infra-destroy: ## Tear down all infrastructure
	$(INFRA_RUN) destroy -auto-approve

infra-edit-secrets: ## Edit encrypted secrets (requires local sops + age)
	cd infra && EDITOR=nano SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt sops secrets.sops.yaml

infra-shell: ## Open debug shell in infra container
	$(INFRA_RUN) bash
