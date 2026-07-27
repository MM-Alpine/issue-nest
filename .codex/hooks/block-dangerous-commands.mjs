#!/usr/bin/env node
// PreToolUse (Bash) — BLOCKS (exit 2) destructive shell commands. Best-effort speed-bump over the
// permission model in settings.json — NOT a security boundary (bypassable by path-qualified
// binaries, variable indirection, `bash -c`, …; those still prompt under defaultMode:default).
// Input: JSON on stdin (Claude Code does not set CLAUDE_TOOL_INPUT_* env vars). Node built-ins only.

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
let cmd = "";
try { cmd = (JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}").tool_input || {}).command || ""; }
catch { process.exit(0); }
if (!cmd) process.exit(0);

const has = (re) => re.test(cmd);
const block = (msg) => { process.stderr.write("❌ BLOCKED: " + msg + "\n"); process.exit(2); };

// DROP DATABASE/TABLE/SCHEMA on a non-test target
if (has(/drop\s+(database|table|schema)/i) && !has(/test/i))
  block("DROP DATABASE/TABLE/SCHEMA on a non-test target. Run it manually if intended.");

// Force-push touching a protected branch (order-independent; long + short flags)
if (has(/git\s+push/i)
    && has(/--force|--force-with-lease|--force-if-includes|(^|\s)-[a-z]*f/i)
    && has(/(^|[^a-z])(master|main|develop|production|release)([^a-z]|$)/i))
  block("force push touching a protected branch (master/main/…).");

// rm with recursive + force on an absolute/home path (order-independent)
if (has(/(^|\s)rm(\s|$)/i)
    && has(/--recursive|(^|\s)-[a-z]*r/i)
    && has(/--force|(^|\s)-[a-z]*f/i)
    && has(/(^|\s)['"]?(\/|~|\$HOME|\$PWD)/))
  block("rm -rf on an absolute/home path — too dangerous.");

process.exit(0);
