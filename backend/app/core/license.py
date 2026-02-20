"""License enforcement middleware — FastAPI dependencies for checking license limits."""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db


async def check_license_active(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dependency that checks the org has an active, non-expired license.
    Allows a 7-day grace period after expiry."""
    from app.services import license_service

    license_key = await license_service.get_license_for_org(db, user.org_id)

    # No license = trial mode — allow access (limits checked separately)
    if not license_key:
        return user

    if not license_key.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="License has been deactivated. Contact support.",
        )

    if license_key.expires_at:
        grace_end = license_key.expires_at + timedelta(days=7)
        if datetime.utcnow() > grace_end:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="License has expired. Please renew your license to continue.",
            )

    return user


async def check_user_limit(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if org is at user limit before creating new users."""
    from app.services import license_service

    limits = await license_service.check_limits(db, user.org_id)
    if limits["at_limit"]["users"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User limit reached ({limits['limits']['max_users']}). Upgrade your plan to add more users.",
        )
    return user


async def check_character_limit(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if org is at character limit before creating new characters."""
    from app.services import license_service

    limits = await license_service.check_limits(db, user.org_id)
    if limits["at_limit"]["characters"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Character limit reached ({limits['limits']['max_characters']}). Upgrade your plan to add more characters.",
        )
    return user


async def check_eval_limit(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if org is at monthly eval limit."""
    from app.services import license_service

    limits = await license_service.check_limits(db, user.org_id)
    if limits["at_limit"]["evals"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Monthly evaluation limit reached ({limits['limits']['max_evals_per_month']}). Upgrade your plan for more evaluations.",
        )
    return user
