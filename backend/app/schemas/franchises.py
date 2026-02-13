from __future__ import annotations

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FranchiseCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    settings: dict = {}


class FranchiseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[dict] = None


class FranchiseOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    org_id: int
    settings: dict
    created_at: datetime

    class Config:
        from_attributes = True


class FranchiseHealthOut(BaseModel):
    franchise_id: int
    franchise_name: str
    total_evals: int
    avg_score: Optional[float]
    pass_rate: Optional[float]
    cross_character_consistency: Optional[float]
    world_building_consistency: Optional[float]
    health_score: Optional[float]
    character_breakdown: dict
