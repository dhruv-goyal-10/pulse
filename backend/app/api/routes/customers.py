from datetime import timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import Select, asc, desc, func, or_, select

from app.api.deps import CurrentUser, DbSession
from app.models import Customer, CustomerStatus, Plan, RevenueEvent
from app.schemas.common import PaginatedResponse
from app.schemas.customer import (
    CustomerDetail,
    CustomerListItem,
    PlanChangeEntry,
    RevenueHistoryPoint,
)

router = APIRouter(prefix="/customers", tags=["Customers"])

SORTABLE_FIELDS = {
    "name": Customer.name,
    "company": Customer.company,
    "mrr": Customer.mrr,
    "signup_date": Customer.signup_date,
    "last_active": Customer.last_active,
    "status": Customer.status,
    "plan": Customer.plan,
}


def _apply_filters(stmt: Select, search: str | None, status: str | None, plan: str | None) -> Select:
    if search:
        needle = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Customer.name).like(needle),
                func.lower(Customer.company).like(needle),
                func.lower(Customer.email).like(needle),
            )
        )
    if status:
        stmt = stmt.where(Customer.status == CustomerStatus(status))
    if plan:
        stmt = stmt.where(Customer.plan == Plan(plan))
    return stmt


@router.get("", response_model=PaginatedResponse[CustomerListItem], summary="Paginated customer list")
async def list_customers(
    _: CurrentUser,
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 25,
    search: Annotated[str | None, Query(description="Substring match on name, company, or email")] = None,
    status: Annotated[str | None, Query(pattern="^(active|trialing|past_due|churned)$")] = None,
    plan: Annotated[str | None, Query(pattern="^(starter|growth|scale)$")] = None,
    sort: Annotated[str, Query(description="field:direction, e.g. mrr:desc")] = "mrr:desc",
) -> PaginatedResponse[CustomerListItem]:
    field_name, _, direction_str = sort.partition(":")
    if field_name not in SORTABLE_FIELDS or direction_str not in ("asc", "desc"):
        raise HTTPException(status_code=400, detail=f"Invalid sort: {sort}")

    order_col = SORTABLE_FIELDS[field_name]
    order_expr = desc(order_col) if direction_str == "desc" else asc(order_col)

    base = select(Customer)
    base = _apply_filters(base, search, status, plan)

    count_stmt = select(func.count()).select_from(base.subquery())
    total = int((await db.execute(count_stmt)).scalar_one() or 0)

    rows_stmt = base.order_by(order_expr, Customer.id).limit(size).offset((page - 1) * size)
    rows = (await db.execute(rows_stmt)).scalars().all()

    return PaginatedResponse[CustomerListItem](
        items=[CustomerListItem.model_validate(c) for c in rows],
        total=total,
        page=page,
        size=size,
        pages=(total + size - 1) // size if total else 0,
    )


@router.get("/{customer_id}", response_model=CustomerDetail, summary="Customer detail + plan-change history")
async def get_customer(customer_id: UUID, _: CurrentUser, db: DbSession) -> CustomerDetail:
    customer = await db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    events_stmt = (
        select(RevenueEvent)
        .where(RevenueEvent.customer_id == customer_id)
        .order_by(RevenueEvent.event_date.asc())
    )
    events = (await db.execute(events_stmt)).scalars().all()
    history = [
        PlanChangeEntry(
            event_date=e.event_date,
            from_plan=e.from_plan,
            to_plan=e.to_plan,
            event_type=e.event_type.value,
        )
        for e in events
    ]

    return CustomerDetail(
        id=customer.id,
        name=customer.name,
        company=customer.company,
        email=customer.email,
        plan=customer.plan,
        status=customer.status,
        mrr=float(customer.mrr),
        signup_date=customer.signup_date,
        last_active=customer.last_active,
        plan_history=history,
    )


@router.get(
    "/{customer_id}/revenue-history",
    response_model=list[RevenueHistoryPoint],
    summary="Per-customer revenue events with running MRR",
)
async def get_customer_revenue_history(
    customer_id: UUID, _: CurrentUser, db: DbSession
) -> list[RevenueHistoryPoint]:
    exists = await db.get(Customer, customer_id)
    if exists is None:
        raise HTTPException(status_code=404, detail="Customer not found")

    stmt = (
        select(RevenueEvent)
        .where(RevenueEvent.customer_id == customer_id)
        .order_by(RevenueEvent.event_date.asc())
    )
    events = (await db.execute(stmt)).scalars().all()
    running = 0.0
    points = []
    for e in events:
        running += float(e.amount)
        points.append(
            RevenueHistoryPoint(
                event_date=e.event_date,
                event_type=e.event_type.value,
                amount=float(e.amount),
                running_mrr=round(running, 2),
            )
        )
    return points
