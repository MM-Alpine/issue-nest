# 04 — Application Flow

Every flow uses the same layered trace: **User action → Frontend validation → API request →
Express route → Authentication → Authorisation → Service logic → Prisma → PostgreSQL → API
response → UI update.** Layers that do not apply to a flow are marked *(none)* rather than omitted,
so the pipeline stays comparable across flows.

Shorthand: `authenticate` = JWT middleware (`401` on failure) · `validate(...)` = Zod middleware
(`400 VALIDATION_ERROR` on failure) · `requireMembership` = `404` if the caller is not a project
member · `requireMaintainer` = `403` if the caller is a member without the `MAINTAINER` role.

---

## 1. Signup

```
User action          Submits Name / Email / Password on /signup
Frontend validation  Zod: name 1–100, email format, password ≥ 8. Errors inline; submit blocked
API request          POST /api/auth/signup  { name, email, password }
Express route        authRouter.post('/signup', validate({ body: SignupBody }), controller.signup)
Authentication       (none — public)
Authorisation        (none)
Service logic        authService.signup(): normalise email to lowercase → hash password with
                     bcrypt (cost 10) → create user → sign JWT { sub: user.id }
Prisma               prisma.user.create({ data: { name, email, passwordHash },
                                          select: { id, name, email, createdAt } })
PostgreSQL           INSERT INTO "User" …   (unique index on email)
API response         201 { user: { id, name, email, createdAt }, accessToken }
UI update            AuthContext stores token + user → redirect /projects → toast "Welcome to
                     IssueHub, Asha"
```

**Duplicate email:** Prisma throws `P2002` → service maps it to
`conflict('EMAIL_ALREADY_EXISTS')` → `409` → inline error under the email field with a link to
`/login`. The pre-check-then-insert race is avoided by relying on the unique constraint rather
than a `findUnique` first.

## 2. Login

```
User action          Submits Email / Password on /login
Frontend validation  Zod: email format, password non-empty
API request          POST /api/auth/login  { email, password }
Express route        authRouter.post('/login', validate({ body: LoginBody }), controller.login)
Authentication       (none — this flow issues the token)
Authorisation        (none)
Service logic        find user by lowercased email → bcrypt.compare → on either failure throw
                     unauthorized('INVALID_CREDENTIALS', 'Invalid email or password')
                     → sign JWT
Prisma               prisma.user.findUnique({ where: { email } })   // includes passwordHash here
PostgreSQL           SELECT … FROM "User" WHERE email = $1
API response          200 { user: { id, name, email }, accessToken }   (passwordHash stripped)
UI update            Token → localStorage, user → AuthContext, redirect to the originally
                     requested route or /projects
```

Unknown email and wrong password return the **identical** `401` body, so the endpoint cannot be
used to enumerate accounts.

## 3. Logout

```
User action          Clicks "Log out" in the header
Frontend validation  (none)
API request          POST /api/auth/logout   (fire-and-forget; failures are ignored)
Express route        authRouter.post('/logout', authenticate, controller.logout)
Authentication       authenticate — 401 if the token is already invalid (harmless)
Authorisation        (none)
Service logic        (none — stateless bearer tokens have nothing to invalidate server-side)
Prisma               (none)
PostgreSQL           (none)
API response         204 No Content
UI update            Remove token from localStorage → AuthContext user = null →
                     queryClient.clear() → redirect /login
```

**Documented limitation:** no server-side revocation. A token that leaked before logout stays
valid until `exp`.

## 4. Session restore / current user

```
User action          Reloads the app or deep-links to a protected route
Frontend validation  (none)
API request          GET /api/me  with Authorization: Bearer <token from localStorage>
Express route        meRouter.get('/me', authenticate, controller.me)
Authentication       verify signature + expiry → load user by sub → attach req.user
Authorisation        (none)
Service logic        return req.user
Prisma               prisma.user.findUnique({ where: { id }, select: { id, name, email, createdAt } })
PostgreSQL           SELECT id, name, email, "createdAt" FROM "User" WHERE id = $1
API response         200 { user: { … } }   — never passwordHash
UI update            Success → render the route. 401 → clear token, redirect /login.
                     While pending → full-page spinner (prevents a login-screen flash)
```

`ProtectedRoute` renders the spinner while `me` is pending, the page when it resolves, and
`<Navigate to="/login" state={{ from }} />` when it fails.

## 5. Create project

