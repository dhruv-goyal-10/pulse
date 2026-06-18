from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.team import UserRole


class TeamMember(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    name: str
    role: UserRole
    avatar_url: str | None = None
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime


class InviteRequest(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.member


class InviteResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole
    invite_url: str
    expires_at: datetime


class RoleUpdate(BaseModel):
    role: UserRole
