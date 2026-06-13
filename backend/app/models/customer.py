from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, Enum as SAEnum, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Plan(str, Enum):
    starter = "starter"
    growth = "growth"
    scale = "scale"


PLAN_PRICE = {
    Plan.starter: Decimal("29.00"),
    Plan.growth: Decimal("99.00"),
    Plan.scale: Decimal("299.00"),
}


class CustomerStatus(str, Enum):
    active = "active"
    trialing = "trialing"
    past_due = "past_due"
    churned = "churned"


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    company: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    plan: Mapped[Plan] = mapped_column(SAEnum(Plan, name="plan"), nullable=False, index=True)
    status: Mapped[CustomerStatus] = mapped_column(
        SAEnum(CustomerStatus, name="customer_status"), nullable=False, index=True
    )
    mrr: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    signup_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    last_active: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    revenue_events: Mapped[list["RevenueEvent"]] = relationship(  # noqa: F821
        back_populates="customer", cascade="all, delete-orphan"
    )
