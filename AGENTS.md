# UI Design Languages

Each top-level language folder is a self-contained design system. See `packs.json` for registered languages, entry files, fonts, and variants.

## Building UI With a Language
- Read `<pack>/DESIGN.md` and `<pack>/AGENTS.md` before building. Link `<pack>/css/<pack>.css` (and `<pack>/js/<pack>.js` when using interactive widgets); compose with `.<pack>-*` classes.
- Page CSS sets layout only; all visual values come from `var(--<pack>-*)`. **Never mix two design languages on one page.**
- Shared anatomy across packs: `button` (`--primary`/`--ghost`/`--danger`, `--sm`/`--lg`), `field`/`input`, `select`, `switch`, `checkbox`, `radio`, `slider`, `chip`, `card`, `panel`, `tabs`, `accordion`, `table`, `modal`, `toast`, `badge`, `progress`, `alert`, `nav`, `bar`, `metric`, `empty`; states use ARIA + `.is-open`/`.is-active`/`.is-selected`/`.is-invalid`.

## Maintaining the Collection
- Work autonomously end-to-end (do not block on human checkpoints); verify via screenshots and `check.mjs`.
- New language: `node scripts/new-pack.mjs <id> "<Name>"` and follow `docs/WORKFLOW.md` (write `DESIGN.md` facts vs inferences before code).
- **Tokens**: edit `<pack>/tokens/tokens*.json` only and run `node scripts/build-tokens.mjs [pack]` — **never hand-edit `tokens/tokens.css`**.
- **Catalog & homepage**: `components.html` uses live `<section data-component>` / `.demo[data-demo]` / `.demo__stage` markup (never screenshots); register in `packs.json` and add the homepage `.show` section manually.
- **`site/` isolation & live parser contract**: never style a pack with `site/` or put pack tokens in `site/` (packs may load `site/*.js` only as optional progressive enhancement). **Keep a `## ...rules` heading in every `<pack>/AGENTS.md`** — `site/source.js` live-parses `/^## [^\n]*rules/i` for the Component Wall AI Prompt tab.
- **Quality & boundaries**: every interactive component needs `:hover`, `:active`, `:focus-visible`, and `:disabled` states. Plain HTML/CSS/JS only (no build step, no runtime deps). Never commit or republish reference images in `UI参考图/`.
- **Before committing**: run `node scripts/check.mjs [pack]` and visually compare `.snapshots/` against the reference.
