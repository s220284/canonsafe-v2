# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend

```bash
# Setup
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # defaults to SQLite for local dev

# Run (auto-creates tables and seeds demo data on startup)
cd backend && uvicorn app.main:app --reload --port 8000

# API docs: http://localhost:8000/api/docs

# Tests (pytest + pytest-asyncio, uses in-memory SQLite)
cd backend && pytest                              # all tests
cd backend && pytest tests/test_auth.py           # single file
cd backend && pytest tests/test_auth.py::test_login  # single test
cd backend && pytest -k "test_login"              # pattern match
```

### Frontend

```bash
cd frontend && npm install
cd frontend && npm run dev      # http://localhost:3000 (proxies /api → localhost:8000)
cd frontend && npm run build    # production build → dist/
```

### Deploy Frontend to Vercel

```bash
cd frontend && vercel --prod
```

Frontend also auto-deploys via GitHub Actions on push to `main` when `frontend/**` changes (requires `VERCEL_TOKEN` secret).

### Deploy Backend to Cloud Run

```bash
cd backend && gcloud run deploy canonsafe-v2 \
  --source . --project tpgpt-prod --region us-east1 --allow-unauthenticated \
  --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=DB_PASSWORD:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" \
  --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=tpgpt-prod:us-east1:tpg-intel-db||DB_USER=postgres||DB_NAME=canonsafe||ALLOWED_ORIGINS=https://frontend-beta-ten-75.vercel.app,http://localhost:3000,http://localhost:5173" \
  --add-cloudsql-instances=tpgpt-prod:us-east1:tpg-intel-db \
  --memory=512Mi --cpu=1 --min-instances=0 --max-instances=3 --timeout=300
```

Note the `^||^` separator — this is how gcloud handles commas inside env var values.

### Check Deployment Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=canonsafe-v2" \
  --project tpgpt-prod --limit=30 --format="value(textPayload)"
```

## Architecture

CanonSafe V2 is a **character IP governance platform** that manages, evaluates, and certifies AI-generated character content across text, image, video, and audio modalities.

### Stack

- **Backend:** Python 3.11 / FastAPI / SQLAlchemy 2.0 (async) / asyncpg (prod) / aiosqlite (dev)
- **Frontend:** React 18 / Vite / Tailwind CSS / Axios / React Router
- **Database:** Cloud SQL PostgreSQL (prod) / SQLite (local dev)
- **Infra:** Google Cloud Run (backend), Vercel (frontend), GitHub Actions (CI/CD)

### Backend Structure

```
backend/app/
├── main.py              # FastAPI app + lifespan (init_db + seed on startup) + 29 router registrations
├── core/
│   ├── config.py        # Pydantic BaseSettings, all env vars
│   ├── database.py      # Async engine, session factory, init_db() with idempotent migrations
│   ├── auth.py          # JWT token creation/verification, password hashing (bcrypt), super-admin checks
│   ├── rbac.py          # Role-based access control decorators (require_admin, require_viewer)
│   ├── llm.py           # OpenAI + Anthropic adapter, call_both_llms_json() for bias mitigation
│   ├── license.py       # License key validation logic
│   ├── rate_limit.py    # Rate limiting utilities
│   └── seed_*.py        # Demo data bootstrapping (Star Wars, Disney Princess)
├── models/core.py       # All 37 SQLAlchemy models in one file
├── schemas/             # Pydantic v2 request/response models (21 modules)
├── api/routes/          # 35 route modules (each a FastAPI APIRouter)
└── services/            # 25 business logic modules (called by routes)
```

**Key pattern:** Routes → Services → Database. Routes handle HTTP, services handle business logic, database access is via async SQLAlchemy sessions injected through FastAPI dependencies.

### Frontend Structure

```
frontend/src/
├── App.jsx              # 25+ route definitions
├── components/Layout.jsx # Sidebar navigation (all page links live here)
├── contexts/AuthContext.jsx # JWT auth state, login/logout/Google OAuth, God Mode org switching
├── services/api.js      # Axios instance with Bearer token + X-Org-Override interceptors
└── pages/               # 32 page components
```

### Sidebar Navigation Groups (Layout.jsx)

1. **Dashboard** — `/`
2. **Characters** — `/characters`, `/franchises`, `/consent`
3. **Evaluation** — `/evaluations`, `/critics`, `/compare`, `/reviews`, `/multimodal`
4. **Quality** — `/test-suites`, `/certifications`, `/red-team`, `/ab-testing`
5. **Monitoring** — `/drift`, `/improvement`, `/apm`, `/usage`
6. **Configuration** — `/taxonomy`, `/exemplars`, `/judges`
7. **Bottom Nav** — `/settings`, `/api-docs`, `/tutorial`, `/manual`
8. **Admin** (super-admin only) — `/admin`

### Multi-Tenant Model

Everything is scoped to an `Organization`. The hierarchy is: Organization → Franchise → CharacterCard → CardVersion. Users belong to an org. The `X-Org-Override` header enables super-admin org switching.

### 5-Pack Character Card

The core data model is a `CardVersion` with 5 JSON columns that define a character's identity for evaluation:
- **canon_pack** — facts, voice profile, relationships
- **legal_pack** — rights holder, performer consent, usage restrictions
- **safety_pack** — content rating, prohibited topics, age gating
- **visual_identity_pack** — art style, color palette, distinguishing features
- **audio_identity_pack** — tone, speech style, catchphrases

### Evaluation Pipeline

`evaluation_service.py` is the core engine. Content is evaluated against a character's 5-pack by multiple critics (LLM judges). Policy actions based on score: pass (>=0.9), regenerate (0.7-0.89), quarantine (0.5-0.69), escalate (0.3-0.49), block (<0.3). Supports tiered evaluation (rapid screen → full), sampling for high-volume, and multi-provider bias mitigation (GPT-4o + Claude in parallel, averaged).

## Critical Gotchas

### Database Connection Priority

Built dynamically in `backend/app/core/database.py`:
1. `DATABASE_URL` starts with `postgresql` → use directly
2. `CLOUD_SQL_CONNECTION_NAME` set → build unix socket URL: `postgresql+asyncpg://{DB_USER}:{DB_PASS}@/{DB_NAME}?host=/cloudsql/{connection_name}`
3. Otherwise → SQLite from `DATABASE_URL` default

