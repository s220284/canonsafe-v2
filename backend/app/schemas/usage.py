"""Usage record schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UsageRecordOut(BaseModel):
    id: int
    org_id: int
    period: str
    eval_count: int = 0
    api_call_count: int = 0
    llm_tokens_used: int = 0
    estimated_cost: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
