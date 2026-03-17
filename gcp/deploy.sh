#!/bin/bash
# Manual GCP Cloud Run deployment script
# Usage: bash gcp/deploy.sh YOUR_PROJECT_ID

set -e

PROJECT_ID=${1:-"your-gcp-project-id"}
REGION="asia-south1"
SERVICE="pashure"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE"

echo "Deploying Pashure to Cloud Run..."
echo "Project: $PROJECT_ID | Region: $REGION"

# Build & push image
docker build -t "$IMAGE:latest" .
docker push "$IMAGE:latest"

# Deploy to Cloud Run
gcloud run deploy "$SERVICE" \
  --image "$IMAGE:latest" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars "NODE_ENV=production" \
  --project "$PROJECT_ID"

echo ""
echo "Deployed! Service URL:"
gcloud run services describe "$SERVICE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format "value(status.url)"
