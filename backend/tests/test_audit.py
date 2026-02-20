"""Audit tests — log created on actions, filters work."""
import pytest


@pytest.mark.asyncio
async def test_audit_log_created_on_login(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Audit log should contain login entry
    resp = await client.get("/api/audit?action=user.login", headers=h)
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) >= 1
    assert logs[0]["action"] == "user.login"


@pytest.mark.asyncio
async def test_audit_log_on_invite(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Invite a user
    await client.post("/api/users/invite", json={
        "email": "audit-inv@test.com", "role": "viewer",
    }, headers=h)

    resp = await client.get("/api/audit?action=user.invite", headers=h)
    assert resp.status_code == 200
    logs = resp.json()
    assert len(logs) >= 1


@pytest.mark.asyncio
async def test_audit_log_filters(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Get all logs
    resp = await client.get("/api/audit", headers=h)
    assert resp.status_code == 200
    all_logs = resp.json()

    # Filter by resource_type
    resp = await client.get("/api/audit?resource_type=user", headers=h)
    assert resp.status_code == 200
    filtered = resp.json()
    assert all(log["resource_type"] == "user" for log in filtered)
