# CanonSafe V2

**Character IP Governance Platform** — A full-stack application for managing, evaluating, and certifying AI-generated character content against established canon, safety guidelines, and legal constraints.

## Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | https://frontend-beta-ten-75.vercel.app |
| **Backend API** | https://canonsafe-v2-516559856008.us-east1.run.app |
| **API Docs** | https://canonsafe-v2-516559856008.us-east1.run.app/api/docs |

**Demo credentials:** `s220284@gmail.com` / `canonsafe2024`

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + Tailwind CSS)                 │
│  Hosted on Vercel                                       │
│  https://frontend-beta-ten-75.vercel.app                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (CORS)
┌────────────────────────▼────────────────────────────────┐
│  Backend (FastAPI + SQLAlchemy async)                    │
│  Hosted on Google Cloud Run                             │
│  https://canonsafe-v2-516559856008.us-east1.run.app     │
│  Container: python:3.11-slim + uvicorn                  │
└────────────────────────┬────────────────────────────────┘
                         │ Unix Socket
┌────────────────────────▼────────────────────────────────┐
│  Database                                               │
│  Production: Cloud SQL PostgreSQL 15                    │
│  Local dev:  SQLite (canonsafe.db)                      │
│  Instance: tpgpt-prod:us-east1:tpg-intel-db             │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | PostgreSQL 15 (production via Cloud SQL), SQLite (local dev) |
| Auth | JWT tokens (python-jose), bcrypt password hashing |
| Hosting | Vercel (frontend), Google Cloud Run (backend) |
| CI/CD | GitHub Actions (backend auto-deploy on push to main) |
| Container | Docker (python:3.11-slim), Cloud Build |

---

## Project Structure

```
canonsafe-v2/
├── README.md                      # This file
├── CLAUDE.md                      # AI assistant continuity guide
├── .gitignore
├── deploy.sh                      # Manual deployment script
├── .github/
│   └── workflows/
│       └── deploy-backend.yml     # CI/CD for Cloud Run
│
├── backend/
│   ├── Dockerfile                 # Cloud Run container definition
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment variable template
│   ├── alembic/                   # Database migrations (future use)
│   ├── tests/                     # Test directory
│   ├── seed_peppa.py              # Local seed: 15 priority characters (curated)
│   ├── seed_enhance.py            # Local seed: enrichment for 10 supporting chars
│   ├── seed_all_characters.py     # Local seed: remaining 59 characters
│   └── app/
│       ├── main.py                # FastAPI app entry point, router registration
│       ├── core/
│       │   ├── config.py          # Pydantic settings (env vars)
│       │   ├── database.py        # SQLAlchemy engine, session, init_db()
│       │   └── security.py        # JWT token creation/verification, password hashing
│       ├── models/
│       │   └── core.py            # All SQLAlchemy models (16 tables)
│       ├── schemas/               # Pydantic request/response schemas
│       │   ├── characters.py
│       │   ├── critics.py
│       │   ├── evaluations.py
│       │   └── ...
│       ├── services/              # Business logic layer
│       │   ├── character_service.py
│       │   ├── critic_service.py
│       │   ├── evaluation_service.py
│       │   └── ...
│       └── api/routes/            # FastAPI route handlers
│           ├── auth.py            # POST /api/auth/login, /register
│           ├── characters.py      # CRUD /api/characters
│           ├── critics.py         # CRUD /api/critics
│           ├── evaluations.py     # /api/evaluations
│           ├── franchises.py      # /api/franchises
│           ├── taxonomy.py        # /api/taxonomy
│           ├── test_suites.py     # /api/test-suites
│           ├── certifications.py  # /api/certifications
│           ├── consent.py         # /api/consent
│           ├── improvement.py     # /api/improvement
│           ├── exemplars.py       # /api/exemplars
│           ├── apm.py             # /api/apm (SDK integration)
│           └── health.py          # GET /api/health
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── vercel.json                # Vercel deployment config (SPA rewrites)
    └── src/
        ├── main.jsx               # React entry point
        ├── App.jsx                # Route definitions
        ├── index.css              # Tailwind imports
        ├── contexts/
        │   └── AuthContext.jsx    # JWT auth state management
        ├── components/
        │   ├── Layout.jsx         # Persistent sidebar + main content area
        │   └── PageHeader.jsx     # Reusable page header component
        ├── services/
        │   └── api.js             # Axios instance (VITE_API_URL config)
        └── pages/
            ├── Dashboard.jsx
            ├── Characters.jsx     # Search, filter, sort, grid/list views
            ├── CharacterWorkspace.jsx  # 5-Pack viewer/editor
            ├── Franchises.jsx
            ├── FranchiseHealth.jsx
            ├── Critics.jsx        # Critic + evaluation profile management
            ├── Evaluations.jsx
            ├── TestSuites.jsx
            ├── Certifications.jsx
            ├── Taxonomy.jsx       # Categories + tags, inline editing
            ├── Exemplars.jsx      # Curated content library
            ├── Improvement.jsx    # Failure patterns + trajectories
            ├── APM.jsx            # SDK integration docs
            ├── Settings.jsx
            ├── Login.jsx
            └── UserManual.jsx     # Comprehensive in-app documentation (1,700+ lines)
```

