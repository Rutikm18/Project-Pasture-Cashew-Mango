# 🌿 Pasture — Website Code Structure

Quick reference for the project layout, config, and deployment.

---

## 📁 DIRECTORY STRUCTURE

```
Project-Pashure/
├── api/                  ← Vercel serverless (backend)
│   ├── config.js         ← GET: returns site config (prices, brand, coupons)
│   ├── notify.js         ← POST: Hapus waitlist signup
│   └── order.js          ← GET: list orders; POST: save order (for admin)
├── config/
│   └── site.json         ← Single source of truth: brand, delivery, products, coupons
├── js/
│   └── app-config.js     ← Loads config, applies to pages (contact, prices, free delivery)
├── cashew.html           ← Main cashew landing page
├── hapus.html            ← Hapus Alphonso page (coming soon)
├── order.html            ← Order + cart page
├── admin.html            ← Admin: view contact, coupons, orders; direct WhatsApp link
├── cashew_tree.jpg       ← About section image
├── mango_tree.jpg        ← About section image (hapus)
├── vercel.json           ← Vercel config (rewrites)
├── netlify.toml          ← Netlify config (redirects; static only, no API)
└── README.md             ← This file
```

**Variables** (prices, phone, email, coupons, free delivery) are driven by `config/site.json`. The front end loads `/api/config` and applies values via `js/app-config.js`. Edit `config/site.json` and redeploy to update site-wide content.

Bird video source: `https://supplant.me/wp-content/uploads/2022/03/Calibri_Q50.webm`

---

## 🎨 COLOR SYSTEM (CSS Variables)
All colors are defined in `:root {}` at the top of each `<style>` block.

```css
:root {
  /* ── Browns / Earth ── */
  --mud:    #1C0F06;    /* darkest — page bg on dark sections */
  --bark:   #3B1F0C;    /* body text on light backgrounds */
  --terra:  #7A3B1E;    /* secondary/muted text */
  --clay:   #B5541F;    /* primary brand accent, buttons, links */
  --ochre:  #C98B2A;    /* warm gold-brown, Marathi text on dark */
  --sun:    #E8B94A;    /* bright gold — prices, highlights */
  --straw:  #F2D98B;    /* light straw — hero Marathi text */

  /* ── Backgrounds ── */
  --cream:  #FAF0DC;    /* main page background */
  --parch:  #F5E6C0;    /* slightly darker cream sections */
  --smoke:  #F9F4EE;    /* very light sections (about, tree facts) */

  /* ── Greens ── */
  --leaf:   #2E6B18;    /* mango/cashew tree color */
  --sage:   #8FBF5E;    /* eyebrow text on dark backgrounds */
  --green:  #2D7A35;    /* free delivery, success states */

  /* ── Borders ── */
  --border: rgba(185,136,60,.2);
}
```

### Quick color changes:
| Want to change          | Find this CSS variable  | Change to     |
|------------------------|------------------------|---------------|
| Main accent/buttons    | `--clay: #B5541F`       | your color    |
| Page background        | `--cream: #FAF0DC`      | your color    |
| Prices & highlights    | `--sun: #E8B94A`        | your color    |
| Body text              | `--bark: #3B1F0C`       | your color    |

---

## 🔤 TYPOGRAPHY

```css
/* 3 fonts used — all from Google Fonts */
'Josefin Sans'              /* headings, labels, buttons, nav */
'Lora'                      /* body text, descriptions */
'Tiro Devanagari Marathi'   /* all Marathi/Devanagari text */
'Caveat'                    /* eyebrow/script text ("From our farm...") */
```

To change fonts, edit the `<link>` tag in `<head>` and update:
- `font-family:'Josefin Sans'` → your display font
- `font-family:'Lora'` → your body font

---

## 📞 QUICK CONTENT FIXES (use config)

**Edit `config/site.json`** — this is the single source of truth for:

