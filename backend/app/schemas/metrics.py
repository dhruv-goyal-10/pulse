from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


PeriodLiteral = Literal["7d", "30d", "90d", "custom"]
Granularity = Literal["daily", "weekly", "monthly", "quarterly"]


class KpiValue(BaseModel):
    value: float
    delta_pct: float | None = Field(default=None, description="Percent change vs previous period; null when previous is zero")
    delta_direction: Literal["up", "down", "flat"] | None = None
    invert_color: bool = Field(default=False, description="True when 'up' should be shown as bad (e.g. churn rate)")


class KpisResponse(BaseModel):
    mrr: KpiValue
    active_subscriptions: KpiValue
    churn_rate: KpiValue
    arpu: KpiValue
    period_days: int


class RevenueTimeseriesPoint(BaseModel):
    date: date
    total_mrr: float
    new: float
    expansion: float
    contraction: float
    churn: float


class RevenueTimeseriesResponse(BaseModel):
    granularity: Granularity
    from_date: date
    to_date: date
    points: list[RevenueTimeseriesPoint]


class PlanBreakdown(BaseModel):
    plan: str
    customers: int
    mrr: float
    pct_of_mrr: float


class RevenueByPlanResponse(BaseModel):
    total_mrr: float
    tiers: list[PlanBreakdown]


class MrrMovementResponse(BaseModel):
    from_date: date
    to_date: date
    new_starter: float
    new_growth: float
    new_scale: float
    expansion_growth: float
    expansion_scale: float
    contraction: float
    churn: float
    net: float


class CohortRow(BaseModel):
    cohort: str
    cohort_size: int
    retention: list[float | None] = Field(description="Retention pct at offset 0..N; null when the cell is in the future")


class CohortGridResponse(BaseModel):
    granularity: Granularity
    look_forward: int
    rows: list[CohortRow]


class ActivityItem(BaseModel):
    id: str
    event_type: str
    amount: float
    event_date: date
    customer_name: str
    company: str
    from_plan: str | None = None
    to_plan: str | None = None
    label: str = Field(description="Human-readable summary, e.g. 'Acme Corp upgraded to Growth'")


class ActivityFeedResponse(BaseModel):
    items: list[ActivityItem]
