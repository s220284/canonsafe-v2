"""License key management and activation routes."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, get_super_admin
from app.core.database import get_db
from app.core.rbac import require_admin
from app.models.core import User
from app.services import license_service

router = APIRouter()


# ─── Schemas ───────────────────────────────────────────────────

class LicenseGenerateRequest(BaseModel):
    plan: str = "starter"
    max_users: Optional[int] = None
    max_characters: Optional[int] = None
    max_evals_per_month: Optional[int] = None
    features: Optional[list] = None
    expires_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class LicenseUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    max_users: Optional[int] = None
    max_characters: Optional[int] = None
    max_evals_per_month: Optional[int] = None
    features: Optional[list] = None
    expires_at: Optional[datetime] = None


class LicenseActivateRequest(BaseModel):
    key: str


class LicenseValidateRequest(BaseModel):
    key: str


class LicenseOut(BaseModel):
    id: int
    key: str
    org_id: Optional[int]
    plan: str
    max_users: int
    max_characters: int
    max_evals_per_month: int
    features: list
    issued_at: Optional[datetime]
    expires_at: Optional[datetime]
    is_active: bool
    last_validated_at: Optional[datetime]
    activated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Super-Admin Endpoints ─────────────────────────────────────

@router.post("/admin/licenses", response_model=LicenseOut)
async def generate_license(
    data: LicenseGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_super_admin),
):
    """Generate a new license key (super-admin only)."""
    if data.plan not in ("starter", "professional", "enterprise"):
        raise HTTPException(status_code=400, detail="Plan must be starter, professional, or enterprise")

    license_key = await license_service.generate_license(
        db,
        plan=data.plan,
        max_users=data.max_users,
        max_characters=data.max_characters,
        max_evals_per_month=data.max_evals_per_month,
        features=data.features,
        expires_at=data.expires_at,
        metadata=data.metadata,
    )
    return license_key


@router.get("/admin/licenses")
async def list_licenses(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_super_admin),
):
    """List all license keys (super-admin only)."""
    licenses = await license_service.get_all_licenses(db)
    return [
        {
            "id": lk.id,
            "key": lk.key,
            "org_id": lk.org_id,
            "plan": lk.plan,
            "max_users": lk.max_users,
            "max_characters": lk.max_characters,
            "max_evals_per_month": lk.max_evals_per_month,
            "features": lk.features or [],
            "issued_at": lk.issued_at,
            "expires_at": lk.expires_at,
            "is_active": lk.is_active,
            "last_validated_at": lk.last_validated_at,
            "activated_at": lk.activated_at,
        }
        for lk in licenses
    ]


@router.patch("/admin/licenses/{license_id}")
async def update_license(
    license_id: int,
    data: LicenseUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_super_admin),
):
    """Update/deactivate a license key (super-admin only)."""
    from sqlalchemy import select
    from app.models.core import LicenseKey

    result = await db.execute(select(LicenseKey).where(LicenseKey.id == license_id))
    license_key = result.scalar_one_or_none()
    if not license_key:
        raise HTTPException(status_code=404, detail="License not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(license_key, key, value)
    await db.flush()

    return {"ok": True, "id": license_key.id}


# ─── Org-Level Endpoints ──────────────────────────────────────

@router.post("/license/activate")
async def activate_license(
    data: LicenseActivateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Activate a license key for the current organization."""
    try:
        license_key = await license_service.activate_license(db, data.key, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "ok": True,
        "plan": license_key.plan,
        "max_users": license_key.max_users,
        "max_characters": license_key.max_characters,
        "max_evals_per_month": license_key.max_evals_per_month,
    }


@router.get("/license/status")
async def license_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get current org's license status and usage vs limits."""
    return await license_service.check_limits(db, user.org_id)


# ─── Public Validation ─────────────────────────────────────────

@router.post("/license/validate")
async def validate_license(
    data: LicenseValidateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Heartbeat validation for boxed installs. Public endpoint."""
    return await license_service.validate_license(db, data.key)
