# Sketch — Design Spec

> Hand-drawn ink on cream paper: slightly uneven outlines, offset "drawn" shadows, diagonal hatching for emphasis and a few watercolor tints. A design language that looks like a careful wireframe — and works like a real UI.

**Use it for** early-stage products and prototypes that should feel unfinished on purpose, design-tool and whiteboard apps, internal tools, documentation, workshops, education, playful settings pages.
**Avoid it for** finance, health or legal products where a hand-drawn look undermines trust; dense data dashboards; brands that need polish.

## 1. Design intent

- Honest wireframe: structure is drawn, not decorated. Ink lines carry the hierarchy.
- Emphasis by **hatching**, not by color: primary, pressed, selected and "on" states are hatched.
- Color is a light watercolor wash for meaning only (brand blue, success, warning, danger, info).
- Depth is drawn: a second outline offset down-right instead of a blurred shadow.
- Still a real UI: readable text, visible focus, proper states and ARIA.

## 2. Reference analysis

Sources: **Product UI Style Guide — Master · Flagship Edition** (primary, the most complete), **Settings / Appearance** sketch (settings page, theme switch, accent picker, toggles, saved toast) and **NEO-SKEUO UI KIT** sketch (dimension annotations, dashed frame, layered surfaces, folder tabs).

| Element | Seen in the references (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Paper | Cream paper, ink line drawing; NEO-SKEUO adds a dashed frame with checker squares and dimension marks (4, 8, 16, 32) | Paper `#F6F1E6`, ink `#2B2A27`; faint grain from an inline SVG noise; `.sketch-frame` and `.sketch-dim` |
| Lines | Uneven rounded outlines; double / offset outlines on raised surfaces | Asymmetric `border-radius` for the hand-drawn wobble; offset outline via a two-layer `box-shadow` |
| Hatching | Diagonal hatching on primary / pressed buttons, active tags, "on" switches, pressed surfaces, progress fill | `repeating-linear-gradient(-45deg …)` token `--sketch-hatch` |
| Type | Hand-printed capitals for the title and section titles ("01 OVERVIEW", "02 DESIGN TOKENS"), neat hand-printed small text; monospace token code block | Itim for display and section titles (upright and narrow like the printed headings; Kalam was too slanted), Patrick Hand for UI text, system monospace for code |
| Color | Six ramps (Brand blue, Neutral, Success green, Warning yellow, Danger red, Info purple) as pastel watercolor dots, steps 50–900 | Base tints: blue `#A9C7EC`, green `#B4DBAF`, yellow `#F2DC8A`, red `#F0AEAB`, purple `#CBB7EA`; ramps built with `color-mix()` |
| Type scale | H1 32/40 SemiBold, H2 24/32, H3 20/28, H4 16/24, Body L 14/22, Body M 12/20, Caption 12/16, Overline 10/14 uppercase | Used as printed (adapted to the hand fonts' metrics) |
| Spacing / radius / elevation | 8pt grid (4…64); radius 0 / 4 / 8 / 12 / 16 / 20 / 24; elevation levels 1–3 with 6%, 10%, 14% shadows | Elevation drawn as 2, 4, 6px offset outlines |
| Buttons | Primary (hatched), Secondary, Tertiary, Ghost (dashed), Destructive (pink), Loading (spinner), Icon only; sizes Large / Medium / Small; states Default, Hover, Pressed, Focused (double outline), Disabled (dashed, faded) | Primary = brand wash + hatching; focus = dashed outline offset 3px |
| Form controls | Text field with search icon, text area, select, multi-select tags, date picker, checkbox, radio, switch, slider with value bubble (75), range slider, stepper | Range slider simplified to one thumb in the core set |
| Tags, chips | Tags (one hatched), badges New / Updated / Beta / Hot in tints, chips "Filter", "+ Add" | — |
| Navigation | Boxed tabs, pills (All selected), breadcrumbs, pagination; Settings sidebar with corner-bracket active item and count badges; NEO-SKEUO folder tabs | Sliding indicator for tabs, pills and sidebar |
| Feedback | Alerts Success / Warning / Error / Info with icon and close; toasts; modal "Confirm Deletion?"; popover and tooltip; "[Saved to this device]" toast with double border | — |
| Data display | Card with image placeholder, list with chevrons, table with checkboxes and status badges, empty state "No data found / Create New" | Image placeholder drawn as a crossed box |
| Progress & status | Progress bar 60%, stepper Configure → Review → Confirm → Done, circular progress 75%, skeleton, spinner, status dots Online / Busy / Offline / Error | Skeleton as dashed bars |
| Side columns | Design principles, patterns, interaction, accessibility checklist, platforms, theming (Light / Dark / System pills, color dots, token override code), 12-column grid | Rendered as content on the styleguide |
| Settings sketch | Theme segmented System / ✓ Light / Dark with sparkle marks, accent circles (one selected with an "Ocean" label), density and corner-radius sliders, typeface select, toggles with helper text, board preview | Becomes `examples/settings.html` |
| Not in the references | — | Exact colors, fonts, motion timing, sticky notes, doodle pad, flow card, accordion, dark paper (not offered: the style is paper-only by intent) |

## 3. Foundations

| Role | Token | Value |
| --- | --- | --- |
| Paper / panel / well | `--sketch-color-paper` / `-panel` / `-well` | `#F6F1E6` / `#FBF8F1` / `#EFE8DA` |
| Ink / soft ink / faint | `--sketch-color-ink` / `-ink-soft` / `-ink-faint` | `#2B2A27` / `#5E5A52` / `#A39D90` |
| Brand / success / warning / danger / info | `--sketch-color-brand` … `-info` | `#A9C7EC` / `#B4DBAF` / `#F2DC8A` / `#F0AEAB` / `#CBB7EA` |
| Hatch | `--sketch-hatch` | ink 32%, 1.2px lines every 6px at −45° |

**Typography** — Itim (single weight): display 44, h1 32/40, h2 24/32, h3 20/28. Patrick Hand: body 16/22, small 14/20, caption 13/16, overline 12 caps.
**Spacing** — 8pt grid (`--sketch-space-1…8` = 4…64).
**Shape** — wobbly radii `--sketch-radius-sm/md/lg` (asymmetric), pills for chips and toggles.
**Depth** — offset outline `--sketch-shadow-1/2/3` (2 / 4 / 6px); pressed = no offset + hatching.
**Lines** — `--sketch-line` 1.6px, `--sketch-line-bold` 2.2px; dashed for ghost, disabled and skeleton.
**Motion** — A doodle that moves, never one that shakes. Hover nudges −1px/−1px so the drawn shadow grows; once it has lifted, a button *line-boils* — only its second pencil line is redrawn, three frames held ~160ms each (`duration-boil`, `steps(1)`), so the label never jitters (chips, which have no drawn shadow, wobble a quarter of a degree). Press pushes the piece into its shadow in 60ms and leaves a faint pencil-pressure dent (`--sketch-color-imprint`); release snaps back with a cartoon overshoot (`easing-release`). Ticks are *drawn* — wiped in left to right like one pen stroke (`duration-draw` / `easing-draw`), overshooting their box — and erased fast. Dragging a slider re-scribbles its hatched fill in three frames. Link underlines and flow arrows draw themselves in; accordions open smoothly on the spring curve. Watercolor washes carry a wetter middle (`--sketch-hatch-bloom`) and pigment pooled along the edge. Indicators glide 360ms on `cubic-bezier(.32,.72,0,1)`. Page load: `.sketch-enter` draws children in over four frames (`steps(4)`, 90ms stagger), once.

## 4. Components

Paper, frame, dimension note, section box, button (primary / secondary / tertiary / ghost / destructive / icon, sizes, loading, states), input (+ icon), textarea, select, tag input, checkbox, radio, toggle, slider with bubble, stepper, tag, badge, chip, tabs, pills, breadcrumb, pagination, sidebar nav, alert, toast, dialog, tooltip, card (+ image placeholder), list, table, empty state, progress bar, steps, ring, skeleton, spinner, status dot, swatch ramp, code block. Markup: `index.html` (Code button under every section) and `css/components.css`.

## 5. Accessibility

Ink on paper is ~13:1; soft ink ≥ 4.5:1. Primary labels get a paper halo (`text-shadow`) so hatching never fights the text. Focus is a dashed outline that is never removed. Status uses words and icons, not tint alone. Hand fonts are used at ≥ 13px.

## 6. Files, stack, license

`tokens/tokens.json` → `tokens/tokens.css` · `css/sketch.css` · `js/sketch.js` · `index.html` · `examples/settings.html` · `AGENTS.md` · `README.md`.
Stack: HTML + CSS custom properties (`color-mix()`) + optional vanilla JS. Dependencies: none (Itim and Patrick Hand from Google Fonts, SIL OFL). License: MIT.
