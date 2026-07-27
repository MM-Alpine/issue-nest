---
paths:
  - "backend/prisma/**"
---

# Database & migration rules (Prisma 6 + PostgreSQL 16)

Loaded when working under `backend/prisma/`. Schema/contract: [docs/05 §1](../../docs/05-backend-schema-api.md).

## Migrations (◆ — the highest-risk area)
- **Schema is created only from committed migrations in `prisma/migrations/`.**
- **Never `prisma db push`** — it bypasses migration history.
- **Never edit an already-applied migration** — create a new one instead.
- Local schema change: `npm run db:migrate:dev -- --name <meaningful_name>` (creates + applies).
- Test / CI / any non-dev DB: `prisma migrate deploy` — applies committed migrations only, never generates.
- `prisma migrate reset` is **dev-only and destructive** (drops + recreates + re-seeds) — use it to
  prove the committed chain builds from empty; confirm before running.
- After changing `schema.prisma`: `prisma format` → `prisma validate` → `prisma generate`.
- Verify migration safety with [`scripts/db-verify.sh`](../../scripts/db-verify.sh) (reset + deploy smoke).

## Enum declaration order (◆)
PostgreSQL sorts enums by declaration order, which drives semantic sort. Keep exactly:
`Role {MAINTAINER, MEMBER}` · `IssueStatus {OPEN, IN_PROGRESS, RESOLVED, CLOSED}` ·
`IssuePriority {LOW, MEDIUM, HIGH, CRITICAL}`. Get this right **before the first migration** —
reordering later requires a hand-written SQL migration.

## Schema shape (◆ — see docs/05 §1.1 for the full definition)
- `ProjectMember` composite PK `@@id([projectId, userId])` (the uniqueness rule) + `@@index([userId])`.
- `User`↔`Issue` has **two** relations — `@relation("IssueReporter")` (required, `onDelete: Restrict`)
  and `@relation("IssueAssignee")` (optional, `onDelete: SetNull`).
- Delete behaviour: Issue→comments `Cascade`; Project→members/issues `Cascade`; User `Restrict` on
  reported issues/authored comments. Only the Issue delete is exposed by the API.
- Issue indexes lead with `projectId`: `(projectId, createdAt/status/priority/assigneeId)`;
  `Comment(issueId, createdAt)`.
- Ids are CUIDs (`@default(cuid())`).

## Env / databases
- `DATABASE_URL` → `issuehub_dev`; `TEST_DATABASE_URL` → `issuehub_test`. Test setup uses
  `TEST_DATABASE_URL` and **never** the dev database.
- A migration smoke test asserts the five tables and three enum types (with value order) exist after deploy.
