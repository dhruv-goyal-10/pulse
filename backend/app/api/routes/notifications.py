from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import NotificationPreference
from app.models.notification import DEFAULT_NOTIFICATION_KEYS
from app.schemas.notification import (
    NOTIFICATION_LABELS,
    NotificationPref,
    NotificationPrefUpdate,
    NotificationPrefsResponse,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


async def _ensure_defaults(db, user_id) -> list[NotificationPreference]:
    stmt = select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    existing = {p.key: p for p in (await db.execute(stmt)).scalars().all()}
    added = False
    for key, default_enabled in DEFAULT_NOTIFICATION_KEYS:
        if key not in existing:
            pref = NotificationPreference(user_id=user_id, key=key, enabled=default_enabled)
            db.add(pref)
            existing[key] = pref
            added = True
    if added:
        await db.commit()
    return list(existing.values())


@router.get("", response_model=NotificationPrefsResponse, summary="Get notification preferences")
async def get_notifications(current: CurrentUser, db: DbSession) -> NotificationPrefsResponse:
    prefs = await _ensure_defaults(db, current.id)
    order = [k for k, _ in DEFAULT_NOTIFICATION_KEYS]
    prefs.sort(key=lambda p: order.index(p.key) if p.key in order else 999)
    return NotificationPrefsResponse(
        items=[
            NotificationPref(
                key=p.key,
                label=NOTIFICATION_LABELS.get(p.key, p.key.replace("_", " ").title()),
                enabled=p.enabled,
            )
            for p in prefs
        ]
    )


@router.patch("", response_model=NotificationPrefsResponse, summary="Update a preference")
async def update_notification(
    body: NotificationPrefUpdate, current: CurrentUser, db: DbSession
) -> NotificationPrefsResponse:
    known_keys = {k for k, _ in DEFAULT_NOTIFICATION_KEYS}
    if body.key not in known_keys:
        raise HTTPException(status_code=400, detail=f"Unknown notification key: {body.key}")

    await _ensure_defaults(db, current.id)
    stmt = select(NotificationPreference).where(
        (NotificationPreference.user_id == current.id) & (NotificationPreference.key == body.key)
    )
    pref = (await db.execute(stmt)).scalar_one()
    pref.enabled = body.enabled
    await db.commit()
    return await get_notifications(current, db)
