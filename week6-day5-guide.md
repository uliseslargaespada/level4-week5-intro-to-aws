# Week 6 — Day 5

## Production-correct AWS: RDS PostgreSQL (private) + Express on Lambda (VPC) + API Gateway + FE test on AWS

**Class length:** 1.5 hours (90 minutes)
**Practice/Assignment time:** 1 hour (screenshots required)

### Today’s goal (definition of done)

By the end of today, students can:

1) Create an **Amazon RDS for PostgreSQL** instance that is **not publicly accessible** (private).
2) Connect the existing **Express-on-Lambda** API to RDS using VPC + security groups (Lambda → RDS).
3) Ensure the database connection is encrypted with **TLS/SSL**.
4) Apply the schema to RDS without exposing the DB to the public internet (schema-applier Lambda).
5) Test the deployed backend with Postman and the deployed frontend (CloudFront SPA).

---

# Why “CloudFront in front of API Gateway” is optional (clarification)

API Gateway already provides HTTPS. Putting CloudFront in front helps mostly with:

- WAF at the edge (if needed)
- Same-domain patterns to reduce CORS complexity

It does **not** secure the database connection by itself. Database security is mainly:

- VPC/subnets + “Public access: No”
- Security groups (only allow Lambda SG)
- TLS for DB connections (SSL)

---

# Sources used (AWS official docs)

- Connecting Lambda and RDS with an in-console wizard:https://docs.aws.amazon.com/lambda/latest/dg/services-rds.htmlhttps://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/lambda-rds-connect.html
- RDS SSL/TLS bundles and connection guidance:https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.htmlhttps://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- HTTP API access logging in CloudWatch:
  https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
  https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html

---

# Timing plan (90 minutes)

### Segment 1 — Create RDS PostgreSQL (private) (20m)

- DB subnet group / VPC selection
- Security group
- “Public access: No”

### Segment 2 — Create schema-applier Lambda (private DB bootstrap) (15m)

- VPC config for Lambda
- Run schema SQL

### Segment 3 — Connect Express Lambda to RDS (VPC) + env vars (25m)

- Connect-to-RDS wizard
- Set DATABASE_URL + SSL settings
- Redeploy Express function zip (if needed)

### Segment 4 — API Gateway production checklist (10m)

- CORS restricted to your CloudFront domain
- Enable access logs

### Segment 5 — End-to-end test on AWS (20m)

- Postman against API Gateway invoke URL
- FE build points to API URL and works

---

# Prerequisites (before class)

- You already have:

  - API Gateway HTTP API + `$default` route pointing to your Express Lambda (Day 3)
  - Express Lambda code deployed (Day 3)
  - FE deployed on CloudFront (Week 5), or at least a known CloudFront domain
- Backend project zip for Day 5:

  - `week6-express-lambda-todos-api-v2.zip` (supports Postgres + optional SSL flags)

---

# Segment 1 — Create RDS PostgreSQL (private) (20 minutes)

AWS Console → **RDS** → Databases → **Create database**

## 1) Engine

- Engine type: **PostgreSQL**
- Version: choose a current stable version offered in the console

## 2) Templates

- Choose **Free tier** if available for student accounts (cost control)

## 3) Settings

- DB instance identifier: `lv4-week6-todos-db`
- Master username: `todos_admin`
- Master password: set and store it securely

## 4) Connectivity (critical for “production-correct”)

- VPC: use default VPC (for class speed) unless you have a dedicated VPC
- **Public access: No**  ✅
- VPC security group: create new SG named `lv4-week6-rds-sg`

Create database.

✅ Checkpoint:

- RDS status becomes **Available**
- You can see the endpoint (host) and port 5432

---

# Segment 2 — Apply schema without public DB access (15 minutes)

Because the DB is private, your laptop cannot connect directly.
We will use a **one-time Lambda** in the same VPC to run the schema.

## 1) Create Lambda: `lv4-week6-schema-applier`

AWS Console → Lambda → Create function → Author from scratch

- Name: `lv4-week6-schema-applier`
- Runtime: Node.js (latest available)
- Create

