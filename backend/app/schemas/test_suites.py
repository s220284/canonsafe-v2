from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TestSuiteCreate(BaseModel):
    name: str
    description: Optional[str] = None
    character_id: int
    card_version_id: Optional[int] = None
    tier: str = "base"
    passing_threshold: float = 0.8


class TestSuiteOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    character_id: int
    card_version_id: Optional[int]
    tier: str
    passing_threshold: float
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TestSuiteUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tier: Optional[str] = None
    passing_threshold: Optional[float] = None


class TestCaseCreate(BaseModel):
    name: str
    input_content: dict
    expected_outcome: dict = {}
    tags: List[str] = []


class TestCaseUpdate(BaseModel):
    name: Optional[str] = None
    input_content: Optional[dict] = None
    expected_outcome: Optional[dict] = None
    tags: Optional[List[str]] = None


class TestCaseOut(BaseModel):
    id: int
    suite_id: int
    name: str
    input_content: dict
    expected_outcome: dict
    tags: list
    created_at: datetime

    class Config:
        from_attributes = True
