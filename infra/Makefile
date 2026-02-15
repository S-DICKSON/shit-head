.PHONY: help up down login shell init plan apply apply-retry destroy output ssh

.DEFAULT_GOAL := help

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

INFRA_EXEC = docker compose exec infra bash -c

up: ## Start infra container (builds only if needed)
	@docker compose ps --status running --format '{{.Name}}' | grep -q infra || docker compose up -d --build

down: ## Stop infra container
	docker compose down

login: up ## Login to Infisical (run once per container)
	docker compose exec infra bash -c "infisical login && infisical init"

shell: up ## Open interactive shell in infra container
	docker compose exec infra bash

init: up ## Init OpenTofu providers
	$(INFRA_EXEC) "tofu init"

plan: up ## Preview infrastructure changes (secrets via Infisical)
	$(INFRA_EXEC) "infisical run --env=prod -- tofu plan"

apply: up ## Apply infrastructure changes (secrets via Infisical)
	$(INFRA_EXEC) "infisical run --env=prod -- tofu apply"

apply-retry: up ## Retry apply every 5 min until capacity available
	@echo "Retrying tofu apply until capacity is available (Ctrl+C to stop)..."
	@attempt=1; while true; do \
		echo "\n=== Attempt $$attempt — $$(date) ==="; \
		$(INFRA_EXEC) "infisical run --env=prod -- tofu apply -auto-approve" && { echo "\n✓ Instance provisioned!"; break; }; \
		echo "Out of capacity. Retrying in 5 minutes..."; \
		sleep 300; \
		attempt=$$((attempt + 1)); \
	done

destroy: up ## Tear down all infrastructure (secrets via Infisical)
	$(INFRA_EXEC) "infisical run --env=prod -- tofu destroy"

output: up ## Show infrastructure outputs
	$(INFRA_EXEC) "tofu output"

ssh: up ## SSH into the VPS (key via Infisical)
	docker compose exec infra bash -c "infisical run --env=prod -- sh -c 'echo \"\$$VPS_SSH_PRIVATE_KEY\" > /tmp/vps_key && chmod 600 /tmp/vps_key && ssh -o StrictHostKeyChecking=no -i /tmp/vps_key root@46.225.52.135; rm -f /tmp/vps_key'"