## 2) Configure VPC for this Lambda

Lambda → Configuration → VPC:

- Select the same VPC used by RDS
- Select 2 subnets (different AZs if possible)
- Security group: create a new SG `lv4-week6-lambda-sg`

## 3) Allow DB access from Lambda SG (security groups)

RDS → DB → Connectivity & security → VPC security groups → edit inbound rules for `lv4-week6-rds-sg`:

- Type: PostgreSQL
- Port: 5432
- Source: `lv4-week6-lambda-sg` (security group id)

✅ This means **only** Lambda functions using that SG can connect to Postgres.

## 4) Add schema-applier code

In the Lambda code editor, replace handler with:

```js
import pg from "pg";

const { Client } = pg;

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id_created_at ON todos(user_id, created_at DESC);
`;

export const handler = async () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL env var is required.");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: true }
  });

  await client.connect();
  await client.query(SCHEMA_SQL);
  await client.end();

  return { ok: true };
};
```

## 5) Set env vars for schema applier

Lambda → Configuration → Environment variables:

- `DATABASE_URL` = `postgres://todos_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/todos_api`

For SSL/TLS guidance and CA bundles:

- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html

## 6) Test schema applier

Lambda → Test → Run.

✅ Expected: success.

---

# Segment 3 — Connect Express Lambda to RDS (25 minutes)

## 1) Connect Express Lambda to RDS (wizard)

Lambda → `lv4-week6-express-todos` → Configuration → **RDS databases**

- Choose **Connect to RDS database**
- Select your `lv4-week6-todos-db`

Docs:

- https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/lambda-rds-connect.html

✅ Checkpoint:

- Lambda now has VPC config and a security group that can reach the DB.

## 2) Set env vars for Postgres (on Express Lambda)

Lambda → Configuration → Environment variables:

- `DATABASE_URL` = `postgres://todos_admin:<PASSWORD>@<RDS_ENDPOINT>:5432/todos_api`
- `PG_SSL` = `true`
- `PG_SSL_REJECT_UNAUTHORIZED` = `true`
- `JWT_SECRET` = (same as Day 3)
- `CORS_ORIGINS` = `https://<your-cloudfront-domain>` (and optionally `http://localhost:5173`)

RDS SSL is available by default:

- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html

## 3) Verify backend works via API Gateway

Postman:

- `GET https://<api-id>.execute-api.<region>.amazonaws.com/health`
- register/login
- create/list todos

✅ Persistence indicates RDS is used.

---

# Segment 4 — API Gateway production checklist (10 minutes)

## 1) Restrict CORS

HTTP API → CORS:

- Allowed origins: only your CloudFront domain (plus localhost if needed)
- Allowed headers: `Content-Type,Authorization`
- Allowed methods: `GET,POST,PATCH,DELETE,OPTIONS`

CORS docs:

- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html

## 2) Enable access logs

HTTP API → Monitor → Logging:

- Turn on access logging
- Choose a CloudWatch log group
- Use a JSON format

Logging docs:

- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
- https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html

---

# Segment 5 — Frontend: test against AWS (20 minutes)

## 1) Set FE env var to the deployed API

In FE repo:

```env
VITE_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com
```

Rebuild + deploy to S3/CloudFront.

## 2) End-to-end test

From CloudFront URL:

- Register
- Login
- Create todos
- Refresh and confirm persistence

---

# Practice/Assignment (1 hour) - Extra Credit

Students submit:

## Screenshots

1) RDS details: Public access = No
2) DB security group inbound allows only Lambda SG
3) Express Lambda env vars (DATABASE_URL + PG_SSL)
4) Postman: /health, login, todos list/create
5) Browser: SPA working against AWS API

## Short questions

1) Why is “Public access: No” important?
2) What is a security group in this architecture?
3) Why TLS matters for DB connections?
   https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html

---

# Cleanup checklist (cost)

1) Delete schema-applier Lambda (optional)
2) Delete RDS instance (recommended for student accounts)
3) Keep budgets/alerts enabled
