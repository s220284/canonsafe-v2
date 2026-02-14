from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.rbac import require_admin
from app.core.database import get_db
from app.models.core import User
from app.schemas.webhooks import WebhookCreate, WebhookUpdate, WebhookOut, WebhookDeliveryOut
from app.services import webhook_service

router = APIRouter()


@router.post("", response_model=WebhookOut)
async def create_webhook(
    data: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Create a new webhook subscription."""
    sub = await webhook_service.create_subscription(
        db,
        url=data.url,
        events=data.events,
        secret=data.secret,
        description=data.description,
        org_id=user.org_id,
    )
    return sub


@router.get("", response_model=List[WebhookOut])
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all webhook subscriptions for the current organization."""
    return await webhook_service.list_subscriptions(db, user.org_id)


@router.patch("/{webhook_id}", response_model=WebhookOut)
async def update_webhook(
    webhook_id: int,
    data: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Update a webhook subscription."""
    update_data = data.model_dump(exclude_unset=True)
    sub = await webhook_service.update_subscription(db, webhook_id, user.org_id, update_data)
    if not sub:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")
    return sub


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Delete a webhook subscription."""
    deleted = await webhook_service.delete_subscription(db, webhook_id, user.org_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")
    return {"detail": "Webhook subscription deleted"}


@router.get("/{webhook_id}/deliveries", response_model=List[WebhookDeliveryOut])
async def list_deliveries(
    webhook_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List delivery history for a webhook subscription."""
    return await webhook_service.list_deliveries(db, webhook_id, user.org_id, limit)


@router.post("/test/{webhook_id}", response_model=WebhookDeliveryOut)
async def test_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Send a test event to a webhook subscription."""
    sub = await webhook_service.get_subscription(db, webhook_id, user.org_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")

    delivery = await webhook_service._deliver(
        db,
        sub,
        event_type="test",
        payload={
            "message": "This is a test webhook delivery from CanonSafe V2",
            "subscription_id": sub.id,
        },
    )
    return delivery
