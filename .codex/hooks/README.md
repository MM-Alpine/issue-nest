# Claude Code hooks — issue-nest

Committed, deterministic guardrails, written in **Node (zero dependencies, built-ins only)** to match
the project's runtime — no `python3` needed. They are **best-effort speed-bumps over the permission
model in `../settings.json`**, plus observability — **not** a security boundary. They read the hook
payload as JSON on **stdin** (Claude Code does not set `CLAUDE_TOOL_INPUT_*` env vars) and are wired
via `node <path>` in `../settings.json`.

## Wired hooks

| Hook | Event / matcher | Does | Blocks? |
|---|---|---|---|
| `block-dangerous-commands.mjs` | PreToolUse · Bash | Blocks `rm -rf` (abs/home), force-push to a protected branch (master/main/develop/…), non-test `DROP` — flag-order independent | yes (exit 2) |
| `git-arg-guard.mjs` | PreToolUse · Bash | On `git commit`/`git push`/`gh pr create`, blocks the real exfil vectors: `$(...)`, backticks, chaining/backgrounding (`&& \|\| ; \| &`), or a file-inclusion flag (`--body-file`/`--file`/`-F`). It does **not** flag a secret word inside a `-m` message (not an exfil vector) | yes (exit 2) |
| `format-on-write.mjs` | PostToolUse · Write/Edit/MultiEdit | Prettier `--write` on the touched file (no-op until Prettier is installed) | no |
| `stop-gate.mjs` | Stop | Runs `scripts/check.sh --lite` (**typecheck only** — Docker-free, test-first-safe) when `backend/**`/`frontend/**` source changed; blocks turn-end only if the code does not compile. Loop-guarded; skips a docs-only repo | yes (exit 2) |

## Requirements
- **`node`** on PATH (already required to build/run both apps). No other runtime; hooks use only Node
  built-ins (`process.stdin`, `child_process`, `fs`), so they work before `npm install`.

## Known limitations (do not over-trust)
- The Bash guards are **text heuristics**. They are bypassable by path-qualified binaries (`/bin/rm`),
  variable indirection (`R=rm; $R …`), and `bash -c "…"`. Those shapes are **not** auto-allowed by
  `settings.json`, so under `defaultMode: default` they **prompt** rather than execute — the
  permission model, not these hooks, is the real boundary.
- `git-arg-guard.mjs` only inspects a command whose segment **starts** with the publish verb; it
  guards the auto-allowed `git commit`/`push`/`gh pr create` shapes, not every possible shape.
- Enforcement of the product/security invariants (docs/architecture/INVARIANTS.md) is the **test
  suite** (detective, after the edit), not a hook — see `docs/architecture/ENFORCEMENT.md`.

## Conventions
- Exit 2 blocks (PreToolUse/Stop); other non-zero is ignored. Fail **open** on the hook's own error.
- Stop hooks honor `stop_hook_active` (loop guard) so they push back at most once per stretch.
- If you change a guard regex, re-run the bypass matrix (quoted paths, `$HOME`/`~`, `&` backgrounding,
  newline, `FOO=1 `/`command ` prefixes, path-qualified binaries) — Node regex supports lookahead,
  so keep `&(?!&)` etc. intact.