```
User action          "New project" → fills Name / Key / Description → Create
Frontend validation  Zod: name 1–100; key uppercased, ^[A-Z][A-Z0-9]{1,9}$; description ≤ 1000
API request          POST /api/projects  { name, key, description? }
Express route         projectsRouter.post('/', authenticate, validate({ body: CreateProjectBody }), …)
Authentication       authenticate
Authorisation        (none — any authenticated user may create a project)
Service logic        projectService.create(): single transaction creating the project and the
                     creator's MAINTAINER membership, so a project can never exist without a
                     maintainer
Prisma               prisma.$transaction(async tx => {
                       const p = await tx.project.create({ data: { name, key, description } })
                       await tx.projectMember.create({ data: { projectId: p.id,
                                                               userId, role: 'MAINTAINER' } })
                       return p })
PostgreSQL           BEGIN; INSERT INTO "Project" …; INSERT INTO "ProjectMember" …; COMMIT;
API response         201 { project: { id, name, key, description, createdAt, role: 'MAINTAINER',
                                      issueCount: 0 } }
UI update            Close modal → invalidate ['projects'] → new card appears → toast
                     "Project WEB created"
```

**Key collision:** `P2002` on `Project.key` → `409 PROJECT_KEY_TAKEN` → inline error on the key
field. The transaction rolls back, leaving no orphan project.

## 6. List projects

```
User action          Navigates to /projects
Frontend validation  (none)
API request          GET /api/projects
Express route        projectsRouter.get('/', authenticate, controller.list)
Authentication       authenticate
Authorisation        Implicit — the query is scoped by membership, so there is nothing to forbid
Service logic        list memberships for the user, include the project and its issue count,
                     order by project.createdAt desc, flatten to project + role + issueCount
Prisma               prisma.projectMember.findMany({
                       where: { userId },
                       include: { project: { include: { _count: { select: { issues: true } } } } },
                       orderBy: { project: { createdAt: 'desc' } } })
PostgreSQL           SELECT … FROM "ProjectMember" JOIN "Project" … + counted subquery
API response         200 { projects: [ { id, name, key, description, role, issueCount, createdAt } ] }
UI update            useQuery(['projects']) → skeletons → grid, or the empty/error state
```

Membership-scoped at the query level, not filtered after fetching — a non-member's project is
never loaded into memory.

## 7. Add project member

```
User action          Maintainer opens the Members drawer, enters an email, picks a role, Add
Frontend validation  Zod: email format; role ∈ { MEMBER, MAINTAINER }
API request          POST /api/projects/:projectId/members  { email, role }
Express route        projectsRouter.post('/:projectId/members', authenticate,
                       validate({ params: ProjectIdParams, body: AddMemberBody }), …)
Authentication       authenticate
Authorisation        requireMaintainer(projectId, req.user.id)
                       → not a member  → 404 NOT_FOUND
                       → MEMBER role   → 403 FORBIDDEN
Service logic        find the user by lowercased email → 404 USER_NOT_FOUND if absent →
                     create the membership → 409 ALREADY_MEMBER on P2002 from the
                     (projectId, userId) composite unique constraint
Prisma               prisma.user.findUnique({ where: { email } })
                     prisma.projectMember.create({ data: { projectId, userId, role },
                                                   include: { user: { select: { id, name, email } } } })
PostgreSQL           SELECT … FROM "User" WHERE email = $1;
                     INSERT INTO "ProjectMember" …  (unique on (projectId, userId))
API response         201 { member: { userId, name, email, role, createdAt } }
UI update            Invalidate ['project', id, 'members'] and ['project', id] → row appears →
                     toast "Ravi Menon added as Member". Errors render inline in the drawer
```

No email is sent (per the assignment) and no invitation record exists — the person must already
have an account.

## 8. List members

```
User action          Opens the Members drawer, or an issue form needs the assignee options
Frontend validation  (none)
API request          GET /api/projects/:projectId/members
Express route        projectsRouter.get('/:projectId/members', authenticate,
                       validate({ params: ProjectIdParams }), …)
Authentication       authenticate
Authorisation        requireMembership(projectId, userId) → 404 if not a member
Service logic        list memberships, MAINTAINER first then name asc
Prisma               prisma.projectMember.findMany({ where: { projectId },
                       include: { user: { select: { id, name, email } } },
                       orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }] })
PostgreSQL           SELECT … FROM "ProjectMember" JOIN "User" … ORDER BY role, name
API response         200 { members: [ { userId, name, email, role, createdAt } ] }
UI update            Drawer list; also feeds the assignee `<select>` and the assignee filter
```

`role: 'asc'` puts `MAINTAINER` first because the Prisma enum declares `MAINTAINER` before
`MEMBER` — Postgres enums sort by declaration order.

## 9. Create issue

