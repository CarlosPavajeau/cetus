# Local development shortcuts. The heavy lifting lives in scripts/dev.sh.
.DEFAULT_GOAL := help
.PHONY: help setup dev dev-mock console api worker mock infra infra-down infra-logs migrate test-console \
	bench-up bench-seed bench bench-down

DEV := scripts/dev.sh

help: ## Show this help
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{ printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }'

setup: ## First-time setup: pnpm install, containers, auth migrations, Java build
	@$(DEV) setup

dev: ## Start infra + console, API and worker in this terminal (Ctrl+C stops them)
	@$(DEV)

dev-mock: ## Same as dev, plus the DIAN mock with the worker pointing at it
	@$(DEV) --mock

console: ## Start only the console (:3000)
	@$(DEV) console

api: ## Start only the API (:8080)
	@$(DEV) api

worker: ## Start only the worker (:8081)
	@$(DEV) worker

mock: ## Start only the DIAN mock (:8090)
	@$(DEV) mock

infra: ## Start Postgres and LocalStack and wait until they are ready
	@$(DEV) infra

infra-down: ## Stop the containers (the Postgres volume is kept)
	docker compose down

infra-logs: ## Follow the container logs
	docker compose logs -f

migrate: ## Apply the console's auth-schema migrations (Flyway runs when the API starts)
	pnpm --filter @cetus/console db:migrate

test-console: ## Console integration (Vitest) and e2e (Playwright) tests; needs `make dev-mock` running
	pnpm --filter @cetus/console test

bench-up: ## Benchmark: build and start the production images with Railway's limits (bench/README.md)
	@bench/bench.sh up

bench-seed: ## Benchmark: create tenants and a document history in the benchmark stack
	@bench/bench.sh seed

bench: ## Benchmark: run a k6 scenario, e.g. make bench SCENARIO=public-api PROFILE=load RATE=200
	@bench/bench.sh run $(or $(SCENARIO),public-api)

bench-down: ## Benchmark: stop the stack (its database volume is kept)
	@bench/bench.sh down
