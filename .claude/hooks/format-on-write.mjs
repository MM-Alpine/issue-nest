#!/usr/bin/env node
// PostToolUse (Write/Edit/MultiEdit) — formats the file just written with Prettier if available.
// Never blocks (exit 0 always). No-op until Phase 2 adds Prettier to an app. Node built-ins only.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
let file = "";
try { file = (JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}").tool_input || {}).file_path || ""; }
catch { process.exit(0); }
if (!file || !existsSync(file)) process.exit(0);
if (/node_modules|\/dist\/|\/build\/|\/coverage\//.test(file)) process.exit(0);
if (!/\.(ts|tsx|js|jsx|json|css|md)$/.test(file)) process.exit(0);

// --no-install: stay a no-op until an app actually has Prettier; never auto-install.
spawnSync("npx", ["--no-install", "prettier", "--write", file, "--log-level", "silent"],
          { stdio: "ignore" });
process.exit(0);
