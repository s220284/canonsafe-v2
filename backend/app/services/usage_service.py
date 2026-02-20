"""Usage metering service — track eval counts and costs per org per month."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import UsageRecord, EvalRun, CriticResult, EvalResult, CharacterCard


def _current_period() -> str:
    """Get current period string e.g. '2026-02'."""
    return datetime.utcnow().strftime("%Y-%m")


async def _get_or_create_record(db: AsyncSession, org_id: int, period: Optional[str] = None) -> UsageRecord:
    """Get or create a usage record for the current period."""
    period = period or _current_period()
    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.org_id == org_id,
            UsageRecord.period == period,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        record = UsageRecord(org_id=org_id, period=period)
        db.add(record)
        await db.flush()
    return record


async def record_eval(
    db: AsyncSession,
    org_id: int,
    tokens: int = 0,
    cost: float = 0.0,
):
    """Increment monthly eval counter and token/cost totals."""
    record = await _get_or_create_record(db, org_id)
    record.eval_count = (record.eval_count or 0) + 1
    record.llm_tokens_used = (record.llm_tokens_used or 0) + tokens
    record.estimated_cost = (record.estimated_cost or 0.0) + cost
    await db.flush()


async def record_api_call(db: AsyncSession, org_id: int):
    """Increment monthly API call counter."""
    record = await _get_or_create_record(db, org_id)
    record.api_call_count = (record.api_call_count or 0) + 1
    await db.flush()


async def get_usage_summary(
    db: AsyncSession,
    org_id: int,
    months: int = 6,
) -> List[UsageRecord]:
    """Get monthly usage breakdown."""
    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.org_id == org_id,
        ).order_by(UsageRecord.period.desc()).limit(months)
    )
    return list(result.scalars().all())


async def get_usage_details(db: AsyncSession, org_id: int) -> dict:
    """Get detailed usage for the current month — per character, per critic."""
    period = _current_period()
    year, month = period.split("-")
    start = datetime(int(year), int(month), 1)
    if int(month) == 12:
        end = datetime(int(year) + 1, 1, 1)
    else:
        end = datetime(int(year), int(month) + 1, 1)

    # Top characters by eval count
    char_result = await db.execute(
        select(
            EvalRun.character_id,
            func.count(EvalRun.id).label("eval_count"),
            func.avg(EvalRun.overall_score).label("avg_score"),
        ).where(
            EvalRun.org_id == org_id,
            EvalRun.created_at >= start,
            EvalRun.created_at < end,
        ).group_by(EvalRun.character_id).order_by(func.count(EvalRun.id).desc()).limit(10)
    )
    top_characters_raw = char_result.all()

    # Get character names
    char_ids = [row[0] for row in top_characters_raw]
    chars_result = await db.execute(
        select(CharacterCard.id, CharacterCard.name).where(CharacterCard.id.in_(char_ids))
    ) if char_ids else None
    char_names = {}
    if chars_result:
        for row in chars_result.all():
            char_names[row[0]] = row[1]

    top_characters = [
        {
            "character_id": row[0],
            "character_name": char_names.get(row[0], f"Character #{row[0]}"),
            "eval_count": row[1],
            "avg_score": round(row[2], 3) if row[2] else None,
        }
        for row in top_characters_raw
    ]

    # Summary stats for this month
    usage_record = await _get_or_create_record(db, org_id, period)

    return {
        "period": period,
        "eval_count": usage_record.eval_count or 0,
        "api_call_count": usage_record.api_call_count or 0,
        "llm_tokens_used": usage_record.llm_tokens_used or 0,
        "estimated_cost": round(usage_record.estimated_cost or 0.0, 4),
        "top_characters": top_characters,
    }


async def get_cost_breakdown(db: AsyncSession, org_id: int, months: int = 6) -> list:
    """Get monthly cost data for the past N months."""
    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.org_id == org_id,
        ).order_by(UsageRecord.period.desc()).limit(months)
    )
    records = list(result.scalars().all())
    return [
        {
            "period": r.period,
            "eval_count": r.eval_count or 0,
            "api_call_count": r.api_call_count or 0,
            "llm_tokens_used": r.llm_tokens_used or 0,
            "estimated_cost": round(r.estimated_cost or 0.0, 4),
        }
        for r in records
    ]
