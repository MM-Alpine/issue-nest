# INVARIANTS — IssueHub

The non-negotiable rules for this codebase (`◆`). Distilled from the authoritative docs
([02 §6/§10](../02-technical-requirements.md), [05](../05-backend-schema-api.md),
[01 §7/§8](../01-project-requirements.md)); those docs win if anything here drifts. Violations
cause security holes, data-integrity failures, or a failed acceptance check.

## Security & authorization
1. **Authorization is enforced server-side, per resource, on every request.** The UI hiding a
   control is usability only — never a security control. (docs 02 §6)
2. **Non-members receive `404`** (not `403`) for a project/issue/comment, to avoid leaking that a
   private resource exists. "Member but insufficient role/ownership" → `403`. All membership logic
   lives in `backend/src/shared/permissions.ts` and nowhere else. (docs 01 A7, 02 §6)
3. **Issue field-level permissions** (`assertCanUpdateIssue`, unit-tested across role × field ×
   ownership): MAINTAINER → any field · reporter-MEMBER → only `title`/`description`/`priority` ·
   `status`/`assigneeId` are **maintainer-only, including at creation** → otherwise `403`. (docs 02 §6, 01 A5/A15)
4. **`assigneeId` must be a member** of the issue's project → else `422 ASSIGNEE_NOT_MEMBER`. (docs 01 FR-17)
5. **Only maintainers delete issues** (`204`); members/reporters → `403`. Delete cascades comments. (docs 01 A4/A6)
6. **`passwordHash` is never returned.** Every `User` read uses an explicit `select`; there is no
   `select: *` on `User`. Asserted by a test. (docs 02 §10)
7. **JWT claims are minimal** (`sub`, `iat`, `exp`) — no roles in the token; roles are read from the
   DB per request so a stale token cannot carry stale permissions. HS256, `JWT_SECRET` ≥ 32 chars. (docs 02 §5)
8. **Secrets only via env**; `.env` is git-ignored, only `.env.example` is committed; `config/env.ts`
   Zod-parses `process.env` and fails fast at boot. No stack traces or Prisma text in responses. (docs 02 §10/§13)

## Validation & errors
9. **Zod validates every `body`/`params`/`query`** via one `validate()` middleware that replaces
   `req.*` with parsed output. Failure → `400 VALIDATION_ERROR` with a `{ field: [msgs] }` `details`
   map. Body schemas reject unknown keys; query schemas ignore unknown keys; ids are CUID-shaped
   or `400` (no DB round trip). (docs 02 §7)
10. **One error envelope**: `{ error: { code, message, details? } }` from a single middleware. Codes
    and statuses are fixed (docs 02 §8). `P2002 → 409`, `P2025 → 404`; unknown → `500` "Something
    went wrong" with the stack logged server-side only.

## Data & migrations
11. **Schema is created only from committed Prisma migrations.** **Never `prisma db push`.** Never
    edit an already-applied migration. `migrate dev --name <meaningful>` for changes; `migrate
    deploy` in test/CI/non-dev; `migrate reset` (dev only) before submission to prove replayability. (docs 02 §14)
12. **Enum declaration order is significant** — PostgreSQL sorts enums by declaration order:
    `Role {MAINTAINER, MEMBER}`, `IssueStatus {OPEN, IN_PROGRESS, RESOLVED, CLOSED}`,
    `IssuePriority {LOW, MEDIUM, HIGH, CRITICAL}`. This is what makes `sort=priority&order=desc`
    return CRITICAL first. Reordering after the first migration needs hand-written SQL. (docs 05 §1.1)
13. **`ProjectMember` has a composite PK `(projectId, userId)`** — duplicate membership is impossible
    at the DB level. Delete/referential actions per docs 05 §1.6 (`onDelete: Cascade`/`Restrict`/`SetNull`). (docs 05 §1.1/§1.6)
14. **Multi-write operations use a Prisma transaction** — notably project creation + the creator's
    MAINTAINER membership must be atomic. (docs 01 §8)

## Testing
15. **Test DB isolation**: `TEST_DATABASE_URL` → `issuehub_test`, **never** `issuehub_dev`. The test
    schema comes from committed migrations via `prisma migrate deploy` in `globalSetup`; tables are
    truncated before each test; `fileParallelism: false`. (docs 02 §12)
16. **Tests assert behaviour, not library internals; Prisma is never mocked.** Unit tests cover pure
    logic (password, jwt, pagination, issue-query builders, permission helpers); everything else is
    an integration test through `buildApp()` against real Postgres. Every line of the mandatory test
    checklist (docs 06 §2) is a named test. (docs 02 §11, 06 §2)

## Architecture
17. **Layers:** `routes → controller → service → Prisma Client`. Controllers are thin (no Prisma, no
    role `if`s). Services own authorization + business rules + Prisma and throw typed `AppError`s.
    **No DAO/repository/use-case layer** (documented deviation — Prisma *is* the data layer).
    Prisma Client is a single shared singleton. Files ≲ 300 lines. (docs 02 §2/§3, 01 §11)

## Scope (◆ — do not violate)
18. **Build only the MVP in-scope list** (docs 01 §6). The out-of-scope list is *forbidden invented
    scope*. Under time pressure follow the cut order (docs 06 §4) and **never cut below the line**:
    permission enforcement + tests, migrations + verification, search/filter/sort/pagination, the
    four UI states, the README.
