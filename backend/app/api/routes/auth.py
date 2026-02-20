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
from app.schemas.auth import UserCreate, Token, UserOut, GoogleAuthCallback

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
    # Guard against null hashed_password (Google-only users)
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
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
        auth_provider=getattr(user, "auth_provider", "local") or "local",
    )


# ─── Google OAuth ──────────────────────────────────────────────

@router.get("/google/config")
async def google_config():
    """Return Google OAuth config if configured. Frontend uses this to decide whether to show the Google button."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=404, detail="Google OAuth not configured")
    return {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "scope": "openid email profile",
    }


@router.post("/google/callback", response_model=Token)
async def google_callback(data: GoogleAuthCallback, db: AsyncSession = Depends(get_db)):
    """Exchange Google authorization code for tokens, verify, and create/link user."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Google OAuth not configured")

    import httpx

    # 1. Exchange authorization code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": data.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": data.redirect_uri,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange authorization code")

    token_data = token_resp.json()
    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="No ID token in response")

    # 2. Verify ID token
    async with httpx.AsyncClient() as client:
        verify_resp = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        )

    if verify_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid ID token")

    id_info = verify_resp.json()

    # 3. Validate audience
    if id_info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Token audience mismatch")

    # 4. Require verified email
    if id_info.get("email_verified") != "true" and id_info.get("email_verified") is not True:
        raise HTTPException(status_code=400, detail="Email not verified by Google")

    google_id = id_info.get("sub")
    email = id_info.get("email")
    full_name = id_info.get("name", "")

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Missing user info from Google")

    # 5. Find user by google_id
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        # 6. Try account linking by email
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            # Link Google ID to existing account
            user.google_id = google_id
            if user.auth_provider == "local":
                user.auth_provider = "local+google"
            elif user.auth_provider != "local+google":
                user.auth_provider = "local+google"
            await db.flush()
        else:
            # 7. Create new user + org
            org_name = full_name or email.split("@")[0]
            slug = org_name.lower().replace(" ", "-").replace(".", "")
            # Ensure slug uniqueness
            slug_check = await db.execute(select(Organization).where(Organization.slug == slug))
            if slug_check.scalar_one_or_none():
                import secrets as _secrets
                slug = f"{slug}-{_secrets.token_hex(3)}"

            org = Organization(
                name=org_name,
                slug=slug,
                display_name=org_name,
            )
            db.add(org)
            await db.flush()

            user = User(
                email=email,
                hashed_password=None,
                full_name=full_name,
                role="admin",
                org_id=org.id,
                google_id=google_id,
                auth_provider="google",
            )
            db.add(user)
            await db.flush()

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    # Track last login
    user.last_login_at = datetime.utcnow()
    await db.flush()

    jwt_token = create_access_token(data={"sub": str(user.id)})

    # Audit log
    from app.services import audit_service
    await audit_service.log_action(
        db, user.org_id, user.id, "user.login.google",
        resource_type="user", resource_id=user.id,
    )

    return Token(access_token=jwt_token)
