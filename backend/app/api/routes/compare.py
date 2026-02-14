"""Pairwise Comparison Mode — compare two eval runs, head-to-head characters, or card versions."""
from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.rbac import require_editor
from app.core.database import get_db
from app.models.core import User, EvalRun, EvalResult, CriticResult, Critic, CardVersion
from app.schemas.evaluations import EvalRequest, EvalRunOut, EvalResultOut, EvalResponse
from app.services import evaluation_service, character_service

router = APIRouter()

# Lightweight JSON log for comparison history
COMPARE_LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "compare_history.json")


# ─── Request Schemas ─────────────────────────────────────────────

class CompareRunsRequest(BaseModel):
    run_id_a: int
    run_id_b: int


class HeadToHeadRequest(BaseModel):
    content: str
    modality: str = "text"
    character_id_a: int
    character_id_b: int


class CompareVersionsRequest(BaseModel):
    character_id: int
    version_a: int
    version_b: int
    content: str
    modality: str = "text"


# ─── Helpers ─────────────────────────────────────────────────────

async def _build_critic_map(db: AsyncSession) -> dict:
    """Build a mapping from critic id (int and str) to critic name."""
    result = await db.execute(select(Critic))
    critics = list(result.scalars().all())
    cmap = {}
    for c in critics:
        cmap[c.id] = c.name
        cmap[str(c.id)] = c.name
    return cmap


