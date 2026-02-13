"""Seed ALL Peppa Pig characters from raw data. Run AFTER seed_peppa.py + seed_enhance.py."""
from __future__ import annotations

import asyncio
import json

from sqlalchemy import select
from app.core.database import engine
from sqlalchemy.ext.asyncio import async_sessionmaker

import app.models.core as models

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

with open("/Users/lakehouse/s220284/eaas/scripts/peppa_characters_raw.json") as f:
    RAW_CHARACTERS = json.load(f)

# Species mapping
SPECIES_MAP = {
    "Pigs": "pig", "Rabbits": "rabbit", "Sheep": "sheep", "Cats": "cat",
    "Dogs": "dog", "Horses": "pony", "Zebras": "zebra", "Elephants": "elephant",
    "Donkeys": "donkey", "Foxes": "fox", "Kangaroos": "kangaroo", "Wolves": "wolf",
    "Gazelles": "gazelle", "Giraffes": "giraffe",
}

# Role classification based on character knowledge
ROLE_INFO = {
    # Extended family
    "Uncle Pig": {"role": "extended_family", "desc": "Peppa's uncle, Daddy Pig's brother. Cheerful and fun-loving."},
    "Auntie Pig": {"role": "extended_family", "desc": "Peppa's aunt, married to Uncle Pig. Kind and welcoming."},
    "Chloé Pig": {"role": "cousin", "desc": "Peppa's older cousin, about 9 years old. Seen as very grown-up by Peppa."},
    "Alexander Pig": {"role": "cousin", "desc": "Peppa's baby cousin, Chloé's brother. Very young, mostly babbles."},
    "Auntie Dottie": {"role": "extended_family", "desc": "A relative of the Pig family. Caring and sweet."},
    "Evie Pig": {"role": "extended_family", "desc": "A member of the Pig family. Friendly and cheerful."},
    "Tooth Fairy": {"role": "fantasy", "desc": "The Tooth Fairy who collects teeth. Magical pig character."},

    # Rabbit family
    "Richard Rabbit": {"role": "toddler", "desc": "Rebecca's little brother, George's best friend. Same age as George."},
    "Daddy Rabbit": {"role": "parent", "desc": "Rebecca and Richard's father. Also known as Mr. Rabbit."},
    "Miss Rabbit": {"role": "adult", "desc": "Works at every job in town — bus driver, ice cream seller, helicopter pilot, and more. Incredibly hardworking."},
    "Mummy Rabbit": {"role": "parent", "desc": "Rebecca and Richard's mother. Miss Rabbit's twin sister."},
    "Grampy Rabbit": {"role": "grandparent", "desc": "The rabbits' grandfather. Lives on a houseboat, loves the sea and telling stories."},
    "Rosie and Robbie Rabbit": {"role": "toddler", "desc": "Twin baby rabbits in the Rabbit family."},
    "Mademoiselle Lapin": {"role": "adult", "desc": "A French rabbit, possibly related to the Rabbit family. Elegant and refined."},

    # Sheep family
    "Mummy Sheep": {"role": "parent", "desc": "Suzy Sheep's mother. Friendly and sociable."},
    "Charlotte Sheep": {"role": "extended_family", "desc": "A relative of Suzy Sheep. Sweet and gentle."},
    "Granny Sheep": {"role": "grandparent", "desc": "Suzy's grandmother. Kind and traditional."},
    "Barry Sheep": {"role": "child", "desc": "A sheep character, also known as Boy Sheep. Energetic and playful."},

    # Cat family
    "Mummy Cat": {"role": "parent", "desc": "Candy Cat's mother. Quiet and artistic."},
    "Daddy Cat": {"role": "parent", "desc": "Candy Cat's father. Calm and creative."},
    "Mrs. Leopard": {"role": "adult", "desc": "A sophisticated leopard/cat character. Elegant and cultured."},

    # Dog family
    "Mummy Dog": {"role": "parent", "desc": "Danny Dog's mother. Supportive and caring."},
    "Granddad Dog": {"role": "grandparent", "desc": "Danny Dog's grandfather. Runs the garage and loves boats. Friends with Grandpa Pig."},
    "Daddy Dog": {"role": "parent", "desc": "Danny Dog's father, also known as Captain Daddy Dog. A sailor."},
    "Granny Dog": {"role": "grandparent", "desc": "Danny Dog's grandmother. Warm and friendly."},
    "Mr. Labrador": {"role": "adult", "desc": "A labrador dog. Professional and helpful."},
    "Mrs Corgi": {"role": "adult", "desc": "A corgi. Proper and organized."},
    "Mr. Coyote": {"role": "adult", "desc": "A coyote character. Adventurous and wild."},

    # Pony/Horse family
    "Penny Pony": {"role": "child", "desc": "A pony character, possibly Pedro's sibling or relative. Playful."},
    "Mummy Pony": {"role": "parent", "desc": "Pedro Pony's mother. Patient and caring."},
    "Mr. Pony": {"role": "parent", "desc": "Pedro Pony's father. An optician/eye doctor."},
    "Mr. Stallion": {"role": "adult", "desc": "A stallion character. Strong and dependable."},

    # Zebra family
    "Mummy Zebra": {"role": "parent", "desc": "Zoë Zebra's mother. The postwoman."},
    "Daddy Zebra": {"role": "parent", "desc": "Zoë Zebra's father. Friendly and hardworking."},
    "Zuzu & Zaza Zebra": {"role": "toddler", "desc": "Zoë's twin younger siblings. Very energetic like their big sister."},
    "Granny Zebra": {"role": "grandparent", "desc": "The Zebra family's grandmother."},
    "Grandpa Zebra": {"role": "grandparent", "desc": "The Zebra family's grandfather."},

    # Elephant family
    "Edmond Elephant": {"role": "toddler", "desc": "Emily's younger cousin. Extremely clever, known for saying 'I'm a clever clogs'. George's friend."},
    "Doctor Elephant": {"role": "adult", "desc": "The local doctor. Professional and reassuring with children."},
    "Mummy Elephant": {"role": "parent", "desc": "Emily Elephant's mother. Well-travelled and cultured."},
    "Granny Elephant": {"role": "grandparent", "desc": "The Elephant family's grandmother."},
    "Granddad Elephant": {"role": "grandparent", "desc": "The Elephant family's grandfather."},

    # Donkey family
    "Monsieur Donkey": {"role": "parent", "desc": "Delphine Donkey's father. French-speaking, polite."},
    "Mrs. Donkey": {"role": "parent", "desc": "Delphine Donkey's mother. Kind and warm."},
    "Didier Donkey": {"role": "toddler", "desc": "Delphine's younger brother. Learning both French and English."},

    # Fox family
    "Daddy Fox": {"role": "parent", "desc": "Freddy Fox's father. Works at night, runs a shop."},
    "Mrs Fox": {"role": "parent", "desc": "Freddy Fox's mother. Friendly and welcoming."},

    # Kangaroo family
    "Kylie Kangaroo": {"role": "child", "desc": "An Australian kangaroo. Sporty, energetic, loves jumping. New to the area."},
    "Joey Kangaroo": {"role": "toddler", "desc": "Kylie's younger brother. Rides in mummy's pouch."},
    "Daddy Kangaroo": {"role": "parent", "desc": "The Kangaroo family father. Australian, laid-back."},
    "Mummy Kangaroo": {"role": "parent", "desc": "The Kangaroo family mother. Carries Joey in her pouch."},

    # Wolf family
    "Mr. Wolf": {"role": "adult", "desc": "A friendly wolf. Despite the fairy tale reputation, very kind and helpful."},
    "Mrs. Wolf": {"role": "adult", "desc": "Mr. Wolf's wife. Friendly and cheerful."},
    "Wendy Wolf": {"role": "child", "desc": "A wolf child, classmate of Peppa. Likes howling at the moon. Friendly despite wolf stereotypes."},
    "Granny Wolf": {"role": "grandparent", "desc": "The Wolf family grandmother. Sweet old lady."},

    # Others
    "Madame Gazelle": {"role": "teacher", "desc": "The children's playgroup teacher. Wise, musical, secretly a rock star in her youth. Everyone loves Madame Gazelle."},
    "Gerald Giraffe": {"role": "child", "desc": "A tall giraffe child. New to the playgroup. Shy at first but friendly. Very tall."},
    "Mummy Giraffe": {"role": "parent", "desc": "Gerald Giraffe's mother. Very tall. Kind and supportive."},
    "Daddy Giraffe": {"role": "parent", "desc": "Gerald Giraffe's father. Very tall. Calm and gentle."},
}

