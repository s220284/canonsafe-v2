"""Critics framework — registry, configuration, dynamic prompt assembly."""
from __future__ import annotations

import asyncio
import json
import time
from typing import Optional, List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import (
    Critic,
    CriticConfiguration,
    EvaluationProfile,
    CardVersion,
)
from app.schemas.critics import CriticCreate, CriticUpdate, CriticConfigCreate, EvaluationProfileCreate
from app.core.llm import call_llm_json


# ─── Critic CRUD ────────────────────────────────────────────────

async def create_critic(db: AsyncSession, data: CriticCreate, org_id: int) -> Critic:
    critic = Critic(
        name=data.name,
        slug=data.slug,
        description=data.description,
        category=data.category,
        modality=data.modality,
        prompt_template=data.prompt_template,
        rubric=data.rubric,
        default_weight=data.default_weight,
        org_id=org_id,
    )
    db.add(critic)
    await db.flush()
    return critic


async def get_critic(db: AsyncSession, critic_id: int) -> Optional[Critic]:
    result = await db.execute(select(Critic).where(Critic.id == critic_id))
    return result.scalar_one_or_none()


async def list_critics(db: AsyncSession, org_id: int) -> List[Critic]:
    result = await db.execute(
        select(Critic).where(
            (Critic.org_id == org_id) | (Critic.org_id.is_(None))
        ).order_by(Critic.name)
    )
    return list(result.scalars().all())


async def update_critic(db: AsyncSession, critic_id: int, data: CriticUpdate) -> Optional[Critic]:
    critic = await get_critic(db, critic_id)
    if not critic:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(critic, field, value)
    await db.flush()
    return critic


# ─── Critic Configuration ──────────────────────────────────────

async def create_config(db: AsyncSession, data: CriticConfigCreate, org_id: int) -> CriticConfiguration:
    config = CriticConfiguration(
        critic_id=data.critic_id,
        org_id=org_id,
        franchise_id=data.franchise_id,
        character_id=data.character_id,
        enabled=data.enabled,
        weight_override=data.weight_override,
        threshold_override=data.threshold_override,
        extra_instructions=data.extra_instructions,
    )
    db.add(config)
    await db.flush()
    return config


async def get_configs_for_character(
    db: AsyncSession, org_id: int, character_id: int, franchise_id: Optional[int] = None
) -> List[CriticConfiguration]:
    """Get merged critic configs: org-level -> franchise-level -> character-level."""
    result = await db.execute(
        select(CriticConfiguration).where(
            CriticConfiguration.org_id == org_id,
            (CriticConfiguration.character_id == character_id)
            | (CriticConfiguration.franchise_id == franchise_id)
            | (
                CriticConfiguration.character_id.is_(None)
                & CriticConfiguration.franchise_id.is_(None)
            ),
        )
    )
    configs = list(result.scalars().all())
    # Character-level overrides franchise-level overrides org-level
    merged = {}
    for c in configs:
        key = c.critic_id
        existing = merged.get(key)
        if existing is None:
            merged[key] = c
        elif c.character_id is not None:
            merged[key] = c  # character-level wins
        elif c.franchise_id is not None and existing.character_id is None:
            merged[key] = c  # franchise-level wins over org-level
    return list(merged.values())


# ─── Evaluation Profiles ───────────────────────────────────────

async def create_profile(db: AsyncSession, data: EvaluationProfileCreate, org_id: int) -> EvaluationProfile:
    profile = EvaluationProfile(
        name=data.name,
        slug=data.slug,
        description=data.description,
        org_id=org_id,
        critic_config_ids=data.critic_config_ids,
        sampling_rate=data.sampling_rate,
        tiered_evaluation=data.tiered_evaluation,
        rapid_screen_critics=data.rapid_screen_critics,
        deep_eval_critics=data.deep_eval_critics,
    )
    db.add(profile)
    await db.flush()
    return profile


async def get_profile(db: AsyncSession, profile_id: int) -> Optional[EvaluationProfile]:
    result = await db.execute(select(EvaluationProfile).where(EvaluationProfile.id == profile_id))
    return result.scalar_one_or_none()


