"""License key generation, validation, activation, and limit checking."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import LicenseKey, Organization, User, CharacterCard, UsageRecord


PLAN_DEFAULTS = {
    "starter": {"max_users": 5, "max_characters": 50, "max_evals_per_month": 1000, "features": []},
    "professional": {"max_users": 20, "max_characters": 200, "max_evals_per_month": 10000, "features": ["red_team", "ab_testing"]},
    "enterprise": {"max_users": 100, "max_characters": 1000, "max_evals_per_month": 100000, "features": ["red_team", "ab_testing", "multimodal", "ci_cd", "webhooks"]},
}


def _generate_key(plan: str) -> str:
    """Generate a license key in CSF-{plan_prefix}-{random} format."""
    prefix_map = {"starter": "STR", "professional": "PRO", "enterprise": "ENT"}
    prefix = prefix_map.get(plan, "STD")
    random_part = secrets.token_hex(12).upper()
    # Format: CSF-PRO-A1B2C3D4-E5F6G7H8-I9J0K1L2
    key = f"CSF-{prefix}-{random_part[:8]}-{random_part[8:16]}-{random_part[16:]}"
    return key


async def generate_license(
    db: AsyncSession,
    plan: str,
    max_users: Optional[int] = None,
    max_characters: Optional[int] = None,
    max_evals_per_month: Optional[int] = None,
    features: Optional[list] = None,
    expires_at: Optional[datetime] = None,
    metadata: Optional[dict] = None,
) -> LicenseKey:
    """Generate a new license key (super-admin only)."""
    defaults = PLAN_DEFAULTS.get(plan, PLAN_DEFAULTS["starter"])

    key = _generate_key(plan)
    # Ensure uniqueness
    while True:
        existing = await db.execute(select(LicenseKey).where(LicenseKey.key == key))
        if not existing.scalar_one_or_none():
            break
        key = _generate_key(plan)

    license_key = LicenseKey(
        key=key,
        plan=plan,
        max_users=max_users or defaults["max_users"],
        max_characters=max_characters or defaults["max_characters"],
        max_evals_per_month=max_evals_per_month or defaults["max_evals_per_month"],
        features=features if features is not None else defaults["features"],
        expires_at=expires_at,
        metadata_=metadata or {},
    )
    db.add(license_key)
    await db.flush()
    return license_key


async def validate_license(db: AsyncSession, key: str) -> dict:
    """Validate a license key. Returns status info."""
    result = await db.execute(select(LicenseKey).where(LicenseKey.key == key))
    license_key = result.scalar_one_or_none()

    if not license_key:
        return {"valid": False, "reason": "not_found"}

    if not license_key.is_active:
        return {"valid": False, "reason": "deactivated"}

    if license_key.expires_at and license_key.expires_at < datetime.utcnow():
        grace_end = license_key.expires_at + timedelta(days=7)
        if datetime.utcnow() > grace_end:
            return {"valid": False, "reason": "expired"}
        return {"valid": True, "reason": "grace_period", "expires_at": license_key.expires_at.isoformat()}

    # Update last_validated_at
    license_key.last_validated_at = datetime.utcnow()
    await db.flush()

    return {"valid": True, "reason": "active", "plan": license_key.plan}


async def activate_license(db: AsyncSession, key: str, org_id: int) -> LicenseKey:
    """Bind a license key to an organization."""
    result = await db.execute(select(LicenseKey).where(LicenseKey.key == key))
    license_key = result.scalar_one_or_none()

    if not license_key:
        raise ValueError("Invalid license key")

    if not license_key.is_active:
        raise ValueError("License key has been deactivated")

    if license_key.org_id and license_key.org_id != org_id:
        raise ValueError("License key is already bound to another organization")

    if license_key.expires_at and license_key.expires_at < datetime.utcnow():
        raise ValueError("License key has expired")

    license_key.org_id = org_id
    license_key.activated_at = datetime.utcnow()
    license_key.last_validated_at = datetime.utcnow()

    # Update org plan to match license
    org_result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = org_result.scalar_one_or_none()
    if org:
        org.plan = license_key.plan

    await db.flush()
    return license_key


async def get_license_for_org(db: AsyncSession, org_id: int) -> Optional[LicenseKey]:
    """Get the active license for an organization."""
    result = await db.execute(
        select(LicenseKey).where(
            LicenseKey.org_id == org_id,
            LicenseKey.is_active == True,
        ).order_by(LicenseKey.activated_at.desc())
    )
    return result.scalar_one_or_none()


async def get_all_licenses(db: AsyncSession) -> List[LicenseKey]:
    """List all license keys (super-admin)."""
    result = await db.execute(
        select(LicenseKey).order_by(LicenseKey.issued_at.desc())
    )
    return list(result.scalars().all())


async def check_limits(db: AsyncSession, org_id: int) -> dict:
    """Check current usage against license limits."""
    license_key = await get_license_for_org(db, org_id)

    if not license_key:
        # No license — use trial defaults
        limits = {"max_users": 3, "max_characters": 10, "max_evals_per_month": 100}
    else:
        limits = {
            "max_users": license_key.max_users,
            "max_characters": license_key.max_characters,
            "max_evals_per_month": license_key.max_evals_per_month,
        }

    # Current counts
    user_count = (await db.execute(
        select(func.count(User.id)).where(User.org_id == org_id, User.is_active == True)
    )).scalar() or 0

    char_count = (await db.execute(
        select(func.count(CharacterCard.id)).where(CharacterCard.org_id == org_id)
    )).scalar() or 0

    # Monthly eval count
    period = datetime.utcnow().strftime("%Y-%m")
    usage_result = await db.execute(
        select(UsageRecord).where(UsageRecord.org_id == org_id, UsageRecord.period == period)
    )
    usage = usage_result.scalar_one_or_none()
    eval_count = usage.eval_count if usage else 0

    return {
        "license": {
            "plan": license_key.plan if license_key else "trial",
            "key_prefix": license_key.key[:12] + "..." if license_key else None,
            "expires_at": license_key.expires_at.isoformat() if license_key and license_key.expires_at else None,
            "features": license_key.features if license_key else [],
        },
        "limits": limits,
        "usage": {
            "users": user_count,
            "characters": char_count,
            "evals_this_month": eval_count,
        },
        "at_limit": {
            "users": user_count >= limits["max_users"],
            "characters": char_count >= limits["max_characters"],
            "evals": eval_count >= limits["max_evals_per_month"],
        },
    }
