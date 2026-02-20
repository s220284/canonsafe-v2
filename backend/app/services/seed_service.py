"""Per-org demo data seeding service."""
from __future__ import annotations

from datetime import datetime
from typing import Dict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    Franchise, CharacterCard, CardVersion, Critic, TestSuite, TestCase,
)


DEMO_CHARACTERS = [
    {"name": "Luna Fox", "slug": "luna-fox", "description": "A clever and curious young fox who loves solving mysteries."},
    {"name": "Captain Stardust", "slug": "captain-stardust", "description": "A brave space explorer with a heart of gold."},
    {"name": "Whiskers McFluff", "slug": "whiskers-mcfluff", "description": "A mischievous cat who always lands on their feet."},
    {"name": "Professor Puzzle", "slug": "professor-puzzle", "description": "A wise owl who teaches through riddles and games."},
    {"name": "Sunny Breeze", "slug": "sunny-breeze", "description": "An optimistic cloud sprite who brings good weather and joy."},
]

DEMO_CANON_PACK = {
    "facts": [{"fact_id": "species", "value": "Demo character", "source": "seed", "confidence": 1.0}],
    "voice": {
        "personality_traits": ["friendly", "curious"],
        "tone": "warm and inviting",
        "speech_style": "conversational",
        "vocabulary_level": "moderate",
        "catchphrases": [{"phrase": "Let's find out!", "frequency": "often"}],
        "emotional_range": "cheerful to thoughtful",
    },
    "relationships": [],
}

DEMO_SAFETY_PACK = {
    "content_rating": "G",
    "prohibited_topics": [{"topic": "violence", "severity": "strict", "rationale": "Family-friendly content"}],
    "required_disclosures": ["This is AI-generated content"],
    "age_gating": {"enabled": False, "minimum_age": 0, "recommended_age": "all ages"},
}


async def seed_org_demo_data(db: AsyncSession, org_id: int, dataset: str = "demo_small") -> Dict:
    """Seed demo data for an organization.

    Datasets:
    - demo_small: 5 generic characters with basic data
    - empty: just a franchise with no characters
    """
    if dataset not in ("demo_small", "empty"):
        raise ValueError(f"Unknown dataset: {dataset}. Use 'demo_small' or 'empty'.")

    # Create franchise
    franchise = Franchise(
        name="Demo Franchise",
        slug=f"demo-franchise-{org_id}",
        description="A demo franchise for testing CanonSafe features.",
        org_id=org_id,
    )
    db.add(franchise)
    await db.flush()

    created_chars = []
    if dataset == "demo_small":
        for char_data in DEMO_CHARACTERS:
            # Check slug uniqueness
            existing = await db.execute(
                select(CharacterCard).where(
                    CharacterCard.slug == char_data["slug"],
                    CharacterCard.org_id == org_id,
                )
            )
            if existing.scalar_one_or_none():
                continue

            char = CharacterCard(
                name=char_data["name"],
                slug=char_data["slug"],
                description=char_data["description"],
                org_id=org_id,
                franchise_id=franchise.id,
                status="active",
            )
            db.add(char)
            await db.flush()

            # Create card version
            version = CardVersion(
                character_id=char.id,
                version_number=1,
                status="published",
                canon_pack=DEMO_CANON_PACK,
                legal_pack={},
                safety_pack=DEMO_SAFETY_PACK,
                visual_identity_pack={},
                audio_identity_pack={},
                changelog="Initial seed data",
            )
            db.add(version)
            await db.flush()

            char.active_version_id = version.id
            created_chars.append(char.name)

        # Create a sample critic
        critic = Critic(
            name="Demo Voice Critic",
            slug=f"demo-voice-critic-{org_id}",
            description="Evaluates voice consistency for demo characters.",
            category="canon",
            modality="text",
            prompt_template="Evaluate if this content matches the character voice of {character_name}:\n\n{content}\n\nCharacter info: {canon_pack}",
            rubric={"0-0.3": "Poor match", "0.3-0.7": "Partial match", "0.7-1.0": "Strong match"},
            default_weight=1.0,
            org_id=org_id,
        )
        db.add(critic)

        # Create a sample test suite
        if created_chars:
            first_char = await db.execute(
                select(CharacterCard).where(
                    CharacterCard.org_id == org_id,
                    CharacterCard.name == created_chars[0],
                )
            )
            char_obj = first_char.scalar_one_or_none()
            if char_obj:
                suite = TestSuite(
                    name="Demo Test Suite",
                    description="Sample test suite for demo characters.",
                    character_id=char_obj.id,
                    tier="base",
                    passing_threshold=0.7,
                    org_id=org_id,
                )
                db.add(suite)
                await db.flush()

                tc = TestCase(
                    suite_id=suite.id,
                    name="Basic greeting test",
                    input_content={"modality": "text", "content": "Hello! How are you today?"},
                    expected_outcome={"min_score": 0.7},
                    tags=["greeting", "basic"],
                )
                db.add(tc)

    await db.flush()

    return {
        "dataset": dataset,
        "franchise_id": franchise.id,
        "characters_created": len(created_chars),
        "character_names": created_chars,
    }
