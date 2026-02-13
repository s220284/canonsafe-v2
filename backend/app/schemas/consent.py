from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ConsentCreate(BaseModel):
    character_id: int
    performer_name: str
    consent_type: str
    territories: List[str] = []
    modalities: List[str] = []
    usage_restrictions: List[str] = []
    valid_from: datetime
    valid_until: Optional[datetime] = None
    strike_clause: bool = False
    document_ref: Optional[str] = None


class ConsentOut(BaseModel):
    id: int
    character_id: int
    performer_name: str
    consent_type: str
    territories: list
    modalities: list
    usage_restrictions: list
    valid_from: datetime
    valid_until: Optional[datetime]
    strike_clause: bool
    strike_active: bool
    document_ref: Optional[str]
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ConsentCheckRequest(BaseModel):
    character_id: int
    modality: str
    territory: Optional[str] = None
    usage_type: Optional[str] = None


class ConsentCheckResult(BaseModel):
    approved: bool
    reasons: List[str] = []
    active_consents: int = 0
