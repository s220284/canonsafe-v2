"""Continuous improvement flywheel — failure patterns, trajectories, suggestions."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    FailurePattern,
    ImprovementTrajectory,
    EvalRun,
    CriticResult,
    EvalResult,
)


async def detect_failure_patterns(db: AsyncSession, org_id: int, character_id: Optional[int] = None) -> List[FailurePattern]:
    """Analyze recent eval results to detect recurring failure patterns."""
    q = select(EvalRun).where(
        EvalRun.org_id == org_id,
        EvalRun.status == "completed",
    )
    if character_id:
        q = q.where(EvalRun.character_id == character_id)
    q = q.order_by(EvalRun.created_at.desc()).limit(100)

    result = await db.execute(q)
    runs = list(result.scalars().all())

    # Count failures by decision type
    decision_counts = {}
    low_score_critics = {}
    for run in runs:
        if run.decision and run.decision != "pass":
            decision_counts[run.decision] = decision_counts.get(run.decision, 0) + 1

        # Check for low-scoring critics
        eval_result = await db.execute(
            select(EvalResult).where(EvalResult.eval_run_id == run.id)
        )
        er = eval_result.scalar_one_or_none()
        if er and er.critic_scores:
            for critic_id_str, score in er.critic_scores.items():
                if score < 0.5:
                    key = int(critic_id_str)
                    if key not in low_score_critics:
                        low_score_critics[key] = 0
                    low_score_critics[key] += 1

    patterns = []
    # Create/update failure patterns
    for decision, count in decision_counts.items():
        if count >= 3:  # threshold for pattern
            pattern = FailurePattern(
                character_id=character_id,
                pattern_type="recurring_decision",
                description=f"Recurring '{decision}' decision ({count} times in recent evaluations)",
                frequency=count,
                severity="high" if decision in ("block", "escalate") else "medium",
                suggested_fix=f"Review content guidelines — frequent '{decision}' decisions suggest systematic issues",
                org_id=org_id,
            )
            db.add(pattern)
            patterns.append(pattern)

    for critic_id, count in low_score_critics.items():
        if count >= 3:
            pattern = FailurePattern(
                character_id=character_id,
                critic_id=critic_id,
                pattern_type="recurring_low_score",
                description=f"Critic {critic_id} consistently scoring below 0.5 ({count} times)",
                frequency=count,
                severity="medium",
                suggested_fix=f"Enrich character card or adjust critic rubric for critic {critic_id}",
                org_id=org_id,
            )
            db.add(pattern)
            patterns.append(pattern)

    await db.flush()
    return patterns


async def get_failure_patterns(db: AsyncSession, org_id: int, character_id: Optional[int] = None) -> List[FailurePattern]:
    q = select(FailurePattern).where(FailurePattern.org_id == org_id)
    if character_id:
        q = q.where(FailurePattern.character_id == character_id)
    q = q.order_by(FailurePattern.created_at.desc())
    result = await db.execute(q)
    return list(result.scalars().all())


async def compute_trajectory(db: AsyncSession, org_id: int, character_id: int, metric: str = "avg_score") -> ImprovementTrajectory:
    """Compute improvement trajectory over time."""
    result = await db.execute(
        select(EvalRun).where(
            EvalRun.org_id == org_id,
            EvalRun.character_id == character_id,
            EvalRun.status == "completed",
            EvalRun.overall_score.isnot(None),
        ).order_by(EvalRun.created_at)
    )
    runs = list(result.scalars().all())

    data_points = []
    for run in runs:
        data_points.append({
            "date": run.created_at.isoformat() if run.created_at else None,
            "value": run.overall_score,
        })

    # Determine trend
    trend = "stable"
    if len(data_points) >= 5:
        recent = [d["value"] for d in data_points[-5:]]
        older = [d["value"] for d in data_points[:5]]
        recent_avg = sum(recent) / len(recent)
        older_avg = sum(older) / len(older)
        if recent_avg > older_avg + 0.05:
            trend = "improving"
        elif recent_avg < older_avg - 0.05:
            trend = "degrading"

    trajectory = ImprovementTrajectory(
        character_id=character_id,
        metric_name=metric,
        data_points=data_points,
        trend=trend,
        org_id=org_id,
    )
    db.add(trajectory)
    await db.flush()
    return trajectory


async def get_trajectories(db: AsyncSession, org_id: int, character_id: Optional[int] = None) -> List[ImprovementTrajectory]:
    q = select(ImprovementTrajectory).where(ImprovementTrajectory.org_id == org_id)
    if character_id:
        q = q.where(ImprovementTrajectory.character_id == character_id)
    result = await db.execute(q.order_by(ImprovementTrajectory.updated_at.desc()))
    return list(result.scalars().all())
