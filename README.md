# IssueHub

A lightweight, multi-project bug tracker. Sign up, create a project, add teammates by email, file
issues with status/priority/assignee, search and filter them, and discuss them in a comment thread.

Built as a take-home assignment. The emphasis is correctness, clean layering, **server-side
permissions proven by tests**, safe migrations, and a repository a reviewer can run in under ten
minutes.

- **Backend:** Node 20+ · Express 5 · TypeScript (strict) · Prisma 6 · PostgreSQL 16 · Zod · JWT · Vitest + Supertest
- **Frontend:** React 19 · Vite 6 · TypeScript · React Router 7 · TanStack Query 5 · Tailwind 4

Planning documents (the authoritative specification) live in [`docs/`](docs/):
[requirements](docs/01-project-requirements.md) ·
[technical](docs/02-technical-requirements.md) ·
[UI/UX](docs/03-ui-ux-design.md) ·
[flows](docs/04-application-flow.md) ·
[schema & API](docs/05-backend-schema-api.md) ·
[plan](docs/06-implementation-plan.md).

---

## Quick start

Prerequisites: **Node 20+**, **npm**, and **Docker** (for PostgreSQL).

```bash
# 1. Database — creates issuehub_dev and issuehub_test in one container
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

Then open <http://localhost:5173> and log in with a demo account below.

There is also a bootstrap wrapper that does steps 1–3's setup in one go:

```bash
./scripts/setup.sh
```

### Demo credentials

Created by `npm run db:seed`. These are fixtures, not secrets.

| Email | Password | Role |
|---|---|---|
| `asha@example.com` | `password123` | **MAINTAINER** of both projects — see every control |
| `ravi@example.com` | `password123` | MEMBER of `WEB` — maintainer controls are absent |
| `mei@example.com` | `password123` | MEMBER of `API` |

Logging in as **Ravi** and opening a `WEB` issue is the fastest way to see permissions at work: no
Delete button, no status/assignee selects, and the API rejects those calls even if you craft them
by hand.

---

## Commands

Two independent applications, each with its own `package.json`. There is no root runner and no
monorepo tool — that is deliberate (docs/02 §2).

### `backend/`

| Command | What it does |
|---|---|
| `npm run dev` | `tsx watch` dev server on `:4000` |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit + integration (**needs Docker Postgres up**) |
| `npm run test:unit` | Unit tests only — no database required |
| `npm run test:coverage` | Coverage report (`text`, `html`, `lcov`) |
| `npm run prisma:generate` | Regenerate Prisma Client |
| `npm run db:migrate:dev` | Create **and** apply a new migration (development only) |
| `npm run db:migrate:deploy` | Apply committed migrations (CI, test, any non-dev database) |
| `npm run db:seed` | Seed demo data (idempotent) |

### `frontend/`

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on `:5173` |
| `npm run build` | Type-check and production build |
| `npm run preview` | Serve the production build |
| `npm run typecheck` / `npm run lint` | Type and lint checks |

### Repo wrappers

| Script | What it does |
|---|---|
| `./scripts/setup.sh` | Docker up, install, generate, migrate, seed for both apps |
| `./scripts/verify.sh` | Fast inner loop: backend typecheck + unit tests (no database) |
| `./scripts/check.sh` | Full gate: backend typecheck/lint/test · frontend typecheck/lint/build |
| `./scripts/db-verify.sh` | **Destructive.** Proves the committed migrations rebuild `issuehub_dev` from empty |

---

## Environment variables

`backend/.env` (copy from `.env.example` — only the example is committed):

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://issuehub:issuehub@localhost:5432/issuehub_dev?schema=public` | Dev database |
| `TEST_DATABASE_URL` | `postgresql://issuehub:issuehub@localhost:5432/issuehub_test?schema=public` | Test database — **must** be `issuehub_test` |
| `JWT_SECRET` | `change-me-in-production-min-32-characters-long` | HS256 key, **≥32 characters enforced at boot** |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `PORT` | `4000` | API port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origin |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |

`frontend/.env`: `VITE_API_URL=http://localhost:4000`.

`src/config/env.ts` parses `process.env` with Zod at boot and exits with a readable message if
anything is missing or malformed, so a misconfigured process fails immediately instead of at the
first request.

---

## Migrations

The schema is created **only** from committed migration files in `backend/prisma/migrations/`.

