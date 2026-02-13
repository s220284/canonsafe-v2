"""LLM client abstraction — OpenAI primary, Anthropic fallback."""
from __future__ import annotations

import json
from typing import Optional

import httpx

from app.core.config import settings


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.0,
    max_tokens: int = 2048,
    response_format: Optional[str] = None,
) -> str:
    """Call LLM with automatic fallback. Returns raw text response."""
    try:
        return await _call_openai(system_prompt, user_prompt, model, temperature, max_tokens, response_format)
    except Exception:
        if settings.ANTHROPIC_API_KEY:
            return await _call_anthropic(system_prompt, user_prompt, temperature, max_tokens)
        raise


async def _call_openai(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str],
    temperature: float,
    max_tokens: int,
    response_format: Optional[str],
) -> str:
    model = model or "gpt-4o-mini"
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format == "json":
        body["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def _call_anthropic(
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> str:
    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    body = {
        "model": "claude-3-haiku-20240307",
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]


async def call_llm_json(system_prompt: str, user_prompt: str, **kwargs) -> dict:
    """Call LLM and parse JSON response."""
    raw = await call_llm(system_prompt, user_prompt, response_format="json", **kwargs)
    return json.loads(raw)
