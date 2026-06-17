from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.metrics import (
    CohortGridResponse,
    KpisResponse,
    MrrMovementResponse,
    RevenueByPlanResponse,
    RevenueTimeseriesResponse,
)
from app.services import metrics as svc

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/kpis", response_model=KpisResponse, summary="Overview page KPI cards")
async def get_kpis(
    _: CurrentUser,
    db: DbSession,
    period: Annotated[str, Query(pattern="^(7d|30d|90d)$")] = "30d",
) -> KpisResponse:
    return await svc.compute_kpis(db, svc.period_to_days(period))


@router.get(
    "/revenue-timeseries",
    response_model=RevenueTimeseriesResponse,
    summary="Revenue over time with new / expansion / contraction / churn breakdown",
)
async def get_revenue_timeseries(
    _: CurrentUser,
    db: DbSession,
    from_date: Annotated[date | None, Query(alias="from")] = None,
    to_date: Annotated[date | None, Query(alias="to")] = None,
) -> RevenueTimeseriesResponse:
    today = date.today()
    to_date = to_date or today
    from_date = from_date or (today - timedelta(days=90))
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="from must be <= to")
    return await svc.compute_revenue_timeseries(db, from_date, to_date)


@router.get(
    "/revenue-by-plan",
    response_model=RevenueByPlanResponse,
    summary="Current MRR split by plan tier (donut chart)",
)
async def get_revenue_by_plan(_: CurrentUser, db: DbSession) -> RevenueByPlanResponse:
    return await svc.compute_revenue_by_plan(db)


@router.get(
    "/mrr-movement",
    response_model=MrrMovementResponse,
    summary="Waterfall totals: new / expansion / contraction / churn / net",
)
async def get_mrr_movement(
    _: CurrentUser,
    db: DbSession,
    from_date: Annotated[date | None, Query(alias="from")] = None,
    to_date: Annotated[date | None, Query(alias="to")] = None,
) -> MrrMovementResponse:
    today = date.today()
    to_date = to_date or today
    from_date = from_date or (today - timedelta(days=30))
    return await svc.compute_mrr_movement(db, from_date, to_date)


@router.get(
    "/cohorts",
    response_model=CohortGridResponse,
    summary="Cohort retention grid (rows = signup cohort, columns = months since signup)",
)
async def get_cohorts(
    _: CurrentUser,
    db: DbSession,
    granularity: Annotated[str, Query(pattern="^(monthly|quarterly)$")] = "monthly",
    periods_back: Annotated[int, Query(ge=1, le=24)] = 12,
    look_forward: Annotated[int, Query(ge=1, le=12)] = 7,
) -> CohortGridResponse:
    return await svc.compute_cohorts(db, granularity, periods_back, look_forward)
