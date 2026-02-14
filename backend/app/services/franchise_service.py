"""Franchise management and cross-character evaluation aggregation."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Franchise, FranchiseEvaluationAggregate, EvalRun, CharacterCard
from app.schemas.franchises import FranchiseCreate, FranchiseUpdate


async def create_franchise(db: AsyncSession, data: FranchiseCreate, org_id: int) -> Franchise:
    franchise = Franchise(
        name=data.name,
        slug=data.slug,
        description=data.description,
        settings=data.settings,
        org_id=org_id,
    )
    db.add(franchise)
    await db.flush()
    return franchise


async def get_franchise(db: AsyncSession, franchise_id: int, org_id: int) -> Optional[Franchise]:
    result = await db.execute(
        select(Franchise).where(Franchise.id == franchise_id, Franchise.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def list_franchises(db: AsyncSession, org_id: int) -> List[Franchise]:
    result = await db.execute(
        select(Franchise).where(Franchise.org_id == org_id).order_by(Franchise.name)
    )
    return list(result.scalars().all())


async def update_franchise(db: AsyncSession, franchise_id: int, org_id: int, data: FranchiseUpdate) -> Optional[Franchise]:
    franchise = await get_franchise(db, franchise_id, org_id)
    if not franchise:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(franchise, field, value)
    await db.flush()
    return franchise


async def compute_franchise_health(db: AsyncSession, franchise_id: int, org_id: int, days: int = 30) -> dict:
    """Compute franchise health metrics from recent evaluations."""
    franchise = await get_franchise(db, franchise_id, org_id)
    if not franchise:
        return {}

    since = datetime.utcnow() - timedelta(days=days)

    # Get all eval runs for this franchise
    result = await db.execute(
        select(EvalRun).where(
            EvalRun.franchise_id == franchise_id,
            EvalRun.org_id == org_id,
            EvalRun.status == "completed",
            EvalRun.created_at >= since,
        )
    )
    runs = list(result.scalars().all())

    if not runs:
        return {
            "franchise_id": franchise_id,
            "franchise_name": franchise.name,
            "total_evals": 0,
            "avg_score": None,
            "pass_rate": None,
            "cross_character_consistency": None,
            "world_building_consistency": None,
            "health_score": None,
            "character_breakdown": {},
        }

    total = len(runs)
    scores = [r.overall_score for r in runs if r.overall_score is not None]
    avg_score = sum(scores) / len(scores) if scores else 0.0
    pass_count = sum(1 for r in runs if r.decision == "pass")
    pass_rate = pass_count / total if total else 0.0

    # Per-character breakdown
    char_scores = {}
    for r in runs:
        cid = r.character_id
        if cid not in char_scores:
            char_scores[cid] = []
        if r.overall_score is not None:
            char_scores[cid].append(r.overall_score)

    char_avgs_raw = {cid: sum(s) / len(s) for cid, s in char_scores.items() if s}

    # Resolve character names for breakdown
    char_name_map = {}
    if char_avgs_raw:
        name_result = await db.execute(
            select(CharacterCard.id, CharacterCard.name).where(
                CharacterCard.id.in_(list(char_avgs_raw.keys()))
            )
        )
        char_name_map = {row.id: row.name for row in name_result.all()}

    char_avgs = {char_name_map.get(cid, f"Character {cid}"): round(v, 1) for cid, v in char_avgs_raw.items()}

    # Cross-character consistency = 1 - std_dev of character averages
    if len(char_avgs_raw) > 1:
        values = list(char_avgs_raw.values())
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std_dev = variance ** 0.5
        cross_char = max(0, 1 - std_dev)
    else:
        cross_char = 1.0 if char_avgs_raw else None

    health = avg_score * 0.4 + pass_rate * 0.3 + (cross_char or 0) * 0.3 if scores else None

    return {
        "franchise_id": franchise_id,
        "franchise_name": franchise.name,
        "total_evals": total,
        "avg_score": round(avg_score, 4),
        "pass_rate": round(pass_rate, 4),
        "cross_character_consistency": round(cross_char, 4) if cross_char is not None else None,
        "world_building_consistency": round(cross_char, 4) if cross_char is not None else None,  # same metric for now
        "health_score": round(health, 4) if health is not None else None,
        "character_breakdown": char_avgs,
    }


async def save_aggregate(db: AsyncSession, franchise_id: int, org_id: int, health: dict) -> FranchiseEvaluationAggregate:
    now = datetime.utcnow()
    agg = FranchiseEvaluationAggregate(
        franchise_id=franchise_id,
        period_start=now - timedelta(days=30),
        period_end=now,
        total_evals=health.get("total_evals", 0),
        avg_score=health.get("avg_score"),
        pass_rate=health.get("pass_rate"),
        cross_character_consistency=health.get("cross_character_consistency"),
        world_building_consistency=health.get("world_building_consistency"),
        health_score=health.get("health_score"),
        breakdown=health.get("character_breakdown", {}),
        org_id=org_id,
    )
    db.add(agg)
    await db.flush()
    return agg