| Command | When to use it |
|---|---|
| `prisma generate` | After editing `schema.prisma`, and after a fresh `npm install` |
| `prisma migrate dev --name <meaningful_name>` | Development: create a migration from schema changes and apply it |
| `prisma migrate deploy` | CI, test setup, and any non-development database — applies committed files only |
| `prisma migrate reset` | Local only: drop, recreate, replay all migrations, re-seed |
| `prisma db push` | **Never used.** It bypasses migration history |

Rules followed: migrations are committed, an applied migration is never edited, every schema change
gets a new named migration, and `migrate reset` is run before submission to prove a clean database
can be built from the committed chain.

**Enum declaration order is load-bearing.** PostgreSQL sorts enum values by declaration order, which
is what makes `sort=priority&order=desc` return `CRITICAL` first rather than sorting alphabetically.
Reordering an enum after the first migration would need hand-written SQL. A test asserts the actual
value order in the database.

> If `issuehub_test` is missing, the Postgres init script did not run — it only runs on an empty
> volume. Fix it with `docker compose down -v && docker compose up -d`.

---

## Testing

```bash
cd backend
npm test               # 172 tests
npm run test:coverage
```

Current state: **172 tests passing, 97.7% line coverage** (internal target was ~70%, higher on
auth/permissions/services).

**Strategy** (docs/02 §11–12):

- **Unit tests** cover pure logic only — password hashing, JWT sign/verify including expiry,
  pagination maths, the issue `where`/`orderBy` builders, and the field-level permission rule across
  every role × field × ownership combination. Nothing asserts library internals.
- **Integration tests** drive the real Express app with Supertest against a **real PostgreSQL**
  database. Prisma is never mocked, because the permission and query behaviour under test *is*
  database behaviour.
- The test schema is built by `prisma migrate deploy` against `TEST_DATABASE_URL` in `globalSetup`,
  so it always comes from committed migrations. There is no hand-written DDL in test setup.
- Tables are truncated **before** each test (so a failed test leaves its rows behind for
  inspection), and `fileParallelism` is off because the files share one database.
- Two independent guards refuse to run the suite unless `DATABASE_URL` points at `issuehub_test`, so
  the suite can never truncate your dev data.

A migration suite asserts that the committed migrations produce the five expected tables, the three
enum types **in their documented value order**, the composite primary key on `ProjectMember`, and the
issue-list indexes.

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
  config/env.ts            Zod-parsed environment, fails fast at boot
  lib/                     prisma singleton · errors · password · jwt · asyncHandler · http
  middleware/              authenticate · validate · error-handler · not-found
  modules/                 auth · projects · issues · comments · health   (routes/controller/service/schema)
  shared/                  permissions · pagination · selectors · schemas
  app.ts                   buildApp() — no listen(), so Supertest can drive it in-process
frontend/src/
  api/                     fetch wrapper + one module per resource
  components/              Button Field Modal Drawer Toast Skeleton Pagination States icons
  features/                auth · projects · issues · comments   (hooks + feature components)
  layouts/ pages/ routes/ types/ utils/
```

**Request pipeline:** `cors → express.json → router → authenticate → validate(zod) → controller →
service (Prisma) → errorHandler`.

**Layer rules:** controllers are thin — they never touch Prisma and contain no role checks. Services
own authorization, business rules, and Prisma access, and throw typed `AppError`s. There is
deliberately **no DAO/repository layer**: Prisma Client already is the data-access layer, and a
hand-written wrapper at this size would be indirection for its own sake. This is a documented
deviation from the assignment's `routes/services/dao/models` hint (docs/01 §11).

### Permissions

Two roles, scoped **per project** — a user can be a MAINTAINER of one project and a MEMBER of
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
2. **Member with an insufficient role or not the reporter → `403`**, with a message naming the
   requirement.

Additionally, `assigneeId` must belong to the project or the request fails with
`422 ASSIGNEE_NOT_MEMBER`.

The UI hides controls a viewer cannot use, but that is **usability, never a security control** — the
server re-derives permission on every request, and the `viewerRole` field it returns is advisory
only. JWTs carry just `sub`/`iat`/`exp`, so roles are read from the database per request and a stale
token can never carry stale permissions.

### API

Base URL `http://localhost:4000`. Full contract with request/response bodies:
[docs/05](docs/05-backend-schema-api.md).

