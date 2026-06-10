from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


class DeltaValue(BaseModel):
    value: float
    delta_pct: float | None = Field(default=None, description="Percent change vs previous period")
    delta_direction: str | None = Field(default=None, description="up | down | flat")


class MessageResponse(BaseModel):
    message: str
