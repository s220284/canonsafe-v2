from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.characters import (
    CharacterCardCreate, CharacterCardUpdate, CharacterCardOut,
    CardVersionCreate, CardVersionOut,
)
from app.services import character_service

router = APIRouter()


@router.post("", response_model=CharacterCardOut)
async def create_character(
    data: CharacterCardCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await character_service.create_character(db, data, user.org_id)


@router.get("", response_model=List[CharacterCardOut])
async def list_characters(
    franchise_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await character_service.list_characters(db, user.org_id, franchise_id)


@router.get("/{character_id}", response_model=CharacterCardOut)
async def get_character(
    character_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    card = await character_service.get_character(db, character_id, user.org_id)
    if not card:
        raise HTTPException(status_code=404, detail="Character not found")
    return card


@router.patch("/{character_id}", response_model=CharacterCardOut)
async def update_character(
    character_id: int,
    data: CharacterCardUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    card = await character_service.update_character(db, character_id, user.org_id, data)
    if not card:
        raise HTTPException(status_code=404, detail="Character not found")
    return card


@router.delete("/{character_id}")
async def delete_character(
    character_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ok = await character_service.delete_character(db, character_id, user.org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Character not found")
    return {"ok": True}


# ─── Card Versions ──────────────────────────────────────────────

@router.post("/{character_id}/versions", response_model=CardVersionOut)
async def create_version(
    character_id: int,
    data: CardVersionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    card = await character_service.get_character(db, character_id, user.org_id)
    if not card:
        raise HTTPException(status_code=404, detail="Character not found")
    return await character_service.create_version(db, character_id, data, user.id)


@router.get("/{character_id}/versions", response_model=List[CardVersionOut])
async def list_versions(
    character_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await character_service.list_versions(db, character_id)


@router.post("/{character_id}/versions/{version_id}/publish", response_model=CardVersionOut)
async def publish_version(
    character_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    version = await character_service.publish_version(db, character_id, version_id, user.org_id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version