async def list_profiles(db: AsyncSession, org_id: int) -> List[EvaluationProfile]:
    result = await db.execute(
        select(EvaluationProfile).where(EvaluationProfile.org_id == org_id).order_by(EvaluationProfile.name)
    )
    return list(result.scalars().all())


# ─── Dynamic Prompt Assembly ───────────────────────────────────

def assemble_prompt(template: str, card_version: CardVersion, content: str, extra_instructions: str = "") -> str:
    """Populate {placeholder} variables from character card packs."""
    canon = card_version.canon_pack or {}
    variables = {
        "character_name": canon.get("name", "") if isinstance(canon, dict) else "",
        "franchise_name": "",
        "canon_pack": json.dumps(canon, indent=2),
        "canon_facts": json.dumps(canon.get("facts", []) if isinstance(canon, dict) else [], indent=2),
        "voice_profile": json.dumps(canon.get("voice", {}) if isinstance(canon, dict) else {}, indent=2),
        "relationships": json.dumps(canon.get("relationships", []) if isinstance(canon, dict) else [], indent=2),
        "legal_pack": json.dumps(card_version.legal_pack or {}, indent=2),
        "safety_pack": json.dumps(card_version.safety_pack or {}, indent=2),
        "visual_identity_pack": json.dumps(card_version.visual_identity_pack or {}, indent=2),
        "audio_identity_pack": json.dumps(card_version.audio_identity_pack or {}, indent=2),
        "content": content,
        "extra_instructions": extra_instructions,
    }

    # Try to resolve franchise name from character relationship
    try:
        from app.models.core import CharacterCard
        if hasattr(card_version, 'character') and card_version.character:
            if hasattr(card_version.character, 'franchise') and card_version.character.franchise:
                variables["franchise_name"] = card_version.character.franchise.name
    except Exception:
        pass

    result = template
    for key, value in variables.items():
        result = result.replace(f"{{{key}}}", str(value))
    return result


# ─── Parallel Critic Dispatch ──────────────────────────────────

async def run_critic(
    critic: Critic,
    card_version: CardVersion,
    content: str,
    extra_instructions: str = "",
) -> dict:
    """Run a single critic against content. Returns score, reasoning, flags."""
    system_prompt = assemble_prompt(
        critic.prompt_template, card_version, content, extra_instructions
    )
    user_prompt = f"""Evaluate the following content for character fidelity.

Content to evaluate:
{content}

Respond with JSON:
{{"score": <float 0-1>, "reasoning": "<explanation>", "flags": [<list of issues>]}}"""

    start = time.monotonic()
    try:
        result = await call_llm_json(system_prompt, user_prompt)
        latency = int((time.monotonic() - start) * 1000)
        return {
            "score": float(result.get("score", 0)),
            "reasoning": result.get("reasoning", ""),
            "flags": result.get("flags", []),
            "latency_ms": latency,
        }
    except Exception as e:
        latency = int((time.monotonic() - start) * 1000)
        return {
            "score": 0.0,
            "reasoning": f"Critic error: {str(e)}",
            "flags": ["critic_error"],
            "latency_ms": latency,
        }


async def run_critics_parallel(
    critics_with_config: List[Tuple[Critic, Optional[CriticConfiguration]]],
    card_version: CardVersion,
    content: str,
) -> List[dict]:
    """Run multiple critics in parallel and return results."""
    tasks = []
    for critic, config in critics_with_config:
        extra = config.extra_instructions if config and config.extra_instructions else ""
        tasks.append(run_critic(critic, card_version, content, extra))

    results = await asyncio.gather(*tasks)

    # Attach critic metadata to results
    enriched = []
    for (critic, config), result in zip(critics_with_config, results):
        weight = (config.weight_override if config and config.weight_override else critic.default_weight)
        enriched.append({
            "critic_id": critic.id,
            "critic_name": critic.name,
            "weight": weight,
            **result,
        })
    return enriched
