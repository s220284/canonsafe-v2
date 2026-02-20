"""Password reset and change routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.users import PasswordResetRequest, PasswordResetConfirm, ChangePasswordRequest
from app.services import password_service, audit_service

router = APIRouter()


@router.post("/password-reset-request")
async def request_password_reset(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset token (public endpoint)."""
    token = await password_service.request_reset(db, data.email)
    # Always return success to not reveal whether email exists
    # In Phase 1, admin manually shares the reset link
    result = {"ok": True, "message": "If the email exists, a reset link has been generated."}
    if token:
        # Include token in response for Phase 1 (admin-shared links)
        result["token"] = token
    return result


@router.post("/password-reset")
async def reset_password(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    """Reset password with a token (public endpoint)."""
    try:
        await password_service.reset_password(db, data.token, data.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "message": "Password has been reset successfully."}


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Change own password (requires authentication)."""
    try:
        await password_service.change_password(
            db, user.id, data.current_password, data.new_password
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await audit_service.log_action(
        db, user.org_id, user.id, "user.password_change",
        resource_type="user", resource_id=user.id,
    )
    return {"ok": True, "message": "Password changed successfully."}
