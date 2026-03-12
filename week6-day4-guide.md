# Week 6 — Day 4

## Local PostgreSQL + Express persistence + Connect React (Vite) to the backend (local)

**Class length:** 1.5 hours (90 minutes)
**Homework:** 1 hour (screenshots required)

### Today’s goal (definition of done)

By the end of today, students can:

1) Install PostgreSQL locally and create a database.
2) Run the Express API in **Postgres mode** (real persistence).
3) Apply the provided SQL schema (users + todos tables).
4) Connect the Vite React app to the backend locally using Axios (baseURL + token).
5) Use the FE app to:
   - Register / Login (JWT)
   - CRUD Todos (create, list, toggle, delete)

> Day 5 will move to AWS and become “production-correct” (RDS + VPC + security groups + TLS).

---

# Timing plan (90 minutes)

### Segment 1 — Install PostgreSQL + verify tooling (20m)

- Install Postgres (OS-specific)
- Verify `psql` is available

### Segment 2 — Create role + database (15m)

- Create `todos_user` + `todos_api` database

### Segment 3 — Backend: connect to Postgres + apply schema (20m)

- Set `DATABASE_URL`
- Run `npm run db:schema`
- Verify persistence with Postman

### Segment 4 — Frontend: connect Vite app to backend (30m)

- Add Axios client + API modules
- Add Auth context + protected route
- Add Login/Register pages
- Replace Todos page to use backend

### Segment 5 — Wrap-up (5m)

- Local end-to-end demo complete
- Prep for Day 5 deployment

---

# Part A — PostgreSQL installation (Segment 1)

## 1) Install PostgreSQL (choose your OS)

### macOS

Use a package installer from the official download page (recommended for students). 

### Windows

Use the EDB interactive installer listed on the official Windows downloads page. 

### Ubuntu / Debian

Ubuntu includes PostgreSQL packages. Install via apt: 

```bash
sudo apt update
sudo apt install postgresql
```

## 2) Verify you can run psql

Open a terminal:

```bash
psql --version
```

If `psql` is not found, ensure the installer completed and that PostgreSQL “bin” is on your PATH (common on Windows).

---

# Part B — Create a local DB user + database (Segment 2)

We will create:

- **role**: `todos_user`
- **database**: `todos_api`
- **password**: choose a local password (example: `todos_password`)

> This is local-only for class. Do not reuse these credentials in production.

## Option 1: Use psql (recommended)

### 1) Connect as a superuser

**Windows / many Linux installs** often have a `postgres` superuser.

Try:

```bash
psql -U postgres
```

If that fails on Linux, try:

```bash
sudo -u postgres psql
```

### 2) Create role and database

Run these SQL commands inside psql:

```sql
CREATE ROLE todos_user WITH LOGIN PASSWORD 'todos_password';
CREATE DATABASE todos_api OWNER todos_user;
```

Exit psql:

```sql
\q
```

## Option 2: Use pgAdmin (optional)

If students installed pgAdmin, they can create:

- a role/user named `todos_user`
- a database named `todos_api` owned by that role

(Use this only if psql is too slow for the class.)

---

# Part C — Backend: Connect Express to Postgres (Segment 3)

## 1) Unzip and run the backend (continue from Day 3)

Use the backend zip you already used in Day 3:

- `week6-express-lambda-todos-api-v2(-reupload).zip`

From the backend folder:

```bash
cp .env.example .env
npm install
```

## 2) Set DATABASE_URL in `.env`

PostgreSQL supports a connection **URI format** (libpq). citeturn0search1

Edit `.env`:

```env
# Example local connection string (update password if different)
DATABASE_URL=postgres://todos_user:todos_password@localhost:5432/todos_api

# Keep CORS for local Vite
CORS_ORIGINS=http://localhost:5173

# JWT for local testing
JWT_SECRET=replace_me_with_a_long_random_string
```

## 3) Apply the schema

