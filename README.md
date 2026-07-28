# IssueHub

IssueHub is a lightweight, multi-project issue tracker for small teams. Users can create projects,
manage project membership, file issues, assign work, track status and priority, search and filter
issue lists, and discuss issues through comments.

The application is split into two independently runnable services:

- **Backend:** Node.js 20, Express 5, TypeScript, Prisma, PostgreSQL, Zod, JWT, Vitest, Supertest
- **Frontend:** React 19, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Docker

### 1. Configure Environment

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Docker Compose automatically reads the root `.env` file for the local PostgreSQL container. The
default values match `backend/.env.example`. If you change the local database user, password, name,
or port, update `DATABASE_URL` and `TEST_DATABASE_URL` in `backend/.env` to match.

#### Docker Compose

Copy `.env.example` to `.env` in the repository root before running Docker Compose.

| Variable | Description |
|---|---|
| `POSTGRES_USER` | Local PostgreSQL user |
| `POSTGRES_PASSWORD` | Local PostgreSQL password |
| `POSTGRES_DB` | Local application database created by the Postgres container |
| `POSTGRES_TEST_DB` | Local test database created by the init script on a fresh volume |
| `POSTGRES_PORT` | Host port mapped to PostgreSQL port `5432` |

#### Backend

Copy `backend/.env.example` to `backend/.env`.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Local application database connection string |
| `TEST_DATABASE_URL` | Local test database connection string |
| `JWT_SECRET` | Local HS256 signing secret, minimum 32 characters |
| `JWT_EXPIRES_IN` | JWT lifetime |
| `PORT` | API port |
| `CORS_ORIGIN` | Allowed frontend origin |
| `NODE_ENV` | Runtime environment |

The backend validates environment variables at startup with Zod and exits early on invalid
configuration.

#### Frontend

Copy `frontend/.env.example` to `frontend/.env`.

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

### 2. Start PostgreSQL

```bash
docker compose up -d
```

With the default environment values, Compose creates two local databases:

- `issuehub_dev`
- `issuehub_test`

### 3. Start the Backend

From the repository root:

```bash
cd backend
npm install
npm run prisma:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Backend URL: `http://localhost:4000`

### 4. Start the Frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Scripts

### Root Helpers

| Command | Description |
|---|---|
| `./scripts/setup.sh` | Create local env files, start Docker, install dependencies, generate Prisma client, run migrations, seed data |
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
| `npm run db:seed` | Seed local data |

### Frontend

Run from `frontend/`.

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build the optimized frontend bundle |
| `npm run preview` | Serve the built frontend bundle locally |
| `npm run typecheck` | Type-check frontend code |
| `npm run lint` | Run ESLint |

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
| `GET` | `/api/projects/:projectId/member-candidates` | List users who can be added to a project |
| `POST` | `/api/projects/:projectId/members` | Add member |
| `PATCH` | `/api/projects/:projectId/members/:userId` | Update member role |
| `DELETE` | `/api/projects/:projectId/members/:userId` | Remove member |
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
| `mine` | `true` or `false`; when true, returns issues assigned to or reported by the current user |
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

## Build

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
