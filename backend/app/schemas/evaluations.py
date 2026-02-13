from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, Union, List
from datetime import datetime


class EvalRequest(BaseModel):
    character_id: int
    content: Union[str, dict]  # text string or {"modality": "image", "url": "..."}
    modality: str = "text"
    profile_id: Optional[int] = None
    franchise_id: Optional[int] = None
    agent_id: Optional[str] = None
    territory: Optional[str] = None  # for consent verification


class EvalRunOut(BaseModel):
    id: int
    character_id: int
    card_version_id: Optional[int]
    profile_id: Optional[int]
    franchise_id: Optional[int]
    agent_id: Optional[str]
    modality: str
    status: str
    tier: str
    sampled: bool
    overall_score: Optional[float]
    decision: Optional[str]
    consent_verified: bool
    c2pa_metadata: dict
    org_id: int
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class CriticResultOut(BaseModel):
    id: int
    critic_id: int
    score: float
    weight: float
    reasoning: Optional[str]
    flags: list
    latency_ms: Optional[int]

    class Config:
        from_attributes = True


class EvalResultOut(BaseModel):
    id: int
    eval_run_id: int
    weighted_score: float
    critic_scores: dict
    flags: list
    recommendations: list
    critic_results: List[CriticResultOut] = []

    class Config:
        from_attributes = True


class EvalResponse(BaseModel):
    eval_run: EvalRunOut
    result: Optional[EvalResultOut] = None
