"""User management schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel


class UserListOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    is_super_admin: bool = False
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InviteUserRequest(BaseModel):
    email: str
    role: str = "viewer"


class InvitationOut(BaseModel):
    id: int
    email: str
    org_id: int
    role: str
    token: str
    status: str
    invited_by: Optional[int] = None
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class AcceptInvitationRequest(BaseModel):
    token: str
    password: str
    full_name: Optional[str] = None


class ChangeRoleRequest(BaseModel):
    role: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class OrgSettingsUpdate(BaseModel):
    display_name: Optional[str] = None
    industry: Optional[str] = None
    plan: Optional[str] = None
    settings: Optional[dict] = None


class OrgOut(BaseModel):
    id: int
    name: str
    slug: str
    display_name: Optional[str] = None
    industry: Optional[str] = None
    plan: str = "trial"
    is_active: bool = True
    onboarding_completed: bool = False
    settings: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
