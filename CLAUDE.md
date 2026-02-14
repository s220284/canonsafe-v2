# CLAUDE.md — AI Assistant Continuity Guide

This file helps AI assistants (Claude, etc.) quickly understand and continue work on this project.

## Project Identity

- **Name:** CanonSafe V2
- **Purpose:** Character IP governance platform — manages, evaluates, and certifies AI-generated character content
- **Owner:** s220284@gmail.com
- **GitHub:** https://github.com/s220284/canonsafe-v2

## Current State (as of 2026-02-14)

### What's Working

- Full-stack app is deployed and functional
- Frontend: Vercel at https://frontend-beta-ten-75.vercel.app
- Backend: Cloud Run at https://canonsafe-v2-516559856008.us-east1.run.app
- Database: Cloud SQL PostgreSQL at `tpgpt-prod:us-east1:tpg-intel-db`, database `canonsafe`
- Login: `s220284@gmail.com` / `canonsafe2024`
- 74 Peppa Pig characters seeded with rich 5-pack data
- All 16 frontend pages functional
- User Manual at /manual is comprehensive (1,700+ lines)
- CI/CD: GitHub Actions deploys backend on push to main (requires GCP_SA_KEY secret)

### Recent Deployments

- Backend revision: `canonsafe-v2-00009-n5b` (clean, no temp endpoints)
- Previous revisions included temporary seed/enrichment endpoints that have been removed

## Critical Architecture Details

### Backend Database Connection

The database URL is built dynamically in `backend/app/core/database.py`:

1. If `DATABASE_URL` starts with `postgresql` → use it directly
2. If `CLOUD_SQL_CONNECTION_NAME` is set → build PostgreSQL URL using unix socket: `postgresql+asyncpg://{DB_USER}:{DB_PASS}@/{DB_NAME}?host=/cloudsql/{connection_name}`
3. Otherwise → use `DATABASE_URL` default (SQLite for local dev)

**Cloud Run secret mapping (critical — gets broken easily):**
```
SECRET_KEY    <- GCP Secret: canonsafe-secret-key
DB_PASS       <- GCP Secret: DB_PASSWORD
```

Do NOT map `DATABASE_URL` to the password secret. The config reads `DB_PASS` for the password.

### Deploy Command

The working deploy command (note `^||^` separator for ALLOWED_ORIGINS commas):

```bash
cd backend && gcloud run deploy canonsafe-v2 \
  --source . \
  --project tpgpt-prod \
  --region us-east1 \
  --allow-unauthenticated \
  --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=DB_PASSWORD:latest" \
  --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=tpgpt-prod:us-east1:tpg-intel-db||DB_USER=postgres||DB_NAME=canonsafe||ALLOWED_ORIGINS=https://frontend-beta-ten-75.vercel.app,http://localhost:3000,http://localhost:5173" \
  --add-cloudsql-instances=tpgpt-prod:us-east1:tpg-intel-db \
  --memory=512Mi --cpu=1 --min-instances=0 --max-instances=3 --timeout=300
```

### PostgreSQL Compatibility Gotchas

These bugs have already been fixed but will resurface if not maintained:

1. **Transaction isolation:** PostgreSQL aborts entire transaction on error. `ALTER TABLE ADD COLUMN` on existing column kills the transaction. Fix: use `ADD COLUMN IF NOT EXISTS` and separate transactions in `init_db()`.
2. **Datetime timezone:** asyncpg requires naive datetimes for `TIMESTAMP` columns (no timezone). The `utcnow()` helper in `models/core.py` must use `datetime.utcnow()`, NOT `datetime.now(timezone.utc)`.
3. **Boolean values:** PostgreSQL uses `true/false`, SQLite uses `0/1`. The code handles both in `init_db()`.

### Frontend API Connection

`frontend/src/services/api.js` uses `import.meta.env.VITE_API_URL || '/api'`.

- **Local dev:** Defaults to `/api` (requires Vite proxy or backend on same port)
- **Production:** Vercel env var `VITE_API_URL=https://canonsafe-v2-516559856008.us-east1.run.app/api`

### Auth Flow

- Backend: OAuth2 password flow via `POST /api/auth/login` with `FormData` (username + password)
- Frontend: `AuthContext.jsx` stores JWT in `localStorage`, attaches as `Authorization: Bearer {token}`
- Token expiry: 24 hours (`ACCESS_TOKEN_EXPIRE_MINUTES=1440` in config)

## File Map — Key Files

| File | What It Does |
|------|-------------|
| `backend/app/main.py` | FastAPI app, all router registrations |
| `backend/app/core/config.py` | All env vars and settings (Pydantic BaseSettings) |
| `backend/app/core/database.py` | Engine creation, `init_db()` with migrations |
| `backend/app/models/core.py` | All 16+ SQLAlchemy models |
| `backend/app/api/routes/` | All route handlers (one file per domain) |
| `backend/app/services/` | Business logic (one file per domain) |
| `backend/app/schemas/` | Pydantic request/response models |
| `frontend/src/App.jsx` | All route definitions |
| `frontend/src/components/Layout.jsx` | Persistent sidebar navigation |
| `frontend/src/contexts/AuthContext.jsx` | JWT auth state |
| `frontend/src/services/api.js` | Axios instance with auth interceptor |
| `frontend/src/pages/CharacterWorkspace.jsx` | 5-Pack viewer (canon, legal, safety, visual, audio) |
| `frontend/src/pages/Characters.jsx` | Character grid with search/filter/sort |
| `frontend/src/pages/UserManual.jsx` | In-app documentation (1,700+ lines) |

