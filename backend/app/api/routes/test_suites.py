from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.rbac import require_editor
from app.core.database import get_db
from app.models.core import User
from app.schemas.test_suites import TestSuiteCreate, TestSuiteUpdate, TestSuiteOut, TestCaseCreate, TestCaseUpdate, TestCaseOut
from app.services import test_suite_service

router = APIRouter()


@router.post("", response_model=TestSuiteOut)
async def create_suite(
    data: TestSuiteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    return await test_suite_service.create_suite(db, data, user.org_id)


@router.get("", response_model=List[TestSuiteOut])
async def list_suites(
    character_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await test_suite_service.list_suites(db, user.org_id, character_id)


@router.get("/{suite_id}", response_model=TestSuiteOut)
async def get_suite(
    suite_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    suite = await test_suite_service.get_suite(db, suite_id, user.org_id)
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")
    return suite


@router.patch("/{suite_id}", response_model=TestSuiteOut)
async def update_suite(
    suite_id: int,
    data: TestSuiteUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    suite = await test_suite_service.update_suite(db, suite_id, user.org_id, data)
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")
    return suite


@router.post("/{suite_id}/cases", response_model=TestCaseOut)
async def add_test_case(
    suite_id: int,
    data: TestCaseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    suite = await test_suite_service.get_suite(db, suite_id, user.org_id)
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")
    return await test_suite_service.add_test_case(db, suite_id, data)


@router.get("/{suite_id}/cases", response_model=List[TestCaseOut])
async def list_test_cases(
    suite_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await test_suite_service.list_test_cases(db, suite_id)


@router.patch("/{suite_id}/cases/{case_id}", response_model=TestCaseOut)
async def update_test_case(
    suite_id: int,
    case_id: int,
    data: TestCaseUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    tc = await test_suite_service.update_test_case(db, case_id, data)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    return tc


@router.delete("/{suite_id}/cases/{case_id}")
async def delete_test_case(
    suite_id: int,
    case_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    ok = await test_suite_service.delete_test_case(db, case_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Test case not found")
    return {"ok": True}


@router.post("/{suite_id}/run")
async def run_test_suite(
    suite_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor),
):
    """Execute all test cases in a suite through the evaluation pipeline."""
    from app.schemas.evaluations import EvalRequest
    from app.services import evaluation_service

    suite = await test_suite_service.get_suite(db, suite_id, user.org_id)
    if not suite:
        raise HTTPException(status_code=404, detail="Test suite not found")

    test_cases = await test_suite_service.list_test_cases(db, suite_id)
    if not test_cases:
        raise HTTPException(status_code=400, detail="Test suite has no test cases")

    results = []
    scores = []
    for tc in test_cases:
        content = tc.input_content.get("content", tc.input_content.get("prompt", ""))
        modality = tc.input_content.get("modality", "text")
        eval_req = EvalRequest(
            character_id=suite.character_id,
            content=content,
            modality=modality,
        )
        try:
            run = await evaluation_service.evaluate(db, eval_req, user.org_id)
            score = run.overall_score or 0.0
            scores.append(score)
            results.append({
                "test_case_id": tc.id,
                "test_case_name": tc.name,
                "score": score,
                "decision": run.decision,
                "passed": score >= suite.passing_threshold,
                "eval_run_id": run.id,
            })
        except Exception as e:
            scores.append(0.0)
            results.append({
                "test_case_id": tc.id,
                "test_case_name": tc.name,
                "score": 0.0,
                "decision": "error",
                "error": str(e),
                "passed": False,
            })

    avg_score = sum(scores) / len(scores) if scores else 0.0
    passed_count = sum(1 for r in results if r.get("passed"))

    return {
        "suite_id": suite.id,
        "suite_name": suite.name,
        "character_id": suite.character_id,
        "total_cases": len(test_cases),
        "passed_cases": passed_count,
        "failed_cases": len(test_cases) - passed_count,
        "avg_score": round(avg_score, 4),
        "pass_rate": round(passed_count / len(test_cases), 4) if test_cases else 0,
        "threshold": suite.passing_threshold,
        "overall_passed": avg_score >= suite.passing_threshold,
        "case_results": results,
    }
