from datetime import date, timedelta

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.schemas.billing import BillingResponse, Invoice, PaymentMethod

router = APIRouter(prefix="/billing", tags=["Billing"])


def _demo_invoices() -> list[Invoice]:
    """Deterministic mocked invoice history — matches the fictional Pulse team's own billing."""
    today = date.today()
    return [
        Invoice(
            id=f"in_{i:04d}",
            number=f"PLS-{2026 - (i // 12):04d}-{(i % 12) + 1:02d}",
            date=date(today.year, today.month, 1) - timedelta(days=30 * i),
            amount=299.00,
            status="paid",
            pdf_url=f"/api/billing/invoices/in_{i:04d}.pdf",
        )
        for i in range(6)
    ]


@router.get("", response_model=BillingResponse, summary="Current plan + invoice history (mocked)")
async def get_billing(_: CurrentUser) -> BillingResponse:
    today = date.today()
    next_bill = date(today.year, today.month, 1) + timedelta(days=30)
    return BillingResponse(
        plan="Scale (Team)",
        plan_price=299.00,
        seats=8,
        next_billing_date=next_bill,
        payment_method=PaymentMethod(brand="Visa", last4="4242", exp_month=12, exp_year=2028),
        invoices=_demo_invoices(),
    )
