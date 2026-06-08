from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.routes import (
    activity,
    auth,
    billing,
    customers,
    health,
    metrics,
    notifications,
    team,
)
from app.config import settings

API_DESCRIPTION = """
**Pulse** — internal analytics dashboard API for a fictional B2B SaaS (API monitoring & uptime).

Endpoints power a Next.js dashboard covering subscription health: MRR, churn, cohort retention,
MRR movement, per-customer detail, team + notification settings.

Auth is JWT bearer. Obtain a token via `POST /api/auth/login` (email + password) or the
Google OAuth flow at `GET /api/auth/google/login`.
"""

tags_metadata = [
    {"name": "Health", "description": "Liveness and database readiness."},
    {"name": "Auth", "description": "Email/password + Google OAuth login. Returns JWT bearer tokens."},
    {"name": "Metrics", "description": "Aggregated subscription metrics: KPIs, timeseries, cohorts, MRR movement."},
    {"name": "Customers", "description": "Paginated customers, detail, per-customer revenue history."},
    {"name": "Activity", "description": "Recent activity feed derived from revenue events."},
    {"name": "Team", "description": "Team member management + invites."},
    {"name": "Billing", "description": "Current plan + invoice history (mocked)."},
    {"name": "Notifications", "description": "User notification preferences."},
]


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(
    title="Pulse API",
    description=API_DESCRIPTION,
    version="0.1.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret_key)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(team.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {
        "name": "Pulse API",
        "version": "0.1.0",
        "docs": "/docs",
        "openapi": "/openapi.json",
    }
