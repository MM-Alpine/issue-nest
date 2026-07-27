#!/usr/bin/env bash
# MIGRATION SAFETY — proves the committed Prisma migrations build a working schema from empty.
# Runs `migrate reset` (drops+recreates the DEV db, re-applies all migrations, re-seeds) then a
# `migrate deploy` smoke. DESTRUCTIVE to issuehub_dev; requires `docker compose up -d` first.
#
# This is a manual/CI safety tool — NOT part of the fast gate. Confirm before running.
# GREENFIELD-SAFE: skips until the Prisma schema exists (docs/06 Phase 4/5).
#
# Every step is checked: a failing step exits non-zero immediately, so this script can never
# print a success line for a rebuild that did not happen. (Prisma 6 additionally refuses
# `migrate reset` when it detects an AI agent unless PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION
# is set to the user's own words of consent — that refusal must fail the gate, not be skipped.)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

if [ ! -f backend/prisma/schema.prisma ]; then
  echo "✅ db-verify.sh: no prisma/schema.prisma yet (docs/06 Phase 4) — nothing to verify."
  exit 0
fi

step() {  # step <label> <command...>
  echo "── $1 ──"
  if ! "${@:2}"; then
    echo "❌ db-verify.sh: '$1' FAILED — the committed migrations were NOT proven to rebuild." >&2
    exit 1
  fi
}

cd backend
step "prisma validate"        npx prisma validate
step "migrate reset (dev)"    npx prisma migrate reset --force
step "migrate deploy (smoke)" npx prisma migrate deploy
echo "✅ db-verify.sh: committed migrations rebuild the schema cleanly from empty."
