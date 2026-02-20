"""Character CRUD tests — create, read, update, delete, org isolation."""
import pytest


@pytest.mark.asyncio
async def test_create_character(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # First create a franchise
    fr = await client.post("/api/franchises", json={
        "name": "Test Franchise", "slug": "test-franchise",
    }, headers=h)
    franchise_id = fr.json()["id"]

    resp = await client.post("/api/characters", json={
        "name": "Test Char",
        "slug": "test-char",
        "description": "A test character",
        "franchise_id": franchise_id,
    }, headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Char"
    assert data["org_id"] == test_org_and_user["org_id"]


@pytest.mark.asyncio
async def test_list_characters(client, test_org_and_user):
    h = test_org_and_user["headers"]
    resp = await client.get("/api/characters", headers=h)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_update_character(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Create
    create = await client.post("/api/characters", json={
        "name": "UpdateMe", "slug": "update-me",
    }, headers=h)
    char_id = create.json()["id"]

    # Update
    resp = await client.patch(f"/api/characters/{char_id}", json={
        "description": "Updated description",
    }, headers=h)
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated description"


@pytest.mark.asyncio
async def test_delete_character(client, test_org_and_user):
    h = test_org_and_user["headers"]
    create = await client.post("/api/characters", json={
        "name": "DeleteMe", "slug": "delete-me",
    }, headers=h)
    char_id = create.json()["id"]

    resp = await client.delete(f"/api/characters/{char_id}", headers=h)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_org_isolation(client, test_org_and_user):
    h1 = test_org_and_user["headers"]
    # Create char in org 1
    await client.post("/api/characters", json={
        "name": "OrgChar", "slug": "org-char",
    }, headers=h1)

    # Register a second org
    await client.post("/api/auth/register", json={
        "email": "other@org.com", "password": "pass123", "org_name": "Other Org",
    })
    login = await client.post("/api/auth/login", data={
        "username": "other@org.com", "password": "pass123",
    })
    h2 = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # Org 2 should not see org 1's characters
    resp = await client.get("/api/characters", headers=h2)
    assert resp.status_code == 200
    chars = resp.json()
    assert all(c["name"] != "OrgChar" for c in chars)
