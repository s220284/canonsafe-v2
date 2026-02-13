from __future__ import annotations

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
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

        # Migration: add is_main / is_focus columns (idempotent)
        from sqlalchemy import text
        for col in ("is_main", "is_focus"):
            try:
                await conn.execute(text(
                    f"ALTER TABLE character_cards ADD COLUMN {col} BOOLEAN DEFAULT 0"
                ))
            except Exception:
                pass  # column already exists

        # Backfill main characters
        await conn.execute(text(
            "UPDATE character_cards SET is_main = 1 "
            "WHERE name IN ('Peppa Pig', 'George Pig', 'Mummy Pig', 'Daddy Pig', 'Suzy Sheep')"
        ))
