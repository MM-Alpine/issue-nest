# 02 — Technical Requirements

Companion to [01-project-requirements.md](./01-project-requirements.md). Schema and API detail
lives in [05-backend-schema-api.md](./05-backend-schema-api.md); this document covers stack,
architecture, and cross-cutting technical decisions.

---

## 1. Stack

### Backend

| Concern | Choice | Version target |
|---------|--------|----------------|
| Runtime | Node.js | 20 LTS+ (dev machine: 24) |
| Framework | Express | 5.x |
| Language | TypeScript (strict) | 5.x |
| Database | PostgreSQL | 16 (Docker `postgres:16-alpine`) |
| ORM | Prisma Client | 6.x |
| Migrations | Prisma Migrate | 6.x |
| Validation | Zod | 3.x |
| Hashing | bcrypt | 6.x, cost 10 (4 under `NODE_ENV=test`) |
| Tokens | jsonwebtoken (HS256) | 9.x |
| Tests | Vitest + Supertest | latest |
| Coverage | `@vitest/coverage-v8` | latest |
| Dev runner | `tsx watch` | latest |
| CORS | `cors` | 2.x |

No Redis, no queues, no WebSockets, no GraphQL, no DI container, no logging framework beyond a
tiny wrapper around `console` used by the error handler.

### Frontend

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | React 19 | |
| Bundler | Vite 6 | `@vitejs/plugin-react` |
| Language | TypeScript (strict) | |
| Routing | React Router 7 (declarative `<Routes>`) | No loaders/actions — TanStack Query owns data |
| Styling | Tailwind CSS 4 | Utility-first; no component library |
| Data fetching | TanStack Query 5 over a thin `fetch` wrapper | Caching, loading/error state, invalidation |
| Forms | Controlled components + Zod schemas | No react-hook-form; forms are 2–5 fields |
| Toasts | ~60-line in-house context + `role="status"` region | Avoids a dependency for a trivial need |
| Icons | 4–6 inline SVGs in `components/icons.tsx` | Avoids an icon package |
| Global state | React Context for auth only | Everything else is server state in TanStack Query |

Rejected: Redux/Zustand (no client state to manage), MUI/Chakra/shadcn (Tailwind is enough),
Axios (`fetch` is sufficient), react-hot-toast, lodash, date-fns (`Intl.DateTimeFormat` covers
the one formatting need).

## 2. Architecture overview

Two independent applications, one Postgres instance, no shared build tooling. There is no
monorepo tool — each of `backend/` and `frontend/` has its own `package.json`. This keeps the
setup obvious to a reviewer.

```
┌──────────────────────┐        JSON / REST          ┌───────────────────────┐
│  frontend (Vite)     │  Authorization: Bearer JWT  │  backend (Express)    │
│  localhost:5173      │ ──────────────────────────► │  localhost:4000       │
│                      │ ◄────────────────────────── │                       │
│  React Router        │      { data } | { error }   │  middleware chain     │
│  TanStack Query      │                             │  → module routers     │
│  AuthContext + LS    │                             │  → controllers        │
└──────────────────────┘                             │  → services           │
                                                     │  → Prisma Client      │
                                                     └───────────┬───────────┘
                                                                 │ SQL
                                                     ┌───────────▼───────────┐
                                                     │ PostgreSQL 16 (Docker)│
                                                     │ issuehub_dev          │
                                                     │ issuehub_test         │
                                                     └───────────────────────┘
```

**Request pipeline (every protected route):**

```
cors → express.json → router
  → authenticate            (verify JWT, attach req.user)
  → validate(schema)        (Zod on body / params / query, replaces req.* with parsed output)
  → controller              (thin: call service, send response)
      → service             (authorisation + business rules + Prisma)
  → errorHandler            (any thrown AppError or unknown error → structured envelope)
```

**Layer rules**

- Controllers never touch Prisma and contain no `if` on roles.
- Services own authorisation, business rules, and Prisma calls. They throw typed `AppError`s and
  return plain objects; they never touch `req`/`res`.