---

## Core Concepts

### The 5-Pack Character Card System

Every character has a **Card Version** containing 5 structured data packs:

| Pack | Color | Purpose |
|------|-------|---------|
| **Canon Pack** | Blue | Facts, voice profile (tone, catchphrases, personality), relationships |
| **Legal Pack** | Purple | Rights holder, performer consent, usage restrictions |
| **Safety Pack** | Red | Content rating, prohibited topics, disclosures, age gating |
| **Visual Identity Pack** | Green | Art style, color palette, species, clothing, distinguishing features |
| **Audio Identity Pack** | Orange | Tone, speech style, catchphrases, emotional range |

### Evaluation Pipeline

Content is evaluated through a 6-step pipeline:

1. **Consent Verification** — Hard gate: checks performer consent is valid
2. **Card Resolution** — Loads the active card version for the character
3. **Critic Evaluation** — Multiple critics score the content (canon fidelity, voice consistency, safety, legal, relationships)
4. **Score Aggregation** — Weighted scores produce an overall score
5. **Decision Engine** — Score maps to decision: pass (90+), regenerate (70-89), quarantine (50-69), escalate (30-49), block (<30)
6. **C2PA Metadata** — Content provenance metadata is attached

### Character Priority System

- **Main Characters** (yellow badge): Always appear first in dropdowns and grids (Peppa, George, Mummy, Daddy, Suzy)
- **Focus Characters** (blue badge): User-selected characters of current interest, appear after main
- Toggleable via checkboxes on the Characters page

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run the server
uvicorn app.main:app --reload --port 8000
```

The backend auto-creates tables on startup via `init_db()`. No manual migration needed.

### Seed Data (Local)

Run in order after the backend is running:

```bash
cd backend

# 1. Seed 15 priority characters with curated data, critics, test suites, evaluations
python seed_peppa.py

# 2. Enrich 10 supporting characters + add eval runs, exemplars, trajectories
python seed_enhance.py

# 3. Add remaining 59 characters from the full Peppa Pig character list
python seed_all_characters.py
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

The frontend runs on `http://localhost:5173` (Vite) or `http://localhost:3000` and connects to the backend at `/api` (proxied) or via `VITE_API_URL`.

### First Login

Register a new account at the login page, or use existing credentials if seeded.

---

## Production Deployment

### Backend (Google Cloud Run)

**GCP Project:** `tpgpt-prod`
**Region:** `us-east1`
**Service:** `canonsafe-v2`
**Cloud SQL Instance:** `tpgpt-prod:us-east1:tpg-intel-db`
**Database:** `canonsafe` (PostgreSQL 15)

#### Manual Deploy

