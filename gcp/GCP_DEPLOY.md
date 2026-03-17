# GCP Cloud Run Deployment

## Prerequisites

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
2. Docker installed and running
3. A GCP project created at console.cloud.google.com

## One-time Setup

```bash
# Login to GCP
gcloud auth login
gcloud auth configure-docker

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Option A: Manual Deploy (quickest to test)

```bash
# From project root
bash gcp/deploy.sh YOUR_PROJECT_ID
```

## Option B: Cloud Build (CI/CD via GitHub)

1. Go to Cloud Build → Triggers → Create Trigger
2. Connect your GitHub repo
3. Set trigger to push to `main` branch
4. Set build config file to: `gcp/cloudbuild.yaml`
5. Done — every push to main auto-deploys

## Environment Variables (Secrets)

Set these in Cloud Run after first deploy (or add `--set-secrets` to deploy.sh):

| Variable       | Where to set                        |
|----------------|--------------------------------------|
| `ADMIN_SECRET` | Cloud Run → Edit → Variables & Secrets |

```bash
gcloud run services update pashure \
  --region asia-south1 \
  --update-env-vars ADMIN_SECRET=your-secret-here
```

## Important Notes

- **In-memory data**: Orders, waitlist, and analytics are stored in memory.
  Data resets on every container restart/redeploy. For production persistence,
  consider adding Firestore or Cloud SQL.
- **Region**: Configured to `asia-south1` (Mumbai) for best latency in India.
- **Render is unaffected**: This Docker setup is GCP-only. Render continues
  using `npm start` from package.json as before.
