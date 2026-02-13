from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ExemplarCreate(BaseModel):
    character_id: int
    modality: str
    content: dict
    eval_score: float
    eval_run_id: Optional[int] = None
    tags: List[str] = []


class ExemplarUpdate(BaseModel):
    modality: Optional[str] = None
    content: Optional[dict] = None
    eval_score: Optional[float] = None
    tags: Optional[List[str]] = None


class ExemplarOut(BaseModel):
    id: int
    character_id: int
    modality: str
    content: dict
    eval_score: float
    eval_run_id: Optional[int]
    tags: list
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True
