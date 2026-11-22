# AGENTS.md — UI Design Languages

This repository holds several complete, independent design languages. Each top-level language folder is self-contained: copy one folder into a project and it works on its own.

| Folder | Language | Character |
| --- | --- | --- |
| `clay/` | Clay | Soft extruded clay on a matte grid board, mint accent, light + dark |
| `lilac/` | Lilac | Ivory component-study cards, one violet accent with a soft glow, editorial serif headlines, light + dark |
| `atelier/` | Atelier | Precise, cool product UI: frosted panels, cobalt accent, bold uppercase section titles |
| `tactile/` | Tactile | Warm sand neumorphism with base / raised / inset / pressed layers and a deep teal accent, light + dark |
| `sketch/` | Sketch | Hand-drawn ink on cream paper, hatched fills, wireframe honesty |

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

- Each language's `tokens/tokens.json` is its single source of truth (optional `tokens.dark.json` for a dark theme, `tokens.<attr>-<value>.json` for variants, `tokens.dark.<attr>-<value>.json` for a variant on the dark theme). Run `node scripts/build-tokens.mjs` from the repo root after editing tokens; `node scripts/build-tokens.mjs --check` must pass before committing. Never hand-edit a generated `tokens.css`.
- A language folder contains: `tokens/`, `css/` (entry file + base + components), `js/` (optional behaviour), `index.html` (styleguide), `components.html` (catalog of real components), `examples/`, `DESIGN.md`, `AGENTS.md`, `README.md`.
- `components.html` is the source for the components browser: one `<section data-component="<id>">` per component (shared ids: `button`, `input`, `selection`, `segmented`, `tabs`, `chips`, `slider`, `progress`, `alert`, `card`, `avatar`, `navigation`, `table`, `dialog`, `tooltip`), each with `<div class="demo" data-demo="<id>">` demos whose `.demo__stage` holds real, working markup — never screenshots or cropped specimens. Use the shared ids so the same component lines up across languages. Register it in `packs.json` and give it a card on the homepage.
- Follow `docs/WORKFLOW.md`: write the reference-analysis table (facts vs inferences) in `DESIGN.md` before coding.
- `site/` is neutral homepage chrome (styles, the Shadow-DOM code viewer, `smooth-scroll.js` — the inertial wheel scrolling every showcase page loads — and the components browser `components.html` + `site/components.*` + `site/demo.*`, which renders every demo from each pack's catalog page one by one at natural size). Never style a pack with it, never put pack tokens in it. Pack pages may load `site/*.js` only as optional showcase behaviour that degrades to native when missing.
- Every interactive component needs working hover, active, focus-visible and disabled states.
- Run `node scripts/snap.mjs [pack]`: real-browser screenshots at 1280 and 390 into `.snapshots/`; it fails and names the elements if anything overflows horizontally. Compare the screenshots with the reference before calling a pack done.
- Plain HTML/CSS/JS only: no build step, no runtime dependencies.
