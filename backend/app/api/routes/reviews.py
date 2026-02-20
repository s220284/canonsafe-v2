"""Review queue routes — human-in-the-loop review management."""
from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.auth import get_current_user
from app.core.rbac import require_editor
from app.core.database import get_db
from app.models.core import User, EvalRun, EvalResult, CriticResult, CharacterCard
from app.schemas.reviews import ReviewItemOut, ReviewResolveRequest, ReviewStatsOut
from app.schemas.evaluations import EvalRunOut, EvalResultOut, CriticResultOut
from app.services import review_service

router = APIRouter()


@router.get("", response_model=List[ReviewItemOut])
async def list_review_items(
    status: Optional[str] = None,
    character_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List review items with optional status and character filters."""
    return await review_service.list_review_items(db, user.org_id, status, character_id)


@router.get("/stats", response_model=ReviewStatsOut)
async def get_review_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get review queue statistics."""
    return await review_service.get_review_stats(db, user.org_id)


@router.get("/{item_id}")
async def get_review_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a single review item with full eval details."""
    item = await review_service.get_review_item(db, item_id, user.org_id)
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")

    # Load associated eval run
    run_result = await db.execute(
        select(EvalRun).where(EvalRun.id == item.eval_run_id)
    )
    eval_run = run_result.scalar_one_or_none()

    # Load eval result and critic results
    result_out = None
    if eval_run:
        res_result = await db.execute(
            select(EvalResult).where(EvalResult.eval_run_id == eval_run.id)
        )
        eval_result = res_result.scalar_one_or_none()
        if eval_result:
            cr_result = await db.execute(
                select(CriticResult).where(CriticResult.eval_result_id == eval_result.id)
            )
            critic_results = list(cr_result.scalars().all())
            result_out = {
                "id": eval_result.id,
                "eval_run_id": eval_result.eval_run_id,
                "weighted_score": eval_result.weighted_score,
                "critic_scores": eval_result.critic_scores,
                "flags": eval_result.flags,
                "recommendations": eval_result.recommendations,
                "critic_results": [
                    {
                        "id": cr.id,
                        "critic_id": cr.critic_id,
                        "score": cr.score,
                        "weight": cr.weight,
                        "reasoning": cr.reasoning,
                        "flags": cr.flags,
                        "latency_ms": cr.latency_ms,
                    }
                    for cr in critic_results
                ],
            }

    # Load character name
    character_name = None
    if item.character_id:
        char_result = await db.execute(
            select(CharacterCard).where(CharacterCard.id == item.character_id)
        )
        char = char_result.scalar_one_or_none()
        if char:
            character_name = char.name

    # Load assigned user name
    assigned_name = None
    if item.assigned_to:
        from app.models.core import User as UserModel
        user_result = await db.execute(
            select(UserModel).where(UserModel.id == item.assigned_to)
        )
        assigned_user = user_result.scalar_one_or_none()
        if assigned_user:
            assigned_name = assigned_user.full_name or assigned_user.email

    return {
        "review_item": {
            "id": item.id,
            "eval_run_id": item.eval_run_id,
            "character_id": item.character_id,
            "status": item.status,
            "priority": item.priority,
            "reason": item.reason,
            "assigned_to": item.assigned_to,
            "assigned_at": item.assigned_at,
            "resolved_at": item.resolved_at,
            "resolution": item.resolution,
            "override_decision": item.override_decision,
            "override_justification": item.override_justification,
            "reviewer_notes": item.reviewer_notes,
            "org_id": item.org_id,
            "created_at": item.created_at,
            "character_name": character_name,
            "assigned_name": assigned_name,
        },
        "eval_run": {
            "id": eval_run.id,
            "character_id": eval_run.character_id,
            "card_version_id": eval_run.card_version_id,
            "profile_id": eval_run.profile_id,
            "franchise_id": eval_run.franchise_id,
            "agent_id": eval_run.agent_id,
            "input_content": eval_run.input_content,
            "modality": eval_run.modality,
            "status": eval_run.status,
            "tier": eval_run.tier,
            "sampled": eval_run.sampled,
            "overall_score": eval_run.overall_score,
            "decision": eval_run.decision,
            "consent_verified": eval_run.consent_verified,
            "c2pa_metadata": eval_run.c2pa_metadata,
            "org_id": eval_run.org_id,
            "created_at": eval_run.created_at,
            "completed_at": eval_run.completed_at,
        } if eval_run else None,
        "result": result_out,
    }


@router.post("/{item_id}/claim", response_model=ReviewItemOut)
async def claim_review_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Claim a review item for the current user."""
    try:
        item = await review_service.claim_review_item(db, item_id, user.id, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    from app.services import audit_service
    await audit_service.log_action(db, user.org_id, user.id, "review.claim", "review_item", item_id)
    return item


@router.post("/{item_id}/resolve", response_model=ReviewItemOut)
async def resolve_review_item(
    item_id: int,
    data: ReviewResolveRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Resolve a review item with a decision."""
    try:
        item = await review_service.resolve_review_item(
            db,
            item_id,
            user.id,
            user.org_id,
            data.resolution,
            data.override_decision,
            data.override_justification,
            data.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    from app.services import audit_service
    await audit_service.log_action(db, user.org_id, user.id, "review.resolve", "review_item", item_id, detail={"resolution": data.resolution})
    return item


@router.post("/auto-queue")
async def auto_queue(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Manually trigger auto-queueing of recent evals that need review."""
    items = await review_service.auto_queue_recent_evals(db, user.org_id)
    return {"queued": len(items), "items": [{"id": i.id, "eval_run_id": i.eval_run_id, "reason": i.reason} for i in items]}
