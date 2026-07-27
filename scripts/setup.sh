#!/usr/bin/env bash
# BOOTSTRAP a working dev environment (mirrors docs/02 §14).
#   1) Postgres via Docker  2) backend: install + prisma generate + migrate dev + seed
#   3) frontend: install     4) preflight: node present (both apps + .claude hooks need it)
#
# GREENFIELD-SAFE: each step is skipped with a clear pointer until that piece is scaffolded.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"

echo "── preflight ──"
if ! command -v node >/dev/null; then
  echo "  ✗ node is REQUIRED (both apps + the .claude hooks use it). Install Node 20+." >&2
  exit 1
fi
echo "  node $(node --version)"
command -v docker >/dev/null && echo "  docker present" || echo "  ! docker not found (needed for Postgres + tests)"

if [ -f docker-compose.yml ]; then
  echo "── database: docker compose up -d ──"; docker compose up -d || echo "  ! could not start Docker Postgres"
else
  echo "── database: no docker-compose.yml yet (docs/06 Phase 3) — SKIPPED"
fi

if [ -f backend/package.json ]; then
  echo "── backend: install + prisma ──"
  ( cd backend && npm install \
      && [ -f .env ] || { [ -f .env.example ] && cp .env.example .env && echo "  copied backend/.env.example → .env"; } \
      && npm run prisma:generate --if-present \
      && npm run db:migrate:dev --if-present \
      && npm run db:seed --if-present )
else
  echo "── backend: not scaffolded yet (docs/06 Phase 2) — SKIPPED"
fi

if [ -f frontend/package.json ]; then
  echo "── frontend: install ──"
  ( cd frontend && npm install \
      && { [ -f .env ] || { [ -f .env.example ] && cp .env.example .env && echo "  copied frontend/.env.example → .env"; }; } )
else
  echo "── frontend: not scaffolded yet (docs/06 Phase 2) — SKIPPED"
fi

echo "✅ setup.sh done. Next: ./scripts/verify.sh (fast) or ./scripts/check.sh (full gate)."
