from __future__ import annotations

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CertificationRequest(BaseModel):
    agent_id: str
    character_id: int
    card_version_id: int
    tier: str = "base"
    test_suite_id: int


class CertificationUpdate(BaseModel):
    status: Optional[str] = None
    score: Optional[float] = None
    results_summary: Optional[dict] = None


class CertificationOut(BaseModel):
    id: int
    agent_id: str
    character_id: int
    card_version_id: int
    tier: str
    status: str
    score: Optional[float]
    results_summary: dict
    certified_at: Optional[datetime]
    expires_at: Optional[datetime]
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True
