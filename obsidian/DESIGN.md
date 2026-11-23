# Obsidian / Glass — Design Spec

> Dark first. Four layers of frosted glass over a deep obsidian air, edged with one pixel of specular light, lit by a single luminous accent — glacier cyan, emerald or electric violet. Motion is liquid.

**Use it for** AI and developer tools, analytics and monitoring dashboards, creative and media apps, command-heavy products used for hours, night-shift and focus modes.
**Avoid it for** print-like reading, bright outdoor screens, products whose brand is light and warm, interfaces that must run on very low-end GPUs (backdrop blur is not free).

## 1. Design intent

- **Depth is glass, not shadow.** Base, frosted, elevated and inset are four materials; each layer up is lighter, blurrier and carries a brighter top edge.
- **Light is information.** The accent appears only where something is on, chosen, focused or primary — and it glows a little. Everything else is ink on glass.
- **Edges catch the light.** A 1px specular top edge on every layer; panels and cards light their rim where the pointer is.
- **Liquid motion.** 320 ms on a long, soft deceleration. Sliding indicators lead with one edge and let the other catch up, like a drop stretching and gathering.

## 2. Reference analysis

Primary reference: `UI参考图/obsidian-glass.jpg` (kept local, never committed). Facts are only what the image shows; everything else is a labelled decision.

