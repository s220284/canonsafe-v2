"""Role-Based Access Control (RBAC) dependency for FastAPI routes."""
from __future__ import annotations

from typing import List

from fastapi import Depends, HTTPException, status

from app.core.auth import get_current_user


def require_role(allowed_roles: List[str]):
    """Create a FastAPI dependency that enforces role-based access.

    Usage:
        @router.post("", dependencies=[Depends(require_role(["admin", "editor"]))])
        async def create_thing(...):
            ...

    Or to get the user object:
        @router.post("")
        async def create_thing(user = Depends(require_role(["admin", "editor"]))):
            ...
    """
    async def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {', '.join(allowed_roles)}. Your role: {current_user.role}",
            )
        return current_user
    return role_checker


# Convenience shortcuts
require_admin = require_role(["admin"])
require_editor = require_role(["admin", "editor"])
require_viewer = require_role(["admin", "editor", "viewer"])
