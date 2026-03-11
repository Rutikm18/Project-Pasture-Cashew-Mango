# 🚀 Deploy Pasture — Step-by-Step Guide

Deploy your site to **Vercel** (recommended; full API + CI/CD) or **Netlify** (static site only). Follow the steps in order.

---

## What you need

- **Git** installed on your computer
- A **GitHub** account
- A **Vercel** account (free at [vercel.com](https://vercel.com)) — for Vercel deploy  
  **or** a **Netlify** account (free at [netlify.com](https://netlify.com)) — for Netlify deploy

---

## 🔒 Keep your code private

- When you create the GitHub repo (Step 4), choose **Private**. Only you (and people you invite) can see the code.
- The **live website** (Vercel or Netlify URL) stays public — visitors see the site, not your source code.

---

## Step 1 — Open a terminal in your project folder

```bash
cd "/path/to/your/Project-Pashure"
```

Replace `/path/to/your/Project-Pashure` with the real path to your project (e.g. on Mac: `"/Users/YourName/Documents/Project-Pashure"`).

---

## Step 2 — Initialize Git and make the first commit

Run these commands one by one:

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Initial commit: Pasture site ready for deploy"
```

---

## Step 3 — Create a new repository on GitHub

1. Open [github.com](https://github.com) and sign in.
2. Click the **“+”** icon (top right) → **“New repository”**.
3. **Repository name:** e.g. `pasture` or `pasture-site` (use only letters, numbers, hyphens).
4. Set visibility to **Private** (recommended).
5. **Do not** tick “Add a README”, “Add .gitignore”, or “Choose a license”.
6. Click **“Create repository”**.

---

## Step 4 — Connect your project to GitHub and push

GitHub will show you “push an existing repository from the command line”. Use these commands (replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name):

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

```bash
git branch -M main
```

```bash
git push -u origin main
```

**Example** (if your username is `rutikmangale` and repo is `pasture`):

```bash
git remote add origin https://github.com/rutikmangale/pasture.git
git branch -M main
git push -u origin main
```

If Git asks for a password, use your GitHub **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens → Generate new token). Use the token as the password.

---

## Step 5 — Choose where to deploy

| Platform   | Best for                          | APIs (config, notify, order) | CI/CD        |
|-----------|------------------------------------|-------------------------------|--------------|
| **Vercel**  | Full site with config + orders    | ✅ Yes                        | ✅ Auto on push |
| **Netlify** | Static site only                   | ❌ No (uses defaults)         | ✅ Auto on push |

- **Vercel:** Config, coupons, contact, and order storage work. Use **Part A** below.
- **Netlify:** All pages work; order page uses default prices/phone. Use **Part B** below.

---

## Part A — Deploy on Vercel (step-by-step)

### Step A1 — Log in to Vercel

1. Go to [vercel.com](https://vercel.com).
2. Click **“Sign Up”** or **“Log In”**.
3. Choose **“Continue with GitHub”** and allow Vercel to access your GitHub account.

### Step A2 — Import your project

1. On the Vercel dashboard, click **“Add New…”** → **“Project”**.
2. You will see a list of your GitHub repos. Find your project (e.g. `pasture`).
3. Click **“Import”** next to it.

### Step A3 — Configure the project

1. **Project Name:** Use only **lowercase letters, numbers, and** `-` **or** `_` (e.g. `pasture` or `pasture-site`).  
   If you see *“A Project name can only contain…”*, change the name to lowercase (e.g. `pasture`).
2. **Root Directory:** leave as **`.`** (project root).
3. **Framework Preset:** **Other**.
4. **Build Command:** leave empty.
5. **Output Directory:** leave empty.
6. **Install Command:** leave empty.

Click **“Deploy”**.

### Step A4 — Wait for the deploy

1. Wait one to two minutes.
2. When it finishes, you will see a URL like **`https://pasture-xxxx.vercel.app`**.
3. Click it and check:
   - Homepage loads (cashew page).
   - [Your site]/order.html works.
   - [Your site]/admin.html works.

CI/CD is now on: every **push to `main`** will trigger a new deploy.

### Step A5 — (Optional) Add a custom domain

1. In Vercel, open your project → **Settings** → **Domains**.
2. Add your domain (e.g. `pasture.in`).
3. Follow the DNS instructions and add the records at your domain registrar.

---

## Part B — Deploy on Netlify (step-by-step)

### Step B1 — Log in to Netlify

1. Go to [netlify.com](https://netlify.com).
2. Click **“Sign up”** or **“Log in”**.
3. Choose **“Sign up with GitHub”** (or Email) and complete sign-in.

### Step B2 — Add your site from GitHub

1. On the Netlify dashboard, click **“Add new site”** → **“Import an existing project”**.
2. Click **“Deploy with GitHub”** (or “Connect to Git provider” and choose GitHub).
3. Authorize Netlify if asked.
4. In the list of repositories, find your project (e.g. `pasture`) and click **“Import”** or **“Select”**.

### Step B3 — Configure the build

1. **Branch to deploy:** `main` (or your default branch).
2. **Build command:** leave **empty**.
3. **Publish directory:** leave as **`.`** (or the default; `netlify.toml` in the repo sets this).
4. **Advanced** (if you see it): do not add a build command.

Click **“Deploy [your-site-name]”** or **“Deploy site”**.

### Step B4 — Wait for the deploy

1. Wait one to two minutes.
2. When it finishes, you will see a URL like **`https://random-name-12345.netlify.app`**.
3. Click it and check:
   - Homepage loads (cashew page).
   - `/order.html` and `/admin.html` work.

**Note:** On Netlify, `/api/config`, `/api/notify`, and `/api/order` do not run (they are for Vercel). The order page will use default prices and contact; admin may not load config. For full behaviour (config, coupons, orders), use Vercel (Part A).

### Step B5 — (Optional) Change the site name or add a custom domain

1. **Site name:** Site configuration → **Domain management** → **Options** → **Edit site name** (use lowercase, numbers, hyphens only).
2. **Custom domain:** Domain management → **Add custom domain** → follow the DNS steps.

---

## Pushing updates (CI/CD)

After your site is connected to GitHub, every push to `main` will redeploy.

**Each time you change the code:**

```bash
cd "/path/to/your/Project-Pashure"
git add .
git commit -m "Short description of your change"
git push origin main
```

Wait one to two minutes; your live site will update (on Vercel or Netlify, depending where you deployed).

---

## Quick reference

**One-time setup (Git + GitHub):**

```bash
cd "/path/to/your/Project-Pashure"
git init
git add .
git commit -m "Initial commit: Pasture site"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

**Then:**

- **Vercel:** Add New → Project → Import repo → set Project Name to e.g. `pasture` (lowercase) → Deploy.
- **Netlify:** Add new site → Import from GitHub → select repo → leave build command empty → Deploy.

**Push updates:**

```bash
git add .
git commit -m "Describe your change"
git push origin main
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **“Project name can only contain…”** (Vercel) | Use only lowercase letters, numbers, `-` and `_`. Example: `pasture` or `pasture-site`. |
| **`api/config` or `api/order` 404** | You are on Netlify; APIs run only on Vercel. Deploy on Vercel for config and orders. |
| **Config / contact not updating** | Redeploy: push a small change and wait, or in the dashboard click “Redeploy” / “Trigger deploy”. |
| **Git asks for password** | Use a GitHub Personal Access Token as the password, not your GitHub password. |
| **Site works but order page shows wrong prices** | On Netlify the config API is not available; use Vercel for config-driven prices and contact. |

---

*Pasture · Deploy with Vercel or Netlify · CI/CD on every push*
