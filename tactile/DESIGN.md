# Tactile — Design Spec

> Warm sand neumorphism with a deep teal accent: one material, four states — base, raised, inset, pressed. A cool stone tone is one attribute away.

**Use it for** device and smart-home control, audio and media controls, settings-heavy tools, kiosks, hardware companion apps.
**Avoid it for** long-form reading, dense data tables, low-vision-first products (soft shadows are a weak signal on their own), very bright outdoor screens.

## 1. Design intent

- Everything is the same material as the page; depth comes only from light (top-left) and shade (bottom-right).
- State is physical: press something and it sinks; fill something and it is carved.
- Teal is the only color, reserved for action, on-state and progress — so it is always findable.
- Spec-sheet honesty: section rules with spacing notes, labelled specimens, annotations.

## 2. Reference analysis

Sources: the **beige / deep-teal baseline-grid styleguide** (primary) and the **front-faced grey study** (merged as the stone tone and grooved fields).

| Element | Seen in the references (fact) | Our decision (inferred / added) |
| --- | --- | --- |
| Section headers | Bold caps titles on a rule, right-hand notes "SPACING: 16PX / 24PX / 8PX" | Plus Jakarta Sans 800, 1px rule |
| Layers | Base, Raised, Inset, Pressed tiles | Shadow recipes; pressed pieces also darken |
| Elevation | Five levels: flat, hover, raised, modal, popover | `--tactile-shadow-level-1…5` |
| Borders / radius | 1px thin, 2px regular, 4px thick (teal lines); radius 4 / 8 / 12 / 16 / 24 | Mapped 1:1 to tokens |
| Icons | 16 / 20 / 24px teal outline icons, stroke weight 2px | Round caps and joins |
| Controls | "Submit Now" teal button, "Sending…" pressed with spinner, "Not Available" disabled; checkbox, radio, switch with ON / OFF; text fields with helper, error, focus states; slider with "75%" bubble and ticks 0–100 | `aria-busy` drives the pressed state; teal focus ring |
| Navigation | Inset tab track with raised active tab and teal underline; breadcrumb pill; pagination PREV 1 2 3 4 NEXT; 4-step process with "Current step" tooltip | Sliding raised tile |
| Data display | Card with icon and "View More"; list with selected row; badges New / Beta / 24; avatars with ring; tooltip; compact table header | — |
| Feedback | Modal "Delete Account?", toast stack, teal alert banner, 50% progress, spinner, skeleton rows, dashed empty state with "Clear Filters" | — |
| Front-faced study | Grey raised pills with inset grooves, toggles, blue slider fill, annotations ("Focus ring is always visible", "Disabled reduces contrast and removes shadow") | Stone tone (`#E7E8EB`, ink-blue `#2B5BD3`), `.tactile-field`, `.tactile-note` |
| Not in the references | — | All hex values, sidebar nav, thermostat dial, smart-home example, **dark theme** |

## 3. Foundations

| Role | Token | Sand | Stone |
| --- | --- | --- | --- |
| Material | `--tactile-color-surface` | `#EEE6D9` | `#E7E8EB` |
| Well / pressed | `-well` / `-surface-pressed` | `#E9E0D2` / `#E5DACA` | `#E1E3E6` / `#DCDEE2` |
| Light / shade | `-light` / `-dark` | `rgba(255,252,246,.9)` / `rgba(166,140,104,.42)` | white / `rgba(134,141,154,.45)` |
| Accent | `-primary` | `#0E5357` | `#2B5BD3` |
| Ink / text / muted | `-ink` / `-text` / `-text-muted` | `#1C2828` / `#2D3635` / `#6A665D` | `#1C1F25` / `#2C3038` / `#626873` |
| Status | `-danger` / `-warning` | `#BC4339` / `#A8761F` | same |

**Typography** — Plus Jakarta Sans. Display 40 / 800 · title 24 / 700 · heading 17 / 700 · body 14 · small 13 · caption 12 · section 15 / 800 caps · specimen label 11 / 700 caps.
**Spacing** — 8px grid; section gaps 44px; panels 24px padding.
**Shape** — fields 8, buttons 12, cards 16, panels and dialogs 24; toggles, steps and avatars round.
**Depth** — Raised `-6px -6px 14px light, 6px 6px 14px dark`; inset `inset 3px 3px 7px dark, inset -3px -3px 7px light`; pressed `inset 4px 4px 10px dark, inset -4px -4px 10px light`; teal pieces cast `5px 6px 14px` teal glow.
**Dark theme (added)** — "Tactile at night": the same material on warm charcoal `#2A2723`. Because every shadow is built from `--tactile-color-light` / `-dark`, the theme only swaps those to a faint warm sheen `rgba(255,238,214,.075)` and near-black `rgba(0,0,0,.58)`, so all four states and five levels still read. Teal brightens to `#2A9D99` with dark labels (`primary-ink` `#061C1B`, 5.4:1). Pastel avatars are muted with `--tactile-color-avatar-tint` (34%) so ivory initials stay readable. Stone has its own dark values (`tokens.dark.tone-stone.json`). Suits the smart-home example, which is used at night. `<html data-theme="dark|auto">` or `[data-theme-set]` controls.

**Motion** — Weighted, like a key. Presses accelerate into the material (90ms, `easing-press`) and spring back up with a small overshoot (320ms, `easing-release`). `shadow-pressed` leads with two empty outer shadows, so raised → pressed interpolates through flat instead of snapping. The face colour changes on the same release curve as the shadow, so base → raised → pressed reads as one continuous change of light. Knobs (toggle, slider thumb, dial) share one material: `shadow-knob` at rest, `shadow-knob-pressed` under the finger (same list shape, so they sink continuously). Readouts follow a dragged control with a short damped catch-up (`duration-follow` 140ms, `easing-follow`): the slider bubble, the dial's knob and arc. Marks pop in on `easing-pop`. 180ms color; indicators and knobs glide 360ms on `cubic-bezier(.32,.72,0,1)`. Page load: `.tactile-enter` lifts surfaces out of the flat material — their shadows grow in (720ms, 80ms stagger), once.

## 4. Components

Section header, panel, layers and levels, button (primary / default / ghost, busy, disabled), input, grooved field, checkbox, radio, toggle (+ labelled), slider with bubble and ticks, thermostat dial (drag, keys, − / +), segmented (sliding), groove tabs (sliding teal key), chips (filter chips that sink and light a dot, removable input chips), breadcrumb, pagination, steps, sidebar nav (sliding pressed well), card, list, badge, avatar, tip, tooltip, table, dialog, warning mark, toast stack, alert, progress, spinner, skeleton, empty state, note. Markup: `index.html` (Code button on every section) and `css/components.css`.

## 5. Accessibility

Neumorphism's weak point is contrast, so: text and teal always carry information, never shadow alone; muted text ≥ 4.5:1; focus is a teal ring plus glow; disabled pieces lose shadow *and* contrast; selected items change color or position, not just depth.

## 6. Files, stack, license

`tokens/tokens.json` (+ `tokens.tone-stone.json`) → `tokens/tokens.css` · `css/tactile.css` · `js/tactile.js` · `index.html` · `examples/home.html` · `AGENTS.md` · `README.md`.
Stack: HTML + CSS custom properties + optional vanilla JS. Dependencies: none (Plus Jakarta Sans from Google Fonts, SIL OFL). License: MIT.
