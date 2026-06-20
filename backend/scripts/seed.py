"""Seed the Pulse database with fake customers + realistic revenue histories.

Run from the backend/ directory:

    python -m scripts.seed
"""

from __future__ import annotations

import asyncio
import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from faker import Faker
from sqlalchemy import delete

from app.config import settings
from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models import (
    Customer,
    CustomerStatus,
    NotificationPreference,
    Plan,
    RevenueEvent,
    RevenueEventType,
    TeamInvite,
    User,
)
from app.models.customer import PLAN_PRICE
from app.models.notification import DEFAULT_NOTIFICATION_KEYS
from app.models.team import UserRole

fake = Faker()
random.seed(42)
Faker.seed(42)

TOTAL_CUSTOMERS = 150
POWER_USER_COUNT = 30  # customers with multi-transition histories
MONTHS_HISTORY = 18

# Weighted distribution of *starting* plan on signup.
STARTING_PLAN_DIST = [(Plan.starter, 0.65), (Plan.growth, 0.28), (Plan.scale, 0.07)]

STATUS_DISTRIBUTION = [
    (CustomerStatus.active, 0.78),
    (CustomerStatus.trialing, 0.05),
    (CustomerStatus.past_due, 0.03),
    (CustomerStatus.churned, 0.14),
]

PLANS_ORDERED = [Plan.starter, Plan.growth, Plan.scale]


def weighted_choice(pairs):
    r = random.random()
    cum = 0.0
    for value, weight in pairs:
        cum += weight
        if r <= cum:
            return value
    return pairs[-1][0]


async def wipe(db) -> None:
    await db.execute(delete(RevenueEvent))
    await db.execute(delete(Customer))
    await db.execute(delete(NotificationPreference))
    await db.execute(delete(TeamInvite))
    await db.execute(delete(User))
    await db.commit()