```bash
cd backend

gcloud run deploy canonsafe-v2 \
  --source . \
  --project tpgpt-prod \
  --region us-east1 \
  --allow-unauthenticated \
  --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=DB_PASSWORD:latest" \
  --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=tpgpt-prod:us-east1:tpg-intel-db||DB_USER=postgres||DB_NAME=canonsafe||ALLOWED_ORIGINS=https://frontend-beta-ten-75.vercel.app,http://localhost:3000,http://localhost:5173" \
  --add-cloudsql-instances=tpgpt-prod:us-east1:tpg-intel-db \
  --memory=512Mi --cpu=1 --min-instances=0 --max-instances=3 --timeout=300
```

**Important:** Use `^||^` separator for `--set-env-vars` because `ALLOWED_ORIGINS` contains commas.

**Secret mapping:**
- `SECRET_KEY` <- GCP Secret Manager `canonsafe-secret-key`
- `DB_PASS` <- GCP Secret Manager `DB_PASSWORD`

#### CI/CD (GitHub Actions)

Pushes to `main` that modify `backend/**` automatically trigger `.github/workflows/deploy-backend.yml`, which builds the Docker image and deploys to Cloud Run.

**Required GitHub Secret:** `GCP_SA_KEY` (service account JSON key)

### Frontend (Vercel)

**Account:** `shellypalmers-projects`
**Project:** `frontend`
**Build:** `cd frontend && npm run build`
**Output:** `frontend/dist`

**Environment variable:** `VITE_API_URL=https://canonsafe-v2-516559856008.us-east1.run.app/api`

The frontend is deployed automatically on push via Vercel's GitHub integration.

---

## API Endpoints

All endpoints are prefixed with `/api`. Authentication required (Bearer JWT) except login/register/health.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | OAuth2 password login, returns JWT |
| POST | `/api/auth/register` | Create new user account |
| GET | `/api/health` | Health check |
| GET | `/api/characters` | List all characters (sorted: main > focus > name) |
| GET | `/api/characters/{id}` | Get character details |
| POST | `/api/characters` | Create character |
| PATCH | `/api/characters/{id}` | Update character (including is_main, is_focus) |
| GET | `/api/characters/{id}/versions` | List card versions |
| POST | `/api/characters/{id}/versions` | Create new card version |
| GET | `/api/franchises` | List franchises |
| POST | `/api/franchises` | Create franchise |
| GET | `/api/franchises/{id}/health` | Get franchise health aggregate |
| GET | `/api/critics` | List critics |
| POST | `/api/critics` | Create critic |
| GET | `/api/critics/profiles` | List evaluation profiles |
| POST | `/api/critics/profiles` | Create evaluation profile |
| GET | `/api/evaluations` | List eval runs |
| POST | `/api/evaluations` | Create eval run |
| GET | `/api/evaluations/{id}` | Get eval run with results |
| GET | `/api/test-suites` | List test suites |
| POST | `/api/test-suites` | Create test suite |
| GET | `/api/certifications` | List agent certifications |
| POST | `/api/certifications` | Create certification |
| GET | `/api/taxonomy` | List taxonomy categories + tags |
| POST | `/api/taxonomy/categories` | Create category |
| POST | `/api/taxonomy/tags` | Create tag |
| GET | `/api/exemplars` | List exemplar content |
| POST | `/api/exemplars` | Create exemplar |
| GET | `/api/improvement/patterns` | List failure patterns |
| GET | `/api/improvement/trajectories` | List improvement trajectories |
| GET | `/api/consent` | List consent verifications |
| POST | `/api/consent` | Create consent record |
| POST | `/api/apm/evaluate` | APM SDK: evaluate content |
| POST | `/api/apm/enforce` | APM SDK: enforce evaluation decision |

---

## Database Models

16 tables defined in `backend/app/models/core.py`:

