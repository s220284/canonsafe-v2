from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, Union, List


class APMEvalRequest(BaseModel):
    """SDK-style evaluate request for agentic pipeline middleware."""
    character_id: int
    content: Union[str, dict]
    modality: str = "text"
    agent_id: Optional[str] = None
    profile_id: Optional[int] = None
    territory: Optional[str] = None
    enforce: bool = True  # if True, returns enforcement decision


class APMEvalResponse(BaseModel):
    eval_run_id: int
    score: Optional[float]
    decision: str  # pass, regenerate, quarantine, escalate, block
    flags: List[str] = []
    consent_verified: bool = True
    sampled: bool = False
    details: dict = {}


class APMEnforceRequest(BaseModel):
    eval_run_id: int
    action: str  # regenerate, quarantine, escalate, block, override


class APMEnforceResponse(BaseModel):
    eval_run_id: int
    action_taken: str
    success: bool
    message: str = ""
