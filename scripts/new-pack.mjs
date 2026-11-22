#!/usr/bin/env node
// Scaffold a new design language — a working starting point that already passes `node scripts/check.mjs`.
// Creates <id>/ with tokens, CSS (entry + base + components), a styleguide, the component catalog,
// one example page and the three docs, registers it in packs.json (status "draft") and builds its
// tokens. The site picks it up from packs.json: it appears on the component wall straight away.
// Every value is a neutral placeholder: replace it from your reference (start with DESIGN.md).
//
// Usage:
//   node scripts/new-pack.mjs <id> [Name] [--dark]
//     id     lowercase letters/digits; it becomes the folder, the class prefix (.<id>-btn) and the
//            token prefix (--<id>-color-…)
//     --dark also create tokens/tokens.dark.json (a dark theme on <html data-theme="dark|auto">)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dark = args.includes("--dark");
const [id, ...nameParts] = args.filter((a) => !a.startsWith("--"));
const RESERVED = ["site", "scripts", "docs", "assets", "node_modules"];
if (!id || !/^[a-z][a-z0-9]{1,15}$/.test(id) || RESERVED.includes(id)) {
  console.error("Usage: node scripts/new-pack.mjs <id> [Name] [--dark]   (id: 2–16 lowercase letters/digits, starting with a letter)");
  process.exit(1);
}
if (existsSync(join(root, id))) { console.error(`${id}/ already exists — pick another id.`); process.exit(1); }
const Name = nameParts.join(" ") || id.charAt(0).toUpperCase() + id.slice(1);
const p = id;

/* ---------- files ---------- */
const t = (type, value, description) => ({ $type: type, $value: value, ...(description ? { $description: description } : {}) });
const tokens = {
  $description: `${Name} design tokens — the single source of truth. Placeholders: replace every value from the reference, then run \`node scripts/build-tokens.mjs ${p}\`.`,
  color: {
    canvas: t("color", "#F4F4F2", "Page background"),
    surface: t("color", "#FFFFFF", "Cards, fields, raised pieces"),
    text: t("color", "#1F2023", "Primary text"),
    "text-muted": t("color", "#62646B", "Secondary text (≥ 4.5:1 on canvas and surface)"),
    line: t("color", "#DCDDE0", "Borders and dividers"),
    "line-strong": t("color", "#B9BBC1", "Hover borders"),
    primary: t("color", "#3D5AFE", "The one accent: primary actions, selection, focus"),
    "primary-ink": t("color", "#FFFFFF", "Text on primary"),
    danger: t("color", "#D93A3A", "Errors and destructive actions"),
    disabled: t("color", "#ECECEE", "Disabled fills"),
  },
  font: {
    family: { sans: t("fontFamily", "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif", "Swap for the reference's typeface (add it to packs.json fonts)") },
    size: { small: t("dimension", "13px"), body: t("dimension", "15px"), title: t("dimension", "18px"), heading: t("dimension", "32px"), display: t("dimension", "52px") },
    weight: { regular: t("fontWeight", "400"), medium: t("fontWeight", "500"), semibold: t("fontWeight", "600") },
    leading: t("number", "1.5"),
  },
  space: { 1: t("dimension", "4px"), 2: t("dimension", "8px"), 3: t("dimension", "12px"), 4: t("dimension", "16px"), 5: t("dimension", "24px"), 6: t("dimension", "32px"), 7: t("dimension", "48px") },
  radius: { sm: t("dimension", "6px"), md: t("dimension", "10px"), lg: t("dimension", "16px"), pill: t("dimension", "999px") },
  size: { control: t("dimension", "42px", "Buttons and inputs") },
  shadow: {
    raised: t("shadow", "0 1px 2px rgba(20, 22, 28, 0.06), 0 4px 12px -4px rgba(20, 22, 28, 0.1)", "Pressable pieces and cards"),
    focus: t("shadow", `0 0 0 3px color-mix(in srgb, var(--${p}-color-primary) 30%, transparent)`, "Keyboard focus ring"),
  },
  motion: {
    duration: t("duration", "160ms"),
    easing: t("cubicBezier", "cubic-bezier(0.2, 0.8, 0.2, 1)"),
  },
};
const tokensDark = {
  $description: `${Name} dark theme — only the values that change. Emitted for <html data-theme="dark"> and "auto" + OS dark.`,
  color: {
    canvas: t("color", "#141518"), surface: t("color", "#1D1F23"), text: t("color", "#ECEDEF"), "text-muted": t("color", "#A3A6AE"),
    line: t("color", "#2E3137"), "line-strong": t("color", "#454951"), primary: t("color", "#7C8CFF"), "primary-ink": t("color", "#0E1020"), disabled: t("color", "#26282D"),
  },
  shadow: { raised: t("shadow", "0 1px 2px rgba(0, 0, 0, 0.4), 0 6px 16px -6px rgba(0, 0, 0, 0.6)") },
};

