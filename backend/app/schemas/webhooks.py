from __future__ import annotations

from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime


class WebhookCreate(BaseModel):
    url: str
    events: List[str] = []
    secret: str
    description: Optional[str] = None


class WebhookUpdate(BaseModel):
    url: Optional[str] = None
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class WebhookOut(BaseModel):
    id: int
    url: str
    events: list
    active: bool
    description: Optional[str]
    last_triggered_at: Optional[datetime]
    failure_count: int
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookDeliveryOut(BaseModel):
    id: int
    subscription_id: int
    event_type: str
    payload: Any
    status_code: Optional[int]
    response_body: Optional[str]
    success: bool
    attempts: int
    created_at: datetime

    class Config:
        from_attributes = True
