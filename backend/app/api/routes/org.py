"""Organization settings and onboarding routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_admin, require_viewer
from app.models.core import (
    User, Organization, Franchise, CharacterCard, EvalRun,
    Critic, UsageRecord, Invitation,
)
from app.schemas.users import OrgOut, OrgSettingsUpdate

router = APIRouter()


@router.get("", response_model=OrgOut)
async def get_org(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_viewer),
):
    """Get current organization."""
    result = await db.execute(
        select(Organization).where(Organization.id == user.org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch("", response_model=OrgOut)
async def update_org(
    data: OrgSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Update organization settings."""
    result = await db.execute(
        select(Organization).where(Organization.id == user.org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)
    await db.flush()

    from app.services import audit_service
    await audit_service.log_action(
        db, user.org_id, user.id, "org.update",
        resource_type="organization", resource_id=org.id,
        detail=update_data,
    )
    return org


@router.get("/onboarding")
async def get_onboarding(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_viewer),
):
    """Get onboarding checklist computed from real data."""
    org_id = user.org_id

    # Check org profile
    org_result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = org_result.scalar_one_or_none()
    if org and org.onboarding_completed:
        return {"completed": True, "steps": []}

    # Count franchise, characters, evals, critics, users
    franchise_count = (await db.execute(
        select(func.count(Franchise.id)).where(Franchise.org_id == org_id)
    )).scalar() or 0

    character_count = (await db.execute(
        select(func.count(CharacterCard.id)).where(CharacterCard.org_id == org_id)
    )).scalar() or 0

    eval_count = (await db.execute(
        select(func.count(EvalRun.id)).where(EvalRun.org_id == org_id)
    )).scalar() or 0

    critic_count = (await db.execute(
        select(func.count(Critic.id)).where(
            (Critic.org_id == org_id) | (Critic.org_id == None)
        )
    )).scalar() or 0

    user_count = (await db.execute(
        select(func.count(User.id)).where(User.org_id == org_id)
    )).scalar() or 0

    has_org_profile = bool(org and (org.display_name or org.industry))

    steps = [
        {"id": "org_profile", "label": "Set Up Organization Profile", "done": has_org_profile, "link": "/settings"},
        {"id": "franchise", "label": "Create Your First Franchise", "done": franchise_count > 0, "link": "/franchises"},
        {"id": "character", "label": "Add a Character", "done": character_count > 0, "link": "/characters"},
        {"id": "evaluation", "label": "Run Your First Evaluation", "done": eval_count > 0, "link": "/evaluations"},
        {"id": "critic", "label": "Configure a Critic", "done": critic_count > 0, "link": "/critics"},
        {"id": "invite", "label": "Invite a Team Member", "done": user_count > 1, "link": "/settings"},
    ]

    done_count = sum(1 for s in steps if s["done"])
    return {
        "completed": done_count == len(steps),
        "progress": done_count / len(steps),
        "done_count": done_count,
        "total": len(steps),
        "steps": steps,
    }


@router.post("/onboarding/dismiss")
async def dismiss_onboarding(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Dismiss onboarding banner."""
    result = await db.execute(
        select(Organization).where(Organization.id == user.org_id)
    )
    org = result.scalar_one_or_none()
    if org:
        org.onboarding_completed = True
        await db.flush()
    return {"ok": True}


@router.get("/usage")
async def get_usage(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Get monthly usage summary."""
    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.org_id == user.org_id
        ).order_by(UsageRecord.period.desc()).limit(6)
    )
    records = list(result.scalars().all())
    return [
        {
            "period": r.period,
            "eval_count": r.eval_count,
            "api_call_count": r.api_call_count,
            "llm_tokens_used": r.llm_tokens_used,
            "estimated_cost": r.estimated_cost,
        }
        for r in records
    ]