const entryCss = `/* ${Name} — single entry point.
   <link rel="stylesheet" href="css/${p}.css">
   Order matters: tokens → base → components. */
@import url("../tokens/tokens.css");
@import url("base.css");
@import url("components.css");
`;
const baseCss = `/* ${Name} — base: reset and page defaults. Every value comes from a --${p}-* token. */
*,
*::before,
*::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body {
  margin: 0;
  font-family: var(--${p}-font-family-sans);
  font-size: var(--${p}-font-size-body);
  line-height: var(--${p}-font-leading);
  color: var(--${p}-color-text);
  background: var(--${p}-color-canvas);
  -webkit-font-smoothing: antialiased;
}
button, input, select, textarea { font: inherit; color: inherit; }
h1, h2, h3, p { margin: 0; }
a { color: inherit; }
:focus { outline: none; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
`;
const componentsCss = `/* ${Name} — components. Start with what the reference shows, then the shared anatomy
   (btn, field/input, chip/badge, segmented, tabs, toggle/checkbox/radio, card, nav, table, dialog, tooltip).
   Every interactive component: :hover/.is-hover, :active/.is-active, :focus-visible, :disabled/.is-disabled. */

/* ---------- Button ---------- */
.${p}-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--${p}-space-2);
  height: var(--${p}-size-control);
  padding: 0 var(--${p}-space-5);
  border: 1px solid var(--${p}-color-line);
  border-radius: var(--${p}-radius-pill);
  background: var(--${p}-color-surface);
  color: var(--${p}-color-text);
  font-weight: var(--${p}-font-weight-medium);
  white-space: nowrap;
  cursor: pointer;
  box-shadow: var(--${p}-shadow-raised);
  transition: transform var(--${p}-motion-duration) var(--${p}-motion-easing), box-shadow var(--${p}-motion-duration) var(--${p}-motion-easing), background-color var(--${p}-motion-duration) var(--${p}-motion-easing), border-color var(--${p}-motion-duration) var(--${p}-motion-easing);
}
.${p}-btn:hover,
.${p}-btn.is-hover { transform: translateY(-1px); border-color: var(--${p}-color-line-strong); }
.${p}-btn:active,
.${p}-btn.is-active { transform: translateY(1px) scale(0.98); box-shadow: none; }
.${p}-btn:focus-visible { box-shadow: var(--${p}-shadow-raised), var(--${p}-shadow-focus); }
.${p}-btn--primary { border-color: transparent; background: var(--${p}-color-primary); color: var(--${p}-color-primary-ink); }
.${p}-btn--primary:hover,
.${p}-btn--primary.is-hover { border-color: transparent; }
.${p}-btn--ghost { border-color: transparent; background: transparent; box-shadow: none; }
.${p}-btn:disabled,
.${p}-btn.is-disabled { border-color: transparent; background: var(--${p}-color-disabled); color: var(--${p}-color-text-muted); box-shadow: none; transform: none; cursor: not-allowed; }

/* ---------- Text field ---------- */
.${p}-field { display: grid; gap: var(--${p}-space-2); min-width: min(100%, 280px); }
.${p}-label { font-size: var(--${p}-font-size-small); font-weight: var(--${p}-font-weight-medium); color: var(--${p}-color-text-muted); }
.${p}-input {
  width: 100%;
  height: var(--${p}-size-control);
  padding: 0 var(--${p}-space-4);
  border: 1px solid var(--${p}-color-line);
  border-radius: var(--${p}-radius-md);
  background: var(--${p}-color-surface);
  transition: border-color var(--${p}-motion-duration) var(--${p}-motion-easing), box-shadow var(--${p}-motion-duration) var(--${p}-motion-easing);
}
.${p}-input::placeholder { color: var(--${p}-color-text-muted); }
.${p}-input:hover,
.${p}-input.is-hover { border-color: var(--${p}-color-line-strong); }
.${p}-input:focus-visible,
.${p}-input.is-focus { border-color: var(--${p}-color-primary); box-shadow: var(--${p}-shadow-focus); }
.${p}-input[aria-invalid="true"] { border-color: var(--${p}-color-danger); }
.${p}-input:disabled { background: var(--${p}-color-disabled); color: var(--${p}-color-text-muted); cursor: not-allowed; }

/* ---------- Card ---------- */
.${p}-card {
  display: grid;
  gap: var(--${p}-space-2);
  width: min(100%, 340px);
  padding: var(--${p}-space-5);
  border: 1px solid var(--${p}-color-line);
  border-radius: var(--${p}-radius-lg);
  background: var(--${p}-color-surface);
  box-shadow: var(--${p}-shadow-raised);
}
.${p}-card__title { font-size: var(--${p}-font-size-title); font-weight: var(--${p}-font-weight-semibold); }
.${p}-card__text { color: var(--${p}-color-text-muted); }
.${p}-card__actions { display: flex; flex-wrap: wrap; gap: var(--${p}-space-2); margin-top: var(--${p}-space-3); }
`;

