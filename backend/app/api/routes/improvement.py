from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.improvement import FailurePatternOut, ImprovementTrajectoryOut, ImprovementSummary
from app.services import improvement_service

router = APIRouter()


@router.post("/detect-patterns", response_model=List[FailurePatternOut])
async def detect_patterns(
    character_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await improvement_service.detect_failure_patterns(db, user.org_id, character_id)


@router.get("/patterns", response_model=List[FailurePatternOut])
async def get_patterns(
    character_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await improvement_service.get_failure_patterns(db, user.org_id, character_id)


@router.post("/trajectory/{character_id}", response_model=ImprovementTrajectoryOut)
async def compute_trajectory(
    character_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await improvement_service.compute_trajectory(db, user.org_id, character_id)


@router.get("/trajectories", response_model=List[ImprovementTrajectoryOut])
async def get_trajectories(
    character_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await improvement_service.get_trajectories(db, user.org_id, character_id)


@router.get("/summary", response_model=ImprovementSummary)
async def get_improvement_summary(
    character_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    patterns = await improvement_service.get_failure_patterns(db, user.org_id, character_id)
    trajectories = await improvement_service.get_trajectories(db, user.org_id, character_id)
    suggestions = []
    for p in patterns:
        if p.suggested_fix:
            suggestions.append(p.suggested_fix)
    return ImprovementSummary(
        failure_patterns=patterns,
        trajectories=trajectories,
        suggestions=suggestions,
    )
