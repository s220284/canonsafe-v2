"""CI/CD integration routes — programmatic eval triggers for GitHub Actions & pipelines."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User, EvalRun, EvalResult, TestSuite, TestCase
from app.services import evaluation_service
from app.schemas.evaluations import EvalRequest

router = APIRouter()


# ─── Schemas ───────────────────────────────────────────────────

class CITriggerRequest(BaseModel):
    character_id: int
    content: str
    modality: str = "text"
    expected_decision: Optional[str] = None  # pass, regenerate, quarantine, escalate, block
    threshold: float = 0.7
    profile_id: Optional[int] = None
    agent_id: Optional[str] = None


class CIBatchCase(BaseModel):
    character_id: int
    content: str
    modality: str = "text"
    expected_decision: Optional[str] = None
    threshold: float = 0.7


class CIBatchRequest(BaseModel):
    cases: List[CIBatchCase]
    profile_id: Optional[int] = None
    agent_id: Optional[str] = None
    test_suite_id: Optional[int] = None  # optionally run from a test suite


class CITriggerResponse(BaseModel):
    eval_run_id: int
    score: float
    decision: str
    passed: bool
    threshold: float
    expected_decision: Optional[str] = None
    decision_match: Optional[bool] = None


class CIBatchCaseResult(BaseModel):
    index: int
    eval_run_id: int
    character_id: int
    score: float
    decision: str
    passed: bool
    threshold: float
    expected_decision: Optional[str] = None
    decision_match: Optional[bool] = None


class CIBatchResponse(BaseModel):
    batch_id: str
    status: str
    total: int
    passed: int
    failed: int
    pass_rate: float
    overall_passed: bool
    results: List[CIBatchCaseResult]


# In-memory batch tracking (for lightweight status checks)
_batch_results: dict = {}


# ─── Single Eval Trigger ──────────────────────────────────────

@router.post("/trigger", response_model=CITriggerResponse)
async def ci_trigger(
    req: CITriggerRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Programmatic eval trigger for CI/CD pipelines.

    Returns pass/fail based on threshold comparison.
    Designed for GitHub Actions integration.
    """
    eval_request = EvalRequest(
        character_id=req.character_id,
        content=req.content,
        modality=req.modality,
        profile_id=req.profile_id,
        agent_id=req.agent_id,
    )

    try:
        eval_run = await evaluation_service.evaluate(db, eval_request, user.org_id)
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

    score = eval_run.overall_score or 0.0
    decision = eval_run.decision or "block"
    passed = score >= req.threshold

    # Check decision match if expected
    decision_match = None
    if req.expected_decision:
        decision_match = decision == req.expected_decision
        # If decision doesn't match, consider it failed
        if not decision_match:
            passed = False

    return CITriggerResponse(
        eval_run_id=eval_run.id,
        score=round(score, 4),
        decision=decision,
        passed=passed,
        threshold=req.threshold,
        expected_decision=req.expected_decision,
        decision_match=decision_match,
    )


# ─── Batch Eval ───────────────────────────────────────────────

@router.post("/batch", response_model=CIBatchResponse)
async def ci_batch(
    req: CIBatchRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Run batch evaluations for CI/CD.

    Accepts an array of test cases or references a test suite.
    Returns aggregate pass/fail results.
    """
    batch_id = str(uuid.uuid4())[:12]
    cases = []

    # If test_suite_id is provided, load cases from the test suite
    if req.test_suite_id:
        suite_result = await db.execute(
            select(TestSuite).where(
                TestSuite.id == req.test_suite_id,
                TestSuite.org_id == user.org_id,
            )
        )
        suite = suite_result.scalar_one_or_none()
        if not suite:
            raise HTTPException(status_code=404, detail="Test suite not found")

        tc_result = await db.execute(
            select(TestCase).where(TestCase.suite_id == suite.id)
        )
        test_cases = list(tc_result.scalars().all())

        for tc in test_cases:
            input_data = tc.input_content or {}
            expected = tc.expected_outcome or {}
            cases.append(CIBatchCase(
                character_id=suite.character_id,
                content=input_data.get("content", ""),
                modality=input_data.get("modality", "text"),
                expected_decision=expected.get("decision"),
                threshold=suite.passing_threshold,
            ))
    else:
        cases = req.cases

    if not cases:
        raise HTTPException(status_code=400, detail="No test cases provided")

    results = []
    passed_count = 0
    failed_count = 0

    for idx, case in enumerate(cases):
        eval_request = EvalRequest(
            character_id=case.character_id,
            content=case.content,
            modality=case.modality,
            profile_id=req.profile_id,
            agent_id=req.agent_id,
        )

        try:
            eval_run = await evaluation_service.evaluate(db, eval_request, user.org_id)
            await db.flush()

            score = eval_run.overall_score or 0.0
            decision = eval_run.decision or "block"
            case_passed = score >= case.threshold

            decision_match = None
            if case.expected_decision:
                decision_match = decision == case.expected_decision
                if not decision_match:
                    case_passed = False

            if case_passed:
                passed_count += 1
            else:
                failed_count += 1

            results.append(CIBatchCaseResult(
                index=idx,
                eval_run_id=eval_run.id,
                character_id=case.character_id,
                score=round(score, 4),
                decision=decision,
                passed=case_passed,
                threshold=case.threshold,
                expected_decision=case.expected_decision,
                decision_match=decision_match,
            ))
        except Exception as e:
            failed_count += 1
            results.append(CIBatchCaseResult(
                index=idx,
                eval_run_id=0,
                character_id=case.character_id,
                score=0.0,
                decision="error",
                passed=False,
                threshold=case.threshold,
                expected_decision=case.expected_decision,
                decision_match=False,
            ))

    await db.commit()

    total = len(results)
    pass_rate = passed_count / total if total > 0 else 0.0
    overall_passed = failed_count == 0

    batch_response = CIBatchResponse(
        batch_id=batch_id,
        status="completed",
        total=total,
        passed=passed_count,
        failed=failed_count,
        pass_rate=round(pass_rate, 4),
        overall_passed=overall_passed,
        results=results,
    )

    # Store for status checks
    _batch_results[batch_id] = {
        "status": "completed",
        "total": total,
        "passed": passed_count,
        "failed": failed_count,
        "pass_rate": round(pass_rate, 4),
        "overall_passed": overall_passed,
        "completed_at": datetime.utcnow().isoformat(),
    }

    return batch_response


# ─── Batch Status ─────────────────────────────────────────────

@router.get("/status/{batch_id}")
async def ci_batch_status(
    batch_id: str,
    user: User = Depends(get_current_user),
):
    """Check the status of a batch evaluation run."""
    if batch_id in _batch_results:
        return {
            "batch_id": batch_id,
            **_batch_results[batch_id],
        }
    raise HTTPException(status_code=404, detail="Batch not found")
