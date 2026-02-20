"""API key schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class ApiKeyCreateRequest(BaseModel):
    name: str
    scopes: List[str] = []


class ApiKeyOut(BaseModel):
    id: int
    org_id: int
    created_by: int
    name: str
    key_prefix: str
    scopes: List[str] = []
    is_active: bool
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyCreateResponse(BaseModel):
    """Returned on creation — includes the full key shown once."""
    api_key: ApiKeyOut
    full_key: str