```
User action          "New issue" → Title / Description / Priority (+ Assignee if maintainer) → Create
Frontend validation  Zod: title 1–200 required; description ≤ 5000; priority enum;
                     assigneeId optional and only rendered for maintainers
API request          POST /api/projects/:projectId/issues
                     { title, description?, priority, assigneeId? }
Express route        issuesRouter.post('/projects/:projectId/issues', authenticate,
                       validate({ params: ProjectIdParams, body: CreateIssueBody }), …)
Authentication       authenticate
Authorisation        requireMembership → any member may create.
                     If assigneeId is present and the caller is not a MAINTAINER → 403 FORBIDDEN
Service logic        validate the assignee is a member of this project (→ 422
                     ASSIGNEE_NOT_MEMBER) → create with status 'OPEN' and reporterId = caller
Prisma               (if assigneeId) prisma.projectMember.findUnique({
                        where: { projectId_userId: { projectId, userId: assigneeId } } })
                     prisma.issue.create({ data: { projectId, title, description, priority,
                        status: 'OPEN', reporterId, assigneeId },
                        include: { reporter: pick, assignee: pick } })
PostgreSQL           SELECT … FROM "ProjectMember" WHERE …;  INSERT INTO "Issue" …
API response         201 { issue: { … } }
UI update            Close modal → invalidate ['issues', projectId] → row appears → toast
                     "Issue created"
```

## 10. List issues with search, filters, sorting and pagination

```
User action          Types in search, changes a filter, changes sort, or clicks Next
Frontend validation  Client sends only known values (selects are closed sets); the debounced
                     search string is sent raw
API request          GET /api/projects/:projectId/issues
                       ?q=login&status=OPEN&priority=HIGH&assignee=<userId|unassigned>
                       &sort=priority&order=desc&page=2&pageSize=20
Express route        issuesRouter.get('/projects/:projectId/issues', authenticate,
                       validate({ params: ProjectIdParams, query: IssueListQuery }), …)
Authentication       authenticate
Authorisation        requireMembership(projectId, userId) → 404 if not a member
Service logic        buildIssueWhere(): AND-combine projectId + optional
                       { title: { contains: q, mode: 'insensitive' } }, status, priority,
                       assigneeId (or assigneeId: null for 'unassigned')
                     buildIssueOrderBy(): map sort → [{ <field>: order }, { id: 'desc' }]
                       (the id tiebreaker keeps pagination stable across equal values)
                     paginate(): skip = (page-1) * pageSize, take = pageSize
Prisma               prisma.$transaction([
                       prisma.issue.findMany({ where, orderBy, skip, take,
                         include: { assignee: pick, reporter: pick } }),
                       prisma.issue.count({ where }) ])
PostgreSQL           SELECT … WHERE "projectId"=$1 AND title ILIKE '%login%' AND status='OPEN'
                       ORDER BY priority DESC, id DESC LIMIT 20 OFFSET 20;
                     SELECT count(*) … same WHERE
API response         200 { issues: [ … ], meta: { page, pageSize, total, totalPages } }
UI update            Filters live in the URL, so the query key is the query string → cached
                       pages render instantly; new ones show skeletons.
                       Result count and pagination footer come from meta
```

**Documented query semantics**

| Parameter | Accepted | Default |
|-----------|----------|---------|
| `q` | string ≤ 200, case-insensitive `contains` on **title only** | none |
| `status` | `OPEN` \| `IN_PROGRESS` \| `RESOLVED` \| `CLOSED` | none (all) |
| `priority` | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` | none (all) |
| `assignee` | a user id, or the literal `unassigned` | none (all) |
| `sort` | `createdAt` \| `priority` \| `status` | `createdAt` |
| `order` | `asc` \| `desc` | `desc` |
| `page` | integer ≥ 1 | `1` |
| `pageSize` | integer 1–100 | `20` |

- Multiple filters combine with **AND**. Each parameter may appear once; repeats are rejected.
- Sorting by `priority` and `status` is **semantic**, not alphabetical, because the Postgres enums
  are declared in meaningful order (`LOW→CRITICAL`, `OPEN→CLOSED`) and Postgres sorts enums by
  declaration order. `sort=priority&order=desc` therefore returns CRITICAL first.
- Invalid values (unknown enum, `page=0`, `pageSize=500`, `sort=title`, non-numeric page) →
  `400 VALIDATION_ERROR` listing the offending fields. Nothing is silently clamped.
- Unknown query parameters are ignored (the query schema is not `strict()`, unlike bodies) so a
  stale bookmarked URL still works.
- `page` beyond the last page returns `200` with an empty array and honest `meta` — not a `404`.

## 11. View issue detail

```
User action          Clicks an issue row, or opens /issues/:issueId directly
Frontend validation  (none)
API request          GET /api/issues/:issueId   (then GET /api/issues/:issueId/comments)
Express route        issuesRouter.get('/issues/:issueId', authenticate,
                       validate({ params: IssueIdParams }), …)
