from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.exemplars import ExemplarCreate, ExemplarUpdate, ExemplarOut
from app.services import exemplar_service

router = APIRouter()


@router.post("", response_model=ExemplarOut)
async def create_exemplar(
    data: ExemplarCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await exemplar_service.create_exemplar(db, data, user.org_id)


@router.get("", response_model=List[ExemplarOut])
async def list_exemplars(
    character_id: Optional[int] = None,
    modality: Optional[str] = None,
    min_score: float = 0.0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await exemplar_service.list_exemplars(db, user.org_id, character_id, modality, min_score)


@router.patch("/{exemplar_id}", response_model=ExemplarOut)
async def update_exemplar(
    exemplar_id: int,
    data: ExemplarUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ex = await exemplar_service.update_exemplar(db, exemplar_id, user.org_id, data)
    if not ex:
        raise HTTPException(status_code=404, detail="Exemplar not found")
    return ex


@router.delete("/{exemplar_id}")
async def delete_exemplar(
    exemplar_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ok = await exemplar_service.delete_exemplar(db, exemplar_id, user.org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Exemplar not found")
    return {"ok": True}
