from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.auth import get_current_user
from app.core.rbac import require_editor
from app.core.database import get_db
from app.models.core import User, AgentCertification
from app.schemas.certifications import CertificationRequest, CertificationUpdate, CertificationOut
from app.services import certification_service

router = APIRouter()


@router.post("", response_model=CertificationOut)
async def certify_agent(
    data: CertificationRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    try:
        cert = await certification_service.certify_agent(db, data, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    from app.services import audit_service
    await audit_service.log_action(db, user.org_id, user.id, "cert.create", "certification", cert.id)
    return cert


@router.get("", response_model=List[CertificationOut])
async def list_certifications(
    response: Response,
    agent_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Total count for pagination
    count_q = select(func.count(AgentCertification.id)).where(AgentCertification.org_id == user.org_id)
    if agent_id:
        count_q = count_q.where(AgentCertification.agent_id == agent_id)
    total = (await db.execute(count_q)).scalar() or 0
    response.headers["X-Total-Count"] = str(total)

    q = select(AgentCertification).where(AgentCertification.org_id == user.org_id)
    if agent_id:
        q = q.where(AgentCertification.agent_id == agent_id)
    q = q.order_by(AgentCertification.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


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
    user: User = Depends(require_editor),
):
    cert = await certification_service.update_certification(db, cert_id, user.org_id, data)
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    return cert
