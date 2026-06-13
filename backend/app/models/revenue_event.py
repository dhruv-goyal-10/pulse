from datetime import date
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Date, Enum as SAEnum, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.customer import Plan


class RevenueEventType(str, Enum):
    new = "new"
    expansion = "expansion"
    contraction = "contraction"
    churn = "churn"


class RevenueEvent(Base, TimestampMixin):
    __tablename__ = "revenue_events"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid4)
    customer_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[RevenueEventType] = mapped_column(
        SAEnum(RevenueEventType, name="revenue_event_type"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    from_plan: Mapped[Plan | None] = mapped_column(SAEnum(Plan, name="plan"), nullable=True)
    to_plan: Mapped[Plan | None] = mapped_column(SAEnum(Plan, name="plan"), nullable=True)

    customer: Mapped["Customer"] = relationship(back_populates="revenue_events")  # noqa: F821
