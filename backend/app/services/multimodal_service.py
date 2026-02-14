"""Multi-Modal Evaluation Service — image, audio, video content analysis."""
from __future__ import annotations

import json
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.llm import call_llm_json
from app.services import character_service


# ─── Modality-Specific Prompts ─────────────────────────────────

def get_modality_prompt(modality: str, card_version) -> str:
    """Return a modality-specific system prompt referencing the correct packs."""
    canon = json.dumps(card_version.canon_pack, indent=2) if card_version.canon_pack else "{}"
    safety = json.dumps(card_version.safety_pack, indent=2) if card_version.safety_pack else "{}"
    visual = json.dumps(card_version.visual_identity_pack, indent=2) if card_version.visual_identity_pack else "{}"
    audio = json.dumps(card_version.audio_identity_pack, indent=2) if card_version.audio_identity_pack else "{}"

    base = (
        "You are a character IP fidelity evaluator for CanonSafe. "
        "Evaluate the provided content against the character's official packs. "
        "Return a JSON object with these fields:\n"
        '  "score": float 0.0-1.0 (1.0 = perfect fidelity),\n'
        '  "decision": "pass" | "fail" | "review",\n'
        '  "feedback": string with detailed analysis,\n'
        '  "pack_compliance": {pack_name: {"score": float, "notes": string}},\n'
        '  "flags": list of string flags for violations found\n\n'
        "Score thresholds: >= 0.8 = pass, 0.5-0.8 = review, < 0.5 = fail.\n\n"
    )

    if modality == "text":
        return (
            base
            + f"== CANON PACK ==\n{canon}\n\n"
            + f"== SAFETY PACK ==\n{safety}\n\n"
            + "Evaluate the text content for character voice consistency, personality accuracy, "
            + "backstory compliance, and safety guideline adherence."
        )
    elif modality == "image":
        return (
            base
            + f"== VISUAL IDENTITY PACK ==\n{visual}\n\n"
            + f"== CANON PACK ==\n{canon}\n\n"
            + f"== SAFETY PACK ==\n{safety}\n\n"
            + "Evaluate the image for visual identity compliance (appearance, colors, style), "
            + "canon consistency, and safety guideline adherence."
        )
    elif modality == "audio":
        return (
            base
            + f"== AUDIO IDENTITY PACK ==\n{audio}\n\n"
            + f"== CANON PACK ==\n{canon}\n\n"
            + f"== SAFETY PACK ==\n{safety}\n\n"
            + "Evaluate the audio content description for voice consistency, tone accuracy, "
            + "sound design fidelity, canon compliance, and safety guideline adherence."
        )
    elif modality == "video":
        return (
            base
            + f"== VISUAL IDENTITY PACK ==\n{visual}\n\n"
            + f"== AUDIO IDENTITY PACK ==\n{audio}\n\n"
            + f"== CANON PACK ==\n{canon}\n\n"
            + f"== SAFETY PACK ==\n{safety}\n\n"
            + "Evaluate the video content description for visual identity compliance, "
            + "audio/voice fidelity, canon consistency, and safety guideline adherence."
        )
    else:
        return base + f"== CANON PACK ==\n{canon}\n\n== SAFETY PACK ==\n{safety}"


def _packs_for_modality(modality: str) -> list:
    """Return the list of pack names checked for a given modality."""
    mapping = {
        "text": ["canon_pack", "safety_pack"],
        "image": ["visual_identity_pack", "canon_pack", "safety_pack"],
        "audio": ["audio_identity_pack", "canon_pack", "safety_pack"],
        "video": ["visual_identity_pack", "audio_identity_pack", "canon_pack", "safety_pack"],
    }
    return mapping.get(modality, ["canon_pack", "safety_pack"])


# ─── Image Analysis ────────────────────────────────────────────

async def analyze_image(
    db: AsyncSession,
    image_url: Optional[str],
    image_base64: Optional[str],
    character_id: int,
    org_id: int,
    card_version_id: Optional[int] = None,
) -> dict:
    """Analyze an image for character fidelity using GPT-4o-mini vision."""
    # Load character and card version
    character = await character_service.get_character(db, character_id, org_id)
    if not character:
        return {"error": "Character not found"}

    if card_version_id:
        card_version = await character_service.get_version(db, card_version_id)
    else:
        card_version = await character_service.get_active_version(db, character_id, org_id)

    if not card_version:
        return {"error": "No card version found. Publish a version first."}

    system_prompt = get_modality_prompt("image", card_version)

    # Build the vision message content
    content_parts = [
        {"type": "text", "text": "Analyze this image for character IP fidelity compliance."},
    ]

    if image_url:
        content_parts.append({
            "type": "image_url",
            "image_url": {"url": image_url},
        })
    elif image_base64:
        content_parts.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{image_base64}"},
        })
    else:
        return {"error": "Provide either image_url or image_base64"}

    # Call GPT-4o-mini with vision directly (bypasses call_llm since we need multipart content)
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content_parts},
        ],
        "temperature": 0.0,
        "max_tokens": 2048,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            result = json.loads(data["choices"][0]["message"]["content"])
    except Exception as e:
        return {
            "error": f"Vision analysis failed: {str(e)}",
            "score": 0.0,
            "decision": "fail",
            "feedback": f"Could not analyze image: {str(e)}",
            "flags": ["analysis_error"],
        }

    return {
        "modality": "image",
        "score": result.get("score", 0.0),
        "decision": result.get("decision", "review"),
        "feedback": result.get("feedback", ""),
        "packs_checked": _packs_for_modality("image"),
        "pack_compliance": result.get("pack_compliance", {}),
        "flags": result.get("flags", []),
        "character_name": character.name,
    }


