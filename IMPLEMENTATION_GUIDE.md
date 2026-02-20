# CanonSafe V2 — Client Implementation & Onboarding Engineering Guide

> **Audience:** Implementation engineers deploying CanonSafe for a new client
> **Scope:** From blank GCP project to production-ready client environment
> **Last updated:** 2026-02-20

---

## Table of Contents

1. [Overview & Prerequisites](#1-overview--prerequisites)
2. [Architecture Reference](#2-architecture-reference)
3. [GCP Infrastructure Setup](#3-gcp-infrastructure-setup)
4. [Backend Deployment](#4-backend-deployment)
5. [Database Initialization](#5-database-initialization)
6. [Frontend Deployment](#6-frontend-deployment)
7. [Authentication Configuration](#7-authentication-configuration)
8. [License Key Management](#8-license-key-management)
9. [Client Organization Setup](#9-client-organization-setup)
10. [Custom Critic Configuration](#10-custom-critic-configuration)
11. [Character Data Loading](#11-character-data-loading)
12. [Integration Patterns](#12-integration-patterns)
13. [Monitoring & Operations](#13-monitoring--operations)
14. [Security Hardening](#14-security-hardening)
15. [Troubleshooting](#15-troubleshooting)
16. [Client Handoff Checklist](#16-client-handoff-checklist)

---

## 1. Overview & Prerequisites

### What Is CanonSafe?

CanonSafe is a **Character IP Governance Platform** that manages, evaluates, and certifies AI-generated character content across all modalities (text, image, video, audio). It provides:

- **5-Pack Character Cards** — canon, legal, safety, visual identity, and audio identity data per character
- **Multi-critic evaluation engine** — configurable LLM-based critics with weighted scoring
- **Franchise-level governance** — cross-character consistency, health dashboards
- **Certification pipeline** — two-tier certification with 90-day expiry
- **Agentic Pipeline Middleware (APM)** — real-time evaluation as SDK, sidecar, or webhook
- **Enterprise features** — A/B testing, red-teaming, drift detection, CI/CD integration, webhooks

### Deployment Model

CanonSafe is a hybrid-delivery product:

| Component | Technology | Hosting |
|-----------|-----------|---------|
| Backend API | Python / FastAPI | Google Cloud Run |
| Database | PostgreSQL 14+ | Google Cloud SQL |
| Frontend | React / Vite | Vercel |
| Secrets | GCP Secret Manager | Google Cloud |
| Container Registry | GCP Artifact Registry | Google Cloud |
| CI/CD | GitHub Actions | GitHub |

### Prerequisites

Before starting, ensure you have:

- [ ] **GCP account** with billing enabled and the `Owner` or `Editor` role on the project
- [ ] **`gcloud` CLI** installed and authenticated (`gcloud auth login`)
- [ ] **Docker** installed locally (for building container images)
- [ ] **Node.js 18+** and **npm** (for frontend builds)
- [ ] **Vercel account** with CLI installed (`npm i -g vercel`)
- [ ] **GitHub access** to the `s220284/canonsafe-v2` repository
- [ ] **OpenAI API key** (for LLM-based evaluation critics)
- [ ] **Domain name** (optional — for custom domains on frontend/backend)
- [ ] The client's **organization name**, **admin email**, and **plan tier** (starter/professional/enterprise)

### Naming Conventions

Throughout this guide, placeholders are marked with angle brackets. Replace them with actual values:

| Placeholder | Example | Description |
|-------------|---------|-------------|
| `<PROJECT_ID>` | `acme-prod` | GCP project ID |
| `<REGION>` | `us-east1` | GCP region |
| `<INSTANCE_NAME>` | `acme-canonsafe-db` | Cloud SQL instance name |
| `<DB_NAME>` | `canonsafe` | PostgreSQL database name |
| `<SERVICE_NAME>` | `canonsafe-v2` | Cloud Run service name |
| `<REPO_NAME>` | `canonsafe-repo` | Artifact Registry repository |
| `<FRONTEND_URL>` | `https://acme-canonsafe.vercel.app` | Vercel deployment URL |
| `<BACKEND_URL>` | `https://canonsafe-v2-123456.us-east1.run.app` | Cloud Run service URL |
| `<CLIENT_ORG>` | `Acme Studios` | Client organization name |
| `<CLIENT_EMAIL>` | `admin@acme.com` | Client admin email |

---

## 2. Architecture Reference

### System Diagram

```
┌─────────────┐     HTTPS      ┌──────────────────┐     Unix Socket    ┌──────────────┐
│   Browser    │ ──────────────→│   Cloud Run       │ ─────────────────→│  Cloud SQL   │
│  (React SPA) │               │   (FastAPI)       │                    │  PostgreSQL  │
│   on Vercel  │←──────────────│   Port 8080       │←─────────────────  │              │
└─────────────┘    JSON API    └──────────────────┘                    └──────────────┘
                                       │
                                       │ HTTPS
                                       ▼
                               ┌──────────────────┐
                               │   OpenAI API      │
                               │   (GPT-4o)        │
                               │   Anthropic API   │
                               │   (Claude)        │
                               └──────────────────┘
```

### Component Map

```
canonsafe-v2/
├── backend/
│   ├── Dockerfile                    # Python 3.11-slim container
│   ├── requirements.txt              # 20 Python dependencies
│   ├── app/
│   │   ├── main.py                   # FastAPI app + 29 router registrations
│   │   ├── core/
│   │   │   ├── config.py             # All env vars (Pydantic BaseSettings)
│   │   │   ├── database.py           # Engine, sessions, init_db() migrations
│   │   │   ├── auth.py               # JWT creation/verification, password hashing
│   │   │   ├── rbac.py               # Role-based access: require_admin, require_viewer
│   │   │   ├── llm.py                # OpenAI + Anthropic adapter, bias mitigation
│   │   │   ├── seed_starwars.py      # Star Wars demo data (15 chars, 5 critics)
│   │   │   └── seed_disney_princess.py # Disney Princess demo data (12 chars, 5 critics)
│   │   ├── api/routes/               # 29 route modules
│   │   ├── models/core.py            # 31 SQLAlchemy models
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   └── services/                 # 17 service modules
│   └── .env.example                  # Environment variable template
├── frontend/
│   ├── package.json
│   ├── vite.config.js                # Dev proxy: /api → localhost:8000
│   ├── vercel.json                   # SPA rewrite rules + cache headers
│   └── src/
│       ├── App.jsx                   # 25+ route definitions
│       ├── components/Layout.jsx     # Sidebar navigation
│       ├── contexts/AuthContext.jsx   # JWT auth state
│       ├── services/api.js           # Axios + auth interceptor
│       └── pages/                    # 24 page components
├── deploy.sh                         # Automated deployment script
├── .github/workflows/
│   └── deploy-backend.yml            # CI/CD: auto-deploy on push to main
├── CLAUDE.md                         # AI assistant continuity guide
└── IMPLEMENTATION_GUIDE.md           # This document
```

### Data Flow

1. **User authenticates** → Frontend sends `POST /api/auth/login` with form data → Backend returns JWT
2. **Frontend stores JWT** in `localStorage`, attaches as `Authorization: Bearer {token}` header
3. **All API calls** go through the Axios interceptor in `api.js` which adds the auth header
4. **Evaluation flow** → Frontend sends content + character ID → Backend loads 5-Pack data → Critics evaluate via LLM → Scores returned with policy decision
5. **Database URL** is constructed dynamically at startup:
   - If `DATABASE_URL` starts with `postgresql` → use directly
   - If `CLOUD_SQL_CONNECTION_NAME` is set → build URL with unix socket path
   - Otherwise → default to SQLite (local dev)

---

## 3. GCP Infrastructure Setup

### 3.1 Create or Select a GCP Project

```bash
# Create a new project (or use an existing one)
gcloud projects create <PROJECT_ID> --name="<CLIENT_ORG> CanonSafe"

# Set as active project
gcloud config set project <PROJECT_ID>
gcloud config set run/region <REGION>
```

### 3.2 Enable Required APIs

```bash
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    --project=<PROJECT_ID>
```

### 3.3 Create Cloud SQL PostgreSQL Instance

> **Note:** If the client is sharing an existing Cloud SQL instance, skip to step 3.4.

```bash
gcloud sql instances create <INSTANCE_NAME> \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=<REGION> \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --availability-type=zonal \
    --project=<PROJECT_ID>
```

Set the postgres password:

```bash
gcloud sql users set-password postgres \
    --instance=<INSTANCE_NAME> \
    --password="<STRONG_DB_PASSWORD>" \
    --project=<PROJECT_ID>
```

### 3.4 Create the Database

```bash
gcloud sql databases create <DB_NAME> \
    --instance=<INSTANCE_NAME> \
    --project=<PROJECT_ID>
```

### 3.5 Create Artifact Registry Repository

```bash
gcloud artifacts repositories create <REPO_NAME> \
    --repository-format=docker \
    --location=<REGION> \
    --project=<PROJECT_ID>

# Configure Docker to use Artifact Registry
gcloud auth configure-docker <REGION>-docker.pkg.dev --quiet
```

### 3.6 Create Secrets in Secret Manager

Three secrets are required:

```bash
# 1. Application secret key (for JWT signing)
openssl rand -hex 32 | gcloud secrets create canonsafe-secret-key \
    --data-file=- \
    --project=<PROJECT_ID>

# 2. Database password
echo -n "<STRONG_DB_PASSWORD>" | gcloud secrets create canonsafe-db-password \
    --data-file=- \
    --project=<PROJECT_ID>

# 3. OpenAI API key
echo -n "<OPENAI_API_KEY>" | gcloud secrets create OPENAI_API_KEY \
    --data-file=- \
    --project=<PROJECT_ID>
```

### 3.7 Grant Secret Access to Cloud Run Service Account

The default compute service account needs access to read secrets:

```bash
# Get the project number
PROJECT_NUMBER=$(gcloud projects describe <PROJECT_ID> --format="value(projectNumber)")

# Grant access for each secret
for SECRET in canonsafe-secret-key canonsafe-db-password OPENAI_API_KEY; do
    gcloud secrets add-iam-policy-binding ${SECRET} \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --project=<PROJECT_ID>
done
```

### 3.8 Grant Cloud SQL Access

```bash
# The Cloud Run service account needs Cloud SQL Client role
gcloud projects add-iam-policy-binding <PROJECT_ID> \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/cloudsql.client"
```

---

## 4. Backend Deployment

### 4.1 Dockerfile Overview

The backend uses Python 3.11-slim with these key characteristics:

- **Port:** 8080 (Cloud Run default)
- **WSGI:** Uvicorn with 2 async workers
- **System deps:** `gcc`, `libpq-dev` (PostgreSQL), `curl` (health checks)
- **Non-root user:** `appuser` (UID 1000)

### 4.2 Build and Push the Docker Image

```bash
# Set image tag
IMAGE_TAG="<REGION>-docker.pkg.dev/<PROJECT_ID>/<REPO_NAME>/<SERVICE_NAME>:$(git rev-parse --short HEAD)"

# Build
docker build -t ${IMAGE_TAG} ./backend

# Push to Artifact Registry
docker push ${IMAGE_TAG}
```

### 4.3 Deploy to Cloud Run

**This is the canonical deploy command.** Note the `^||^` separator — this is required because `ALLOWED_ORIGINS` contains commas, and Cloud Run's `--set-env-vars` uses commas as delimiters by default. The `^||^` prefix tells gcloud to use `||` as the separator instead.

```bash
gcloud run deploy <SERVICE_NAME> \
    --image="${IMAGE_TAG}" \
    --region=<REGION> \
    --project=<PROJECT_ID> \
    --platform=managed \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --min-instances=0 \
    --port=8080 \
    --set-cloudsql-instances="<PROJECT_ID>:<REGION>:<INSTANCE_NAME>" \
    --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=<PROJECT_ID>:<REGION>:<INSTANCE_NAME>||DB_USER=postgres||DB_NAME=<DB_NAME>||ALLOWED_ORIGINS=<FRONTEND_URL>,http://localhost:3000,http://localhost:5173||DEBUG=false||ALLOW_PUBLIC_REGISTRATION=false||FRONTEND_URL=<FRONTEND_URL>" \
    --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=canonsafe-db-password:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest"
```

> **Critical:** The secret mapping uses `DB_PASS` as the env var name (not `DATABASE_URL`). The `config.py` reads `DB_PASS` and `database.py` builds the full connection string dynamically. Mapping `DATABASE_URL` directly to the password secret will break the app.

### 4.4 Source-Based Deploy (Alternative)

If you don't want to build Docker images locally, use `--source` to let Cloud Build handle it:

```bash
cd backend && gcloud run deploy <SERVICE_NAME> \
    --source . \
    --project=<PROJECT_ID> \
    --region=<REGION> \
    --allow-unauthenticated \
    --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=canonsafe-db-password:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" \
    --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=<PROJECT_ID>:<REGION>:<INSTANCE_NAME>||DB_USER=postgres||DB_NAME=<DB_NAME>||ALLOWED_ORIGINS=<FRONTEND_URL>,http://localhost:3000,http://localhost:5173||DEBUG=false" \
    --add-cloudsql-instances=<PROJECT_ID>:<REGION>:<INSTANCE_NAME> \
    --memory=512Mi --cpu=1 --min-instances=0 --max-instances=10 --timeout=300
```

### 4.5 Verify Deployment

```bash
# Get the service URL
BACKEND_URL=$(gcloud run services describe <SERVICE_NAME> \
    --region=<REGION> \
    --project=<PROJECT_ID> \
    --format="value(status.url)")

echo "Backend URL: ${BACKEND_URL}"

# Health check
curl -sf "${BACKEND_URL}/api/health"
# Expected: {"status":"healthy","version":"2.0.0"}

# Check API docs
echo "API Docs: ${BACKEND_URL}/api/docs"
```

### 4.6 Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLOUD_SQL_CONNECTION_NAME` | Production | `None` | Cloud SQL connection string (e.g., `project:region:instance`) |
| `DB_USER` | Production | `postgres` | Database username |
| `DB_PASS` | Production | `None` | Database password (via Secret Manager) |
| `DB_NAME` | Production | `canonsafe` | Database name |
| `DATABASE_URL` | Local dev | `sqlite+aiosqlite:///./canonsafe.db` | Full database URL (overrides Cloud SQL settings) |
| `SECRET_KEY` | Yes | `dev-secret-key...` | JWT signing key (via Secret Manager) |
| `OPENAI_API_KEY` | For evals | `None` | OpenAI API key (via Secret Manager) |
| `ANTHROPIC_API_KEY` | Optional | `None` | Anthropic API key for dual-provider evaluation |
| `PRIMARY_LLM` | No | `openai` | Primary LLM provider (`openai` or `anthropic`) |
| `ALLOWED_ORIGINS` | Yes | `localhost:3000,localhost:5173` | Comma-separated CORS origins |
| `ALLOW_PUBLIC_REGISTRATION` | No | `True` | Enable/disable self-service registration |
| `FRONTEND_URL` | No | `http://localhost:5173` | Frontend URL (for email links, OAuth redirects) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` (24h) | JWT token lifetime |
| `DEBUG` | No | `True` | Enable debug logging (set `false` in production) |
| `DEFAULT_SAMPLING_RATE` | No | `1.0` | Evaluation sampling rate (1.0 = evaluate 100%) |
| `RAPID_SCREEN_THRESHOLD` | No | `0.7` | Score threshold for rapid screening pass |
| `DEEP_EVAL_THRESHOLD` | No | `0.9` | Score threshold for deep evaluation pass |
| `GOOGLE_CLIENT_ID` | For OAuth | `None` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For OAuth | `None` | Google OAuth client secret |
| `SMTP_HOST` | For email | `None` | SMTP server hostname |
| `SMTP_PORT` | For email | `587` | SMTP server port |
| `SMTP_USER` | For email | `None` | SMTP username |
| `SMTP_PASSWORD` | For email | `None` | SMTP password |
| `FROM_EMAIL` | For email | `noreply@canonsafe.com` | From address for outgoing emails |

---

## 5. Database Initialization

### 5.1 How Schema Creation Works

CanonSafe does **not** use Alembic migration files. Instead, the `init_db()` function in `database.py` runs automatically on every application startup (via FastAPI's `lifespan` event). It:

1. Calls `Base.metadata.create_all()` — creates all 31 tables if they don't exist
2. Runs idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations for schema evolution
3. Bootstraps platform accounts (super-admin users, demo organizations)
4. Seeds demo client data (Disney/Star Wars, Disney Princess)

This means **the first deploy automatically creates the full schema**. No manual migration steps needed.

### 5.2 PostgreSQL Compatibility Gotchas

These are critical production issues that have been fixed but can resurface:

| Issue | Problem | Solution |
|-------|---------|----------|
| **Transaction isolation** | PostgreSQL aborts the entire transaction on error. `ALTER TABLE ADD COLUMN` on an existing column kills the transaction. | Always use `ADD COLUMN IF NOT EXISTS`. Run each migration in its own `async with engine.begin()` block. |
| **Datetime timezone** | `asyncpg` requires naive datetimes for `TIMESTAMP` columns. | Use `datetime.utcnow()`, never `datetime.now(timezone.utc)`. |
| **Boolean values** | PostgreSQL uses `true/false`, SQLite uses `0/1`. | The migration code handles both with conditional branches (`if is_postgres`). |

### 5.3 Adding New Columns

When you need to add a column to an existing model:

1. Add the column to the model in `backend/app/models/core.py`
2. Add an idempotent migration block in `database.py`'s `init_db()`:

```python
# In init_db(), after existing migrations:
async with engine.begin() as conn:
    if is_postgres:
        try:
            await conn.execute(text(
                "ALTER TABLE <table_name> ADD COLUMN IF NOT EXISTS <col_name> <col_type>"
            ))
        except Exception:
            pass
    else:
        try:
            await conn.execute(text(
                "ALTER TABLE <table_name> ADD COLUMN <col_name> <col_type>"
            ))
        except Exception:
            pass  # column already exists (SQLite has no IF NOT EXISTS)
```

3. Redeploy. The migration runs on next startup.

### 5.4 Verifying Database State

Connect to Cloud SQL via the proxy to inspect the database directly:

```bash
# Install Cloud SQL Proxy (if not installed)
# https://cloud.google.com/sql/docs/postgres/connect-instance-auth-proxy

# Start proxy
cloud-sql-proxy <PROJECT_ID>:<REGION>:<INSTANCE_NAME> --port=5432

# Connect with psql (in another terminal)
psql "host=127.0.0.1 port=5432 dbname=<DB_NAME> user=postgres password=<DB_PASSWORD>"

# Useful queries:
\dt                                    -- List all tables
SELECT count(*) FROM organizations;    -- Count orgs
SELECT count(*) FROM users;            -- Count users
SELECT count(*) FROM character_cards;  -- Count characters
SELECT name, slug FROM franchises;     -- List franchises
```

---

## 6. Frontend Deployment

### 6.1 Build Configuration

The frontend is a React SPA built with Vite. The critical environment variable is:

```
VITE_API_URL=<BACKEND_URL>/api
```

This must be set **at build time** (Vite embeds env vars during the build process; they are not read at runtime).

### 6.2 Deploy to Vercel

#### Option A: Vercel CLI

```bash
cd frontend

# Build with production API URL
VITE_API_URL="<BACKEND_URL>/api" npm run build

# Deploy
vercel --prod
```

#### Option B: Vercel Dashboard

1. Import the GitHub repository in Vercel
2. Set the **Root Directory** to `frontend`
3. Set **Build Command** to `npm run build`
4. Set **Output Directory** to `dist`
5. Add environment variable: `VITE_API_URL` = `<BACKEND_URL>/api`
6. Deploy

### 6.3 Vercel Configuration

The `frontend/vercel.json` handles SPA routing and asset caching:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

The rewrite rule ensures all routes (e.g., `/characters`, `/evaluations`) serve `index.html`, letting React Router handle client-side routing.

### 6.4 Custom Domain Setup (Vercel)

1. In the Vercel dashboard, go to **Project Settings → Domains**
2. Add the custom domain (e.g., `canonsafe.acme.com`)
3. Vercel provides DNS records to configure:
   - **CNAME:** `canonsafe.acme.com` → `cname.vercel-dns.com`
4. SSL is provisioned automatically by Vercel

### 6.5 Custom Domain Setup (Cloud Run Backend)

If the client wants a custom domain for the API (e.g., `api.canonsafe.acme.com`):

```bash
# Map custom domain
gcloud run domain-mappings create \
    --service=<SERVICE_NAME> \
    --domain=api.canonsafe.acme.com \
    --region=<REGION> \
    --project=<PROJECT_ID>

# Get the DNS records to configure
gcloud run domain-mappings describe \
    --domain=api.canonsafe.acme.com \
    --region=<REGION> \
    --project=<PROJECT_ID>
```

The client's DNS admin will need to create the CNAME record provided by gcloud.

### 6.6 Update CORS After Frontend Deploy

After the frontend is deployed and you have the final URL, update the backend's CORS origins:

```bash
gcloud run services update <SERVICE_NAME> \
    --region=<REGION> \
    --project=<PROJECT_ID> \
    --update-env-vars="ALLOWED_ORIGINS=<FRONTEND_URL>,http://localhost:3000,http://localhost:5173"
```

### 6.7 Local Development Proxy

For local development, the `vite.config.js` proxies `/api` requests to `localhost:8000`:

```javascript
server: {
    port: 3000,
    proxy: {
        '/api': 'http://localhost:8000',
    },
},
```

This means `VITE_API_URL` does not need to be set for local dev — the frontend defaults to `/api` which Vite proxies to the local backend.

---

## 7. Authentication Configuration

### 7.1 Local Auth (Default)

CanonSafe ships with built-in password authentication:

- **Login:** `POST /api/auth/login` with `OAuth2PasswordRequestForm` (username=email, password)
- **Registration:** `POST /api/auth/register` with email, password, full_name, org_name
- **Token format:** JWT signed with `SECRET_KEY`, algorithm `HS256`, 24-hour expiry
- **Password hashing:** bcrypt (via `bcrypt>=4.0.0`)
- **Token storage:** `localStorage` on frontend, sent as `Authorization: Bearer {token}`

### 7.2 RBAC Roles

| Role | Permissions | How Set |
|------|------------|---------|
| `viewer` | Read-only access to all data within their org | Assigned on invite |
| `editor` | Viewer + create/edit characters, run evaluations | Assigned on invite |
| `admin` | Editor + manage users, org settings, critics, license activation | First user in org (auto-assigned) |
| `super_admin` | Admin + cross-org access, license generation, platform admin | Set via `is_super_admin` flag in database |

The RBAC dependencies in routes:
- `require_viewer` — requires any authenticated user
- `require_admin` — requires `role == "admin"` on the user
- `get_super_admin` — requires `is_super_admin == True`

### 7.3 Google OAuth Setup

Google OAuth is **optional** but recommended for enterprise clients. When configured, a "Continue with Google" button appears on the login page.

#### Step 1: Create OAuth Credentials in GCP Console

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Select the client's GCP project (or any project — the OAuth client is independent)
3. Click **"+ CREATE CREDENTIALS" → "OAuth client ID"**
4. Select **"Web application"**
5. Set the name: `CanonSafe - <CLIENT_ORG>`
6. Add **Authorized JavaScript origins:**
   - `<FRONTEND_URL>` (e.g., `https://acme-canonsafe.vercel.app`)
   - `http://localhost:3000` (for local development)
   - `http://localhost:5173` (for local development)
7. Add **Authorized redirect URIs:**
   - `<FRONTEND_URL>/login` (the frontend handles the OAuth callback on the login page)
8. Click **Create** and save the **Client ID** and **Client Secret**

#### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **"External"** user type (unless the client uses Google Workspace, then "Internal")
3. Fill in the required fields:
   - App name: `CanonSafe`
   - User support email: client admin email
   - Authorized domains: add the Vercel domain
4. Add scopes: `openid`, `email`, `profile`
5. Add test users if the app is in "Testing" mode
6. Submit for verification if the app is going to production

#### Step 3: Add Secrets to Cloud Run

```bash
# Create secrets for OAuth credentials
echo -n "<GOOGLE_CLIENT_ID>" | gcloud secrets create canonsafe-google-client-id \
    --data-file=- --project=<PROJECT_ID>

echo -n "<GOOGLE_CLIENT_SECRET>" | gcloud secrets create canonsafe-google-client-secret \
    --data-file=- --project=<PROJECT_ID>

# Grant access to Cloud Run service account
for SECRET in canonsafe-google-client-id canonsafe-google-client-secret; do
    gcloud secrets add-iam-policy-binding ${SECRET} \
        --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
        --role="roles/secretmanager.secretAccessor" \
        --project=<PROJECT_ID>
done

# Update the Cloud Run service to include the new secrets
gcloud run services update <SERVICE_NAME> \
    --region=<REGION> \
    --project=<PROJECT_ID> \
    --update-secrets="GOOGLE_CLIENT_ID=canonsafe-google-client-id:latest,GOOGLE_CLIENT_SECRET=canonsafe-google-client-secret:latest"
```

#### How OAuth Works in the Code

1. Frontend calls `GET /api/auth/google/config` — returns `client_id` and auth URL if configured (404 if not)
2. Frontend redirects to Google's OAuth consent screen
3. Google redirects back to `<FRONTEND_URL>/login?code=...`
4. Frontend sends `POST /api/auth/google/callback` with the authorization code
5. Backend exchanges code for tokens with Google, verifies the ID token, and either:
   - **Links** the Google account to an existing user (matched by email), or
   - **Creates** a new user + org (if no matching email exists)
6. Backend returns a JWT, same as password login

#### Account Linking Behavior

| Scenario | Result |
|----------|--------|
| Google user with email matching existing local user | Google ID linked, `auth_provider` set to `local+google` |
| Google user with new email | New user + new org created, `auth_provider` set to `google` |
| User with `auth_provider: google` (no password) | Cannot log in with password — must use Google |
| User with `auth_provider: local+google` | Can use either password or Google |

---

## 8. License Key Management

### 8.1 Plan Tiers & Limits

| Plan | Max Users | Max Characters | Max Evals/Month | Features |
|------|-----------|---------------|-----------------|----------|
| **Trial** (no key) | 3 | 10 | 100 | Basic evaluation |
| **Starter** | 5 | 50 | 1,000 | Basic evaluation |
| **Professional** | 20 | 200 | 10,000 | + Red team, A/B testing |
| **Enterprise** | 100 | 1,000 | 100,000 | + Multimodal, CI/CD, webhooks |

### 8.2 License Key Format

Keys follow the pattern: `CSF-{PLAN_PREFIX}-{RANDOM}`

| Plan | Prefix | Example Key |
|------|--------|-------------|
| Starter | `STR` | `CSF-STR-A1B2C3D4-E5F6G7H8-I9J0K1L2` |
| Professional | `PRO` | `CSF-PRO-F8E7D6C5-B4A39281-76543210` |
| Enterprise | `ENT` | `CSF-ENT-11223344-55667788-99AABBCC` |

### 8.3 Generating a License Key (Super-Admin)

License keys are generated by super-admins via the Admin Dashboard or API:

```bash
# Via API (requires super-admin JWT)
curl -X POST "<BACKEND_URL>/api/admin/licenses" \
    -H "Authorization: Bearer <SUPER_ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{
        "plan": "professional",
        "max_users": 20,
        "max_characters": 200,
        "max_evals_per_month": 10000,
        "expires_at": "2027-02-20T00:00:00"
    }'
```

Response:
```json
{
    "id": 1,
    "key": "CSF-PRO-A1B2C3D4-E5F6G7H8-I9J0K1L2",
    "org_id": null,
    "plan": "professional",
    "max_users": 20,
    "max_characters": 200,
    "max_evals_per_month": 10000,
    "features": ["red_team", "ab_testing"],
    "issued_at": "2026-02-20T...",
    "expires_at": "2027-02-20T00:00:00",
    "is_active": true,
    "activated_at": null
}
```

### 8.4 Activating a License Key

The client's org admin activates the key via the Setup Wizard or Settings page:

```bash
# Via API (requires admin role in the org)
curl -X POST "<BACKEND_URL>/api/license/activate" \
    -H "Authorization: Bearer <ORG_ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{"key": "CSF-PRO-A1B2C3D4-E5F6G7H8-I9J0K1L2"}'
```

Activation:
- Binds the key to the organization (one-to-one)
- Updates the org's `plan` field to match the license
- Records the `activated_at` timestamp
- Cannot be activated for a different org once bound

### 8.5 License Validation (Heartbeat)

For boxed/self-hosted installs, the license heartbeat endpoint is public:

```bash
curl -X POST "<BACKEND_URL>/api/license/validate" \
    -H "Content-Type: application/json" \
    -d '{"key": "CSF-PRO-A1B2C3D4-E5F6G7H8-I9J0K1L2"}'
```

Returns `{"valid": true, "reason": "active", "plan": "professional"}` or an error reason (`not_found`, `deactivated`, `expired`, `grace_period`).

Expired keys get a **7-day grace period** before validation fails.

### 8.6 Checking Limits

```bash
# Check current usage vs license limits
curl "<BACKEND_URL>/api/license/status" \
    -H "Authorization: Bearer <USER_JWT>"
```

Returns current usage counts, limits, and `at_limit` flags for users, characters, and monthly evals.

---

## 9. Client Organization Setup

### 9.1 Creating the Organization

Organizations are created automatically when:
- A user self-registers (via `/api/auth/register`) — creates a new org with the user as admin
- A Google OAuth user signs in for the first time — creates a new org

Alternatively, for managed onboarding, you can pre-create the org through the registration API:

```bash
curl -X POST "<BACKEND_URL>/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "<CLIENT_EMAIL>",
        "password": "<INITIAL_PASSWORD>",
        "full_name": "<CLIENT_ADMIN_NAME>",
        "org_name": "<CLIENT_ORG>"
    }'
```

This creates the org with a `trial` plan, and the user as `admin`.

### 9.2 Setup Wizard Flow

When a new user logs in, the Dashboard shows an onboarding checklist computed from real data. The Setup Wizard (`/setup`) guides them through:

1. **Welcome** — overview of CanonSafe
2. **License** — enter license key (or skip for trial)
3. **Organization Profile** — set display name, industry
4. **Create First Franchise** — e.g., "Star Wars"
5. **Add a Character** — create first character with 5-Pack
6. **Run First Evaluation** — test the evaluation engine
7. **Invite Team** — add collaborators
8. **All Set** — onboarding complete

The onboarding checklist endpoint (`GET /api/org/onboarding`) returns progress based on actual data (franchise count, character count, eval count, etc.). Once all steps are done — or the admin dismisses it (`POST /api/org/onboarding/dismiss`) — the banner hides.

### 9.3 Seeding Demo Data for the Client

If the client wants pre-loaded demo data, follow the production seeding pattern:

#### The Production Seeding Pattern

The production database can't run local seed scripts (they reference local files). Instead:

1. **Create a route file** in `backend/app/api/routes/` with all seed data embedded inline as Python dicts
2. **Register the route** in `backend/app/main.py`
3. **Deploy** to Cloud Run
4. **Call the seed endpoint** with a secret parameter:

```bash
curl -X POST "<BACKEND_URL>/api/seed-<client>?secret=canonsafe-seed-2024"
```

5. **Remove the route** from `main.py`
6. **Redeploy** clean

Use the existing seed files (`seed_starwars.py`, `seed_disney_princess.py`) as templates. They demonstrate:
- Idempotent creation (check-before-insert pattern)
- Full 5-Pack data structure per character
- Franchise-specific critics with configurations
- Org/user bootstrap

### 9.4 Configuring the Organization

After creation, update the org profile:

```bash
curl -X PATCH "<BACKEND_URL>/api/org" \
    -H "Authorization: Bearer <ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{
        "display_name": "<CLIENT_ORG>",
        "industry": "Entertainment"
    }'
```

---

## 10. Custom Critic Configuration

### 10.1 What Critics Do

Critics are the LLM-based evaluation components. Each critic:
- Has a **slug** (unique identifier, e.g., `sw-canon-fidelity`)
- Has a **description** (what it evaluates)
- Belongs to a franchise and/or organization
- Has a **system prompt** that references character card data
- Returns a **score** (0.0 to 1.0) and **reasoning**

### 10.2 Creating Critics via API

```bash
curl -X POST "<BACKEND_URL>/api/critics" \
    -H "Authorization: Bearer <ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Canon Fidelity",
        "slug": "acme-canon-fidelity",
        "description": "Evaluates whether AI-generated content remains faithful to established character canon",
        "system_prompt": "You are a canon fidelity evaluator. Given the character card data and generated content, score how well the content matches established canon. Return a JSON object with score (0.0-1.0) and reasoning.",
        "franchise_id": 1,
        "weight": 1.0,
        "is_active": true
    }'
```

### 10.3 Recommended Critic Set per Franchise

For a typical franchise, create 3–5 critics covering:

| Critic | Purpose | Weight |
|--------|---------|--------|
| Canon Fidelity | Accuracy to character facts, relationships, timeline | 1.0 |
| Voice Consistency | Matches speech patterns, catchphrases, vocabulary level | 1.0 |
| Safety & Brand | Checks prohibited topics, content rating, age gating | 1.5 (higher weight) |
| Cultural/Sensitivity | For culturally-rooted characters: authenticity checks | 1.0 |
| Legal Compliance | Verifies usage restrictions, attribution, consent scope | 1.0 |

### 10.4 Evaluation Profiles

Evaluation profiles group critics into named configurations for different use cases:

```bash
curl -X POST "<BACKEND_URL>/api/critics/profiles" \
    -H "Authorization: Bearer <ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Production Screening",
        "description": "Full critic suite for production content",
        "critic_ids": [1, 2, 3, 4, 5],
        "franchise_id": 1
    }'
```

---

## 11. Character Data Loading

### 11.1 The 5-Pack Structure

Every character has a `CardVersion` with 5 JSON columns. Here are the expected shapes:

#### `canon_pack`
```json
{
    "facts": [
        {"fact_id": "age", "value": "4 years old", "source": "Series Bible", "confidence": 1.0}
    ],
    "voice": {
        "personality_traits": ["cheerful", "confident"],
        "tone": "upbeat and enthusiastic",
        "speech_style": "simple, age-appropriate",
        "vocabulary_level": "simple",
        "catchphrases": [{"phrase": "I love jumping in muddy puddles!", "frequency": "often"}],
        "emotional_range": "Joy, excitement, occasional frustration"
    },
    "relationships": [
        {"character_name": "George Pig", "relationship_type": "sibling", "description": "Younger brother"}
    ]
}
```

#### `legal_pack`
```json
{
    "rights_holder": {"name": "Entertainment One / Hasbro", "territories": ["Worldwide"]},
    "performer_consent": {
        "type": "AI_VOICE_REFERENCE",
        "performer_name": "Harley Bird",
        "scope": "All AI-generated content",
        "restrictions": ["No live performance imitation"]
    },
    "usage_restrictions": {
        "commercial_use": false,
        "attribution_required": true,
        "derivative_works": false
    }
}
```

#### `safety_pack`
```json
{
    "content_rating": "G",
    "prohibited_topics": [
        {"topic": "violence", "severity": "strict", "rationale": "Children's character"}
    ],
    "required_disclosures": ["This is an AI-generated character experience"],
    "age_gating": {"enabled": false, "minimum_age": 0, "recommended_age": "2-5 years"}
}
```

#### `visual_identity_pack`
```json
{
    "art_style": "2D animated, simple shapes",
    "color_palette": ["Pink", "Red"],
    "species": "pig",
    "clothing": "Red dress",
    "distinguishing_features": ["Round snout", "Rosy cheeks"]
}
```

#### `audio_identity_pack`
```json
{
    "tone": "upbeat and enthusiastic",
    "speech_style": "simple, age-appropriate with cheeky humor",
    "catchphrases": ["I love jumping in muddy puddles!", "*Snort!*"],
    "emotional_range": "Joy, excitement, occasional frustration"
}
```

### 11.2 Creating Characters via API

```bash
# 1. Create the character card
curl -X POST "<BACKEND_URL>/api/characters" \
    -H "Authorization: Bearer <ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Peppa Pig",
        "franchise_id": 1,
        "description": "A lovable, slightly bossy little pig",
        "is_main": true,
        "is_focus": false
    }'

# 2. Create the card version with 5-Pack data
curl -X POST "<BACKEND_URL>/api/characters/<CHAR_ID>/versions" \
    -H "Authorization: Bearer <ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{
        "canon_pack": { ... },
        "legal_pack": { ... },
        "safety_pack": { ... },
        "visual_identity_pack": { ... },
        "audio_identity_pack": { ... }
    }'
```

### 11.3 Bulk Import Pattern

For loading many characters, write a seed script following the pattern in `seed_starwars.py`:

1. Define shared templates (legal base, safety base) as Python dicts
2. Create helper functions for minor variations (e.g., `_legal(performer)` adds performer name)
3. Build a list of character definitions with all 5-pack data inline
4. Iterate and insert idempotently:

```python
# Check if character exists
result = await session.execute(
    select(CharacterCard).where(
        CharacterCard.name == char_data["name"],
        CharacterCard.org_id == org.id,
    )
)
if result.scalar_one_or_none():
    continue  # Already exists — skip

# Create character and card version
card = CharacterCard(name=char_data["name"], franchise_id=franchise.id, org_id=org.id)
session.add(card)
await session.flush()

version = CardVersion(
    card_id=card.id,
    version_number=1,
    canon_pack=char_data["canon_pack"],
    legal_pack=char_data["legal_pack"],
    safety_pack=char_data["safety_pack"],
    visual_identity_pack=char_data["visual_identity_pack"],
    audio_identity_pack=char_data["audio_identity_pack"],
    is_published=True,
)
session.add(version)
```

---

## 12. Integration Patterns

### 12.1 CI/CD Pipeline Integration

CanonSafe provides a CI/CD endpoint for automated evaluation gates:

```bash
# Run evaluation as a CI check
curl -X POST "<BACKEND_URL>/api/ci/evaluate" \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
        "character_id": 1,
        "content": "Generated dialogue to evaluate",
        "modality": "text",
        "min_score": 0.8
    }'
```

Returns pass/fail with score, which CI pipelines can use as a gate.

### 12.2 API Key Provisioning

API keys are managed via the Settings page or API:

```bash
# Create an API key
curl -X POST "<BACKEND_URL>/api/api-keys" \
    -H "Authorization: Bearer <ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{"name": "CI Pipeline Key", "scopes": ["evaluate", "characters:read"]}'
```

### 12.3 Webhook Setup

Webhooks notify external systems when events occur (evaluation completed, certification issued, etc.):

```bash
curl -X POST "<BACKEND_URL>/api/webhooks" \
    -H "Authorization: Bearer <ADMIN_JWT>" \
    -H "Content-Type: application/json" \
    -d '{
        "url": "https://acme.com/webhooks/canonsafe",
        "events": ["evaluation.completed", "certification.issued"],
        "description": "Acme integration webhook"
    }'
```

Webhooks are signed with HMAC-SHA256. The signature is sent in the `X-Webhook-Signature` header. Webhooks auto-deactivate after 5 consecutive delivery failures.

### 12.4 Agentic Pipeline Middleware (APM)

APM provides real-time evaluation for AI pipelines:

```bash
# Evaluate content inline (synchronous)
curl -X POST "<BACKEND_URL>/api/apm/evaluate" \
    -H "Authorization: Bearer <API_KEY>" \
    -H "Content-Type: application/json" \
    -d '{
        "character_id": 1,
        "content": "AI-generated content to evaluate",
        "modality": "text",
        "enforce": true
    }'
```

When `enforce: true`, the response includes a policy decision:
- `pass` (score >= 0.9)
- `regenerate` (0.7–0.89)
- `quarantine` (0.5–0.69)
- `escalate` (0.3–0.49)
- `block` (< 0.3)

---

## 13. Monitoring & Operations

### 13.1 Cloud Run Logs

```bash
# View recent logs
gcloud logging read \
    "resource.type=cloud_run_revision AND resource.labels.service_name=<SERVICE_NAME>" \
    --project=<PROJECT_ID> \
    --limit=50 \
    --format="value(textPayload)"

# View error logs only
gcloud logging read \
    "resource.type=cloud_run_revision AND resource.labels.service_name=<SERVICE_NAME> AND severity>=ERROR" \
    --project=<PROJECT_ID> \
    --limit=20 \
    --format="value(timestamp, textPayload)"

# Stream logs in real-time
gcloud logging tail \
    "resource.type=cloud_run_revision AND resource.labels.service_name=<SERVICE_NAME>" \
    --project=<PROJECT_ID>
```

### 13.2 Health Check

```bash
# Simple health check
curl <BACKEND_URL>/api/health
# Returns: {"status": "healthy", "version": "2.0.0"}
```

Set up uptime monitoring in GCP:

```bash
gcloud monitoring uptime create canonsafe-health \
    --display-name="CanonSafe Health Check" \
    --resource-type=uptime-url \
    --hostname=<BACKEND_HOST> \
    --path=/api/health \
    --check-interval=300 \
    --timeout=10 \
    --project=<PROJECT_ID>
```

### 13.3 Usage Dashboard

The Usage Dashboard (`/usage` in the frontend) shows:
- Monthly evaluation counts
- API call volume
- LLM token consumption
- Estimated costs
- Top characters by evaluation count

The API endpoints:
- `GET /api/org/usage` — monthly summaries (last 6 months)
- `GET /api/org/usage/details` — detailed current month breakdown
- `GET /api/org/usage/breakdown?months=6` — cost breakdown over time
- `GET /api/license/status` — current usage vs license limits

### 13.4 Drift Detection

Drift detection monitors evaluation scores over time and alerts on anomalies:
- **Baselines** are established from initial evaluation data
- **Z-scores** computed against baseline mean/std_dev
- **Severity levels:** info (z<1), warning (1-2), high (2-3), critical (z>=3)

### 13.5 Cloud Run Performance Tuning

| Setting | Recommendation | Notes |
|---------|---------------|-------|
| `--memory` | `512Mi` (starter), `1Gi` (enterprise) | Increase if seeing OOM errors |
| `--cpu` | `1` | Sufficient for most workloads |
| `--min-instances` | `0` (dev), `1` (prod) | Min=1 eliminates cold starts (~$25/month) |
| `--max-instances` | `3` (starter), `10` (enterprise) | Scale ceiling |
| `--timeout` | `300` (5 min) | LLM evaluations can take 30-60s |
| `--concurrency` | `80` (default) | Usually fine; lower for memory-heavy evals |

---

## 14. Security Hardening

### 14.1 CORS Lockdown

**Never leave `ALLOWED_ORIGINS` set to `*` in production.** It should contain only:
- The production frontend URL
- `http://localhost:3000` and `http://localhost:5173` (remove these for maximum security)

```bash
gcloud run services update <SERVICE_NAME> \
    --region=<REGION> \
    --project=<PROJECT_ID> \
    --update-env-vars="ALLOWED_ORIGINS=<FRONTEND_URL>"
```

### 14.2 Secret Rotation

Rotate secrets periodically:

```bash
# Rotate the application secret key
openssl rand -hex 32 | gcloud secrets versions add canonsafe-secret-key --data-file=- --project=<PROJECT_ID>

# Rotate the database password
# 1. Update the Cloud SQL user password
gcloud sql users set-password postgres \
    --instance=<INSTANCE_NAME> \
    --password="<NEW_PASSWORD>" \
    --project=<PROJECT_ID>

# 2. Update the secret
echo -n "<NEW_PASSWORD>" | gcloud secrets versions add canonsafe-db-password --data-file=- --project=<PROJECT_ID>

# 3. Redeploy to pick up the new secret version
gcloud run services update <SERVICE_NAME> \
    --region=<REGION> \
    --project=<PROJECT_ID>
```

> **Note:** Rotating `SECRET_KEY` invalidates all existing JWTs. Users will need to re-authenticate.

### 14.3 Disable Public Registration

For managed client deployments, disable self-service registration:

```bash
gcloud run services update <SERVICE_NAME> \
    --region=<REGION> \
    --project=<PROJECT_ID> \
    --update-env-vars="ALLOW_PUBLIC_REGISTRATION=false"
```

Users can only be added via:
- Admin invitations through the Settings page
- Super-admin API calls
- Google OAuth (if configured)

### 14.4 License Enforcement

The license system enforces limits on:
- **User count** — checked on user invitation/creation
- **Character count** — checked on character creation
- **Monthly evaluation count** — checked before each evaluation run

Without an active license, orgs are on trial limits (3 users, 10 characters, 100 evals/month).

### 14.5 Production Debug Setting

Always set `DEBUG=false` in production:

```bash
gcloud run services update <SERVICE_NAME> \
    --region=<REGION> \
    --project=<PROJECT_ID> \
    --update-env-vars="DEBUG=false"
```

Debug mode enables SQLAlchemy echo logging (all SQL queries printed to stdout), which leaks data and degrades performance.

---

## 15. Troubleshooting

### 15.1 Backend Fails to Start (Cloud SQL Connection)

**Symptom:** Cloud Run revision fails immediately, logs show `connection refused` or `could not connect to server`.

**Causes & Fixes:**

| Check | Fix |
|-------|-----|
| `--set-cloudsql-instances` missing from deploy command | Add `--set-cloudsql-instances=<PROJECT_ID>:<REGION>:<INSTANCE_NAME>` |
| `CLOUD_SQL_CONNECTION_NAME` env var not set | Add to `--set-env-vars` |
| `DB_PASS` mapped to wrong secret | Verify secret name: `DB_PASS=canonsafe-db-password:latest` |
| Service account lacks Cloud SQL Client role | Run: `gcloud projects add-iam-policy-binding ...` |
| Cloud SQL instance is stopped | Start it: `gcloud sql instances patch <INSTANCE_NAME> --activation-policy=ALWAYS` |

### 15.2 `DATABASE_URL` Mapped to Password Secret

**Symptom:** Application starts but immediately crashes with `sqlalchemy.exc.ArgumentError` or connection string parsing errors.

**Cause:** Someone mapped `DATABASE_URL` to the password secret instead of `DB_PASS`. The URL construction logic in `database.py` then tries to use the raw password as a connection string.

**Fix:** In the deploy command, use `DB_PASS` (not `DATABASE_URL`) for the password secret:

```bash
--set-secrets="DB_PASS=canonsafe-db-password:latest"  # Correct
# NOT: --set-secrets="DATABASE_URL=canonsafe-db-password:latest"  # WRONG
```

### 15.3 CORS Errors

**Symptom:** Browser console shows `Access to XMLHttpRequest has been blocked by CORS policy`.

**Causes & Fixes:**

| Check | Fix |
|-------|-----|
| Frontend URL not in `ALLOWED_ORIGINS` | Update env var to include the exact frontend origin (including `https://`) |
| `ALLOWED_ORIGINS` uses wrong separator | Use `^||^` prefix when setting multiple origins: `--set-env-vars="^||^...||ALLOWED_ORIGINS=url1,url2"` |
| Trailing slash mismatch | Origins should NOT have trailing slashes: `https://example.com` not `https://example.com/` |

### 15.4 JWT / Authentication Errors

**Symptom:** `401 Unauthorized` on all API calls despite having a token.

**Causes & Fixes:**

| Check | Fix |
|-------|-----|
| `SECRET_KEY` changed between token issue and validation | Tokens signed with old key are invalid; user must re-login |
| Token expired (>24h) | Re-authenticate |
| `Authorization` header malformed | Must be `Bearer <token>` (with space, no quotes around token) |
| Frontend `VITE_API_URL` wrong | Verify it points to the correct backend and includes `/api` |

### 15.5 Migration Failure on Startup

**Symptom:** Application crashes during `init_db()` with `InFailedSqlTransaction` or similar.

**Cause:** A migration `ALTER TABLE` failed in PostgreSQL and poisoned the transaction.

**Fix:** Each migration must run in its own `async with engine.begin() as conn:` block. Check that:
1. All `ALTER TABLE` statements use `IF NOT EXISTS` (PostgreSQL) or try/except (SQLite)
2. No two related operations share a transaction block
3. If a migration is stuck, you may need to connect directly and fix the schema manually

### 15.6 Frontend Shows Blank Page After Deploy

**Symptom:** Vercel deploy succeeds but the page is blank or shows "Cannot GET /characters".

**Causes & Fixes:**

| Check | Fix |
|-------|-----|
| `vercel.json` rewrite rule missing | Ensure `{"source": "/(.*)", "destination": "/index.html"}` exists |
| `VITE_API_URL` not set at build time | Re-deploy with the env var set in Vercel project settings |
| Build output directory wrong | Should be `dist` (Vite default) |

### 15.7 Google OAuth "redirect_uri_mismatch"

**Symptom:** Google OAuth fails with "Error 400: redirect_uri_mismatch".

**Fix:** In GCP Console → Credentials → OAuth 2.0 Client ID, add the exact redirect URI that the frontend is using. This is typically `<FRONTEND_URL>/login`. The URI must match exactly (scheme, host, port, path).

---

## 16. Client Handoff Checklist

Use this checklist to verify everything is working before handing off to the client.

### Infrastructure Verification

- [ ] Cloud Run service is running and healthy (`curl <BACKEND_URL>/api/health`)
- [ ] Cloud SQL database is accessible and schema is created
- [ ] All three secrets are in Secret Manager and accessible by the service account
- [ ] Artifact Registry has the latest container image
- [ ] Frontend is deployed on Vercel and loads correctly

### Configuration Verification

- [ ] `ALLOWED_ORIGINS` includes the production frontend URL
- [ ] `DEBUG` is set to `false`
- [ ] `ALLOW_PUBLIC_REGISTRATION` is set appropriately (typically `false` for managed clients)
- [ ] `FRONTEND_URL` is set to the production frontend URL
- [ ] Google OAuth configured (if required) — test login flow end-to-end

### Data Verification

- [ ] Client organization exists in the database
- [ ] Admin user can log in with provided credentials
- [ ] License key is generated and activated (verify plan tier)
- [ ] At least one franchise exists
- [ ] At least one character exists with complete 5-Pack data
- [ ] Critics are configured for the franchise
- [ ] Test evaluation runs successfully and returns scores

### Security Verification

- [ ] No localhost origins in `ALLOWED_ORIGINS` (unless needed for client dev)
- [ ] `SECRET_KEY` is a strong random value (not the dev default)
- [ ] Database password is strong and unique
- [ ] Super-admin access is limited to platform operators only
- [ ] Client admin does NOT have `is_super_admin` flag

### Operational Verification

- [ ] CI/CD pipeline is set up (GitHub Actions deploys on push to main)
- [ ] Health check endpoint responds
- [ ] Usage metering is working (run an eval, check `/api/org/usage`)
- [ ] License limits are enforced (test by approaching a limit)

### Client Credentials Handover

Provide the client admin with:

| Item | Value |
|------|-------|
| Frontend URL | `<FRONTEND_URL>` |
| Admin email | `<CLIENT_EMAIL>` |
| Initial password | `<INITIAL_PASSWORD>` |
| License key | `CSF-XXX-...` |
| API docs URL | `<BACKEND_URL>/api/docs` |
| Support contact | Implementation engineer email |

> **Important:** Instruct the client to change their password immediately after first login.

### Training Session Outline

Conduct a 60-minute onboarding session covering:

1. **Platform Overview** (10 min) — Dashboard, navigation, key concepts
2. **Character Management** (15 min) — Creating characters, 5-Pack structure, versioning
3. **Evaluation Engine** (15 min) — Running evaluations, understanding scores, policy decisions
4. **Critic Configuration** (10 min) — Adjusting weights, creating custom critics
5. **Team Management** (5 min) — Inviting users, roles (viewer/editor/admin)
6. **Advanced Features** (5 min) — Webhooks, API keys, CI/CD integration (based on plan tier)

### Post-Handoff Support

- Monitor Cloud Run logs for the first 48 hours
- Check evaluation success rate and latency
- Verify usage metering is tracking correctly
- Schedule a 2-week follow-up check-in

---

## Appendix A: Quick Reference — Deploy Commands

### Full Backend Deploy (Source-Based)

```bash
cd backend && gcloud run deploy <SERVICE_NAME> \
    --source . \
    --project=<PROJECT_ID> \
    --region=<REGION> \
    --allow-unauthenticated \
    --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=canonsafe-db-password:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" \
    --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=<PROJECT_ID>:<REGION>:<INSTANCE_NAME>||DB_USER=postgres||DB_NAME=<DB_NAME>||ALLOWED_ORIGINS=<FRONTEND_URL>,http://localhost:3000,http://localhost:5173||DEBUG=false||ALLOW_PUBLIC_REGISTRATION=false||FRONTEND_URL=<FRONTEND_URL>" \
    --add-cloudsql-instances=<PROJECT_ID>:<REGION>:<INSTANCE_NAME> \
    --memory=512Mi --cpu=1 --min-instances=0 --max-instances=10 --timeout=300
```

### Full Backend Deploy (Image-Based)

```bash
IMAGE_TAG="<REGION>-docker.pkg.dev/<PROJECT_ID>/<REPO_NAME>/<SERVICE_NAME>:$(git rev-parse --short HEAD)"
docker build -t ${IMAGE_TAG} ./backend && docker push ${IMAGE_TAG}

gcloud run deploy <SERVICE_NAME> \
    --image="${IMAGE_TAG}" \
    --region=<REGION> \
    --project=<PROJECT_ID> \
    --platform=managed \
    --allow-unauthenticated \
    --memory=512Mi --cpu=1 --timeout=300 \
    --max-instances=10 --min-instances=0 --port=8080 \
    --set-cloudsql-instances="<PROJECT_ID>:<REGION>:<INSTANCE_NAME>" \
    --set-env-vars="^||^CLOUD_SQL_CONNECTION_NAME=<PROJECT_ID>:<REGION>:<INSTANCE_NAME>||DB_USER=postgres||DB_NAME=<DB_NAME>||ALLOWED_ORIGINS=<FRONTEND_URL>||DEBUG=false||ALLOW_PUBLIC_REGISTRATION=false||FRONTEND_URL=<FRONTEND_URL>" \
    --set-secrets="SECRET_KEY=canonsafe-secret-key:latest,DB_PASS=canonsafe-db-password:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest"
```

### Update CORS Only

```bash
gcloud run services update <SERVICE_NAME> \
    --region=<REGION> \
    --project=<PROJECT_ID> \
    --update-env-vars="ALLOWED_ORIGINS=<FRONTEND_URL>"
```

### Automated Deploy Script

```bash
# Full setup + deploy
./deploy.sh all

# Individual steps
./deploy.sh setup      # GCP infrastructure only
./deploy.sh backend    # Backend only
./deploy.sh frontend   # Frontend only
./deploy.sh cors <URL> # Update CORS
```

---

## Appendix B: Secret Manager Mapping

| Cloud Run Env Var | Secret Manager Name | Config.py Field | Purpose |
|-------------------|-------------------|-----------------|---------|
| `SECRET_KEY` | `canonsafe-secret-key` | `settings.SECRET_KEY` | JWT signing key |
| `DB_PASS` | `canonsafe-db-password` | `settings.DB_PASS` | PostgreSQL password |
| `OPENAI_API_KEY` | `OPENAI_API_KEY` | `settings.OPENAI_API_KEY` | LLM evaluation API key |
| `GOOGLE_CLIENT_ID` | `canonsafe-google-client-id` | `settings.GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `canonsafe-google-client-secret` | `settings.GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

---

## Appendix C: GitHub Actions CI/CD

The `deploy-backend.yml` workflow auto-deploys on push to `main` when files in `backend/` change:

1. Authenticates to GCP using the `GCP_SA_KEY` repository secret
2. Builds a Docker image tagged with the commit SHA
3. Pushes to Artifact Registry
4. Deploys to Cloud Run
5. Runs a health check

**Required GitHub secret:** `GCP_SA_KEY` — a JSON service account key with roles:
- `roles/run.admin`
- `roles/artifactregistry.writer`
- `roles/cloudsql.client`
- `roles/iam.serviceAccountUser`
- `roles/secretmanager.secretAccessor`

To set it up for a new client's repo:

```bash
# Create a service account
gcloud iam service-accounts create canonsafe-deploy \
    --display-name="CanonSafe CI/CD" \
    --project=<PROJECT_ID>

# Grant roles
for ROLE in roles/run.admin roles/artifactregistry.writer roles/cloudsql.client roles/iam.serviceAccountUser roles/secretmanager.secretAccessor; do
    gcloud projects add-iam-policy-binding <PROJECT_ID> \
        --member="serviceAccount:canonsafe-deploy@<PROJECT_ID>.iam.gserviceaccount.com" \
        --role="${ROLE}"
done

# Create and download key
gcloud iam service-accounts keys create key.json \
    --iam-account=canonsafe-deploy@<PROJECT_ID>.iam.gserviceaccount.com

# Add to GitHub (copy the contents of key.json as the GCP_SA_KEY secret)
cat key.json
# Then go to GitHub → Settings → Secrets → Actions → New repository secret
# Name: GCP_SA_KEY, Value: <contents of key.json>

# Clean up local key
rm key.json
```
