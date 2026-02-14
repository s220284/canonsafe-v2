from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ImageAnalyzeRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    character_id: int
    card_version_id: Optional[int] = None


class AudioAnalyzeRequest(BaseModel):
    audio_description: str
    character_id: int
    card_version_id: Optional[int] = None


class VideoAnalyzeRequest(BaseModel):
    video_description: str
    character_id: int
    card_version_id: Optional[int] = None


class ModalityAnalysisResult(BaseModel):
    modality: str
    score: float
    decision: str  # pass, fail, review
    feedback: str
    packs_checked: List[str]
    pack_compliance: dict  # {pack_name: {score, notes}}
    flags: List[str]
    character_name: Optional[str] = None


class CapabilitiesResponse(BaseModel):
    supported_modalities: List[dict]
    # Each: {"modality": "image", "input_types": ["url", "base64"], "packs_used": [...], "description": "..."}
