"""User management routes."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_admin
from app.models.core import User
from app.schemas.users import (
    UserListOut,
    InviteUserRequest,
    InvitationOut,
    AcceptInvitationRequest,
    ChangeRoleRequest,
)
from app.services import user_service, audit_service

router = APIRouter()


@router.get("", response_model=List[UserListOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """List all users in the current org."""
    return await user_service.list_org_users(db, user.org_id)


@router.post("/invite", response_model=InvitationOut)
async def invite_user(
    data: InviteUserRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Create an invitation."""
    try:
        invitation = await user_service.invite_user(
            db, data.email, user.org_id, data.role, user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await audit_service.log_action(
        db, user.org_id, user.id, "user.invite",
        resource_type="invitation", resource_id=invitation.id,
        detail={"email": data.email, "role": data.role},
    )
    return invitation


@router.get("/invitations", response_model=List[InvitationOut])
async def list_invitations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """List pending invitations."""
    return await user_service.list_pending_invitations(db, user.org_id)


@router.delete("/invitations/{invitation_id}")
async def revoke_invitation(
    invitation_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Revoke a pending invitation."""
    ok = await user_service.revoke_invitation(db, invitation_id, user.org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Invitation not found or already used")
    return {"ok": True}


@router.post("/accept-invitation")
async def accept_invitation(
    data: AcceptInvitationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Accept an invitation and create an account (public endpoint)."""
    try:
        new_user = await user_service.accept_invitation(
            db, data.token, data.password, data.full_name
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await audit_service.log_action(
        db, new_user.org_id, new_user.id, "user.accept_invitation",
        resource_type="user", resource_id=new_user.id,
    )

    # Auto-login: return a token
    from app.core.auth import create_access_token
    token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": token, "token_type": "bearer", "user_id": new_user.id}


@router.patch("/{user_id}/role")
async def change_role(
    user_id: int,
    data: ChangeRoleRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Change a user's role."""
    try:
        updated = await user_service.change_user_role(db, user_id, user.org_id, data.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    await audit_service.log_action(
        db, user.org_id, user.id, "user.role_change",
        resource_type="user", resource_id=user_id,
        detail={"new_role": data.role},
    )
    return {"ok": True, "role": updated.role}


@router.post("/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Deactivate a user."""
    updated = await user_service.deactivate_user(db, user_id, user.org_id)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    await audit_service.log_action(
        db, user.org_id, user.id, "user.deactivate",
        resource_type="user", resource_id=user_id,
    )
    return {"ok": True}


@router.post("/{user_id}/reactivate")
async def reactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Reactivate a user."""
    updated = await user_service.reactivate_user(db, user_id, user.org_id)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    await audit_service.log_action(
        db, user.org_id, user.id, "user.reactivate",
        resource_type="user", resource_id=user_id,
    )
    return {"ok": True}
