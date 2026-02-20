"""In-memory rate limiter for API endpoints."""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Optional

from fastapi import HTTPException, Request, status


# In-memory store: {key: [timestamp, ...]}
_buckets: dict = defaultdict(list)


def rate_limit(limit: int = 100, window: int = 60):
    """FastAPI dependency that enforces rate limiting.

    Args:
        limit: Max requests per window
        window: Window size in seconds

    Usage:
        @router.post("", dependencies=[Depends(rate_limit(100, 60))])
    """
    async def _check(request: Request):
        # Build key from org_id (if available) + path
        user = getattr(request.state, "user", None)
        org_id = getattr(user, "org_id", "anon") if user else "anon"
        key = f"{org_id}:{request.url.path}"

        now = time.time()
        cutoff = now - window

        # Clean old entries
        _buckets[key] = [t for t in _buckets[key] if t > cutoff]

        if len(_buckets[key]) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {limit} requests per {window}s.",
                headers={"Retry-After": str(window)},
            )

        _buckets[key].append(now)

    return _check
