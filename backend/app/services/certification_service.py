"""Agent certification — run test suites and issue certifications."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import AgentCertification, TestCase
from app.schemas.certifications import CertificationRequest, CertificationUpdate
from app.schemas.evaluations import EvalRequest
from app.services import test_suite_service, evaluation_service


async def certify_agent(db: AsyncSession, request: CertificationRequest, org_id: int) -> AgentCertification:
    """Run a test suite against an agent and produce certification."""
    suite = await test_suite_service.get_suite(db, request.test_suite_id, org_id)
    if not suite:
        raise ValueError("Test suite not found")

    test_cases = await test_suite_service.list_test_cases(db, suite.id)
    if not test_cases:
        raise ValueError("Test suite has no test cases")

    # Run each test case through evaluation
    scores = []
    case_results = []
    for tc in test_cases:
        content = tc.input_content.get("content", "")
        modality = tc.input_content.get("modality", "text")
        eval_req = EvalRequest(
            character_id=request.character_id,
            content=content,
            modality=modality,
            agent_id=request.agent_id,
        )
        try:
            run = await evaluation_service.evaluate(db, eval_req, org_id)
            score = run.overall_score or 0.0
            scores.append(score)
            case_results.append({
                "test_case_id": tc.id,
                "test_case_name": tc.name,
                "score": score,
                "decision": run.decision,
                "passed": score >= suite.passing_threshold,
            })
        except Exception as e:
            scores.append(0.0)
            case_results.append({
                "test_case_id": tc.id,
                "test_case_name": tc.name,
                "score": 0.0,
                "decision": "error",
                "error": str(e),
                "passed": False,
            })

    avg_score = sum(scores) / len(scores) if scores else 0.0
    passed = avg_score >= suite.passing_threshold
    now = datetime.now(timezone.utc)

    cert = AgentCertification(
        agent_id=request.agent_id,
        character_id=request.character_id,
        card_version_id=request.card_version_id,
        tier=request.tier,
        status="passed" if passed else "failed",
        score=round(avg_score, 4),
        results_summary={
            "total_cases": len(test_cases),
            "passed_cases": sum(1 for r in case_results if r.get("passed")),
            "avg_score": round(avg_score, 4),
            "threshold": suite.passing_threshold,
            "case_results": case_results,
        },
        certified_at=now if passed else None,
        expires_at=now + timedelta(days=90) if passed else None,
        org_id=org_id,
    )
    db.add(cert)
    await db.flush()
    return cert


async def list_certifications(db: AsyncSession, org_id: int, agent_id: Optional[str] = None) -> List[AgentCertification]:
    q = select(AgentCertification).where(AgentCertification.org_id == org_id)
    if agent_id:
        q = q.where(AgentCertification.agent_id == agent_id)
    result = await db.execute(q.order_by(AgentCertification.created_at.desc()))
    return list(result.scalars().all())


async def get_certification(db: AsyncSession, cert_id: int, org_id: int) -> Optional[AgentCertification]:
    result = await db.execute(
        select(AgentCertification).where(
            AgentCertification.id == cert_id, AgentCertification.org_id == org_id
        )
    )
    return result.scalar_one_or_none()


async def update_certification(db: AsyncSession, cert_id: int, org_id: int, data: CertificationUpdate) -> Optional[AgentCertification]:
    cert = await get_certification(db, cert_id, org_id)
    if not cert:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cert, field, value)
    await db.flush()
    return cert
