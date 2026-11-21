#!/usr/bin/env node
// Generates <language>/tokens/tokens.css from <language>/tokens/tokens.json (zero dependencies).
// A language is any top-level folder containing tokens/tokens.json; its folder name is the CSS prefix
// (clay/ → --clay-*). An optional tokens/tokens.dark.json holds dark-theme overrides (same shape,
// only the leaves that change) and is emitted for [data-theme="dark"] and [data-theme="auto"] + OS dark.
//
// Usage:
//   node scripts/build-tokens.mjs            # build every language
//   node scripts/build-tokens.mjs clay       # build one language
//   node scripts/build-tokens.mjs --check    # exit 1 if any tokens.css is out of date
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const only = args.filter((a) => !a.startsWith("--"));

const languages = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "tokens", "tokens.json")))
  .map((d) => d.name)
  .filter((name) => !only.length || only.includes(name));

function flatten(prefix, node, path = [], lines = []) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    if (value && typeof value === "object" && "$value" in value) {
      const name = `--${prefix}-${[...path, key].join("-")}`;
      const note = value.$description ? ` /* ${value.$description} */` : "";
      lines.push(`${name}: ${value.$value};${note}`);
    } else if (value && typeof value === "object") {
      if (lines.length && lines[lines.length - 1] !== "") lines.push("");
      flatten(prefix, value, [...path, key], lines);
    }
  }
  return lines;
}

const indent = (lines, pad) => lines.map((l) => (l ? pad + l : "")).join("\n").replace(/\n{3,}/g, "\n\n");

let stale = 0;
for (const lang of languages) {
  const dir = join(root, lang, "tokens");
  const base = flatten(lang, JSON.parse(readFileSync(join(dir, "tokens.json"), "utf8")));
  let css = `/* ${lang} tokens — GENERATED from ${lang}/tokens/tokens.json. Do not edit by hand.
   Regenerate with: node scripts/build-tokens.mjs ${lang} */
:root {
${indent(base, "  ")}
}
`;
  let count = base.filter(Boolean).length;
  const darkPath = join(dir, "tokens.dark.json");
  if (existsSync(darkPath)) {
    const dark = flatten(lang, JSON.parse(readFileSync(darkPath, "utf8")));
    css += `
/* Dark theme — GENERATED from ${lang}/tokens/tokens.dark.json.
   <html data-theme="dark"> forces it; <html data-theme="auto"> follows the OS setting. */
:root[data-theme="dark"] {
  color-scheme: dark;
${indent(dark, "  ")}
}

@media (prefers-color-scheme: dark) {
  :root[data-theme="auto"] {
    color-scheme: dark;
${indent(dark, "    ")}
  }
}
`;
    count += dark.filter(Boolean).length;
  }
  const out = join(dir, "tokens.css");
  if (check) {
    const current = existsSync(out) ? readFileSync(out, "utf8").replace(/\r\n/g, "\n") : "";
    if (current !== css) {
      console.error(`${lang}/tokens/tokens.css is out of date. Run: node scripts/build-tokens.mjs ${lang}`);
      stale++;
    } else console.log(`${lang}: up to date (${count} declarations)`);
  } else {
    writeFileSync(out, css);
    console.log(`${lang}: wrote tokens/tokens.css (${count} declarations)`);
  }
}
if (!languages.length) console.error("No languages found (expected <folder>/tokens/tokens.json).");
if (stale) process.exit(1);
