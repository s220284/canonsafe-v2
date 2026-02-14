"""Review queue service — human-in-the-loop review management."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import ReviewItem, EvalRun, CharacterCard


async def create_review_item(
    db: AsyncSession,
    eval_run_id: int,
    reason: str,
    org_id: int,
    priority: Optional[int] = None,
    character_id: Optional[int] = None,
) -> ReviewItem:
    """Create a review item for an eval run that needs human review."""
    # Auto-detect character_id from eval run if not provided
    if character_id is None:
        result = await db.execute(
            select(EvalRun).where(EvalRun.id == eval_run_id)
        )
        eval_run = result.scalar_one_or_none()
        if eval_run:
            character_id = eval_run.character_id

    # Auto-set priority based on reason if not provided
    if priority is None:
        priority_map = {
            "escalate": 10,
            "quarantine": 5,
            "critic_disagreement": 3,
            "low_confidence": 2,
        }
        priority = priority_map.get(reason, 0)

    item = ReviewItem(
        eval_run_id=eval_run_id,
        character_id=character_id,
        reason=reason,
        priority=priority,
        org_id=org_id,
    )
    db.add(item)
    await db.flush()
    return item


async def list_review_items(
    db: AsyncSession,
    org_id: int,
    status: Optional[str] = None,
    character_id: Optional[int] = None,
    limit: int = 100,
) -> List[ReviewItem]:
    """List review items with optional filters."""
    q = select(ReviewItem).where(ReviewItem.org_id == org_id)
    if status:
        q = q.where(ReviewItem.status == status)
    if character_id:
        q = q.where(ReviewItem.character_id == character_id)
    q = q.order_by(ReviewItem.priority.desc(), ReviewItem.created_at.asc()).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_review_item(
    db: AsyncSession,
    item_id: int,
    org_id: int,
) -> Optional[ReviewItem]:
    """Get a single review item."""
    result = await db.execute(
        select(ReviewItem).where(ReviewItem.id == item_id, ReviewItem.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def claim_review_item(
    db: AsyncSession,
    item_id: int,
    user_id: int,
    org_id: int,
) -> ReviewItem:
    """Claim a review item for the current user."""
    item = await get_review_item(db, item_id, org_id)
    if not item:
        raise ValueError("Review item not found")
    if item.status not in ("pending",):
        raise ValueError(f"Cannot claim item with status '{item.status}'")

    item.status = "claimed"
    item.assigned_to = user_id
    item.assigned_at = datetime.utcnow()
    await db.flush()
    return item


async def resolve_review_item(
    db: AsyncSession,
    item_id: int,
    user_id: int,
    org_id: int,
    resolution: str,
    override_decision: Optional[str] = None,
    override_justification: Optional[str] = None,
    notes: Optional[str] = None,
) -> ReviewItem:
    """Resolve a review item with a decision."""
    item = await get_review_item(db, item_id, org_id)
    if not item:
        raise ValueError("Review item not found")
    if item.status not in ("pending", "claimed"):
        raise ValueError(f"Cannot resolve item with status '{item.status}'")

    # Validate override requires justification
    if resolution == "overridden" and not override_justification:
        raise ValueError("Override justification is required when overriding a decision")

    item.status = "resolved"
    item.resolution = resolution
    item.resolved_at = datetime.utcnow()
    item.reviewer_notes = notes
    item.assigned_to = item.assigned_to or user_id

    if resolution == "overridden" and override_decision:
        item.override_decision = override_decision
        item.override_justification = override_justification
        # Also update the eval run's decision
        result = await db.execute(
            select(EvalRun).where(EvalRun.id == item.eval_run_id)
        )
        eval_run = result.scalar_one_or_none()
        if eval_run:
            eval_run.decision = override_decision

    await db.flush()
    return item


async def get_review_stats(db: AsyncSession, org_id: int) -> dict:
    """Get review queue statistics."""
    # Count by status
    status_counts = {}
    for s in ("pending", "claimed", "resolved", "expired"):
        result = await db.execute(
            select(func.count(ReviewItem.id)).where(
                ReviewItem.org_id == org_id, ReviewItem.status == s
            )
        )
        status_counts[s] = result.scalar() or 0

    # Resolved today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(ReviewItem.id)).where(
            ReviewItem.org_id == org_id,
            ReviewItem.status == "resolved",
            ReviewItem.resolved_at >= today_start,
        )
    )
    resolved_today = result.scalar() or 0

    # Average time to resolve (in minutes) for resolved items
    result = await db.execute(
        select(
            func.avg(
                func.extract("epoch", ReviewItem.resolved_at)
                - func.extract("epoch", ReviewItem.created_at)
            )
        ).where(
            ReviewItem.org_id == org_id,
            ReviewItem.status == "resolved",
            ReviewItem.resolved_at.isnot(None),
        )
    )
    avg_seconds = result.scalar()
    avg_resolution_minutes = round(avg_seconds / 60, 1) if avg_seconds else None

    return {
        "pending": status_counts.get("pending", 0),
        "claimed": status_counts.get("claimed", 0),
        "resolved": status_counts.get("resolved", 0),
        "expired": status_counts.get("expired", 0),
        "resolved_today": resolved_today,
        "avg_resolution_minutes": avg_resolution_minutes,
    }


async def auto_queue_recent_evals(db: AsyncSession, org_id: int) -> List[ReviewItem]:
    """Auto-queue eval runs with quarantine/escalate decisions that don't have review items yet."""
    # Find eval runs that should be queued but aren't
    existing_eval_ids = select(ReviewItem.eval_run_id).where(
        ReviewItem.org_id == org_id
    ).scalar_subquery()

    result = await db.execute(
        select(EvalRun).where(
            EvalRun.org_id == org_id,
            EvalRun.decision.in_(["quarantine", "escalate"]),
            EvalRun.status == "completed",
            ~EvalRun.id.in_(existing_eval_ids),
        ).order_by(EvalRun.created_at.desc()).limit(100)
    )
    runs = list(result.scalars().all())

    created = []
    for run in runs:
        item = await create_review_item(db, run.id, run.decision, org_id, character_id=run.character_id)
        created.append(item)

    return created
