# Clay — Design Spec

> Soft extruded clay pressed onto a matte grid board. Friendly, physical and calm. Light and dark.

**Use it for** friendly SaaS dashboards, billing and finance tools, onboarding flows, internal tools that should feel approachable.
**Avoid it for** dense data-heavy screens (tables with many columns), editorial or luxury brands, anything that needs a sharp, technical feel.

## 1. Design intent

- Make height carry meaning: **raised** = pressable, **carved** = fillable, **flat** = unavailable.
- One accent that means "yes": mint marks the primary action, the selection and success.
- Everything is soft and warm — warm-tinted shadows, never black; rounded shapes at every level.
- Squishy motion: pieces squash on press and spring back past rest on release; indicators glide.

## 2. Reference analysis

Source: one "Product UI Styleguide" board (mint clay on a matte grid). What the image shows is recorded as fact; anything we had to decide is marked as inferred.

| Element | Seen in the reference (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Board | Off-white board with faint grid lines and ruler ticks on the edges | 64px grid, ruler ticks every 16px, warm `#F1EFEB` board |
| Colors | Primary mint squircle, white Surface, grey Border, glowing mint Focus ring | Hex values (labels on the image are illegible): mint `#A8E6CF`, surface `#F8F7F4`, grey `#D6D3CD`, focus `#7CF2C6` |
| Type | Bold neo-grotesk title; six-step scale Display → Caption | Inter; sizes 56/40/32/24/16/12 (the image's size labels are unreadable) |
| Spacing / radius | Spacing tiles; one 20px-radius tile | 4px base grid; radius sm 8 / md 14 / lg 20 / xl 28 / squircle 34% / pill |
| Elevation | Five stacked slabs, light to dark grey | Five elevation shadow tokens plus a strata component |
| Buttons | Mint pill; hover adds a mint glow; grey disabled pill | Shadow recipes, 44px height, pressed state |
| Inputs | Grey clay ring around a carved field, mint glow, search icon | Glow kept inside the ring; invalid and disabled states |
| Chips | Mint Filter, glowing Selected, grey Disabled | `aria-pressed` drives the selected state |
| Tabs | Grey segmented track with mint active pill; underline rail with mint bar | Sliding indicator (iOS-style glide) |
| Alerts | Full-width pills: mint success, yellow warning, coral error, each with an icon | Info variant, multi-line `--block` variant |
| Card | Title, text, grey "Image" button, grey media tile, two slabs peeking below | Stacked slabs drawn with extra box-shadow layers |
| Not in the reference | — | Dark theme, toggles, checkbox, radio, badges, avatars, progress, nav, table, dialog, tooltip, form rows, two example pages |

## 3. Foundations

**Color** (light / dark)

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| Page / board | `--clay-color-canvas` / `-board` | `#E6E3DE` / `#F1EFEB` | `#161513` / `#1E1D1A` |
| Raised surface | `--clay-color-surface` | `#F8F7F4` | `#2A2925` |
| Carved well | `--clay-color-surface-sunken` | `#EAE7E2` | `#191816` |
| Primary / ink on it | `--clay-color-primary` / `-primary-ink` | `#A8E6CF` / `#1E4A3A` | `#8FDBBE` / `#10342A` |
| Text / muted | `--clay-color-text` / `-text-muted` | `#2C2C2A` / `#67635D` | `#ECE8E1` / `#A8A39A` |
| Status | `-warning`, `-error`, `-info` (+ `-ink`) | `#F5E596`, `#F2A09E`, `#C9DDF2` | slightly deeper, same dark ink |

**Typography** — Inter. Display 56/64 700 −0.03em · Heading 40/48 700 · Title 32/40 600 · Subtitle 24/32 600 · Body 16/24 · Small 14 · Caption 12/16. Section labels 20px medium. Sentence case.

**Spacing & layout** — 4px grid (`--clay-space-1…20`). Content sits on `.clay-board`; two-column sheets collapse to one column under 860px.

**Shape** — Controls are pills; cards 20px; panels and dialogs 28px; swatches, avatars, icon tiles are 34% squircles. Inner radius ≤ outer radius.

**Depth** — Raised: `inset 0 1.5px 0 rgba(255,255,255,.85), inset 0 -2px 3px rgba(84,74,60,.12), 0 1px 1px rgba(84,74,60,.08), 0 4px 10px -2px rgba(84,74,60,.22)`. Carved: `inset 0 2px 4px rgba(84,74,60,.18), inset 0 -1.5px 0 rgba(255,255,255,.75)`. Glow: `0 0 0 2px rgba(124,242,198,.95), 0 0 16px 2px rgba(124,242,198,.55)`. Elevation 1–5 tokens.

**Motion** — Squish. Press 110ms (`easing-press`): buttons sink 1px and scale to 0.97, chips to 0.95. Release and hover 460ms on `easing-release` `cubic-bezier(.34,1.56,.64,1)`, so the clay springs back past rest and settles. Check marks and radio dots pop in on `easing-pop`. 180ms color, 280ms knobs and dialogs, 380ms sliding indicators on `cubic-bezier(.32,.72,0,1)`. Reduced motion respected.

## 4. Components

Board, typography, button (primary / default / neutral / ghost, sm / lg / icon), ringed field and plain input, chip, badge, segmented and underline tabs (sliding), alert (+ block), card (stacked / sunken / interactive), swatch, elevation strata, avatar, progress, toggle, checkbox, radio, nav (sliding), top bar, table, dialog, tooltip, theme switch. Every interactive component has hover, active, focus-visible and disabled states. Exact markup: `index.html` (each specimen has a Code button) and `docs/components.md`.

## 5. Accessibility

Text on board ≥ 4.5:1 (`text-muted` `#67635D`); mint, yellow and coral fills always carry dark ink; focus is a visible glow on every control; tabs use `role="tablist"` with arrow-key support; color is never the only signal (alerts and badges include an icon or text).

## 6. Files, stack, license

`tokens/tokens.json` (+ `tokens.dark.json`) → `tokens/tokens.css` · `css/clay.css` (entry) · `js/clay.js` (optional) · `index.html` · `examples/` · `AGENTS.md` (rules for AI) · `README.md`.
Stack: HTML + CSS custom properties + optional vanilla JS. Dependencies: none (Inter from Google Fonts, SIL OFL). License: MIT.