This project includes a course-friendly schema script (no migrations yet).

Run:

```bash
npm run db:schema
```

Expected:

- `✅ Schema applied successfully.`

> The schema uses `CREATE EXTENSION IF NOT EXISTS pgcrypto;` and table creation statements. 

If you see an error about `pgcrypto` not being available, the install is missing the extension package. (On some Linux setups this can require a “contrib” package.)

## 4) Start the API

```bash
npm run dev
```

Expected console output:

- `Mode: Postgres`

---

## 5) Verify persistence with Postman (local)

### A) Register

`POST http://localhost:3000/auth/register`

```json
{ "email": "student@example.com", "name": "Student", "password": "password123" }
```

### B) Login

`POST http://localhost:3000/auth/login`

```json
{ "email": "student@example.com", "password": "password123" }
```

Copy token from `data.token`.

### C) Create a todo

`POST http://localhost:3000/todos`Headers:

- `Authorization: Bearer <token>`
  Body:

```json
{ "title": "Persisted todo" }
```

### D) List todos

`GET http://localhost:3000/todos` with Authorization header.

### E) Persistence proof (important)

Stop the backend (`Ctrl+C`) and run again:

```bash
npm run dev
```

List todos again.

✅ The todo should still exist (Postgres persistence).

---

# Part D — Frontend: Connect Vite app to backend locally (Segment 4)

## 1) Add backend base URL env var

In your Vite app repo, create `.env.local` (recommended) using the provided example:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## 2) Install Axios

In the Vite app repo:

```bash
npm install axios
```

Axios usage is based on its official docs (instances and interceptors).

## 3) Apply the required React file updates

You have a zip of the **updated necessary files** (frontend updates pack):

- `week6-vite-react-template-updates.zip`

### How to apply

1) Unzip it
2) Copy/merge the files into your existing Vite template repo, preserving paths.

Files included (add/replace exactly):

- `src/lib/api/client.js`
- `src/lib/api/auth.js`
- `src/lib/api/todos.js`
- `src/auth/auth-context.jsx`
- `src/auth/protected-route.jsx`
- `src/pages/login.jsx`
- `src/pages/register.jsx`
- `src/pages/todos.jsx` (replaces localStorage version)
- `src/router/router.jsx`
- `src/main.jsx`
- `.env.example` (reference)

> These changes:
>
> - store JWT in localStorage
> - attach `Authorization` header automatically
> - protect `/todos` route and redirect to `/login`

## 4) Run the frontend

```bash
npm run dev
```

Open:

- `http://localhost:5173`

## 5) End-to-end verification checklist (FE)

1) Visit `/todos` without login → should redirect to `/login`.
2) Register a new user
3) Login → should navigate to `/todos`
4) Create todo → should appear in list
5) Toggle completed
6) Delete todo
7) Refresh browser → still logged in and still sees todos (because:
   - token is stored
   - todos are in DB)

---

# Homework (60 minutes) — screenshots required

## A) Postgres + schema proof

1) Screenshot: `psql --version`
2) Screenshot: successful `npm run db:schema`
3) Screenshot: backend running showing `Mode: Postgres`

## B) API proof (Postman)

4) Register response
5) Login response (token visible)
6) Create todo response
7) List todos response

## C) FE proof

8) `.env.local` showing `VITE_API_BASE_URL=http://localhost:3000`
9) Browser screenshot showing:
   - logged-in `/todos`
   - at least one todo loaded from backend
10) Screenshot showing protected route behavior (redirect to `/login` when logged out)

---

# Notes for Day 5 (preview — production-correct AWS)

Day 5 will:

- Create PostgreSQL on AWS (RDS) in a VPC with secure access controls.
- Connect Lambda to RDS using VPC/security groups and enable TLS to the database.
- Deploy backend to AWS and update the FE env var:
  - `VITE_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com`

We will keep API Gateway direct (HTTPS already) and apply “minimum viable hardening” on API Gateway (throttling).
