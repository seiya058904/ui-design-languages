# Workflow — from a reference image to a finished design language

Five steps, three commands. It works for any visual style; the nine languages in this repo were all made this way.

```bash
node scripts/new-pack.mjs <id> [Name] [--dark]   # 1. scaffold: a working language that already passes the checks
node scripts/build-tokens.mjs <id>               #    after every tokens/*.json edit
node scripts/check.mjs <id>                      # 5. every check, before every commit
```

## 1. Scaffold

Put the reference images in `UI参考图/` (git-ignored: inspiration, never assets — don't commit or republish them). Group images that share one visual language and pick the most complete as primary.

Run `node scripts/new-pack.mjs <id> [Name]`. The id becomes the folder, the class prefix (`.<id>-btn`) and the token prefix (`--<id>-color-…`). You get tokens, CSS, a styleguide, the component catalog, an example page and the three docs, registered in `packs.json` as a draft — and it is already live on the component wall.

## 2. Spec before code

Fill the reference-analysis table in `<id>/DESIGN.md`: one row per element, **facts** (only what the image shows, including printed hex values and labels) next to **decisions** (everything inferred or added, labelled as such). Re-read the image against the table and fix any "fact" it doesn't show. Then fill the rules table in `<id>/AGENTS.md`. No human checkpoint is needed: fidelity is enforced by screenshots in step 5.

## 3. Tokens

Replace every placeholder in `<id>/tokens/tokens.json` — color roles, type, space, radius, size, shadow, motion — and run `node scripts/build-tokens.mjs <id>`. Optional files: `tokens.dark.json` (dark theme), `tokens.<attr>-<value>.json` (a variant on `<html data-<attr>>`), `tokens.dark.<attr>-<value>.json`. Never hand-edit `tokens.css`.

## 4. Components and pages

Build in this order; every value comes from a `var(--<id>-*)` token, page CSS is layout only.

1. `index.html` — rebuild the reference's own layout first: it is the representative page.
2. `css/components.css` — what the reference shows, then the shared anatomy (btn, field/input, chip/badge, segmented, tabs, toggle/checkbox/radio, card, nav, table, dialog, tooltip). Every interactive piece gets hover, active, focus-visible and disabled.
3. `components.html` — every component as real, working markup: `<section data-component="<shared id>">` with `<div class="demo" data-demo="…">` demos (variants, sizes, states). This file feeds the component wall, its source panel and the AI prompts; never use screenshots or crops.
4. `js/<id>.js` only if components need behaviour (sliding indicators, tabs, sliders). Then add `entry.js` and `site.hooks` (the selectors whose markup needs it) in `packs.json`.
5. One real page in `examples/` built from the delivered CSS and JS, unchanged.

Finish the `packs.json` entry: `summary` (used on the site and in AI prompts), `fonts`, `variants`, and `site` — `dot`, `label`, `wall` picks, `backdrop` if the canvas needs more than its color (`siteFields` in the file explains each). Set `status` to `"stable"` when done.

## 5. Check and ship

`node scripts/check.mjs <id>` runs, in order:

- **tokens** — generated `tokens.css` matches the JSON.
- **static** — every local link resolves (HTML, CSS and Markdown), and every page loads its web fonts without blocking rendering: `<link rel="stylesheet" href="…" media="print" onload="this.media='all'">` plus `<noscript><link rel="stylesheet" href="…"></noscript>`, so a slow or blocked font host never leaves the page blank.
- **pages** — real-browser screenshots at 1280 and 390 into `.snapshots/`; fails and names the elements on horizontal overflow, and fails on any script error, `console.error` or failed / 404 request from the site. After the desktop capture it presses every control once (forms never submit, links never leave) and fails on script errors. The three site pages are also checked in both site themes: header height vs `--top-h`, pressed/current controls legible under hover, nothing tabbable inside a closed drawer, and no chrome clipped at the viewport edge. Put the screenshots next to the reference and compare layout, type, color, spacing, shadows and states; fix and re-run.
- **source** — every demo's single-file export renders exactly like the original, light and dark (proves the component wall hands over complete code).

`--quick` skips the dark pass, `--skip=pages` skips a step; with no id it checks everything. For motion, sample positions over real time through the DevTools protocol (headless screenshots freeze transitions). When it passes: commit and push.

Optional, for the homepage (`index.html`): a book on the shelf (`.shelf > li` with a `.book--<id>` binding in `site/site.css`, colours taken from the pack's tokens), an entry in the language viewer (`[data-pick]` plus its `.show` panel), and a "Same markup" card from `site/compare/<id>.html`. The homepage links no pack CSS up front. The viewer shows stills: run `node scripts/snap.mjs --thumbs=lg` (posters). The tray (`#live`) and the Same-markup cards (`#same`) start as stills too, `--thumbs=home` (light and dark, photographed from the live render on `site/capture.html` in the same box as their live stage), and turn live once either section comes near the viewport or the page is idle after load: only then does `site/wall.js` link each pack's CSS and JS. Re-run `--thumbs=home` whenever a tile's pick, a pack's `site.canvas` or the tile box changes.

## Isolation rules

- A language never reads another language's tokens or classes, and one page never mixes two languages (the site's own pages are the only exception: every class and token is prefixed).
- `site/` is the library website's chrome. It never styles a pack and never holds pack tokens; packs may load `site/*.js` only as optional showcase behaviour that degrades to native when missing.
- The site reads everything about a pack from `packs.json`; the source panel (`site/source.js`) derives a demo's CSS from the pack's files — the rules whose pack classes all appear in its markup, the base layer and the tokens they reach — so keep component rules keyed on the pack's classes.
