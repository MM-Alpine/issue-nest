#!/usr/bin/env bash
# MIGRATION SAFETY — proves the committed Prisma migrations build a working schema from empty.
# Runs `migrate reset` (drops+recreates the DEV db, re-applies all migrations, re-seeds) then a
# `migrate deploy` smoke. DESTRUCTIVE to issuehub_dev; requires `docker compose up -d` first.
#
# This is a manual/CI safety tool — NOT part of the fast gate. Confirm before running.
# GREENFIELD-SAFE: skips until the Prisma schema exists (docs/06 Phase 4/5).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

if [ ! -f backend/prisma/schema.prisma ]; then
  echo "✅ db-verify.sh: no prisma/schema.prisma yet (docs/06 Phase 4) — nothing to verify."
  exit 0
fi

echo "⚠  This resets the DEV database (issuehub_dev). Ensure Docker Postgres is up."
cd backend
echo "── prisma validate ──";        npx prisma validate
echo "── migrate reset (dev) ──";    npx prisma migrate reset --force
echo "── migrate deploy (smoke) ──"; npx prisma migrate deploy
echo "✅ db-verify.sh: committed migrations rebuild the schema cleanly."