const icons = (depth) => {
  const pre = "../".repeat(depth) + "site/assets/";
  return `  <link rel="icon" href="${pre}favicon-32.png" sizes="32x32" type="image/png">
  <link rel="icon" href="${pre}favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${pre}apple-touch-icon.png">`;
};
const DEMOS = {
  button: { title: "Button", summary: "Actions people press.", demos: [
    ["variants", "Variants", `<button class="${p}-btn ${p}-btn--primary" type="button">Primary</button>
<button class="${p}-btn" type="button">Secondary</button>
<button class="${p}-btn ${p}-btn--ghost" type="button">Ghost</button>`],
    ["states", "States", `<button class="${p}-btn ${p}-btn--primary is-hover" type="button">Hover</button>
<button class="${p}-btn ${p}-btn--primary is-active" type="button">Pressed</button>
<button class="${p}-btn ${p}-btn--primary" type="button" disabled>Disabled</button>`]] },
  input: { title: "Text field", summary: "Where people type.", demos: [
    ["text-field", "Text field", `<label class="${p}-field">
  <span class="${p}-label">Email</span>
  <input class="${p}-input" type="email" placeholder="you@example.com">
</label>`]] },
  card: { title: "Card", summary: "A group of related content and actions.", demos: [
    ["card", "Card", `<article class="${p}-card">
  <h3 class="${p}-card__title">Weekly report</h3>
  <p class="${p}-card__text">Send the summary to your team every Monday at 9:00.</p>
  <div class="${p}-card__actions"><button class="${p}-btn ${p}-btn--primary" type="button">Schedule</button><button class="${p}-btn ${p}-btn--ghost" type="button">Preview</button></div>
</article>`]] },
};
const indent = (s, n) => s.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");
const catalog = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${Name} components</title>
${icons(1)}
  <meta name="description" content="Every ${Name} component as real, working markup: variants, sizes and states.">
  <link rel="stylesheet" href="css/${p}.css">
  <style>
    /* Page layout only — every component below is the real ${Name} markup, styled by css/${p}.css. */
    body { padding: 24px 16px 72px; }
    .cat-top, .cat { width: min(100%, 1080px); margin-inline: auto; }
    .cat-top { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-bottom: 40px; font-size: 14px; }
    .cat-top a { color: var(--${p}-color-text-muted); text-decoration: none; }
    .cat-top a:first-child { margin-right: auto; }
    .cat-head h1 { font-size: clamp(36px, 6vw, 56px); line-height: 1.04; margin: 0 0 12px; }
    .cat-head p { max-width: 60ch; color: var(--${p}-color-text-muted); }
    .cat-section { padding-top: 56px; }
    .cat-section > h2 { font-size: 28px; margin: 0 0 6px; }
    .cat-section > p { color: var(--${p}-color-text-muted); margin: 0 0 22px; }
    .demo + .demo { margin-top: 22px; }
    .demo > h3 { font-size: 13px; font-weight: 600; color: var(--${p}-color-text-muted); margin: 0 0 10px; }
    .demo__stage { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 18px 22px; min-height: 140px; padding: 40px 28px; border: 1px solid var(--${p}-color-line); border-radius: var(--${p}-radius-lg); }
  </style>