| What to change   | In `config/site.json` |
|-----------------|------------------------|
| Phone           | `brand.phone`, `brand.phoneFormatted`, `brand.phoneWhatsApp` |
| Email           | `brand.email` |
| Address         | `brand.address` |
| Brand name      | `brand.name`, `brand.taglineMr` |
| Free delivery   | `delivery.freeAbove` (e.g. 999) |
| Delivery charge | `delivery.charge` (e.g. 80) |
| Product prices  | `products.cashew[]` and `products.valuePacks[]` (each item has `id`, `name`, `weight`, `price`, `icon`) |
| Coupons         | `coupons[]` — each `{ "code": "XYZ", "type": "percent" or "fixed", "value": 10 or 100 }` |

After editing `config/site.json`, redeploy. No need to search-replace in HTML.

---

## 🛒 ORDER PAGE — Prices & orders

Prices and the product list are in **`config/site.json`** under `products.cashew` and `products.valuePacks`. The order page loads config from `/api/config` and updates displayed prices and add-to-cart behaviour. To add or change a product, edit the matching object in `site.json`.

**Manage each order:** When a customer clicks “Confirm Order”, the order is sent to **`POST /api/order`** and appears under “Recent orders” on **`/admin.html`**. On Vercel serverless, the list resets on cold starts unless you add persistent storage (e.g. Vercel KV); see comments in `api/order.js`.

---

## 💬 WHATSAPP — Direct link & order

- **Contact number for WhatsApp:** `config/site.json` → `brand.phoneWhatsApp` (e.g. `"919404598725"`).
- **Order page:** “Order via WhatsApp” opens `wa.me/{phone}` with cart summary. A **floating WhatsApp button** (bottom-right on the order page) goes directly to chat using the same number.
- **Admin:** Open **`/admin.html`** to see current contact, coupons, delivery settings, and a one-click **“Open WhatsApp”** link to chat.

---

## 🎟 COUPON CODES

**Manage coupons:** Edit `config/site.json` → `coupons` array, then redeploy. You can also view current coupons on **`/admin.html`**. Example:
```json
"coupons": [
  { "code": "KONKAN10", "type": "percent", "value": 10 },
  { "code": "YOURHARVEST", "type": "fixed", "value": 100 }
]
```

---

## 🏷 FREE DELIVERY THRESHOLD

In `config/site.json` → `delivery.freeAbove` (e.g. `999`). The badge and cart logic use this value.

---

## 🥭 ENABLING HAPUS ORDERING
When Hapus season opens:

**In `hapus.html`:**
1. Remove the `.coming-ribbon` div from hero
2. Change `<button ... disabled>Coming Summer 2025</button>` to real add buttons
3. Remove `opacity:.55` from `.pack-card.soon`

**In `order.html`:**
1. In `#hapusSec`, replace the "coming soon" block with real product cards (copy pattern from cashew cards above)

---

## 🐦 BIRD VIDEO
```html
<div id="bird">
  <video autoplay muted loop playsinline>
    <source src="https://supplant.me/wp-content/uploads/2022/03/Calibri_Q50.webm#t=1" type="video/webm">
  </video>
</div>
```
To disable: comment out or remove `#bird` div.
To change speed: edit `animation: birdFly 30s` — lower = faster.

---

## 📊 STAT COUNTERS (cashew.html)
```html
<span class="season-num" data-target="15">0</span>   ← Acres
<span class="season-num" data-target="1200">0</span>  ← Trees  
<span class="season-num" data-target="3">0</span>     ← Generations
<span class="season-num" data-target="100">0</span>   ← % Chemical free
```
Change `data-target` to your real numbers.

---

## 🔧 COMMON ISSUES

| Issue | Fix |
|-------|-----|
| Text hard to read on dark section | Find the element, change `rgba(250,240,220,.4X)` → `.82` or higher |
| Text hard to read on light section | Find the element, change `rgba(59,31,12,.4X)` → `#3B1F0C` |
| Nav links invisible on hero | Already fixed — cream color on transparent nav |
| Cursor not showing | `cursor:none` is on body — works only in desktop browsers |
| Bird not appearing | Check browser network tab — video URL must be accessible |

---

## 🌐 DEPLOYMENT & CI/CD (Vercel)

