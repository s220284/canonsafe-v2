"""API key management routes."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rbac import require_admin
from app.models.core import User
from app.schemas.apikeys import ApiKeyCreateRequest, ApiKeyOut, ApiKeyCreateResponse
from app.services import apikey_service, audit_service

router = APIRouter()


@router.post("", response_model=ApiKeyCreateResponse)
async def create_api_key(
    data: ApiKeyCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Create a new API key. The full key is returned only once."""
    api_key, full_key = await apikey_service.create_api_key(
        db, user.org_id, user.id, data.name, data.scopes
    )

    await audit_service.log_action(
        db, user.org_id, user.id, "apikey.create",
        resource_type="api_key", resource_id=api_key.id,
        detail={"name": data.name, "scopes": data.scopes},
    )

    return ApiKeyCreateResponse(
        api_key=ApiKeyOut.model_validate(api_key),
        full_key=full_key,
    )


@router.get("", response_model=List[ApiKeyOut])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """List API keys (never shows actual key values)."""
    return await apikey_service.list_api_keys(db, user.org_id)


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Revoke an API key."""
    ok = await apikey_service.revoke_api_key(db, key_id, user.org_id)
    if not ok:
        raise HTTPException(status_code=404, detail="API key not found")

    await audit_service.log_action(
        db, user.org_id, user.id, "apikey.revoke",
        resource_type="api_key", resource_id=key_id,
    )
    return {"ok": True}
