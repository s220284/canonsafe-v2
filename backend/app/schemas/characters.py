from __future__ import annotations

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CharacterCardCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    franchise_id: Optional[int] = None
    is_main: bool = False
    is_focus: bool = False


class CharacterCardUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    franchise_id: Optional[int] = None
    status: Optional[str] = None
    is_main: Optional[bool] = None
    is_focus: Optional[bool] = None


class CharacterCardOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    org_id: int
    franchise_id: Optional[int]
    active_version_id: Optional[int]
    status: str
    is_main: bool
    is_focus: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CardVersionCreate(BaseModel):
    canon_pack: dict = {}
    legal_pack: dict = {}
    safety_pack: dict = {}
    visual_identity_pack: dict = {}
    audio_identity_pack: dict = {}
    changelog: Optional[str] = None


class CardVersionOut(BaseModel):
    id: int
    character_id: int
    version_number: int
    status: str
    canon_pack: dict
    legal_pack: dict
    safety_pack: dict
    visual_identity_pack: dict
    audio_identity_pack: dict
    changelog: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
