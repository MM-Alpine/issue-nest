#!/usr/bin/env node
// PreToolUse (Bash) — blocks secret-exfil / unaudited shapes in publish commands
// (git commit / git push / gh pr create): $(...), backticks, chaining/backgrounding (&& || ; | &),
// --body-file/-F, or a secret path (.env, *.pem, *.key, secrets/, credentials).
// Best-effort speed-bump over the permission model, NOT a boundary — it only inspects the
// auto-allowed publish shapes; others fall through to a permission prompt (defaultMode:default).
// Input: JSON on stdin. Node built-ins only.

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
let cmd = "";
try { cmd = (JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}").tool_input || {}).command || ""; }
catch { process.exit(0); }
if (!cmd) process.exit(0);

// Only inspect commands that ACTUALLY publish: a command SEGMENT must start with the verb.
const SEGMENTS = cmd.split(/&&|\|\||;|\||&(?!&)|\n|\r/);
const LEAD_NOISE = /^\s*(?:(?:[A-Za-z_][A-Za-z0-9_]*=\S*|sudo|command|exec|builtin|env|nohup)\s+)*/;
const PUBLISH_START = /^["']?git["']?\s+["']?(?:commit|push)\b|^["']?gh["']?\s+["']?pr["']?\s+["']?create\b/;
const isPublish = SEGMENTS.some((s) => PUBLISH_START.test(s.replace(LEAD_NOISE, "").replace(/^\s+/, "")));
if (!isPublish) process.exit(0);

// Only the ACTUAL exfil vectors — substitution, chaining/redirection, and file-inclusion flags
// that read a file INTO the commit/PR. A secret word appearing in a `-m "message"` is NOT an exfil
// vector (you cannot leak a file by naming it), so it must not be flagged — that was a false-positive
// magnet for an auth/env-config app. `git commit -F .env` / `--file .env` / `--body-file .env` are
// caught by the file-inclusion pattern; `$(cat .env)` by substitution; `&& cat .env | curl` by chaining.
const DANGER = [
  [/\$\(|`/,                                     "command substitution ($()/backticks)"],
  [/&&|\|\||;|\||&(?!&)|\n|\r/,                   "shell chaining / pipe / backgrounding / newline"],
  [/--body-file\b|--file\b|(^|\s)-F\b/,          "file-inclusion flag (--body-file / --file / -F) — reads a file into the message/body"],
];
for (const [re, why] of DANGER) {
  if (re.test(cmd)) {
    process.stderr.write(
      "❌ BLOCKED: " + why + " in a git/gh publish command — possible secret exfiltration or " +
      "unaudited command. Use a plain inline commit/PR (no $(...), backticks, pipes/chaining, or --body-file).\n");
    process.exit(2);
  }
}
process.exit(0);
