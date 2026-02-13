from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.consent import ConsentCreate, ConsentOut, ConsentCheckRequest, ConsentCheckResult
from app.services import consent_service

router = APIRouter()


@router.post("", response_model=ConsentOut)
async def create_consent(
    data: ConsentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await consent_service.create_consent(db, data, user.org_id)


@router.get("", response_model=List[ConsentOut])
async def list_consents(
    character_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await consent_service.list_consents(db, user.org_id, character_id)


@router.post("/check", response_model=ConsentCheckResult)
async def check_consent(
    data: ConsentCheckRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    approved, reasons = await consent_service.check_consent(
        db, data.character_id, data.modality, user.org_id, data.territory, data.usage_type
    )
    consents = await consent_service.list_consents(db, user.org_id, data.character_id)
    return ConsentCheckResult(approved=approved, reasons=reasons, active_consents=len(consents))


@router.post("/{consent_id}/strike", response_model=ConsentOut)
async def activate_strike(
    consent_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    consent = await consent_service.activate_strike(db, consent_id, user.org_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    return consent
