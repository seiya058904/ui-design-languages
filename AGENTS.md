# AGENTS.md — UI Design Languages

This repository holds several complete, independent design languages. Each top-level language folder is self-contained: copy one folder into a project and it works on its own.

| Folder | Language | Character |
| --- | --- | --- |
| `clay/` | Clay | Soft extruded clay on a matte grid board, mint accent, light + dark |
| `lilac/` | Lilac | Ivory component-study cards, one violet accent with a soft glow, editorial serif headlines |
| `atelier/` | Atelier | Precise, cool product UI: frosted panels, cobalt accent, bold uppercase section titles |
| `tactile/` | Tactile | Warm sand neumorphism with base / raised / inset / pressed layers and a deep teal accent |
| `sketch/` | Sketch | Hand-drawn ink on cream paper, hatched fills, wireframe honesty |

## Before building UI with a language

1. Read `<language>/AGENTS.md` — the non-negotiable rules and shadow / shape recipes for that language.
2. Link `<language>/css/<language>.css` and, if needed, `<language>/js/<language>.js`.
3. Compose screens only from that language's prefixed classes (`.clay-*`, `.lilac-*`, …). Page CSS is for layout only; every color, radius, shadow, size and duration comes from `var(--<language>-*)` tokens.
4. Never mix two languages on one page.

## Shared anatomy

All languages use the same component anatomy and modifier names, so markup ports between them by swapping the prefix:
`btn` (`--primary`, `--sm`, `--lg`, `--icon`, `--block`), `field` / `input`, `chip`, `badge`, `segmented`, `tabs`, `alert`, `card`, `nav`, `toggle`, `checkbox`, `radio`, `progress`, `avatar`, `table`, `dialog`, `tooltip`.
State hooks are shared too: `aria-selected`, `aria-pressed`, `aria-current="page"`, `aria-invalid`, `:disabled`, plus static helpers `.is-hover`, `.is-active`, `.is-focus`, `.is-selected`, `.is-disabled`.

## Working on this repository

- Each language's `tokens/tokens.json` is its single source of truth (optional `tokens.dark.json` for a dark theme). Run `node scripts/build-tokens.mjs` from the repo root after editing tokens; `node scripts/build-tokens.mjs --check` must pass before committing. Never hand-edit a generated `tokens.css`.
- A language folder contains: `tokens/`, `css/` (entry file + base + components), `js/` (optional behaviour), `index.html` (styleguide), `examples/`, `README.md`, `AGENTS.md`.
- Every interactive component needs working hover, active, focus-visible and disabled states.
- Check pages at 1280px and 390px wide with no horizontal scroll.
- Plain HTML/CSS/JS only: no build step, no runtime dependencies.
