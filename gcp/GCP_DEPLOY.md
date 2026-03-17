# Pasture — GCP Deployment Reference

## Project Info

| Field            | Value                                      |
|------------------|--------------------------------------------|
| Project Name     | pasture-490518                             |
| Project Number   | 228689109715                               |
| GCP Account      | rutikmangale18@gmail.com                   |
| Service Name     | pashure                                    |
| Region           | asia-south1 (Mumbai)                       |
| Live URL         | https://pashure-228689109715.asia-south1.run.app |
| Custom Domain    | pasture.online (pending DNS setup)         |
| Container Image  | gcr.io/pasture-490518/pashure:latest       |

---

## Environment Variables

| Variable        | Value                                          | Where Set         |
|-----------------|------------------------------------------------|-------------------|
| `NODE_ENV`      | production                                     | Cloud Run         |
| `ADMIN_SECRET`  | 2249b2bbf5667da1cae6d2b92be5da30ebe0c019a1b1b806 | Cloud Run      |
| `PORT`          | 8080 (set by Cloud Run automatically)          | Dockerfile        |

---

## Cloud Run Service Config

| Setting        | Value     |
|----------------|-----------|
| Memory         | 256Mi     |
| CPU            | 1         |
| Min instances  | 0 (scales to zero) |
| Max instances  | 5         |
| Port           | 8080      |
| Auth           | Allow unauthenticated (public) |

---

## Key URLs

| Resource              | URL                                                                                     |
|-----------------------|-----------------------------------------------------------------------------------------|
| Live App              | https://pashure-228689109715.asia-south1.run.app                                        |
| GCP Console           | https://console.cloud.google.com/run?project=pasture-490518                            |
| Cloud Run Service     | https://console.cloud.google.com/run/detail/asia-south1/pashure/metrics?project=pasture-490518 |
| Cloud Build           | https://console.cloud.google.com/cloud-build/builds?project=pasture-490518             |
| Container Registry    | https://console.cloud.google.com/gcr/images/pasture-490518?project=pasture-490518      |
| Logs Explorer         | https://console.cloud.google.com/logs?project=pasture-490518                           |
| IAM & Permissions     | https://console.cloud.google.com/iam-admin/iam?project=pasture-490518                  |
| Billing               | https://console.cloud.google.com/billing?project=pasture-490518                        |

---

## Common Commands

### Deploy
```bash
# Deploy from source (recommended)
cd "/Users/rutikmangale/Documents/DRIVE D/Project-Pashure"
gcloud run deploy pashure --source . --region asia-south1 --platform managed --allow-unauthenticated --port 8080 --memory 256Mi --cpu 1 --min-instances 0 --max-instances 5 --set-env-vars "NODE_ENV=production,ADMIN_SECRET=2249b2bbf5667da1cae6d2b92be5da30ebe0c019a1b1b806" --project pasture-490518
```

### Update Environment Variables
```bash
gcloud run services update pashure \
  --region asia-south1 \
  --update-env-vars "KEY=value" \
  --project pasture-490518
```

### View Logs
```bash
gcloud run services logs read pashure --region asia-south1 --project pasture-490518 --limit 50
```

### Live Log Tail
```bash
gcloud run services logs tail pashure --region asia-south1 --project pasture-490518
```

### Check Service Status
```bash
gcloud run services describe pashure --region asia-south1 --project pasture-490518
```

### Get Live URL
```bash
gcloud run services describe pashure --region asia-south1 --project pasture-490518 --format "value(status.url)"
```

### Delete Service (stop billing)
```bash
gcloud run services delete pashure --region asia-south1 --project pasture-490518
```

---

## Custom Domain Setup (pasture.online via Cloudflare)

Domain mappings are not supported in asia-south1.
Use Cloudflare as a proxy instead (free).

### Steps
1. Sign up at https://cloudflare.com
2. Add site `pasture.online`
3. Add these DNS records in Cloudflare:

| Type  | Name | Value                                              | Proxy  |
|-------|------|----------------------------------------------------|--------|
| CNAME | @    | pashure-228689109715.asia-south1.run.app           | ON     |
| CNAME | www  | pashure-228689109715.asia-south1.run.app           | ON     |

4. Update nameservers at your domain registrar to Cloudflare's nameservers
5. In Cloudflare → SSL/TLS → set to **Full**

SSL is automatic and free via Cloudflare.

---

## CI/CD Pipeline (GitHub → Cloud Build → Cloud Run)

### One-time Setup
```bash
# Grant Cloud Build permission to deploy to Cloud Run
gcloud projects add-iam-policy-binding pasture-490518 \
  --member="serviceAccount:228689109715@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding pasture-490518 \
  --member="serviceAccount:228689109715@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Create Trigger
1. Go to https://console.cloud.google.com/cloud-build/triggers?project=pasture-490518
2. Click **Connect Repository** → GitHub → select your repo
3. Click **Create Trigger**:
   - Event: Push to branch
   - Branch: `^main$`
   - Build config: `gcp/cloudbuild.yaml`

### After Setup
Every `git push origin main` will automatically build and deploy.
Monitor builds at: https://console.cloud.google.com/cloud-build/builds?project=pasture-490518

---

## Important Notes

- **Data is in-memory**: Orders, waitlist, analytics reset on every redeploy.
  For production persistence → add Firestore or Cloud SQL.
- **Scales to zero**: No traffic = no cost. Cold start ~1-2 seconds.
- **Free tier**: 2 million requests/month free on Cloud Run.
- **Domain mappings**: Not supported in asia-south1 — use Cloudflare instead.
