# 01 — Project Requirements (PRD)

**Product:** IssueHub — a lightweight bug tracker
**Source of truth:** `Fullstack assignment.doc` ("Assignment: IssueHub — a Lightweight Bug Tracker")
**Document status:** Planning. No application code written yet.

---

## 1. Product overview

IssueHub is a minimal, multi-project bug tracker. A user signs up, creates a project, adds
teammates by email, files issues, and tracks them through a status lifecycle. Issues carry a
priority and an assignee, and each issue has a comment thread.

The deliverable is a **second-round interview assignment**, not a commercial product. Success is
measured by correctness, clean structure, permission enforcement, meaningful tests, and clear
documentation — not by feature count.

## 2. Problem statement

Small teams need a shared place to record defects and see who is working on what. Full trackers
(Jira, Linear) are heavyweight and slow to configure. IssueHub delivers the irreducible core:
projects, membership, issues with status/priority/assignee, search/filter/sort, and comments.

## 3. Goals

| # | Goal | Why it matters for evaluation |
|---|------|-------------------------------|
| G1 | Every required endpoint and page works end to end | Primary correctness signal |
| G2 | Permissions are enforced server-side and proven by tests | Highest-value differentiator |
| G3 | PostgreSQL schema created only from committed Prisma migrations | Reproducibility |
| G4 | Backend unit + integration tests, ~70%+ coverage | Explicitly requested |
| G5 | A clean, responsive, professional UI with real loading/empty/error states | Visible quality |
| G6 | README + `/docs` let a reviewer run everything in under 10 minutes | Reviewer experience |

**Non-goals:** scale, extensibility for unknown future features, enterprise architecture.

## 4. Target users

- **Reporter (developer/QA):** files issues, comments, corrects their own issues.
- **Maintainer (lead):** triages — assigns, changes status, closes, deletes, manages membership.
- **Reviewer (interviewer):** clones the repo, runs migrations, seeds, runs tests, clicks through.
  Treated as a first-class user; the seed script and README exist for them.

## 5. User roles

