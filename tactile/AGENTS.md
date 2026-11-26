# Tactile — Design Language Guide

Spec: `DESIGN.md` · Components: `components.html` / `README.md` · Tokens: `tokens/tokens.json`

## 1. Variants
- Surface tone: `data-tone="stone"`. Dark mode: `data-theme="dark"` or `data-theme="auto"`. Never hard-code light surfaces, white highlights, or text colors — all values must use `--tactile-*` tokens to survive dark and stone modes.

## 2. The material rules

| State | Token |
| --- | --- |
| Subtle lift | `--tactile-shadow-level-1` |
| Raised control / card | `--tactile-shadow-level-3` |
| Recessed well / input | `--tactile-shadow-inset` |
| Pressed / active control | `--tactile-shadow-pressed` |
| Flat surface | `none` |

- Maintain one consistent top-left light source across every shadow.
- Never place pure white cards on the sand canvas — controls are extruded from the same material as the canvas.
- Use the 5 elevation levels deliberately; do not nest raised cards inside raised cards arbitrarily.

## 3. Non-negotiable rules

| Do | Don't |
| --- | --- |
| Always pair elevation/shadow changes with ink, accent, or position changes | Rely on sand shadows alone to convey state or information |
| Keep interactive targets clearly bounded with sufficient contrast in light, dark, and stone tones | Let low-contrast embossed buttons blend invisibly into the background |
| Keep press transitions physical: raised collapses smoothly into `--tactile-shadow-pressed` | Use instant flat color flashes with no depth transition |
| Reserve accent color for active indicators, progress, and primary action | Wash large containers in saturated color |
| Keep borders minimal or hairline-tinted, letting extrusion define form | Add heavy dark outlines around extruded surfaces |
| Ensure `:focus-visible` uses a clear high-contrast ring outside the extruded shadow | Hide focus inside the soft shadow |

## 4. Copy
Calm, tactile, uncluttered. Short noun/verb labels (`Volume`, `Timer`, `Hold to reset`), minimal punctuation, quiet descriptive hints.
