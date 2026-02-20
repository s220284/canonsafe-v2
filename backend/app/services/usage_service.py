"""Usage metering service — track eval counts and costs per org per month."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import UsageRecord


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
