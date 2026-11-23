# AGENTS.md — rebuilding the Braun / Field look

Braun / Field is a precision instrument panel: every pressable part is a keycap with real travel, every fillable part is sunk into anodized aluminium, and one International Orange marks the thing that matters. Read this fully, plus DESIGN.md, before writing UI code.

## 1. Use the system

1. Link `css/braun.css` (it imports `tokens/tokens.css`, `css/base.css` and `css/components.css`); load **Space Grotesk** 500/700 and **IBM Plex Mono** 400/500/600.
2. Build with the `.braun-*` classes shown in `components.html`. Page CSS is layout only: every color, radius, shadow, size and duration comes from a `var(--braun-*)` token.
3. Optional `js/braun.js`: rotary dial, fader sync, interlocking keys and tabs (arrows / Home / End), travelling needles, chips, dialogs, dismissable alerts, theme switch. Without it the CSS still renders every state.
4. Black edition: `<html data-theme="dark">` (or `"auto"`), or `[data-theme-set]` / `[data-theme-toggle]` controls with the script.

## 2. Non-negotiable rules

| Rule | Do | Don't |
| --- | --- | --- |
| Construction | Pressable parts are keycaps: lit face (`--braun-gradient-face`), solid skirt and contact shadow (`--braun-shadow-key*`). Fillable parts are sunk (`--braun-shadow-well`) | Flat buttons, soft blurry drop shadows, glass, gradients for decoration |
| Accent | International Orange for the primary key, the dial pointer, lit segments, the current page / tab / nav item and alerts. One orange thing per module | Orange for decoration, secondary actions or large fills; a second accent hue |
| Legends | Ink on orange (`--braun-color-primary-ink`); orange as text uses `--braun-color-primary-text` | White text on `#FF4F00` (3.3:1) |
| Lamps | Signal green (`.braun-led`) only for "alive / OK"; `--warn` for alarms; always next to a word | Green buttons, green text, a lamp without a label |
| Type | Space Grotesk 700 caps for the nameplate and section titles, Space Grotesk 500 for big numerals; IBM Plex Mono for everything else, values with units ("12.4 V") | Proportional fonts for values; sentence-case section titles; decorative type |
| Structure | Numbered sections on a 2 px black rule with a mono caps triplet on the right; modules split by hairlines | Cards floating on a blank page with no structure |
| Shape | Keys 6 px, fields 4 px, plates 8 px, capsules only for hero keys and switch tracks | Large radii, pills for ordinary keys |
| Focus | 2 px ink outline, offset 2–3 px, on every interactive part | An orange focus ring (2.6:1 on aluminium); removing focus |
| Motion | 55 ms press, 140 ms release, no overshoot; needles travel 220 ms; one detent per dial step | Springs, bounces, `transition: all`, easing that overshoots |

## 3. Recipes

```css
/* Keycap at rest → pressed (same five layers, so it interpolates) */
box-shadow: inset 0 1px 0 var(--braun-color-highlight), inset 0 -1px 0 rgba(0,0,0,.05),
            0 2px 0 var(--braun-color-skirt), 0 3px 4px -1px var(--braun-color-shade), 0 8px 14px -8px var(--braun-color-shade);
/* :active */ transform: translateY(1.5px); box-shadow: var(--braun-shadow-key-pressed);
transition: transform 140ms cubic-bezier(.2,0,0,1), box-shadow 140ms cubic-bezier(.2,0,0,1); /* :active → 55ms cubic-bezier(.55,0,1,.45) */

/* Engraved line */  border: 1px solid var(--braun-color-engrave); box-shadow: inset 1px 1px 0 var(--braun-color-engrave-light);
/* Instruments */    style="--braun-value: 68"  /* 0–100 on .braun-dial, .braun-meter, .braun-progress, .braun-fader */
```

Rotary dial markup (the knob is the slider): `<div class="braun-dial" style="--braun-value:72"><div class="braun-dial__knob" id="d" role="slider" tabindex="0" aria-label="Output" aria-valuemin="0" aria-valuemax="100" aria-valuenow="72"></div></div>` + `<output for="d">72</output>`. Use `data-step` (e.g. `0.1`) and `data-unit` for real units; `BraunUI.setDial(el, value)` from page code; listen for `input` / `change` on the knob.

## 4. Copy

Terse, technical, sentence case; values always with units and tabular figures: "Reset module?", "This will clear all configuration data.", "Module_01 operating at 78.4 °C", "Synced to device · 2 min ago". Identifiers in caps with underscores (`MODULE_01`). Spec notes in caps: "TACTILE / DIRECT / CONFIDENT".

## 5. Working on Braun / Field

- Tokens: edit `tokens/tokens.json` (and `tokens.dark.json`), run `node scripts/build-tokens.mjs braun`; never hand-edit `tokens.css`. Shadows reference color tokens, so a theme only swaps colors.
- Check: `node scripts/check.mjs braun` before every commit (tokens, screenshots at 1280 / 390 without overflow, single-file exports identical in light and dark).
