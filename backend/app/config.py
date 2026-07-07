from functools import lru_cache

from pydantic import Field, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_async_pg_url(url: str) -> str:
    """Coerce a plain Postgres URL (like the one Neon/Render/Heroku hand out) into the
    asyncpg-flavored form SQLAlchemy expects, and translate `sslmode=require` (libpq) to
    `ssl=require` (asyncpg)."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    return url.replace("sslmode=require", "ssl=require")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"

    database_url: str = "postgresql+asyncpg://pulse:pulse@localhost:5432/pulse"

    @field_validator("database_url", mode="before")
    @classmethod
    def _coerce_db_url(cls, v: str) -> str:
        return _normalize_async_pg_url(v)

    jwt_secret_key: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"

    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"

    demo_email: str = "demo@pulse.app"
    demo_password: str = "demo123"
    demo_name: str = "Demo Admin"

    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @computed_field
    @property
    def google_oauth_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
