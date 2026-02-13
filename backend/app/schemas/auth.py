from __future__ import annotations

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    org_name: Optional[str] = None  # creates org if new


class UserLogin(BaseModel):
    username: str  # email — named username for OAuth2 compat
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    org_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
