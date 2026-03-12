# Week 6 — Day 3

## Deploy a RESTful Express API on AWS Lambda + API Gateway (HTTP API)

**Class length:** 1.5 hours (90 minutes)
**Homework:** 1 hour (screenshots required)

### Today’s goal (definition of done)

You will have a public HTTPS base URL (API Gateway invoke URL) and be able to:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /todos` (protected with JWT)
- `POST /todos` (protected with JWT)

This runs **Express** inside **AWS Lambda**, behind **API Gateway HTTP API** using a catch‑all route (`$default`).
AWS documents that HTTP API routes are method + path and that `$default` can act as a catch‑all.
https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html

---

## Timing plan (90 minutes)

### Segment 1 — Local run (15m)

- Install deps
- Run server locally
- Validate routes with Postman

### Segment 2 — Package for Lambda (15m)

- Create a ZIP that includes `node_modules`
- Upload to Lambda
- Set handler correctly

### Segment 3 — Configure Lambda (15m)

- Env vars: JWT secret, CORS origins
- Test from console

### Segment 4 — Create HTTP API + `$default` route (25m)

- Integrate Lambda
- Enable CORS at API level
- Deploy stage

### Segment 5 — Postman testing + logs (20m)

- Register, login, use Bearer token
- Verify CloudWatch logs

---

# Part A — Local setup (Segment 1)

## 1) Download and unz

## ip the backend starter

Use the provided zip for this week:

- **Backend:** `week6-express-lambda-todos-api-v2.zip`

## 2) Install and run locally

```bash
cp .env.example .env
npm install
npm run dev
```

Verify locally:

- `GET http://localhost:3000/health`

---

## 3) Postman local checks (in-memory mode)

### Register

`POST http://localhost:3000/auth/register`

```json
{ "email": "student@example.com", "name": "Student", "password": "password123" }
```

### Login

`POST http://localhost:3000/auth/login`

```json
{ "email": "student@example.com", "password": "password123" }
```

Copy `data.token`.

### Protected todos

`GET http://localhost:3000/todos`
Header:

- `Authorization: Bearer <token>`

---

# Part B — Package and deploy to Lambda (Segments 2–3)

## 1) Ensure dependencies are installed

```bash
npm ci
```

## 2) Create a zip that includes node_modules

### macOS / Linux

```bash
zip -r function.zip . -x ".git/*" -x "function.zip"
```

### Windows PowerShell

```powershell
# From the project root
Remove-Item -Force function.zip -ErrorAction SilentlyContinue
Compress-Archive -Path * -DestinationPath function.zip
```

> If the ZIP is too large for direct upload, upload it to S3 and choose “Upload from S3” in Lambda.

## 3) Create Lambda function

AWS Console → Lambda → Create function → Author from scratch

- Name: `lv4-week6-express-todos`
- Runtime: Node.js (choose the newest supported runtime shown in the console)
  AWS runtime list: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

Upload:
Lambda → Code → Upload from → `.zip file` → select `function.zip`

## 4) Set Lambda handler

Lambda → Runtime settings → Edit → Handler:

- `src/lambda.handler`

## 5) Set environment variables

Lambda → Configuration → Environment variables:

- `JWT_SECRET` = a long random string
- `CORS_ORIGINS` = `http://localhost:5173`

Leave these blank today:

- `DATABASE_URL` (we will set it on Day 4/5)
- `PG_SSL` (Day 5)

## 6) Test Lambda in console

Use a basic test event (any template) and verify no runtime errors.

---

# Part C — Create API Gateway HTTP API with `$default` route (Segment 4)

AWS Console → API Gateway → Create API → **HTTP API**

## 1) Integration

- Add integration: Lambda
- Select: `lv4-week6-express-todos`

## 2) Routes

Create **one** route:

- Route: `$default`

This acts as a catch‑all for routes that don’t match others:
https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html

## 3) Stage

- Stage name: `$default`
- Auto-deploy: enabled

## 4) CORS (API-level)

Enable CORS on the HTTP API:

- Allowed origins: `http://localhost:5173`
- Allowed methods: `GET,POST,PATCH,DELETE,OPTIONS`
- Allowed headers: `Content-Type,Authorization`

HTTP API CORS requirements:
https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html

Copy the **Invoke URL**.

---

# Part D — Test deployed API (Segment 5)

In Postman, set environment variable:

- `BASE_URL` = `<invoke-url>`

Test:

1) `GET {{BASE_URL}}/health`
2) `POST {{BASE_URL}}/auth/register`
3) `POST {{BASE_URL}}/auth/login` → set `TOKEN`
4) `GET {{BASE_URL}}/todos` with `Authorization: Bearer {{TOKEN}}`
5) `POST {{BASE_URL}}/todos` with body `{ "title": "Hello from serverless express" }`

---

# Part E — Logs (CloudWatch)

Lambda → Monitor → View logs in CloudWatch → open latest stream.

---

# Common issues and fast fixes

## 502 from API Gateway

Usually means Lambda response didn’t match proxy integration expectations or function crashed.
Check CloudWatch logs first.

## CORS errors in browser

Ensure:

- HTTP API CORS is enabled
- Requests include an `Origin` header
  Docs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html

---

# Homework (60 minutes) — screenshots required

1) Lambda function config (runtime, handler, env vars)
2) API Gateway HTTP API routes showing `$default`
3) Postman:
   - register
   - login
   - authorized GET /todos
4) CloudWatch logs showing at least one request hitting the Express app

---

# Next day (Day 4)

- Install local PostgreSQL
- Set `DATABASE_URL`
- Apply schema
- Connect React Vite app (Axios baseURL + auth + protected route)
