# scripts/

Repo-level wrappers over the two apps (`backend/`, `frontend/`). Each **degrades gracefully**
while the repo is still docs-only — they skip un-scaffolded apps with a pointer to docs/06 Phase 2
rather than failing.

| Script | Purpose | Needs |
|---|---|---|
| `setup.sh` | Bootstrap: Docker Postgres + per-app install + Prisma generate/migrate/seed | Docker, node |
| `verify.sh` | **Fast inner loop** — backend typecheck + pure unit tests (no DB) | node |
| `check.sh` | **Quality gate** — backend typecheck+lint+test · frontend typecheck+lint+build | node (+ Docker for backend tests) |
| `check.sh --lite` | **typecheck only** (both apps) — fast, Docker-free, test-first-safe; run by the Stop hook | node |
| `db-verify.sh` | **Migration safety** — `prisma migrate reset` + `deploy` smoke (destructive to dev DB) | Docker, node |

Once the apps are scaffolded, Phase 2/6 should add these npm scripts so the wrappers do real work:
- **backend**: `typecheck` (`tsc --noEmit`), `lint`, `test`, `test:unit` (tests/unit only), plus the
  documented `prisma:generate`, `db:migrate:dev`, `db:migrate:deploy`, `db:seed`, `dev`, `test:coverage`.
- **frontend**: `typecheck`, `lint`, `build`, `dev`.

Authoritative command reference: [docs/02 §14](../docs/02-technical-requirements.md).
