"""Custom Judge Registry — register, manage, and call custom/fine-tuned judge models."""
from __future__ import annotations

import time
from datetime import datetime
from typing import Optional, List

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import CustomJudge
from app.schemas.judges import JudgeCreate, JudgeUpdate
from app.core.config import settings


# ─── CRUD ──────────────────────────────────────────────────────

async def create_judge(db: AsyncSession, data: JudgeCreate, org_id: int) -> CustomJudge:
    judge = CustomJudge(
        name=data.name,
        slug=data.slug,
        description=data.description,
        model_type=data.model_type,
        endpoint_url=data.endpoint_url,
        model_name=data.model_name,
        api_key_ref=data.api_key_ref,
        default_temperature=data.default_temperature,
        default_max_tokens=data.default_max_tokens,
        capabilities=data.capabilities,
        pricing=data.pricing,
        org_id=org_id,
    )
    db.add(judge)
    await db.flush()
    return judge


async def list_judges(db: AsyncSession, org_id: int) -> List[CustomJudge]:
    result = await db.execute(
        select(CustomJudge)
        .where(CustomJudge.org_id == org_id, CustomJudge.is_active == True)  # noqa: E712
        .order_by(CustomJudge.name)
    )
    return list(result.scalars().all())


async def get_judge(db: AsyncSession, judge_id: int, org_id: int) -> Optional[CustomJudge]:
    result = await db.execute(
        select(CustomJudge).where(
            CustomJudge.id == judge_id,
            CustomJudge.org_id == org_id,
        )
    )
    return result.scalar_one_or_none()


async def update_judge(db: AsyncSession, judge_id: int, org_id: int, data: JudgeUpdate) -> Optional[CustomJudge]:
    judge = await get_judge(db, judge_id, org_id)
    if not judge:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(judge, field, value)
    await db.flush()
    return judge


async def delete_judge(db: AsyncSession, judge_id: int, org_id: int) -> bool:
    """Soft delete — set is_active=False."""
    judge = await get_judge(db, judge_id, org_id)
    if not judge:
        return False
    judge.is_active = False
    await db.flush()
    return True


# ─── Health Check ──────────────────────────────────────────────

async def health_check(db: AsyncSession, judge_id: int, org_id: int) -> Optional[CustomJudge]:
    """Send a lightweight test prompt to the judge endpoint and update health_status."""
    judge = await get_judge(db, judge_id, org_id)
    if not judge:
        return None

    try:
        start = time.time()
        await call_custom_judge(
            judge,
            system_prompt="You are a health check probe. Respond with OK.",
            user_prompt="Health check. Reply with: OK",
        )
        latency = (time.time() - start) * 1000

        if latency > 10000:
            judge.health_status = "degraded"
        else:
            judge.health_status = "healthy"
    except Exception:
        judge.health_status = "down"

    judge.last_health_check = datetime.utcnow()
    await db.flush()
    return judge


# ─── Unified Caller ────────────────────────────────────────────

async def call_custom_judge(
    judge: CustomJudge,
    system_prompt: str,
    user_prompt: str,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> str:
    """Unified caller that dispatches to the correct provider based on model_type."""
    temp = temperature if temperature is not None else judge.default_temperature
    tokens = max_tokens if max_tokens is not None else judge.default_max_tokens

    if judge.model_type == "openai_compatible":
        return await _call_openai_compatible(judge, system_prompt, user_prompt, temp, tokens)
    elif judge.model_type == "anthropic":
        return await _call_anthropic(judge, system_prompt, user_prompt, temp, tokens)
    elif judge.model_type == "huggingface":
        return await _call_huggingface(judge, system_prompt, user_prompt, temp, tokens)
    elif judge.model_type == "custom_endpoint":
        return await _call_custom_endpoint(judge, system_prompt, user_prompt, temp, tokens)
    else:
        raise ValueError(f"Unsupported model_type: {judge.model_type}")


async def _call_openai_compatible(
    judge: CustomJudge,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> str:
    """POST to an OpenAI-compatible endpoint (OpenAI, vLLM, LocalAI, etc.)."""
    endpoint = judge.endpoint_url or "https://api.openai.com/v1/chat/completions"
    api_key = _resolve_api_key(judge)

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body = {
        "model": judge.model_name or "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(endpoint, headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def _call_anthropic(
    judge: CustomJudge,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> str:
    """Call Anthropic Messages API."""
    api_key = _resolve_api_key(judge)
    if not api_key:
        raise ValueError("No API key available for Anthropic judge")

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    body = {
        "model": judge.model_name or "claude-3-haiku-20240307",
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"]


async def _call_huggingface(
    judge: CustomJudge,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> str:
    """POST to HuggingFace Inference API."""
    endpoint = judge.endpoint_url or f"https://api-inference.huggingface.co/models/{judge.model_name}"
    api_key = _resolve_api_key(judge)

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body = {
        "inputs": f"{system_prompt}\n\nUser: {user_prompt}\n\nAssistant:",
        "parameters": {
            "temperature": temperature,
            "max_new_tokens": max_tokens,
            "return_full_text": False,
        },
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(endpoint, headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
        # HF returns a list of generated texts
        if isinstance(data, list) and len(data) > 0:
            return data[0].get("generated_text", str(data[0]))
        return str(data)


async def _call_custom_endpoint(
    judge: CustomJudge,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> str:
    """POST with a generic JSON format to a custom endpoint."""
    if not judge.endpoint_url:
        raise ValueError("custom_endpoint model_type requires endpoint_url")

    api_key = _resolve_api_key(judge)

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body = {
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "model": judge.model_name,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(judge.endpoint_url, headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
        # Try common response shapes
        if isinstance(data, dict):
            for key in ("response", "text", "content", "output", "generated_text"):
                if key in data:
                    return str(data[key])
            # If it has choices (OpenAI-like)
            if "choices" in data:
                return data["choices"][0]["message"]["content"]
        return str(data)


def _resolve_api_key(judge: CustomJudge) -> Optional[str]:
    """Resolve an API key reference to an actual key.

    For now, supports:
    - "env:VARIABLE_NAME" — reads from environment via settings
    - "openai" — uses the platform's OpenAI key
    - "anthropic" — uses the platform's Anthropic key
    - None/empty — no key
    """
    ref = judge.api_key_ref
    if not ref:
        return None

    if ref == "openai":
        return settings.OPENAI_API_KEY
    elif ref == "anthropic":
        return settings.ANTHROPIC_API_KEY
    elif ref.startswith("env:"):
        import os
        return os.environ.get(ref[4:])
    else:
        # Treat as a direct reference name (in production, look up from a vault)
        return None
