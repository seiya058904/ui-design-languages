# AGENTS.md — UI Design Languages

This repository holds several complete, independent design languages. Each top-level language folder is self-contained: copy one folder into a project and it works on its own.

| Folder | Language | Character |
| --- | --- | --- |
| `clay/` | Clay | Soft extruded clay on a matte grid board, mint accent, light + dark |
| `lilac/` | Lilac | Ivory component-study cards, one violet accent with a soft glow, editorial serif headlines, light + dark |
| `atelier/` | Atelier | Precise, cool product UI: frosted panels, cobalt accent, bold uppercase section titles |
| `tactile/` | Tactile | Warm sand neumorphism with base / raised / inset / pressed layers and a deep teal accent, light + dark |
| `sketch/` | Sketch | Hand-drawn ink on cream paper, hatched fills, wireframe honesty |
| `braun/` | Braun / Field | Precision instrument panel: anodized aluminium, POM keycaps with travel, International Orange, a rotary dial and LED meters, light + black |
| `obsidian/` | Obsidian / Glass | Dark first: four frosted glass layers, 1px specular edges, one luminous accent (cyan / emerald / violet), liquid motion |
| `zine/` | Zine / Brutal | Neo-brutalist print: newsprint, 2px black rules, zero-blur hard shadows, acid lime / vermilion / cobalt, light + inverted |
| `terrarium/` | Terrarium / Earth | Warm botanical ceramics: oat linen, glazed cream cards, pebbles, terracotta + moss, soft serif, organic spring motion, light + evening |

## Before building UI with a language

1. Read `<language>/DESIGN.md` (intent, reference facts vs inferences, foundations) and `<language>/AGENTS.md` (non-negotiable rules and recipes).
2. Link `<language>/css/<language>.css` and, if needed, `<language>/js/<language>.js`.
3. Compose screens only from that language's prefixed classes (`.clay-*`, `.lilac-*`, …). Page CSS is for layout only; every color, radius, shadow, size and duration comes from `var(--<language>-*)` tokens.
4. Never mix two languages on one page.

## Shared anatomy

All languages use the same component anatomy and modifier names, so markup ports between them by swapping the prefix:
`btn` (`--primary`, `--sm`, `--lg`, `--icon`, `--block`), `field` / `input`, `chip`, `badge`, `segmented`, `tabs`, `alert`, `card`, `nav`, `toggle`, `checkbox`, `radio`, `progress`, `avatar`, `table`, `dialog`, `tooltip`.
State hooks are shared too: `aria-selected`, `aria-pressed`, `aria-current="page"`, `aria-invalid`, `:disabled`, plus static helpers `.is-hover`, `.is-active`, `.is-focus`, `.is-selected`, `.is-disabled`.

## Working on this repository

- Work autonomously end-to-end: the owner reviews rarely, so don't block on human checkpoints. Self-verify against the reference with screenshots, then commit.
- New language: `node scripts/new-pack.mjs <id> [Name]`, then follow `docs/WORKFLOW.md` — the reference-analysis table (facts vs inferences) in `DESIGN.md` comes before any code.
- A language folder contains: `tokens/`, `css/` (entry file + base + components), `js/` (optional behaviour), `index.html` (styleguide), `components.html` (catalog of real components), `examples/`, `DESIGN.md`, `AGENTS.md`, `README.md`.
- Each language's `tokens/tokens.json` is its single source of truth (optional `tokens.dark.json` for a dark theme, `tokens.<attr>-<value>.json` for variants, `tokens.dark.<attr>-<value>.json` for a variant on the dark theme). Run `node scripts/build-tokens.mjs [pack]` after editing tokens; never hand-edit a generated `tokens.css`.
- `components.html` holds every component as real, working markup: one `<section data-component="<id>">` per component (shared ids: `button`, `input`, `selection`, `segmented`, `tabs`, `chips`, `slider`, `progress`, `alert`, `card`, `avatar`, `navigation`, `table`, `dialog`, `tooltip`), each with `<div class="demo" data-demo="<id>">` demos whose `.demo__stage` holds the markup — never screenshots or cropped specimens.
- `packs.json` is the registry: the site reads every pack from it (its `site` block: dot, label, stage styles, backdrop, script hooks, wall picks — see `siteFields`), so a registered pack shows up on the component wall with no site code changes. A homepage showcase section is the only manual addition.
- `site/` is the website's chrome: styles, `smooth-scroll.js` (inertial wheel scrolling on every showcase page), the component wall (`components.html` + `site/components.*`), `site/wall.js` (renders demos from every catalog live on one page — classes and tokens are prefixed, so packs coexist there), `site/source.js` (each demo's complete source — HTML, the CSS it needs, the pack JS, a runnable single file and an AI prompt — read from the pack's own files, so never hand-maintain copies of component code) and `site/demo.*` (the drawer's preview frame). Never style a pack with it or put pack tokens in it; pack pages may load `site/*.js` only as optional behaviour that degrades to native when missing.
- Every interactive component needs working hover, active, focus-visible and disabled states.
- Before committing: `node scripts/check.mjs [pack]` — tokens in sync, real-browser screenshots at 1280 and 390 with no horizontal overflow (compare them with the reference), and every demo's single-file export rendering identically to the original in light and dark.
- Plain HTML/CSS/JS only: no build step, no runtime dependencies.
