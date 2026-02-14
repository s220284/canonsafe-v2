from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.rbac import require_editor
from app.core.database import get_db
from app.models.core import User
from app.schemas.franchises import FranchiseCreate, FranchiseUpdate, FranchiseOut, FranchiseHealthOut
from app.services import franchise_service

router = APIRouter()


@router.post("", response_model=FranchiseOut)
async def create_franchise(
    data: FranchiseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    return await franchise_service.create_franchise(db, data, user.org_id)


@router.get("", response_model=List[FranchiseOut])
async def list_franchises(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await franchise_service.list_franchises(db, user.org_id)


@router.get("/{franchise_id}", response_model=FranchiseOut)
async def get_franchise(
    franchise_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    franchise = await franchise_service.get_franchise(db, franchise_id, user.org_id)
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    return franchise


@router.patch("/{franchise_id}", response_model=FranchiseOut)
async def update_franchise(
    franchise_id: int,
    data: FranchiseUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    franchise = await franchise_service.update_franchise(db, franchise_id, user.org_id, data)
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    return franchise


@router.get("/{franchise_id}/health", response_model=FranchiseHealthOut)
async def get_franchise_health(
    franchise_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    health = await franchise_service.compute_franchise_health(db, franchise_id, user.org_id, days)
    if not health:
        raise HTTPException(status_code=404, detail="Franchise not found")
    return health
