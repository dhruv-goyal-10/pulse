.PHONY: help db-up db-down backend-install backend-migrate backend-seed backend-dev backend-test frontend-install frontend-dev fmt

help:
	@echo "Pulse - convenience commands"
	@echo ""
	@echo "  make db-up             Start local Postgres via docker compose"
	@echo "  make db-down           Stop Postgres"
	@echo "  make backend-install   pip install requirements"
	@echo "  make backend-migrate   Generate + apply Alembic migrations"
	@echo "  make backend-seed      Seed the database"
	@echo "  make backend-dev       Run FastAPI with auto-reload"
	@echo "  make backend-test      Run pytest"
	@echo "  make frontend-install  npm install"
	@echo "  make frontend-dev      Run Next.js dev server"

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

backend-install:
	cd backend && pip install -r requirements.txt

backend-migrate:
	cd backend && alembic revision --autogenerate -m "$(msg)" && alembic upgrade head

backend-seed:
	cd backend && python -m scripts.seed

backend-dev:
	cd backend && uvicorn app.main:app --reload

backend-test:
	cd backend && pytest

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev
