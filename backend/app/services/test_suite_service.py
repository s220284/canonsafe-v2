"""Test suites for agent certification."""
from __future__ import annotations

from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import TestSuite, TestCase
from app.schemas.test_suites import TestSuiteCreate, TestSuiteUpdate, TestCaseCreate, TestCaseUpdate


async def create_suite(db: AsyncSession, data: TestSuiteCreate, org_id: int) -> TestSuite:
    suite = TestSuite(
        name=data.name, description=data.description,
        character_id=data.character_id, card_version_id=data.card_version_id,
        tier=data.tier, passing_threshold=data.passing_threshold, org_id=org_id,
    )
    db.add(suite)
    await db.flush()
    return suite


async def get_suite(db: AsyncSession, suite_id: int, org_id: int) -> Optional[TestSuite]:
    result = await db.execute(
        select(TestSuite).where(TestSuite.id == suite_id, TestSuite.org_id == org_id)
    )
    return result.scalar_one_or_none()


async def list_suites(db: AsyncSession, org_id: int, character_id: Optional[int] = None) -> List[TestSuite]:
    q = select(TestSuite).where(TestSuite.org_id == org_id)
    if character_id:
        q = q.where(TestSuite.character_id == character_id)
    result = await db.execute(q.order_by(TestSuite.name))
    return list(result.scalars().all())


async def add_test_case(db: AsyncSession, suite_id: int, data: TestCaseCreate) -> TestCase:
    tc = TestCase(
        suite_id=suite_id, name=data.name,
        input_content=data.input_content, expected_outcome=data.expected_outcome,
        tags=data.tags,
    )
    db.add(tc)
    await db.flush()
    return tc


async def update_suite(db: AsyncSession, suite_id: int, org_id: int, data: TestSuiteUpdate) -> Optional[TestSuite]:
    suite = await get_suite(db, suite_id, org_id)
    if not suite:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(suite, field, value)
    await db.flush()
    return suite


async def list_test_cases(db: AsyncSession, suite_id: int) -> List[TestCase]:
    result = await db.execute(
        select(TestCase).where(TestCase.suite_id == suite_id).order_by(TestCase.id)
    )
    return list(result.scalars().all())


async def update_test_case(db: AsyncSession, case_id: int, data: TestCaseUpdate) -> Optional[TestCase]:
    result = await db.execute(select(TestCase).where(TestCase.id == case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tc, field, value)
    await db.flush()
    return tc


async def delete_test_case(db: AsyncSession, case_id: int) -> bool:
    result = await db.execute(select(TestCase).where(TestCase.id == case_id))
    tc = result.scalar_one_or_none()
    if not tc:
        return False
    await db.delete(tc)
    await db.flush()
    return True
