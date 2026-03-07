# GitHub Actions CI/CD — Deploy a Vite React SPA to S3 + CloudFront (Private Bucket + OAC)

This guide automates a **frontend deployment**:

1. Install deps
2. Build a Vite React app (`dist/`)
3. Upload (`sync`) build output to **S3**
4. Invalidate **CloudFront** (so users get the newest `index.html`)

It uses **GitHub Actions OIDC** (recommended) so you **do not store AWS access keys** in GitHub. AWS describes this pattern as using IAM roles with GitHub’s OIDC identity provider.

- AWS Security Blog: connect GitHub Actions to AWS using OIDC and IAM role trust policy
- GitHub Action: `aws-actions/configure-aws-credentials` supports OIDC role assumption

## Prerequisites (already completed earlier in the week)

- S3 bucket exists and is **private** (Block Public Access ON).
- CloudFront distribution exists with **OAC** and S3 bucket policy that allows CloudFront reads.
- The Vite app has **multiple routes** (BrowserRouter / createBrowserRouter), and CloudFront is configured with custom error responses:
  - 403 -> `/index.html` (200)
  - 404 -> `/index.html` (200)
    This ensures deep-link refresh works for SPA routes.

---

## Part A — AWS setup (one-time)

### A1) Create/verify GitHub OIDC provider in IAM

In AWS IAM, add an **OpenID Connect** provider for GitHub (if not already present):

- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

AWS provides a walkthrough for this GitHub OIDC integration and how to scope it to a specific repo.

### A2) Create an IAM Role for GitHub Actions (OIDC)

Create a role that GitHub Actions can assume using `sts:AssumeRoleWithWebIdentity`.

**Trust policy (example)**Replace:

- `OWNER` (GitHub org/user)
- `REPO` (repo name)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

> You can further restrict to tags/environments later, but this is a clean course-friendly baseline.

### A3) Attach least-privilege permissions (S3 + CloudFront invalidation)

> CloudFront `CreateInvalidation` supports resource-level permissions for a **distribution** ARN; you can restrict to one distribution.
> For S3, restrict to one bucket.

**Permissions policy (example)**Replace:

- `YOUR_BUCKET_NAME`
- `YOUR_DISTRIBUTION_ID`
- `YOUR_ACCOUNT_ID`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
    },
    {
      "Sid": "S3DeployObjects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:PutObjectTagging",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
    }
  ]
}
```

**Note:** If your bucket uses “Bucket owner enforced / ACLs disabled” (recommended), `s3:PutObjectAcl` is not necessary. You can remove it.

---

## Part B — GitHub setup (one-time)

### B1) Create a GitHub Environment

Create an environment named: `production`

Store deployment values there:

**Environment variables (vars):**

- `AWS_REGION` (e.g., `us-east-1`)
- `S3_BUCKET` (your bucket name)
- `CLOUDFRONT_DISTRIBUTION_ID` (the distribution ID)
- `BUILD_DIR` = `dist`

**Environment secrets:**

- `AWS_ROLE_ARN` (the IAM role ARN you created)

### B2) Vite build-time environment variables (optional)

If your Vite app needs environment variables (API URL, etc.), store them as **GitHub environment variables** and prefix them with `VITE_`, e.g.:

- `VITE_API_URL=https://example.com/api`

Vite exposes env vars under `import.meta.env` and replaces them at build time.

---

## Part C — GitHub Actions workflow (complete file)

Create: `.github/workflows/deploy-spa.yml`

```yaml
name: Deploy SPA to S3 + CloudFront

on:
  push:
    branches: [ "main" ]
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest

    # This ties the job to GitHub Environments, enabling environment-scoped vars/secrets.
    environment: production

    env:
      AWS_REGION: ${{ vars.AWS_REGION }}
      S3_BUCKET: ${{ vars.S3_BUCKET }}
      CLOUDFRONT_DISTRIBUTION_ID: ${{ vars.CLOUDFRONT_DISTRIBUTION_ID }}
      BUILD_DIR: ${{ vars.BUILD_DIR }}

      # Example Vite build-time vars (add as needed in GitHub Environment)
      # VITE_API_URL: ${{ vars.VITE_API_URL }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build (Vite)
        run: npm run build

      # Configure AWS credentials via OIDC (no long-lived access keys)
      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      # Deploy strategy:
      # - Cache-bust friendly: Vite assets are hashed; cache them long.
      # - Keep index.html short-cache/no-cache so deployments reflect quickly.
      - name: Deploy assets to S3 (long cache)
        run: |
          set -euo pipefail
          aws s3 sync "${BUILD_DIR}" "s3://${S3_BUCKET}"             --delete             --exclude "index.html"             --cache-control "public,max-age=31536000,immutable"

      - name: Deploy index.html to S3 (no-cache)
        run: |
          set -euo pipefail
          aws s3 cp "${BUILD_DIR}/index.html" "s3://${S3_BUCKET}/index.html"             --cache-control "no-cache"

      # CloudFront invalidation:
      # - Usually invalidating /index.html (and /) is enough for Vite builds.
      - name: Invalidate CloudFront (index)
        run: |
          set -euo pipefail
          aws cloudfront create-invalidation             --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}"             --paths "/" "/index.html"
```

---

## Recommended CloudFront settings for BrowserRouter

To support deep links like `/todos` or `/settings`:

- Custom error responses:
  - 403 -> `/index.html` (200)
  - 404 -> `/index.html` (200)
- Default root object: `index.html`

This ensures CloudFront serves `index.html` for unknown paths, and React Router handles the route.

---

## Verification checklist

After merging to `main`:

1. GitHub Actions run is green.
2. Open `https://<your-distribution>.cloudfront.net` and verify the new UI is visible.
3. Navigate to a non-root route (e.g., `/about`) and refresh:
   - You should see the SPA, not a CloudFront XML error.

---

## Common pitfalls (course-relevant)

- **Bucket policy / OAC misconfigured**: upload succeeds, but CloudFront shows AccessDenied.
- **index.html cached too long**: deployments “don’t update”. Fix: `cache-control: no-cache` for index + invalidate `/index.html`.
- **Using S3 website endpoint** with private bucket: won’t work—use S3 REST origin + OAC.
- **Vite env vars**: must be provided at build time and prefixed `VITE_`.
