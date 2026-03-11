# 🚀 Deploy Pasture to Vercel — CI/CD Step-by-Step Guide

This guide gets your site live on Vercel and sets up **automatic deployments** (CI/CD): every push to your main branch will trigger a new deploy.

---

## Prerequisites

- A **GitHub** account (or GitLab / Bitbucket)
- A **Vercel** account (free at [vercel.com](https://vercel.com))
- **Git** installed on your machine

---

## Part 1: Prepare your project with Git

### Step 1 — Open terminal in your project folder

```bash
cd "/Users/rutikmangale/Documents/DRIVE D/Project-Pashure"
```

### Step 2 — Initialize Git (if not already)

```bash
git init
```

### Step 3 — Add all files and commit

```bash
git add .
git commit -m "Initial commit: Pasture site ready for deploy"
```

---

## Part 2: Push to GitHub

### Step 4 — Create a new repository on GitHub

1. Go to [github.com](https://github.com) and sign in.
2. Click **“+”** (top right) → **“New repository”**.
3. **Repository name:** e.g. `pasture` or `Project-Pashure`.
4. Choose **Public**.
5. **Do not** check “Add a README” (you already have files).
6. Click **“Create repository”**.

### Step 5 — Connect your local project to GitHub

GitHub will show commands; use these (replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub username and repo name):

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Example:

```bash
git remote add origin https://github.com/rutikmangale/pasture.git
git branch -M main
git push -u origin main
```

If GitHub asks for login, use your username + a **Personal Access Token** (Settings → Developer settings → Personal access tokens) as the password.

---

## Part 3: Deploy on Vercel (first time)

### Step 6 — Sign in to Vercel

1. Go to [vercel.com](https://vercel.com).
2. Click **“Sign Up”** or **“Log In”**.
3. Choose **“Continue with GitHub”** and authorize Vercel.

### Step 7 — Import your project

1. On the Vercel dashboard, click **“Add New…”** → **“Project”**.
2. You’ll see a list of your GitHub repos. Find **your Pasture repo** (e.g. `pasture` or `Project-Pashure`).
3. Click **“Import”** next to it.

### Step 8 — Configure the project

1. **Project Name:** e.g. `pasture` (or leave default).
2. **Root Directory:** leave as **`.`** (project root).
3. **Framework Preset:** **Other** (no framework).
4. **Build Command:** leave empty.
5. **Output Directory:** leave empty (Vercel serves static files + `api/` from root).
6. **Install Command:** leave empty (or `npm install` if you add a `package.json` with deps).

Click **“Deploy”**.

### Step 9 — Wait for the first deploy

- Vercel will clone your repo, build (if any), and deploy.
- When it’s done you’ll get a URL like: **`https://pasture-xxxx.vercel.app`**.
- Open it to confirm the site and `/admin.html`, `/order.html` work.

---

## Part 4: CI/CD — Automatic deployments

Once the project is connected to GitHub, **CI/CD is already set up**.

### What happens automatically

| Action | Result |
|--------|--------|
| You push to `main` (or default branch) | Vercel runs a new build and deploy. |
| You open a Pull Request | Vercel creates a **Preview URL** for that PR. |
| Merge PR to `main` | Production is redeployed. |

### How to use it day to day

1. Edit code locally (e.g. `config/site.json`, HTML, or API).
2. Commit and push:

   ```bash
   git add .
   git commit -m "Update contact details / add coupon"
   git push origin main
   ```

3. Vercel will automatically build and deploy. In 1–2 minutes your live site is updated.

### Optional: Custom domain

1. In Vercel: **Project → Settings → Domains**.
2. Add your domain (e.g. `pasture.in`).
3. Follow the DNS instructions (add the records they show at your domain registrar).

---

## Quick reference — one-time setup

```bash
# 1. In project folder
cd "/Users/rutikmangale/Documents/DRIVE D/Project-Pashure"

# 2. Git
git init
git add .
git commit -m "Initial commit: Pasture site"

# 3. After creating repo on GitHub (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Then: **Vercel → Add New → Project → Import GitHub repo → Deploy.**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `api/config` or `api/order` 404 | Ensure `api/` folder is in the repo and root is the project root in Vercel. |
| Config not updating | Redeploy (push a small change) or trigger “Redeploy” in Vercel dashboard. |
| Need env vars (e.g. for KV later) | Project → Settings → Environment Variables. |
| Preview URLs for PRs | Automatic; check the “Deployments” tab for each PR. |

---

*Pasture · Deploy with Vercel · CI/CD on every push*
