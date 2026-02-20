from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.core import User, Organization
from app.schemas.auth import UserCreate, Token, UserOut

router = APIRouter()


@router.post("/register", response_model=UserOut)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    # V3: Check if public registration is allowed
    if not settings.ALLOW_PUBLIC_REGISTRATION:
        raise HTTPException(
            status_code=403,
            detail="Public registration is disabled. Please use an invitation link.",
        )

    # Check existing user
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Require org name for self-service signup
    if not data.org_name or not data.org_name.strip():
        raise HTTPException(status_code=400, detail="Organization name is required")

    # Always create a new org (isolation — never join existing by name)
    org_name = data.org_name.strip()
    slug = org_name.lower().replace(" ", "-").replace(".", "")
    # Ensure slug uniqueness
    slug_check = await db.execute(select(Organization).where(Organization.slug == slug))
    if slug_check.scalar_one_or_none():
        import secrets
        slug = f"{slug}-{secrets.token_hex(3)}"

    org = Organization(
        name=org_name,
        slug=slug,
        display_name=org_name,
    )
    db.add(org)
    await db.flush()

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role="admin",
        org_id=org.id,
    )
    db.add(user)
    await db.flush()

    # V3: Audit log
    from app.services import audit_service
    await audit_service.log_action(
        db, org.id, user.id, "user.register",
        resource_type="user", resource_id=user.id,
    )

    return user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    # V3: Track last login
    user.last_login_at = datetime.utcnow()
    await db.flush()

    token = create_access_token(data={"sub": str(user.id)})

    # V3: Audit log
    from app.services import audit_service
    await audit_service.log_action(
        db, user.org_id, user.id, "user.login",
        resource_type="user", resource_id=user.id,
    )

    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # V3: Denormalize org_name into response
    org_result = await db.execute(
        select(Organization).where(Organization.id == user.org_id)
    )
    org = org_result.scalar_one_or_none()

    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        org_id=user.org_id,
        is_active=user.is_active,
        created_at=user.created_at,
        is_super_admin=getattr(user, "is_super_admin", False),
        last_login_at=getattr(user, "last_login_at", None),
        org_name=org.name if org else None,
    )