| Model | Table | Description |
|-------|-------|-------------|
| Organization | `organizations` | Multi-tenant org container |
| User | `users` | User accounts with bcrypt passwords |
| Franchise | `franchises` | IP franchise (e.g., "Peppa Pig") |
| CharacterCard | `character_cards` | Character metadata + is_main/is_focus flags |
| CardVersion | `card_versions` | Versioned 5-pack data (canon, legal, safety, visual, audio) |
| Critic | `critics` | Evaluation critic definitions |
| CriticConfiguration | `critic_configurations` | Franchise-specific critic settings |
| EvaluationProfile | `evaluation_profiles` | Groups of critics with weights |
| EvalRun | `eval_runs` | Individual evaluation execution records |
| EvalResult | `eval_results` | Aggregated results per eval run |
| CriticResult | `critic_results` | Per-critic scores within an eval result |
| ConsentVerification | `consent_verifications` | Performer consent tracking |
| TestSuite | `test_suites` | Test suite definitions |
| TestCase | `test_cases` | Individual test cases |
| AgentCertification | `agent_certifications` | Agent tier certifications |
| TaxonomyCategory | `taxonomy_categories` | Classification categories |
| TaxonomyTag | `taxonomy_tags` | Classification tags with severity/rules |
| ExemplarContent | `exemplar_contents` | High-quality example content |
| FailurePattern | `failure_patterns` | Detected recurring failure patterns |
| ImprovementTrajectory | `improvement_trajectories` | Score trend tracking over time |
| DriftBaseline | `drift_baselines` | Baseline scores for drift detection |
| DriftEvent | `drift_events` | Detected drift from baseline |
| FranchiseEvaluationAggregate | `franchise_eval_aggregates` | Periodic franchise-level rollups |

---

## Demo Data

The production database is seeded with **Peppa Pig** franchise data:

- **74 characters** across 14 species families (Pigs, Rabbits, Sheep, Cats, Dogs, Ponies, Zebras, Elephants, Donkeys, Foxes, Kangaroos, Wolves, Gazelles, Giraffes)
- **5 main characters** with rich curated canon packs (Peppa, George, Mummy, Daddy, Suzy)
- **10 supporting characters** with detailed enrichment data (Granny/Grandpa Pig, Rebecca Rabbit, Danny Dog, Pedro Pony, Emily Elephant, Candy Cat, Zoe Zebra, Freddy Fox, Delphine Donkey)
- **59 remaining characters** with role-based generated data
- **5 critics**: Canon Fidelity, Voice Consistency, Safety & Brand, Relationship Accuracy, Legal Compliance
- **50+ evaluation runs** with critic scores and results
- **8+ test suites** with test cases
- **Agent certifications**, consent records, taxonomy, exemplars, improvement trajectories, failure patterns

---

## In-App Documentation

The application includes a comprehensive **User Manual** accessible at `/manual` after login. It covers:

- Getting Started guide (5 steps)
- Core Concepts (Character Cards, 5-Pack System, Critics, Evaluation Profiles)
- Complete Evaluation Pipeline walkthrough
- Feature-by-feature guide for all 14 pages
- Decision categories and scoring thresholds
- Agent Certification tiers and lifecycle
- Improvement Flywheel (failure patterns, trajectories)
- Taxonomy System usage
- Exemplar Library management
- APM SDK integration guide
- C2PA Content Provenance
- Best Practices (writing cards, tuning critics, building test suites)
- Troubleshooting guide
- Glossary of terms

---

## Known Issues & Notes

- **PostgreSQL vs SQLite:** The backend auto-detects the database type. Some datetime handling differs between asyncpg (PostgreSQL) and aiosqlite (SQLite). The `utcnow()` helper in `models/core.py` uses naive datetimes for asyncpg compatibility.
- **Cloud Run cold starts:** With `min-instances=0`, the first request after idle may take 5-10 seconds as the container starts.
- **CORS:** The backend `ALLOWED_ORIGINS` env var must include all frontend domains (comma-separated).
- **Seed scripts:** The local seed scripts (`seed_peppa.py`, `seed_enhance.py`, `seed_all_characters.py`) reference external JSON files in `/Users/lakehouse/s220284/eaas/scripts/` and are not portable. For production seeding, temporary API endpoints were used.

---

## License

Proprietary. All rights reserved.