**Full step-by-step:** See **[DEPLOY.md](DEPLOY.md)** for the complete guide (Git setup, GitHub, first deploy, and automatic CI/CD).

**Summary:** Connect your repository to Vercel once. After that, every **push to `main`** triggers a new deploy automatically. No extra pipeline configuration is required.

**Vercel** (recommended — uses API and config):

1. Push the project to GitHub (or use Vercel CLI).
2. In [vercel.com](https://vercel.com), import the repo.
3. Leave build settings default (no build command; root is output).
4. Deploy. The `api/` folder becomes serverless functions:
   - `GET /api/config` → returns `config/site.json`
   - `POST /api/notify` → Hapus waitlist signup (body: `{ "phone": "..." }`)
   - `GET /api/order` → list recent orders; `POST /api/order` → save order (JSON body)
5. Root URL is rewritten to `cashew.html` (see `vercel.json`).

**Test locally (with API):** Run the local dev server:

- `cd dev-server`
- `npm install`
- `npm run dev`

Open the URL shown (e.g. http://localhost:3000). Config, notify, and order API will work.  
**Test locally (static only):** Run `python3 -m http.server 8000` and open http://localhost:8000/cashew.html. Pages work; config uses fallback defaults and notify will fail.

**Admin-only access (orders & waitlist):** To restrict `GET /api/order` and `GET /api/notify` to only you:
1. Set env var `ADMIN_SECRET` (e.g. a strong random string) in Vercel: Project → Settings → Environment Variables.
2. For local dev: `ADMIN_SECRET=your-secret npm run dev` or add to a `.env` file (requires `dotenv`).
3. Open `/admin.html` — you’ll be prompted for the secret. Enter it once; it’s stored in the session.
4. Without `ADMIN_SECRET` set, the APIs stay public (no prompt).

**Deploy on Netlify:** Yes. The static site works on Netlify; `netlify.toml` is included (root → `/cashew.html`). **Note:** The `api/` folder is for Vercel serverless. On Netlify, `/api/config`, `/api/notify`, and `/api/order` will not work unless you add [Netlify Functions](https://docs.netlify.com/functions/overview/) equivalents. The order page will fall back to default values (prices, phone, free delivery) when the config API is missing.

**Other static hosts (GitHub Pages, FTP):** Same as Netlify — pages work; APIs do not. For full config-driven behaviour and order storage, use Vercel.

---

*Pasture · Ratnagiri, Konkan · pasture.in*

---

## 🌐 DEPLOYMENT (Cloudflare Pages) — Recommended Alternative

Cloudflare Pages can host the static site and also run APIs via **Pages Functions**.
This repo includes Cloudflare handlers in `functions/api/` that implement:

- `GET /api/config` (public) + `PUT /api/config` (admin)
- `POST /api/order` (public) + `GET /api/order` (admin)
- `POST /api/notify` (public) + `GET /api/notify` (admin)

### Step-by-step

1. **Push to GitHub** (already required).
2. In Cloudflare Dashboard, go to **Workers & Pages → Create → Pages**.
3. **Connect GitHub repo** and select this repository.
4. **Build settings**:
   - Framework preset: **None**
   - Build command: **(empty)**
   - Build output directory: **/** (root)
5. Click **Save and Deploy**.
6. Create KV:
   - **Workers & Pages → KV → Create namespace**
   - Name: `PASTURE_KV` (any name is fine)
7. Bind KV to Pages project:
   - Project → **Settings → Functions → KV namespace bindings**
   - Add binding:
     - Variable name: `PASTURE_KV`
     - KV namespace: select the namespace you created
8. Set admin secret (recommended):
   - Project → **Settings → Environment variables**
   - Add `ADMIN_SECRET` with a strong value (Production and Preview if you use it)
   - Redeploy once after adding it
9. Open admin:
   - `https://<your-pages-domain>/admin.html`
   - Enter the secret once to unlock orders/waitlist + config editing

### Notes

- Without KV binding, the APIs will return an error saying KV is not configured.
- Config defaults to `config/site.json` until you save via admin (then KV becomes the source of truth).