</head>
<body>
<header class="cat-top"><a href="../index.html">UI Design Languages</a><a href="index.html">Styleguide</a><a href="../components.html#${p}">Component wall</a></header>
<div class="cat">
<div class="cat-head">
  <h1>${Name} components</h1>
  <p>Every block below is live markup, styled only by css/${p}.css. Use the shared component ids (button, input, selection, segmented, tabs, chips, slider, progress, alert, card, avatar, navigation, table, dialog, tooltip) so the same component lines up across languages.</p>
</div>
${Object.entries(DEMOS).map(([cid, c]) => `  <section class="cat-section" id="${cid}" data-component="${cid}" aria-labelledby="h-${cid}">
    <h2 id="h-${cid}">${c.title}</h2>
    <p>${c.summary}</p>
${c.demos.map(([did, label, html]) => `    <div class="demo" data-demo="${did}">
      <h3>${label}</h3>
      <div class="demo__stage">
${indent(html, 8)}
      </div>
    </div>`).join("\n")}
  </section>`).join("\n")}
</div>
<script src="../site/smooth-scroll.js" defer></script>
</body>
</html>
`;
const styleguide = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${Name} — styleguide</title>
${icons(1)}
  <link rel="stylesheet" href="css/${p}.css">
  <style>
    /* Page layout only. Rebuild the reference's own styleguide layout here first — it is the representative page. */
    .sg { width: min(100% - 32px, 1080px); margin: 0 auto; padding: 48px 0 80px; display: grid; gap: 40px; }
    .sg h1 { font-size: var(--${p}-font-size-display); line-height: 1.02; letter-spacing: -0.03em; }
    .sg h2 { font-size: var(--${p}-font-size-small); font-weight: var(--${p}-font-weight-semibold); color: var(--${p}-color-text-muted); margin-bottom: 14px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
    .swatch { width: 72px; height: 72px; border-radius: var(--${p}-radius-md); border: 1px solid var(--${p}-color-line); }
  </style>
</head>
<body>
<main class="sg">
  <header><h1>${Name}</h1><p class="${p}-card__text">One sentence on the material, color and type of this language.</p></header>
  <section><h2>Color</h2><div class="row">
    <span class="swatch" style="background:var(--${p}-color-canvas)"></span><span class="swatch" style="background:var(--${p}-color-surface)"></span><span class="swatch" style="background:var(--${p}-color-text)"></span><span class="swatch" style="background:var(--${p}-color-primary)"></span><span class="swatch" style="background:var(--${p}-color-danger)"></span>
  </div></section>
  <section><h2>Buttons</h2><div class="row">
${indent(DEMOS.button.demos[0][2], 4)}
    <button class="${p}-btn" type="button" disabled>Disabled</button>
  </div></section>
  <section><h2>Inputs</h2><div class="row">
${indent(DEMOS.input.demos[0][2], 4)}
  </div></section>
  <section><h2>Card</h2><div class="row">
${indent(DEMOS.card.demos[0][2], 4)}
  </div></section>
  <p><a href="components.html">All components</a> · <a href="examples/page.html">Example page</a></p>
</main>
<script src="../site/smooth-scroll.js" defer></script>
</body>
</html>
`;
const example = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${Name} — example: sign in</title>
${icons(2)}
  <link rel="stylesheet" href="../css/${p}.css">
  <style>
    /* Layout only: a real page built from the delivered CSS, unchanged. Replace with a page in the reference's spirit. */
    body { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .stack { display: grid; gap: 16px; }
  </style>
</head>
<body>
<main class="${p}-card" aria-labelledby="t">
  <h1 id="t" class="${p}-card__title">Sign in</h1>
  <p class="${p}-card__text">Welcome back. Use your work email.</p>
  <form class="stack" onsubmit="return false">
    <label class="${p}-field"><span class="${p}-label">Email</span><input class="${p}-input" type="email" placeholder="you@example.com" autocomplete="email"></label>
    <label class="${p}-field"><span class="${p}-label">Password</span><input class="${p}-input" type="password" autocomplete="current-password"></label>
    <div class="${p}-card__actions"><button class="${p}-btn ${p}-btn--primary" type="submit">Sign in</button><button class="${p}-btn ${p}-btn--ghost" type="button">Forgot password</button></div>
  </form>
</main>
<script src="../../site/smooth-scroll.js" defer></script>
</body>
</html>
`;
const designMd = `# ${Name} — DESIGN.md

The spec for ${Name}. Write the reference analysis first, then build from it.

## Reference analysis

Primary reference: \`UI参考图/<file>\` (kept local, never committed). Facts are only what the image shows; everything else is a labelled inference.

| Element | Seen in the reference (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Canvas & surfaces | | |
| Palette | | |
| Type | | |
| Shape (radii) | | |
| Depth (shadows, borders) | | |
| Buttons | | |
| Inputs | | |
| Navigation | | |
| Feedback (alerts, progress) | | |
| Motion | | |

## Foundations

- **Color** — the roles in \`tokens/tokens.json\` (canvas, surface, text, line, primary, danger, disabled) and why.
- **Type** — family, scale and weights.
- **Shape and depth** — radii and shadows, and what each level means.
- **Motion** — durations, easing, what moves and what never does.

## Components

What exists, which variants and states, and anything unusual about them.
`;
const agentsMd = `# AGENTS.md — rebuilding the ${Name} look

For AI agents (and humans) building a screen in ${Name}. Read it fully, plus DESIGN.md, before writing UI code.

## 1. Use the system

1. Link \`css/${p}.css\` (it imports \`tokens/tokens.css\`, \`css/base.css\` and the components).
2. Build with the \`.${p}-*\` classes shown in \`components.html\`. Page CSS is for layout only: every color, radius, shadow, size and duration comes from a \`var(--${p}-*)\` token.
3. Outside the web, read the values from \`tokens/tokens.json\`.

## 2. Non-negotiable rules

| Rule | Do | Don't |
| --- | --- | --- |
| Color | | |
| Shape | | |
| Depth | | |
| Type | | |
| Focus | A visible ring on every interactive element (\`--${p}-shadow-focus\`) | Removing focus styles |
| Motion | | |

## 3. Recipes

Exact values for the signature pieces (shadows, gradients, borders) so they can be ported.

## 4. Copy

Voice and casing for UI text.

## 5. Working on ${Name}

- Tokens: edit \`tokens/tokens.json\`, run \`node scripts/build-tokens.mjs ${p}\`; never hand-edit \`tokens.css\`.
- Check: \`node scripts/check.mjs ${p}\` before every commit.
`;
const readme = `# ${Name}

One sentence on what ${Name} looks like and what it is good for.

## Quick start

\`\`\`html
<link rel="stylesheet" href="css/${p}.css">
<button class="${p}-btn ${p}-btn--primary">Primary action</button>
\`\`\`

## What's inside

- \`tokens/\` — \`tokens.json\` (source of truth) and the generated \`tokens.css\`
- \`css/\` — \`${p}.css\` entry, \`base.css\`, \`components.css\`
- \`index.html\` — styleguide · \`components.html\` — every component, live · \`examples/\` — a real page
- \`DESIGN.md\` — the spec · \`AGENTS.md\` — rules for AI assistants

## License

MIT
`;

/* ---------- write ---------- */
const files = {
  [`${p}/tokens/tokens.json`]: JSON.stringify(tokens, null, 2) + "\n",
  ...(dark ? { [`${p}/tokens/tokens.dark.json`]: JSON.stringify(tokensDark, null, 2) + "\n" } : {}),
  [`${p}/css/${p}.css`]: entryCss,
  [`${p}/css/base.css`]: baseCss,
  [`${p}/css/components.css`]: componentsCss,
  [`${p}/index.html`]: styleguide,
  [`${p}/components.html`]: catalog,
  [`${p}/examples/page.html`]: example,
  [`${p}/DESIGN.md`]: designMd,
  [`${p}/AGENTS.md`]: agentsMd,
  [`${p}/README.md`]: readme,
};
for (const [rel, body] of Object.entries(files)) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), body);
}

