# Quality gate — the development loop

The bounded, repeatable loop for every feature/fix on IssueHub. Applies to all work.
Source of truth: `docs/01`–`docs/06`; invariants: [../../docs/architecture/INVARIANTS.md](../../docs/architecture/INVARIANTS.md).

## The loop
1. **Understand** — read the relevant `docs/05` contract (and `docs/01` requirements) *in full*
   before writing an endpoint, schema, or page. Confirm the change is **in scope** (docs/01 §6);
   if it's on the out-of-scope list, stop and ask.
2. **Test-first** — for backend behaviour, write the integration/unit test from the mandatory
   checklist (docs/06 §2), watch it fail, then implement. Never mock Prisma.
3. **Implement** — smallest change that satisfies the requirement; respect the layer rules and
   invariants. No invented scope, no extra dependencies.
4. **Verify** — `./scripts/verify.sh` (fast, DB-free) during the loop; `./scripts/check.sh` before
   finishing. Migration change → `./scripts/db-verify.sh`. (All no-op cleanly until scaffolded.)
5. **Review with built-in subagents** — see below. Address CRITICAL/HIGH before proceeding.
6. **Commit & push** the feature branch (Conventional Commits). **Never** merge, push to
   `master`/`main`, or run a migration without confirmation.
7. **Report honestly** — state what ran and what it proves; call out what was *not* verified
   (e.g. UI behaviour, anything needing a live DB). Do not report success while the gate is red.

## Mandatory review step (built-in agents/skills — do not create project copies)
Run these on your diff and fix CRITICAL/HIGH findings before committing / opening a PR:

| Reviewer | When | Focus |
|---|---|---|
| `code-reviewer` | always | correctness, structure, edge cases, missing tests |
| `security-reviewer` | **auth / permissions / validation / Prisma / env / errors** (most changes) | authz holes, `404`-vs-`403`, `passwordHash` leaks, injection, secret handling |
| `typescript-reviewer` | TS changes | strict-mode + async correctness |
| `database-reviewer` | Prisma/schema/migration changes | migration safety, indexes, query correctness, `db push` misuse |
| `test-review` (skill) | any behaviour change | is the changed behaviour actually covered by meaningful tests? |

These are **instruction-enforced**, not blocked by a hook (a shell hook cannot run an in-session
subagent). The deterministic layer is `check.sh` + the Claude hooks; the review is your discipline.
See [../../docs/architecture/ENFORCEMENT.md](../../docs/architecture/ENFORCEMENT.md).

## Definition of done
`./scripts/check.sh` green · every relevant mandatory-checklist line (docs/06 §2) is a named passing
test · CRITICAL/HIGH review findings addressed · migrations proven replayable if touched · honest
report. Acceptance criteria: docs/01 §9.