## Data Model — 5-Pack Structure

The `CardVersion` model stores 5 JSON columns. The frontend expects these exact shapes:

### canon_pack
```json
{
  "facts": [{"fact_id": "age", "value": "4 years old", "source": "...", "confidence": 1.0}],
  "voice": {
    "personality_traits": ["cheerful", "confident"],
    "tone": "upbeat and enthusiastic",
    "speech_style": "simple, age-appropriate",
    "vocabulary_level": "simple",
    "catchphrases": [{"phrase": "...", "frequency": "often"}],
    "emotional_range": "..."
  },
  "relationships": [
    {"character_name": "George Pig", "relationship_type": "sibling", "description": "Younger brother"}
  ]
}
```

### legal_pack
```json
{
  "rights_holder": {"name": "Entertainment One / Hasbro", "territories": ["Worldwide"]},
  "performer_consent": {"type": "AI_VOICE_REFERENCE", "performer_name": "...", "scope": "...", "restrictions": ["..."]},
  "usage_restrictions": {"commercial_use": false, "attribution_required": true, "derivative_works": false}
}
```

### safety_pack
```json
{
  "content_rating": "G",
  "prohibited_topics": [{"topic": "violence", "severity": "strict", "rationale": "..."}],
  "required_disclosures": ["This is an AI-generated character experience"],
  "age_gating": {"enabled": false, "minimum_age": 0, "recommended_age": "2-5 years"}
}
```

### visual_identity_pack
```json
{
  "art_style": "2D animated, simple shapes",
  "color_palette": ["Pink", "Red"],
  "species": "pig",
  "clothing": "Red dress",
  "distinguishing_features": ["Round snout", "Rosy cheeks"]
}
```

### audio_identity_pack
```json
{
  "tone": "upbeat and enthusiastic",
  "speech_style": "simple, age-appropriate with cheeky humor",
  "catchphrases": ["I love jumping in muddy puddles!", "*Snort!*"],
  "emotional_range": "Joy, excitement, occasional frustration"
}
```

## Production Seeding Pattern

The production database cannot run local seed scripts (they reference local JSON files). Instead, use this temporary endpoint pattern:

1. Create a route file in `backend/app/api/routes/` with all data embedded inline
2. Register the route in `backend/app/main.py`
3. Deploy to Cloud Run
4. Call the endpoint: `curl -X POST "https://canonsafe-v2-516559856008.us-east1.run.app/api/seed-endpoint?secret=canonsafe-seed-2024"`
5. Remove the route from `main.py`
6. Redeploy clean

The `seed_enrich.py` route file (kept but unregistered) contains a complete template for this pattern with all 74 characters' rich data.

## GCP Resources

| Resource | Identifier |
|----------|-----------|
| GCP Project | `tpgpt-prod` (ID: `516559856008`) |
| Cloud Run Service | `canonsafe-v2` |
| Cloud SQL Instance | `tpgpt-prod:us-east1:tpg-intel-db` |
| Cloud SQL Database | `canonsafe` |
| Secret: DB Password | `DB_PASSWORD` |
| Secret: App Secret Key | `canonsafe-secret-key` |
| Artifact Registry | `us-east1-docker.pkg.dev/tpgpt-prod/canonsafe-repo/` |
| Region | `us-east1` |
| Service Account (compute) | `516559856008-compute@developer.gserviceaccount.com` |

## Vercel Resources

| Resource | Value |
|----------|-------|
| Account | `shellypalmers-projects` |
| Project | `frontend` |
| URL | https://frontend-beta-ten-75.vercel.app |
| Build Command | `cd frontend && npm run build` |
| Output Directory | `frontend/dist` |
| Env Var | `VITE_API_URL=https://canonsafe-v2-516559856008.us-east1.run.app/api` |

## Common Tasks

### Add a new page/feature

1. Create route handler in `backend/app/api/routes/newfeature.py`
2. Create service in `backend/app/services/newfeature_service.py`
3. Create schemas in `backend/app/schemas/newfeature.py`
4. Register router in `backend/app/main.py`
5. Create page component in `frontend/src/pages/NewFeature.jsx`
6. Add route in `frontend/src/App.jsx`
7. Add sidebar link in `frontend/src/components/Layout.jsx`

### Add a database column

Edit `backend/app/models/core.py` to add the column. Then add an idempotent migration in `database.py`'s `init_db()` function using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (PostgreSQL) or a try/except wrapper (SQLite).

### Redeploy backend

```bash
cd backend && gcloud run deploy canonsafe-v2 --source . --project tpgpt-prod --region us-east1 --allow-unauthenticated --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=DB_PASSWORD:latest" --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=tpgpt-prod:us-east1:tpg-intel-db||DB_USER=postgres||DB_NAME=canonsafe||ALLOWED_ORIGINS=https://frontend-beta-ten-75.vercel.app,http://localhost:3000,http://localhost:5173" --add-cloudsql-instances=tpgpt-prod:us-east1:tpg-intel-db --memory=512Mi --cpu=1 --min-instances=0 --max-instances=3 --timeout=300
```

### Check deployment logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=canonsafe-v2" --project tpgpt-prod --limit=30 --format="value(textPayload)"
```