# Color palettes by species
SPECIES_COLORS = {
    "pig": ["Pink"],
    "rabbit": ["Brown", "Orange"],
    "sheep": ["White", "Cream"],
    "cat": ["Grey", "Turquoise"],
    "dog": ["Brown", "Blue"],
    "pony": ["Brown", "Yellow"],
    "zebra": ["Black", "White", "Orange"],
    "elephant": ["Grey", "Purple"],
    "donkey": ["Grey", "Purple"],
    "fox": ["Orange", "Red"],
    "kangaroo": ["Brown", "Yellow"],
    "wolf": ["Grey", "Blue"],
    "gazelle": ["Brown", "Green"],
    "giraffe": ["Yellow", "Brown"],
}

LEGAL_PACK = {
    "rights_holder": {"name": "Entertainment One / Hasbro", "territories": ["Worldwide"]},
    "performer_consent": {
        "type": "AI_VOICE_REFERENCE",
        "performer_name": "Various voice actors",
        "scope": "Character portrayal for educational and entertainment purposes",
        "restrictions": [
            "No impersonation of voice actors",
            "AI disclosure required",
            "Must maintain character integrity",
            "No adult or inappropriate content",
        ],
    },
    "usage_restrictions": {"commercial_use": False, "attribution_required": True, "derivative_works": False},
}

