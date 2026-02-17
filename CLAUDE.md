# CLAUDE.md — AI Assistant Continuity Guide

This file helps AI assistants (Claude, etc.) quickly understand and continue work on this project.

## Project Identity

- **Name:** CanonSafe V2
- **Purpose:** Character IP governance platform — manages, evaluates, and certifies AI-generated character content across all modalities (text, image, video, audio)
- **Owner:** s220284@gmail.com
- **GitHub:** https://github.com/s220284/canonsafe-v2
- **Patent Repo:** https://github.com/s220284/eaas (method patent + provisional patent)

## Current State (as of 2026-02-14)

### What's Working

- Full-stack app is deployed and functional
- Frontend: Vercel at https://frontend-beta-ten-75.vercel.app
- Backend: Cloud Run at https://canonsafe-v2-516559856008.us-east1.run.app
- Database: Cloud SQL PostgreSQL at `tpgpt-prod:us-east1:tpg-intel-db`, database `canonsafe`
- Login: `s220284@gmail.com` / `canonsafe2024`
- 74 Peppa Pig characters seeded with rich 5-pack data
- 24 frontend pages functional
- 24 backend route modules (22 API routers + health + seed templates)
- 31 SQLAlchemy models
- 17 service modules
- User Manual at /manual is comprehensive (1,700+ lines)
- CI/CD: GitHub Actions deploys backend on push to main (requires GCP_SA_KEY secret)

### Patent Applications

Both patents are in the `eaas` repo (`/Users/lakehouse/s220284/eaas/docs/`):

| Document | File | Claims | Figures | Size |
|----------|------|--------|---------|------|
| Method Patent | `PATENT_APPLICATION.md` | 42 (4 independent + 38 dependent) | 20 | ~90KB |
| Provisional Patent | `PROVISIONAL_PATENT_APPLICATION.md` | 50 | 20 | ~150KB |

Both patents cover all 16 capabilities implemented in the codebase:
1. 5-Pack Character Card (canon, legal, safety, visual identity, audio identity)
2. Multi-Modal Evaluation Engine (text, image, video, audio)
3. Configurable Critics Framework (pluggable, weighted, per-org/franchise/character)
4. Performer Consent Scope Verification (temporal, territorial, modality, usage, strike)
5. Agentic Pipeline Middleware (SDK, sidecar, webhook, gateway filter)
6. Continuous Improvement Flywheel (failure patterns, rubric refinement, trajectories)
7. Franchise-Level Evaluation (cross-character consistency, health dashboard)
8. Scale Architecture (tiered eval, sampling, queue-based, distributed)
9. Certification and Compliance Reporting (two-tier, 90-day expiry)
10. Taxonomy-Driven Configuration (hierarchical categories, tags with rules)
11. Inter-Critic Agreement & Judge Bias Mitigation (multi-provider parallel execution)
12. A/B Experimentation Framework (z-test, t-test, statistical significance)
13. Adversarial Robustness Testing (5 attack categories, resilience scoring)
14. CI/CD Pipeline Integration (GitHub Actions workflows, batch eval gates)
15. Evaluation Cost Monitoring (per-critic token/cost tracking, analytics)
16. Webhook Event System (HMAC-SHA256 signing, auto-deactivation)

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
SECRET_KEY      <- GCP Secret: canonsafe-secret-key
DB_PASS         <- GCP Secret: DB_PASSWORD
OPENAI_API_KEY  <- GCP Secret: OPENAI_API_KEY
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
  --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=DB_PASSWORD:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" \
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

## File Map — Complete Inventory

### Backend Routes (`backend/app/api/routes/`)

