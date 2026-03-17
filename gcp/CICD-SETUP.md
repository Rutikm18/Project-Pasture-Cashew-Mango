# CI/CD — Auto-deploy to Cloud Run on push to GitHub

When you push to the `main` branch, Cloud Build builds the Docker image and deploys to Cloud Run.

---

## Step 1 — Push code to GitHub

```bash
cd "/Users/rutikmangale/Documents/DRIVE D/Project-Pashure"
git remote -v   # ensure origin points to your GitHub repo
git add .
git commit -m "Add Cloud Build CI/CD"
git push -u origin main
```

---

## Step 2 — Enable APIs and grant Cloud Build permission

Run (replace with your project if different):

```bash
# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com --project pasture-490518

# Project number (you already have it: 228689109715)
gcloud projects describe pasture-490518 --format="value(projectNumber)"

# Grant Cloud Build permission to deploy to Cloud Run
gcloud projects add-iam-policy-binding pasture-490518 \
  --member="serviceAccount:228689109715@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding pasture-490518 \
  --member="serviceAccount:228689109715@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Allow Cloud Build to push images to GCR
gcloud projects add-iam-policy-binding pasture-490518 \
  --member="serviceAccount:228689109715@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.admin"
```

---

## Step 3 — Connect GitHub to Cloud Build

1. Open: **https://console.cloud.google.com/cloud-build/triggers?project=pasture-490518**
2. Click **Connect Repository**.
3. Choose **GitHub** → sign in / authorize if asked.
4. Select your GitHub account and the repo **Project-Pasture-Cashew-Mango**.
5. Click **Connect**.

---

## Step 4 — Create the build trigger

**Option A — Console (recommended)**

1. In Cloud Build → **Triggers** → **Create Trigger**.
2. **Name:** `deploy-pashure-on-push`
3. **Event:** Push to a branch.
4. **Source:** the repo you connected: `Project-Pasture-Cashew-Mango`.
5. **Branch:** `^main$`
6. **Configuration:** Cloud Build configuration file (yaml or json).
7. **Location:** Repository.
8. **Cloud Build configuration file path:** `gcp/cloudbuild.yaml`
9. **Substitution variables** (optional):  
   - Name: `_ADMIN_SECRET`  
   - Value: your admin secret (e.g. `2249b2bbf5667da1cae6d2b92be5da30ebe0c019a1b1b806`)  
   So the deployed service gets `ADMIN_SECRET` in production.
10. Click **Create**.

**Option B — gcloud**

Repo: **Rutikm18 / Project-Pasture-Cashew-Mango**

Copy-paste this as a **single line** (no backslashes):

```bash
gcloud builds triggers create github --name="deploy-pashure-on-push" --repo-name="Project-Pasture-Cashew-Mango" --repo-owner="Rutikm18" --branch-pattern="^main$" --build-config="gcp/cloudbuild.yaml" --project pasture-490518
```

To add the admin secret, edit the trigger in the console and add substitution variable `_ADMIN_SECRET`.

---

## Step 5 — Test the pipeline

```bash
# Make a small change, then:
git add .
git commit -m "test ci/cd"
git push origin main
```

Watch the build: **https://console.cloud.google.com/cloud-build/builds?project=pasture-490518**

When the build succeeds, the service at **https://pashure-xxxxx-asia-south1.run.app** (or your custom domain) will be updated.

---

## Summary

| Step | What to do |
|------|------------|
| 1 | Push code to GitHub `main` |
| 2 | Enable Cloud Build API, grant run.admin + serviceAccountUser + storage.admin to Cloud Build SA |
| 3 | Connect GitHub repo in Cloud Build |
| 4 | Create trigger: push to `main` → build `gcp/cloudbuild.yaml`, optional `_ADMIN_SECRET` |
| 5 | Push to `main` and check Cloud Build → Builds |
