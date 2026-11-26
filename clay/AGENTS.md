# Clay — Design Language Guide

Spec: `DESIGN.md` · Components: `components.html` / `docs/components.md` · Tokens: `tokens/tokens.json`

## 1. Pack-Unique Structure
- Unlike other packs, Clay splits component CSS into per-family files under `css/components/*.css` registered in `css/clay.css`, and maintains `docs/components.md` alongside `components.html`. For non-CSS stacks, port from `tokens/tokens.json` (see `docs/ai-prompt.md` Prompt B).

## 2. Non-negotiable visual rules

| Do | Don't |
| --- | --- |
| Keep the canvas warm stone/cream (`--clay-color-bg`) and surfaces soft matte clay | Use stark white `#FFF` canvas or flat hairline wireframes |
| Build depth with the 5-layer clay shadow tokens (`--clay-shadow-raised`, `--clay-shadow-pressed`) | Substitute a single flat CSS drop shadow |
| Use dark ink on pastel mint, yellow, and coral surfaces in **both** light and dark themes | Put white text on mint, yellow, or coral fills |
| Keep corners generous (`16px`–`24px` cards, full pills on buttons/chips) | Use sharp 2–4px corners |
| Reserve vivid accent fills for primary CTAs and active states | Color every card in competing saturated pastels |
| Keep inner highlight specular top-left consistent across every elevated piece | Mix top-lit and bottom-lit shadows |
| Keep icons rounded and friendly with matching stroke weight | Mix ultra-thin sharp technical icons |
| Keep inputs recessed (`--clay-shadow-inset`) inside soft ringed pills | Style inputs identically to raised buttons |
| Keep stacked cards using `--clay-color-stack-1`/`stack-2` tokens | Hard-code light hex values in stack shadows |
| Use springy tactile press motion that compresses elevation on `:active` | Use lifeless instant toggles with zero press travel |

### Dark theme
- Dark clay stays warm charcoal/espresso — never cold blue-black or pure `#000`.
- Never hard-code light hex values (`#ECE9E4`, `#FFFFFF`, etc.); every surface, highlight, and ink must read from `--clay-*` role tokens.

## 3. Writing UI copy
Warm, friendly, direct, lowercase-leaning sentence case. Short action verbs (`Save note`, `Add block`), reassuring empty states, never robotic error codes.
