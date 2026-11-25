#!/usr/bin/env node
// Every check, one command — run it before each commit.
//   1. tokens  — node scripts/build-tokens.mjs --check   generated tokens.css match tokens/*.json
//   2. static  — node scripts/check-static.mjs           every local link resolves; no render-blocking web fonts
//   3. pages   — node scripts/snap.mjs                   real-browser screenshots at 1280 and 390: no horizontal overflow,
//                                                        no script errors or 404s, every control pressed once
//   4. source  — node scripts/check-source.mjs           every demo's single-file export renders like the original
// Zero dependencies; each step is a plain script you can also run on its own.
//
// Usage:
//   node scripts/check.mjs                 # everything (all languages + the site pages)
//   node scripts/check.mjs clay sketch     # only these languages
//   node scripts/check.mjs --quick         # source check in light only (skips the dark pass)
//   node scripts/check.mjs --skip=pages    # skip a step (tokens | static | pages | source)
// Exit code 1 if any step fails.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const packs = args.filter((a) => !a.startsWith("--"));
const skip = (args.find((a) => a.startsWith("--skip="))?.slice(7) || "").split(",").filter(Boolean);
const quick = args.includes("--quick");

const steps = [
  { id: "tokens", script: "build-tokens.mjs", args: ["--check", ...packs] },
  { id: "static", script: "check-static.mjs", args: [] },
  { id: "pages", script: "snap.mjs", args: packs },
  { id: "source", script: "check-source.mjs", args: [...packs, ...(quick ? ["--light"] : [])] },
].filter((s) => !skip.includes(s.id));

const results = [];
for (const s of steps) {
  console.log(`\n▸ ${s.id}: node scripts/${s.script} ${s.args.join(" ")}`.trimEnd());
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(here, s.script), ...s.args], { stdio: "inherit" });
  results.push({ id: s.id, ok: r.status === 0, secs: Math.round((Date.now() - t0) / 1000) });
}

console.log("\n" + results.map((r) => `${r.ok ? "✓" : "✗"} ${r.id.padEnd(7)} ${String(r.secs).padStart(4)}s`).join("\n"));
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} check(s) failed.` : "\nAll checks passed.");
process.exit(failed.length ? 1 : 0);
