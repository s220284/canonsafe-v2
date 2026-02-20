"""Evaluation tests — run eval (mock LLM), org filter."""
import pytest
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_list_evaluations(client, test_org_and_user):
    h = test_org_and_user["headers"]
    resp = await client.get("/api/evaluations", headers=h)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_eval_requires_auth(client):
    resp = await client.get("/api/evaluations")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_eval_cost_summary(client, test_org_and_user):
    h = test_org_and_user["headers"]
    resp = await client.get("/api/evaluations/cost-summary", headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_evals" in data
    assert "total_estimated_cost" in data
