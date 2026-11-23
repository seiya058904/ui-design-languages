# AGENTS.md — rebuilding the Lilac look

Lilac is an ivory component study: calm tiles, one saturated accent that glows, and editorial serif headlines. It merges two references — **LILAC / FLOW** (violet, serif display, study tiles) and **SOFT / SYSTEM** (cobalt, profile card, bottom navigation, underline tabs, linear progress).

## 1. Use the system

1. Link `css/lilac.css`; load **Cormorant Garamond** (400/500/600) and **Manrope** (400–700) from Google Fonts.
2. Compose with `.lilac-*` classes (see `README.md` for the component list). Page CSS is layout only.
3. Optional `js/lilac.js`: sliding indicators, slider fill, chips, dialogs, accent switch.
4. Accent: violet by default; `<html data-accent="cobalt">` switches to the SOFT / SYSTEM cobalt. Never mix both on one page.
5. Theme: light by default; `<html data-theme="dark|auto">` switches to "Lilac at night". Every color, shadow and the knob come from tokens, so components need no dark-specific CSS; never hard-code ivory or white surfaces.

## 2. Non-negotiable rules

| Rule | Do | Don't |
| --- | --- | --- |
| Surfaces | Ivory canvas `#F3F0EA`, tiles `#FAF8F4`, raised pieces `#FDFCFA` with a bright top edge and a wide, faint warm shadow | Pure white pages, grey shadows, borders as the main separator |
| Accent | One accent (violet or cobalt) for the primary action, on-states, progress and selection; it **glows** (`--lilac-shadow-accent`) | A second accent hue, gradients as decoration, glow on non-accent pieces |
| Lilac wash | `--lilac-color-primary-wash` + `--lilac-color-on-wash` for selected tabs, chips, nav items and icon discs | Accent-filled selected tabs (too loud) |
| Type | Cormorant Garamond for the wordmark, display, numerals and dialog titles; Manrope for every control and body text | Serif inside buttons or inputs; bold serif |
| Labels | Tile labels are spaced small caps with the tile's number (`01  COLOR PALETTE`) — the number is the tile's place in the study, so only use it on study tiles | Numbered labels on content that isn't a sequence |
| Shape | Pills for buttons, fields, toggles and tabs; 24px tiles; 16px inner cards; 32px dialogs; circles for swatches, avatars and step markers | Sharp corners, mixed radii at the same level |
| Controls | Unchecked checkboxes and radios are raised ivory with a 1.5px edge; checked ones fill with the accent and glow | Flat grey boxes |
| Motion | 200ms for hover; the glow blooms outward slowly (560ms, `--lilac-motion-easing-float`) and converges fast under the finger (`--lilac-shadow-accent-pressed`); cards float on the same damped curve; indicators, knobs and rings glide 380ms on `cubic-bezier(.32,.72,0,1)`; only live things (current step, running timer) breathe; the arrow in a primary button nudges 3px on hover | Bouncy springs, entrance animations on scroll, a glow that switches off on press, breathing on static content |

## 3. Recipes

- **Tile**: `#FAF8F4`, radius 24, padding 28, shadow `inset 0 1px 0 rgba(255,255,255,.9), 0 1px 2px rgba(60,50,40,.04), 0 14px 34px -14px rgba(60,50,40,.16)`.
- **Raised ivory**: `#FDFCFA`, shadow `inset 0 1px 0 #fff, 0 1px 2px rgba(60,50,40,.06), 0 8px 18px -8px rgba(60,50,40,.22)`.
- **Accent piece**: gradient `#7C55FF → #5B2DFF` (70%), white text, shadow `inset 0 1px 0 rgba(255,255,255,.28), 0 2px 6px rgba(91,45,255,.25), 0 12px 26px -8px rgba(91,45,255,.55)`.
- **Track**: `#E2DED7` with `inset 0 1px 3px rgba(60,50,40,.12)`.
- **Focus**: append `0 0 0 3px rgba(91,45,255,.22)`.
- **Converged glow** (primary :active): `inset 0 2px 6px rgba(20,0,80,.3), 0 1px 3px glow, 0 5px 14px -6px glow` — the glow pulls in, it never disappears.
- **Breathing halo**: a pseudo-element or SVG circle with `--lilac-shadow-halo`, animated on `scale` + `filter: opacity()` over `--lilac-motion-duration-breathe`; never on static content.
- **Ring**: SVG circles with `pathLength="100"`, 8px round stroke, `stroke-dasharray: var(--value) 100`, `drop-shadow(0 0 6px` accent glow `)`.

## 4. Copy

Calm and short, sentence case. Buttons say what happens ("Start next block", "Archive space"). Helper text under a toggle explains the effect in a few words.

## 5. Working on Lilac

Edit `tokens/tokens.json` (and `tokens.accent-cobalt.json` for the cobalt variant), then run `node scripts/build-tokens.mjs lilac` from the repo root. New components go into `css/components.css` with a usage comment, a tile in `index.html` and a line in `README.md`.
