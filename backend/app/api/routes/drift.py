from __future__ import annotations

import statistics
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import (
    User,
    EvalRun,
    EvalResult,
    CriticResult,
    DriftBaseline,
    DriftEvent,
    CharacterCard,
    Critic,
    CardVersion,
)

router = APIRouter()


# ─── Compute Baselines ───────────────────────────────────────

@router.post("/compute-baselines")
async def compute_baselines(
    character_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Compute drift baselines from the last 50 eval runs for each critic."""
    # Verify character
    char_result = await db.execute(
        select(CharacterCard).where(
            CharacterCard.id == character_id,
            CharacterCard.org_id == user.org_id,
        )
    )
    character = char_result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    card_version_id = character.active_version_id
    if not card_version_id:
        # Fallback: get latest version
        ver_result = await db.execute(
            select(CardVersion)
            .where(CardVersion.character_id == character_id)
            .order_by(CardVersion.version_number.desc())
            .limit(1)
        )
        version = ver_result.scalar_one_or_none()
        if not version:
            raise HTTPException(status_code=400, detail="No card version found for character")
        card_version_id = version.id

    # Get last 50 eval runs for this character
    runs_result = await db.execute(
        select(EvalRun)
        .where(
            EvalRun.character_id == character_id,
            EvalRun.org_id == user.org_id,
            EvalRun.status == "completed",
        )
        .order_by(EvalRun.created_at.desc())
        .limit(50)
    )
    runs = list(runs_result.scalars().all())

    if not runs:
        raise HTTPException(status_code=400, detail="No completed evaluations found for this character")

    run_ids = [r.id for r in runs]

    # Get eval results for these runs
    results_result = await db.execute(
        select(EvalResult).where(EvalResult.eval_run_id.in_(run_ids))
    )
    eval_results = list(results_result.scalars().all())
    result_ids = [r.id for r in eval_results]

    if not result_ids:
        raise HTTPException(status_code=400, detail="No evaluation results found")

    # Get all critic results
    cr_result = await db.execute(
        select(CriticResult).where(CriticResult.eval_result_id.in_(result_ids))
    )
    critic_results = list(cr_result.scalars().all())

    # Group scores by critic_id
    critic_scores = {}
    for cr in critic_results:
        if cr.critic_id not in critic_scores:
            critic_scores[cr.critic_id] = []
        critic_scores[cr.critic_id].append(cr.score)

    # Compute and store baselines
    baselines_created = []
    for critic_id, scores in critic_scores.items():
        if len(scores) < 2:
            mean_score = scores[0] if scores else 0.0
            std_dev = 0.0
        else:
            mean_score = statistics.mean(scores)
            std_dev = statistics.stdev(scores)

        # Check if baseline already exists, update it
        existing_result = await db.execute(
            select(DriftBaseline).where(
                DriftBaseline.character_id == character_id,
                DriftBaseline.critic_id == critic_id,
                DriftBaseline.org_id == user.org_id,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            existing.baseline_score = mean_score
            existing.std_deviation = std_dev
            existing.sample_count = len(scores)
            existing.threshold = 2.0
            existing.card_version_id = card_version_id
            existing.updated_at = datetime.utcnow()
            baselines_created.append(existing)
        else:
            baseline = DriftBaseline(
                character_id=character_id,
                card_version_id=card_version_id,
                critic_id=critic_id,
                baseline_score=mean_score,
                std_deviation=std_dev,
                sample_count=len(scores),
                threshold=2.0,
                org_id=user.org_id,
            )
            db.add(baseline)
            baselines_created.append(baseline)

    await db.commit()

    return {
        "message": f"Computed baselines for {len(baselines_created)} critics",
        "character_id": character_id,
        "baselines_count": len(baselines_created),
        "eval_runs_sampled": len(runs),
    }


# ─── Run Drift Check ─────────────────────────────────────────

@router.post("/check")
async def check_drift(
    character_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Compare last 10 evals against baselines, create DriftEvent for deviations."""
    # Get baselines for this character
    baselines_result = await db.execute(
        select(DriftBaseline).where(
            DriftBaseline.character_id == character_id,
            DriftBaseline.org_id == user.org_id,
        )
    )
    baselines = list(baselines_result.scalars().all())

    if not baselines:
        raise HTTPException(
            status_code=400,
            detail="No baselines found. Compute baselines first.",
        )

    baseline_map = {b.critic_id: b for b in baselines}

    # Get last 10 eval runs
    runs_result = await db.execute(
        select(EvalRun)
        .where(
            EvalRun.character_id == character_id,
            EvalRun.org_id == user.org_id,
            EvalRun.status == "completed",
        )
        .order_by(EvalRun.created_at.desc())
        .limit(10)
    )
    runs = list(runs_result.scalars().all())

    if not runs:
        return {"message": "No recent evaluations to check", "events_created": 0}

    run_ids = [r.id for r in runs]
    run_map = {r.id: r for r in runs}

    # Get eval results
    results_result = await db.execute(
        select(EvalResult).where(EvalResult.eval_run_id.in_(run_ids))
    )
    eval_results = list(results_result.scalars().all())
    result_ids = [r.id for r in eval_results]
    result_run_map = {r.id: r.eval_run_id for r in eval_results}

    if not result_ids:
        return {"message": "No evaluation results to check", "events_created": 0}

    # Get critic results
    cr_result = await db.execute(
        select(CriticResult).where(CriticResult.eval_result_id.in_(result_ids))
    )
    critic_results = list(cr_result.scalars().all())

    # Group by critic and compute mean
    critic_scores = {}
    critic_run_ids = {}
    for cr in critic_results:
        if cr.critic_id not in critic_scores:
            critic_scores[cr.critic_id] = []
            critic_run_ids[cr.critic_id] = []
        critic_scores[cr.critic_id].append(cr.score)
        eval_run_id = result_run_map.get(cr.eval_result_id)
        if eval_run_id:
            critic_run_ids[cr.critic_id].append(eval_run_id)

    events_created = 0
    for critic_id, scores in critic_scores.items():
        baseline = baseline_map.get(critic_id)
        if not baseline:
            continue

        mean_recent = statistics.mean(scores)
        deviation = abs(mean_recent - baseline.baseline_score)

        # Check if deviation exceeds threshold * std_deviation
        threshold_value = baseline.threshold * baseline.std_deviation if baseline.std_deviation > 0 else baseline.threshold * 5.0
        if deviation > threshold_value:
            # Determine severity
            if baseline.std_deviation > 0:
                z_score = deviation / baseline.std_deviation
            else:
                z_score = deviation / 5.0  # fallback

            if z_score >= 4.0:
                severity = "critical"
            elif z_score >= 3.0:
                severity = "high"
            elif z_score >= 2.0:
                severity = "medium"
            else:
                severity = "low"

            # Use most recent eval run id
            recent_run_id = critic_run_ids[critic_id][0] if critic_run_ids[critic_id] else None

            event = DriftEvent(
                baseline_id=baseline.id,
                detected_score=mean_recent,
                deviation=deviation,
                eval_run_id=recent_run_id,
                severity=severity,
                org_id=user.org_id,
            )
            db.add(event)
            events_created += 1

    await db.commit()

    return {
        "message": f"Drift check complete. {events_created} drift events detected.",
        "character_id": character_id,
        "events_created": events_created,
        "runs_checked": len(runs),
    }


# ─── List Baselines ──────────────────────────────────────────

@router.get("/baselines")
async def list_baselines(
    character_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all drift baselines."""
    query = select(DriftBaseline).where(DriftBaseline.org_id == user.org_id)
    if character_id:
        query = query.where(DriftBaseline.character_id == character_id)
    query = query.order_by(DriftBaseline.character_id, DriftBaseline.critic_id)

    result = await db.execute(query)
    baselines = list(result.scalars().all())

    # Build name maps
    char_result = await db.execute(
        select(CharacterCard).where(CharacterCard.org_id == user.org_id)
    )
    char_map = {c.id: c.name for c in char_result.scalars().all()}

    critic_result = await db.execute(select(Critic))
    critic_map = {c.id: c.name for c in critic_result.scalars().all()}

    return [
        {
            "id": b.id,
            "character_id": b.character_id,
            "character_name": char_map.get(b.character_id, ""),
            "card_version_id": b.card_version_id,
            "critic_id": b.critic_id,
            "critic_name": critic_map.get(b.critic_id, ""),
            "baseline_score": b.baseline_score,
            "std_deviation": b.std_deviation,
            "sample_count": b.sample_count,
            "threshold": b.threshold,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "updated_at": b.updated_at.isoformat() if b.updated_at else None,
        }
        for b in baselines
    ]


# ─── List Drift Events ───────────────────────────────────────

@router.get("/events")
async def list_drift_events(
    character_id: Optional[int] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List drift events with optional filters."""
    query = (
        select(DriftEvent)
        .where(DriftEvent.org_id == user.org_id)
        .order_by(DriftEvent.created_at.desc())
        .limit(limit)
    )
    if severity:
        query = query.where(DriftEvent.severity == severity)

    result = await db.execute(query)
    events = list(result.scalars().all())

    # Get baseline info for character filtering and enrichment
    baseline_ids = list(set(e.baseline_id for e in events))
    if baseline_ids:
        baselines_result = await db.execute(
            select(DriftBaseline).where(DriftBaseline.id.in_(baseline_ids))
        )
        baseline_map = {b.id: b for b in baselines_result.scalars().all()}
    else:
        baseline_map = {}

    # Filter by character_id if specified
    if character_id:
        events = [
            e for e in events
            if baseline_map.get(e.baseline_id) and baseline_map[e.baseline_id].character_id == character_id
        ]

    # Build name maps
    char_result = await db.execute(
        select(CharacterCard).where(CharacterCard.org_id == user.org_id)
    )
    char_map = {c.id: c.name for c in char_result.scalars().all()}

    critic_result = await db.execute(select(Critic))
    critic_map = {c.id: c.name for c in critic_result.scalars().all()}

    return [
        {
            "id": e.id,
            "baseline_id": e.baseline_id,
            "character_id": baseline_map[e.baseline_id].character_id if e.baseline_id in baseline_map else None,
            "character_name": char_map.get(
                baseline_map[e.baseline_id].character_id, ""
            ) if e.baseline_id in baseline_map else "",
            "critic_id": baseline_map[e.baseline_id].critic_id if e.baseline_id in baseline_map else None,
            "critic_name": critic_map.get(
                baseline_map[e.baseline_id].critic_id, ""
            ) if e.baseline_id in baseline_map else "",
            "baseline_score": baseline_map[e.baseline_id].baseline_score if e.baseline_id in baseline_map else None,
            "detected_score": e.detected_score,
            "deviation": e.deviation,
            "severity": e.severity,
            "acknowledged": e.acknowledged,
            "eval_run_id": e.eval_run_id,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]


# ─── Drift Summary ───────────────────────────────────────────

@router.get("/summary")
async def drift_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return baselines + recent events + status per character."""
    # Get all baselines
    baselines_result = await db.execute(
        select(DriftBaseline).where(DriftBaseline.org_id == user.org_id)
    )
    baselines = list(baselines_result.scalars().all())

    # Get recent events (last 100)
    events_result = await db.execute(
        select(DriftEvent)
        .where(DriftEvent.org_id == user.org_id)
        .order_by(DriftEvent.created_at.desc())
        .limit(100)
    )
    events = list(events_result.scalars().all())

    # Build maps
    char_result = await db.execute(
        select(CharacterCard).where(CharacterCard.org_id == user.org_id)
    )
    char_map = {c.id: c.name for c in char_result.scalars().all()}

    critic_result = await db.execute(select(Critic))
    critic_map = {c.id: c.name for c in critic_result.scalars().all()}

    baseline_map = {b.id: b for b in baselines}

    # Group baselines by character
    char_baselines = {}
    for b in baselines:
        if b.character_id not in char_baselines:
            char_baselines[b.character_id] = []
        char_baselines[b.character_id].append({
            "id": b.id,
            "critic_id": b.critic_id,
            "critic_name": critic_map.get(b.critic_id, ""),
            "baseline_score": b.baseline_score,
            "std_deviation": b.std_deviation,
            "sample_count": b.sample_count,
            "threshold": b.threshold,
        })

    # Group events by character
    char_events = {}
    for e in events:
        baseline = baseline_map.get(e.baseline_id)
        if not baseline:
            continue
        cid = baseline.character_id
        if cid not in char_events:
            char_events[cid] = []
        char_events[cid].append({
            "id": e.id,
            "critic_name": critic_map.get(baseline.critic_id, ""),
            "baseline_score": baseline.baseline_score,
            "detected_score": e.detected_score,
            "deviation": e.deviation,
            "severity": e.severity,
            "acknowledged": e.acknowledged,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })

    # Build per-character summary
    characters_summary = []
    all_char_ids = set(list(char_baselines.keys()) + list(char_events.keys()))
    for cid in sorted(all_char_ids):
        events_for_char = char_events.get(cid, [])
        unacknowledged = [e for e in events_for_char if not e["acknowledged"]]

        # Determine status
        if not events_for_char:
            status = "ok"
        elif any(e["severity"] in ("critical", "high") for e in unacknowledged):
            status = "critical"
        elif any(e["severity"] == "medium" for e in unacknowledged):
            status = "warning"
        else:
            status = "ok"

        characters_summary.append({
            "character_id": cid,
            "character_name": char_map.get(cid, ""),
            "status": status,
            "baselines": char_baselines.get(cid, []),
            "recent_events": events_for_char[:10],
            "unacknowledged_count": len(unacknowledged),
        })

    return {
        "total_baselines": len(baselines),
        "total_events": len(events),
        "characters": characters_summary,
    }
