# IssueHub

IssueHub is a lightweight, multi-project issue tracker for small teams. Users can create projects,
manage project membership, file issues, assign work, track status and priority, search and filter
issue lists, and discuss issues through comments.

The application is split into two independently runnable services:

- **Backend:** Node.js 20, Express 5, TypeScript, Prisma, PostgreSQL, Zod, JWT, Vitest, Supertest
- **Frontend:** React 19, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS

## Live Deployment

| Service | URL |
|---|---|
| Web app | https://issuehub-web-production.up.railway.app |
| API | https://issuehub-api-production.up.railway.app |
| Health check | https://issuehub-api-production.up.railway.app/api/health |

Sign in with any of the [demo accounts](#demo-accounts) below — the hosted database carries the same
seed data. Deployment details are in [Deploying to Railway](#deploying-to-railway).

---

## Features

| Area | Capabilities |
|---|---|
| Authentication | Signup, login, logout, session restore, protected routes |
| Projects | Create projects, list accessible projects, view project details |
| Members | List project members, add members by email, assign per-project roles |
| Issues | Create, view, update, delete, assign, prioritize, and change status |
| Issue List | Search by title, filter by status/priority/assignee, sort, paginate |
| Comments | Oldest-first comment threads with author and timestamp |
| Permissions | Project-scoped `MEMBER` and `MAINTAINER` roles enforced server-side |
| UI States | Loading, empty, error, validation, success, and responsive states |

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Docker

### 1. Start PostgreSQL

```bash
docker compose up -d
```

The compose setup creates both development and test databases:

- `issuehub_dev`
- `issuehub_test`

### 2. Start the Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Backend URL: `http://localhost:4000`

### 3. Start the Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend URL: `http://localhost:5173`

### Demo Accounts

Created by `npm run db:seed`.

| Email | Password | Access |
|---|---|---|
| `asha.kumar@fuser.dev` | `password123` | Maintainer on Fuser, Alpine Intellect, and Alpine-GTM |
| `ravi.menon@fuser.dev` | `password123` | Maintainer on Fuser, member on Alpine-GTM |
| `maya.iyer@alpineintellect.ai` | `password123` | Maintainer on Alpine Intellect, member on Fuser and Alpine-GTM |
| `daniel.park@alpineintellect.ai` | `password123` | Maintainer on Alpine-GTM, member on Alpine Intellect |

---

## Scripts

### Root Helpers

| Command | Description |
|---|---|
| `./scripts/setup.sh` | Start Docker, install dependencies, generate Prisma client, run migrations, seed data |
| `./scripts/verify.sh` | Fast backend typecheck and unit-test pass |
| `./scripts/check.sh` | Full quality gate for backend and frontend |
| `./scripts/db-verify.sh` | Rebuilds the development database from committed migrations |

### Backend

Run from `backend/`.

| Command | Description |
|---|---|
| `npm run dev` | Start the API in watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled API |
| `npm run typecheck` | Type-check backend code |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit and integration tests |
| `npm run test:unit` | Run database-free unit tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run db:migrate:dev` | Create and apply a development migration |
| `npm run db:migrate:deploy` | Apply committed migrations |
| `npm run db:seed` | Seed demo data |

### Frontend

Run from `frontend/`.

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build the production bundle |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check frontend code |
| `npm run lint` | Run ESLint |

---

## Environment

### Backend

Copy `backend/.env.example` to `backend/.env`.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string for development |
| `TEST_DATABASE_URL` | PostgreSQL connection string for tests |
| `JWT_SECRET` | HS256 signing secret, minimum 32 characters |
| `JWT_EXPIRES_IN` | JWT lifetime |
| `PORT` | API port |
| `CORS_ORIGIN` | Allowed frontend origin |
| `NODE_ENV` | Runtime environment |

The backend validates environment variables at startup with Zod and exits early on invalid
configuration.

### Frontend

Copy `frontend/.env.example` to `frontend/.env`.

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

---

## Architecture

```text
React SPA (:5173)
  -> fetch client with Bearer JWT
  -> Express API (:4000)
  -> Prisma Client
  -> PostgreSQL 16
```

### Backend Structure

```text
backend/src/
  config/          environment validation
  lib/             Prisma, JWT, password hashing, errors, logging
  middleware/      auth, validation, error handling, not found handling
  modules/         auth, projects, issues, comments, health
  shared/          selectors, permissions, pagination, shared schemas
  app.ts           Express app factory
  server.ts        process entry point
```

Request flow:

```text
cors -> express.json -> router -> authenticate -> validate -> controller -> service -> Prisma
```

Controllers handle HTTP concerns. Services own business rules, authorization checks, and database
operations.

### Frontend Structure

```text
frontend/src/
  api/             API client and resource modules
  components/      shared UI primitives
  features/        auth, projects, issues, comments
  layouts/         application and auth layouts
  pages/           route-level screens
  routes/          React Router configuration
  types/           API-facing TypeScript types
  utils/           labels and formatting helpers
```

The frontend stores the JWT in `localStorage`, restores the session through `/api/me`, and uses
TanStack Query for request state and cache invalidation.

---

## Authorization Model

Roles are scoped per project.

| Action | Non-member | Member | Reporter | Maintainer |
|---|---:|---:|---:|---:|
| View project, members, issues, comments | 404 | Yes | Yes | Yes |
| Create issue | 404 | Yes | Yes | Yes |
| Add comment | 404 | Yes | Yes | Yes |
| Update title, description, priority | 404 | No | Yes | Yes |
| Update status or assignee | 404 | No | No | Yes |
| Delete issue | 404 | No | No | Yes |
| Add project member | 404 | No | No | Yes |

Important rules:

- Non-members receive `404` to avoid exposing private project existence.
- Authenticated members without enough permission receive `403`.
- `assigneeId` must belong to the issue's project.
- Password hashes are never returned by API responses.
- UI permissions are usability only; the API re-checks every protected operation server-side.

---

## API Overview

Base URL: `http://localhost:4000`

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/login` | Authenticate and return JWT |
| `POST` | `/api/auth/logout` | Logout endpoint |
| `GET` | `/api/me` | Current authenticated user |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/projects` | List accessible projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/:projectId` | Project detail |
| `GET` | `/api/projects/:projectId/members` | List members |
| `POST` | `/api/projects/:projectId/members` | Add member |
| `GET` | `/api/projects/:projectId/issues` | List issues |
| `POST` | `/api/projects/:projectId/issues` | Create issue |
| `GET` | `/api/issues/:issueId` | Issue detail |
| `PATCH` | `/api/issues/:issueId` | Update issue |
| `DELETE` | `/api/issues/:issueId` | Delete issue |
| `GET` | `/api/issues/:issueId/comments` | List comments |
| `POST` | `/api/issues/:issueId/comments` | Add comment |

Issue list query parameters:

| Parameter | Description |
|---|---|
| `q` | Case-insensitive title search |
| `status` | Filter by issue status |
| `priority` | Filter by issue priority |
| `assignee` | User id or `unassigned` |
| `sort` | `createdAt`, `priority`, or `status` |
| `order` | `asc` or `desc` |
| `page` | Page number, starting at 1 |
| `pageSize` | Page size, capped by API validation |

All errors use the same envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "title": ["Title is required"]
    }
  }
}
```

---

## Database and Migrations

Prisma schema: `backend/prisma/schema.prisma`

Migration files: `backend/prisma/migrations/`

Use committed migrations for schema changes:

```bash
cd backend
npm run db:migrate:dev -- --name <migration_name>
```

Apply existing migrations:

```bash
cd backend
npm run db:migrate:deploy
```

Regenerate Prisma Client after schema changes:

```bash
cd backend
npm run prisma:generate
```

---

## Testing and Quality

Run the full project quality gate:

```bash
./scripts/check.sh
```

Run backend tests directly:

```bash
cd backend
npm test
```

Run frontend checks directly:

```bash
cd frontend
npm run typecheck
npm run lint
npm run build
```

The backend test suite includes:

- Unit tests for pure logic and permission rules
- Integration tests through the real Express app
- PostgreSQL-backed test database
- Migration verification
- Error-envelope and authorization coverage

---

## Production Build

Backend:

```bash
cd backend
npm run build
npm start
```

Frontend:

```bash
cd frontend
npm run build
npm run preview
```

For production deployment, configure environment variables explicitly and run database migrations
with `npm run db:migrate:deploy` before starting the API.

---

## Deploying to Railway

The hosted instance runs as three Railway services in one project, in the `production` environment.

| Service | Source | Runtime |
|---|---|---|
| `Postgres` | Railway PostgreSQL 16 template | Reachable from the API over the private network as `postgres.railway.internal` |
| `issuehub-api` | `backend/Dockerfile`, root directory `/backend` | Node 20 on debian-slim, production dependencies only, runs as the non-root `node` user |
| `issuehub-web` | `frontend/Dockerfile`, root directory `/frontend` | Caddy serving the built Vite assets |

Both app services deploy from `main` on push. `watchPatterns` scope each service to its own
directory, so a backend-only commit does not rebuild the frontend.

### Per-service configuration

Build and deploy settings are committed as config-as-code in `backend/railway.json` and
`frontend/railway.json` — builder, healthcheck path and timeout, and an `ON_FAILURE` restart policy.

Three details are worth knowing before changing anything:

- **Migrations run as a pre-deploy step**, not as part of the start command. A Railway start command
  is argv-split rather than shell-interpreted, so a `migrate && start` chain degrades silently into
  extra arguments passed to Prisma and the server never boots. `preDeployCommand` also runs the
  migration once per deployment instead of once per replica restart.
- **`PORT` is pinned to 4000** on the API service. Railway injects its own `PORT` (8080) at runtime,
  which would leave the app listening on a port the service domain does not target. Pinning it keeps
  the Dockerfile's `EXPOSE`, the domain target port, and local development in agreement.
- **`VITE_API_URL` is baked in at build time**, because Vite inlines `import.meta.env`. Changing the
  API URL requires a **rebuild** of the web service, not a restart. It is declared as a Docker `ARG`
  and Railway supplies service variables to Docker builds as build args.

### Environment variables

Set on `issuehub-api`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — a Railway reference, so no credential is copied |
| `JWT_SECRET` | Random 64-character hex value, set from stdin so it never appears in shell history |
| `CORS_ORIGIN` | The web service URL — the API allows that origin only |
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `JWT_EXPIRES_IN` | `1d` |

Set on `issuehub-web`:

| Variable | Value |
|---|---|
| `VITE_API_URL` | The API service URL |

### Seeding the hosted database

Migrations apply automatically on every deploy. Demo data is a deliberate one-off, run from a
workstation against the database's public proxy URL:

```bash
cd backend
railway run --service Postgres sh -c 'DATABASE_URL="$DATABASE_PUBLIC_URL" npm run db:seed'
```

The seed is idempotent — every write is an upsert keyed on a unique column, and each project's
issues are replaced wholesale inside one transaction, so re-running it never accumulates duplicates.

### Recreating the deployment from scratch

```bash
railway login
railway init --name issue-nest
railway add --database postgres
railway add --service issuehub-api
railway add --service issuehub-web
railway domain --service issuehub-api --port 4000
railway domain --service issuehub-web --port 8080
```

Then set the variables above, set each service's root directory (`/backend`, `/frontend`) and
config-as-code path (`/backend/railway.json`, `/frontend/railway.json`), and connect both services to
the repository:

```bash
railway service source connect --repo <owner>/issue-nest --branch main --service issuehub-api
railway service source connect --repo <owner>/issue-nest --branch main --service issuehub-web
```

---

## Repository Layout

```text
backend/                 Express API, Prisma schema, migrations, seed data, tests
frontend/                React single-page application
docker/                  PostgreSQL initialization scripts
docs/                    Technical and product documentation
scripts/                 Setup, verification, and quality-gate scripts
docker-compose.yml       Local PostgreSQL 16 setup
```

Additional technical documentation is available in `docs/`.
