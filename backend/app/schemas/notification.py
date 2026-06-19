from pydantic import BaseModel


class NotificationPref(BaseModel):
    key: str
    label: str
    enabled: bool


class NotificationPrefUpdate(BaseModel):
    key: str
    enabled: bool


class NotificationPrefsResponse(BaseModel):
    items: list[NotificationPref]


NOTIFICATION_LABELS = {
    "weekly_revenue_summary": "Weekly revenue summary email",
    "churn_alerts": "Churn alerts",
    "new_signup_notifications": "New signup notifications",
    "payment_failure_alerts": "Payment failure alerts",
    "monthly_report": "Monthly report",
}
