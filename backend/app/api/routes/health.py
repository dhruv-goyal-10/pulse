from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Liveness check")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/health/db", summary="Database readiness check")
async def health_db(db: DbSession) -> dict:
    result = await db.execute(text("SELECT 1"))
    return {"status": "ok", "db": result.scalar_one()}