| Method | Path | Permission |
|---|---|---|
| POST | `/api/auth/signup` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | any user (`204`, client-side disposal) |
| GET | `/api/me` | any user |
| POST | `/api/projects` | any user (creator becomes MAINTAINER) |
| GET | `/api/projects` | membership-scoped |
| GET | `/api/projects/:projectId` | member |
| GET | `/api/projects/:projectId/members` | member |
| POST | `/api/projects/:projectId/members` | maintainer |
| GET | `/api/projects/:projectId/issues` | member |
| POST | `/api/projects/:projectId/issues` | member (maintainer to set assignee) |
| GET | `/api/issues/:issueId` | member |
| PATCH | `/api/issues/:issueId` | reporter (limited fields) or maintainer |
| DELETE | `/api/issues/:issueId` | maintainer |
| GET | `/api/issues/:issueId/comments` | member |
| POST | `/api/issues/:issueId/comments` | member |
| GET | `/api/health` | public (liveness + database ping) |

**Issue list query parameters:** `q` (case-insensitive title substring), `status`, `priority`,
`assignee` (a user id or the literal `unassigned`), `sort` ∈ `createdAt|priority|status`, `order` ∈
`asc|desc`, `page` ≥ 1, `pageSize` 1–100. Filters combine with AND. Invalid values are **rejected
with `400`, never silently clamped**. A page past the end returns `200` with an empty array and
honest `meta`.

**Every error uses one envelope**, from one middleware:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request body",
             "details": { "title": ["Title is required"] } } }
