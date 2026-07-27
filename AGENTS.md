# AGENTS.md — IssueHub (issue-nest)

Cross-tool entry point for AI coding agents (Claude Code, Codex, Cursor, …). The
**authoritative source of truth is `docs/01`–`docs/06`** — this file is the concise
operating guide; follow the pointers for depth. Deep rules live in
[docs/architecture/INVARIANTS.md](docs/architecture/INVARIANTS.md).

> **Repo status:** planning/greenfield. As of this setup the repo is **docs-only** —
> `backend/` and `frontend/` are scaffolded per [docs/06 Phase 2](docs/06-implementation-plan.md).
> The commands below become live once those apps exist; the `scripts/*` wrappers
> degrade gracefully until then.

## What this is
**IssueHub** — a lightweight, multi-project bug tracker (a take-home assignment, *not* a
commercial product). Users sign up, create projects, add members by email, file issues
(status/priority/assignee), search/filter/sort them, and comment. Success = correctness,
clean structure, **server-side permissions proven by tests**, safe migrations, and a
reviewer who can run it in <10 min. Product overview: [docs/01](docs/01-project-requirements.md).

## Stack (from docs/02 — do not substitute)
- **Two independent apps, no monorepo tool** — each has its own `package.json`.
- **backend/**: Node 20+, **Express 5**, TypeScript (strict), **Prisma 6 + PostgreSQL 16**,
  **Zod** validation, **bcrypt** (cost 10; 4 under `NODE_ENV=test`), **JWT HS256**,
  **Vitest + Supertest**, `tsx watch` dev.
- **frontend/**: **React 19 + Vite 6**, TypeScript, **React Router 7** (declarative),
  **TanStack Query 5**, **Tailwind 4**. Auth token in `localStorage`; filter state in the URL.
- Rejected/forbidden (invented scope): Redis, queues, WebSockets, GraphQL, DAO/repository
  layer, Redux/Zustand, component libraries, Axios. See docs/02 §1 and docs/01 §6.

## Layout
```
backend/   src/{config,lib,middleware,modules/{auth,projects,issues,comments},shared} + prisma/ + tests/
frontend/  src/{api,components,features/{auth,projects,issues,comments},layouts,pages,routes,types,utils}
docs/      01-project-requirements … 06-implementation-plan  (+ architecture/)
scripts/   setup.sh · check.sh · verify.sh · db-verify.sh
```
Backend pipeline: `cors → express.json → router → authenticate → validate(zod) → controller → service(Prisma) → errorHandler`.
**Controllers are thin** (no Prisma, no role `if`s); **services own authorization + business rules + Prisma**.

## Commands (from docs/02 §14; per-app — there is no root runner)
```bash
docker compose up -d                      # Postgres 16: issuehub_dev + issuehub_test
# backend/
npm install && npm run prisma:generate
npm run db:migrate:dev                     # dev: create+apply a named migration
npm run db:seed
npm run dev                                # tsx watch → http://localhost:4000
npm test          # Vitest unit+integration (needs Docker Postgres up)
npm run test:coverage
# frontend/
npm install && npm run dev                 # Vite → http://localhost:5173
npm run build
# repo wrappers (run both apps; degrade gracefully until scaffolded)
./scripts/setup.sh        # bootstrap: docker + per-app install + generate + migrate + seed
./scripts/verify.sh       # FAST, no DB: backend typecheck + pure unit tests
./scripts/check.sh        # QUALITY GATE: backend typecheck+lint+test · frontend typecheck+lint+build
./scripts/db-verify.sh    # migration safety: prisma migrate reset + deploy smoke
```

## Non-negotiable invariants (full detail: docs/architecture/INVARIANTS.md, docs 02 §6/§10, 05)
- **Authorization is server-side only.** UI hiding controls is usability, never a security control.
- **Non-members get `404`** (never `403`) for a project/issue/comment — no existence leak.
  "Member but insufficient role" → `403`.
- **Issue field permissions:** MAINTAINER → any field; reporter-MEMBER → only
  `title`/`description`/`priority`; `status`/`assigneeId` are **maintainer-only (at create too)** → else `403`.
- **`assigneeId` must be a member** of the issue's project → else `422 ASSIGNEE_NOT_MEMBER`.
- **Never return `passwordHash`** — every `User` read uses an explicit `select`.
- **Zod validates every body/params/query;** failure → `400 VALIDATION_ERROR` with `details`.
- **One error envelope** `{ error: { code, message, details? } }`; no stack traces or Prisma text to the client.
- **Schema only via committed Prisma migrations** — **never `prisma db push`**; never edit an applied
  migration; `migrate deploy` in test/CI; `migrate dev --name <meaningful>` for changes.
- **Enum declaration order is load-bearing** (`Role`, `IssueStatus`, `IssuePriority`) — it drives
  semantic sort. Reordering after the first migration requires hand-written SQL.
- **Test DB isolation:** `TEST_DATABASE_URL` → `issuehub_test`, **never** `issuehub_dev`; test schema
  from committed migrations only; truncate-before-each; `fileParallelism: false`.
- **Multi-write ops** (project + creator membership) run in one Prisma transaction.
- **JWT** carries only `sub/iat/exp`; roles are read from the DB per request; secrets via env;
  env schema fails fast; `JWT_SECRET` ≥ 32 chars.

## Scope discipline (◆ — prevents wasted work)
Build **only** the MVP in-scope list (docs/01 §6). The **out-of-scope list is forbidden invented
scope** (no password reset, attachments, labels, audit log, notifications, rate limiting, Redis,
websockets, GraphQL, member removal, project edit/delete, frontend test suite, AI features, …).
Under time pressure, remove from the top of the **cut order** (docs/06 §4) — **never** cut below the
line: permissions + their tests, migrations, search/filter/sort, the four UI states, the README.

## Definition of done
Every line of the **mandatory test checklist** (docs/06 §2) maps to a named, passing test.
Acceptance criteria: docs/01 §9. Target ≈70% line coverage overall, higher on auth/permissions/services.

## Workflow (autonomous up to the PR; humans merge)
Default branch is `master`. Branch for work (`feat/*`, `fix/*`, `chore/*`, `docs/*`); Conventional
Commits. The agent may implement, run the gate, commit, push its own branch, and open a PR — but
**never merges, never pushes to `master`/`main`, never runs a migration without confirming.**

**Mandatory before committing / opening a PR** (in order):
1. `./scripts/verify.sh` (fast inner loop) and `./scripts/check.sh` are green — or, pre-scaffold,
   they no-op cleanly.
2. Tests were written **test-first**; every relevant line of the mandatory checklist (docs/06 §2)
   has a named, passing test.
3. **Run the built-in reviewer subagents on the diff and address every CRITICAL/HIGH finding**
   (these are Claude Code's built-in agents/skills — do **not** create project copies):
   - **`code-reviewer`** — correctness, structure, edge cases, missing tests (always).
   - **`security-reviewer`** — **mandatory** for anything touching auth, permissions, validation,
     Prisma/DB, env/secrets, or error handling (that is most of this app).
   - **`typescript-reviewer`** — TS-strict and async correctness (on TS changes).
   - **`database-reviewer`** — schema, migration safety, index/query correctness (on Prisma changes).
   - the **`test-review`** skill — is the changed behaviour actually covered by meaningful tests?
   Do not open the PR with unaddressed CRITICAL/HIGH findings.
4. Migration change? `./scripts/db-verify.sh` proves the committed chain rebuilds from empty.
5. Open the PR (never merge). Report honestly what ran and what it proves — see
   [docs/architecture/ENFORCEMENT.md](docs/architecture/ENFORCEMENT.md).

Full gate detail: [.claude/rules/sdlc-quality-gate.md](.claude/rules/sdlc-quality-gate.md).

## Deterministic guardrails (hooks)
Committed in `.claude/`. They are **best-effort speed-bumps over the permission model**, not a
security boundary: dangerous-command block, a git secret-exfil guard, a Stop-gate that runs
`check.sh` on source changes, and format-on-write. Inventory & honest limits:
[.claude/hooks/README.md](.claude/hooks/README.md).
