"""Audit log routes."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_admin
from app.models.core import User
from app.schemas.audit import AuditLogOut
from app.services import audit_service

router = APIRouter()


@router.get("", response_model=List[AuditLogOut])
async def list_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    since: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """List audit log entries with optional filters."""
    since_dt = None
    if since:
        try:
            since_dt = datetime.fromisoformat(since)
        except ValueError:
            pass

    return await audit_service.list_audit_logs(
        db,
        org_id=user.org_id,
        action=action,
        user_id=user_id,
        resource_type=resource_type,
        since=since_dt,
        limit=limit,
        offset=offset,
    )