| Element | Seen in the reference (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Header | Glass logo of two overlapping squares, a vertical rule, "OBSIDIAN / GLASS" in heavy caps, "Luminous dark frosted interface system", outlined pill "DARK EDITION 1.0" | Inter 800 caps; logo drawn in CSS (`.obsidian-logo`) |
| Canvas | Near-black navy with a faint cyan haze in the top corners | `#0B0D12` + `--obsidian-atmosphere-page` (two cold top glows, a faint green floor glow) |
| Panels | 2×2 frosted panels "01. FOUNDATIONS … 04. DATA & FEEDBACK", cyan numbers, one-line descriptions, ~20px radius | `.obsidian-panel`, `.obsidian-title` with the number in the accent |
| Glass layers | Base "#151922 • Solid glass", Frosted "+ Blur 12px • 60%", Elevated "+ Blur 16px • 80%", Inset "Inner depth • 40%" | Four tokens + `.obsidian-glass--*`; each layer gets a brighter edge than the one below |
| Palette | Obsidian "#0B0012", Surface #151922, Ink #F1F5F9, Primary #38BDF8, Success #10B981, Danger #F43F5E | **#0B0012 is a typo → #0B0D12**; warning amber #F59E0B added for "Pending" |
| Borders | "1px • High (Primary)" glowing cyan, "1px • Medium", "1px • Low" | `border-high` is mixed from the accent, so it follows the accent variant |
| Radius | 8, 12, 16, 20, 24 px | `sm md lg xl 2xl` + `pill` |
| Controls | Primary (lit cyan), Secondary (glass), Tertiary (outline); search "Search or type a command..." with a glowing focus edge; ON/OFF switches; Selected / Unchecked checkboxes; slider at 74% | Primary bloom ~15–20% softer than the image; ⌘K hint and shortcut added |
| Navigation | Workspace switcher + sidebar (Overview, Projects active, Tasks, AI Copilot, Team, Settings); pill tabs All / Active / Archived / Shared; breadcrumb ⌂ › Projects › Marketing › Campaign v2; compact pagination ‹ 1 2 3 … 12 › | The active nav item and tab are a single indicator that flows (liquid), not per-item fills |
| Data & feedback | "AI Workspace" project card, 12,540 ▲ +12.6%, "Total sessions (30d)", sparkline; "78% Complete" ring; green "Workspace saved" toast; Live / Pending / Error badges; "Archive workspace?" dialog with Cancel / Archive | Rings and lines draw themselves in; the ring's number counts up in pure CSS |
| Preview | "AI Workspace Dashboard": sidebar, Overview header, search, bell, MA avatar, KPIs (24, 1,286, 8, 4,930), Activity chart (0–12K, Jan 1–29, "Last 30 days"), Recent Activity | Rebuilt as `examples/dashboard.html` and embedded live at the foot of the styleguide |
| Not in the reference | — | Emerald and violet accents, hover / pressed / disabled states, segmented control, menu, tooltip, table, avatars, empty states, command palette, rim light, refraction layer, floating dock, media card |

## 3. Foundations

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--obsidian-color-canvas` | `#0B0D12` |
| Base glass | `-surface` | `#151922` |
| Frosted / elevated / inset | `-glass` / `-glass-elevated` / `-glass-inset` | 60% · 80% · 40% over 12px / 16px blur |
| Edges | `-border-high` / `-medium` / `-low`, `-edge` | accent 72% · white 14% · white 7.5% · specular 12% |
| Ink / text / muted | `-ink` / `-text` / `-text-muted` | `#F1F5F9` / `#C9D1DC` / `#8B95A5` (5.8:1 on base glass) |
| Accent | `-primary` / `-primary-ink` | `#38BDF8` / `#03131D` (8.9:1) |
| Emerald / violet | `data-accent="emerald"` / `"violet"` | `#10B981` / `#A78BFA` |
| Status | `-success` / `-warning` / `-danger` | `#10B981` / `#F59E0B` / `#F43F5E` |

Glows (`-primary-glow`), washes (`-primary-soft`) and the high border are `color-mix()`ed from `--obsidian-color-primary`, so an accent variant swaps three colors and the whole light changes.

**Typography** — Inter: display 44 / 800 caps, panel titles 19 / 700 caps (+0.04em), group labels 11 / 600 caps (+0.1em), body 14, KPIs 28 / 600 with tabular figures; JetBrains Mono for axis values, IDs and keyboard hints.
**Shape** — controls 12px, cards 16px, panels 20px, dialogs 16–24px; pills for tabs, badges and switches.
**Depth** — Panels: `inset 0 1px 0 edge, 0 24px 48px -24px rgba(0,0,0,.7)`. Elevated: a brighter edge and a deeper shadow. Inset: an inner shadow and no border. Lit pieces: `0 0 0 1px border-high, 0 0 16px -2px glow`.

**Motion** — Liquid: 320 ms on `cubic-bezier(.22,1,.36,1)`. Sliding indicators (tabs, segmented, nav, the dock's drop) move their leading edge in 240 ms and the trailing edge in 440 ms on `easing-trail` `cubic-bezier(.3,1.22,.4,1)`, so the light stretches toward its target, then gathers a hair past the stop like a drop. The rim light glides after the pointer: `--obsidian-mx` / `--obsidian-my` are registered properties with a 220 ms transition (`duration-follow`) — smooth interpolation instead of a jump per frame. Glows stay tight (negative spread, ≤ 18px blur) so light never smears the neighbours; the media card's spill is clipped inside the card. Hover raises an edge's luminosity and widens a glow; a press pulls the light in for 90 ms (`scale(.97)`, tighter bloom). Charts draw their line (1.4 s) while the area fades in; rings fill and count up from zero (`@property --obsidian-value` as an integer feeds a CSS counter). Panels surface on load out of a 4px blur. All of it stops under `prefers-reduced-motion`.

## 4. Components

Panel, glass layers, button (primary / secondary / tertiary / ghost / danger, sizes, icon), field, command search with ⌘K, switch (stretching knob), checkbox, radio, slider with halo, pill tabs, segmented control, sidebar nav with workspace switcher and badges, breadcrumb, compact pagination, badges with glowing dots, card with rim light, stat / KPI with delta, sparkline and area chart, ring, progress, toast (success / info / danger), inline alert, dialog, menu (listbox or actions), tooltip, table, avatar (+ status, stack), activity list, empty state, logo mark, swatches, edge samples.

## 5. Accessibility

- Text on lit pieces is dark ink (`--obsidian-color-primary-ink`), never white: cyan 8.9:1, emerald 7.5:1, violet 7.0:1.
- Muted text stays at ≥ 5.8:1 on base glass; placeholders are the only text below 4.5:1.
- Focus is a 1px accent ring plus a 4px wash and a glow on every interactive element — visible on glass and on the canvas.
- Glass needs contrast behind it: every glass layer has an opaque enough tint (60–80%) that text never depends on what is underneath.
- Charts carry an accessible name; the ring is `role="img"` with its value in `aria-label`; menus use listbox / menu roles with arrow-key support.

## 6. Decisions

| Decision | Why |
| --- | --- |
| Dark only, three accents | The reference is a dark edition and its identity is light in the dark; a light theme would be a different language. Accents give range without diluting it |
| Obsidian `#0B0012` → `#0B0D12` | The printed hex is a typo (it reads as violet-black, the image is navy-black) |
| Primary bloom 15–20% softer than the image | At UI scale the reference glow halos text and makes adjacent controls look out of focus |
| One flowing indicator per group | The reference highlights one item at a time; a single lit lens that moves reads as light, not as a set of buttons |
| Dark text on the accent | AA contrast in all three accents |
| A rim light that follows the pointer | "Refraction" from the brief: glass edges catching light is what sells the material when you move |

## 7. Files, stack, license

`tokens/tokens.json` (+ `tokens.accent-emerald.json`, `tokens.accent-violet.json`) → `tokens/tokens.css` · `css/obsidian.css` (`base.css`, `components.css`) · `js/obsidian.js` · `index.html` · `components.html` · `examples/dashboard.html` · `AGENTS.md` · `README.md`.
Stack: HTML + CSS custom properties + optional vanilla JS. Dependencies: none (Inter and JetBrains Mono from Google Fonts, SIL OFL). License: MIT.
