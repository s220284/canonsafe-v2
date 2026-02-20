"""User management service — invitations, role changes, deactivation."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import hash_password
from app.models.core import User, Invitation, Organization


async def list_org_users(db: AsyncSession, org_id: int) -> List[User]:
    """List all users in an organization."""
    result = await db.execute(
        select(User).where(User.org_id == org_id).order_by(User.created_at)
    )
    return list(result.scalars().all())


async def invite_user(
    db: AsyncSession,
    email: str,
    org_id: int,
    role: str,
    invited_by: int,
) -> Invitation:
    """Create an invitation with a unique token (7-day expiry)."""
    # Check if email already has an account in this org
    existing = await db.execute(
        select(User).where(User.email == email, User.org_id == org_id)
    )
    if existing.scalar_one_or_none():
        raise ValueError("User with this email already exists in this organization")

    # Check for existing pending invitation
    existing_inv = await db.execute(
        select(Invitation).where(
            Invitation.email == email,
            Invitation.org_id == org_id,
            Invitation.status == "pending",
        )
    )
    if existing_inv.scalar_one_or_none():
        raise ValueError("A pending invitation already exists for this email")

    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        email=email,
        org_id=org_id,
        role=role,
        token=token,
        status="pending",
        invited_by=invited_by,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(invitation)
    await db.flush()
    return invitation


async def accept_invitation(
    db: AsyncSession,
    token: str,
    password: str,
    full_name: Optional[str] = None,
) -> User:
    """Validate token, create user account."""
    result = await db.execute(
        select(Invitation).where(Invitation.token == token)
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise ValueError("Invalid invitation token")
    if invitation.status != "pending":
        raise ValueError(f"Invitation has already been {invitation.status}")
    if invitation.expires_at < datetime.utcnow():
        invitation.status = "expired"
        await db.flush()
        raise ValueError("Invitation has expired")

    # Check if email already registered
    existing = await db.execute(
        select(User).where(User.email == invitation.email)
    )
    if existing.scalar_one_or_none():
        raise ValueError("An account with this email already exists")

    # Create user
    user = User(
        email=invitation.email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=invitation.role,
        org_id=invitation.org_id,
        is_active=True,
    )
    db.add(user)

    # Mark invitation as accepted
    invitation.status = "accepted"
    await db.flush()

    return user


async def get_invitation_by_token(db: AsyncSession, token: str) -> Optional[Invitation]:
    """Get invitation details by token."""
    result = await db.execute(
        select(Invitation).where(Invitation.token == token)
    )
    return result.scalar_one_or_none()


async def list_pending_invitations(db: AsyncSession, org_id: int) -> List[Invitation]:
    """List pending invitations for an org."""
    result = await db.execute(
        select(Invitation).where(
            Invitation.org_id == org_id,
            Invitation.status == "pending",
        ).order_by(Invitation.created_at.desc())
    )
    return list(result.scalars().all())


async def revoke_invitation(db: AsyncSession, invitation_id: int, org_id: int) -> bool:
    """Revoke a pending invitation."""
    result = await db.execute(
        select(Invitation).where(
            Invitation.id == invitation_id,
            Invitation.org_id == org_id,
            Invitation.status == "pending",
        )
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        return False
    invitation.status = "revoked"
    await db.flush()
    return True


async def change_user_role(
    db: AsyncSession,
    user_id: int,
    org_id: int,
    new_role: str,
) -> Optional[User]:
    """Change a user's role within their org."""
    if new_role not in ("admin", "editor", "viewer"):
        raise ValueError(f"Invalid role: {new_role}")

    result = await db.execute(
        select(User).where(User.id == user_id, User.org_id == org_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return None

    user.role = new_role
    await db.flush()
    return user


async def deactivate_user(db: AsyncSession, user_id: int, org_id: int) -> Optional[User]:
    """Soft-deactivate a user."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.org_id == org_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return None
    user.is_active = False
    await db.flush()
    return user


async def reactivate_user(db: AsyncSession, user_id: int, org_id: int) -> Optional[User]:
    """Reactivate a deactivated user."""
    result = await db.execute(
        select(User).where(User.id == user_id, User.org_id == org_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        return None
    user.is_active = True
    await db.flush()
    return user
