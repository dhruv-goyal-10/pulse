from datetime import date

from pydantic import BaseModel


class Invoice(BaseModel):
    id: str
    number: str
    date: date
    amount: float
    status: str
    pdf_url: str


class PaymentMethod(BaseModel):
    brand: str
    last4: str
    exp_month: int
    exp_year: int


class BillingResponse(BaseModel):
    plan: str
    plan_price: float
    seats: int
    next_billing_date: date
    payment_method: PaymentMethod
    invoices: list[Invoice]
