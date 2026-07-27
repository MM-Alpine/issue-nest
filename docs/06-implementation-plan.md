# 06 — Implementation Plan

**Time assumption (stated because the assignment gives no deadline):** ~3 working days,
≈24 focused hours. Every estimate below is in focused hours and assumes a single developer. If
the real budget is smaller, cut using [§4 Cut order](#4-cut-order) — never by skipping tests or
the README.

**Testing rhythm:** each backend module (phases 7–11) is built test-first — write the integration
test for the behaviour, watch it fail, implement, watch it pass. Phases 14–15 are therefore an
*audit and gap-fill* pass against the mandatory checklist, not the first time tests are written.

---

## 1. Phases

### Phase 1 — Assignment review and scope confirmation ✅ *(complete)*

| | |
|---|---|
| **Tasks** | Extract the `.doc`; separate mandatory / assumed / optional; list ambiguities; choose the Node option from the two offered stacks; write the six `/docs` files |
| **Dependencies** | none |
| **Output** | `docs/01`–`docs/06` |
| **Priority** | Must |
| **Effort** | 0.5h |
| **Risks** | Over-documenting and eating implementation time → mitigated by capping at six files |
| **Done when** | All six docs exist, every assumption is written down, and the first implementation task is unambiguous |

### Phase 2 — Application scaffold

| | |
|---|---|
| **Tasks** | Confirm the already-initialized repo has root `.gitignore` (`node_modules`, `dist`, `.env`, `coverage`); add root `README.md` skeleton; create `backend/` with `npm init`, TypeScript strict, `tsconfig.json`, `tsx`, npm scripts; create `frontend/` via `npm create vite@latest -- --template react-ts`; add Tailwind 4; add per-app `.env.example` files; first scaffold commit |
| **Dependencies** | Phase 1 |
| **Output** | Two installable apps; `npm run build` succeeds in both |
| **Priority** | Must |
| **Effort** | 0.75h |
| **Risks** | Tailwind 4's Vite plugin setup differs from v3 tutorials → follow current official docs, not memory |
| **Done when** | `npm run dev` starts an empty Express server and the Vite app; both type-check clean; `.env` is git-ignored |

### Phase 3 — PostgreSQL and Docker setup

| | |
|---|---|
| **Tasks** | `docker-compose.yml` with `postgres:16-alpine`, named volume, port 5432, healthcheck; `docker/init-test-db.sh` mounted at `/docker-entrypoint-initdb.d/` to `CREATE DATABASE issuehub_test`; fill both URLs in `backend/.env.example`; verify both databases with `psql -l` |
| **Dependencies** | Phase 2 |
| **Output** | One container serving `issuehub_dev` and `issuehub_test` |
| **Priority** | Must |
| **Effort** | 0.5h |
| **Risks** | Init scripts run only on an empty volume — if the test DB is missing, `docker compose down -v` first (documented in the README) |
| **Done when** | `docker compose up -d` is healthy and both databases are connectable |

### Phase 4 — Prisma schema

| | |
|---|---|
| **Tasks** | `npx prisma init`; transcribe the schema from [05 §1.1](./05-backend-schema-api.md#11-prisma-schema-planned) including enum declaration order, composite PK, relation names, indexes, and referential actions; `prisma format`; `prisma validate`; `prisma generate` |
| **Dependencies** | Phase 3 |
| **Output** | `prisma/schema.prisma` + generated client |
| **Priority** | Must |
| **Effort** | 0.75h |
| **Risks** | Forgetting `@relation("IssueReporter"/"IssueAssignee")` on the dual User→Issue relation → `prisma validate` catches it. Enum order must be right **before** the first migration, or a later reorder needs a hand-written SQL migration |
| **Done when** | `prisma validate` passes and the generated client's types match the doc |

### Phase 5 — Initial Prisma migration

| | |
|---|---|
| **Tasks** | `npx prisma migrate dev --name init`; read the generated SQL and confirm enum value order, the composite PK, unique constraints, indexes, and `ON DELETE` clauses; commit `prisma/migrations/`; prove replayability with `prisma migrate reset` |
| **Dependencies** | Phase 4 |
| **Output** | Committed `migrations/<ts>_init/migration.sql`; `issuehub_dev` schema live |
| **Priority** | Must |
| **Effort** | 0.5h |
| **Risks** | `db push` habit creating drift → never used, stated in the README |
| **Done when** | `migrate reset` rebuilds the schema from committed files with no drift warning |

### Phase 6 — Express application setup

| | |
|---|---|
| **Tasks** | `config/env.ts` (Zod-parsed env, fail fast); `lib/prisma.ts` singleton; `lib/errors.ts` (`AppError` + helpers); `middleware/validate.ts`, `error-handler.ts`, `not-found.ts`; `app.ts` exporting `buildApp()`; `server.ts`; `/api/health`; `vitest.config.ts` with `globalSetup` running `prisma migrate deploy` against `TEST_DATABASE_URL`, `setupFiles` truncating tables per test, and `fileParallelism: false`; first Supertest test hitting `/api/health` |
| **Dependencies** | Phase 5 |
| **Output** | A running app skeleton and a **working test harness** |
| **Priority** | Must |
| **Effort** | 1.0h |
| **Risks** | Test setup is the highest-risk plumbing in the project; getting it working before any feature means every later phase can be test-first. Express 5 changes async error propagation — verify `asyncHandler` behaviour here, not later |
| **Done when** | `npm test` runs green against `issuehub_test` with the schema built by `migrate deploy`; an unknown route returns the `404` envelope; a thrown error returns the `500` envelope with no stack |

### Phase 7 — Authentication

| | |
|---|---|
| **Tasks** | `lib/password.ts` (bcrypt, cost 4 under test); `lib/jwt.ts`; `middleware/authenticate.ts`; `modules/auth/*` (schema, service, controller, routes) for signup / login / logout / `GET /api/me`; unit tests for password + JWT; integration tests for the full mandatory auth list |
| **Dependencies** | Phase 6 |
| **Output** | Working auth; all later phases can authenticate in tests |
| **Priority** | Must |
| **Effort** | 2.0h |
| **Risks** | bcrypt at cost 10 making the suite slow → env-based cost. Leaking `passwordHash` → every `User` read uses an explicit `select`, asserted by a test |
| **Done when** | Every mandatory authentication test passes and `authedAgent()` helper works |

### Phase 8 — Projects and memberships

| | |
|---|---|
| **Tasks** | `shared/permissions.ts`; `modules/projects/*` for create (transactional), list, detail, list members, add member; `P2002` → `409` mapping; unit tests for permission helpers; integration tests for the full mandatory project list |
| **Dependencies** | Phase 7 |
| **Output** | Projects + membership + the permission primitives everything else reuses |
| **Priority** | Must |
| **Effort** | 2.0h |
| **Risks** | The `404`-vs-`403` rule must be applied consistently from the very first use, or later endpoints drift → both live in `permissions.ts` and nowhere else |
| **Done when** | Every mandatory project test passes; creator is a maintainer; a non-member gets `404` for project detail |

### Phase 9 — Issue management

| | |
|---|---|
| **Tasks** | `modules/issues/*` for create, detail, patch, delete; `assertCanUpdateIssue`; assignee-membership validation (`422`); `viewerRole` in the detail response; unit tests for `assertCanUpdateIssue`; integration tests for the full mandatory issue list |
| **Dependencies** | Phase 8 |
| **Output** | Full issue lifecycle with field-level permissions |
| **Priority** | Must |
| **Effort** | 2.0h |
| **Risks** | Field-level permission is the subtlest logic in the assignment → isolated in one pure function, unit tested across every role × field × ownership combination |
| **Done when** | Every mandatory issue test passes, including member-cannot-set-status and assignee-must-be-a-member |

### Phase 10 — Search, filters, sorting and pagination

| | |
|---|---|
| **Tasks** | `IssueListQuery` Zod schema with coercion and bounds; `modules/issues/query.ts` (`buildIssueWhere`, `buildIssueOrderBy` with the `id` tiebreaker); `shared/pagination.ts`; `GET /api/projects/:id/issues` with the `$transaction([findMany, count])` pair; `assignee=unassigned`; unit tests for the builders; integration tests for the full mandatory search/filter list |
| **Dependencies** | Phase 9 |
| **Output** | The querying feature that carries the most evaluation weight after permissions |
| **Priority** | Must |
| **Effort** | 1.5h |
| **Risks** | Alphabetical priority sorting (`CRITICAL` before `HIGH` before `LOW`) is the classic bug here → relies on enum declaration order, asserted by a test that checks the actual sequence, not just the status code |
| **Done when** | Every mandatory search-and-filter test passes; combined filters AND correctly; `meta` is accurate; invalid params return `400` |

### Phase 11 — Comments

| | |
|---|---|
| **Tasks** | `modules/comments/*` for list (`createdAt` asc) and create; trim-then-validate non-empty body; membership check via the parent issue's project; integration tests for the full mandatory comment list |
| **Dependencies** | Phase 9 |
| **Output** | Comment thread API; **backend feature-complete** |
| **Priority** | Must |
| **Effort** | 1.0h |
| **Risks** | Whitespace-only bodies passing a naive `min(1)` → Zod `.trim()` before `.min(1)`, with an explicit `"   "` test |
| **Done when** | Every mandatory comment test passes; author payload contains no hash |

### Phase 12 — Frontend pages

| | |
|---|---|
| **Tasks** | `api/client.ts` (bearer header, envelope→`ApiError`, global `401` handling); `types/api.ts`; `AuthContext` + `ProtectedRoute`; router; `AppLayout` with wordmark; primitives (Button, Input, Select, Textarea, Field, Modal, Drawer, Badge, Spinner, Skeleton, EmptyState, ErrorState, Pagination, Toast); pages — Login, Signup, Projects (+ create modal), ProjectDetail (issue table, filter bar bound to `useSearchParams`, pagination, members drawer, issue form modal), IssueDetail (metadata sidebar, role-gated controls, comments + composer, delete confirm), NotFound |
| **Dependencies** | Phase 11 (or per-module as each API lands) |
| **Output** | Every required page, clickable end to end |
| **Priority** | Must |
| **Effort** | 4.5h |
| **Risks** | The largest single block; scope creep in UI polish is the main threat → build the whole flow plainly first, style after. URL-driven filters need care so the query key and the controls stay in sync |
| **Done when** | The full happy path works in the browser; member and maintainer accounts show different controls; the app is usable at 360px |

### Phase 13 — UI validation and feedback

| | |
|---|---|
| **Tasks** | Zod-based form validation with blur/submit timing; map `error.details` onto inline field errors; wire the four states on every data view; toasts for every mutation; skeletons; focus management and focus trap; `aria-*` on modal/drawer/toast; `403`/`409`/`422` message mapping; session-expiry redirect; then the micro-animation list from doc 03 §10 |
| **Dependencies** | Phase 12 |
| **Output** | The perceived-quality layer |
| **Priority** | Must (animations: Should) |
| **Effort** | 1.5h |
| **Risks** | Animations before correctness → they are the last item in this phase, explicitly gated |
| **Done when** | No unhandled error path; every mutation gives feedback; keyboard-only navigation completes the full flow |

### Phase 14 — Unit test audit

| | |
|---|---|
| **Tasks** | Review `tests/unit/` against the intended list — password, JWT (valid/expired/tampered), pagination maths, `buildIssueWhere`/`buildIssueOrderBy`, permission helpers, `assertCanUpdateIssue` role × field matrix; delete any test that only asserts library internals |
| **Dependencies** | Phases 7–11 |
| **Output** | A focused unit suite |
| **Priority** | Must |
| **Effort** | 0.75h |
| **Risks** | Padding the suite with meaningless assertions to lift coverage → explicitly disallowed |
| **Done when** | Every unit test asserts project logic; none mocks Prisma |

### Phase 15 — Integration test audit

| | |
|---|---|
| **Tasks** | Tick off [§2 Mandatory test checklist](#2-mandatory-test-checklist) item by item; add the missing ones; add the error-shape suite (unknown route, malformed id, unauthenticated, forbidden, not found, duplicate, `500` has no stack); confirm cleanup leaves no cross-test leakage by running the suite twice in a row |
| **Dependencies** | Phase 14 |
| **Output** | Complete integration coverage of the mandatory behaviours |
| **Priority** | Must |
| **Effort** | 1.5h |
| **Risks** | Order-dependent tests passing only in sequence → verified by re-running and by truncating before each test |
| **Done when** | Every checklist line maps to a named, passing test |

### Phase 16 — Migration verification

| | |
|---|---|
| **Tasks** | `docker compose down -v && up -d`, then `prisma generate` + `prisma migrate deploy` on the empty databases and run the suite; add a migration smoke test asserting the five tables and three enum types (with their value order) exist; optional GitHub Actions workflow running the same sequence against a Postgres service container |
| **Dependencies** | Phase 15 |
| **Output** | Proof that committed migrations alone build a working database |
| **Priority** | Must (CI workflow: Should) |
| **Effort** | 0.5h |
| **Risks** | A migration that silently depended on local state → this phase exists precisely to catch it |
| **Done when** | A wiped volume + committed migrations + `npm test` = green, with no manual SQL |

### Phase 17 — Coverage review

| | |
|---|---|
| **Tasks** | Configure `@vitest/coverage-v8`; exclude generated Prisma client, migrations, `dist`, config-only files, `server.ts`; run `test:coverage`; read the report and add tests for genuinely uncovered *branches* — especially permission and error paths |
| **Dependencies** | Phase 16 |
| **Output** | Coverage report meeting the ~70% internal goal, higher on auth/permissions/services |
| **Priority** | Must |
| **Effort** | 0.75h |
| **Risks** | Chasing the number instead of the gaps → the goal is documented as internal, and only meaningful gaps get tests |
| **Done when** | ≥70% lines overall; the report is reproducible with one command |

### Phase 18 — README and final review

| | |
|---|---|
| **Tasks** | README: overview + screenshot-free feature list, stack and trade-offs, prerequisites, env var table, `docker compose up`, Prisma command guide, migrate/seed/run/test/coverage commands, demo credentials, project structure, architecture notes, permission matrix, API table, **known limitations**, **with more time**; link the six docs; re-read the assignment line by line against the build; clean commit history; final `migrate reset` + seed + full manual pass |
| **Dependencies** | Phase 17 |
| **Output** | Submittable repository |
| **Priority** | Must |
| **Effort** | 1.25h |
| **Risks** | Leaving stale planning statements that contradict the shipped code → the final read-through reconciles docs with reality |
| **Done when** | A reviewer can go from `git clone` to a running, seeded app in under 10 minutes using only the README |

### Phase 19 — Optional seed data and deployment

| | |
|---|---|
| **Tasks** | `prisma/seed.ts` per [05 §2.9](./05-backend-schema-api.md#29-seed-data-prismaseedts) with `prisma.seed` wired in `package.json` (**do this early — it makes phase 12 far easier to build against**); then, only if time remains: deploy (Neon + Render/Fly for the API, Vercel/Netlify for the SPA), add the live URL and demo credentials |
| **Dependencies** | Phase 5 for the seed; Phase 18 for deployment |
| **Output** | Demo data; optionally a live URL |
| **Priority** | Seed: Should (in practice, do it) · Deployment: Could |
| **Effort** | 1.0h seed · +1.5h deployment |
| **Risks** | Deployment rabbit-holes (CORS, connection pooling, build envs) eating core time → strictly last, and cut without hesitation |
| **Done when** | `npm run db:seed` is idempotent and the documented demo credentials log in |

**Total: ≈24.25h.** The seed script (phase 19a) is scheduled straight after phase 5 in practice,
even though it is numbered last.

---

## 2. Mandatory test checklist

Every line becomes at least one named test. `[U]` unit, `[I]` integration.

**Authentication** — signup succeeds with valid data `[I]` · duplicate email rejected `409` `[I]` ·
password persisted only as a hash and the hash verifies `[I]` · login succeeds `[I]` · login fails
on wrong password with `401` `[I]` · protected route rejects a missing token `401` `[I]` · valid
JWT grants access `[I]` · malformed/tampered token rejected `[I]` · expired token rejected `[I]` ·
`GET /api/me` returns the authenticated user `[I]` · no response anywhere contains `passwordHash`
`[I]` · hash/verify round-trip `[U]` · sign/verify + expiry handling `[U]`.

**Projects** — authenticated user creates a project `[I]` · creator becomes `MAINTAINER` `[I]` ·
duplicate key `409` `[I]` · list returns only the caller's projects `[I]` · maintainer adds a
member `[I]` · duplicate membership `409` `[I]` · unknown email `404 USER_NOT_FOUND` `[I]` ·
`MEMBER` cannot add a member `403` `[I]` · non-member gets `404` on project detail `[I]` ·
non-member gets `404` on members list `[I]` · permission helpers `[U]`.

**Issues** — member creates an issue `[I]` · non-member cannot create `404` `[I]` · member lists
project issues `[I]` · reporter updates own issue `[I]` · member cannot update another's issue
`403` `[I]` · maintainer updates any issue `[I]` · only maintainer changes `assigneeId` `[I]` ·
only maintainer changes `status` `[I]` · reporter changing `status` on own issue `403` `[I]` ·
assignee must be a project member `422` `[I]` · `assigneeId: null` clears assignment `[I]` ·
maintainer deletes an issue `204` and its comments are gone `[I]` · member cannot delete `403`
`[I]` · reporter cannot delete own issue `403` `[I]` · missing issue → structured `404` `[I]` ·
empty patch → `400` `[I]` · `assertCanUpdateIssue` across role × field × ownership `[U]`.

**Search, filters, sorting, pagination** — search by title substring, case-insensitive `[I]` ·
filter by status `[I]` · by priority `[I]` · by assignee `[I]` · `assignee=unassigned` `[I]` ·
two filters combine with AND `[I]` · sort by `createdAt` asc and desc `[I]` · sort by `priority`
desc returns CRITICAL first (**value order asserted**) `[I]` · sort by `status` asc returns OPEN
first `[I]` · default sort is `createdAt desc` `[I]` · `meta` is correct on page 1 and page 2
`[I]` · `page` past the end returns an empty array with honest `meta` `[I]` · `page=0`,
`pageSize=0`, `pageSize=101`, `sort=title`, `status=NOPE` each `400` `[I]` · `where`/`orderBy`
builders `[U]` · pagination maths `[U]`.

**Comments** — member adds a comment `201` `[I]` · non-member cannot add `404` `[I]` · empty body
`400` `[I]` · whitespace-only body `400` `[I]` · member lists comments `[I]` · non-member cannot
list `404` `[I]` · comments return `createdAt` ascending `[I]` · author payload has `id`, `name`,
`email` and no hash `[I]`.

**Validation and errors** — invalid body `400` with `details` `[I]` · missing required field `400`
`[I]` · invalid enum `400` `[I]` · malformed id in a path param `400` (no DB round trip) `[I]` ·
unauthenticated `401` `[I]` · forbidden `403` `[I]` · not found `404` `[I]` · duplicate value
`409` `[I]` · unknown route `404` in the standard envelope `[I]` · every error response matches
`{ error: { code, message } }` `[I]` · a forced internal error returns `500` with no stack and no
Prisma text `[I]`.

**Migrations** — `migrate deploy` on an empty database creates all five tables `[I]` · the three
enum types exist with the documented value order `[I]`.

---

## 3. Three delivery tiers

### 3.1 Minimum working submission (~12h)

Everything a reviewer must see for the submission to count as complete rather than partial.

Phases 2–11 in full (backend feature-complete, with the auth, project, issue, and permission
tests written test-first) · Phase 12 reduced to unstyled-but-working pages with real loading and
error handling · seed script · a README covering setup, run, migrate, seed, test · the migration
verification pass.

Deliberately absent at this tier: micro-animations, skeleton loaders, drawer polish, the coverage
audit, the mandatory-list gap-fill, and any deployment.

### 3.2 Recommended complete MVP (~24h) ← **the target**

All 19 phases as specified: full mandatory test checklist, ~70% coverage, the styled and
responsive UI from doc 03, every state handled, accessibility basics, the seed script, and the
complete README.

### 3.3 Optional polish (+3–6h, only if everything above is green)

Micro-animations · GitHub Actions CI · per-project issue keys (`WEB-1`) · skeletons everywhere ·
optimistic status updates · live deployment with demo credentials · a couple of frontend component
tests.

---

## 4. Cut order

If time runs short, remove **from the top of this list first**. Nothing below the line is cut
before everything above it is gone.

1. Live deployment and demo URL
2. Frontend tests of any kind
3. Custom logo work beyond the text wordmark + one SVG glyph
4. Micro-animations (doc 03 §10)
5. Skeleton loaders → plain centred spinners
6. Members drawer → a plain section inside the project page
7. Issue form modal → a simple inline form
8. `GET /api/projects/:projectId` → derive the header from the projects list cache
9. `commentCount` on issue rows
10. Health endpoint
11. `/api/auth/logout` endpoint → purely client-side logout
    ────────────── never cut below this line ──────────────
12. Permission enforcement and its tests
13. Search / filter / sort / pagination
14. Committed migrations and the migration verification pass
15. The four UI states on the issue list and projects list
16. The README

---

## 5. Assignment requirements checklist

Traceability from the assignment text to where it is satisfied. **M** = mandated by the assignment ·
**A** = assumption filling a gap · **O** = optional/extra.

| Assignment requirement | Type | Where |
|------------------------|------|-------|
| Backend: Node.js + Express (the offered alternative to Python) | M | Phase 6 |
| PostgreSQL with migrations | M | Phases 3, 5 |
| Frontend: React + Vite | M | Phases 2, 12 |
| Email/password auth: signup + login + logout, JWT | M | Phase 7 |
| Hashed passwords (bcrypt/argon2) | M | Phase 7 |
| Input validation | M | Zod, phases 6–11 |
| Protected routes (backend + frontend) | M | Phases 7, 12 |
| A few meaningful backend unit/integration tests | M | Phases 14–15 (exceeded) |
| README with setup, run, test, architecture notes | M | Phase 18 |
| REST JSON API, CORS handled | M | Phases 6–11 |
| Structured errors `{error:{code,message,details?}}` | M | Phase 6 |
| Roles: user vs project maintainer | M | Phase 8, doc 05 §1.7 |
| `users` / `projects` / `project_members` / `issues` / `comments` | M | Phase 4 |
| status: open, in_progress, resolved, closed | M | `IssueStatus` |
| priority: low, medium, high, critical | M | `IssuePriority` |
| Create project (creator is maintainer) | M | Phase 8 |
| Add members by email via a form, no email sent | M | Phase 8 |
| CRUD issues within a project | M | Phase 9 |
| Filter & search by status, priority, assignee, title text | M | Phase 10 |
| Sort by created_at / priority / status | M | Phase 10 |
| Comment thread + add comment | M | Phase 11 |
| Change status & assignee — maintainers only | M | Phase 9 |
| Responsive UI, `Projects → Issues → Issue Detail` | M | Phase 12 |
| Form validation, spinners, toasts | M | Phase 13 |
| Clean module separation | M | doc 02 §3 |
| Pagination (listed under frontend pages) | M | Phase 10 |
| Maintainer-only controls hidden in the UI | M | Phase 12 |
| Login/Signup, Projects, Project Detail, New Issue, Issue Detail pages | M | Phase 12 |
| Seed script (assignment says optional) | O→M | Phase 19a — treated as required |
| Known limitations & what I'd do with more time | M | Phase 18 |
| Tech choices & trade-offs in the README | M | doc 02 §15 → Phase 18 |
| Live URL + demo credentials | O | Phase 19b, expected to be skipped |
| Prisma instead of Alembic/Django migrations | A | A3 |
| Postgres in dev, not SQLite | A | A2 |
| No DAO layer despite `routes/services/dao/models` | A | doc 01 §11 |
| Only maintainers delete issues | A | A4 |
| Members update title/description/priority of own issues only | A | A5 |
| `404` (not `403`) for non-members | A | A7 |
| Unique, uppercase project key | A | A8 |
| Added member must already have an account | A | A9 |
| No member removal or role change | A | A10 |
| Logout is client-side; no token revocation | A | A11 |
| JWT in `localStorage` | A | A12 |
| `400` for validation; `422` only for a non-member assignee | A | A13 |
| Invalid pagination rejected, not clamped | A | A14 |
| Assignee is maintainer-only at creation too | A | A15 |
| Free status transitions, no workflow rules | A | A16 |
| CUID identifiers | A | A18 |
| `order`, `page`, `pageSize` query params | O | Phase 10 |
| `GET /api/projects/:id`, `GET /api/projects/:id/members` | O | Phase 8 |
| `POST /api/auth/logout` | O | Phase 7 |
| `GET /api/health` | O | Phase 6 |
| Coverage reporting (~70% internal goal) | O | Phase 17 |
| GitHub Actions CI | O | Phase 16 |
| Micro-animations | O | Phase 13 |

## 6. Ambiguities in the assignment and how each is resolved

| # | Ambiguity | Resolution |
|---|-----------|------------|
| 1 | `DELETE /api/issues/{id}` appears in the contract with no permission rule | Maintainer-only (A4) — destructive and unrecoverable |
| 2 | "Users can create/read/update issues they reported" vs "maintainers can update/assign/close any issue" — which fields can a reporter change? | Split by field: reporters get title/description/priority; status and assignee are maintainer-only (A5) |
| 3 | Should a reporter be able to delete their own issue? | No (A6) — one rule beats two overlapping ones |
| 4 | `403` or `404` for non-members? | `404`, to avoid confirming that a private project exists (A7) |
| 5 | Is the project `key` unique globally, per user, or not at all? | Globally unique, uppercase (A8) |
| 6 | "Invite/add members by email (no email send required)" — what if no such account exists? | `404 USER_NOT_FOUND`; no invitation record (A9) |
| 7 | Can memberships be removed or roles changed? | Not in the MVP (A10) |
| 8 | What does logout mean for a stateless JWT? | Client-side disposal; no revocation, documented as a limitation (A11) |
| 9 | "Bearer JWT **or** secure cookie" | Bearer + `localStorage`, with the XSS trade-off documented (A12) |
| 10 | Pagination appears under frontend pages but not in the query-parameter list | Added `page`/`pageSize`/`order`; defaults and bounds documented (A14, doc 04 §10) |
| 11 | `sort=` has no defined vocabulary or direction | `sort ∈ {createdAt, priority, status}` × `order ∈ {asc, desc}`, default `createdAt desc` |
| 12 | Should priority sort alphabetically or by severity? | By severity, via enum declaration order (doc 05 §1.1) |
| 13 | Comment ordering is unspecified | `createdAt` ascending, documented in the API contract |
| 14 | Are status transitions constrained? | No; any of the four to any other (A16) |
| 15 | "clean separation (routes/services/**dao**/models)" while Prisma already is the DAO | No DAO layer; deviation documented (doc 01 §11) |
| 16 | Assignment says "Python (FastAPI preferred) **Or** Node.JS" | Node + Express chosen; both were permitted (A1) |
| 17 | No deadline stated | ~3 days / ~24h assumed and stated everywhere estimates appear (A19) |

## 7. Working-principles alignment

This plan intentionally treats the assignment from three viewpoints:

| Viewpoint | How the plan applies it |
|-----------|-------------------------|
| Product owner | Scope is limited to the MVP in docs 01 §6. Mandatory, optional, assumptions, cut order, and delivery tiers are separated so optional polish never displaces required behaviour. |
| UI/UX designer | The UI spec in doc 03 defines navigation, hierarchy, responsive breakpoints, form feedback, loading/empty/error states, accessibility basics, branding, and small purposeful micro-animations. |
| Engineer / architect | The backend contract, invariants, migration rules, test strategy, and quality gates favour a maintainable, secure, testable implementation without extra infrastructure or invented abstractions. |

**AI clarification:** AI tools may be used by developers to plan, review, or implement faster, but
the assignment does **not** require AI product functionality. IssueHub must not add AI features
unless the assignment is explicitly changed; AI features remain out of scope per doc 01 §6.

## 8. Final planning verification

- **Stack** — Node.js ✓ Express ✓ TypeScript ✓ PostgreSQL ✓ Prisma ✓ (doc 02 §1). No MongoDB, no
  alternative ORM.
- **Migrations** — `prisma/migrations/` committed (Phase 5), `migrate deploy` in test setup and
  CI, `db push` never used, `migrate reset` run before submission (Phase 16).
- **Test databases from committed migrations** — `globalSetup` runs `prisma migrate deploy` against
  `TEST_DATABASE_URL`; no hand-written DDL anywhere in test setup (doc 02 §12).
- **API coverage** — all 16 endpoints from the prompt plus `/api/health` are specified in doc 05
  §2.1 and assigned to phases 6–11.
- **Page coverage** — Login, Signup, Projects, Project Detail + issues (search/filter/sort/paginate),
  create/edit issue modal, Issue Detail, member management drawer — all in doc 03 §5 and Phase 12.
- **Auth and permissions tested** — the permission matrix in doc 05 §1.7 maps one-to-one onto the
  issue and project sections of §2 above.
- **Behaviour, not internals** — unit tests target project logic only; Prisma is never mocked;
  Phase 14 explicitly deletes library-internal tests.
- **No invented scope** — no microservices, Redis, queues, WebSockets, Elasticsearch, GraphQL,
  Kubernetes, event sourcing, DAO/repository/use-case layers, or AI features. Out-of-scope list in
  doc 01 §6.
- **Realistic** — ≈24.25h across 19 phases, with a 12h minimum tier and an explicit cut order.
- **First implementation task** — **Phase 2**: scaffold `backend/` with TypeScript strict + `tsx`,
  scaffold `frontend/` via Vite `react-ts` + Tailwind 4, add README/env examples, and make the
  first scaffold commit.
- **Skip first when time is short** — deployment, frontend tests, custom logo, animations
  (§4 items 1–4).
