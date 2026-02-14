from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import (
    User,
    EvalRun,
    EvalResult,
    CriticResult,
    AgentCertification,
    CharacterCard,
    Franchise,
    FranchiseEvaluationAggregate,
)

router = APIRouter()


# ─── Export Evaluations ───────────────────────────────────────

@router.get("/evaluations")
async def export_evaluations(
    format: str = Query("csv", regex="^(csv|json)$"),
    character_id: Optional[int] = None,
    limit: int = 1000,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Export evaluation runs as CSV or JSON."""
    query = (
        select(EvalRun)
        .where(EvalRun.org_id == user.org_id)
        .order_by(EvalRun.created_at.desc())
        .limit(limit)
    )
    if character_id:
        query = query.where(EvalRun.character_id == character_id)

    result = await db.execute(query)
    runs = list(result.scalars().all())

    # Build character name map
    char_result = await db.execute(
        select(CharacterCard).where(CharacterCard.org_id == user.org_id)
    )
    char_map = {c.id: c.name for c in char_result.scalars().all()}

    rows = []
    for run in runs:
        rows.append({
            "id": run.id,
            "character_id": run.character_id,
            "character_name": char_map.get(run.character_id, ""),
            "modality": run.modality,
            "status": run.status,
            "tier": run.tier,
            "overall_score": run.overall_score,
            "decision": run.decision,
            "agent_id": run.agent_id or "",
            "consent_verified": run.consent_verified,
            "created_at": run.created_at.isoformat() if run.created_at else "",
            "completed_at": run.completed_at.isoformat() if run.completed_at else "",
        })

    if format == "json":
        headers = {
            "Content-Disposition": f"attachment; filename=evaluations_{datetime.utcnow().strftime('%Y%m%d')}.json"
        }
        return JSONResponse(content=rows, headers=headers)

    # CSV format
    if not rows:
        csv_content = "No data"
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        csv_content = output.getvalue()

    headers = {
        "Content-Disposition": f"attachment; filename=evaluations_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    }
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers=headers,
    )


# ─── Export Certifications ────────────────────────────────────

@router.get("/certifications")
async def export_certifications(
    format: str = Query("csv", regex="^(csv|json)$"),
    agent_id: Optional[str] = None,
    limit: int = 1000,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Export agent certifications as CSV or JSON."""
    query = (
        select(AgentCertification)
        .where(AgentCertification.org_id == user.org_id)
        .order_by(AgentCertification.created_at.desc())
        .limit(limit)
    )
    if agent_id:
        query = query.where(AgentCertification.agent_id == agent_id)

    result = await db.execute(query)
    certs = list(result.scalars().all())

    # Build character name map
    char_result = await db.execute(
        select(CharacterCard).where(CharacterCard.org_id == user.org_id)
    )
    char_map = {c.id: c.name for c in char_result.scalars().all()}

    rows = []
    for cert in certs:
        rows.append({
            "id": cert.id,
            "agent_id": cert.agent_id,
            "character_id": cert.character_id,
            "character_name": char_map.get(cert.character_id, ""),
            "card_version_id": cert.card_version_id,
            "tier": cert.tier,
            "status": cert.status,
            "score": cert.score,
            "certified_at": cert.certified_at.isoformat() if cert.certified_at else "",
            "expires_at": cert.expires_at.isoformat() if cert.expires_at else "",
            "created_at": cert.created_at.isoformat() if cert.created_at else "",
        })

    if format == "json":
        headers = {
            "Content-Disposition": f"attachment; filename=certifications_{datetime.utcnow().strftime('%Y%m%d')}.json"
        }
        return JSONResponse(content=rows, headers=headers)

    # CSV format
    if not rows:
        csv_content = "No data"
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        csv_content = output.getvalue()

    headers = {
        "Content-Disposition": f"attachment; filename=certifications_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    }
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers=headers,
    )


# ─── Export Franchise Health ──────────────────────────────────

@router.get("/franchise-health/{franchise_id}")
async def export_franchise_health(
    franchise_id: int,
    format: str = Query("csv", regex="^(csv|json)$"),
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Export franchise health aggregates as CSV or JSON."""
    # Verify franchise belongs to org
    franchise_result = await db.execute(
        select(Franchise).where(
            Franchise.id == franchise_id,
            Franchise.org_id == user.org_id,
        )
    )
    franchise = franchise_result.scalar_one_or_none()
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")

    cutoff = datetime.utcnow() - timedelta(days=days)
    agg_result = await db.execute(
        select(FranchiseEvaluationAggregate)
        .where(
            FranchiseEvaluationAggregate.franchise_id == franchise_id,
            FranchiseEvaluationAggregate.org_id == user.org_id,
            FranchiseEvaluationAggregate.period_start >= cutoff,
        )
        .order_by(FranchiseEvaluationAggregate.period_start.desc())
    )
    aggregates = list(agg_result.scalars().all())

    rows = []
    for agg in aggregates:
        rows.append({
            "id": agg.id,
            "franchise_id": agg.franchise_id,
            "franchise_name": franchise.name,
            "period_start": agg.period_start.isoformat() if agg.period_start else "",
            "period_end": agg.period_end.isoformat() if agg.period_end else "",
            "total_evals": agg.total_evals,
            "avg_score": agg.avg_score,
            "pass_rate": agg.pass_rate,
            "cross_character_consistency": agg.cross_character_consistency,
            "world_building_consistency": agg.world_building_consistency,
            "health_score": agg.health_score,
        })

    if format == "json":
        headers = {
            "Content-Disposition": f"attachment; filename=franchise_health_{franchise_id}_{datetime.utcnow().strftime('%Y%m%d')}.json"
        }
        return JSONResponse(content=rows, headers=headers)

    # CSV format
    if not rows:
        csv_content = "No data"
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        csv_content = output.getvalue()

    headers = {
        "Content-Disposition": f"attachment; filename=franchise_health_{franchise_id}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    }
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers=headers,
    )
