"""Exemplar library — high-scoring content organized by character/modality."""
from __future__ import annotations

from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import ExemplarContent, EvalRun
from app.schemas.exemplars import ExemplarCreate, ExemplarUpdate


async def create_exemplar(db: AsyncSession, data: ExemplarCreate, org_id: int) -> ExemplarContent:
    exemplar = ExemplarContent(
        character_id=data.character_id,
        modality=data.modality,
        content=data.content,
        eval_score=data.eval_score,
        eval_run_id=data.eval_run_id,
        tags=data.tags,
        org_id=org_id,
    )
    db.add(exemplar)
    await db.flush()
    return exemplar


async def list_exemplars(
    db: AsyncSession,
    org_id: int,
    character_id: Optional[int] = None,
    modality: Optional[str] = None,
    min_score: float = 0.0,
) -> List[ExemplarContent]:
    q = select(ExemplarContent).where(
        ExemplarContent.org_id == org_id,
        ExemplarContent.eval_score >= min_score,
    )
    if character_id:
        q = q.where(ExemplarContent.character_id == character_id)
    if modality:
        q = q.where(ExemplarContent.modality == modality)
    q = q.order_by(ExemplarContent.eval_score.desc())
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_exemplar(db: AsyncSession, exemplar_id: int, org_id: int) -> Optional[ExemplarContent]:
    result = await db.execute(
        select(ExemplarContent).where(ExemplarContent.id == exemplar_id, ExemplarContent.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def update_exemplar(db: AsyncSession, exemplar_id: int, org_id: int, data: ExemplarUpdate) -> Optional[ExemplarContent]:
    ex = await get_exemplar(db, exemplar_id, org_id)
    if not ex:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ex, field, value)
    await db.flush()
    return ex


async def delete_exemplar(db: AsyncSession, exemplar_id: int, org_id: int) -> bool:
    ex = await get_exemplar(db, exemplar_id, org_id)
    if not ex:
        return False
    await db.delete(ex)
    await db.flush()
    return True


async def auto_promote_exemplar(db: AsyncSession, eval_run: EvalRun, org_id: int, threshold: float = 0.95) -> Optional[ExemplarContent]:
    """Automatically promote high-scoring eval results to exemplar library."""
    if not eval_run.overall_score or eval_run.overall_score < threshold:
        return None

    content_data = eval_run.input_content or {}
    exemplar = ExemplarContent(
        character_id=eval_run.character_id,
        modality=eval_run.modality,
        content=content_data,
        eval_score=eval_run.overall_score,
        eval_run_id=eval_run.id,
        tags=["auto-promoted"],
        org_id=org_id,
    )
    db.add(exemplar)
    await db.flush()
    return exemplar
