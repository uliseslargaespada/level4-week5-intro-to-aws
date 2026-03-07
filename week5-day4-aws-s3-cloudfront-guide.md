# Week 5 — Day 4 (Final Day)

## Deploy the React Todo SPA to S3 + Serve via CloudFront (and optional Cloudflare custom domain)

**Class length:** 1.5 hours (90 minutes)
**Homework:** 1 hour (screenshots required)

### Today’s goal (definition of done)

By the end of today, each student can:

1) Build a **React Todo SPA** locally.
2) Upload the build output to their **private** S3 bucket (Block Public Access ON).
3) Confirm the site loads via the **CloudFront HTTPS URL**.
4) Confirm SPA routing works (refresh on a route returns the app, not 403/404).
5) (Optional) Point a **Cloudflare subdomain** to CloudFront with HTTPS.

---

## Timing plan (90 minutes)

### Segment 1 — Quick recap + prerequisites (10m)

- S3 bucket exists, private, objects uploaded (Day 2).
- CloudFront distribution exists and successfully serves index.html from the private bucket (Day 3).
- Confirm students have a Todo React app repo to build.

### Segment 2 — Build the React Todo app (15m)

**Goal:** produce static files like `index.html`, `.js`, `.css`, and assets.

**Common build folders:**

- Vite: `dist/`
- Create React App: `build/`

### Segment 3 — Upload build to S3 (20m)

**Goal:** replace demo files with the actual React build output (keep bucket private).

### Segment 4 — CloudFront: SPA routing + cache invalidation (25m)

- Configure **custom error responses** (403 + 404 → `/index.html` with 200).
- Create an invalidation `/*` after upload so new files are served.

### Segment 5 — Optional: Cloudflare custom domain (15m)

- Use CloudFront “Alternate domain name (CNAME)” + ACM certificate.
- Create DNS record in Cloudflare.

### Segment 6 — Wrap-up + cleanup checklist (5m)

- Verify bucket is private.
- Verify budgets and cost alerts.
- Identify what to delete if you must fully clean resources.

---

# Step-by-step execution guide

## 0) Pre-flight checklist (5 minutes)

- You know your:
  - S3 bucket name
  - CloudFront distribution domain (e.g., `dxxxxx.cloudfront.net`)
  - CloudFront distribution ID (for invalidations)

Confirm the bucket is private:

- S3 → Bucket → Permissions → **Block Public Access: ON**
- Bucket policy contains CloudFront OAC allow rule (Principal: `cloudfront.amazonaws.com`) for your distribution only

---

## 1) Build the React Todo SPA (15 minutes)

### Option A — Vite (most common modern setup)

From the Todo app folder:

```bash
npm install
npm run build
```

Output folder: `dist/`

### Option B — Create React App (CRA)

```bash
npm install
npm run build
```

Output folder: `build/`

✅ Checkpoint:

- You have a folder (`dist/` or `build/`) containing:
  - `index.html`
  - at least one JS bundle file (often under `assets/` or `static/`)
  - CSS bundle(s)

---

## 2) Upload the build output to S3 (20 minutes)

### 2.1 Remove old demo files (recommended)

In S3 console:

- Bucket → Objects → select old `index.html`, `app.js`, `styles.css` (and any demo assets)
- Delete

> If you prefer, you can overwrite instead of delete, but deleting makes it clearer.

### 2.2 Upload the SPA build files

S3 → Bucket → Objects → **Upload**

Important rule:

- Upload the **contents** of the build folder into the bucket root so that:
  - `index.html` is at the bucket root (not nested under `/dist` or `/build`)

Example for Vite:

- Open `dist/`
- Select everything inside `dist/` (including `assets/`)
- Upload

Example for CRA:

- Open `build/`
- Select everything inside `build/`
- Upload

✅ Checkpoint:

- At bucket root, you can see `index.html`
- You can see the JS/CSS asset folders (e.g., `assets/` or `static/`)

### 2.3 Quick private check (optional)

Click `index.html` object URL directly (S3 object URL):

- It should still be AccessDenied, because bucket is private.

---

## 3) CloudFront configuration updates (25 minutes)

### 3.1 Set Default Root Object

CloudFront → Distribution → Settings → Edit

- **Default root object:** `index.html`

Save changes.

