"""Knowledge Graph Test Data Generation routes."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_editor
from app.models.core import User
from app.services import test_gen_service

router = APIRouter()


class GenerateTestCasesRequest(BaseModel):
    character_id: int
    count: int = 20


class PopulateSuiteRequest(BaseModel):
    character_id: int
    suite_id: int
    count: int = 20


# ─── Generate Test Cases ─────────────────────────────────────

@router.post("/generate")
async def generate_test_cases(
    body: GenerateTestCasesRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Generate test cases for a character using LLM + character card knowledge graph."""
    try:
        cases = await test_gen_service.generate_test_cases(
            db,
            character_id=body.character_id,
            org_id=user.org_id,
            count=body.count,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "character_id": body.character_id,
        "count": len(cases),
        "test_cases": cases,
    }


# ─── Populate Suite ──────────────────────────────────────────

@router.post("/populate-suite")
async def populate_suite(
    body: PopulateSuiteRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Generate test cases and add them to an existing test suite."""
    try:
        added = await test_gen_service.auto_populate_test_suite(
            db,
            character_id=body.character_id,
            suite_id=body.suite_id,
            org_id=user.org_id,
            count=body.count,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "suite_id": body.suite_id,
        "character_id": body.character_id,
        "added_count": len(added),
        "test_cases": added,
    }
