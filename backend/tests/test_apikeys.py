"""API key tests — create, list (hides secret), revoke."""
import pytest


@pytest.mark.asyncio
async def test_create_api_key(client, test_org_and_user):
    h = test_org_and_user["headers"]
    resp = await client.post("/api/api-keys", json={
        "name": "Test Key",
        "scopes": ["evaluations", "characters:read"],
    }, headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert "full_key" in data
    assert data["full_key"].startswith("csf_")
    assert data["api_key"]["name"] == "Test Key"
    assert data["api_key"]["is_active"] is True


@pytest.mark.asyncio
async def test_list_api_keys_hides_secret(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Create a key first
    await client.post("/api/api-keys", json={"name": "Key1"}, headers=h)

    resp = await client.get("/api/api-keys", headers=h)
    assert resp.status_code == 200
    keys = resp.json()
    assert len(keys) >= 1
    # Should have key_prefix but no full key
    for key in keys:
        assert "key_prefix" in key
        assert "key_hash" not in key
        assert "full_key" not in key


@pytest.mark.asyncio
async def test_revoke_api_key(client, test_org_and_user):
    h = test_org_and_user["headers"]
    # Create
    create_resp = await client.post("/api/api-keys", json={"name": "ToRevoke"}, headers=h)
    key_id = create_resp.json()["api_key"]["id"]

    # Revoke
    resp = await client.delete(f"/api/api-keys/{key_id}", headers=h)
    assert resp.status_code == 200

    # Verify revoked
    keys = (await client.get("/api/api-keys", headers=h)).json()
    revoked = [k for k in keys if k["id"] == key_id]
    assert len(revoked) == 1
    assert revoked[0]["is_active"] is False