Authentication       authenticate
Authorisation        load the issue → 404 if missing → requireMembership(issue.projectId, userId)
                       → 404 if the caller is not a member (existence stays hidden)
Service logic        return the issue with reporter, assignee, project, and the caller's own role
                       so the UI knows which controls to render
Prisma               prisma.issue.findUnique({ where: { id },
                       include: { reporter: pick, assignee: pick,
                                  project: { select: { id, key, name } } } })
                     getMembership(issue.projectId, userId)
PostgreSQL           SELECT … FROM "Issue" LEFT JOIN "User" (reporter, assignee) JOIN "Project" …
API response         200 { issue: { …, project: { id, key, name } }, viewerRole: 'MAINTAINER' }
UI update            Render detail; `viewerRole` + `issue.reporterId === me.id` decide whether
                       Edit / Delete / status select / assignee select render
```

`viewerRole` is a convenience for rendering only. The server re-derives permission on every
mutation and never trusts it back from the client.

## 12. Edit issue

```
User action          Reporter or maintainer clicks Edit, changes fields, Save
Frontend validation  Same Zod schema as create; only changed fields are sent
API request          PATCH /api/issues/:issueId   { title?, description?, priority? }
                       (+ status?, assigneeId? when the viewer is a maintainer)
Express route        issuesRouter.patch('/issues/:issueId', authenticate,
                       validate({ params: IssueIdParams, body: UpdateIssueBody }), …)
Authentication       authenticate
Authorisation        load issue → 404 if missing → requireMembership → 404 if not a member →
                     assertCanUpdateIssue(issue, membership, Object.keys(body)):
                       MAINTAINER                     → all fields allowed
                       MEMBER + reporter              → title/description/priority only,
                                                        status or assigneeId → 403
                       MEMBER + not reporter          → 403
Service logic        if assigneeId is being set, verify project membership → 422
                     ASSIGNEE_NOT_MEMBER. Reject an empty patch with 400. Apply the update
Prisma               prisma.issue.update({ where: { id }, data: patch,
                       include: { reporter: pick, assignee: pick } })   // @updatedAt refreshes
PostgreSQL           UPDATE "Issue" SET … , "updatedAt" = now() WHERE id = $1 RETURNING *
API response         200 { issue: { … } }
UI update            Close modal → invalidate ['issue', id] and ['issues', projectId] → toast
                     "Issue updated"
```

## 13. Assign / reassign and change status

Both are `PATCH /api/issues/:issueId` with a single field; they are separate UI affordances, not
separate endpoints.

```
User action          Maintainer picks a new Assignee or Status in the sidebar (no Save button)
Frontend validation  Values come from closed sets: project members (+ "Unassigned"), 4 statuses
API request          PATCH /api/issues/:issueId  { assigneeId: "c…" | null }
                     PATCH /api/issues/:issueId  { status: "IN_PROGRESS" }
Express route        as flow 12
Authentication       authenticate
Authorisation        requireMembership → assertCanUpdateIssue → a MEMBER touching status or
                     assigneeId is rejected with 403 even for their own issue
Service logic        assignee: null clears the assignment; a non-null value must belong to the
                     project → 422 ASSIGNEE_NOT_MEMBER.
                     status: any of the four values; no transition rules (assumption A16)
Prisma               prisma.projectMember.findUnique({ where: { projectId_userId: … } })  // assignee only
                     prisma.issue.update({ where: { id }, data: { assigneeId | status } })
PostgreSQL           UPDATE "Issue" SET "assigneeId" = $1 | status = $2, "updatedAt" = now() …
API response         200 { issue: { … } }
UI update            Sidebar select and the header badge both update; badge plays the 300ms
                     colour fade; toast "Status updated to In progress" / "Assigned to Asha Kumar"
```

## 14. Delete issue

```
User action          Maintainer clicks Delete → confirms in the modal
Frontend validation  (none — the confirm modal is the guard)
API request          DELETE /api/issues/:issueId
Express route        issuesRouter.delete('/issues/:issueId', authenticate,
                       validate({ params: IssueIdParams }), …)
Authentication       authenticate
Authorisation        load issue → 404 if missing → requireMaintainer(issue.projectId, userId):
                       non-member → 404, MEMBER (even the reporter) → 403