# ─── Audio Analysis ────────────────────────────────────────────

async def analyze_audio_description(
    db: AsyncSession,
    audio_description: str,
    character_id: int,
    org_id: int,
    card_version_id: Optional[int] = None,
) -> dict:
    """Analyze an audio content description for character fidelity."""
    character = await character_service.get_character(db, character_id, org_id)
    if not character:
        return {"error": "Character not found"}

    if card_version_id:
        card_version = await character_service.get_version(db, card_version_id)
    else:
        card_version = await character_service.get_active_version(db, character_id, org_id)

    if not card_version:
        return {"error": "No card version found. Publish a version first."}

    system_prompt = get_modality_prompt("audio", card_version)
    user_prompt = (
        "Analyze the following audio content description for character IP fidelity:\n\n"
        f"{audio_description}"
    )

    try:
        result = await call_llm_json(system_prompt, user_prompt)
    except Exception as e:
        return {
            "error": f"Audio analysis failed: {str(e)}",
            "score": 0.0,
            "decision": "fail",
            "feedback": f"Could not analyze audio description: {str(e)}",
            "flags": ["analysis_error"],
        }

    return {
        "modality": "audio",
        "score": result.get("score", 0.0),
        "decision": result.get("decision", "review"),
        "feedback": result.get("feedback", ""),
        "packs_checked": _packs_for_modality("audio"),
        "pack_compliance": result.get("pack_compliance", {}),
        "flags": result.get("flags", []),
        "character_name": character.name,
    }


# ─── Video Analysis ────────────────────────────────────────────

async def analyze_video_description(
    db: AsyncSession,
    video_description: str,
    character_id: int,
    org_id: int,
    card_version_id: Optional[int] = None,
) -> dict:
    """Analyze a video content description for character fidelity."""
    character = await character_service.get_character(db, character_id, org_id)
    if not character:
        return {"error": "Character not found"}

    if card_version_id:
        card_version = await character_service.get_version(db, card_version_id)
    else:
        card_version = await character_service.get_active_version(db, character_id, org_id)

    if not card_version:
        return {"error": "No card version found. Publish a version first."}

    system_prompt = get_modality_prompt("video", card_version)
    user_prompt = (
        "Analyze the following video content description for character IP fidelity:\n\n"
        f"{video_description}"
    )

    try:
        result = await call_llm_json(system_prompt, user_prompt)
    except Exception as e:
        return {
            "error": f"Video analysis failed: {str(e)}",
            "score": 0.0,
            "decision": "fail",
            "feedback": f"Could not analyze video description: {str(e)}",
            "flags": ["analysis_error"],
        }

    return {
        "modality": "video",
        "score": result.get("score", 0.0),
        "decision": result.get("decision", "review"),
        "feedback": result.get("feedback", ""),
        "packs_checked": _packs_for_modality("video"),
        "pack_compliance": result.get("pack_compliance", {}),
        "flags": result.get("flags", []),
        "character_name": character.name,
    }


# ─── Capabilities ──────────────────────────────────────────────

def get_capabilities() -> dict:
    """Return supported modalities and their requirements."""
    return {
        "supported_modalities": [
            {
                "modality": "image",
                "input_types": ["url", "base64"],
                "packs_used": ["visual_identity_pack", "canon_pack", "safety_pack"],
                "description": "Analyze images for visual identity compliance using GPT-4o-mini vision.",
            },
            {
                "modality": "audio",
                "input_types": ["text_description"],
                "packs_used": ["audio_identity_pack", "canon_pack", "safety_pack"],
                "description": "Analyze audio content via text description for voice/sound fidelity.",
            },
            {
                "modality": "video",
                "input_types": ["text_description"],
                "packs_used": ["visual_identity_pack", "audio_identity_pack", "canon_pack", "safety_pack"],
                "description": "Analyze video content via text description for full multi-modal fidelity.",
            },
        ],
    }
