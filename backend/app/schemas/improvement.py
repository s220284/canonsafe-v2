from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FailurePatternOut(BaseModel):
    id: int
    character_id: Optional[int]
    franchise_id: Optional[int]
    critic_id: Optional[int]
    pattern_type: str
    description: str
    frequency: int
    severity: str
    suggested_fix: Optional[str]
    status: str
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ImprovementTrajectoryOut(BaseModel):
    id: int
    character_id: Optional[int]
    franchise_id: Optional[int]
    metric_name: str
    data_points: list
    trend: Optional[str]
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ImprovementSummary(BaseModel):
    failure_patterns: List[FailurePatternOut]
    trajectories: List[ImprovementTrajectoryOut]
    suggestions: List[str] = []
