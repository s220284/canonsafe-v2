from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.certifications import CertificationRequest, CertificationUpdate, CertificationOut
from app.services import certification_service

router = APIRouter()


@router.post("", response_model=CertificationOut)
async def certify_agent(
    data: CertificationRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return await certification_service.certify_agent(db, data, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[CertificationOut])
async def list_certifications(
    agent_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await certification_service.list_certifications(db, user.org_id, agent_id)


@router.get("/{cert_id}", response_model=CertificationOut)
async def get_certification(
    cert_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cert = await certification_service.get_certification(db, cert_id, user.org_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    return cert


@router.patch("/{cert_id}", response_model=CertificationOut)
async def update_certification(
    cert_id: int,
    data: CertificationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cert = await certification_service.update_certification(db, cert_id, user.org_id, data)
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    return cert