/* Register in packs.json — the site reads everything about a pack from here. */
const regPath = join(root, "packs.json");
const reg = JSON.parse(readFileSync(regPath, "utf8"));
reg.packs.push({
  id: p, name: Name, status: "draft",
  summary: `${Name}: one sentence on its material, color and type (shown on the site and in AI prompts).`,
  prefix: p,
  entry: { css: `${p}/css/${p}.css` },
  tokens: [`${p}/tokens/tokens.json`, ...(dark ? [`${p}/tokens/tokens.dark.json`] : [])],
  variants: dark ? { theme: ["light", "dark", "auto"] } : {},
  fonts: [],
  pages: { styleguide: `${p}/index.html`, examples: [`${p}/examples/page.html`], components: `${p}/components.html` },
  docs: { design: `${p}/DESIGN.md`, agents: `${p}/AGENTS.md`, readme: `${p}/README.md` },
  site: {
    dot: tokens.color.primary.$value,
    label: "font-weight:600;letter-spacing:-0.01em",
    root: `font-family:var(--${p}-font-family-sans);color:var(--${p}-color-text);font-size:var(--${p}-font-size-body);line-height:1.5`,
    canvas: `background:var(--${p}-color-canvas)`,
    page: `background:var(--${p}-color-canvas)`,
    hooks: "",
    wall: [["button", "variants"], ["input", "text-field"], ["card", "card"]],
  },
});
writeFileSync(regPath, JSON.stringify(reg, null, 2) + "\n");

const build = spawnSync(process.execPath, [join(root, "scripts", "build-tokens.mjs"), p], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);

console.log(`
Created ${p}/ (${Object.keys(files).length} files) and registered "${Name}" in packs.json as a draft.

Next:
  1. Put the reference in UI参考图/ and fill the analysis table in ${p}/DESIGN.md (facts vs inferences).
  2. Replace the values in ${p}/tokens/tokens.json → node scripts/build-tokens.mjs ${p}
  3. Rebuild ${p}/index.html in the reference's layout; add components to css/components.css and
     ${p}/components.html (shared ids). Behaviour, if any: ${p}/js/${p}.js + entry.js and site.hooks in packs.json.
  4. Fill summary, fonts and site (dot, label, wall picks) in packs.json; status → "stable" when done.
  5. node scripts/check.mjs ${p}
It is already on the component wall (components.html). Homepage showcase: add a .show section to index.html.`);
