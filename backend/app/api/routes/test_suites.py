from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.core import User
from app.schemas.test_suites import TestSuiteCreate, TestSuiteUpdate, TestSuiteOut, TestCaseCreate, TestCaseUpdate, TestCaseOut
from app.services import test_suite_service

router = APIRouter()


@router.post("", response_model=TestSuiteOut)
async def create_suite(
    data: TestSuiteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
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
    user: User = Depends(get_current_user),
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
    user: User = Depends(get_current_user),
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
    user: User = Depends(get_current_user),
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
    user: User = Depends(get_current_user),
):
    ok = await test_suite_service.delete_test_case(db, case_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Test case not found")
    return {"ok": True}
