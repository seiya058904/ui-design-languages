# AGENTS.md — rebuilding the Tactile look

Tactile is warm sand neumorphism: every piece is made of the same material as the page, and depth comes only from light. Primary reference: the **beige / deep-teal baseline-grid styleguide** (layers, elevation levels, controls, navigation, data display, feedback). Secondary reference: the **front-faced grey study** (grooved fields, state annotations, cool grey tone → `data-tone="stone"`).

## 1. Use the system

1. Link `css/tactile.css`; load **Plus Jakarta Sans** 400–800.
2. Compose with `.tactile-*` classes (list in `README.md`). Page CSS is layout only.
3. Optional `js/tactile.js`: sliding indicators, slider bubble, selectable lists, dialogs, tone switch.
4. Tone: sand (default) or `<html data-tone="stone">`.

## 2. The material rules

| State | Meaning | Recipe |
| --- | --- | --- |
| Base (level 1) | Resting, low importance | `-1px -1px 2px light, 1px 1px 3px dark-soft` |
| Raised (level 3) | Pressable | `-6px -6px 14px light, 6px 6px 14px dark` |
| Inset | Fillable (fields, tracks, wells) | `inset 3px 3px 7px dark, inset -3px -3px 7px light` on `--tactile-color-well` |
| Pressed | Active / selected / busy | `inset 4px 4px 10px dark, inset -4px -4px 10px light` on `--tactile-color-surface-pressed` |
| Disabled | Unavailable | no shadow, `--tactile-color-disabled` fill, low-contrast text |

- One light source, top-left. Every shadow pairs `--tactile-color-light` (up-left) with `--tactile-color-dark` (down-right). Never use a single grey drop shadow.
- Background and pieces share `--tactile-color-surface`. Never put a white card on sand.
- Five elevation levels (`--tactile-shadow-level-1…5`): flat, hover, raised, modal, popover.

## 3. Non-negotiable rules

| Rule | Do | Don't |
| --- | --- | --- |
| Accent | Deep teal for primary actions, on-states, current step / page, progress, badges, alert banner. Teal pieces cast a teal shadow (`--tactile-shadow-accent`) | Other accent hues; teal text on teal |
| Shape | Buttons 12px, fields 8px, cards 16px, panels 24px, toggles and steps round | Pills for regular buttons (only in grooved fields) |
| Type | Plus Jakarta Sans; section titles are small bold caps on a hairline rule with a spec note on the right ("CONTROLS … SPACING: 16PX"); specimen labels are 11px bold caps | Large decorative headings inside panels |
| Contrast | Teal and ink carry information; sand shadows alone never do | Relying on shadow to show state without a color or position change |
| Focus | Teal ring + glow on every interactive element | Removing focus to keep the soft look |
| Motion | 180ms; indicators glide 360ms on `cubic-bezier(.32,.72,0,1)` | Springy overshoot |

## 4. Copy

Calm and concrete, sentence case: "Submit now", "Clear filters", "Start Away mode?". Errors name the fix: "Error: invalid email format".

## 5. Working on Tactile

Edit `tokens/tokens.json` (and `tokens.tone-stone.json` for the stone tone), then run `node scripts/build-tokens.mjs tactile` from the repo root. Because shadows reference the `light` / `dark` color tokens, a new tone only needs colors.
