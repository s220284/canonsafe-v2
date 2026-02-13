"""Taxonomy-driven evaluation configuration."""
from __future__ import annotations

from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import TaxonomyCategory, TaxonomyTag
from app.schemas.taxonomy import TaxonomyCategoryCreate, TaxonomyCategoryUpdate, TaxonomyTagCreate, TaxonomyTagUpdate


async def create_category(db: AsyncSession, data: TaxonomyCategoryCreate, org_id: int) -> TaxonomyCategory:
    cat = TaxonomyCategory(
        name=data.name, slug=data.slug, description=data.description,
        parent_id=data.parent_id, org_id=org_id,
    )
    db.add(cat)
    await db.flush()
    return cat


async def list_categories(db: AsyncSession, org_id: int) -> List[TaxonomyCategory]:
    result = await db.execute(
        select(TaxonomyCategory).where(TaxonomyCategory.org_id == org_id).order_by(TaxonomyCategory.name)
    )
    return list(result.scalars().all())


async def get_category(db: AsyncSession, cat_id: int, org_id: int) -> Optional[TaxonomyCategory]:
    result = await db.execute(
        select(TaxonomyCategory).where(TaxonomyCategory.id == cat_id, TaxonomyCategory.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def update_category(db: AsyncSession, cat_id: int, org_id: int, data: TaxonomyCategoryUpdate) -> Optional[TaxonomyCategory]:
    cat = await get_category(db, cat_id, org_id)
    if not cat:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    await db.flush()
    return cat


async def delete_category(db: AsyncSession, cat_id: int, org_id: int) -> bool:
    cat = await get_category(db, cat_id, org_id)
    if not cat:
        return False
    await db.delete(cat)
    await db.flush()
    return True


async def create_tag(db: AsyncSession, data: TaxonomyTagCreate, org_id: int) -> TaxonomyTag:
    tag = TaxonomyTag(
        name=data.name, slug=data.slug, category_id=data.category_id,
        evaluation_rules=data.evaluation_rules, severity=data.severity,
        applicable_modalities=data.applicable_modalities,
        propagate_to_franchise=data.propagate_to_franchise, org_id=org_id,
    )
    db.add(tag)
    await db.flush()
    return tag


async def list_tags(db: AsyncSession, org_id: int, category_id: Optional[int] = None) -> List[TaxonomyTag]:
    q = select(TaxonomyTag).where(TaxonomyTag.org_id == org_id)
    if category_id:
        q = q.where(TaxonomyTag.category_id == category_id)
    result = await db.execute(q.order_by(TaxonomyTag.name))
    return list(result.scalars().all())


async def get_tag(db: AsyncSession, tag_id: int, org_id: int) -> Optional[TaxonomyTag]:
    result = await db.execute(
        select(TaxonomyTag).where(TaxonomyTag.id == tag_id, TaxonomyTag.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def update_tag(db: AsyncSession, tag_id: int, org_id: int, data: TaxonomyTagUpdate) -> Optional[TaxonomyTag]:
    tag = await get_tag(db, tag_id, org_id)
    if not tag:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tag, field, value)
    await db.flush()
    return tag


async def delete_tag(db: AsyncSession, tag_id: int, org_id: int) -> bool:
    tag = await get_tag(db, tag_id, org_id)
    if not tag:
        return False
    await db.delete(tag)
    await db.flush()
    return True


async def get_tags_for_modality(db: AsyncSession, org_id: int, modality: str) -> List[TaxonomyTag]:
    """Get all tags applicable to a specific modality."""
    result = await db.execute(
        select(TaxonomyTag).where(TaxonomyTag.org_id == org_id)
    )
    tags = list(result.scalars().all())
    return [t for t in tags if not t.applicable_modalities or modality in t.applicable_modalities]