- No repository/DAO/use-case/domain-event layers — see the deviation table in doc 01.
- Prisma Client is a single shared singleton (`src/lib/prisma.ts`).

## 3. Backend structure

```
backend/
├── prisma/
│   ├── migrations/                    # committed; source of truth for all databases
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── config/
│   │   └── env.ts                     # Zod-parsed process.env, fails fast at boot
│   ├── lib/
│   │   ├── prisma.ts                  # PrismaClient singleton
│   │   ├── errors.ts                  # AppError + badRequest/unauthorized/forbidden/notFound/conflict/unprocessable
│   │   ├── password.ts                # hash / verify
│   │   └── jwt.ts                     # sign / verify
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── validate.ts                # validate({ body?, params?, query? })
│   │   ├── error-handler.ts
│   │   └── not-found.ts               # unmatched route → 404 envelope
│   ├── modules/
│   │   ├── auth/                      # .routes .controller .service .schema
│   │   ├── projects/                  # + members endpoints
│   │   ├── issues/                    # + query.ts (filter/sort/pagination builder)
│   │   └── comments/
│   ├── shared/
│   │   ├── permissions.ts             # requireMembership / requireMaintainer / canUpdateIssue
│   │   └── pagination.ts              # page/pageSize → skip/take, meta builder
│   ├── app.ts                         # buildApp(): Express instance, no listen()
│   └── server.ts                      # env + app.listen()
├── tests/
│   ├── unit/                          # password, jwt, pagination, issue query, permissions
│   ├── integration/                   # auth, projects, members, issues, issue-query, comments, errors
│   ├── helpers/                       # factories (user/project/issue/comment), authed agent
│   └── setup/
│       ├── global-setup.ts            # prisma migrate deploy against TEST_DATABASE_URL
│       └── test-setup.ts              # truncate all tables before each test
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

`app.ts` exporting `buildApp()` without calling `listen()` is what lets Supertest drive the real
application in-process.

## 4. Frontend structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts          # fetch wrapper: base URL, bearer header, error envelope → ApiError
│   │   ├── auth.ts  projects.ts  issues.ts  comments.ts
│   ├── components/            # Button Input Select Textarea Modal Badge Spinner Toast
│   │   │                      # EmptyState ErrorState Pagination Field icons
│   ├── features/
│   │   ├── auth/              # AuthContext, useAuth, ProtectedRoute, LoginForm, SignupForm
│   │   ├── projects/          # useProjects, useCreateProject, ProjectCard, CreateProjectModal,
│   │   │                      # MembersPanel, AddMemberForm
│   │   ├── issues/            # useIssues (+filters), useIssue, mutations, IssueTable, IssueRow,
│   │   │                      # IssueFilters, IssueFormModal, StatusBadge, PriorityBadge
│   │   └── comments/          # useComments, useAddComment, CommentList, CommentComposer
│   ├── layouts/               # AppLayout (header + wordmark + user menu), AuthLayout
│   ├── pages/                 # LoginPage SignupPage ProjectsPage ProjectDetailPage
│   │                          # IssueDetailPage NotFoundPage
│   ├── routes/                # router.tsx
│   ├── types/                 # api.ts — hand-written types mirroring API responses
│   ├── utils/                 # formatDate, roles, query-string helpers
│   ├── App.tsx  main.tsx  index.css
├── .env.example               # VITE_API_URL
├── package.json  tsconfig.json  vite.config.ts  tailwind.config.ts
```

Route table: `/login`, `/signup` (public) · `/projects`, `/projects/:projectId`,
`/issues/:issueId` (protected) · `/` → redirect to `/projects` · `*` → NotFound.

**Filter state lives in the URL** (`useSearchParams`), not in component state, so a filtered
issue list is shareable and survives reload — and the query string is TanStack Query's cache key.

## 5. Authentication

- **Hashing:** bcrypt, cost 10. Cost drops to 4 when `NODE_ENV=test` so the integration suite
  isn't dominated by KDF time. Only `passwordHash` is persisted.
