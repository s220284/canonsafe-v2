"""Character Card CRUD with versioning and 5-pack management."""
from __future__ import annotations

from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.core import CharacterCard, CardVersion
from app.schemas.characters import CharacterCardCreate, CharacterCardUpdate, CardVersionCreate


async def create_character(db: AsyncSession, data: CharacterCardCreate, org_id: int) -> CharacterCard:
    card = CharacterCard(
        name=data.name,
        slug=data.slug,
        description=data.description,
        franchise_id=data.franchise_id,
        is_main=data.is_main,
        is_focus=data.is_focus,
        org_id=org_id,
    )
    db.add(card)
    await db.flush()
    return card


async def get_character(db: AsyncSession, character_id: int, org_id: int) -> Optional[CharacterCard]:
    result = await db.execute(
        select(CharacterCard).where(
            CharacterCard.id == character_id,
            CharacterCard.org_id == org_id,
        )
    )
    return result.scalar_one_or_none()


async def list_characters(db: AsyncSession, org_id: int, franchise_id: Optional[int] = None) -> List[CharacterCard]:
    q = select(CharacterCard).where(CharacterCard.org_id == org_id)
    if franchise_id:
        q = q.where(CharacterCard.franchise_id == franchise_id)
    q = q.order_by(CharacterCard.is_main.desc(), CharacterCard.is_focus.desc(), CharacterCard.name)
    result = await db.execute(q)
    return list(result.scalars().all())


async def update_character(db: AsyncSession, character_id: int, org_id: int, data: CharacterCardUpdate) -> Optional[CharacterCard]:
    card = await get_character(db, character_id, org_id)
    if not card:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(card, field, value)
    await db.flush()
    return card


async def delete_character(db: AsyncSession, character_id: int, org_id: int) -> bool:
    card = await get_character(db, character_id, org_id)
    if not card:
        return False
    await db.delete(card)
    await db.flush()
    return True


# ─── Card Versions ──────────────────────────────────────────────

async def create_version(db: AsyncSession, character_id: int, data: CardVersionCreate, user_id: int) -> CardVersion:
    # Get next version number
    result = await db.execute(
        select(func.coalesce(func.max(CardVersion.version_number), 0))
        .where(CardVersion.character_id == character_id)
    )
    next_version = result.scalar() + 1

    version = CardVersion(
        character_id=character_id,
        version_number=next_version,
        canon_pack=data.canon_pack,
        legal_pack=data.legal_pack,
        safety_pack=data.safety_pack,
        visual_identity_pack=data.visual_identity_pack,
        audio_identity_pack=data.audio_identity_pack,
        changelog=data.changelog,
        created_by=user_id,
    )
    db.add(version)
    await db.flush()
    return version


async def get_version(db: AsyncSession, version_id: int) -> Optional[CardVersion]:
    result = await db.execute(select(CardVersion).where(CardVersion.id == version_id))
    return result.scalar_one_or_none()


async def list_versions(db: AsyncSession, character_id: int) -> List[CardVersion]:
    result = await db.execute(
        select(CardVersion)
        .where(CardVersion.character_id == character_id)
        .order_by(CardVersion.version_number.desc())
    )
    return list(result.scalars().all())


async def publish_version(db: AsyncSession, character_id: int, version_id: int, org_id: int) -> Optional[CardVersion]:
    version = await get_version(db, version_id)
    if not version or version.character_id != character_id:
        return None
    version.status = "published"
    # Update character's active version
    card = await get_character(db, character_id, org_id)
    if card:
        card.active_version_id = version_id
    await db.flush()
    return version


async def get_active_version(db: AsyncSession, character_id: int, org_id: int) -> Optional[CardVersion]:
    card = await get_character(db, character_id, org_id)
    if not card or not card.active_version_id:
        return None
    return await get_version(db, card.active_version_id)
