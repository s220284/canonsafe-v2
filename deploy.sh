#!/bin/bash
# CanonSafe V2 — Full deployment script
# Usage: ./deploy.sh [setup|backend|frontend|all]
set -euo pipefail

PROJECT_ID="tpgpt-prod"
REGION="us-east1"
SERVICE_NAME="canonsafe-v2"
REPO_NAME="canonsafe-repo"
IMAGE_REPO="us-east1-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
CLOUD_SQL_INSTANCE="tpgpt-prod:us-east1:tpg-intel-db"
DB_NAME="canonsafe"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[x]${NC} $1"; exit 1; }

check_auth() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
        warn "Not authenticated. Opening browser for login..."
        gcloud auth login
        gcloud config set project ${PROJECT_ID}
        gcloud config set run/region ${REGION}
    fi
    log "Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
}

setup_gcp() {
    log "Setting up GCP infrastructure..."

    # Enable APIs
    log "Enabling required APIs..."
    gcloud services enable run.googleapis.com \
        artifactregistry.googleapis.com \
        sqladmin.googleapis.com \
        secretmanager.googleapis.com \
        --project=${PROJECT_ID}

    # Create Artifact Registry repo (if not exists)
    log "Creating Artifact Registry repo..."
    gcloud artifacts repositories create ${REPO_NAME} \
        --repository-format=docker \
        --location=${REGION} \
        --project=${PROJECT_ID} 2>/dev/null || warn "Repo already exists"

    # Configure Docker auth
    gcloud auth configure-docker us-east1-docker.pkg.dev --quiet

    # Create database on existing Cloud SQL instance
    log "Creating '${DB_NAME}' database on Cloud SQL..."
    gcloud sql databases create ${DB_NAME} \
        --instance=tpg-intel-db \
        --project=${PROJECT_ID} 2>/dev/null || warn "Database already exists"

    # Get the postgres password from the existing instance
    warn "Make sure you know the postgres password for tpg-intel-db"

    # Create secrets (if not exist)
    log "Creating secrets in Secret Manager..."
    echo -n "$(openssl rand -hex 32)" | gcloud secrets create canonsafe-secret-key \
        --data-file=- --project=${PROJECT_ID} 2>/dev/null || warn "Secret canonsafe-secret-key already exists"

    # Prompt for DB password
    read -sp "Enter postgres password for tpg-intel-db: " DB_PASS
    echo
    echo -n "${DB_PASS}" | gcloud secrets create canonsafe-db-password \
        --data-file=- --project=${PROJECT_ID} 2>/dev/null || {
        warn "Secret canonsafe-db-password already exists, updating..."
        echo -n "${DB_PASS}" | gcloud secrets versions add canonsafe-db-password --data-file=- --project=${PROJECT_ID}
    }

    log "GCP setup complete!"
}

deploy_backend() {
    log "Deploying backend to Cloud Run..."

    # Build Docker image
    IMAGE_TAG="${IMAGE_REPO}:$(git rev-parse --short HEAD)"
    log "Building image: ${IMAGE_TAG}"
    docker build -t ${IMAGE_TAG} "${SCRIPT_DIR}/backend"

    # Push to Artifact Registry
    log "Pushing to Artifact Registry..."
    docker push ${IMAGE_TAG}

    # Deploy to Cloud Run
    log "Deploying to Cloud Run..."
    gcloud run deploy ${SERVICE_NAME} \
        --image="${IMAGE_TAG}" \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --platform=managed \
        --allow-unauthenticated \
        --memory=1Gi \
        --cpu=1 \
        --timeout=300 \
        --max-instances=10 \
        --min-instances=0 \
        --port=8080 \
        --set-cloudsql-instances="${CLOUD_SQL_INSTANCE}" \
        --set-env-vars="CLOUD_SQL_CONNECTION_NAME=${CLOUD_SQL_INSTANCE},DB_USER=postgres,DB_NAME=${DB_NAME},DEBUG=false" \
        --update-secrets="DB_PASS=canonsafe-db-password:latest,SECRET_KEY=canonsafe-secret-key:latest"

    # Get URL
    BACKEND_URL=$(gcloud run services describe ${SERVICE_NAME} \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --format="value(status.url)")
    log "Backend deployed at: ${BACKEND_URL}"

    # Health check
    sleep 5
    if curl -sf "${BACKEND_URL}/api/health" > /dev/null; then
        log "Health check passed!"
    else
        warn "Health check failed — check Cloud Run logs"
    fi

    echo "${BACKEND_URL}"
}

deploy_frontend() {
    BACKEND_URL="${1:-}"
    if [ -z "$BACKEND_URL" ]; then
        # Try to get from Cloud Run
        BACKEND_URL=$(gcloud run services describe ${SERVICE_NAME} \
            --region=${REGION} \
            --project=${PROJECT_ID} \
            --format="value(status.url)" 2>/dev/null || true)
    fi

    if [ -z "$BACKEND_URL" ]; then
        err "Backend URL not available. Deploy backend first or pass URL as argument."
    fi

    log "Deploying frontend to Vercel..."
    log "Backend URL: ${BACKEND_URL}"

    cd "${SCRIPT_DIR}/frontend"

    # Build with production API URL
    VITE_API_URL="${BACKEND_URL}/api" npm run build

    # Deploy to Vercel
    if command -v vercel &>/dev/null; then
        vercel --prod
    else
        warn "Vercel CLI not found. Install with: npm i -g vercel"
        warn "Then run: cd frontend && VITE_API_URL=${BACKEND_URL}/api npm run build && vercel --prod"
    fi
}

update_cors() {
    FRONTEND_URL="${1:-}"
    if [ -z "$FRONTEND_URL" ]; then
        err "Pass the Vercel frontend URL as argument"
    fi
    log "Updating CORS to allow ${FRONTEND_URL}..."

    gcloud run services update ${SERVICE_NAME} \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --update-env-vars="ALLOWED_ORIGINS=${FRONTEND_URL}"

    log "CORS updated!"
}

case "${1:-all}" in
    setup)
        check_auth
        setup_gcp
        ;;
    backend)
        check_auth
        deploy_backend
        ;;
    frontend)
        check_auth
        deploy_frontend "${2:-}"
        ;;
    cors)
        check_auth
        update_cors "${2:-}"
        ;;
    all)
        check_auth
        setup_gcp
        BACKEND_URL=$(deploy_backend)
        deploy_frontend "${BACKEND_URL}"
        echo ""
        log "Deployment complete!"
        warn "After Vercel gives you the URL, run: ./deploy.sh cors https://your-vercel-url.vercel.app"
        ;;
    *)
        echo "Usage: ./deploy.sh [setup|backend|frontend|cors <url>|all]"
        ;;
esac
