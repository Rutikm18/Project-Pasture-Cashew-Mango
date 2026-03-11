# 🚀 Deploy Pasture to Vercel — CI/CD Step-by-Step Guide

This guide walks you through getting your site live on Vercel and setting up **automatic deployments** (CI/CD): each push to your main branch triggers a new deploy.

---

## Prerequisites

- A **GitHub** account (or GitLab / Bitbucket)
- A **Vercel** account (free at [vercel.com](https://vercel.com))
- **Git** installed on your machine

---

## 🔒 I don’t want my code public — what should I do?

You have two good options:

### Option A: Private GitHub repository (recommended)

- Create the repo as **Private** instead of Public (Step 4 below: choose **“Private”**).
- **Code = private:** Only you (and people you invite) can see the code on GitHub. Nobody can copy or clone your source.
- **Website = public:** The site Vercel deploys (e.g. `https://your-project.vercel.app`) is **public**. Anyone can open it and use the UI — they see the live site only, not your repo. Your source code and config stay private.
- Vercel can deploy from a private repo; when you import the project, Vercel asks for permission to read the repo. **Automatic CI/CD (deploy on every push) works the same.**
- GitHub allows unlimited private repos for free.

**What to do:** Follow the same steps below; in Step 4, choose **“Private”** when creating the repository. Everything else stays the same.

### Option B: No GitHub — deploy only from your computer (Vercel CLI)

- Your code **never** leaves your machine (or your own backup). No GitHub, no GitLab.
- You deploy by running a command on your computer whenever you want to update the live site.
- **Downside:** No automatic CI/CD; you must run `vercel` or `vercel --prod` yourself after changes.

**Steps for Option B:**

1. Install Vercel CLI: `npm i -g vercel`
2. In your project folder run: `vercel` (first time: log in, link to a new Vercel project).
3. For production deploy: `vercel --prod`
4. When you change code, run `vercel --prod` again to update the live site.

---

## Part 1: Prepare your project with Git

### Step 1 — Open a terminal in your project folder

```bash
cd "/path/to/your/Project-Pashure"
```
Replace with your actual project path.

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
4. Choose **Private** (so nobody can see or copy your code).
5. **Do not** check “Add a README” (you already have files).
6. Click **“Create repository”**.

### Step 5 — Connect your local project to GitHub

GitHub will show you commands. Use these (replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name):

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

If Git asks for credentials, use your GitHub username and a **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens) as the password.

---

## Part 3: Deploy on Vercel (first time)

### Step 6 — Sign in to Vercel

1. Go to [vercel.com](https://vercel.com).
2. Click **“Sign Up”** or **“Log In”**.
3. Choose **“Continue with GitHub”** and authorize Vercel.

### Step 7 — Import your project

1. On the Vercel dashboard, click **“Add New…”** → **“Project”**.
2. You will see a list of your GitHub repositories. Find your project (e.g. `pasture` or `Project-Pashure`).
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

- Vercel will clone your repo, run the build (if any), and deploy.
- When it finishes, you will get a URL like **`https://pasture-xxxx.vercel.app`**.
- Open it and check that the homepage, `/order.html`, and `/admin.html` work.

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

3. Vercel will build and deploy automatically. Your live site will update in one to two minutes.

### Optional: Custom domain

1. In Vercel: **Project → Settings → Domains**.
2. Add your domain (e.g. `pasture.in`).
3. Follow the DNS instructions and add the records at your domain registrar.

---

## Quick reference — one-time setup

```bash
# 1. Go to your project folder
cd "/path/to/your/Project-Pashure"

# 2. Initialize Git and commit
git init
git add .
git commit -m "Initial commit: Pasture site"

# 3. After creating the repo on GitHub (use your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Then in Vercel: **Add New → Project → Import your GitHub repo → Deploy.**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `api/config` or `api/order` returns 404 | Ensure the `api/` folder is in the repo and the project root in Vercel is set to the repo root. |
| Config changes not showing | Redeploy: push a small change or click “Redeploy” in the Vercel dashboard. |
| Need environment variables (e.g. for Vercel KV) | In Vercel: Project → Settings → Environment Variables. |
| Preview URLs for pull requests | Created automatically; check the “Deployments” tab for each PR. |

---

*Pasture · Deploy with Vercel · CI/CD on every push*
