# IssueHub

A lightweight, multi-project bug tracker. Sign up, create a project, add teammates by email, file
issues with a status, priority and assignee, search and filter them, and discuss each one in a
comment thread.

Submitted as a take-home assignment. The emphasis is correctness, clean layering, **server-side
permissions proven by tests**, safe migrations, and a repository you can run in under ten minutes.

- **Backend:** Node 20+ · Express 5 · TypeScript (strict) · Prisma 6 · PostgreSQL 16 · Zod · JWT · Vitest + Supertest
- **Frontend:** React 19 · Vite 6 · TypeScript · React Router 7 · TanStack Query 5 · Tailwind 4

---

## Features

| Area | What works |
|---|---|
| **Auth** | Signup, login, logout, session restore on reload. Passwords stored only as a bcrypt hash. JWT bearer auth. Protected routes on both the server and the client |
| **Projects** | Create a project (the creator becomes its maintainer atomically), list the projects you belong to, project detail, add a member by email with a chosen role, list members |
| **Issues** | Create, list, view, edit, delete. Assign and reassign. Change status and priority |
| **Issue list** | Title search (case-insensitive), filter by status, priority and assignee (including *unassigned*), sort by created date, priority or status in either direction, paginated with `{ page, pageSize, total, totalPages }` |
| **Comments** | One thread per issue, oldest first, with author and timestamp |
| **Roles** | `MEMBER` and `MAINTAINER`, scoped **per project** and enforced server-side — see the [permission matrix](#permissions) |
| **UI** | Loading, empty, error and content states on every data view · inline form validation · toasts on every mutation · usable from 360px to 1280px |
| **Quality** | Docker Postgres with separate dev and test databases · committed Prisma migrations · seed script · 172 backend tests · coverage reporting · CI |

Not built, deliberately: password reset, email sending, attachments, labels, audit log, notifications,
comment editing, member removal, project editing, and anything else on the out-of-scope list. See
[Known limitations](#known-limitations).

---

## Quick start

Prerequisites: **Node 20+**, **npm**, and **Docker** (for PostgreSQL).

```bash
# 1. Database — one container serving issuehub_dev and issuehub_test
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run db:migrate:deploy      # applies the committed migrations
npm run db:seed                # demo data
npm run dev                    # → http://localhost:4000

# 3. Frontend (second terminal)
cd frontend
npm install
cp .env.example .env
npm run dev                    # → http://localhost:5173
```

Open <http://localhost:5173> and log in with one of the accounts below.
(`./scripts/setup.sh` does the same setup in one command, if you prefer.)

### Demo credentials

Created by `npm run db:seed`. Seed fixtures, not secrets.

| Email | Password | Role |
|---|---|---|
| `asha@example.com` | `password123` | **MAINTAINER** of both projects — sees every control |
| `ravi@example.com` | `password123` | MEMBER of `WEB` |
| `mei@example.com` | `password123` | MEMBER of `API` |

**To see permissions at work in 30 seconds:** open a `WEB` issue as **Asha** (status and assignee
are editable, Delete is offered), then as **Ravi** (those controls are not rendered, and the API
rejects the requests too — proven by the tests, not just hidden in the UI).

---

## Commands

Two independent applications, each with its own `package.json`. There is no root runner and no
monorepo tool, deliberately — each app is independently runnable.

### `backend/`

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on `:4000` (`tsx watch`) |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm test` | All 172 tests (**needs Docker Postgres up**) |
| `npm run test:unit` | Unit tests only — no database required |
| `npm run test:coverage` | Coverage report |
| `npm run typecheck` / `npm run lint` | Type and lint checks |
| `npm run prisma:generate` | Regenerate Prisma Client |
| `npm run db:migrate:dev` | Create **and** apply a new migration (development only) |
| `npm run db:migrate:deploy` | Apply committed migrations (CI, tests, any non-dev database) |
| `npm run db:seed` | Seed demo data (idempotent — safe to re-run) |

### `frontend/`

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on `:5173` |
| `npm run build` / `npm run preview` | Production build, then serve it |
| `npm run typecheck` / `npm run lint` | Type and lint checks |

### Helper scripts

| Script | What it does |
|---|---|
| `./scripts/setup.sh` | Docker up, install, generate, migrate and seed, for both apps |
| `./scripts/check.sh` | Everything CI runs: backend typecheck, lint and tests · frontend typecheck, lint and build |
| `./scripts/verify.sh` | Quick subset: backend typecheck plus the database-free unit tests |
| `./scripts/db-verify.sh` | **Destructive.** Drops `issuehub_dev` and proves the committed migrations rebuild it from empty |

---

## Environment variables

`backend/.env` (copy from `.env.example`; only the example is committed):

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://issuehub:issuehub@localhost:5432/issuehub_dev?schema=public` | Dev database |
| `TEST_DATABASE_URL` | `postgresql://issuehub:issuehub@localhost:5432/issuehub_test?schema=public` | Test database — **must** be `issuehub_test` |
| `JWT_SECRET` | `change-me-in-production-min-32-characters-long` | HS256 key, **≥32 characters, enforced at boot** |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `PORT` | `4000` | API port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origin |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |

`frontend/.env`: `VITE_API_URL=http://localhost:4000`.

`backend/src/config/env.ts` parses `process.env` with Zod at boot and exits with a readable message
if anything is missing or malformed, so a misconfigured process fails immediately rather than on the
first request.

---

## Migrations

The schema is created **only** from the committed migration files in `backend/prisma/migrations/`.

| Command | When to use it |
|---|---|
| `prisma generate` | After editing `schema.prisma`, and after a fresh `npm install` |
| `prisma migrate dev --name <name>` | Development: create a migration from schema changes and apply it |
| `prisma migrate deploy` | CI, tests, any non-development database — applies committed files only |
| `prisma migrate reset` | Local only: drop, recreate, replay all migrations, re-seed |
| `prisma db push` | **Never used.** It bypasses migration history |

Migrations are committed, an applied migration is never edited, and every schema change gets its own
named migration. `migrate reset` was run before submission to confirm a clean database can be built
from the committed chain alone.

**Enum declaration order is load-bearing.** PostgreSQL sorts enum values by declaration order, and
that is what makes `sort=priority&order=desc` return `CRITICAL` first instead of sorting
alphabetically. A test asserts the actual value order in the database.

> If `issuehub_test` is missing, the Postgres init script did not run — it only runs on an empty
> volume. Fix it with `docker compose down -v && docker compose up -d`.

---

## Testing

```bash
cd backend
npm test                # 172 tests
npm run test:coverage
```

**172 tests passing, 97.7% line coverage** (the goal was ~70%, higher on auth, permissions and
services).

- **Unit tests** cover pure logic only: password hashing, JWT sign/verify including expiry,
  pagination maths, the issue `where`/`orderBy` builders, and the field-level permission rule across
  every role × field × ownership combination.
- **Integration tests** drive the real Express app with Supertest against a **real PostgreSQL**
  database. Prisma is never mocked, because the permission and query behaviour under test *is*
  database behaviour.
- The test schema is built by `prisma migrate deploy` against `TEST_DATABASE_URL`, so it always comes
  from committed migrations. There is no hand-written DDL in the test setup.
- Tables are truncated before each test, and test files run sequentially because they share one
  database. Two independent guards refuse to run the suite unless `DATABASE_URL` points at
  `issuehub_test`, so it can never touch your dev data.
- A migration test asserts that the committed migrations produce the five expected tables, the three
  enum types **in their documented value order**, the composite primary key on `ProjectMember`, and
  the issue-list indexes.

Covered end to end by the integration suite: every endpoint, every status code in the contract, the
whole permission matrix, the search/filter/sort/pagination behaviour, and the error envelope
(including that a forced internal error returns no stack trace and no Prisma text).

---

## Architecture

```
frontend (Vite :5173)  ──  Authorization: Bearer JWT  ──▶  backend (Express :4000)  ──▶  PostgreSQL 16
   React Router                { data } | { error }          middleware → routes
   TanStack Query                                            → controllers → services → Prisma
   AuthContext + localStorage
```

```
backend/src/
  config/env.ts     Zod-parsed environment, fails fast at boot
  lib/              prisma singleton · errors · password · jwt · asyncHandler
  middleware/       authenticate · validate · error-handler · not-found
  modules/          auth · projects · issues · comments · health  (routes/controller/service/schema)
  shared/           permissions · pagination · selectors · schemas
  app.ts            buildApp() — no listen(), so Supertest can drive the real app in-process
frontend/src/
  api/              fetch wrapper + one module per resource
  components/       Button Field Modal Drawer Toast Skeleton Pagination States icons
  features/         auth · projects · issues · comments  (hooks + feature components)
  layouts/ pages/ routes/ types/ utils/
```

**Request pipeline:** `cors → express.json → router → authenticate → validate(zod) → controller →
service (Prisma) → errorHandler`.

**Layer rules:** controllers are thin — they never touch Prisma and contain no role checks. Services
own authorization, business rules and Prisma access, and throw typed `AppError`s. There is
deliberately **no DAO/repository layer**: Prisma Client already *is* the data-access layer, so a
hand-written wrapper at this size would be indirection for its own sake. This is a conscious
deviation from the assignment's `routes/services/dao/models` hint.

Two operations need atomicity and use a transaction: creating a project together with the creator's
maintainer membership (a project must never exist without a maintainer), and the issue list's
`findMany` + `count` pair at `REPEATABLE READ` (so the pagination total can never disagree with the
page returned).

### Permissions

Two roles, scoped **per project** — a user can be a maintainer of one project and a member of
another. All membership logic lives in `backend/src/shared/permissions.ts` and nowhere else.

| Action | Non-member | MEMBER (not reporter) | MEMBER (reporter) | MAINTAINER |
|---|---|---|---|---|
| View project / members / issues / comments | ✗ 404 | ✓ | ✓ | ✓ |
| Create an issue | ✗ 404 | ✓ | ✓ | ✓ |
| Add a comment | ✗ 404 | ✓ | ✓ | ✓ |
| Update `title` / `description` / `priority` | ✗ 404 | ✗ 403 | ✓ | ✓ |
| Update `status` or `assigneeId` (**including at creation**) | ✗ 404 | ✗ 403 | ✗ 403 | ✓ |
| Delete an issue | ✗ 404 | ✗ 403 | ✗ 403 | ✓ |
| Add a project member | ✗ 404 | ✗ 403 | ✗ 403 | ✓ |

Two rules explain the whole table:

1. **Not a member → `404`, never `403`**, so a private project's existence is never confirmed.
2. **A member with an insufficient role, or who is not the reporter → `403`**, with a message naming
   the requirement.

Additionally, `assigneeId` must belong to the project, or the request fails with
`422 ASSIGNEE_NOT_MEMBER`.

The UI hides controls a viewer cannot use, but that is **usability, never a security control** — the
server re-derives permission on every request, and the `viewerRole` it returns is advisory only. JWTs
carry only `sub`, `iat` and `exp`, so roles are read from the database per request and a stale token
can never carry stale permissions. `passwordHash` is never selected into a response, which a test
asserts recursively.

### API

Base URL `http://localhost:4000`. Full contract with request and response bodies:
[docs/05](docs/05-backend-schema-api.md).

| Method | Path | Permission |
|---|---|---|
| POST | `/api/auth/signup` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | any user (`204`, client-side token disposal) |
| GET | `/api/me` | any user |
| POST | `/api/projects` | any user (creator becomes maintainer) |
| GET | `/api/projects` | membership-scoped |
| GET | `/api/projects/:projectId` | member |
| GET | `/api/projects/:projectId/members` | member |
| POST | `/api/projects/:projectId/members` | maintainer |
| GET | `/api/projects/:projectId/issues` | member |
| POST | `/api/projects/:projectId/issues` | member (maintainer to set an assignee) |
| GET | `/api/issues/:issueId` | member |
| PATCH | `/api/issues/:issueId` | reporter (limited fields) or maintainer |
| DELETE | `/api/issues/:issueId` | maintainer |
| GET | `/api/issues/:issueId/comments` | member |
| POST | `/api/issues/:issueId/comments` | member |
| GET | `/api/health` | public (liveness + database ping) |

**Issue list query parameters:** `q` (case-insensitive title substring), `status`, `priority`,
`assignee` (a user id or the literal `unassigned`), `sort` ∈ `createdAt|priority|status`, `order` ∈
`asc|desc`, `page` ≥ 1, `pageSize` 1–100. Filters combine with AND. Invalid values are **rejected
with `400`, never silently clamped.** A page past the end returns `200` with an empty array and an
honest `meta`.

**Every error uses one envelope**, produced by one middleware:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request body",
             "details": { "title": ["Title is required"] } } }
