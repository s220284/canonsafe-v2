# CanonSafe V2

**Character IP Governance Platform** — Evaluate, certify, and continuously govern AI-generated character content across text, image, video, and audio modalities.

CanonSafe is the "Character Trust Layer" — middleware between AI platforms and character IP that enables studios, game publishers, toy companies, and consumer brands to control how autonomous AI agents portray their licensed characters.

## Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | https://frontend-beta-ten-75.vercel.app |
| **Backend API** | https://canonsafe-v2-516559856008.us-east1.run.app |
| **API Docs** | https://canonsafe-v2-516559856008.us-east1.run.app/api/docs |

**Demo credentials:** `s220284@gmail.com` / `canonsafe2024`

## Repositories

| Repo | Purpose | Status |
|------|---------|--------|
| **[canonsafe-v2](https://github.com/s220284/canonsafe-v2)** (this repo) | Production app (FastAPI + React) | Active |
| **[eaas](https://github.com/s220284/eaas)** | Patent applications (42-claim method + 50-claim provisional) | Active |

---

## Platform Capabilities

### Core Evaluation
1. **5-Pack Character Card** — Structured IP profile (canon, legal, safety, visual identity, audio identity) as evaluation reference standard
2. **Multi-Modal Evaluation** — Text, image (GPT-4o vision), video, audio with modality-specific judge models
3. **Configurable Critics Framework** — Pluggable critics with dynamic prompt assembly from Character Card data
4. **Performer Consent Verification** — Hard gate checking temporal, territorial, modality, usage, and strike clause scope

### Governance & Middleware
5. **Agentic Pipeline Middleware (APM)** — Real-time evaluation within agent pipelines: pass, regenerate, quarantine, escalate, block
6. **Franchise-Level Evaluation** — Cross-character consistency, world-building consistency, franchise health dashboard
7. **Certification System** — Two-tier (base + CanonSafe Certified) with 90-day expiry and test suite execution
8. **Taxonomy-Driven Configuration** — Hierarchical categories and tags with evaluation rules and severity levels

### Quality Assurance
9. **Judge Bias Mitigation** — Multi-provider parallel execution (OpenAI + Anthropic) with inter-critic agreement analysis
10. **A/B Experimentation** — Controlled experiments with z-test and Welch's t-test statistical significance
11. **Adversarial Red-Teaming** — 5 attack categories with LLM-generated probes and resilience scoring
12. **Statistical Drift Detection** — Z-score analysis against computed baselines with severity classification

### Operations
13. **Cost Monitoring** — Per-critic token tracking, per-model pricing, cost analytics
14. **CI/CD Integration** — GitHub Actions workflows, batch evaluation triggers, automated deployment gates
15. **Webhook Events** — HMAC-SHA256 signed notifications with auto-deactivation
16. **Continuous Improvement Flywheel** — Failure pattern detection, rubric refinement, agent feedback, improvement trajectories

---

## How It Works

```
IP Owner defines Character Card (5-pack)
         │
         ▼
AI Agent generates content (any modality)
         │
         ▼
CanonSafe evaluates against Character Card
  ├─ Canon Fidelity Critic
  ├─ Voice Consistency Critic
  ├─ Brand Safety Critic
  ├─ Legal Compliance Critic
  ├─ Visual Identity Critic (images/video)
  ├─ Audio Identity Critic (audio/video)
  └─ Custom Critics (configurable)
         │
         ▼
Policy Action: pass │ regenerate │ quarantine │ escalate │ block
         │
         ▼
Results stored, webhooks fired, HITL review if needed
```

The Character Card is used exclusively as an **evaluation reference standard** — it is never provided to content-generating models.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React 18 + Vite + Tailwind CSS)              │
│  24 pages · Hosted on Vercel                            │
│  https://frontend-beta-ten-75.vercel.app                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (CORS)
┌────────────────────────▼────────────────────────────────┐
│  Backend (FastAPI + SQLAlchemy async)                    │
│  24 route modules · 17 services · 31 models             │
│  Hosted on Google Cloud Run                             │
│  https://canonsafe-v2-516559856008.us-east1.run.app     │
└────────────────────────┬────────────────────────────────┘
                         │ Unix Socket
┌────────────────────────▼────────────────────────────────┐
│  Database (PostgreSQL 15 via Cloud SQL)                  │
│  31 tables · 74 characters seeded                       │
│  Instance: tpgpt-prod:us-east1:tpg-intel-db             │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | PostgreSQL 15 (Cloud SQL), SQLite (local dev) |
| Auth | JWT tokens (python-jose), bcrypt password hashing |
| LLM | OpenAI (GPT-4o-mini, GPT-4o vision), Anthropic (Claude 3 Haiku) |
| Hosting | Vercel (frontend), Google Cloud Run (backend) |
| CI/CD | GitHub Actions (backend auto-deploy on push to main) |

---

## Project Structure

```
canonsafe-v2/
├── CLAUDE.md                         # AI assistant continuity guide
├── .github/workflows/
│   ├── deploy-backend.yml            # CI/CD for Cloud Run
│   └── canonsafe-eval.yml            # Evaluation workflow template
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                   # FastAPI app, 24 router registrations
│       ├── core/
│       │   ├── config.py             # Pydantic settings
│       │   ├── database.py           # Engine, session, init_db()
│       │   ├── security.py           # JWT + bcrypt
│       │   └── llm.py               # OpenAI + Anthropic adapter, multi-provider bias mitigation
│       ├── models/
│       │   └── core.py              # 31 SQLAlchemy models
│       ├── schemas/                  # 16 Pydantic schema modules
│       ├── services/                 # 17 business logic modules
│       └── api/routes/               # 24 route modules
│           ├── auth.py               # /api/auth — login, register
│           ├── characters.py         # /api/characters — CRUD, versions
│           ├── critics.py            # /api/critics — registry, configs, profiles
│           ├── evaluations.py        # /api/evaluations — eval engine, history
│           ├── compare.py            # /api/compare — pairwise comparison
│           ├── franchises.py         # /api/franchises — CRUD, health
│           ├── taxonomy.py           # /api/taxonomy — categories, tags
│           ├── test_suites.py        # /api/test-suites — suites, cases
│           ├── certifications.py     # /api/certifications — agent certs
│           ├── consent.py            # /api/consent — performer consent
│           ├── improvement.py        # /api/improvement — patterns, trajectories
│           ├── exemplars.py          # /api/exemplars — content library
│           ├── apm.py               # /api/apm — agentic pipeline middleware
│           ├── reviews.py            # /api/reviews — HITL review queue
│           ├── webhooks.py           # /api/webhooks — subscriptions, events
│           ├── export.py             # /api/export — CSV/JSON export
│           ├── drift.py              # /api/drift — baselines, events
│           ├── red_team.py           # /api/red-team — adversarial testing
│           ├── test_gen.py           # /api/test-gen — LLM test generation
│           ├── ab_testing.py         # /api/ab-testing — experiments
│           ├── ci.py                 # /api/ci — CI/CD triggers
│           ├── judges.py             # /api/judges — custom judge registry
│           ├── multimodal.py         # /api/multimodal — image/audio/video eval
│           └── health.py             # /api/health — service health check
│
└── frontend/
    └── src/
        ├── App.jsx                   # 25 route definitions
        ├── contexts/AuthContext.jsx   # JWT auth state
        ├── services/api.js           # Axios instance
        ├── components/Layout.jsx     # Sidebar navigation
        └── pages/                    # 24 page components
            ├── Dashboard.jsx         # Overview stats
            ├── Characters.jsx        # Grid with search/filter/sort
            ├── CharacterWorkspace.jsx # 5-Pack viewer
            ├── Franchises.jsx        # Franchise management
            ├── FranchiseHealth.jsx   # Health metrics
            ├── Critics.jsx           # Critic + profile management
            ├── Evaluations.jsx       # Live eval runner + history
            ├── Compare.jsx           # Pairwise comparison
            ├── ReviewQueue.jsx       # HITL review items
            ├── TestSuites.jsx        # Test suite management
            ├── Certifications.jsx    # Agent certifications
            ├── Taxonomy.jsx          # Categories + tags editor
            ├── Exemplars.jsx         # Exemplar content library
            ├── DriftMonitor.jsx      # Drift detection
            ├── Improvement.jsx       # Failure patterns + trajectories
            ├── APM.jsx               # Agentic Pipeline Middleware
            ├── RedTeam.jsx           # Adversarial red-teaming
            ├── ABTesting.jsx         # A/B experiments
            ├── Judges.jsx            # Custom judge registry
            ├── MultiModal.jsx        # Multi-modal evaluation
            ├── Consent.jsx           # Performer consent
            ├── Settings.jsx          # App settings
            ├── Login.jsx             # Authentication
            └── UserManual.jsx        # In-app docs (1,700+ lines)
```

---

## Data Model (31 Tables)

### Core
| Model | Description |
|-------|-------------|
| `Organization` | Multi-tenant org container |
| `User` | User accounts with RBAC roles |
| `Franchise` | IP franchise (e.g., "Peppa Pig") |
| `CharacterCard` | Character metadata + is_main/is_focus flags |
| `CardVersion` | Immutable 5-pack data (canon, legal, safety, visual, audio) |

### Evaluation
| Model | Description |
|-------|-------------|
| `Critic` | Evaluation critic definitions with prompt templates |
| `CriticConfiguration` | Per-org/franchise/character critic overrides |
| `EvaluationProfile` | Named collections of critics with weights |
| `EvalRun` | Individual evaluation execution records |
| `EvalResult` | Aggregated results per eval run |
| `CriticResult` | Per-critic scores with token consumption and cost |

### Certification & Testing
| Model | Description |
|-------|-------------|
| `AgentCertification` | Agent tier certifications (base / canonsafe_certified) |
| `TestSuite` | Test suite definitions by character |
| `TestCase` | Individual test cases with categories |

### Quality Assurance
| Model | Description |
|-------|-------------|
| `ConsentVerification` | Performer consent tracking and scope checks |
| `ExemplarContent` | Curated high-scoring content library |
| `FailurePattern` | Detected recurring failure patterns |
| `ImprovementTrajectory` | Score trend tracking (improving/stable/degrading) |
| `FranchiseEvaluationAggregate` | Periodic franchise-level metric rollups |

### Advanced Features
| Model | Description |
|-------|-------------|
| `ABExperiment` | A/B testing experiment definitions |
| `ABTrialRun` | Individual trial runs within experiments |
| `RedTeamSession` | Adversarial red-teaming sessions |
| `CustomJudge` | Custom/fine-tuned judge model registry |
| `ReviewItem` | Human-in-the-loop review queue items |

### Infrastructure
| Model | Description |
|-------|-------------|
| `WebhookSubscription` | Webhook event subscriptions |
| `WebhookDelivery` | Webhook delivery history and status |
| `DriftBaseline` | Baseline scores for drift detection |
| `DriftEvent` | Detected drift events with severity |
| `TaxonomyCategory` | Hierarchical classification categories |
| `TaxonomyTag` | Tags with evaluation rules and severity |

---

## The 5-Pack Character Card

Every character has a **Card Version** containing 5 structured data packs:

| Pack | Color | Purpose |
|------|-------|---------|
| **Canon Pack** | Blue | Facts with source citations, voice profile (tone, catchphrases, personality), relationship graph |
| **Legal Pack** | Purple | Rights holder, performer consent (type, scope, territories, restrictions, strike clause), usage restrictions |
| **Safety Pack** | Red | Content rating, prohibited topics with severity, required disclosures, age gating |
| **Visual Identity Pack** | Green | Art style, color palette, species, clothing, distinguishing features |
| **Audio Identity Pack** | Orange | Tone, speech style, catchphrases, emotional range |

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit with your settings
uvicorn app.main:app --reload --port 8000
```

Tables auto-create on startup via `init_db()`.

### Frontend

```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

### Seed Data (Local)

```bash
cd backend
python seed_peppa.py        # 15 priority characters with curated data
python seed_enhance.py      # 10 supporting characters enrichment
python seed_all_characters.py  # remaining 59 characters
```

---

## Production Deployment

### Backend (Google Cloud Run)

| Resource | Value |
|----------|-------|
| GCP Project | `tpgpt-prod` (ID: `516559856008`) |
| Region | `us-east1` |
| Service | `canonsafe-v2` |
| Cloud SQL | `tpgpt-prod:us-east1:tpg-intel-db` / database `canonsafe` |

```bash
cd backend && gcloud run deploy canonsafe-v2 \
  --source . --project tpgpt-prod --region us-east1 \
  --allow-unauthenticated \
  --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=DB_PASSWORD:latest" \
  --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=tpgpt-prod:us-east1:tpg-intel-db||DB_USER=postgres||DB_NAME=canonsafe||ALLOWED_ORIGINS=https://frontend-beta-ten-75.vercel.app,http://localhost:3000,http://localhost:5173" \
  --add-cloudsql-instances=tpgpt-prod:us-east1:tpg-intel-db \
  --memory=512Mi --cpu=1 --min-instances=0 --max-instances=3 --timeout=300
```

**Note:** Use `^||^` separator because `ALLOWED_ORIGINS` contains commas.

CI/CD: Pushes to `main` modifying `backend/**` auto-deploy via GitHub Actions (requires `GCP_SA_KEY` secret).

### Frontend (Vercel)

Auto-deploys on push. Account: `shellypalmers-projects`, env var: `VITE_API_URL=https://canonsafe-v2-516559856008.us-east1.run.app/api`

---

## Demo Data

**74 Peppa Pig characters** across 14 species families:

- **5 main characters** with rich curated canon packs (Peppa, George, Mummy Pig, Daddy Pig, Suzy Sheep)
- **10 supporting characters** with detailed enrichment (Granny/Grandpa Pig, Rebecca Rabbit, Danny Dog, Pedro Pony, Emily Elephant, Candy Cat, Zoe Zebra, Freddy Fox, Delphine Donkey)
- **59 remaining characters** with role-based generated data
- **5 critics**, 50+ evaluation runs, 8+ test suites, certifications, consent records, taxonomy, exemplars, improvement trajectories, failure patterns

---

## Known Issues

- **PostgreSQL vs SQLite:** `utcnow()` in `models/core.py` uses naive datetimes for asyncpg compatibility
- **Cloud Run cold starts:** With `min-instances=0`, first request after idle takes 5-10s
- **Local seed scripts:** Reference files in `/Users/lakehouse/s220284/eaas/scripts/` — not portable. Production uses temporary API endpoint pattern (see CLAUDE.md)

---

## License

Proprietary. All rights reserved.

Patent pending — see [eaas/docs](https://github.com/s220284/eaas/tree/main/docs) for method patent (42 claims) and provisional patent (50 claims).

Built by [The Palmer Group](https://www.shellypalmer.com) for the Character Trust Layer initiative.
