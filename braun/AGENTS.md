# Braun / Field — Design Language Guide

Spec: `DESIGN.md` · Components: `components.html` / `README.md` · Tokens: `tokens/tokens.json`

## 1. Hooks
- Dark/black edition: `<html data-theme="dark">` or `data-theme="auto"` (controls: `[data-theme-set]`, `[data-theme-toggle]`).
- Meters/gauges use `style="--braun-value: N"` (`0`–`100`). Rotary dials require `role="slider"`, `data-step`, `data-unit`, and `BraunUI.setDial(el, value)`.

## 2. Non-negotiable rules

| Do | Don't |
| --- | --- |
| Keep the chassis cool alabaster (`#F4F4F0`) and panels crisp white | Warm cream backgrounds or pure `#000` page chrome |
| Use dark ink (`#1A1A18`) on orange `#FF4F00` surfaces (AA contrast) | Put white text on `#FF4F00` (fails AA at 3.3:1) |
| Draw focus rings in 2px dark ink (`--braun-color-ink`) | Use orange for focus rings (fails 3:1 at 2.6:1) |
| Keep corners tight (`2px`–`6px`) with recessed or stepped hairline seams | Use soft 20px pills or fluffy floating shadows |
| Reserve `#FF4F00` strictly for the single primary action, active indicator, or warning dot | Flood toolbars or secondary cards with orange |
| Use JetBrains Mono / tabular figures for all readouts, scales, and indices | Use proportional numerals on meters or timers |
| Use crisp mechanical travel (`--braun-motion-duration-key-press`/`key-return` linear curves) | Add bouncy elastic springs or slow 400ms fades |
| Keep labels uppercase tracked micro-type (`11px`, `0.08em`) like silkscreened panel markings | Write conversational marketing taglines on controls |
| Use engraved 1px divider lines between instrument groups | Wrap every single control in its own nested card |

## 3. Copy
Terse, industrial, hardware-panel register. Uppercase micro-labels (`GAIN`, `OUTPUT`, `SYNC`), exact SI/numeric units (`48.0 kHz`, `-6.2 dB`), zero exclamation marks or chatty filler.
