# Convenience wrappers. Everything here is a plain command you can also run by hand.
.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help db-up db-down api web test test-api test-web build clean check-db

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

db-up: ## Start the Postgres container
	docker compose up -d postgres

db-down: ## Stop the database (keeps the volume)
	docker compose stop postgres

api: ## Run the API on :8080 with the dev profile (seeds demo data)
	cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

web: ## Run the Angular dev server on :4200
	cd frontend && npm start

test: test-api test-web ## Run every test suite

test-api: ## Backend tests (unit + integration on in-memory H2)
	cd backend && ./mvnw test

test-web: ## Frontend tests (vitest, single run)
	cd frontend && npm run test:ci

check-db: ## Validate a DATABASE_URL before deploying (DATABASE_URL=... make check-db)
	./scripts/verify-database-url.sh

build: ## Production build of both halves
	cd backend && ./mvnw -DskipTests package
	cd frontend && npm run build

clean: ## Remove build output
	cd backend && ./mvnw clean
	rm -rf frontend/dist frontend/.angular
