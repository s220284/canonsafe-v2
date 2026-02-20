from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


class ApiKeyUser:
    """Synthetic user object for API key authentication."""
    def __init__(self, org_id: int, scopes: list, api_key_id: int, api_key_name: str):
        self.id = None  # No real user ID
        self.org_id = org_id
        self.scopes = scopes
        self.role = "editor"  # API keys get editor-level access
        self.is_active = True
        self.is_super_admin = False
        self.email = f"apikey:{api_key_name}"
        self.full_name = f"API Key: {api_key_name}"
        self.api_key_id = api_key_id


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from app.models.core import User, Organization

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    # V3: reject inactive users
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # God Mode: super-admin can override org context via X-Org-Override header
    org_override = request.headers.get("x-org-override")
    if org_override and getattr(user, "is_super_admin", False):
        try:
            override_id = int(org_override)
            org_check = await db.execute(
                select(Organization).where(Organization.id == override_id)
            )
            if org_check.scalar_one_or_none():
                db.expunge(user)
                user.org_id = override_id
        except (ValueError, TypeError):
            pass

    return user


async def get_super_admin(
    user=Depends(get_current_user),
):
    """Dependency that requires super-admin access."""
    if not getattr(user, "is_super_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super-admin access required",
        )
    return user


async def get_current_auth(
    request: Request,
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)),
    x_api_key: Optional[str] = Depends(api_key_header),
    db: AsyncSession = Depends(get_db),
):
    """Dual auth: accepts JWT OR X-API-Key header. Returns User or ApiKeyUser."""
    # Try API key first
    if x_api_key:
        from app.services import apikey_service
        result = await apikey_service.validate_api_key(db, x_api_key)
        if result:
            api_key, org = result
            return ApiKeyUser(
                org_id=api_key.org_id,
                scopes=api_key.scopes or [],
                api_key_id=api_key.id,
                api_key_name=api_key.name,
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    # Fall back to JWT
    if token:
        from app.models.core import User, Organization
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            raise credentials_exception

        # God Mode: super-admin org override
        org_override = request.headers.get("x-org-override")
        if org_override and getattr(user, "is_super_admin", False):
            try:
                override_id = int(org_override)
                org_check = await db.execute(
                    select(Organization).where(Organization.id == override_id)
                )
                if org_check.scalar_one_or_none():
                    db.expunge(user)
                    user.org_id = override_id
            except (ValueError, TypeError):
                pass

        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required (JWT or API key)",
    )
