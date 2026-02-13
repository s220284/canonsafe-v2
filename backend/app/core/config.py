from __future__ import annotations

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "CanonSafe V2"
    VERSION: str = "2.0.0"
    DEBUG: bool = True

    DATABASE_URL: str = "sqlite+aiosqlite:///./canonsafe.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"

    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    PRIMARY_LLM: str = "openai"  # openai or anthropic

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Evaluation defaults
    DEFAULT_SAMPLING_RATE: float = 1.0  # 100% by default
    RAPID_SCREEN_THRESHOLD: float = 0.7
    DEEP_EVAL_THRESHOLD: float = 0.9

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
