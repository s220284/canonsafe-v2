from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class JudgeCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    model_type: str  # "openai_compatible", "anthropic", "huggingface", "custom_endpoint"
    endpoint_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key_ref: Optional[str] = None
    default_temperature: float = 0.0
    default_max_tokens: int = 2048
    capabilities: List[str] = []
    pricing: dict = {}


class JudgeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    model_type: Optional[str] = None
    endpoint_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key_ref: Optional[str] = None
    default_temperature: Optional[float] = None
    default_max_tokens: Optional[int] = None
    capabilities: Optional[List[str]] = None
    pricing: Optional[dict] = None
    is_active: Optional[bool] = None


class JudgeOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    model_type: str
    endpoint_url: Optional[str]
    model_name: Optional[str]
    api_key_ref: Optional[str]
    default_temperature: float
    default_max_tokens: int
    capabilities: list
    pricing: dict
    is_active: bool
    health_status: str
    last_health_check: Optional[datetime]
    org_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class JudgeTestRequest(BaseModel):
    system_prompt: str = "You are a helpful assistant."
    user_prompt: str = "Say hello."
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class JudgeTestResponse(BaseModel):
    success: bool
    response_text: Optional[str] = None
    error: Optional[str] = None
    latency_ms: Optional[int] = None
