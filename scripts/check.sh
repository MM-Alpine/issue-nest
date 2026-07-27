#!/usr/bin/env bash
# QUALITY GATE for issue-nest. Two independent apps, no monorepo tool.
#
# Modes:
#   (default / "full")  backend: typecheck + lint + test   ·   frontend: typecheck + lint + build
#   --lite              typecheck only (both apps) — fast, Docker-free, TEST-FIRST SAFE.
#                       Used by the Stop hook so a turn ending in the TDD "red" phase (a failing
#                       test) or with Docker down is NOT blocked; it only ensures the code compiles.
#                       Full lint + tests + build run here (default) manually and in CI.
#
# GREENFIELD-SAFE: an un-scaffolded app (no package.json) is skipped loudly. Scripts run via
# `--if-present`; if the `typecheck` script is missing this gate WARNS (a green run would otherwise
# mean nothing). Phase 2 must add `typecheck`/`lint`/`build`/`test` scripts. Never fails a bare repo.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
MODE="full"; [ "${1:-}" = "--lite" ] && MODE="lite"
fail=0; ran=0

has_script() { [ -f "$1/package.json" ] && grep -q "\"$2\"[[:space:]]*:" "$1/package.json"; }

gate_app() {   # gate_app <dir> <script>...
  local dir="$1"; shift
  if [ ! -f "$dir/package.json" ]; then
    echo "── $dir: not scaffolded yet (docs/06 Phase 2) — SKIPPED"; return 0
  fi
  ran=1; echo "── $dir ($MODE) ──"
  has_script "$dir" typecheck || \
    echo "  ⚠ $dir has no \"typecheck\" script — this gate cannot verify types yet (add it in Phase 2)."
  local s
  for s in "$@"; do
    echo "  \$ (cd $dir && npm run $s --if-present)"
    ( cd "$dir" && npm run "$s" --if-present ) || { echo "  ✖ $dir: $s failed"; fail=1; }
  done
}

if [ "$MODE" = "lite" ]; then
  gate_app backend  typecheck
  gate_app frontend typecheck
else
  gate_app backend  typecheck lint test
  gate_app frontend typecheck lint build
fi

echo
if [ "$ran" -eq 0 ]; then
  echo "✅ check.sh ($MODE): nothing scaffolded yet — nothing to check (see docs/06 Phase 2)."
  exit 0
fi
if [ "$fail" -eq 0 ]; then echo "✅ check.sh ($MODE) passed"; exit 0; else echo "❌ check.sh ($MODE) failed"; exit 1; fi
