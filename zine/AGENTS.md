# Zine / Brutal — Design Language Guide

Spec: `DESIGN.md` · Components: `components.html` / `README.md` · Tokens: `tokens/tokens.json`

## 1. Hooks & Token Invariant
- Inverted print theme: `<html data-theme="dark">` or `data-theme="auto"`. Keep palette tokens fixed; themes only swap role tokens.
- Markup pairing: pair `.zine-tabs` directly with `.zine-sheet`; wrap `<th>` labels in `<span>` or `.zine-sort` so they sit on solid lime tape over hatched headers.

## 2. Non-negotiable rules

| Do | Don't |
| --- | --- |
| Use black ink on acid lime and vermilion; use white ink **only** on cobalt | Put white text on lime or vermilion |
| Draw focus indicators with high-contrast black/ink outline | Use lime-only focus rings (fails contrast) |
| Use stepped print motion (`--zine-motion-easing-lift` `steps(2, jump-end)` on hover, `--zine-motion-easing-slam` `steps(1, jump-start)` on active) | Smoothly ease or blur pressable shadows |
| Keep hard 0px-blur offset ink shadows and crisp 2px borders | Use soft blurred drop shadows or pill gradients |
| Keep corners razor-sharp (`0px`) across panels, buttons, and inputs | Mix rounded 16px SaaS cards into zine spreads |
| Use halftone/hatched backgrounds only with solid taped label knockouts | Print raw body copy directly over dense hatching |
| Keep hierarchy loud and graphic with stark scale contrast | Soften everything into timid pastel uniformity |

## 3. Copy
Loud, punchy, zine-editorial. ALL-CAPS short headings and tags (`ISSUE 09`, `SHIP IT`), ISO dates (`2026-11-26`), zero corporate euphemisms.