async def seed_users(db) -> User:
    demo = User(
        email=settings.demo_email,
        name=settings.demo_name,
        hashed_password=hash_password(settings.demo_password),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(demo)
    await db.flush()

    for key, enabled in DEFAULT_NOTIFICATION_KEYS:
        db.add(NotificationPreference(user_id=demo.id, key=key, enabled=enabled))

    teammates = [
        ("Alex Chen", "alex@pulse.app", UserRole.admin),
        ("Priya Patel", "priya@pulse.app", UserRole.member),
        ("Marcus Reid", "marcus@pulse.app", UserRole.member),
        ("Sam Torres", "sam@pulse.app", UserRole.viewer),
    ]
    for name, email, role in teammates:
        db.add(User(email=email, name=name, role=role, is_active=True))

    await db.commit()
    await db.refresh(demo)
    return demo


def _pick_transition_idx(current_idx: int, is_power_user: bool) -> int:
    """Pick a new plan index, biased toward upgrades early, mixed later."""
    if current_idx == 0:
        return 1  # from Starter, only direction is up
    if current_idx == 2:
        return random.choice([0, 1])  # from Scale, must downgrade
    # From Growth: mostly upgrade (interesting journeys), sometimes downgrade
    if is_power_user:
        return 2 if random.random() < 0.7 else 0
    return 2 if random.random() < 0.55 else 0


def _generate_journey(
    signup: date, days_alive: int, is_power_user: bool
) -> tuple[list[dict[str, Any]], Plan]:
    """Return (events, final_plan) for a customer's plan journey."""
    events: list[dict[str, Any]] = []
    starting_plan = weighted_choice(STARTING_PLAN_DIST)
    idx = PLANS_ORDERED.index(starting_plan)

    # Signup event
    events.append({
        "event_type": RevenueEventType.new,
        "amount": PLAN_PRICE[starting_plan],
        "event_date": signup,
        "from_plan": None,
        "to_plan": starting_plan,
    })

    # Decide how many transitions to attempt
    if is_power_user and days_alive > 90:
        num_transitions = random.randint(3, 6)
    elif days_alive > 60:
        num_transitions = 1 if random.random() < 0.25 else 0
    else:
        num_transitions = 0

    if num_transitions == 0:
        return events, starting_plan

    # Sample transition dates with a minimum gap so transitions aren't clumped.
    min_gap = 25
    usable_days = days_alive - 15
    if usable_days <= min_gap * (num_transitions + 1):
        num_transitions = max(1, usable_days // min_gap - 1)

    # Evenly-spaced slots + jitter
    step = usable_days // (num_transitions + 1)
    slots: list[int] = []
    for i in range(num_transitions):
        base = step * (i + 1)
        jitter = random.randint(-min_gap // 2, min_gap // 2)
        slots.append(max(min_gap, min(usable_days - 5, base + jitter)))
    slots.sort()

    for offset in slots:
        new_idx = _pick_transition_idx(idx, is_power_user)
        if new_idx == idx:
            continue
        old_plan = PLANS_ORDERED[idx]
        new_plan = PLANS_ORDERED[new_idx]
        delta = PLAN_PRICE[new_plan] - PLAN_PRICE[old_plan]
        events.append({
            "event_type": (
                RevenueEventType.expansion if delta > 0 else RevenueEventType.contraction
            ),
            "amount": delta,
            "event_date": signup + timedelta(days=offset),
            "from_plan": old_plan,
            "to_plan": new_plan,
        })
        idx = new_idx

    return events, PLANS_ORDERED[idx]


async def seed_customers(db) -> tuple[int, int]:
    today = date.today()
    customers: list[Customer] = []
    journeys: list[list[dict[str, Any]]] = []

    for i in range(TOTAL_CUSTOMERS):
        is_power_user = i < POWER_USER_COUNT
        signup_days_ago = random.randint(1, 30 * MONTHS_HISTORY)
        # Power users skew older so they have room for a long journey.
        if is_power_user:
            signup_days_ago = max(signup_days_ago, random.randint(150, 30 * MONTHS_HISTORY))
        signup = today - timedelta(days=signup_days_ago)
        days_alive = signup_days_ago

        events, final_plan = _generate_journey(signup, days_alive, is_power_user)

        status = weighted_choice(STATUS_DISTRIBUTION)
        # Don't churn power users (they're the "showcase" long-tenure accounts)
        # and don't churn very young accounts (unrealistic).
        if is_power_user or days_alive < 40:
            if status == CustomerStatus.churned:
                status = CustomerStatus.active

        # Add a churn event if applicable
        if status == CustomerStatus.churned:
            last_event_offset = (events[-1]["event_date"] - signup).days
            churn_offset = random.randint(max(30, last_event_offset + 5), max(days_alive, last_event_offset + 30))
            churn_offset = min(churn_offset, days_alive)
            churn_date = signup + timedelta(days=churn_offset)
            events.append({
                "event_type": RevenueEventType.churn,
                "amount": -PLAN_PRICE[final_plan],
                "event_date": churn_date,
                "from_plan": final_plan,
                "to_plan": None,
            })
            mrr = Decimal("0.00")
            last_active_date = churn_date
        else:
            mrr = PLAN_PRICE[final_plan]
            last_active_date = fake.date_between(
                start_date=today - timedelta(days=min(14, days_alive)), end_date=today
            )

        last_active_dt = datetime.combine(last_active_date, datetime.min.time(), tzinfo=timezone.utc)

        cust = Customer(
            name=fake.name(),
            company=fake.company(),
            email=fake.unique.email(),
            plan=final_plan,
            status=status,
            mrr=mrr,
            signup_date=signup,
            last_active=last_active_dt,
        )
        customers.append(cust)
        journeys.append(events)

    db.add_all(customers)
    await db.flush()

    all_events: list[RevenueEvent] = []
    for cust, journey in zip(customers, journeys, strict=True):
        for e in journey:
            all_events.append(RevenueEvent(
                customer_id=cust.id,
                event_type=e["event_type"],
                amount=e["amount"],
                event_date=e["event_date"],
                from_plan=e["from_plan"],
                to_plan=e["to_plan"],
            ))

    db.add_all(all_events)
    await db.commit()
    return len(customers), len(all_events)


async def main() -> None:
    async with AsyncSessionLocal() as db:
        print("Wiping existing data...")
        await wipe(db)
        print("Seeding users (demo + team)...")
        await seed_users(db)
        print(f"Seeding {TOTAL_CUSTOMERS} customers ({POWER_USER_COUNT} power users) + revenue events...")
        c, e = await seed_customers(db)
        avg_events = round(e / c, 2)
        print(f"Done. {c} customers, {e} revenue events (avg {avg_events} per customer).")
        print(f"\nLogin: {settings.demo_email} / {settings.demo_password}\n")


if __name__ == "__main__":
    asyncio.run(main())
