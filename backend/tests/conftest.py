"""Test fixtures for CanonSafe V3 tests."""
import asyncio
import os
import sys

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Override database URL BEFORE importing app modules
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["ALLOW_PUBLIC_REGISTRATION"] = "true"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def engine():
    eng = create_async_engine("sqlite+aiosqlite://", echo=False)
    from app.core.database import Base
    import app.models.core  # noqa: ensure models registered

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(engine):
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(engine):
    """Test client with fresh in-memory database."""
    from app.core.database import Base
    from app.main import app
    from app.core.database import get_db

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_org_and_user(client):
    """Create a test org + admin user + JWT token."""
    # Register creates org + user
    resp = await client.post("/api/auth/register", json={
        "email": "admin@test.com",
        "password": "testpass123",
        "full_name": "Test Admin",
        "org_name": "Test Org",
    })
    assert resp.status_code == 200, resp.text
    user_data = resp.json()

    # Login to get token
    resp = await client.post("/api/auth/login", data={
        "username": "admin@test.com",
        "password": "testpass123",
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]

    return {
        "user": user_data,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
        "org_id": user_data["org_id"],
    }
