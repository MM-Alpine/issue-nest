@AGENTS.md

# CLAUDE.md — Claude Code layer

The cross-tool source of truth is **[AGENTS.md](AGENTS.md)** (imported above — read it first),
which in turn points at `docs/01`–`docs/06`. This file adds only Claude-Code-specific guidance.

> **Legend:** `◆ invariant` — must not change without an explicit, documented decision ·
> `◇ impl` — current implementation detail.

## Read before touching a subsystem
- Product & requirements (FR-1..25, scope, assumptions): [docs/01-project-requirements.md](docs/01-project-requirements.md)
- Stack, architecture, layer rules, auth/authz, validation, errors, test strategy: [docs/02-technical-requirements.md](docs/02-technical-requirements.md)
- Data model, permission matrix, endpoint contract, status codes: [docs/05-backend-schema-api.md](docs/05-backend-schema-api.md)
- Phases + **mandatory test checklist** + cut order: [docs/06-implementation-plan.md](docs/06-implementation-plan.md)
- UI/UX and app flow: [docs/03-ui-ux-design.md](docs/03-ui-ux-design.md), [docs/04-application-flow.md](docs/04-application-flow.md)
- Distilled invariants: [docs/architecture/INVARIANTS.md](docs/architecture/INVARIANTS.md)

## Scoped rules & the development loop
Per-surface rules live in `.claude/rules/` with `paths:` frontmatter, loaded when you work with
matching files: [.claude/rules/backend.md](.claude/rules/backend.md),
[.claude/rules/frontend.md](.claude/rules/frontend.md),
[.claude/rules/database.md](.claude/rules/database.md).
The always-on **[.claude/rules/sdlc-quality-gate.md](.claude/rules/sdlc-quality-gate.md)** defines the
bounded loop: understand → test-first → implement → `verify.sh`/`check.sh` → **review** → commit/PR.

## Review in the loop (mandatory before commit/PR)
Run Claude Code's **built-in** reviewer subagents on your diff and fix CRITICAL/HIGH findings —
**do not create project skill copies** (they would shadow the richer built-ins):
`code-reviewer` (always), `security-reviewer` (auth/permissions/validation/Prisma/env — most of this
app), `typescript-reviewer` (TS changes), `database-reviewer` (Prisma changes), and the `test-review`
skill. This is instruction-enforced, not hook-blocked — see AGENTS.md → Workflow and the sdlc rule.

## Deterministic guardrails
Hooks enforce what prompts cannot — dangerous-command block + git secret-exfil guard at exec time,
a `Stop` gate that runs `scripts/check.sh --lite` (**typecheck only** — so it never fights a
test-first "red" phase or needs Docker at turn-end) when `backend/**`/`frontend/**` source changed,
and format-on-write. Run the **full** `scripts/check.sh` (lint + tests + build) yourself before a PR;
CI runs it too. They are speed-bumps over the permission model, **not** a security boundary — see
[.claude/hooks/README.md](.claude/hooks/README.md). Never report success while a gate is red.

## Session startup checklist
1. Read [AGENTS.md](AGENTS.md); for a subsystem, read its `docs/*` + the scoped rule.
2. `git status` / `git branch --show-current` — know where you are (default branch is `master`).
3. Read the relevant `docs/05` contract **in full** before writing an endpoint or schema change.
4. Schema change? New Prisma migration with a meaningful name — **never `prisma db push`**, never edit an applied migration; confirm before running any migration.
5. Permission logic? It lives only in `backend/src/shared/permissions.ts`; enforce server-side; `404` for non-members.
6. Editing a query/sort? Respect enum **declaration order** for semantic sort.
7. Uncertain if something is in scope? Check docs/01 §6 out-of-scope + docs/06 §4 cut order. When unsure, ask — don't invent scope.

## Do not
- Build anything on the out-of-scope list (docs/01 §6) or invent architecture (DAO layer, Redis, queues, GraphQL, …).
- Return `passwordHash`, leak stack traces / Prisma text, or move authorization to the client.
- Push to `master`/`main`, force-push, or run migrations without explicit confirmation.
