#!/usr/bin/env node
// Stop hook — runs scripts/check.sh when application source changed, and blocks (exit 2) the turn
// from ending on a red gate. Runs the checks itself; never reads the assistant's message.
// Scoped to backend/** and frontend/** code, so doc/config/hook turns are not gated. check.sh is
// greenfield-safe (exits 0 on a bare repo). Fail-open on the hook's own errors. Node built-ins only.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const sh = (args) => {
  const r = spawnSync("git", args, { encoding: "utf8" });
  return r.status === 0 ? (r.stdout || "").trim() : "";
};

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
let payload = {};
try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { payload = {}; }

if (payload.stop_hook_active) process.exit(0);            // loop guard — mandatory
if (payload.permission_mode === "plan") process.exit(0);

const names = new Set();
for (const args of [
  ["diff", "--name-only", "--diff-filter=ACMRT"],
  ["diff", "--cached", "--name-only", "--diff-filter=ACMRT"],
  ["ls-files", "--others", "--exclude-standard"],
]) for (const n of sh(args).split("\n").map((x) => x.trim()).filter(Boolean)) names.add(n);

const gated = [...names].filter(
  (n) => /^(backend|frontend)\//.test(n) && /\.(ts|tsx|js|jsx|mjs|cjs|prisma|css)$/.test(n));
if (gated.length === 0) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || payload.cwd || sh(["rev-parse", "--show-toplevel"]) || ".";
const check = join(root, "scripts", "check.sh");
if (!existsSync(check)) {
  process.stderr.write("stop-gate: scripts/check.sh not found — gate INACTIVE.\n");
  process.exit(0);
}

let r;
try {
  // --lite = typecheck only: fast, Docker-free, and does NOT fail on a TDD "red" test, so ending a
  // turn mid-test-first is fine. Full lint+tests+build run via `check.sh` (manual) and CI.
  r = spawnSync("bash", [check, "--lite"], { cwd: root, encoding: "utf8", timeout: 600000 });
} catch (e) {
  process.stderr.write("stop-gate: could not run check.sh: " + e + "\n");
  process.exit(0); // fail open on our own error
}
if (r.error && r.error.code === "ETIMEDOUT") {
  process.stderr.write("stop-gate: check.sh exceeded 10 minutes; split fast checks from slow ones.\n");
  process.exit(2);
}
const combined = (r.stdout || "") + (r.stderr || "");
if (r.status !== 0) {
  process.stderr.write("Checks FAILED. You are not done.\n\n" + combined.slice(-3000) +
    "\n\nFix these and finish. Do not report success.\n");
  process.exit(2);
}
process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "Stop",
    additionalContext: "scripts/check.sh exit 0. Actual output:\n\n" + combined.slice(-1500) +
      "\n\nReport only what these checks actually prove.",
  },
}));
process.exit(0);
