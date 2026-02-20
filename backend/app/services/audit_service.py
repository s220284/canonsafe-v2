"""Audit logging service — fire-and-forget action logging."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import AuditLogEntry


async def log_action(
    db: AsyncSession,
    org_id: Optional[int],
    user_id: Optional[int],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    detail: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    """Log an audit action. Fire-and-forget — errors are silently ignored."""
    try:
        entry = AuditLogEntry(
            org_id=org_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            detail=detail,
            ip_address=ip_address,
        )
        db.add(entry)
        await db.flush()
        return entry
    except Exception:
        pass


async def list_audit_logs(
    db: AsyncSession,
    org_id: int,
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    since: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[AuditLogEntry]:
    """List audit logs with optional filters."""
    q = select(AuditLogEntry).where(AuditLogEntry.org_id == org_id)

    if action:
        q = q.where(AuditLogEntry.action == action)
    if user_id:
        q = q.where(AuditLogEntry.user_id == user_id)
    if resource_type:
        q = q.where(AuditLogEntry.resource_type == resource_type)
    if since:
        q = q.where(AuditLogEntry.created_at >= since)

    q = q.order_by(desc(AuditLogEntry.created_at)).offset(offset).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())
