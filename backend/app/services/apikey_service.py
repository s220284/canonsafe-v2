"""API key management service."""
from __future__ import annotations

import secrets
from datetime import datetime
from typing import Optional, List, Tuple

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import ApiKey, Organization


def generate_api_key() -> Tuple[str, str, str]:
    """Generate a new API key.

    Returns:
        (full_key, prefix, bcrypt_hash)
    """
    random_part = secrets.token_hex(20)  # 40 hex chars
    full_key = f"csf_{random_part}"
    prefix = full_key[:8]
    key_hash = bcrypt.hashpw(full_key.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return full_key, prefix, key_hash


async def create_api_key(
    db: AsyncSession,
    org_id: int,
    user_id: int,
    name: str,
    scopes: Optional[List[str]] = None,
) -> Tuple[ApiKey, str]:
    """Create a new API key. Returns (ApiKey record, full_key shown once)."""
    full_key, prefix, key_hash = generate_api_key()

    api_key = ApiKey(
        org_id=org_id,
        created_by=user_id,
        name=name,
        key_prefix=prefix,
        key_hash=key_hash,
        scopes=scopes or [],
        is_active=True,
    )
    db.add(api_key)
    await db.flush()

    return api_key, full_key


async def validate_api_key(
    db: AsyncSession,
    key_string: str,
) -> Optional[Tuple[ApiKey, Organization]]:
    """Validate an API key string. Returns (ApiKey, Organization) or None."""
    if not key_string or not key_string.startswith("csf_"):
        return None

    prefix = key_string[:8]

    # Find candidate keys by prefix
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.key_prefix == prefix,
            ApiKey.is_active == True,
        )
    )
    candidates = list(result.scalars().all())

    for api_key in candidates:
        # Check expiry
        if api_key.expires_at and api_key.expires_at < datetime.utcnow():
            continue

        # Verify bcrypt hash
        if bcrypt.checkpw(key_string.encode("utf-8"), api_key.key_hash.encode("utf-8")):
            # Update last_used_at
            api_key.last_used_at = datetime.utcnow()
            await db.flush()

            # Load org
            org_result = await db.execute(
                select(Organization).where(Organization.id == api_key.org_id)
            )
            org = org_result.scalar_one_or_none()
            if org and org.is_active:
                return api_key, org

    return None


async def list_api_keys(db: AsyncSession, org_id: int) -> List[ApiKey]:
    """List API keys for an org. Never returns actual key."""
    result = await db.execute(
        select(ApiKey).where(ApiKey.org_id == org_id).order_by(ApiKey.created_at.desc())
    )
    return list(result.scalars().all())


async def revoke_api_key(db: AsyncSession, key_id: int, org_id: int) -> bool:
    """Revoke (deactivate) an API key."""
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.org_id == org_id)
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        return False
    api_key.is_active = False
    await db.flush()
    return True
