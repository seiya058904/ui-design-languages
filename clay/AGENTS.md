# AGENTS.md — rebuilding the Clay UI look

This file is for AI agents (and humans) who need to build a screen that looks and behaves like Clay UI. Read it fully before writing UI code.

## 1. Use the system, don't re-invent it

1. Link `css/clay.css` (it imports `tokens/tokens.css`, `css/base.css` and every component).
2. Load Inter (400/500/600/700) and, optionally, JetBrains Mono from Google Fonts.
3. Build with the `.clay-*` classes documented in `docs/components.md`.
4. Only write page-level CSS for **layout** (grid, flex, widths, gaps). Colors, radii, shadows, type sizes and motion come from `var(--clay-*)` tokens.
5. Optional: include `js/clay.js` for tabs, toggle chips and dialogs.

If the target stack can't use the CSS (native apps, Flutter, SwiftUI, Compose…), read the values from `tokens/tokens.json` and follow the recipes in section 3.

## 2. Non-negotiable visual rules

| Rule | Do | Don't |
| --- | --- | --- |
| Material | Everything is soft matte clay on a warm off-white board | Glass, gradients as decoration, pure white `#FFF` pages, pure black text |
| Height | Things you press are **raised**; things you type into are **carved** (inset) | Flat bordered boxes, 1px outlines as the main affordance |
| Color | Mint `--clay-color-primary` means primary / selected / success. Grey clay is structure. Yellow and coral only for warning and error | More than one accent hue, saturated brand colors, colored text for emphasis |
| Shape | Pills for controls (buttons, inputs, chips, tabs, alerts); 20px cards; 34% squircles for swatches, icons and avatars | Sharp corners, mixed radii on the same level |
| Shadows | Use the `--clay-shadow-*` tokens; they are warm (`rgba(84,74,60,…)`) and always pair a top highlight with a soft drop. Puffed pieces (buttons, knobs, tiles) carry a soft radial `--clay-color-gloss` sheen that dims under the finger | `rgba(0,0,0,.x)` grey shadows, hard offsets, single-layer shadows, hard-edged gloss bands |
| Focus | `--clay-shadow-glow` (mint ring + bloom) on every interactive element | Removing focus styles, browser default blue outline |
| Disabled | Grey fill, grey text, `--clay-shadow-flat` (the clay loses its height) | Opacity-only disabled states on primary actions |
| Type | Inter, bold and tight for display (−0.03em), medium for section labels, sentence case | All-caps labels, more than two families, light weights under 400 |
| Background | `.clay-board` (paper + 64px grid) for main surfaces; `.clay-ruler` frame for showcase sheets only | Busy textures, photos behind content |
| Motion | Squash and spring: press squashes the piece (`scale(1.02, .93)` on buttons, `scale(1.14, .86)` on knobs) and turns its shadow inward in 110ms; release springs back past rest on `--clay-motion-easing-release`. Knobs (toggle, slider) travel on `--clay-motion-easing-knob`, overshooting a hair. Selection indicators (tabs, segmented controls, sidebar nav) glide 380ms on `--clay-motion-easing-spring` | Big bounces, scattered entrance animations, indicators that blink from tab to tab, motion that ignores `prefers-reduced-motion` |

### Dark theme

Dark Clay is warm charcoal clay, not an inverted page. Keep the same structure: raised pieces still have a top rim (now `rgba(255,255,255,.08)`) and a deep drop shadow; carved wells go nearly black. Mint, yellow and coral fills keep their **dark ink** text in both themes. Never hard-code a color in component CSS — if a value has to change between themes it must be a token (both `tokens.json` and `tokens.dark.json`).

## 3. Recipes (for porting to other platforms)

**Raised clay** (buttons, cards, chips) — fill + four layers:
```
inset 0 1.5px 0 rgba(255,255,255,.85)   /* top light catching the edge */
inset 0 -2px 3px rgba(84,74,60,.12)     /* underside in shade */
0 1px 1px rgba(84,74,60,.08)            /* contact shadow */
0 4px 10px -2px rgba(84,74,60,.22)      /* soft drop */
```
Mint and colored fills also get a vertical gradient from the `-light` tint (top) to the base color at 55–60%.

**Carved well** (inputs, tracks): `inset 0 2px 4px rgba(84,74,60,.18), inset 0 -1.5px 0 rgba(255,255,255,.75)` on `--clay-color-surface-sunken`.

**Ringed field** (search input): grey clay pill with 9px padding, containing a carved pill. On focus the inner well gets a 2px mint inset ring and a small mint bloom.

**Glow**: `0 0 0 2px rgba(124,242,198,.95), 0 0 16px 2px rgba(124,242,198,.55)` appended after the element's normal shadow.

**Stacked card**: extra box-shadow layers `0 7px 0 -3px #ECE9E4` and `0 14px 0 -6px #E2DFD9` (each with a soft shadow) make two slabs peek out below.

**Elevation 1–5**: use `--clay-shadow-elevation-N`. Level 1 for resting tiles, 2 for cards, 3 for boards, 4 for floating panels, 5 for dialogs.

**Gloss**: a `::before` (z-index −1 inside an isolated piece) with `radial-gradient(closest-side, var(--clay-color-gloss), transparent)` over the top ~55% of buttons and tiles; knobs carry it as a background layer (`radial-gradient(120% 90% at 34% 18%, gloss, transparent 62%)`).

**Squash**: `:active` → `transform: translateY(1px) scale(1.02, .93); box-shadow: var(--clay-shadow-pressed)` with `--clay-motion-duration-press` / `--clay-motion-easing-press`; the resting rule transitions `transform` on `--clay-motion-duration-release` / `--clay-motion-easing-release`, so release springs back past rest.

## 4. Writing UI copy

Sentence case, plain verbs, the button says what happens ("Send invoice", not "Submit"). Errors say what went wrong and how to fix it.

## 5. Working on this repository

- `tokens/tokens.json` is the single source of truth. After editing it run `node scripts/build-tokens.mjs clay` from the repo root; `node scripts/build-tokens.mjs --check` must pass before committing. Never hand-edit `tokens/tokens.css`.
- Component CSS lives in `css/components/*.css`, one family per file, each with a usage comment at the top. Register new files in `css/clay.css`.
- Every component must show a working `:hover`, `:active`, `:focus-visible` and disabled state, and use tokens instead of literals where a token exists.
- New components must appear in `index.html` (styleguide) and be documented in `docs/components.md`.
- Pages are static HTML; check them at 1280px and 390px wide with no horizontal scroll.
- No build step, no runtime dependencies. Keep it that way.
