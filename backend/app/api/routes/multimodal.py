"""Multi-Modal Evaluation routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.multimodal import (
    ImageAnalyzeRequest,
    AudioAnalyzeRequest,
    VideoAnalyzeRequest,
    ModalityAnalysisResult,
)
from app.services import multimodal_service

router = APIRouter()


@router.post("/analyze-image", response_model=ModalityAnalysisResult)
async def analyze_image(
    req: ImageAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Analyze an image for character IP fidelity."""
    if not req.image_url and not req.image_base64:
        raise HTTPException(status_code=400, detail="Provide either image_url or image_base64")

    result = await multimodal_service.analyze_image(
        db=db,
        image_url=req.image_url,
        image_base64=req.image_base64,
        character_id=req.character_id,
        org_id=user.org_id,
        card_version_id=req.card_version_id,
    )

    if "error" in result and "score" not in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.post("/analyze-audio", response_model=ModalityAnalysisResult)
async def analyze_audio(
    req: AudioAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Analyze audio content description for character IP fidelity."""
    result = await multimodal_service.analyze_audio_description(
        db=db,
        audio_description=req.audio_description,
        character_id=req.character_id,
        org_id=user.org_id,
        card_version_id=req.card_version_id,
    )

    if "error" in result and "score" not in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.post("/analyze-video", response_model=ModalityAnalysisResult)
async def analyze_video(
    req: VideoAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Analyze video content description for character IP fidelity."""
    result = await multimodal_service.analyze_video_description(
        db=db,
        video_description=req.video_description,
        character_id=req.character_id,
        org_id=user.org_id,
        card_version_id=req.card_version_id,
    )

    if "error" in result and "score" not in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.get("/capabilities")
async def get_capabilities(
    user: User = Depends(get_current_user),
):
    """Return supported modalities and their requirements."""
    return multimodal_service.get_capabilities()
