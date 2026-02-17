from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.auth import get_current_user
from app.core.rbac import require_admin, require_editor
from app.core.database import get_db
from app.models.core import User, Critic
from app.schemas.critics import (
    CriticCreate, CriticUpdate, CriticOut,
    CriticConfigCreate, CriticConfigOut,
    EvaluationProfileCreate, EvaluationProfileOut,
)
from app.services import critic_service

router = APIRouter()


# ─── Critics ────────────────────────────────────────────────────

@router.post("", response_model=CriticOut)
async def create_critic(
    data: CriticCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    return await critic_service.create_critic(db, data, user.org_id)


@router.get("", response_model=List[CriticOut])
async def list_critics(
    response: Response,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Total count for pagination
    count_q = select(func.count(Critic.id)).where(
        (Critic.org_id == user.org_id) | (Critic.org_id.is_(None))
    )
    total = (await db.execute(count_q)).scalar() or 0
    response.headers["X-Total-Count"] = str(total)

    result = await db.execute(
        select(Critic).where(
            (Critic.org_id == user.org_id) | (Critic.org_id.is_(None))
        ).order_by(Critic.name).offset(offset).limit(limit)
    )
    return list(result.scalars().all())


# ─── Critic Configurations ─────────────────────────────────────

@router.post("/configs", response_model=CriticConfigOut)
async def create_config(
    data: CriticConfigCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    return await critic_service.create_config(db, data, user.org_id)


@router.get("/configs/character/{character_id}", response_model=List[CriticConfigOut])
async def get_configs_for_character(
    character_id: int,
    franchise_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await critic_service.get_configs_for_character(db, user.org_id, character_id, franchise_id)


# ─── Evaluation Profiles ───────────────────────────────────────

@router.post("/profiles", response_model=EvaluationProfileOut)
async def create_profile(
    data: EvaluationProfileCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    return await critic_service.create_profile(db, data, user.org_id)


@router.get("/profiles", response_model=List[EvaluationProfileOut])
async def list_profiles(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await critic_service.list_profiles(db, user.org_id)


# ─── Individual Critic (must be after /configs and /profiles) ──

@router.get("/{critic_id}", response_model=CriticOut)
async def get_critic(
    critic_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    critic = await critic_service.get_critic(db, critic_id)
    if not critic:
        raise HTTPException(status_code=404, detail="Critic not found")
    return critic


@router.patch("/{critic_id}", response_model=CriticOut)
async def update_critic(
    critic_id: int,
    data: CriticUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    critic = await critic_service.update_critic(db, critic_id, data)
    if not critic:
        raise HTTPException(status_code=404, detail="Critic not found")
    return critic
