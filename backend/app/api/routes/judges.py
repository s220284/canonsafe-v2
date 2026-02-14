"""Custom Judge Registry routes."""
from __future__ import annotations

import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.rbac import require_admin
from app.core.database import get_db
from app.models.core import User
from app.schemas.judges import JudgeCreate, JudgeUpdate, JudgeOut, JudgeTestRequest, JudgeTestResponse
from app.services import judge_registry_service

router = APIRouter()


@router.post("", response_model=JudgeOut)
async def create_judge(
    data: JudgeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Register a new custom judge model."""
    return await judge_registry_service.create_judge(db, data, user.org_id)


@router.get("", response_model=List[JudgeOut])
async def list_judges(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all active registered judges for the organization."""
    return await judge_registry_service.list_judges(db, user.org_id)


@router.get("/{judge_id}", response_model=JudgeOut)
async def get_judge(
    judge_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a single judge by ID."""
    judge = await judge_registry_service.get_judge(db, judge_id, user.org_id)
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    return judge


@router.patch("/{judge_id}", response_model=JudgeOut)
async def update_judge(
    judge_id: int,
    data: JudgeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Update a judge's configuration."""
    judge = await judge_registry_service.update_judge(db, judge_id, user.org_id, data)
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    return judge


@router.delete("/{judge_id}")
async def delete_judge(
    judge_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Deactivate a judge (soft delete)."""
    ok = await judge_registry_service.delete_judge(db, judge_id, user.org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Judge not found")
    return {"detail": "Judge deactivated"}


@router.post("/{judge_id}/health-check", response_model=JudgeOut)
async def run_health_check(
    judge_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Run a health check on a judge endpoint."""
    judge = await judge_registry_service.health_check(db, judge_id, user.org_id)
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")
    return judge


@router.post("/{judge_id}/test", response_model=JudgeTestResponse)
async def test_judge(
    judge_id: int,
    req: JudgeTestRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Send a test prompt to the judge and return the response."""
    judge = await judge_registry_service.get_judge(db, judge_id, user.org_id)
    if not judge:
        raise HTTPException(status_code=404, detail="Judge not found")

    start = time.time()
    try:
        response_text = await judge_registry_service.call_custom_judge(
            judge,
            system_prompt=req.system_prompt,
            user_prompt=req.user_prompt,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
        )
        latency_ms = int((time.time() - start) * 1000)
        return JudgeTestResponse(
            success=True,
            response_text=response_text,
            latency_ms=latency_ms,
        )
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return JudgeTestResponse(
            success=False,
            error=str(e),
            latency_ms=latency_ms,
        )
