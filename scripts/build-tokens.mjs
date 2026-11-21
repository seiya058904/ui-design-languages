#!/usr/bin/env node
// Generates tokens/tokens.css from tokens/tokens.json (zero dependencies).
// Usage:
//   node scripts/build-tokens.mjs          # write tokens/tokens.css
//   node scripts/build-tokens.mjs --check  # exit 1 if tokens.css is out of date
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = join(root, "tokens", "tokens.json");
const cssPath = join(root, "tokens", "tokens.css");

const tokens = JSON.parse(readFileSync(jsonPath, "utf8"));
const lines = [];

function walk(node, path) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (value && typeof value === "object" && "$value" in value) {
      const name = `--clay-${[...path, key].join("-")}`;
      const note = value.$description ? ` /* ${value.$description} */` : "";
      lines.push(`  ${name}: ${value.$value};${note}`);
    } else if (value && typeof value === "object") {
      if (lines.length) lines.push("");
      walk(value, [...path, key]);
    }
  }
}
walk(tokens, []);

const css = `/* Clay UI tokens — GENERATED from tokens/tokens.json. Do not edit by hand.
   Regenerate with: node scripts/build-tokens.mjs */
:root {
${lines.join("\n").replace(/\n{3,}/g, "\n\n")}
}
`;

if (process.argv.includes("--check")) {
  const current = existsSync(cssPath) ? readFileSync(cssPath, "utf8").replace(/\r\n/g, "\n") : "";
  if (current !== css) {
    console.error("tokens/tokens.css is out of date. Run: node scripts/build-tokens.mjs");
    process.exit(1);
  }
  console.log(`tokens.css is up to date (${lines.filter(Boolean).length} tokens).`);
} else {
  writeFileSync(cssPath, css);
  console.log(`Wrote tokens/tokens.css (${lines.filter(Boolean).length} tokens).`);
}
