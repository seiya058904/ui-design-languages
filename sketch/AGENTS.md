# Sketch — Design Language Guide

Spec: `DESIGN.md` · Components: `components.html` / `README.md` · Tokens: `tokens/tokens.json`

## 1. Non-negotiable rules

| Do | Don't |
| --- | --- |
| Keep paper-only light canvas (no dark theme) with hand-inked borders | Add a dark mode or glossy gradients |
| Never set `font-weight: 700` on Itim (faux-bold smears the strokes) | Bold Itim headings or buttons |
| Keep handwritten fonts `>= 13px` for legibility | Shrink handwritten labels to 10–11px |
| Place a solid paper halo behind any text sitting over hatched/shaded fills | Render raw ink text directly across hatch lines |
| Use stepped `steps(1)` ink-boil motion only on borders/decorations, never on readable labels | Smoothly tween or wobble button text |
| Keep asymmetric slightly imperfect radii and offset ink shadows from tokens | Use uniform 9999px pills or blurred Gaussian drop shadows |
| Reserve highlighter accent swatches for emphasis, selection, and primary action | Fill entire page sections with bright highlighter color |
| Keep diagrams, placeholders, and icons in matching hand-drawn stroke style | Mix slick photorealistic renders or crisp corporate vector icons |
| Preserve visible double-stroke or ink-underline focus indicators | Remove focus outlines |

## 2. Copy
Playful notebook voice. Bracketed system messages (`[Saved to this device]`, `[3 items left]`), short informal labels, approachable hints.
