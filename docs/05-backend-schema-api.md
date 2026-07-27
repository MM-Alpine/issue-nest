# 05 — Backend Schema & API Contract

The authoritative contract. All examples are abbreviated but structurally exact.
Base URL: `http://localhost:4000`. All request and response bodies are JSON.

---

# Part 1 — Data model

## 1.1 Prisma schema (planned)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Declaration order is significant: PostgreSQL sorts enum values by declaration
// order, so `orderBy: { role: 'asc' }` lists MAINTAINER before MEMBER.
enum Role {
  MAINTAINER
  MEMBER
}

// Declared in lifecycle order → `sort=status&order=asc` returns OPEN first.
enum IssueStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

// Declared in ascending severity → `sort=priority&order=desc` returns CRITICAL first.
enum IssuePriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships     ProjectMember[]
  reportedIssues  Issue[]   @relation("IssueReporter")
  assignedIssues  Issue[]   @relation("IssueAssignee")
  comments        Comment[]
}

model Project {
  id          String   @id @default(cuid())
  name        String
  key         String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members ProjectMember[]
  issues  Issue[]
}

model ProjectMember {
  projectId String
  userId    String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId],    references: [id], onDelete: Cascade)

  @@id([projectId, userId])          // composite PK == the uniqueness rule
  @@index([userId])                  // "projects I belong to"
}

