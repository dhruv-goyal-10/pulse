# Pulse — Internal Analytics Dashboard

A portfolio-quality full-stack SaaS admin dashboard. **Pulse** is a fictional API monitoring & uptime SaaS (Starter / Growth / Scale plans at $29 / $99 / $299 per month), and this repo is the internal analytics dashboard its own team would use to watch subscription health.

Built to demonstrate:

- Real subscription analytics — **MRR, ARPU, churn rate, cohort retention, MRR movement waterfall** — not fake stat tiles.
- A proper backend architecture: FastAPI + async SQLAlchemy + Postgres + Alembic + Pydantic v2.
- **JWT auth with a Google OAuth option** — the pattern real internal SaaS tools use.
- Auto-generated OpenAPI docs at `/docs`.
- A polished dark-mode-first Next.js 15 dashboard with skeleton loading states, empty states, debounced search, sortable/filterable tables, slide-over customer detail, and interactive charts (Recharts).

## Stack

| Layer | Choices |
|-------|---------|
| Backend | FastAPI · SQLAlchemy 2.0 async · asyncpg · PostgreSQL · Alembic · Pydantic v2 · JWT (python-jose) · Google OAuth (Authlib) · pytest |
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · shadcn/ui · TanStack Query · Recharts · next-themes |
| Infra | Docker Compose (local Postgres) · Caddy + sslip.io (VM deploy) or Vercel + Render (fallback) |

## Quick start (local, ~5 min)

```bash
# 1. Postgres (from repo root)
docker compose up -d postgres

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Then:

- **Dashboard**: <http://localhost:3000> — sign in with `demo@pulse.app` / `demo123`
- **API docs (Swagger)**: <http://localhost:8000/docs>

## What's in the box

### Backend — ~24 endpoints

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /login` · `GET /me` · `POST /logout` · `GET /google/login` · `GET /google/callback` |
| Metrics | `GET /kpis` · `/revenue-timeseries` · `/revenue-by-plan` · `/mrr-movement` · `/cohorts` |
| Customers | Paginated + filtered + sorted list · detail · per-customer revenue history |
| Team | List · invite · update role · remove (admin-gated) |
| Billing | Current plan + invoice history (mocked) |
| Notifications | Read + patch user preferences |
| Activity | Recent event feed for the overview page |
| Health | Liveness + DB readiness |

Interesting bits:

- **Cohort retention** is computed by joining every customer's signup with their (optional) churn event and asking, for each cohort × month-offset, how many are still alive. Pure Python-side aggregation over query results — testable and portable.
- **Point-in-time MRR** is derived as `SUM(revenue_events.amount) WHERE event_date <= as_of`, which mirrors how real SaaS accounting handles retroactive MRR. Same principle powers the "vs last month" KPI deltas.
- **Sortable customer list** uses a **whitelisted sort field map** — no SQL injection surface.
- **JWT + Google OAuth** issue the same token type, so `/auth/me` doesn't care how you got in.

### Frontend — 4 pages

1. **Overview** — 4 KPI cards (MRR / Active subs / Churn / ARPU) with directional deltas (churn is inverted — red when up), revenue chart with a Total/Movement toggle and 7d/30d/90d range, plan donut with legend, activity feed.
2. **Customers** — paginated table with debounced search, status pill filters, click-any-column sort, and a slide-over detail with a per-customer running-MRR chart + plan-change history.
3. **Revenue** — MRR movement waterfall (new / expansion / contraction / churn / net) and a color-graded cohort retention grid, both with monthly/quarterly toggles.
4. **Settings** — Team tab (list, invite modal, remove) · Billing tab (plan + payment method + invoice history) · Notifications tab (toggle switches wired to backend).

Polish details: skeleton loading on every fetch, designed empty states with "Clear filters" CTAs, dark mode default with a header toggle, tablet responsive.

## Data model

Two core tables plus auth/team/notifications:

- **`customers`**: id, name, company, email, plan, status, mrr, signup_date, last_active
- **`revenue_events`**: id, customer_id, event_type (new/expansion/contraction/churn), amount, event_date, from_plan, to_plan
- **`users`**, **`team_invites`**, **`notification_preferences`**: auth + team + prefs

Seed: `~200 customers · 18 months of history · realistic churn & upgrade distributions` via `scripts/seed.py`.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for both:

1. **Oracle Cloud Always-Free VM** (recommended — no cold starts, no expiry): Docker Compose + Caddy with automatic HTTPS via `sslip.io` (no domain purchase needed).
2. **Render + Neon fallback**: serverless-y path if you don't want to babysit a VM.

## Testing

```bash
cd backend
pytest
```

Unit tests cover the metric math helpers (percent-change, quarter/month floors, retention math, activity labels).

## Repo layout

```
pulse/
├── backend/         FastAPI + SQLAlchemy + Alembic + tests
├── frontend/        Next.js 15 App Router
├── docs/            Deployment guides
├── docker-compose.yml   Local Postgres
└── README.md
```

## License

MIT. Use freely for learning, portfolio inspiration, or as a starting point.
