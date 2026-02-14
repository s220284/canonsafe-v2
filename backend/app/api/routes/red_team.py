"""Red-teaming / adversarial probing routes."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_editor
from app.models.core import User, RedTeamSession, CharacterCard
from app.services import red_team_service

router = APIRouter()


class RedTeamSessionCreate(BaseModel):
    character_id: int
    name: str
    attack_categories: List[str] = [
        "persona_break",
        "knowledge_probe",
        "safety_bypass",
        "boundary_test",
        "context_manipulation",
    ]
    probes_per_category: int = 5


# ─── Create Session ──────────────────────────────────────────

@router.post("")
async def create_session(
    body: RedTeamSessionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Create a new red team session."""
    # Validate character exists
    from sqlalchemy import select
    char_result = await db.execute(
        select(CharacterCard).where(
            CharacterCard.id == body.character_id,
            CharacterCard.org_id == user.org_id,
        )
    )
    character = char_result.scalar_one_or_none()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    # Validate categories
    valid_categories = {"persona_break", "knowledge_probe", "safety_bypass", "boundary_test", "context_manipulation"}
    for cat in body.attack_categories:
        if cat not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid attack category: {cat}")

    session = RedTeamSession(
        name=body.name,
        character_id=body.character_id,
        attack_categories=body.attack_categories,
        probes_per_category=body.probes_per_category,
        org_id=user.org_id,
    )
    db.add(session)
    await db.flush()

    return _session_to_dict(session, character.name)


# ─── List Sessions ───────────────────────────────────────────

@router.get("")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all red team sessions."""
    sessions = await red_team_service.list_sessions(db, user.org_id)

    # Build character name map
    from sqlalchemy import select
    char_result = await db.execute(
        select(CharacterCard).where(CharacterCard.org_id == user.org_id)
    )
    char_map = {c.id: c.name for c in char_result.scalars().all()}

    return [
        _session_to_dict(s, char_map.get(s.character_id, f"Character #{s.character_id}"))
        for s in sessions
    ]


# ─── Get Session ─────────────────────────────────────────────

@router.get("/{session_id}")
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a red team session with full results."""
    session = await red_team_service.get_session(db, session_id, user.org_id)
    if not session:
        raise HTTPException(status_code=404, detail="Red team session not found")

    # Get character name
    from sqlalchemy import select
    char_result = await db.execute(
        select(CharacterCard).where(CharacterCard.id == session.character_id)
    )
    character = char_result.scalar_one_or_none()
    char_name = character.name if character else f"Character #{session.character_id}"

    return _session_to_dict(session, char_name)


# ─── Run Session ─────────────────────────────────────────────

@router.post("/{session_id}/run")
async def run_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Execute a red team session — generates adversarial prompts and evaluates them."""
    session = await red_team_service.get_session(db, session_id, user.org_id)
    if not session:
        raise HTTPException(status_code=404, detail="Red team session not found")

    if session.status == "running":
        raise HTTPException(status_code=400, detail="Session is already running")

    try:
        session = await red_team_service.run_red_team_session(db, session_id, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Get character name
    from sqlalchemy import select
    char_result = await db.execute(
        select(CharacterCard).where(CharacterCard.id == session.character_id)
    )
    character = char_result.scalar_one_or_none()
    char_name = character.name if character else f"Character #{session.character_id}"

    return _session_to_dict(session, char_name)


def _session_to_dict(session: RedTeamSession, character_name: str) -> dict:
    """Convert a RedTeamSession to a dict for API response."""
    return {
        "id": session.id,
        "name": session.name,
        "character_id": session.character_id,
        "character_name": character_name,
        "attack_categories": session.attack_categories or [],
        "status": session.status,
        "total_probes": session.total_probes,
        "successful_attacks": session.successful_attacks,
        "resilience_score": session.resilience_score,
        "probes_per_category": session.probes_per_category,
        "results": session.results or [],
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
    }
