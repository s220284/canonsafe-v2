"""Pydantic schemas for the review queue."""
from __future__ import annotations

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReviewItemOut(BaseModel):
    id: int
    eval_run_id: int
    character_id: Optional[int]
    status: str
    priority: int
    reason: Optional[str]
    assigned_to: Optional[int]
    assigned_at: Optional[datetime]
    resolved_at: Optional[datetime]
    resolution: Optional[str]
    override_decision: Optional[str]
    override_justification: Optional[str]
    reviewer_notes: Optional[str]
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewResolveRequest(BaseModel):
    resolution: str  # "approved", "overridden", "re_evaluated"
    override_decision: Optional[str] = None
    override_justification: Optional[str] = None
    notes: Optional[str] = None


class ReviewStatsOut(BaseModel):
    pending: int
    claimed: int
    resolved: int
    expired: int
    resolved_today: int
    avg_resolution_minutes: Optional[float]
