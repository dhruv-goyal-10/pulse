# Pulse Backend

FastAPI + PostgreSQL API powering the Pulse dashboard. Async SQLAlchemy 2.0, Alembic migrations, JWT auth with optional Google OAuth.

## Prerequisites

- Python 3.11+
- Docker (for local Postgres) OR your own Postgres 14+

## Setup

**1. Start Postgres** (from the repo root):

```bash
docker compose up -d postgres
```

**2. Create a venv and install deps:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**3. Copy env template:**

```bash
cp .env.example .env
# Optional: edit .env to set a real JWT_SECRET_KEY:
#   python -c "import secrets; print(secrets.token_hex(32))"
```

**4. Generate + run the initial migration:**

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

**5. Seed the database:**

```bash
python -m scripts.seed
```

**6. Start the API:**

```bash
uvicorn app.main:app --reload
```

Open <http://localhost:8000/docs> — auto-generated Swagger UI.

## Auth

- **Email + password** (demo): `demo@pulse.app` / `demo123` (from `.env`)
- **Google OAuth** (optional): set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env`, restart, then hit `GET /api/auth/google/login`

## Testing

```bash
pytest
```

## Project layout

```
backend/
├── app/
│   ├── main.py           FastAPI app + router registration
│   ├── config.py         Pydantic settings
│   ├── database.py       Async engine + session
│   ├── models/           SQLAlchemy models
│   ├── schemas/          Pydantic request/response schemas
│   ├── core/             Cross-cutting: security, oauth
│   └── api/
│       ├── deps.py       get_db, get_current_user
│       └── routes/       Endpoint modules
├── alembic/              Migration environment + versions
├── scripts/
│   └── seed.py           Faker-based seed script
└── tests/                pytest
```
