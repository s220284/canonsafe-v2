"""Super-admin control plane routes."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_super_admin
from app.models.core import (
    User, Organization, Franchise, CharacterCard, EvalRun, Invitation,
)
from app.schemas.users import OrgOut, UserListOut, InviteUserRequest, InvitationOut
from app.services import user_service, audit_service

router = APIRouter()


class CreateOrgRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    display_name: Optional[str] = None
    industry: Optional[str] = None
    plan: str = "trial"


class UpdateOrgRequest(BaseModel):
    display_name: Optional[str] = None
    industry: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/orgs", response_model=List[OrgOut])
async def list_orgs(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """List all organizations."""
    result = await db.execute(
        select(Organization).order_by(Organization.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/orgs", response_model=OrgOut)
async def create_org(
    data: CreateOrgRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """Create a new client organization."""
    # Check for duplicate name
    existing = await db.execute(
        select(Organization).where(Organization.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Organization name already exists")

    slug = data.slug or data.name.lower().replace(" ", "-").replace(".", "")
    org = Organization(
        name=data.name,
        slug=slug,
        display_name=data.display_name or data.name,
        industry=data.industry,
        plan=data.plan,
    )
    db.add(org)
    await db.flush()

    await audit_service.log_action(
        db, org.id, user.id, "admin.org_create",
        resource_type="organization", resource_id=org.id,
        detail={"name": data.name, "plan": data.plan},
    )
    return org


@router.patch("/orgs/{org_id}", response_model=OrgOut)
async def update_org(
    org_id: int,
    data: UpdateOrgRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """Update any organization."""
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)
    await db.flush()

    await audit_service.log_action(
        db, org_id, user.id, "admin.org_update",
        resource_type="organization", resource_id=org_id,
        detail=update_data,
    )
    return org


@router.get("/orgs/{org_id}/users", response_model=List[UserListOut])
async def list_org_users(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """List users of any organization."""
    return await user_service.list_org_users(db, org_id)


@router.post("/orgs/{org_id}/invite", response_model=InvitationOut)
async def invite_to_org(
    org_id: int,
    data: InviteUserRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """Invite a user to any organization."""
    # Verify org exists
    org_result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Organization not found")

    try:
        invitation = await user_service.invite_user(
            db, data.email, org_id, data.role, user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await audit_service.log_action(
        db, org_id, user.id, "admin.user_invite",
        resource_type="invitation", resource_id=invitation.id,
        detail={"email": data.email, "role": data.role},
    )
    return invitation


@router.post("/orgs/{org_id}/seed")
async def seed_org_data(
    org_id: int,
    dataset: str = "demo_small",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """Seed demo data for an organization."""
    # Verify org exists
    org_result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Organization not found")

    try:
        from app.services import seed_service
        result = await seed_service.seed_org_demo_data(db, org_id, dataset)
        await audit_service.log_action(
            db, org_id, user.id, "admin.seed_data",
            resource_type="organization", resource_id=org_id,
            detail={"dataset": dataset},
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ImportError:
        raise HTTPException(status_code=501, detail="Seed service not yet implemented")


@router.get("/stats")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_super_admin),
):
    """Platform-wide statistics."""
    org_count = (await db.execute(select(func.count(Organization.id)))).scalar() or 0
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )).scalar() or 0
    char_count = (await db.execute(select(func.count(CharacterCard.id)))).scalar() or 0
    eval_count = (await db.execute(select(func.count(EvalRun.id)))).scalar() or 0
    franchise_count = (await db.execute(select(func.count(Franchise.id)))).scalar() or 0

    return {
        "organizations": org_count,
        "total_users": user_count,
        "active_users": active_users,
        "total_characters": char_count,
        "total_evaluations": eval_count,
        "total_franchises": franchise_count,
    }
