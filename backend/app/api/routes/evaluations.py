from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func

from app.core.auth import get_current_user
from app.core.rbac import require_editor
from app.core.database import get_db
from app.models.core import User, EvalRun, EvalResult, CriticResult
from app.schemas.evaluations import EvalRequest, EvalRunOut, EvalResultOut, EvalResponse
from app.services import evaluation_service

router = APIRouter()


@router.post("", response_model=EvalResponse)
async def run_evaluation(
    data: EvalRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    try:
        eval_run = await evaluation_service.evaluate(db, data, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from app.services import audit_service
    await audit_service.log_action(db, user.org_id, user.id, "eval.run", "eval_run", eval_run.id, detail={"decision": eval_run.decision, "score": eval_run.overall_score})

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
            critic_agreement=result.critic_agreement,
            analysis_summary=result.analysis_summary,
            critic_results=critic_results,
        )

    return EvalResponse(eval_run=eval_run, result=result_out)


@router.get("", response_model=List[EvalRunOut])
async def list_eval_runs(
    response: Response,
    character_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Get total count for pagination header
    count_q = select(func.count(EvalRun.id)).where(EvalRun.org_id == user.org_id)
    if character_id:
        count_q = count_q.where(EvalRun.character_id == character_id)
    total = (await db.execute(count_q)).scalar() or 0
    response.headers["X-Total-Count"] = str(total)

    return await evaluation_service.list_eval_runs(db, user.org_id, character_id, limit, offset)


@router.get("/cost-summary")
async def cost_summary(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get cost summary for evaluations over the specified number of days."""
    since = datetime.utcnow() - timedelta(days=days)

    # Total evals in period
    total_evals_q = select(func.count(EvalRun.id)).where(
        EvalRun.org_id == user.org_id,
        EvalRun.created_at >= since,
    )
    total_evals = (await db.execute(total_evals_q)).scalar() or 0

    # Token and cost aggregates from critic_results
    cost_q = select(
        func.coalesce(func.sum(CriticResult.prompt_tokens), 0).label("total_prompt_tokens"),
        func.coalesce(func.sum(CriticResult.completion_tokens), 0).label("total_completion_tokens"),
        func.coalesce(func.sum(CriticResult.estimated_cost), 0.0).label("total_cost"),
    ).join(
        EvalResult, CriticResult.eval_result_id == EvalResult.id
    ).join(
        EvalRun, EvalResult.eval_run_id == EvalRun.id
    ).where(
        EvalRun.org_id == user.org_id,
        EvalRun.created_at >= since,
    )
    cost_row = (await db.execute(cost_q)).one()

    total_prompt_tokens = int(cost_row.total_prompt_tokens)
    total_completion_tokens = int(cost_row.total_completion_tokens)
    total_tokens = total_prompt_tokens + total_completion_tokens
    total_cost = float(cost_row.total_cost)
    cost_per_eval = round(total_cost / total_evals, 8) if total_evals > 0 else 0.0

    # Breakdown by model
    model_q = select(
        CriticResult.model_used,
        func.count(CriticResult.id).label("count"),
        func.coalesce(func.sum(CriticResult.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(CriticResult.completion_tokens), 0).label("completion_tokens"),
        func.coalesce(func.sum(CriticResult.estimated_cost), 0.0).label("cost"),
    ).join(
        EvalResult, CriticResult.eval_result_id == EvalResult.id
    ).join(
        EvalRun, EvalResult.eval_run_id == EvalRun.id
    ).where(
        EvalRun.org_id == user.org_id,
        EvalRun.created_at >= since,
    ).group_by(CriticResult.model_used)
    model_rows = (await db.execute(model_q)).all()
    by_model = [
        {
            "model": row.model_used or "unknown",
            "invocations": row.count,
            "prompt_tokens": int(row.prompt_tokens),
            "completion_tokens": int(row.completion_tokens),
            "cost": float(row.cost),
        }
        for row in model_rows
    ]

    # Breakdown by critic
    critic_q = select(
        CriticResult.critic_id,
        func.count(CriticResult.id).label("count"),
        func.coalesce(func.sum(CriticResult.estimated_cost), 0.0).label("cost"),
    ).join(
        EvalResult, CriticResult.eval_result_id == EvalResult.id
    ).join(
        EvalRun, EvalResult.eval_run_id == EvalRun.id
    ).where(
        EvalRun.org_id == user.org_id,
        EvalRun.created_at >= since,
    ).group_by(CriticResult.critic_id)
    critic_rows = (await db.execute(critic_q)).all()
    by_critic = [
        {
            "critic_id": row.critic_id,
            "invocations": row.count,
            "cost": float(row.cost),
        }
        for row in critic_rows
    ]

    return {
        "days": days,
        "total_evals": total_evals,
        "total_tokens": total_tokens,
        "total_prompt_tokens": total_prompt_tokens,
        "total_completion_tokens": total_completion_tokens,
        "total_estimated_cost": round(total_cost, 6),
        "cost_per_eval": cost_per_eval,
        "by_model": by_model,
        "by_critic": by_critic,
    }


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
            critic_agreement=result.critic_agreement,
            analysis_summary=result.analysis_summary,
            critic_results=critic_results,
        )

    return EvalResponse(eval_run=run, result=result_out)
