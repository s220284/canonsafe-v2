"""Performer consent verification service — hard gate for content evaluation."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import ConsentVerification
from app.schemas.consent import ConsentCreate


async def create_consent(db: AsyncSession, data: ConsentCreate, org_id: int) -> ConsentVerification:
    consent = ConsentVerification(
        character_id=data.character_id,
        performer_name=data.performer_name,
        consent_type=data.consent_type,
        territories=data.territories,
        modalities=data.modalities,
        usage_restrictions=data.usage_restrictions,
        valid_from=data.valid_from,
        valid_until=data.valid_until,
        strike_clause=data.strike_clause,
        document_ref=data.document_ref,
        org_id=org_id,
    )
    db.add(consent)
    await db.flush()
    return consent


async def list_consents(db: AsyncSession, org_id: int, character_id: Optional[int] = None) -> List[ConsentVerification]:
    q = select(ConsentVerification).where(ConsentVerification.org_id == org_id)
    if character_id:
        q = q.where(ConsentVerification.character_id == character_id)
    result = await db.execute(q)
    return list(result.scalars().all())


async def check_consent(
    db: AsyncSession,
    character_id: int,
    modality: str,
    org_id: int,
    territory: Optional[str] = None,
    usage_type: Optional[str] = None,
) -> Tuple[bool, List[str]]:
    """
    Check all consent records for a character. Returns (approved, reasons).
    This is a HARD GATE — if any check fails, content is blocked.
    """
    now = datetime.utcnow()
    result = await db.execute(
        select(ConsentVerification).where(
            ConsentVerification.character_id == character_id,
            ConsentVerification.org_id == org_id,
        )
    )
    consents = list(result.scalars().all())

    # If no consent records exist, allow (no performer consent required)
    if not consents:
        return True, []

    reasons = []
    has_valid_consent = False

    for consent in consents:
        # Check temporal validity
        if consent.valid_from > now:
            continue  # not yet active
        if consent.valid_until and consent.valid_until < now:
            reasons.append(f"Consent from {consent.performer_name} expired on {consent.valid_until.isoformat()}")
            continue

        # Check strike clause
        if consent.strike_clause and consent.strike_active:
            reasons.append(f"Strike active for performer {consent.performer_name}")
            continue

        # Check modality scope
        if consent.modalities and modality not in consent.modalities:
            reasons.append(f"Modality '{modality}' not covered by consent from {consent.performer_name}")
            continue

        # Check territory scope
        if territory and consent.territories and territory not in consent.territories:
            reasons.append(f"Territory '{territory}' not covered by consent from {consent.performer_name}")
            continue

        # Check usage restrictions
        if usage_type and consent.usage_restrictions and usage_type in consent.usage_restrictions:
            reasons.append(f"Usage type '{usage_type}' restricted by consent from {consent.performer_name}")
            continue

        has_valid_consent = True

    if not has_valid_consent:
        if not reasons:
            reasons.append("No valid consent found for this character/modality combination")
        return False, reasons

    return True, []


async def activate_strike(db: AsyncSession, consent_id: int, org_id: int) -> Optional[ConsentVerification]:
    result = await db.execute(
        select(ConsentVerification).where(
            ConsentVerification.id == consent_id,
            ConsentVerification.org_id == org_id,
        )
    )
    consent = result.scalar_one_or_none()
    if consent:
        consent.strike_active = True
        await db.flush()
    return consent
