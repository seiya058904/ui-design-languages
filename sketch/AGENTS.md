# AGENTS.md — rebuilding the Sketch look

Sketch is hand-drawn ink on cream paper. Primary reference: **Product UI Style Guide — Master · Flagship Edition**; secondary: the **Settings / Appearance** sketch and the **NEO-SKEUO UI KIT** sketch. Read `DESIGN.md` for the full fact-vs-inference table.

## 1. Use the system

1. Link `css/sketch.css`; load **Itim** and **Patrick Hand** from Google Fonts.
2. Compose with `.sketch-*` classes (list in `README.md`). Page CSS is layout only.
3. Optional `js/sketch.js`: sliding indicators, slider bubble, stepper, chips, swatch pickers, dialogs.

## 2. Non-negotiable rules

| Rule | Do | Don't |
| --- | --- | --- |
| Lines | Every piece has a 1.6px ink outline with the asymmetric "wobbly" radius tokens; bold 2.2px for primary and dialogs | Perfect geometric radii, borderless cards, grey hairlines |
| Depth | Drawn offset outline (`--sketch-shadow-1/2/3`); hover moves −1px/−1px so the drawn shadow grows; press moves in and loses it | Blurred shadows, gradients, glass |
| Emphasis | Diagonal hatching (`--sketch-hatch-*`) for primary, pressed, selected, "on" | Solid saturated fills; color as the only emphasis |
| Color | Watercolor washes only for meaning: brand, success, warning, danger, info | Decorative color, more than one tint per component |
| Type | Itim (one weight, `--sketch-font-weight-display`) for display, section titles and labels; Patrick Hand for everything else, ≥ 13px | Hand fonts below 13px, mixing in a geometric sans, `font-weight: 700` on Itim (synthesized bold) |
| Focus | Dashed ink outline offset 3–4px, always visible | Removing outlines |
| Disabled | Dashed faint outline, faint text, no drawn shadow | Opacity alone |
| Primary text | Paper halo (`text-shadow`) so hatching never fights the label | Hatching behind small unhaloed text |
| Motion | 160ms; indicators glide 360ms on `cubic-bezier(.32,.72,0,1)`; dialogs pop with a tiny rotation; strokes (ticks, underlines, arrows) are drawn in with `--sketch-motion-duration-draw`; boils redraw the drawn shadow in `steps(1)` frames, never the label | Bouncy or long animations, rotating whole pieces with their text, continuous (non-stepped) wobble |

## 3. Recipes

- **Offset outline**: `box-shadow: 4px 4px 0 -0.5px paper, 4px 4px 0 1.1px ink` (paper layer hides the inside, leaving a drawn second line).
- **Hatching**: `repeating-linear-gradient(-45deg, rgba(43,42,39,.32) 0 1.2px, transparent 1.2px 6px)`.
- **Wobbly radius**: `12px 16px 11px 17px / 16px 11px 17px 12px`.
- **Image placeholder**: box + two diagonal gradients forming an X on the well color.
- **Active nav item**: drawn box plus two corner brackets (top-left, bottom-right).

## 4. Copy

Plain and friendly, sentence case. Brackets are allowed for system messages, as in the reference: "[Saved to this device]".

## 5. Working on Sketch

Edit `tokens/tokens.json`, then run `node scripts/build-tokens.mjs sketch` from the repo root and `node scripts/snap.mjs sketch` to check both widths.
