"""LLM client abstraction — OpenAI primary, Anthropic fallback, multi-judge support."""
from __future__ import annotations

import asyncio
import json
from typing import Optional, Tuple

import httpx

from app.core.config import settings


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.0,
    max_tokens: int = 2048,
    response_format: Optional[str] = None,
    _return_usage: bool = False,
) -> str:
    """Call LLM with automatic fallback. Returns raw text response.

    If _return_usage is True, returns a tuple (text, usage_dict) instead.
    """
    try:
        return await _call_openai(system_prompt, user_prompt, model, temperature, max_tokens, response_format, _return_usage=_return_usage)
    except Exception:
        if settings.ANTHROPIC_API_KEY:
            return await _call_anthropic(system_prompt, user_prompt, temperature, max_tokens, _return_usage=_return_usage)
        raise


async def _call_openai(
    system_prompt: str,
    user_prompt: str,
    model: Optional[str],
    temperature: float,
    max_tokens: int,
    response_format: Optional[str],
    _return_usage: bool = False,
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
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        if _return_usage:
            usage = data.get("usage", {})
            token_usage = {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "model": model,
            }
            return text, token_usage
        return text


async def _call_anthropic(
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
    _return_usage: bool = False,
) -> str:
    model = "claude-3-haiku-20240307"
    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    body = {
        "model": model,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
        text = data["content"][0]["text"]
        if _return_usage:
            usage = data.get("usage", {})
            token_usage = {
                "prompt_tokens": usage.get("input_tokens", 0),
                "completion_tokens": usage.get("output_tokens", 0),
                "model": model,
            }
            return text, token_usage
        return text


async def call_llm_json(system_prompt: str, user_prompt: str, **kwargs) -> dict:
    """Call LLM and parse JSON response.

    Returns a dict by default. If _return_usage=True is in kwargs,
    returns a tuple (parsed_json, token_usage_dict).
    """
    return_usage = kwargs.pop("_return_usage", False)
    if return_usage:
        raw, token_usage = await call_llm(system_prompt, user_prompt, response_format="json", _return_usage=True, **kwargs)
        return json.loads(raw), token_usage
    raw = await call_llm(system_prompt, user_prompt, response_format="json", **kwargs)
    return json.loads(raw)


async def call_both_llms_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.0,
    max_tokens: int = 2048,
) -> Tuple[dict, dict]:
    """Call BOTH OpenAI and Anthropic in parallel and return both parsed JSON results.

    Returns:
        Tuple of (openai_result, anthropic_result). If one provider fails,
        its result will be {"error": "<message>", "score": 0.0, "reasoning": "...", "flags": ["provider_error"]}.
    """
    error_result = lambda provider, e: {
        "error": f"{provider} error: {str(e)}",
        "score": 0.0,
        "confidence": 0.0,
        "reasoning": f"{provider} call failed: {str(e)}",
        "flags": ["provider_error"],
    }

    async def _openai_json() -> dict:
        try:
            raw = await _call_openai(system_prompt, user_prompt, None, temperature, max_tokens, "json")
            return json.loads(raw)
        except Exception as e:
            return error_result("OpenAI", e)

    async def _anthropic_json() -> dict:
        try:
            raw = await _call_anthropic(system_prompt, user_prompt, temperature, max_tokens)
            return json.loads(raw)
        except Exception as e:
            return error_result("Anthropic", e)

    openai_result, anthropic_result = await asyncio.gather(
        _openai_json(), _anthropic_json()
    )
    return openai_result, anthropic_result
