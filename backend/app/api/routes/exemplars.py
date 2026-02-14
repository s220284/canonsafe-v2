from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.auth import get_current_user
from app.core.rbac import require_editor
from app.core.database import get_db
from app.models.core import User, ExemplarContent
from app.schemas.exemplars import ExemplarCreate, ExemplarUpdate, ExemplarOut
from app.services import exemplar_service

router = APIRouter()


@router.post("", response_model=ExemplarOut)
async def create_exemplar(
    data: ExemplarCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    return await exemplar_service.create_exemplar(db, data, user.org_id)


@router.get("", response_model=List[ExemplarOut])
async def list_exemplars(
    response: Response,
    character_id: Optional[int] = None,
    modality: Optional[str] = None,
    min_score: float = 0.0,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Total count for pagination
    count_q = select(func.count(ExemplarContent.id)).where(
        ExemplarContent.org_id == user.org_id,
        ExemplarContent.eval_score >= min_score,
    )
    if character_id:
        count_q = count_q.where(ExemplarContent.character_id == character_id)
    if modality:
        count_q = count_q.where(ExemplarContent.modality == modality)
    total = (await db.execute(count_q)).scalar() or 0
    response.headers["X-Total-Count"] = str(total)

    q = select(ExemplarContent).where(
        ExemplarContent.org_id == user.org_id,
        ExemplarContent.eval_score >= min_score,
    )
    if character_id:
        q = q.where(ExemplarContent.character_id == character_id)
    if modality:
        q = q.where(ExemplarContent.modality == modality)
    q = q.order_by(ExemplarContent.eval_score.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.patch("/{exemplar_id}", response_model=ExemplarOut)
async def update_exemplar(
    exemplar_id: int,
    data: ExemplarUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    ex = await exemplar_service.update_exemplar(db, exemplar_id, user.org_id, data)
    if not ex:
        raise HTTPException(status_code=404, detail="Exemplar not found")
    return ex


@router.delete("/{exemplar_id}")
async def delete_exemplar(
    exemplar_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    ok = await exemplar_service.delete_exemplar(db, exemplar_id, user.org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Exemplar not found")
    return {"ok": True}
