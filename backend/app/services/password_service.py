"""Password reset service."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import hash_password
from app.models.core import User, PasswordResetToken


async def request_reset(db: AsyncSession, email: str) -> Optional[str]:
    """Generate a password reset token (1-hour expiry). Returns the token."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        # Don't reveal whether email exists
        return None

    token = secrets.token_urlsafe(32)
    reset = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.add(reset)
    await db.flush()
    return token


async def reset_password(db: AsyncSession, token: str, new_password: str) -> bool:
    """Validate token and update password."""
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == token)
    )
    reset = result.scalar_one_or_none()

    if not reset:
        raise ValueError("Invalid reset token")
    if reset.used_at is not None:
        raise ValueError("Reset token has already been used")
    if reset.expires_at < datetime.utcnow():
        raise ValueError("Reset token has expired")

    # Update password
    user_result = await db.execute(
        select(User).where(User.id == reset.user_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    user.hashed_password = hash_password(new_password)
    user.password_changed_at = datetime.utcnow()
    reset.used_at = datetime.utcnow()

    await db.flush()
    return True


async def change_password(
    db: AsyncSession,
    user_id: int,
    current_password: str,
    new_password: str,
) -> bool:
    """Change password for authenticated user."""
    from app.core.auth import verify_password

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    if not verify_password(current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")

    user.hashed_password = hash_password(new_password)
    user.password_changed_at = datetime.utcnow()
    await db.flush()
    return True
