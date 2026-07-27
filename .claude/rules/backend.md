---
paths:
  - "backend/**"
---

# Backend rules (Express 5 + Prisma + TypeScript)

Loaded when working under `backend/`. Contract: [docs/05](../../docs/05-backend-schema-api.md).
Invariants: [docs/architecture/INVARIANTS.md](../../docs/architecture/INVARIANTS.md).

## Layering (◆)
- Pipeline: `router → authenticate → validate(zod) → controller → service → Prisma`.
- **Controllers are thin**: parse nothing, no Prisma, no role `if`s — call a service, send the response.
- **Services own authorization + business rules + Prisma**, throw typed `AppError`s, return plain
  objects, never touch `req`/`res`.
- **No DAO/repository layer.** Prisma Client is the data layer, used via one singleton `lib/prisma.ts`.
- Keep files ≲ 300 lines; one module per feature (`modules/{auth,projects,issues,comments}` with
  `.routes .controller .service .schema`).

## Authorization (◆)
- All membership/role logic lives **only** in `src/shared/permissions.ts`
  (`requireMembership` → `404`, `requireMaintainer` → `403`, `assertCanUpdateIssue`, assignee check).
- Non-member → `404` (never `403`). Member-but-wrong-role → `403`. Re-check per resource on every request.
- `assertCanUpdateIssue`: MAINTAINER any field; reporter-MEMBER only `title`/`description`/`priority`;
  `status`/`assigneeId` maintainer-only (create too). Assignee must be a project member or `422`.

## Validation & errors (◆)
- Every route uses `validate({ body?, params?, query? })` with Zod `strict()` schemas beside the module.
- Types via `z.infer` — no duplicate interfaces. Ids validated CUID-shaped (`/^c[a-z0-9]{20,}$/i`).
- One error envelope `{ error: { code, message, details? } }` from `middleware/error-handler.ts`.
  Use the `lib/errors.ts` helpers; wrap async handlers in `asyncHandler`. Map `P2002→409`, `P2025→404`.
- **Never** return `passwordHash` (explicit `select` on every `User` read), a stack trace, or Prisma text.

## Data & transactions (◆)
- Multi-write ops (e.g. create project + creator membership) run in one `prisma.$transaction`.
- Schema changes go through a **new committed migration** (`db:migrate:dev --name …`) — never `db push`,
  never edit an applied migration. See [database.md](database.md).

## Auth
- bcrypt (cost 10; 4 under `NODE_ENV=test`); only `passwordHash` persisted.
- JWT HS256, claims `sub/iat/exp` only; roles read from DB per request. `authenticate` attaches `req.user`.
- `config/env.ts` Zod-parses env and fails fast; `JWT_SECRET` ≥ 32 chars.

## Tests (◆)
- Vitest + Supertest through `buildApp()` against real Postgres (`issuehub_test`). **Never mock Prisma.**
- Unit-test pure logic only (password, jwt, pagination, issue-query builders, permission helpers).
- Every mandatory-checklist line (docs/06 §2) is a named test; test-first for each module.
- Commands: `npm test`, `npm run test:coverage` (needs `docker compose up -d` first).
