from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.config import settings
from app.core.oauth import oauth
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.models.team import UserRole
from app.schemas.auth import LoginRequest, LoginResponse, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


def _issue_token(user: User) -> TokenResponse:
    token = create_access_token(user.id, extra={"email": user.email, "role": user.role.value})
    return TokenResponse(access_token=token, expires_in=settings.jwt_expire_minutes * 60)


@router.post("/login", response_model=LoginResponse, summary="Email + password login")
async def login(body: LoginRequest, db: DbSession) -> LoginResponse:
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    if user is None or user.hashed_password is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return LoginResponse(token=_issue_token(user), user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse, summary="Current authenticated user")
async def me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)


@router.post("/logout", summary="Logout (client-side token discard)")
async def logout() -> dict:
    return {"message": "logged out"}


@router.get("/config", summary="Public auth configuration (which providers are enabled)")
async def auth_config() -> dict:
    return {"google_oauth_enabled": settings.google_oauth_enabled}


@router.get("/google/login", summary="Begin Google OAuth flow")
async def google_login(request: Request):
    if not settings.google_oauth_enabled:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")
    return await oauth.google.authorize_redirect(request, settings.google_redirect_uri)


@router.get("/google/callback", summary="Google OAuth callback")
async def google_callback(request: Request, db: DbSession) -> RedirectResponse:
    if not settings.google_oauth_enabled:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo") or await oauth.google.parse_id_token(request, token)
    google_id = userinfo["sub"]
    email = userinfo["email"].lower()
    name = userinfo.get("name") or email.split("@")[0]
    picture = userinfo.get("picture")

    result = await db.execute(select(User).where((User.google_id == google_id) | (User.email == email)))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            email=email,
            name=name,
            google_id=google_id,
            avatar_url=picture,
            role=UserRole.member,
        )
        db.add(user)
    else:
        if user.google_id is None:
            user.google_id = google_id
        if picture and not user.avatar_url:
            user.avatar_url = picture
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    access = _issue_token(user).access_token
    return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?token={access}")