### 3.2 Configure SPA routing (critical)

Problem:

- React Router routes like `/todos` don’t exist as files in S3.
- S3 often returns 403/404 for missing objects.
  Solution:
- CloudFront custom error responses that return `/index.html` with a 200.

CloudFront → Distribution → **Error pages** (or Custom error responses)
Create/verify these:

**For 403**

- HTTP error code: `403`
- Customize error response: Yes
- Response page path: `/index.html`
- HTTP response code: `200`
- Error caching minimum TTL: `0`

**For 404**

- HTTP error code: `404`
- Customize error response: Yes
- Response page path: `/index.html`
- HTTP response code: `200`
- Error caching minimum TTL: `0`

Save changes.

✅ Checkpoint:

- You can refresh a deep route (e.g. `/about` in your Todo app if it exists), and it still loads the SPA.

### 3.3 Invalidate cache after uploading new build

CloudFront → Distribution → Invalidations → Create invalidation

- Path: `/*`

✅ Checkpoint:

- The CloudFront URL now serves the newest build (not the demo).

---

## 4) Final verification (10 minutes)

### 4.1 Verify main URL

Open:

- `https://<distribution>.cloudfront.net`

✅ The Todo app loads.

### 4.2 Verify SPA refresh behavior

If your Todo app uses client routes:

- Navigate to a non-root route (e.g., `/settings`, `/about`, etc.)
- Refresh the browser

✅ The app still loads (no 403/404 page).

### 4.3 Verify bucket is still private

S3:

- Block Public Access ON
- No public bucket policy exists

---

# Optional (recommended) — Cloudflare custom domain (15 minutes)

> Only do this if you already have a domain in Cloudflare.

## 1) Request an ACM certificate (CloudFront requirement)

CloudFront requires a trusted TLS certificate covering your custom domain when you add Alternate Domain Names (CNAMEs).

### Step 1.1

AWS Console → **AWS Certificate Manager (ACM)**

Important:

- For CloudFront, request the certificate in **us-east-1**.

Request a public certificate for a subdomain:

- `todo.<yourdomain.com>`

Choose DNS validation.

ACM will give you CNAME records to add in Cloudflare.

## 2) Add DNS validation records to Cloudflare

Cloudflare DNS → Add the CNAME record(s) ACM provides.

- Set to **DNS only** (not proxied) during validation (recommended to avoid confusion).

Wait until ACM shows “Issued”.

## 3) Add Alternate Domain Name to CloudFront

CloudFront → Distribution → Settings → Edit

- Alternate domain name: `todo.<yourdomain.com>`
- Custom SSL certificate: select the ACM certificate
  Save changes.

## 4) Point Cloudflare subdomain to CloudFront

Cloudflare DNS:

- Create CNAME: `todo` → `<distribution>.cloudfront.net`
- Keep DNS only for simplicity.

Verify:

- `https://todo.<yourdomain.com>` loads your app.

---

# Homework (60 minutes) — Screenshots required

Submit a markdown file containing:

## A) Build proof

- Screenshot: terminal showing `npm run build` completed successfully
- Screenshot: file explorer showing `dist/` or `build/` folder contents

## B) S3 proof

- Screenshot: S3 bucket object list showing `index.html` at bucket root and asset folder(s)
- Screenshot: Block Public Access is ON

## C) CloudFront proof

- Screenshot: CloudFront distribution domain and status
- Screenshot: Error page settings showing 403 and 404 custom responses to `/index.html`
- Screenshot: Invalidation created (path `/*`)
- Screenshot: Browser showing app loaded via CloudFront URL

## D) SPA refresh proof

- Screenshot: browser address bar on a deep route + app loaded after refresh (if app has routes)
  - If the app is only `/`, state that in 1 sentence.

## E) Optional: Cloudflare proof

- Screenshot: Cloudflare DNS record `todo` CNAME to CloudFront domain
- Screenshot: browser loading via custom domain

---

# Cleanup checklist (for cost safety)

If you ever need to fully remove resources:

1) Delete S3 objects and bucket.
2) Disable CloudFront distribution, then delete it (CloudFront requires disable before delete).
3) Remove ACM certificate (optional).
4) Remove Cloudflare DNS record (optional).

Keep:

- Budgets/alerts enabled for the account.
