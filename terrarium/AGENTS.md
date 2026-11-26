# Terrarium / Earth — Design Language Guide

Spec: `DESIGN.md` · Components: `components.html` / `README.md` · Tokens: `tokens/tokens.json`

## 1. Hooks
- Evening theme: `<html data-theme="dark">` or `data-theme="auto"`.
- Gauges/progress use `style="--terrarium-value: N"` (`0`–`100`) and `TerrariumUI.setValue(el, n)`. Switches support custom labels via `data-on` / `data-off`.

## 2. Non-negotiable rules

| Do | Don't |
| --- | --- |
| Use white text only on deep terracotta (`#B9502B`) buttons — never on raw palette `#C85A32` or ochre (AA fail) | Put white text on `#C85A32` or ochre fills |
| Set Fraunces display headings with `SOFT 100` optical warmth | Render Fraunces sharp/mechanical or replace with generic grotesk |
| Keep spring motion gentle with overshoot capped at `<= 5%` | Use rubbery exaggerated bounce |
| Keep glazed cards warm cream/parchment with subtle organic borders | Use cold stark white or neon accents |
| Pair botanical sage/moss tones with earthy terracotta accents deliberately | Mix synthetic neon greens or cold cyan |
| Keep dark mode warm forest-evening soil, never pure `#000` | Invert directly to cold slate/black |
| Preserve legible body contrast on tinted paper surfaces | Use pale beige text on warm cream |

## 3. Copy
Kind, unhurried, encouraging. Never scold; frame progress and empty states gently (`Nothing planted yet — add your first note when ready`).