### Cloud Run Secret Mapping

```
SECRET_KEY      ← GCP Secret: canonsafe-secret-key
DB_PASS         ← GCP Secret: DB_PASSWORD
OPENAI_API_KEY  ← GCP Secret: OPENAI_API_KEY
```

**Do NOT map `DATABASE_URL` to the password secret.** The config reads `DB_PASS` for the password.

### PostgreSQL Compatibility

These bugs have been fixed but will resurface if not maintained:

1. **Transaction isolation:** PostgreSQL aborts entire transaction on error. Use `ADD COLUMN IF NOT EXISTS` and separate transactions in `init_db()`.
2. **Datetime timezone:** asyncpg requires naive datetimes for `TIMESTAMP` columns. The `utcnow()` helper in `models/core.py` must use `datetime.utcnow()`, NOT `datetime.now(timezone.utc)`.
3. **Boolean values:** PostgreSQL uses `true/false`, SQLite uses `0/1`. The code handles both in `init_db()`.

### Auth Flow

- Backend: OAuth2 password flow via `POST /api/auth/login` with `FormData` (username + password), plus Google OAuth via `/api/auth/google/callback`
- Frontend: `AuthContext.jsx` stores JWT in `localStorage`, attaches as `Authorization: Bearer {token}`
- Token expiry: 24 hours (`ACCESS_TOKEN_EXPIRE_MINUTES=1440`)
- RBAC: `core/rbac.py` provides `require_admin` and `require_viewer` decorators for route protection
- God Mode: Super-admins can switch orgs via `X-Org-Override` header (stored in localStorage as `orgOverride`)

### Frontend API Connection

`frontend/src/services/api.js` uses `import.meta.env.VITE_API_URL || '/api'`. Local dev relies on the Vite proxy in `vite.config.js` (`/api` → `http://localhost:8000`). Production uses the Vercel env var `VITE_API_URL`.

### Test Fixtures

`backend/tests/conftest.py` overrides `get_db` to use an in-memory SQLite database per test. Key fixtures: `engine`, `db_session`, `client` (AsyncClient), `test_org_and_user` (pre-created org + admin + JWT token).

## Adding a New Feature

1. Create route handler in `backend/app/api/routes/newfeature.py`
2. Create service in `backend/app/services/newfeature_service.py`
3. Create schemas in `backend/app/schemas/newfeature.py`
4. Register router in `backend/app/main.py`
5. Create page in `frontend/src/pages/NewFeature.jsx`
6. Add route in `frontend/src/App.jsx`
7. Add sidebar link in `frontend/src/components/Layout.jsx`

### Adding a Database Column

Edit `backend/app/models/core.py`, then add an idempotent migration in `database.py`'s `init_db()` using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

### Local Seed Scripts

External seed scripts in `backend/` root (not in the app package):
- `seed_peppa.py` — 15 priority Peppa Pig characters with curated 5-pack data
- `seed_enhance.py` — 10 supporting characters enrichment
- `seed_all_characters.py` — Remaining 59 characters with role-based generated data

### Production Data Seeding

Cloud Run can't run local seed scripts. Use the temporary endpoint pattern:
1. Create a route in `backend/app/api/routes/` with data embedded inline
2. Register in `main.py`, deploy, call the endpoint with `?secret=canonsafe-seed-2024`
3. Remove from `main.py`, redeploy clean

## Deployment Targets

| Component | Platform | URL |
|-----------|----------|-----|
| Backend | Cloud Run | https://canonsafe-v2-516559856008.us-east1.run.app |
| Frontend | Vercel | https://frontend-beta-ten-75.vercel.app |
| Database | Cloud SQL | `tpgpt-prod:us-east1:tpg-intel-db` / `canonsafe` |
| CI/CD | GitHub Actions | Auto-deploys on push to `main`: backend (`GCP_SA_KEY`), frontend (`VERCEL_TOKEN`) |

**Demo login:** `s220284@gmail.com` / `canonsafe2024`
**Disney demo:** `s220284+disney@gmail.com` / `starwars` (Star Wars + Disney Princess franchises, 27 characters, 10 critics)

## GCP Resources

| Resource | Identifier |
|----------|-----------|
| Project | `tpgpt-prod` (ID: `516559856008`) |
| Cloud Run | `canonsafe-v2` (us-east1) |
| Cloud SQL | `tpgpt-prod:us-east1:tpg-intel-db` |
| Secrets | `DB_PASSWORD`, `canonsafe-secret-key`, `OPENAI_API_KEY` |
| Artifact Registry | `us-east1-docker.pkg.dev/tpgpt-prod/canonsafe-repo/` |

## Patent Applications

Both patents live in `/Users/lakehouse/s220284/eaas/docs/`. When adding features, update:
- `PATENT_APPLICATION.md` — Method patent (42 claims)
- `PROVISIONAL_PATENT_APPLICATION.md` — Provisional patent (50 claims)
