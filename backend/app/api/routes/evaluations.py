from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User, EvalResult, CriticResult
from app.schemas.evaluations import EvalRequest, EvalRunOut, EvalResultOut, EvalResponse
from app.services import evaluation_service

router = APIRouter()


@router.post("", response_model=EvalResponse)
async def run_evaluation(
    data: EvalRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        eval_run = await evaluation_service.evaluate(db, data, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Load result
    result = await evaluation_service.get_eval_result(db, eval_run.id)
    result_out = None
    if result:
        # Load critic results
        cr_result = await db.execute(
            select(CriticResult).where(CriticResult.eval_result_id == result.id)
        )
        critic_results = list(cr_result.scalars().all())
        result_out = EvalResultOut(
            id=result.id,
            eval_run_id=result.eval_run_id,
            weighted_score=result.weighted_score,
            critic_scores=result.critic_scores,
            flags=result.flags,
            recommendations=result.recommendations,
            critic_results=critic_results,
        )

    return EvalResponse(eval_run=eval_run, result=result_out)


@router.get("", response_model=List[EvalRunOut])
async def list_eval_runs(
    character_id: Optional[int] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await evaluation_service.list_eval_runs(db, user.org_id, character_id, limit)


@router.get("/{run_id}", response_model=EvalResponse)
async def get_eval_run(
    run_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    run = await evaluation_service.get_eval_run(db, run_id, user.org_id)
    if not run:
        raise HTTPException(status_code=404, detail="Eval run not found")

    result = await evaluation_service.get_eval_result(db, run_id)
    result_out = None
    if result:
        cr_result = await db.execute(
            select(CriticResult).where(CriticResult.eval_result_id == result.id)
        )
        critic_results = list(cr_result.scalars().all())
        result_out = EvalResultOut(
            id=result.id,
            eval_run_id=result.eval_run_id,
            weighted_score=result.weighted_score,
            critic_scores=result.critic_scores,
            flags=result.flags,
            recommendations=result.recommendations,
            critic_results=critic_results,
        )

    return EvalResponse(eval_run=run, result=result_out)
