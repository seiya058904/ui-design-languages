# Obsidian / Glass — Design Language Guide

Spec: `DESIGN.md` · Components: `components.html` / `README.md` · Tokens: `tokens/tokens.json`

## 1. Hooks & Variants
- Dark-only language (no light theme). Accent variants: `data-accent="emerald"` or `data-accent="violet"`; new accent files need only `primary`, `primary-strong`, and `primary-ink`.
- Progress rings use integer `style="--obsidian-value: N"` (`0`–`100`, registered `@property`) to drive the CSS counter.

## 2. Non-negotiable rules

| Do | Don't |
| --- | --- |
| Keep Obsidian strictly dark-only (`--obsidian-color-bg`) | Add a light theme or bright white cards |
| Use dark ink (`--obsidian-color-primary-ink`) on luminous accent fills | Put white text on bright neon/luminous accent buttons |
| Build glass panels with the 3-layer token stack (`sheen`, `refraction`, `glass`) + hairline rim | Use flat opaque grey boxes or heavy solid white borders |
| Keep pointer-tracking rim light driven by JS rAF-damped `--obsidian-mx`/`--obsidian-my` (`obsidian.js`) | Assume `--obsidian-mx`/`--obsidian-my` are `@property`-transitioned in CSS |
| Restrict specular glow to focal cards and active controls | Apply glowing borders to every table cell or list row |
| Keep typography crisp high-contrast with tabular numerals for telemetry | Use low-contrast grey-on-grey labels below AA |
| Layer elevation via subtle luminance steps and backdrop blur | Stack heavy black drop shadows on an already black canvas |
| Respect `prefers-reduced-motion` by freezing pointer rim tracking | Run continuous rAF loops when reduced motion is active |

## 3. Copy
Crisp, precision instrument / command-deck tone. Use thousands separators (`14,280`) and explicit signed deltas (`+4.2%`, `-12 ms`); concise status nouns.