async def _load_run_and_result(db: AsyncSession, run_id: int, org_id: int):
    """Load an eval run and its result with critic results."""
    run = await evaluation_service.get_eval_run(db, run_id, org_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Eval run {run_id} not found")

    result = await evaluation_service.get_eval_result(db, run_id)
    result_out = None
    if result:
        cr_result = await db.execute(
            select(CriticResult).where(CriticResult.eval_result_id == result.id)
        )
        critic_results = list(cr_result.scalars().all())
        result_out = EvalResultOut(
            id=result.id,
            eval_run_id=result.eval_run_id,
            weighted_score=result.weighted_score,
            critic_scores=result.critic_scores,
            flags=result.flags,
            recommendations=result.recommendations,
            critic_results=critic_results,
        )

    return run, result, result_out


def compute_comparison(run_a, result_a, run_b, result_b, critic_map):
    """Compute structured comparison between two eval results."""
    score_diff = (run_a.overall_score or 0) - (run_b.overall_score or 0)

    # Per-critic comparison
    critic_diffs = []
    scores_a = (result_a.critic_scores or {}) if result_a else {}
    scores_b = (result_b.critic_scores or {}) if result_b else {}
    all_critics = set(list(scores_a.keys()) + list(scores_b.keys()))
    for cid in all_critics:
        score_a = scores_a.get(cid, None)
        score_b = scores_b.get(cid, None)
        # Try to look up the critic name
        critic_name = critic_map.get(cid, None)
        if critic_name is None and isinstance(cid, str) and cid.isdigit():
            critic_name = critic_map.get(int(cid), None)
        if critic_name is None:
            critic_name = f"Critic {cid}"

        critic_diffs.append({
            "critic_id": cid,
            "critic_name": critic_name,
            "score_a": score_a,
            "score_b": score_b,
            "diff": round((score_a or 0) - (score_b or 0), 4) if score_a is not None and score_b is not None else None,
        })

    # Flags comparison
    flags_a = set(result_a.flags or []) if result_a else set()
    flags_b = set(result_b.flags or []) if result_b else set()

    return {
        "score_diff": round(score_diff, 4),
        "decision_a": run_a.decision,
        "decision_b": run_b.decision,
        "decisions_match": run_a.decision == run_b.decision,
        "critic_diffs": critic_diffs,
        "flags_only_a": list(flags_a - flags_b),
        "flags_only_b": list(flags_b - flags_a),
        "flags_common": list(flags_a & flags_b),
    }


def _append_history(entry: dict):
    """Append a comparison entry to the lightweight JSON log."""
    try:
        if os.path.exists(COMPARE_LOG_PATH):
            with open(COMPARE_LOG_PATH, "r") as f:
                history = json.load(f)
        else:
            history = []
        history.append(entry)
        # Keep only most recent 200 entries
        history = history[-200:]
        with open(COMPARE_LOG_PATH, "w") as f:
            json.dump(history, f, default=str)
    except Exception:
        pass  # Best-effort logging


# ─── Routes ──────────────────────────────────────────────────────

@router.post("/runs")
async def compare_runs(
    data: CompareRunsRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Compare two eval runs side-by-side."""
    run_a, result_a, result_out_a = await _load_run_and_result(db, data.run_id_a, user.org_id)
    run_b, result_b, result_out_b = await _load_run_and_result(db, data.run_id_b, user.org_id)

    critic_map = await _build_critic_map(db)
    comparison = compute_comparison(run_a, result_a, run_b, result_b, critic_map)

    response = {
        "mode": "runs",
        "side_a": {
            "eval_run": EvalRunOut.model_validate(run_a).model_dump(),
            "result": result_out_a.model_dump() if result_out_a else None,
        },
        "side_b": {
            "eval_run": EvalRunOut.model_validate(run_b).model_dump(),
            "result": result_out_b.model_dump() if result_out_b else None,
        },
        "comparison": comparison,
    }

    _append_history({
        "mode": "runs",
        "run_id_a": data.run_id_a,
        "run_id_b": data.run_id_b,
        "score_diff": comparison["score_diff"],
        "decisions_match": comparison["decisions_match"],
        "created_at": datetime.utcnow().isoformat(),
        "user_id": user.id,
        "org_id": user.org_id,
    })

    return response


@router.post("/head-to-head")
async def head_to_head(
    data: HeadToHeadRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Evaluate same content against two characters and compare results."""
    # Validate both characters exist
    char_a = await character_service.get_character(db, data.character_id_a, user.org_id)
    if not char_a:
        raise HTTPException(status_code=404, detail=f"Character {data.character_id_a} not found")
    char_b = await character_service.get_character(db, data.character_id_b, user.org_id)
    if not char_b:
        raise HTTPException(status_code=404, detail=f"Character {data.character_id_b} not found")

    # Run evaluation for character A
    req_a = EvalRequest(
        character_id=data.character_id_a,
        content=data.content,
        modality=data.modality,
    )
    try:
        eval_run_a = await evaluation_service.evaluate(db, req_a, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Evaluation failed for character A: {str(e)}")

    # Run evaluation for character B
    req_b = EvalRequest(
        character_id=data.character_id_b,
        content=data.content,
        modality=data.modality,
    )
    try:
        eval_run_b = await evaluation_service.evaluate(db, req_b, user.org_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Evaluation failed for character B: {str(e)}")

    await db.commit()

    # Load full results
    _, result_a, result_out_a = await _load_run_and_result(db, eval_run_a.id, user.org_id)
    _, result_b, result_out_b = await _load_run_and_result(db, eval_run_b.id, user.org_id)

    critic_map = await _build_critic_map(db)
    comparison = compute_comparison(eval_run_a, result_a, eval_run_b, result_b, critic_map)

    response = {
        "mode": "head_to_head",
        "content": data.content,
        "modality": data.modality,
        "character_a": {"id": char_a.id, "name": char_a.name},
        "character_b": {"id": char_b.id, "name": char_b.name},
        "side_a": {
            "eval_run": EvalRunOut.model_validate(eval_run_a).model_dump(),
            "result": result_out_a.model_dump() if result_out_a else None,
        },
        "side_b": {
            "eval_run": EvalRunOut.model_validate(eval_run_b).model_dump(),
            "result": result_out_b.model_dump() if result_out_b else None,
        },
        "comparison": comparison,
    }

    _append_history({
        "mode": "head_to_head",
        "character_id_a": data.character_id_a,
        "character_id_b": data.character_id_b,
        "character_name_a": char_a.name,
        "character_name_b": char_b.name,
        "run_id_a": eval_run_a.id,
        "run_id_b": eval_run_b.id,
        "score_diff": comparison["score_diff"],
        "decisions_match": comparison["decisions_match"],
        "created_at": datetime.utcnow().isoformat(),
        "user_id": user.id,
        "org_id": user.org_id,
    })

    return response


@router.post("/versions")
async def compare_versions(
    data: CompareVersionsRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Compare eval results across two card versions for the same character."""
    # Validate character exists
    character = await character_service.get_character(db, data.character_id, user.org_id)
    if not character:
        raise HTTPException(status_code=404, detail=f"Character {data.character_id} not found")

    # Validate both versions exist
    ver_a_result = await db.execute(
        select(CardVersion).where(
            CardVersion.character_id == data.character_id,
            CardVersion.version_number == data.version_a,
        )
    )
    ver_a = ver_a_result.scalar_one_or_none()
    if not ver_a:
        raise HTTPException(status_code=404, detail=f"Version {data.version_a} not found for character {data.character_id}")

    ver_b_result = await db.execute(
        select(CardVersion).where(
            CardVersion.character_id == data.character_id,
            CardVersion.version_number == data.version_b,
        )
    )
    ver_b = ver_b_result.scalar_one_or_none()
    if not ver_b:
        raise HTTPException(status_code=404, detail=f"Version {data.version_b} not found for character {data.character_id}")

    # Temporarily set active version to A, evaluate, then B, evaluate
    original_active = character.active_version_id

    # Evaluate with version A
    character.active_version_id = ver_a.id
    await db.flush()
    req_a = EvalRequest(
        character_id=data.character_id,
        content=data.content,
        modality=data.modality,
    )
    try:
        eval_run_a = await evaluation_service.evaluate(db, req_a, user.org_id)
    except ValueError as e:
        character.active_version_id = original_active
        await db.flush()
        raise HTTPException(status_code=400, detail=f"Evaluation failed for version A: {str(e)}")

    # Evaluate with version B
    character.active_version_id = ver_b.id
    await db.flush()
    req_b = EvalRequest(
        character_id=data.character_id,
        content=data.content,
        modality=data.modality,
    )
    try:
        eval_run_b = await evaluation_service.evaluate(db, req_b, user.org_id)
    except ValueError as e:
        character.active_version_id = original_active
        await db.flush()
        raise HTTPException(status_code=400, detail=f"Evaluation failed for version B: {str(e)}")

    # Restore original active version
    character.active_version_id = original_active
    await db.flush()
    await db.commit()

    # Load full results
    _, result_a, result_out_a = await _load_run_and_result(db, eval_run_a.id, user.org_id)
    _, result_b, result_out_b = await _load_run_and_result(db, eval_run_b.id, user.org_id)

    critic_map = await _build_critic_map(db)
    comparison = compute_comparison(eval_run_a, result_a, eval_run_b, result_b, critic_map)

    response = {
        "mode": "versions",
        "character": {"id": character.id, "name": character.name},
        "version_a": {"version_number": data.version_a, "id": ver_a.id},
        "version_b": {"version_number": data.version_b, "id": ver_b.id},
        "content": data.content,
        "modality": data.modality,
        "side_a": {
            "eval_run": EvalRunOut.model_validate(eval_run_a).model_dump(),
            "result": result_out_a.model_dump() if result_out_a else None,
        },
        "side_b": {
            "eval_run": EvalRunOut.model_validate(eval_run_b).model_dump(),
            "result": result_out_b.model_dump() if result_out_b else None,
        },
        "comparison": comparison,
    }

    _append_history({
        "mode": "versions",
        "character_id": data.character_id,
        "character_name": character.name,
        "version_a": data.version_a,
        "version_b": data.version_b,
        "run_id_a": eval_run_a.id,
        "run_id_b": eval_run_b.id,
        "score_diff": comparison["score_diff"],
        "decisions_match": comparison["decisions_match"],
        "created_at": datetime.utcnow().isoformat(),
        "user_id": user.id,
        "org_id": user.org_id,
    })

    return response


@router.get("/history")
async def comparison_history(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List recent comparisons from the lightweight JSON log."""
    try:
        if os.path.exists(COMPARE_LOG_PATH):
            with open(COMPARE_LOG_PATH, "r") as f:
                history = json.load(f)
        else:
            history = []
    except Exception:
        history = []

    # Filter to current org
    org_history = [h for h in history if h.get("org_id") == user.org_id]

    # Return most recent entries
    org_history.reverse()
    return org_history[:limit]