```

Unexpected failures are logged server-side with their stack and returned as
`500 { "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong" } }` — no stack
traces, no Prisma text and no SQL ever reach the client.

---

## Tech choices and trade-offs

| Decision | Alternative | Why |
|---|---|---|
| Node + Express | FastAPI (the assignment's stated preference) | Both were offered. TypeScript end to end means one language and one mental model |
| Prisma | Drizzle, Kysely, raw SQL | First-class migration tooling, a typed client, and a schema file a reviewer can read in one sitting |
| Prisma Client directly in services | Repository/DAO layer | Prisma already *is* the data layer; a wrapper would add indirection without benefit at this size |
| Zod | Joi, class-validator | Runtime validation and static types from a single declaration |
| JWT in `localStorage` | httpOnly cookie + CSRF token | Simplest for a bearer API, and the assignment suggested Bearer. The XSS trade-off is documented below |
| bcrypt (cost 10, 4 under test) | argon2 | Ubiquitous and adequate; the lower test cost keeps the suite fast |
| Real PostgreSQL in tests | Mocked Prisma, or SQLite | The permission and query behaviour under test *is* database behaviour — mocking it would test nothing. Costs Docker as a prerequisite |
| TanStack Query | Redux Toolkit Query, plain `useEffect` | Removes hand-rolled loading, error and cache code — exactly the states this UI has to show |
| Tailwind | MUI, Chakra, shadcn | No bundle bloat and no theme API to fight, for a small design system |
| Filter state in the URL | Component state | Shareable links, reload-safe, and a natural cache key |
| Two `package.json` files | npm workspaces, Turborepo | Nothing to explain — each app runs on its own |
| Hand-written frontend types | OpenAPI codegen, tRPC | One small types file beats a generator toolchain for 17 endpoints |

Deliberately **not** used: Redis, queues, WebSockets, GraphQL, a DI container, Redux/Zustand, Axios,
a component library, or any AI feature.

---

## Assumptions

The assignment left these open; each was resolved deliberately. Full rationale in
[docs/01 §10](docs/01-project-requirements.md).

| # | Assumption |
|---|---|
| A1 | Node + Express + TypeScript, the second of the two offered stacks |
| A2 | PostgreSQL everywhere, never SQLite, to avoid dialect drift and keep the tests honest |
| A3 | Prisma Migrate is the Node equivalent of Alembic / Django migrations |
| A4, A6 | Only maintainers delete issues — not even the reporter. Deletion is unrecoverable, so the safer bound was chosen |
| A5, A15 | Reporters may change `title`, `description` and `priority` only. `status` and `assigneeId` are maintainer-only, **including at creation** |
| A7 | Non-members get `404`, not `403`, so private projects stay invisible |
| A8 | Project `key` is globally unique and uppercase, `^[A-Z][A-Z0-9]{1,9}$` |
| A9 | An added member must already have an account — no email is sent, so there is no invitation record |
| A10 | Memberships cannot be removed and roles cannot be changed after adding |
| A11 | Logout is client-side token disposal; `POST /api/auth/logout` returns `204` |
| A12 | The JWT is stored in `localStorage` |
| A13 | Validation failures are `400`. `422` is reserved for exactly one case: an assignee outside the project |
| A14 | Invalid `page` / `pageSize` are rejected, not clamped |
| A16 | Statuses move freely between all four values — no workflow state machine |
| A17 | Deleting an issue cascades its comments; deleting a user is not supported |
| A18 | Identifiers are CUIDs |

---

## Known limitations

Conscious scope decisions, not oversights.

**Security** — these are the ones I would fix first in a real product:

- **No server-side token revocation.** Bearer JWTs are stateless, so a token that leaked before
  logout stays valid until it expires.
- **The JWT in `localStorage` is exposed to XSS.** An httpOnly `SameSite` cookie plus CSRF
  protection is the production answer.
- **No rate limiting or brute-force protection** on login, and no `helmet` security headers.

**Features not built** — password reset, email sending and real invitations · member removal or role
changes after adding · project editing or deletion · comment editing or deletion · issue history,
audit log, attachments, labels and notifications · dark mode and internationalisation.

**Testing** — there is **no frontend test suite**. The assignment asked for backend tests, so that
time went into backend coverage instead; the full request flow is covered end to end by the
integration suite.

**Scale** — everything below is invisible at the size this app targets, and each has a known fix:

- Title search is a case-insensitive `contains` on the title only, with no supporting index. A
  `pg_trgm` GIN index is the fix once a single project holds thousands of issues.
- Comments are not paginated.
- `issueCount` on the projects list is a per-row count, which would need batching for a user in
  hundreds of projects.
- `Issue.reporterId`, `Issue.assigneeId` and `Comment.authorId` have no standalone index. Harmless
  today because no endpoint deletes a user, so those referential checks never run; a user-deletion
  feature should add the indexes in the same migration.

**Dependencies** — `react-router-dom` 7.18.1 falls inside advisory `GHSA-qwww-vcr4-c8h2`, which
concerns React Router's RSC mode. It is not reachable here: this is a plain client-rendered
declarative router with no RSC mode and no server actions, and the fix lands only in v8, outside the
React Router 7 stack this project targets. The remaining `npm audit` findings in both apps are
dev-only toolchain transitives and are absent from the runtime path.

## With more time

1. Refresh tokens with rotation and a revocation list, and move the access token to an httpOnly cookie.
2. Rate limiting and `helmet`, then an audit log of status and assignee changes.
3. A small Playwright suite covering the happy path and the member-versus-maintainer split in the UI.
4. Per-project issue keys (`WEB-1`) via a sequence, which reviewers expect from a tracker.
5. Member removal and role changes, with "a project must keep at least one maintainer" enforced in a transaction.
6. Full-text search over title and description with a `tsvector` column and a GIN index.
7. Optimistic updates on the status and assignee selects, so triage feels instant.
8. A deployed demo with the credentials above.

---

## Repository layout

```
backend/                  Express API — Prisma schema, committed migrations, seed script, tests
frontend/                 React single-page app
docs/                     Design documents 01–06, written before implementation
docker/                   Postgres init script that creates issuehub_test
scripts/                  Helper scripts (setup, check, verify, migration safety)
.github/workflows/ci.yml  CI — migrate deploy, typecheck, lint, tests against a Postgres service
docker-compose.yml        PostgreSQL 16
```

Also in the repository, and **not part of the application**: `AGENTS.md`, `CLAUDE.md`, `.claude/` and
`.codex/` hold repository conventions and guardrails for AI coding tools, `docs/architecture/`
records the invariants those tools must respect, and `Fullstack assignment.doc` is the original brief
kept for reference.

### Design documents

Written before any code, and the specification the implementation follows:
[requirements](docs/01-project-requirements.md) ·
[technical](docs/02-technical-requirements.md) ·
[UI/UX](docs/03-ui-ux-design.md) ·
[flows](docs/04-application-flow.md) ·
[schema & API](docs/05-backend-schema-api.md) ·
[plan](docs/06-implementation-plan.md)