```

Unexpected failures are logged server-side with their stack and returned as
`500 { "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong" } }` — no stack
traces, no Prisma text, no SQL ever reaches the client.

---

## Tech choices and trade-offs

| Decision | Alternative | Why |
|---|---|---|
| Node + Express | FastAPI (the assignment's stated preference) | Both were permitted. TypeScript end to end means one language and one mental model |
| Prisma | Drizzle, Kysely, raw SQL | First-class migration tooling, typed client, a schema file a reviewer can read |
| Prisma Client directly in services | Repository/DAO layer | Prisma already *is* the data layer — see docs/01 §11 |
| Zod | Joi, class-validator | Runtime validation and static types from one declaration |
| JWT in `localStorage` | httpOnly cookie + CSRF token | Simplest with a bearer API. The XSS trade-off is a documented limitation |
| bcrypt (cost 10, 4 under test) | argon2 | Ubiquitous and adequate. The lower test cost keeps the suite fast |
| Real PostgreSQL in tests | Mocked Prisma or SQLite | The permission and query behaviour under test *is* database behaviour. Costs Docker as a prerequisite |
| TanStack Query | Redux Toolkit Query, plain `useEffect` | Removes hand-rolled loading/error/cache code — exactly the states this UI must show |
| Tailwind | MUI/Chakra/shadcn | No bundle bloat, no theme API to fight, full control over a small design system |
| URL-based filter state | Component state | Shareable links, reload-safe, and a natural query cache key |
| Two `package.json` files | npm workspaces, Turborepo | Zero configuration to explain — each app runs independently |
| Hand-written frontend types | OpenAPI codegen, tRPC | ~110 lines of types beats a generator toolchain for 17 endpoints |

Deliberately **not** used: Redis, queues, WebSockets, GraphQL, a DI container, Redux/Zustand, Axios,
a component library, or any AI feature. AI tooling assisted development, but IssueHub ships no AI
product functionality — that was never in scope.

---

## Assumptions

The assignment left these open. Each was resolved deliberately (full list and rationale in
docs/01 §10).

| # | Assumption |
|---|---|
| A1 | Node + Express + TypeScript, the second of the two offered stacks |
| A2 | PostgreSQL everywhere, never SQLite, to avoid dialect drift and keep tests honest |
| A3 | Prisma Migrate is the Node equivalent of Alembic/Django migrations |
| A4/A6 | Only maintainers delete issues — not even the reporter. Deletion is unrecoverable, so the safer bound was chosen |
| A5/A15 | Reporters may change `title`/`description`/`priority` only. `status` and `assigneeId` are maintainer-only, **including at creation** |
| A7 | Non-members get `404`, not `403`, so private projects stay invisible |
| A8 | Project `key` is globally unique and uppercase, `^[A-Z][A-Z0-9]{1,9}$` |
| A9 | An added member must already have an account (no email is sent, so there is no invitation record) |
| A10 | Memberships cannot be removed and roles cannot be changed after adding |
| A11 | Logout is client-side token disposal — `POST /api/auth/logout` returns `204` |
| A12 | The JWT is stored in `localStorage` |
| A13 | Validation failures are `400`. `422` is reserved for exactly one case: an assignee outside the project |
| A14 | Invalid `page`/`pageSize` are rejected, not clamped |
| A16 | Statuses transition freely between all four values — no workflow state machine |
| A17 | Deleting an issue cascades its comments. Deleting a user is not supported |
| A18 | Identifiers are CUIDs |

---

## Known limitations

Every item here is a conscious scope decision, not an oversight.

- **No server-side token revocation.** Bearer JWTs are stateless, so a token that leaked before
  logout stays valid until it expires. Production answer: short-lived access tokens plus refresh
  tokens and a revocation list.
- **JWT in `localStorage` is XSS-exposed.** Production answer: an httpOnly, `SameSite` cookie plus
  CSRF protection.
- **No rate limiting or brute-force protection** on login, and no `helmet` security headers.
- **No password reset**, no email sending, and no real invitations.
- **No member removal or role change** after a member is added.
- **No project edit or delete endpoint.** The cascade behaviour is declared in the schema for
  correctness but no route exposes it.
- **No comment edit or delete.**
- **No issue history, audit log, attachments, labels, or notifications.**
- **No frontend test suite.** The assignment asked for backend tests, and the honest trade was to
  spend that time on backend coverage. The full happy path was verified manually in a browser.
- **Search is a case-insensitive `contains` on the title only** — not full-text, and not the
  description.
- **Comments are not paginated.** Threads in scope are short.
- **Light theme only**, no dark mode, no internationalisation.
- **`issueCount` on the projects list** is a per-row `_count`, which is fine at this size but would
  need batching if a user belonged to hundreds of projects.
- **Title search has no supporting index.** `q` becomes `title ILIKE '%term%'`, which none of the
  four `Issue` indexes can accelerate — Postgres narrows to the project via a `projectId`-leading
  index and then filters row by row. Invisible at this scale. A `pg_trgm` GIN index is the fix once
  a single project holds thousands of issues.
- **`Issue.reporterId`, `Issue.assigneeId` and `Comment.authorId` have no standalone index.** The
  index set is exactly the one specified in docs/05 §1.3, and `assigneeId` is only covered by the
  composite `(projectId, assigneeId)`. That is harmless today because **no endpoint deletes a
  `User`**, so the `Restrict`/`SetNull` checks are never evaluated. Adding a user-deletion path later
  should add those indexes in the same migration, or the referential check will scan both tables.
- **`react-router-dom` 7.18.1 is inside the range of `GHSA-qwww-vcr4-c8h2`** (RSC-mode CSRF /
  action-execution bypass, fixed in 8.3.0). It is not reachable here: this is a plain
  client-rendered declarative router with no RSC mode and no server actions. Staying on React Router
  7 is the documented stack choice (docs/02 §1), and the whole 7.12+ line is affected, so the
  options were an out-of-spec major upgrade or an unreachable advisory — the advisory was accepted
  and recorded here rather than silently ignored. The remaining `npm audit` findings in both apps
  are dev-only toolchain transitives (`eslint`, `bcrypt`'s build tooling, `@vitest/coverage-v8`) and
  are absent from the runtime path.

## With more time

1. Refresh tokens with rotation, plus a revocation list, and move the access token to an httpOnly cookie.
2. Rate limiting and `helmet`, then an audit log of status/assignee changes.
3. A small Playwright suite covering the happy path and the member-versus-maintainer permission split in the UI.
4. Per-project issue keys (`WEB-1`) via a sequence, which reviewers expect from a tracker.
5. Member removal and role changes, with the "a project must keep at least one maintainer" rule enforced in a transaction.
6. Full-text search over title and description with a `tsvector` column and a GIN index.
7. Optimistic updates for the status and assignee selects, so triage feels instant.
8. A deployed demo (Neon + Render + Vercel) with the credentials above.

---

## Repository layout

```
backend/     Express API, Prisma schema + committed migrations, seed script, tests
frontend/    React SPA
docs/        01–06 planning documents + architecture/ (INVARIANTS, ENFORCEMENT)
scripts/     setup.sh · verify.sh · check.sh · db-verify.sh
docker/      Postgres init script that creates issuehub_test
.github/     CI: migrate deploy + typecheck + lint + tests against a Postgres service container
```
