from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.metrics import ActivityFeedResponse
from app.services import metrics as svc

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("/recent", response_model=ActivityFeedResponse, summary="Recent revenue events feed")
async def get_recent_activity(
    _: CurrentUser,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> ActivityFeedResponse:
    return await svc.compute_activity_feed(db, limit)
