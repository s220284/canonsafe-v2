from __future__ import annotations

import os

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def _build_database_url() -> str:
    """Build the async database URL based on environment."""
    # If DATABASE_URL is explicitly set to a postgres URL, use it directly
    if settings.DATABASE_URL.startswith("postgresql"):
        return settings.DATABASE_URL

    # Cloud Run with Cloud SQL unix socket
    if settings.CLOUD_SQL_CONNECTION_NAME:
        socket_path = f"/cloudsql/{settings.CLOUD_SQL_CONNECTION_NAME}"
        return (
            f"postgresql+asyncpg://{settings.DB_USER}:{settings.DB_PASS}"
            f"@/{settings.DB_NAME}?host={socket_path}"
        )

    # Local dev default — SQLite
    return settings.DATABASE_URL


database_url = _build_database_url()

engine_kwargs = {"echo": settings.DEBUG}
if database_url.startswith("postgresql"):
    engine_kwargs.update({"pool_size": 5, "max_overflow": 10, "pool_pre_ping": True})

engine = create_async_engine(database_url, **engine_kwargs)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    # Import all models so Base.metadata knows about them
    import app.models.core  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Run migrations in a separate transaction so failures don't poison create_all
    from sqlalchemy import text
    is_postgres = database_url.startswith("postgresql")

    async with engine.begin() as conn:
        # Migration: add is_main / is_focus columns (idempotent)
        # On PostgreSQL, use IF NOT EXISTS via information_schema check
        for col in ("is_main", "is_focus"):
            if is_postgres:
                await conn.execute(text(
                    f"ALTER TABLE character_cards ADD COLUMN IF NOT EXISTS {col} BOOLEAN DEFAULT false"
                ))
            else:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE character_cards ADD COLUMN {col} BOOLEAN DEFAULT 0"
                    ))
                except Exception:
                    pass  # column already exists (SQLite has no IF NOT EXISTS)

    # Backfill main characters in its own transaction
    async with engine.begin() as conn:
        await conn.execute(text(
            "UPDATE character_cards SET is_main = true "
            "WHERE name IN ('Peppa Pig', 'George Pig', 'Mummy Pig', 'Daddy Pig', 'Suzy Sheep') "
            "AND is_main = false"
        ))