Two roles, scoped **per project** (not global). A user can be a MAINTAINER of project A and a
MEMBER of project B. Full matrix in [05-backend-schema-api.md](./05-backend-schema-api.md#permission-matrix).

- `MEMBER` — read the project and all its issues; create issues; update issues they reported
  (title/description/priority only); read and add comments.
- `MAINTAINER` — everything a member can do, plus: update any issue, set status, set/clear
  assignee, delete issues, add members, choose the role of an added member.
- **Non-member** — no access to the project, its issues, its members, or its comments.

## 6. MVP scope

### In scope (mandatory)

**Auth** — signup, login, logout, current user, password hashing, JWT bearer auth, protected
backend routes, protected frontend routes.

**Projects** — create (creator auto-becomes MAINTAINER), list own projects, project detail,
add member by email with role, list members.

**Issues** — create, list per project, detail, update, delete, assign/reassign, change status,
change priority.

**Issue list querying** — title text search, filter by status / priority / assignee, sort by
createdAt / priority / status with asc|desc, pagination with metadata.

**Comments** — list (oldest first), create, author + timestamp display, non-empty validation,
member-only access.

**Cross-cutting** — Zod validation at every boundary, structured error envelope, correct HTTP
status codes, CORS, no internal detail leakage.

**Quality** — Docker Compose Postgres (separate dev + test databases), Prisma migrations, seed
script, Vitest unit tests, Supertest integration tests, coverage reporting, README, six `/docs`
files.

### Out of scope (deliberately not built)

Password reset · email sending or real invitations · server-side token revocation / refresh
tokens / token blocklist · issue attachments · labels, tags, epics, sprints, boards · issue
history/audit log · activity feed · notifications · @mentions · comment edit/delete · rich text
or markdown rendering · full-text search engine · saved filters · bulk actions · project
edit/delete · member removal or role change after add · user profile editing · avatars ·
admin/superuser role · organisations/teams above projects · dark mode · i18n · rate limiting ·
Redis, queues, WebSockets, GraphQL, microservices, Kubernetes · AI features of any kind ·
frontend unit/E2E test suite (backend tests are what the assignment asks for).

## 7. Functional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Signup with name/email/password; duplicate email → `409` | Must |
| FR-2 | Login returns a JWT; wrong password → `401` with a generic message | Must |
| FR-3 | Logout clears the token client-side; endpoint returns `204` | Must |
| FR-4 | `GET /api/me` returns the authenticated user without `passwordHash` | Must |
| FR-5 | Passwords stored only as a bcrypt hash | Must |
| FR-6 | Create project; creator gets a `MAINTAINER` membership atomically | Must |
| FR-7 | `GET /api/projects` returns only projects the caller is a member of | Must |
| FR-8 | Project `key` is globally unique; collision → `409` | Must |
| FR-9 | Maintainer adds a member by email + role; unknown email → `404`; duplicate → `409` | Must |
| FR-10 | Members cannot add members → `403` | Must |
| FR-11 | Any project member can create an issue (defaults `OPEN`) | Must |
| FR-12 | Non-members get `404` for a project's issues (existence not revealed) | Must |
| FR-13 | Reporter may update own issue's title/description/priority | Must |
| FR-14 | Member updating another's issue → `403` | Must |
| FR-15 | Maintainer may update any issue in the project | Must |
| FR-16 | Only maintainers may change `status` or `assigneeId` → else `403` | Must |
| FR-17 | Assignee must be a member of the issue's project → else `422` | Must |
| FR-18 | Only maintainers may delete an issue → `204`; member → `403` | Must |
| FR-19 | Issue list supports `q, status, priority, assignee, sort, order, page, pageSize` | Must |
| FR-20 | Filters combine with AND; response carries pagination metadata | Must |
| FR-21 | Priority/status sorting is semantic, not alphabetical | Must |
| FR-22 | Members list/add comments; empty or whitespace-only body → `400` | Must |
| FR-23 | Non-members cannot read or write comments | Must |
| FR-24 | All errors use the `{ error: { code, message, details? } }` envelope | Must |
| FR-25 | Seed script creates 2 projects, 3 users, 20 issues, some comments | Should |

## 8. Non-functional requirements

- **Security:** bcrypt hashing; Zod validation on body, params and query; JWT verified on every
  protected route; authorisation re-checked per resource (never trusted from the client); no
  stack traces, Prisma errors, or password hashes in responses; secrets only via env vars.
- **Correctness over cleverness:** multi-write operations (project + creator membership) use a
  Prisma transaction.
- **Structure:** feature modules (`routes → controller → service`), Prisma Client used directly
  in services, files under ~300 lines, handlers thin.
- **Reproducibility:** `docker compose up` + `npm run db:migrate:deploy` + `npm run db:seed`
  produces a working app on a clean machine.
- **Testing:** unit tests for pure logic, integration tests through the real Express app against
  a real Postgres test database built from committed migrations. Internal target ≈70% line
  coverage overall, higher for auth/permissions/services.
- **Performance:** adequate, not tuned. Indexes on the columns the issue list filters and sorts
  on; pagination capped at 100 rows per page. No N+1 in list endpoints (`include` the relations
  needed for display in one query).
- **Accessibility:** labelled inputs, visible focus rings, keyboard-operable controls, ARIA on
  modals and toasts, colour never the sole carrier of meaning.
- **Responsiveness:** usable at 360px, 768px and 1280px.

## 9. Acceptance criteria

The submission is done when all of the following are true:

- [ ] `docker compose up -d` starts Postgres with `issuehub_dev` and `issuehub_test` databases.
- [ ] `npm run db:migrate:deploy` on an empty database creates the full schema from committed
      migration files (no `db push`, no manual SQL).
- [ ] `npm run db:seed` produces demo data and the documented demo credentials log in.
- [ ] Backend and frontend both start from the documented commands with no manual edits beyond
      copying `.env.example`.
- [ ] Every endpoint in [05-backend-schema-api.md](./05-backend-schema-api.md) responds with the
      documented status codes and shapes.
- [ ] `npm test` passes; `npm run test:coverage` reports ≥70% lines overall.
- [ ] Every test in the mandatory test list (see
      [06-implementation-plan.md](./06-implementation-plan.md#mandatory-test-checklist)) exists
      and passes.
- [ ] The full happy path works in the browser: signup → create project → add member → create
      issue → filter/search/sort/paginate → open detail → comment → assign → change status →
      delete as maintainer.
- [ ] Maintainer-only controls are absent from the UI for members **and** rejected by the API.
- [ ] Loading, empty and error states are visible on every data-driven view.
- [ ] The app is usable at 360px width.
- [ ] README documents stack, trade-offs, env vars, setup, migrations, seed, run, test,
      coverage, architecture notes, known limitations, and next steps.

## 10. Assumptions

These fill gaps the assignment leaves open. Each is repeated in the README.

| # | Assumption | Rationale |
|---|-----------|-----------|
| A1 | Stack is Node.js + Express + TypeScript | The assignment offers "Python (FastAPI preferred) … **Or** Node.JS (with Express)"; the second option was chosen |
| A2 | PostgreSQL always, never SQLite | Assignment permits SQLite for local dev; Postgres everywhere avoids dialect drift and keeps tests honest |
| A3 | Prisma + Prisma Migrate is the ORM/migration tool | The assignment names Alembic/Django migrations because it assumes Python; Prisma Migrate is the direct Node equivalent |
| A4 | Only maintainers can delete issues | Assignment lists `DELETE /api/issues/{id}` but no rule. Deletion is destructive and unrecoverable; the safer bound is chosen |
| A5 | Members can update only title/description/priority of issues they reported | Assignment gives members "update issues they reported" but reserves status/assignee for maintainers — the fields are split accordingly |
| A6 | Reporters cannot delete their own issues | Follows A4; keeps one simple rule instead of two overlapping ones |
| A7 | Non-members receive `404`, not `403`, for project/issue/comment resources | Avoids leaking the existence of private projects. Membership-checked-but-insufficient-role returns `403` |
| A8 | Project `key` is globally unique, uppercase, `^[A-Z][A-Z0-9]{1,9}$` | Keys are display identifiers (`WEB-1`); global uniqueness is simplest and matches trackers reviewers know |
| A9 | Adding a member requires the user to already have an account | Assignment says "no email send required — just a form", so there is no invitation record to create |
| A10 | Members cannot be removed and roles cannot be changed after add | Not in the required feature list; add-only keeps membership minimal |
| A11 | Logout is client-side token disposal; `POST /api/auth/logout` returns `204` | Bearer JWTs are stateless; server-side revocation is explicitly out of MVP scope and documented as a limitation |
| A12 | JWT is stored in `localStorage` | Simplest with a bearer-header API. XSS exposure is documented as a known limitation; httpOnly cookies + CSRF is the production answer |
| A13 | Validation failures return `400`, never `422`; `422` is reserved for one case only — semantically invalid references (assignee not in project) | The assignment allows either; a single consistent rule is easier to test and document |
| A14 | Invalid `page`/`pageSize` are rejected with `400`, not silently clamped | Explicit beats guessing; `pageSize` above the 100 maximum is also rejected |
| A15 | Setting `assigneeId` is maintainer-only **at creation time too**, not just on update | One rule per field regardless of endpoint; a member creating an issue leaves it unassigned |
| A16 | Statuses may transition freely between any of the four values | No workflow rules in the assignment; a state machine would be invented scope |
| A17 | Deleting an issue cascades its comments; deleting a user is not supported | No user-deletion requirement exists |
| A18 | Identifiers are CUIDs (Prisma `cuid()`), not UUIDs | Assignment says "UUID or CUID … consistently"; CUID is Prisma's zero-config default |
| A19 | Timeline assumption: ~3 working days / ~20–24 focused hours | The assignment states no deadline; all effort estimates in doc 06 assume this |
| A20 | Repository directory is `issue-nest`; the product name is **IssueHub** | Local folder name only; all user-facing naming, the README title and the wordmark say IssueHub |

## 11. Documented deviations from the assignment text

| Assignment text | What is built | Why |
|-----------------|---------------|-----|
| "clean separation (routes/services/**dao**/models)" | `routes → controller → service → Prisma Client`; no DAO/repository layer | Prisma Client *is* the data-access layer. A hand-written DAO wrapping it adds indirection with no benefit at this size. Separation of concerns is still explicit |
| Query params `?q=&status=&priority=&assignee=&sort=` | Adds `order`, `page`, `pageSize` | The assignment's own frontend section requires pagination; these are the parameters that make it work |
| No `GET /api/projects/{id}` or `GET /api/projects/{id}/members` in the contract | Both added | Needed for the project header and the assignee dropdown. The assignment says "You can adapt, but document deviations" |
| No logout endpoint in the contract | `POST /api/auth/logout` added as a `204` no-op | Contract completeness; the required "log out" feature is client-side |
| `comments (… created_at)` | Adds `updatedAt` | Prisma `@updatedAt` costs nothing and keeps timestamp handling uniform across models |
| "SQLite acceptable for local dev" | Postgres only | See A2 |
| "Seed script: optional" | Implemented | Highest ratio of reviewer value to effort in the whole assignment |

## 12. Optional / stretch items (only after everything above is green)

Ordered by value per hour. **Cut from the bottom up when time runs short.**

1. Seed script (treated as mandatory in practice — cheap, high reviewer value).
2. GitHub Actions CI running migrations + tests against a Postgres service container.
3. Micro-animations: button spinners, modal fade/scale, toast slide-in, dropdown transitions.
4. Issue key display (`WEB-1`) via a per-project sequence.
5. Skeleton loaders instead of plain spinners.
6. Optimistic status updates in TanStack Query.
7. Live deployment + demo credentials in the README.
8. Custom logo beyond a text wordmark plus one inline SVG bug glyph.
9. Frontend component tests.

Items 7–9 are expected to be skipped.