- **Token:** JWT HS256, signed with `JWT_SECRET`, `expiresIn = JWT_EXPIRES_IN` (default `1d`).
- **Claims:** `sub` (user id), `iat`, `exp`. Nothing else — no email, no name, no roles. Roles are
  per-project and read from the database on every request, so a stale token can never carry
  stale permissions.
- **Transport:** `Authorization: Bearer <token>`.
- **Client storage:** `localStorage` under one key; `AuthContext` hydrates from it on mount and
  calls `GET /api/me` to confirm the token is still valid. A `401` from any request clears the
  token and redirects to `/login`.
- **`authenticate` middleware:** rejects a missing/malformed header, a bad signature, and an
  expired token with `401 UNAUTHORIZED`; loads the user by `sub` and `401`s if the user no longer
  exists; attaches `req.user = { id, email, name }`.
- **Logout:** `POST /api/auth/logout` → `204`. The client deletes the token and clears the query
  cache. **Server-side revocation is not implemented** — a stolen token remains valid until it
  expires. Stated in the README's limitations section.

## 6. Authorisation

Enforced only on the server; the UI hides controls purely for usability, never as a control.

Three helpers in `src/shared/permissions.ts`, used by services:

```ts
getMembership(projectId, userId)            // ProjectMember | null
requireMembership(projectId, userId)        // → membership, or throw notFound()   (hides existence)
requireMaintainer(projectId, userId)        // → membership, or throw forbidden()  (member but wrong role)
assertCanUpdateIssue(issue, membership, patchedFields)
```

`assertCanUpdateIssue` is the one non-trivial rule and is unit tested in isolation:

- `MAINTAINER` → any field.
- `MEMBER` and `issue.reporterId === userId` → only `title`, `description`, `priority`. Any
  attempt to include `status` or `assigneeId` → `403 FORBIDDEN`.
- `MEMBER` and not the reporter → `403 FORBIDDEN`.

