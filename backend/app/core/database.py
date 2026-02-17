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

    # Migration: create review_items table columns if missing (idempotent)
    async with engine.begin() as conn:
        review_cols = [
            ("eval_run_id", "INTEGER"),
            ("character_id", "INTEGER"),
            ("status", "VARCHAR(50) DEFAULT 'pending'"),
            ("priority", "INTEGER DEFAULT 0"),
            ("reason", "VARCHAR(255)"),
            ("assigned_to", "INTEGER"),
            ("assigned_at", "TIMESTAMP"),
            ("resolved_at", "TIMESTAMP"),
            ("resolution", "VARCHAR(50)"),
            ("override_decision", "VARCHAR(50)"),
            ("override_justification", "TEXT"),
            ("reviewer_notes", "TEXT"),
            ("org_id", "INTEGER"),
            ("created_at", "TIMESTAMP"),
        ]
        for col_name, col_type in review_cols:
            if is_postgres:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE review_items ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                    ))
                except Exception:
                    pass
            else:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE review_items ADD COLUMN {col_name} {col_type}"
                    ))
                except Exception:
                    pass

    # Migration: create webhook_subscriptions table columns if missing (idempotent)
    async with engine.begin() as conn:
        webhook_sub_cols = [
            ("id", "INTEGER PRIMARY KEY"),
            ("url", "VARCHAR(500) NOT NULL"),
            ("secret", "VARCHAR(255) NOT NULL"),
            ("events", "TEXT"),  # JSON stored as TEXT for SQLite
            ("active", "BOOLEAN DEFAULT 1"),
            ("description", "VARCHAR(500)"),
            ("last_triggered_at", "TIMESTAMP"),
            ("failure_count", "INTEGER DEFAULT 0"),
            ("org_id", "INTEGER NOT NULL"),
            ("created_at", "TIMESTAMP"),
        ]
        for col_name, col_type in webhook_sub_cols:
            if col_name == "id":
                continue  # skip PK — handled by create_all
            if is_postgres:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE webhook_subscriptions ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                    ))
                except Exception:
                    pass
            else:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE webhook_subscriptions ADD COLUMN {col_name} {col_type}"
                    ))
                except Exception:
                    pass

    # Migration: create webhook_deliveries table columns if missing (idempotent)
    async with engine.begin() as conn:
        webhook_del_cols = [
            ("id", "INTEGER PRIMARY KEY"),
            ("subscription_id", "INTEGER NOT NULL"),
            ("event_type", "VARCHAR(100) NOT NULL"),
            ("payload", "TEXT"),  # JSON stored as TEXT for SQLite
            ("status_code", "INTEGER"),
            ("response_body", "TEXT"),
            ("success", "BOOLEAN DEFAULT 0"),
            ("attempts", "INTEGER DEFAULT 1"),
            ("created_at", "TIMESTAMP"),
        ]
        for col_name, col_type in webhook_del_cols:
            if col_name == "id":
                continue  # skip PK — handled by create_all
            if is_postgres:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                    ))
                except Exception:
                    pass
            else:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE webhook_deliveries ADD COLUMN {col_name} {col_type}"
                    ))
                except Exception:
                    pass

    # Migration: add cost tracking columns to critic_results (idempotent)
    async with engine.begin() as conn:
        cost_cols = [
            ("prompt_tokens", "INTEGER"),
            ("completion_tokens", "INTEGER"),
            ("model_used", "VARCHAR(255)"),
            ("estimated_cost", "REAL"),
        ]
        for col_name, col_type in cost_cols:
            if is_postgres:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE critic_results ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                    ))
                except Exception:
                    pass
            else:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE critic_results ADD COLUMN {col_name} {col_type}"
                    ))
                except Exception:
                    pass

    # Migration: add probes_per_category to red_team_sessions (idempotent)
    async with engine.begin() as conn:
        for col_name, col_type in [("probes_per_category", "INTEGER DEFAULT 5")]:
            if is_postgres:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE red_team_sessions ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                    ))
                except Exception:
                    pass
            else:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE red_team_sessions ADD COLUMN {col_name} {col_type}"
                    ))
                except Exception:
                    pass

    # Migration: ab_experiments columns (idempotent)
    async with engine.begin() as conn:
        ab_exp_cols = [
            ("name", "VARCHAR(255) NOT NULL DEFAULT ''"),
            ("description", "TEXT"),
            ("status", "VARCHAR(50) DEFAULT 'draft'"),
            ("experiment_type", "VARCHAR(100) NOT NULL DEFAULT ''"),
            ("variant_a", "TEXT"),
            ("variant_b", "TEXT"),
            ("sample_size", "INTEGER DEFAULT 100"),
            ("results_a", "TEXT"),
            ("results_b", "TEXT"),
            ("winner", "VARCHAR(10)"),
            ("statistical_significance", "REAL"),
            ("org_id", "INTEGER NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMP"),
            ("completed_at", "TIMESTAMP"),
        ]
        for col_name, col_type in ab_exp_cols:
            if is_postgres:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE ab_experiments ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                    ))
                except Exception:
                    pass
            else:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE ab_experiments ADD COLUMN {col_name} {col_type}"
                    ))
                except Exception:
                    pass

    # Migration: ab_trial_runs columns (idempotent)
    async with engine.begin() as conn:
        ab_trial_cols = [
            ("experiment_id", "INTEGER NOT NULL DEFAULT 0"),
            ("variant", "VARCHAR(10) NOT NULL DEFAULT ''"),
            ("eval_run_id", "INTEGER NOT NULL DEFAULT 0"),
            ("score", "REAL"),
            ("decision", "VARCHAR(50)"),
            ("latency_ms", "INTEGER"),
            ("cost", "REAL"),
            ("created_at", "TIMESTAMP"),
        ]
        for col_name, col_type in ab_trial_cols:
            if is_postgres:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE ab_trial_runs ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                    ))
                except Exception:
                    pass
            else:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE ab_trial_runs ADD COLUMN {col_name} {col_type}"
                    ))
                except Exception:
                    pass

    # Migration: custom_judges table columns (idempotent)
    async with engine.begin() as conn:
        judge_cols = [
            ("name", "VARCHAR(255) NOT NULL DEFAULT ''"),
            ("slug", "VARCHAR(100) NOT NULL DEFAULT ''"),
            ("description", "TEXT"),
            ("model_type", "VARCHAR(100) NOT NULL DEFAULT ''"),
            ("endpoint_url", "VARCHAR(500)"),
            ("model_name", "VARCHAR(255)"),
            ("api_key_ref", "VARCHAR(255)"),
            ("default_temperature", "REAL DEFAULT 0.0"),
            ("default_max_tokens", "INTEGER DEFAULT 2048"),
            ("capabilities", "TEXT"),
            ("pricing", "TEXT"),
            ("is_active", "BOOLEAN DEFAULT 1"),
            ("health_status", "VARCHAR(50) DEFAULT 'unknown'"),
            ("last_health_check", "TIMESTAMP"),
            ("org_id", "INTEGER NOT NULL DEFAULT 0"),
            ("created_at", "TIMESTAMP"),
        ]
        for col_name, col_type in judge_cols:
            if is_postgres:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE custom_judges ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                    ))
                except Exception:
                    pass
            else:
                try:
                    await conn.execute(text(
                        f"ALTER TABLE custom_judges ADD COLUMN {col_name} {col_type}"
                    ))
                except Exception:
                    pass

    # Migration: add critic_agreement column to eval_results (idempotent)
    async with engine.begin() as conn:
        if is_postgres:
            try:
                await conn.execute(text(
                    "ALTER TABLE eval_results ADD COLUMN IF NOT EXISTS critic_agreement FLOAT"
                ))
            except Exception:
                pass
        else:
            try:
                await conn.execute(text(
                    "ALTER TABLE eval_results ADD COLUMN critic_agreement FLOAT"
                ))
            except Exception:
                pass

    # Backfill main characters in its own transaction
    async with engine.begin() as conn:
        await conn.execute(text(
            "UPDATE character_cards SET is_main = true "
            "WHERE name IN ('Peppa Pig', 'George Pig', 'Mummy Pig', 'Daddy Pig', 'Suzy Sheep') "
            "AND is_main = false"
        ))
