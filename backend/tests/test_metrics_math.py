"""Unit tests for pure metric helpers that don't need a DB."""

from datetime import date

from app.services import metrics as svc


def test_pct_change_normal():
    assert svc.pct_change(100, 110) == 10.0
    assert svc.pct_change(100, 90) == -10.0


def test_pct_change_zero_previous_returns_none():
    assert svc.pct_change(0, 100) is None


def test_direction():
    assert svc.direction(100, 110) == "up"
    assert svc.direction(110, 100) == "down"
    assert svc.direction(100, 100) == "flat"


def test_period_to_days():
    assert svc.period_to_days("7d") == 7
    assert svc.period_to_days("30d") == 30
    assert svc.period_to_days("90d") == 90
    assert svc.period_to_days("garbage") == 30  # sane fallback


def test_month_floor():
    assert svc.month_floor(date(2026, 3, 15)) == date(2026, 3, 1)
    assert svc.month_floor(date(2026, 1, 1)) == date(2026, 1, 1)


def test_quarter_floor():
    assert svc.quarter_floor(date(2026, 1, 15)) == date(2026, 1, 1)
    assert svc.quarter_floor(date(2026, 2, 15)) == date(2026, 1, 1)
    assert svc.quarter_floor(date(2026, 3, 31)) == date(2026, 1, 1)
    assert svc.quarter_floor(date(2026, 4, 1)) == date(2026, 4, 1)
    assert svc.quarter_floor(date(2026, 11, 30)) == date(2026, 10, 1)


def test_add_months_within_year():
    assert svc.add_months(date(2026, 1, 1), 3) == date(2026, 4, 1)


def test_add_months_crosses_year():
    assert svc.add_months(date(2026, 11, 1), 3) == date(2027, 2, 1)


def test_add_quarters():
    assert svc.add_quarters(date(2026, 1, 1), 2) == date(2026, 7, 1)
    assert svc.add_quarters(date(2026, 10, 1), 2) == date(2027, 4, 1)


def test_activity_label_signup():
    label = svc._activity_label("new", "Acme Corp", "starter", None)
    assert label == "Acme Corp signed up on Starter"


def test_activity_label_upgrade():
    label = svc._activity_label("expansion", "Acme Corp", "growth", "starter")
    assert label == "Acme Corp upgraded from Starter to Growth"


def test_activity_label_churn():
    label = svc._activity_label("churn", "Acme Corp", None, "growth")
    assert label == "Acme Corp churned from Growth"
