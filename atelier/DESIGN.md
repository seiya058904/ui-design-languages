# Atelier — Design Spec

> A tactile, precise product UI: frosted panels on a cool canvas, one accent, bold semi-expanded section titles, and appearance settings that really work.

**Use it for** B2B SaaS, project and task tools, admin consoles, developer dashboards, settings-heavy products.
**Avoid it for** emotional consumer brands, editorial sites, children's products.

## 1. Design intent

- Precision first: crisp 1px borders, aligned grids, numbered uppercase sections.
- Tactile but light: frosted glass panels and soft cool shadows instead of heavy cards.
- One accent, many contexts: every tint derives from the accent, so users can re-theme without breaking hierarchy.
- The user is in control of appearance (theme, accent, density, radius, motion, contrast).

## 2. Reference analysis

Source: **ATELIER / PRODUCT UI SYSTEM** board. The "appearance settings" idea also appears in the Settings sketch reference.

| Element | Seen in the reference (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Header | "ATELIER / PRODUCT UI SYSTEM" bold caps, tagline "A tactile, precise interface language", "DESIGN LANGUAGE 01.26", blue progress rule | Archivo 800 at 112% width |
| Panels | Four frosted panels "01. FOUNDATIONS" … "04. DATA & FEEDBACK" | `backdrop-filter: blur(16px) saturate(140%)`, white 72%, 16px radius |
| Foundations | Surfaces Base / Raised / Inset / Overlay (checker); colors Ink, Canvas, Cobalt, Teal, Amber; shadows Subtle / Floating / Modal; radius 8, 12, 16, 16, 24; borders 1, 1.5, 2px | All hex values; radius scale sm/md/lg/xl = 0.5/0.75/1/1.5 × base |
| Controls | Primary (cobalt pill), Secondary (cobalt outline), Tertiary (grey outline), Destructive (coral), pressed and disabled primary; input "Project name"; checkbox / radio; switch; density slider 72 | 36px controls; gradient + glow recipe |
| Navigation | Pill tabs (filled active), breadcrumb with home icon, pagination 1 2 3 … 8 ›, sidebar with soft-blue active item | Sliding indicators |
| Data & feedback | Project card with logo, "In progress", meta, avatar stack; success toast; confirm card; badges New / Approved / At risk; dark toast "Invite sent"; progress 68% with knob; empty state | Soft badges derived with `color-mix()` |
| Live preview | Dark header bar, workspace with sidebar, search, "New task", kanban To do / In progress / Done | Real `examples/workspace.html`, embedded as a scaled live iframe |
| Appearance settings | Theme Light / Dark, five accent dots, density Cozy / Balanced / Compact, radius 8–24 slider, Reduce motion, High contrast | All implemented as token variants and stored in `localStorage` |
| Not in the reference | — | Dark-theme values, table, dialog, tooltip, search field, live sync between pages |

## 3. Foundations

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| Canvas / panel / surface | `--atelier-color-canvas` / `-panel` / `-surface` | `#EDF1F6` / white 72% / `#FFFFFF` | `#0D1219` / slate 74% / `#1A2130` |
| Border / hairline | `-border` / `-hairline` | `#DCE2EB` / ink 8% | `#2A3343` / white 7% |
| Ink / text / muted | `-ink` / `-text` / `-text-muted` | `#1B2232` / `#283143` / `#5B6678` | `#F1F4F9` / `#DCE2EB` / `#9AA5B7` |
| Accent | `-primary` | `#2F7BF5` (violet `#7A4DF0`, cyan `#0EA5C6`, green `#1FA971`, orange `#F08A24`) | `#4B8DFF` |
| Status | `-teal` / `-amber` / `-danger` / `-violet` | `#1FB196` / `#F4A23A` / `#EA5B5B` / `#7C4DE8` | same |
| Tints | `-primary-soft`, `-teal-soft`, `-on-soft`, … | `color-mix()` of the base color with surface or ink | follow automatically |

**Typography** — Archivo. Display 40 / 800 / 112% caps · section 19 / 800 caps · title 28 / 700 · heading 16 / 700 · body 14 · small 13 · caption 12 · kicker 11 caps +0.18em.
**Spacing & density** — 4px base; panel padding 24 (compact 16, cozy 32); row height 40 (32 / 48); controls 30 / 36 / 44 (26 / 30 / 36 · 34 / 42 / 50).
**Shape** — `--atelier-radius-base` 16 (8–24); sm/md/lg/xl derived; buttons, tabs, badges, switches are pills.
**Depth** — Subtle, panel, floating, modal shadows (cool `rgba(28,35,51,…)`); focus `0 0 0 3px` accent at 30%.
**Motion** — 160ms color; 340ms glide; `data-motion="reduced"` sets durations to 0.

## 4. Components

Display, tagline, section title, kicker, panel, rule, button (primary / secondary / tertiary / destructive / ghost), input / select / textarea, search, checkbox, radio, switch, slider (+ stops), pill tabs, segmented, breadcrumb, pagination, sidebar nav, card, badge, avatar stack, progress, kanban board / column / task, toast (success / warning / danger / inverse), confirm, empty state, swatch picker, table, dialog, tooltip. Markup: `index.html` (Code button on every panel) and `css/components.css`.

## 5. Accessibility

Muted text ≥ 4.5:1 in both themes; high-contrast mode upgrades muted text and borders; reduced-motion mode; visible focus ring derived from the accent; tablists support arrow keys, Home and End; status badges always carry words.

## 6. Files, stack, license

`tokens/tokens.json`, `tokens.dark.json`, `tokens.accent-*.json`, `tokens.density-*.json`, `tokens.motion-reduced.json`, `tokens.contrast-high.json` → `tokens/tokens.css` · `css/atelier.css` · `js/atelier.js` · `index.html` · `examples/workspace.html` · `AGENTS.md` · `README.md`.
Stack: HTML + CSS custom properties (`color-mix()`) + optional vanilla JS. Dependencies: none (Archivo from Google Fonts, SIL OFL). License: MIT.
