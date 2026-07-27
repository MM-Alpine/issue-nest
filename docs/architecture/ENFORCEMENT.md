# ENFORCEMENT — how each rule is (and is not) enforced

Honest map of what actually stops a mistake vs. what only advises. Do **not** describe an
advisory check as if it blocks, and do not treat the local hooks as a security boundary — they
are best-effort speed-bumps over Claude Code's permission model.

Legend: **Preventive** = blocks before the effect · **Detective** = catches after · **Advisory** =
warns/guides only · **n/a** = not yet applicable (code not scaffolded).

> Note: the **Stop hook runs `check.sh --lite` (typecheck only)** — a compile check that is
> Docker-free and does not fail on a test-first "red" test. The **full** gate (lint + tests + build)
> is `check.sh` (run manually before a PR) and **CI**. So "the Stop gate is green" means *it compiles*,
> not *tests pass* — do not overclaim.

| Rule (INVARIANTS.md) | Docs | Agent instruction | PreToolUse hook | Stop gate / `check.sh` | Test suite | CI | Type |
|---|---|---|---|---|---|---|---|
| Server-side authz / `404`-not-`403` / field perms / assignee-member | ✅ | ✅ | ❌ | via tests | ✅ (mandatory list) | ✅* | **Detective** (tests) |
| No `passwordHash` leak | ✅ | ✅ | ❌ | via tests | ✅ (asserted) | ✅* | **Detective** |
| Zod at boundaries / error envelope | ✅ | ✅ | ❌ | typecheck + tests | ✅ | ✅* | **Detective** |
| Prisma migrations only / no `db push` | ✅ | ✅ | ⚠ optional guard | `db-verify.sh` | migration smoke test | ✅* | **Advisory + Detective** |
| Enum declaration order → semantic sort | ✅ | ✅ | ❌ | — | ✅ (value-order asserted) | ✅* | **Detective** |
| Test DB never = dev DB | ✅ | ✅ | ❌ | — | globalSetup uses `TEST_DATABASE_URL` | ✅* | **Config + Detective** |
| Scope discipline (no invented scope) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **Advisory** (docs + review) |
| In-loop review (code/security/ts/db/test subagents) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | **Advisory** (mandated in AGENTS.md + sdlc rule; not hook-forced) |
| Secret-file reads (`.env`, keys) | — | — | — | — | — | — | **Preventive** — Claude `deny` (Read) |
| Dangerous shell (`rm -rf`, force-push, `DROP`) | — | — | ⚠ best-effort | — | — | — | **Advisory/Preventive** — hook + `deny` + default-prompt |
| Push to `master`/`main` / `--force` | — | — | ⚠ best-effort | — | — | — | **Preventive** — `deny` + default-prompt |
| Secret exfil in `git commit`/`push`/`gh pr` | — | — | ⚠ best-effort | — | — | — | **Advisory** — `git-arg-guard.mjs` over auto-allowed shapes |

`*` CI runs once `.github/workflows/ci.yml` is active and code exists; whether CI is a **required
merge gate** depends on branch protection configured on the Git host (not verifiable from the repo).

## What this means for an agent
- The **real boundary** for destructive/secret actions is the permission model in
  `.claude/settings.json` (deny + `defaultMode: default` prompting), plus human review at merge —
  **not** the regex hooks. The hooks add friction and logging; they are bypassable by shell shapes
  (path-qualified binaries, variable indirection, `bash -c`, …).
- The **real guarantee** for the business/security invariants is the **test suite** (detective,
  after the edit) — so those tests are mandatory and money-critical here in the reviewer's sense.
- **Scope and architecture invariants are advisory** — enforced by the docs + your own review, not
  by a hook. Respect docs/01 §6 and docs/06 §4 deliberately.

## Do not overclaim
When you report, say exactly what ran and what it proves. A green `check.sh` proves lint + types +
tests + build for the code that exists — not that migrations are safe on a clean DB (that's
`db-verify.sh`), not that the UI works (manual/CI), and not that a rule with no test is upheld.
