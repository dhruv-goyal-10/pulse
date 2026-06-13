from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.customer import CustomerStatus, Plan


class CustomerListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    company: str
    email: EmailStr
    plan: Plan
    status: CustomerStatus
    mrr: float
    signup_date: date
    last_active: datetime


class PlanChangeEntry(BaseModel):
    event_date: date
    from_plan: Plan | None
    to_plan: Plan | None
    event_type: str


class CustomerDetail(CustomerListItem):
    plan_history: list[PlanChangeEntry]


class RevenueHistoryPoint(BaseModel):
    event_date: date
    event_type: str
    amount: float
    running_mrr: float
