# Lilac — Design Spec

> An ivory component study: calm tiles, one accent that glows, editorial serif headlines. Violet or cobalt.

**Use it for** wellness and habit apps, planners, journaling, personal productivity, calm consumer onboarding, product pages that should feel considered.
**Avoid it for** dense dashboards, enterprise admin, playful or high-energy brands.

## 1. Design intent

- Quiet surfaces, one loud thing: only the accent glows.
- Editorial voice: a refined serif for words that matter (wordmark, display, numerals), a soft sans for everything you operate.
- Selection is gentle — a lilac wash, not a solid fill.
- The page reads like a study sheet: numbered tiles with spaced small-caps labels.

## 2. Reference analysis

Sources: **LILAC / FLOW** (primary) and **SOFT / SYSTEM** (merged — same structure, cobalt accent, extra components).

| Element | Seen in the references (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Header | Spaced serif capitals "LILAC / FLOW", tracked caps subtitle | Cormorant Garamond 500; thin muted-ink slash, as printed (violet stays reserved for interaction) |
| Tiles | 8 rounded ivory tiles, each labelled "01  COLOR PALETTE" etc. | 24px radius, wide faint shadow, 28px padding |
| Palette | Violet `#5B2DFF`, Lilac `#C8B4FF`, Ivory `#FCFAF6`, Ink `#1F1F28` (printed); SOFT adds cobalt, sky, mist, charcoal (no hex) | Canvas `#F3F0EA`, tile `#FAF8F4`; cobalt `#1556E8` as `data-accent="cobalt"` |
| Type | Large serif "Aa", "Simple feels better.", list Display / Headline / Body / Caption; SOFT uses a geometric sans "Aa" | Serif display + Manrope UI; scale 72 / 48 / 34 / 22 / 15 / 12 |
| Buttons | Violet pill "Start →" with purple glow, ivory pill "Later" | Gradient recipe, arrow nudges on hover, soft and ghost variants |
| Search | Ivory pill with search icon and a lilac filter disc | Focus halo; plain inset `.lilac-input` for forms |
| Selection | Violet toggle with white knob, grey off toggle; violet checkbox, raised ivory unchecked box | Unchecked boxes get a 1.5px edge for contrast; knob stretches while pressed |
| Progress | Violet ring "72% Complete" with glow; step list Plan / Design done, Build / Launch todo; SOFT: linear bar 72% | SVG ring with `pathLength=100`; current-step halo |
| Tabs & slider | Segmented ivory pill with lilac active tab and dividers; violet slider 60%; SOFT: underline tabs | Sliding wash and sliding underline |
| Feedback | Toast "Saved successfully" with lilac check disc and close; SOFT: bell notification | Status alerts (success / warning / error) |
| SOFT extras | Profile card (avatar, name, role, bio, menu), bottom navigation (Home / Explore / Favorites / Profile) | Sliding wash in bottom nav and sidebar |
| Not in the references | — | Chips, badges, form rows, sidebar, table, dialog, tooltip, focus-planner example, **dark theme** |

## 3. Foundations

| Role | Token | Value |
| --- | --- | --- |
| Canvas / tile / raised | `--lilac-color-canvas` / `-tile` / `-surface` | `#F3F0EA` / `#FAF8F4` / `#FCFAF6` |
| Accent | `--lilac-color-primary` (light `-primary-light`) | `#5B2DFF` (`#7C55FF`) · cobalt `#1556E8` |
| Lilac / wash / on wash | `-primary-soft` / `-primary-wash` / `-on-wash` | `#C8B4FF` / `#EFE9FF` / `#4320D6` |
| Ink / text / muted / subtle | `-ink` / `-text` / `-text-muted` / `-text-subtle` | `#1F1F28` / `#24232D` / `#6E6C78` / `#A5A2AC` |
| Track | `-track` | `#E2DED7` |

**Typography** — Cormorant Garamond 500 for wordmark (caps, +0.04em), display 72, heading 48, title 34, numerals; Manrope for subtitle 22/600, body 15, small 13, caption 12, eyebrow 11 caps +0.28em.
**Spacing** — 4px base; tiles 28px padding; 24px grid gap; two columns collapse under 820px.
**Shape** — pills (buttons, fields, toggles, tabs); 9px checkboxes; 16px inner cards; 24px tiles; 32px dialogs; circles for swatches, avatars, step markers.
**Depth** — Tile: `inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(60,50,40,.04), 0 14px 34px -14px rgba(60,50,40,.16)`. Raised ivory: `inset 0 1px 0 #fff, 0 1px 2px rgba(60,50,40,.06), 0 8px 18px -8px rgba(60,50,40,.22)`. Accent glow: `0 2px 6px rgba(91,45,255,.25), 0 12px 26px -8px rgba(91,45,255,.55)`.
**Dark theme (added)** — "Lilac at night": ink-violet canvas `#121118`, tiles `#1A1922`, pieces `#23222C`, ivory type `#F4F1EA`. The violet drops to `#6E50F4` so white labels stay ≥ 5:1, and the glow (`rgba(123,92,255,.55)`) does the brightening — on dark ground the glow carries further, which is why this style suits a dark theme. Toggle knobs use `--lilac-color-knob` (near-white in dark). Cobalt has its own dark values (`tokens.dark.accent-cobalt.json`). `<html data-theme="dark|auto">` or `[data-theme-set]` / `[data-theme-toggle]` controls.

**Motion** — Soft and airy. Pieces float back from a press with a gentle overshoot (`easing-release`, 380ms) while the violet glow blooms a little slower than the lift. `shadow-pressed` shares the raised list shape, so a press sinks instead of snapping. Marks pop in on `easing-pop`. Rings and progress bars fill once on first paint, 1.2–1.4s. 380ms glide for indicators, knobs, rings on `cubic-bezier(.32,.72,0,1)`.

## 4. Components

Wordmark, eyebrow, tile, button (primary / default / soft / ghost), search field (+ action disc), input / select / textarea, chip, badge, segmented (sliding wash), underline tabs (sliding bar), toggle, checkbox, radio, slider (+ output), progress bar, ring, steps, toast, alert, card, profile card, avatar, sidebar nav, bottom nav, table, dialog, tooltip, accent switch. Markup: `index.html` (Code button on every tile) and `css/components.css`.

## 5. Accessibility

Muted text `#6E6C78` ≥ 4.5:1 on tiles; white on violet ≥ 4.5:1; unchecked controls keep a visible edge; focus halo on every control; tablists support arrow keys; the ring has an `aria-label` with its value.

## 6. Files, stack, license

`tokens/tokens.json` (+ `tokens.accent-cobalt.json`) → `tokens/tokens.css` · `css/lilac.css` · `js/lilac.js` · `index.html` · `examples/app.html` · `AGENTS.md` · `README.md`.
Stack: HTML + CSS custom properties + optional vanilla JS. Dependencies: none (Cormorant Garamond and Manrope from Google Fonts, SIL OFL). License: MIT.
