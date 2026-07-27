#!/usr/bin/env bash
# FAST, DB-FREE signal — the tight inner-loop check while implementing.
#   backend/ → typecheck + pure unit tests (no Docker/Postgres needed)
# Run scripts/check.sh for the full gate (adds lint, integration tests, frontend build).
#
# GREENFIELD-SAFE: skips cleanly until backend is scaffolded (docs/06 Phase 2). Expects a
# `test:unit` script that runs only tests/unit (pure logic — no DB). Falls back to `typecheck` only.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

if [ ! -f backend/package.json ]; then
  echo "✅ verify.sh: backend not scaffolded yet (docs/06 Phase 2) — nothing to verify."
  exit 0
fi

fail=0
echo "── backend: typecheck ──"
( cd backend && npm run typecheck --if-present ) || fail=1
echo "── backend: unit tests (DB-free) ──"
( cd backend && npm run test:unit --if-present ) || fail=1

[ "$fail" -eq 0 ] && { echo "✅ verify.sh passed"; exit 0; } || { echo "❌ verify.sh failed"; exit 1; }
