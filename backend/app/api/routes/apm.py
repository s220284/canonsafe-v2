"""Agentic Pipeline Middleware — SDK-style evaluate/enforce endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.apm import APMEvalRequest, APMEvalResponse, APMEnforceRequest, APMEnforceResponse
from app.schemas.evaluations import EvalRequest
from app.services import evaluation_service

router = APIRouter()


@router.post("/evaluate", response_model=APMEvalResponse)
async def apm_evaluate(
    data: APMEvalRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """SDK-style evaluation endpoint for agentic pipelines."""
    eval_req = EvalRequest(
        character_id=data.character_id,
        content=data.content,
        modality=data.modality,
        profile_id=data.profile_id,
        agent_id=data.agent_id,
        territory=data.territory,
    )
    try:
        run = await evaluation_service.evaluate(db, eval_req, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Collect flags from result
    flags = []
    result = await evaluation_service.get_eval_result(db, run.id)
    if result:
        flags = result.flags or []

    return APMEvalResponse(
        eval_run_id=run.id,
        score=run.overall_score,
        decision=run.decision or "pass",
        flags=flags,
        consent_verified=run.consent_verified,
        sampled=run.sampled,
        details={
            "tier": run.tier,
            "modality": run.modality,
            "card_version_id": run.card_version_id,
            "c2pa": run.c2pa_metadata,
        },
    )


@router.post("/enforce", response_model=APMEnforceResponse)
async def apm_enforce(
    data: APMEnforceRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Apply enforcement action to an eval run."""
    run = await evaluation_service.get_eval_run(db, data.eval_run_id, user.org_id)
    if not run:
        raise HTTPException(status_code=404, detail="Eval run not found")

    valid_actions = {"regenerate", "quarantine", "escalate", "block", "override"}
    if data.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {valid_actions}")

    # Update the run's decision
    run.decision = data.action if data.action != "override" else "pass"
    await db.flush()

    return APMEnforceResponse(
        eval_run_id=run.id,
        action_taken=data.action,
        success=True,
        message=f"Action '{data.action}' applied to eval run {run.id}",
    )