model Issue {
  id          String        @id @default(cuid())
  projectId   String
  title       String
  description String?
  status      IssueStatus   @default(OPEN)
  priority    IssuePriority @default(MEDIUM)
  reporterId  String
  assigneeId  String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  project  Project @relation(fields: [projectId],  references: [id], onDelete: Cascade)
  reporter User    @relation("IssueReporter", fields: [reporterId], references: [id], onDelete: Restrict)
  assignee User?   @relation("IssueAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  comments Comment[]

  @@index([projectId, createdAt])
  @@index([projectId, status])
  @@index([projectId, priority])
  @@index([projectId, assigneeId])
}

model Comment {
  id        String   @id @default(cuid())
  issueId   String
  authorId  String
  body      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  issue  Issue @relation(fields: [issueId],  references: [id], onDelete: Cascade)
  author User  @relation(fields: [authorId], references: [id], onDelete: Restrict)

  @@index([issueId, createdAt])
}
```

## 1.2 Relationships

```
User 1───n ProjectMember n───1 Project        (many-to-many membership with a role)
Project 1───n Issue
User 1───n Issue        (as reporter,  required)
User 0/1─n Issue        (as assignee,  optional)
Issue 1───n Comment
User 1───n Comment      (as author)
```

`User` and `Issue` are joined by **two** distinct relations, which is why both carry explicit
relation names (`IssueReporter`, `IssueAssignee`) — without them Prisma cannot disambiguate.

## 1.3 Keys, constraints, indexes

| Table | Primary key | Unique | Foreign keys | Indexes |
|-------|-------------|--------|--------------|---------|
| `User` | `id` (cuid) | `email` | — | implicit on PK + unique email |
| `Project` | `id` (cuid) | `key` | — | implicit on PK + unique key |
| `ProjectMember` | **composite `(projectId, userId)`** | the PK itself | `projectId`→Project, `userId`→User | PK covers `projectId` lookups; extra index on `userId` |
| `Issue` | `id` (cuid) | — | `projectId`, `reporterId`, `assigneeId` | `(projectId, createdAt)`, `(projectId, status)`, `(projectId, priority)`, `(projectId, assigneeId)` |
| `Comment` | `id` (cuid) | — | `issueId`, `authorId` | `(issueId, createdAt)` |

**Why a composite primary key on `ProjectMember`** rather than a surrogate `id` plus
`@@unique([projectId, userId])`: the pair *is* the identity of a membership. It makes duplicate
membership impossible at the database level and gives Prisma the
`projectId_userId` compound lookup used by every permission check.

**Index rationale:** every issue query is project-scoped and then filtered or sorted by exactly
one of `createdAt`, `status`, `priority`, `assigneeId` — so each compound index leads with
`projectId`. `Comment(issueId, createdAt)` serves the single comment query directly.

## 1.4 Nullability

| Column | Nullable | Meaning of null |
|--------|----------|-----------------|
| `Project.description` | yes | No description supplied |
| `Issue.description` | yes | Title-only issue |
| `Issue.assigneeId` | yes | **Unassigned** — a first-class state, filterable via `assignee=unassigned` |
| everything else | no | — |

## 1.5 Timestamps

`createdAt` is `@default(now())` (database-side). `updatedAt` is Prisma's `@updatedAt`, refreshed
on every `update()`. All timestamps are `timestamp(3)` UTC and serialised as ISO-8601 with `Z`;
the frontend formats to local time with `Intl.DateTimeFormat`. `ProjectMember` has no `updatedAt`
because a membership is never edited (assumption A10).

## 1.6 Delete behaviour

| Deleting | Effect |
|----------|--------|
| `Issue` | Its `Comment`s cascade away — the only delete the API exposes |
| `Project` | Would cascade members and issues (and transitively comments). **No endpoint exposes this**; the behaviour is declared for correctness only |
| `User` | `Restrict` against reported issues and authored comments, so a user with history cannot be deleted; memberships would cascade and assignments would `SetNull`. **No endpoint exposes this** |

There are no soft deletes and no `deletedAt` columns — out of scope.

## 1.7 Permission matrix

`✓` allowed · `✗` rejected with the listed status · `—` not applicable

| Action | Non-member | MEMBER (not reporter) | MEMBER (reporter) | MAINTAINER |
|--------|-----------|-----------------------|-------------------|------------|
| `GET /api/projects` includes the project | ✗ omitted | ✓ | ✓ | ✓ |
| View project detail | ✗ 404 | ✓ | ✓ | ✓ |
| List project members | ✗ 404 | ✓ | ✓ | ✓ |
| Add a project member | ✗ 404 | ✗ 403 | ✗ 403 | ✓ |
| List project issues | ✗ 404 | ✓ | ✓ | ✓ |
| Create an issue | ✗ 404 | ✓ | ✓ | ✓ |
| Set `assigneeId` at creation | ✗ 404 | ✗ 403 | ✗ 403 | ✓ |
| View issue detail | ✗ 404 | ✓ | ✓ | ✓ |
| Update `title` / `description` / `priority` | ✗ 404 | ✗ 403 | ✓ | ✓ |
| Update `status` | ✗ 404 | ✗ 403 | ✗ 403 | ✓ |
| Update `assigneeId` | ✗ 404 | ✗ 403 | ✗ 403 | ✓ |
| Delete an issue | ✗ 404 | ✗ 403 | ✗ 403 | ✓ |
| List comments | ✗ 404 | ✓ | ✓ | ✓ |
| Add a comment | ✗ 404 | ✓ | ✓ | ✓ |
| Edit / delete a comment | — | — | — | — (not implemented) |
| Create a project | ✓ any authenticated user (creator becomes MAINTAINER) | | | |

**Two rules explain the whole table:**

1. Not a member → `404` (never `403`), so private projects stay invisible.
2. Member but insufficient role or not the reporter → `403` with a message naming the requirement.

---

# Part 2 — REST API

## 2.0 Conventions

- **Auth:** every endpoint except signup and login requires `Authorization: Bearer <jwt>`.
- **Success envelope:** a named key, never a bare array — `{ "user": … }`, `{ "projects": [ … ] }`,
  `{ "issues": [ … ], "meta": { … } }`. Room to add fields without breaking clients.
- **Error envelope:** always `{ "error": { "code", "message", "details"? } }`.
- **Ids:** CUID strings.
- **User objects** embedded anywhere are always exactly `{ id, name, email }`. `passwordHash` is
  never selected into a response.

**Status codes used**

| Code | Used for |
|------|----------|
| `200` | Successful GET / PATCH |
| `201` | Successful POST that creates a row |
| `204` | Logout, and successful DELETE |
| `400` | Validation failure (body, params, or query) — also the empty-patch case |
| `401` | Missing / invalid / expired token, or bad login credentials |
| `403` | Authenticated project member without sufficient permission |
| `404` | Resource absent **or** caller not a project member |
| `409` | Uniqueness conflict (email, project key, membership) |
| `422` | Semantically invalid reference: assignee is not a project member |
| `503` | Health check cannot reach the database |
| `500` | Unexpected server error |

`422` is used for exactly one condition. Everything else that fails validation is `400`
(assumption A13).

## 2.1 Endpoint summary

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| POST | `/api/auth/signup` | — | public |
| POST | `/api/auth/login` | — | public |
| POST | `/api/auth/logout` | ✓ | any user |
| GET | `/api/me` | ✓ | any user |
| POST | `/api/projects` | ✓ | any user |
| GET | `/api/projects` | ✓ | membership-scoped |
| GET | `/api/projects/:projectId` | ✓ | member |
| GET | `/api/projects/:projectId/members` | ✓ | member |
| POST | `/api/projects/:projectId/members` | ✓ | maintainer |
| GET | `/api/projects/:projectId/issues` | ✓ | member |
| POST | `/api/projects/:projectId/issues` | ✓ | member (maintainer to set assignee) |
| GET | `/api/issues/:issueId` | ✓ | member |
| PATCH | `/api/issues/:issueId` | ✓ | reporter (limited fields) or maintainer |
| DELETE | `/api/issues/:issueId` | ✓ | maintainer |
| GET | `/api/issues/:issueId/comments` | ✓ | member |
| POST | `/api/issues/:issueId/comments` | ✓ | member |
| GET | `/api/health` | — | public (liveness + DB ping) |

`/api/health` is an addition beyond the assignment: three lines of code, and it lets a reviewer
confirm the API and database are reachable before touching the UI.

## 2.2 Auth

### `POST /api/auth/signup`

```json
{ "name": "Asha Kumar", "email": "asha@example.com", "password": "correct-horse" }
```

`201`

```json
{
  "user": { "id": "clz1a…", "name": "Asha Kumar", "email": "asha@example.com",
            "createdAt": "2026-07-27T09:12:44.120Z" },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…"
}
```

Errors — `400 VALIDATION_ERROR` (name empty, malformed email, password < 8) ·
`409 EMAIL_ALREADY_EXISTS`.

### `POST /api/auth/login`

```json
{ "email": "asha@example.com", "password": "correct-horse" }
```

`200`

```json
{ "user": { "id": "clz1a…", "name": "Asha Kumar", "email": "asha@example.com" },
  "accessToken": "eyJhbGciOiJIUzI1NiIs…" }
```

Errors — `400 VALIDATION_ERROR` · `401 INVALID_CREDENTIALS` (identical for unknown email and
wrong password).

### `POST /api/auth/logout`

No body. `204 No Content`. Client-side disposal only; see doc 04 flow 3.

### `GET /api/me`

`200`

```json
{ "user": { "id": "clz1a…", "name": "Asha Kumar", "email": "asha@example.com",
            "createdAt": "2026-07-27T09:12:44.120Z" } }
```

Errors — `401 UNAUTHORIZED`.

## 2.3 Projects

### `POST /api/projects`

```json
{ "name": "Website Redesign", "key": "WEB", "description": "Marketing site rebuild" }
```

`201`

```json
{ "project": { "id": "clz2b…", "name": "Website Redesign", "key": "WEB",
               "description": "Marketing site rebuild", "role": "MAINTAINER", "issueCount": 0,
               "createdAt": "2026-07-27T09:20:00.000Z" } }
```

Validation — `name` 1–100 · `key` `^[A-Z][A-Z0-9]{1,9}$` (lowercase input is upper-cased before
validation) · `description` ≤ 1000, optional.
Errors — `400 VALIDATION_ERROR` · `401` · `409 PROJECT_KEY_TAKEN`.

### `GET /api/projects`

`200`

```json
{ "projects": [
  { "id": "clz2b…", "name": "Website Redesign", "key": "WEB", "description": "Marketing site rebuild",
    "role": "MAINTAINER", "issueCount": 12, "createdAt": "2026-07-27T09:20:00.000Z" },
  { "id": "clz2c…", "name": "Public API", "key": "API", "description": null,
    "role": "MEMBER", "issueCount": 8, "createdAt": "2026-07-26T14:02:00.000Z" }
] }
```

Only projects the caller belongs to. Newest first. Not paginated (assignment does not require it).

### `GET /api/projects/:projectId`

`200`

```json
{ "project": { "id": "clz2b…", "name": "Website Redesign", "key": "WEB",
               "description": "Marketing site rebuild", "role": "MAINTAINER",
               "memberCount": 3, "issueCount": 12,
               "createdAt": "2026-07-27T09:20:00.000Z" } }
```

Errors — `400` (malformed id) · `401` · `404 NOT_FOUND` (absent **or** not a member).

### `GET /api/projects/:projectId/members`

`200`

```json
{ "members": [
  { "userId": "clz1a…", "name": "Asha Kumar", "email": "asha@example.com",
    "role": "MAINTAINER", "createdAt": "2026-07-27T09:20:00.000Z" },
  { "userId": "clz1d…", "name": "Ravi Menon", "email": "ravi@example.com",
    "role": "MEMBER",     "createdAt": "2026-07-27T09:31:00.000Z" }
] }
```

Maintainers first, then name ascending. Errors — `401` · `404`.

### `POST /api/projects/:projectId/members`

```json
{ "email": "ravi@example.com", "role": "MEMBER" }
```

`201`

```json
{ "member": { "userId": "clz1d…", "name": "Ravi Menon", "email": "ravi@example.com",
              "role": "MEMBER", "createdAt": "2026-07-27T09:31:00.000Z" } }
```

Validation — valid email · `role` ∈ `MEMBER | MAINTAINER` (defaults to `MEMBER` if omitted).
Errors — `400` · `401` · `403 FORBIDDEN` (caller is a MEMBER) · `404 NOT_FOUND` (project invisible)
· `404 USER_NOT_FOUND` (no account with that email) · `409 ALREADY_MEMBER`.

Both `404`s are distinguished by `code`, so the UI can show the right message.

## 2.4 Issues

### `GET /api/projects/:projectId/issues`

Query parameters, defaults, and semantics are specified in
[04-application-flow.md § 10](./04-application-flow.md#10-list-issues-with-search-filters-sorting-and-pagination).

```
GET /api/projects/clz2b…/issues?q=login&status=IN_PROGRESS&priority=HIGH
      &assignee=clz1a…&sort=priority&order=desc&page=1&pageSize=20
```

`200`

```json
{
  "issues": [
    { "id": "clz3f…", "title": "Login button unresponsive on iOS",
      "description": "Tapping Log in on iOS Safari does nothing…",
      "status": "IN_PROGRESS", "priority": "HIGH",
      "reporter": { "id": "clz1d…", "name": "Ravi Menon", "email": "ravi@example.com" },
      "assignee": { "id": "clz1a…", "name": "Asha Kumar", "email": "asha@example.com" },
      "commentCount": 2,
      "createdAt": "2026-07-25T10:14:00.000Z", "updatedAt": "2026-07-26T09:02:00.000Z" }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 24, "totalPages": 2 }
}
```

`assignee` is `null` when unassigned. Errors — `400 VALIDATION_ERROR` (bad enum, `page=0`,
`pageSize=500`, unknown `sort`) · `401` · `404`.

### `POST /api/projects/:projectId/issues`

```json
{ "title": "Footer links 404", "description": "All footer links…",
  "priority": "LOW", "assigneeId": null }
```

`201` — same issue shape as above, with `status: "OPEN"` and `commentCount: 0`.

Validation — `title` 1–200 required · `description` ≤ 5000, optional/nullable ·
`priority` enum, defaults `MEDIUM` · `assigneeId` cuid or null, optional.
Errors — `400` · `401` · `403 FORBIDDEN` (a MEMBER supplied `assigneeId`) · `404` ·
`422 ASSIGNEE_NOT_MEMBER`.

### `GET /api/issues/:issueId`

`200`

```json
{
  "issue": {
    "id": "clz3f…", "title": "Login button unresponsive on iOS",
    "description": "Tapping Log in on iOS Safari does nothing…",
    "status": "IN_PROGRESS", "priority": "HIGH",
    "project": { "id": "clz2b…", "key": "WEB", "name": "Website Redesign" },
    "reporter": { "id": "clz1d…", "name": "Ravi Menon", "email": "ravi@example.com" },
    "assignee": { "id": "clz1a…", "name": "Asha Kumar", "email": "asha@example.com" },
    "createdAt": "2026-07-25T10:14:00.000Z", "updatedAt": "2026-07-26T09:02:00.000Z"
  },
  "viewerRole": "MAINTAINER"
}
```

`viewerRole` exists so the UI knows which controls to render. It is advisory: the server
re-derives permission on every mutation. Errors — `400` · `401` · `404`.

### `PATCH /api/issues/:issueId`

At least one field required. Field-level permissions per the matrix.

```json
{ "status": "RESOLVED" }
```

`200` — the full updated issue, same shape as `GET`.

Validation — same field rules as create · body must be non-empty (`400 VALIDATION_ERROR`,
`details: { "_": ["No fields to update"] }`) · `assigneeId: null` clears the assignment.
Errors — `400` · `401` · `403 FORBIDDEN` (member editing another's issue, or a member touching
`status`/`assigneeId`) · `404` · `422 ASSIGNEE_NOT_MEMBER`.

### `DELETE /api/issues/:issueId`

`204 No Content`. Comments cascade. Errors — `400` · `401` · `403 FORBIDDEN` (non-maintainer,
including the reporter) · `404`.

## 2.5 Comments

### `GET /api/issues/:issueId/comments`

`200`

```json
{ "comments": [
  { "id": "clz4h…", "body": "Reproduced on iOS 17.4.",
    "author": { "id": "clz1d…", "name": "Ravi Menon", "email": "ravi@example.com" },
    "createdAt": "2026-07-25T11:00:00.000Z", "updatedAt": "2026-07-25T11:00:00.000Z" },
  { "id": "clz4j…", "body": "Fix is in review.",
    "author": { "id": "clz1a…", "name": "Asha Kumar", "email": "asha@example.com" },
    "createdAt": "2026-07-26T08:40:00.000Z", "updatedAt": "2026-07-26T08:40:00.000Z" }
] }
```

**Documented order: `createdAt` ascending (oldest first)** — a thread reads top to bottom. Not
paginated. Errors — `400` · `401` · `404`.

### `POST /api/issues/:issueId/comments`

```json
{ "body": "Fix is in review." }
```

`201 { "comment": { … } }` — same shape as a list element.

Validation — `body` trimmed, 1–5000 chars. `""` and `"   "` both fail with
`400 VALIDATION_ERROR`. Errors — `400` · `401` · `404`.

## 2.6 Health

`GET /api/health` → `200 { "status": "ok", "database": "up" }`, or
`503 { "error": { "code": "SERVICE_UNAVAILABLE", … } }` if `SELECT 1` fails.

## 2.7 Structured error examples

**Validation (400)**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request body",
             "details": { "title": ["Title is required"],
                          "priority": ["Expected one of LOW, MEDIUM, HIGH, CRITICAL"] } } }
```

**Invalid query (400)**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid query parameters",
             "details": { "pageSize": ["pageSize must be between 1 and 100"],
                          "sort": ["Expected one of createdAt, priority, status"] } } }