Service logic        hard delete; comments are removed by the FK cascade
Prisma               prisma.issue.delete({ where: { id } })
PostgreSQL           DELETE FROM "Issue" WHERE id = $1;   -- ON DELETE CASCADE removes Comments
API response         204 No Content
UI update            Close modal → remove ['issue', id] from cache → invalidate
                     ['issues', projectId] → navigate to /projects/:projectId → toast
                     "Issue deleted"
```

## 15. List and add comments

```
User action          Opens an issue (list) / types a comment and clicks Comment (add)
Frontend validation  Add: trimmed body must be 1–5000 chars; the button stays disabled until then
API request          GET  /api/issues/:issueId/comments
                     POST /api/issues/:issueId/comments  { body }
Express route        commentsRouter.get('/issues/:issueId/comments', authenticate,
                       validate({ params: IssueIdParams }), …)
                     commentsRouter.post('/issues/:issueId/comments', authenticate,
                       validate({ params: IssueIdParams, body: CreateCommentBody }), …)
Authentication       authenticate
Authorisation        load the issue for its projectId → 404 if missing →
                     requireMembership(projectId, userId) → 404 if not a member.
                     Any member may read and write; maintainer status is irrelevant here
Service logic        list: order by createdAt asc (oldest first — a conversation reads downward)
                     add: trim, reject empty/whitespace-only via Zod (400), create with
                          authorId = caller
Prisma               prisma.comment.findMany({ where: { issueId },
                       include: { author: { select: { id, name, email } } },
                       orderBy: { createdAt: 'asc' } })
                     prisma.comment.create({ data: { issueId, authorId, body },
                       include: { author: { select: { id, name, email } } } })
PostgreSQL           SELECT … FROM "Comment" JOIN "User" … ORDER BY "createdAt" ASC;
                     INSERT INTO "Comment" …
API response         200 { comments: [ { id, body, createdAt, author: { id, name, email } } ] }
                     201 { comment: { … } }
UI update            List renders oldest-first with initials avatars and relative timestamps;
                     on success the composer clears, the list is invalidated, and the new
                     comment appears at the bottom
```

Author payload is limited to `id`, `name`, `email` — never `passwordHash`. Comments are not
paginated: the MVP has no requirement for it and threads are short.

## 16. Permission failure (cross-cutting)

```
User action          A member tries a maintainer action — by URL, devtools, or a stale UI
Frontend validation  Controls are not rendered, so this is reachable only outside the normal UI
API request          e.g. DELETE /api/issues/:issueId with a member's token
Express route        matched normally
Authentication       passes — the caller is a valid, logged-in user
Authorisation        requireMaintainer throws AppError('FORBIDDEN', 403)
Service logic        aborts before any write
Prisma               only the read needed to evaluate permission
PostgreSQL           SELECT only; no mutation
API response         403 { error: { code: 'FORBIDDEN',
                                    message: 'Only project maintainers can delete issues' } }
UI update            api/client.ts throws ApiError → mutation onError → error toast with the
                     server message. Nothing in the cache changes
```

Non-member variant: `requireMembership` throws `404 NOT_FOUND` instead, so a private project's
existence is never confirmed. `401` is handled globally: the client clears the token and redirects
to `/login` with a "Your session expired" toast, rather than showing a per-component error.

## 17. Validation failure (cross-cutting)

```
User action          Submits an empty issue title (or crafts a bad request directly)
Frontend validation  Blocks submission and shows "Title is required" under the field.
                     The server check below is the authority; the client check is only UX
API request          POST /api/projects/:projectId/issues  { title: "", priority: "URGENT" }
Express route        matched; validate({ body: CreateIssueBody }) runs before the controller
Authentication       authenticate (runs first — an unauthenticated bad request is still 401)
Authorisation        (not reached)
Service logic        (not reached)
Prisma               (none — no database round trip for malformed input)
PostgreSQL           (none)
API response         400 { error: { code: 'VALIDATION_ERROR',
                                    message: 'Invalid request body',
                                    details: { title: ['Title is required'],
                                               priority: ['Invalid priority'] } } }
UI update            client maps error.details onto per-field errors; focus moves to the first
                     invalid field. Fields not present in details keep their values
```

Order matters and is fixed: **authenticate → validate → authorise → service.** An unauthenticated
malformed request returns `401`, not `400`, so error responses never leak validation detail to
anonymous callers.

**Unexpected errors:** anything that is not an `AppError` is logged server-side with its stack and
returned as `500 { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }` — no
stack, no Prisma text, no SQL. The frontend shows a generic error toast.