Assignee validity (`assigneeId` must be a member of the issue's project) is a separate check that
throws `422 ASSIGNEE_NOT_MEMBER`.

## 7. Validation

Zod schemas live beside each module (`*.schema.ts`) and are applied by one middleware:

```ts
validate({ body: CreateIssueBody, params: ProjectIdParams, query: IssueListQuery })
```

The middleware parses and **replaces** `req.body`/`req.params`/`req.query` with the parsed
result, so controllers receive typed, coerced data (`page` is a number, not a string). Types are
derived with `z.infer` — no duplicate interface definitions.

Rules: body schemas use `strict()` and reject unknown keys; query schemas ignore unknown keys so
stale bookmarked URLs still work · strings trimmed · email lowercased and normalised · password
min 8 chars · issue title 1–200 · description ≤ 5 000 and nullable · comment body 1–5 000 after
trim · enums validated against the Prisma enum values · ids validated as non-empty CUID-shaped
strings (`/^c[a-z0-9]{20,}$/i`) so a malformed id yields `400`, not a database round trip ·
`page`/`pageSize` coerced ints with `page ≥ 1`, `1 ≤ pageSize ≤ 100`.

A Zod failure becomes `400 VALIDATION_ERROR` with `details` as a `{ field: [messages] }` map,
which the frontend maps straight onto inline field errors.

## 8. Error handling

Single envelope, from a single middleware:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request body", "details": { "title": ["Title is required"] } } }
```

| Code | Status | Raised when |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Zod failure on body/params/query |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password (deliberately indistinguishable) |
| `FORBIDDEN` | 403 | Member of the project but insufficient role/ownership |
| `NOT_FOUND` | 404 | Resource missing **or** caller is not a member |
| `USER_NOT_FOUND` | 404 | Adding a member by email when no account exists |
| `EMAIL_ALREADY_EXISTS` | 409 | Signup with a taken email |
| `PROJECT_KEY_TAKEN` | 409 | Project key collision |
| `ALREADY_MEMBER` | 409 | Duplicate membership |
| `ASSIGNEE_NOT_MEMBER` | 422 | `assigneeId` not a member of the project |
| `SERVICE_UNAVAILABLE` | 503 | Health check cannot reach the database |
| `INTERNAL_ERROR` | 500 | Anything unexpected |

The handler distinguishes `AppError` (intentional, message safe to expose) from everything else
(logged server-side with the stack; the response is a fixed `"Something went wrong"`). Known
Prisma error codes are translated where they are reachable — `P2002` → the matching `409`,
`P2025` → `404` — and Prisma error text never reaches the client. `async` handlers are wrapped in
a tiny `asyncHandler` so rejections reach the middleware.

## 9. CORS

`cors({ origin: env.CORS_ORIGIN, credentials: false })`. `CORS_ORIGIN` defaults to
`http://localhost:5173`. No cookies are used, so no credentialed-request handling is needed.
Other hardening (helmet, rate limiting) is out of MVP scope and listed as a known limitation.

## 10. Security summary

Covered: bcrypt hashing · no plaintext or hash ever returned (services select explicit fields;
there is no `select: *` on `User`) · Zod validation at all boundaries · parameterised queries by
construction (Prisma) · server-side authorisation on every resource · `404` instead of `403` for
non-members to avoid existence leaks · generic login failure message · minimal JWT claims · env
var secrets with `.env` git-ignored and only `.env.example` committed · env schema fails fast if
`JWT_SECRET` is missing or short · no stack traces in responses.

Explicitly not covered (documented limitations): token revocation, refresh tokens, rate limiting
/ brute-force protection, helmet security headers, password-strength rules beyond length, audit
logging, CSRF (not applicable to a bearer-token API without cookies).

## 11. Testing approach

Full detail and the mandatory test list are in
[06-implementation-plan.md](./06-implementation-plan.md). Summary:

- **Vitest** as runner, **Supertest** for HTTP.
- **Unit tests** for pure logic only: password hash/verify, JWT sign/verify (including expiry),
  pagination maths, issue-query builder (filters → Prisma `where`, sort → `orderBy`), permission
  helpers. No tests that merely assert Express, Prisma, bcrypt, or jsonwebtoken internals.
- **Integration tests** for everything else, through `buildApp()` against real Postgres: routing,
  auth middleware, validation middleware, services, Prisma, permissions, error envelopes.
- Fixture helpers (`createUser`, `createProjectWith`, `createIssue`, `authedAgent`) instead of a
  factory library.

## 12. Test database strategy

- Separate database `issuehub_test` in the same Docker Postgres container, created by the
  container's init script. `TEST_DATABASE_URL` points at it and **never** at `issuehub_dev`.
- `vitest.config.ts` sets `globalSetup` to a script that sets `DATABASE_URL = TEST_DATABASE_URL`
  and runs `prisma migrate deploy`. The schema therefore always comes from **committed
  migrations** — no `db push`, no hand-written DDL in test setup.
- `setupFiles` runs a `beforeEach` that truncates all tables in one statement:
  `TRUNCATE "Comment","Issue","ProjectMember","Project","User" RESTART IDENTITY CASCADE`.
  Truncate-before-each (rather than after) means a failed test leaves its data behind for
  inspection.
- `fileParallelism: false` — integration files share one database, so they run sequentially.
  This costs a little wall-clock and buys deterministic isolation, which is the right trade for
  an assignment.
- A migration smoke test asserts the expected tables and enums exist after `migrate deploy`,
  proving the committed migrations produce the schema the application expects.

## 13. Environment variables

`backend/.env.example` (committed with placeholder values only):

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://issuehub:issuehub@localhost:5432/issuehub_dev?schema=public` | Dev/prod database |
| `TEST_DATABASE_URL` | `postgresql://issuehub:issuehub@localhost:5432/issuehub_test?schema=public` | Test database |
| `JWT_SECRET` | `change-me-in-production-min-32-chars` | HS256 signing key; ≥32 chars enforced |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `PORT` | `4000` | API port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origin |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |

`frontend/.env.example`: `VITE_API_URL=http://localhost:4000`.

`src/config/env.ts` parses `process.env` with Zod at boot and exits with a readable message if
anything is missing or malformed. No real secret is ever committed.

## 14. Local development

```bash
# 1. Database (root)
docker compose up -d                 # postgres:16-alpine, creates issuehub_dev + issuehub_test

# 2. Backend
cd backend && npm install
cp .env.example .env
npm run prisma:generate
npm run db:migrate:dev               # first run creates + applies the initial migration
npm run db:seed
npm run dev                          # tsx watch → http://localhost:4000

# 3. Frontend
cd frontend && npm install
cp .env.example .env
npm run dev                          # → http://localhost:5173

# 4. Tests (backend)
npm test                             # unit + integration
npm run test:coverage
```

**Prisma command guide** (also in the README):

| Command | When |
|---------|------|
| `prisma generate` | After changing `schema.prisma`, and after a fresh `npm install` |
| `prisma migrate dev --name <meaningful_name>` | Local development: creates a new migration from schema changes and applies it |
| `prisma migrate deploy` | CI, test setup, and any non-development database: applies committed migrations only, never generates new ones |
| `prisma migrate reset` | Local only: drops, recreates, re-applies all migrations, re-seeds. Verifies the committed migration chain works from empty |
| `prisma db seed` | Populate demo data |
| `prisma db push` | **Never used.** Bypasses migration history |

Migration rules followed: migrations are committed; applied migrations are never edited; every
schema change gets a new migration with a meaningful name; `migrate reset` is run before
submission to prove a clean database can be built from the committed chain; no cosmetic-only
migrations.

## 15. Technology trade-offs

| Decision | Alternative | Why this choice |
|----------|-------------|-----------------|
| Node + Express | FastAPI (assignment's stated preference) | The assignment permits either; TypeScript end-to-end means one language, one mental model, and shared Zod-derived types |
| Prisma | Drizzle, Kysely, TypeORM, raw SQL | First-class migration tooling, typed client, readable schema file. Drizzle is leaner but its migration story is less obvious to a reviewer |
| Prisma Client directly in services | Repository/DAO layer | The assignment hints at a `dao` layer, but Prisma already is one. A wrapper would be indirection for its own sake at this size — documented as a deliberate deviation |
| Prisma Migrate | `db push` | Committed, reviewable, replayable migration history is an explicit requirement |
| Zod | class-validator, Joi, manual checks | Runtime validation plus static types from one declaration |
| JWT in `localStorage` | httpOnly cookie + CSRF token | Simpler with a bearer API and matches the assignment's Bearer suggestion. XSS trade-off documented |
| bcrypt | argon2 | Ubiquitous, well understood, adequate; argon2 is stronger but adds a heavier native dependency |
| TanStack Query | Redux Toolkit Query, plain `useEffect` | Removes hand-rolled loading/error/cache code — exactly the states the assignment asks to show. Cheaper than either alternative |
| Tailwind | MUI/Chakra/shadcn | No bundle bloat, no fighting theme APIs, full control over a small design system |
| React Router declarative mode | Data-router `loader`s | Avoids two competing data layers |
| URL-based filter state | Component state | Shareable links, reload-safe, and a natural query cache key |
| Vitest | Jest | Native ESM + TS, no transform config, faster |
| Real Postgres in tests | Mocked Prisma / SQLite | The assignment's permission and query behaviour *is* database behaviour; mocking it would test nothing. Costs Docker as a prerequisite |
| Sequential integration tests | Parallel with per-worker schemas | Deterministic isolation for a small suite; parallel schemas are the answer only when suite time actually hurts |
| Two `package.json` files, no monorepo tool | npm workspaces, Turborepo, Nx | Zero configuration to explain; each app is independently runnable |
| Hand-written frontend types | OpenAPI codegen / tRPC | ~80 lines of types versus a generator toolchain for a 15-endpoint API |
