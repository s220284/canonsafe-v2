"""Auth tests — register, login, me, invalid credentials, inactive user."""
import pytest
import pytest_asyncio


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/auth/register", json={
        "email": "new@test.com",
        "password": "pass123",
        "full_name": "New User",
        "org_name": "New Org",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "new@test.com"
    assert data["role"] == "admin"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post("/api/auth/register", json={
        "email": "dup@test.com", "password": "pass123", "org_name": "Org1",
    })
    resp = await client.post("/api/auth/register", json={
        "email": "dup@test.com", "password": "pass123", "org_name": "Org2",
    })
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/auth/register", json={
        "email": "login@test.com", "password": "pass123", "org_name": "LoginOrg",
    })
    resp = await client.post("/api/auth/login", data={
        "username": "login@test.com", "password": "pass123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    resp = await client.post("/api/auth/login", data={
        "username": "nobody@test.com", "password": "wrong",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me(client, test_org_and_user):
    resp = await client.get("/api/auth/me", headers=test_org_and_user["headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.com"
    assert data["org_name"] == "Test Org"
    assert "is_super_admin" in data


@pytest.mark.asyncio
async def test_me_without_token(client):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401