```

**Unauthenticated (401)**

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }
```

**Bad credentials (401)**

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" } }
```

**Forbidden (403)**

```json
{ "error": { "code": "FORBIDDEN", "message": "Only project maintainers can change issue status" } }
```

**Not found / not a member (404)**

```json
{ "error": { "code": "NOT_FOUND", "message": "Issue not found" } }
```

**Conflict (409)**

```json
{ "error": { "code": "EMAIL_ALREADY_EXISTS", "message": "An account with this email already exists" } }
```

**Unprocessable (422)**

```json
{ "error": { "code": "ASSIGNEE_NOT_MEMBER",
             "message": "The assignee must be a member of this project" } }
```

**Unexpected (500)** — stack logged server-side, never sent:

```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Something went wrong" } }
```

## 2.8 Transaction requirements

Only two operations need atomicity; everywhere else a single Prisma call is already atomic.

| Operation | Why a transaction |
|-----------|-------------------|
| **Create project** | `Project` insert + creator's `MAINTAINER` `ProjectMember` insert must both land. A project with no maintainer would be permanently unmanageable. `prisma.$transaction(async tx => …)` |
| **List issues** | `findMany` + `count` must see the same snapshot, or `meta.total` can disagree with the page under concurrent writes. `prisma.$transaction([findMany, count])` |

Uniqueness (email, project key, membership) is enforced by database constraints and handled via
Prisma's `P2002` rather than a read-then-write check, which would be racy. Test-database cleanup
uses a single `TRUNCATE … CASCADE`, not a transaction.

## 2.9 Seed data (`prisma/seed.ts`)

Idempotent (`upsert` by unique key), so it can be re-run safely.

| Entity | Content |
|--------|---------|
| Users | `asha@example.com` (maintainer of both), `ravi@example.com`, `mei@example.com` — all with password `password123` |
| Projects | `WEB` — Website Redesign · `API` — Public API |
| Members | Asha MAINTAINER in both; Ravi MEMBER in WEB; Mei MEMBER in API |
| Issues | 20 total (12 in WEB, 8 in API) spread across all four statuses and all four priorities, mixed reporters, some unassigned, staggered `createdAt` values so sorting and pagination are visibly meaningful |
| Comments | 2–3 comments on four of the issues |

Demo credentials go in the README. These are seed fixtures, not secrets.
