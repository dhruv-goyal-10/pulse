from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.config import settings
from app.models import TeamInvite, User
from app.models.team import UserRole
from app.schemas.common import MessageResponse
from app.schemas.team import InviteRequest, InviteResponse, RoleUpdate, TeamMember

router = APIRouter(prefix="/team", tags=["Team"])


def _require_admin(user: User) -> None:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")


@router.get("", response_model=list[TeamMember], summary="List team members")
async def list_team(_: CurrentUser, db: DbSession) -> list[TeamMember]:
    stmt = select(User).order_by(User.created_at.asc())
    users = (await db.execute(stmt)).scalars().all()
    return [TeamMember.model_validate(u) for u in users]


@router.post("/invite", response_model=InviteResponse, summary="Invite a new team member")
async def invite_member(
    body: InviteRequest, current: CurrentUser, db: DbSession
) -> InviteResponse:
    _require_admin(current)

    existing = (
        await db.execute(select(User).where(User.email == body.email.lower()))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="A user with that email already exists")

    invite = TeamInvite(
        email=body.email.lower(),
        role=body.role,
        token=token_urlsafe(24),
        invited_by=current.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    return InviteResponse(
        id=invite.id,
        email=invite.email,
        role=invite.role,
        invite_url=f"{settings.frontend_url}/invite/{invite.token}",
        expires_at=invite.expires_at,
    )


@router.patch("/{user_id}", response_model=TeamMember, summary="Update a team member's role")
async def update_role(
    user_id: UUID, body: RoleUpdate, current: CurrentUser, db: DbSession
) -> TeamMember:
    _require_admin(current)
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.role
    await db.commit()
    await db.refresh(user)
    return TeamMember.model_validate(user)


@router.delete("/{user_id}", response_model=MessageResponse, summary="Remove a team member")
async def remove_member(user_id: UUID, current: CurrentUser, db: DbSession) -> MessageResponse:
    _require_admin(current)
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return MessageResponse(message="Team member removed")
