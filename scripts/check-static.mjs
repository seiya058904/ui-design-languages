#!/usr/bin/env node
// Static check — no browser, a few seconds. Fails (exit 1) on:
//   1. a local link that points nowhere: href / src / data-src paths in HTML, url() in CSS and HTML,
//      and real Markdown links / images (and inline <a href> / <img src>) in every .md file
//   2. a render-blocking Google Fonts stylesheet: every fonts.googleapis.com <link> must load without
//      blocking the first paint (media="print" + onload swap, with a <noscript> fallback)
//   3. 100vw in the site chrome (site/*.css): it counts the scrollbar, so it overflows sideways in a browser
//      with classic scrollbars — and the page check runs Chrome with hidden scrollbars, so it can't see that
// Zero dependencies.
//
// Usage: node scripts/check-static.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([".git", ".snapshots", "node_modules", "UI参考图"]);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|css|md)$/.test(name)) files.push(p);
  }
})(root);

const problems = [];
const rel = (p) => relative(root, p).split(sep).join("/");

/* External, in-page, data and templated targets are not files. */
function isLocal(t) {
  return !!t && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|%23)/i.test(t) && !/[<>{}$]/.test(t);
}
function checkTarget(file, target) {
  if (!isLocal(target)) return;
  const path = target.split("#")[0].split("?")[0];
  if (!path) return;
  let abs;
  try { abs = path.startsWith("/") ? join(root, decodeURIComponent(path)) : join(dirname(file), decodeURIComponent(path)); }
  catch { problems.push(`${rel(file)}: malformed link ${target}`); return; }
  if (path.endsWith("/")) abs = join(abs, "index.html");
  if (!existsSync(abs)) problems.push(`${rel(file)}: missing ${target}`);
}
/* url() targets, skipping data URIs entirely (their inner url(%23id) references are not files). */
function urls(text) {
  const stripped = text.replace(/url\(\s*(["'])data:[\s\S]*?\1\s*\)/g, "").replace(/url\(\s*data:[^)]*\)/g, "");
  return [...stripped.matchAll(/url\(\s*["']?([^"')]+?)["']?\s*\)/g)].map((m) => m[1]);
}
function attrs(text, names) {
  return [...text.matchAll(new RegExp(`(?<![\\w-])(?:${names})\\s*=\\s*"([^"]*)"`, "g"))].map((m) => m[1]);
}

for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (file.endsWith(".css") && rel(file).startsWith("site/") && /\b100vw\b/.test(text.replace(/\/\*[\s\S]*?\*\//g, ""))) problems.push(`${rel(file)}: uses 100vw (it includes the scrollbar and overflows sideways; size against a full-width ancestor instead)`);
  if (file.endsWith(".css")) {
    urls(text).forEach((t) => checkTarget(file, t));
  } else if (file.endsWith(".html")) {
    attrs(text, "href|src").forEach((t) => checkTarget(file, t));
    // data-src holds a page path on the homepage frames, but a tab id elsewhere ("html", "css")
    attrs(text, "data-src").filter((t) => /[/.]/.test(t)).forEach((t) => checkTarget(file, t));
    urls(text).forEach((t) => checkTarget(file, t));
    const live = text.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "");
    for (const m of live.matchAll(/<link\b[^>]*>/gi)) {
      const tag = m[0];
      if (!/fonts\.googleapis\.com\/css/.test(tag) || !/rel\s*=\s*"stylesheet"/.test(tag)) continue;
      if (!/media\s*=\s*"print"/.test(tag) || !/onload\s*=/.test(tag)) problems.push(`${rel(file)}: render-blocking Google Fonts stylesheet (use media="print" onload="this.media='all'" plus a <noscript> fallback)`);
    }
  } else {
    // Markdown: drop fenced and inline code (example paths), then check real links and inline HTML.
    const prose = text.replace(/^(```|~~~)[\s\S]*?^\1/gm, "").replace(/`[^`\n]*`/g, "");
    for (const m of prose.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g)) checkTarget(file, m[1]);
    attrs(prose, "href|src").forEach((t) => checkTarget(file, t));
  }
}

if (problems.length) {
  problems.forEach((p) => console.log("✗ " + p));
  console.log(`\n${problems.length} static problem(s) in ${files.length} files.`);
  process.exit(1);
}
console.log(`ok\t${files.length} HTML / CSS / Markdown files: every local link resolves, no render-blocking web fonts.`);
