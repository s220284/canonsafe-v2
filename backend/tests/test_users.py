"""User management tests — invite, accept, list, role change, deactivate, permissions."""
import pytest


@pytest.mark.asyncio
async def test_invite_user(client, test_org_and_user):
    h = test_org_and_user["headers"]
    resp = await client.post("/api/users/invite", json={
        "email": "invited@test.com", "role": "editor",
    }, headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "invited@test.com"
    assert data["role"] == "editor"
    assert data["status"] == "pending"
    assert "token" in data


@pytest.mark.asyncio
async def test_list_invitations(client, test_org_and_user):
    h = test_org_and_user["headers"]
    await client.post("/api/users/invite", json={
        "email": "inv1@test.com", "role": "viewer",
    }, headers=h)
    resp = await client.get("/api/users/invitations", headers=h)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_accept_invitation(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Create invitation
    inv_resp = await client.post("/api/users/invite", json={
        "email": "accept@test.com", "role": "editor",
    }, headers=h)
    token = inv_resp.json()["token"]

    # Accept
    resp = await client.post("/api/users/accept-invitation", json={
        "token": token, "password": "newpass123", "full_name": "Accepted User",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_list_users(client, test_org_and_user):
    h = test_org_and_user["headers"]
    resp = await client.get("/api/users", headers=h)
    assert resp.status_code == 200
    users = resp.json()
    assert len(users) >= 1
    assert users[0]["email"] == "admin@test.com"


@pytest.mark.asyncio
async def test_change_role(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Invite + accept to create a second user
    inv = await client.post("/api/users/invite", json={
        "email": "role@test.com", "role": "viewer",
    }, headers=h)
    token = inv.json()["token"]
    accept = await client.post("/api/users/accept-invitation", json={
        "token": token, "password": "pass123",
    })
    # List users to get ID
    users = (await client.get("/api/users", headers=h)).json()
    target = [u for u in users if u["email"] == "role@test.com"][0]

    resp = await client.patch(f"/api/users/{target['id']}/role", json={
        "role": "editor",
    }, headers=h)
    assert resp.status_code == 200
    assert resp.json()["role"] == "editor"


@pytest.mark.asyncio
async def test_deactivate_user(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Create second user
    inv = await client.post("/api/users/invite", json={
        "email": "deact@test.com", "role": "viewer",
    }, headers=h)
    token = inv.json()["token"]
    await client.post("/api/users/accept-invitation", json={
        "token": token, "password": "pass123",
    })
    users = (await client.get("/api/users", headers=h)).json()
    target = [u for u in users if u["email"] == "deact@test.com"][0]

    resp = await client.post(f"/api/users/{target['id']}/deactivate", headers=h)
    assert resp.status_code == 200

    # Verify deactivated
    users = (await client.get("/api/users", headers=h)).json()
    target = [u for u in users if u["email"] == "deact@test.com"][0]
    assert target["is_active"] is False


@pytest.mark.asyncio
async def test_viewer_cannot_invite(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Create viewer
    inv = await client.post("/api/users/invite", json={
        "email": "viewer@test.com", "role": "viewer",
    }, headers=h)
    token = inv.json()["token"]
    accept = await client.post("/api/users/accept-invitation", json={
        "token": token, "password": "pass123",
    })
    viewer_token = accept.json()["access_token"]
    vh = {"Authorization": f"Bearer {viewer_token}"}

    # Viewer tries to invite — should fail
    resp = await client.post("/api/users/invite", json={
        "email": "other@test.com", "role": "viewer",
    }, headers=vh)
    assert resp.status_code == 403
