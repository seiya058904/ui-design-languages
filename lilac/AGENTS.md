# Lilac — Design Language Guide

Spec: `DESIGN.md` · Components: `components.html` / `README.md` · Tokens: `tokens/tokens.json`

## 1. Variants
- Accent variant: `data-accent="cobalt"` (never mix violet and cobalt accents on one page). Dark mode: `data-theme="dark"` or `data-theme="auto"`.

## 2. Non-negotiable rules

| Do | Don't |
| --- | --- |
| Pair light/regular serif display headings with clean sans body copy | Use bold (`700`) serif headings |
| Keep the light surface warm ivory (`#FCFAF6`, `--lilac-color-surface`) with soft hairline borders | Use stark cold white or heavy dark borders |
| Use subtle lilac wash (`--lilac-color-accent-soft`) for selected tabs and active nav items | Flood selected tabs with solid opaque purple fills |
| Reserve solid accent fill strictly for the primary CTA button | Repeat solid accent buttons across every card |
| Never hard-code ivory/white surfaces — always use `--lilac-color-*` tokens so dark mode survives | Hard-code `#FCFAF6` or `#FFFFFF` in component CSS |
| Keep shadows whisper-soft and tinted, never muddy black | Use heavy high-contrast dark drop shadows |
| Give prose and cards generous editorial breathing room | Cram dense spreadsheet grids into tight padding |
| Keep motion gentle and unhurried with soft easing | Use abrupt stepped animations or aggressive bounce |

## 3. Copy
Poised, editorial, unhurried. Sentence-case headings, thoughtful micro-copy, quiet status labels without loud all-caps badges.