| File | Prefix | What It Does |
|------|--------|-------------|
| `auth.py` | `/api/auth` | User registration, login, current user |
| `characters.py` | `/api/characters` | Character CRUD, versions, publishing |
| `critics.py` | `/api/critics` | Critic registry, configs, evaluation profiles |
| `evaluations.py` | `/api/evaluations` | Evaluation engine, run history, cost summary |
| `compare.py` | `/api/compare` | Pairwise comparison of runs, characters, versions |
| `franchises.py` | `/api/franchises` | Franchise CRUD and health metrics |
| `taxonomy.py` | `/api/taxonomy` | Taxonomy categories and tags |
| `test_suites.py` | `/api/test-suites` | Test suite and test case CRUD |
| `certifications.py` | `/api/certifications` | Agent certification workflow |
| `consent.py` | `/api/consent` | Consent verification and performer consent |
| `improvement.py` | `/api/improvement` | Failure patterns, improvement trajectories |
| `exemplars.py` | `/api/exemplars` | Exemplar library for high-scoring content |
| `apm.py` | `/api/apm` | Agentic Pipeline Middleware (evaluate + enforce) |
| `reviews.py` | `/api/reviews` | Human-in-the-loop review queue |
| `webhooks.py` | `/api/webhooks` | Webhook subscriptions and event notifications |
| `export.py` | `/api/export` | CSV/JSON data export |
| `drift.py` | `/api/drift` | Drift detection baselines and events |
| `red_team.py` | `/api/red-team` | Adversarial red-teaming sessions |
| `test_gen.py` | `/api/test-gen` | Knowledge graph test data generation |
| `ab_testing.py` | `/api/ab-testing` | A/B testing experiments |
| `ci.py` | `/api/ci` | CI/CD integration endpoints |
| `judges.py` | `/api/judges` | Custom judge model registry |
| `multimodal.py` | `/api/multimodal` | Multi-modal evaluation (image, audio, video) |
| `health.py` | `/api` | Service health check |

### Backend Services (`backend/app/services/`)

| File | What It Does |
|------|-------------|
| `character_service.py` | Character Card CRUD with versioning and 5-pack management |
| `evaluation_service.py` | Core evaluation engine: multi-critic, multi-modal, tiered, sampled |
| `certification_service.py` | Agent certification via test suites with 90-day expiry |
| `critic_service.py` | Critics framework, registry, dynamic prompt assembly from Card data |
| `franchise_service.py` | Franchise management, cross-character consistency, health scores |
| `test_suite_service.py` | Test suite management for agent certification |
| `consent_service.py` | Performer consent verification (5 checks + strike clause) |
| `exemplar_service.py` | Curated library of high-scoring content artifacts |
| `improvement_service.py` | Continuous improvement: failure patterns, trajectories |
| `judge_registry_service.py` | Custom judge registry with health monitoring |
| `multimodal_service.py` | Image (GPT-4o vision), audio, video evaluation |
| `red_team_service.py` | Adversarial testing: 5 attack categories, resilience scoring |
| `review_service.py` | HITL review queue: claim, examine, resolve with audit trail |
| `taxonomy_service.py` | Hierarchical taxonomy for evaluation configuration |
| `test_gen_service.py` | LLM-generated test cases from character knowledge graphs |
| `webhook_service.py` | HMAC-SHA256 signed webhooks with auto-deactivation |
| `ab_testing_service.py` | A/B experiments with z-test/t-test statistical significance |

### Backend Core Files

| File | What It Does |
|------|-------------|
| `backend/app/main.py` | FastAPI app, all 24 router registrations |
| `backend/app/core/config.py` | All env vars and settings (Pydantic BaseSettings) |
| `backend/app/core/database.py` | Engine creation, `init_db()` with migrations |
| `backend/app/core/llm.py` | LLM adapter: OpenAI + Anthropic, multi-provider bias mitigation |
| `backend/app/models/core.py` | All 31 SQLAlchemy models |

### Frontend Pages (`frontend/src/pages/`)

| File | Route | What It Does |
|------|-------|-------------|
| `Login.jsx` | `/login` | Authentication (login + registration) |
| `Dashboard.jsx` | `/` | Overview dashboard with stats |
| `Characters.jsx` | `/characters` | Character grid with search/filter/sort |
| `CharacterWorkspace.jsx` | `/characters/:id` | 5-Pack viewer (canon, legal, safety, visual, audio) |
| `Franchises.jsx` | `/franchises` | Franchise management |
| `FranchiseHealth.jsx` | `/franchises/:id/health` | Franchise evaluation health metrics |
| `Critics.jsx` | `/critics` | Critic registry, config, evaluation profiles |
| `Evaluations.jsx` | `/evaluations` | Live evaluation runner and history |
| `Compare.jsx` | `/compare` | Pairwise comparison (runs, characters, versions) |
| `ReviewQueue.jsx` | `/reviews` | HITL review items and resolution |
| `TestSuites.jsx` | `/test-suites` | Test suite and case management |
| `Certifications.jsx` | `/certifications` | Agent certification records |
| `Taxonomy.jsx` | `/taxonomy` | Taxonomy categories and tags editor |
| `Exemplars.jsx` | `/exemplars` | Exemplar content library |
| `DriftMonitor.jsx` | `/drift` | Drift detection baselines and events |
| `Improvement.jsx` | `/improvement` | Failure patterns, improvement trajectories |
| `APM.jsx` | `/apm` | Agentic Pipeline Middleware interface |
| `RedTeam.jsx` | `/red-team` | Adversarial red-teaming interface |
| `ABTesting.jsx` | `/ab-testing` | A/B experiment creation and results |
| `Judges.jsx` | `/judges` | Custom judge registry management |
| `MultiModal.jsx` | `/multimodal` | Multi-modal evaluation (image, audio, video) |
| `Consent.jsx` | `/consent` | Performer consent verification |
| `Settings.jsx` | `/settings` | Application settings |
| `UserManual.jsx` | `/manual` | In-app documentation (1,700+ lines) |

