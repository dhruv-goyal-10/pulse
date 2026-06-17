"""Pure metric computations. Kept small and testable — routes just call these."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Iterable

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Customer, CustomerStatus, RevenueEvent, RevenueEventType


# ---------- helpers ----------


def period_to_days(period: str) -> int:
    return {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)


def pct_change(previous: float, current: float) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 2)


def direction(prev: float, curr: float) -> str:
    if curr > prev:
        return "up"
    if curr < prev:
        return "down"
    return "flat"


def month_floor(d: date) -> date:
    return d.replace(day=1)


def quarter_floor(d: date) -> date:
    q_month = ((d.month - 1) // 3) * 3 + 1
    return date(d.year, q_month, 1)


def add_months(d: date, n: int) -> date:
    month_index = d.year * 12 + (d.month - 1) + n
    year, month = divmod(month_index, 12)
    return date(year, month + 1, 1)


def add_quarters(d: date, n: int) -> date:
    return add_months(d, n * 3)


# ---------- point-in-time state ----------


async def mrr_as_of(db: AsyncSession, as_of: date) -> Decimal:
    """Net MRR at end-of-day `as_of`, derived from cumulative event amounts."""
    stmt = select(func.coalesce(func.sum(RevenueEvent.amount), 0)).where(
        RevenueEvent.event_date <= as_of
    )
    return Decimal(str((await db.execute(stmt)).scalar_one()))


async def active_subs_as_of(db: AsyncSession, as_of: date) -> int:
    """Distinct customers who had a `new` event by `as_of` and no `churn` event by then."""
    churned_subq = (
        select(RevenueEvent.customer_id)
        .where(RevenueEvent.event_type == RevenueEventType.churn)
        .where(RevenueEvent.event_date <= as_of)
    )
    stmt = (
        select(func.count(distinct(RevenueEvent.customer_id)))
        .where(RevenueEvent.event_type == RevenueEventType.new)
        .where(RevenueEvent.event_date <= as_of)
        .where(RevenueEvent.customer_id.not_in(churned_subq))
    )
    return int((await db.execute(stmt)).scalar_one() or 0)


async def churn_count_in_range(db: AsyncSession, start: date, end: date) -> int:
    stmt = (
        select(func.count())
        .select_from(RevenueEvent)
        .where(RevenueEvent.event_type == RevenueEventType.churn)
        .where(RevenueEvent.event_date > start)
        .where(RevenueEvent.event_date <= end)
    )
    return int((await db.execute(stmt)).scalar_one() or 0)


# ---------- KPI aggregation ----------


async def compute_kpis(db: AsyncSession, period_days: int, today: date | None = None) -> dict:
    today = today or date.today()
    period_start = today - timedelta(days=period_days)
    prev_start = period_start - timedelta(days=period_days)

    current_mrr = float(await mrr_as_of(db, today))
    past_mrr = float(await mrr_as_of(db, period_start))

    current_subs = await active_subs_as_of(db, today)
    past_subs = await active_subs_as_of(db, period_start)

    churn_now = await churn_count_in_range(db, period_start, today)
    churn_prev = await churn_count_in_range(db, prev_start, period_start)
    subs_at_period_start = past_subs
    subs_at_prev_start = await active_subs_as_of(db, prev_start)

    churn_rate = (churn_now / subs_at_period_start * 100) if subs_at_period_start else 0.0
    prev_churn_rate = (churn_prev / subs_at_prev_start * 100) if subs_at_prev_start else 0.0

    arpu = current_mrr / current_subs if current_subs else 0.0
    past_arpu = past_mrr / past_subs if past_subs else 0.0

    return {
        "mrr": {
            "value": round(current_mrr, 2),
            "delta_pct": pct_change(past_mrr, current_mrr),
            "delta_direction": direction(past_mrr, current_mrr),
            "invert_color": False,
        },
        "active_subscriptions": {
            "value": current_subs,
            "delta_pct": pct_change(past_subs, current_subs),
            "delta_direction": direction(past_subs, current_subs),
            "invert_color": False,
        },
        "churn_rate": {
            "value": round(churn_rate, 2),
            "delta_pct": pct_change(prev_churn_rate, churn_rate),
            "delta_direction": direction(prev_churn_rate, churn_rate),
            "invert_color": True,
        },
        "arpu": {
            "value": round(arpu, 2),
            "delta_pct": pct_change(past_arpu, arpu),
            "delta_direction": direction(past_arpu, arpu),
            "invert_color": False,
        },
        "period_days": period_days,
    }


# ---------- timeseries ----------


def _choose_granularity(days: int) -> str:
    if days <= 45:
        return "daily"
    if days <= 120:
        return "weekly"
    return "monthly"


def _bucket_date(d: date, granularity: str) -> date:
    if granularity == "daily":
        return d
    if granularity == "weekly":
        return d - timedelta(days=d.weekday())
    return month_floor(d)


async def compute_revenue_timeseries(
    db: AsyncSession, from_date: date, to_date: date
) -> dict:
    days = (to_date - from_date).days
    granularity = _choose_granularity(days)

    events_stmt = (
        select(RevenueEvent.event_date, RevenueEvent.event_type, RevenueEvent.amount)
        .where(RevenueEvent.event_date <= to_date)
        .order_by(RevenueEvent.event_date)
    )
    all_events = (await db.execute(events_stmt)).all()

    starting_mrr = Decimal("0")
    per_bucket_movement: dict[date, dict[str, Decimal]] = defaultdict(
        lambda: {"new": Decimal("0"), "expansion": Decimal("0"), "contraction": Decimal("0"), "churn": Decimal("0")}
    )
    running_mrr = Decimal("0")
    end_of_bucket_mrr: dict[date, Decimal] = {}

    for event_date, event_type, amount in all_events:
        running_mrr += Decimal(str(amount))
        if event_date < from_date:
            starting_mrr = running_mrr
            continue
        bucket = _bucket_date(event_date, granularity)
        per_bucket_movement[bucket][event_type.value] += Decimal(str(amount))
        end_of_bucket_mrr[bucket] = running_mrr

    if not per_bucket_movement:
        per_bucket_movement[_bucket_date(from_date, granularity)]
        end_of_bucket_mrr[_bucket_date(from_date, granularity)] = running_mrr

    points = []
    last_mrr = starting_mrr
    for bucket in sorted(per_bucket_movement.keys()):
        movement = per_bucket_movement[bucket]
        last_mrr = end_of_bucket_mrr.get(bucket, last_mrr)
        points.append(
            {
                "date": bucket,
                "total_mrr": float(last_mrr),
                "new": float(movement["new"]),
                "expansion": float(movement["expansion"]),
                "contraction": float(movement["contraction"]),
                "churn": float(movement["churn"]),
            }
        )

    return {
        "granularity": granularity,
        "from_date": from_date,
        "to_date": to_date,
        "points": points,
    }


# ---------- plan breakdown ----------


async def compute_revenue_by_plan(db: AsyncSession) -> dict:
    stmt = (
        select(
            Customer.plan,
            func.count(Customer.id).label("customers"),
            func.coalesce(func.sum(Customer.mrr), 0).label("mrr"),
        )
        .where(Customer.status != CustomerStatus.churned)
        .group_by(Customer.plan)
    )
    rows = (await db.execute(stmt)).all()
    total_mrr = float(sum(float(r.mrr) for r in rows))
    tiers = [
        {
            "plan": r.plan.value,
            "customers": int(r.customers),
            "mrr": float(r.mrr),
            "pct_of_mrr": round(float(r.mrr) / total_mrr * 100, 2) if total_mrr else 0.0,
        }
        for r in rows
    ]
    tiers.sort(key=lambda x: x["mrr"], reverse=True)
    return {"total_mrr": round(total_mrr, 2), "tiers": tiers}


# ---------- MRR movement (waterfall) ----------


async def compute_mrr_movement(db: AsyncSession, from_date: date, to_date: date) -> dict:
    from app.models.customer import Plan

    stmt = (
        select(
            RevenueEvent.event_type,
            RevenueEvent.to_plan,
            func.coalesce(func.sum(RevenueEvent.amount), 0),
        )
        .where(RevenueEvent.event_date >= from_date)
        .where(RevenueEvent.event_date <= to_date)
        .group_by(RevenueEvent.event_type, RevenueEvent.to_plan)
    )

    breakdown = {
        "new_starter": 0.0,
        "new_growth": 0.0,
        "new_scale": 0.0,
        "expansion_growth": 0.0,
        "expansion_scale": 0.0,
        "contraction": 0.0,
        "churn": 0.0,
    }

    for event_type, to_plan, amount in (await db.execute(stmt)).all():
        amt = float(amount)
        if event_type == RevenueEventType.new:
            if to_plan == Plan.starter:
                breakdown["new_starter"] += amt
            elif to_plan == Plan.growth:
                breakdown["new_growth"] += amt
            elif to_plan == Plan.scale:
                breakdown["new_scale"] += amt
        elif event_type == RevenueEventType.expansion:
            if to_plan == Plan.growth:
                breakdown["expansion_growth"] += amt
            elif to_plan == Plan.scale:
                breakdown["expansion_scale"] += amt
        elif event_type == RevenueEventType.contraction:
            breakdown["contraction"] += amt
        elif event_type == RevenueEventType.churn:
            breakdown["churn"] += amt

    net = sum(breakdown.values())
    return {
        "from_date": from_date,
        "to_date": to_date,
        **{k: round(v, 2) for k, v in breakdown.items()},
        "net": round(net, 2),
    }


# ---------- cohorts ----------


async def compute_cohorts(
    db: AsyncSession, granularity: str = "monthly", periods_back: int = 12, look_forward: int = 7
) -> dict:
    floor = month_floor if granularity == "monthly" else quarter_floor
    step = add_months if granularity == "monthly" else add_quarters

    signups_stmt = select(Customer.id, Customer.signup_date)
    signups = {cid: signup for cid, signup in (await db.execute(signups_stmt)).all()}

    churn_stmt = select(RevenueEvent.customer_id, RevenueEvent.event_date).where(
        RevenueEvent.event_type == RevenueEventType.churn
    )
    churn_dates: dict = {cid: cd for cid, cd in (await db.execute(churn_stmt)).all()}

    cohorts: dict[date, list[tuple[date, date | None]]] = defaultdict(list)
    for cid, signup in signups.items():
        cohort_key = floor(signup)
        cohorts[cohort_key].append((signup, churn_dates.get(cid)))

    today = date.today()
    rows = []
    cohort_keys_sorted = sorted(cohorts.keys(), reverse=True)[:periods_back]

    for cohort_key in sorted(cohort_keys_sorted):
        members = cohorts[cohort_key]
        cohort_size = len(members)
        retention = []
        for offset in range(look_forward):
            check_at = step(cohort_key, offset + 1)
            if check_at > today:
                retention.append(None)
                continue
            still_active = sum(1 for _signup, churn in members if churn is None or churn >= check_at)
            retention.append(round(still_active / cohort_size * 100, 2) if cohort_size else 0.0)
        rows.append(
            {
                "cohort": cohort_key.isoformat(),
                "cohort_size": cohort_size,
                "retention": retention,
            }
        )

    return {"granularity": granularity, "look_forward": look_forward, "rows": rows}


# ---------- activity feed ----------


def _activity_label(event_type: str, company: str, to_plan: str | None, from_plan: str | None) -> str:
    if event_type == "new":
        return f"{company} signed up on {(to_plan or '').title()}"
    if event_type == "expansion":
        return f"{company} upgraded from {(from_plan or '').title()} to {(to_plan or '').title()}"
    if event_type == "contraction":
        return f"{company} downgraded from {(from_plan or '').title()} to {(to_plan or '').title()}"
    if event_type == "churn":
        return f"{company} churned from {(from_plan or '').title()}"
    return f"{company} — {event_type}"


async def compute_activity_feed(db: AsyncSession, limit: int = 10) -> dict:
    stmt = (
        select(
            RevenueEvent.id,
            RevenueEvent.event_type,
            RevenueEvent.amount,
            RevenueEvent.event_date,
            RevenueEvent.from_plan,
            RevenueEvent.to_plan,
            Customer.name,
            Customer.company,
        )
        .join(Customer, Customer.id == RevenueEvent.customer_id)
        .order_by(RevenueEvent.event_date.desc(), RevenueEvent.created_at.desc())
        .limit(limit)
    )
    items = []
    for row in (await db.execute(stmt)).all():
        etype = row.event_type.value
        from_plan = row.from_plan.value if row.from_plan else None
        to_plan = row.to_plan.value if row.to_plan else None
        items.append(
            {
                "id": str(row.id),
                "event_type": etype,
                "amount": float(row.amount),
                "event_date": row.event_date,
                "customer_name": row.name,
                "company": row.company,
                "from_plan": from_plan,
                "to_plan": to_plan,
                "label": _activity_label(etype, row.company, to_plan, from_plan),
            }
        )
    return {"items": items}