SAFETY_PACK = {
    "content_rating": "G",
    "prohibited_topics": [
        {"topic": "violence", "severity": "strict", "rationale": "Preschool audience"},
        {"topic": "weapons", "severity": "strict", "rationale": "Not age-appropriate"},
        {"topic": "scary_content", "severity": "strict", "rationale": "May frighten young children"},
        {"topic": "adult_themes", "severity": "strict", "rationale": "Preschool content only"},
        {"topic": "profanity", "severity": "strict", "rationale": "Family-friendly content"},
    ],
    "required_disclosures": ["This is an AI-generated character experience"],
    "age_gating": {"enabled": False, "minimum_age": 0, "recommended_age": "2-5 years"},
}


async def seed_all():
    async with SessionLocal() as db:
        # Get org and franchise
        org_result = await db.execute(select(models.Organization).where(models.Organization.id == 1))
        org = org_result.scalar_one()

        franchise_result = await db.execute(select(models.Franchise).where(models.Franchise.slug == "peppa-pig"))
        franchise = franchise_result.scalar_one()

        # Get user
        user_result = await db.execute(select(models.User).limit(1))
        user = user_result.scalar_one_or_none()
        user_id = user.id if user else 1

        # Get existing characters to skip
        existing_result = await db.execute(
            select(models.CharacterCard.name).where(models.CharacterCard.org_id == org.id)
        )
        existing_names = {row[0] for row in existing_result.all()}
        print(f"Existing characters: {len(existing_names)}")

        created = 0
        skipped = 0

        for raw in RAW_CHARACTERS:
            name = raw["name"]
            if name in existing_names:
                skipped += 1
                continue

            section = raw["section"]
            species = SPECIES_MAP.get(section, "unknown")
            info = ROLE_INFO.get(name, {})
            role = info.get("role", "supporting")
            desc = info.get("desc", f"{name} — {species} character from Peppa Pig.")
            slug = name.lower().replace(" ", "-").replace("ë", "e").replace("é", "e").replace("&", "and").replace(".", "").replace(",", "")
            colors = SPECIES_COLORS.get(species, ["Grey"])

            # Determine voice tone based on role
            tone_map = {
                "parent": "warm and caring",
                "grandparent": "gentle and wise",
                "teacher": "encouraging and musical",
                "toddler": "simple and cute",
                "child": "playful and friendly",
                "adult": "professional and helpful",
                "extended_family": "warm and cheerful",
                "cousin": "playful and slightly older",
                "fantasy": "magical and gentle",
            }
            tone = tone_map.get(role, "friendly")

            card = models.CharacterCard(
                name=name,
                slug=slug,
                description=desc,
                org_id=org.id,
                franchise_id=franchise.id,
                status="active",
                is_main=False,
                is_focus=False,
            )
            db.add(card)
            await db.flush()

            canon_pack = {
                "facts": [
                    {"fact_id": "species", "value": species, "source": "Peppa Pig TV Series", "confidence": 1.0},
                    {"fact_id": "name", "value": name, "source": "Peppa Pig TV Series", "confidence": 1.0},
                    {"fact_id": "family_group", "value": section, "source": "Peppa Pig TV Series", "confidence": 1.0},
                    {"fact_id": "role", "value": role, "source": "Peppa Pig TV Series", "confidence": 0.9},
                ],
                "voice": {
                    "personality_traits": ["friendly"],
                    "tone": tone,
                    "speech_style": "simple, age-appropriate",
                    "vocabulary_level": "simple",
                    "catchphrases": [],
                    "emotional_range": f"Generally {tone}",
                },
                "relationships": [],
            }

            visual_pack = {
                "art_style": "2D animated, simple shapes",
                "color_palette": colors,
                "species": species,
                "clothing": "Standard outfit",
                "distinguishing_features": [],
            }

            audio_pack = {
                "tone": tone,
                "speech_style": "simple",
                "catchphrases": [],
                "emotional_range": f"Generally {tone}",
            }

            version = models.CardVersion(
                character_id=card.id,
                version_number=1,
                status="published",
                canon_pack=canon_pack,
                legal_pack=LEGAL_PACK,
                safety_pack=SAFETY_PACK,
                visual_identity_pack=visual_pack,
                audio_identity_pack=audio_pack,
                changelog="Initial version — bulk import from Peppa Pig character database",
                created_by=user_id,
            )
            db.add(version)
            await db.flush()

            card.active_version_id = version.id
            await db.flush()

            created += 1
            print(f"  Created: {name} ({species}, {role})")

        await db.commit()
        print(f"\nDone! Created {created} characters, skipped {skipped} existing.")


if __name__ == "__main__":
    asyncio.run(seed_all())
