"""Webhook / Event notification service for CanonSafe V2.

Manages webhook subscriptions, dispatches events with HMAC-SHA256 signing,
and records delivery history.

Supported event types:
  - eval_completed     — fires after every evaluation completes
  - eval_blocked       — fires when eval decision is "block"
  - eval_escalated     — fires when eval decision is "escalate" or "quarantine"
  - cert_completed     — fires after certification completes
  - drift_detected     — fires when drift event is created
  - strike_activated   — fires when consent strike is activated
  - pattern_detected   — fires when new failure pattern is detected
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import WebhookSubscription, WebhookDelivery

logger = logging.getLogger(__name__)

SUPPORTED_EVENTS = [
    "eval_completed",
    "eval_blocked",
    "eval_escalated",
    "cert_completed",
    "drift_detected",
    "strike_activated",
    "pattern_detected",
]


def _sign_payload(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for a payload string."""
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


# ─── CRUD ─────────────────────────────────────────────────────

async def create_subscription(
    db: AsyncSession,
    url: str,
    events: List[str],
    secret: str,
    description: Optional[str],
    org_id: int,
) -> WebhookSubscription:
    """Create a new webhook subscription."""
    sub = WebhookSubscription(
        url=url,
        secret=secret,
        events=events,
        description=description,
        org_id=org_id,
    )
    db.add(sub)
    await db.flush()
    return sub


async def list_subscriptions(db: AsyncSession, org_id: int) -> List[WebhookSubscription]:
    """List all webhook subscriptions for an organization."""
    result = await db.execute(
        select(WebhookSubscription)
        .where(WebhookSubscription.org_id == org_id)
        .order_by(WebhookSubscription.created_at.desc())
    )
    return list(result.scalars().all())


async def get_subscription(db: AsyncSession, sub_id: int, org_id: int) -> Optional[WebhookSubscription]:
    """Get a single subscription by id, scoped to org."""
    result = await db.execute(
        select(WebhookSubscription).where(
            WebhookSubscription.id == sub_id,
            WebhookSubscription.org_id == org_id,
        )
    )
    return result.scalar_one_or_none()


async def update_subscription(
    db: AsyncSession,
    sub_id: int,
    org_id: int,
    data: Dict[str, Any],
) -> Optional[WebhookSubscription]:
    """Update a webhook subscription. Returns None if not found."""
    sub = await get_subscription(db, sub_id, org_id)
    if not sub:
        return None

    allowed_fields = {"url", "events", "secret", "description", "active"}
    for key, value in data.items():
        if key in allowed_fields:
            setattr(sub, key, value)

    await db.flush()
    return sub


async def delete_subscription(
    db: AsyncSession,
    sub_id: int,
    org_id: int,
) -> bool:
    """Delete a webhook subscription. Returns True if deleted."""
    sub = await get_subscription(db, sub_id, org_id)
    if not sub:
        return False
    await db.delete(sub)
    await db.flush()
    return True


# ─── Delivery history ────────────────────────────────────────

async def list_deliveries(
    db: AsyncSession,
    subscription_id: int,
    org_id: int,
    limit: int = 50,
) -> List[WebhookDelivery]:
    """List delivery history for a subscription, scoped to org."""
    # Verify subscription belongs to org
    sub = await get_subscription(db, subscription_id, org_id)
    if not sub:
        return []

    result = await db.execute(
        select(WebhookDelivery)
        .where(WebhookDelivery.subscription_id == subscription_id)
        .order_by(WebhookDelivery.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# ─── Event dispatch ──────────────────────────────────────────

async def dispatch_event(
    db: AsyncSession,
    event_type: str,
    payload: Dict[str, Any],
    org_id: int,
) -> None:
    """Find matching active subscriptions and POST the event payload to each.

    Each delivery is signed with HMAC-SHA256 and the signature is sent in the
    ``X-Webhook-Signature`` header.  On failure the subscription's
    ``failure_count`` is incremented; if it exceeds 5, the subscription is
    deactivated automatically.
    """
    # Find active subscriptions for this org that listen to this event_type
    result = await db.execute(
        select(WebhookSubscription).where(
            WebhookSubscription.org_id == org_id,
            WebhookSubscription.active == True,  # noqa: E712
        )
    )
    subscriptions = list(result.scalars().all())

    for sub in subscriptions:
        # Check if subscription listens to this event type
        if sub.events and event_type not in sub.events:
            continue

        await _deliver(db, sub, event_type, payload)


async def _deliver(
    db: AsyncSession,
    sub: WebhookSubscription,
    event_type: str,
    payload: Dict[str, Any],
) -> WebhookDelivery:
    """POST the event to a single subscription URL and record the delivery."""
    body = json.dumps({
        "event": event_type,
        "payload": payload,
        "timestamp": datetime.utcnow().isoformat(),
        "subscription_id": sub.id,
    })
    signature = _sign_payload(body, sub.secret)

    delivery = WebhookDelivery(
        subscription_id=sub.id,
        event_type=event_type,
        payload=payload,
        attempts=1,
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                sub.url,
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": f"sha256={signature}",
                    "X-Webhook-Event": event_type,
                },
            )
        delivery.status_code = response.status_code
        delivery.response_body = response.text[:2000] if response.text else None
        delivery.success = 200 <= response.status_code < 300

        if delivery.success:
            sub.failure_count = 0
        else:
            sub.failure_count = (sub.failure_count or 0) + 1
    except Exception as exc:
        logger.warning("Webhook delivery failed for sub %s: %s", sub.id, exc)
        delivery.status_code = None
        delivery.response_body = str(exc)[:2000]
        delivery.success = False
        sub.failure_count = (sub.failure_count or 0) + 1

    # Update subscription metadata
    sub.last_triggered_at = datetime.utcnow()
    if sub.failure_count > 5:
        sub.active = False
        logger.warning(
            "Webhook subscription %s deactivated after %d consecutive failures",
            sub.id,
            sub.failure_count,
        )

    db.add(delivery)
    await db.flush()
    return delivery
