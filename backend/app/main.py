from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)

# Import and register all routers
from app.api.routes import (
    auth,
    characters,
    critics,
    evaluations,
    franchises,
    taxonomy,
    test_suites,
    certifications,
    consent,
    improvement,
    exemplars,
    apm,
    health,
    reviews,
    webhooks,
    export,
    drift,
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(characters.router, prefix="/api/characters", tags=["Characters"])
app.include_router(critics.router, prefix="/api/critics", tags=["Critics"])
app.include_router(evaluations.router, prefix="/api/evaluations", tags=["Evaluations"])
app.include_router(franchises.router, prefix="/api/franchises", tags=["Franchises"])
app.include_router(taxonomy.router, prefix="/api/taxonomy", tags=["Taxonomy"])
app.include_router(test_suites.router, prefix="/api/test-suites", tags=["Test Suites"])
app.include_router(certifications.router, prefix="/api/certifications", tags=["Certifications"])
app.include_router(consent.router, prefix="/api/consent", tags=["Consent"])
app.include_router(improvement.router, prefix="/api/improvement", tags=["Improvement"])
app.include_router(exemplars.router, prefix="/api/exemplars", tags=["Exemplars"])
app.include_router(apm.router, prefix="/api/apm", tags=["APM"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(drift.router, prefix="/api/drift", tags=["Drift"])
app.include_router(health.router, prefix="/api", tags=["Health"])
