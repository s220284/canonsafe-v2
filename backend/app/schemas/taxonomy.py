from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TaxonomyCategoryCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class TaxonomyCategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    parent_id: Optional[int]
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaxonomyCategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None


class TaxonomyTagCreate(BaseModel):
    name: str
    slug: str
    category_id: int
    evaluation_rules: dict = {}
    severity: str = "medium"
    applicable_modalities: List[str] = []
    propagate_to_franchise: bool = False


class TaxonomyTagUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    category_id: Optional[int] = None
    evaluation_rules: Optional[dict] = None
    severity: Optional[str] = None
    applicable_modalities: Optional[List[str]] = None
    propagate_to_franchise: Optional[bool] = None


class TaxonomyTagOut(BaseModel):
    id: int
    name: str
    slug: str
    category_id: int
    evaluation_rules: dict
    severity: str
    applicable_modalities: list
    propagate_to_franchise: bool
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True
