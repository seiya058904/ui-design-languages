# Atelier — Design Language Guide

Spec: `DESIGN.md` · Components: `components.html` / `README.md` · Tokens: `tokens/tokens.json`

## 1. Setup & Hooks
- Load Archivo with the `wdth` variable axis (`wdth,wght@100..125,400..800`); restore saved appearance via the inline `<head>` script in `README.md` before first paint to avoid flash.
- `AtelierUI.setAppearance()` applies on the next frame when View Transitions cross-fade; listen for the `atelier:appearance` event to react to theme/accent changes.

## 2. Non-negotiable rules

| Do | Don't |
| --- | --- |
| Use Archivo for display with tight negative tracking (`-0.025em`) | Use Inter/Roboto for headings or loose tracking |
| Keep the canvas pale warm grey (`--atelier-color-bg`) and cards pure white | Put grey cards on a white page or use pure `#000` ink |
| Use `--atelier-color-accent` for one primary action per section | Scatter blue fills on every secondary button |
| Give primary actions the top-to-bottom sheen gradient and double-layer shadow | Make primary buttons flat solid rectangles |
| Use `border-radius: 9999px` (pill) on buttons, tabs, badges, and segmented tracks | Mix sharp 4px buttons with pill chips on the same row |
| Keep cards at `20px` radius with a hairline border and layered shadow | Use harsh dark drop shadows or 2px borders |
| Pair mono numbers/metrics with `font-variant-numeric: tabular-nums` | Let live counters jitter horizontally |
| Keep dark mode ink-slate (`#0F1115`) with crisp specular top highlights | Invert light tokens directly into flat `#000` black |
| Never hard-code tints — derive them with `color-mix()` from role tokens | Hard-code rgba tints that break across dark mode or accent presets |

## 3. Copy
Short, calm, editorial. Title-case headings without trailing periods (`Visual System`, `Build with Precision`); concise 1-line helper text; numeric badges carry units (`12 ms`, `4.8 GB`).
