from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CriticCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    category: Optional[str] = None
    modality: str = "text"
    prompt_template: str
    rubric: dict = {}
    default_weight: float = 1.0


class CriticUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    modality: Optional[str] = None
    prompt_template: Optional[str] = None
    rubric: Optional[dict] = None
    default_weight: Optional[float] = None


class CriticOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    category: Optional[str]
    modality: str
    prompt_template: str
    rubric: dict
    default_weight: float
    is_system: bool
    org_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class CriticConfigCreate(BaseModel):
    critic_id: int
    franchise_id: Optional[int] = None
    character_id: Optional[int] = None
    enabled: bool = True
    weight_override: Optional[float] = None
    threshold_override: Optional[float] = None
    extra_instructions: Optional[str] = None


class CriticConfigOut(BaseModel):
    id: int
    critic_id: int
    org_id: Optional[int]
    franchise_id: Optional[int]
    character_id: Optional[int]
    enabled: bool
    weight_override: Optional[float]
    threshold_override: Optional[float]
    extra_instructions: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class EvaluationProfileCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    critic_config_ids: List[int] = []
    sampling_rate: float = 1.0
    tiered_evaluation: bool = False
    rapid_screen_critics: List[int] = []
    deep_eval_critics: List[int] = []


class EvaluationProfileOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    org_id: int
    critic_config_ids: list
    sampling_rate: float
    tiered_evaluation: bool
    rapid_screen_critics: list
    deep_eval_critics: list
    created_at: datetime

    class Config:
        from_attributes = True
