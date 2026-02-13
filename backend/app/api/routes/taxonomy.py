from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.taxonomy import (
    TaxonomyCategoryCreate, TaxonomyCategoryUpdate, TaxonomyCategoryOut,
    TaxonomyTagCreate, TaxonomyTagUpdate, TaxonomyTagOut,
)
from app.services import taxonomy_service

router = APIRouter()


@router.post("/categories", response_model=TaxonomyCategoryOut)
async def create_category(
    data: TaxonomyCategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await taxonomy_service.create_category(db, data, user.org_id)


@router.get("/categories", response_model=List[TaxonomyCategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await taxonomy_service.list_categories(db, user.org_id)


@router.patch("/categories/{cat_id}", response_model=TaxonomyCategoryOut)
async def update_category(
    cat_id: int,
    data: TaxonomyCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cat = await taxonomy_service.update_category(db, cat_id, user.org_id, data)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.delete("/categories/{cat_id}")
async def delete_category(
    cat_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ok = await taxonomy_service.delete_category(db, cat_id, user.org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"ok": True}


@router.post("/tags", response_model=TaxonomyTagOut)
async def create_tag(
    data: TaxonomyTagCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await taxonomy_service.create_tag(db, data, user.org_id)


@router.get("/tags", response_model=List[TaxonomyTagOut])
async def list_tags(
    category_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await taxonomy_service.list_tags(db, user.org_id, category_id)


@router.patch("/tags/{tag_id}", response_model=TaxonomyTagOut)
async def update_tag(
    tag_id: int,
    data: TaxonomyTagUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tag = await taxonomy_service.update_tag(db, tag_id, user.org_id, data)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.delete("/tags/{tag_id}")
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ok = await taxonomy_service.delete_tag(db, tag_id, user.org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"ok": True}