### Frontend Core Files

| File | What It Does |
|------|-------------|
| `frontend/src/App.jsx` | All 25 route definitions |
| `frontend/src/components/Layout.jsx` | Persistent sidebar navigation |
| `frontend/src/contexts/AuthContext.jsx` | JWT auth state |
| `frontend/src/services/api.js` | Axios instance with auth interceptor |

## Data Model — 31 SQLAlchemy Models

### Core Models
`Organization`, `User`, `Franchise`, `CharacterCard`, `CardVersion`

### Evaluation Models
`EvalRun`, `EvalResult`, `CriticResult`, `Critic`, `CriticConfiguration`, `EvaluationProfile`

### Certification & Testing
`AgentCertification`, `TestSuite`, `TestCase`

### Quality Assurance
`FailurePattern`, `ImprovementTrajectory`, `ExemplarContent`, `ConsentVerification`

### Advanced Features
`ABExperiment`, `ABTrialRun`, `RedTeamSession`, `CustomJudge`, `ReviewItem`

### Infrastructure
`WebhookSubscription`, `WebhookDelivery`, `DriftBaseline`, `DriftEvent`, `TaxonomyCategory`, `TaxonomyTag`, `FranchiseEvaluationAggregate`

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

## Key Evaluation Architecture Details

### Evaluation Pipeline (evaluation_service.py)
- **Policy actions**: pass (>=0.9), regenerate (0.7-0.89), quarantine (0.5-0.69), escalate (0.3-0.49), block (<0.3)
- **Tiered evaluation**: rapid_screen → full eval for borderline cases
- **Sampling**: configurable rate, "sampled-pass" status for high-volume
- **Inter-critic agreement**: std deviation normalization, flags disagreement when σ > 0.3
- **Cost tracking**: per-critic prompt_tokens, completion_tokens, estimated_cost

### Multi-Provider Bias Mitigation (core/llm.py)
- `call_both_llms_json()` runs OpenAI + Anthropic in parallel
- Averages scores, combines reasoning, flags judge_disagreement when delta > 0.3

### A/B Testing (ab_testing_service.py)
- Two-sample z-test for pass rate proportions
- Welch's t-test for score means (unequal variances)
- Abramowitz & Stegun CDF approximation for p-values

### Red-Teaming (red_team_service.py)
- 5 attack categories: persona_break, knowledge_probe, safety_bypass, boundary_test, context_manipulation
- LLM-generated adversarial probes from character profile data
- Resilience score = 1.0 - (successful_attacks / total_probes)

### Drift Detection (drift baselines + events)
- Z-score computation against baseline mean/std_dev
- Severity: info (z<1), warning (1-2), high (2-3), critical (z>=3)

### Webhooks (webhook_service.py)
- HMAC-SHA256 payload signing with per-subscription secrets
- X-Webhook-Signature header
- Auto-deactivation after 5 consecutive delivery failures

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
| Secret: OpenAI API Key | `OPENAI_API_KEY` |
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
cd backend && gcloud run deploy canonsafe-v2 --source . --project tpgpt-prod --region us-east1 --allow-unauthenticated --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=DB_PASSWORD:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=tpgpt-prod:us-east1:tpg-intel-db||DB_USER=postgres||DB_NAME=canonsafe||ALLOWED_ORIGINS=https://frontend-beta-ten-75.vercel.app,http://localhost:3000,http://localhost:5173" --add-cloudsql-instances=tpgpt-prod:us-east1:tpg-intel-db --memory=512Mi --cpu=1 --min-instances=0 --max-instances=3 --timeout=300
```

### Check deployment logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=canonsafe-v2" --project tpgpt-prod --limit=30 --format="value(textPayload)"
```

### Update patents

Both patents live in `/Users/lakehouse/s220284/eaas/docs/`. When adding new features to the codebase, update the corresponding patent sections:
- `PATENT_APPLICATION.md` — Method patent (42 claims, sections I-X)
- `PROVISIONAL_PATENT_APPLICATION.md` — Provisional patent (50 claims, full specification)
